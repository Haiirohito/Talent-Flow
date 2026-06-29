"""Centralized Role-Based Access Control (RBAC) module.

Defines permissions and reusable FastAPI dependencies for
enforcing access policies throughout the application.

UserRole is defined in app.users.models to avoid circular imports.

To add a new role:
  1. Add it to the UserRole enum in app.users.models
  2. Add its permissions to ROLE_PERMISSIONS below
  3. That's it — all route-level checks use this map automatically.

To add a new permission:
  1. Add it to the Permission enum below
  2. Grant it to the appropriate roles in ROLE_PERMISSIONS
"""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status

if TYPE_CHECKING:
    from app.users.models import User

# Re-export UserRole for convenience so consumers can do:
#   from app.core.permissions import UserRole, Permission
from app.users.models import UserRole  # noqa: F401

# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------


class Permission(StrEnum):
    """Granular permissions that can be assigned to roles."""

    # User management
    USERS_READ = "users:read"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"
    USERS_INVITE = "users:invite"

    # Own profile
    PROFILE_READ = "profile:read"
    PROFILE_UPDATE = "profile:update"
    PROFILE_DELETE = "profile:delete"

    # Dashboard sections
    DASHBOARD_ADMIN = "dashboard:admin"
    DASHBOARD_HR = "dashboard:hr"
    DASHBOARD_RECRUITMENT = "dashboard:recruitment"
    DASHBOARD_EMPLOYEE = "dashboard:employee"

    # Tickets
    TICKETS_CREATE = "tickets:create"
    TICKETS_READ = "tickets:read"
    TICKETS_UPDATE = "tickets:update"
    TICKETS_DELETE = "tickets:delete"

    # Client management
    CLIENTS_READ = "clients:read"
    CLIENTS_CREATE = "clients:create"
    CLIENTS_UPDATE = "clients:update"
    CLIENTS_DELETE = "clients:delete"

    # System / utilities
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_EMAIL_TEST = "system:email_test"


# ---------------------------------------------------------------------------
# Role → Permission mapping
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: set(Permission),  # Admin gets everything
    UserRole.HR_MANAGER: {
        Permission.USERS_READ,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.USERS_INVITE,
        Permission.PROFILE_READ,
        Permission.PROFILE_UPDATE,
        Permission.DASHBOARD_HR,
        Permission.DASHBOARD_EMPLOYEE,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_READ,
        Permission.TICKETS_UPDATE,
        Permission.TICKETS_DELETE,
        Permission.CLIENTS_READ,
        Permission.CLIENTS_CREATE,
        Permission.CLIENTS_UPDATE,
        Permission.CLIENTS_DELETE,
    },
    UserRole.RECRUITER: {
        Permission.USERS_READ,
        Permission.PROFILE_READ,
        Permission.PROFILE_UPDATE,
        Permission.DASHBOARD_RECRUITMENT,
        Permission.DASHBOARD_EMPLOYEE,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_READ,
        Permission.TICKETS_UPDATE,
        Permission.CLIENTS_READ,
    },
    UserRole.EMPLOYEE: {
        Permission.PROFILE_READ,
        Permission.PROFILE_UPDATE,
        Permission.PROFILE_DELETE,
        Permission.DASHBOARD_EMPLOYEE,
        Permission.TICKETS_READ,
    },
    UserRole.VIEWER: {
        Permission.PROFILE_READ,
        Permission.DASHBOARD_EMPLOYEE,
        Permission.TICKETS_READ,
    },
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def get_user_permissions(user: User) -> set[Permission]:
    """Return the full set of permissions for a user based on their role."""
    return ROLE_PERMISSIONS.get(user.role, set())


def has_permission(user: User, permission: Permission) -> bool:
    """Check if a user has a specific permission."""
    return permission in get_user_permissions(user)


def has_any_permission(user: User, *permissions: Permission) -> bool:
    """Check if a user has at least one of the given permissions."""
    user_perms = get_user_permissions(user)
    return bool(user_perms & set(permissions))


def has_all_permissions(user: User, *permissions: Permission) -> bool:
    """Check if a user has ALL of the given permissions."""
    user_perms = get_user_permissions(user)
    return set(permissions) <= user_perms


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


def require_permissions(*permissions: Permission):
    """FastAPI dependency that enforces the user has ALL given permissions.

    Usage::

        @router.get("/", dependencies=[Depends(require_permissions(Permission.USERS_READ))])
        def list_users(...): ...
    """
    from app.api.deps import get_current_user

    def _checker(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
        if not has_all_permissions(current_user, *permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions to access this resource",
            )
        return current_user

    return _checker


def require_any_permission(*permissions: Permission):
    """FastAPI dependency that enforces the user has AT LEAST ONE of the given permissions."""
    from app.api.deps import get_current_user

    def _checker(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
        if not has_any_permission(current_user, *permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions to access this resource",
            )
        return current_user

    return _checker


def require_role(*roles: UserRole):
    """FastAPI dependency that enforces the user has one of the given roles."""
    from app.api.deps import get_current_user

    def _checker(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required role to access this resource",
            )
        return current_user

    return _checker
