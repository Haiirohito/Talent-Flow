"""Check table schema on requirement_ticket."""
from sqlalchemy import text

from app.core.db import engine

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = 'requirement_ticket'"
    ))
    for row in result:
        print(row)
