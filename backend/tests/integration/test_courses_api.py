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


def test_two_users_cross_access_and_ownership_protection(client, two_users_dataset):
    """SCRUM-34: Tests mit zwei Benutzern (Benutzer A und Benutzer B) prüfen,
    dass fremde LVs und fremde Fragen geschützt sind (kein Zugriff / 404 / 403).
    Ein Versuch, eine eigene Frage einer fremden LV zuzuordnen, wird abgewiesen.
    """
    ds = two_users_dataset
    headers_a = _auth_headers(ds.user_a)
    headers_b = _auth_headers(ds.user_b)

    # 1. Listen-Isolation: Benutzer A sieht nur LVs von A, Benutzer B nur von B
    res_a = client.get("/api/courses", headers=headers_a)
    assert res_a.status_code == 200
    a_course_ids = {c["id"] for c in res_a.json()}
    assert a_course_ids == {str(ds.course_a1.id), str(ds.course_a2.id)}

    res_b = client.get("/api/courses", headers=headers_b)
    assert res_b.status_code == 200
    b_course_ids = {c["id"] for c in res_b.json()}
    assert b_course_ids == {str(ds.course_b1.id)}

    # 2. Fremdzugriff auf fremde LV (Lesen, Ändern, Löschen) schlägt mit 404 fehl
    # Benutzer B versucht LV A1 von Benutzer A abzurufen / zu ändern / zu löschen
    assert client.get(f"/api/courses/{ds.course_a1.id}", headers=headers_b).status_code == 404
    assert client.patch(f"/api/courses/{ds.course_a1.id}", json={"name": "Hack"}, headers=headers_b).status_code == 404
    assert client.put(f"/api/courses/{ds.course_a1.id}", json={"name": "Hack"}, headers=headers_b).status_code == 404
    assert client.delete(f"/api/courses/{ds.course_a1.id}", headers=headers_b).status_code == 404

    # Umgekehrt: Benutzer A versucht LV B1 von Benutzer B abzurufen / zu ändern / zu löschen
    assert client.get(f"/api/courses/{ds.course_b1.id}", headers=headers_a).status_code == 404
    assert client.patch(f"/api/courses/{ds.course_b1.id}", json={"name": "Hack"}, headers=headers_a).status_code == 404
    assert client.delete(f"/api/courses/{ds.course_b1.id}", headers=headers_a).status_code == 404

    # 3. Zuordnungs-Schutz:
    # a) Benutzer B versucht, seine EIGENE Frage der fremden LV von A zuzuordnen -> 404
    res_assign_foreign_course = client.put(
        f"/api/archive/questions/{ds.q_b1.id}/courses",
        json={"course_ids": [str(ds.course_a1.id)]},
        headers=headers_b,
    )
    assert res_assign_foreign_course.status_code == 404

    # b) Benutzer B versucht, eine FREMDE Frage von A seiner eigenen LV zuzuordnen -> 404
    res_assign_foreign_question = client.put(
        f"/api/archive/questions/{ds.q_a1.id}/courses",
        json={"course_ids": [str(ds.course_b1.id)]},
        headers=headers_b,
    )
    assert res_assign_foreign_question.status_code == 404

    # c) Benutzer B versucht, eine FREMDE Frage von A einer fremden LV von A zuzuordnen -> 404
    res_assign_both_foreign = client.put(
        f"/api/archive/questions/{ds.q_a1.id}/courses",
        json={"course_ids": [str(ds.course_a1.id)]},
        headers=headers_b,
    )
    assert res_assign_both_foreign.status_code == 404

    # 4. Filter-Schutz:
    # Benutzer B versucht, sein Archiv mit fremder course_id von A zu filtern -> 404
    res_filter_topics_foreign = client.get(
        f"/api/archive/topics?course_id={ds.course_a1.id}",
        headers=headers_b,
    )
    assert res_filter_topics_foreign.status_code == 404

    res_filter_questions_foreign = client.get(
        f"/api/archive/{ds.req_b.id}/questions?course_id={ds.course_a1.id}",
        headers=headers_b,
    )
    assert res_filter_questions_foreign.status_code == 404

    # 5. Archiv-Themen-Schutz:
    # Benutzer B sieht in GET /api/archive/topics ausschließlich eigene Themen
    res_topics_b = client.get("/api/archive/topics", headers=headers_b)
    assert res_topics_b.status_code == 200
    topic_ids_b = [t["request_id"] for t in res_topics_b.json()["topics"]]
    assert topic_ids_b == [str(ds.req_b.id)]

    # Benutzer B versucht, Fragen des Themas von A abzurufen -> 403 Forbidden
    res_req_a_by_b = client.get(
        f"/api/archive/{ds.req_a.id}/questions",
        headers=headers_b,
    )
    assert res_req_a_by_b.status_code == 403

    # Benutzer B versucht, Thema von A zu löschen -> 403 Forbidden
    res_del_req_a_by_b = client.delete(
        f"/api/archive/{ds.req_a.id}",
        headers=headers_b,
    )
    assert res_del_req_a_by_b.status_code == 403

    # 6. Unabhängige Namensgebung:
    # Benutzer B darf eine eigene LV mit demselben Namen wie A anlegen ("Mathematik 1")
    res_create_same_name = client.post(
        "/api/courses",
        json={"name": "Mathematik 1"},
        headers=headers_b,
    )
    assert res_create_same_name.status_code == 201
    assert res_create_same_name.json()["name"] == "Mathematik 1"
    assert res_create_same_name.json()["id"] != str(ds.course_a1.id)


