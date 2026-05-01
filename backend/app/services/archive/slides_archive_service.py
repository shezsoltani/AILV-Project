from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ...models.slides_archive_models import (
    DeckDeleteResponse,
    DeckDetailResponse,
    DeckListItem,
    DeckListResponse,
    DeckSlideItem,
)
from ...persistence.slides_repo import (
    delete_slide_deck,
    get_slide_deck_by_id,
    get_slide_decks_by_user,
    update_slide_deck_slides,
)


def list_user_decks(db: Session, user_id: UUID) -> DeckListResponse:
    decks = get_slide_decks_by_user(db, user_id)
    return DeckListResponse(
        decks=[
            DeckListItem(
                id=deck.id,
                request_id=deck.request_id,
                name=deck.name,
                created_at=deck.created_at,
                slide_count=len(deck.slides or []),
            )
            for deck in decks
        ]
    )


def get_deck_with_slides(db: Session, deck_id: UUID, user_id: UUID) -> DeckDetailResponse:
    deck = get_slide_deck_by_id(db, deck_id, user_id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    return DeckDetailResponse(
        id=deck.id,
        request_id=deck.request_id,
        name=deck.name,
        created_at=deck.created_at,
        slides=[
            DeckSlideItem(
                id=slide.id,
                position=slide.position,
                slide_type=slide.slide_type,
                title=slide.title,
                bullets=slide.bullets or [],
                examples=slide.examples or [],
                created_at=slide.created_at,
            )
            for slide in deck.slides
        ],
    )


def remove_deck(db: Session, deck_id: UUID, user_id: UUID) -> DeckDeleteResponse:
    deleted = delete_slide_deck(db, deck_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    return DeckDeleteResponse(
        success=True,
        deck_id=deck_id,
        message="Deck deleted successfully",
    )

def modify_deck(db: Session, deck_id: UUID, user_id: UUID, slides_data: list[dict]) -> DeckDetailResponse:
    deck = update_slide_deck_slides(db, deck_id, user_id, slides_data)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
        
    return DeckDetailResponse(
        id=deck.id,
        request_id=deck.request_id,
        name=deck.name,
        created_at=deck.created_at,
        slides=[
            DeckSlideItem(
                id=slide.id,
                position=slide.position,
                slide_type=slide.slide_type,
                title=slide.title,
                bullets=slide.bullets or [],
                examples=slide.examples or [],
                created_at=slide.created_at,
            )
            for slide in deck.slides
        ],
    )
