from uuid import UUID

import pytest
from sqlalchemy import select

from app.models.sql_models import Job

QUESTIONS_REQUEST = {
    "topic": "Relationale Datenbanken",
    "language": "de",
    "count": 2,
    "types": ["SCQ"],
    "difficulty_distribution": {"easy": 50, "medium": 30, "hard": 20},
}
SLIDES_REQUEST = {"topic": "Normalisierung", "slide_count": 6, "language": "de"}

# (Endpunkt, Routenmodul, Runner-Name, Jobtyp, gültiger Request, ungültiger Request)
CASES = {
    "questions": (
        "/api/generate", "app.api.routes_generate", "run_questions_job", "questions",
        QUESTIONS_REQUEST,
        {**QUESTIONS_REQUEST, "difficulty_distribution": {"easy": 50, "medium": 30, "hard": 30}},
    ),
    "slides": (
        "/api/slides/generate", "app.api.routes_slides", "run_slides_job", "slides",
        SLIDES_REQUEST,
        {**SLIDES_REQUEST, "slide_count": 4},
    ),
}


@pytest.fixture(params=list(CASES))
def case(request, monkeypatch):
    """Ersetzt den Runner im Routenmodul durch einen Recorder; es läuft keine Generierung."""
    url, module, runner, job_type, valid, invalid = CASES[request.param]
    calls = []
    monkeypatch.setattr(f"{module}.{runner}", lambda *args, **kwargs: calls.append(args))
    return {"url": url, "job_type": job_type, "valid": valid, "invalid": invalid, "calls": calls}


def _jobs(db_session):
    db_session.expire_all()
    return db_session.scalars(select(Job)).all()


def test_valid_request_creates_pending_job_and_hands_it_to_runner(client, db_session, two_users, case):
    owner, _ = two_users

    response = client.post(case["url"], json=case["valid"], headers=owner["headers"])

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    job_id = UUID(body["job_id"])

    jobs = _jobs(db_session)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.id == job_id
    assert job.user_id == owner["user"].id
    assert job.job_type == case["job_type"]
    assert job.status == "pending"
    for key, value in case["valid"].items():
        assert job.request_data[key] == value

    assert len(case["calls"]) == 1
    called_job_id, called_request, called_user_id = case["calls"][0]
    assert called_job_id == job_id
    assert called_request == job.request_data
    assert called_user_id == owner["user"].id


def test_invalid_request_returns_422_without_job_or_runner(client, db_session, two_users, case):
    owner, _ = two_users

    response = client.post(case["url"], json=case["invalid"], headers=owner["headers"])

    assert response.status_code == 422
    assert _jobs(db_session) == []
    assert case["calls"] == []
