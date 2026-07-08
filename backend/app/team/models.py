"""Team — Database model.

Persistent Team Lead → Recruiter relationship.
A Team Lead manages a set of Recruiters who can be assigned to tickets.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


def _get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class TeamMember(SQLModel, table=True):
    """A recruiter belonging to a team lead's team."""

    __tablename__ = "team_member"  # type: ignore
    __table_args__ = (
        UniqueConstraint("team_lead_id", "recruiter_id", name="uq_team_lead_recruiter"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    team_lead_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    recruiter_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    added_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
