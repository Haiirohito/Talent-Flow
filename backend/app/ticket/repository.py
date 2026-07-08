"""Requirement Ticket — Repository (data access layer).

Pure database operations. No business logic.
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, col, func, select

from app.ticket.models import RequirementTicket, TicketRecruiterAssignment, TicketReopenRequest
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
        RequirementTicket.deleted_at.is_(None),  # type: ignore[union-attr]
    )
    return session.exec(statement).first()


def get_ticket_by_number(*, session: Session, ticket_number: str) -> RequirementTicket | None:
    """Retrieve a ticket by its human-readable number (excludes soft-deleted)."""
    statement = select(RequirementTicket).where(
        RequirementTicket.ticket_number == ticket_number,
        RequirementTicket.deleted_at.is_(None),  # type: ignore[union-attr]
    )
    return session.exec(statement).first()


def list_tickets(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    recruiter_id: uuid.UUID | None = None,
    team_lead_id: uuid.UUID | None = None,
) -> list[RequirementTicket]:
    """Return a paginated list of tickets ordered by created_at desc (excludes soft-deleted).

    Filters:
    - recruiter_id: only tickets where this recruiter is assigned
    - team_lead_id: only tickets assigned to this team lead OR created by them
    """
    from sqlalchemy import or_

    statement = (
        select(RequirementTicket)
        .where(RequirementTicket.deleted_at.is_(None))  # type: ignore[union-attr]
    )
    if recruiter_id:
        from app.ticket.models import TicketRecruiterAssignment
        statement = statement.join(
            TicketRecruiterAssignment,
            RequirementTicket.id == TicketRecruiterAssignment.ticket_id
        ).where(TicketRecruiterAssignment.recruiter_id == recruiter_id)
    elif team_lead_id:
        statement = statement.where(
            or_(
                RequirementTicket.assigned_team_lead_id == team_lead_id,
                RequirementTicket.created_by == team_lead_id,
            )
        )

    statement = statement.order_by(col(RequirementTicket.created_at).desc()).offset(skip).limit(limit)
    return list(session.exec(statement).all())


def count_tickets(
    *,
    session: Session,
    recruiter_id: uuid.UUID | None = None,
    team_lead_id: uuid.UUID | None = None,
) -> int:
    """Return the total number of non-deleted tickets (matching same filters as list_tickets)."""
    from sqlalchemy import or_

    statement = (
        select(func.count())
        .select_from(RequirementTicket)
        .where(RequirementTicket.deleted_at.is_(None))  # type: ignore[union-attr]
    )
    if recruiter_id:
        from app.ticket.models import TicketRecruiterAssignment
        statement = statement.join(
            TicketRecruiterAssignment,
            RequirementTicket.id == TicketRecruiterAssignment.ticket_id
        ).where(TicketRecruiterAssignment.recruiter_id == recruiter_id)
    elif team_lead_id:
        statement = statement.where(
            or_(
                RequirementTicket.assigned_team_lead_id == team_lead_id,
                RequirementTicket.created_by == team_lead_id,
            )
        )
    return session.exec(statement).one()


def update_ticket(
    *, session: Session, db_ticket: RequirementTicket, ticket_in: TicketUpdate
) -> RequirementTicket:
    """Apply a partial update to an existing ticket (data fields only)."""
    update_data = ticket_in.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    db_ticket.sqlmodel_update(update_data)
    session.add(db_ticket)
    session.commit()
    session.refresh(db_ticket)
    return db_ticket


def save_ticket(*, session: Session, ticket: RequirementTicket) -> RequirementTicket:
    """Persist any in-memory changes to a ticket (used after workflow transitions)."""
    ticket.updated_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def soft_delete_ticket(
    *, session: Session, db_ticket: RequirementTicket, deleted_by_id
) -> RequirementTicket:
    """Mark a ticket as deleted (soft delete) with audit trail."""
    db_ticket.deleted_at = datetime.now(timezone.utc)
    db_ticket.deleted_by = deleted_by_id
    db_ticket.updated_at = datetime.now(timezone.utc)
    session.add(db_ticket)
    session.commit()
    session.refresh(db_ticket)
    return db_ticket


def restore_ticket(*, session: Session, db_ticket: RequirementTicket) -> RequirementTicket:
    """Restore a soft-deleted ticket."""
    db_ticket.deleted_at = None
    db_ticket.deleted_by = None
    db_ticket.updated_at = datetime.now(timezone.utc)
    session.add(db_ticket)
    session.commit()
    session.refresh(db_ticket)
    return db_ticket


def hard_delete_ticket(*, session: Session, db_ticket: RequirementTicket) -> None:
    """Permanently remove a ticket from the database."""
    session.delete(db_ticket)
    session.commit()


# ---------------------------------------------------------------------------
# Reopen Request
# ---------------------------------------------------------------------------


def create_reopen_request(*, session: Session, request: TicketReopenRequest) -> TicketReopenRequest:
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def get_reopen_request(*, session: Session, request_id) -> TicketReopenRequest | None:
    return session.get(TicketReopenRequest, request_id)


def list_reopen_requests(*, session: Session, skip: int = 0, limit: int = 100) -> list[TicketReopenRequest]:
    statement = (
        select(TicketReopenRequest)
        .order_by(col(TicketReopenRequest.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def count_reopen_requests(*, session: Session) -> int:
    statement = select(func.count()).select_from(TicketReopenRequest)
    return session.exec(statement).one()


def save_reopen_request(*, session: Session, request: TicketReopenRequest) -> TicketReopenRequest:
    request.updated_at = datetime.now(timezone.utc)
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def delete_reopen_request(*, session: Session, request: TicketReopenRequest) -> None:
    session.delete(request)
    session.commit()


# ---------------------------------------------------------------------------
# Ticket Recruiter Assignments
# ---------------------------------------------------------------------------


def create_recruiter_assignment(
    *, session: Session, assignment: TicketRecruiterAssignment
) -> TicketRecruiterAssignment:
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def get_recruiter_assignment(
    *, session: Session, ticket_id, recruiter_id
) -> TicketRecruiterAssignment | None:
    statement = select(TicketRecruiterAssignment).where(
        TicketRecruiterAssignment.ticket_id == ticket_id,
        TicketRecruiterAssignment.recruiter_id == recruiter_id,
    )
    return session.exec(statement).first()


def list_recruiter_assignments(
    *, session: Session, ticket_id
) -> list[TicketRecruiterAssignment]:
    statement = (
        select(TicketRecruiterAssignment)
        .where(TicketRecruiterAssignment.ticket_id == ticket_id)
        .order_by(col(TicketRecruiterAssignment.assigned_at).desc())
    )
    return list(session.exec(statement).all())


def delete_recruiter_assignment(
    *, session: Session, assignment: TicketRecruiterAssignment
) -> None:
    session.delete(assignment)
    session.commit()


def delete_all_recruiter_assignments(*, session: Session, ticket_id) -> None:
    """Remove all recruiter assignments for a ticket."""
    statement = select(TicketRecruiterAssignment).where(
        TicketRecruiterAssignment.ticket_id == ticket_id
    )
    assignments = session.exec(statement).all()
    for a in assignments:
        session.delete(a)
    session.commit()
