"""SCRUM-43: LV-Auswahl (course_ids) beim Generieren und beim Speichern.

Geprüft wird die Festlegung aus dem Project Diary (11.11.2026):
- course_ids ist eine Liste von LV-IDs; fehlt das Feld, gilt [].
- POST /api/generate prüft die LVs vor dem Jobstart und speichert die Auswahl
  mit den Job-Eingaben.
- POST /api/finalize prüft die LVs erneut und legt die Zuordnungen in derselben
  Transaktion wie die Fragen an.
- Unbekannte, gelöschte oder fremde LVs ergeben 404 "Course not found";
  dann wird nichts gespeichert.

Es werden keine echten KI-Aufrufe ausgeführt.
"""

from uuid import uuid4

import pytest

from app.models.sql_models import (
    Course,
    GeneratedQuestion,
    GenerationRequest,
    Job,
    PromptEntry,
    Question,
    QuestionCourse,
)


# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------

def _course(db_session, user, name):
    course = Course(user_id=user.id, name=name)
    db_session.add(course)
    db_session.flush()
    return course


def _drafts(db_session, user, count=3):
    """Legt einen Auftrag mit `count` generierten, noch nicht gespeicherten Fragen an."""
    request = GenerationRequest(
        user_id=user.id,
        topic="Relationale Datenbanken",
        language="de",
        count=count,
        types=["SCQ"],
    )
    db_session.add(request)
    db_session.flush()

    prompt = PromptEntry(request_id=request.id, stage="IMPROVE", prompt_text="Testprompt")
    db_session.add(prompt)
    db_session.flush()

    drafts = [
        GeneratedQuestion(
            request_id=request.id,
            prompt_id=prompt.id,
            stage="IMPROVE",
            type="SCQ",
            difficulty="easy",
            stem=f"Entwurf {number}",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            rationale="Begründung",
        )
        for number in range(1, count + 1)
    ]
    db_session.add_all(drafts)
    db_session.commit()
    return request, drafts


def _finalize_body(request, drafts, **extra):
    body = {
        "request_id": str(request.id),
        "questions": [{"generated_question_id": str(draft.id)} for draft in drafts],
    }
    body.update(extra)
    return body


def _saved_questions(db_session, request):
    db_session.expire_all()
    return db_session.query(Question).filter(Question.request_id == request.id).all()


def _remaining_drafts(db_session, request):
    db_session.expire_all()
    return (
        db_session.query(GeneratedQuestion)
        .filter(GeneratedQuestion.request_id == request.id)
        .count()
    )


def _assignments(db_session, questions):
    """Liefert {question_id: {course_id, ...}} für die angegebenen Fragen."""
    result = {question.id: set() for question in questions}
    if not questions:
        return result
    rows = (
        db_session.query(QuestionCourse)
        .filter(QuestionCourse.question_id.in_([question.id for question in questions]))
        .all()
    )
    for row in rows:
        result[row.question_id].add(row.course_id)
    return result


def _assert_nothing_saved(db_session, request, draft_count):
    assert _saved_questions(db_session, request) == []
    assert _remaining_drafts(db_session, request) == draft_count
    assert db_session.query(QuestionCourse).count() == 0


# ---------------------------------------------------------------------------
# POST /api/finalize
# ---------------------------------------------------------------------------

def test_finalize_without_course_ids_field_keeps_questions_general(
    client, db_session, test_user, auth_headers
):
    """Bisheriges Anfrageformat ohne das neue Feld funktioniert unverändert."""
    request, drafts = _drafts(db_session, test_user, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "request_id": str(request.id),
        "finalized_count": 2,
        "message": "Questions finalized successfully",
    }
    questions = _saved_questions(db_session, request)
    assert len(questions) == 2
    assert db_session.query(QuestionCourse).count() == 0
    assert _remaining_drafts(db_session, request) == 0


