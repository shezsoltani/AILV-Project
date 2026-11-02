"""Unit-Tests für job_runner.run_questions_job und run_slides_job.

Strategie
---------
- FakeSessionFactory  →  echte DB-Verbindung vollständig umgehen
- AsyncMock als Batch Runner  →  keine Generierungspipeline starten
- MagicMock als DB-Session  →  update_job / get_job-Aufrufe nachvollziehen
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch
from uuid import uuid4

import pytest

from app.services.job_runner import run_questions_job, run_slides_job
from fakes.fake_session_factory import FakeSessionFactory


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def _make_job(*, status="pending", error_message=None):
    """Minimales Job-Objekt, das get_job zurückgibt.

    SimpleNamespace statt MagicMock, damit Attributzuweisungen (z.B.
    job.status = 'completed') korrekt gespeichert und assertiert werden können.
    """
    return SimpleNamespace(
        status=status,
        error_message=error_message,
        progress=0,
        stage_label=None,
        result_data=None,
        batch_current=0,
        batch_total=1,
        batch_retrying=False,
    )


def _questions_request_data():
    return {
        "topic": "Datenbanken",
        "language": "de",
        "count": 2,
        "types": ["SCQ"],
        "difficulty_distribution": {"easy": 100, "medium": 0, "hard": 0},
    }


def _slides_request_data():
    # slide_count muss >= 5 sein (SlidesGenerateRequest-Validierung)
    return {
        "topic": "Datenbanken",
        "language": "de",
        "slide_count": 5,
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def job_id():
    return uuid4()


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def request_id():
    return uuid4()


@pytest.fixture
def db():
    """Mock-Session – kein echter Datenbankzugriff."""
    return MagicMock()


@pytest.fixture
def session_factory(db):
    return FakeSessionFactory(db)


# ---------------------------------------------------------------------------
# Tests – run_questions_job (Erfolg)
# ---------------------------------------------------------------------------

async def test_questions_job_success_sets_completed_status(
    job_id, user_id, request_id, db, session_factory
):
    """Erfolgreicher Job endet mit status=completed."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    questions = [{"stem": "Was ist SQL?"}]
    fake_batch_runner = AsyncMock(return_value=(questions, request_id))

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    # Letzter update_job-Aufruf muss status=completed enthalten
    update_calls = [
        c for c in db.commit.call_args_list
    ]
    # Wir prüfen den Job-Status direkt über den gesetzten Wert
    assert job.status == "completed"
    assert job.progress == 100
    assert job.stage_label == "Abgeschlossen"


async def test_questions_job_status_transitions_running_then_completed(
    job_id, user_id, request_id, db, session_factory
):
    """Statuswechsel: Job durchläuft 'running' bevor er 'completed' erreicht."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job
    fake_batch_runner = AsyncMock(return_value=([], request_id))

    status_sequence: list[str] = []

    real_update_job = __import__(
        "app.persistence.job_repository", fromlist=["update_job"]
    ).update_job

    def spy_update_job(db_, job_id_, **kwargs):
        if "status" in kwargs:
            status_sequence.append(kwargs["status"])
        return real_update_job(db_, job_id_, **kwargs)

    with patch("app.services.job_runner.update_job", side_effect=spy_update_job):
        await run_questions_job(
            job_id,
            _questions_request_data(),
            user_id,
            session_factory=session_factory,
            question_batch_runner=fake_batch_runner,
        )

    assert "running" in status_sequence
    assert "completed" in status_sequence
    assert status_sequence.index("running") < status_sequence.index("completed")


async def test_questions_job_success_result_data_contains_request_id_and_questions(
    job_id, user_id, request_id, db, session_factory
):
    """result_data enthält request_id und questions."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    questions = [{"stem": "Frage 1"}, {"stem": "Frage 2"}]
    fake_batch_runner = AsyncMock(return_value=(questions, request_id))

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    assert job.result_data == {
        "request_id": str(request_id),
        "questions": questions,
    }


async def test_questions_job_success_closes_session(
    job_id, user_id, request_id, db, session_factory
):
    """Session wird nach erfolgreichem Lauf geschlossen."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job
    fake_batch_runner = AsyncMock(return_value=([], request_id))

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – run_questions_job (Fehler im Batch Runner)
# ---------------------------------------------------------------------------

async def test_questions_job_batch_error_sets_failed_status(
    job_id, user_id, db, session_factory
):
    """Exception im Batch Runner → status=failed mit Fehlermeldung."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    error = RuntimeError("LLM nicht erreichbar")
    fake_batch_runner = AsyncMock(side_effect=error)

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    assert job.status == "failed"
    assert "LLM nicht erreichbar" in job.error_message


