"""Requirement Ticket — Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.ticket.models import TicketPriority, TicketStage, TicketStatus

# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TicketCreate(SQLModel):
    """Fields the user provides when creating a ticket."""

    client_id: uuid.UUID
    title: str
    description: str | None = None
    vacancies: int = Field(default=1, ge=1)
    priority: TicketPriority = TicketPriority.DEFAULT


# ---------------------------------------------------------------------------
# Update (data-only — stage/status go through workflow endpoints)
# ---------------------------------------------------------------------------


class TicketUpdate(SQLModel):
    """All fields optional — only provided fields are updated.

    NOTE: current_stage and status are NOT here. They are changed
    exclusively through the workflow endpoints (/transition, /close, etc.).
    """

    title: str | None = None
    description: str | None = None
    vacancies: int | None = Field(default=None, ge=1)
    priority: TicketPriority | None = None


# ---------------------------------------------------------------------------
# Workflow actions
# ---------------------------------------------------------------------------


class TicketTransitionStage(SQLModel):
    """Request body for stage transition."""

    target_stage: TicketStage


class TicketTransitionStatus(SQLModel):
    """Request body for status transition."""

    target_status: TicketStatus


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


class TicketRead(SQLModel):
    """Full ticket response returned to the client."""

    id: uuid.UUID
    ticket_number: str
    client_id: uuid.UUID
    title: str
    description: str | None = None
    vacancies: int
    priority: str
    current_stage: str
    status: str
    assigned_team_lead_id: uuid.UUID | None = None
    assigned_team_lead_name: str | None = None
    created_by: uuid.UUID
    deleted_at: datetime | None = None
    deleted_by: uuid.UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TicketReadWithTransitions(TicketRead):
    """Ticket response enriched with valid next transitions."""

    valid_next_stages: list[str] = []
    valid_next_statuses: list[str] = []
    assigned_team_lead_name: str | None = None
    assigned_recruiters: list[dict] = []


class TicketsPublic(SQLModel):
    """Paginated list of tickets."""

    data: list[TicketRead]
    count: int


# ---------------------------------------------------------------------------
# Reopen Requests
# ---------------------------------------------------------------------------


class TicketReopenCreate(SQLModel):
    reason: str


class TicketReopenReview(SQLModel):
    notes: str | None = None


class TicketReopenRequestRead(SQLModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    requested_by: uuid.UUID
    reason: str
    status: str
    reviewed_by: uuid.UUID | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TicketReopenRequestsPublic(SQLModel):
    data: list[TicketReopenRequestRead]
    count: int


# ---------------------------------------------------------------------------
# Ticket Assignment
# ---------------------------------------------------------------------------


class TicketAssignTeamLead(SQLModel):
    """Assign a team lead to a ticket."""
    team_lead_id: uuid.UUID | None = None  # None to unassign


class TicketAssignRecruiters(SQLModel):
    """Assign recruiters to a ticket (from the team lead's team)."""
    recruiter_ids: list[uuid.UUID]


class TicketAssignmentRead(SQLModel):
    """Recruiter assignment on a ticket."""
    id: uuid.UUID
    ticket_id: uuid.UUID
    recruiter_id: uuid.UUID
    recruiter_name: str | None = None
    recruiter_email: str | None = None
    assigned_by: uuid.UUID
    assigned_at: datetime | None = None
