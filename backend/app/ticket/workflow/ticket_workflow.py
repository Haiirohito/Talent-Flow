"""Ticket Workflow — The single authority for stage and status changes.

No other module should directly modify `current_stage` or `status`.
All changes must go through this layer.

This module contains NO database code — it operates on in-memory model objects.
The service layer is responsible for persisting changes.
"""

from app.ticket.models import RequirementTicket, TicketStage, TicketStatus
from app.ticket.workflow.exceptions import InvalidTransitionError, TicketValidationError
from app.ticket.workflow.transitions import (
    STAGE_ORDER,
    can_transition_stage,
    can_transition_status,
)

# ---------------------------------------------------------------------------
# Stage transitions
# ---------------------------------------------------------------------------


def transition_stage(ticket: RequirementTicket, target_stage: TicketStage) -> None:
    """Validate and apply a stage transition.

    Raises InvalidTransitionError if the transition is not allowed.
    Raises TicketValidationError if the ticket is not in an active status.
    """
    if ticket.status in (TicketStatus.CANCELLED, TicketStatus.CLOSED):
        raise TicketValidationError(
            detail=f"Cannot change stage on a {ticket.status} ticket. Reopen it first."
        )

    if not can_transition_stage(ticket.current_stage, target_stage):
        raise InvalidTransitionError(
            current=ticket.current_stage.value,
            target=target_stage.value,
            kind="stage",
        )

    ticket.current_stage = target_stage


def advance(ticket: RequirementTicket) -> None:
    """Move the ticket to the next sequential stage on the happy path.

    This is a convenience method for the most common forward progression.
    """
    try:
        current_idx = STAGE_ORDER.index(ticket.current_stage)
    except ValueError:
        raise TicketValidationError(detail=f"Unknown stage: {ticket.current_stage}") from None

    if current_idx >= len(STAGE_ORDER) - 1:
        raise TicketValidationError(detail="Ticket is already at the final stage")

    next_stage = STAGE_ORDER[current_idx + 1]
    transition_stage(ticket, next_stage)


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------


def transition_status(ticket: RequirementTicket, target_status: TicketStatus) -> None:
    """Validate and apply a status transition.

    Raises InvalidTransitionError if the transition is not allowed.
    """
    if ticket.status == target_status:
        return  # no-op

    if not can_transition_status(ticket.status, target_status):
        raise InvalidTransitionError(
            current=ticket.status.value,
            target=target_status.value,
            kind="status",
        )

    ticket.status = target_status


# ---------------------------------------------------------------------------
# Business actions (convenience methods)
# ---------------------------------------------------------------------------


def close_ticket(ticket: RequirementTicket) -> None:
    """Close a ticket — transitions both stage and status."""
    if ticket.status == TicketStatus.CLOSED:
        raise TicketValidationError(detail="Ticket is already closed")

    # Stage → CLOSED (if not already)
    if ticket.current_stage != TicketStage.CLOSED:
        if not can_transition_stage(ticket.current_stage, TicketStage.CLOSED):
            raise TicketValidationError(
                detail=f"Cannot close ticket at stage '{ticket.current_stage.value}'. "
                       f"Only certain stages allow closing."
            )
        ticket.current_stage = TicketStage.CLOSED

    # Status → CLOSED
    ticket.status = TicketStatus.CLOSED


def reopen_ticket(ticket: RequirementTicket) -> None:
    """Reopen a closed or cancelled ticket.

    Resets status to ACTIVE. Stage remains unchanged — the user must
    transition the stage manually after reopening.
    """
    if ticket.status not in (TicketStatus.CLOSED, TicketStatus.CANCELLED):
        raise TicketValidationError(
            detail=f"Cannot reopen a ticket with status '{ticket.status.value}'"
        )

    ticket.status = TicketStatus.ACTIVE
    # If stage was CLOSED, reset to REQUIREMENT_CREATED
    if ticket.current_stage == TicketStage.CLOSED:
        ticket.current_stage = TicketStage.REQUIREMENT_CREATED


def put_on_hold(ticket: RequirementTicket) -> None:
    """Put an active ticket on hold."""
    transition_status(ticket, TicketStatus.ON_HOLD)


def resume_ticket(ticket: RequirementTicket) -> None:
    """Resume a ticket that was on hold."""
    if ticket.status != TicketStatus.ON_HOLD:
        raise TicketValidationError(detail="Ticket is not on hold")
    transition_status(ticket, TicketStatus.ACTIVE)


def cancel_ticket(ticket: RequirementTicket) -> None:
    """Cancel a ticket."""
    transition_status(ticket, TicketStatus.CANCELLED)
