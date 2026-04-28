"""normalize_wallet_enum_values_to_lowercase

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-04-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # paymentmethod
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'MPESA' TO 'mpesa'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'ORANGE_MONEY' TO 'orange_money'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'AIRTEL_MONEY' TO 'airtel_money'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'BANK_TRANSFER' TO 'bank_transfer'")

    # topuprequeststatus
    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'APPROVED' TO 'approved'")
    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'REJECTED' TO 'rejected'")

    # transactiontype
    op.execute("ALTER TYPE transactiontype RENAME VALUE 'CREDIT' TO 'credit'")
    op.execute("ALTER TYPE transactiontype RENAME VALUE 'DEBIT' TO 'debit'")

    # transactionreference
    op.execute("ALTER TYPE transactionreference RENAME VALUE 'TOPUP' TO 'topup'")
    op.execute("ALTER TYPE transactionreference RENAME VALUE 'RIDE_COMMISSION' TO 'ride_commission'")


def downgrade() -> None:
    op.execute("ALTER TYPE transactionreference RENAME VALUE 'ride_commission' TO 'RIDE_COMMISSION'")
    op.execute("ALTER TYPE transactionreference RENAME VALUE 'topup' TO 'TOPUP'")

    op.execute("ALTER TYPE transactiontype RENAME VALUE 'debit' TO 'DEBIT'")
    op.execute("ALTER TYPE transactiontype RENAME VALUE 'credit' TO 'CREDIT'")

    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'rejected' TO 'REJECTED'")
    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'approved' TO 'APPROVED'")
    op.execute("ALTER TYPE topuprequeststatus RENAME VALUE 'pending' TO 'PENDING'")

    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'bank_transfer' TO 'BANK_TRANSFER'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'airtel_money' TO 'AIRTEL_MONEY'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'orange_money' TO 'ORANGE_MONEY'")
    op.execute("ALTER TYPE paymentmethod RENAME VALUE 'mpesa' TO 'MPESA'")
