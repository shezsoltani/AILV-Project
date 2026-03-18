# backend\app\api\routes_archive.py
# API-Endpunkte für das Archiv finalisierter Fragen

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from ..models.sql_models import User, GenerationRequest
from fastapi import HTTPException, status

from ..models.archive_models import (
    ArchiveTopicsResponse,
    ArchiveQuestionsResponse,
)
from ..services.archive.archive_service import (
    get_all_finalized_topics,
    get_questions_for_request,
)
from ..core.auth_utils import get_current_user
from ..db import get_db

router = APIRouter()


@router.get("/archive/topics", response_model=ArchiveTopicsResponse)
def get_archive_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ArchiveTopicsResponse:
    # Gibt alle finalisierten Themen für die Archiv-Übersicht zurück
    return get_all_finalized_topics(db, user_id=current_user.id)


@router.get("/archive/{request_id}/questions", response_model=ArchiveQuestionsResponse)
def get_archive_questions_endpoint(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ArchiveQuestionsResponse:
     # Ownership Check
    generation_request = (
        db.query(GenerationRequest)
        .filter(GenerationRequest.id == request_id)
        .first()
    )

    if not generation_request:
        raise HTTPException(status_code=404, detail="Request not found")

    if generation_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this resource",
        )
    # Holt alle finalisierten Fragen zu einem bestimmten Thema
    return get_questions_for_request(db, request_id)
