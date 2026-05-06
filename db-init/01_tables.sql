-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS table (for future extensions)
CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     username VARCHAR(100) UNIQUE NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL DEFAULT 'questions', -- 'questions' | 'slides'
    topic TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    count INT NOT NULL DEFAULT 1,           -- Anzahl Fragen (nur bei request_type='questions')
    slide_count INT NULL,                   -- Anzahl Folien  (nur bei request_type='slides')
    types JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty_distribution JSONB NULL,
    target_audience TEXT NULL,
    context_text TEXT NULL,
    upload_context TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chk_request_type CHECK (request_type IN ('questions', 'slides'))
    );

CREATE INDEX idx_generation_requests_user_id ON generation_requests (user_id);

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,        -- e.g. SKELETON, CONTENT, IMPROVE
    prompt_text TEXT,
    response_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

CREATE INDEX idx_prompts_request_id ON prompts (request_id);

CREATE TABLE IF NOT EXISTS generated_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL
    REFERENCES generation_requests(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL
    REFERENCES prompts(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,  -- z.B. SKELETON, CONTENT, IMPROVE
    type VARCHAR(50),
    difficulty VARCHAR(20),
    stem TEXT,
    choices JSONB,
    correct_index INT,
    answer TEXT,                      -- for SHORT_ANSWER: correct answer
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

-- QUESTIONS table (generated items)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    type VARCHAR(50),
    difficulty VARCHAR(20),
    stem TEXT,
    choices JSONB,                      -- for MCQ: array of choices
    correct_index INT,                  -- index into choices (0-based)
    answer TEXT,                        -- for SHORT_ANSWER: correct answer
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

CREATE INDEX idx_questions_request_id ON questions (request_id);

-- GENERATED_SLIDES (temporäre LLM-Ausgabe)
CREATE TABLE IF NOT EXISTS generated_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    position INT NOT NULL,
    slide_type VARCHAR(50),
    title TEXT,
    bullets JSONB,
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

CREATE INDEX idx_generated_slides_request_id ON generated_slides(request_id);

-- SLIDE_DECKS (finale Foliensammlung)
CREATE TABLE IF NOT EXISTS slide_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES generation_requests(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

CREATE INDEX idx_slide_decks_user_id ON slide_decks(user_id);

-- SLIDES (einzelne Folien eines Decks)
CREATE TABLE IF NOT EXISTS slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES slide_decks(id) ON DELETE CASCADE,
    position INT NOT NULL,
    slide_type VARCHAR(50),
    title TEXT,
    bullets JSONB,
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

CREATE INDEX idx_slides_deck_id ON slides(deck_id);

CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage VARCHAR(50) NOT NULL,          -- z.B. 'SKELETON', 'CONTENT', 'IMPROVE'
    language VARCHAR(8) DEFAULT 'de',
    template TEXT NOT NULL              -- der eigentliche Prompt-Text (mit Platzhaltern)
    );

CREATE INDEX IF NOT EXISTS idx_prompt_templates_stage ON prompt_templates(stage);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_language ON prompt_templates(language);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_password_reset_user_id
    ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INT NOT NULL DEFAULT 0,
    stage_label VARCHAR(100),
    request_data JSONB,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chk_job_status CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    CONSTRAINT chk_job_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status  ON jobs(status);
