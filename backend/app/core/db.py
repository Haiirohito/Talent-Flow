from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.core.permissions import UserRole
from app.users import crud
from app.users.models import User
from app.users.schemas import UserCreate

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def init_db(session: Session) -> None:
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            role=UserRole.ADMIN,
        )
        user = crud.create_user(session=session, user_create=user_in)
