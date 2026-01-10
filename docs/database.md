# Datenbank-Dokumentation

## Überblick

Die Datenbank verwendet PostgreSQL mit UUID als Primärschlüssel. Das Schema speichert Generation-Requests, Prompts, temporär generierte Fragen, finalisierte Fragen im Archiv sowie Prompt-Templates.

## Entity-Relationship-Diagramm

erDiagram

    USERS {
        uuid id PK
        varchar name
        varchar email
    }

    GENERATION_REQUESTS {
        uuid id PK
        uuid user_id FK
        text topic
        varchar language
        int count
        jsonb types
        jsonb difficulty_distribution
        timestamp created_at
    }

    PROMPT_TEMPLATES {
        uuid id PK
        varchar stage
        varchar language
        text template
    }

    PROMPTS {
        uuid id PK
        uuid request_id FK
        varchar stage
        text prompt_text
        text response_text
        timestamp created_at
    }

    GENERATED_QUESTIONS {
        uuid id PK
        uuid request_id FK
        uuid prompt_id FK
        varchar stage
        varchar type
        varchar difficulty
        text stem
        jsonb choices
        int correct_index
        text rationale
        timestamp created_at
    }

    QUESTIONS {
        uuid id PK
        uuid request_id FK
        uuid prompt_id FK
        varchar type
        varchar difficulty
        text stem
        jsonb choices
        int correct_index
        text rationale
        timestamp created_at
    }

    %% Beziehungen
    USERS ||--o{ GENERATION_REQUESTS : "creates"
    GENERATION_REQUESTS ||--o{ PROMPTS : "has"
    GENERATION_REQUESTS ||--o{ GENERATED_QUESTIONS : "produces"
    GENERATION_REQUESTS ||--o{ QUESTIONS : "finalizes"
    PROMPTS ||--o{ GENERATED_QUESTIONS : "generates"
    PROMPTS ||--o{ QUESTIONS : "informs"

## Tabellenbeschreibung

### users

Basis-Tabelle für zukünftige User-Funktionalität. Aktuell wird `user_id` in `generation_requests` nicht verwendet.

**Hauptfelder:** `id`, `name`, `email`

### generation_requests

Speichert alle Anfragen zur Fragegenerierung mit Parametern wie Thema, Sprache, Anzahl und Fragetypen.

**Hauptfelder:** `id`, `topic`, `language`, `count`, `types`, `difficulty_distribution`, `created_at`

### prompt_templates

Speichert Jinja2-Templates für die drei Generierungs-Stages (SKELETON, CONTENT, IMPROVE) in verschiedenen Sprachen (de, en).

**Hauptfelder:** `id`, `stage`, `language`, `template`

### prompts

Speichert alle Prompts und LLM-Responses für jeden Request und jede Stage. Enthält sowohl den gerenderten Prompt-Text als auch die LLM-Antwort.

**Hauptfelder:** `id`, `request_id`, `stage`, `prompt_text`, `response_text`, `created_at`

### generated_questions

Speichert temporär generierte Fragen während des Generierungsprozesses. Enthält alle Felder einer Frage (Typ, Schwierigkeit, Fragetext, Antwortoptionen, rationale Begründung) sowie die `stage`, in der die Frage erstellt wurde.

**Wichtig:** Diese Tabelle enthält temporäre Daten. Nach der Finalisierung werden die Fragen nach `questions` verschoben und aus dieser Tabelle gelöscht.

**Hauptfelder:** `id`, `request_id`, `prompt_id`, `stage`, `type`, `difficulty`, `stem`, `choices`, `correct_index`, `rationale`

### questions

Speichert finalisierte Fragen im Archiv. Struktur ähnlich wie `generated_questions`, aber ohne `stage`-Feld.

**Unterschied zu generated_questions:**
- Kein `stage`-Feld (Frage ist bereits finalisiert)
- Enthält nur dauerhaft gespeicherte, finalisierte Fragen

**Hauptfelder:** `id`, `request_id`, `prompt_id`, `type`, `difficulty`, `stem`, `choices`, `correct_index`, `rationale`

## Datenfluss

1. **Generierung:** `generation_requests` → `prompts` (pro Stage: SKELETON, CONTENT, IMPROVE) → `generated_questions`
2. **Finalisierung:** `generated_questions` → `questions` (neue `Question`-Objekte werden erstellt, alle `GeneratedQuestion` zu diesem `request_id` werden gelöscht)
3. **Archiv:** Alle finalisierten Fragen in `questions` sind über `request_id` mit `generation_requests` verknüpft

## Prompt-Templates

Die `prompt_templates`-Tabelle enthält vordefinierte Jinja2-Templates für:
- **SKELETON** (de/en): Erstellt Strukturgerüst mit Fragetypen und Schwierigkeitsgraden
- **CONTENT** (de/en): Generiert vollständige Fragen auf Basis des Gerüsts
- **IMPROVE** (de/en): Optimiert Fragen sprachlich und didaktisch

Templates werden zur Laufzeit mit Variablen wie `{{topic}}`, `{{count}}`, `{{types}}`, `{{difficulty_distribution}}` gerendert.