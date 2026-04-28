"""add_cash_payment_method

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-04-16 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'cash'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # To fully roll back, the column data using 'cash' must be removed first,
    # then the type recreated without the value.
    pass
