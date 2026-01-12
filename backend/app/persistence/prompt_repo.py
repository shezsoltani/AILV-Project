from sqlalchemy.orm import Session
from ..models.sql_models import PromptEntry
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

def get_latest_prompt_by_stage(
    db: Session,
    *,
    request_id: UUID,
    stage: str,
) -> PromptEntry | None:
    return (
        db.query(PromptEntry)
        .filter(
            PromptEntry.request_id == request_id,
            PromptEntry.stage == stage,
        )
        .order_by(PromptEntry.created_at.desc())
        .first()
    )
