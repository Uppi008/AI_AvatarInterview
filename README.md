# AI_AvatarInterview

An enterprise-grade, AI-powered mock interview platform. Students upload a resume, pick an AI interviewer avatar, and go through a real-time voice/video interview with automated proctoring, resume-aware question generation, and a scored feedback report emailed to them at the end.

> **Status:** 🚧 Phase 1 — Architecture & Scaffolding. See [docs/ROADMAP.md](docs/ROADMAP.md) for build phases and current progress.

---

## What it does

- **Resume-aware interviews** — upload a PDF/DOCX resume; the backend extracts skills, projects, and experience, and an LLM generates tailored interview questions.
- **AI avatar interviewers** — choose a persona (HR Manager, Technical Interviewer, CEO, Friendly Sibling, etc.), each with its own voice, tone, and difficulty.
- **Live voice conversation** — speech-to-text (Whisper) and text-to-speech drive a natural back-and-forth, including follow-up questions generated from the candidate's answers.
- **Real-time proctoring** — webcam-based face presence, eye tracking, head pose, and multiple-face detection via MediaPipe/OpenCV, plus tab-switch and devtools checks; repeated violations auto-terminate the session.
- **Scored reports** — communication, technical, confidence, body language, eye contact, and resume-match sub-scores, rendered as a PDF and emailed to the student.
- **Multi-language** — UI, voice, questions, and email reports in English, Hindi, and Telugu.
- **Admin panel** — manage students, avatars, languages, AI model configuration, and view platform-wide analytics.

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework, PostgreSQL, Redis, Celery, Django Channels (WebSockets), SimpleJWT |
| AI/ML | LangChain, Groq API (LLM), Whisper (STT), MediaPipe + OpenCV (vision), edge-tts (TTS) |
| Frontend | React, Vite, TypeScript, Tailwind CSS, Redux Toolkit, React Router, Axios, Socket.IO client, React Webcam, Framer Motion, React Hook Form |
| Infra | Docker, Docker Compose, Nginx |

## Project structure

```
AI_AvatarInterview/
├── backend/                 # Django project (clean architecture, app-per-domain)
│   ├── config/               # settings (base/dev/prod), urls, asgi/wsgi, celery app
│   ├── apps/
│   │   ├── users/             # auth, JWT, profiles
│   │   ├── resumes/           # upload, parsing, extraction
│   │   ├── avatars/           # avatar catalog & selection
│   │   ├── interviews/        # sessions, questions, answers, transcripts
│   │   ├── monitoring/        # proctoring events & violation history
│   │   ├── ai_engine/         # LangChain chains, prompt templates, LLM client
│   │   ├── reports/           # scoring engine, PDF generation
│   │   ├── notifications/     # transactional email
│   │   └── admin_panel/       # analytics & platform administration
│   ├── common/                # shared base models, permissions, pagination, exceptions
│   └── requirements/          # base / dev / prod pinned dependencies
├── frontend/                 # React + Vite + TypeScript SPA
│   └── src/
│       ├── app/                # store, router
│       ├── features/           # auth, dashboard, avatars, interview, resume, results, admin
│       ├── components/         # shared/reusable UI
│       ├── layouts/, hooks/, services/, utils/, locales/, styles/
├── docker/                   # nginx, postgres, redis configuration
├── docs/                     # architecture, API, database, deployment, developer docs
├── scripts/                  # dev/setup automation
└── tests/                    # backend & frontend test suites
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design and diagrams.

## Getting started (local development)

> Backend and frontend scaffolding lands in Phases 3–4. Once present, local dev will be:

```bash
cp .env.example .env          # fill in secrets (JWT key, GROQ_API_KEY, SMTP creds, ...)
docker compose up --build     # postgres, redis, django, celery, react, nginx
```

- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- API docs (Swagger): http://localhost:8000/api/docs

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap / build phases](docs/ROADMAP.md)
- [Database design](docs/DATABASE.md)
- [API reference](docs/API.md) *(Phase 3)*
- [Deployment guide](docs/DEPLOYMENT.md) *(Phase 9)*
- [Developer guide](docs/DEVELOPER_GUIDE.md) *(Phase 10)*

## License

Proprietary — all rights reserved unless a LICENSE file is added.
