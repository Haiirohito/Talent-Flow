"""Requirement Ticket — Database model and enums.

The Requirement Ticket is the Aggregate Root of the TalentFlow system.
It stores only high-level workflow information; every other module
(Candidates, Interviews, Billing, etc.) references it via ticket_id.
"""

import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class TicketStage(StrEnum):
    """Lifecycle stages of a recruitment requirement."""

    REQUIREMENT_CREATED = "requirement_created"
    CANDIDATES_ADDED = "candidates_added"
    INTERVIEW_DATE_PENDING = "interview_date_pending"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    CANDIDATE_CONFIRMATION_PENDING = "candidate_confirmation_pending"
    INTERVIEW_COMPLETED = "interview_completed"
    SELECTED = "selected"
    JOINING_PENDING = "joining_pending"
    JOINED = "joined"
    BILLING_PENDING = "billing_pending"
    COLLECTION_RUNNING = "collection_running"
    CLOSED = "closed"


class TicketStatus(StrEnum):
    """Operational status of a ticket."""

    ACTIVE = "active"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class TicketPriority(StrEnum):
    """Priority levels for a ticket."""

    DEFAULT = "default"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def _get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Database model
# ---------------------------------------------------------------------------


class RequirementTicket(SQLModel, table=True):
    __tablename__ = "requirement_ticket"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    ticket_number: str = Field(index=True, unique=True)

    title: str = Field(max_length=255)
    description: str | None = Field(default=None)

    vacancies: int = Field(default=1, ge=1)

    priority: str = Field(default=TicketPriority.DEFAULT)
    stage: str = Field(default=TicketStage.REQUIREMENT_CREATED)
    status: str = Field(default=TicketStatus.ACTIVE)

    is_deleted: bool = Field(default=False, index=True)

    created_by: uuid.UUID = Field(foreign_key="users.id")

    created_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    updated_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
