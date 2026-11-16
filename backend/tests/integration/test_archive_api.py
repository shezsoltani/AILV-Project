from uuid import UUID

import pytest

from app.models.sql_models import GenerationRequest, Question


@pytest.fixture
def archive(client, two_users, finalized_archive_factory):
    owner = two_users[0]
    data = finalized_archive_factory(owner["user"], topic="Archivtest", question_count=2)
    assert len(data["question_ids"]) == 2
    return owner, data


def _update(question_id, **overrides):
    payload = {
        "id": str(question_id),
        "question": "Was ist PostgreSQL?",
        "difficulty": "medium",
        "choices": ["Ein relationales DBMS", "Ein Texteditor", "Ein Browser"],
        "correct_index": 0,
        "rationale": "PostgreSQL ist ein relationales Datenbanksystem.",
    }
    payload.update(overrides)
    return payload


def _load(client, owner, request_id):
    response = client.get(f"/api/archive/{request_id}/questions", headers=owner["headers"])
    assert response.status_code == 200
    return {q["id"]: q for q in response.json()["questions"]}


def _stored(db_session, question_id):
    """Separate Leseoperation direkt aus PostgreSQL, ohne Session-Cache."""
    db_session.expire_all()
    return db_session.get(Question, question_id)


def test_valid_update_is_visible_and_persisted(client, db_session, archive):
    owner, data = archive
    request_id, (first_id, second_id) = data["request_id"], data["question_ids"]
    before = _load(client, owner, request_id)
    assert set(before) == {str(first_id), str(second_id)}

    response = client.put(
        f"/api/archive/{request_id}/questions",
        json={"questions": [_update(first_id)]},
        headers=owner["headers"],
    )
    assert response.status_code == 200

    after = _load(client, owner, request_id)
    assert after[str(first_id)]["question"] == "Was ist PostgreSQL?"
    assert after[str(first_id)]["difficulty"] == "medium"
    assert after[str(first_id)]["choices"][0] == "Ein relationales DBMS"
    assert after[str(second_id)] == before[str(second_id)]

    stored = _stored(db_session, first_id)
    assert stored.stem == "Was ist PostgreSQL?"
    assert stored.difficulty == "medium"
    assert stored.choices == ["Ein relationales DBMS", "Ein Texteditor", "Ein Browser"]
    assert stored.correct_index == 0
    assert _stored(db_session, second_id).stem == before[str(second_id)]["question"]


def test_invalid_update_rejects_whole_request_without_partial_save(client, db_session, archive):
    owner, data = archive
    request_id, (first_id, second_id) = data["request_id"], data["question_ids"]
    before = _load(client, owner, request_id)

    response = client.put(
        f"/api/archive/{request_id}/questions",
        json={"questions": [
            _update(first_id),
            _update(second_id, correct_index=5),  # außerhalb von 3 Antworten
        ]},
        headers=owner["headers"],
    )
    assert response.status_code == 400
    assert "out of bounds" in response.json()["detail"]

    assert _load(client, owner, request_id) == before
    assert _stored(db_session, first_id).stem != "Was ist PostgreSQL?"
    assert _stored(db_session, second_id).correct_index == 0


def test_deleted_archive_disappears_from_topics_and_detail(client, db_session, archive):
    owner, data = archive
    request_id = data["request_id"]
    topics_url = "/api/archive/topics"
    topics = client.get(topics_url, headers=owner["headers"]).json()["topics"]
    assert [t["request_id"] for t in topics] == [str(request_id)]
    assert topics[0]["question_count"] == 2

    response = client.delete(f"/api/archive/{request_id}", headers=owner["headers"])
    assert response.status_code == 200
    assert response.json()["success"] is True

    assert client.get(topics_url, headers=owner["headers"]).json()["topics"] == []
    detail = client.get(f"/api/archive/{request_id}/questions", headers=owner["headers"])
    assert detail.status_code == 404

    db_session.expire_all()
    assert db_session.get(GenerationRequest, UUID(str(request_id))) is None
    for question_id in data["question_ids"]:
        assert db_session.get(Question, question_id) is None
