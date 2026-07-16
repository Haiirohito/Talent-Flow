"""Dashboard endpoint that returns role-tailored feature access."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import or_
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.client.models import Client
from app.core.permissions import Permission, UserRole, get_user_permissions
from app.team.models import TeamMember
from app.ticket.models import (
    ReopenRequestStatus,
    RequirementTicket,
    TicketRecruiterAssignment,
    TicketReopenRequest,
    TicketStatus,
)
from app.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardFeature(BaseModel):
    """A single feature/section available on the dashboard."""

    key: str
    label: str
    description: str
    icon: str | None = None


class DashboardResponse(BaseModel):
    """Dashboard configuration tailored to the current user's role."""

    user_role: UserRole
    user_name: str | None
    user_email: str
    permissions: list[str]
    features: list[DashboardFeature]


# Master feature catalog — each feature maps to the permission(s) required
_FEATURE_CATALOG: list[tuple[DashboardFeature, set[Permission]]] = [
    (
        DashboardFeature(
            key="admin_panel",
            label="Admin Panel",
            description="Full system administration, settings, and monitoring",
            icon="shield",
        ),
        {Permission.DASHBOARD_ADMIN},
    ),
    (
        DashboardFeature(
            key="user_management",
            label="User Management",
            description="Create, edit, and manage user accounts",
            icon="users",
        ),
        {Permission.USERS_READ},
    ),
    (
        DashboardFeature(
            key="invite_users",
            label="Invite Users",
            description="Send invitations to new team members",
            icon="user-plus",
        ),
        {Permission.USERS_INVITE},
    ),
    (
        DashboardFeature(
            key="hr_dashboard",
            label="HR Dashboard",
            description="Employee records, onboarding, and HR analytics",
            icon="briefcase",
        ),
        {Permission.DASHBOARD_HR},
    ),
    (
        DashboardFeature(
            key="recruitment",
            label="Recruitment",
            description="Job postings, candidate pipeline, and interviews",
            icon="search",
        ),
        {Permission.DASHBOARD_RECRUITMENT},
    ),
    (
        DashboardFeature(
            key="my_profile",
            label="My Profile",
            description="View and update your personal information",
            icon="user",
        ),
        {Permission.PROFILE_READ},
    ),
    (
        DashboardFeature(
            key="system_settings",
            label="System Settings",
            description="Configure application settings and integrations",
            icon="settings",
        ),
        {Permission.SYSTEM_SETTINGS},
    ),
    (
        DashboardFeature(
            key="email_testing",
            label="Email Testing",
            description="Send test emails to verify email configuration",
            icon="mail",
        ),
        {Permission.SYSTEM_EMAIL_TEST},
    ),
]


@router.get("/", response_model=DashboardResponse)
def get_dashboard(current_user: CurrentUser) -> DashboardResponse:
    """
    Returns available features/sections based on the user's role.

    The frontend can use this to render the dashboard dynamically,
    showing only the sections the user is permitted to access.
    """
    user_permissions = get_user_permissions(current_user)
    permission_strings = sorted(p.value for p in user_permissions)

    # Filter features to only those the user has permissions for
    available_features = []
    for feature, required_perms in _FEATURE_CATALOG:
        if required_perms & user_permissions:  # user has at least one required perm
            available_features.append(feature)

    return DashboardResponse(
        user_role=current_user.role,
        user_name=current_user.full_name,
        user_email=current_user.email,
        permissions=permission_strings,
        features=available_features,
    )


# ---------------------------------------------------------------------------
# Dashboard stats — real-time aggregated metrics
# ---------------------------------------------------------------------------


