from uuid import UUID
from sqlalchemy.orm import Session
from typing import List

from ..models.sql_models import GeneratedSlide as ORMGeneratedSlide

def store_generated_slides(
    db: Session,
    *,
    request_id: UUID,
    prompt_id: UUID,
    stage: str,
    slides: list[dict],
) -> List[ORMGeneratedSlide]:
    objs: List[ORMGeneratedSlide] = []

    for s in slides:
        obj = ORMGeneratedSlide(
            request_id=request_id,
            prompt_id=prompt_id,
            stage=stage,
            position=s.get("position"),
            slide_type=s.get("slide_type"),
            title=s.get("title"),
            bullets=s.get("bullets"),
            examples=s.get("examples", []),
        )
        objs.append(obj)

    db.add_all(objs)
    db.commit()

    for obj in objs:
        db.refresh(obj)

    return objs


def get_generated_slides_by_request(
    db: Session,
    request_id: UUID,
) -> List[ORMGeneratedSlide]:
    return (
        db.query(ORMGeneratedSlide)
        .filter(ORMGeneratedSlide.request_id == request_id)
        .order_by(ORMGeneratedSlide.position.asc())
        .all()
    )


def delete_generated_slides_by_request(
    db: Session,
    request_id: UUID,
) -> int:
    deleted = (
        db.query(ORMGeneratedSlide)
        .filter(ORMGeneratedSlide.request_id == request_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted