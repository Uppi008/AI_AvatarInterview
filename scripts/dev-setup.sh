#!/bin/sh
# One-shot local dev bootstrap: copies .env if missing, brings up the full
# docker-compose stack, waits for the backend to report healthy, and prints
# where everything landed. Safe to re-run.
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "No .env found -- creating one from .env.example."
    echo "Edit it before relying on anything that needs real credentials"
    echo "(GROQ_API_KEY, SMTP, Google OAuth) -- see docs/ROADMAP.md for what needs a real key."
    cp .env.example .env
fi

echo "Starting docker compose (postgres, redis, backend, celery, frontend, nginx)..."
docker compose up --build -d

echo "Waiting for the backend to report healthy..."
for _ in $(seq 1 30); do
    status=$(docker inspect --format='{{.State.Health.Status}}' ai_avatarinterview_backend 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
        break
    fi
    sleep 2
done

if [ "$status" != "healthy" ]; then
    echo "Backend didn't report healthy in time -- check: docker compose logs backend"
    exit 1
fi

cat <<'EOF'

Ready.
  Frontend:        http://localhost:5173
  Backend API:     http://localhost:8000/api/v1
  API docs:        http://localhost:8000/api/docs
  Django admin:    http://localhost:8000/django-admin/

Create an admin user with:
  docker compose exec backend python manage.py createsuperuser
EOF
