from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..models.job_models import JobStatusResponse
from ..persistence.job_repository import get_job, update_job
from ..core.auth_utils import get_current_user
from ..models.sql_models import User
from ..db import get_db

router = APIRouter(prefix="/jobs")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return JobStatusResponse(
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        batch_current=job.batch_current,
        batch_total=job.batch_total,
        stage_label=job.stage_label,
        result_data=job.result_data,
        error_message=job.error_message,
    )


@router.delete("/{job_id}", response_model=JobStatusResponse)
async def cancel_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if job.status in {"completed", "failed"}:
        return JobStatusResponse(
            job_id=job.id,
            job_type=job.job_type,
            status=job.status,
            batch_current=job.batch_current,
            batch_total=job.batch_total,
            progress=job.progress,
            stage_label=job.stage_label,
            result_data=job.result_data,
            error_message=job.error_message,
        )

    updated_job = update_job(
        db,
        job.id,
        status="failed",
        stage_label="Generierung abgebrochen",
        error_message="Generierung wurde vom Nutzer abgebrochen.",
    )

    if not updated_job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return JobStatusResponse(
        job_id=updated_job.id,
        job_type=updated_job.job_type,
        status=updated_job.status,
        progress=updated_job.progress,
        batch_current=updated_job.batch_current,
        batch_total=updated_job.batch_total,
        stage_label=updated_job.stage_label,
        result_data=updated_job.result_data,
        error_message=updated_job.error_message,
    )