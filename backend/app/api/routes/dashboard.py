"""Dashboard endpoint that returns role-tailored feature access."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.permissions import Permission, UserRole, get_user_permissions

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