def test_two_users_filters_and_grouping(client, two_users_dataset):
    """SCRUM-34: Prüft alle Filterkombinationen mit zwei getrennten Benutzern:
    - bestimmte LV
    - ohne LV (unassigned=true)
    - keine Treffer
    - kein Filter
    - Gruppierung nach Request (topics) und Detailabfrage (questions).
    """
    ds = two_users_dataset
    headers_a = _auth_headers(ds.user_a)
    headers_b = _auth_headers(ds.user_b)

    # --- BENUTZER A ---
    # a) Filter nach LV A1 ("Mathematik 1"): q_a1 und q_a2 sind zugeordnet
    res_a_c1 = client.get(
        f"/api/archive/{ds.req_a.id}/questions?course_id={ds.course_a1.id}",
        headers=headers_a,
    )
    assert res_a_c1.status_code == 200
    questions_a_c1 = res_a_c1.json()["questions"]
    assert len(questions_a_c1) == 2
    assert {q["id"] for q in questions_a_c1} == {str(ds.q_a1.id), str(ds.q_a2.id)}

    # Themenübersicht mit Filter LV A1: question_count muss 2 sein
    res_topics_a_c1 = client.get(
        f"/api/archive/topics?course_id={ds.course_a1.id}",
        headers=headers_a,
    )
    assert res_topics_a_c1.status_code == 200
    topics_a_c1 = res_topics_a_c1.json()["topics"]
    assert len(topics_a_c1) == 1
    assert topics_a_c1[0]["question_count"] == 2

    # b) Filter nach LV A2 ("Statistik"): nur q_a2 ist zugeordnet
    res_a_c2 = client.get(
        f"/api/archive/{ds.req_a.id}/questions?course_id={ds.course_a2.id}",
        headers=headers_a,
    )
    assert res_a_c2.status_code == 200
    questions_a_c2 = res_a_c2.json()["questions"]
    assert len(questions_a_c2) == 1
    assert questions_a_c2[0]["id"] == str(ds.q_a2.id)
    # q_a2 hat beide LVs im course_ids-Feld
    assert set(questions_a_c2[0]["course_ids"]) == {str(ds.course_a1.id), str(ds.course_a2.id)}

    # Themenübersicht mit Filter LV A2: question_count muss 1 sein
    res_topics_a_c2 = client.get(
        f"/api/archive/topics?course_id={ds.course_a2.id}",
        headers=headers_a,
    )
    assert res_topics_a_c2.status_code == 200
    topics_a_c2 = res_topics_a_c2.json()["topics"]
    assert len(topics_a_c2) == 1
    assert topics_a_c2[0]["question_count"] == 1

    # c) Filter ohne LV (unassigned=true): nur q_a_unassigned
    res_a_unassigned = client.get(
        f"/api/archive/{ds.req_a.id}/questions?unassigned=true",
        headers=headers_a,
    )
    assert res_a_unassigned.status_code == 200
    questions_a_unassigned = res_a_unassigned.json()["questions"]
    assert len(questions_a_unassigned) == 1
    assert questions_a_unassigned[0]["id"] == str(ds.q_a_unassigned.id)
    assert questions_a_unassigned[0]["course_ids"] == []

    # Themenübersicht mit unassigned=true: question_count muss 1 sein
    res_topics_a_unassigned = client.get(
        "/api/archive/topics?unassigned=true",
        headers=headers_a,
    )
    assert res_topics_a_unassigned.status_code == 200
    topics_a_unassigned = res_topics_a_unassigned.json()["topics"]
    assert len(topics_a_unassigned) == 1
    assert topics_a_unassigned[0]["question_count"] == 1

    # d) Filter mit neu angelegter LV ohne Fragen (keine Treffer)
    res_new_course = client.post("/api/courses", json={"name": "Leere LV"}, headers=headers_a)
    assert res_new_course.status_code == 201
    empty_cid = res_new_course.json()["id"]

    # Detailabfrage liefert 200 OK mit leerer Fragenliste
    res_a_empty = client.get(
        f"/api/archive/{ds.req_a.id}/questions?course_id={empty_cid}",
        headers=headers_a,
    )
    assert res_a_empty.status_code == 200
    assert res_a_empty.json()["questions"] == []

    # Themenübersicht liefert 200 OK mit leerer Themenliste (nur Themen mit passenden Fragen)
    res_topics_empty = client.get(
        f"/api/archive/topics?course_id={empty_cid}",
        headers=headers_a,
    )
    assert res_topics_empty.status_code == 200
    assert res_topics_empty.json()["topics"] == []

    # e) Kein Filter: liefert alle 3 Fragen wie bisher (Rückwärtskompatibilität)
    res_a_all = client.get(
        f"/api/archive/{ds.req_a.id}/questions",
        headers=headers_a,
    )
    assert res_a_all.status_code == 200
    all_q_a = res_a_all.json()["questions"]
    assert len(all_q_a) == 3
    assert {q["id"] for q in all_q_a} == {str(ds.q_a1.id), str(ds.q_a2.id), str(ds.q_a_unassigned.id)}

    res_topics_a_all = client.get("/api/archive/topics", headers=headers_a)
    assert res_topics_a_all.status_code == 200
    topics_a_all = res_topics_a_all.json()["topics"]
    assert len(topics_a_all) == 1
    assert topics_a_all[0]["question_count"] == 3

    # --- BENUTZER B ---
    # a) Filter nach LV B1: liefert q_b1
    res_b_c1 = client.get(
        f"/api/archive/{ds.req_b.id}/questions?course_id={ds.course_b1.id}",
        headers=headers_b,
    )
    assert res_b_c1.status_code == 200
    assert len(res_b_c1.json()["questions"]) == 1
    assert res_b_c1.json()["questions"][0]["id"] == str(ds.q_b1.id)

    # b) Filter unassigned: liefert q_b_unassigned
    res_b_unassigned = client.get(
        f"/api/archive/{ds.req_b.id}/questions?unassigned=true",
        headers=headers_b,
    )
    assert res_b_unassigned.status_code == 200
    assert len(res_b_unassigned.json()["questions"]) == 1
    assert res_b_unassigned.json()["questions"][0]["id"] == str(ds.q_b_unassigned.id)

    # c) Kein Filter: liefert beide Fragen (2)
    res_b_all = client.get(
        f"/api/archive/{ds.req_b.id}/questions",
        headers=headers_b,
    )
    assert res_b_all.status_code == 200
    assert len(res_b_all.json()["questions"]) == 2


