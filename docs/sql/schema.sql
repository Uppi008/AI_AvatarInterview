-- =====================================================================
-- AI_AvatarInterview — PostgreSQL schema (mirrors backend/apps/*/models.py)
-- This file is a human-readable reference / manual-setup script.
-- The source of truth for migrations is Django (`python manage.py migrate`);
-- regenerate this file if the models change.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    password            VARCHAR(128) NOT NULL,
    last_login          TIMESTAMPTZ,
    is_superuser        BOOLEAN NOT NULL DEFAULT FALSE,
    email               VARCHAR(254) NOT NULL UNIQUE,
    full_name           VARCHAR(150) NOT NULL,
    role                VARCHAR(10) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    preferred_language  VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'te')),
    dark_mode_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff            BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE student_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    phone_number        VARCHAR(20) NOT NULL DEFAULT '',
    profile_photo       VARCHAR(255),
    bio                 TEXT NOT NULL DEFAULT '',
    date_of_birth       DATE,
    institution         VARCHAR(255) NOT NULL DEFAULT '',
    graduation_year     INTEGER
);

CREATE TABLE email_verification_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token        VARCHAR(128) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    is_used      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_evt_token ON email_verification_tokens (token);

CREATE TABLE password_reset_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token        VARCHAR(128) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    is_used      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_prt_token ON password_reset_tokens (token);

CREATE TABLE social_accounts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL CHECK (provider IN ('google')),
    provider_uid   VARCHAR(255) NOT NULL,
    CONSTRAINT unique_provider_account UNIQUE (provider, provider_uid)
);

-- ---------------------------------------------------------------------
-- avatars
-- ---------------------------------------------------------------------
CREATE TABLE avatars (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    name                 VARCHAR(100) NOT NULL,
    category             VARCHAR(30) NOT NULL CHECK (category IN (
                             'hr_manager', 'technical_interviewer', 'senior_manager', 'ceo',
                             'female_hr', 'male_hr', 'friendly_brother', 'friendly_sister',
                             'parent_style', 'corporate_recruiter'
                         )),
    image                VARCHAR(255) NOT NULL,
    voice_id             VARCHAR(100) NOT NULL,
    speaking_style       VARCHAR(255) NOT NULL DEFAULT '',
    interview_style      TEXT NOT NULL DEFAULT '',
    difficulty           VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    emotion_profile      JSONB NOT NULL DEFAULT '{}',
    supported_languages  JSONB NOT NULL DEFAULT '[]',
    is_active            BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_avatars_category ON avatars (category);
CREATE INDEX idx_avatars_is_active ON avatars (is_active);

CREATE TABLE custom_avatars (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id               UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    source_photo             VARCHAR(255) NOT NULL,
    generated_avatar_image   VARCHAR(255),
    voice_clone_id           VARCHAR(100) NOT NULL DEFAULT '',
    status                   VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    failure_reason           TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_custom_avatars_student_status ON custom_avatars (student_id, status);

-- ---------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------
CREATE TABLE resumes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id        UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    file              VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type         VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'docx')),
    raw_text          TEXT NOT NULL DEFAULT '',
    parsing_status    VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
    parsing_error     TEXT NOT NULL DEFAULT '',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_resumes_student_active ON resumes (student_id, is_active);

CREATE TABLE resume_skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id   UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(15) NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'soft', 'tool'))
);
CREATE INDEX idx_resume_skills_resume ON resume_skills (resume_id);

CREATE TABLE resume_projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id     UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    technologies  JSONB NOT NULL DEFAULT '[]',
    duration      VARCHAR(100) NOT NULL DEFAULT ''
);

CREATE TABLE resume_experiences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id     UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    company       VARCHAR(255) NOT NULL,
    role          VARCHAR(255) NOT NULL,
    start_date    DATE,
    end_date      DATE,
    is_current    BOOLEAN NOT NULL DEFAULT FALSE,
    description   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE resume_education (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id         UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    institution       VARCHAR(255) NOT NULL,
    degree            VARCHAR(255) NOT NULL,
    field_of_study    VARCHAR(255) NOT NULL DEFAULT '',
    start_date        DATE,
    end_date          DATE,
    grade             VARCHAR(50) NOT NULL DEFAULT ''
);

CREATE TABLE resume_certifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id    UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    issuer       VARCHAR(255) NOT NULL DEFAULT '',
    issue_date   DATE
);

CREATE TABLE resume_insights (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    resume_id               UUID NOT NULL UNIQUE REFERENCES resumes (id) ON DELETE CASCADE,
    summary                 TEXT NOT NULL DEFAULT '',
    strengths               JSONB NOT NULL DEFAULT '[]',
    weaknesses              JSONB NOT NULL DEFAULT '[]',
    suggested_focus_areas   JSONB NOT NULL DEFAULT '[]'
);

-- ---------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------
CREATE TABLE interview_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id          UUID NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
    avatar_id           UUID NOT NULL REFERENCES avatars (id) ON DELETE RESTRICT,
    resume_id           UUID REFERENCES resumes (id) ON DELETE SET NULL,
    language            VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te')),
    status              VARCHAR(15) NOT NULL DEFAULT 'scheduled' CHECK (status IN
                             ('scheduled', 'in_progress', 'completed', 'terminated', 'abandoned')),
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    duration_seconds    INTEGER NOT NULL DEFAULT 0,
    violation_count     SMALLINT NOT NULL DEFAULT 0,
    termination_reason  VARCHAR(255) NOT NULL DEFAULT ''
);
CREATE INDEX idx_sessions_student_status ON interview_sessions (student_id, status);
CREATE INDEX idx_sessions_started_at ON interview_sessions (started_at);

CREATE TABLE interview_questions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id         UUID NOT NULL REFERENCES interview_sessions (id) ON DELETE CASCADE,
    parent_question_id UUID REFERENCES interview_questions (id) ON DELETE CASCADE,
    question_text      TEXT NOT NULL,
    question_type      VARCHAR(15) NOT NULL CHECK (question_type IN ('resume_based', 'behavioral', 'coding', 'follow_up')),
    difficulty         VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_index        SMALLINT NOT NULL,
    asked_at           TIMESTAMPTZ,
    skipped            BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_questions_session_order ON interview_questions (session_id, order_index);

CREATE TABLE interview_answers (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    question_id              UUID NOT NULL UNIQUE REFERENCES interview_questions (id) ON DELETE CASCADE,
    transcript_text          TEXT NOT NULL DEFAULT '',
    audio_file               VARCHAR(255),
    response_time_seconds    INTEGER NOT NULL DEFAULT 0,
    answered_at              TIMESTAMPTZ
);

CREATE TABLE answer_evaluations (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    answer_id              UUID NOT NULL UNIQUE REFERENCES interview_answers (id) ON DELETE CASCADE,
    technical_score        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    communication_score    NUMERIC(5, 2) NOT NULL DEFAULT 0,
    relevance_score        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    confidence_score       NUMERIC(5, 2) NOT NULL DEFAULT 0,
    feedback_text          TEXT NOT NULL DEFAULT '',
    evaluated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- monitoring
-- ---------------------------------------------------------------------
CREATE TABLE proctoring_events (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id            UUID NOT NULL REFERENCES interview_sessions (id) ON DELETE CASCADE,
    event_type            VARCHAR(30) NOT NULL CHECK (event_type IN (
                              'no_face', 'multiple_faces', 'looking_away', 'head_rotation',
                              'lip_movement_anomaly', 'mobile_usage', 'tab_switch', 'window_minimized',
                              'browser_refresh', 'mic_disabled', 'camera_disabled', 'internet_disconnected'
                          )),
    severity              VARCHAR(10) NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'violation')),
    detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata              JSONB NOT NULL DEFAULT '{}',
    triggered_termination BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_proctoring_session_type ON proctoring_events (session_id, event_type);
CREATE INDEX idx_proctoring_session_severity ON proctoring_events (session_id, severity);

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
CREATE TABLE interview_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id              UUID NOT NULL UNIQUE REFERENCES interview_sessions (id) ON DELETE CASCADE,
    overall_score           NUMERIC(5, 2) NOT NULL DEFAULT 0,
    communication_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
    technical_score         NUMERIC(5, 2) NOT NULL DEFAULT 0,
    confidence_score        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    body_language_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
    eye_contact_score       NUMERIC(5, 2) NOT NULL DEFAULT 0,
    resume_matching_score   NUMERIC(5, 2) NOT NULL DEFAULT 0,
    strengths               JSONB NOT NULL DEFAULT '[]',
    weaknesses              JSONB NOT NULL DEFAULT '[]',
    improvement_tips        JSONB NOT NULL DEFAULT '[]',
    pdf_file                VARCHAR(255),
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    emailed_at              TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE email_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    email_type        VARCHAR(25) NOT NULL CHECK (email_type IN
                          ('email_verification', 'password_reset', 'interview_report', 'general')),
    recipient_email   VARCHAR(254) NOT NULL,
    subject           VARCHAR(255) NOT NULL,
    status            VARCHAR(10) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    related_session_id UUID REFERENCES interview_sessions (id) ON DELETE SET NULL,
    error_message     TEXT NOT NULL DEFAULT '',
    sent_at           TIMESTAMPTZ
);
CREATE INDEX idx_email_logs_user_type ON email_logs (user_id, email_type);

-- ---------------------------------------------------------------------
-- admin_panel
-- ---------------------------------------------------------------------
CREATE TABLE language_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    code        VARCHAR(5) NOT NULL UNIQUE,
    name        VARCHAR(50) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ai_model_configs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider     VARCHAR(50) NOT NULL,
    model_name   VARCHAR(100) NOT NULL,
    purpose      VARCHAR(30) NOT NULL CHECK (purpose IN
                     ('question_generation', 'answer_evaluation', 'speech_to_text', 'text_to_speech', 'resume_extraction')),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    config       JSONB NOT NULL DEFAULT '{}'
);
-- Only one active config per purpose (partial unique index == Django's UniqueConstraint w/ condition)
CREATE UNIQUE INDEX unique_active_config_per_purpose ON ai_model_configs (purpose) WHERE is_active;

CREATE TABLE platform_settings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    key          VARCHAR(100) NOT NULL UNIQUE,
    value        JSONB NOT NULL,
    description  VARCHAR(255) NOT NULL DEFAULT ''
);
