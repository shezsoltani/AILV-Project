from uuid import UUID, uuid4

from app.models.sql_models import Job
from app.persistence import job_repository
from app.services.job_runner import run_questions_job

CANCEL_MESSAGE = "Generierung wurde vom Nutzer abgebrochen."
CANCEL_LABEL = "Generierung abgebrochen"


def _stored(db_session, job_id) -> Job:
    """Frisch aus PostgreSQL lesen, ohne Session-Cache."""
    db_session.expire_all()
    return db_session.get(Job, job_id)


def _body_from_stored(job: Job) -> dict:
    return {
        "job_id": str(job.id),
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "batch_current": job.batch_current,
        "batch_total": job.batch_total,
        "batch_retrying": job.batch_retrying,
        "stage_label": job.stage_label,
        "result_data": job.result_data,
        "error_message": job.error_message,
    }


def test_get_returns_actually_stored_job_state(client, db_session, two_users, job_factory):
    owner, _ = two_users
    job = job_factory(owner["user"], status="completed")
    result = {"request_id": str(uuid4()), "questions": [{"stem": "Wofür steht SQL?"}]}
    job_repository.update_job(
        db_session, job.id, progress=100, batch_current=2, batch_total=3,
        stage_label="Abgeschlossen", result_data=result,
    )
    job_id = job.id

    response = client.get(f"/api/jobs/{job_id}", headers=owner["headers"])

    assert response.status_code == 200
    body = response.json()
    stored = _stored(db_session, job_id)
    assert body == _body_from_stored(stored)
    assert body["status"] == "completed"
    assert body["progress"] == 100
    assert body["batch_current"] == 2
    assert body["batch_total"] == 3
    assert body["stage_label"] == "Abgeschlossen"
    assert body["result_data"] == result
    assert body["error_message"] is None


def test_get_unknown_job_returns_404_and_foreign_job_403(client, two_users, job_factory):
    owner, other = two_users
    job = job_factory(owner["user"], status="running")

    assert client.get(f"/api/jobs/{uuid4()}", headers=owner["headers"]).status_code == 404
    assert client.get(f"/api/jobs/{job.id}", headers=other["headers"]).status_code == 403


def test_cancel_running_job_is_persisted_as_failed_with_cancel_message(
    client, db_session, two_users, job_factory
):
    owner, _ = two_users
    job = job_factory(owner["user"], status="running")
    job_repository.update_job(db_session, job.id, progress=40, stage_label="Fragen werden erstellt")
    job_id = job.id

    response = client.delete(f"/api/jobs/{job_id}", headers=owner["headers"])

    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    assert response.json()["error_message"] == CANCEL_MESSAGE

    stored = _stored(db_session, job_id)
    assert stored.status == "failed"
    assert stored.error_message == CANCEL_MESSAGE
    assert stored.stage_label == CANCEL_LABEL
    assert stored.progress == 40
    assert stored.result_data is None

    again = client.get(f"/api/jobs/{job_id}", headers=owner["headers"])
    assert again.status_code == 200
    assert again.json() == _body_from_stored(stored)
    assert again.json()["status"] == "failed"
    assert again.json()["error_message"] == CANCEL_MESSAGE


def test_cancel_completed_job_keeps_status_and_result_data(
    client, db_session, two_users, job_factory
):
    owner, _ = two_users
    job = job_factory(owner["user"], status="completed")
    result = {"request_id": str(uuid4()), "questions": [{"stem": "Wofür steht SQL?"}]}
    job_repository.update_job(
        db_session, job.id, progress=100, stage_label="Abgeschlossen", result_data=result
    )
    job_id = job.id
    before = _body_from_stored(_stored(db_session, job_id))

    response = client.delete(f"/api/jobs/{job_id}", headers=owner["headers"])

    assert response.status_code == 200
    assert response.json() == before
    stored = _stored(db_session, job_id)
    assert stored.status == "completed"
    assert stored.result_data == result
    assert stored.error_message is None
    assert stored.stage_label == "Abgeschlossen"

    after = client.get(f"/api/jobs/{job_id}", headers=owner["headers"])
    assert after.json() == before


def test_cancel_foreign_job_is_forbidden_and_leaves_job_untouched(
    client, db_session, two_users, job_factory
):
    owner, other = two_users
    job = job_factory(owner["user"], status="running")
    job_id = job.id

    response = client.delete(f"/api/jobs/{job_id}", headers=other["headers"])

    assert response.status_code == 403
    stored = _stored(db_session, job_id)
    assert stored.status == "running"
    assert stored.error_message is None


async def test_batch_runner_error_marks_job_failed_via_api(
    client, db_session, db_session_factory, two_users, job_factory, request_data
):
    owner, _ = two_users
    job = job_factory(owner["user"], status="pending", job_type="questions")
    job_id, user_id = job.id, owner["user"].id
    # Request-Session schließen, bevor der Runner seine eigene Session öffnet.
    db_session.close()

    async def failing_batch_runner(**kwargs):
        raise RuntimeError("Batch Runner ist ausgefallen")

    await run_questions_job(
        job_id,
        dict(request_data),
        user_id,
        session_factory=db_session_factory,
        question_batch_runner=failing_batch_runner,
    )

    response = client.get(f"/api/jobs/{job_id}", headers=owner["headers"])

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["status"] != "running"
    assert body["error_message"] == "Batch Runner ist ausgefallen"
    assert body["result_data"] is None
    assert UUID(body["job_id"]) == job_id

    stored = _stored(db_session, job_id)
    assert stored.status == "failed"
    assert stored.error_message == "Batch Runner ist ausgefallen"
