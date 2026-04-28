"""rename client to customer

Revision ID: 4cf65afc9a8d
Revises: d145107a890b
Create Date: 2026-02-19 05:19:46.384248
"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '4cf65afc9a8d'
down_revision: Union[str, None] = 'd145107a890b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename UserRole enum value: CLIENT -> CUSTOMER
    op.execute("ALTER TYPE userrole RENAME VALUE 'CLIENT' TO 'CUSTOMER'")

    # 2. Rename columns: client_id -> customer_id
    op.alter_column('ride_requests', 'client_id', new_column_name='customer_id')
    op.alter_column('rides', 'client_id', new_column_name='customer_id')
    op.alter_column('rides', 'client_comment', new_column_name='customer_comment')
    op.alter_column('ride_ratings', 'client_id', new_column_name='customer_id')

    # 3. Rename indexes
    op.execute("ALTER INDEX ix_ride_requests_client_id RENAME TO ix_ride_requests_customer_id")
    op.execute("ALTER INDEX ix_rides_client_id RENAME TO ix_rides_customer_id")


def downgrade() -> None:
    # 1. Rename indexes back
    op.execute("ALTER INDEX ix_rides_customer_id RENAME TO ix_rides_client_id")
    op.execute("ALTER INDEX ix_ride_requests_customer_id RENAME TO ix_ride_requests_client_id")

    # 2. Rename columns back
    op.alter_column('ride_ratings', 'customer_id', new_column_name='client_id')
    op.alter_column('rides', 'customer_comment', new_column_name='client_comment')
    op.alter_column('rides', 'customer_id', new_column_name='client_id')
    op.alter_column('ride_requests', 'customer_id', new_column_name='client_id')

    # 3. Rename enum value back
    op.execute("ALTER TYPE userrole RENAME VALUE 'CUSTOMER' TO 'CLIENT'")
