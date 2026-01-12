from sqlalchemy.orm import Session
from ...models.sql_models import GeneratedQuestion, Question
from ...models.finalization_models import FinalizeQuestionsRequest

def finalize_questions(
    *,
    db: Session,
    payload: FinalizeQuestionsRequest,
) -> int:
    generated = (
        db.query(GeneratedQuestion)
        .filter(GeneratedQuestion.request_id == payload.request_id)
        .all()
    )

    if not generated:
        raise RuntimeError("No generated questions found")

    gq_map = {q.id: q for q in generated}
    finalized_count = 0

    for q in payload.questions:
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

    db.commit()

    # generated_questions löschen
    (
        db.query(GeneratedQuestion)
        .filter(GeneratedQuestion.request_id == payload.request_id)
        .delete(synchronize_session=False)
    )
    db.commit()

    return finalized_count
