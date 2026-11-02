# Backend-Tests mit Docker

Voraussetzung ist Docker mit Docker Compose v2 (unter Windows/Mac z. B. Docker
Desktop mit Linux-Containern).

## Alle Tests starten

```shell
docker compose -f compose.test.yml run --build --rm tests
```

Beim ersten Aufruf wird ein Python-3.11-Image mit `requirements-dev.txt` gebaut.

`TEST_DATABASE_URL` ist im Testdienst bereits gesetzt. Eine `.env.test`, lokale
Zugangsdaten oder eine gesetzte `DATABASE_URL` sind für diesen Aufruf nicht nötig.
Der Testcontainer wird nach dem Lauf entfernt. Der Befehl liefert den Exitcode
von pytest zurück: `0` bei Erfolg, einen anderen Wert bei Fehlern.

## Einzelne Tests starten

Nach dem ersten Build:

```shell
docker compose -f compose.test.yml run --rm tests tests/integration/test_database.py -v
docker compose -f compose.test.yml run --rm tests tests/unit -q
```

Die Verzeichnisse `app` und `tests` sowie `pytest.ini` werden schreibgeschützt
eingebunden. Änderungen daran sind beim nächsten Testlauf sofort verfügbar.
Nach Änderungen an Abhängigkeiten oder `Dockerfile.test` wieder den Befehl mit
`--build` verwenden. Pytest legt temporäre Dateien im Container ab.

## Datenbank und Isolation

- Jeder Entwickler erhält auf seinem Rechner eine eigene Datenbank `aildb_test`.
- Die Testumgebung verwendet das Compose-Projekt `ailv-tests` und das eigene
  Volume `test-db-data`. Das Volume der regulären Anwendung wird nicht verwendet.
- Bei einem neuen, leeren Testvolume legt das PostgreSQL-Image Datenbank und
  Benutzer an. Ein vorhandenes Testvolume wird weiterverwendet und nicht geleert.
- Die vorhandene Fixture `db_session` erstellt pro Testlauf ein neues Schema und
  isoliert Tests durch Savepoints und Rollback, auch bei `Session.commit()`.
- Verbindungen über die normale Anwendungs-Engine bleiben während pytest gesperrt.
- Die Testcontainer verwenden ein internes Docker-Netzwerk. Externe HTTP-, LLM-
  oder SMTP-Dienste sind daraus nicht erreichbar und müssen in Tests ersetzt werden.
- Die Datenbank veröffentlicht keinen Hostport. Docker-Tests verbinden sich
  ausschließlich intern mit `db-test:5432`; lokale Portkonflikte entfallen.
- Die Zugangsdaten `ailv_test` / `local-test-only` sind ausschließlich lokale
  Testwerte, keine Zugangsdaten für Entwicklung oder Produktion.

Die Tabellen werden aus den SQLAlchemy-Modellen erstellt. Constraints und
Startdaten, die nur in `db-init` definiert sind, werden damit nicht abgebildet.


## Gemeinsame Fixtures

- `client`: FastAPI-TestClient mit isolierter `db_session`.
- `smoke_client`: App-Start und `/health` ohne Datenbank; DB-Endpunkte sind gesperrt.
- `test_user`, `test_password`: gespeicherter Benutzer mit bekanntem Testpasswort.
- `user_factory(**overrides)`: weitere Benutzer pro Test anlegen.
- `request_data`: gültige Request-Daten, auch ohne Datenbank verwendbar.
- `test_generation_request`: gespeicherter Request des `test_user`.

Die Fixtures stehen in Unit- und Integrationstests automatisch zur Verfügung.
`db_session` rollt alle Änderungen nach jedem Test zurück, auch nach `commit()`.
App-Overrides werden ebenfalls zurückgesetzt. Den synchronen Client und die
Session innerhalb eines Tests nacheinander verwenden, nicht parallel.
Hintergrundjobs mit eigener `SessionLocal` benötigen weiterhin einen Test-Double.

## Fortschritt und Dateiverarbeitung

- `tests/fakes/progress_recorder.py`: `ProgressRecorder` ersetzt den
  `on_progress(progress, stage_label)`-Callback (z. B. bei `generate_questions`,
  `run_question_batches`). Er speichert alle Meldungen in Aufrufreihenfolge;
  Assertions: `assert_progress([...])`, `assert_messages([...])`,
  `assert_events([(33, "Text"), ...])`, `assert_event(index, progress, message)`.
  Beispiele stehen in `tests/unit/test_progress_recorder.py`.
- Dateitests verwenden ausschließlich `tmp_path`. Die Fixture ist in
  `tests/conftest.py` so erweitert, dass das Verzeichnis nach jedem Test sofort
  entfernt wird, auch bei Fehlschlägen. Keine absoluten oder produktiven Pfade.

Nur den Smoke-Test ausführen (ohne Datenbankstart):

```shell
docker compose -f compose.test.yml run --rm --no-deps -e TEST_DATABASE_URL= tests tests/integration/test_app_smoke.py -q
```
