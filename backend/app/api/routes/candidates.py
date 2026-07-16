import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.candidate import crud
from app.candidate.models import Candidate
from app.candidate.schemas import (
    CandidateCreate,
    CandidatePublic,
    CandidatesPublic,
    CandidateUpdate,
)
from app.core.permissions import Permission, require_permissions
from app.users.schemas import Message

router = APIRouter(prefix="/candidates", tags=["candidates"])

# Directory where resume PDFs are stored
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _save_resume(file: UploadFile, candidate_id: uuid.UUID) -> tuple[str, str]:
    """Save uploaded resume and return (original_filename, server_path)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Resume file must have a filename")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Only PDF files are allowed for resumes"
        )

    # Read file and check size
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, detail="Resume file must be smaller than 10 MB"
        )

    # Validate PDF magic bytes — a real PDF starts with %PDF
    if not content[:4] == b"%PDF":
        raise HTTPException(
            status_code=400, detail="File content is not a valid PDF"
        )

    # Save with a unique name based on candidate ID
    safe_name = f"{candidate_id}{ext}"
    file_path = UPLOAD_DIR / safe_name
    file_path.write_bytes(content)

    return file.filename, str(file_path)


def _delete_resume(resume_path: str | None) -> None:
    """Delete a resume file from disk if it exists."""
    if resume_path:
        try:
            os.remove(resume_path)
        except OSError:
            pass  # File already gone or inaccessible


@router.get(
    "/",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_READ))],
    response_model=CandidatesPublic,
)
def read_candidates(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> Any:
    """
    Retrieve candidates.
    """
    count_statement = select(func.count()).select_from(Candidate)
    count = session.exec(count_statement).one()

    statement = (
        select(Candidate)
        .order_by(col(Candidate.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    candidates = session.exec(statement).all()

    candidates_public = [CandidatePublic.model_validate(c) for c in candidates]
    return CandidatesPublic(data=candidates_public, count=count)


@router.post(
    "/",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_CREATE))],
    response_model=CandidatePublic,
)
async def create_candidate(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str | None = Form(default=None),
    skills: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    resume: UploadFile | None = File(default=None),
) -> Any:
    """
    Create new candidate with optional resume upload.
    """
    existing = crud.get_candidate_by_email(session=session, email=email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A candidate with this email already exists in the system.",
        )

    candidate_create = CandidateCreate(
        full_name=full_name,
        email=email,
        phone=phone or None,
        skills=skills or None,
        notes=notes or None,
    )

    candidate = crud.create_candidate(session=session, candidate_create=candidate_create)

    # Handle resume upload
    if resume and resume.filename:
        original_name, server_path = _save_resume(resume, candidate.id)
        candidate.resume_filename = original_name
        candidate.resume_path = server_path
        session.add(candidate)
        session.commit()
        session.refresh(candidate)

    return candidate


@router.get(
    "/{candidate_id}",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_READ))],
    response_model=CandidatePublic,
)
def read_candidate_by_id(
    candidate_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific candidate by id.
    """
    candidate = session.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch(
    "/{candidate_id}",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_UPDATE))],
    response_model=CandidatePublic,
)
async def update_candidate(
    *,
    session: SessionDep,
    candidate_id: uuid.UUID,
    current_user: CurrentUser,
    full_name: str | None = Form(default=None),
    email: str | None = Form(default=None),
    phone: str | None = Form(default=None),
    skills: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    is_active: str | None = Form(default=None),
    resume: UploadFile | None = File(default=None),
) -> Any:
    """
    Update a candidate.
    """
    db_candidate = session.get(Candidate, candidate_id)
    if not db_candidate:
        raise HTTPException(
            status_code=404,
            detail="The candidate with this id does not exist in the system",
        )

    # Build update data from provided form fields
    update_data: dict[str, Any] = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if email is not None:
        existing = crud.get_candidate_by_email(session=session, email=email)
        if existing and existing.id != candidate_id:
            raise HTTPException(
                status_code=409, detail="A candidate with this email already exists"
            )
        update_data["email"] = email
    if phone is not None:
        update_data["phone"] = phone or None
    if skills is not None:
        update_data["skills"] = skills or None
    if notes is not None:
        update_data["notes"] = notes or None
    if is_active is not None:
        update_data["is_active"] = is_active.lower() in ("true", "1", "yes")

    if update_data:
        candidate_update = CandidateUpdate(**update_data)
        db_candidate = crud.update_candidate(
            session=session, db_candidate=db_candidate, candidate_in=candidate_update
        )

    # Handle resume upload
    if resume and resume.filename:
        _delete_resume(db_candidate.resume_path)
        original_name, server_path = _save_resume(resume, db_candidate.id)
        db_candidate.resume_filename = original_name
        db_candidate.resume_path = server_path
        db_candidate.updated_at = datetime.now(timezone.utc)
        session.add(db_candidate)
        session.commit()
        session.refresh(db_candidate)

    return db_candidate


