# API-Referenz – AILV Project

Alle Endpunkte – außer `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` und `GET /health` – erfordern einen gültigen JWT als Bearer-Token im `Authorization`-Header.

Eine interaktive Version dieser Dokumentation steht zur Laufzeit unter http://localhost:8000/docs (Swagger UI) zur Verfügung.

---

## Authentifizierung

### POST /api/auth/register

Legt einen neuen User an.

**Request Body:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "user@example.com"
}
```

### POST /api/auth/login

Gibt bei gültigen Credentials einen JWT zurück.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### PUT /api/auth/password

Ändert das Passwort des eingeloggten Users. Neues Passwort muss mindestens 8 Zeichen haben.

**Request Body:**
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

### POST /api/auth/forgot-password

Sendet eine Reset-Mail an die angegebene Adresse. Gibt immer `200 OK` zurück – unabhängig davon, ob die E-Mail existiert.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password

Setzt das Passwort mit einem gültigen Einmal-Token zurück. Neues Passwort muss mindestens 8 Zeichen haben.

**Request Body:**
```json
{
  "token": "string",
  "new_password": "string"
}
```

---

## Fragegenerierung

### POST /api/generate

Startet die 3-Stage-Pipeline zur Fragegenerierung.

**Request Body:**

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `topic` | `string` | ja | Thema oder Kapitel (min. 3 Zeichen) |
| `language` | `"de"` \| `"en"` | nein | Sprache (Standard: `"de"`) |
| `count` | `integer` | nein | Anzahl der Fragen, 1–50 (Standard: `10`) |
| `types` | `array<string>` | nein | `"MCQ"`, `"SHORT_ANSWER"`, `"TRUE_FALSE"` (Standard: `["MCQ"]`) |
| `difficulty_distribution` | `object` | nein | Prozentuale Aufteilung, Summe = 100 (Standard: `{"easy": 50, "medium": 30, "hard": 20}`) |
| `context_text` | `string` | nein | Freitext als zusätzlicher Kontext |
| `upload_context` | `string` | nein | Aus PDF extrahierter Text |

**Response:** `GenerateResponse`
```json
{
  "accepted": true,
  "request_id": "uuid",
  "topic": "string",
  "language": "de",
  "count": 10,
  "questions": [
    {
      "id": "uuid",
      "question": "string",
      "type": "MCQ",
      "difficulty": "medium",
      "choices": ["A", "B", "C", "D"],
      "correct_index": 1,
      "answer": null,
      "rationale": "string"
    }
  ],
  "note": "string"
}
```

### POST /api/finalize

Verschiebt generierte Fragen aus dem temporären Speicher ins Archiv. Die Fragen können vor der Finalisierung noch bearbeitet werden – alle Felder im `questions`-Array sind optional und überschreiben den generierten Wert.

**Request Body:**
```json
{
  "request_id": "uuid",
  "questions": [
    {
      "generated_question_id": "uuid",
      "type": "MCQ",
      "difficulty": "medium",
      "stem": "Fragetext",
      "choices": ["A", "B", "C", "D"],
      "correct_index": 1,
      "answer": null,
      "rationale": "Begründung"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "finalized_count": 10,
  "message": "Questions finalized successfully"
}
```

---

## Fragen-Archiv

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET`    | `/api/archive/topics` | Eigene finalisierte Themen (optional `?q=Suchbegriff`) |
| `GET`    | `/api/archive/{request_id}/questions` | Alle Fragen eines Themas |
| `PUT`    | `/api/archive/{request_id}/questions` | Fragen eines Themas aktualisieren |
| `DELETE` | `/api/archive/{request_id}` | Themen-Eintrag löschen |

---

## Foliengenerierung

### POST /api/slides/generate

Startet die 3-Stage-Pipeline zur Foliengenerierung.

**Request Body:**

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `topic` | `string` | ja | Thema der Präsentation |
| `language` | `"de"` \| `"en"` | nein | Sprache (Standard: `"de"`) |
| `slide_count` | `integer` | ja | Anzahl der gewünschten Folien |
| `context_text` | `string` | nein | Freitext als zusätzlicher Kontext |
| `upload_context` | `string` | nein | Aus PDF extrahierter Text |

**Response:** `SlidesGenerateResponse`
```json
{
  "status": "ok",
  "request_id": "uuid",
  "slides": [
    {
      "position": 1,
      "slide_type": "title",
      "title": "string",
      "bullets": []
    }
  ]
}
```

### POST /api/slides/finalize

Speichert den generierten Foliensatz als Deck im Archiv. Der Name muss mindestens 3 Zeichen lang sein.

**Request Body:**
```json
{
  "request_id": "uuid",
  "name": "Mein Foliensatz"
}
```

**Response:**
```json
{
  "deck_id": "uuid",
  "saved_slides_count": 12
}
```

---

## Folien-Archiv

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET`    | `/api/slides/archive` | Eigene Decks |
| `GET`    | `/api/slides/archive/{deck_id}` | Deck-Detail mit allen Folien |
| `PUT`    | `/api/slides/archive/{deck_id}` | Deck und Folien bearbeiten |
| `DELETE` | `/api/slides/archive/{deck_id}` | Deck löschen |

---

## Upload

### POST /api/upload/pdf

Extrahiert den Text aus einer PDF-Datei und gibt ihn zurück. Der Text kann anschließend als `upload_context` in einen Generierungsrequest eingebunden werden.

- Maximalgröße: **5 MB**
- Verschlüsselte PDFs werden abgelehnt
- Bei sehr langen Dokumenten wird der Text gekürzt (`was_truncated: true`)

**Response:**
```json
{
  "filename": "skript.pdf",
  "char_count": 12400,
  "extracted_text": "...",
  "was_truncated": false
}
```

---

## System

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/health` | Statusprüfung |
| `GET` | `/docs` | Interaktive API-Dokumentation (Swagger UI) |
