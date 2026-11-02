# Generierung ohne LLM und Datenbank testen

Alle sechs `generate_valid_*`-Funktionen akzeptieren optional `stage_runner`.
Ohne diese Angabe (oder bei `None`) verwenden sie weiterhin `run_stage`.
JSON-Verarbeitung, Validierung und Wiederholungen bleiben in den bestehenden Services.

Der `FakeStageRunner` liefert vorbereitete Antwort-Strings in Reihenfolge.
Ein Exception-Objekt in der Liste wird beim jeweiligen Aufruf ausgelöst.
Jeder Aufruf landet in `runner.calls`, einschließlich Stage, Sprache,
Request-ID, Custom-Prompt und einer tiefen Kopie des Kontexts.
Auch fehlgeschlagene Aufrufe werden gespeichert. Sind die Antworten verbraucht,
schlägt der Test ausdrücklich fehl; es gibt keinen Rückgriff auf das LLM.
Pro Test einen neuen Fake erzeugen.

Beispiel für einen asynchronen pytest-Test (ohne `db_session`):

```python
from uuid import uuid4

from app.services.generation.skeleton_service import generate_valid_skeleton
from fakes.fake_stage_runner import FakeStageRunner


async def test_skeleton_with_retry():
    runner = FakeStageRunner([
        "ungültiges JSON",
        '[{"type": "SHORT_ANSWER", "difficulty": "easy"}]',
    ])

    result = await generate_valid_skeleton(
        db=None,  # Nur mit Fake: der produktive Runner benötigt eine Session.
        request_id=uuid4(),
        language="de",
        base_context={"topic": "Datenbanken"},
        expected_count=1,
        stage_runner=runner,
    )

    assert len(result) == 1
    assert len(runner.calls) == 2
    assert runner.calls[0].stage == "SKELETON"
    assert runner.calls[1].context["attempt"] == 1
```

Kontrollierter Fehler: `FakeStageRunner([RuntimeError("geplanter Fehler")])`.
Fehler des Runners werden wie bisher direkt weitergegeben. Nur JSON- und
Validierungsfehler lösen die vorhandenen Wiederholungen der Services aus.

Docker Desktop starten und die folgenden Befehle im Ordner `backend` ausführen.
Nur die neuen Tests, ohne Datenbankstart und ohne Testdatenbank-Konfiguration:

```shell
docker compose -f compose.test.yml run --build --rm --no-deps -e TEST_DATABASE_URL= tests tests/unit/test_fake_stage_runner.py tests/unit/test_generation_stage_runner.py -q
```

Die Tests benötigen weder Prompt-Templates noch API-Schlüssel oder SMTP-Werte.
Sie prüfen alle sechs Stufen mit echten Validatoren sowie den Standardaufruf
von `run_stage` mit einem Mock an der I/O-Grenze. Externe Dienste werden nicht aufgerufen.

Die gesamte Suite einschließlich der isolierten PostgreSQL-Tests:

```shell
docker compose -f compose.test.yml run --build --rm tests
```
