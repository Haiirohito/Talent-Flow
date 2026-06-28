"""Requirement Ticket — Repository (data access layer).

Pure database operations. No business logic.
"""

from datetime import datetime, timezone

from sqlmodel import Session, col, func, select

from app.ticket.models import RequirementTicket
from app.ticket.schemas import TicketUpdate


def create_ticket(*, session: Session, ticket: RequirementTicket) -> RequirementTicket:
    """Insert a new ticket into the database."""
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def get_ticket(*, session: Session, ticket_id) -> RequirementTicket | None:
    """Retrieve a single ticket by its UUID (excludes soft-deleted)."""
    statement = select(RequirementTicket).where(
        RequirementTicket.id == ticket_id,
        RequirementTicket.is_deleted == False,  # noqa: E712
    )
    return session.exec(statement).first()


def get_ticket_by_number(*, session: Session, ticket_number: str) -> RequirementTicket | None:
    """Retrieve a ticket by its human-readable number (excludes soft-deleted)."""
    statement = select(RequirementTicket).where(
        RequirementTicket.ticket_number == ticket_number,
        RequirementTicket.is_deleted == False,  # noqa: E712
    )
    return session.exec(statement).first()


def list_tickets(*, session: Session, skip: int = 0, limit: int = 100) -> list[RequirementTicket]:
    """Return a paginated list of tickets ordered by created_at desc (excludes soft-deleted)."""
    statement = (
        select(RequirementTicket)
        .where(RequirementTicket.is_deleted == False)  # noqa: E712
        .order_by(col(RequirementTicket.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def count_tickets(*, session: Session) -> int:
    """Return the total number of non-deleted tickets."""
    statement = (
        select(func.count())
        .select_from(RequirementTicket)
        .where(RequirementTicket.is_deleted == False)  # noqa: E712
    )
    return session.exec(statement).one()


def update_ticket(
    *, session: Session, db_ticket: RequirementTicket, ticket_in: TicketUpdate
) -> RequirementTicket:
    """Apply a partial update to an existing ticket."""
    update_data = ticket_in.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    db_ticket.sqlmodel_update(update_data)
    session.add(db_ticket)
    session.commit()
    session.refresh(db_ticket)
    return db_ticket


def soft_delete_ticket(*, session: Session, db_ticket: RequirementTicket) -> RequirementTicket:
    """Mark a ticket as deleted (soft delete)."""
    db_ticket.is_deleted = True
    db_ticket.updated_at = datetime.now(timezone.utc)
    session.add(db_ticket)
    session.commit()
    session.refresh(db_ticket)
    return db_ticket


def hard_delete_ticket(*, session: Session, db_ticket: RequirementTicket) -> None:
    """Permanently remove a ticket from the database."""
    session.delete(db_ticket)
    session.commit()
