# persistence/questions_repo.py

from sqlalchemy.orm import Session
from uuid import UUID
from ..models.sql_models import GeneratedQuestion, Question

def get_generated_questions_by_request(
    db: Session,
    request_id: UUID,
) -> list[GeneratedQuestion]:
    return (
        db.query(GeneratedQuestion)
        .filter(GeneratedQuestion.request_id == request_id)
        .all()
    )

def add_final_question(
    db: Session,
    question: Question,
) -> None:
    db.add(question)


def delete_generated_questions_by_request(
    db: Session,
    request_id: UUID,
) -> None:
    (
        db.query(GeneratedQuestion)
        .filter(GeneratedQuestion.request_id == request_id)
        .delete(synchronize_session=False)
    )
