"""Requirement Ticket — HTTP router.

Thin layer: every endpoint simply calls the appropriate service function.
Workflow actions (stage/status transitions) have dedicated endpoints.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.permissions import Permission, require_permissions
from app.ticket import service
from app.ticket.schemas import (
    TicketCreate,
    TicketRead,
    TicketReadWithTransitions,
    TicketsPublic,
    TicketTransitionStage,
    TicketTransitionStatus,
    TicketUpdate,
)
from app.users.schemas import Message

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.post(
    "/",
    dependencies=[Depends(require_permissions(Permission.TICKETS_CREATE))],
    response_model=TicketRead,
)
def create_ticket(
    *, session: SessionDep, ticket_in: TicketCreate, current_user: CurrentUser
) -> Any:
    """Create a new requirement ticket."""
    return service.create_ticket(
        session=session, ticket_in=ticket_in, current_user=current_user
    )


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
    response_model=TicketReadWithTransitions,
)
def get_ticket(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Retrieve a single ticket by ID, enriched with valid transitions."""
    return service.get_ticket_with_transitions(session=session, ticket_id=ticket_id)


@router.patch(
    "/{ticket_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def update_ticket(
    *, session: SessionDep, ticket_id: uuid.UUID, ticket_in: TicketUpdate
) -> Any:
    """Update ticket data fields (not stage or status)."""
    return service.update_ticket(
        session=session, ticket_id=ticket_id, ticket_in=ticket_in
    )


@router.delete(
    "/{ticket_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_DELETE))],
    response_model=Message,
)
def delete_ticket(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    ticket_id: uuid.UUID,
    permanent: bool = Query(default=False),
) -> Any:
    """Delete a ticket. Soft-delete by default; set permanent=true for hard delete."""
    service.delete_ticket(
        session=session,
        ticket_id=ticket_id,
        current_user=current_user,
        permanent=permanent,
    )
    if permanent:
        return Message(message="Ticket permanently deleted")
    return Message(message="Ticket deleted successfully")


# ---------------------------------------------------------------------------
# Workflow actions
# ---------------------------------------------------------------------------


@router.post(
    "/{ticket_id}/transition-stage",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketReadWithTransitions,
)
def transition_stage(
    *, session: SessionDep, ticket_id: uuid.UUID, body: TicketTransitionStage
) -> Any:
    """Transition a ticket to a new stage (validated by the workflow layer)."""
    service.transition_stage(
        session=session, ticket_id=ticket_id, target_stage=body.target_stage
    )
    return service.get_ticket_with_transitions(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/transition-status",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketReadWithTransitions,
)
def transition_status(
    *, session: SessionDep, ticket_id: uuid.UUID, body: TicketTransitionStatus
) -> Any:
    """Transition a ticket to a new status (validated by the workflow layer)."""
    service.transition_status(
        session=session, ticket_id=ticket_id, target_status=body.target_status
    )
    return service.get_ticket_with_transitions(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/close",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def close_ticket(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Close a ticket (business action)."""
    return service.close_ticket(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/reopen",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def reopen_ticket(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Reopen a closed or cancelled ticket."""
    return service.reopen_ticket(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/hold",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def put_on_hold(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Put a ticket on hold."""
    return service.put_on_hold(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/resume",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def resume_ticket(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Resume a ticket that was on hold."""
    return service.resume_ticket(session=session, ticket_id=ticket_id)


@router.post(
    "/{ticket_id}/cancel",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketRead,
)
def cancel_ticket(*, session: SessionDep, ticket_id: uuid.UUID) -> Any:
    """Cancel a ticket."""
    return service.cancel_ticket(session=session, ticket_id=ticket_id)
