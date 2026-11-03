# Sprint 2: Refactoring und Uebergabe

Stand: 03.11.2026, Gepruefter Commit: `dd7f8b2`
(`Merge pull request #309 from shezsoltani/sprint-2-inno3`).
Grundlage: lokal vorhandener Code und ausgefuehrte Tests, einschliesslich
der anschliessenden Korrekturen in zwei Testdateien.
Zugehoeriger Abschluss-Task: Review und Dokumentation; Abhaengigkeiten laut Backlog: T6.1 bis T9.2.
Alle folgenden Projektpfade beziehen sich auf das Repository-Hauptverzeichnis.

## Ziel und aktueller Stand

Die Generierung wird schrittweise testbar gemacht. Kleine austauschbare
Abhaengigkeiten erlauben Tests mit echten Validatoren und kontrollierten Antworten.
Ein vollstaendiger Architekturumbau ist dafuer nicht erforderlich.

| Bereich | Im lokalen Stand vorhanden | Noch offen |
| --- | --- | --- |
| LLM Provider | `LLMProvider.complete(prompt)` und `OpenAILLMProvider` | Implementierung des lokalen Modells durch das andere Team |
| Stage Runner | `StageRunner`-Protocol; optionaler `stage_runner` in beiden Orchestratoren und allen sechs Generierungsstufen | Produktionsnahes Zusammenspiel mit Templates und Prompt-Speicherung pruefen |
| Persistenz | Getrennte Protocols, SQL-Adapter und Fakes fuer Fragen und Folien | Adapter mit echter Datenbank absichern |
| Jobs | Austauschbare Session Factory und Batch Runner | Integration mit realen Sessions und Statusspeicherung pruefen |
| Tests | 438 bestandene Backend-Tests, einschliesslich Orchestrator-, Folien-Retry-, Validator-, Template-, Batch- und Exporttests sowie LLM-/E-Mail-Fakes | Weitere Integrationstests wie unten beschrieben |
| Frontend | 70 bestandene Tests, einschliesslich JobContext, Jobs-/Slides-API und erweitertem Generierungsworkflow | Archivbearbeitung und Exportaktionen gezielt ergaenzen |

Folientests stehen sowohl in `backend/tests/unit/test_generation_stage_runner.py`
als auch in `backend/tests/unit/generation/test_slides_stages.py`.
Orchestrator-Tests pruefen Reihenfolge, Fortschritt, Speicherung und Fehlerabbruch.
Exporttests unter `backend/tests/unit/exports/` pruefen Moodle-XML strukturiert,
lesen PDF-Inhalte mit PyMuPDF und oeffnen PPTX-Dateien mit `python-pptx`.
Sie pruefen Inhalt und Struktur, kein pixelgenaues Layout.

## Architekturentscheidungen und Erweiterungspunkte

- **LLM Provider:** `backend/app/services/llm_provider.py` definiert
  `async complete(prompt: str) -> str`. Ein lokaler Provider implementiert diesen
  Vertrag. Auswahl und Standardprovider liegen in
  `backend/app/services/llm_client.py`; `run_stage()` akzeptiert zudem direkt
  `llm_provider`. Fehler sollen passend zum bestehenden `LLMAPIError`-Vertrag
  behandelt werden. Die lokale Modellanbindung ist nicht Teil dieses Dokuments.
- **Stage Runner:** `backend/app/services/generation/stage_runner.py` definiert
  den asynchron aufrufbaren Vertrag. Die sechs `generate_valid_*`-Funktionen
  akzeptieren `stage_runner`; ohne Angabe verwenden sie `run_stage()`.
  Beide Orchestratoren reichen den optionalen Parameter an alle Stufen weiter.
  JSON-Verarbeitung, fachliche Validierung und Retry bleiben in den Services.
  Der produktive Runner rendert Templates, ruft das LLM auf und speichert Prompts
  und Antworten. Ein Fake ersetzt diese gesamte I/O-Grenze.
- **Persistenz:** `backend/app/services/generation/persistence.py` definiert
  `QuestionGenerationPersistence` und `SlidesGenerationPersistence`.
  Beide bieten `create_or_load_request()` und `get_latest_prompt()`; hinzu kommen
  `store_questions()` beziehungsweise `store_slides()`. Die Orchestratoren
  akzeptieren `persistence`. Standardmaessig verwenden sie
  `SqlQuestionGenerationPersistence` beziehungsweise `SqlSlidesGenerationPersistence`.
  Diese Adapter delegieren an die bestehenden Repository-Funktionen und
  reichen die Session durch. Sie ersetzen keine Transaktionen und fuehren
  selbst keine neuen Commit-Grenzen ein. Neue Implementierungen erfuellen
  das jeweilige Protocol und werden ueber `persistence=` uebergeben.
