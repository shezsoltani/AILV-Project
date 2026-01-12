from sqlalchemy.orm import Session
from uuid import UUID
from ...core.exceptions import LLMAPIError
from ..templateService import get_template_by_stage, render_template
from ..llm_client import call_llm
from ...persistence.prompt_repo import insert_prompt_entry

async def run_stage(
    db: Session,
    request_id: UUID,
    stage: str,
    language: str,
    context: dict,
) -> str:
    template = get_template_by_stage(db, stage, language)
    prompt = render_template(template, context)

    prompt_entry = insert_prompt_entry(
        db=db,
        request_id=request_id,
        stage=stage,
        prompt_text=prompt,
    )

    try:
        response = await call_llm(prompt)
    except LLMAPIError:
        # Fehler wird geloggt
        prompt_entry.response_text = "ERROR during LLM call"
        db.commit()
        raise

    prompt_entry.response_text = response
    db.commit()

    return response