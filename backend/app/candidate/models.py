import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Candidate model
# ---------------------------------------------------------------------------


# Shared Properties
class CandidateBase(SQLModel):
    full_name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    skills: str | None = Field(default=None)  # comma-separated skills
    resume_filename: str | None = Field(default=None, max_length=500)
    resume_path: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None)
    is_active: bool = True


# Database model
class Candidate(CandidateBase, table=True):
    __tablename__ = "candidates"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
