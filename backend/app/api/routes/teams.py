"""Team — HTTP router.

Endpoints for Team Lead → Recruiter team management.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep
from app.core.permissions import Permission, require_permissions
from app.team import service
from app.team.schemas import (
    TeamMemberAdd,
    TeamMemberRead,
    TeamMemberTransfer,
    TeamMembersPublic,
    TeamLeadInfo,
)
from app.users.schemas import Message

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get(
    "/my-team",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
    response_model=TeamMembersPublic,
)
def get_my_team(session: SessionDep, current_user: CurrentUser) -> Any:
    """Get the current team lead's team members."""
    return service.list_my_team(session=session, current_user=current_user)


@router.post(
    "/members",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
    response_model=TeamMemberRead,
)
def add_team_member(
    *, session: SessionDep, body: TeamMemberAdd, current_user: CurrentUser
) -> Any:
    """Add a recruiter to the current team lead's team."""
    return service.add_member(session=session, body=body, current_user=current_user)


@router.delete(
    "/members/{member_id}",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
    response_model=Message,
)
def remove_team_member(
    *, session: SessionDep, member_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    """Remove a recruiter from the team lead's team."""
    service.remove_member(
        session=session, member_id=member_id, current_user=current_user
    )
    return Message(message="Team member removed successfully")


@router.post(
    "/transfer",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
    response_model=TeamMemberRead,
)
def transfer_team_member(
    *, session: SessionDep, body: TeamMemberTransfer, current_user: CurrentUser
) -> Any:
    """Transfer a recruiter from the current team lead's team to another team lead."""
    return service.transfer_member(
        session=session, body=body, current_user=current_user
    )


@router.get(
    "/unassigned-recruiters",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
)
def get_unassigned_recruiters(session: SessionDep) -> Any:
    """Get recruiters not assigned to any team."""
    return service.list_unassigned_recruiters(session=session)


@router.get(
    "/team-leads",
    dependencies=[Depends(require_permissions(Permission.TEAM_MANAGE))],
    response_model=list[TeamLeadInfo],
)
def get_team_leads(session: SessionDep) -> Any:
    """Get all active team leads (for transfer dropdown)."""
    return service.list_team_leads(session=session)


@router.get(
    "/all-teams",
    dependencies=[Depends(require_permissions(Permission.DASHBOARD_ADMIN))],
)
def get_all_teams(session: SessionDep) -> Any:
    """(Admin) Get all teams grouped by team lead."""
    return service.list_all_teams(session=session)


@router.get(
    "/{team_lead_id}/members",
    dependencies=[Depends(require_permissions(Permission.DASHBOARD_ADMIN))],
    response_model=TeamMembersPublic,
)
def get_team_lead_members(
    team_lead_id: uuid.UUID, session: SessionDep
) -> Any:
    """(Admin) View a specific team lead's team."""
    return service.list_team_for_lead(session=session, team_lead_id=team_lead_id)
