from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.auth_models import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from ..services.auth.auth_service import (
    register_user,
    login_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(
    req: UserCreate,
    db: Session = Depends(get_db),
):

    user = register_user(db, req)

    return user


@router.post("/login", response_model=TokenResponse)
def login(
    req: UserLogin,
    db: Session = Depends(get_db),
):

    token = login_user(db, req)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )