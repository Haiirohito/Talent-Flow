import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.config import settings
from app.core.security import get_password_hash
from app.users import crud
from app.users.models import (
    User,
    UserPublic,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["private"], prefix="/private")


class PrivateUserCreate(BaseModel):
    email: str
    password: str  # noqa: S107
    full_name: str


@router.post("/users/", response_model=UserPublic)
def create_user(user_in: PrivateUserCreate, session: SessionDep) -> Any:
    """
    Create a new user (private/local-only endpoint).
    """
    # Runtime environment guard — defense-in-depth in case the router
    # is accidentally registered in a non-local deployment.
    if settings.ENVIRONMENT != "local":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available in the local environment",
        )

    logger.warning(
        "Private user creation endpoint used (email=%s). "
        "This endpoint has no authentication and should only be used locally.",
        user_in.email,
    )

    # Check for existing user to prevent UniqueViolation crash
    existing = crud.get_user_by_email(session=session, email=user_in.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )

    session.add(user)
    session.commit()
    session.refresh(user)  # Ensure returned data has id, created_at populated

    return user
