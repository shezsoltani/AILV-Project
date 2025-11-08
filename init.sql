-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS table (for future extensions)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE
);


CREATE TABLE IF NOT EXISTS generation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  count INT NOT NULL DEFAULT 1,
  types JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty_distribution JSONB NULL,
  learning_objectives JSONB NULL,
  bloom_level VARCHAR(50),
  target_audience TEXT,
  context_text TEXT,
  attachments JSONB NULL,
  status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_generation_requests_user_id ON generation_requests (user_id);

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,        -- e.g. SKELETON, CONTENT, VERIFY
  prompt_text TEXT,
  response_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_prompts_request_id ON prompts (request_id);

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
  rationale TEXT,
  learning_objective TEXT,
  bloom_level VARCHAR(50),
  quality_score REAL,
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_questions_request_id ON questions (request_id);


