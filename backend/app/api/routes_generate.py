from fastapi import APIRouter, Depends, HTTPException
from ..models.generate_models import GenerateRequest, GenerateResponse
from ..services.generator_service import generate_test_data
from ..services.validators import GenerateRequestValidator
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
        result = await generate_test_data(req, db) 
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

