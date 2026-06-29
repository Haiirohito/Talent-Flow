"""Stage and status transition maps.

Every valid transition is declared here. The workflow layer validates
all changes against these maps — no other module should modify
current_stage or status directly.
"""

from app.ticket.models import TicketStage as S
from app.ticket.models import TicketStatus as St

# ---------------------------------------------------------------------------
# Stage transitions  (current_stage → set of valid next stages)
# ---------------------------------------------------------------------------

STAGE_TRANSITIONS: dict[S, set[S]] = {
    S.REQUIREMENT_CREATED: {S.CANDIDATES_ADDED, S.CLOSED},
    S.CANDIDATES_ADDED: {S.INTERVIEW_DATE_PENDING, S.CLOSED},
    S.INTERVIEW_DATE_PENDING: {S.INTERVIEW_SCHEDULED, S.CLOSED},
    S.INTERVIEW_SCHEDULED: {S.CANDIDATE_CONFIRMATION_PENDING, S.CLOSED},
    S.CANDIDATE_CONFIRMATION_PENDING: {S.INTERVIEW_COMPLETED, S.CLOSED},
    S.INTERVIEW_COMPLETED: {
        S.INTERVIEW_FEEDBACK_PENDING,
        S.CANDIDATES_ADDED,  # re-source candidates
        S.CLOSED,
    },
    S.INTERVIEW_FEEDBACK_PENDING: {
        S.SELECTED,
        S.CANDIDATES_ADDED,  # client requests another round
        S.INTERVIEW_DATE_PENDING,  # another interview
        S.CLOSED,
    },
    S.SELECTED: {S.JOINING_PENDING, S.CANDIDATES_ADDED, S.CLOSED},
    S.JOINING_PENDING: {S.JOINED, S.CANDIDATES_ADDED, S.CLOSED},
    S.JOINED: {S.BILLING_PENDING},
    S.BILLING_PENDING: {S.COLLECTION_RUNNING},
    S.COLLECTION_RUNNING: {S.CLOSED},
    S.CLOSED: set(),  # terminal — no forward transitions
}

# The "happy path" order — used by advance() to determine the next sequential stage
STAGE_ORDER: list[S] = [
    S.REQUIREMENT_CREATED,
    S.CANDIDATES_ADDED,
    S.INTERVIEW_DATE_PENDING,
    S.INTERVIEW_SCHEDULED,
    S.CANDIDATE_CONFIRMATION_PENDING,
    S.INTERVIEW_COMPLETED,
    S.INTERVIEW_FEEDBACK_PENDING,
    S.SELECTED,
    S.JOINING_PENDING,
    S.JOINED,
    S.BILLING_PENDING,
    S.COLLECTION_RUNNING,
    S.CLOSED,
]

# ---------------------------------------------------------------------------
# Status transitions  (current_status → set of valid next statuses)
# ---------------------------------------------------------------------------

STATUS_TRANSITIONS: dict[St, set[St]] = {
    St.ACTIVE: {St.ON_HOLD, St.CANCELLED, St.CLOSED},
    St.ON_HOLD: {St.ACTIVE, St.CANCELLED, St.CLOSED},
    St.CANCELLED: {St.ACTIVE},   # reopen
    St.CLOSED: {St.ACTIVE},      # reopen
}


def get_valid_next_stages(current: S) -> list[S]:
    """Return the list of stages reachable from the current stage (forward and backward)."""
    valid = STAGE_TRANSITIONS.get(current, set()).copy()
    
    # Allow going backward one step
    try:
        current_idx = STAGE_ORDER.index(current)
        if current_idx > 0 and current != S.CLOSED:
            valid.add(STAGE_ORDER[current_idx - 1])
    except ValueError:
        pass
        
    return sorted(valid, key=lambda s: STAGE_ORDER.index(s) if s in STAGE_ORDER else 999)


def can_transition_stage(current: S, target: S) -> bool:
    """Check if a stage transition is valid."""
    return target in get_valid_next_stages(current)


def can_transition_status(current: St, target: St) -> bool:
    """Check if a status transition is valid."""
    return target in STATUS_TRANSITIONS.get(current, set())


def get_valid_next_statuses(current: St) -> list[St]:
    """Return the list of statuses reachable from the current status."""
    return sorted(STATUS_TRANSITIONS.get(current, set()), key=lambda s: list(St).index(s))
