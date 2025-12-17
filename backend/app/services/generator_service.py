# app/services/generator_service.py

from sqlalchemy.orm import Session
from uuid import UUID

from ..models.generate_models import (
    GenerateResponse,
    GeneratedQuestion,
    GenerateRequest,
)
from ..models.sql_models import GenerationRequest as ORMGenReq, PromptEntry
from .templateService import get_template_by_stage, render_template
from .llm_client import call_llm
from .json_utils import safe_parse_json
from ..core.exceptions import LLMAPIError
from .skeleton_validator import validate_skeleton


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


async def generate_questions(
    req: GenerateRequest,
    db: Session,
) -> GenerateResponse:
    # 1) GenerationRequest anlegen
    db_req = create_generation_request_db(db, req)

    # 2) Kontext für die Skeleton-Stage
    context = {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": req.language.value,
    }

    # 3) Skeleton-Stage (Exceptions werden durchgereicht)
    llm_response = await run_stage(
        db=db,
        request_id=db_req.id,
        stage="SKELETON",
        language=req.language.value,
        context=context,
    )

    # 4) JSON parsen (wirft LLMJSONError)
    skeleton = safe_parse_json(llm_response)

    # 5) Skeleton validieren (wirft SkeletonValidationError)
    validate_skeleton(skeleton, expected_count=req.count)

    # 6) Platzhalter-Questions erzeugen
    questions = [
        GeneratedQuestion(
            id=q.get("id"),
            type=q.get("type"),
            difficulty=q.get("difficulty"),
            question="",
            options=[],
            answer="",
        )
        for q in skeleton
    ]

    # 7) Response zurückgeben
    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions,
        note="Skeleton generated successfully (questions are placeholders)",
    )
