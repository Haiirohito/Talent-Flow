"""Team — Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class TeamMemberAdd(SQLModel):
    """Add a recruiter to the team lead's team."""
    recruiter_id: uuid.UUID


class TeamMemberTransfer(SQLModel):
    """Transfer a recruiter from one team lead to another."""
    recruiter_id: uuid.UUID
    target_team_lead_id: uuid.UUID


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TeamMemberRead(SQLModel):
    """A team member with user details."""
    id: uuid.UUID
    team_lead_id: uuid.UUID
    recruiter_id: uuid.UUID
    recruiter_name: str | None = None
    recruiter_email: str | None = None
    recruiter_role: str | None = None
    added_at: datetime | None = None


class TeamMembersPublic(SQLModel):
    """List of team members."""
    data: list[TeamMemberRead]
    count: int


class TeamLeadInfo(SQLModel):
    """Basic info about a team lead (for listing available team leads)."""
    id: uuid.UUID
    full_name: str | None = None
    email: str
