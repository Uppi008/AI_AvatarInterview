# One-shot local dev bootstrap for Windows/PowerShell: copies .env if
# missing, brings up the full docker-compose stack, waits for the backend
# to report healthy, and prints where everything landed. Safe to re-run.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".env")) {
    Write-Host "No .env found -- creating one from .env.example."
    Write-Host "Edit it before relying on anything that needs real credentials"
    Write-Host "(GROQ_API_KEY, SMTP, Google OAuth) -- see docs/ROADMAP.md for what needs a real key."
    Copy-Item ".env.example" ".env"
}

Write-Host "Starting docker compose (postgres, redis, backend, celery, frontend, nginx)..."
docker compose up --build -d

Write-Host "Waiting for the backend to report healthy..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $status = docker inspect --format='{{.State.Health.Status}}' ai_avatarinterview_backend 2>$null
    } catch {
        $status = "starting"
    }
    if ($status -eq "healthy") {
        $healthy = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $healthy) {
    Write-Host "Backend didn't report healthy in time -- check: docker compose logs backend"
    exit 1
}

Write-Host ""
Write-Host "Ready."
Write-Host "  Frontend:        http://localhost:5173"
Write-Host "  Backend API:     http://localhost:8000/api/v1"
Write-Host "  API docs:        http://localhost:8000/api/docs"
Write-Host "  Django admin:    http://localhost:8000/django-admin/"
Write-Host ""
Write-Host "Create an admin user with:"
Write-Host "  docker compose exec backend python manage.py createsuperuser"
