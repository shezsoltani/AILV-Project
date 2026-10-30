import json
import socket
from dataclasses import dataclass
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import LLMAPIError, LLMJSONError, SlidesImproveValidationError
from app.services.generation import (
    content_service,
    improve_service,
    skeleton_service,
    slides_content_service,
    slides_improve_service,
    slides_outline_service,
)
from fakes.fake_stage_runner import FakeStageRunner


SKELETON = [{"id": "question-1", "type": "SHORT_ANSWER", "difficulty": "easy"}]
QUESTIONS = [{**SKELETON[0], "stem": "Was ist eine Tabelle?"}]
OUTLINE = [
    {"position": 1, "slide_type": "title", "title": "Datenbanken"},
    {"position": 2, "slide_type": "closing", "title": "Zusammenfassung"},
]
SLIDES = [
    {**OUTLINE[0], "bullets": ["Einführung in Datenbanken"], "examples": []},
    {**OUTLINE[1], "bullets": ["Tabellen strukturieren Daten", "Schlüssel verbinden Tabellen"], "examples": []},
]
BASE_CONTEXT = {"topic": "Datenbanken", "language": "de"}


def as_json(data):
    return json.dumps(data, ensure_ascii=False, indent=2)


@dataclass
class GenerationCase:
    stage: str
    module: object
    function_name: str
    arguments: dict
    response: list[dict]
    context: dict

    async def generate(self, **kwargs):
        return await getattr(self.module, self.function_name)(**self.arguments, **kwargs)


CASES = [
    GenerationCase(
        "SKELETON", skeleton_service, "generate_valid_skeleton",
        {"base_context": BASE_CONTEXT, "expected_count": 1}, SKELETON, BASE_CONTEXT,
    ),
    GenerationCase(
        "CONTENT", content_service, "generate_valid_content",
        {"topic": "Datenbanken", "skeleton": SKELETON,
         "context_text": "Lehrstoff", "upload_context": "Kursunterlagen"},
        QUESTIONS,
        {"skeleton_data": as_json(SKELETON), "topic": "Datenbanken", "language": "de",
         "context_text": "Lehrstoff", "upload_context": "Kursunterlagen"},
    ),
    GenerationCase(
        "IMPROVE", improve_service, "generate_valid_improved_content",
        {"original_questions": QUESTIONS}, QUESTIONS, {"questions_raw": as_json(QUESTIONS)},
    ),
    GenerationCase(
        "SLIDES_OUTLINE", slides_outline_service, "generate_valid_slides_outline",
        {"base_context": BASE_CONTEXT, "expected_count": 2}, OUTLINE, BASE_CONTEXT,
    ),
    GenerationCase(
        "SLIDES_CONTENT", slides_content_service, "generate_valid_slides_content",
        {"outline": OUTLINE, "base_context": BASE_CONTEXT}, SLIDES,
        {**BASE_CONTEXT, "outline_data": as_json(OUTLINE)},
    ),
    GenerationCase(
        "SLIDES_IMPROVE", slides_improve_service, "generate_valid_improved_slides",
        {"content_slides": SLIDES}, SLIDES,
        {"language": "de", "slides_raw": as_json(SLIDES)},
    ),
]


@pytest.fixture(params=CASES, ids=lambda case: case.stage)
def case(request, monkeypatch):
    # Every injected-runner test must fail if the production runner is used.
    monkeypatch.setattr(
        request.param.module, "run_stage",
        AsyncMock(side_effect=AssertionError("Production runner must not be called")),
    )
    return request.param


@pytest.fixture(autouse=True)
def block_network(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Generation unit tests must not open network connections.")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)


async def test_fake_runs_stage_and_records_all_arguments(case):
    runner = FakeStageRunner([as_json(case.response)])
    request_id = uuid4()
    db = object()  # No database methods: any accidental DB access fails.

    result = await case.generate(
        db=db, request_id=request_id, language="de",
        custom_prompt="test template", stage_runner=runner,
    )

    assert result == case.response
    assert len(runner.calls) == 1
    call = runner.calls[0]
    assert call.db is db
    assert call.request_id == request_id
    assert call.stage == case.stage
    assert call.language == "de"
    assert call.custom_prompt == "test template"
    assert call.context == case.context


@pytest.mark.parametrize("invalid_response", ["not json", "[]"], ids=["json", "validation"])
async def test_retry_keeps_validation_and_records_previous_error(case, invalid_response):
    runner = FakeStageRunner([invalid_response, as_json(case.response)])

    result = await case.generate(
        db=None, request_id=uuid4(), language="de", stage_runner=runner,
    )

    assert result == case.response
    assert len(runner.calls) == 2
    assert runner.calls[0].context == case.context
    retry_context = runner.calls[1].context
    assert retry_context["attempt"] == 1
    assert retry_context["previous_error"]
    assert {key: retry_context[key] for key in case.context} == case.context


async def test_retry_limit_and_final_error_are_preserved(case):
    runner = FakeStageRunner(["not json", "still not json", as_json(case.response)])
    expected_error = SlidesImproveValidationError if case.stage == "SLIDES_IMPROVE" else LLMJSONError

    with pytest.raises(expected_error):
        await case.generate(
            db=None, request_id=uuid4(), language="de", max_attempts=2, stage_runner=runner,
        )

    assert len(runner.calls) == 2
    assert runner.calls[0].context == case.context
    assert runner.calls[1].context["attempt"] == 1


async def test_runner_exception_propagates_without_retry(case):
    error = LLMAPIError("planned failure")
    runner = FakeStageRunner([error, as_json(case.response)])

    with pytest.raises(LLMAPIError) as caught:
        await case.generate(db=None, request_id=uuid4(), language="de", stage_runner=runner)

    assert caught.value is error
    assert len(runner.calls) == 1


@pytest.mark.parametrize("runner_argument", [{}, {"stage_runner": None}], ids=["omitted", "none"])
async def test_default_uses_existing_run_stage(case, monkeypatch, runner_argument):
    default_runner = AsyncMock(return_value=as_json(case.response))
    monkeypatch.setattr(case.module, "run_stage", default_runner)
    db = object()
    request_id = uuid4()

    result = await case.generate(
        db=db, request_id=request_id, language="de", custom_prompt="test template",
        **runner_argument,
    )

    assert result == case.response
    default_runner.assert_awaited_once_with(
        db=db, request_id=request_id, stage=case.stage, language="de",
        context=case.context, custom_prompt="test template",
    )


async def test_skeleton_still_adds_missing_ids():
    runner = FakeStageRunner(['[{"type": "SHORT_ANSWER", "difficulty": "easy"}]'])

    result = await skeleton_service.generate_valid_skeleton(
        db=None, request_id=uuid4(), language="de", base_context={}, expected_count=1,
        stage_runner=runner,
    )

    assert str(UUID(result[0]["id"])) == result[0]["id"]


async def test_content_still_inherits_skeleton_ids():
    response = [{key: value for key, value in QUESTIONS[0].items() if key != "id"}]
    runner = FakeStageRunner([as_json(response)])

    result = await content_service.generate_valid_content(
        db=None, request_id=uuid4(), language="de", topic="Datenbanken", skeleton=SKELETON,
        stage_runner=runner,
    )

    assert result == QUESTIONS
