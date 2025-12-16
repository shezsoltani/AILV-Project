# app/services/generator_service.py
import random
import json
from sqlalchemy.orm import Session
from ..models.generate_models import GenerateResponse, GeneratedQuestion, GenerateRequest
from ..models.sql_models import GenerationRequest as ORMGenReq, PromptEntry
from .templateService import get_template_by_stage, render_template
from .llm_client import call_llm, LLMAPIError
from .json_utils import safe_parse_json, LLMJSONError
from .skeleton_validator import validate_skeleton, SkeletonValidationError
from uuid import UUID

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

def insert_prompt_entry(db: Session, request_id, stage: str, prompt_text: str, response_text: str | None = None):
    p = PromptEntry(
        request_id=request_id,
        stage=stage,
        prompt_text=prompt_text,
        response_text=response_text
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
    context: dict
) -> str:
    template = get_template_by_stage(db, stage, language)
    prompt = render_template(template, context)

    prompt_entry = insert_prompt_entry(
        db=db,
        request_id=request_id,
        stage=stage,
        prompt_text=prompt
    )

    try:
        response = await call_llm(prompt)
    except LLMAPIError as e:
        prompt_entry.response_text = f"ERROR: {str(e)}"
        db.commit()
        raise

    prompt_entry.response_text = response
    db.commit()

    return response

async def generate_questions(req: GenerateRequest, db: Session) -> GenerateResponse:
    # 1) DB Request speichern
    db_req = ORMGenReq(
        topic=req.topic,
        language=req.language.value,
        count=req.count,
        types=req.types,
        difficulty_distribution=req.difficulty_distribution,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)

    # 2) Template laden & rendern
    template = get_template_by_stage(db, "SKELETON", language=req.language.value)

    prompt = render_template(template, {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": req.language.value
    })

    prompt_entry = insert_prompt_entry(
        db=db,
        request_id=db_req.id,
        stage="SKELETON",
        prompt_text=prompt
    )

    # 3) LLM aufrufen
    try:
        llm_response = await call_llm(prompt)
        prompt_entry.response_text = llm_response
        db.commit()
    except LLMAPIError:
        raise

    # 4) JSON parsen (SAFE!)
    try:
        skeleton = safe_parse_json(llm_response)
    except LLMJSONError as e:
        raise RuntimeError(f"SKELETON JSON error: {e}")

    # 5) Sanity Check
    try:
        validate_skeleton(skeleton, expected_count=req.count)
    except SkeletonValidationError as e:
        raise RuntimeError(f"SKELETON validation failed: {e}")

    # 6) Questions aus Skeleton bauen
    if not isinstance(skeleton, list):
        raise RuntimeError("Skeleton must be a list of questions")

    questions: list[GeneratedQuestion] = []

    for q in skeleton:
        questions.append(
            GeneratedQuestion(
                id=q.get("id"),
                type=q.get("type"),
                difficulty=q.get("difficulty"),
                question="",      # Platzhalter (kommt in nächster Stage)
                options=[],       # Platzhalter
                answer=""         # Platzhalter
            )
        )

    # 7) Response zurückgeben
    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions,
        note="Skeleton generated successfully (questions are placeholders)"
    )