- **Session Factory:** `run_questions_job()` und `run_slides_job()` in
  `backend/app/services/job_runner.py` akzeptieren `session_factory` sowie
  `question_batch_runner` beziehungsweise `slide_batch_runner`.
  Standardwerte sind die bisherigen Implementierungen. Die Session wird im
  `finally` geschlossen. Ihre Erzeugung liegt derzeit vor dem `try`.
- **Test-Doubles:** Unter `backend/tests/fakes/` liegen `FakeStageRunner`,
  `FakeLLMProvider`, `FakeQuestionGenerationPersistence`,
  `FakeSlidesGenerationPersistence`, `FakeSessionFactory`, `FakeEmailSender`
  und `ProgressRecorder`. Stage Runner und LLM-Fake liefern vorbereitete
  Antworten oder Exceptions. Persistenz-Fakes erfassen Requests, Prompt-Abfragen
  und Speicheraufrufe. Der Progress Recorder erfasst Prozentwerte und Meldungen.
  Fuer Batch Runner wird `AsyncMock` verwendet. Diese Doubles simulieren
  weder SQL-Verhalten noch die Qualitaet eines LLM.

## Beispiele fuer Tests

Die Beispiele gehoeren in Backend-Testdateien. Pro Test neue Fakes erzeugen.
Importpfade entsprechen den vorhandenen Tests; pytest ist fuer async Tests eingerichtet.

### Generierungsstufe mit Retry

```python
from uuid import uuid4
from app.services.generation.skeleton_service import generate_valid_skeleton
from fakes.fake_stage_runner import FakeStageRunner

async def test_skeleton_retry():
    runner = FakeStageRunner([
        "ungueltiges JSON",
        '[{"type": "SHORT_ANSWER", "difficulty": "easy"}]',
    ])
    result = await generate_valid_skeleton(
        db=None,
        request_id=uuid4(),
        language="de",
        base_context={"topic": "Datenbanken"},
        expected_count=1,
        stage_runner=runner,
    )
    assert len(result) == 1
    assert len(runner.calls) == 2
    assert runner.calls[1].context["attempt"] == 1
    assert "previous_error" in runner.calls[1].context
```

`db=None` ist hier nur wegen des Fake Runners moeglich. Runner-Exceptions werden
weitergegeben; die Services wiederholen JSON- und Validierungsfehler.

### Gesamte Fragengenerierung mit Fake-Persistenz

```python
import json
from uuid import uuid4
from app.models.generate_models import GenerateRequest
from app.services.generation.orchestrator import generate_questions
from fakes.fake_generation_persistence import FakeQuestionGenerationPersistence
from fakes.fake_stage_runner import FakeStageRunner
from fakes.progress_recorder import ProgressRecorder

async def test_question_flow():
    skeleton = [{"id": "q-1", "type": "SCQ", "difficulty": "easy"}]
    content = [{**skeleton[0], "stem": "Was ist ein Primaerschluessel?",
                "choices": ["Eindeutiger Bezeichner", "Beliebiger Text"],
                "correct_index": 0}]
    runner = FakeStageRunner([
        json.dumps(skeleton), json.dumps(content), json.dumps(content),
    ])
    persistence = FakeQuestionGenerationPersistence()
    progress = ProgressRecorder()
    result = await generate_questions(
        GenerateRequest(topic="Datenbanken", count=1, types=["SCQ"]),
        db=None, user_id=uuid4(), persistence=persistence,
        stage_runner=runner, on_progress=progress,
    )
    assert len(result.questions) == 1
    assert len(persistence.store_calls) == 1
    assert persistence.store_calls[0].stage == "IMPROVE"
    progress.assert_progress([33, 66, 100])
```

Der Persistenz-Fake erzeugt bei `get_latest_prompt()` standardmaessig einen
Prompt-Eintrag. Fuer den Fehlerfall "Prompt fehlt" muss diese Methode gezielt
`None` liefern; `latest_prompt=None` im Konstruktor reicht dafuer nicht.

Der kleinere `FakeLLMProvider(["Antwort"])` kann direkt als
`llm_provider=` an `run_stage()` uebergeben werden. Template- und
Persistenzzugriffe des echten Stage Runners bleiben dabei bestehen und
benoetigen eigene Testvorbereitung. Fuer E-Mail-Tests `FakeEmailSender()` an
`app.services.auth.auth_service.send_reset_email` einsetzen.

