"""SCRUM-70: OpenAI oder Ollama auch bei der Foliengenerierung.

Prüft die Auswahl in der Anfrage, die Freigabe am Server, die Weitergabe des
Anbieters an alle drei Folien-Stufen und an jeden Batch. Ohne Netzwerk, ohne
Datenbank und ohne echtes Modell.
"""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api import routes_slides
from app.config import settings
from app.models.slides_models import SlidesGenerateRequest
from app.services import batch_runner
from app.services.generation import (
    slides_content_service,
    slides_improve_service,
    slides_orchestrator,
    slides_outline_service,
    stage_runner,
)
from app.services.llm_client import OpenAILLMProvider
from app.services.llm_selection import create_provider, resolve_selection
from app.services.ollama_provider import OllamaLLMProvider
from fakes.fake_generation_persistence import FakeSlidesGenerationPersistence
from fakes.fake_llm_provider import FakeLLMProvider
from fakes.fake_stage_runner import FakeStageRunner

# Kleinster gültiger Foliensatz (Titel- und Abschlussfolie), wie in test_slides_stages.py.
OUTLINE = [
    {"position": 1, "slide_type": "title", "title": "Datenbanken"},
    {"position": 2, "slide_type": "closing", "title": "Zusammenfassung"},
]
CONTENT = [
    {**OUTLINE[0], "bullets": ["Einführung in das Thema Datenbanken"], "examples": []},
    {**OUTLINE[1], "bullets": ["Tabellen strukturieren Daten", "Schlüssel verbinden Tabellen"], "examples": []},
]
IMPROVED = [
    {**CONTENT[0], "bullets": ["Einführung und Überblick über Datenbanken"]},
    {**CONTENT[1]},
]
STAGES = ["SLIDES_OUTLINE", "SLIDES_CONTENT", "SLIDES_IMPROVE"]


@pytest.fixture(autouse=True)
def server_models(monkeypatch):
    """Freigegebene Modelle wie auf einem Rechner mit Ollama."""
    monkeypatch.setattr(settings, "ollama_enabled", True)
    monkeypatch.setattr(settings, "ollama_models", ("qwen3:8b",))
    monkeypatch.setattr(settings, "openai_model_name", "gpt-4o")


def slides_request(**values):
    return SlidesGenerateRequest(topic="Datenbanken", slide_count=5, **values)


def two_slides(req):
    # Die Mindestanzahl im Modell ist 5; für die kleinen Testdaten wie im Batch-Runner per model_copy setzen.
    return req.model_copy(update={"slide_count": 2})


# --- Anfrage und Freigabe -------------------------------------------------------------------


def test_request_without_selection_keeps_openai_default():
    req = slides_request()
    assert (req.provider, req.model) == ("openai", None)


def test_old_job_data_without_selection_still_loads():
    """Gespeicherte Aufträge von vor SCRUM-70 haben keine Felder provider und model."""
    req = SlidesGenerateRequest(**{"topic": "Datenbanken", "slide_count": 5, "language": "de"})
    assert req.provider == "openai"


def test_default_selection_resolves_to_openai_model():
    req = resolve_selection(slides_request())
    assert isinstance(req, SlidesGenerateRequest)
    assert (req.provider, req.model) == ("openai", "gpt-4o")
    assert isinstance(create_provider(req), OpenAILLMProvider)


def test_ollama_selection_resolves_to_first_released_model():
    req = resolve_selection(slides_request(provider="ollama"))
    assert isinstance(req, SlidesGenerateRequest)
    assert (req.provider, req.model) == ("ollama", "qwen3:8b")
    assert req.topic == "Datenbanken" and req.slide_count == 5
    assert isinstance(create_provider(req), OllamaLLMProvider)


@pytest.mark.parametrize(
    "values",
    [
        {"provider": "unknown"},
        {"provider": "ollama", "model": "llama3:70b"},
        {"provider": "openai", "model": "gpt-3.5"},
    ],
)
def test_not_released_selection_is_rejected(values):
    with pytest.raises(HTTPException) as error:
        resolve_selection(slides_request(**values))
    assert error.value.status_code == 422


def test_ollama_is_rejected_when_disabled_on_server(monkeypatch):
    monkeypatch.setattr(settings, "ollama_enabled", False)
    with pytest.raises(HTTPException) as error:
        resolve_selection(slides_request(provider="ollama"))
    assert error.value.status_code == 422


# --- Route ---------------------------------------------------------------------------------


async def test_route_stores_resolved_selection_in_job(monkeypatch):
    job = SimpleNamespace(id=uuid4(), status="pending")
    create_job = Mock(return_value=job)
    monkeypatch.setattr(routes_slides, "create_job", create_job)
    tasks = BackgroundTasks()

    await routes_slides.generate_slides(
        slides_request(provider="ollama"), tasks,
        validator=Mock(), db=Mock(), current_user=SimpleNamespace(id=uuid4()),
    )

    data = create_job.call_args.kwargs["request_data"]
    assert (data["provider"], data["model"]) == ("ollama", "qwen3:8b")
    # Der Hintergrundauftrag bekommt genau dieselbe Auswahl.
    assert tasks.tasks[0].args[1] == data


