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
| `course_ids` | `array<uuid>` | nein | Eigene Lehrveranstaltungen für diesen Auftrag (Standard: `[]` = keine LV / allgemein). Siehe [LV-Auswahl beim Generieren und Speichern](#lv-auswahl-beim-generieren-und-speichern-course_ids) |

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
  ],
  "course_ids": ["uuid"]
}
```

`course_ids` ist optional (Standard: `[]`). Ohne das Feld funktioniert der Aufruf wie bisher.

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "finalized_count": 10,
  "message": "Questions finalized successfully"
}
```

### LV-Auswahl beim Generieren und Speichern (`course_ids`)

Fragen können schon beim Generieren eigenen Lehrveranstaltungen zugeordnet werden (SCRUM-43). Die Zuordnungen entstehen erst beim Speichern, weil erst dort die endgültigen Fragen angelegt werden.

1. `POST /api/generate` mit `course_ids` senden. Das Backend prüft vor dem Jobstart, dass alle LVs dem angemeldeten Nutzer gehören, und speichert die Auswahl mit den Job-Eingaben. Die LVs werden nicht in die KI-Prompts eingebaut.
2. `POST /api/finalize` mit **derselben** Auswahl als `course_ids` senden. Das Backend prüft die LVs erneut und legt die Zuordnungen in derselben Transaktion wie die Fragen an. Jede gespeicherte Frage erhält alle angegebenen LVs.

| Fall | Antwort |
|------|---------|
| Feld fehlt oder `[]` | gültig; die Fragen bleiben allgemein (ohne LV) |
| Doppelte IDs | werden ignoriert |
| Unbekannte, gelöschte oder fremde LV | `404 Not Found` mit `"Course not found"`. Bei `/api/generate` wird kein Job gestartet. Bei `/api/finalize` wird nichts gespeichert, auch keine Fragen; die Entwürfe bleiben erhalten und können erneut gespeichert werden |
| `null` oder ungültige UUID | `422 Unprocessable Entity` |

Nachträglich ändern lassen sich die Zuordnungen über `PUT /api/archive/questions/{question_id}/courses`.

---

## Fragen-Archiv

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET`    | `/api/archive/topics` | Eigene finalisierte Themen (optional `?q=Suchbegriff`, `?course_id=...`, `?unassigned=true`) |
| `GET`    | `/api/archive/{request_id}/questions` | Alle Fragen eines Themas (optional `?course_id=...`, `?unassigned=true`) |
| `PUT`    | `/api/archive/{request_id}/questions` | Fragen eines Themas aktualisieren |
| `DELETE` | `/api/archive/{request_id}` | Themen-Eintrag löschen |
| `PUT` / `PATCH` | `/api/archive/questions/{question_id}/courses` | Vollständige LV-Zuordnung einer Frage setzen oder entfernen |

---

## Lehrveranstaltungen (LV)

> **Status:** Umgesetzt in SCRUM-30 (Modell: SCRUM-6 / Migration: SCRUM-7, Variante B: keine bis mehrere LVs pro Frage, Fragen ohne LV erlaubt, LV mit Bezeichnung).

Alle Endpunkte erfordern einen JWT als Bearer-Token. Es sind ausschließlich **eigene** LVs und **eigene** Fragen erreichbar. Fremde oder unbekannte IDs werden einheitlich mit `404` beantwortet, um ID-Enumeration zu verhindern. Fehlerantworten haben die Form `{"detail": "..."}`.

### Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | `uuid` | ID der LV |
| `name` | `string` | Bezeichnung, 1–255 Zeichen nach dem Trimmen, eindeutig pro User (ohne Beachtung von Groß-/Kleinschreibung) |
| `created_at` | `datetime` | Zeitstempel der Erstellung |
| `question_count` | `integer` | Anzahl zugeordneter Fragen (in der LV-Listen-/Detailantwort) |
| `course_ids` | `array<uuid>` | LV-IDs einer Frage (Antwortfeld in archivierten Fragen) |

### LVs verwalten

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET`    | `/api/courses` | Eigene LVs auflisten inkl. `question_count` |
| `POST`   | `/api/courses` | Neue LV anlegen |
| `GET`    | `/api/courses/{course_id}` | Einzelne LV anzeigen |
| `PUT` / `PATCH` | `/api/courses/{course_id}` | LV umbenennen |
| `DELETE` | `/api/courses/{course_id}` | LV löschen (entfernt nur die Zuordnungen in `question_courses`, keine Fragen) |

