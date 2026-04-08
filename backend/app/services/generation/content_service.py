from sqlalchemy.orm import Session
from uuid import UUID
import json
from ..json_utils import safe_parse_json
from ...core.exceptions import LLMJSONError, ContentValidationError
from ..validators.content_validator import validate_content
from .stage_runner import run_stage
from typing import Optional

async def generate_valid_content(
    db: Session,
    request_id: UUID,
    language: str,
    topic: str,
    skeleton: list[dict],
    max_attempts: int = 3,
    context_text: Optional[str] = None,
    upload_context: Optional[str] = None,
) -> list[dict]:

    context = {
        "skeleton_data": json.dumps(skeleton, ensure_ascii=False, indent=2),
        "topic": topic,
        "language": language,
        "context_text": context_text,
        "upload_context": upload_context,
    }

    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        llm_response = await run_stage(
            db=db,
            request_id=request_id,
            stage="CONTENT",
            language=language,
            context=context,
        )

        try:
            content = safe_parse_json(llm_response)
            validate_content(content, expected_count=len(skeleton))
            return content

        except (LLMJSONError, ContentValidationError) as e:
            last_error = e
            context["previous_error"] = str(e)
            context["attempt"] = attempt

    raise last_error