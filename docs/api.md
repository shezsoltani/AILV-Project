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

## Lehrveranstaltungen (LV)

> **Status:** Das Datenmodell ist von der Product Ownerin bestätigt (Variante B: keine bis mehrere LVs pro Frage, Fragen ohne LV erlaubt, LV nur mit Bezeichnung; siehe `docs/database.md`). Die konkreten Felder, Pfade und Statuscodes unten sind ein **Vorschlag**, der noch mit der API-Umsetzung (SCRUM-7/SCRUM-8) abgestimmt wird.

Alle Endpunkte erfordern einen JWT. Es sind ausschließlich **eigene** LVs und **eigene** Fragen erreichbar. Fehlerantworten haben wie bisher die Form `{"detail": "..."}`.

### Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | `uuid` | ID der LV |
| `name` | `string` | Bezeichnung, 1–255 Zeichen nach dem Trimmen, eindeutig pro User (ohne Beachtung von Groß-/Kleinschreibung) |
| `created_at` | `datetime` | Zeitstempel |
| `question_count` | `integer` | Anzahl zugeordneter Fragen (nur in der Listenantwort) |
| `course_ids` | `array<uuid>` | LV-IDs einer Frage (Antwortfeld, zusätzlich) |

### LVs verwalten

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET`    | `/api/courses` | Eigene LVs inkl. `question_count` |
| `POST`   | `/api/courses` | LV anlegen |
| `PUT`    | `/api/courses/{course_id}` | LV umbenennen |
| `DELETE` | `/api/courses/{course_id}` | LV löschen (entfernt nur die Zuordnungen, keine Fragen) |

**Beispiel – LV anlegen**
```http
POST /api/courses
Authorization: Bearer eyJ...
Content-Type: application/json

{ "name": "Mathematik 1" }
```
**Response `201`:**
```json
{ "id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41", "name": "Mathematik 1", "created_at": "2026-11-01T10:00:00Z", "question_count": 0 }
```

**Antwort `DELETE` `200`:**
```json
{ "success": true, "course_id": "uuid", "removed_assignments": 12 }
```

### Fragen einer LV zuordnen

`PUT /api/archive/questions/{question_id}/courses` setzt die **vollständige** Menge der LVs einer Frage (idempotent). Eine leere Liste entfernt alle Zuordnungen; die Frage bleibt bestehen.

**Beispiel – dieselbe Frage in Mathematik und Statistik, ohne Kopie**
```http
PUT /api/archive/questions/9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55/courses
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "course_ids": [
    "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
    "c84d1a77-92be-4e0f-b3a6-5f1e2d9c8b10"
  ]
}
```
**Response `200`:**
```json
{
  "question_id": "9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55",
  "course_ids": [
    "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
    "c84d1a77-92be-4e0f-b3a6-5f1e2d9c8b10"
  ]
}
```

### Archiv filtern

`GET /api/archive/topics` und `GET /api/archive/{request_id}/questions` erhalten optionale Query-Parameter:

| Parameter | Typ | Bedeutung |
|-----------|-----|-----------|
| `course_id` | `uuid`, mehrfach erlaubt | nur Fragen, die **mindestens einer** der angegebenen LVs zugeordnet sind (ODER-Verknüpfung) |
| `unassigned` | `boolean` (Standard `false`) | nur Fragen **ohne** LV |

Beide lassen sich weiterhin mit `q` kombinieren (UND-Verknüpfung). Bei `/archive/topics` werden nur Themen mit mindestens einer passenden Frage geliefert, `question_count` zählt dann nur die passenden Fragen. Die Antwort von `/archive/{request_id}/questions` enthält pro Frage zusätzlich `course_ids`.

**Beispiel – Filterung nach LV und Suchbegriff**
```http
GET /api/archive/topics?course_id=3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41&q=Ableitung
Authorization: Bearer eyJ...
```

**Beispiel – Fragen ohne LV**
```http
GET /api/archive/topics?unassigned=true
```

Ohne die neuen Parameter ist das Verhalten unverändert, `request_id` und der Pfad bleiben gleich.

### Verhalten bei Sonderfällen

| Fall | Antwort |
|------|---------|
| `name` leer oder nur Leerzeichen | `422` |
| `name` länger als 255 Zeichen | `422` |
| LV-Name existiert für diesen User bereits (auch in anderer Schreibweise) | `409` |
| `course_id` unbekannt | `404` |
| `course_id` gehört einem anderen User | `404` (gleiche Antwort wie „unbekannt“, damit keine fremden IDs bestätigt werden) |
| `question_id` unbekannt oder fremd | `404` |
| `course_ids` enthält eine unbekannte oder fremde ID | `404` für den **gesamten** Aufruf; es wird nichts geändert |
| `course_ids` enthält Duplikate | werden ignoriert (Menge) |
| `course_ids` leer | gültig, entfernt alle Zuordnungen |
| Ungültige UUID | `422` |
| `course_id` und `unassigned=true` gleichzeitig | `422` (widersprüchlich) |
| Filter mit unbekannter/fremder `course_id` | `404` |
| LV existiert, aber keine passende Frage | `200` mit leerer Liste |
| Kein JWT | `401` |

### Offene Punkte (nicht beschlossen)

- Fremde Ressourcen liefern bei den neuen Endpunkten `404`, während `routes_archive.py` bisher `403` verwendet. Konsistenz oder Nicht-Preisgabe: noch zu entscheiden.
- Optionales Bulk-Zuordnen (`POST /api/courses/{course_id}/questions` mit `question_ids`) ist nicht Teil des Vorschlags.
- Ob `/api/finalize` direkt `course_ids` annehmen darf (Vorschlag: nein).

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


## KI-Auswahl f?r Fragen (SCRUM-5)

`POST /api/generate` akzeptiert zus?tzlich `provider` (`openai` oder `ollama`)
und `model` (z. B. `qwen3:8b`). Ohne Auswahl bleibt OpenAI der Standard.
Die aufgel?ste Auswahl wird in den Job-Eingaben gespeichert. Nicht freigegebene
Anbieter oder Modelle werden vor dem Jobstart mit HTTP 422 abgelehnt.

`GET /api/generation/models` ben?tigt wie die Generierung eine Anmeldung und liefert:

```json
{"models": [{"provider": "ollama", "model": "qwen3:8b", "available": true, "reason": null}]}
```

Die Liste enth?lt nur serverseitig freigegebene Modelle. OpenAI-Verf?gbarkeit
bedeutet hier: API-Key vorhanden (keine kostenpflichtige Probe). Bei Ollama werden
Erreichbarkeit und Installation gepr?ft; dies garantiert noch keine erfolgreiche
Generierung bei hoher Auslastung. Der Browser ?bergibt keine Serveradresse.

Lokal in `.env`: `OLLAMA_ENABLED=true`. Weitere Einstellungen stehen in
`.env.example`: `OLLAMA_BASE_URL`, `OLLAMA_MODELS` (kommagetrennt) und
`OLLAMA_TIMEOUT_SECONDS`. Nach ?nderungen: `docker compose up -d backend`.
Ohne Freischaltung bleibt Ollama deaktiviert. Kein automatischer Wechsel zu OpenAI.
