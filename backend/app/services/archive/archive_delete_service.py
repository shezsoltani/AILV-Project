from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ...models.sql_models import User
from ...persistence.archive_repo import (
    delete_generation_request,
    get_generation_request_by_id,
)


def delete_archive_entry(db: Session, request_id: UUID, current_user: User) -> dict:
    generation_request = get_generation_request_by_id(db, request_id)
    if not generation_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if generation_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this resource",
        )
    delete_generation_request(db, generation_request)
    return {
        "success": True,
        "request_id": request_id,
        "message": "Archive entry deleted successfully",
    }