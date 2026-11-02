"""Slides orchestrator: stage order, progress, persistence and abort-on-failure."""

import copy
import json
import socket
from uuid import uuid4

import pytest

from app.core.exceptions import LLMJSONError, SlidesContentValidationError
from app.models.slides_models import SlidesGenerateRequest
from app.services.generation import slides_orchestrator
from fakes.fake_generation_persistence import FakeSlidesGenerationPersistence
from fakes.fake_stage_runner import FakeStageRunner
from fakes.progress_recorder import ProgressRecorder

OUTLINE = [
    {"position": 1, "slide_type": "title", "title": "Einführung in Datenbanken"},
    {"position": 2, "slide_type": "content", "title": "Tabellen und Schlüssel"},
    {"position": 3, "slide_type": "content", "title": "Normalisierung"},
    {"position": 4, "slide_type": "content", "title": "SQL-Abfragen"},
    {"position": 5, "slide_type": "closing", "title": "Zusammenfassung"},
]

CONTENT = [
    {**OUTLINE[0], "bullets": [
        "Diese Folie führt in die Grundlagen relationaler Datenbanken ein.",
    ], "examples": []},
    {**OUTLINE[1], "bullets": [
        "Tabellen speichern strukturierte Daten in Zeilen und Spalten ab.",
        "Jede Zeile einer Tabelle repräsentiert einen eindeutigen Datensatz im System.",
        "Primärschlüssel identifizieren jeden Datensatz eindeutig und verhindern doppelte Einträge.",
    ], "examples": ["Eine Kundentabelle enthält zum Beispiel Name, Adresse und Kundennummer."]},
    {**OUTLINE[2], "bullets": [
        "Normalisierung reduziert Redundanz, indem Daten in mehrere verknüpfte Tabellen aufgeteilt werden.",
        "Die erste Normalform verlangt atomare Werte in jeder einzelnen Tabellenspalte.",
        "Fremdschlüssel verbinden normalisierte Tabellen und stellen referentielle Integrität sicher.",
    ], "examples": []},
    {**OUTLINE[3], "bullets": [
        "SQL-Abfragen nutzen SELECT-Anweisungen, um gezielt Daten aus Tabellen auszulesen.",
        "JOIN-Operationen verknüpfen mehrere Tabellen anhand gemeinsamer Schlüsselspalten miteinander.",
        "WHERE-Klauseln filtern Ergebnisse anhand bestimmter Bedingungen in der Abfrage.",
    ], "examples": []},
    {**OUTLINE[4], "bullets": [
        "Tabellen, Normalisierung und SQL bilden die Basis jeder Datenbank.",
        "Wer diese Konzepte versteht, kann Datenbanken effektiv nutzen.",
    ], "examples": []},
]

IMPROVED = copy.deepcopy(CONTENT)
IMPROVED[1]["bullets"][0] = (
    "Tabellen speichern strukturierte Daten übersichtlich in Zeilen und Spalten ab."
)


@pytest.fixture(autouse=True)
def block_real_io(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Orchestrator tests must not use the real runner, network or database.")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)


def make_request(**overrides):
    return SlidesGenerateRequest(topic="Datenbanken", slide_count=5, **overrides)


async def test_successful_flow_runs_stages_in_order_and_reports_progress():
    runner = FakeStageRunner([json.dumps(OUTLINE), json.dumps(CONTENT), json.dumps(IMPROVED)])
    persistence = FakeSlidesGenerationPersistence()
    progress = ProgressRecorder()

    response = await slides_orchestrator.generate_slides(
        make_request(), db=None, user_id=uuid4(),
        on_progress=progress, persistence=persistence, stage_runner=runner,
    )

    assert [call.stage for call in runner.calls] == ["SLIDES_OUTLINE", "SLIDES_CONTENT", "SLIDES_IMPROVE"]
    progress.assert_events([
        (33, "Gliederung wird erstellt"),
        (66, "Folieninhalte werden generiert"),
        (100, "Folien werden optimiert"),
    ])

    # Only the IMPROVE result is persisted and returned, not the intermediate stages.
    assert len(persistence.store_calls) == 1
    assert persistence.store_calls[0].stage == "SLIDES_IMPROVE"
    assert persistence.store_calls[0].slides == IMPROVED
    assert [s.bullets[0] for s in response.slides] == [s["bullets"][0] for s in IMPROVED]


async def test_existing_request_id_is_reused_across_all_stages():
    runner = FakeStageRunner([json.dumps(OUTLINE), json.dumps(CONTENT), json.dumps(IMPROVED)])
    persistence = FakeSlidesGenerationPersistence()
    existing_id = uuid4()

    await slides_orchestrator.generate_slides(
        make_request(), db=None, user_id=uuid4(),
        existing_request_id=existing_id, persistence=persistence, stage_runner=runner,
    )

    assert persistence.request_calls[0].existing_request_id == existing_id
    assert persistence.request_calls[0].slide_count == 5
    assert all(call.request_id == persistence.request.id for call in runner.calls)


async def test_failing_outline_stage_stops_before_content_and_improve():
    runner = FakeStageRunner(["not json", "not json", "not json"])
    persistence = FakeSlidesGenerationPersistence()
    progress = ProgressRecorder()

    with pytest.raises(LLMJSONError):
        await slides_orchestrator.generate_slides(
            make_request(), db=None, user_id=uuid4(),
            on_progress=progress, persistence=persistence, stage_runner=runner,
        )

    assert [call.stage for call in runner.calls] == ["SLIDES_OUTLINE"] * 3
    progress.assert_not_called()
    assert persistence.store_calls == []


async def test_failing_content_stage_stops_before_improve():
    invalid_content = json.dumps([{**CONTENT[0], "bullets": []}])
    runner = FakeStageRunner([
        json.dumps(OUTLINE), invalid_content, invalid_content, invalid_content,
    ])
    persistence = FakeSlidesGenerationPersistence()
    progress = ProgressRecorder()

    with pytest.raises(SlidesContentValidationError):
        await slides_orchestrator.generate_slides(
            make_request(), db=None, user_id=uuid4(),
            on_progress=progress, persistence=persistence, stage_runner=runner,
        )

    assert [call.stage for call in runner.calls] == [
        "SLIDES_OUTLINE", "SLIDES_CONTENT", "SLIDES_CONTENT", "SLIDES_CONTENT",
    ]
    progress.assert_progress([33])
    assert persistence.store_calls == []
