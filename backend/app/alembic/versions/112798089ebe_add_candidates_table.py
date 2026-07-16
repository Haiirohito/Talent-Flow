"""add candidates table

Revision ID: 112798089ebe
Revises: b2c3d4e5f6a7
Create Date: 2026-07-08 17:12:00.006111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '112798089ebe'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('candidates',
    sa.Column('full_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('skills', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('resume_filename', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
    sa.Column('resume_path', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidates_email'), 'candidates', ['email'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_candidates_email'), table_name='candidates')
    op.drop_table('candidates')
