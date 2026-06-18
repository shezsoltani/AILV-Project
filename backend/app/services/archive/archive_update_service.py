from sqlalchemy.orm import Session

from ...models.archive_models import ArchiveQuestionsResponse, ArchiveQuestionUpdate
from ...models.generate_models import GeneratedQuestion
from ...models.sql_models import GenerationRequest
from ...core.exceptions import ArchiveNotFoundError, ArchiveServiceError
from ...persistence.archive_repo import get_questions_by_request_id, update_archive_questions
from fastapi import HTTPException


def update_questions_for_request(
    db: Session,
    generation_request: GenerationRequest,
    updates: list[ArchiveQuestionUpdate],
) -> ArchiveQuestionsResponse:
    try:
        request_id = generation_request.id
        questions = get_questions_by_request_id(db, request_id)

        if not questions:
            raise ArchiveNotFoundError(
                request_id=str(request_id),
                detail="No finalized questions found for this request",
            )

        existing_by_id = {str(q.id): q for q in questions}
        questions_to_update: list[tuple] = []

        for u in updates:
            qid = str(u.id)
            existing = existing_by_id.get(qid)
            if not existing:
                raise HTTPException(
                    status_code=404,
                    detail=f"Question {qid} not found for this request",
                )

            qtype = (existing.type or "").upper()

            # Typ-spezifische Validierung
            if qtype in ("SCQ", "TRUE_FALSE"):
                # SCQ / TRUE_FALSE: choices + genau 1 correct_index
                if not u.choices or not isinstance(u.choices, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: choices must be present for type {qtype}",
                    )
                if any(not isinstance(c, str) or c.strip() == "" for c in u.choices):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: each choice must be a non-empty string",
                    )
                if u.correct_index is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: correct_index must be present for type {qtype}",
                    )
                if not (0 <= u.correct_index < len(u.choices)):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: correct_index {u.correct_index} is out of bounds for {len(u.choices)} choices",
                    )

            elif qtype == "MCQ":
                # MCQ (Multiple Response): choices + correct_indices
                if not u.choices or not isinstance(u.choices, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: choices must be present for type MCQ",
                    )
                if any(not isinstance(c, str) or c.strip() == "" for c in u.choices):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: each choice must be a non-empty string",
                    )
                if not u.correct_indices or not isinstance(u.correct_indices, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: correct_indices must be a non-empty list for MCQ",
                    )
                for idx in u.correct_indices:
                    if not isinstance(idx, int) or not (0 <= idx < len(u.choices)):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Question {qid}: correct_indices entry {idx} is out of bounds for {len(u.choices)} choices",
                        )

            elif qtype == "SHORT_ANSWER":
                if u.answer is None or u.answer.strip() == "":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question {qid}: answer must not be empty for SHORT_ANSWER",
                    )

            # Nur erlaubte Felder übernehmen
            update_dict: dict = {}
            if u.question is not None:
                update_dict["stem"] = u.question
            if u.difficulty is not None:
                update_dict["difficulty"] = u.difficulty
            if u.choices is not None:
                update_dict["choices"] = u.choices
            if u.correct_index is not None:
                update_dict["correct_index"] = u.correct_index
            if u.correct_indices is not None:
                update_dict["correct_indices"] = u.correct_indices
            if u.answer is not None:
                update_dict["answer"] = u.answer
            if u.rationale is not None:
                update_dict["rationale"] = u.rationale

            questions_to_update.append((existing, update_dict))

        try:
            update_archive_questions(db, questions_to_update)
            db.commit()
        except Exception as exc:
            db.rollback()
            raise ArchiveServiceError("Failed to persist updated questions", str(exc))

        # Fragen neu laden für Response
        updated_questions = get_questions_by_request_id(db, request_id)

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
            )
            for q in updated_questions
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
            f"Failed to update questions for request {request_id}", str(exc)
        )
