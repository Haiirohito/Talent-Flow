import uuid
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, SQLModel

from app.candidate.models import CandidateBase

# ---------------------------------------------------------------------------
# Candidate schemas
# ---------------------------------------------------------------------------


# Properties to receive via API on creation (used for JSON-only creates)
class CandidateCreate(CandidateBase):
    # resume_filename and resume_path are set server-side, not by the client
    resume_filename: str | None = None
    resume_path: str | None = None


# Properties to receive via API on update — all optional for partial update
class CandidateUpdate(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    skills: str | None = Field(default=None)
    notes: str | None = Field(default=None)
    is_active: bool | None = None


# Properties to return via API, id is always required
class CandidatePublic(CandidateBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # Exclude internal server path from public API responses
    resume_path: str | None = Field(default=None, exclude=True)


class CandidatesPublic(SQLModel):
    data: list[CandidatePublic]
    count: int
