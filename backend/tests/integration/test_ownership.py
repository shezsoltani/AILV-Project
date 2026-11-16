from uuid import uuid4

import pytest


@pytest.fixture
def scenario(two_users, finalized_archive_factory, job_factory):
    """Benutzer A und B mit unterscheidbaren Archiven; A besitzt zusätzlich einen laufenden Job."""
    owner, intruder = two_users
    owner_archive = finalized_archive_factory(owner["user"], topic="Thema von A")
    intruder_archive = finalized_archive_factory(intruder["user"], topic="Thema von B")
    job = job_factory(owner["user"], status="running")
    return owner, intruder, owner_archive, intruder_archive, job


def _valid_update_payload(question_id):
    return {"questions": [{
        "id": str(question_id),
        "question": "GEHACKT: Wofür steht SQL?",
        "difficulty": "easy",
        "choices": ["Falsch A", "Falsch B"],
        "correct_index": 1,
        "rationale": "Manipuliert.",
    }]}


def test_topic_list_contains_only_own_entries(client, scenario):
    owner, intruder, owner_archive, intruder_archive, _ = scenario

    for account, archive, foreign, topic in (
        (owner, owner_archive, intruder_archive, "Thema von A"),
        (intruder, intruder_archive, owner_archive, "Thema von B"),
    ):
        response = client.get("/api/archive/topics", headers=account["headers"])
        assert response.status_code == 200
        topics = response.json()["topics"]
        assert [t["request_id"] for t in topics] == [str(archive["request_id"])]
        assert [t["topic"] for t in topics] == [topic]
        assert str(foreign["request_id"]) not in response.text


def test_foreign_archive_access_is_forbidden_and_leaves_data_unchanged(client, scenario):
    owner, intruder, archive, _, _ = scenario
    request_id = archive["request_id"]
    questions_url = f"/api/archive/{request_id}/questions"

    before = client.get(questions_url, headers=owner["headers"])
    assert before.status_code == 200

    read = client.get(questions_url, headers=intruder["headers"])
    assert read.status_code == 403
    assert "Wofür steht SQL?" not in read.text
    assert "Thema von A" not in read.text

    update = client.put(
        questions_url,
        json=_valid_update_payload(archive["question_ids"][0]),
        headers=intruder["headers"],
    )
    assert update.status_code == 403
    assert "Wofür steht SQL?" not in update.text

    delete = client.delete(f"/api/archive/{request_id}", headers=intruder["headers"])
    assert delete.status_code == 403

    after = client.get(questions_url, headers=owner["headers"])
    assert after.status_code == 200
    assert after.json() == before.json()
    topics = client.get("/api/archive/topics", headers=owner["headers"]).json()["topics"]
    assert [t["request_id"] for t in topics] == [str(request_id)]


def test_foreign_job_access_is_forbidden_and_leaves_job_unchanged(client, scenario):
    owner, intruder, _, _, job = scenario
    url = f"/api/jobs/{job.id}"

    before = client.get(url, headers=owner["headers"])
    assert before.status_code == 200
    assert before.json()["status"] == "running"

    read = client.get(url, headers=intruder["headers"])
    assert read.status_code == 403
    assert "result_data" not in read.json()

    cancel = client.delete(url, headers=intruder["headers"])
    assert cancel.status_code == 403
    assert "status" not in cancel.json()

    after = client.get(url, headers=owner["headers"])
    assert after.status_code == 200
    assert after.json() == before.json()
    assert after.json()["status"] == "running"


def test_missing_record_returns_404_and_owner_data_stays_readable(client, scenario):
    owner, _, archive, _, job = scenario

    missing_archive = client.get(f"/api/archive/{uuid4()}/questions", headers=owner["headers"])
    assert missing_archive.status_code == 404
    missing_job = client.get(f"/api/jobs/{uuid4()}", headers=owner["headers"])
    assert missing_job.status_code == 404

    assert client.get(
        f"/api/archive/{archive['request_id']}/questions", headers=owner["headers"],
    ).status_code == 200
    assert client.get(f"/api/jobs/{job.id}", headers=owner["headers"]).status_code == 200
