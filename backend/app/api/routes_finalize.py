from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models.finalization_models import (
    FinalizeQuestionsRequest,
    FinalizeQuestionsResponse,
)
from ..services.finalization.finalize_service import finalize_questions
from ..db import get_db

router = APIRouter()


@router.post("/finalize", response_model=FinalizeQuestionsResponse)
def finalize_questions_endpoint(
    req: FinalizeQuestionsRequest,
    db: Session = Depends(get_db),
):
    count = finalize_questions(db=db, req=req)

    return FinalizeQuestionsResponse(
        success=True,
        request_id=req.request_id,
        finalized_count=count,
        message="Questions finalized successfully",
    )
