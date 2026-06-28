"""Requirement Ticket — HTTP router.

Thin layer: every endpoint simply calls the appropriate service function.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.permissions import Permission, require_permissions
from app.ticket import service
from app.ticket.schemas import TicketCreate, TicketRead, TicketsPublic, TicketUpdate
from app.users.schemas import Message

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post(
    "/",
    dependencies=[Depends(require_permissions(Permission.TICKETS_CREATE))],
    response_model=TicketRead,
)
def create_ticket(*, session: SessionDep, ticket_in: TicketCreate, current_user: CurrentUser) -> Any:
    """Create a new requirement ticket."""
    return service.create_ticket(session=session, ticket_in=ticket_in, current_user=current_user)


@router.get(
    "/",
    dependencies=[Depends(require_permissions(Permission.TICKETS_READ))],
    response_model=TicketsPublic,
)
def list_tickets(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """Retrieve a paginated list of tickets."""
    return service.list_tickets(session=session, skip=skip, limit=limit)


@router.get(
    "/{ticket_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_READ))],
    response_model=TicketRead,
)
def get_ticket(*, session: SessionDep, ticket_number: str) -> Any:
    """Retrieve a single ticket by ID."""
    return service.get_ticket_by_number(session=session, ticket_number=ticket_number)


@router.patch(
    "/{ticket_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def update_ticket(*, session: SessionDep, ticket_id: uuid.UUID, ticket_in: TicketUpdate) -> Any:
    """Update a ticket (partial update)."""
    return service.update_ticket(session=session, ticket_id=ticket_id, ticket_in=ticket_in)


@router.delete(
    "/{ticket_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_DELETE))],
    response_model=Message,
)
def delete_ticket(*, session: SessionDep, ticket_id: uuid.UUID, permanent: bool = Query(default=False)) -> Any:
    """Delete a ticket. Soft-delete by default; set permanent=true for hard delete."""
    service.delete_ticket(session=session, ticket_id=ticket_id, permanent=permanent)
    if permanent:
        return Message(message="Ticket permanently deleted")
    return Message(message="Ticket deleted successfully")
