from sqlalchemy.orm import Session
from ...models.sql_models import PromptEntry


def insert_prompt_entry(
    db: Session,
    request_id,
    stage: str,
    prompt_text: str,
    response_text: str | None = None,
):
    p = PromptEntry(
        request_id=request_id,
        stage=stage,
        prompt_text=prompt_text,
        response_text=response_text,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p