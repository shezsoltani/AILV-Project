from sqlalchemy.orm import Session
from uuid import UUID
from typing import Callable, Optional

from ...models.generate_models import (
    GenerateResponse,
    GeneratedQuestion,
    GenerateRequest
)
from .skeleton_service import generate_valid_skeleton
from .content_service import generate_valid_content
from .improve_service import generate_valid_improved_content
from .persistence import QuestionGenerationPersistence, SqlQuestionGenerationPersistence
from .stage_runner import StageRunner
from ...core.exceptions import PromptStateError

async def generate_questions(
    req: GenerateRequest,
    db: Session,
    user_id: UUID,
    on_progress: Optional[Callable[[int, str], None]] = None,
    existing_request_id: UUID | None = None,
    custom_prompts: Optional[dict[str, str]] = None,
    persistence: Optional[QuestionGenerationPersistence] = None,
    stage_runner: Optional[StageRunner] = None,
) -> GenerateResponse:
    persistence = persistence or SqlQuestionGenerationPersistence()

    # Request speichern
    db_req = persistence.create_or_load_request(
        db, req=req, user_id=user_id, existing_request_id=existing_request_id,
    )

    base_context = {
        "topic": req.topic,
        "count": req.count,
        "types": req.types,
        "difficulty_distribution": req.difficulty_distribution,
        "language": req.language.value
    }

    cp = custom_prompts or {}

    # SKELETON
    skeleton = await generate_valid_skeleton(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        base_context=base_context,
        expected_count=req.count,
        max_attempts=3,
        custom_prompt=cp.get("SKELETON"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(33, "Grundstruktur wird erstellt")

    # CONTENT
    content = await generate_valid_content(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        topic=req.topic,
        skeleton=skeleton,
        max_attempts=3,
        context_text=req.context_text,
        upload_context=req.upload_context,
        custom_prompt=cp.get("CONTENT"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(66, "Inhalte werden generiert")

    # IMPROVE
    improved = await generate_valid_improved_content(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        original_questions=content,
        max_attempts=3,
        custom_prompt=cp.get("IMPROVE"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(100, "Fragen werden optimiert")
    
    # letzter Prompt = IMPROVE
    improve_prompt = persistence.get_latest_prompt(
        db, request_id=db_req.id, stage="IMPROVE",
    )

    if not improve_prompt:
        raise PromptStateError(
            "No IMPROVE prompt found for request"
        )


    stored_questions = persistence.store_questions(
        db,
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
            correct_indices=q.correct_indices,
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

