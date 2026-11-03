import pytest
from uuid import uuid4

from app.core.auth_utils import create_access_token
from app.models.sql_models import Course, GenerationRequest, Question, QuestionCourse


def _auth_headers(user):
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def test_courses_crud(client, test_user):
    headers = _auth_headers(test_user)

    # 1. Leere Liste abfragen
    res = client.get("/api/courses", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    # 2. LV anlegen
    res = client.post("/api/courses", json={"name": "Mathematik 1"}, headers=headers)
    assert res.status_code == 201
    course_a = res.json()
    assert course_a["name"] == "Mathematik 1"
    assert course_a["question_count"] == 0
    course_a_id = course_a["id"]

    # 3. Gleicher Name beim selben Benutzer -> 409 Conflict
    res = client.post("/api/courses", json={"name": "mathematik 1"}, headers=headers)
    assert res.status_code == 409

    # 4. Zweite LV anlegen
    res = client.post("/api/courses", json={"name": "Statistik"}, headers=headers)
    assert res.status_code == 201
    course_b_id = res.json()["id"]

    # 5. Beide auflisten
    res = client.get("/api/courses", headers=headers)
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) == 2

    # 6. Einzelne LV anzeigen
    res = client.get(f"/api/courses/{course_a_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == course_a_id
    assert res.json()["name"] == "Mathematik 1"

    # 7. LV umbenennen via PATCH
    res = client.patch(f"/api/courses/{course_a_id}", json={"name": "Höhere Mathematik 1"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Höhere Mathematik 1"

    # 8. LV umbenennen via PUT
    res = client.put(f"/api/courses/{course_a_id}", json={"name": "Mathematik 1"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Mathematik 1"

    # 9. Umbenennen auf bereits vergebenen Namen -> 409
    res = client.patch(f"/api/courses/{course_a_id}", json={"name": "statistik"}, headers=headers)
    assert res.status_code == 409

    # 10. Ungültiger Name (leer) -> 422
    res = client.patch(f"/api/courses/{course_a_id}", json={"name": "   "}, headers=headers)
    assert res.status_code == 422

    # 11. Löschen
    res = client.delete(f"/api/courses/{course_a_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["course_id"] == course_a_id
    assert res.json()["removed_assignments"] == 0

    # 12. Nach dem Löschen nicht mehr vorhanden
    res = client.get(f"/api/courses/{course_a_id}", headers=headers)
    assert res.status_code == 404


def test_foreign_user_cannot_access_or_modify_course(client, user_factory):
    user1 = user_factory()
    user2 = user_factory()

    headers1 = _auth_headers(user1)
    headers2 = _auth_headers(user2)

    # User 1 legt LV an
    res = client.post("/api/courses", json={"name": "Geheim-Kurs"}, headers=headers1)
    assert res.status_code == 201
    course_id = res.json()["id"]

    # User 2 darf sie weder lesen, noch umbenennen oder löschen (jeweils 404)
    res = client.get(f"/api/courses/{course_id}", headers=headers2)
    assert res.status_code == 404

    res = client.patch(f"/api/courses/{course_id}", json={"name": "Hack"}, headers=headers2)
    assert res.status_code == 404

    res = client.delete(f"/api/courses/{course_id}", headers=headers2)
    assert res.status_code == 404

    # User 2 darf jedoch eine eigene LV mit demselben Namen anlegen
    res = client.post("/api/courses", json={"name": "Geheim-Kurs"}, headers=headers2)
    assert res.status_code == 201


def test_question_assignment_and_delete_preserves_question(
    client, db_session, test_user, test_generation_request
):
    headers = _auth_headers(test_user)

    # LV anlegen
    res = client.post("/api/courses", json={"name": "Physik 1"}, headers=headers)
    assert res.status_code == 201
    course_id = res.json()["id"]

    # Frage in DB anlegen
    q = Question(
        request_id=test_generation_request.id,
        stem="Wie lautet das zweite Newtonsche Gesetz?",
        type="SCQ",
        difficulty="easy",
    )
    db_session.add(q)
    db_session.commit()

    # Frage der LV zuordnen
    res = client.put(
        f"/api/archive/questions/{q.id}/courses",
        json={"course_ids": [course_id]},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["course_ids"] == [course_id]

    # LV löschen
    res = client.delete(f"/api/courses/{course_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["removed_assignments"] == 1

    # Frage existiert noch immer in der DB!
    db_session.expire_all()
    q_stored = db_session.get(Question, q.id)
    assert q_stored is not None
    assert q_stored.stem == "Wie lautet das zweite Newtonsche Gesetz?"

    # Zuordnungen sind entfernt
    assignments = db_session.query(QuestionCourse).filter(QuestionCourse.question_id == q.id).all()
    assert len(assignments) == 0


def test_ticket_acceptance_scenario(
    client, db_session, test_user, test_generation_request
):
    """Konkretes Ergebnis aus dem Ticket:
    Drei eigene Fragen anlegen: zwei mit LV A, eine ohne LV.
    Filter A liefert nur die beiden zugeordneten Fragen;
    der Filter ohne LV nur die dritte.
    Ohne Filter sind alle drei wie bisher erreichbar.
    """
    headers = _auth_headers(test_user)

    # 1. LV A anlegen
    res = client.post("/api/courses", json={"name": "LV A"}, headers=headers)
    assert res.status_code == 201
    course_a_id = res.json()["id"]

    # 2. Drei Fragen in DB erstellen
    q1 = Question(
        request_id=test_generation_request.id,
        stem="Frage 1 zu LV A",
        type="SCQ",
        difficulty="easy",
    )
    q2 = Question(
        request_id=test_generation_request.id,
        stem="Frage 2 zu LV A",
        type="SCQ",
        difficulty="medium",
    )
    q3 = Question(
        request_id=test_generation_request.id,
        stem="Frage 3 ohne LV",
        type="SHORT_ANSWER",
        difficulty="hard",
    )
    db_session.add_all([q1, q2, q3])
    db_session.commit()

    # 3. Zuordnungen setzen: q1 und q2 zu LV A, q3 ohne LV
    res1 = client.put(
        f"/api/archive/questions/{q1.id}/courses",
        json={"course_ids": [course_a_id]},
        headers=headers,
    )
    assert res1.status_code == 200

    res2 = client.put(
        f"/api/archive/questions/{q2.id}/courses",
        json={"course_ids": [course_a_id]},
        headers=headers,
    )
    assert res2.status_code == 200

    # 4. Filter A liefert nur die beiden zugeordneten Fragen
    res_filter_a = client.get(
        f"/api/archive/{test_generation_request.id}/questions?course_id={course_a_id}",
        headers=headers,
    )
    assert res_filter_a.status_code == 200
    questions_a = res_filter_a.json()["questions"]
    assert len(questions_a) == 2
    assert {q["id"] for q in questions_a} == {str(q1.id), str(q2.id)}
    for q in questions_a:
        assert q["course_ids"] == [course_a_id]

    # 5. Filter ohne LV (unassigned=true) liefert nur die dritte Frage
    res_filter_unassigned = client.get(
        f"/api/archive/{test_generation_request.id}/questions?unassigned=true",
        headers=headers,
    )
    assert res_filter_unassigned.status_code == 200
    questions_unassigned = res_filter_unassigned.json()["questions"]
    assert len(questions_unassigned) == 1
    assert questions_unassigned[0]["id"] == str(q3.id)
    assert questions_unassigned[0]["course_ids"] == []

    # 6. Ohne Filter sind alle drei wie bisher erreichbar
    res_no_filter = client.get(
        f"/api/archive/{test_generation_request.id}/questions",
        headers=headers,
    )
    assert res_no_filter.status_code == 200
    all_questions = res_no_filter.json()["questions"]
    assert len(all_questions) == 3
    assert {q["id"] for q in all_questions} == {str(q1.id), str(q2.id), str(q3.id)}

    # 7. Auch themenweise Archivübersicht (/api/archive/topics) testen:
    # Filter LV A: question_count = 2
    res_topics_a = client.get(
        f"/api/archive/topics?course_id={course_a_id}",
        headers=headers,
    )
    assert res_topics_a.status_code == 200
    topics_a = res_topics_a.json()["topics"]
    assert len(topics_a) == 1
    assert topics_a[0]["question_count"] == 2

    # Filter unassigned: question_count = 1
    res_topics_unassigned = client.get(
        "/api/archive/topics?unassigned=true",
        headers=headers,
    )
    assert res_topics_unassigned.status_code == 200
    topics_unassigned = res_topics_unassigned.json()["topics"]
    assert len(topics_unassigned) == 1
    assert topics_unassigned[0]["question_count"] == 1

    # Ohne Filter: question_count = 3
    res_topics_all = client.get(
        "/api/archive/topics",
        headers=headers,
    )
    assert res_topics_all.status_code == 200
    topics_all = res_topics_all.json()["topics"]
    assert len(topics_all) == 1
    assert topics_all[0]["question_count"] == 3


def test_validation_and_ownership_safety(
    client, user_factory, test_generation_request
):
    user1 = user_factory()
    user2 = user_factory()

    headers1 = _auth_headers(user1)
    headers2 = _auth_headers(user2)

    # Widersprüchliche Filter course_id + unassigned=true -> 422
    cid = uuid4()
    res = client.get(f"/api/archive/topics?course_id={cid}&unassigned=true", headers=headers1)
    assert res.status_code == 422

    res = client.get(
        f"/api/archive/{test_generation_request.id}/questions?course_id={cid}&unassigned=true",
        headers=headers1,
    )
    assert res.status_code == 422

    # Filter mit unbekannter course_id -> 404
    res = client.get(f"/api/archive/topics?course_id={cid}", headers=headers1)
    assert res.status_code == 404

    # User 2 legt LV an
    res = client.post("/api/courses", json={"name": "Kurs von User 2"}, headers=headers2)
    assert res.status_code == 201
    user2_cid = res.json()["id"]

    # User 1 versucht mit der LV von User 2 zu filtern -> 404
    res = client.get(f"/api/archive/topics?course_id={user2_cid}", headers=headers1)
    assert res.status_code == 404

    # User 1 versucht seiner Frage die LV von User 2 zuzuordnen -> 404
    q_id = uuid4()
    res = client.put(
        f"/api/archive/questions/{q_id}/courses",
        json={"course_ids": [user2_cid]},
        headers=headers1,
    )
    assert res.status_code == 404
