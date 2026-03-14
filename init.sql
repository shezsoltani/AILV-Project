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
  learning_objective TEXT NULL,
  bloom_level VARCHAR(50) NULL,
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
- type (einer der folgenden: {{types}})
- difficulty (easy, medium oder hard), entsprechend der Verteilung:
  easy: {{difficulty_distribution.easy}}%
  medium: {{difficulty_distribution.medium}}%
  hard: {{difficulty_distribution.hard}}%

Keine vollständigen Fragen erzeugen, nur ein Strukturgerüst!
Antwortformat: JSON-Array mit Objekten der Form:
{ "type": "MCQ", "difficulty": "easy"}

Sprache: {{language}}.

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
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
  - MCQ: 1 Frage + 4-6 Antwortoptionen, genau 1 richtig. Die rationale enthält eine Begründung, warum die richtige Antwort korrekt ist.
  - Kurzantwort: 1 Frage + 1 kurze, korrekte Antwort. Die korrekte Antwort wird im Feld "answer" gespeichert.
  - TRUE_FALSE: 1 Frage + 2 Antwortoptionen(TRUE und FALSE), genau 1 richtig. Die rationale enthält eine Begründung, warum die richtige Antwort korrekt ist.
- difficulty beachten (Komplexität & Umfang)

Antwortformat: JSON-Array mit Objekten:
- MCQ: { "stem": "Fragetext...", "type": "MCQ", "choices": ["A","B","C","D"], "correct_index": 2, "rationale": "Begründung...", "difficulty": "..."}
- Kurzantwort: { "stem": "Fragetext...", "type": "SHORT_ANSWER", "answer": "Korrekte Antwort hier", "difficulty": "..."}

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
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

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- ENGLISH TEMPLATES ----------------------------------------

-- SKELETON (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'SKELETON',
  'en',
  $$
Create a skeleton for {{count}} exam questions on the topic "{{topic}}".

For each question, provide only the following information:
- type (one of the following: {{types}})
- difficulty (easy, medium or hard), according to the distribution:
  easy: {{difficulty_distribution.easy}}%
  medium: {{difficulty_distribution.medium}}%
  hard: {{difficulty_distribution.hard}}%

Do not generate complete questions, only a structural skeleton!
Response format: JSON array with objects of the form:
{ "type": "MCQ", "difficulty": "easy"}

Language: {{language}}.

{% if previous_error is defined and previous_error %}
FEEDBACK:
{{ previous_error }}

Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);

-- CONTENT (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'CONTENT',
  'en',
  $$
You receive the following raw skeleton for exam questions:
{{skeleton_data}}

Generate complete exam questions from it on the topic "{{topic}}".

Rules:
- Write each question in the language: {{language}}
- type determines the format:
  - MCQ: 1 question + 4-6 answer options, exactly 1 correct. The rationale contains an explanation of why the correct answer is right.
  - Short answer: 1 question + 1 short, correct answer. The correct answer is stored in the "answer" field.
  - TRUE_FALSE: 1 question + 2 answer options (TRUE and FALSE), exactly 1 correct. The rationale contains an explanation of why the correct answer is right.
- Consider difficulty (complexity & scope)

Response format: JSON array with objects:
- MCQ: { "stem": "Question text...", "type": "MCQ", "choices": ["A","B","C","D"], "correct_index": 2, "rationale": "Explanation...", "difficulty": "..."}
- Short answer: { "stem": "Question text...", "type": "SHORT_ANSWER", "answer": "Correct answer here", "difficulty": "..."}

{% if previous_error is defined and previous_error %}
FEEDBACK:
{{ previous_error }}

Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);

-- IMPROVE (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
  'IMPROVE',
  'en',
  $$
Improve the following exam questions linguistically and didactically without changing their core:

{{questions_raw}}

Optimization rules:
- clear, unambiguous formulations
- correct and consistent terminology
- plausible and distinguishable MCQ options
- refine rationale, brief and evidence-based
- No hints about internal evaluation process

Response format: same structure as input (JSON array).

{% if previous_error is defined and previous_error %}
FEEDBACK:
{{ previous_error }}

Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);


