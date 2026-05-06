from uuid import UUID
from typing import Any, Optional
from sqlalchemy.orm import Session

from ..models.sql_models import Job

def create_job(
    db: Session,
    user_id: UUID,
    job_type: str,
    request_data: Optional[dict] = None,
) -> Job:
    job = Job(
        user_id=user_id,
        job_type=job_type,
        status="pending",
        progress=0,
        request_data=request_data,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(
    db: Session,
    job_id: UUID,
) -> Job | None:
    return db.query(Job).filter(Job.id == job_id).first()


def update_job(
    db: Session,
    job_id: UUID,
    status: Optional[str] = None,
    progress: Optional[int] = None,
    stage_label: Optional[str] = None,
    result_data: Optional[Any] = None,
    error_message: Optional[str] = None,
) -> Job | None:
    job = get_job(db, job_id)
    if not job:
        return None

    if status is not None:
        job.status = status
    if progress is not None:
        job.progress = progress
    if stage_label is not None:
        job.stage_label = stage_label
    if result_data is not None:
        job.result_data = result_data
    if error_message is not None:
        job.error_message = error_message

    db.commit()
    db.refresh(job)
    return job