"""Requirement Ticket — FastAPI dependencies."""

import uuid
from typing import Annotated

from fastapi import Depends, Path
from sqlmodel import Session

from app.api.deps import get_db
from app.ticket import repository
from app.ticket.exceptions import TicketNotFoundError
from app.ticket.models import RequirementTicket


def get_ticket_or_404(
    ticket_id: Annotated[uuid.UUID, Path(description="The ticket UUID")],
    session: Session = Depends(get_db),  # noqa: B008
) -> RequirementTicket:
    """Reusable dependency that resolves a ticket from the path or raises 404."""
    ticket = repository.get_ticket(session=session, ticket_id=ticket_id)
    if not ticket:
        raise TicketNotFoundError()
    return ticket
