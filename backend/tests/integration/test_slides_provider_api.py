"""SCRUM-70: KI-Auswahl bei POST /api/slides/generate über die echte API und Test-Datenbank."""

import pytest
from sqlalchemy import select

from app.config import settings
from app.models.sql_models import Job

SLIDES_REQUEST = {"topic": "Normalisierung", "slide_count": 6, "language": "de"}


@pytest.fixture
def started(monkeypatch):
    """Ersetzt den Hintergrundauftrag; es läuft keine Generierung."""
    calls = []
    monkeypatch.setattr("app.api.routes_slides.run_slides_job", lambda *args, **kwargs: calls.append(args))
    monkeypatch.setattr(settings, "ollama_enabled", True)
    monkeypatch.setattr(settings, "ollama_models", ("qwen3:8b",))
    return calls


def _jobs(db_session):
    db_session.expire_all()
    return db_session.scalars(select(Job)).all()


def test_ollama_selection_is_stored_with_the_job(client, db_session, two_users, started):
    owner, _ = two_users

    response = client.post(
        "/api/slides/generate", json={**SLIDES_REQUEST, "provider": "ollama"}, headers=owner["headers"],
    )

    assert response.status_code == 200
    [job] = _jobs(db_session)
    assert (job.request_data["provider"], job.request_data["model"]) == ("ollama", "qwen3:8b")
    assert started[0][1] == job.request_data


def test_request_without_selection_uses_openai(client, db_session, two_users, started):
    owner, _ = two_users

    response = client.post("/api/slides/generate", json=SLIDES_REQUEST, headers=owner["headers"])

    assert response.status_code == 200
    [job] = _jobs(db_session)
    assert (job.request_data["provider"], job.request_data["model"]) == ("openai", settings.openai_model_name)


@pytest.mark.parametrize(
    "selection",
    [{"provider": "ollama", "model": "llama3:70b"}, {"provider": "unknown"}],
)
def test_not_released_selection_returns_422_without_job(client, db_session, two_users, started, selection):
    owner, _ = two_users

    response = client.post(
        "/api/slides/generate", json={**SLIDES_REQUEST, **selection}, headers=owner["headers"],
    )

    assert response.status_code == 422
    assert "nicht freigegeben" in response.json()["detail"]
    assert _jobs(db_session) == []
    assert started == []


def test_ollama_returns_422_when_disabled_on_server(client, db_session, two_users, started, monkeypatch):
    monkeypatch.setattr(settings, "ollama_enabled", False)
    owner, _ = two_users

    response = client.post(
        "/api/slides/generate", json={**SLIDES_REQUEST, "provider": "ollama"}, headers=owner["headers"],
    )

    assert response.status_code == 422
    assert _jobs(db_session) == []
