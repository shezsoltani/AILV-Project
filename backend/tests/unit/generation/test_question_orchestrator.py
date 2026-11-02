"""Question orchestrator: stage order, progress, persistence and abort-on-failure."""

import json
import socket
from uuid import uuid4

import pytest

from app.core.exceptions import ContentValidationError, LLMJSONError
from app.models.generate_models import GenerateRequest
from app.services.generation import orchestrator
from fakes.fake_generation_persistence import FakeQuestionGenerationPersistence
from fakes.fake_stage_runner import FakeStageRunner
from fakes.progress_recorder import ProgressRecorder

SKELETON = [{"id": "question-1", "type": "SCQ", "difficulty": "easy"}]
CONTENT = [{
    **SKELETON[0],
    "stem": "Was ist ein Primärschlüssel?",
    "choices": ["Ein eindeutiger Bezeichner", "Eine beliebige Textspalte"],
    "correct_index": 0,
}]
IMPROVED = [{**CONTENT[0], "stem": "Welche Aufgabe hat ein Primärschlüssel?"}]


@pytest.fixture(autouse=True)
def block_real_io(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Orchestrator tests must not use the real runner, network or database.")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)


def make_request(**overrides):
    return GenerateRequest(topic="Datenbanken", count=1, types=["SCQ"], **overrides)


async def test_successful_flow_runs_stages_in_order_and_reports_progress():
    runner = FakeStageRunner([json.dumps(SKELETON), json.dumps(CONTENT), json.dumps(IMPROVED)])
    persistence = FakeQuestionGenerationPersistence()
    progress = ProgressRecorder()

    response = await orchestrator.generate_questions(
        make_request(), db=None, user_id=uuid4(),
        on_progress=progress, persistence=persistence, stage_runner=runner,
    )

    assert [call.stage for call in runner.calls] == ["SKELETON", "CONTENT", "IMPROVE"]
    progress.assert_events([
        (33, "Grundstruktur wird erstellt"),
        (66, "Inhalte werden generiert"),
        (100, "Fragen werden optimiert"),
    ])

    # Only the IMPROVE result is persisted and returned, not the intermediate stages.
    assert len(persistence.store_calls) == 1
    assert persistence.store_calls[0].stage == "IMPROVE"
    assert persistence.store_calls[0].questions == IMPROVED
    assert [q.question for q in response.questions] == [q["stem"] for q in IMPROVED]


async def test_existing_request_id_is_reused_across_all_stages():
    runner = FakeStageRunner([json.dumps(SKELETON), json.dumps(CONTENT), json.dumps(IMPROVED)])
    persistence = FakeQuestionGenerationPersistence()
    existing_id = uuid4()

    await orchestrator.generate_questions(
        make_request(), db=None, user_id=uuid4(),
        existing_request_id=existing_id, persistence=persistence, stage_runner=runner,
    )

    assert persistence.request_calls[0].existing_request_id == existing_id
    assert all(call.request_id == persistence.request.id for call in runner.calls)


async def test_failing_skeleton_stage_stops_before_content_and_improve():
    runner = FakeStageRunner(["not json", "not json", "not json"])
    persistence = FakeQuestionGenerationPersistence()
    progress = ProgressRecorder()

    with pytest.raises(LLMJSONError):
        await orchestrator.generate_questions(
            make_request(), db=None, user_id=uuid4(),
            on_progress=progress, persistence=persistence, stage_runner=runner,
        )

    assert [call.stage for call in runner.calls] == ["SKELETON"] * 3
    progress.assert_not_called()
    assert persistence.store_calls == []


async def test_failing_content_stage_stops_before_improve():
    invalid_content = json.dumps([{**CONTENT[0], "correct_index": 99}])
    runner = FakeStageRunner([
        json.dumps(SKELETON), invalid_content, invalid_content, invalid_content,
    ])
    persistence = FakeQuestionGenerationPersistence()
    progress = ProgressRecorder()

    with pytest.raises(ContentValidationError):
        await orchestrator.generate_questions(
            make_request(), db=None, user_id=uuid4(),
            on_progress=progress, persistence=persistence, stage_runner=runner,
        )

    assert [call.stage for call in runner.calls] == ["SKELETON", "CONTENT", "CONTENT", "CONTENT"]
    progress.assert_progress([33])
    assert persistence.store_calls == []