def test_finalize_with_empty_course_ids_keeps_questions_general(
    client, db_session, test_user, auth_headers
):
    request, drafts = _drafts(db_session, test_user, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[]),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 200
    assert len(_saved_questions(db_session, request)) == 2
    assert db_session.query(QuestionCourse).count() == 0


def test_finalize_with_one_course_assigns_every_question(
    client, db_session, test_user, auth_headers
):
    course = _course(db_session, test_user, "Datenbanken 1")
    request, drafts = _drafts(db_session, test_user, count=3)
    headers = auth_headers(test_user)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[str(course.id)]),
        headers=headers,
    )

    assert res.status_code == 200
    assert res.json()["finalized_count"] == 3
    questions = _saved_questions(db_session, request)
    assert len(questions) == 3
    assert _assignments(db_session, questions) == {
        question.id: {course.id} for question in questions
    }
    assert _remaining_drafts(db_session, request) == 0

    # Die Zuordnung ist über die vorhandenen Endpunkte sichtbar.
    res_archive = client.get(f"/api/archive/{request.id}/questions", headers=headers)
    assert res_archive.status_code == 200
    archived = res_archive.json()["questions"]
    assert len(archived) == 3
    assert all(question["course_ids"] == [str(course.id)] for question in archived)

    res_course = client.get(f"/api/courses/{course.id}", headers=headers)
    assert res_course.json()["question_count"] == 3

    res_filter = client.get(
        f"/api/archive/{request.id}/questions?unassigned=true", headers=headers
    )
    assert res_filter.json()["questions"] == []


def test_finalize_with_several_courses_and_duplicates(
    client, db_session, test_user, auth_headers
):
    course_a = _course(db_session, test_user, "Datenbanken 1")
    course_b = _course(db_session, test_user, "Software Engineering")
    request, drafts = _drafts(db_session, test_user, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(
            request,
            drafts,
            course_ids=[str(course_a.id), str(course_b.id), str(course_a.id)],
        ),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 200
    questions = _saved_questions(db_session, request)
    assert len(questions) == 2
    assert _assignments(db_session, questions) == {
        question.id: {course_a.id, course_b.id} for question in questions
    }
    # Doppelte IDs erzeugen keine doppelten Zeilen: 2 Fragen x 2 LVs.
    assert db_session.query(QuestionCourse).count() == 4


def test_finalize_only_selected_questions_get_assignments(
    client, db_session, test_user, auth_headers
):
    """Werden nur manche Entwürfe gespeichert, erhalten nur diese die LV."""
    course = _course(db_session, test_user, "Datenbanken 1")
    request, drafts = _drafts(db_session, test_user, count=3)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts[:2], course_ids=[str(course.id)]),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 200
    assert res.json()["finalized_count"] == 2
    questions = _saved_questions(db_session, request)
    assert {question.stem for question in questions} == {"Entwurf 1", "Entwurf 2"}
    assert db_session.query(QuestionCourse).count() == 2


def test_finalize_keeps_edited_content_together_with_courses(
    client, db_session, test_user, auth_headers
):
    course = _course(db_session, test_user, "Datenbanken 1")
    request, drafts = _drafts(db_session, test_user, count=1)
    body = _finalize_body(request, drafts, course_ids=[str(course.id)])
    body["questions"][0].update({"stem": "Bearbeiteter Text", "difficulty": "hard"})

    res = client.post("/api/finalize", json=body, headers=auth_headers(test_user))

    assert res.status_code == 200
    (question,) = _saved_questions(db_session, request)
    assert question.stem == "Bearbeiteter Text"
    assert question.difficulty == "hard"
    assert question.choices == ["A", "B", "C", "D"]
    assert _assignments(db_session, [question]) == {question.id: {course.id}}


