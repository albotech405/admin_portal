"""
Wallet models — topup requests (proof of payment) and transaction ledger.
"""

import uuid
import enum
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class PaymentMethod(str, enum.Enum):
    MPESA = "mpesa"
    ORANGE_MONEY = "orange_money"
    AIRTEL_MONEY = "airtel_money"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"


class TopupRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class TransactionReference(str, enum.Enum):
    TOPUP = "topup"
    RIDE_COMMISSION = "ride_commission"


class WalletTopupRequest(Base):
    """Driver submits proof of payment — admin reviews and credits the wallet."""

    __tablename__ = "wallet_topup_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("driver_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(
        SAEnum(PaymentMethod, name="paymentmethod", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    proof_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(TopupRequestStatus, name="topuprequeststatus", values_callable=lambda x: [e.value for e in x]),
        default=TopupRequestStatus.PENDING,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # M-Pesa tracking fields
    mpesa_conversation_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    mpesa_transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    driver = relationship("DriverProfile", back_populates="topup_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class WalletTransaction(Base):
    """Immutable ledger entry — created on topup approval or ride commission deduction."""

    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("driver_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        SAEnum(TransactionType, name="transactiontype", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reference_type: Mapped[str] = mapped_column(
        SAEnum(TransactionReference, name="transactionreference", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    driver = relationship("DriverProfile", back_populates="wallet_transactions")
