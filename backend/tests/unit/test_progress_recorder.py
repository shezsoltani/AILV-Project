"""
Unit-Tests für tests.fakes.progress_recorder.ProgressRecorder

Geprüft werden das vollständige Erfassen von Fortschrittsmeldungen, deren
Reihenfolge, Prozentwert und Text sowie die Assertion-Helfer. Zusätzlich
zeigen Beispieltests den Einsatz als ``on_progress``-Callback für
``batch_runner`` und ``orchestrator`` sowie die Dateiverarbeitung ausschließlich
in Pytest-Testverzeichnissen (``tmp_path``). Es werden weder Datenbank noch
Netzwerk noch produktive Dateipfade benötigt.
"""

import importlib
import inspect
from pathlib import Path
from uuid import uuid4

import pymupdf
import pytest

from app.models.generate_models import GenerateRequest
from app.models.slides_models import SlidesGenerateRequest
from app.services.context_upload.pdf_service import extract_text_from_pdf
from tests.fakes.progress_recorder import ProgressEvent, ProgressRecorder


# ---------------------------------------------------------------------------
# Erfassen von Meldungen
# ---------------------------------------------------------------------------

def test_new_recorder_has_no_events():
    recorder = ProgressRecorder()

    assert recorder.was_not_called()
    assert recorder.events == []
    assert len(recorder) == 0
    recorder.assert_not_called()


def test_records_progress_and_message_of_a_call():
    recorder = ProgressRecorder()

    recorder(33, "Grundstruktur wird erstellt")

    assert recorder.events == [ProgressEvent(33, "Grundstruktur wird erstellt")]
    assert recorder[0].progress == 33
    assert recorder[0].message == "Grundstruktur wird erstellt"


def test_accepts_keyword_arguments_like_the_production_callback():
    recorder = ProgressRecorder()

    recorder(progress=50, stage_label="Halbzeit")

    recorder.assert_events([(50, "Halbzeit")])


def test_events_are_stored_in_call_order():
    recorder = ProgressRecorder()

    recorder(66, "zweite")
    recorder(33, "erste")
    recorder(100, "dritte")

    # Keine Sortierung: genau die Aufrufreihenfolge bleibt erhalten.
    assert recorder.progress_values == [66, 33, 100]
    assert recorder.messages == ["zweite", "erste", "dritte"]


def test_duplicate_events_are_all_recorded():
    recorder = ProgressRecorder()

    recorder(0, "Start")
    recorder(0, "Start")

    assert recorder.call_count == 2


def test_iteration_and_indexing_give_events_in_order():
    recorder = ProgressRecorder()
    recorder(1, "a")
    recorder(2, "b")

    assert [event.message for event in recorder] == ["a", "b"]
    assert recorder[-1] == ProgressEvent(2, "b")


def test_last_event_returns_most_recent_event():
    recorder = ProgressRecorder()
    recorder(10, "a")
    recorder(20, "b")

    assert recorder.last_event() == ProgressEvent(20, "b")


def test_last_event_without_calls_raises_assertion_error():
    with pytest.raises(AssertionError):
        ProgressRecorder().last_event()


def test_reset_clears_events():
    recorder = ProgressRecorder()
    recorder(10, "a")

    recorder.reset()

    assert recorder.was_not_called()


def test_recorders_do_not_share_state():
    first = ProgressRecorder()
    second = ProgressRecorder()

    first(10, "nur im ersten")

    assert second.was_not_called()


def test_empty_recorder_is_truthy_for_if_on_progress_checks():
    recorder = ProgressRecorder()

    # Produktionscode: ``if on_progress: on_progress(...)``
    assert len(recorder) == 0
    assert bool(recorder) is True


def test_signature_matches_production_callback():
    parameters = list(inspect.signature(ProgressRecorder()).parameters)

    assert parameters == ["progress", "stage_label"]


# ---------------------------------------------------------------------------
# Assertion-Helfer
# ---------------------------------------------------------------------------

