"""Requirement Ticket — Utility functions."""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.ticket.models import RequirementTicket


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_ticket_number(session: Session) -> str:
    """Generate the next human-readable ticket number.

    Format: TKT-{YEAR}-{SEQUENCE:06d}
    Example: TKT-2026-000001, TKT-2026-000002

    The sequence is derived by counting existing tickets for the
    current year and incrementing by one.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"TKT-{year}-"

    # Find the highest sequence number for this year
    statement = (
        select(func.count())
        .select_from(RequirementTicket)
        .where(col(RequirementTicket.ticket_number).startswith(prefix))
    )
    count = session.exec(statement).one()

    next_seq = count + 1
    return f"{prefix}{next_seq:06d}"
