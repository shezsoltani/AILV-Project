from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID

from ...models.archive_models import (
    ArchiveTopicResponse,
    ArchiveTopicsResponse,
    ArchiveQuestionsResponse,
)
from ...models.generate_models import GeneratedQuestion
from ...models.sql_models import Question, GenerationRequest, QuestionCourse
from ...core.exceptions import ArchiveNotFoundError, ArchiveServiceError
from ...persistence.archive_repo import get_archive_questions
from ...persistence.course_repo import (
    get_course_ids_for_questions,
    get_courses_by_ids_and_user,
)


# Liefert alle finalisierten Themen mit Anzahl Fragen und Zeitstempeln.
# Wenn q gesetzt ist, werden nur Themen zurückgegeben, deren Titel oder
# Frageninhalt (stem, answer, rationale) den Suchbegriff enthalten (case-insensitiv).
def get_all_finalized_topics(
    db: Session,
    user_id: UUID,
    q: Optional[str] = None,
    course_ids: Optional[List[UUID]] = None,
    unassigned: bool = False,
) -> ArchiveTopicsResponse:
    try:
        if course_ids:
            unique_cids = list(dict.fromkeys(course_ids))
            found_courses = get_courses_by_ids_and_user(db, unique_cids, user_id)
            if len(found_courses) != len(unique_cids):
                raise HTTPException(status_code=404, detail="Course not found")

        query = (
            db.query(
                GenerationRequest,
                func.count(Question.id).label("question_count"),
                func.max(Question.created_at).label("finalized_at"),
            )
            .join(Question, Question.request_id == GenerationRequest.id)
            .filter(GenerationRequest.user_id == user_id)
        )

        if course_ids:
            unique_cids = list(dict.fromkeys(course_ids))
            query = query.filter(
                Question.id.in_(
                    db.query(QuestionCourse.question_id).filter(
                        QuestionCourse.course_id.in_(unique_cids)
                    )
                )
            )
        elif unassigned:
            query = query.filter(
                ~Question.id.in_(db.query(QuestionCourse.question_id))
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
    except HTTPException:
        raise
    except Exception as exc:
        raise ArchiveServiceError("Failed to fetch finalized topics", str(exc))


# Holt alle finalisierten Fragen zu einem bestimmten Thema
def get_questions_for_request(
    db: Session,
    request_id: UUID,
    course_ids: Optional[List[UUID]] = None,
    unassigned: bool = False,
    user_id: Optional[UUID] = None,
) -> ArchiveQuestionsResponse:
    try:
        if course_ids and user_id is not None:
            unique_cids = list(dict.fromkeys(course_ids))
            found_courses = get_courses_by_ids_and_user(db, unique_cids, user_id)
            if len(found_courses) != len(unique_cids):
                raise HTTPException(status_code=404, detail="Course not found")

        generation_request, questions = get_archive_questions(
            db, request_id, course_ids=course_ids, unassigned=unassigned
        )
        
        if not generation_request:
            raise ArchiveNotFoundError(
                request_id=str(request_id),
                detail="Generation request not found"
            )

        is_filtered = bool(course_ids) or unassigned
        
        if not questions:
            if is_filtered:
                return ArchiveQuestionsResponse(
                    request_id=generation_request.id,
                    topic=generation_request.topic,
                    language=generation_request.language,
                    questions=[],
                )
            raise ArchiveNotFoundError(
                request_id=str(request_id),
                detail="No finalized questions found for this request"
            )

        question_ids = [q.id for q in questions]
        courses_map = get_course_ids_for_questions(db, question_ids)
        
        mapped_questions = [
            GeneratedQuestion(
                id=q.id,
                question=q.stem or "",
                type=q.type or "",
                difficulty=q.difficulty or "",
                choices=q.choices,
                correct_index=q.correct_index,
                correct_indices=q.correct_indices,
                answer=q.answer,
                rationale=q.rationale,
                course_ids=courses_map.get(q.id, []),
            )
            for q in questions
        ]
        
        return ArchiveQuestionsResponse(
            request_id=generation_request.id,
            topic=generation_request.topic,
            language=generation_request.language,
            questions=mapped_questions,
        )
    except (ArchiveNotFoundError, HTTPException):
        raise
    except Exception as exc:
        raise ArchiveServiceError(
            f"Failed to fetch questions for request {request_id}",
            str(exc)
        )
