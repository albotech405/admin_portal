"""add_arrived_withdrawn_enums_and_arrived_at_column

Revision ID: cec6fc9ed599
Revises: 90daea450efa
Create Date: 2026-03-14 01:13:29.850193
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'cec6fc9ed599'
down_revision: Union[str, None] = '90daea450efa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to PostgreSQL enum types (must use raw SQL — not supported by Alembic autogenerate)
    op.execute("ALTER TYPE ridestatus ADD VALUE IF NOT EXISTS 'ARRIVED' AFTER 'DRIVER_EN_ROUTE'")
    op.execute("ALTER TYPE driverresponsestatus ADD VALUE IF NOT EXISTS 'WITHDRAWN'")

    # Add arrived_at column to rides
    op.add_column('rides', sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # PostgreSQL does not support removing enum values — downgrade only drops the column
    op.drop_column('rides', 'arrived_at')
