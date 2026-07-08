"""Team — Service (business logic layer).

Orchestrates team member CRUD and transfer operations.
"""

import uuid

from fastapi import HTTPException
from sqlmodel import Session

from app.team import repository
from app.team.models import TeamMember
from app.team.schemas import (
    TeamMemberAdd,
    TeamMemberRead,
    TeamMemberTransfer,
    TeamMembersPublic,
    TeamLeadInfo,
)
from app.users.models import User, UserRole


# ---------------------------------------------------------------------------
# Team member CRUD
# ---------------------------------------------------------------------------


def add_member(
    *, session: Session, body: TeamMemberAdd, current_user: User
) -> TeamMemberRead:
    """Add a recruiter to the current user's team."""
    _assert_team_lead(current_user)

    recruiter = session.get(User, body.recruiter_id)
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    if recruiter.role != UserRole.RECRUITER:
        raise HTTPException(status_code=400, detail="User is not a recruiter")
    if not recruiter.is_active:
        raise HTTPException(status_code=400, detail="Recruiter is inactive")

    # Check if already in someone's team
    existing = repository.get_recruiter_team_lead(
        session=session, recruiter_id=body.recruiter_id
    )
    if existing:
        if existing.team_lead_id == current_user.id:
            raise HTTPException(
                status_code=400, detail="Recruiter is already in your team"
            )
        raise HTTPException(
            status_code=400,
            detail="Recruiter is already assigned to another team lead",
        )

    member = TeamMember(
        team_lead_id=current_user.id,
        recruiter_id=body.recruiter_id,
    )
    member = repository.add_member(session=session, member=member)
    return _enrich_member(session=session, member=member)


def remove_member(
    *, session: Session, member_id: uuid.UUID, current_user: User
) -> None:
    """Remove a recruiter from the current user's team."""
    member = repository.get_member(session=session, member_id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    # Only the owning team lead or admin can remove
    if member.team_lead_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="You can only manage your own team"
        )

    repository.remove_member(session=session, member=member)


def list_my_team(
    *, session: Session, current_user: User
) -> TeamMembersPublic:
    """List the current user's team members."""
    _assert_team_lead(current_user)

    members = repository.list_members_for_lead(
        session=session, team_lead_id=current_user.id
    )
    count = repository.count_members_for_lead(
        session=session, team_lead_id=current_user.id
    )

    enriched = [_enrich_member(session=session, member=m) for m in members]
    return TeamMembersPublic(data=enriched, count=count)


def transfer_member(
    *, session: Session, body: TeamMemberTransfer, current_user: User
) -> TeamMemberRead:
    """Transfer a recruiter from the current user's team to another team lead."""
    _assert_team_lead(current_user)

    # Validate the recruiter is in the caller's team
    existing = repository.get_member_by_pair(
        session=session,
        team_lead_id=current_user.id,
        recruiter_id=body.recruiter_id,
    )
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Recruiter is not in your team",
        )

    # Validate target team lead exists and is a team lead
    target_lead = session.get(User, body.target_team_lead_id)
    if not target_lead:
        raise HTTPException(status_code=404, detail="Target team lead not found")
    if target_lead.role != UserRole.TEAM_LEAD:
        raise HTTPException(
            status_code=400, detail="Target user is not a team lead"
        )
    if target_lead.id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Cannot transfer to yourself"
        )

    # Check recruiter isn't already in the target team
    already_there = repository.get_member_by_pair(
        session=session,
        team_lead_id=body.target_team_lead_id,
        recruiter_id=body.recruiter_id,
    )
    if already_there:
        raise HTTPException(
            status_code=400,
            detail="Recruiter is already in the target team",
        )

    # Remove from current team, add to target team
    repository.remove_member(session=session, member=existing)

    new_member = TeamMember(
        team_lead_id=body.target_team_lead_id,
        recruiter_id=body.recruiter_id,
    )
    new_member = repository.add_member(session=session, member=new_member)
    return _enrich_member(session=session, member=new_member)


def list_unassigned_recruiters(*, session: Session) -> list[dict]:
    """Return recruiters not assigned to any team."""
    users = repository.list_unassigned_recruiters(session=session)
    return [
        {"id": str(u.id), "full_name": u.full_name, "email": u.email}
        for u in users
    ]


def list_team_leads(*, session: Session) -> list[TeamLeadInfo]:
    """Return all active team leads."""
    users = repository.list_team_leads(session=session)
    return [
        TeamLeadInfo(id=u.id, full_name=u.full_name, email=u.email)
        for u in users
    ]


def list_all_teams(*, session: Session) -> list[dict]:
    """(Admin) Return all teams grouped by team lead with member details."""
    leads = repository.list_team_leads(session=session)
    result = []
    for lead in leads:
        members = repository.list_members_for_lead(
            session=session, team_lead_id=lead.id
        )
        enriched = [_enrich_member(session=session, member=m) for m in members]
        result.append({
            "team_lead_id": str(lead.id),
            "team_lead_name": lead.full_name,
            "team_lead_email": lead.email,
            "member_count": len(enriched),
            "members": [m.model_dump() for m in enriched],
        })
    return result


def list_team_for_lead(
    *, session: Session, team_lead_id: uuid.UUID
) -> TeamMembersPublic:
    """(Admin) List a specific team lead's team members."""
    lead = session.get(User, team_lead_id)
    if not lead or lead.role != UserRole.TEAM_LEAD:
        raise HTTPException(status_code=404, detail="Team lead not found")

    members = repository.list_members_for_lead(
        session=session, team_lead_id=team_lead_id
    )
    count = repository.count_members_for_lead(
        session=session, team_lead_id=team_lead_id
    )
    enriched = [_enrich_member(session=session, member=m) for m in members]
    return TeamMembersPublic(data=enriched, count=count)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _assert_team_lead(user: User) -> None:
    """Raise 403 if the user is not a team lead or admin."""
    if user.role not in (UserRole.TEAM_LEAD, UserRole.ADMIN):
        raise HTTPException(
            status_code=403,
            detail="Only team leads can manage teams",
        )


def _enrich_member(*, session: Session, member: TeamMember) -> TeamMemberRead:
    """Enrich a TeamMember with recruiter user details."""
    recruiter = session.get(User, member.recruiter_id)
    return TeamMemberRead(
        id=member.id,
        team_lead_id=member.team_lead_id,
        recruiter_id=member.recruiter_id,
        recruiter_name=recruiter.full_name if recruiter else None,
        recruiter_email=recruiter.email if recruiter else None,
        recruiter_role=recruiter.role if recruiter else None,
        added_at=member.added_at,
    )
