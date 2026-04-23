from uuid import UUID
from pydantic import BaseModel, Field


class FinalizeSlidesRequest(BaseModel):
    request_id: UUID
    name: str = Field(..., min_length=3, description="Name des Folien-Decks")


class FinalizeSlidesResponse(BaseModel):
    deck_id: UUID
    saved_slides_count: int