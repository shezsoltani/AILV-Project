from sqlalchemy.orm import Session
from uuid import UUID

from ...models.generate_models import (
    GenerateResponse,
    GeneratedQuestion,
    GenerateRequest
)
from .skeleton_service import generate_valid_skeleton
from .content_service import generate_valid_content
from .improve_service import generate_valid_improved_content
from ...persistence.generation_repo import create_generation_request_db
from ...persistence.prompt_repo import get_latest_prompt_by_stage
from ...persistence.generated_questions_repo import store_generated_questions
from ...core.exceptions import PromptStateError

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
    
    # letzter Prompt = IMPROVE
    improve_prompt = get_latest_prompt_by_stage(
        db=db,
        request_id=db_req.id,
        stage="IMPROVE",
    )
    
    if not improve_prompt:
        raise PromptStateError(
            "No IMPROVE prompt found for request"
        )


    stored_questions = store_generated_questions(
        db=db,
        request_id=db_req.id,
        prompt_id=improve_prompt.id,
        stage="IMPROVE",
        questions=improved,
    )

    # Mapping auf API-Response
    questions = [
        GeneratedQuestion(
            id=q.id,
            question=q.stem,
            type=q.type,
            difficulty=q.difficulty,
            choices=q.choices,
            correct_index=q.correct_index,
            answer=q.answer,
            rationale=q.rationale,
        )
        for q in stored_questions
    ]

    return GenerateResponse(
        accepted=True,
        request_id=db_req.id,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions,
        note="Questions generated and improved successfully",
    )

