from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from ..models.generate_models import GenerateRequest, GenerateResponse
from ..models.job_models import JobCreateResponse
from ..services.validators.request_validator import GenerateRequestValidator
from ..services.job_runner import run_questions_job
from ..persistence.job_repository import create_job
from ..core.auth_utils import get_current_user
from ..models.sql_models import User
from ..db import get_db
from ..services.llm_selection import resolve_selection, available_models

router = APIRouter()

def get_validator():
    return GenerateRequestValidator()


@router.get("/generation/models")
async def get_generation_models(current_user: User = Depends(get_current_user)):
    return await available_models()
    
@router.post("/generate", response_model=JobCreateResponse)
async def generate(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    validator: GenerateRequestValidator = Depends(get_validator),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validator.validate(req)
    req = resolve_selection(req)

    job = create_job(
        db=db,
        user_id=current_user.id,
        job_type="questions",
        request_data=req.model_dump(mode="json"),
    )

    background_tasks.add_task(run_questions_job, job.id, req.model_dump(mode="json"), current_user.id)

    return JobCreateResponse(job_id=job.id, status=job.status)





