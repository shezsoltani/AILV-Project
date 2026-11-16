"""Fragenauftrag Ende zu Ende: Login, HTTP-Request, echter Job Runner, drei Stufen, PostgreSQL.

Echt sind Route, Job Runner, Batch Runner, Orchestrator, ``run_stage``, Prompt-Templates
(aus der Test-DB), Validatoren, Retries und die SQL-Persistenz. Nur das Sprachmodell wird
durch ``FakeLLMProvider`` ersetzt (kein API-Key, keine externe Anfrage).

Gewartet wird nicht per Sleep: Der Job Runner wird direkt ``await``-et und ist danach fertig.
"""
import json
from collections import Counter
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.models.sql_models import GeneratedQuestion, GenerationRequest, Job, PromptEntry
from app.services.job_runner import run_questions_job
from fakes.fake_llm_provider import FakeLLMProvider

REQUEST = {
    "topic": "Relationale Datenbanken",
    "language": "de",
    "count": 2,
    "types": ["SCQ"],
    "difficulty_distribution": {"easy": 100, "medium": 0, "hard": 0},
}

ID_1, ID_2 = str(uuid4()), str(uuid4())

# Unterscheidungsmerkmale der Templates aus der Fixture question_prompt_templates.
STAGE_MARKERS = {
    "SKELETON": "Fragenstrukturen",
    "CONTENT": "Formuliere deutsche Fragen",
    "IMPROVE": "Prüfe und verbessere",
}


def _skeleton():
    return json.dumps([
        {"id": ID_1, "type": "SCQ", "difficulty": "easy"},
        {"id": ID_2, "type": "SCQ", "difficulty": "easy"},
    ])


def _content():
    return json.dumps([
        {
            "id": item_id, "type": "SCQ", "difficulty": "easy",
            "stem": f"Rohfrage {number}?", "choices": ["Ja", "Nein"],
            "correct_index": 0, "rationale": f"Rohbegründung {number}",
        }
        for number, item_id in enumerate((ID_1, ID_2), start=1)
    ])


IMPROVED_STEMS = ["Verbesserte Frage 1: Wofür steht SQL?", "Verbesserte Frage 2: Was ist ein Primärschlüssel?"]


def _improved():
    return json.dumps([
        {
            "id": item_id, "type": "SCQ", "difficulty": "easy",
            "stem": stem, "choices": ["Richtig", "Falsch"],
            "correct_index": 1, "rationale": f"Verbesserte Begründung {number}",
        }
        for number, (item_id, stem) in enumerate(zip((ID_1, ID_2), IMPROVED_STEMS), start=1)
    ])


def _stage_of(prompt: str) -> str:
    matches = [stage for stage, marker in STAGE_MARKERS.items() if marker in prompt]
    assert len(matches) == 1, prompt
    return matches[0]


@pytest.fixture
def started_job(client, db_session, two_users, question_prompt_templates, monkeypatch):
    """Startet den Auftrag über POST /api/generate; der Runner der Route wird nur aufgezeichnet."""
    calls = []
    monkeypatch.setattr(
        "app.api.routes_generate.run_questions_job", lambda *args, **kwargs: calls.append(args)
    )
    owner = two_users[0]

    response = client.post("/api/generate", json=REQUEST, headers=owner["headers"])

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert len(calls) == 1
    job_id, request_data, user_id = calls[0]
    assert job_id == UUID(response.json()["job_id"])
    return {"owner": owner, "job_id": job_id, "request_data": request_data, "user_id": user_id}


@pytest.fixture
def fake_llm(monkeypatch):
    """Neuer Fake pro Test, als Provider des produktiven run_stage()."""
    fake = FakeLLMProvider()
    monkeypatch.setattr("app.services.llm_client.get_default_llm_provider", lambda: fake)
    return fake


async def _run_job(db_session, db_session_factory, job):
    # Request-Session schließen, danach läuft der echte Job Runner mit eigener Session.
    db_session.close()
    await run_questions_job(
        job["job_id"], job["request_data"], job["user_id"],
        session_factory=db_session_factory,
    )


def _prompt_entries(db_session, request_id):
    db_session.expire_all()
    return db_session.scalars(
        select(PromptEntry).where(PromptEntry.request_id == request_id)
    ).all()


