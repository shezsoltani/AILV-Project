from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import secrets

from ...models.sql_models import User, PasswordResetToken
from ...models.auth_models import UserCreate, UserLogin
from ...core.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
)
from ...core.email_utils import send_reset_email

def register_user(db: Session, req: UserCreate) -> User:

    existing_username = (
        db.query(User)
        .filter(User.username == req.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Username already exists",
                "code": "auth_username_exists",
            },
        )

    existing_email = (
        db.query(User)
        .filter(User.email == req.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Email already exists",
                "code": "auth_email_exists",
            },
        )

    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, req: UserLogin) -> str:

    user = db.query(User).filter(
        User.username == req.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Invalid username or password",
                "code": "auth_invalid_credentials",
            },
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Invalid username or password",
                "code": "auth_invalid_credentials",
            },
        )

    token = create_access_token(
        {"sub": str(user.id)}
    )

    return token

def change_user_password(db: Session, user: User, current_password: str, new_password: str,) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Current password is incorrect",
                "code": "auth_current_password_incorrect",
            },
        )
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)

async def request_password_reset(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    # Immer gleiches Verhalten nach außen (kein User-Enumeration-Leak)
    if not user:
        return
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    reset_entry = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=expires_at,
        used=False,
    )
    db.add(reset_entry)
    db.commit()
    await send_reset_email(user.email, raw_token)

def reset_password_with_token(db: Session, token: str, new_password: str) -> None:
    reset_entry = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == token)
        .first()
    )
    if not reset_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )
    if reset_entry.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token was already used",
        )
    if reset_entry.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired",
        )
    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )
    user.password_hash = hash_password(new_password)
    reset_entry.used = True
    db.commit()