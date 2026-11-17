# services/finalize_questions_service.py

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...models.finalization_models import FinalizeQuestionsRequest
from ...models.sql_models import Question
from ...persistence import course_repo
from ...persistence.question_repo import (
    get_generated_questions_by_request,
    add_final_question,
    delete_generated_questions_by_request,
)
from ...core.exceptions import FinalizeStateError
from ..course_service import ensure_courses_belong_to_user


def finalize_questions(
    *,
    db: Session,
    req: FinalizeQuestionsRequest,
    user_id: UUID | None = None,
) -> int:
    generated = get_generated_questions_by_request(db, req.request_id)

    if not generated:
        raise FinalizeStateError(
            "No generated questions found for this request"
        )

    # LV-Auswahl erneut prüfen, bevor irgendetwas geschrieben wird: Eine LV kann
    # zwischen Generieren und Speichern gelöscht worden sein.
    course_ids: list[UUID] = []
    if req.course_ids:
        if user_id is None:
            raise ValueError("user_id is required when course_ids are given")
        course_ids = ensure_courses_belong_to_user(db, user_id, req.course_ids)

    gq_map = {q.id: q for q in generated}
    new_questions: list[Question] = []

    for q in req.questions:
        gq = gq_map.get(q.generated_question_id)
        if not gq:
            continue

        question = Question(
            request_id=gq.request_id,
            prompt_id=gq.prompt_id,
            type=q.type if q.type is not None else gq.type,
            difficulty=q.difficulty if q.difficulty is not None else gq.difficulty,
            stem=q.stem if q.stem is not None else gq.stem,
            choices=q.choices if q.choices is not None else gq.choices,
            correct_index=q.correct_index if q.correct_index is not None else gq.correct_index,
            correct_indices=q.correct_indices if q.correct_indices is not None else gq.correct_indices,
            answer=q.answer if q.answer is not None else gq.answer,
            rationale=q.rationale if q.rationale is not None else gq.rationale,
        )
        add_final_question(db, question)
        new_questions.append(question)

    # Fragen, Zuordnungen und das Entfernen der Entwürfe atomar speichern.
    try:
        if course_ids and new_questions:
            # flush vergibt die endgültigen Question-IDs, ohne zu committen.
            db.flush()
            course_repo.add_question_courses(
                db, [question.id for question in new_questions], course_ids
            )
        delete_generated_questions_by_request(db, req.request_id)
        db.commit()
    except IntegrityError:
        # Eine LV wurde genau zwischen Prüfung und Speichern gelöscht.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return len(new_questions)
