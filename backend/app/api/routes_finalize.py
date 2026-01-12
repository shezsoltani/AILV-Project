from fastapi import APIRouter, Depends, HTTPException
from ..models.finalization_models import FinalizeQuestionsRequest, FinalizeQuestionsResponse
from ..services.finalization.finalize_service import finalize_questions
from ..db import get_db
from sqlalchemy.orm import Session

router = APIRouter()

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