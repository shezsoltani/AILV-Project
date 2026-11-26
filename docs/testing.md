# Teststrategie und lokale Ausführung

Dieses Dokument beschreibt, wie Tests im Backend ausgeführt werden, wie die Teststruktur aufgebaut ist und welche Regeln beim Schreiben neuer Tests gelten.

---

## Schnellstart

Voraussetzung: **Docker Desktop** mit Linux-Containern (Windows/Mac).

```shell
# Im Verzeichnis backend/
docker compose -f compose.test.yml run --build --rm tests
```

Der Befehl baut das Test-Image, startet eine isolierte PostgreSQL-Testdatenbank und führt alle Tests aus. Der Exit-Code entspricht dem pytest-Ergebnis (`0` = Erfolg).

---

## Abhängigkeiten installieren

Alle Testabhängigkeiten sind in [`backend/requirements-dev.txt`](../backend/requirements-dev.txt) definiert:

```text
-r requirements.txt        # Produktionsabhängigkeiten
pytest==8.3.5
pytest-asyncio==0.24.0
httpx<0.28
SQLAlchemy>=2.0,<2.1
```

Für lokale Testläufe außerhalb von Docker (optional):

```shell
# Im Verzeichnis backend/ mit Python 3.11
python -m venv .venv
.venv\Scripts\activate       # Windows PowerShell
pip install -r requirements-dev.txt
```

---

## Tests ausführen

### Alle Tests (empfohlen – via Docker)

```shell
# Im Verzeichnis backend/
docker compose -f compose.test.yml run --build --rm tests
```

Nach dem ersten Build kann `--build` weggelassen werden, solange sich Abhängigkeiten oder das `Dockerfile.test` nicht geändert haben.

### Nur Unit Tests

```shell
docker compose -f compose.test.yml run --rm tests tests/unit -q
```

Unit Tests benötigen **keine Datenbankverbindung** und laufen auch ohne `TEST_DATABASE_URL`.

### Nur Integration Tests

```shell
docker compose -f compose.test.yml run --rm tests tests/integration -v
```

### Einzelne Testdatei

```shell
docker compose -f compose.test.yml run --rm tests tests/integration/test_database.py -v
```

### Nur Smoke Test (ohne Datenbankstart)

```shell
docker compose -f compose.test.yml run --rm --no-deps -e TEST_DATABASE_URL= tests tests/integration/test_app_smoke.py -q
```

### Mit Coverage

```shell
# Im Verzeichnis backend/
docker compose -f compose.test.yml run --build --rm tests --cov=app --cov-report=term --cov-report=html:reports/htmlcov
```

Die Abdeckung pro Datei steht danach im Terminal, der HTML-Bericht unter `backend/reports/htmlcov/index.html`. Der Ordner `backend/reports/` ist in `.gitignore` eingetragen.

Im Frontend (Verzeichnis `frontend/`):

```shell
# Linux / macOS:
VITE_API_BASE=http://ailv-test.invalid npm test -- --run --coverage

# Windows (PowerShell):
$env:VITE_API_BASE="http://ailv-test.invalid"; npm test -- --run --coverage
```

Der HTML-Bericht liegt danach unter `frontend/coverage/index.html`.

### Lokal ohne Docker (optional)

```powershell
# PowerShell – TEST_DATABASE_URL muss auf eine lokale PostgreSQL-Testdatenbank zeigen
$env:TEST_DATABASE_URL = 'postgresql+psycopg2://ailv_test:replace-me@localhost:5432/aildb_test'
python -m pytest -q -rs
```

Fehlt `TEST_DATABASE_URL`, werden Datenbanktests automatisch übersprungen. Unit Tests laufen trotzdem.

---

## Teststruktur

