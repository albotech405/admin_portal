"""
Saved addresses model for users to store frequently used locations.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, Float, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AddressType(str, enum.Enum):
    HOME = "home"
    WORK = "work"
    FAVORITE = "favorite"
    CUSTOM = "custom"


class SavedAddress(Base):
    __tablename__ = "saved_addresses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Address details
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "Home", "Work", "Mom's House"
    address_type: Mapped[str] = mapped_column(SAEnum(AddressType), default=AddressType.CUSTOM, nullable=False)
    
    # Location data (structured)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Full formatted address
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Additional address components (optional, for better search/filtering)
    street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
    # Metadata
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)  # Default address for quick selection
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # User notes about this address
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Track usage for sorting

    # Relationships
    user = relationship("User", back_populates="saved_addresses")