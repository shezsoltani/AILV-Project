
import socket
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.exceptions import PromptStateError
from app.models.generate_models import GenerateRequest
from app.models.slides_models import SlidesGenerateRequest
from app.services.generation import orchestrator, slides_orchestrator
from fakes.fake_generation_persistence import (
    FakeQuestionGenerationPersistence,
    FakeSlidesGenerationPersistence,
    PromptLookupCall,
)

SKELETON = [{"id": "question-1", "type": "SHORT_ANSWER", "difficulty": "easy"}]
QUESTIONS = [{**SKELETON[0], "stem": "Was ist eine Tabelle?"}]
IMPROVED_QUESTIONS = QUESTIONS

OUTLINE = [
    {"position": 1, "slide_type": "title", "title": "Datenbanken"},
    {"position": 2, "slide_type": "content", "title": "Tabellen"},
    {"position": 3, "slide_type": "content", "title": "Primaerschluessel"},
    {"position": 4, "slide_type": "content", "title": "Beziehungen"},
    {"position": 5, "slide_type": "closing", "title": "Zusammenfassung"},
]
SLIDES = [
    {**OUTLINE[0], "bullets": ["Einführung in Datenbanken"], "examples": []},
    {**OUTLINE[1], "bullets": ["Tabellen strukturieren Daten", "Schlüssel verbinden Tabellen"], "examples": []},
]
SLIDES.extend(
    {**slide, "bullets": [slide["title"]], "examples": []}
    for slide in OUTLINE[2:]
)
IMPROVED_SLIDES = SLIDES


@pytest.fixture(autouse=True)
def block_network(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Orchestrator unit tests must not open network connections.")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)


@pytest.fixture
def stub_question_stages(monkeypatch):
    monkeypatch.setattr(orchestrator, "generate_valid_skeleton", AsyncMock(return_value=SKELETON))
    monkeypatch.setattr(orchestrator, "generate_valid_content", AsyncMock(return_value=QUESTIONS))
    monkeypatch.setattr(
        orchestrator, "generate_valid_improved_content", AsyncMock(return_value=IMPROVED_QUESTIONS),
    )


@pytest.fixture
def stub_slides_stages(monkeypatch):
    monkeypatch.setattr(
        slides_orchestrator, "generate_valid_slides_outline", AsyncMock(return_value=OUTLINE),
    )
    monkeypatch.setattr(
        slides_orchestrator, "generate_valid_slides_content", AsyncMock(return_value=SLIDES),
    )
    monkeypatch.setattr(
        slides_orchestrator, "generate_valid_improved_slides", AsyncMock(return_value=IMPROVED_SLIDES),
    )


def make_question_request(**overrides):
    return GenerateRequest(topic="Datenbanken", count=1, **overrides)


def make_slides_request(**overrides):
    return SlidesGenerateRequest(topic="Datenbanken", slide_count=len(OUTLINE), **overrides)


async def test_generate_questions_runs_with_fake_persistence_and_no_db(stub_question_stages):
    fake = FakeQuestionGenerationPersistence()
    req = make_question_request()
    user_id = uuid4()

    response = await orchestrator.generate_questions(req, db=None, user_id=user_id, persistence=fake)

    assert response.accepted is True
    assert response.request_id == fake.request.id
    assert [q.question for q in response.questions] == [q["stem"] for q in IMPROVED_QUESTIONS]

    assert len(fake.request_calls) == 1
    assert fake.request_calls[0].req is req
    assert fake.request_calls[0].user_id == user_id
    assert fake.request_calls[0].existing_request_id is None

    assert fake.prompt_lookup_calls == [PromptLookupCall(fake.request.id, "IMPROVE")]

    assert len(fake.store_calls) == 1
    store_call = fake.store_calls[0]
    assert store_call.request_id == fake.request.id
    assert store_call.prompt_id == fake.latest_prompt.id
    assert store_call.stage == "IMPROVE"
    assert store_call.questions == IMPROVED_QUESTIONS


async def test_generate_questions_reuses_existing_request_id(stub_question_stages):
    fake = FakeQuestionGenerationPersistence()
    existing_id = uuid4()

    await orchestrator.generate_questions(
        make_question_request(), db=None, user_id=uuid4(),
        existing_request_id=existing_id, persistence=fake,
    )

    assert fake.request_calls[0].existing_request_id == existing_id


async def test_generate_questions_raises_when_no_improve_prompt_found(stub_question_stages):
    class NoPromptPersistence(FakeQuestionGenerationPersistence):
        def get_latest_prompt(self, db, *, request_id, stage):
            self.prompt_lookup_calls.append(PromptLookupCall(request_id, stage))
            return None

    fake = NoPromptPersistence()

    with pytest.raises(PromptStateError):
        await orchestrator.generate_questions(
            make_question_request(), db=None, user_id=uuid4(), persistence=fake,
        )

    assert fake.store_calls == []


async def test_generate_slides_runs_with_fake_persistence_and_no_db(stub_slides_stages):
    fake = FakeSlidesGenerationPersistence()
    req = make_slides_request()
    user_id = uuid4()

    response = await slides_orchestrator.generate_slides(req, db=None, user_id=user_id, persistence=fake)

    assert response.status == "ok"
    assert len(response.slides) == req.slide_count
    assert response.request_id == fake.request.id
    assert [s.title for s in response.slides] == [s["title"] for s in IMPROVED_SLIDES]

    assert len(fake.request_calls) == 1
    request_call = fake.request_calls[0]
    assert request_call.req.topic == req.topic
    assert request_call.user_id == user_id
    assert request_call.existing_request_id is None
    assert request_call.slide_count == req.slide_count

    assert fake.prompt_lookup_calls == [PromptLookupCall(fake.request.id, "SLIDES_IMPROVE")]

    assert len(fake.store_calls) == 1
    store_call = fake.store_calls[0]
    assert store_call.stage == "SLIDES_IMPROVE"
    assert store_call.slides == IMPROVED_SLIDES


async def test_generate_slides_reuses_existing_request_id(stub_slides_stages):
    fake = FakeSlidesGenerationPersistence()
    existing_id = uuid4()

    await slides_orchestrator.generate_slides(
        make_slides_request(), db=None, user_id=uuid4(),
        existing_request_id=existing_id, persistence=fake,
    )

    assert fake.request_calls[0].existing_request_id == existing_id


async def test_generate_slides_raises_when_no_improve_prompt_found(stub_slides_stages):
    class NoPromptPersistence(FakeSlidesGenerationPersistence):
        def get_latest_prompt(self, db, *, request_id, stage):
            self.prompt_lookup_calls.append(PromptLookupCall(request_id, stage))
            return None

    fake = NoPromptPersistence()

    with pytest.raises(PromptStateError):
        await slides_orchestrator.generate_slides(
            make_slides_request(), db=None, user_id=uuid4(), persistence=fake,
        )

    assert fake.store_calls == []
