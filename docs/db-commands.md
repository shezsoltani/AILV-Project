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

## Datenbank zurücksetzen

```bash
# Alle Daten löschen und DB neu initialisieren (Achtung: unwiderruflich!)
docker-compose down -v
docker-compose up --build
```
