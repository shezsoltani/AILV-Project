"""Slide-stage validation and retries, using real validators and no I/O."""

import json
import socket
from dataclasses import dataclass
from typing import Callable
from uuid import uuid4

import psycopg2
import pytest

from app.core.exceptions import (
    LLMJSONError,
    SlideOutlineValidationError,
    SlidesContentValidationError,
    SlidesImproveValidationError,
)
from app.services.generation import (
    slides_content_service,
    slides_improve_service,
    slides_outline_service,
    stage_runner,
)
from fakes.fake_stage_runner import FakeStageRunner


@dataclass
class SlideStage:
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


@pytest.fixture(params=["SLIDES_OUTLINE", "SLIDES_CONTENT", "SLIDES_IMPROVE"])
def slides_stage(request):
    # Fresh data per test; the content case exercises bullet-count validation.
    outline = [
        {"position": 1, "slide_type": "title", "title": "Datenbanken"},
        {"position": 2, "slide_type": "closing", "title": "Zusammenfassung"},
    ]
    content = [
        {**outline[0], "bullets": ["Einführung in das Thema Datenbanken"], "examples": []},
        {**outline[1], "bullets": ["Tabellen strukturieren Daten", "Schlüssel verbinden Tabellen"], "examples": []},
    ]
    improved = [
        {**content[0], "bullets": ["Einführung und Überblick über Datenbanken"]},
        {**content[1]},
    ]

    cases = {
        "SLIDES_OUTLINE": SlideStage(
            name="SLIDES_OUTLINE",
            generate=slides_outline_service.generate_valid_slides_outline,
            arguments={
                "base_context": {"topic": "Datenbanken"},
                "expected_count": 2,
            },
            valid=outline,
            invalid=[{"position": 1, "slide_type": "title"}, outline[1]],
            validation_error=SlideOutlineValidationError,
            validation_message="Item 0 missing field 'title'.",
        ),
        "SLIDES_CONTENT": SlideStage(
            name="SLIDES_CONTENT",
            generate=slides_content_service.generate_valid_slides_content,
            arguments={
                "outline": outline,
                "base_context": {"topic": "Datenbanken"},
            },
            valid=content,
            invalid=[content[0], {**content[1], "bullets": []}],
            validation_error=SlidesContentValidationError,
            validation_message="Slide at position 2 ('closing') must have 2–4 bullets, got 0.",
        ),
        "SLIDES_IMPROVE": SlideStage(
            name="SLIDES_IMPROVE",
            generate=slides_improve_service.generate_valid_improved_slides,
            arguments={"content_slides": content},
            valid=improved,
            invalid=[content[0], {**content[1], "slide_type": "content"}],
            validation_error=SlidesImproveValidationError,
            validation_message="Item 1 changed slide_type from 'closing' to 'content'.",
        ),
    }
    return cases[request.param]


@pytest.fixture(autouse=True)
def block_real_io(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Slide-stage tests must not use the real runner, network or database.")

    for module in (slides_outline_service, slides_content_service, slides_improve_service, stage_runner):
        monkeypatch.setattr(module, "run_stage", blocked)
    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)
    monkeypatch.setattr(psycopg2, "connect", blocked)


@pytest.fixture(params=["malformed_json", "empty_response", "validation"])
def invalid_answer(request, slides_stage):
    if request.param == "malformed_json":
        return "not json", LLMJSONError, "Expecting value (line 1)"
    if request.param == "empty_response":
        return "", LLMJSONError, "LLM returned empty response"
    return (
        json.dumps(slides_stage.invalid),
        slides_stage.validation_error,
        slides_stage.validation_message,
    )


def assert_calls(slides_stage, runner, previous_errors):
    """Check call count and the error from immediately before each retry."""
    assert len(runner.calls) == len(previous_errors) + 1
    initial_context = runner.calls[0].context
    assert "previous_error" not in initial_context
    assert "attempt" not in initial_context

    for attempt, call in enumerate(runner.calls):
        assert call.stage == slides_stage.name
        assert call.language == "de"
        assert call.db is None
        assert call.request_id == runner.calls[0].request_id
        expected_context = dict(initial_context)
        if attempt:
            expected_context.update(
                previous_error=previous_errors[attempt - 1], attempt=attempt,
            )
        assert call.context == expected_context


async def test_success_on_first_attempt_stops_immediately(slides_stage):
    runner = FakeStageRunner([
        json.dumps(slides_stage.valid),
        AssertionError("No call is allowed after a valid response"),
    ])

    result = await slides_stage.run(runner)

    assert result == slides_stage.valid
    assert_calls(slides_stage, runner, [])


async def test_invalid_then_valid_retries_with_error_context(slides_stage, invalid_answer):
    response, _, message = invalid_answer
    runner = FakeStageRunner([
        response,
        json.dumps(slides_stage.valid),
        AssertionError("No call is allowed after a successful retry"),
    ])

    result = await slides_stage.run(runner)

    assert result == slides_stage.valid
    assert_calls(slides_stage, runner, [message])


@pytest.mark.parametrize("max_attempts", [1, 3])
async def test_only_invalid_answers_stop_at_limit(slides_stage, invalid_answer, max_attempts):
    response, error_type, message = invalid_answer
    # A valid answer beyond the limit must never be consumed.
    runner = FakeStageRunner([response] * max_attempts + [json.dumps(slides_stage.valid)])

    with pytest.raises(error_type) as caught:
        await slides_stage.run(runner, max_attempts=max_attempts)

    assert type(caught.value) is error_type
    assert str(caught.value) == message
    if error_type is LLMJSONError:
        assert caught.value.raw == response
    assert_calls(slides_stage, runner, [message] * (max_attempts - 1))


async def test_each_retry_replaces_previous_error_and_increments_attempt(slides_stage):
    runner = FakeStageRunner([
        "not json",
        json.dumps(slides_stage.invalid),
        json.dumps(slides_stage.valid),
        AssertionError("No call is allowed after a valid response"),
    ])

    result = await slides_stage.run(runner)

    assert result == slides_stage.valid
    assert_calls(slides_stage, runner, [
        "Expecting value (line 1)", slides_stage.validation_message,
    ])


@pytest.mark.parametrize("last_error", ["json", "validation"])
async def test_exhaustion_raises_last_error_not_first(slides_stage, last_error):
    failures = [
        ("not json", LLMJSONError, "Expecting value (line 1)"),
        (json.dumps(slides_stage.invalid), slides_stage.validation_error,
         slides_stage.validation_message),
    ]
    if last_error == "json":
        failures.reverse()
    runner = FakeStageRunner([
        *(response for response, _, _ in failures),
        json.dumps(slides_stage.valid),
    ])
    _, error_type, message = failures[-1]

    with pytest.raises(error_type) as caught:
        await slides_stage.run(runner, max_attempts=2)

    assert type(caught.value) is error_type
    assert str(caught.value) == message
    assert_calls(slides_stage, runner, [failures[0][2]])
