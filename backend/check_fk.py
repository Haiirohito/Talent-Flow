"""Check FK constraint names on requirement_ticket."""
from sqlalchemy import text

from app.core.db import engine

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT conname FROM pg_constraint "
        "WHERE conrelid = 'requirement_ticket'::regclass AND contype = 'f'"
    ))
    for row in result:
        print(row[0])
