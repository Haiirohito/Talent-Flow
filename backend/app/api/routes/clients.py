import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.client import crud
from app.client.models import Client
from app.client.schemas import (
    ClientCreate,
    ClientPublic,
    ClientsPublic,
    ClientUpdate,
)
from app.core.permissions import Permission, require_permissions
from app.users.schemas import Message

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get(
    "/",
    dependencies=[Depends(require_permissions(Permission.CLIENTS_READ))],
    response_model=ClientsPublic,
)
def read_clients(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """
    Retrieve clients.
    """
    count_statement = select(func.count()).select_from(Client)
    count = session.exec(count_statement).one()

    statement = (
        select(Client).order_by(col(Client.created_at).desc()).offset(skip).limit(limit)
    )
    clients = session.exec(statement).all()

    clients_public = [ClientPublic.model_validate(client) for client in clients]
    return ClientsPublic(data=clients_public, count=count)


@router.post(
    "/",
    dependencies=[Depends(require_permissions(Permission.CLIENTS_CREATE))],
    response_model=ClientPublic,
)
def create_client(
    *, session: SessionDep, client_in: ClientCreate, current_user: CurrentUser
) -> Any:
    """
    Create new client.
    """
    existing = crud.get_client_by_email(session=session, email=client_in.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A client with this email already exists in the system.",
        )

    client = crud.create_client(session=session, client_create=client_in)
    return client


@router.get(
    "/{client_id}",
    dependencies=[Depends(require_permissions(Permission.CLIENTS_READ))],
    response_model=ClientPublic,
)
def read_client_by_id(
    client_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific client by id.
    """
    client = session.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch(
    "/{client_id}",
    dependencies=[Depends(require_permissions(Permission.CLIENTS_UPDATE))],
    response_model=ClientPublic,
)
def update_client(
    *,
    session: SessionDep,
    client_id: uuid.UUID,
    client_in: ClientUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update a client.
    """
    db_client = session.get(Client, client_id)
    if not db_client:
        raise HTTPException(
            status_code=404,
            detail="The client with this id does not exist in the system",
        )

    if client_in.email:
        existing = crud.get_client_by_email(session=session, email=client_in.email)
        if existing and existing.id != client_id:
            raise HTTPException(
                status_code=409, detail="A client with this email already exists"
            )

    db_client = crud.update_client(
        session=session, db_client=db_client, client_in=client_in
    )
    return db_client


@router.delete(
    "/{client_id}",
    dependencies=[Depends(require_permissions(Permission.CLIENTS_DELETE))],
)
def delete_client(
    session: SessionDep, current_user: CurrentUser, client_id: uuid.UUID
) -> Message:
    """
    Delete a client.
    """
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    session.delete(client)
    session.commit()
    return Message(message="Client deleted successfully")