def _assert_completed_and_stored(client, db_session, job, fake):
    owner = job["owner"]
    response = client.get(f"/api/jobs/{job['job_id']}", headers=owner["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["progress"] == 100
    assert body["error_message"] is None
    result = body["result_data"]
    request_id = UUID(result["request_id"])
    assert [q["question"] for q in result["questions"]] == IMPROVED_STEMS
    assert len(result["questions"]) == REQUEST["count"]

    db_session.expire_all()
    stored_job = db_session.get(Job, job["job_id"])
    assert stored_job.status == "completed"
    assert stored_job.result_data["request_id"] == str(request_id)

    # Request gehört dem richtigen Nutzer und trägt die Parameter des HTTP-Requests.
    generation_request = db_session.get(GenerationRequest, request_id)
    assert generation_request.user_id == owner["user"].id
    assert generation_request.topic == REQUEST["topic"]
    assert generation_request.count == REQUEST["count"]

    # Gespeichert ist der Inhalt der IMPROVE-Antwort, zugeordnet zum richtigen Request.
    stored = db_session.scalars(
        select(GeneratedQuestion).where(GeneratedQuestion.request_id == request_id)
    ).all()
    assert len(stored) == 2
    assert {q.stage for q in stored} == {"IMPROVE"}
    assert sorted(q.stem for q in stored) == sorted(IMPROVED_STEMS)
    assert {q.correct_index for q in stored} == {1}
    assert {q.choices[0] for q in stored} == {"Richtig"}
    assert {str(q.id) for q in stored} == {q["id"] for q in result["questions"]}

    improve_prompts = [
        p for p in _prompt_entries(db_session, request_id) if p.stage == "IMPROVE"
    ]
    assert len(improve_prompts) == 1
    assert improve_prompts[0].response_text == _improved()
    assert {q.prompt_id for q in stored} == {improve_prompts[0].id}

    # Es gibt nur diesen einen Request, kein Nebeneffekt auf andere Nutzer.
    assert len(db_session.scalars(select(GenerationRequest)).all()) == 1
    return request_id


async def test_full_question_flow_completes_and_stores_improve_result(
    client, db_session, db_session_factory, started_job, fake_llm
):
    for response in (_skeleton(), _content(), _improved()):
        fake_llm.add_response(response)

    await _run_job(db_session, db_session_factory, started_job)

    request_id = _assert_completed_and_stored(client, db_session, started_job, fake_llm)

    assert [_stage_of(p) for p in fake_llm.prompts] == ["SKELETON", "CONTENT", "IMPROVE"]
    prompts = _prompt_entries(db_session, request_id)
    assert Counter(p.stage for p in prompts) == {"SKELETON": 1, "CONTENT": 1, "IMPROVE": 1}
    assert {p.prompt_text for p in prompts} == set(fake_llm.prompts)
    assert {p.stage: p.response_text for p in prompts} == {
        "SKELETON": _skeleton(), "CONTENT": _content(), "IMPROVE": _improved(),
    }


async def test_invalid_skeleton_json_retries_only_skeleton_stage(
    client, db_session, db_session_factory, started_job, fake_llm
):
    invalid = "Das ist kein gültiges JSON"
    for response in (invalid, _skeleton(), _content(), _improved()):
        fake_llm.add_response(response)

    await _run_job(db_session, db_session_factory, started_job)

    request_id = _assert_completed_and_stored(client, db_session, started_job, fake_llm)

    # Aufrufreihenfolge am Fake: SKELETON (ungültig), SKELETON (gültig), dann je einmal die Folgestufen.
    assert fake_llm.call_count == 4
    assert [_stage_of(p) for p in fake_llm.prompts] == ["SKELETON", "SKELETON", "CONTENT", "IMPROVE"]

    # Prompt-Protokoll: Fehlversuch und Korrektur stehen beide in der Tabelle, nur SKELETON doppelt.
    # (created_at ist innerhalb der Test-Transaktion identisch und taugt nicht zur Sortierung.)
    prompts = _prompt_entries(db_session, request_id)
    assert Counter(p.stage for p in prompts) == {"SKELETON": 2, "CONTENT": 1, "IMPROVE": 1}
    skeleton_responses = [p.response_text for p in prompts if p.stage == "SKELETON"]
    assert sorted(skeleton_responses) == sorted([invalid, _skeleton()])
    assert {p.stage: p.response_text for p in prompts if p.stage != "SKELETON"} == {
        "CONTENT": _content(), "IMPROVE": _improved(),
    }
    assert Counter(p.prompt_text for p in prompts) == Counter(fake_llm.prompts)
