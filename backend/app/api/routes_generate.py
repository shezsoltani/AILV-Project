from fastapi import APIRouter, Depends, HTTPException
from ..models.generate_models import GenerateRequest, GenerateResponse
from ..services.generation.orchestrator import generate_questions
from ..services.validators.request_validator import GenerateRequestValidator

from ..db import get_db
from sqlalchemy.orm import Session

router = APIRouter()

def get_validator():
    return GenerateRequestValidator()
    
@router.post("/generate", response_model=GenerateResponse)
async def generate(
    req: GenerateRequest,
    validator: GenerateRequestValidator = Depends(get_validator),
    db: Session = Depends(get_db),
  # user_id: str = Depends(get_current_user)
):
    validator.validate(req)
    return await generate_questions(req, db)





