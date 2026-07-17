# Deployment Guide

This covers deploying AI_AvatarInterview to a single VPS (or any Docker host) via `docker-compose.prod.yml`. It assumes the [local Docker Compose setup](../README.md#getting-started-local-development) already works — production is the same containers, hardened settings, and no bind-mounted source code.

## 1. Prerequisites

- A host with Docker Engine + Docker Compose v2 (`docker compose version`), at least 2GB RAM (more if running Celery workers with a real model-serving workload).
- A domain name pointed at the host's IP (for TLS; skip if you're fine serving over plain HTTP behind another proxy/load balancer).
- A real **Groq API key** (console.groq.com) — without it, resume analysis, question generation, and answer scoring all fail cleanly with an error rather than crashing, but nothing AI-related actually works. See [ROADMAP.md](ROADMAP.md) for exactly which features need it.
- SMTP credentials for transactional email (verification, password reset, interview reports).

## 2. Environment variables

Copy `.env.example` to `.env` on the host and fill in every value — the following **must** change from their placeholder/dev values before going to production:

| Variable | Why it matters |
|---|---|
| `DJANGO_SECRET_KEY` | Generate a fresh 50-char random value (`python -c "import secrets; print(secrets.token_urlsafe(50))"`). Never reuse the dev placeholder. |
| `JWT_SIGNING_KEY` | Same as above, generate separately from `DJANGO_SECRET_KEY` — rotating one shouldn't invalidate the other. |
| `DJANGO_DEBUG` | Must be `False`. `docker-compose.prod.yml` also sets `DJANGO_SETTINGS_MODULE=config.settings.prod`, which hardcodes `DEBUG = False` regardless, but keep `.env` correct too. |
| `DJANGO_ALLOWED_HOSTS` | Your real domain(s), comma-separated. |
| `POSTGRES_PASSWORD` | A real, unique password — the dev placeholder (`change-me`) must not ship. |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | Your real frontend origin (`https://your-domain.com`), not `localhost:5173`. |
| `GROQ_API_KEY` | See prerequisites above. |
| `EMAIL_HOST` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | Real SMTP credentials. |
| `FRONTEND_BASE_URL` | Your real domain — used to build links in verification/reset emails. |
| `SENTRY_DSN` | Optional but recommended — `config/settings/prod.py` initializes Sentry automatically if this is set. |
| `USE_S3` + `AWS_*` | Optional. Local disk (the `media_data` volume) works for a single-host deployment; switch to S3 if you need multi-host or durable storage independent of the VPS. |

## 3. First deploy

```bash
git clone <your-repo-url>
cd AI_AvatarInterview
cp .env.example .env
# edit .env per the table above

docker compose -f docker-compose.prod.yml up -d --build
```

What this does, per service (see `docker-compose.prod.yml`):
- **db** / **redis**: no ports published to the host — only reachable by other containers on the compose network.
- **backend**: builds with `requirements/prod.txt`, runs `migrate` → `collectstatic` → `daphne` (ASGI, needed for the live-interview WebSocket) on every container start. Not published directly; nginx is the only public entry point.
- **celery_worker** / **celery_beat**: background tasks (email, resume parsing, AI question generation/scoring, report PDFs).
- **frontend**: builds the Vite production bundle and serves it from its own internal nginx (the `production` stage in `frontend/Dockerfile`).
- **nginx**: the actual public-facing reverse proxy (`docker/nginx/nginx.prod.conf`) — routes `/api/`, `/ws/`, `/django-admin/`, `/static/`, `/media/` to the backend, everything else to the frontend container, adds security headers, gzip, and a stricter rate limit on `/api/v1/auth/` on top of DRF's own throttling.

Check it came up clean:

```bash
docker compose -f docker-compose.prod.yml ps
curl -f http://your-host/healthz/   # -> {"status": "ok"}
```

Create an admin user (for `/django-admin/` and the admin API endpoints):

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

