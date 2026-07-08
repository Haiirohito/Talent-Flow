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
    TicketAssignRecruiters,
    TicketAssignmentRead,
    TicketAssignTeamLead,
    TicketCreate,
    TicketRead,
    TicketReadWithTransitions,
    TicketReopenCreate,
    TicketReopenRequestRead,
    TicketReopenRequestsPublic,
    TicketReopenReview,
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
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """Retrieve a paginated list of tickets."""
    return service.list_tickets(session=session, current_user=current_user, skip=skip, limit=limit)


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
    "/{ticket_id}/reopen-request",
    dependencies=[Depends(require_permissions(Permission.TICKETS_UPDATE))],
    response_model=TicketReopenRequestRead,
)
def request_reopen(
    *, session: SessionDep, current_user: CurrentUser, ticket_id: uuid.UUID, body: TicketReopenCreate
) -> Any:
    """Request to reopen a closed or cancelled ticket."""
    return service.request_reopen(
        session=session, ticket_id=ticket_id, request_in=body, current_user=current_user
    )


@router.get(
    "/reopen-requests/all",
    dependencies=[Depends(require_permissions(Permission.TICKETS_REOPEN_APPROVE))],
    response_model=TicketReopenRequestsPublic,
)
def list_reopen_requests(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """Retrieve a paginated list of reopen requests."""
    return service.list_reopen_requests(session=session, skip=skip, limit=limit)


@router.post(
    "/reopen-requests/{request_id}/review",
    dependencies=[Depends(require_permissions(Permission.TICKETS_REOPEN_APPROVE))],
    response_model=TicketReopenRequestRead,
)
def review_reopen_request(
    *, session: SessionDep, current_user: CurrentUser, request_id: uuid.UUID, body: TicketReopenReview, action: str = Query(...)  # noqa: E501
) -> Any:
    """Review a reopen request (approve or reject)."""
    return service.review_reopen_request(
        session=session, request_id=request_id, review_in=body, action=action, current_user=current_user
    )

@router.delete(
    "/reopen-requests/{request_id}",
    dependencies=[Depends(require_permissions(Permission.DASHBOARD_ADMIN))],
)
def delete_reopen_request(
    *, session: SessionDep, request_id: uuid.UUID
) -> Any:
    """Delete a reopen request (Admin only)."""
    return service.delete_reopen_request(session=session, request_id=request_id)
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


# ---------------------------------------------------------------------------
# Ticket Assignment
# ---------------------------------------------------------------------------


@router.post(
    "/{ticket_id}/assign-team-lead",
    dependencies=[Depends(require_permissions(Permission.TICKETS_ASSIGN))],
    response_model=TicketRead,
)
def assign_team_lead(
    *, session: SessionDep, current_user: CurrentUser, ticket_id: uuid.UUID, body: TicketAssignTeamLead
) -> Any:
    """Assign or unassign a team lead to a ticket."""
    return service.assign_team_lead(
        session=session, ticket_id=ticket_id, body=body, current_user=current_user
    )


@router.post(
    "/{ticket_id}/assign-recruiters",
    dependencies=[Depends(require_permissions(Permission.TICKETS_ASSIGN))],
    response_model=list[TicketAssignmentRead],
)
def assign_recruiters(
    *, session: SessionDep, current_user: CurrentUser, ticket_id: uuid.UUID, body: TicketAssignRecruiters
) -> Any:
    """Assign recruiters from the team lead's team to a ticket."""
    return service.assign_recruiters(
        session=session, ticket_id=ticket_id, body=body, current_user=current_user
    )


@router.get(
    "/{ticket_id}/assignments",
    dependencies=[Depends(require_permissions(Permission.TICKETS_READ))],
    response_model=list[TicketAssignmentRead],
)
def get_ticket_assignments(
    *, session: SessionDep, ticket_id: uuid.UUID
) -> Any:
    """Get all recruiter assignments for a ticket."""
    return service.get_ticket_assignments(session=session, ticket_id=ticket_id)


@router.delete(
    "/{ticket_id}/assignments/{recruiter_id}",
    dependencies=[Depends(require_permissions(Permission.TICKETS_ASSIGN))],
    response_model=Message,
)
def remove_recruiter_assignment(
    *, session: SessionDep, current_user: CurrentUser, ticket_id: uuid.UUID, recruiter_id: uuid.UUID
) -> Any:
    """Remove a recruiter assignment from a ticket."""
    service.remove_recruiter_assignment(
        session=session, ticket_id=ticket_id, recruiter_id=recruiter_id, current_user=current_user
    )
    return Message(message="Recruiter removed from ticket")
