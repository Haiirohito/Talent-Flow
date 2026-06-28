import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.permissions import Permission, UserRole, require_permissions
from app.core.security import get_password_hash, verify_password
from app.email.services import (
    generate_invitation_email,
    generate_new_account_email,
    send_email,
)
from app.users import crud
from app.users.models import User
from app.users.schemas import (
    InvitationCreate,
    InvitationResponse,
    Message,
    UpdatePassword,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.utils import generate_invitation_token, verify_invitation_token

router = APIRouter(prefix="/users", tags=["users"])

# ---------------------------------------------------------------------------
# Role hierarchy — lower index = higher privilege.
# Used to prevent privilege escalation (e.g. HR creating admin users).
# ---------------------------------------------------------------------------

ROLE_HIERARCHY: list[UserRole] = [
    UserRole.ADMIN,
    UserRole.HR_MANAGER,
    UserRole.RECRUITER,
    UserRole.EMPLOYEE,
    UserRole.VIEWER,
]


def _role_rank(role: UserRole) -> int:
    """Return the rank index for a role (0 = most privileged)."""
    try:
        return ROLE_HIERARCHY.index(role)
    except ValueError:
        return len(ROLE_HIERARCHY)


def _assert_can_assign_role(
    caller: User, target_role: UserRole | None, *, verb: str = "assign"
) -> None:
    """Raise 403 if *caller* is not allowed to assign *target_role*.

    Rules:
      • Only admins may assign the admin role.
      • Non-admins may only assign roles at or below their own rank.
    """
    if target_role is None:
        return
    if _role_rank(target_role) < _role_rank(caller.role):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to {verb} the '{target_role}' role",
        )


def _assert_can_modify_target(caller: User, target: User) -> None:
    """Raise 403 if *caller* is not allowed to modify *target*.

    Non-admins cannot modify admin accounts.
    """
    if target.role == UserRole.ADMIN and caller.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only admins can modify admin accounts",
        )


@router.get(
    "/",
    dependencies=[Depends(require_permissions(Permission.USERS_READ))],
    response_model=UsersPublic,
)
def read_users(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """
    Retrieve users.
    """
    from sqlmodel import col, func, select

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = (
        select(User).order_by(col(User.created_at).desc()).offset(skip).limit(limit)
    )
    users = session.exec(statement).all()

    users_public = [UserPublic.model_validate(user) for user in users]
    return UsersPublic(data=users_public, count=count)


@router.post(
    "/",
    dependencies=[Depends(require_permissions(Permission.USERS_CREATE))],
    response_model=UserPublic,
)
def create_user(
    *, session: SessionDep, user_in: UserCreate, current_user: CurrentUser
) -> Any:
    """
    Create new user (admin/HR only).
    """
    # Enforce role hierarchy — prevent non-admins from creating admin users
    _assert_can_assign_role(current_user, user_in.role, verb="create users with")

    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    verified, _ = verify_password(body.current_password, current_user.hashed_password)
    if not verified:
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="Admin users are not allowed to delete themselves"
        )
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister, token: str) -> Any:
    """
    Register with an invitation token. Open registration is disabled.
    """
    # Verify invitation token
    invitation_data = verify_invitation_token(token)
    if not invitation_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired invitation token",
        )

    # Ensure the email matches the invitation
    if user_in.email != invitation_data["email"]:
        raise HTTPException(
            status_code=400,
            detail="Email does not match the invitation",
        )

    # Check if user already exists
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )

    # Create user with the role from the invitation
    user_create = UserCreate.model_validate(
        user_in, update={"role": UserRole(invitation_data["role"])}
    )
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.post(
    "/invite",
    dependencies=[Depends(require_permissions(Permission.USERS_INVITE))],
    response_model=InvitationResponse,
)
def invite_user(
    session: SessionDep, invitation: InvitationCreate, current_user: CurrentUser
) -> Any:
    """
    Invite a new user by email (generates an invitation link).
    Admin and HR managers can invite users.
    """
    # Enforce role hierarchy — prevent non-admins from inviting as admin
    _assert_can_assign_role(current_user, invitation.role, verb="invite users as")

    # Check if user already exists
    existing_user = crud.get_user_by_email(session=session, email=invitation.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system",
        )

    # Generate invitation token
    token = generate_invitation_token(
        email=invitation.email, role=invitation.role.value
    )
    invitation_link = f"{settings.FRONTEND_HOST}/signup?token={token}"

    # Send invitation email
    if settings.emails_enabled:
        email_data = generate_invitation_email(
            email_to=invitation.email, token=token, role=invitation.role.value
        )
        send_email(
            email_to=invitation.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    return InvitationResponse(
        email=invitation.email,
        invitation_link=invitation_link,
        role=invitation.role,
    )


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    # Check existence FIRST to prevent information leakage via different error codes
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        return user
    if current_user.role not in (UserRole.ADMIN, UserRole.HR_MANAGER):
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(require_permissions(Permission.USERS_UPDATE))],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    # Enforce role hierarchy — non-admins cannot modify admin accounts
    _assert_can_modify_target(current_user, db_user)

    # Enforce role hierarchy — prevent assigning a role above caller's own
    _assert_can_assign_role(current_user, user_in.role, verb="assign")

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_permissions(Permission.USERS_DELETE))],
)
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Users are not allowed to delete themselves"
        )
    # Enforce role hierarchy — non-admins cannot delete admin accounts
    _assert_can_modify_target(current_user, user)

    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")
