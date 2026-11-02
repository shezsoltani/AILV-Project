# Datenbankbefehle – AILV Project

## Verbindung zur Datenbank

```bash
# DB-Shell öffnen (während Docker läuft)
docker-compose exec db psql -U postgres -d aildb
```

---

## Überblick

```sql
-- Alle Tabellen anzeigen
\dt

-- Schema einer Tabelle anzeigen
\d users
\d generation_requests
\d questions
```

---

## Users

```sql
-- Alle User anzeigen
SELECT id, username, email, created_at FROM users;

-- Bestimmten User suchen
SELECT * FROM users WHERE username = 'meinuser';

-- User löschen (löscht via CASCADE alle zugehörigen Daten)
DELETE FROM users WHERE username = 'meinuser';
```

---

## Generierungen

```sql
-- Alle Generierungen (neueste zuerst)
SELECT id, user_id, request_type, topic, language, created_at
FROM generation_requests
ORDER BY created_at DESC
LIMIT 10;

-- Nur Fragen-Generierungen
SELECT id, topic, count, created_at FROM generation_requests
WHERE request_type = 'questions'
ORDER BY created_at DESC;

-- Nur Folien-Generierungen
SELECT id, topic, slide_count, created_at FROM generation_requests
WHERE request_type = 'slides'
ORDER BY created_at DESC;

-- Generierungen eines bestimmten Users
SELECT id, request_type, topic, created_at FROM generation_requests
WHERE user_id = 'user-uuid-hier';
```

---

## Fragen

```sql
-- Temporäre (noch nicht finalisierte) Fragen
SELECT id, request_id, stage, type, difficulty, stem FROM generated_questions
ORDER BY created_at DESC;

-- Finalisierte Fragen im Archiv
SELECT id, request_id, type, difficulty, stem FROM questions
ORDER BY created_at DESC;

-- Alle finalisierten Fragen zu einem bestimmten Request
SELECT type, difficulty, stem FROM questions
WHERE request_id = 'request-uuid-hier';

-- Anzahl finalisierter Fragen pro Thema
SELECT gr.topic, COUNT(q.id) AS anzahl
FROM questions q
JOIN generation_requests gr ON q.request_id = gr.id
GROUP BY gr.topic
ORDER BY anzahl DESC;
```

---

## Folien

```sql
-- Alle finalisierten Decks
SELECT id, user_id, name, created_at FROM slide_decks
ORDER BY created_at DESC;

-- Alle Folien eines Decks (sortiert nach Position)
SELECT position, slide_type, title, bullets FROM slides
WHERE deck_id = 'deck-uuid-hier'
ORDER BY position;

-- Temporäre generierte Folien (noch nicht finalisiert)
SELECT request_id, stage, position, slide_type, title FROM generated_slides
ORDER BY created_at DESC, position;
```

---

## Prompts & Templates

```sql
-- Alle Prompts eines Requests (zeigt den LLM-Verlauf)
SELECT stage, created_at, LEFT(prompt_text, 100) AS prompt_vorschau
FROM prompts
WHERE request_id = 'request-uuid-hier'
ORDER BY created_at;

-- Alle Prompt-Templates anzeigen
SELECT stage, language, LEFT(template, 80) AS vorschau FROM prompt_templates
ORDER BY stage, language;

-- Template einer bestimmten Stage und Sprache anzeigen
SELECT template FROM prompt_templates
WHERE stage = 'SKELETON' AND language = 'de';
```

---

## Debugging

```sql
-- Offene (nicht finalisierte) Fragen-Generierungen der letzten 24 Stunden
SELECT gr.id, gr.topic, gr.request_type, gr.created_at
FROM generation_requests gr
LEFT JOIN questions q ON q.request_id = gr.id
LEFT JOIN slide_decks sd ON sd.request_id = gr.id
WHERE gr.created_at > NOW() - INTERVAL '24 hours'
  AND q.id IS NULL
  AND sd.id IS NULL
  AND gr.request_type = 'questions';

-- Wie viele Retry-Versuche hatte ein Request?
SELECT stage, COUNT(*) AS versuche FROM prompts
WHERE request_id = 'request-uuid-hier'
GROUP BY stage
ORDER BY stage;

-- Passwort-Reset-Tokens (aktive)
SELECT u.username, t.expires_at, t.used FROM password_reset_tokens t
JOIN users u ON t.user_id = u.id
WHERE t.used = FALSE AND t.expires_at > NOW();
```

---

## Migrationen (bestehende Datenbanken)

`db-init/*.sql` wird von Postgres nur ausgeführt, wenn das Datenbank-Volume **leer** ist. Bei einer bereits vorhandenen Datenbank müssen Änderungen deshalb als Migration aus `db-migrations/` eingespielt werden. Das Volume wird dafür **nicht** gelöscht.