def test_assert_progress_checks_values_and_order():
    recorder = ProgressRecorder()
    recorder(33, "a")
    recorder(66, "b")

    recorder.assert_progress([33, 66])
    with pytest.raises(AssertionError):
        recorder.assert_progress([66, 33])
    with pytest.raises(AssertionError):
        recorder.assert_progress([33])


def test_assert_messages_checks_text_and_order():
    recorder = ProgressRecorder()
    recorder(33, "a")
    recorder(66, "b")

    recorder.assert_messages(["a", "b"])
    with pytest.raises(AssertionError):
        recorder.assert_messages(["b", "a"])
    with pytest.raises(AssertionError):
        recorder.assert_messages(["a", "c"])


def test_assert_events_checks_pairs_of_progress_and_text():
    recorder = ProgressRecorder()
    recorder(33, "a")
    recorder(66, "b")

    recorder.assert_events([(33, "a"), (66, "b")])
    with pytest.raises(AssertionError):
        recorder.assert_events([(33, "b"), (66, "a")])
    with pytest.raises(AssertionError):
        recorder.assert_events([(33, "a")])


def test_assert_event_checks_single_event_at_position():
    recorder = ProgressRecorder()
    recorder(33, "a")
    recorder(66, "b")

    recorder.assert_event(0, 33, "a")
    recorder.assert_event(-1, 66, "b")
    with pytest.raises(AssertionError):
        recorder.assert_event(1, 66, "falsch")
    with pytest.raises(AssertionError):
        recorder.assert_event(1, 33, "b")
    with pytest.raises(AssertionError):
        recorder.assert_event(5, 66, "b")


def test_assert_called_with_and_without_count():
    recorder = ProgressRecorder()
    with pytest.raises(AssertionError):
        recorder.assert_called()

    recorder(1, "a")
    recorder.assert_called()
    recorder.assert_called(times=1)
    with pytest.raises(AssertionError):
        recorder.assert_called(times=2)
    with pytest.raises(AssertionError):
        recorder.assert_not_called()


def test_assert_progress_non_decreasing():
    recorder = ProgressRecorder()
    recorder(0, "a")
    recorder(0, "b")
    recorder(50, "c")
    recorder.assert_progress_non_decreasing()

    recorder(20, "d")
    with pytest.raises(AssertionError):
        recorder.assert_progress_non_decreasing()


def test_assert_progress_within_bounds():
    recorder = ProgressRecorder()
    recorder(0, "a")
    recorder(100, "b")
    recorder.assert_progress_within_bounds()

    recorder(101, "c")
    with pytest.raises(AssertionError):
        recorder.assert_progress_within_bounds()
    recorder.assert_progress_within_bounds(upper=101)


# ---------------------------------------------------------------------------
# Beispieltests: ProgressRecorder als Progress-Callback
# ---------------------------------------------------------------------------

def _import_service(monkeypatch, module_name: str):
    """Importiert ein Service-Modul erst nach Setzen der Test-Konfiguration.

    ``app.config`` liest beim Import Pflicht-Variablen aus der Umgebung. Der
    Import erfolgt daher lazy mit Platzhalterwerten (keine echten Zugangsdaten).
    """
    for name, value in {
        "JWT_SECRET_KEY": "test-secret-not-for-production",
        "JWT_ALGORITHM": "HS256",
        "OPENAI_API_KEY": "",
        "SMTP_HOST": "smtp.example.invalid",
        "SMTP_PORT": "587",
        "SMTP_USER": "test",
        "SMTP_PASSWORD": "test",
        "MAIL_FROM": "tests@example.com",
    }.items():
        monkeypatch.setenv(name, value)
    return importlib.import_module(module_name)


@pytest.fixture
def batch_runner(monkeypatch):
    return _import_service(monkeypatch, "app.services.batch_runner")


@pytest.fixture
def orchestrator(monkeypatch):
    return _import_service(monkeypatch, "app.services.generation.orchestrator")


class _StubResponse:
    """Minimale Antwort mit ``model_dump`` wie die Pydantic-Modelle."""

    def __init__(self, value):
        self._value = value

    def model_dump(self, mode="json"):
        return self._value