The 10 built-in avatars and default AI-model/language config seed automatically as part of `migrate` (they're Django data migrations — see `apps/avatars/migrations/0003_seed_avatars.py` and `apps/admin_panel/migrations/0002_seed_defaults.py`), so there's no separate seeding step.

## 4. TLS (HTTPS)

`docker-compose.prod.yml` publishes both `:80` and `:443`, and `docker/nginx/nginx.prod.conf` has a commented-out `server { listen 443 ssl; ... }` block ready to fill in. The straightforward path with a real domain:

```bash
# On the host, before or alongside the compose stack:
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
# certs land in /etc/letsencrypt/live/your-domain.com/

# Copy (or bind-mount) them into ./docker/nginx/certs/ as fullchain.pem / privkey.pem,
# then uncomment the :443 server block in nginx.prod.conf (duplicate the :80
# block's location entries into it) and reload:
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Set up certbot's renewal timer (`sudo certbot renew --dry-run` to test) and a cron/systemd job to re-copy renewed certs and reload nginx every ~60 days.

Once the `:443` block is actually serving real traffic, flip `DJANGO_SECURE_SSL_REDIRECT=True` in `.env` and restart the backend (`docker compose -f docker-compose.prod.yml up -d backend`) — this is what enables the HTTP→HTTPS redirect, HSTS, and secure cookies. **Turn it on only after TLS is live**: `config/settings/prod.py` defaults it to `False` specifically because turning it on first creates a redirect loop (every request, including the Docker healthcheck, 301s to an `https://` endpoint that doesn't exist yet) — this was caught by actually running the production stack while building it, not assumed.

## 5. Scaling

- **Backend / Celery workers**: `docker compose -f docker-compose.prod.yml up -d --scale celery_worker=3` — nginx already load-balances across multiple `backend` replicas if you scale that service too (`--scale backend=2`), since it proxies to the `backend` upstream by service name, not a fixed container.
- **WebSocket connections**: each live interview holds one long-running WebSocket to a single backend replica for its duration (Channels doesn't need sticky sessions for this app since all state lives in Postgres/Redis, not in-memory on a specific worker) — so horizontal scaling of `backend` works without extra configuration.
- **Database**: a single-host Postgres container is fine to start; move to a managed Postgres (RDS, Cloud SQL, etc.) once you need backups/HA beyond what a single VPS gives you — just point `DATABASE_URL` at it and drop the `db` service.

## 6. Backups

- **Database**: `docker compose -f docker-compose.prod.yml exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql` (schedule via cron). Restore with `psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql`.
- **Media** (resumes, profile photos, avatar images, interview report PDFs): back up the `media_data` named volume (`docker run --rm -v ai_avatarinterview_media_data:/data -v $(pwd):/backup alpine tar czf /backup/media_backup.tar.gz /data`), or switch to S3 (`USE_S3=True`) for automatic off-host durability.

## 7. Monitoring & logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend      # tail one service
docker compose -f docker-compose.prod.yml logs -f              # everything
```

Set `SENTRY_DSN` in `.env` for error tracking — `config/settings/prod.py` initializes it automatically when present, with `send_default_pii=False`.

## 8. CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: backend (`pytest` + coverage + `ruff` + migration-drift check) and frontend (typecheck + lint + Vitest + production build) in parallel, then a sanity check that both production Docker images actually build. It does **not** deploy anywhere automatically — wiring an actual deploy step (SSH + `docker compose pull && up -d`, or a registry push + webhook) is a natural next addition once you have a real target host/registry to point it at, intentionally left out here since it needs secrets and infrastructure specific to your setup.

## 9. What's still manual / not automated here

- TLS certificate issuance and renewal (§4 above) — no ACME automation container included; add one (e.g. `nginx-proxy` + `acme-companion`) if you want that hands-off.
- Actual CD (continuous deployment) to a target host.
- Database failover/HA — the `db` service here is a single container, fine for getting started, not a substitute for a managed database once you have real users.
