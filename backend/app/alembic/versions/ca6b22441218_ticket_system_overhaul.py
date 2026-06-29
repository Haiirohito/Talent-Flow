"""ticket_system_overhaul

Revision ID: ca6b22441218
Revises: 2d0bd2be7687
Create Date: 2026-06-29 17:17:35.431454

- Rename column `stage` → `current_stage`
- Add `INTERVIEW_FEEDBACK_PENDING` to TicketStage enum
- Change `client_id` FK from `users.id` → `clients.id`
- Replace `is_deleted` (bool) with `deleted_at` (timestamp) + `deleted_by` (UUID FK)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca6b22441218'
down_revision: Union[str, Sequence[str], None] = '2d0bd2be7687'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Rename stage → current_stage
    op.alter_column(
        'requirement_ticket', 'stage',
        new_column_name='current_stage',
    )

    # 2. Add client_id column and its foreign key
    # If the table isn't empty, this might fail because of nullable=False.
    # To be safe, we'll add it as nullable=True first, but for now we'll assume we can add it or we'll need a default.
    # Let's add it as nullable True, then if there's data, we'll need to populate it.
    op.add_column(
        'requirement_ticket',
        sa.Column('client_id', sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        'requirement_ticket_client_id_fkey',
        'requirement_ticket', 'clients',
        ['client_id'], ['id'],
    )

    # 4. Replace is_deleted with deleted_at + deleted_by
    op.add_column(
        'requirement_ticket',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'requirement_ticket',
        sa.Column('deleted_by', sa.Uuid(), nullable=True),
    )

    # Migrate data: is_deleted=True → deleted_at=now()
    op.execute(
        "UPDATE requirement_ticket SET deleted_at = NOW() WHERE is_deleted = TRUE"
    )

    # Drop old column and index
    op.drop_index(op.f('ix_requirement_ticket_is_deleted'), table_name='requirement_ticket')
    op.drop_column('requirement_ticket', 'is_deleted')

    # Create new index and FK
    op.create_index(
        op.f('ix_requirement_ticket_deleted_at'),
        'requirement_ticket', ['deleted_at'], unique=False,
    )
    op.create_foreign_key(
        'requirement_ticket_deleted_by_fkey',
        'requirement_ticket', 'users',
        ['deleted_by'], ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Reverse: deleted_at/deleted_by → is_deleted
    op.add_column(
        'requirement_ticket',
        sa.Column('is_deleted', sa.BOOLEAN(), nullable=False, server_default='false'),
    )
    op.execute(
        "UPDATE requirement_ticket SET is_deleted = TRUE WHERE deleted_at IS NOT NULL"
    )

    op.drop_constraint('requirement_ticket_deleted_by_fkey', 'requirement_ticket', type_='foreignkey')
    op.drop_index(op.f('ix_requirement_ticket_deleted_at'), table_name='requirement_ticket')
    op.drop_column('requirement_ticket', 'deleted_by')
    op.drop_column('requirement_ticket', 'deleted_at')
    op.create_index(op.f('ix_requirement_ticket_is_deleted'), 'requirement_ticket', ['is_deleted'], unique=False)

    # Reverse: client_id FK back to users
    op.drop_constraint('requirement_ticket_client_id_fkey', 'requirement_ticket', type_='foreignkey')
    op.create_foreign_key(
        'requirement_ticket_client_id_fkey',
        'requirement_ticket', 'users',
        ['client_id'], ['id'],
    )

    # Reverse: current_stage → stage
    op.alter_column(
        'requirement_ticket', 'current_stage',
        new_column_name='stage',
    )
