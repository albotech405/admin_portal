"""
Ride-related models: requests, responses, rides, messages, ratings.
"""

import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, Text, Integer, SmallInteger, Numeric, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
import enum


# --- Enums ---

class RideRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class DriverResponseStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


class RideStatus(str, enum.Enum):
    PENDING = "pending"
    DRIVER_EN_ROUTE = "driver_en_route"
    ARRIVED = "arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# --- Models ---

class RideRequest(Base):
    """Customer broadcasts a ride request to nearby drivers."""
    __tablename__ = "ride_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    picking_point: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {name, latitude, longitude}
    destination: Mapped[dict] = mapped_column(JSONB, nullable=False)    # {name, latitude, longitude}
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(RideRequestStatus, values_callable=lambda x: [e.value for e in x]), default=RideRequestStatus.PENDING, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver_responses = relationship("DriverResponse", back_populates="ride_request", cascade="all, delete-orphan")


class DriverResponse(Base):
    """Driver responds to a ride request with their price. Temporary data."""
    __tablename__ = "driver_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("driver_profiles.id", ondelete="CASCADE"), nullable=False)
    driver_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(DriverResponseStatus, values_callable=lambda x: [e.value for e in x]), default=DriverResponseStatus.PENDING, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    ride_request = relationship("RideRequest", back_populates="driver_responses")


class Ride(Base):
    """An active/completed ride between a customer and driver."""
    __tablename__ = "rides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_request_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id"), nullable=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("driver_profiles.id"), nullable=False, index=True)
    picking_point: Mapped[dict] = mapped_column(JSONB, nullable=False)
    destination: Mapped[dict] = mapped_column(JSONB, nullable=False)
    customer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(RideStatus, values_callable=lambda x: [e.value for e in x]), default=RideStatus.PENDING, nullable=False)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    messages = relationship("RideMessage", back_populates="ride", cascade="all, delete-orphan")
    rating = relationship("RideRating", back_populates="ride", uselist=False)


class RideMessage(Base):
    """In-ride chat messages. Temporary - deleted after ride completion."""
    __tablename__ = "ride_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    ride = relationship("Ride", back_populates="messages")


class RideRating(Base):
    """Customer rates the driver after ride completion."""
    __tablename__ = "ride_ratings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="CASCADE"), unique=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("driver_profiles.id"), nullable=False, index=True)
    rate: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    ride = relationship("Ride", back_populates="rating")