### Job ohne Datenbank und Generierung

```python
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from app.services import job_runner
from fakes.fake_session_factory import FakeSessionFactory

async def test_job_closes_session(monkeypatch, request_data):
    db = MagicMock()
    updates = MagicMock()
    monkeypatch.setattr(job_runner, "get_job", lambda *args: None)
    monkeypatch.setattr(job_runner, "update_job", updates)
    batch = AsyncMock(return_value=([], uuid4()))
    await job_runner.run_questions_job(
        uuid4(), request_data, uuid4(),
        session_factory=FakeSessionFactory(db),
        question_batch_runner=batch,
    )
    batch.assert_awaited_once()
    db.close.assert_called_once()
    assert updates.call_args.kwargs["status"] == "completed"
```

Repository-Funktionen dort ersetzen, wo sie verwendet werden, hier im Modul
`job_runner`. Eine Fake Session Factory allein ersetzt keine Repository-Aufrufe.
Weitere Beispiele: `backend/tests/fakes/README.md` und
`backend/tests/unit/jobs/test_job_runner.py`.

## Testausfuehrung und Nachweis

Backend, aus dem Verzeichnis `backend`:

```shell
docker compose -f compose.test.yml run --build --rm tests
```

Die Konfiguration verwendet die eigene PostgreSQL-Testdatenbank, ein internes
Netzwerk und schreibgeschuetzte Code-Mounts. Fixtures erzeugen ein isoliertes
Schema und verwenden Savepoints. Ohne `TEST_DATABASE_URL` werden Datenbanktests
uebersprungen; ein solcher Lauf ist kein vollstaendiger Integrationsnachweis.
Details: `backend/tests/README.md` und `docs/testing.md`.

Frontend, in PowerShell aus dem Verzeichnis `frontend`:

```powershell
npm ci
$env:VITE_API_BASE = 'http://ailv-test.invalid'
npm test -- --run
```

Die Testadresse gilt fuer die aktuelle PowerShell-Sitzung und deren Kindprozesse;
es wird keine `.env`-Datei veraendert. API-Aufrufe werden in den entsprechenden
Tests ersetzt. `VITE_API_BASE` ist beim Import des API-Clients erforderlich.

| Pruefung am 03.11.2026 | Ergebnis |
| --- | --- |
| Backend-Gesamtlauf nach Testkorrektur | 438 bestanden, keine fehlgeschlagen oder uebersprungen, 5 Warnungen; 10,46 Sekunden; Exitcode 0 |
| Frontend-Gesamtlauf | 70 Tests in 19 Dateien bestanden; 16,55 Sekunden; Exitcode 0; temporaere `VITE_API_BASE` gesetzt |
| Quellcode und Teststruktur gelesen | Vorhandene Abhaengigkeiten und Testgrenzen dokumentiert |
| Unveraendertes Produktionsverhalten | Vorhandene Tests bestanden; Vergleich mit dem Ausgangsstand und weitere Integrationstests stehen aus |

Diese Ergebnisse ersetzen die vorherigen 163 Backend- und 56 Frontend-Tests.
Der Backend-Lauf verwendet die isolierte PostgreSQL-Testdatenbank einschliesslich
der vorhandenen Integrationstests. Die fuenf Backend-Warnungen betreffen
`crypt`/Passlib, den `fitz`-Import, Pydantic-Klassenkonfiguration und FastAPI-Startup-Events.
Im Frontend erscheint eine Vite-CJS-Warnung; die protokollierte Meldung
"Backend Fehler" stammt aus einem erfolgreich bestandenen Fehlerfalltest.

`npm ci` meldete zudem 15 Schwachstellen im Abhaengigkeitsbaum (1 niedrig,
3 mittel, 10 hoch, 1 kritisch). Betroffene Pakete und Auswirkung sind noch
nicht bewertet; es wurden keine automatischen Versionsupdates vorgenommen.

### Behobene Fehler der Testvorbereitung

1. `backend/tests/unit/generation/test_orchestrator_persistence.py` verwendet
   jetzt fuenf Folien statt zwei. Outline, vorbereitete Ergebnisse und
   Request-Anzahl stimmen ueberein. Der Erfolgstest prueft die Ergebnisanzahl.
