"""Team — Repository (data access layer).

Pure database operations. No business logic.
"""

import uuid

from sqlmodel import Session, col, func, select

from app.team.models import TeamMember
from app.users.models import User


def add_member(*, session: Session, member: TeamMember) -> TeamMember:
    """Insert a new team member record."""
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


def remove_member(*, session: Session, member: TeamMember) -> None:
    """Delete a team member record."""
    session.delete(member)
    session.commit()


def get_member(*, session: Session, member_id: uuid.UUID) -> TeamMember | None:
    """Get a team member by ID."""
    return session.get(TeamMember, member_id)


def get_member_by_pair(
    *, session: Session, team_lead_id: uuid.UUID, recruiter_id: uuid.UUID
) -> TeamMember | None:
    """Get a team member by the team_lead + recruiter pair."""
    statement = select(TeamMember).where(
        TeamMember.team_lead_id == team_lead_id,
        TeamMember.recruiter_id == recruiter_id,
    )
    return session.exec(statement).first()


def list_members_for_lead(
    *, session: Session, team_lead_id: uuid.UUID
) -> list[TeamMember]:
    """Return all team members belonging to a specific team lead."""
    statement = (
        select(TeamMember)
        .where(TeamMember.team_lead_id == team_lead_id)
        .order_by(col(TeamMember.added_at).desc())
    )
    return list(session.exec(statement).all())


def count_members_for_lead(*, session: Session, team_lead_id: uuid.UUID) -> int:
    """Count team members for a specific team lead."""
    statement = (
        select(func.count())
        .select_from(TeamMember)
        .where(TeamMember.team_lead_id == team_lead_id)
    )
    return session.exec(statement).one()


def get_recruiter_team_lead(
    *, session: Session, recruiter_id: uuid.UUID
) -> TeamMember | None:
    """Find which team lead a recruiter belongs to (if any)."""
    statement = select(TeamMember).where(TeamMember.recruiter_id == recruiter_id)
    return session.exec(statement).first()


def list_unassigned_recruiters(*, session: Session) -> list[User]:
    """Return recruiters who are not assigned to any team."""
    from app.users.models import UserRole

    # Subquery: recruiter_ids already in a team
    assigned_ids = select(TeamMember.recruiter_id)

    statement = (
        select(User)
        .where(
            User.role == UserRole.RECRUITER,
            User.is_active == True,  # noqa: E712
            User.id.notin_(assigned_ids),  # type: ignore[union-attr]
        )
        .order_by(col(User.full_name))
    )
    return list(session.exec(statement).all())


def list_all_recruiters(*, session: Session) -> list[User]:
    """Return all active recruiters."""
    from app.users.models import UserRole

    statement = (
        select(User)
        .where(User.role == UserRole.RECRUITER, User.is_active == True)  # noqa: E712
        .order_by(col(User.full_name))
    )
    return list(session.exec(statement).all())


def list_team_leads(*, session: Session) -> list[User]:
    """Return all active team leads."""
    from app.users.models import UserRole

    statement = (
        select(User)
        .where(User.role == UserRole.TEAM_LEAD, User.is_active == True)  # noqa: E712
        .order_by(col(User.full_name))
    )
    return list(session.exec(statement).all())
