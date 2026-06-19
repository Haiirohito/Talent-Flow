from fastapi import APIRouter, Depends
from pydantic.networks import EmailStr

from app.core.permissions import Permission, require_permissions
from app.email.services import generate_test_email, send_email
from app.users.models import Message

router = APIRouter(prefix="/email", tags=["email"])


@router.post(
    "/test-email/",
    dependencies=[Depends(require_permissions(Permission.SYSTEM_EMAIL_TEST))],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")