> Nur auf der eigenen lokalen Datenbank oder einer Testdatenbank ausführen. Ein Umbau einer gemeinsamen oder produktiven Datenbank erfolgt nur nach Abstimmung im Team.

### Aktuelle Migrationen

| Nr. | Datei | Inhalt |
|---|---|---|
| 001 | `001_add_courses.up.sql` / `.down.sql` | Tabellen `courses` und `question_courses` (Lehrveranstaltungen, SCRUM-7) |

### Ablauf (UP)

Voraussetzung: Die DB läuft (`docker-compose up -d db`). Im Projektordner:

```bash
# 1. Sicherung der gesamten Datenbank (empfohlen, vor jeder Migration)
docker-compose exec -T db pg_dump -U postgres -d aildb > backup_vor_001.sql

# 2. Migration einspielen (bricht bei einem Fehler ab, nichts wird halb übernommen)
docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 < db-migrations/001_add_courses.up.sql

# 3. Ergebnis prüfen
docker-compose exec db psql -U postgres -d aildb -c "\d courses" -c "\d question_courses"
```

PowerShell (Windows) kennt `<` nicht; dort stattdessen:

```powershell
Get-Content db-migrations\001_add_courses.up.sql | docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1
```

**Erwartetes Ergebnis:**

- Die Ausgabe endet mit `COMMIT`.
- `\d courses` und `\d question_courses` zeigen die neuen Tabellen.
- Alle bisherigen Fragen haben dieselbe ID und `request_id`, aber noch keine LV:

```sql
SELECT count(*) FROM questions;          -- gleiche Anzahl wie vor der Migration
SELECT count(*) FROM courses;            -- 0
SELECT count(*) FROM question_courses;   -- 0
```

Die Migration ist idempotent: Ein zweiter Lauf zeigt nur Hinweise „already exists, skipping“ und ändert nichts.

### Rücknahme (DOWN)

**Achtung:** Dabei gehen alle LVs und alle Zuordnungen Frage ↔ LV verloren. Fragen, Requests und User bleiben unverändert. Vorher nur die LV-Tabellen sichern:

```bash
# 1. Sicherung der LV-Daten
docker-compose exec -T db pg_dump -U postgres -d aildb -t courses -t question_courses --data-only --column-inserts > backup_lv.sql

# 2. Rücknahme
docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 < db-migrations/001_add_courses.down.sql
```

**LV-Daten wiederherstellen** (wenn die Rücknahme ein Versehen war): erst die Migration (UP) erneut einspielen, dann die Sicherung:

```bash
docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 < db-migrations/001_add_courses.up.sql
docker-compose exec -T db psql -U postgres -d aildb -v ON_ERROR_STOP=1 < backup_lv.sql
```

### Migration automatisch testen

Das Skript legt eigene Wegwerf-Datenbanken (`mig_test_old`, `mig_test_new`) mit Testdaten an, führt UP, ein zweites UP, das Löschverhalten und DOWN aus, vergleicht die Datensätze vorher/nachher und löscht die Testdatenbanken wieder. Es berührt `aildb` nicht.

```bash
# Postgres-Client (psql, pg_dump) wird benötigt; Port 5432 der Docker-DB ist freigegeben
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash db-migrations/test_001_courses.sh
```

Erwartete letzte Zeile: `ALLE TESTS BESTANDEN`.

Voraussetzungen: `bash` sowie die PostgreSQL-Clientprogramme `psql` und `pg_dump` auf dem Rechner (unter Windows z. B. Git Bash und eine PostgreSQL-Client-Installation). Das Skript wurde mit PostgreSQL 16 geprüft.

### Abfragen zu Lehrveranstaltungen

```sql
-- Alle LVs eines Users mit Anzahl zugeordneter Fragen
SELECT c.id, c.name, count(qc.question_id) AS fragen
FROM courses c LEFT JOIN question_courses qc ON qc.course_id = c.id
WHERE c.user_id = 'user-uuid-hier'
GROUP BY c.id, c.name ORDER BY c.name;

-- Fragen ohne LV
SELECT q.id, q.request_id, q.stem FROM questions q
LEFT JOIN question_courses qc ON qc.question_id = q.id
WHERE qc.question_id IS NULL;

-- Fragen einer LV
SELECT q.id, q.request_id, q.stem FROM questions q
JOIN question_courses qc ON qc.question_id = q.id
WHERE qc.course_id = 'course-uuid-hier';
```

---

## Datenbank zurücksetzen

```bash
# Alle Daten löschen und DB neu initialisieren (Achtung: unwiderruflich!)
docker-compose down -v
docker-compose up --build
```