class DashboardStats(BaseModel):
    """Role-tailored stats for the dashboard."""

    total_tickets: int = 0
    active_tickets: int = 0
    closed_tickets: int = 0
    on_hold_tickets: int = 0
    cancelled_tickets: int = 0
    total_clients: int = 0
    active_clients: int = 0
    total_users: int = 0
    team_size: int = 0
    pending_reopen_requests: int = 0
    recent_tickets: list[dict] = []


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: CurrentUser,
    session: SessionDep,
) -> DashboardStats:
    """Return real-time aggregated stats tailored to the user's role."""

    stats = DashboardStats()
    role = current_user.role

    # --- Build base ticket query based on role ---
    base = select(RequirementTicket).where(
        RequirementTicket.deleted_at.is_(None)  # type: ignore[union-attr]
    )

    if role == UserRole.RECRUITER:
        base = base.join(
            TicketRecruiterAssignment,
            RequirementTicket.id == TicketRecruiterAssignment.ticket_id,
        ).where(TicketRecruiterAssignment.recruiter_id == current_user.id)
    elif role == UserRole.TEAM_LEAD:
        base = base.where(
            or_(
                RequirementTicket.assigned_team_lead_id == current_user.id,
                RequirementTicket.created_by == current_user.id,
            )
        )
    # Admin: no filter — sees all

    def _count(extra_filter=None):
        stmt = select(func.count()).select_from(base.subquery())
        if extra_filter is not None:
            stmt = (
                select(func.count())
                .select_from(RequirementTicket)
                .where(RequirementTicket.deleted_at.is_(None))  # type: ignore[union-attr]
            )
            if role == UserRole.RECRUITER:
                stmt = stmt.join(
                    TicketRecruiterAssignment,
                    RequirementTicket.id == TicketRecruiterAssignment.ticket_id,
                ).where(TicketRecruiterAssignment.recruiter_id == current_user.id)
            elif role == UserRole.TEAM_LEAD:
                stmt = stmt.where(
                    or_(
                        RequirementTicket.assigned_team_lead_id == current_user.id,
                        RequirementTicket.created_by == current_user.id,
                    )
                )
            stmt = stmt.where(extra_filter)
        return session.exec(stmt).one()

    stats.total_tickets = _count()
    stats.active_tickets = _count(RequirementTicket.status == TicketStatus.ACTIVE)
    stats.closed_tickets = _count(RequirementTicket.status == TicketStatus.CLOSED)
    stats.on_hold_tickets = _count(RequirementTicket.status == TicketStatus.ON_HOLD)
    stats.cancelled_tickets = _count(RequirementTicket.status == TicketStatus.CANCELLED)

    # --- Client counts ---
    stats.total_clients = session.exec(
        select(func.count()).select_from(Client)
    ).one()
    stats.active_clients = session.exec(
        select(func.count()).select_from(Client).where(Client.is_active == True)  # noqa: E712
    ).one()

    # --- User count (admin) ---
    if role == UserRole.ADMIN:
        stats.total_users = session.exec(
            select(func.count()).select_from(User).where(User.is_active == True)  # noqa: E712
        ).one()

    # --- Team size ---
    if role == UserRole.TEAM_LEAD:
        stats.team_size = session.exec(
            select(func.count())
            .select_from(TeamMember)
            .where(TeamMember.team_lead_id == current_user.id)
        ).one()
    elif role == UserRole.ADMIN:
        stats.team_size = session.exec(
            select(func.count()).select_from(TeamMember)
        ).one()

    # --- Pending reopen requests (admin / team lead) ---
    if role in (UserRole.ADMIN, UserRole.TEAM_LEAD):
        stats.pending_reopen_requests = session.exec(
            select(func.count())
            .select_from(TicketReopenRequest)
            .where(TicketReopenRequest.status == ReopenRequestStatus.PENDING)
        ).one()

    # --- Recent tickets (last 5 visible to the user) ---
    recent_stmt = base.order_by(col(RequirementTicket.created_at).desc()).limit(5)
    recent = session.exec(recent_stmt).all()
    stats.recent_tickets = [
        {
            "id": str(t.id),
            "ticket_number": t.ticket_number,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "current_stage": t.current_stage,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in recent
    ]

    return stats
