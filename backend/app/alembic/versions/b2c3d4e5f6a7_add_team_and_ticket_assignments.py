"""add_team_and_ticket_assignments

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-06 13:12:00.000000

Adds:
- team_member table (persistent Team Lead → Recruiter relationship)
- assigned_team_lead_id column on requirement_ticket
- ticket_recruiter_assignment table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create team_member, ticket assignment tables, and add assigned_team_lead_id to tickets."""

    # 1. team_member — persistent Team Lead → Recruiter relationship
    op.create_table(
        'team_member',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('team_lead_id', sa.Uuid(), nullable=False),
        sa.Column('recruiter_id', sa.Uuid(), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['team_lead_id'], ['users.id'], name='team_member_team_lead_id_fkey'),
        sa.ForeignKeyConstraint(['recruiter_id'], ['users.id'], name='team_member_recruiter_id_fkey'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_lead_id', 'recruiter_id', name='uq_team_lead_recruiter'),
    )
    op.create_index('ix_team_member_team_lead_id', 'team_member', ['team_lead_id'])
    op.create_index('ix_team_member_recruiter_id', 'team_member', ['recruiter_id'])

    # 2. assigned_team_lead_id on requirement_ticket
    op.add_column(
        'requirement_ticket',
        sa.Column('assigned_team_lead_id', sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        'requirement_ticket_assigned_team_lead_id_fkey',
        'requirement_ticket', 'users',
        ['assigned_team_lead_id'], ['id'],
    )

    # 3. ticket_recruiter_assignment — join table for recruiters assigned to tickets
    op.create_table(
        'ticket_recruiter_assignment',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('ticket_id', sa.Uuid(), nullable=False),
        sa.Column('recruiter_id', sa.Uuid(), nullable=False),
        sa.Column('assigned_by', sa.Uuid(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['requirement_ticket.id'], name='ticket_recruiter_assignment_ticket_id_fkey'),
        sa.ForeignKeyConstraint(['recruiter_id'], ['users.id'], name='ticket_recruiter_assignment_recruiter_id_fkey'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], name='ticket_recruiter_assignment_assigned_by_fkey'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ticket_id', 'recruiter_id', name='uq_ticket_recruiter'),
    )
    op.create_index('ix_ticket_recruiter_assignment_ticket_id', 'ticket_recruiter_assignment', ['ticket_id'])


def downgrade() -> None:
    """Drop team and ticket assignment tables."""
    op.drop_table('ticket_recruiter_assignment')
    op.drop_constraint('requirement_ticket_assigned_team_lead_id_fkey', 'requirement_ticket', type_='foreignkey')
    op.drop_column('requirement_ticket', 'assigned_team_lead_id')
    op.drop_table('team_member')
