"""add_wallet_tables_and_is_admin

Revision ID: a1b2c3d4e5f6
Revises: 90daea450efa
Create Date: 2026-03-27 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'cec6fc9ed599'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_admin column to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))

    # Create enums
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymentmethod AS ENUM ('mpesa', 'orange_money', 'airtel_money', 'bank_transfer');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE topuprequeststatus AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE transactiontype AS ENUM ('credit', 'debit');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE transactionreference AS ENUM ('topup', 'ride_commission');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create wallet_topup_requests table
    op.create_table(
        'wallet_topup_requests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('driver_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('payment_method', postgresql.ENUM('mpesa', 'orange_money', 'airtel_money', 'bank_transfer', name='paymentmethod', create_type=False), nullable=False),
        sa.Column('proof_image_url', sa.String(length=500), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', name='topuprequeststatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.UUID(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['driver_id'], ['driver_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wallet_topup_requests_driver_id', 'wallet_topup_requests', ['driver_id'])

    # Create wallet_transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('driver_id', sa.UUID(), nullable=False),
        sa.Column('type', postgresql.ENUM('credit', 'debit', name='transactiontype', create_type=False), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('balance_after', sa.Numeric(12, 2), nullable=False),
        sa.Column('reference_type', postgresql.ENUM('topup', 'ride_commission', name='transactionreference', create_type=False), nullable=False),
        sa.Column('reference_id', sa.UUID(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['driver_id'], ['driver_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wallet_transactions_driver_id', 'wallet_transactions', ['driver_id'])


def downgrade() -> None:
    op.drop_index('ix_wallet_transactions_driver_id', table_name='wallet_transactions')
    op.drop_table('wallet_transactions')
    op.drop_index('ix_wallet_topup_requests_driver_id', table_name='wallet_topup_requests')
    op.drop_table('wallet_topup_requests')
    op.execute("DROP TYPE IF EXISTS transactionreference")
    op.execute("DROP TYPE IF EXISTS transactiontype")
    op.execute("DROP TYPE IF EXISTS topuprequeststatus")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.drop_column('users', 'is_admin')
