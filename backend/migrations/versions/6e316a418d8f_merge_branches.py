"""merge_branches

Revision ID: 6e316a418d8f
Revises: 202602251637, 3c8f1456272b
Create Date: 2026-03-11 02:20:23.789452
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e316a418d8f'
down_revision: Union[str, None] = ('202602251637', '3c8f1456272b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
