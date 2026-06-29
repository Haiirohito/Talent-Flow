import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Client model
# ---------------------------------------------------------------------------


# Shared Properties
class ClientBase(SQLModel):
    name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    website: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None)
    is_active: bool = True


# Database model, database table inferred from class name
class Client(ClientBase, table=True):
    __tablename__ = "clients"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
