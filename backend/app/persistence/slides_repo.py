from uuid import UUID
from sqlalchemy.orm import Session

from ..models.sql_models import SlideDeck, Slide

def create_slide_deck(
    db: Session,
    user_id: UUID,
    name: str,
    slides_data: list[dict],
    request_id: UUID | None = None,
) -> SlideDeck:
    deck = SlideDeck(
        user_id=user_id,
        name=name,
        request_id=request_id,
    )
    db.add(deck)
    db.flush()  # deck.id verfügbar, noch kein commit

    for s in slides_data:
        slide = Slide(
            deck_id=deck.id,
            position=s["position"],
            slide_type=s.get("slide_type"),
            title=s.get("title"),
            bullets=s.get("bullets"),
        )
        db.add(slide)

    db.commit()
    db.refresh(deck)
    return deck

def get_slide_decks_by_user(db: Session, user_id: UUID) -> list[SlideDeck]:
    return (
        db.query(SlideDeck)
        .filter(SlideDeck.user_id == user_id)
        .order_by(SlideDeck.created_at.desc())
        .all()
    )

def get_slide_deck_by_id(db: Session, deck_id: UUID, user_id: UUID) -> SlideDeck | None:
    return (
        db.query(SlideDeck)
        .filter(SlideDeck.id == deck_id, SlideDeck.user_id == user_id)
        .first()
    )

def delete_slide_deck(db: Session, deck_id: UUID, user_id: UUID) -> bool:
    deck = get_slide_deck_by_id(db, deck_id, user_id)
    if not deck:
        return False
    db.delete(deck)
    db.commit()
    return True