@pytest.fixture
def stub_job_updates(monkeypatch, batch_runner):
    """Ersetzt Datenbank-Schreibzugriffe von ``batch_runner`` durch ein No-op."""
    updates = []
    monkeypatch.setattr(
        batch_runner, "update_job", lambda db, job_id, **fields: updates.append(fields)
    )
    return updates


def _question_request(count: int) -> GenerateRequest:
    return GenerateRequest(
        topic="Relationale Datenbanken",
        language="de",
        count=count,
        types=["SCQ"],
        difficulty_distribution={"easy": 100, "medium": 0, "hard": 0},
    )


async def test_progress_callback_receives_batch_progress_in_order(
    monkeypatch, batch_runner, stub_job_updates
):
    async def fake_generate_questions(req, db, *, on_progress, **kwargs):
        on_progress(33, "Grundstruktur wird erstellt")
        on_progress(66, "Inhalte werden generiert")
        on_progress(100, "Fragen werden optimiert")
        return type(
            "Response", (), {"questions": [_StubResponse({"stem": f"q{i}"}) for i in range(req.count)]}
        )()

    monkeypatch.setattr(batch_runner, "generate_questions", fake_generate_questions)
    recorder = ProgressRecorder()

    questions, _ = await batch_runner.run_question_batches(
        job_id=uuid4(),
        req=_question_request(count=12),  # zwei Batches: 10 + 2
        user_id=uuid4(),
        db=object(),
        on_progress=recorder,
        existing_request_id=uuid4(),
    )

    assert len(questions) == 12
    recorder.assert_progress([33, 66, 100, 33, 66, 100])
    recorder.assert_messages(
        [
            "Grundstruktur wird erstellt",
            "Inhalte werden generiert",
            "Fragen werden optimiert",
        ]
        * 2
    )
    recorder.assert_event(0, 33, "Grundstruktur wird erstellt")
    recorder.assert_event(-1, 100, "Fragen werden optimiert")


async def test_slide_batches_forward_progress_to_callback(
    monkeypatch, batch_runner, stub_job_updates
):
    async def fake_generate_slides(req, db, *, on_progress, **kwargs):
        on_progress(33, "Gliederung wird erstellt")
        on_progress(100, "Folien werden optimiert")
        return type("Response", (), {"slides": [_StubResponse({"position": 1})]})()

    monkeypatch.setattr(batch_runner, "generate_slides", fake_generate_slides)
    recorder = ProgressRecorder()

    await batch_runner.run_slide_batches(
        job_id=uuid4(),
        req=SlidesGenerateRequest(topic="Normalisierung", slide_count=5),
        user_id=uuid4(),
        db=object(),
        on_progress=recorder,
        existing_request_id=uuid4(),
    )

    recorder.assert_events([(33, "Gliederung wird erstellt"), (100, "Folien werden optimiert")])


async def test_progress_callback_keeps_events_before_a_failure(
    monkeypatch, batch_runner, stub_job_updates
):
    async def failing_generate_questions(req, db, *, on_progress, **kwargs):
        on_progress(33, "Grundstruktur wird erstellt")
        raise batch_runner.JobCancelledError()

    monkeypatch.setattr(batch_runner, "generate_questions", failing_generate_questions)
    recorder = ProgressRecorder()

    with pytest.raises(batch_runner.JobCancelledError):
        await batch_runner.run_question_batches(
            job_id=uuid4(),
            req=_question_request(count=2),
            user_id=uuid4(),
            db=object(),
            on_progress=recorder,
            existing_request_id=uuid4(),
        )

    recorder.assert_events([(33, "Grundstruktur wird erstellt")])


