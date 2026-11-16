import pytest

from sqlalchemy import select

from app.models.sql_models import GenerationRequest, Job, PromptEntry, PromptTemplate, Question, User
from app.services.templateService import get_template_by_stage, render_template


def test_login_uses_fixture_user(client, test_user, test_password):
    response = client.post("/api/auth/login", json={
        "username": test_user.username,
        "password": test_password,
    })

    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.parametrize("run", [1, 2])
def test_registration_commits_are_isolated(client, test_password, run):
    # Beide Tests müssen dieselben eindeutigen Daten neu anlegen können.
    response = client.post("/api/auth/register", json={
        "username": "registration_probe",
        "email": "registration@example.com",
        "password": test_password,
    })

    assert response.status_code == 200
    assert response.json()["username"] == "registration_probe"


def test_request_fixture_belongs_to_user(db_session, test_user, test_generation_request):
    stored = db_session.get(GenerationRequest, test_generation_request.id)

    assert stored.user_id == test_user.id
    assert stored.types == ["SCQ"]


def test_two_users_have_separate_archives(client, two_users, finalized_archive_factory, db_session):
    first, second = two_users
    assert first["user"].id != second["user"].id
    assert first["token"] != second["token"]
    archives = [finalized_archive_factory(account["user"]) for account in two_users]

    for account, archive, other in zip(two_users, archives, reversed(archives)):
        stored = db_session.get(GenerationRequest, archive["request_id"])
        assert stored.user_id == account["user"].id
        question = db_session.get(Question, archive["question_ids"][0])
        assert question.request_id == stored.id
        assert db_session.get(PromptEntry, question.prompt_id).request_id == stored.id
        response = client.get("/api/archive/topics", headers=account["headers"])
        assert response.status_code == 200
        assert {item["request_id"] for item in response.json()["topics"]} == {str(stored.id)}
        url = f'/api/archive/{stored.id}/questions'
        response = client.get(url, headers=account["headers"])
        assert response.status_code == 200
        assert {q["id"] for q in response.json()["questions"]} == {
            str(qid) for qid in archive["question_ids"]
        }
        response = client.get(
            f'/api/archive/{other["request_id"]}/questions', headers=account["headers"],
        )
        assert response.status_code == 403


@pytest.mark.parametrize("status", ["pending", "running", "completed", "failed"])
def test_job_factory_owner_and_status(client, two_users, job_factory, status):
    owner, other = two_users
    job = job_factory(owner["user"], status=status)
    assert job.user_id == owner["user"].id
    assert job.status == status
    response = client.get(f"/api/jobs/{job.id}", headers=owner["headers"])
    assert response.status_code == 200
    assert response.json()["status"] == status
    assert client.get(f"/api/jobs/{job.id}", headers=other["headers"]).status_code == 403


def test_question_templates_are_available_and_renderable(db_session, question_prompt_templates, request_data):
    contexts = {
        "SKELETON": request_data,
        "CONTENT": {"topic": request_data["topic"], "skeleton_data": "[]"},
        "IMPROVE": {"questions_raw": "[]"},
    }
    assert set(question_prompt_templates) == set(contexts)
    assert len(db_session.scalars(select(PromptTemplate)).all()) == 3
    for stage, context in contexts.items():
        template = get_template_by_stage(db_session, stage, "de")
        assert template == question_prompt_templates[stage].template
        assert render_template(template, context)


@pytest.mark.parametrize("iteration", [1, 2])
def test_sprint_three_data_is_opt_in_and_isolated(db_session, request, iteration):
    # Inspect before resolving opt-in fixtures: also works as an individual test.
    models = (User, GenerationRequest, PromptEntry, Question, Job, PromptTemplate)
    for model in models:
        assert db_session.scalars(select(model)).all() == []

    first, second = request.getfixturevalue("two_users")
    archive_factory = request.getfixturevalue("finalized_archive_factory")
    job_factory = request.getfixturevalue("job_factory")
    request.getfixturevalue("question_prompt_templates")
    archive_factory(first["user"])
    archive_factory(second["user"])
    job_factory(first["user"], status="completed")
    db_session.commit()
    db_session.expire_all()
    for model in models:
        assert db_session.scalars(select(model)).all()