def test_finalize_with_foreign_course_saves_nothing(
    client, db_session, user_factory, auth_headers
):
    owner = user_factory()
    other = user_factory()
    foreign_course = _course(db_session, other, "Fremde LV")
    request, drafts = _drafts(db_session, owner, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[str(foreign_course.id)]),
        headers=auth_headers(owner),
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    _assert_nothing_saved(db_session, request, draft_count=2)


def test_finalize_with_own_and_foreign_course_saves_nothing(
    client, db_session, user_factory, auth_headers
):
    """Eine einzige fremde LV macht die ganze Anfrage ungültig (keine Teilspeicherung)."""
    owner = user_factory()
    other = user_factory()
    own_course = _course(db_session, owner, "Eigene LV")
    foreign_course = _course(db_session, other, "Fremde LV")
    request, drafts = _drafts(db_session, owner, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(
            request, drafts, course_ids=[str(own_course.id), str(foreign_course.id)]
        ),
        headers=auth_headers(owner),
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    _assert_nothing_saved(db_session, request, draft_count=2)


def test_finalize_with_unknown_course_saves_nothing(
    client, db_session, test_user, auth_headers
):
    request, drafts = _drafts(db_session, test_user, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[str(uuid4())]),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    _assert_nothing_saved(db_session, request, draft_count=2)


def test_finalize_after_course_was_deleted_keeps_drafts_and_allows_retry(
    client, db_session, test_user, auth_headers
):
    """Die LV wird zwischen Generieren und Speichern gelöscht.

    Erwartet: 404, nichts gespeichert, Entwürfe bleiben erhalten. Danach kann
    ohne LV gespeichert werden.
    """
    headers = auth_headers(test_user)
    res_course = client.post("/api/courses", json={"name": "Kurzlebige LV"}, headers=headers)
    assert res_course.status_code == 201
    course_id = res_course.json()["id"]
    request, drafts = _drafts(db_session, test_user, count=2)

    assert client.delete(f"/api/courses/{course_id}", headers=headers).status_code == 200

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[course_id]),
        headers=headers,
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    _assert_nothing_saved(db_session, request, draft_count=2)

    res_retry = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[]),
        headers=headers,
    )
    assert res_retry.status_code == 200
    assert res_retry.json()["finalized_count"] == 2
    assert len(_saved_questions(db_session, request)) == 2
    assert db_session.query(QuestionCourse).count() == 0


def test_finalize_rolls_back_when_course_vanishes_during_save(
    client, db_session, test_user, auth_headers, monkeypatch
):
    """Die LV verschwindet genau zwischen Prüfung und Speichern.

    Die Prüfung wird hier umgangen, sodass erst die Datenbank die fehlende LV
    bemerkt. Auch dann darf keine Frage gespeichert bleiben.
    """
    from app.services.finalization import finalize_service

    monkeypatch.setattr(
        finalize_service,
        "ensure_courses_belong_to_user",
        lambda db, user_id, course_ids: list(course_ids),
    )
    request, drafts = _drafts(db_session, test_user, count=2)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[str(uuid4())]),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    _assert_nothing_saved(db_session, request, draft_count=2)


@pytest.mark.parametrize("course_ids", [["keine-uuid"], None, "abc", [None]])
def test_finalize_rejects_invalid_course_ids(
    client, db_session, test_user, auth_headers, course_ids
):
    request, drafts = _drafts(db_session, test_user, count=1)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=course_ids),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 422
    _assert_nothing_saved(db_session, request, draft_count=1)


def test_finalize_of_foreign_request_is_still_forbidden_with_courses(
    client, db_session, user_factory, auth_headers
):
    """Die bestehende Eigentumsprüfung des Auftrags gilt weiterhin."""
    owner = user_factory()
    other = user_factory()
    other_course = _course(db_session, other, "LV des anderen Nutzers")
    request, drafts = _drafts(db_session, owner, count=1)

    res = client.post(
        "/api/finalize",
        json=_finalize_body(request, drafts, course_ids=[str(other_course.id)]),
        headers=auth_headers(other),
    )

    assert res.status_code == 403
    _assert_nothing_saved(db_session, request, draft_count=1)


