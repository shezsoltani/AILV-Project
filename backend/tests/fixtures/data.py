from uuid import uuid4

import pytest
from passlib.hash import bcrypt

from app.models.sql_models import GenerationRequest, PromptEntry, PromptTemplate, Question, User
from app.persistence import job_repository


@pytest.fixture
def test_password():
    return "TestPassword-123!"


@pytest.fixture
def user_factory(db_session, test_password):
    def create_user(**overrides):
        identifier = uuid4().hex
        values = {
            "username": f"user_{identifier}",
            "email": f"user_{identifier}@example.com",
            "password_hash": bcrypt.hash(test_password),
        }
        values.update(overrides)
        user = User(**values)
        db_session.add(user)
        db_session.flush()
        return user

    return create_user


@pytest.fixture
def test_user(user_factory):
    return user_factory()


@pytest.fixture
def request_data():
    return {
        "topic": "Relationale Datenbanken",
        "language": "de",
        "count": 2,
        "types": ["SCQ"],
        "difficulty_distribution": {"easy": 100, "medium": 0, "hard": 0},
    }


@pytest.fixture
def test_generation_request(db_session, test_user, request_data):
    generation_request = GenerationRequest(user_id=test_user.id, **request_data)
    db_session.add(generation_request)
    db_session.flush()
    return generation_request


@pytest.fixture
def finalized_archive_factory(db_session, request_data):
    """Create a small finalized archive; owner is a User, returned IDs are UUIDs."""
    def create_archive(owner, *, topic=None):
        values = {**request_data, "count": 1}
        if topic is not None:
            values["topic"] = topic
        request = GenerationRequest(user_id=owner.id, **values)
        db_session.add(request)
        db_session.flush()
        prompt = PromptEntry(
            request_id=request.id, stage="IMPROVE",
            prompt_text="Prüfe die Datenbankfrage.",
        )
        db_session.add(prompt)
        db_session.flush()
        question = Question(
            request_id=request.id, prompt_id=prompt.id, type="SCQ",
            difficulty="easy", stem="Wofür steht SQL?",
            choices=["Structured Query Language", "Simple Queue List"],
            correct_index=0, rationale="SQL ist eine Datenbankabfragesprache.",
        )
        db_session.add(question)
        db_session.flush()
        return {"request_id": request.id, "question_ids": [question.id]}

    return create_archive


@pytest.fixture
def job_factory(db_session, request_data):
    """Use repository commits inside the existing isolated test transaction."""
    def create_job(owner, *, status="pending", job_type="questions"):
        job = job_repository.create_job(
            db_session, user_id=owner.id, job_type=job_type,
            request_data=dict(request_data),
        )
        if status != "pending":
            job = job_repository.update_job(db_session, job.id, status=status)
        return job

    return create_job


@pytest.fixture
def question_prompt_templates(db_session):
    """Minimal German templates, seeded only when explicitly requested."""
    texts = {
        "SKELETON": (
            "Erstelle {{ count }} Fragenstrukturen zum Thema {{ topic }} auf Deutsch. "
            "Nutze {{ types }} und die Verteilung {{ difficulty_distribution }} "
            "für die Schwierigkeiten easy, medium und hard. "
            "Gib ein JSON-Array mit type und difficulty zurück."
        ),
        "CONTENT": (
            "Formuliere deutsche Fragen zum Thema {{ topic }} aus {{ skeleton_data }}. "
            "Behalte id, type und difficulty. Ergänze stem und rationale; "
            "für SCQ/TRUE_FALSE choices und correct_index, für MCQ choices und "
            "correct_indices, für SHORT_ANSWER answer. Gib ein JSON-Array zurück."
        ),
        "IMPROVE": (
            "Prüfe und verbessere diese deutschen Fragen: {{ questions_raw }}. "
            "Behalte IDs und Struktur bei und gib ausschließlich JSON zurück."
        ),
    }
    templates = {
        stage: PromptTemplate(stage=stage, language="de", template=template)
        for stage, template in texts.items()
    }
    db_session.add_all(templates.values())
    db_session.flush()
    return templates
