import json
from uuid import UUID
from sqlalchemy.orm import Session

from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, SlidesImproveValidationError
from ..validators.slides_improve_validator import validate_slides_improve
from .stage_runner import run_stage


async def generate_valid_improved_slides(
    db: Session,
    request_id: UUID,
    language: str,
    content_slides: list[dict],
    max_attempts: int = 3,
) -> list[dict]:
    context = {
        "slides_raw": json.dumps(content_slides, ensure_ascii=False, indent=2)
    }

    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="SLIDES_IMPROVE",
            language=language,
            context=context,
        )

        try:
            improved_slides = safe_parse_json(llm_response)
            validate_slides_improve(improved_slides, content_slides)
            return improved_slides
        except (LLMJSONError, SlidesImproveValidationError) as e:
            last_error = e
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise SlidesImproveValidationError(
        "Failed to generate valid improved slides after "
        f"{max_attempts} attempts. Last error: {last_error}"
    )
