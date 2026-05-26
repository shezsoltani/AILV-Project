from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from .generate_models import Language


class PromptPreviewRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    language: Language
    request_type: str = Field(..., pattern="^(questions|slides)$")

    # questions-spezifisch
    count: Optional[int] = Field(10, ge=1, le=50)
    types: Optional[List[str]] = Field(default_factory=lambda: ["MCQ"])
    difficulty_distribution: Optional[Dict[str, int]] = Field(
        default_factory=lambda: {"easy": 40, "medium": 40, "hard": 20}
    )

    # slides-spezifisch
    slide_count: Optional[int] = Field(10, ge=1, le=100)

    # gemeinsam optional
    context_text: Optional[str] = None
    upload_context: Optional[str] = None


class RenderedPrompt(BaseModel):
    stage: str
    prompt_text: str


class PromptPreviewResponse(BaseModel):
    prompts: List[RenderedPrompt]
