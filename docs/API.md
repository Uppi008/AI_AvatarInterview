# API Reference

This is a hand-written overview — endpoint list, auth flow, and the WebSocket protocol. For exhaustive request/response schemas (every field, every validation rule), use the **live, always-accurate interactive docs**:

- Swagger UI: `http://localhost:8000/api/docs/`
- Raw OpenAPI schema: `http://localhost:8000/api/schema/`

All REST endpoints below are prefixed with `/api/v1/`. All responses are JSON. Paginated list endpoints return `{count, total_pages, current_page, next, previous, results}` (`common/pagination.py`).

## Authentication

JWT bearer tokens (`djangorestframework-simplejwt`), not session cookies. Every authenticated request needs:

```
Authorization: Bearer <access_token>
```

Access tokens are short-lived (`JWT_ACCESS_TOKEN_LIFETIME_MIN`, default 15 min); refresh tokens rotate on use (`JWT_REFRESH_TOKEN_LIFETIME_DAYS`, default 7 days). The frontend's `apiClient` (`frontend/src/services/apiClient.ts`) handles silent refresh-on-401 automatically — see that file if you're calling the API from somewhere other than the built-in frontend.

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","full_name":"Your Name","password":"...","password_confirm":"..."}'

# Log in (after verifying email)
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"..."}'
# -> {"access": "...", "refresh": "...", "user": {...}}

# Authenticated request
curl http://localhost:8000/api/v1/users/me/ -H "Authorization: Bearer <access>"
```

Errors follow one envelope shape everywhere (`common/exceptions.py`):

```json
{
  "success": false,
  "error": { "code": "ValidationError", "detail": "...", "fields": { "email": ["..."] } }
}
```

## Endpoints by module

### Auth — `apps.users` (`/auth/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register/` | none | Creates user + student profile, emails a verification link |
| POST | `/auth/login/` | none | Email + password → access/refresh token pair |
| POST | `/auth/refresh/` | none (refresh token in body) | Rotates the access token |
| POST | `/auth/verify-email/` | none | Consumes a verification token |
| POST | `/auth/forgot-password/` | none | Always 200, regardless of whether the email exists (doesn't leak account existence) |
| POST | `/auth/reset-password/` | none (reset token in body) | Sets a new password |
| POST | `/auth/change-password/` | required | Requires the current password |
| POST | `/auth/google/` | none | Google Sign-In ID token → JWT pair (creates the account on first login) |

### Profile — `apps.users` (`/users/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET / PATCH | `/users/me/` | required | Own `StudentProfile` + nested editable `user` fields (`full_name`, `preferred_language`, `dark_mode_enabled`). `PATCH` accepts `multipart/form-data` for `profile_photo`. |

### Avatars — `apps.avatars` (`/avatars/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/avatars/` | required | Catalog of the 10 built-in personas. Filter with `?category=` / `?difficulty=`. |
| GET | `/avatars/{id}/` | required | |
| GET / POST | `/avatars/custom/` | student | List/upload a personalized avatar photo (`multipart/form-data`, field `source_photo`). Generation runs async — poll `status` (`pending`→`processing`→`ready`/`failed`). |
| GET | `/avatars/custom/{id}/` | student | |

### Resumes — `apps.resumes` (`/resumes/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/resumes/` | student | Own resumes, most recent first. Nested `skills`/`projects`/`experiences`/`education_history`/`certifications`/`insight` once parsed. |
| POST | `/resumes/` | student | Upload (`multipart/form-data`, field `file`, PDF/DOCX, ≤10MB). Demotes any previous active resume. Parsing runs async. |
| GET | `/resumes/{id}/` | student | |

### Interviews — `apps.interviews` (`/interviews/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/interviews/` | student | Own sessions. |
| POST | `/interviews/` | student | Starts a session: `{avatar_id, resume_id? (defaults to active resume), language}`. Generates the question bank synchronously (needs a real `GROQ_API_KEY` — fails cleanly with an error, no orphaned session, if not configured). Returns the full session detail including generated `questions`. |
| GET | `/interviews/{id}/` | student | Session detail with nested `questions` (each with its `answer` + `evaluation` if answered). |
| POST | `/interviews/{id}/end/` | student | Ends the session early; triggers async report generation + email. |

The actual live interview (speaking questions, listening for answers, skip/repeat, proctoring) happens over **WebSocket**, not these REST endpoints — see below.

