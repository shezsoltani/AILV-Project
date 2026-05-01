# Architekturübersicht – AILV Project

## 1. Gesamtüberblick

Das System besteht aus vier Hauptkomponenten:

- **Frontend (React)**: Benutzeroberfläche zur Eingabe von Themen, Anzeige generierter Inhalte und Verwaltung des Archivs
- **Backend (FastAPI)**: Vermittler zwischen Frontend, Datenbank und LLM-API, zuständig für Validierungslogik und Orchestrierung der Generierungsprozesse
- **LLM-API (OpenAI)**: Externe Schnittstelle zur Textgenerierung
- **Datenbank (PostgreSQL)**: Speichert Prompts, generierte Ergebnisse, finalisierte Fragen und Foliensätze, Prompt-Templates sowie Benutzerdaten

## 2. Technologie-Stack

| Schicht | Technologie | Begründung |
|----------|--------------|------------|
| Frontend | React 18 (Vite) mit TypeScript | Moderne, performante UI mit Type-Safety |
| Backend | FastAPI (Python) | Schnell, asynchron, automatische API-Dokumentation |
| DB | PostgreSQL 15 | Zuverlässig, JSONB-Support für flexible Datenstrukturen |
| LLM-API | OpenAI GPT-4o | Abstrakt über REST angebunden, konfigurierbares Modell |
| Auth | JWT + bcrypt | Standardisiert, zustandslos |

## 3. Datenfluss

### Authentifizierung

Bevor ein Nutzer Inhalte generieren oder auf sein Archiv zugreifen kann, muss er sich authentifizieren:

1. **Registrierung:** Der Nutzer sendet Benutzername, E-Mail und Passwort an `POST /api/auth/register`. Das Backend hasht das Passwort mit bcrypt und legt einen neuen Eintrag in der `users`-Tabelle an.
2. **Login:** `POST /api/auth/login` prüft die Credentials gegen den gespeicherten Hash. Bei Erfolg wird ein JWT ausgestellt, der die `user_id` enthält und vom Frontend bei allen weiteren Requests als Bearer-Token mitgesendet wird.
3. **Geschützte Endpunkte:** Das Backend extrahiert bei jedem Request die `user_id` aus dem Token und prüft zusätzlich bei Archiv-Operationen, ob der angefragte Datensatz dem eingeloggten User gehört (Owner-Check, 403 bei fremdem Zugriff).
4. **Passwort-Reset:** Der Nutzer fordert über `POST /api/auth/forgot-password` eine Reset-Mail an. Das Backend erzeugt einen Einmal-Token, speichert ihn in `password_reset_tokens` und sendet ihn per SMTP. Über `POST /api/auth/reset-password` kann der Nutzer mit dem Token ein neues Passwort setzen. Der Token wird danach als `used` markiert.

### PDF-Upload

Vor der Generierung kann der Nutzer optional eine PDF-Datei als Wissensquelle hochladen:

1. Der Nutzer wählt eine PDF-Datei (max. 5 MB) und sendet sie an `POST /api/upload/pdf`.
2. Das Backend prüft Magic Bytes (`%PDF`) und Dateigröße. Verschlüsselte PDFs werden abgelehnt.
3. PyMuPDF extrahiert den Rohtext seitenweise. Bei sehr langen Dokumenten wird der Text gekürzt, um das Token-Limit des LLM nicht zu überschreiten (`was_truncated`-Flag in der Response).
4. Das Frontend erhält den extrahierten Text zurück und bindet ihn als `upload_context` in den nachfolgenden Generierungsrequest ein.

### Fragegenerierung

1. Der Nutzer füllt das Formular aus (Thema, Sprache, Anzahl, Fragetypen, Schwierigkeitsverteilung, optional Kontexttext oder hochgeladenes PDF) und sendet `POST /api/generate`.
2. Das Backend validiert die Eingaben über den `GenerateRequestValidator` (z. B. Summe der Schwierigkeitsverteilung = 100 %).
3. Ein neuer `GenerationRequest`-Eintrag wird in der Datenbank angelegt (`request_type = 'questions'`). Ab diesem Punkt ist der Request persistent – auch wenn die Generierung später fehlschlägt.
4. Der Orchestrator startet die **3-Stage-Pipeline** (siehe Abschnitt 4).
5. Nach erfolgreichem Abschluss aller Stages enthält `generated_questions` die fertigen Fragen der letzten Stage (IMPROVE). Das Backend gibt sie ans Frontend zurück.
6. Der Nutzer kann die Fragen im Frontend bearbeiten und einzelne entfernen oder anpassen.
7. Klickt der Nutzer auf „Speichern", sendet das Frontend `POST /api/finalize`. Das Backend prüft die Ownership, verschiebt die Fragen von `generated_questions` nach `questions` und löscht die temporären Einträge.

### Foliengenerierung

