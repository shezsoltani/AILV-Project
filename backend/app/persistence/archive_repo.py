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


def get_questions_by_request_id(db: Session, request_id: UUID) -> List[Question]:
    return (
        db.query(Question)
        .filter(Question.request_id == request_id)
        .order_by(Question.created_at.asc())
        .all()
    )


def update_archive_questions(
    db: Session, questions_to_update: list[tuple[Question, dict]]
) -> None:
    for q, update_dict in questions_to_update:
        if "stem" in update_dict:
            q.stem = update_dict["stem"]
        if "difficulty" in update_dict:
            q.difficulty = update_dict["difficulty"]
        if "choices" in update_dict:
            q.choices = update_dict["choices"]
        if "answer" in update_dict:
            q.answer = update_dict["answer"]
        if "rationale" in update_dict:
            q.rationale = update_dict["rationale"]
