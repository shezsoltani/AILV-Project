from dataclasses import dataclass
from uuid import uuid4

import pytest
from passlib.hash import bcrypt

from app.models.sql_models import (
    Course, GenerationRequest, PromptEntry, PromptTemplate, Question,
    QuestionCourse, User,
)
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
    def create_archive(owner, *, topic=None, question_count=1):
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
        questions = [
            Question(
                request_id=request.id, prompt_id=prompt.id, type="SCQ",
                difficulty="easy",
                stem="Wofür steht SQL?" if number == 0 else f"Wofür steht SQL? ({number + 1})",
                choices=["Structured Query Language", "Simple Queue List"],
                correct_index=0, rationale="SQL ist eine Datenbankabfragesprache.",
            )
            for number in range(question_count)
        ]
        db_session.add_all(questions)
        db_session.flush()
        return {"request_id": request.id, "question_ids": [q.id for q in questions]}

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


@dataclass
class TwoUsersData:
    user_a: User
    user_b: User
    course_a1: Course
    course_a2: Course
    course_b1: Course
    req_a: GenerationRequest
    req_b: GenerationRequest
    q_a1: Question
    q_a2: Question
    q_a_unassigned: Question
    q_b1: Question
    q_b_unassigned: Question


@pytest.fixture
def two_users_dataset(db_session, user_factory):
    """Testdaten für Zwei-Benutzer-Szenarien (SCRUM-34):
    Benutzer A erhält zwei LVs sowie Fragen mit und ohne Zuordnung;
    Benutzer B erhält eigene LVs und Fragen.
    """
    user_a = user_factory()
    user_b = user_factory()

    c_a1 = Course(user_id=user_a.id, name="Mathematik 1")
    c_a2 = Course(user_id=user_a.id, name="Statistik")
    c_b1 = Course(user_id=user_b.id, name="Physik 1")
    db_session.add_all([c_a1, c_a2, c_b1])
    db_session.flush()

    req_a = GenerationRequest(
        user_id=user_a.id,
        topic="Lineare Algebra",
        language="de",
        count=3,
        types=["SCQ", "SHORT_ANSWER"],
    )
    req_b = GenerationRequest(
        user_id=user_b.id,
        topic="Mechanik",
        language="de",
        count=2,
        types=["SCQ"],
    )
    db_session.add_all([req_a, req_b])
    db_session.flush()

    q_a1 = Question(
        request_id=req_a.id,
        stem="Frage 1 von User A (nur Mathe 1)",
        type="SCQ",
        difficulty="easy",
        choices=["A", "B", "C", "D"],
        correct_index=0,
    )
    q_a2 = Question(
        request_id=req_a.id,
        stem="Frage 2 von User A (Mathe 1 und Statistik)",
        type="SCQ",
        difficulty="medium",
        choices=["Wahr", "Falsch"],
        correct_index=1,
    )
    q_a_unassigned = Question(
        request_id=req_a.id,
        stem="Frage 3 von User A (ohne LV)",
        type="SHORT_ANSWER",
        difficulty="hard",
        answer="Beispielantwort",
    )

    q_b1 = Question(
        request_id=req_b.id,
        stem="Frage 1 von User B (nur Physik 1)",
        type="SCQ",
        difficulty="easy",
        choices=["X", "Y"],
        correct_index=0,
    )
    q_b_unassigned = Question(
        request_id=req_b.id,
        stem="Frage 2 von User B (ohne LV)",
        type="SCQ",
        difficulty="medium",
        choices=["1", "2"],
        correct_index=1,
    )

    db_session.add_all([q_a1, q_a2, q_a_unassigned, q_b1, q_b_unassigned])
    db_session.flush()

    qc_a1 = QuestionCourse(question_id=q_a1.id, course_id=c_a1.id)
    qc_a2_1 = QuestionCourse(question_id=q_a2.id, course_id=c_a1.id)
    qc_a2_2 = QuestionCourse(question_id=q_a2.id, course_id=c_a2.id)
    qc_b1 = QuestionCourse(question_id=q_b1.id, course_id=c_b1.id)

    db_session.add_all([qc_a1, qc_a2_1, qc_a2_2, qc_b1])
    db_session.commit()

    return TwoUsersData(
        user_a=user_a,
        user_b=user_b,
        course_a1=c_a1,
        course_a2=c_a2,
        course_b1=c_b1,
        req_a=req_a,
        req_b=req_b,
        q_a1=q_a1,
        q_a2=q_a2,
        q_a_unassigned=q_a_unassigned,
        q_b1=q_b1,
        q_b_unassigned=q_b_unassigned,
    )
