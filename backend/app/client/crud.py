"""Client CRUD operations."""

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.client.models import Client
from app.client.schemas import ClientCreate, ClientUpdate


def create_client(*, session: Session, client_create: ClientCreate) -> Client:
    db_obj = Client.model_validate(client_create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_client(
    *, session: Session, db_client: Client, client_in: ClientUpdate
) -> Client:
    client_data = client_in.model_dump(exclude_unset=True)
    db_client.sqlmodel_update(client_data)
    db_client.updated_at = datetime.now(timezone.utc)
    session.add(db_client)
    session.commit()
    session.refresh(db_client)
    return db_client


def get_client_by_email(*, session: Session, email: str) -> Client | None:
    statement = select(Client).where(Client.email == email)
    return session.exec(statement).first()
