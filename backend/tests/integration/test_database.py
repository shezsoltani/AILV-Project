import pytest
from sqlalchemy import select, text

from app.models.sql_models import Job, User
from conftest import _isolated_session, _isolated_session_factory


@pytest.mark.parametrize("iteration", [1, 2])
def test_database_writes_are_isolated_between_tests(db_session, iteration):
    assert db_session.scalar(select(User).where(User.username == "isolation_probe")) is None
    user = User(
        username="isolation_probe",
        email="isolation@example.invalid",
        password_hash="test-only-not-a-real-password",
    )
    db_session.add(user)
    db_session.commit()
    db_session.expire_all()
    stored = db_session.scalar(select(User).where(User.username == "isolation_probe"))
    assert stored.id == user.id
    assert stored.email == "isolation@example.invalid"


def test_commit_and_rollback_do_not_leak_into_the_next_session(db_connection):
    # Explicitly exercise the same lifecycle as db_session, without relying on
    # pytest test ordering (and still meaningful when running this test alone).
    with _isolated_session(db_connection) as first:
        first.add(Job(job_type="rolled-back"))
        first.flush()
        first.rollback()
        first.add(Job(job_type="committed"))
        first.commit()
        first.add(Job(job_type="committed-again"))
        first.commit()
        assert len(first.scalars(select(Job)).all()) == 2
    with _isolated_session(db_connection) as second:
        assert second.scalars(select(Job)).all() == []


def test_postgresql_jsonb_round_trip_and_contains(db_session):
    payload = {"topic": "Datenbanken", "types": ["multiple_choice"], "count": 2}
    job = Job(job_type="jsonb_probe", request_data=payload)
    db_session.add(job)
    db_session.commit()
    db_session.expire_all()

    stored = db_session.scalar(
        select(Job).where(Job.request_data.contains({"types": ["multiple_choice"]}))
    )
    assert stored.id == job.id
    assert stored.request_data == payload
    assert db_session.scalar(text("SELECT pg_typeof(request_data)::text FROM jobs")) == "jsonb"


def test_connection_uses_only_private_schema(db_session, test_database_url):
    assert db_session.scalar(text("SELECT current_database()")) == test_database_url.database
    assert db_session.scalar(text("SELECT current_schema()")).startswith("pytest_")
    assert "public" not in db_session.scalar(text("SHOW search_path"))


@pytest.mark.parametrize("iteration", [1, 2])
async def test_job_uses_separate_session_on_test_connection(
    app, db_session, db_session_factory, test_user, test_generation_request,
    request_data, monkeypatch, iteration,
):
    # app installs test configuration before importing the real job runner.
    from app.persistence.job_repository import create_job
    from app.services.job_runner import run_questions_job

    assert db_session.scalars(select(Job)).all() == []
    owner_id = test_user.id
    request_id = test_generation_request.id
    job = create_job(db_session, owner_id, "questions", request_data)
    job_id = job.id
    connection = db_session.get_bind()
    # Repository refresh() starts another transaction after commit(). End it
    # before the job owns the connection; close() preserves committed writes.
    db_session.close()
    job_sessions = []
    closed = []

    def session_factory():
        session = db_session_factory()
        job_sessions.append(session)
        original_close = session.close

        def close():
            original_close()
            closed.append(session)

        monkeypatch.setattr(session, "close", close)
        return session

    async def batch_runner(*, db, user_id, on_progress, **kwargs):
        assert db is not db_session
        assert db.get_bind() is connection
        stored = db.get(Job, job_id)
        assert stored.user_id == user_id == owner_id
        assert stored.status == "running"
        on_progress(50, "Testfortschritt")
        return [], request_id

    await run_questions_job(
        job_id, request_data, owner_id,
        session_factory=session_factory, question_batch_runner=batch_runner,
    )
    assert len(job_sessions) == 1
    assert closed == job_sessions
    assert not job_sessions[0].in_transaction()
    # Scalar column query forces a PostgreSQL read, bypassing the identity map.
    row = db_session.execute(
        select(Job.status, Job.progress, Job.result_data).where(Job.id == job_id)
    ).one()
    assert row.status == "completed"
    assert row.progress == 100
    assert row.result_data == {"request_id": str(request_id), "questions": []}


def test_job_session_commits_are_removed_before_next_test_scope(db_connection):
    # Exercise teardown explicitly; this test also proves cleanup when run alone.
    with _isolated_session_factory(db_connection) as factory:
        with factory() as request_session:
            job = Job(job_type="session_factory_cleanup")
            request_session.add(job)
            request_session.commit()
            request_session.refresh(job)
            job_id = job.id
        with factory() as job_session:
            stored = job_session.get(Job, job_id)
            stored.status = "completed"
            job_session.commit()
        with factory() as request_session:
            assert request_session.scalar(
                select(Job.status).where(Job.id == job_id)
            ) == "completed"
    with _isolated_session_factory(db_connection) as factory:
        with factory() as next_session:
            assert next_session.get(Job, job_id) is None


def test_session_factory_rejects_overlapping_transactions(db_session, db_session_factory):
    db_session.execute(text("SELECT 1"))
    with pytest.raises(RuntimeError, match="nacheinander"):
        db_session_factory()
