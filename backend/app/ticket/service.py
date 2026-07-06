"""Requirement Ticket — Service (business logic layer).

Orchestrates workflow transitions and CRUD operations.
Stage and status changes are delegated to the workflow layer.
"""

import uuid

from sqlmodel import Session

from app.client.models import Client
from app.ticket import repository
from app.ticket.models import RequirementTicket, TicketStage, TicketStatus
from app.ticket.schemas import TicketCreate, TicketsPublic, TicketUpdate
from app.ticket.utils import generate_ticket_number
from app.ticket.workflow import ticket_workflow
from app.ticket.workflow.exceptions import TicketNotFoundError, TicketValidationError
from app.ticket.workflow.transitions import get_valid_next_stages, get_valid_next_statuses
from app.users.models import User

# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


def create_ticket(*, session: Session, ticket_in: TicketCreate, current_user: User) -> RequirementTicket:
    """Validate input, generate a ticket number, and insert a new ticket."""
    if ticket_in.vacancies < 1:
        raise TicketValidationError(detail="Vacancies must be at least 1")

    # Validate client exists
    client = session.get(Client, ticket_in.client_id)
    if not client:
        raise TicketValidationError(detail="Client not found")
    if not client.is_active:
        raise TicketValidationError(detail="Cannot create a ticket for an inactive client")

    ticket_number = generate_ticket_number(session)

    ticket = RequirementTicket(
        ticket_number=ticket_number,
        client_id=ticket_in.client_id,
        title=ticket_in.title,
        description=ticket_in.description,
        vacancies=ticket_in.vacancies,
        priority=ticket_in.priority,
        current_stage=TicketStage.REQUIREMENT_CREATED,
        status=TicketStatus.ACTIVE,
        created_by=current_user.id,
    )

    return repository.create_ticket(session=session, ticket=ticket)


