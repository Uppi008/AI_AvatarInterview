# Developer Guide

This is the "how do I actually work in this codebase" doc — conventions, how to extend it, and the specific gotchas this build ran into. For *what* exists, see [ARCHITECTURE.md](ARCHITECTURE.md) (system design), [DATABASE.md](DATABASE.md) (schema), [API.md](API.md) (endpoints), and [ROADMAP.md](ROADMAP.md) (what shipped in which phase, and every known limitation — read this before assuming a feature works end-to-end with real external services).

## Local setup

```bash
cp .env.example .env   # fill in GROQ_API_KEY, SMTP creds, etc. — see ROADMAP.md for what actually needs a real key
./scripts/dev-setup.sh          # or scripts/dev-setup.ps1 on Windows
```

That brings up Postgres, Redis, the Django backend (Daphne, for WebSocket support), Celery worker + beat, the Vite dev server, and nginx. The 10 built-in avatars and default AI-model/language config seed automatically via data migrations — nothing extra to run.

Without Docker: `backend/` needs Python 3.12 + `pip install -r requirements/dev.txt`, a Postgres + Redis reachable at whatever `DATABASE_URL`/`REDIS_URL` you set; `frontend/` needs Node 20 + `npm install`. Both `manage.py runserver` (Django auto-detects Channels and serves WS too, when `channels` is in `INSTALLED_APPS`) and `npm run dev` work standalone once their respective services are reachable.

## Backend: clean architecture layering

Every app under `backend/apps/` follows the same shape (see `docs/ARCHITECTURE.md` §3 for the full rationale):

```
apps/<domain>/
├── models.py       # persistence
├── serializers.py   # DRF request/response schemas
├── views.py          # thin HTTP layer — parses/validates, delegates to services
├── services.py         # business logic; the only layer allowed to call across apps
├── selectors.py          # read-only query logic
├── tasks.py                # Celery async tasks
├── urls.py
├── admin.py
└── tests/
```

**The rule that matters most**: views call services, services call other apps' services (never another app's models directly), and `apps/ai_engine` is the *only* thing that ever imports `langchain`/`groq`/`edge_tts`. If you're adding a feature that needs an LLM call, put the LangChain chain in `ai_engine/services.py` (or `ai_engine/speech.py` for TTS/STT) and call it from your app's service layer — never construct a `ChatGroq` or call `edge_tts` directly from elsewhere.

### Adding a new endpoint

1. Model change? Add the field/model, `python manage.py makemigrations`, review the generated migration.
2. Add/update the serializer.
3. Put any actual logic in `services.py` (or `selectors.py` for reads) — the view should be a thin translation layer.
4. Wire the URL, add it to the appropriate router in `urls.py`.
5. Write the test next to the code (`apps/<domain>/tests/test_*.py`), using the shared factories in `backend/tests/factories.py` and fixtures in `backend/conftest.py` rather than hand-rolling model instances.
6. If it touches `ai_engine`, mock `apps.ai_engine.services.get_chat_model` — see "Mocking the LLM" below, it's not optional-but-nice, a bare `MagicMock` silently produces wrong results here.

### Mocking the LLM in tests

LangChain's `|` operator coerces anything callable into a `RunnableLambda` and invokes it *directly* rather than calling `.invoke()` on it. A bare `unittest.mock.MagicMock` is callable, so a naive mock silently gets wrapped and returns an unconfigured auto-mock instead of your canned result — found the hard way while building Phase 5, not something `mypy`/pytest will catch for you. Always go through `backend/tests/mocks.py`'s `make_fake_chat_model()`, which uses a real `RunnableLambda` under the hood:

```python
from tests.mocks import make_fake_chat_model
from apps.ai_engine import schemas

fake_model = make_fake_chat_model((schemas.AnswerEvaluationResult, my_canned_result))
with patch("apps.ai_engine.services.get_chat_model", return_value=fake_model):
    ...
```

### Celery in tests

`config/settings/test.py` sets `CELERY_TASK_ALWAYS_EAGER = True` and `CELERY_TASK_EAGER_PROPAGATES = True` — tasks run synchronously in-process, and **exceptions inside a task propagate to the caller** instead of being silently logged-and-swallowed (which is what happens in a real async worker). If you're testing a task that's expected to fail, wrap the call in `pytest.raises(...)`, then assert on the DB state the task set before re-raising. This tripped up several tests while building Phase 8 — the task code was already correct (mark `FAILED`, save, *then* re-raise), the tests just needed to expect the propagated exception.

### Testing the WebSocket consumer

