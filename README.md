# AI_AvatarInterview

An AI-powered mock interview platform. Students upload a resume, pick an AI interviewer avatar, and go through a real-time voice/video interview with automated proctoring, resume-aware question generation, and a scored feedback report emailed to them at the end.

> **Status:** All 10 build phases complete and individually verified (real browser testing, real Docker deployment, automated test suites — not just written and assumed to work). See [docs/ROADMAP.md](docs/ROADMAP.md) for the full phase-by-phase history, how each phase was actually tested, and — importantly — **known limitations**: several AI features need a real `GROQ_API_KEY` to do anything beyond fail cleanly, since none was available while building this.

---

## What it does

- **Resume-aware interviews** — upload a PDF/DOCX resume; the backend extracts skills, projects, and experience, and an LLM generates tailored interview questions.
- **AI avatar interviewers** — choose from 10 built-in personas (HR Manager, Technical Interviewer, CEO, Friendly Sibling, etc.), each with its own voice, tone, and difficulty; or upload your own photo for a personalized avatar (face-detection-based cropping, not generative synthesis).
- **Live voice conversation** — real-time WebSocket connection: the avatar speaks questions (TTS), listens for answers (STT), scores them, and asks follow-ups — with skip/repeat/end controls and a live timer/progress indicator.
- **Real-time proctoring** — client-side face presence / multiple-face / looking-away / head-rotation detection (MediaPipe, in-browser), plus tab-switch, window-blur, offline, and mic/camera-disabled detection. 4 violations auto-terminates the interview.
- **Scored reports** — communication, technical, confidence, body-language, eye-contact, and resume-match sub-scores, emailed to the student.
- **Multi-language** — UI, voice, questions, and email reports in English, Hindi, and Telugu.
- **Admin panel** — manage languages, AI model configuration, and view platform-wide analytics via a dedicated API (Django admin for direct data access).

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework, PostgreSQL, Redis, Celery, Django Channels (WebSockets, JWT-authenticated), SimpleJWT |
| AI/ML | LangChain, Groq API (LLM + hosted Whisper for STT), edge-tts (TTS), MediaPipe (client-side vision) + OpenCV (server-side custom avatar face-cropping) |
| Frontend | React, Vite, TypeScript, Tailwind CSS v4, Redux Toolkit, React Router, Axios, native WebSocket, React Webcam, Framer Motion, React Hook Form + Zod |
| Testing | pytest-django (backend), Vitest + React Testing Library (frontend) |
| Infra | Docker, Docker Compose, Nginx, GitHub Actions CI |

## Project structure

```
AI_AvatarInterview/
├── backend/                 # Django project (clean architecture, app-per-domain)
│   ├── config/                # settings (base/dev/prod/test), urls, asgi/wsgi, celery app
│   ├── apps/
│   │   ├── users/               # auth, JWT, profiles
│   │   ├── resumes/              # upload, parsing, extraction
│   │   ├── avatars/               # avatar catalog, custom avatar generation
│   │   ├── interviews/             # sessions, questions, answers, the live WebSocket consumer
│   │   ├── monitoring/               # proctoring events & violation history
│   │   ├── ai_engine/                  # the only app that talks to LangChain/Groq/edge-tts
│   │   ├── reports/                     # scoring aggregation
│   │   ├── notifications/                # transactional email
│   │   └── admin_panel/                   # platform config & analytics
│   │   └── */tests/                        # tests colocated per app
│   ├── common/                # shared base models, permissions, pagination, exceptions
│   ├── tests/                  # cross-app tests (factories, LLM-mocking helper, WS consumer test)
│   └── requirements/            # base / dev / prod pinned dependencies
├── frontend/                 # React + Vite + TypeScript SPA (tests colocated as *.test.ts(x))
│   └── src/
│       ├── app/                # store, router
│       ├── features/            # auth, dashboard, avatars, interviews (incl. live WS UI), resume, settings
│       ├── components/           # shared/reusable UI
│       └── layouts/, hooks/, services/, utils/, locales/, test/
├── docker/                   # nginx (dev + prod configs), TLS cert mount point
├── docs/                     # architecture, database, API, deployment, developer docs
├── scripts/                  # dev-setup.sh / dev-setup.ps1
└── .github/workflows/        # CI (pytest + Vitest + both prod Docker image builds)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design and diagrams.

## Getting started (local development)

```bash
cp .env.example .env          # fill in secrets — GROQ_API_KEY, SMTP creds, etc.
./scripts/dev-setup.sh        # or scripts\dev-setup.ps1 on Windows
```

That's a thin wrapper around `docker compose up --build -d` that also waits for the backend to report healthy and prints where everything landed:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- API docs (Swagger): http://localhost:8000/api/docs
- Django admin: http://localhost:8000/django-admin/

The 10 built-in avatars and default AI-model/language config seed automatically (Django data migrations) — no separate seeding step. Create an admin user with:

```bash
docker compose exec backend python manage.py createsuperuser
```

**Before anything AI-related will actually work** (resume analysis, question generation, answer scoring), put a real key from [console.groq.com](https://console.groq.com) in `.env` as `GROQ_API_KEY`. Without one, those features fail with a clean, visible error rather than crashing — see [docs/ROADMAP.md](docs/ROADMAP.md) for exactly which features need it.

## Testing

```bash
cd backend && pip install -r requirements/dev.txt && pytest              # 56 tests, 91% coverage
cd frontend && npm install && npm test                                   # 40 tests
```

Both suites are fully hermetic (SQLite/in-memory channel layers, no real Groq/Redis/Postgres) and run in seconds. CI (`.github/workflows/ci.yml`) runs both on every push/PR, plus a sanity build of both production Docker images.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, sequence diagrams, security model
- [Database design](docs/DATABASE.md) — ER diagram, normalization decisions, indexing strategy
- [API reference](docs/API.md) — endpoint list, auth flow, the live-interview WebSocket protocol
- [Deployment guide](docs/DEPLOYMENT.md) — production Docker Compose, TLS, scaling, backups
- [Developer guide](docs/DEVELOPER_GUIDE.md) — conventions, how to extend it, hard-won gotchas
- [Roadmap / build history](docs/ROADMAP.md) — every phase, how it was verified, every bug that testing caught, every known limitation

## License

Proprietary — all rights reserved unless a LICENSE file is added.
