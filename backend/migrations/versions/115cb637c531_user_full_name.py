"""user_full_name

Revision ID: 115cb637c531
Revises: 582a37ba071c
Create Date: 2026-02-25 00:57:33.961751
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '115cb637c531'
down_revision: Union[str, None] = '582a37ba071c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add full_name as nullable first
    op.add_column('users', sa.Column('full_name', sa.String(length=200), nullable=True))

    # Merge existing first_name + last_name into full_name
    op.execute("""
        UPDATE users
        SET full_name = CONCAT(first_name, COALESCE(' ' || last_name, ''))
    """)

    # Now make it non-nullable
    op.alter_column('users', 'full_name', nullable=False)

    # Drop old columns
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')


def downgrade() -> None:
    op.add_column('users', sa.Column('first_name', sa.VARCHAR(length=100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.VARCHAR(length=100), nullable=True))

    # Split full_name back: first word = first_name, rest = last_name
    op.execute("""
        UPDATE users
        SET first_name = SPLIT_PART(full_name, ' ', 1),
            last_name = NULLIF(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1), '')
    """)

    op.alter_column('users', 'first_name', nullable=False)
    op.drop_column('users', 'full_name')
