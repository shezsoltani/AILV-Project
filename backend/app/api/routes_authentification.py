from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.auth_models import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    PasswordChangeRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..services.auth.auth_service import (
    register_user,
    login_user,
    change_user_password,
    request_password_reset,
    reset_password_with_token,
)
from ..core.auth_utils import get_current_user
from ..models.sql_models import User

router = APIRouter(prefix="/auth", tags=["auth"])


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

@router.put("/password", status_code=status.HTTP_200_OK)
def change_password(
    body: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_user_password(
        db,
        current_user,
        body.current_password,
        body.new_password,
    )
    return {"message": "Password updated"}

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    await request_password_reset(db, body.email)
    # Immer 200, egal ob E-Mail existiert oder nicht
    return {"message": "If the account exists, a reset email has been sent."}
@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    reset_password_with_token(db, body.token, body.new_password)
    return {"message": "Password has been reset successfully."}