#### Beispiel 1: LV anlegen
```http
POST /api/courses
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Mathematik 1"
}
```
**Response `201 Created`:**
```json
{
  "id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
  "name": "Mathematik 1",
  "created_at": "2026-11-01T10:00:00Z",
  "question_count": 0
}
```

#### Beispiel 2: LVs auflisten
```http
GET /api/courses
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
[
  {
    "id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
    "name": "Mathematik 1",
    "created_at": "2026-11-01T10:00:00Z",
    "question_count": 2
  }
]
```

#### Beispiel 2b: Einzelne LV anzeigen
```http
GET /api/courses/3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
  "name": "Mathematik 1",
  "created_at": "2026-11-01T10:00:00Z",
  "question_count": 2
}
```

#### Beispiel 3: LV umbenennen
```http
PATCH /api/courses/3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Höhere Mathematik 1"
}
```
*(Auch via `PUT /api/courses/3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41` möglich)*

**Response `200 OK`:**
```json
{
  "id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
  "name": "Höhere Mathematik 1",
  "created_at": "2026-11-01T10:00:00Z",
  "question_count": 2
}
```

#### Beispiel 4: LV löschen
```http
DELETE /api/courses/3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "success": true,
  "course_id": "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
  "removed_assignments": 2
}
```

---

### Fragen einer LV zuordnen & Zuordnung entfernen

`PUT /api/archive/questions/{question_id}/courses` (oder `PATCH`) setzt die **vollständige** Menge der LVs einer Frage (idempotent).
Eine leere Liste entfernt alle Zuordnungen; die Frage bleibt dabei vollständig bestehen.

#### Beispiel 1: Frage einer oder mehreren LVs zuordnen
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
**Response `200 OK`:**
```json
{
  "question_id": "9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55",
  "course_ids": [
    "3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41",
    "c84d1a77-92be-4e0f-b3a6-5f1e2d9c8b10"
  ]
}
```

#### Beispiel 2: Zuordnung entfernen (Frage wieder ohne LV)
```http
PUT /api/archive/questions/9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55/courses
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "course_ids": []
}
```
**Response `200 OK`:**
```json
{
  "question_id": "9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55",
  "course_ids": []
}
```

---

### Archiv filtern

`GET /api/archive/topics` und `GET /api/archive/{request_id}/questions` erhalten optionale Query-Parameter:

| Parameter | Typ | Bedeutung |
|-----------|-----|-----------|
| `course_id` | `uuid`, mehrfach erlaubt | nur Fragen, die **mindestens einer** der angegebenen LVs zugeordnet sind (ODER-Verknüpfung) |
| `unassigned` | `boolean` (Standard `false`) | nur Fragen **ohne** LV |

Beide lassen sich weiterhin mit `q` kombinieren (UND-Verknüpfung).
- Bei `GET /api/archive/topics` werden nur Themen mit mindestens einer passenden Frage geliefert. `question_count` zählt dann nur die passenden Fragen dieses Themas.
- Bei `GET /api/archive/{request_id}/questions` enthält jede Frage in der Antwortliste das Feld `course_ids: [...]`. Wenn für das Thema keine Fragen auf den Filter zutreffen, wird `200 OK` mit einer leeren Fragenliste `{"questions": []}` zurückgegeben.

#### Beispiel 1: Themen nach einer LV filtern
```http
GET /api/archive/topics?course_id=3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "topics": [
    {
      "request_id": "7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41",
      "topic": "Lineare Algebra",
      "language": "de",
      "question_count": 2,
      "types": ["SCQ"],
      "created_at": "2026-11-01T10:15:00Z",
      "finalized_at": "2026-11-01T10:16:00Z"
    }
  ]
}
```

#### Beispiel 2: Themen nach Fragen ohne LV filtern
```http
GET /api/archive/topics?unassigned=true
Authorization: Bearer eyJ...
```

#### Beispiel 3: Fragen eines Themas nach LV filtern
```http
GET /api/archive/7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41/questions?course_id=3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "request_id": "7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41",
  "topic": "Lineare Algebra",
  "language": "de",
  "questions": [
    {
      "id": "9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55",
      "question": "Was ist der Rang einer Matrix?",
      "type": "SCQ",
      "difficulty": "medium",
      "choices": ["Dimension des Spaltenraums", "Spur der Matrix", "Determinante", "Anzahl der Zeilen"],
      "correct_index": 0,
      "correct_indices": null,
      "answer": null,
      "rationale": "Der Rang entspricht der Dimension des von den Spaltenvektoren aufgespannten Vektorraums.",
      "course_ids": ["3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41"]
    }
  ]
}
```

#### Beispiel 4: Fragen eines Themas nach Fragen ohne LV filtern
```http
GET /api/archive/7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41/questions?unassigned=true
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "request_id": "7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41",
  "topic": "Lineare Algebra",
  "language": "de",
  "questions": [
    {
      "id": "4e7a1c20-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
      "question": "Was ist eine Basis eines Vektorraums?",
      "type": "SHORT_ANSWER",
      "difficulty": "hard",
      "choices": null,
      "correct_index": null,
      "correct_indices": null,
      "answer": "Ein linear unabhängiges Erzeugendensystem.",
      "rationale": "Jeder Vektor lässt sich eindeutig als Linearkombination der Basisvektoren darstellen.",
      "course_ids": []
    }
  ]
}
```

#### Beispiel 5: Fragen eines Themas ungefiltert (Standard / Rückwärtskompatibilität)
```http
GET /api/archive/7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41/questions
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "request_id": "7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41",
  "topic": "Lineare Algebra",
  "language": "de",
  "questions": [
    {
      "id": "9a1c7e20-5b3d-4f88-a2c4-7e6d0b1f3a55",
      "question": "Was ist der Rang einer Matrix?",
      "type": "SCQ",
      "difficulty": "medium",
      "choices": ["Dimension des Spaltenraums", "Spur der Matrix", "Determinante", "Anzahl der Zeilen"],
      "correct_index": 0,
      "correct_indices": null,
      "answer": null,
      "rationale": "Der Rang entspricht der Dimension des von den Spaltenvektoren aufgespannten Vektorraums.",
      "course_ids": ["3f2b8c1e-0a6d-4c52-9f0e-1d7a5b9c2e41"]
    },
    {
      "id": "4e7a1c20-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
      "question": "Was ist eine Basis eines Vektorraums?",
      "type": "SHORT_ANSWER",
      "difficulty": "hard",
      "choices": null,
      "correct_index": null,
      "correct_indices": null,
      "answer": "Ein linear unabhängiges Erzeugendensystem.",
      "rationale": "Jeder Vektor lässt sich eindeutig als Linearkombination der Basisvektoren darstellen.",
      "course_ids": []
    }
  ]
}
```

#### Beispiel 6: Filter ohne Treffer (leere Fragenliste)
```http
GET /api/archive/7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41/questions?course_id=c84d1a77-92be-4e0f-b3a6-5f1e2d9c8b10
Authorization: Bearer eyJ...
```
**Response `200 OK`:**
```json
{
  "request_id": "7b1f3a55-5b3d-4f88-a2c4-9a1c7e202e41",
  "topic": "Lineare Algebra",
  "language": "de",
  "questions": []
}
```
*(Hinweis für Frontend: Gibt bei gültiger, aber nicht zutreffender LV `200 OK` mit leerem `questions`-Array zurück, kein 404).*

