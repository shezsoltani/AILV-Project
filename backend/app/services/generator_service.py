# app/services/generator_service.py
import random
import json
from sqlalchemy.orm import Session
from ..models.generate_models import GenerateResponse, GeneratedQuestion, GenerateRequest
from ..models.sql_models import GenerationRequest as ORMGenReq, PromptEntry
from .templateService import get_template_by_stage, render_template
from .llm_client import call_llm, LLMAPIError


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

async def generate_test_data(req: GenerateRequest, db: Session) -> GenerateResponse:
    """
    Flow:
     - create generation_request row
     - load SKELETON template
     - render skeleton prompt
     - insert prompt row (stage=SKELETON)
     - call LLM with rendered prompt
     - update prompt row with response
     - parse response (optional)
     - return result
    """

    # 1) Persist generation_request
    db_req = create_generation_request_db(db, req)

    # 2) Load skeleton template
    language = req.language.value if hasattr(req.language, "value") else str(req.language)
    template_text = get_template_by_stage(db, "SKELETON", language=language)

    # 3) Render template
    context = {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": language
    }
    rendered_prompt = render_template(template_text, context)

    # 4) Insert prompt entry (without response yet)
    prompt_entry = insert_prompt_entry(
        db=db,
        request_id=db_req.id,
        stage="SKELETON",
        prompt_text=rendered_prompt,
        response_text=None
    )

    # 5) Call LLM
    try:
        llm_response = await call_llm(rendered_prompt)
    except LLMAPIError as e:
        # Optional: Prompt-Eintrag trotzdem aktualisieren
        prompt_entry.response_text = f"ERROR: {str(e)}"
        db.commit()
        raise

    # 6) Update prompt entry with LLM response
    prompt_entry.response_text = llm_response
    db.commit()
    db.refresh(prompt_entry)

    # 7) (Optional) Response parsen
    # Hier kannst du später JSON parsing / validation einbauen
    # Beispiel: questions = parse_llm_response(llm_response)

    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=[],  # vorerst leer
        note=f"LLM response saved (prompt_id={prompt_entry.id})."
    )