2. `backend/tests/unit/test_progress_recorder.py` verwendet fuer den
   Orchestrator eine Fake-Persistenz statt veralteter Repository-Patches.
   `get_latest_prompt()` liefert gezielt `None`. Der Test prueft den konkreten
   `PromptStateError`, die Prompt-Abfrage, ausbleibende Speicherung und
   weiterhin die Fortschrittsmeldungen 33/66/100.

Zuerst bestanden alle 33 Tests der beiden betroffenen Dateien, anschliessend
alle 438 Tests der Backend-Suite. Produktionscode wurde nicht geaendert.
Die obigen Dokumentationsbeispiele wurden nicht als zusaetzliche Testdateien
ausgefuehrt; vergleichbare vorhandene Tests sind Teil des Gesamtlaufs.
Der Abschluss-Task bleibt wegen der unten genannten Review- und Testluecken offen.

## Priorisierte Restaufgaben

| Prioritaet | Befund | Naechster Schritt |
| --- | --- | --- |
| Hoch | npm meldet 15 Schwachstellen, davon 1 kritisch | Audit-Befunde nach Paket, Einsatzbereich und Erreichbarkeit bewerten; gezielte Updates mit Regressionstests planen |
| Mittel | Frontend-Abdeckung fuer Archivbearbeitung und Exportaktionen fehlt im geprueften Testbestand | Speichern, Validierungs-/API-Fehler und Aufruf des richtigen Exportservices testen |
| Mittel | Jobabbruch wird an `failed` und einem konkreten Meldungstext erkannt | Bestehendes Verhalten absichern; spaeter expliziten Abbruchzustand bewerten |
| Mittel | Fehler beim Session-Aufbau liegen ausserhalb des Job-`try` | Fehlerpfad testen und festlegen, wie ein nicht aktualisierbarer Job erkannt wird |
| Mittel | SQLAlchemy-Testtabellen bilden `db-init` nicht vollstaendig ab | Constraints und Startdaten mit produktionsnaher Initialisierung testen |
| Niedrig | `docs/architecture.md` beschreibt teilweise aeltere Ablaeufe | Job-/Batch-Fluss und Fragetypen mit aktuellem Code abgleichen |
| Niedrig | Deprecation-Warnungen und notwendige Frontend-Testvariable | Bibliotheksmigrationen planen und Testkonfiguration mit `VITE_API_BASE` reproduzierbar bereitstellen |

Die vorhandenen Protocols und optionalen Funktionsparameter werden durch
konkrete Tests genutzt. Die Persistenzadapter kapseln wenige benoetigte
Operationen und verwenden bestehende Repositories weiter. Sie sind noch an
SQLAlchemy-Session- und ORM-Typen gebunden; fuer die aktuelle Unit-Testbarkeit
ist keine weitere Verallgemeinerung erforderlich. Bei einer spaeteren anderen
Datenhaltung muss dieser Vertrag erneut bewertet werden.

## Noch erforderliche Integrationstests

- Generierung mit Fake-LLM, echten Templates und PostgreSQL: Prompt-Protokoll,
  Ergebniszuordnung, Commit/Rollback und Fehler nach Teilerfolgen.
- Jobs und Batches mit eigenen Sessions: Status, Fortschritt, Wiederholungen,
  Abbruch und Sichtbarkeit zwischen Sessions.
- API-Zugriffe mit zwei Benutzern: Archiv lesen, bearbeiten, loeschen und
  exportieren; Zugriffe auf fremde Daten verweigern.
- Export-Endpunkte: Authentifizierung, Dateiname, Content-Type und Dateiinhalte.
- Frontend und Backend zusammen: Generierungsstart, Polling, Ergebnisanzeige,
  Fehlermeldung und Archivierung.

## Abschlusscheckliste

- [x] Vorhandene Schnittstellen und Test-Doubles beschrieben.
- [x] Beispiele und priorisierte Restaufgaben dokumentiert.
- [x] Offene Integrationstestbereiche benannt.
- [x] Frontend-Suite erfolgreich ausgefuehrt (70 Tests am 03.11.2026).
- [x] Backend-Suite vollstaendig erfolgreich (438 Tests nach Korrektur am 03.11.2026).
- [x] Persistenzadapter sowie Orchestrator- und Exporttests vorhanden.
- [ ] Refactoring-Diff gegen den Ausgangsstand auf Verhaltensaenderungen geprueft.
- [ ] Verbleibende Testluecken abgeschlossen oder im Team explizit verschoben.
- [ ] Finale Dokumentation in der zentralen Projektdokumentation verlinkt.
