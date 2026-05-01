from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ...models.slides_finalize_models import FinalizeSlidesRequest, FinalizeSlidesResponse
from ...models.sql_models import GenerationRequest
from ...persistence.slides_draft_repo import (
    get_generated_slides_by_request,
    delete_generated_slides_by_request,
)
from ...persistence.slides_repo import create_slide_deck
from ...core.exceptions import FinalizeStateError


def finalize_slides(
    *,
    db: Session,
    req: FinalizeSlidesRequest,
    user_id: UUID,
) -> FinalizeSlidesResponse:
    # Ownership prüfen
    generation_req = db.query(GenerationRequest).filter(
        GenerationRequest.id == req.request_id
    ).first()

    if not generation_req:
        raise HTTPException(status_code=404, detail="Generation request not found.")

    if generation_req.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Drafts laden
    drafts = get_generated_slides_by_request(db, req.request_id)

    if not drafts:
        raise FinalizeStateError("No generated slides found for this request.")

    # Drafts in finale Tabellen übertragen
    slides_data = [
        {
            "position": s.position,
            "slide_type": s.slide_type,
            "title": s.title,
            "bullets": s.bullets,
            "examples": s.examples or [],
        }
        for s in drafts
    ]

    deck = create_slide_deck(
        db=db,
        user_id=user_id,
        name=req.name,
        slides_data=slides_data,
        request_id=req.request_id,
    )

    # Drafts löschen — create_slide_deck hat bereits committed,
    # delete macht ein eigenes commit
    delete_generated_slides_by_request(db, req.request_id)

    return FinalizeSlidesResponse(
        deck_id=deck.id,
        saved_slides_count=len(drafts),
    )