from sqlalchemy.orm import Session
from ..models.sql_models import GenerationRequest as ORMGenReq
from ..models.generate_models import (
    GenerateRequest
)
from uuid import UUID

def create_generation_request_db(db: Session, req: GenerateRequest, user_id: UUID):
    db_req = ORMGenReq(
        user_id=user_id,
        topic=req.topic,
        language=req.language.value if hasattr(req.language, "value") else str(req.language),
        count=req.count,
        types=req.types,
        difficulty_distribution=req.difficulty_distribution,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)

    return db_req