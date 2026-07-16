"""FastAPI dependency injection for authentication and database sessions."""

import uuid
from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.core.permissions import UserRole
from app.users.models import User
from app.users.schemas import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[security.ALGORITHM],
            issuer=settings.PROJECT_NAME,
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise credentials_exception from None

    # Validate sub field exists and is a valid UUID
    if not token_data.sub:
        raise credentials_exception
    try:
        user_id = uuid.UUID(token_data.sub)
    except ValueError:
        raise credentials_exception from None

    user = session.get(User, user_id)
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    """Backward-compatible dependency. Prefer require_permissions() for new routes."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
