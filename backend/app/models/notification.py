"""
Notification model.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
import enum


class NotificationType(str, enum.Enum):
    RIDE_REQUEST = "ride_request"
    RIDE_ACCEPTED = "ride_accepted"
    RIDE_CANCELLED = "ride_cancelled"
    RIDE_COMPLETED = "ride_completed"
    DRIVER_APPROVED = "driver_approved"
    DRIVER_REJECTED = "driver_rejected"
    PAYMENT = "payment"
    SYSTEM = "system"
    SOS = "sos"


class NotificationStatus(str, enum.Enum):
    UNREAD = "unread"
    READ = "read"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(SAEnum(NotificationType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(NotificationStatus, values_callable=lambda x: [e.value for e in x]), default=NotificationStatus.UNREAD, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
