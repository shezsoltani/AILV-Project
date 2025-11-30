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
  bloom_level VARCHAR(50) NULL,
  target_audience TEXT NULL,
  context_text TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
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
  learning_objective TEXT NULL,
  bloom_level VARCHAR(50) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_questions_request_id ON questions (request_id);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage VARCHAR(50) NOT NULL,          -- z.B. 'SKELETON', 'CONTENT', 'IMPROVE'
  language VARCHAR(8) DEFAULT 'de',   
  template TEXT NOT NULL              -- der eigentliche Prompt-Text (mit Platzhaltern)
);

-- Nützliche Indexe für schnelle Suche nach Stage/Language
CREATE INDEX IF NOT EXISTS idx_prompt_templates_stage ON prompt_templates(stage);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_language ON prompt_templates(language);


--PROMPT-TEMPLATES-INSERTS-------------------------------

-- SKELETON
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'SKELETON',
  'de',
  $$
Erstelle ein Gerüst für {{count}} Prüfungsfragen zum Thema "{{topic}}".

Gib für jede Frage nur folgende Informationen an:
- id (laufende Nummer ab 1)
- type (einer der folgenden: {{types}})
- difficulty (easy, medium oder hard), entsprechend der Verteilung:
  easy: {{difficulty_distribution.easy}}%
  medium: {{difficulty_distribution.medium}}%
  hard: {{difficulty_distribution.hard}}%

Keine vollständigen Fragen erzeugen, nur ein Strukturgerüst!
Antwortformat: JSON-Array mit Objekten der Form:
{ "id": 1, "type": "MCQ", "difficulty": "easy"}

Sprache: {{language}}.
$$
);

-- CONTENT
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'CONTENT',
  'de',
  $$
Du erhältst das folgende Rohgerüst für Prüfungsfragen:
{{skeleton_data}}

Erzeuge daraus vollständige Prüfungsfragen zum Thema "{{topic}}".

Regeln:
- Schreibe jede Frage in der Sprache: {{language}}
- type bestimmt das Format:
  - MCQ: 1 Frage + 4-6 Antwortoptionen, genau 1 richtig
  - Kurzantwort: 1 Frage + 1 kurze, korrekte Antwort
  - TRUE-FALSE: 1 Frage + 2 Antwortoptionen(TRUE und FALSE), genau 1 richtig
- difficulty beachten (Komplexität & Umfang)

Antwortformat: JSON-Array mit Objekten:
{ "id": 1, "stem": "Fragetext...", "type": "MCQ", "choices": ["A","B","C","D"], "correct_index": 2, "rationale": "…", "difficulty": "..."}
$$
);

-- IMPROVE
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'IMPROVE',
  'de',
  $$
Verbessere die folgenden Prüfungsfragen sprachlich und didaktisch, ohne deren Kern zu verändern:

{{questions_raw}}

Optimierungsregeln:
- klare, eindeutige Formulierungen
- Fachterminologie korrekt und konsistent
- MCQ-Optionen plausibel und unterscheidbar
- Rationale präzisieren, kurz und evidenzbasiert
- Keine Hinweise auf internen Bewertungsprozess

Antwortformat: gleiche Struktur wie Eingabe (JSON-Array).
$$
);


