# backend\app\api\routes_archive.py
# API-Endpunkte für das Archiv finalisierter Fragen

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

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
    db: Session = Depends(get_db)
) -> ArchiveTopicsResponse:
    # Gibt alle finalisierten Themen für die Archiv-Übersicht zurück
    return get_all_finalized_topics(db)


@router.get("/archive/{request_id}/questions", response_model=ArchiveQuestionsResponse)
def get_archive_questions_endpoint(
    request_id: UUID,
    db: Session = Depends(get_db)
) -> ArchiveQuestionsResponse:
    # Holt alle finalisierten Fragen zu einem bestimmten Thema
    return get_questions_for_request(db, request_id)
