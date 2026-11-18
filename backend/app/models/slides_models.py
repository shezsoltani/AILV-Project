from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict

from .generate_models import Language


class SlidesGenerateRequest(BaseModel):
    # KI-Anbieter und Modell wie bei der Fragengenerierung (SCRUM-70).
    # Ohne Angabe bleibt alles wie bisher: OpenAI mit dem Standardmodell des Servers.
    provider: str = "openai"
    model: Optional[str] = None
    topic: str = Field(..., min_length=3, max_length=200, description="Thema der Folien")
    slide_count: int = Field(10, ge=5, le=30, description="Anzahl der Folien")
    language: Language = Field(Language.de, description="Sprache (ISO-Code), z.B. 'de' oder 'en'")
    context_text: Optional[str] = None
    upload_context: Optional[str] = None
    custom_prompts: Optional[Dict[str, str]] = None

class SlideOutlineItem(BaseModel):
    position: int
    slide_type: Literal["title", "content", "closing"]
    title: str

class SlideDraft(BaseModel):
    position: int
    slide_type: Literal["title", "content", "closing"]
    title: str
    bullets: list[str]
    examples: list[str] = Field(default_factory=list)

class SlidesGenerateResponse(BaseModel):
    status: str
    request_id: UUID
    slides: list[SlideDraft] = Field(default_factory=list)