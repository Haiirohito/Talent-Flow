"""rename_hr_manager_to_team_lead

Revision ID: a1b2c3d4e5f6
Revises: 9672bbf2831f
Create Date: 2026-07-06 13:10:00.000000

Renames the UserRole enum value HR_MANAGER → TEAM_LEAD.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9672bbf2831f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename HR_MANAGER → TEAM_LEAD in the userrole enum and update rows."""
    # PostgreSQL supports ALTER TYPE ... RENAME VALUE since v10
    op.execute("ALTER TYPE userrole RENAME VALUE 'HR_MANAGER' TO 'TEAM_LEAD'")


def downgrade() -> None:
    """Revert TEAM_LEAD → HR_MANAGER."""
    op.execute("ALTER TYPE userrole RENAME VALUE 'TEAM_LEAD' TO 'HR_MANAGER'")
