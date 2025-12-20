# app/services/generator_service.py

from sqlalchemy.orm import Session
from uuid import UUID
import json

from ..models.generate_models import (
    GenerateResponse,
    GeneratedQuestion,
    GenerateRequest,
)
from ..models.sql_models import GenerationRequest as ORMGenReq, PromptEntry
from .templateService import get_template_by_stage, render_template
from .llm_client import call_llm
from .json_utils import safe_parse_json
from ..core.exceptions import LLMAPIError, LLMJSONError, SkeletonValidationError, ImproveValidationError, ContentValidationError
from .validators.skeleton_validator import validate_skeleton
from .validators.content_validator import validate_content
from .validators.improve_validator import validate_improve


def create_generation_request_db(db: Session, req: GenerateRequest):
    db_req = ORMGenReq(
        topic=req.topic,
        language=req.language.value if hasattr(req.language, "value") else str(req.language),
        count=req.count,
        types=req.types,
        difficulty_distribution=req.difficulty_distribution,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req


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

async def generate_valid_content(
    db: Session,
    request_id: UUID,
    language: str,
    topic: str,
    skeleton: list[dict],
    max_attempts: int = 3,
) -> list[dict]:

    context = {
        "skeleton_data": json.dumps(skeleton, ensure_ascii=False, indent=2),
        "topic": topic,
        "language": language,
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

async def generate_questions(
    req: GenerateRequest,
    db: Session,
) -> GenerateResponse:
    # Request speichern
    db_req = create_generation_request_db(db, req)

    base_context = {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": req.language.value,
    }

    # SKELETON
    skeleton = await generate_valid_skeleton(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        base_context=base_context,
        expected_count=req.count,
        max_attempts=3,
    )

    # CONTENT
    content = await generate_valid_content(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        topic=req.topic,
        skeleton=skeleton,
        max_attempts=3,
    )

    # IMPROVE
    improved = await generate_valid_improved_content(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        original_questions=content,
        max_attempts=3,
    )

    # Mapping auf API-Response
    questions = [
        GeneratedQuestion(
            id=q.get("id"),
            question=q.get("stem"),
            type=q.get("type"),
            difficulty=q.get("difficulty"),
            choices=q.get("choices"),
            correct_index=q.get("correct_index"),
            rationale=q.get("rationale"),
        )
        for q in improved
    ]

    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions,
        note="Questions generated and improved successfully",
    )

