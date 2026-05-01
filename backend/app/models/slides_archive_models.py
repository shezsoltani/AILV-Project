from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DeckSlideItem(BaseModel):
    id: UUID
    position: int
    slide_type: str | None = None
    title: str | None = None
    bullets: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)
    created_at: datetime | None = None


class DeckListItem(BaseModel):
    id: UUID
    request_id: UUID | None = None
    name: str
    created_at: datetime | None = None
    slide_count: int = 0


class DeckListResponse(BaseModel):
    decks: list[DeckListItem] = Field(default_factory=list)


class DeckDetailResponse(BaseModel):
    id: UUID
    request_id: UUID | None = None
    name: str
    created_at: datetime | None = None
    slides: list[DeckSlideItem] = Field(default_factory=list)


class DeckDeleteResponse(BaseModel):
    success: bool
    deck_id: UUID
    message: str

class SlideUpdateItem(BaseModel):
    position: int
    slide_type: str | None = None
    title: str | None = None
    bullets: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)

class DeckUpdateRequest(BaseModel):
    slides: list[SlideUpdateItem] = Field(default_factory=list)
