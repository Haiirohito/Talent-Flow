"""Requirement Ticket — Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.ticket.models import TicketPriority, TicketStage, TicketStatus

# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TicketCreate(SQLModel):
    """Fields the user provides when creating a ticket."""

    title: str
    description: str | None = None
    vacancies: int = 1
    priority: TicketPriority = TicketPriority.DEFAULT


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


class TicketUpdate(SQLModel):
    """All fields optional — only provided fields are updated."""

    title: str | None = None
    description: str | None = None
    vacancies: int | None = None
    priority: TicketPriority | None = None
    stage: TicketStage | None = None
    status: TicketStatus | None = None


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


class TicketRead(SQLModel):
    """Full ticket response returned to the client."""

    id: uuid.UUID
    ticket_number: str
    title: str
    description: str | None = None
    vacancies: int
    priority: str
    stage: str
    status: str
    created_by: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TicketsPublic(SQLModel):
    """Paginated list of tickets."""

    data: list[TicketRead]
    count: int
