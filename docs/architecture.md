# Architekturübersicht – AILV Project

## 1. Gesamtüberblick
Das System besteht aus vier Hauptkomponenten:
- **Frontend (React)**: Benutzeroberfläche zur Eingabe von Themen und Anzeige von Ergebnissen.
- **Backend (FastAPI)**: Vermittler zwischen Frontend, Datenbank und LLM-API, zustädig für Validierungslogik.
- **LLM-API**: Externe Schnittstelle (z. B. OpenAI oder HuggingFace), die Text generiert.
- **Datenbank (PostgreSQL)**: Speichert Prompts, generierte Ergebnisse und Logs.

## 2. Datenfluss
1. Nutzer gibt im Frontend alle Eingabeparameter ein.  
2. Frontend sendet Anfrage an `/generate` im Backend.  
3. Backend validiert Eingaben, legt einen Job in der DB an und ruft (später) die LLM-API auf.
4. LLM generiert Frageninhalt
5. Backend prüft Ergebnisse(Sanity-Checks)  
6. Ergebnis wird gespeichert und ans Frontend zurückgeschickt.  

## 3. Technologie-Stack
| Schicht | Technologie | Begründung |
|----------|--------------|------------|
| Frontend | React (Vite) | Moderne, performante UI mit TypeScript-Support |
| Backend  | FastAPI | Schnell, asynchron, mit eingebauter Doku |
| DB       | PostgreSQL | Zuverlässig, JSON-Support, ideal für strukturierte & semistrukturierte Daten |
| LLM-API  | OpenAI / lokales Modell | Abstrakt über REST angebunden |

## 4. Schnittstellen (Stand Sprint 1)
- `GET /health` – Statusprüfung  
- `POST /generate` – nimmt Eingabeparameter entgegen  
- `GET /docs` – API-Dokumentation

## Eingabeparameter für die Prüfungsfragen-Generierung

| **Parameter** | **Typ** | **Beschreibung** | **Beispiel** |
|----------------|----------|------------------|---------------|
| **topic** | `string` | Thema oder Kapitel, zu dem Fragen generiert werden sollen. | `"Normalisierung in relationalen Datenbanken"` |
| **language** | `string` | Sprache der generierten Fragen (ISO-Code). | `"de"` |
| **count** | `integer` | Anzahl der zu generierenden Fragen. | `10` |
| **types** | `array<string>` | Art der Fragen. Unterstützte Werte: `"MCQ"`, `"Kurzantwort"`, `"Rechenaufgabe"`. | `["MCQ", "Kurzantwort"]` |
| **difficulty_distribution** | `object` | Prozentuale Aufteilung der Schwierigkeitsgrade. | `{ "easy": 50, "medium": 30, "hard": 20 }` |
| **learning_objectives** | `array<string>` | Lernziele oder Kompetenzen, die durch die Fragen abgedeckt werden sollen. | `["Normalformen anwenden", "Funktionale Abhängigkeiten erkennen"]` |
| **bloom_level** | `string` | Kognitive Lernstufe nach der Bloom-Taxonomie (z. B. "Verstehen", "Anwenden", "Analysieren"). | `"Anwenden"` |
| **target_audience** | `string` | Zielgruppe oder Kursniveau. | `"Bachelor, 2. Semester Informatik"` |
| **context_text** | `string` | Optionaler Referenztext aus Lehrmaterialien oder Skripten. Wird als thematischer Kontext für die Generierung verwendet. | `"In der dritten Normalform dürfen keine transitiven Abhängigkeiten bestehen..."` |
| **attachments** | `array<File>` | Optional hochgeladene Dateien (z. B. PDF, DOCX, TXT) zur Kontextanreicherung. | `["skript.pdf", "folien.docx"]` |


## 5. Offene Punkte / Nächste Schritte
- Datenbankschema verfeinern (Prompts, Results, Logs)
- Validierung & Pydantic-Contracts definieren
- Frontend-Anbindung in Sprint 2
