# services/finalize_questions_service.py

from sqlalchemy.orm import Session
from ...models.finalization_models import FinalizeQuestionsRequest
from ...models.sql_models import Question
from ...persistence.question_repo import (
    get_generated_questions_by_request,
    add_final_question,
    delete_generated_questions_by_request,
)
from ...core.exceptions import FinalizeStateError

def finalize_questions(
    *,
    db: Session,
    req: FinalizeQuestionsRequest,
) -> int:
    generated = get_generated_questions_by_request(db, req.request_id)

    if not generated:
        raise FinalizeStateError(
            "No generated questions found for this request"
        )

    gq_map = {q.id: q for q in generated}
    finalized_count = 0

    for q in req.questions:
        gq = gq_map.get(q.generated_question_id)
        if not gq:
            continue

        db.add(
            Question(
                request_id=gq.request_id,
                prompt_id=gq.prompt_id,
                type=q.type or gq.type,
                difficulty=q.difficulty or gq.difficulty,
                stem=q.stem or gq.stem,
                choices=q.choices or gq.choices,
                correct_index=q.correct_index or gq.correct_index,
                answer=q.answer or gq.answer,
                rationale=q.rationale or gq.rationale,
            )
        )
        finalized_count += 1

    # alles atomar speichern
    delete_generated_questions_by_request(db, req.request_id)
    db.commit()

    return finalized_count