def test_finalize_twice_does_not_duplicate_questions_or_assignments(
    client, db_session, test_user, auth_headers
):
    course = _course(db_session, test_user, "Datenbanken 1")
    request, drafts = _drafts(db_session, test_user, count=2)
    body = _finalize_body(request, drafts, course_ids=[str(course.id)])
    headers = auth_headers(test_user)

    assert client.post("/api/finalize", json=body, headers=headers).status_code == 200
    res_second = client.post("/api/finalize", json=body, headers=headers)

    assert res_second.status_code == 409
    assert len(_saved_questions(db_session, request)) == 2
    assert db_session.query(QuestionCourse).count() == 2


# ---------------------------------------------------------------------------
# POST /api/generate
# ---------------------------------------------------------------------------

@pytest.fixture
def started_jobs(monkeypatch):
    """Ersetzt den Hintergrund-Job, damit keine KI-Aufrufe stattfinden."""
    from app.api import routes_generate

    calls = []

    async def fake_run_questions_job(job_id, request_data, user_id):
        calls.append({"job_id": job_id, "request_data": request_data, "user_id": user_id})

    monkeypatch.setattr(routes_generate, "run_questions_job", fake_run_questions_job)
    return calls


def test_generate_without_course_ids_stores_empty_list(
    client, db_session, test_user, auth_headers, request_data, started_jobs
):
    res = client.post("/api/generate", json=request_data, headers=auth_headers(test_user))

    assert res.status_code == 200
    job = db_session.get(Job, res.json()["job_id"])
    assert job.request_data["course_ids"] == []
    assert len(started_jobs) == 1
    assert started_jobs[0]["request_data"]["course_ids"] == []


def test_generate_stores_selected_courses_with_job_inputs(
    client, db_session, test_user, auth_headers, request_data, started_jobs
):
    course_a = _course(db_session, test_user, "Datenbanken 1")
    course_b = _course(db_session, test_user, "Software Engineering")
    db_session.commit()
    body = dict(
        request_data,
        count=25,  # drei Batches
        course_ids=[str(course_a.id), str(course_b.id), str(course_a.id)],
    )

    res = client.post("/api/generate", json=body, headers=auth_headers(test_user))

    assert res.status_code == 200
    expected = [str(course_a.id), str(course_b.id)]
    job = db_session.get(Job, res.json()["job_id"])
    assert job.request_data["course_ids"] == expected
    assert job.request_data["count"] == 25
    assert started_jobs[0]["request_data"]["course_ids"] == expected


@pytest.mark.parametrize("case", ["foreign", "unknown", "own_and_foreign"])
def test_generate_with_invalid_course_starts_no_job(
    client, db_session, user_factory, auth_headers, request_data, started_jobs, case
):
    owner = user_factory()
    other = user_factory()
    own_course = _course(db_session, owner, "Eigene LV")
    foreign_course = _course(db_session, other, "Fremde LV")
    db_session.commit()
    course_ids = {
        "foreign": [str(foreign_course.id)],
        "unknown": [str(uuid4())],
        "own_and_foreign": [str(own_course.id), str(foreign_course.id)],
    }[case]

    res = client.post(
        "/api/generate",
        json=dict(request_data, course_ids=course_ids),
        headers=auth_headers(owner),
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Course not found"
    assert db_session.query(Job).count() == 0
    assert started_jobs == []


@pytest.mark.parametrize("course_ids", [["keine-uuid"], None, "abc"])
def test_generate_rejects_invalid_course_ids(
    client, db_session, test_user, auth_headers, request_data, started_jobs, course_ids
):
    res = client.post(
        "/api/generate",
        json=dict(request_data, course_ids=course_ids),
        headers=auth_headers(test_user),
    )

    assert res.status_code == 422
    assert db_session.query(Job).count() == 0
    assert started_jobs == []
