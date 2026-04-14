# backend\app\api\routes_archive.py
# API-Endpunkte für das Archiv finalisierter Fragen

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from uuid import UUID
from ..models.sql_models import User, GenerationRequest
from fastapi import HTTPException, status

from ..models.archive_models import (
    ArchiveTopicsResponse,
    ArchiveQuestionsResponse,
    UpdateArchiveQuestionsRequest,
    ArchiveDeleteResponse,
)
from ..services.archive.archive_delete_service import delete_archive_entry
from ..services.archive.archive_read_service import (
    get_all_finalized_topics,
    get_questions_for_request,
)
from ..services.archive.archive_update_service import update_questions_for_request
from ..core.auth_utils import get_current_user
from ..db import get_db

router = APIRouter()


@router.get("/archive/topics", response_model=ArchiveTopicsResponse)
def get_archive_topics(
    q: Optional[str] = Query(default=None, description="Optionaler Suchbegriff für Titel und Frageninhalte"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchiveTopicsResponse:
    # Gibt finalisierte Themen zurück – gefiltert nach q, falls angegeben
    return get_all_finalized_topics(db, user_id=current_user.id, q=q)


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


@router.put("/archive/{request_id}/questions", response_model=ArchiveQuestionsResponse)
def update_archive_questions_endpoint(
    request_id: UUID,
    payload: UpdateArchiveQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchiveQuestionsResponse:
    # Ownership Check - nur der Owner darf Änderungen vornehmen
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
            detail="Not allowed to modify this resource",
        )

    # Delegate to Service für Validierung und Speicherung
    try:
        return update_questions_for_request(db, generation_request, payload.questions)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to update archive questions")

@router.delete("/archive/{request_id}", response_model=ArchiveDeleteResponse)
def delete_archive_entry_endpoint(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchiveDeleteResponse:
    return delete_archive_entry(db, request_id, current_user)