Use `channels.testing.WebsocketCommunicator` against `config.asgi.application`, `@pytest.mark.django_db(transaction=True)` (not the plain `db` fixture) — the consumer's `database_sync_to_async` calls run on a separate thread with their own DB connection, and SQLite's `:memory:` databases are connection-local, so a second thread would see an empty/locked database rather than the one your test set up. `config/settings/test.py` uses a file-based SQLite DB specifically for this reason. See `backend/tests/test_interview_consumer.py` for the full pattern.

### A subtle Django gotcha this build hit

`some_model.refresh_from_db()` clears cached `select_related()` relations. If you fetched `session = InterviewSession.objects.select_related("avatar").get(...)` once and hold onto that object across an async WebSocket connection's lifetime, calling `session.refresh_from_db()` later will make the *next* `session.avatar` access try a fresh (synchronous) query — which throws `SynchronousOnlyOperation` if that access happens from a plain `async def` method not wrapped in `database_sync_to_async`. If you actually need fresh field values and the object is mutated in place by whatever you just called (check first — most of this codebase's services mutate-and-save the same object reference rather than re-fetching), you often don't need the refresh at all.

## Frontend conventions

Feature-based structure under `src/features/<domain>/` — each owns its `api.ts` (Axios calls), `types.ts`, Redux slice (if it needs global state), and `pages/`/`components/`. Shared, presentational-only components live in `src/components/`.

- **State**: Redux Toolkit for auth/session/global UI state (`src/features/auth`, `src/features/ui`); local component state or a plain `useEffect` fetch for everything else. There's no RTK Query / React Query — server data is fetched with plain Axios calls in `useEffect`, which is enough at this app's current scale.
- **Forms**: `react-hook-form` + `zod` schemas, always with the `@hookform/resolvers/zod` resolver. Look at `LoginForm.tsx`/`RegisterForm.tsx` for the pattern.
- **i18n**: `react-i18next`, resource JSON under `src/locales/<en|hi|te>/translation.json`. Adding UI text means adding the key to *all three* files — there's no fallback-to-English-with-a-warning safety net beyond i18next's own `fallbackLng`.
- **WebSocket**: `useInterviewSocket` (`src/features/interviews/useInterviewSocket.ts`) is the only place that talks to the live-interview WS. If you add another WS-backed feature, copy its pattern of guarding every event handler with an `isCurrent()` check.

### The React StrictMode WebSocket gotcha

`useInterviewSocket` connects inside a `useEffect`. In dev, `<StrictMode>` double-invokes effects (mount → cleanup → mount again), so a throwaway first `WebSocket` gets created and closed almost immediately — but browsers can still fire that stale socket's `onerror`/`onclose` *after* the close() call, asynchronously. Without guarding for this, a discarded connection's error event can overwrite state that rightfully belongs to the real, current connection (this build originally showed a permanent "Connection error" banner over a perfectly working connection). The fix, and the pattern to copy for any new WS hook: capture the socket instance in the effect closure and check `wsRef.current === thisSocket` at the top of every handler before touching state. See `useInterviewSocket.test.ts`'s `"ignores late events from a stale (superseded) connection"` test — it reproduces this exact scenario.

### Testing

Vitest + React Testing Library, colocated `*.test.ts(x)` next to the code. `src/test/setup.ts` stubs `window.matchMedia` (jsdom doesn't implement it — needed for anything touching `uiSlice`'s theme detection) and initializes i18n globally so component tests see real translated text, not raw keys. `src/test/test-utils.tsx`'s `renderWithProviders` wraps Redux + Router; use it for anything that isn't a pure presentational component.

## Known environment-dependent limitations

These aren't bugs — they're things that could not be verified against the real external service in the environment this was built in, documented so you know exactly what to check first if something doesn't work:

- **Any Groq LLM call** (resume extraction, question generation, answer scoring, report summarization) needs a real `GROQ_API_KEY`. Every call site handles its absence gracefully (clean error, no crash, no orphaned DB state — `interviews.services.start_session` wraps question generation in `@transaction.atomic` specifically for this), but nothing AI-related actually *works* without one.
- **Face-monitoring angle math** (`frontend/.../useFaceMonitoring.ts`'s yaw/roll thresholds for "looking away"/"head rotation") is this build's best-effort decomposition of MediaPipe's transformation matrix, never calibrated against a real face feed (none was available to test with). Face presence/count detection doesn't depend on that math and is solid; the angle thresholds may need tuning against real footage.
- **`edge-tts`** is an unofficial, reverse-engineered client for Microsoft's Edge TTS service — it broke once already during this build (a 403 from a stale auth handshake, fixed by bumping `6.1.12` → `7.2.8`) and may need bumping again if Microsoft changes their endpoint. If TTS starts failing, check for a newer `edge-tts` release before assuming the integration code is wrong.

See [ROADMAP.md](ROADMAP.md) for the full phase-by-phase history of what was built, how each phase was actually verified (not just written), and every bug that manual/automated testing caught along the way.
