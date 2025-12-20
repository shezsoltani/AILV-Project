from sqlalchemy.orm import Session
from uuid import UUID
import json
from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, ImproveValidationError
from ..validators.improve_validator import validate_improve
from .stage_runner import run_stage

async def generate_valid_improved_content(
    db: Session,
    request_id: UUID,
    language: str,
    original_questions: list[dict],
    max_attempts: int = 3,
) -> list[dict]:

    context = {
        "questions_raw": json.dumps(original_questions, ensure_ascii=False, indent=2)
    }

    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="IMPROVE",
            language=language,
            context=context,
        )

        try:
            improved = safe_parse_json(llm_response)
            validate_improve(improved, original_questions)
            return improved

        except (LLMJSONError, ImproveValidationError) as e:
            last_error = e
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise last_error