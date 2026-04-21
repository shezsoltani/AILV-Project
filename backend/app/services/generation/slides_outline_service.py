from sqlalchemy.orm import Session
from uuid import UUID

from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, SlideOutlineValidationError
from ..validators.slides_outline_validator import validate_slide_outline
from .stage_runner import run_stage


async def generate_valid_slides_outline(
    db: Session,
    request_id: UUID,
    language: str,
    base_context: dict,
    expected_count: int,
    max_attempts: int = 3,
) -> list[dict]:
    context = dict(base_context)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="SLIDES_OUTLINE",
            language=language,
            context=context,
        )

        try:
            outline = safe_parse_json(llm_response)
            validate_slide_outline(outline, expected_count)
            return outline

        except (LLMJSONError, SlideOutlineValidationError) as e:
            last_error = e
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise last_error