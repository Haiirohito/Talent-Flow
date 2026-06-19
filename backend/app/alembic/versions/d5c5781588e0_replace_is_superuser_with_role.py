"""replace_is_superuser_with_role

Revision ID: d5c5781588e0
Revises: 7c7e05f79a26
Create Date: 2026-06-19 16:05:24.554692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd5c5781588e0'
down_revision: Union[str, Sequence[str], None] = '7c7e05f79a26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace is_superuser boolean with role enum column."""
    # 1. Create the enum type
    userrole_enum = sa.Enum(
        'ADMIN', 'HR_MANAGER', 'RECRUITER', 'EMPLOYEE', 'VIEWER',
        name='userrole'
    )
    userrole_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add role column as nullable first (so existing rows don't fail)
    op.add_column(
        'user',
        sa.Column('role', userrole_enum, nullable=True)
    )

    # 3. Migrate existing data: is_superuser=True → ADMIN, else → EMPLOYEE
    op.execute(
        "UPDATE \"user\" SET role = 'ADMIN' WHERE is_superuser = true"
    )
    op.execute(
        "UPDATE \"user\" SET role = 'EMPLOYEE' WHERE is_superuser = false OR role IS NULL"
    )

    # 4. Make role column non-nullable now that all rows have values
    op.alter_column('user', 'role', nullable=False)

    # 5. Drop the old is_superuser column
    op.drop_column('user', 'is_superuser')


def downgrade() -> None:
    """Revert role column back to is_superuser boolean."""
    # 1. Add is_superuser back as nullable
    op.add_column(
        'user',
        sa.Column('is_superuser', sa.BOOLEAN(), nullable=True)
    )

    # 2. Migrate data: ADMIN → True, everything else → False
    op.execute(
        "UPDATE \"user\" SET is_superuser = true WHERE role = 'ADMIN'"
    )
    op.execute(
        "UPDATE \"user\" SET is_superuser = false WHERE role != 'ADMIN' OR is_superuser IS NULL"
    )

    # 3. Make is_superuser non-nullable
    op.alter_column('user', 'is_superuser', nullable=False)

    # 4. Drop role column and enum
    op.drop_column('user', 'role')
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