async def test_route_rejects_not_released_model_without_job(monkeypatch):
    create_job = Mock()
    monkeypatch.setattr(routes_slides, "create_job", create_job)
    tasks = BackgroundTasks()

    with pytest.raises(HTTPException) as error:
        await routes_slides.generate_slides(
            slides_request(provider="ollama", model="llama3:70b"), tasks,
            validator=Mock(), db=Mock(), current_user=SimpleNamespace(id=uuid4()),
        )

    assert error.value.status_code == 422
    create_job.assert_not_called()
    assert tasks.tasks == []


# --- Weitergabe an die Stufen ------------------------------------------------------------


async def test_orchestrator_passes_given_provider_to_all_three_stages():
    provider = object()
    runner = FakeStageRunner([json.dumps(OUTLINE), json.dumps(CONTENT), json.dumps(IMPROVED)])

    await slides_orchestrator.generate_slides(
        two_slides(slides_request(provider="ollama")), db=None, user_id=uuid4(),
        persistence=FakeSlidesGenerationPersistence(), stage_runner=runner, llm_provider=provider,
    )

    assert [call.stage for call in runner.calls] == STAGES
    assert all(call.llm_provider is provider for call in runner.calls)


async def test_orchestrator_builds_provider_from_request_when_none_given(monkeypatch):
    built = object()
    factory = Mock(return_value=built)
    monkeypatch.setattr(slides_orchestrator, "create_provider", factory)
    runner = FakeStageRunner([json.dumps(OUTLINE), json.dumps(CONTENT), json.dumps(IMPROVED)])
    req = two_slides(slides_request(provider="ollama", model="qwen3:8b"))

    await slides_orchestrator.generate_slides(
        req, db=None, user_id=uuid4(),
        persistence=FakeSlidesGenerationPersistence(), stage_runner=runner,
    )

    factory.assert_called_once_with(req)
    assert all(call.llm_provider is built for call in runner.calls)


@pytest.mark.parametrize(
    "generate, arguments, response",
    [
        (slides_outline_service.generate_valid_slides_outline,
         {"base_context": {"topic": "Datenbanken"}, "expected_count": 2}, OUTLINE),
        (slides_content_service.generate_valid_slides_content,
         {"outline": OUTLINE, "base_context": {"topic": "Datenbanken"}}, CONTENT),
        (slides_improve_service.generate_valid_improved_slides,
         {"content_slides": CONTENT}, IMPROVED),
    ],
)
async def test_each_stage_keeps_provider_on_retry(generate, arguments, response):
    provider = object()
    runner = FakeStageRunner(["kein JSON", json.dumps(response)])

    await generate(db=None, request_id=uuid4(), language="de", stage_runner=runner,
                   llm_provider=provider, **arguments)

    assert len(runner.calls) == 2
    assert all(call.llm_provider is provider for call in runner.calls)


async def test_real_stage_runner_sends_all_prompts_to_selected_provider(monkeypatch):
    """Ganzer Ablauf mit dem echten run_stage: kein Rückfall auf den Standard-Anbieter OpenAI."""
    monkeypatch.setattr(stage_runner, "get_template_by_stage", lambda db, stage, language: stage)
    monkeypatch.setattr(stage_runner, "insert_prompt_entry", lambda **kwargs: SimpleNamespace())
    monkeypatch.setattr(
        "app.services.llm_client.get_default_llm_provider",
        Mock(side_effect=AssertionError("Rückfall auf den Standard-Anbieter")),
    )
    ollama = FakeLLMProvider([json.dumps(OUTLINE), json.dumps(CONTENT), json.dumps(IMPROVED)])

    response = await slides_orchestrator.generate_slides(
        two_slides(slides_request(provider="ollama")), db=Mock(), user_id=uuid4(),
        persistence=FakeSlidesGenerationPersistence(), llm_provider=ollama,
    )

    assert ollama.prompts == STAGES
    assert [slide.title for slide in response.slides] == ["Datenbanken", "Zusammenfassung"]


# --- Batches ---------------------------------------------------------------------------------


async def test_all_batches_share_one_provider(monkeypatch):
    selected = object()
    factory = Mock(return_value=selected)
    generate = AsyncMock(return_value=SimpleNamespace(slides=[]))
    monkeypatch.setattr(batch_runner, "create_provider", factory)
    monkeypatch.setattr(batch_runner, "generate_slides", generate)
    monkeypatch.setattr(batch_runner, "update_job", Mock())

    await batch_runner.run_slide_batches(
        uuid4(), SlidesGenerateRequest(topic="Datenbanken", slide_count=12,
                                       provider="ollama", model="qwen3:8b"),
        uuid4(), Mock(), Mock(), existing_request_id=uuid4(),
    )

    factory.assert_called_once()
    assert generate.await_count == 2
    for call in generate.call_args_list:
        assert call.kwargs["llm_provider"] is selected
        assert (call.args[0].provider, call.args[0].model) == ("ollama", "qwen3:8b")
