from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, Literal

from .generate_models import Language


class SlidesGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200, description="Thema der Folien")
    slide_count: int = Field(10, ge=5, le=30, description="Anzahl der Folien")
    language: Language = Field(Language.de, description="Sprache (ISO-Code), z.B. 'de' oder 'en'")
    context_text: Optional[str] = None
    upload_context: Optional[str] = None


class SlidesGenerateResponse(BaseModel):
    status: str
    request_id: UUID

class SlideOutlineItem(BaseModel):
    position: int
    slide_type: Literal["title", "content", "closing"]
    title: str

class SlideDraft(BaseModel):
    position: int
    slide_type: Literal["title", "content", "closing"]
    title: str
    bullets: list[str]