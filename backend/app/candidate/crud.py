"""Candidate CRUD operations."""

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.candidate.models import Candidate
from app.candidate.schemas import CandidateCreate, CandidateUpdate


def create_candidate(*, session: Session, candidate_create: CandidateCreate) -> Candidate:
    db_obj = Candidate.model_validate(candidate_create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_candidate(
    *, session: Session, db_candidate: Candidate, candidate_in: CandidateUpdate
) -> Candidate:
    candidate_data = candidate_in.model_dump(exclude_unset=True)
    db_candidate.sqlmodel_update(candidate_data)
    db_candidate.updated_at = datetime.now(timezone.utc)
    session.add(db_candidate)
    session.commit()
    session.refresh(db_candidate)
    return db_candidate


def get_candidate_by_email(*, session: Session, email: str) -> Candidate | None:
    statement = select(Candidate).where(Candidate.email == email)
    return session.exec(statement).first()