def test_course_lifecycle_and_assignment_modifications(
    client, test_user, test_generation_request, db_session
):
    """SCRUM-34: Anlegen, Umbenennen und Löschen einer LV sowie Setzen und Entfernen
    einer Zuordnung testen. Nach jedem Schritt gespeicherte Daten und API-Antwort vergleichen.
    Nachweis: Das Löschen einer LV verändert die Anzahl der Fragen nicht.
    """
    headers = _auth_headers(test_user)

    # 1. LV anlegen
    res_create = client.post("/api/courses", json={"name": "Betriebssysteme"}, headers=headers)
    assert res_create.status_code == 201
    course_data = res_create.json()
    assert course_data["name"] == "Betriebssysteme"
    assert course_data["question_count"] == 0
    c_id = course_data["id"]

    # In DB verifizieren
    c_db = db_session.get(Course, c_id)
    assert c_db is not None
    assert c_db.name == "Betriebssysteme"
    assert c_db.user_id == test_user.id

    # 2. LV umbenennen via PATCH
    res_patch = client.patch(f"/api/courses/{c_id}", json={"name": "Betriebssysteme 1"}, headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Betriebssysteme 1"

    # In DB verifizieren
    db_session.expire(c_db)
    assert c_db.name == "Betriebssysteme 1"

    # 3. Zwei Fragen anlegen
    q1 = Question(request_id=test_generation_request.id, stem="Was ist ein Thread?", type="SCQ")
    q2 = Question(request_id=test_generation_request.id, stem="Was ist ein Deadlock?", type="SCQ")
    db_session.add_all([q1, q2])
    db_session.commit()

    # Vor Zuordnung: beide questions in DB, 0 in question_courses
    assert db_session.query(QuestionCourse).count() == 0
    assert db_session.query(Question).filter(Question.request_id == test_generation_request.id).count() == 2

    # 4. Zuordnung setzen: q1 der LV zuordnen
    res_assign = client.put(
        f"/api/archive/questions/{q1.id}/courses",
        json={"course_ids": [c_id]},
        headers=headers,
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["course_ids"] == [c_id]

    # In DB verifizieren: 1 Zeile in question_courses
    assignments_q1 = db_session.query(QuestionCourse).filter(QuestionCourse.question_id == q1.id).all()
    assert len(assignments_q1) == 1
    assert str(assignments_q1[0].course_id) == c_id

    # course question_count in GET /api/courses/{c_id} prüfen: muss 1 sein
    res_get_c = client.get(f"/api/courses/{c_id}", headers=headers)
    assert res_get_c.status_code == 200
    assert res_get_c.json()["question_count"] == 1

    # 5. Zweite LV anlegen und Mehrfachzuordnung für q1 setzen
    res_c2 = client.post("/api/courses", json={"name": "Rechnerarchitektur"}, headers=headers)
    assert res_c2.status_code == 201
    c2_id = res_c2.json()["id"]

    res_assign_multi = client.put(
        f"/api/archive/questions/{q1.id}/courses",
        json={"course_ids": [c_id, c2_id]},
        headers=headers,
    )
    assert res_assign_multi.status_code == 200
    assert set(res_assign_multi.json()["course_ids"]) == {c_id, c2_id}

    # In DB verifizieren: 2 Zeilen in question_courses für q1
    assert db_session.query(QuestionCourse).filter(QuestionCourse.question_id == q1.id).count() == 2

    # q2 ebenfalls c2 zuordnen
    res_assign_q2 = client.put(
        f"/api/archive/questions/{q2.id}/courses",
        json={"course_ids": [c2_id]},
        headers=headers,
    )
    assert res_assign_q2.status_code == 200

    # 6. Zuordnung entfernen: q1 auf leere Liste [] setzen
    res_unassign = client.put(
        f"/api/archive/questions/{q1.id}/courses",
        json={"course_ids": []},
        headers=headers,
    )
    assert res_unassign.status_code == 200
    assert res_unassign.json()["course_ids"] == []

    # In DB verifizieren: keine Zeilen mehr in question_courses für q1
    assert db_session.query(QuestionCourse).filter(QuestionCourse.question_id == q1.id).count() == 0
    # ABER q1 existiert noch immer unverändert in questions!
    db_session.expire_all()
    assert db_session.get(Question, q1.id) is not None
    assert db_session.get(Question, q1.id).stem == "Was ist ein Thread?"

    # 7. q1 wieder c_id zuordnen
    client.put(
        f"/api/archive/questions/{q1.id}/courses",
        json={"course_ids": [c_id]},
        headers=headers,
    )

    total_questions_before_delete = db_session.query(Question).filter(
        Question.request_id == test_generation_request.id
    ).count()
    assert total_questions_before_delete == 2

    # 8. LV löschen (c_id)
    res_delete = client.delete(f"/api/courses/{c_id}", headers=headers)
    assert res_delete.status_code == 200
    assert res_delete.json()["success"] is True
    assert res_delete.json()["removed_assignments"] == 1

    # In DB verifizieren:
    # a) LV c_id existiert nicht mehr
    db_session.expire_all()
    assert db_session.get(Course, c_id) is None

    # b) Zuordnungen zu c_id sind gelöscht
    assert db_session.query(QuestionCourse).filter(QuestionCourse.course_id == c_id).count() == 0

    # c) Zuordnung von q2 zu c2_id existiert weiterhin!
    assert db_session.query(QuestionCourse).filter(QuestionCourse.question_id == q2.id).count() == 1

    # d) ENTSCHEIDEND: Anzahl der Fragen ist völlig unverändert (2)!
    total_questions_after_delete = db_session.query(Question).filter(
        Question.request_id == test_generation_request.id
    ).count()
    assert total_questions_after_delete == total_questions_before_delete
    assert db_session.get(Question, q1.id) is not None
    assert db_session.get(Question, q2.id) is not None


def test_legacy_migration_and_backward_compatibility(
    client, user_factory, db_session
):
    """SCRUM-34: Migration und bisherige Fragenabfrage funktionieren mit vorhandenen Testdaten.
    Rückwärtskompatibilität ohne Filter.
    Bestehende Fragen (ohne Zuordnung) bleiben erhalten, Request-IDs bleiben erhalten.
    Eine verwendete LV löschen und nachweisen, dass die Fragen weiterhin vorhanden sind.
    """
    user = user_factory()
    headers = _auth_headers(user)

    # 1. Testdatenbestand im Zustand vor Einführung der LVs erstellen:
    # 2 GenerationRequests mit je 2 Fragen, ohne jegliche Einträge in courses oder question_courses.
    req1 = GenerationRequest(
        user_id=user.id,
        topic="Legacy Thema 1",
        language="de",
        count=2,
        types=["SCQ"],
    )
    req2 = GenerationRequest(
        user_id=user.id,
        topic="Legacy Thema 2",
        language="de",
        count=2,
        types=["SCQ"],
    )
    db_session.add_all([req1, req2])
    db_session.flush()

    q1_1 = Question(request_id=req1.id, stem="Alte Frage 1_1", type="SCQ")
    q1_2 = Question(request_id=req1.id, stem="Alte Frage 1_2", type="SCQ")
    q2_1 = Question(request_id=req2.id, stem="Alte Frage 2_1", type="SCQ")
    q2_2 = Question(request_id=req2.id, stem="Alte Frage 2_2", type="SCQ")
    db_session.add_all([q1_1, q1_2, q2_1, q2_2])
    db_session.commit()

    # Ausgangszustand merken:
    saved_ids = {str(q.id) for q in [q1_1, q1_2, q2_1, q2_2]}
    saved_request_ids = {str(req1.id), str(req2.id)}

    # 2. Bisherige Themenabfrage ohne Filter (GET /api/archive/topics)
    res_topics = client.get("/api/archive/topics", headers=headers)
    assert res_topics.status_code == 200
    topics = res_topics.json()["topics"]
    assert len(topics) == 2
    assert {t["request_id"] for t in topics} == saved_request_ids
    for t in topics:
        assert t["question_count"] == 2

    # 3. Bisherige Fragenabfrage ohne Filter (GET /api/archive/{request_id}/questions)
    res_q1 = client.get(f"/api/archive/{req1.id}/questions", headers=headers)
    assert res_q1.status_code == 200
    questions_1 = res_q1.json()["questions"]
    assert len(questions_1) == 2
    for q in questions_1:
        assert q["id"] in saved_ids
        # Rückwärtskompatibles Feld: course_ids ist leere Liste
        assert q["course_ids"] == []

    # 4. Filter "ohne LV" liefert alle bisherigen Daten (da keine LVs zugewiesen)
    res_topics_unassigned = client.get("/api/archive/topics?unassigned=true", headers=headers)
    assert res_topics_unassigned.status_code == 200
    assert len(res_topics_unassigned.json()["topics"]) == 2

    res_q1_unassigned = client.get(
        f"/api/archive/{req1.id}/questions?unassigned=true",
        headers=headers,
    )
    assert res_q1_unassigned.status_code == 200
    assert len(res_q1_unassigned.json()["questions"]) == 2

    # 5. Jetzt eine LV erstellen und einer alten Frage zuweisen
    res_course = client.post("/api/courses", json={"name": "Neue LV für alte Frage"}, headers=headers)
    assert res_course.status_code == 201
    course_id = res_course.json()["id"]

    res_assign = client.put(
        f"/api/archive/questions/{q1_1.id}/courses",
        json={"course_ids": [course_id]},
        headers=headers,
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["course_ids"] == [course_id]

    # Filter unassigned auf req1 liefert jetzt nur noch die verbleibende 1 Frage
    res_q1_unassigned_after = client.get(
        f"/api/archive/{req1.id}/questions?unassigned=true",
        headers=headers,
    )
    assert len(res_q1_unassigned_after.json()["questions"]) == 1
    assert res_q1_unassigned_after.json()["questions"][0]["id"] == str(q1_2.id)

    # 6. LV löschen und nachweisen, dass alle alten Fragen und Request-IDs erhalten bleiben
    res_delete_course = client.delete(f"/api/courses/{course_id}", headers=headers)
    assert res_delete_course.status_code == 200
    assert res_delete_course.json()["removed_assignments"] == 1

    # Nachweis der Unversehrtheit:
    db_session.expire_all()
    questions_in_db = db_session.query(Question).filter(
        Question.request_id.in_([req1.id, req2.id])
    ).all()
    assert len(questions_in_db) == 4
    assert {str(q.id) for q in questions_in_db} == saved_ids
    assert {str(q.request_id) for q in questions_in_db} == saved_request_ids

    # Ungefilterte Abfrage verhält sich exakt wie zu Beginn
    res_topics_final = client.get("/api/archive/topics", headers=headers)
    assert res_topics_final.status_code == 200
    assert len(res_topics_final.json()["topics"]) == 2
