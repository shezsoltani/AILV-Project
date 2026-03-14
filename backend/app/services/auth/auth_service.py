from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ...models.sql_models import User
from ...models.auth_models import UserCreate, UserLogin
from ...core.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
)


def register_user(db: Session, req: UserCreate) -> User:

    existing_username = (
        db.query(User)
        .filter(User.username == req.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == req.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
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
            detail="Invalid username or password",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(
        {"sub": str(user.id)}
    )

    return token