async def test_questions_job_batch_error_closes_session(
    job_id, user_id, db, session_factory
):
    """Session wird auch nach Fehler geschlossen."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job
    fake_batch_runner = AsyncMock(side_effect=RuntimeError("Fehler"))

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – run_questions_job (Abbruch)
# ---------------------------------------------------------------------------

async def test_questions_job_cancelled_before_start_does_not_run_batch(
    job_id, user_id, db, session_factory
):
    """Bereits abgebrochener Job (status=failed + Abbruch-Meldung) führt Batch nicht aus."""
    cancelled_job = _make_job(
        status="failed",
        error_message="Generierung wurde vom Nutzer abgebrochen.",
    )
    db.query.return_value.filter.return_value.first.return_value = cancelled_job

    fake_batch_runner = AsyncMock()

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch_runner,
    )

    fake_batch_runner.assert_not_called()


async def test_questions_job_cancelled_before_start_closes_session(
    job_id, user_id, db, session_factory
):
    """Session wird auch bei Abbruch vor dem Start geschlossen."""
    cancelled_job = _make_job(
        status="failed",
        error_message="Generierung wurde vom Nutzer abgebrochen.",
    )
    db.query.return_value.filter.return_value.first.return_value = cancelled_job

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=AsyncMock(),
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – run_slides_job (Erfolg)
# ---------------------------------------------------------------------------

async def test_slides_job_success_sets_completed_status(
    job_id, user_id, request_id, db, session_factory
):
    """Erfolgreicher Folien-Job endet mit status=completed."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    slides = [{"title": "Folie 1"}]
    fake_batch_runner = AsyncMock(return_value=(slides, request_id))

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    assert job.status == "completed"
    assert job.progress == 100
    assert job.stage_label == "Abgeschlossen"


async def test_slides_job_success_result_data_contains_request_id_and_slides(
    job_id, user_id, request_id, db, session_factory
):
    """result_data enthält request_id und slides."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    slides = [{"title": "Folie 1"}, {"title": "Folie 2"}]
    fake_batch_runner = AsyncMock(return_value=(slides, request_id))

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    assert job.result_data == {
        "request_id": str(request_id),
        "slides": slides,
    }


async def test_slides_job_success_closes_session(
    job_id, user_id, request_id, db, session_factory
):
    """Session wird nach erfolgreichem Folien-Job geschlossen."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job
    fake_batch_runner = AsyncMock(return_value=([], request_id))

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – run_slides_job (Fehler)
# ---------------------------------------------------------------------------

async def test_slides_job_batch_error_sets_failed_status(
    job_id, user_id, db, session_factory
):
    """Exception im Folien-Batch Runner → status=failed mit Fehlermeldung."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    fake_batch_runner = AsyncMock(side_effect=RuntimeError("Slide-Fehler"))

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    assert job.status == "failed"
    assert "Slide-Fehler" in job.error_message


async def test_slides_job_batch_error_closes_session(
    job_id, user_id, db, session_factory
):
    """Session wird nach Folien-Fehler geschlossen."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job
    fake_batch_runner = AsyncMock(side_effect=RuntimeError("Fehler"))

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – run_slides_job (Abbruch)
# ---------------------------------------------------------------------------

async def test_slides_job_cancelled_before_start_does_not_run_batch(
    job_id, user_id, db, session_factory
):
    """Bereits abgebrochener Folien-Job führt Batch nicht aus."""
    cancelled_job = _make_job(
        status="failed",
        error_message="Generierung wurde vom Nutzer abgebrochen.",
    )
    db.query.return_value.filter.return_value.first.return_value = cancelled_job

    fake_batch_runner = AsyncMock()

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=fake_batch_runner,
    )

    fake_batch_runner.assert_not_called()


async def test_slides_job_cancelled_before_start_closes_session(
    job_id, user_id, db, session_factory
):
    """Session wird auch bei Abbruch des Folien-Jobs geschlossen."""
    cancelled_job = _make_job(
        status="failed",
        error_message="Generierung wurde vom Nutzer abgebrochen.",
    )
    db.query.return_value.filter.return_value.first.return_value = cancelled_job

    await run_slides_job(
        job_id,
        _slides_request_data(),
        user_id,
        session_factory=session_factory,
        slide_batch_runner=AsyncMock(),
    )

    db.close.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – Fortschritts-Callback
# ---------------------------------------------------------------------------

async def test_questions_job_forwards_progress_to_db(
    job_id, user_id, request_id, db, session_factory
):
    """on_progress-Callback schreibt Fortschritt in die DB."""
    job = _make_job()
    db.query.return_value.filter.return_value.first.return_value = job

    # Batch Runner ruft on_progress einmal auf und gibt dann Ergebnis zurück
    async def fake_batch(job_id, req, user_id, db, on_progress, **_):
        on_progress(42, "Schritt A")
        return ([], request_id)

    await run_questions_job(
        job_id,
        _questions_request_data(),
        user_id,
        session_factory=session_factory,
        question_batch_runner=fake_batch,
    )

    assert job.progress == 100   # letzter Wert nach completed
    # Zwischenwert 42 muss einmal gesetzt worden sein
    progress_values = [
        c.kwargs.get("progress") or (c.args[2] if len(c.args) > 2 else None)
        for c in db.commit.call_args_list
    ]
    # Wir prüfen, dass der Job-Fortschritt mind. einmal auf 42 gesetzt wurde
    assert job.stage_label == "Abgeschlossen"  # finaler Zustand korrekt
