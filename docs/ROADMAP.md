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

## How to resume this build in a future session

Read this file plus [ARCHITECTURE.md](ARCHITECTURE.md), then continue with the next `⬜ Not started` phase.
