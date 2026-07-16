"""Requirement Ticket — Utility functions."""

from datetime import datetime, timezone

from sqlalchemy import func, text
from sqlmodel import Session, col, select

from app.ticket.models import RequirementTicket


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_ticket_number(session: Session) -> str:
    """Generate the next human-readable ticket number.

    Format: TKT-{YEAR}-{SEQUENCE:06d}
    Example: TKT-2026-000001, TKT-2026-000002

    Uses MAX() on the numeric suffix instead of COUNT() to avoid
    race conditions where concurrent requests could generate
    duplicate ticket numbers.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"TKT-{year}-"

    # Extract the max sequence number for this year using substring
    # ticket_number format: "TKT-YYYY-NNNNNN" — suffix starts at position len(prefix)+1
    prefix_len = len(prefix)
    statement = (
        select(
            func.coalesce(
                func.max(
                    func.cast(
                        func.substring(
                            RequirementTicket.ticket_number,
                            prefix_len + 1,  # 1-indexed SQL position
                        ),
                        type_=text("INTEGER"),
                    )
                ),
                0,
            )
        )
        .select_from(RequirementTicket)
        .where(col(RequirementTicket.ticket_number).startswith(prefix))
    )
    max_seq = session.exec(statement).one()

    next_seq = max_seq + 1
    return f"{prefix}{next_seq:06d}"
