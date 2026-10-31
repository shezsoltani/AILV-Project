"""Question-stage validation and retries, using real validators and no I/O."""

import json
import socket
from dataclasses import dataclass
from typing import Callable
from uuid import uuid4

import psycopg2
import pytest

from app.core.exceptions import (
    ContentValidationError,
    ImproveValidationError,
    LLMJSONError,
    SkeletonValidationError,
)
from app.services.generation import (
    content_service,
    improve_service,
    skeleton_service,
    stage_runner,
)
from fakes.fake_stage_runner import FakeStageRunner


@dataclass
class QuestionStage:
    name: str
    generate: Callable
    arguments: dict
    valid: list[dict]
    invalid: list[dict]
    validation_error: type[Exception]
    validation_message: str

    async def run(self, runner, max_attempts=3):
        return await self.generate(
            db=None,
            request_id=uuid4(),
            language="de",
            stage_runner=runner,
            max_attempts=max_attempts,
            **self.arguments,
        )


@pytest.fixture(params=["SKELETON", "CONTENT", "IMPROVE"])
def question_stage(request):
    # Fresh data per test; the content case exercises SCQ-specific validation.
    skeleton = [{"id": "question-1", "type": "SCQ", "difficulty": "easy"}]
    questions = [{
        **skeleton[0],
        "stem": "Was ist ein Primärschlüssel?",
        "choices": ["Ein eindeutiger Bezeichner", "Eine beliebige Textspalte"],
        "correct_index": 0,
    }]
    improved = [{**questions[0], "stem": "Welche Aufgabe hat ein Primärschlüssel?"}]

    cases = {
        "SKELETON": QuestionStage(
            name="SKELETON",
            generate=skeleton_service.generate_valid_skeleton,
            arguments={
                "base_context": {"topic": "Datenbanken", "types": ["SCQ"]},
                "expected_count": 1,
            },
            valid=skeleton,
            invalid=[{"id": "question-1", "type": "SCQ"}],
            validation_error=SkeletonValidationError,
            validation_message="Item 0 missing field 'difficulty'",
        ),
        "CONTENT": QuestionStage(
            name="CONTENT",
            generate=content_service.generate_valid_content,
            arguments={
                "topic": "Datenbanken",
                "skeleton": skeleton,
                "context_text": "Schlüssel identifizieren Datensätze.",
                "upload_context": "Kursunterlagen",
            },
            valid=questions,
            invalid=[{**questions[0], "correct_index": 2}],
            validation_error=ContentValidationError,
            validation_message="Item 0 (SCQ) has invalid correct_index",
        ),
        "IMPROVE": QuestionStage(
            name="IMPROVE",
            generate=improve_service.generate_valid_improved_content,
            arguments={"original_questions": questions},
            valid=improved,
            invalid=[{**improved[0], "id": "changed-id"}],
            validation_error=ImproveValidationError,
            validation_message="Item 0 field 'id' must not change during improve",
        ),
    }
    return cases[request.param]


@pytest.fixture(autouse=True)
def block_real_io(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Question-stage tests must not use the real runner, network or database.")

    for module in (skeleton_service, content_service, improve_service, stage_runner):
        monkeypatch.setattr(module, "run_stage", blocked)
    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)
    monkeypatch.setattr(psycopg2, "connect", blocked)


@pytest.fixture(params=["malformed_json", "empty_response", "validation"])
def invalid_answer(request, question_stage):
    if request.param == "malformed_json":
        return "not json", LLMJSONError, "Expecting value (line 1)"
    if request.param == "empty_response":
        return "", LLMJSONError, "LLM returned empty response"
    return (
        json.dumps(question_stage.invalid),
        question_stage.validation_error,
        question_stage.validation_message,
    )


def assert_calls(question_stage, runner, previous_errors):
    """Check call count and the error from immediately before each retry."""
    assert len(runner.calls) == len(previous_errors) + 1
    initial_context = runner.calls[0].context
    assert "previous_error" not in initial_context
    assert "attempt" not in initial_context

    for attempt, call in enumerate(runner.calls):
        assert call.stage == question_stage.name
        assert call.language == "de"
        assert call.db is None
        assert call.request_id == runner.calls[0].request_id
        expected_context = dict(initial_context)
        if attempt:
            expected_context.update(
                previous_error=previous_errors[attempt - 1], attempt=attempt,
            )
        assert call.context == expected_context


async def test_success_on_first_attempt_stops_immediately(question_stage):
    runner = FakeStageRunner([
        json.dumps(question_stage.valid),
        AssertionError("No call is allowed after a valid response"),
    ])

    result = await question_stage.run(runner)

    assert result == question_stage.valid
    assert_calls(question_stage, runner, [])


async def test_invalid_then_valid_retries_with_error_context(question_stage, invalid_answer):
    response, _, message = invalid_answer
    runner = FakeStageRunner([
        response,
        json.dumps(question_stage.valid),
        AssertionError("No call is allowed after a successful retry"),
    ])

    result = await question_stage.run(runner)

    assert result == question_stage.valid
    assert_calls(question_stage, runner, [message])


@pytest.mark.parametrize("max_attempts", [1, 3])
async def test_only_invalid_answers_stop_at_limit(question_stage, invalid_answer, max_attempts):
    response, error_type, message = invalid_answer
    # A valid answer beyond the limit must never be consumed.
    runner = FakeStageRunner([response] * max_attempts + [json.dumps(question_stage.valid)])

    with pytest.raises(error_type) as caught:
        await question_stage.run(runner, max_attempts=max_attempts)

    assert type(caught.value) is error_type
    assert str(caught.value) == message
    if error_type is LLMJSONError:
        assert caught.value.raw == response
    assert_calls(question_stage, runner, [message] * (max_attempts - 1))


async def test_each_retry_replaces_previous_error_and_increments_attempt(question_stage):
    runner = FakeStageRunner([
        "not json",
        json.dumps(question_stage.invalid),
        json.dumps(question_stage.valid),
        AssertionError("No call is allowed after a valid response"),
    ])

    result = await question_stage.run(runner)

    assert result == question_stage.valid
    assert_calls(question_stage, runner, [
        "Expecting value (line 1)", question_stage.validation_message,
    ])


@pytest.mark.parametrize("last_error", ["json", "validation"])
async def test_exhaustion_raises_last_error_not_first(question_stage, last_error):
    failures = [
        ("not json", LLMJSONError, "Expecting value (line 1)"),
        (json.dumps(question_stage.invalid), question_stage.validation_error,
         question_stage.validation_message),
    ]
    if last_error == "json":
        failures.reverse()
    runner = FakeStageRunner([
        *(response for response, _, _ in failures),
        json.dumps(question_stage.valid),
    ])
    _, error_type, message = failures[-1]

    with pytest.raises(error_type) as caught:
        await question_stage.run(runner, max_attempts=2)

    assert type(caught.value) is error_type
    assert str(caught.value) == message
    assert_calls(question_stage, runner, [failures[0][2]])
