# Architekturübersicht – AILV Project

## 1. Gesamtüberblick

Das System besteht aus vier Hauptkomponenten:

- **Frontend (React)**: Benutzeroberfläche zur Eingabe von Themen, Anzeige generierter Fragen und Verwaltung des Archivs
- **Backend (FastAPI)**: Vermittler zwischen Frontend, Datenbank und LLM-API, zuständig für Validierungslogik und Orchestrierung des 3-Stage-Generierungsprozesses
- **LLM-API (OpenAI)**: Externe Schnittstelle zur Textgenerierung
- **Datenbank (PostgreSQL)**: Speichert Prompts, generierte Ergebnisse, finalisierte Fragen und Prompt-Templates

## 2. Datenfluss

### Fragegenerierung

1. Nutzer gibt im Frontend Eingabeparameter ein (Thema, Sprache, Anzahl, Fragetypen, Schwierigkeitsverteilung)
2. Frontend sendet POST-Request an `/api/generate`
3. Backend validiert Eingaben (Request-Validator)
4. Backend legt `GenerationRequest` in der Datenbank an
5. **3-Stage-Generierungsprozess:**
   - **SKELETON-Stage:** LLM erstellt Gerüst mit Fragetypen und Schwierigkeitsgraden
   - **CONTENT-Stage:** LLM generiert vollständige Fragen auf Basis des Gerüsts
   - **IMPROVE-Stage:** LLM optimiert Fragen sprachlich und didaktisch
6. Jede Stage wird validiert; bei Fehlern automatischer Retry (max. 3 Versuche)
7. Alle Prompts und Responses werden in der `prompts`-Tabelle gespeichert
8. Finale Fragen werden in `generated_questions` gespeichert
9. Backend sendet generierte Fragen ans Frontend
10. Nutzer kann Fragen bearbeiten und finalisieren
11. Finalisierung: POST `/api/finalize` verschiebt Fragen von `generated_questions` nach `questions` (Archiv)

### Archiv-Zugriff

1. Frontend sendet GET `/api/archive/topics`
2. Backend aggregiert finalisierte Themen aus `questions` und `generation_requests`
3. Frontend zeigt Themen-Liste
4. Bei Auswahl: GET `/api/archive/{request_id}/questions`
5. Backend liefert finalisierte Fragen aus `questions`-Tabelle

## 3. Technologie-Stack

| Schicht | Technologie | Begründung |
|----------|--------------|------------|
| Frontend | React (Vite) mit TypeScript | Moderne, performante UI mit Type-Safety |
| Backend | FastAPI (Python) | Schnell, asynchron, automatische API-Dokumentation |
| DB | PostgreSQL | Zuverlässig, JSONB-Support für flexible Datenstrukturen |
| LLM-API | OpenAI GPT-4 | Abstrakt über REST angebunden, konfigurierbares Modell |

## 4. API-Schnittstellen

### Generierung

- `POST /api/generate` – Generiert Prüfungsfragen
  - Request Body: `GenerateRequest` (topic, language, count, types, difficulty_distribution)
  - Response: `GenerateResponse` (accepted, request_id, questions[])

- `POST /api/finalize` – Finalisiert generierte Fragen
  - Request Body: `FinalizeQuestionsRequest` (request_id, questions[])
  - Response: `FinalizeQuestionsResponse` (success, finalized_count)

### Archiv

- `GET /api/archive/topics` – Liste aller finalisierten Themen
  - Response: `ArchiveTopicsResponse` (topics[])

- `GET /api/archive/{request_id}/questions` – Fragen zu einem Thema
  - Response: `ArchiveQuestionsResponse` (request_id, topic, questions[])

### System

- `GET /health` – Statusprüfung
- `GET /docs` – API-Dokumentation (Swagger UI)

## 5. Eingabeparameter

| Parameter | Typ | Beschreibung | Beispiel |
|-----------|-----|--------------|----------|
| **topic** | `string` | Thema oder Kapitel | `"Normalisierung in relationalen Datenbanken"` |
| **language** | `string` | Sprache (ISO-Code: "de" oder "en") | `"de"` |
| **count** | `integer` | Anzahl der Fragen (1-50) | `10` |
| **types** | `array<string>` | Fragetypen: "MCQ", "SHORT_ANSWER", "TRUE_FALSE" | `["MCQ", "TRUE_FALSE"]` |
| **difficulty_distribution** | `object` | Prozentuale Aufteilung (Summe muss 100 sein) | `{ "easy": 40, "medium": 40, "hard": 20 }` |

## 6. 3-Stage-Generierungsprozess

Das System verwendet einen mehrstufigen Ansatz, um die Qualität und Konsistenz der generierten Fragen zu gewährleisten:

1. **SKELETON-Stage:**
   - Erstellt ein strukturelles Gerüst
   - Bestimmt Fragetyp und Schwierigkeitsgrad für jede Frage
   - Validiert Anzahl und Struktur

2. **CONTENT-Stage:**
   - Generiert vollständige Fragen basierend auf dem Skeleton
   - Erstellt Fragetext, Antwortoptionen (bei MCQ), rationale Begründungen
   - Validiert Vollständigkeit und Format

3. **IMPROVE-Stage:**
   - Optimiert Fragen sprachlich und didaktisch
   - Verbessert Klarheit, Präzision und Konsistenz
   - Validiert, dass Kernstruktur erhalten bleibt

Jede Stage nutzt Jinja2-Templates, die in der Datenbank gespeichert sind und pro Sprache und Stage geladen werden.

## 7. Validierung & Fehlerbehandlung

**Frontend-Validierung:**
- Echtzeit-Validierung der Eingabefelder
- Prüfung von Pflichtfeldern, Wertebereichen und Summen

**Backend-Validierung:**
- Pydantic-Modell-Validierung (automatisch in FastAPI)
- Request-Validator für Business-Regeln
- Stage-Validatoren für LLM-Responses

**Fehlerbehandlung:**
- Strukturierte Exception-Klassen
- Automatische Retry-Logik bei Validierungsfehlern (max. 3 Versuche)
- Fehlerfeedback wird in Prompts für Retries verwendet
