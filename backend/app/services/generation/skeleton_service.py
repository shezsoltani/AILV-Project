from sqlalchemy.orm import Session
from uuid import UUID
from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, SkeletonValidationError
from ..validators.skeleton_validator import validate_skeleton
from .stage_runner import run_stage

async def generate_valid_skeleton(
    db: Session,
    request_id: UUID,
    language: str,
    base_context: dict,
    expected_count: int,
    max_attempts: int = 3,
):
    context = dict(base_context)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="SKELETON",
            language=language,
            context=context,
        )

        try:
            skeleton = safe_parse_json(llm_response)
            validate_skeleton(skeleton, expected_count)
            return skeleton  # Erfolg

        except (LLMJSONError, SkeletonValidationError) as e:
            last_error = e

            # strukturiertes Feedback für das LLM
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise last_error