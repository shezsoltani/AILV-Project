# app/services/generator_service.py
import random
import json
from sqlalchemy.orm import Session
from ..models.generate_models import GenerateResponse, GeneratedQuestion, GenerateRequest
from ..models.sql_models import GenerationRequest as ORMGenReq, PromptEntry
from .templateService import get_template_by_stage, render_template

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

def generate_test_data(req: GenerateRequest, db: Session) -> GenerateResponse:
    """
    Flow:
     - create generation_request row
     - load SKELETON template
     - render skeleton prompt
     - insert prompt row (stage=SKELETON)
     - produce dummy questions (same as before) and return
    """
    # 1) Persist generation_request
    db_req = create_generation_request_db(db, req)

    # 2) Load skeleton template
    template_text = get_template_by_stage(db, "SKELETON", language=req.language.value if hasattr(req.language, "value") else str(req.language))

    # 3) Render template
    context = {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": req.language.value if hasattr(req.language, "value") else str(req.language)
    }

    rendered_prompt = render_template(template_text, context)

    # 4) Insert prompt entry (stage = SKELETON)
    prompt_entry = insert_prompt_entry(db, db_req.id, "SKELETON", rendered_prompt, None)

    # 5) Dummy question generation
    difficulties = list(req.difficulty_distribution)
    questions = []
    for i in range(req.count):
        q_type = random.choice(req.types)
        diff = random.choice(difficulties)
        q_text = f"Beispiel-Frage {i+1} zu '{req.topic}' ({q_type}, {diff})"
        questions.append(GeneratedQuestion(question=q_text, type=q_type, difficulty=diff))

    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions,
        note=f"Rendered SKELETON prompt saved (prompt_id={prompt_entry.id})."
    )
