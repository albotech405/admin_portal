"""normalize_enum_values_to_lowercase

All PostgreSQL enum types were created with UPPERCASE values in earlier migrations,
but the Python models use lowercase values. This migration renames every enum value
to lowercase so INSERT/UPDATE statements from SQLAlchemy succeed.

Also adds the missing 'sos' value to notificationtype.

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-04-14 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # userrole: CUSTOMER -> customer, DRIVER -> driver
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE userrole RENAME VALUE 'CUSTOMER' TO 'customer'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'DRIVER' TO 'driver'")

    # ------------------------------------------------------------------
    # riderequeststatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'ACCEPTED' TO 'accepted'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'EXPIRED' TO 'expired'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'CANCELLED' TO 'cancelled'")

    # ------------------------------------------------------------------
    # driverresponsestatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'ACCEPTED' TO 'accepted'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'REJECTED' TO 'rejected'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'EXPIRED' TO 'expired'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'WITHDRAWN' TO 'withdrawn'")

    # ------------------------------------------------------------------
    # ridestatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'DRIVER_EN_ROUTE' TO 'driver_en_route'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'ARRIVED' TO 'arrived'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'IN_PROGRESS' TO 'in_progress'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'COMPLETED' TO 'completed'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'CANCELLED' TO 'cancelled'")

    # ------------------------------------------------------------------
    # verificationstatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'NOT_STARTED' TO 'not_started'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'UNDER_REVIEW' TO 'under_review'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'APPROVED' TO 'approved'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'REJECTED' TO 'rejected'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'SUSPENDED' TO 'suspended'")

    # ------------------------------------------------------------------
    # documentstatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'PENDING' TO 'pending'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'UNDER_REVIEW' TO 'under_review'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'APPROVED' TO 'approved'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'REJECTED' TO 'rejected'")

    # ------------------------------------------------------------------
    # notificationtype
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'RIDE_REQUEST' TO 'ride_request'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'RIDE_ACCEPTED' TO 'ride_accepted'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'RIDE_CANCELLED' TO 'ride_cancelled'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'RIDE_COMPLETED' TO 'ride_completed'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'DRIVER_APPROVED' TO 'driver_approved'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'DRIVER_REJECTED' TO 'driver_rejected'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'PAYMENT' TO 'payment'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'SYSTEM' TO 'system'")
    # Add SOS notification type (new value — Python model already has it)
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'sos'")

    # ------------------------------------------------------------------
    # notificationstatus
    # ------------------------------------------------------------------
    op.execute("ALTER TYPE notificationstatus RENAME VALUE 'UNREAD' TO 'unread'")
    op.execute("ALTER TYPE notificationstatus RENAME VALUE 'READ' TO 'read'")


def downgrade() -> None:
    # Reverse: lowercase -> uppercase
    # Note: PostgreSQL does not allow renaming enum values back if data exists with those values
    # in some edge cases, but this should work on a clean rollback.

    op.execute("ALTER TYPE notificationstatus RENAME VALUE 'unread' TO 'UNREAD'")
    op.execute("ALTER TYPE notificationstatus RENAME VALUE 'read' TO 'READ'")

    op.execute("ALTER TYPE notificationtype RENAME VALUE 'ride_request' TO 'RIDE_REQUEST'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'ride_accepted' TO 'RIDE_ACCEPTED'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'ride_cancelled' TO 'RIDE_CANCELLED'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'ride_completed' TO 'RIDE_COMPLETED'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'driver_approved' TO 'DRIVER_APPROVED'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'driver_rejected' TO 'DRIVER_REJECTED'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'payment' TO 'PAYMENT'")
    op.execute("ALTER TYPE notificationtype RENAME VALUE 'system' TO 'SYSTEM'")

    op.execute("ALTER TYPE documentstatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'under_review' TO 'UNDER_REVIEW'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'approved' TO 'APPROVED'")
    op.execute("ALTER TYPE documentstatus RENAME VALUE 'rejected' TO 'REJECTED'")

    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'not_started' TO 'NOT_STARTED'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'under_review' TO 'UNDER_REVIEW'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'approved' TO 'APPROVED'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'rejected' TO 'REJECTED'")
    op.execute("ALTER TYPE verificationstatus RENAME VALUE 'suspended' TO 'SUSPENDED'")

    op.execute("ALTER TYPE ridestatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'driver_en_route' TO 'DRIVER_EN_ROUTE'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'arrived' TO 'ARRIVED'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'in_progress' TO 'IN_PROGRESS'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'completed' TO 'COMPLETED'")
    op.execute("ALTER TYPE ridestatus RENAME VALUE 'cancelled' TO 'CANCELLED'")

    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'accepted' TO 'ACCEPTED'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'rejected' TO 'REJECTED'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'expired' TO 'EXPIRED'")
    op.execute("ALTER TYPE driverresponsestatus RENAME VALUE 'withdrawn' TO 'WITHDRAWN'")

    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'pending' TO 'PENDING'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'accepted' TO 'ACCEPTED'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'expired' TO 'EXPIRED'")
    op.execute("ALTER TYPE riderequeststatus RENAME VALUE 'cancelled' TO 'CANCELLED'")

    op.execute("ALTER TYPE userrole RENAME VALUE 'customer' TO 'CUSTOMER'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'driver' TO 'DRIVER'")
