-- ============================================================================
-- Migration 001 (UP): Lehrveranstaltungen (LV) und Zuordnung von Fragen
-- Ticket:   SCRUM-7 (Modell: SCRUM-6, Variante B = keine bis mehrere LVs pro Frage)
-- Gilt fuer: bereits bestehende Datenbanken (neue Installationen: db-init/01_tables.sql)
--
-- Eigenschaften:
--   * additiv: legt nur 2 neue Tabellen an, aendert KEINE bestehende Tabelle
--   * idempotent: mehrfaches Ausfuehren ist ungefaehrlich (IF NOT EXISTS)
--   * eine Transaktion: bei einem Fehler wird nichts uebernommen
--   * bestehende Fragen bekommen keine LV (keine Zeilen in question_courses)
--
-- Ausfuehren (Docker):
--   docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 \
--       < db-migrations/001_add_courses.up.sql
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lehrveranstaltung, gehoert genau einem Benutzer
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chk_course_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- Filter "meine LVs"
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses (user_id);
-- Name pro Benutzer eindeutig (ohne Beachtung von Gross-/Kleinschreibung)
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_user_name ON courses (user_id, lower(name));

-- Zuordnung Frage <-> LV (N:M). Primaerschluessel verhindert doppelte Zuordnung.
-- Loeschen einer LV oder einer Frage entfernt NUR die Zuordnungszeile,
-- nie die jeweils andere Seite (keine Kaskade LV -> questions).
CREATE TABLE IF NOT EXISTS question_courses (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (question_id, course_id)
);

-- Filter "Fragen einer LV" (question_id ist durch den Primaerschluessel abgedeckt)
CREATE INDEX IF NOT EXISTS idx_question_courses_course_id ON question_courses (course_id);

COMMIT;
