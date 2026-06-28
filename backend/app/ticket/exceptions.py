"""Requirement Ticket — Custom exceptions."""

from fastapi import HTTPException, status


class TicketNotFoundError(HTTPException):
    """Raised when a ticket cannot be found."""

    def __init__(self, detail: str = "Ticket not found") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class TicketValidationError(HTTPException):
    """Raised when a ticket operation fails validation."""

    def __init__(self, detail: str = "Invalid ticket operation") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
