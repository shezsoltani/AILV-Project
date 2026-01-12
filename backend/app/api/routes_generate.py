from fastapi import APIRouter, Depends, HTTPException
from ..models.generate_models import GenerateRequest, GenerateResponse
from ..services.generation.orchestrator import generate_questions
from ..services.validators.request_validator import GenerateRequestValidator
from ..models.finalization_models import FinalizeQuestionsRequest, FinalizeQuestionsResponse
from ..services.finalization.finalize_service import finalize_questions


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

@router.post("/finalize", response_model=FinalizeQuestionsResponse)
def finalize_questions_endpoint(
    req: FinalizeQuestionsRequest,
    db: Session = Depends(get_db),
):
    try:
        count = finalize_questions(db=db, req=req)
        return FinalizeQuestionsResponse(
            success=True,
            request_id=req.request_id,
            finalized_count=count,
            message="Questions finalized successfully",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


