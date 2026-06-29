import uuid
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, SQLModel

from app.client.models import ClientBase

# ---------------------------------------------------------------------------
# Client schemas
# ---------------------------------------------------------------------------


# Properties to receive via API on creation
class ClientCreate(ClientBase):
    pass


# Properties to receive via API on update — all optional for partial update
class ClientUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    website: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None)
    is_active: bool | None = None


# Properties to return via API, id is always required
class ClientPublic(ClientBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ClientsPublic(SQLModel):
    data: list[ClientPublic]
    count: int