1. Der Nutzer gibt Thema, Sprache, Folienanzahl und optionalen Kontext an und sendet `POST /api/slides/generate`.
2. Das Backend validiert die Eingaben (`SlidesGenerateRequestValidator`) und legt einen `GenerationRequest`-Eintrag an (`request_type = 'slides'`, `slide_count` gesetzt).
3. Der Slides-Orchestrator startet die **3-Stage-Pipeline** (siehe Abschnitt 4). Alle Zwischenergebnisse werden in `generated_slides` gespeichert.
4. Das Frontend erhält die fertig generierten Folien und zeigt eine Vorschau.
5. Der Nutzer kann Folien bearbeiten und dem Deck einen Namen geben.
6. `POST /api/slides/finalize` überträgt die Folien aus `generated_slides` in `slide_decks` und `slides`. Ein Deck pro Request, eine Zeile in `slides` pro Folie.

### Archiv-Zugriff (Fragen)

1. Das Frontend ruft `GET /api/archive/topics` ab – optional mit einem Suchbegriff (`?q=`).
2. Das Backend aggregiert finalisierte Themen aus `questions` und `generation_requests`, gefiltert nach der `user_id` aus dem JWT.
3. Der Nutzer wählt ein Thema, das Frontend ruft `GET /api/archive/{request_id}/questions` ab.
4. Das Backend prüft die Ownership und liefert alle Fragen zu diesem Request aus der `questions`-Tabelle.
5. Änderungen werden per `PUT /api/archive/{request_id}/questions` gespeichert, Einträge per `DELETE /api/archive/{request_id}` entfernt.

### Archiv-Zugriff (Folien)

1. Das Frontend ruft `GET /api/slides/archive` ab. Das Backend liefert alle `slide_decks`, die dem eingeloggten User gehören.
2. Bei Auswahl eines Decks wird `GET /api/slides/archive/{deck_id}` aufgerufen. Das Backend liefert das Deck mit allen zugehörigen Folien aus der `slides`-Tabelle (sortiert nach `position`).
3. Bearbeitung per `PUT /api/slides/archive/{deck_id}`, Löschen per `DELETE /api/slides/archive/{deck_id}`.

## 4. 3-Stage-Generierungsprozess

Beide Generierungslinien – Fragen und Folien – folgen demselben Pipeline-Prinzip. Jede Stage ruft das LLM mit einem Jinja2-Template auf, das in der `prompt_templates`-Tabelle pro Stage und Sprache hinterlegt ist. Das Ergebnis wird validiert; schlägt die Validierung fehl, wird die Stage bis zu **3-mal** wiederholt. Beim Retry enthält das Template einen `{% if previous_error %}`-Block, der die Fehlermeldung und die Versuchsnummer an das LLM zurückgibt, damit es den Fehler gezielt korrigieren kann.

### Fragen: SKELETON → CONTENT → IMPROVE

1. **SKELETON-Stage:** Erstellt ein strukturelles Gerüst – bestimmt für jede Frage den Typ (`MCQ`, `SHORT_ANSWER`, `TRUE_FALSE`) und den Schwierigkeitsgrad (`easy`, `medium`, `hard`). Das Gerüst wird validiert: Anzahl und Verteilung müssen mit der Anfrage übereinstimmen.

2. **CONTENT-Stage:** Generiert auf Basis des Skeletts vollständige Fragen mit Fragetext, Antwortoptionen (bei MCQ), korrektem Index und einer Begründung (`rationale`). Validiert werden Vollständigkeit und Format jeder Frage.

3. **IMPROVE-Stage:** Optimiert die Fragen aus der CONTENT-Stage sprachlich und didaktisch – verbessert Formulierungen, Präzision und Konsistenz, ohne die Kernstruktur (Typ, Schwierigkeit, korrekte Antwort) zu verändern.

### Folien: SLIDES_OUTLINE → SLIDES_CONTENT → SLIDES_IMPROVE

1. **SLIDES_OUTLINE-Stage:** Erstellt die Gliederung der Präsentation – legt Folientitel, Position und Folientyp (`title`, `content`, `closing`) für jede Folie fest. Validiert wird, dass die gewünschte Folienanzahl eingehalten wird.

2. **SLIDES_CONTENT-Stage:** Erzeugt auf Basis der Outline vollständige Folieninhalte. Inhaltsfolien erhalten 3–7 Bullet-Points, davon mindestens 30 % mit einem konkreten Beispiel. `bullets` wird als JSONB-Array gespeichert.

3. **SLIDES_IMPROVE-Stage:** Optimiert Folien sprachlich und didaktisch. Folienanzahl, Reihenfolge und Folientyp werden dabei nicht verändert.

## 5. Validierung & Fehlerbehandlung

**Frontend-Validierung:**
- Echtzeit-Validierung der Eingabefelder
- Prüfung von Pflichtfeldern, Wertebereichen und Summen (z. B. Schwierigkeitsverteilung = 100 %)

**Backend-Validierung:**
- Pydantic-Modell-Validierung (automatisch in FastAPI)
- Request-Validator für Business-Regeln
- Stage-Validatoren für LLM-Responses
- Owner-Checks für alle Archiv-Endpunkte (403 bei fremdem Zugriff)

**Fehlerbehandlung:**
- Strukturierte Exception-Klassen (`AppError`, `PDFEncryptedError`, `UploadFileTooLargeError`, etc.)
- Automatische Retry-Logik bei Validierungsfehlern (max. 3 Versuche pro Stage)
- Fehlerfeedback wird in den nächsten Prompt-Versuch eingebunden
