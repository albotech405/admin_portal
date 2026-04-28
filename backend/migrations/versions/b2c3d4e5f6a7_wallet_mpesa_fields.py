"""wallet_mpesa_fields

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-30 00:00:00.000000

Changes:
  - wallet_topup_requests.proof_image_url → nullable
  - wallet_topup_requests: add mpesa_conversation_id, mpesa_transaction_id
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make proof_image_url nullable (M-Pesa topups have no image)
    op.alter_column(
        'wallet_topup_requests',
        'proof_image_url',
        existing_type=sa.String(length=500),
        nullable=True,
    )

    # Add M-Pesa tracking columns
    op.add_column(
        'wallet_topup_requests',
        sa.Column('mpesa_conversation_id', sa.String(length=100), nullable=True),
    )
    op.add_column(
        'wallet_topup_requests',
        sa.Column('mpesa_transaction_id', sa.String(length=100), nullable=True),
    )
    op.create_index(
        'ix_wallet_topup_requests_mpesa_conversation_id',
        'wallet_topup_requests',
        ['mpesa_conversation_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_wallet_topup_requests_mpesa_conversation_id',
        table_name='wallet_topup_requests',
    )
    op.drop_column('wallet_topup_requests', 'mpesa_transaction_id')
    op.drop_column('wallet_topup_requests', 'mpesa_conversation_id')
    op.alter_column(
        'wallet_topup_requests',
        'proof_image_url',
        existing_type=sa.String(length=500),
        nullable=False,
    )