### Monitoring — `apps.monitoring` (`/monitoring/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET / POST | `/monitoring/events/` | student | REST fallback for logging a proctoring event outside the WebSocket connection. The live interview page uses the WS protocol for this instead; this exists for testing/clients not on that connection. |

### Reports — `apps.reports` (`/reports/`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reports/` | student | Own interview reports (read-only). |
| GET | `/reports/{id}/` | student | Overall/communication/technical/confidence/body-language/eye-contact/resume-matching scores, strengths, weaknesses, improvement tips, PDF link. |

### Admin — `apps.admin_panel` (`/admin/`)

All require `role=admin`.

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/analytics/` | Platform-wide counts: students, interviews by status, average score, avatar/language usage breakdown. |
| GET/POST/PUT/PATCH/DELETE | `/admin/languages/` (`/{id}/`) | Which languages are active. |
| GET/POST/PUT/PATCH/DELETE | `/admin/ai-models/` (`/{id}/`) | Which provider/model backs each AI task. Setting `is_active=true` on one automatically deactivates any other config for the same `purpose` (`common/... unique_active_config_per_purpose`). |
| GET/POST/PUT/PATCH/DELETE | `/admin/settings/` (`/{key}/`, keyed by `key` not `id`) | Generic key/value platform settings. |

### Misc

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz/` | none | Liveness probe — checks DB connectivity. Outside `/api/v1/`, not a versioned contract. |
| GET | `/api/schema/`, `/api/docs/` | none | OpenAPI schema / Swagger UI. |
| — | `/django-admin/` | staff | Django's built-in admin, for direct DB inspection/editing. |

## WebSocket: the live interview

```
ws://<host>/ws/interview/{session_id}/?token=<JWT access token>
```

Browsers can't set an `Authorization` header on a WebSocket handshake, so the access token travels as a query param instead, validated by `apps.interviews.middleware.JWTAuthMiddleware` the same way DRF's `JWTAuthentication` would. The connection is rejected (no handshake) if the token is invalid, the session doesn't belong to the connecting user, or the session isn't `IN_PROGRESS`.

**Client → server** (`{"type": ...}`):

| Type | Payload | |
|---|---|---|
| `answer_audio` | `{audio_base64, mime_type}` | Recorded answer audio (base64) — transcribed via Groq's hosted Whisper, then scored. |
| `answer_text` | `{text}` | Typed answer — scored directly. |
| `skip_question` | `{}` | |
| `repeat_question` | `{}` | Resends the current question's audio. |
| `end_interview` | `{}` | |
| `proctoring_event` | `{event_type, metadata}` | `event_type` is one of the values in `apps.monitoring.models.ProctoringEvent.EventType` (`no_face`, `multiple_faces`, `looking_away`, `head_rotation`, `tab_switch`, `window_minimized`, `mic_disabled`, `camera_disabled`, `internet_disconnected`, ...). |

**Server → client**:

| Type | Payload | |
|---|---|---|
| `question` | `{question: {id, text, question_type, difficulty, order_index, audio_base64}, progress: {answered, total}}` | `audio_base64` is `null` if TTS synthesis failed — the client should just skip playback, not treat it as an error. |
| `evaluation` | `{question_id, feedback, scores: {technical, communication, relevance, confidence}}` | |
| `interview_complete` | `{}` | All questions answered/skipped; followed by `interview_ended`. |
| `interview_terminated` | `{reason, violation_count}` | The 4th proctoring violation — connection closes after this. |
| `interview_ended` | `{session_id}` | Sent after `end_interview` or `interview_complete`; connection closes after this. |
| `violation_warning` | `{event_type, violation_count, max_violations}` | A violation-grade proctoring event, count < the termination threshold. |
| `monitoring_notice` | `{event_type}` | A non-violation-grade signal (e.g. brief `looking_away`) — informational only, doesn't count toward termination. |
| `error` | `{detail}` | Malformed message, no active question to answer/skip/repeat, or an unhandled exception (logged server-side either way). |

Which question is "awaiting an answer" is tracked entirely server-side (`InterviewQuestion.asked_at` / its related `InterviewAnswer`) — the client never tells the server which question it's answering, so it can't spoof that. See `apps/interviews/consumers.py`'s module docstring and `docs/ARCHITECTURE.md` §2 for the full sequence diagram.
