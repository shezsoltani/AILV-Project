-- ============================================================================
-- Migration 001 (DOWN): Ruecknahme von 001_add_courses.up.sql
-- Ticket:   SCRUM-7
--
-- ACHTUNG - DATENVERLUST:
--   Alle LVs und alle Zuordnungen Frage <-> LV gehen verloren.
--   Fragen (questions), Requests und User bleiben unveraendert erhalten.
--
-- VORHER SICHERUNG ERSTELLEN (nur die beiden LV-Tabellen):
--   docker-compose exec -T db pg_dump -U postgres -d aildb \
--       -t courses -t question_courses --data-only --column-inserts \
--       > backup_lv_$(date +%Y%m%d_%H%M%S).sql
--
-- Ausfuehren (Docker):
--   docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 \
--       < db-migrations/001_add_courses.down.sql
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS question_courses;
DROP TABLE IF EXISTS courses;

COMMIT;
