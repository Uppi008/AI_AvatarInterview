# Build Roadmap

Each phase produces real, runnable artifacts — reviewed before moving to the next. Order is chosen so each phase can be tested against the previous one (DB before backend, backend before frontend, core AI before avatar/monitoring polish).

| Phase | Scope | Status |
|---|---|---|
| 1 | Project architecture, folder scaffold, docs, docker-compose skeleton, env config | ✅ Done |
| 2 | Database design — Django models, ER diagram, SQL, indexes/constraints | ✅ Done |
| 3 | Backend — Django project, DRF apps, JWT auth, Swagger/OpenAPI docs | ✅ Done |
| 4 | Frontend — Vite/React/TS scaffold, auth pages, dashboard shell | ✅ Done |
| 5 | AI integration — LangChain + Groq, resume parsing, question generation, scoring | ✅ Done |
| 6 | Avatar system — catalog, persona config, voice mapping, selection UI | ✅ Done |
| 7 | Camera monitoring — MediaPipe/OpenCV proctoring, alert system, auto-terminate | ✅ Done |
| 8 | Testing — backend (pytest-django) and frontend (Vitest/RTL) suites | ✅ Done |
| 9 | Deployment — production Docker images, Nginx, prod settings, CI | ✅ Done |
| 10 | Documentation — API reference, deployment guide, developer guide | ⬜ Not started |

## Notes / decisions locked in during Phase 1

- **LLM provider:** Groq (primary), integrated behind a provider-agnostic `LLMClient` so Gemini/OpenRouter/Ollama can be added later without touching call sites.
- **Infra target:** local Docker Compose (Postgres, Redis, Django, React, Nginx). Cloud deployment guide added in Phase 9 as a follow-up, not blocking local dev.
- **Database:** PostgreSQL.
- **Languages:** English, Hindi, Telugu at launch.

## Running the AI features (Phase 5+)

