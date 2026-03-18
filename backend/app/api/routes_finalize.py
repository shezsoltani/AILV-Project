from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..models.finalization_models import (
    FinalizeQuestionsRequest,
    FinalizeQuestionsResponse,
)
from ..services.finalization.finalize_service import finalize_questions
from ..db import get_db
from ..core.auth_utils import get_current_user
from ..models.sql_models import User, GenerationRequest

router = APIRouter()

@router.post("/finalize", response_model=FinalizeQuestionsResponse)
def finalize_questions_endpoint(
    req: FinalizeQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ownership Check
    generation_request = (
        db.query(GenerationRequest)
        .filter(GenerationRequest.id == req.request_id)
        .first()
    )

    if not generation_request:
        raise HTTPException(
            status_code=404,
            detail="Generation request not found",
        )

    if generation_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to finalize this request",
        )

    count = finalize_questions(db=db, req=req)

    return FinalizeQuestionsResponse(
        success=True,
        request_id=req.request_id,
        finalized_count=count,
        message="Questions finalized successfully",
    )
