"""Requirement Ticket — Database model and enums.

The Requirement Ticket is the Aggregate Root of the TalentFlow system.
It stores only high-level workflow information; every other module
(Candidates, Interviews, Billing, etc.) references it via ticket_id.
"""

import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime, String
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
    INTERVIEW_FEEDBACK_PENDING = "interview_feedback_pending"
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
    model_config = {"use_enum_values": True}

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    client_id: uuid.UUID = Field(foreign_key="clients.id")

    ticket_number: str = Field(index=True, unique=True)

    title: str = Field(max_length=255)
    description: str | None = Field(default=None)

    vacancies: int = Field(default=1, ge=1)

    priority: TicketPriority = Field(sa_type=String)
    current_stage: TicketStage = Field(sa_type=String)
    status: TicketStatus = Field(sa_type=String)

    # Assignment
    assigned_team_lead_id: uuid.UUID | None = Field(
        default=None, foreign_key="users.id"
    )

    # Soft-delete fields
    deleted_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
        index=True,
    )
    deleted_by: uuid.UUID | None = Field(default=None, foreign_key="users.id")

    created_by: uuid.UUID = Field(foreign_key="users.id")

    created_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    updated_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )


class TicketRecruiterAssignment(SQLModel, table=True):
    """A recruiter assigned to work on a specific ticket."""

    __tablename__ = "ticket_recruiter_assignment"  # type: ignore

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    ticket_id: uuid.UUID = Field(foreign_key="requirement_ticket.id", index=True)
    recruiter_id: uuid.UUID = Field(foreign_key="users.id")
    assigned_by: uuid.UUID = Field(foreign_key="users.id")

    assigned_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )


class ReopenRequestStatus(StrEnum):
    """Status of a request to reopen a closed or cancelled ticket."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TicketReopenRequest(SQLModel, table=True):
    __tablename__ = "ticket_reopen_request"  # type: ignore
    model_config = {"use_enum_values": True}

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    ticket_id: uuid.UUID = Field(foreign_key="requirement_ticket.id", index=True)
    
    requested_by: uuid.UUID = Field(foreign_key="users.id")
    reason: str = Field(max_length=1000)

    status: ReopenRequestStatus = Field(sa_type=String, default=ReopenRequestStatus.PENDING)

    reviewed_by: uuid.UUID | None = Field(default=None, foreign_key="users.id")
    review_notes: str | None = Field(default=None, max_length=1000)
    reviewed_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )

    created_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    updated_at: datetime | None = Field(
        default_factory=_get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )

