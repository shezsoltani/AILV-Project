from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models.slides_models import SlidesGenerateRequest, SlidesGenerateResponse
from ..models.generate_models import GenerateRequest
from ..models.slides_finalize_models import FinalizeSlidesRequest, FinalizeSlidesResponse
from ..services.validators.slides_request_validator import SlidesGenerateRequestValidator
from ..services.finalization.slides_finalize_service import finalize_slides
from ..core.auth_utils import get_current_user
from ..models.sql_models import User
from ..db import get_db
from ..persistence.generation_repo import create_generation_request_db

slides_router = APIRouter(prefix="/slides")

def get_validator():
    return SlidesGenerateRequestValidator()

@slides_router.post("/generate", response_model=SlidesGenerateResponse)
async def generate_slides(
    req: SlidesGenerateRequest,
    validator: SlidesGenerateRequestValidator = Depends(get_validator),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validator.validate(req)

    base_req = GenerateRequest(topic=req.topic, language=req.language, count=1)
    db_req = create_generation_request_db(
        db, base_req, user_id=current_user.id,
        request_type="slides", slide_count=req.slide_count,
    )

    return SlidesGenerateResponse(
        status="pending",
        request_id=db_req.id,
    )

@slides_router.post("/finalize", response_model=FinalizeSlidesResponse)
async def finalize_slides_endpoint(
    req: FinalizeSlidesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return finalize_slides(db=db, req=req, user_id=current_user.id)