```
backend/tests/
├── conftest.py              # Session-weite Fixtures (DB-Engine, db_session, tmp_path, Datenbankschutz)
├── fixtures/
│   ├── application.py       # app, client, smoke_client
│   └── data.py              # test_user, user_factory, request_data, test_generation_request
├── fakes/
│   ├── fake_email_sender.py # Test-Double für send_reset_email
│   ├── fake_llm_provider.py # Test-Double für OpenAILLMProvider
│   └── progress_recorder.py # Test-Double für on_progress-Callback
├── unit/
│   ├── conftest.py          # Setzt Pflicht-Env-Variablen für Unit-Tests
│   ├── test_auth_service.py
│   ├── test_batch_runner.py
│   ├── test_course_models.py
│   ├── test_database_safety.py
│   ├── test_fake_llm_provider.py
│   ├── test_progress_recorder.py
│   ├── test_request_fixture.py
│   ├── test_setup.py
│   ├── test_template_service.py
│   └── validators/
│       ├── conftest.py
│       ├── test_question_validators.py
│       └── test_slides_validators.py
└── integration/
    ├── test_app_smoke.py
    ├── test_api_fixtures.py
    ├── test_courses_api.py
    └── test_database.py
```

---

## Unit Tests vs. Integration Tests

| Merkmal | Unit Tests (`tests/unit/`) | Integration Tests (`tests/integration/`) |
|---|---|---|
| Datenbankverbindung | ❌ nicht nötig | ✅ via `db_session` |
| Externe Dienste | ❌ durch Fakes ersetzt | ❌ durch Fakes ersetzt |
| `TEST_DATABASE_URL` | nicht erforderlich | erforderlich (sonst skip) |
| Geschwindigkeit | sehr schnell | langsamer (DB-IO) |
| Typische Inhalte | Services, Business-Logik | API-Endpunkte, DB-Verhalten |

> **Faustregel:** Alles, was keine Datenbank braucht, kommt in `tests/unit/`. API-Endpunkte und Datenbankverhalten kommen in `tests/integration/`.

---

## Konfiguration der Testdatenbank

Die Docker-Testumgebung setzt `TEST_DATABASE_URL` automatisch. Für lokale Läufe gilt:

- Die URL muss auf eine Datenbank enden, die auf `_test` endet (z. B. `aildb_test`).
- Treiber: `postgresql+psycopg2`
- Die Testdatenbank darf **nicht** identisch mit der regulären Anwendungsdatenbank sein.

**Isolation pro Testlauf:**
- Jeder Testlauf erstellt ein eigenes, zufällig benanntes Schema (`pytest_<uuid>`).
- `db_session` arbeitet mit Savepoints: Auch `Session.commit()` wird am Ende jedes Tests zurückgerollt.
- Die reguläre App-Engine ist während pytest vollständig gesperrt.

Die Tabellen werden aus den SQLAlchemy-Modellen erstellt. Constraints und Startdaten, die nur im SQL-Init-Skript (`db-init/`) definiert sind, sind in Tests **nicht** verfügbar.

---

## Verfügbare Fakes (Test-Doubles)

Alle Fakes liegen in `tests/fakes/` und importieren bewusst weder `app.config` noch andere produktive Module mit Pflicht-Umgebungsvariablen.

### `FakeEmailSender` (`fake_email_sender.py`)

Ersetzt `app.services.auth.auth_service.send_reset_email`. Verhindert SMTP-Verbindungen.

```python
from tests.fakes.fake_email_sender import FakeEmailSender

@pytest.fixture
def fake_email(monkeypatch):
    fake = FakeEmailSender()
    monkeypatch.setattr("app.services.auth.auth_service.send_reset_email", fake)
    return fake

async def test_email_sent(db_session, user_factory, fake_email):
    await request_password_reset(db_session, user.email)
    assert fake_email.called_once()
    to, token = fake_email.last_call()

    # Fehler simulieren:
    fake_email.set_failure(RuntimeError("SMTP nicht erreichbar"))
```

| Methode / Attribut | Bedeutung |
|---|---|
| `calls` | Liste aller `(to, token)`-Aufrufe |
| `called_once()` | `True` wenn genau 1 Aufruf |
| `last_call()` | `(to, token)` des letzten Aufrufs |
| `was_not_called()` | `True` wenn kein Aufruf |
| `set_failure(exc)` | Wirft `exc` bei jedem weiteren Aufruf |
| `reset()` | Löscht Aufzeichnungen und konfigurierten Fehler |

### `FakeLLMProvider` (`fake_llm_provider.py`)

Ersetzt `OpenAILLMProvider`. Keine Netzwerkverbindung, kein API-Key nötig.

