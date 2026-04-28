"""
Pydantic schemas for SOS endpoints.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, AliasChoices


# ------------------------------------------------------------------
# EMERGENCY CONTACTS
# ------------------------------------------------------------------

class CreateEmergencyContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    # Accept both "phone_number" and "phone" (frontend compatibility)
    phone_number: str = Field(
        ...,
        validation_alias=AliasChoices("phone_number", "phone"),
        min_length=7,
        max_length=20,
        description="E.164 format e.g. +243812345678",
    )
    relationship: str = Field(..., min_length=1, max_length=50, description="e.g. Brother, Friend, Wife")

    model_config = {"populate_by_name": True}


class UpdateEmergencyContactRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("phone_number", "phone"),
        min_length=7,
        max_length=20,
    )
    relationship: Optional[str] = Field(None, min_length=1, max_length=50)

    model_config = {"populate_by_name": True}


class EmergencyContactResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    phone_number: str
    phone: str = ""  # alias for frontend compatibility
    contact_relationship: str
    relationship: str = ""  # alias for frontend compatibility
    created_at: datetime

    model_config = {"from_attributes": True}

    def model_post_init(self, __context) -> None:
        object.__setattr__(self, "phone", self.phone_number)
        object.__setattr__(self, "relationship", self.contact_relationship)


class EmergencyContactListResponse(BaseModel):
    contacts: List[EmergencyContactResponse]
    total: int


# ------------------------------------------------------------------
# SOS TRIGGER
# ------------------------------------------------------------------

class TriggerSosRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    ride_id: Optional[uuid.UUID] = Field(None, description="Active ride ID if SOS triggered during a ride")


class UpdateSosLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ------------------------------------------------------------------
# SOS SESSION RESPONSES
# ------------------------------------------------------------------

class SosSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    token: str
    is_active: bool
    triggered_at: datetime
    expires_at: datetime
    last_latitude: Optional[float]
    last_longitude: Optional[float]
    last_location_update: Optional[datetime]
    cancelled_at: Optional[datetime]
    ride_id: Optional[uuid.UUID]
    tracking_url: str

    model_config = {"from_attributes": True}


class SosTrackingData(BaseModel):
    """Public response — no sensitive user data, used by the tracking page."""
    user_name: str
    is_active: bool
    triggered_at: datetime
    last_latitude: Optional[float]
    last_longitude: Optional[float]
    last_location_update: Optional[datetime]
    expires_at: datetime
