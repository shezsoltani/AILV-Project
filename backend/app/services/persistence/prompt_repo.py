from sqlalchemy.orm import Session
from ...models.sql_models import PromptEntry
from uuid import UUID

def insert_prompt_entry(
    db: Session,
    request_id: UUID,
    stage: str,
    prompt_text: str,
    response_text: str | None = None,
) -> PromptEntry:
    entry = PromptEntry(
        request_id=request_id,
        stage=stage,
        prompt_text=prompt_text,
        response_text=response_text,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