```python
from tests.fakes.fake_llm_provider import FakeLLMProvider

fake = FakeLLMProvider(["erste Antwort", "zweite Antwort"])
fake.set_failure(LLMAPIError("Rate limit"))   # dritter Aufruf schlägt fehl

result = await fake.complete("Mein Prompt")   # → "erste Antwort"
assert fake.last_prompt() == "Mein Prompt"
assert fake.call_count == 1
```

Antworten werden als Queue abgearbeitet. Ist die Queue leer, wirft der Fake `AssertionError` – kein stilles Fehlverhalten.

### `ProgressRecorder` (`progress_recorder.py`)

Ersetzt den `on_progress(progress: int, stage_label: str)`-Callback bei `generate_questions` und `run_question_batches`.

```python
from tests.fakes.progress_recorder import ProgressRecorder

recorder = ProgressRecorder()
await generate_questions(req, db, user_id=uid, on_progress=recorder)

recorder.assert_progress([33, 66, 100])
recorder.assert_messages(["Grundstruktur wird erstellt", ...])
recorder.assert_events([(33, "Grundstruktur wird erstellt"), ...])
recorder.assert_event(0, 33, "Grundstruktur wird erstellt")
recorder.assert_progress_non_decreasing()
```

---

## Gemeinsame Fixtures

Alle Fixtures stehen automatisch in Unit- und Integrationstests zur Verfügung (via `pytest_plugins` in `conftest.py`).

| Fixture | Beschreibung |
|---|---|
| `db_session` | Isolierte DB-Session mit automatischem Rollback nach jedem Test |
| `client` | FastAPI `TestClient` mit `db_session` als Datenbank |
| `smoke_client` | `TestClient` mit der App, aber **ohne** Datenbank; direkter DB-Zugriff ist gesperrt – für Smoke-Tests von Endpunkten, die keine DB benötigen |
| `test_user` | Gespeicherter Benutzer mit bekanntem Passwort |
| `test_password` | Passwort des `test_user` |
| `user_factory(**overrides)` | Erstellt weitere Benutzer pro Test |
| `request_data` | Gültige Generierungs-Anfragedaten (auch ohne DB verwendbar) |
| `test_generation_request` | Gespeicherter `GenerationRequest` des `test_user` |
| `auth_headers` | Authorization-Header mit Bearer-Token für beliebige Testbenutzer |
| `two_users_dataset` | Vollständiges Zwei-Benutzer-Szenario (Benutzer A mit 2 LVs und Fragen mit/ohne Zuordnung, Benutzer B mit eigener LV und Fragen) für Isolations- und Rechteschutz-Tests (SCRUM-34) |
| `tmp_path` | Überschreibt die eingebaute pytest-Fixture: löscht temporäre Dateien sofort nach jedem Test, auch bei Fehlschlägen |

---

## Regeln für neue Tests

1. **Kein echter externer Dienst.** SMTP, LLM-API und HTTP-Verbindungen nach außen werden durch Fakes ersetzt. Der Docker-Testcontainer kann externe Dienste ohnehin nicht erreichen.
2. **Kein Zugriff auf die produktive Datenbank.** Immer `db_session` aus den Fixtures verwenden. Die App-Engine ist in Tests gesperrt.
3. **Unit Tests ohne Datenbankfixture.** Services, die keine DB benötigen, werden direkt instanziiert und aufgerufen.
4. **Patching an der richtigen Stelle.** `monkeypatch.setattr` ersetzt die Referenz im importierenden Modul, nicht im Ursprungsmodul (z. B. `"app.services.auth.auth_service.send_reset_email"`, nicht `"app.core.email_utils.send_reset_email"`).
5. **Temporäre Dateien nur via `tmp_path`.** Die Fixture bereinigt das Verzeichnis nach jedem Test automatisch. Keine absoluten oder produktiven Pfade.
6. **Async Tests** funktionieren ohne Dekorator, da `asyncio_mode = auto` in `pytest.ini` gesetzt ist.
7. **Hintergrundjobs** mit eigener `SessionLocal` benötigen einen eigenen Test-Double – sie laufen außerhalb der isolierten `db_session`.

---

## Bekannte Testlücken und geplante Tests

