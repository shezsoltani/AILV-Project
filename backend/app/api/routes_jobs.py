from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..models.job_models import JobStatusResponse
from ..persistence.job_repository import get_job
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
        stage_label=job.stage_label,
        result_data=job.result_data,
        error_message=job.error_message,
    )