"""
Pydantic schemas for saved addresses API.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum
import uuid


class AddressType(str, Enum):
    HOME = "home"
    WORK = "work"
    FAVORITE = "favorite"
    CUSTOM = "custom"


# Request Schemas
class CreateAddressRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Address nickname")
    address_type: AddressType = Field(default=AddressType.CUSTOM)
    display_name: str = Field(..., description="Full formatted address")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude between -180 and 180")
    street: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    is_default: bool = Field(default=False, description="Set as default address")
    notes: Optional[str] = Field(None, description="User notes about this address")


class UpdateAddressRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address_type: Optional[AddressType] = None
    display_name: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    street: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    is_default: Optional[bool] = None
    notes: Optional[str] = None


# Response Schemas
class AddressResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    address_type: AddressType
    display_name: str
    latitude: float
    longitude: float
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    postal_code: Optional[str]
    is_default: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class AddressListResponse(BaseModel):
    addresses: List[AddressResponse]
    total: int


class SuccessResponse(BaseModel):
    success: bool
    message: str


# Query parameter schemas
class AddressFilterParams(BaseModel):
    address_type: Optional[AddressType] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)