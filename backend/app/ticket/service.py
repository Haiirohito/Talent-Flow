"""Requirement Ticket — Service (business logic layer).

All ticket workflow logic lives here.
The repository handles raw database operations.
"""

from sqlmodel import Session

from app.ticket import repository
from app.ticket.exceptions import TicketNotFoundError, TicketValidationError
from app.ticket.models import RequirementTicket, TicketStage, TicketStatus
from app.ticket.schemas import TicketCreate, TicketsPublic, TicketUpdate
from app.ticket.utils import generate_ticket_number
from app.users.models import User


def create_ticket(*, session: Session, ticket_in: TicketCreate, current_user: User) -> RequirementTicket:
    """Validate input, generate a ticket number, and insert a new ticket."""
    if ticket_in.vacancies < 1:
        raise TicketValidationError(detail="Vacancies must be at least 1")

    ticket_number = generate_ticket_number(session)

    ticket = RequirementTicket(
        ticket_number=ticket_number,
        title=ticket_in.title,
        description=ticket_in.description,
        vacancies=ticket_in.vacancies,
        priority=ticket_in.priority,
        stage=TicketStage.REQUIREMENT_CREATED,
        status=TicketStatus.ACTIVE,
        created_by=current_user.id,
    )

    return repository.create_ticket(session=session, ticket=ticket)


def get_ticket(*, session: Session, ticket_id) -> RequirementTicket:
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
    return TicketsPublic(data=tickets, count=count) # type: ignore


def update_ticket(*, session: Session, ticket_id, ticket_in: TicketUpdate) -> RequirementTicket:
    """Validate and apply a partial update to a ticket."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)

    # Prevent updates on cancelled/closed tickets (unless reopening)
    if db_ticket.status in (TicketStatus.CANCELLED, TicketStatus.CLOSED):
        # Allow only status change (to reopen)
        update_data = ticket_in.model_dump(exclude_unset=True)
        non_status_fields = {k for k in update_data if k != "status"}
        if non_status_fields:
            raise TicketValidationError(detail=f"Cannot update a {db_ticket.status} ticket. Change status first.")

    return repository.update_ticket(session=session, db_ticket=db_ticket, ticket_in=ticket_in)


def delete_ticket(*, session: Session, ticket_id, permanent: bool = False) -> None:
    """Soft-delete a ticket by default. Use permanent=True for hard delete."""
    db_ticket = get_ticket(session=session, ticket_id=ticket_id)

    if permanent:
        repository.hard_delete_ticket(session=session, db_ticket=db_ticket)
    else:
        repository.soft_delete_ticket(session=session, db_ticket=db_ticket)
