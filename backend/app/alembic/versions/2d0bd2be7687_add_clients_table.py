"""add_clients_table

Revision ID: 2d0bd2be7687
Revises: 62715925287e
Create Date: 2026-06-29 16:59:12.759360

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '2d0bd2be7687'
down_revision: Union[str, Sequence[str], None] = '62715925287e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('clients',
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('company_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('address', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
    sa.Column('website', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clients_email'), 'clients', ['email'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_clients_email'), table_name='clients')
    op.drop_table('clients')
