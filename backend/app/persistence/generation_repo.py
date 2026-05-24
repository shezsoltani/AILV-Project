from sqlalchemy.orm import Session
from ..models.sql_models import GenerationRequest as ORMGenReq
from ..models.generate_models import GenerateRequest
from uuid import UUID
from typing import Optional


def create_generation_request_db(
    db: Session,
    req: GenerateRequest,
    user_id: UUID,
    request_type: str = "questions",
    slide_count: Optional[int] = None,
) -> ORMGenReq:
    db_req = ORMGenReq(
        user_id=user_id,
        request_type=request_type,
        topic=req.topic,
        language=req.language.value if hasattr(req.language, "value") else str(req.language),
        count=req.count,
        slide_count=slide_count,
        types=req.types,
        difficulty_distribution=req.difficulty_distribution,
        context_text=req.context_text,
        upload_context=req.upload_context,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)

    return db_req

def get_generation_request(db: Session, request_id: UUID) -> ORMGenReq | None:
    return db.query(ORMGenReq).filter(ORMGenReq.id == request_id).first()
