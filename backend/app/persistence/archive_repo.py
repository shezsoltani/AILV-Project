# backend\app\services\persistence\archive_repo.py
# Datenbank-Zugriff für archivierte Fragen

from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from ..models.sql_models import GenerationRequest, Question

# Holt ein Thema und alle zugehörigen finalisierten Fragen aus der Datenbank
def get_archive_questions(db: Session, request_id: UUID) -> tuple[GenerationRequest | None, List[Question]]:
    generation_request = (
        db.query(GenerationRequest)
        .filter(GenerationRequest.id == request_id)
        .first()
    )
    
    # Gibt None zurück, falls das Thema nicht gefunden wurde
    if not generation_request:
        return None, []
    
    questions = (
        db.query(Question)
        .filter(Question.request_id == request_id)
        .order_by(Question.created_at.asc())
        .all()
    )
    
    return generation_request, questions
