import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models.slides_models import SlidesGenerateRequest, SlidesGenerateResponse
from ..services.validators.slides_request_validator import SlidesGenerateRequestValidator
from ..core.auth_utils import get_current_user
from ..models.sql_models import User
from ..db import get_db

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

    return SlidesGenerateResponse(
        status="pending",
        request_id=uuid.uuid4(),
    )