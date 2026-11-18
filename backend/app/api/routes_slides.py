from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from ..models.slides_models import SlidesGenerateRequest
from ..models.slides_finalize_models import FinalizeSlidesRequest, FinalizeSlidesResponse
from ..models.job_models import JobCreateResponse
from ..services.validators.slides_request_validator import SlidesGenerateRequestValidator
from ..services.finalization.slides_finalize_service import finalize_slides
from ..services.job_runner import run_slides_job
from ..services.llm_selection import resolve_selection
from ..persistence.job_repository import create_job
from ..core.auth_utils import get_current_user
from ..models.sql_models import User
from ..db import get_db

slides_router = APIRouter(prefix="/slides")

def get_validator():
    return SlidesGenerateRequestValidator()

@slides_router.post("/generate", response_model=JobCreateResponse)
async def generate_slides(
    req: SlidesGenerateRequest,
    background_tasks: BackgroundTasks,
    validator: SlidesGenerateRequestValidator = Depends(get_validator),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validator.validate(req)
    # Nicht freigegebener Anbieter oder nicht freigegebenes Modell -> 422, kein Job.
    req = resolve_selection(req)
    job = create_job(
        db=db,
        user_id=current_user.id,
        job_type="slides",
        request_data=req.model_dump(mode="json"),
    )

    background_tasks.add_task(run_slides_job, job.id, req.model_dump(mode="json"), current_user.id)

    return JobCreateResponse(job_id=job.id, status=job.status)

@slides_router.post("/finalize", response_model=FinalizeSlidesResponse)
async def finalize_slides_endpoint(
    req: FinalizeSlidesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return finalize_slides(db=db, req=req, user_id=current_user.id)