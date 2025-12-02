# AILV-Project

KI-gestütztes Tool zur Unterstützung bei der Erstellung von Lehrveranstaltungsunterlagen (INNO Projekt FH Technikum Wien)

## Überblick

Das AILV-Project ist ein webbasiertes System zur automatischen Generierung von Prüfungsfragen mithilfe von Large Language Models (LLMs). Lehrende können Themen, Schwierigkeitsgrade und Lernziele eingeben, woraufhin das System passende Fragen generiert.

## Tech-Stack

- **Frontend**: React (Vite) mit TypeScript
- **Backend**: FastAPI (Python)
- **Datenbank**: PostgreSQL
- **Containerisierung**: Docker & Docker Compose

## Setup & Start

### Voraussetzungen

- Docker Desktop installiert und laufend
- Git (optional)

### Projekt starten

```bash
docker-compose up --build
```

Beim ersten Start werden alle Container gebaut und gestartet. Die Datenbank wird automatisch mit dem Schema aus `init.sql` initialisiert.

### Zugriff auf die Services

Nach dem Start sind folgende Services erreichbar:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
  - API-Dokumentation: http://localhost:8000/docs
  - Health-Check: http://localhost:8000/health
- **Datenbank**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `aildb`)

### Nützliche Befehle

```bash
# Services im Hintergrund starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services stoppen
docker-compose down

# Services stoppen + Volumes löschen (⚠️ löscht DB-Daten!)
docker-compose down -v
```

## Projektstruktur

```
AILV-Project/
├── backend/          # FastAPI Backend
│   ├── app/
│   │   ├── api/      # API-Routen
│   │   ├── models/   # Pydantic-Models & SQL-Models
│   │   └── services/ # Business-Logik & Validatoren
│   └── requirements.txt
├── frontend/         # React Frontend
│   ├── src/
│   │   ├── components/  # React-Komponenten
│   │   ├── pages/       # Seiten-Komponenten
│   │   └── types/       # TypeScript-Typdefinitionen
│   └── package.json
├── docs/             # Projekt-Dokumentation
│   ├── architecture.md
│   └── database.md
├── init.sql          # Datenbank-Schema
└── docker-compose.yml # Container-Orchestrierung
```

## Dokumentation

Für detaillierte Informationen siehe:

- **[Architekturübersicht](docs/architecture.md)**: Systemarchitektur, Datenfluss, Technologie-Stack und API-Schnittstellen
- **[Datenbankschema](docs/database.md)**: Entity-Relationship-Diagramm und Tabellenstruktur

## Aktueller Stand

**Sprint 2**: 
- Backend: Mock-Endpoint `/api/generate` mit Validierung implementiert
- Frontend: Formular zur Eingabe von Generierungsparametern vorhanden
- Datenbank: Schema definiert und initialisiert
