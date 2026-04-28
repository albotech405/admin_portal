"""add_verification_feedback_to_driver_profiles

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-04-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'driver_profiles',
        sa.Column('verification_feedback', sa.String(1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('driver_profiles', 'verification_feedback')
