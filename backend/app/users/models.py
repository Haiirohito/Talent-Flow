import uuid
from datetime import datetime, timezone
from enum import StrEnum

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

# ---------------------------------------------------------------------------
# User Roles — extensible enum, add new roles here
# ---------------------------------------------------------------------------


class UserRole(StrEnum):
    """Extensible user roles. Add new roles here and update ROLE_PERMISSIONS in permissions.py."""

    ADMIN = "admin"
    HR_MANAGER = "hr_manager"
    RECRUITER = "recruiter"
    EMPLOYEE = "employee"
    VIEWER = "viewer"


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------


# Shared Properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.EMPLOYEE)





# Database model, database table inferred from class name
class User(UserBase, table=True):
    __tablename__ = "users" # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )

    @property
    def is_superuser(self) -> bool:
        """Backward-compatible property. Returns True if the user is an admin."""
        return self.role == UserRole.ADMIN



