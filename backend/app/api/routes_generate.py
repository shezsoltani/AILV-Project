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
    db: Session = Depends(get_db)
):
    try:
        validator.validate(req)
        result = await generate_questions(req, db) 
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