@router.delete(
    "/{candidate_id}",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_DELETE))],
)
def delete_candidate(
    session: SessionDep, current_user: CurrentUser, candidate_id: uuid.UUID
) -> Message:
    """
    Delete a candidate and their resume file.
    """
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    _delete_resume(candidate.resume_path)
    session.delete(candidate)
    session.commit()
    return Message(message="Candidate deleted successfully")


# ---------------------------------------------------------------------------
# Resume file endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/{candidate_id}/resume",
)
def get_candidate_resume(
    candidate_id: uuid.UUID,
    session: SessionDep,
    token: str = Query(..., description="Bearer token for iframe auth"),
) -> FileResponse:
    """
    Serve the candidate's resume PDF for inline viewing.
    Accepts token as a query parameter since iframes cannot send Authorization headers.
    """
    import jwt as pyjwt
    from jwt.exceptions import InvalidTokenError
    from pydantic import ValidationError
    from app.core import security
    from app.core.config import settings
    from app.core.permissions import has_permission, Permission
    from app.users.models import User
    from app.users.schemas import TokenPayload

    # Authenticate via query token
    try:
        payload = pyjwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[security.ALGORITHM],
            issuer=settings.PROJECT_NAME,
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=401, detail="Invalid token") from None

    if not token_data.sub:
        raise HTTPException(status_code=403, detail="Invalid token")

    try:
        user_id = uuid.UUID(token_data.sub)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid token")

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Invalid token")

    if not has_permission(user, Permission.CANDIDATES_READ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.resume_path or not os.path.isfile(candidate.resume_path):
        raise HTTPException(status_code=404, detail="Resume not found")

    return FileResponse(
        path=candidate.resume_path,
        media_type="application/pdf",
        filename=candidate.resume_filename or "resume.pdf",
        headers={"Content-Disposition": "inline"},
    )


@router.post(
    "/{candidate_id}/resume",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_UPDATE))],
    response_model=CandidatePublic,
)
async def upload_candidate_resume(
    *,
    session: SessionDep,
    candidate_id: uuid.UUID,
    current_user: CurrentUser,
    resume: UploadFile = File(...),
) -> Any:
    """
    Upload or replace a candidate's resume.
    """
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    _delete_resume(candidate.resume_path)
    original_name, server_path = _save_resume(resume, candidate.id)
    candidate.resume_filename = original_name
    candidate.resume_path = server_path
    candidate.updated_at = datetime.now(timezone.utc)
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    return candidate


@router.delete(
    "/{candidate_id}/resume",
    dependencies=[Depends(require_permissions(Permission.CANDIDATES_UPDATE))],
    response_model=CandidatePublic,
)
def delete_candidate_resume(
    candidate_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Remove a candidate's resume.
    """
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    _delete_resume(candidate.resume_path)
    candidate.resume_filename = None
    candidate.resume_path = None
    candidate.updated_at = datetime.now(timezone.utc)
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    return candidate