def get_ticket(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Retrieve a ticket by ID or raise 404."""
    ticket = repository.get_ticket(session=session, ticket_id=ticket_id)
    if not ticket:
        raise TicketNotFoundError()
    return ticket


def get_ticket_by_number(*, session: Session, ticket_number: str) -> RequirementTicket:
    """Retrieve a ticket by its human-readable number or raise 404."""
    ticket = repository.get_ticket_by_number(session=session, ticket_number=ticket_number)
    if not ticket:
        raise TicketNotFoundError(detail=f"Ticket '{ticket_number}' not found")
    return ticket


def list_tickets(*, session: Session, skip: int = 0, limit: int = 100) -> TicketsPublic:
    """Return a paginated list of tickets."""
    tickets = repository.list_tickets(session=session, skip=skip, limit=limit)
    count = repository.count_tickets(session=session)
    return TicketsPublic(data=tickets, count=count)  # type: ignore


def update_ticket(*, session: Session, ticket_id: uuid.UUID, ticket_in: TicketUpdate) -> RequirementTicket:
    """Apply a partial data-only update to a ticket.

    Stage and status are NOT modified here — use the workflow methods instead.
    """
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)

    if db_ticket.status in (TicketStatus.CANCELLED, TicketStatus.CLOSED):
        raise TicketValidationError(
            detail=f"Cannot update a {db_ticket.status} ticket. Reopen it first."
        )

    return repository.update_ticket(session=session, db_ticket=db_ticket, ticket_in=ticket_in)


def delete_ticket(
    *, session: Session, ticket_id: uuid.UUID, current_user: User, permanent: bool = False
) -> None:
    """Soft-delete a ticket by default. Use permanent=True for hard delete."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)

    if permanent:
        repository.hard_delete_ticket(session=session, db_ticket=db_ticket)
    else:
        repository.soft_delete_ticket(
            session=session, db_ticket=db_ticket, deleted_by_id=current_user.id
        )


# ---------------------------------------------------------------------------
# Workflow actions
# ---------------------------------------------------------------------------


def transition_stage(
    *, session: Session, ticket_id: uuid.UUID, target_stage: TicketStage
) -> RequirementTicket:
    """Transition a ticket's stage through the workflow layer."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.transition_stage(db_ticket, target_stage)
    return repository.save_ticket(session=session, ticket=db_ticket)


def transition_status(
    *, session: Session, ticket_id: uuid.UUID, target_status: TicketStatus
) -> RequirementTicket:
    """Transition a ticket's status through the workflow layer."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.transition_status(db_ticket, target_status)
    return repository.save_ticket(session=session, ticket=db_ticket)


def close_ticket(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Close a ticket (business action)."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.close_ticket(db_ticket)
    return repository.save_ticket(session=session, ticket=db_ticket)


def reopen_ticket(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Reopen a closed or cancelled ticket (business action)."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.reopen_ticket(db_ticket)
    return repository.save_ticket(session=session, ticket=db_ticket)


def put_on_hold(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Put a ticket on hold (business action)."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.put_on_hold(db_ticket)
    return repository.save_ticket(session=session, ticket=db_ticket)


def resume_ticket(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Resume a ticket that was on hold (business action)."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.resume_ticket(db_ticket)
    return repository.save_ticket(session=session, ticket=db_ticket)


def cancel_ticket(*, session: Session, ticket_id: uuid.UUID) -> RequirementTicket:
    """Cancel a ticket (business action)."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    ticket_workflow.cancel_ticket(db_ticket)
    return repository.save_ticket(session=session, ticket=db_ticket)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_ticket_with_transitions(*, session: Session, ticket_id: uuid.UUID) -> dict:
    """Return a ticket enriched with valid next transitions."""
    ticket = get_ticket(session=session, ticket_id=ticket_id)
    valid_stages = get_valid_next_stages(ticket.current_stage)
    valid_statuses = get_valid_next_statuses(ticket.status)

    ticket_data = ticket.model_dump()
    ticket_data["valid_next_stages"] = [s.value for s in valid_stages]
    ticket_data["valid_next_statuses"] = [s.value for s in valid_statuses]
    return ticket_data


# ---------------------------------------------------------------------------
# Reopen Request
# ---------------------------------------------------------------------------

from app.ticket.models import TicketReopenRequest, ReopenRequestStatus
from app.ticket.schemas import TicketReopenCreate, TicketReopenReview, TicketReopenRequestsPublic
from datetime import datetime, timezone


def request_reopen(*, session: Session, ticket_id: uuid.UUID, request_in: TicketReopenCreate, current_user: User) -> TicketReopenRequest:
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)
    
    if db_ticket.status not in (TicketStatus.CLOSED, TicketStatus.CANCELLED):
        raise TicketValidationError(detail="Can only request reopen for closed or cancelled tickets.")
        
    req = TicketReopenRequest(
        ticket_id=ticket_id,
        requested_by=current_user.id,
        reason=request_in.reason,
        status=ReopenRequestStatus.PENDING
    )
    
    return repository.create_reopen_request(session=session, request=req)


def list_reopen_requests(*, session: Session, skip: int = 0, limit: int = 100) -> TicketReopenRequestsPublic:
    requests = repository.list_reopen_requests(session=session, skip=skip, limit=limit)
    count = repository.count_reopen_requests(session=session)
    return TicketReopenRequestsPublic(data=requests, count=count)  # type: ignore


def review_reopen_request(*, session: Session, request_id: uuid.UUID, review_in: TicketReopenReview, action: str, current_user: User) -> TicketReopenRequest:
    req = repository.get_reopen_request(session=session, request_id=request_id)
    if not req:
        raise TicketNotFoundError(detail="Reopen request not found")
        
    if req.status != ReopenRequestStatus.PENDING:
        raise TicketValidationError(detail="Reopen request is not pending")
        
    if action == "approve":
        req.status = ReopenRequestStatus.APPROVED
        db_ticket = get_ticket(session=session, ticket_id=req.ticket_id)
        ticket_workflow.reopen_ticket(db_ticket)
        repository.save_ticket(session=session, ticket=db_ticket)
    elif action == "reject":
        req.status = ReopenRequestStatus.REJECTED
    else:
        raise TicketValidationError(detail="Invalid action")
        
    req.reviewed_by = current_user.id
    req.review_notes = review_in.notes
    req.reviewed_at = datetime.now(timezone.utc)
    
    return repository.save_reopen_request(session=session, request=req)