---

### Verhalten bei Sonderfällen

| Fall | Antwort |
|------|---------|
| `name` leer oder nur Leerzeichen | `422 Unprocessable Entity` |
| `name` länger als 255 Zeichen | `422 Unprocessable Entity` |
| LV-Name existiert für diesen User bereits (auch in anderer Schreibweise) | `409 Conflict` |
| `course_id` unbekannt oder gehört anderem User | `404 Not Found` (einheitliche Antwort, keine Preisgabe fremder IDs) |
| `question_id` unbekannt oder fremd | `404 Not Found` |
| `course_ids` enthält eine unbekannte oder fremde ID | `404 Not Found` für den **gesamten** Aufruf; es wird atomar nichts geändert |
| `course_ids` enthält Duplikate | werden ignoriert (Menge) |
| `course_ids` leer | gültig, entfernt alle Zuordnungen |
| Ungültige UUID | `422 Unprocessable Entity` |
| `course_id` und `unassigned=true` gleichzeitig | `422 Unprocessable Entity` (widersprüchlich) |
| Filter mit unbekannter/fremder `course_id` | `404 Not Found` |
| LV existiert, aber keine passende Frage im Filter | `200 OK` mit leerer Liste |
| Kein JWT | `401 Unauthorized` |

#### Typische Fehlerantworten für die Frontend-Arbeit:

- **404 Not Found** (fremde oder unbekannte `course_id` oder `question_id`):
  ```json
  {
    "detail": "Course not found"
  }
  ```
- **403 Forbidden** (Zugriffsversuch auf fremden Archiv-Request):
  ```json
  {
    "detail": "Not allowed to access this resource"
  }
  ```
- **409 Conflict** (LV-Name für diesen Benutzer bereits vergeben):
  ```json
  {
    "detail": "A course with this name already exists"
  }
  ```
- **422 Unprocessable Entity** (widersprüchliche Parameter `course_id` und `unassigned=true` gleichzeitig):
  ```json
  {
    "detail": "Parameters 'course_id' and 'unassigned' cannot be used together."
  }
  ```
- **422 Unprocessable Entity** (leerer oder ungültiger LV-Name):
  ```json
  {
    "detail": [
      {
        "loc": ["body", "name"],
        "msg": "Course name cannot be empty",
        "type": "value_error"
      }
    ]
  }
  ```

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


## KI-Auswahl für Fragen (SCRUM-5)

`POST /api/generate` akzeptiert zusätzlich `provider` (`openai` oder `ollama`)
und `model` (z. B. `qwen3:8b`). Ohne Auswahl bleibt OpenAI der Standard.
Die aufgelöste Auswahl wird in den Job-Eingaben gespeichert. Nicht freigegebene
Anbieter oder Modelle werden vor dem Jobstart mit HTTP 422 abgelehnt.

`GET /api/generation/models` benötigt wie die Generierung eine Anmeldung und liefert:

```json
{"models": [{"provider": "ollama", "model": "qwen3:8b", "available": true, "reason": null}]}
```

Die Liste enthält nur serverseitig freigegebene Modelle. OpenAI-Verfügbarkeit
bedeutet hier: API-Key vorhanden (keine kostenpflichtige Probe). Bei Ollama werden
Erreichbarkeit und Installation geprüft; dies garantiert noch keine erfolgreiche
Generierung bei hoher Auslastung. Der Browser übergibt keine Serveradresse.

Lokal in `.env`: `OLLAMA_ENABLED=true`. Weitere Einstellungen stehen in
`.env.example`: `OLLAMA_BASE_URL`, `OLLAMA_MODELS` (kommagetrennt) und
`OLLAMA_TIMEOUT_SECONDS`. Nach Änderungen: `docker compose up -d backend`.
Ohne Freischaltung bleibt Ollama deaktiviert. Kein automatischer Wechsel zu OpenAI.
