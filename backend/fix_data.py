"""Fix legacy ticket data."""
from sqlalchemy import text
from sqlmodel import Session, select

from app.client.models import Client
from app.core.db import engine
from app.users.models import User

with Session(engine) as session:
    clients = session.exec(select(Client)).all()
    print('Clients count:', len(clients))
    if clients:
        client_id = clients[0].id
    else:
        # Create a dummy client if none exist
        user = session.exec(select(User)).first()
        client = Client(
            name="Legacy Data Client",
            company_name="Legacy Data Corp",
            email="legacy@example.com",
            phone="1234567890",
            industry="Software", # type: ignore
            created_by=user.id
        )
        session.add(client)
        session.commit()
        session.refresh(client)
        client_id = client.id
        print("Created dummy client:", client_id)

    print('Using client_id:', client_id)
    session.exec(text("UPDATE requirement_ticket SET client_id = :cid WHERE client_id IS NULL").bindparams(cid=client_id))  # pyright: ignore[reportCallIssue] # noqa: E501
    session.commit()
    print("Updated requirement tickets.")