`apps.ai_engine` is fully implemented (resume extraction, question generation, answer evaluation, report aggregation) but needs a **real `GROQ_API_KEY`** in `.env` to actually call the model — get a free one at console.groq.com. Without it, every AI call raises a clear `RuntimeError` at the call site (resume upload still succeeds with just text extraction; starting an interview will fail until a key is set, by design — see `interviews.services.start_session`'s transaction wrapping).

The wiring itself (prompt construction → structured output → DB writes) was verified with mocked LLM responses, since no live key was available in the build environment; it hasn't been exercised against the real Groq API yet. This is also why "Select & start" on the avatar picker (Phase 6) will currently show "Couldn't start the interview" — confirmed via a real browser test that the error surfaces cleanly rather than crashing — until a real key is set.

## Avatar catalog (Phase 6)

The 10 built-in avatars are seeded via a data migration (`avatars/migrations/0003_seed_avatars.py`) with generated placeholder portraits (a Pillow-drawn colored circle with initials) — swap `image` for real artwork/photos per persona whenever available; nothing else depends on how the image was made. Each avatar has a `voice_map` (per-language edge-tts voice IDs) ready for Phase 7's live TTS.

Custom avatars (Module 4) use real OpenCV face-detection to crop/center the student's uploaded photo — not a placeholder. It fails clearly ("No face detected...") rather than silently producing a non-face-based image; true generative avatar synthesis (a diffusion/GAN model or commercial avatar API) is a further extension, not implemented.

## Live interview / camera monitoring (Phase 7)

The full real-time interview runs over one WebSocket (`/ws/interview/{session_id}/?token=<JWT access token>`, JWT-authenticated via `apps.interviews.middleware.JWTAuthMiddleware` since browsers can't set an Authorization header on a WS handshake). `apps.interviews.consumers.InterviewSessionConsumer` drives question delivery (with TTS), STT'd/typed answer scoring, skip/repeat, and proctoring events — all state (which question is "awaiting an answer") is tracked server-side from `InterviewQuestion.asked_at` / its answer, never trusted from the client.

STT uses **Groq's hosted Whisper endpoint** (`apps.ai_engine.speech.transcribe_speech`), not local `openai-whisper` — same GROQ_API_KEY-gated limitation as the rest of `ai_engine`. TTS uses `edge-tts`, which needs no API key and was verified live; **pin `edge-tts>=7.2.8`** — 6.1.12 (the original pin) 403s against Microsoft's endpoint, which changes its auth handshake over time. If TTS starts failing again in the future, bumping this package first is the likely fix.

Client-side proctoring (`frontend/src/features/interviews/proctoring/`) runs MediaPipe FaceLandmarker in-browser for face presence / multiple faces / looking-away / head-rotation, plus plain browser APIs for tab-switch, window-blur, offline, and mic/camera-track-ended detection. The yaw/roll angle math in `useFaceMonitoring.ts` is this build's best-effort decomposition of MediaPipe's transformation matrix and has **not been calibrated against a real face** (no camera/face input was available to test with) — face presence/count detection doesn't depend on that math and is solid; the angle thresholds may need tuning once run against real footage.

This phase was verified with a real headless-Chromium browser test (fake camera/mic device, `--use-fake-device-for-media-stream`) driving the actual running frontend + Daphne backend — not just unit-level mocks: real JWT WS handshake, real edge-tts audio delivered end-to-end, skip/advance through the question list, and real client-side MediaPipe inference against the fake (faceless) video correctly detecting `no_face`, sending real violation events, and the backend correctly auto-terminating on the 4th violation with the session flipping to `TERMINATED` in the database. That same testing caught and fixed three real bugs: a `skipped` question being resent instead of advancing, a React StrictMode dev-mode artifact where a discarded first WebSocket's error event could show a false "Connection error" banner, and `self.session.refresh_from_db()` in the consumer silently clearing the `select_related` avatar/student cache and crashing the next question's TTS call.

Text/audio answer **scoring** during a live interview still needs a real `GROQ_API_KEY` (same as Phase 5) — without one, submitting an answer shows a clean in-UI error rather than crashing, confirmed via the same browser test.

## Automated test suites (Phase 8)

**Backend**: `pytest` + `pytest-django`, config in `backend/pytest.ini` against a dedicated `config.settings.test` (in-memory-fast but file-based SQLite — `:memory:` doesn't work here because Channels consumer tests hit the DB from a separate thread via `database_sync_to_async`, and an in-memory SQLite database is connection-local). Shared fixtures/factories live in `backend/conftest.py` / `backend/tests/factories.py`; the LLM-mocking helper (`tests/mocks.py`) formalizes the `RunnableLambda`-not-`MagicMock` trick discovered in Phase 5. Run with:

```bash
cd backend && pip install -r requirements/dev.txt && pytest
```

56 tests, 91% coverage on `apps/`. Covers: full auth lifecycle (register/verify/reset/login), interview session start with the `@transaction.atomic` rollback path, the monitoring 4-violation auto-terminate logic, all four `ai_engine` chains (mocked LLM), custom avatar generation (real OpenCV pipeline against a real faceless image for the failure path, mocked detection for the success path), resume upload/parsing, admin_panel's active-config-per-purpose logic, and the full WebSocket consumer protocol via `channels.testing.WebsocketCommunicator` (`tests/test_interview_consumer.py`) — including a permanent regression test for the `skip_question` bug found in Phase 7.

**Frontend**: Vitest + React Testing Library, config in `vite.config.ts`'s `test` block (note: import `defineConfig` from `"vitest/config"`, not `"vite"`, or the `test` key won't type-check). Test utilities in `src/test/` (`setup.ts` stubs `window.matchMedia`, which jsdom doesn't implement; `test-utils.tsx`'s `renderWithProviders` wraps Redux + Router). Run with:

```bash
cd frontend && npm test
```

40 tests, ~77% coverage on exercised modules. Covers: `authSlice`/`uiSlice` reducers, `getApiErrorMessage`/`tokenStorage`, `LoginForm`/`RegisterForm` validation (zod schemas) and error surfacing, `Button`, `ViolationBanner`, and — the most valuable one — `useInterviewSocket`, including a permanent regression test that reproduces the React StrictMode double-connection scenario from Phase 7 and asserts a stale socket's late `onerror` never overwrites the current connection's state.

Neither suite touches the real Groq/edge-tts/Redis/Postgres services — everything is mocked or run against SQLite/in-memory channel layers, so both run in seconds with no external dependencies. That also means these tests do **not** re-verify the "does the real Groq API return sensible completions" question — only Phase 5/6/7's manual browser testing (documented above) did that, and only for what a real key was never available to actually exercise.

## Deployment (Phase 9)

`docker-compose.prod.yml` + `docker/nginx/nginx.prod.conf` are the production stack: `db`/`redis` have no published ports (internal-only), `backend` builds with `requirements/prod.txt` and runs `migrate` → `collectstatic` → `daphne` (ASGI, for the live-interview WebSocket) on every start, `frontend` builds via its `production` Docker stage (own nginx serving the static SPA build), and the top-level `nginx` is the sole public entry point, adding security headers, gzip, and an extra rate limit on `/api/v1/auth/` on top of DRF's own throttling. Full walkthrough in [DEPLOYMENT.md](DEPLOYMENT.md).

`.github/workflows/ci.yml` runs backend (pytest+coverage+ruff+migration-drift check) and frontend (typecheck+lint+Vitest+build) in parallel on every push/PR to `main`, then sanity-builds both production Docker images. It does not deploy anywhere — no target host/registry was available to wire that up against.

**A real bug was caught by actually running the production stack**, not just building it: `config/settings/prod.py` originally hardcoded `SECURE_SSL_REDIRECT = True`, which redirect-loops every single request (including the Docker healthcheck) to `https://` before any TLS listener exists — exactly the sequence [DEPLOYMENT.md](DEPLOYMENT.md) describes (deploy over HTTP first, add TLS as a follow-up). Fixed by making it `DJANGO_SECURE_SSL_REDIRECT`-gated (default `False`); flip it on only after nginx's `:443` block has real certs. `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE`/HSTS now follow the same flag.

With that fixed, the full stack was verified running for real: `docker compose -f docker-compose.prod.yml up -d --build` brought up all 7 containers healthy, `/healthz/` and the SPA both returned 200 through nginx, and a real registration request hit real Postgres, queued a real Celery task over real Redis (not eager/mocked mode, unlike every other test in this build), and correctly attempted-and-retried real SMTP against the placeholder credentials in `.env.example` — proving the async pipeline works with real infrastructure end to end, not just against test doubles.

## How to resume this build in a future session

Read this file plus [ARCHITECTURE.md](ARCHITECTURE.md), then continue with the next `⬜ Not started` phase.
