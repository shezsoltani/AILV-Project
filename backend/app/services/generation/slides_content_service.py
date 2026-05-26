import json
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, SlidesContentValidationError
from ..validators.slides_content_validator import validate_slides_content
from .stage_runner import run_stage


async def generate_valid_slides_content(
    db: Session,
    request_id: UUID,
    language: str,
    outline: list[dict],
    base_context: dict,
    max_attempts: int = 3,
    custom_prompt: Optional[str] = None,
) -> list[dict]:
    context = dict(base_context)
    context["outline_data"] = json.dumps(outline, ensure_ascii=False, indent=2)

    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="SLIDES_CONTENT",
            language=language,
            context=context,
            custom_prompt=custom_prompt,
        )

        try:
            content = safe_parse_json(llm_response)
            validate_slides_content(content, outline)
            return content

        except (LLMJSONError, SlidesContentValidationError) as e:
            last_error = e
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise last_error