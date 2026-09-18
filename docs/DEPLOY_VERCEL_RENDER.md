# Deploying: Frontend on Vercel, Backend on Render

An alternative to the [single-VPS path](DEPLOYMENT.md): the React frontend
goes to Vercel (static build + edge CDN), and the Django backend — API,
WebSocket live-interview, Celery worker, Postgres, Redis — goes to Render,
which runs Docker services as long-lived processes (unlike Vercel, which
can't host a persistent ASGI/WebSocket server or a Celery worker).

Because the two halves live on different platforms, this is a two-pass
setup: each side needs the other's URL, and neither URL exists until that
side has deployed once.

## 1. Backend on Render

1. Push this branch (it needs `render.yaml` and `backend/config/settings/render.py`, both already in the repo).
2. Render dashboard → **New** → **Blueprint** → connect this GitHub repo → Render reads `render.yaml` and proposes: a Postgres database, a Key Value (Redis) instance, a web service, and a worker service.
3. On the review screen, fill in the `sync: false` variables:
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com). Without it, resume analysis and AI scoring fail cleanly but nothing AI-related works.
   - `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` — real SMTP credentials (e.g. a Gmail app-specific password).
   - `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_BASE_URL` — leave as `http://localhost:5173` for now; you'll update these in step 3 once the Vercel URL exists.
   - `DJANGO_SECRET_KEY` / `JWT_SIGNING_KEY` are generated automatically (shared between the web and worker service via `envVarGroups`) — don't fill these in.
4. **Apply**. Render builds `backend/Dockerfile`, runs `migrate` → `collectstatic` → starts `daphne` for the web service, and `celery -A config worker` for the worker.
5. Once the web service is live, note its URL: `https://ai-avatarinterview-backend.onrender.com` (exact subdomain depends on availability). Check `https://<that-url>/healthz/` returns `{"status": "ok"}`.
6. Create an admin user via Render's dashboard shell for the web service:
   ```bash
   python manage.py createsuperuser
   ```

The 10 built-in avatars and default AI-model config seed automatically as part of `migrate` (same data migrations as the VPS path).

**Known limitation:** Render's web/worker services have no persistent disk by default, so uploaded resumes/photos/reports written to local disk won't survive a redeploy. For anything beyond a demo, set `USE_S3=true` plus the `AWS_*` variables (already wired up in `config/settings/prod.py`) and point them at an S3 bucket or an S3-compatible store (Cloudflare R2, Backblaze B2).

## 2. Frontend on Vercel

1. Vercel dashboard → **Add New** → **Project** → import this repo.
2. **Root Directory**: set to `frontend` (this is a monorepo — Vercel needs to know the Vite project isn't at the repo root).
3. Framework preset should auto-detect **Vite**; build command `npm run build`, output directory `dist` (defaults are correct).
4. Environment variables:
   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-backend-url>/api/v1` |
   | `VITE_WS_BASE_URL` | `wss://<your-render-backend-url>/ws` (note `wss`, not `ws` — Render terminates TLS) |
   | `VITE_DEFAULT_LANGUAGE` | `en` |
5. **Deploy**. `frontend/vercel.json` already has the SPA rewrite (`/* → /index.html`) so client-side routes like `/dashboard` don't 404 on refresh.
6. Note the resulting URL: `https://<your-project>.vercel.app`.

## 3. Close the loop

Back on Render, update the backend web service's env vars (and the worker's, if you didn't put them in the shared `envVarGroups`) to the real Vercel URL:

- `CORS_ALLOWED_ORIGINS=https://<your-project>.vercel.app`
- `CSRF_TRUSTED_ORIGINS=https://<your-project>.vercel.app`
- `FRONTEND_BASE_URL=https://<your-project>.vercel.app`

Render redeploys automatically on env var changes. After that, sign-up/login, resume upload, and a full interview session (including the live WebSocket) should all work end to end.

## Custom domains

Both platforms support attaching your own domain for free (Vercel: Project → Settings → Domains; Render: service → Settings → Custom Domains). If you do, add the custom domain everywhere its `*.vercel.app` / `*.onrender.com` counterpart appears above, rather than replacing it — keep both so previews and the health check keep working.
