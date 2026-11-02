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
| Authentifizierungs-Endpunkte (`/auth/*`) | ⚠️ teilweise | Unit Tests für Service-Schicht vorhanden; HTTP-Integrationstests fehlen noch |
| Passwort-Reset-Flow (vollständiger E2E-Fluss) | 🔲 geplant | Token-Erstellung und E-Mail werden bereits Unit-getestet |
| LLM-Generierung unter Fehlerbedingungen | ⚠️ teilweise | Batch-Runner getestet; Orchestrator-Integrationstests fehlen |
| Dateiexport (PDF, PPTX, XLSX) | 🔲 geplant | Noch keine Tests vorhanden |
| Hintergrundjobs (`background_tasks`) | 🔲 geplant | Benötigen dedizierten Session-Double |

---

## CI-Pipeline

Die Tests sind so aufgebaut, dass sie direkt in einer CI-Pipeline ausgeführt werden können. Der Befehl

```shell
docker compose -f compose.test.yml run --build --rm tests
```

liefert Exit-Code `0` bei Erfolg und einen Wert ungleich `0` bei Fehlern – kompatibel mit GitHub Actions, GitLab CI und vergleichbaren Systemen. Eine Pipeline-Konfiguration ist für einen späteren Sprint geplant.
