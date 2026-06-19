from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError

from app.core import security
from app.core.config import settings


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def generate_invitation_token(email: str, role: str) -> str:
    """Generate a JWT token for email-based invitations."""
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email, "role": role, "type": "invitation"},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None


def verify_invitation_token(token: str) -> dict[str, str] | None:
    """Verify an invitation token and return {email, role} or None."""
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        if decoded_token.get("type") != "invitation":
            return None
        return {"email": str(decoded_token["sub"]), "role": str(decoded_token["role"])}
    except InvalidTokenError:
        return None