| Bereich | Status | Hinweis |
|---|---|---|
| Lehrveranstaltungen (`/api/courses`, `/api/archive/*`) | ✅ vollständig | CRUD, Zwei-Benutzer-Isolation, Rechteschutz vor Fremdzugriff, Filterkombinationen, Kaskadenprüfung und Migrationskompatibilität (`test_courses_api.py`) |
| Authentifizierungs-Endpunkte (`/auth/*`) | ⚠️ teilweise | Unit Tests für Service-Schicht vorhanden; HTTP-Integrationstests fehlen noch |
| Passwort-Reset-Flow (vollständiger E2E-Fluss) | 🔲 geplant | Token-Erstellung und E-Mail werden bereits Unit-getestet |
| LLM-Generierung unter Fehlerbedingungen | ⚠️ teilweise | Batch-Runner getestet; Orchestrator-Integrationstests fehlen |
| Dateiexport (PDF, PPTX, XLSX) | 🔲 geplant | Noch keine Tests vorhanden |
| Hintergrundjobs (`background_tasks`) | 🔲 geplant | Benötigen dedizierten Session-Double |

---

## CI-Pipeline

In GitHub Actions werden bei jedem Push auf einen beliebigen Branch sowie bei jedem Pull Request auf `main` automatisch zwei parallele Jobs auf Linux-Runnern (`ubuntu-latest`) ausgeführt (Konfiguration in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

1. **`Backend Tests`**: Führt die Python-Testsuite mit PostgreSQL in Docker Compose aus.
2. **`Frontend Tests & Build`**: Führt die Vitest-Tests und den Vite-Produktions-Build mit Node.js aus.

Beide Jobs laufen unabhängig und parallel zueinander, sodass im Pull Request getrennte Status-Checks sichtbar sind.

---

### Backend-Job

#### Startbefehl in der Pipeline

Der Backend-Job wechselt in das Verzeichnis `backend/` und führt denselben Befehl aus wie in der lokalen Entwicklung:

```shell
# Im Verzeichnis backend/
docker compose -f compose.test.yml run --build --rm tests   -q -rs --junitxml=reports/junit.xml   --cov=app --cov-report=term --cov-report=xml:reports/coverage.xml
```

Die Berichte landen über ein Volume aus `compose.test.yml` in `backend/reports/`.

#### Verhalten und Eigenschaften im CI-Lauf

- **Exitcode-Weitergabe & Status-Check:** Docker Compose gibt den Exitcode des Testcontainers (`pytest`) direkt an GitHub Actions weiter. Der Status-Check schlägt fehl (rot), wenn ein Test fehlschlägt oder der Start bzw. der Healthcheck der PostgreSQL-Testdatenbank (`db-test`) scheitert. Nur bei erfolgreichem Gesamtlauf ist der Check grün (`0`).
- **Isolierte Testdatenbank:** Die Tests nutzen die PostgreSQL-Testdatenbank und `TEST_DATABASE_URL` aus `compose.test.yml`. Es werden keine produktiven Zugangsdaten benötigt, und externe Netzwerkzugriffe sind über das interne Docker-Netzwerk unterbunden.
- **Parallele Läufe auf persistenten Runnern:** Um Namenskonflikte auf persistenten oder Self-Hosted-Runnern bei parallelen CI-Läufen auszuschließen, setzt der Workflow einen eindeutigen Compose-Projektnamen über die Umgebungsvariable:
  ```shell
  COMPOSE_PROJECT_NAME=ailv-tests-${{ github.run_id }}-${{ github.run_attempt }}
  ```
  Dadurch erhalten Container, Netzwerke und Test-Volumes separate Namen pro CI-Lauf.
- **Ressourcen-Bereinigung:** Nach Abschluss der Tests – auch im Fehlerfall (`if: always()`) – werden Container und Volumes des jeweiligen Laufs vollständig bereinigt:
  ```shell
  docker compose -f compose.test.yml down -v --remove-orphans
  ```
  Durch den eindeutigen Projektnamen betrifft das Aufräumen ausschließlich Ressourcen des jeweiligen Laufs; andere parallele Läufe bleiben unberührt.

---

### Frontend-Job

Der Frontend-Job stellt sicher, dass die React-Oberfläche funktionsfähig ist und für die Produktion fehlerfrei gebaut werden kann.

#### Schritte in der Pipeline

1. **Node.js einrichten:** Verwendet Node.js 20 (LTS) mit integriertem Dependency-Caching (`cache-dependency-path: frontend/package-lock.json`).
2. **Abhängigkeiten installieren:** Führt im Verzeichnis `frontend/` den Befehl `npm ci` aus, um exakt die im Lockfile definierten Pakete sauber zu installieren.
3. **Tests ausführen:** Führt `npm test -- --run --coverage` aus und schreibt zusätzlich einen JUnit-Bericht nach `frontend/reports/junit.xml`. Das Flag `--run` beendet Vitest nach einem vollständigen Durchlauf (kein Watch-Modus).
4. **Build erstellen:** Führt im Anschluss `npm run build` (`vite build`) als eigenen, klar benannten Schritt aus.

#### Verhalten und Eigenschaften im Frontend-Lauf

- **Fehlererkennung:** Da Test (`Run frontend tests`) und Build (`Build frontend`) als zwei separate Schritte im Workflow definiert sind, ist in der GitHub Actions Oberfläche sofort erkennbar, ob Vitest oder der Build fehlgeschlagen ist.
- **Status-Check:** Scheitert entweder ein Test oder der Build, wird der Status-Check `Frontend Tests & Build` im Pull Request auf Rot gesetzt.
- **Keine Abhängigkeit vom Backend:** Die Umgebungsvariable `VITE_API_BASE` wird für Tests und Build auf eine Dummy-Testadresse gesetzt (`http://ailv-test.invalid`). Vitest verwendet gemockte API-Aufrufe, sodass kein laufendes Backend erforderlich ist.
- **Keine Deployments:** Der CI-Lauf benötigt keinen Deployment-Schlüssel und veröffentlicht nichts auf dem FH-Server.

---

### Testergebnisse und Coverage im Workflow-Lauf

Beide Jobs schreiben nach den Tests eine Zusammenfassung in den Workflow-Lauf (Tab „Summary“): Anzahl der Tests, bestandene, fehlgeschlagene und übersprungene Tests, die Namen fehlgeschlagener Tests und die Zeilenabdeckung. Das übernimmt `.github/scripts/test_summary.py` aus dem JUnit- und dem Cobertura-Bericht.

Die Berichte stehen im selben Lauf unter „Artifacts“ zum Download:

| Artefakt | Inhalt |
|---|---|
| `backend-test-reports` | `junit.xml`, `coverage.xml` |
| `frontend-test-reports` | `reports/junit.xml`, `coverage/` (HTML-Bericht und `cobertura-coverage.xml`) |

Zusammenfassung und Upload laufen auch dann, wenn Tests fehlschlagen (`if: always()`). Der Check wird trotzdem rot, weil der Testschritt selbst fehlschlägt. Eine Mindest-Coverage ist nicht festgelegt.

---

### Bedeutung der CI-Checks im Pull Request

Im Pull Request erscheinen zwei voneinander unabhängige Status-Checks:

| Check-Name | Was wird geprüft? | Wann wird der Check rot? |
|---|---|---|
| **`Backend Tests`** | Python-Unit- und Integrationstests gegen die isolierte PostgreSQL-Testdatenbank. | Ein Backend-Test schlägt fehl oder die PostgreSQL-Testdatenbank startet nicht. |
| **`Frontend Tests & Build`** | Vitest-Komponenten- und Hook-Tests sowie TypeScript-Kompilierung und Vite-Bundle. | Mindestens ein Frontend-Test schlägt fehl oder der Produktions-Build bricht mit Fehlern ab. |

---

### Lokale Vergleichsbefehle für das Frontend

Um die CI-Schritte lokal vor dem Push oder PR nachzuvollziehen, können im Verzeichnis `frontend/` folgende Befehle ausgeführt werden:

```shell
# 1. Abhängigkeiten exakt aus Lockfile installieren
npm ci

# 2. Vitest-Tests einmalig mit Coverage ausführen (wie im CI-Schritt, ohne JUnit-Bericht)
# Linux / macOS:
VITE_API_BASE=http://ailv-test.invalid npm test -- --run --coverage

# Windows (PowerShell):
$env:VITE_API_BASE="http://ailv-test.invalid"; npm test -- --run --coverage

# 3. Produktions-Build lokal testen (äquivalent zum CI-Schritt)
# Linux / macOS:
VITE_API_BASE=http://ailv-test.invalid npm run build

# Windows (PowerShell):
$env:VITE_API_BASE="http://ailv-test.invalid"; npm run build
```
