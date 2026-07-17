# Build Roadmap

Each phase produces real, runnable artifacts — reviewed before moving to the next. Order is chosen so each phase can be tested against the previous one (DB before backend, backend before frontend, core AI before avatar/monitoring polish).

| Phase | Scope | Status |
|---|---|---|
| 1 | Project architecture, folder scaffold, docs, docker-compose skeleton, env config | ✅ Done |
| 2 | Database design — Django models, ER diagram, SQL, indexes/constraints | ✅ Done |
| 3 | Backend — Django project, DRF apps, JWT auth, Swagger/OpenAPI docs | ✅ Done |
| 4 | Frontend — Vite/React/TS scaffold, auth pages, dashboard shell | ✅ Done |
| 5 | AI integration — LangChain + Groq, resume parsing, question generation, scoring | ✅ Done |
| 6 | Avatar system — catalog, persona config, voice mapping, selection UI | ⬜ Not started |
| 7 | Camera monitoring — MediaPipe/OpenCV proctoring, alert system, auto-terminate | ⬜ Not started |
| 8 | Testing — backend (pytest-django) and frontend (Vitest/RTL) suites | ⬜ Not started |
| 9 | Deployment — production Docker images, Nginx, prod settings, CI | ⬜ Not started |
| 10 | Documentation — API reference, deployment guide, developer guide | ⬜ Not started |

## Notes / decisions locked in during Phase 1

- **LLM provider:** Groq (primary), integrated behind a provider-agnostic `LLMClient` so Gemini/OpenRouter/Ollama can be added later without touching call sites.
- **Infra target:** local Docker Compose (Postgres, Redis, Django, React, Nginx). Cloud deployment guide added in Phase 9 as a follow-up, not blocking local dev.
- **Database:** PostgreSQL.
- **Languages:** English, Hindi, Telugu at launch.

## Running the AI features (Phase 5+)

`apps.ai_engine` is fully implemented (resume extraction, question generation, answer evaluation, report aggregation) but needs a **real `GROQ_API_KEY`** in `.env` to actually call the model — get a free one at console.groq.com. Without it, every AI call raises a clear `RuntimeError` at the call site (resume upload still succeeds with just text extraction; starting an interview will fail until a key is set, by design — see `interviews.services.start_session`'s transaction wrapping).

The wiring itself (prompt construction → structured output → DB writes) was verified with mocked LLM responses, since no live key was available in the build environment; it hasn't been exercised against the real Groq API yet.

## How to resume this build in a future session

Read this file plus [ARCHITECTURE.md](ARCHITECTURE.md), then continue with the next `⬜ Not started` phase.
