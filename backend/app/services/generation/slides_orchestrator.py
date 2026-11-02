from sqlalchemy.orm import Session
from uuid import UUID
from typing import Callable, Optional

from ...models.slides_models import SlidesGenerateRequest, SlidesGenerateResponse, SlideDraft
from .slides_outline_service import generate_valid_slides_outline
from .slides_content_service import generate_valid_slides_content
from .slides_improve_service import generate_valid_improved_slides
from .persistence import SlidesGenerationPersistence, SqlSlidesGenerationPersistence
from .stage_runner import StageRunner
from ...models.generate_models import GenerateRequest
from ...core.exceptions import PromptStateError


async def generate_slides(
    req: SlidesGenerateRequest,
    db: Session,
    user_id: UUID,
    on_progress: Optional[Callable[[int, str], None]] = None,
    existing_request_id: Optional[UUID] = None,
    custom_prompts: Optional[dict[str, str]] = None,
    persistence: Optional[SlidesGenerationPersistence] = None,
    stage_runner: Optional[StageRunner] = None,
) -> SlidesGenerateResponse:
    persistence = persistence or SqlSlidesGenerationPersistence()

    base_req = GenerateRequest(
        topic=req.topic,
        language=req.language,
        count=1,
        context_text=req.context_text,
        upload_context=req.upload_context,
    )
    db_req = persistence.create_or_load_request(
        db,
        req=base_req,
        user_id=user_id,
        existing_request_id=existing_request_id,
        slide_count=req.slide_count,
    )

    base_context = {
        "topic": req.topic,
        "slide_count": req.slide_count,
        "language": req.language.value,
        "context_text": req.context_text,
        "upload_context": req.upload_context,
    }

    cp = custom_prompts or {}

    outline = await generate_valid_slides_outline(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        base_context=base_context,
        expected_count=req.slide_count,
        max_attempts=3,
        custom_prompt=cp.get("SLIDES_OUTLINE"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(33, "Gliederung wird erstellt")

    content = await generate_valid_slides_content(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        outline=outline,
        base_context=base_context,
        max_attempts=3,
        custom_prompt=cp.get("SLIDES_CONTENT"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(66, "Folieninhalte werden generiert")

    improved = await generate_valid_improved_slides(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        content_slides=content,
        max_attempts=3,
        custom_prompt=cp.get("SLIDES_IMPROVE"),
        stage_runner=stage_runner,
    )
    if on_progress:
        on_progress(100, "Folien werden optimiert")

    improve_prompt = persistence.get_latest_prompt(
        db, request_id=db_req.id, stage="SLIDES_IMPROVE",
    )

    if not improve_prompt:
        raise PromptStateError("No SLIDES_IMPROVE prompt found for request.")

    stored_slides = persistence.store_slides(
        db,
        request_id=db_req.id,
        prompt_id=improve_prompt.id,
        stage="SLIDES_IMPROVE",
        slides=improved,
    )

    slides = [
        SlideDraft(
            position=s.position,
            slide_type=s.slide_type,
            title=s.title,
            bullets=s.bullets or [],
            examples=s.examples or [],
        )
        for s in stored_slides
    ]

    return SlidesGenerateResponse(
        status="ok",
        request_id=db_req.id,
        slides=slides,
    )