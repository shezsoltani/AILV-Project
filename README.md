# AILV-Project

AI-Unterstützung zur Erstellung von LV-Unterlagen

Ein webbasiertes Tool, das Lehrende bei der Erstellung von Lehrveranstaltungsunterlagen unterstützt. Das System zerlegt komplexe Aufgaben automatisch in kleinere Teilschritte, lässt sie von einem Large Language Model (LLM) bearbeiten und überprüft die Ergebnisse automatisch, um konsistente, qualitativ hochwertige Lehrunterlagen zu erstellen.

---

## Überblick

Das Projekt entwickelt eine Web-Anwendung zur automatisierten Generierung von Prüfungsfragen und weiteren Lehrveranstaltungsunterlagen. Anstatt ein LLM mit einer einzigen großen Anfrage zu überfordern, arbeitet das System mit einem mehrstufigen Workflow, der automatische Qualitätsprüfungen und Feedback-Schleifen beinhaltet.

**Hauptfunktionen:**
- Automatische Generierung von Prüfungsfragen zu beliebigen Themen
- Bearbeitung und Validierung der generierten Inhalte
- Archiv für bereits erstellte Fragensammlungen
- Unterstützung für Multiple Choice, Kurzantwort und Wahr/Falsch-Fragen
- Anpassbare Schwierigkeitsgrade mit prozentualer Verteilung
- Mehrsprachige Unterstützung (Deutsch und Englisch)

---

## Schnellstart

### Voraussetzungen

- Docker Desktop installiert und laufend
- OpenAI API-Key (für die Fragegenerierung erforderlich)

### Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/shezsoltani/AILV-Project.git
   cd AILV-Project
   ```

2. Umgebungsvariablen konfigurieren:
   
   Der OpenAI API-Key ist für die Fragegenerierung erforderlich. Sie können ihn entweder über eine `.env` Datei im Projekt-Root oder direkt als Environment-Variable setzen:
   
   **Option 1: .env Datei (empfohlen)**
   ```env
   OPENAI_API_KEY=ihr-api-key-hier
   OPENAI_MODEL_NAME=gpt-4o
   ```
   
   **Option 2: Environment-Variable direkt setzen**
   ```bash
   export OPENAI_API_KEY=ihr-api-key-hier
   export OPENAI_MODEL_NAME=gpt-4o
   ```

3. Projekt starten:
   ```bash
   docker-compose up --build
   ```

   Beim ersten Start werden alle Container gebaut und die Datenbank automatisch initialisiert.

4. Anwendung öffnen:
   
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API-Dokumentation: http://localhost:8000/docs

### Erste Schritte

1. Öffnen Sie http://localhost:3000 im Browser
2. Navigieren Sie zu "Fragen generieren"
3. Füllen Sie das Formular aus (Thema, Sprache, Anzahl, Fragetypen, Schwierigkeitsverteilung)
4. Klicken Sie auf "Fragen generieren"
5. Überprüfen und bearbeiten Sie die generierten Fragen
6. Speichern Sie die Fragen im Archiv

---

## Technologie-Stack

- **Frontend:** React 18 mit TypeScript, Vite
- **Backend:** FastAPI (Python) mit asynchroner Unterstützung
- **Datenbank:** PostgreSQL mit JSONB-Unterstützung
- **KI-Integration:** OpenAI API (GPT-4)
- **Deployment:** Docker & Docker Compose

---

## Projektstruktur

```
AILV-Project/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API-Routen (REST-Endpunkte)
│   │   │   ├── routes_generate.py    # /api/generate, /api/finalize
│   │   │   └── routes_archive.py     # /api/archive/*
│   │   │
│   │   ├── models/            # Datenmodelle (Pydantic & SQLAlchemy)
│   │   │   ├── generate_models.py
│   │   │   ├── archive_models.py
│   │   │   ├── finalization_models.py
│   │   │   └── sql_models.py
│   │   │
│   │   ├── services/          # Business-Logik
│   │   │   ├── generation/    # 3-Stage-Generierungsprozess
│   │   │   │   ├── orchestrator.py
│   │   │   │   ├── skeleton_service.py
│   │   │   │   ├── content_service.py
│   │   │   │   └── improve_service.py
│   │   │   ├── archive/       # Archiv-Verwaltung
│   │   │   ├── finalization/  # Finalisierung von Fragen
│   │   │   ├── persistence/   # Datenbank-Zugriff (Repositories)
│   │   │   ├── validators/    # Validierungslogik
│   │   │   ├── llm_client.py  # OpenAI API-Client
│   │   │   └── templateService.py  # Jinja2-Template-Verwaltung
│   │   │
│   │   ├── core/              # Custom-Exceptions
│   │   ├── config.py          # Konfiguration
│   │   ├── db.py              # Datenbankverbindung
│   │   └── main.py            # FastAPI-App Einstiegspunkt
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # UI-Komponenten (Forms, Cards, Lists)
│   │   ├── pages/             # Seiten (Home, Generate, Archive)
│   │   ├── hooks/             # Custom React Hooks (State-Management)
│   │   ├── services/          # API-Client
│   │   ├── types/             # TypeScript-Typdefinitionen
│   │   ├── utils/             # Hilfsfunktionen
│   │   ├── validators/        # Client-seitige Validierung
│   │   ├── constants/         # Konstanten
│   │   ├── styles/            # CSS-Dateien
│   │   └── layout/            # Layout-Komponenten
│   │
│   ├── Dockerfile
│   └── package.json
│
├── docs/                      # Projekt-Dokumentation
│   ├── architecture.md
│   ├── database.md
│   └── sprint3_e2e_test.md
│
├── init.sql                   # Datenbank-Schema & Initial-Daten
├── docker-compose.yml         # Container-Orchestrierung
└── README.md
```

---

## Funktionsweise

Die Fragegenerierung erfolgt in drei aufeinander aufbauenden Stufen:

1. **SKELETON-Stage:** Erstellung eines Gerüsts mit Fragetypen und Schwierigkeitsgraden
2. **CONTENT-Stage:** Generierung vollständiger Fragen mit Text und Antwortoptionen
3. **IMPROVE-Stage:** Sprachliche und didaktische Optimierung

Jede Stage wird validiert und bei Fehlern automatisch wiederholt (bis zu 3 Versuche). Alle Prompts und Responses werden in der Datenbank gespeichert.

---

## Nützliche Befehle

```bash
# Services starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services stoppen
docker-compose down

# Services stoppen und Volumes löschen (löscht DB-Daten!)
docker-compose down -v

# Datenbank-Zugriff
docker-compose exec db psql -U postgres -d aildb
```

---

## Dokumentation

Weitere Informationen finden Sie in:

- [Architektur-Übersicht](docs/architecture.md) - Systemarchitektur und Datenfluss
- [Datenbank-Dokumentation](docs/database.md) - Schema und Tabellenstruktur

---

## Projektteam

- Elena Dordevic 
- Emre Can Yüksel
- Shez Abbas Soltani
- Abdullah Hakimi


---

## Troubleshooting

**Container startet nicht:** Prüfen Sie, ob Docker Desktop läuft und genügend Ressourcen zugewiesen sind.

**Frontend kann Backend nicht erreichen:** Überprüfen Sie die `VITE_API_BASE` Umgebungsvariable (sollte `http://localhost:8000` sein).

**OpenAI API-Fehler:** Stellen Sie sicher, dass der `OPENAI_API_KEY` korrekt gesetzt ist und Ihre API-Quota ausreicht. Prüfen Sie die Logs mit `docker-compose logs backend`.

**Datenbank-Verbindungsfehler:** Warten Sie, bis die Datenbank vollständig initialisiert ist. Prüfen Sie die Logs mit `docker-compose logs db`.
