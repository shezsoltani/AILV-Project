# Architekturübersicht – AILV Project

## 1. Gesamtüberblick
Das System besteht aus vier Hauptkomponenten:
- **Frontend (React)**: Benutzeroberfläche zur Eingabe von Themen und Anzeige von Ergebnissen.
- **Backend (FastAPI)**: Vermittler zwischen Frontend, Datenbank und LLM-API.
- **LLM-API**: Externe Schnittstelle (z. B. OpenAI oder HuggingFace), die Text generiert.
- **Datenbank (PostgreSQL)**: Speichert Prompts, generierte Ergebnisse und Logs.

## 2. Datenfluss
1. Nutzer gibt im Frontend ein Thema, Sprache und Dokumenttyp ein.  
2. Frontend sendet Anfrage an `/generate` im Backend.  
3. Backend validiert Eingaben, legt einen Job in der DB an und ruft (später) die LLM-API auf.  
4. Ergebnis wird gespeichert und ans Frontend zurückgeschickt.  

## 3. Technologie-Stack
| Schicht | Technologie | Begründung |
|----------|--------------|------------|
| Frontend | React (Vite) | Moderne, performante UI mit TypeScript-Support |
| Backend  | FastAPI | Schnell, asynchron, mit eingebauter Doku |
| DB       | PostgreSQL | Zuverlässig, JSON-Support, ideal für strukturierte & semistrukturierte Daten |
| LLM-API  | OpenAI / lokales Modell | Abstrakt über REST angebunden |

## 4. Schnittstellen (Stand Sprint 1)
- `GET /health` – Statusprüfung  
- `POST /generate` – nimmt `topic`, `language`, `artifact_type`, `constraints` entgegen (Stub in Sprint 1)  
- `GET /docs` – API-Dokumentation  

## 5. Offene Punkte / Nächste Schritte
- Datenbankschema verfeinern (Prompts, Results, Logs)
- Validierung & Pydantic-Contracts definieren
- Frontend-Anbindung in Sprint 2
