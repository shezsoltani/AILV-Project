from sqlalchemy.orm import Session
from uuid import UUID
from ...models.sql_models import GeneratedQuestion as ORMGeneratedQuestion

def store_generated_questions(
    db: Session,
    *,
    request_id: UUID,
    prompt_id: UUID,
    stage: str,
    questions: list[dict],
):
    objs = []

    for q in questions:
        obj = ORMGeneratedQuestion(
            request_id=request_id,
            prompt_id=prompt_id,
            stage=stage,
            type=q.get("type"),
            difficulty=q.get("difficulty"),
            stem=q.get("stem"),
            choices=q.get("choices"),
            correct_index=q.get("correct_index"),
            rationale=q.get("rationale"),
        )
        objs.append(obj)

    db.add_all(objs)
    db.commit()