async def test_orchestrator_reports_progress_to_recorder(monkeypatch, orchestrator):
    """``generate_questions`` meldet 33/66/100 an den übergebenen Callback."""
    request_id = uuid4()

    async def fake_stage(**kwargs):
        return []

    monkeypatch.setattr(
        orchestrator, "get_generation_request", lambda db, rid: type("R", (), {"id": rid})()
    )
    monkeypatch.setattr(orchestrator, "generate_valid_skeleton", fake_stage)
    monkeypatch.setattr(orchestrator, "generate_valid_content", fake_stage)
    monkeypatch.setattr(orchestrator, "generate_valid_improved_content", fake_stage)
    # Kein IMPROVE-Prompt -> Abbruch nach der Fortschrittsmeldung, ohne Datenbank.
    monkeypatch.setattr(orchestrator, "get_latest_prompt_by_stage", lambda **kwargs: None)
    recorder = ProgressRecorder()

    with pytest.raises(Exception, match="IMPROVE"):
        await orchestrator.generate_questions(
            _question_request(count=2),
            db=object(),
            user_id=uuid4(),
            on_progress=recorder,
            existing_request_id=request_id,
        )

    recorder.assert_events(
        [
            (33, "Grundstruktur wird erstellt"),
            (66, "Inhalte werden generiert"),
            (100, "Fragen werden optimiert"),
        ]
    )
    recorder.assert_progress_non_decreasing()
    recorder.assert_progress_within_bounds()


# ---------------------------------------------------------------------------
# Dateiverarbeitung ausschließlich in tmp_path
# ---------------------------------------------------------------------------

_created_directories: list[Path] = []


def _write_pdf(path: Path, text: str) -> None:
    document = pymupdf.open()
    document.new_page().insert_text((72, 72), text)
    document.save(str(path))
    document.close()


def test_pdf_is_processed_from_relative_tmp_path_only(tmp_path, tmp_path_factory):
    pdf_path = tmp_path / "unterlagen" / "skript.pdf"
    pdf_path.parent.mkdir()
    _write_pdf(pdf_path, "Relationale Datenbanken")

    text, was_truncated = extract_text_from_pdf(pdf_path.read_bytes(), filename=pdf_path.name)

    assert "Relationale Datenbanken" in text
    assert was_truncated is False
    # Dateien liegen im von Pytest verwalteten Basisverzeichnis, nicht im Projekt.
    assert tmp_path_factory.getbasetemp() in pdf_path.parents
    assert Path.cwd() not in pdf_path.parents
    _created_directories.append(tmp_path)


def test_progress_is_recorded_while_processing_files(tmp_path):
    recorder = ProgressRecorder()
    files = []
    for index in range(3):
        path = tmp_path / f"dokument_{index}.pdf"
        _write_pdf(path, f"Inhalt {index}")
        files.append(path)

    for done, path in enumerate(files, start=1):
        text, _ = extract_text_from_pdf(path.read_bytes(), filename=path.name)
        assert f"Inhalt {done - 1}" in text
        recorder(done * 100 // len(files), f"{path.name} verarbeitet")

    recorder.assert_events(
        [
            (33, "dokument_0.pdf verarbeitet"),
            (66, "dokument_1.pdf verarbeitet"),
            (100, "dokument_2.pdf verarbeitet"),
        ]
    )
    _created_directories.append(tmp_path)


def test_tmp_path_is_removed_even_after_a_failing_test(tmp_path_factory):
    """Die überschriebene ``tmp_path``-Fixture räumt unabhängig vom Testergebnis auf."""
    created = []

    def failing_test(tmp_path):
        created.append(tmp_path)
        (tmp_path / "datei.txt").write_text("inhalt")
        raise AssertionError("absichtlich")

    # Fixture-Generator manuell durchlaufen: Teardown nach einem Fehler.
    from tests.conftest import tmp_path as cleanup_fixture

    generator = cleanup_fixture.__wrapped__(tmp_path_factory.mktemp("manuell"))
    path = next(generator)
    try:
        failing_test(path)
    except AssertionError:
        pass
    finally:
        with pytest.raises(StopIteration):
            next(generator)

    assert created and not created[0].exists()


def test_tmp_path_directories_of_earlier_tests_are_removed():
    # Setzt voraus, dass die vorherigen Tests in dieser Datei gelaufen sind.
    if not _created_directories:
        pytest.skip("Vorherige Dateitests wurden nicht ausgeführt.")

    leftovers = [path for path in _created_directories if path.exists()]

    assert leftovers == []
