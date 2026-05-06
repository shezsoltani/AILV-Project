from sqlalchemy.orm import Session
from uuid import UUID
from typing import Callable, Optional

from ...models.slides_models import SlidesGenerateRequest, SlidesGenerateResponse, SlideDraft
from .slides_outline_service import generate_valid_slides_outline
from .slides_content_service import generate_valid_slides_content
from .slides_improve_service import generate_valid_improved_slides
from ...persistence.generation_repo import create_generation_request_db
from ...persistence.prompt_repo import get_latest_prompt_by_stage
from ...persistence.slides_draft_repo import store_generated_slides
from ...models.generate_models import GenerateRequest
from ...core.exceptions import PromptStateError


async def generate_slides(
    req: SlidesGenerateRequest,
    db: Session,
    user_id: UUID,
    on_progress: Optional[Callable[[int, str], None]] = None,
) -> SlidesGenerateResponse:
    base_req = GenerateRequest(
        topic=req.topic,
        language=req.language,
        count=1,
        context_text=req.context_text,
        upload_context=req.upload_context,
    )
    db_req = create_generation_request_db(
        db, base_req, user_id=user_id,
        request_type="slides",
        slide_count=req.slide_count,
    )

    base_context = {
        "topic": req.topic,
        "slide_count": req.slide_count,
        "language": req.language.value,
        "context_text": req.context_text,
        "upload_context": req.upload_context,
    }

    outline = await generate_valid_slides_outline(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        base_context=base_context,
        expected_count=req.slide_count,
        max_attempts=3,
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
    )
    if on_progress:
        on_progress(66, "Folieninhalte werden generiert")

    improved = await generate_valid_improved_slides(
        db=db,
        request_id=db_req.id,
        language=req.language.value,
        content_slides=content,
        max_attempts=3,
    )
    if on_progress:
        on_progress(100, "Folien werden optimiert")

    improve_prompt = get_latest_prompt_by_stage(
        db=db,
        request_id=db_req.id,
        stage="SLIDES_IMPROVE",
    )

    if not improve_prompt:
        raise PromptStateError("No SLIDES_IMPROVE prompt found for request.")

    stored_slides = store_generated_slides(
        db=db,
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