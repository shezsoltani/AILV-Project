from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models.prompt_models import PromptPreviewRequest, PromptPreviewResponse, RenderedPrompt
from ..models.sql_models import User
from ..core.auth_utils import get_current_user
from ..db import get_db
from ..services.templateService import get_template_by_stage, render_template

router = APIRouter()

_QUESTIONS_STAGES = ["SKELETON", "CONTENT", "IMPROVE"]
_SLIDES_STAGES = ["SLIDES_OUTLINE", "SLIDES_CONTENT", "SLIDES_IMPROVE"]


def build_preview_context(stage: str, req: PromptPreviewRequest) -> dict:
    language = req.language.value
    types_str = ", ".join(req.types) if req.types else ""

    if req.request_type == "questions":
        if stage == "SKELETON":
            # {{count}} wörtlich lassen – bei Batching wird pro Batch neu gerendert.
            return {
                "topic": req.topic,
                "count": "{{count}}",
                "types": types_str,
                "difficulty_distribution": req.difficulty_distribution,
                "language": language,
            }
        if stage == "CONTENT":
            # Platzhalter wörtlich lassen – sonst fehlt {{skeleton_data}} nach „Übernehmen“
            # in custom_prompts (Pflicht laut custom_prompt_validator).
            return {
                "skeleton_data": "{{skeleton_data}}",
                "topic": req.topic,
                "language": language,
                "context_text": req.context_text,
                "upload_context": req.upload_context,
            }
        if stage == "IMPROVE":
            return {"questions_raw": "{{questions_raw}}"}

    if req.request_type == "slides":
        if stage == "SLIDES_OUTLINE":
            return {
                "topic": req.topic,
                "slide_count": req.slide_count,
                "language": language,
                "context_text": req.context_text,
                "upload_context": req.upload_context,
            }
        if stage == "SLIDES_CONTENT":
            return {
                "outline_data": "{{outline_data}}",
                "topic": req.topic,
                "language": language,
                "context_text": req.context_text,
                "upload_context": req.upload_context,
            }
        if stage == "SLIDES_IMPROVE":
            return {
                "slides_raw": "{{slides_raw}}",
                "language": language,
            }

    return {}


@router.post("/prompts/preview", response_model=PromptPreviewResponse)
def preview_prompts(
    req: PromptPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stages = _QUESTIONS_STAGES if req.request_type == "questions" else _SLIDES_STAGES
    language = req.language.value

    rendered: list[RenderedPrompt] = []
    for stage in stages:
        template_text = get_template_by_stage(db, stage=stage, language=language)
        context = build_preview_context(stage, req)
        prompt_text = render_template(template_text, context)
        rendered.append(RenderedPrompt(stage=stage, prompt_text=prompt_text))

    return PromptPreviewResponse(prompts=rendered)
