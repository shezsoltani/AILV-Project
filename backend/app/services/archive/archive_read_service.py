from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID

from ...models.archive_models import (
    ArchiveTopicResponse,
    ArchiveTopicsResponse,
    ArchiveQuestionsResponse,
)
from ...models.generate_models import GeneratedQuestion
from ...models.sql_models import Question, GenerationRequest
from ...core.exceptions import ArchiveNotFoundError, ArchiveServiceError
from ...persistence.archive_repo import get_archive_questions


# Liefert alle finalisierten Themen mit Anzahl Fragen und Zeitstempeln.
# Wenn q gesetzt ist, werden nur Themen zurückgegeben, deren Titel oder
# Frageninhalt (stem, answer, rationale) den Suchbegriff enthalten (case-insensitiv).
def get_all_finalized_topics(db: Session, user_id: UUID, q: Optional[str] = None) -> ArchiveTopicsResponse:
    try:
        query = (
            db.query(
                GenerationRequest,
                func.count(Question.id).label("question_count"),
                func.max(Question.created_at).label("finalized_at"),
            )
            .join(Question, Question.request_id == GenerationRequest.id)
            .filter(GenerationRequest.user_id == user_id)
        )

        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    GenerationRequest.topic.ilike(term),
                    Question.stem.ilike(term),
                    Question.answer.ilike(term),
                    Question.rationale.ilike(term),
                )
            )

        results = (
            query
            .group_by(GenerationRequest.id)
            .order_by(GenerationRequest.created_at.desc())
            .all()
        )
        
        topics = []
        for req, question_count, finalized_at in results:
            topics.append(
                ArchiveTopicResponse(
                    request_id=req.id,
                    topic=req.topic,
                    language=req.language,
                    question_count=question_count,
                    types=req.types or [],
                    created_at=req.created_at,
                    finalized_at=finalized_at,
                )
            )
        
        return ArchiveTopicsResponse(topics=topics)
    except Exception as exc:
        raise ArchiveServiceError("Failed to fetch finalized topics", str(exc))


# Holt alle finalisierten Fragen zu einem bestimmten Thema
def get_questions_for_request(
    db: Session, request_id: UUID
) -> ArchiveQuestionsResponse:
    try:
        generation_request, questions = get_archive_questions(db, request_id)
        
        if not generation_request:
            raise ArchiveNotFoundError(
                request_id=str(request_id),
                detail="Generation request not found"
            )
        
        if not questions:
            raise ArchiveNotFoundError(
                request_id=str(request_id),
                detail="No finalized questions found for this request"
            )
        
        mapped_questions = [
            GeneratedQuestion(
                id=q.id,
                question=q.stem or "",
                type=q.type or "",
                difficulty=q.difficulty or "",
                choices=q.choices,
                correct_index=q.correct_index,
                answer=q.answer,
                rationale=q.rationale,
            )
            for q in questions
        ]
        
        return ArchiveQuestionsResponse(
            request_id=generation_request.id,
            topic=generation_request.topic,
            language=generation_request.language,
            questions=mapped_questions,
        )
    except ArchiveNotFoundError:
        raise
    except Exception as exc:
        raise ArchiveServiceError(
            f"Failed to fetch questions for request {request_id}",
            str(exc)
        )

