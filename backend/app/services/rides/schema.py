"""
Ride request/response schemas.
"""

import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# SHARED
# ---------------------------------------------------------------------------

class LocationPoint(BaseModel):
    name: str = Field(..., examples=["123 Main St"])
    latitude: float = Field(..., ge=-90, le=90, examples=[-26.2041])
    longitude: float = Field(..., ge=-180, le=180, examples=[28.0473])


# ---------------------------------------------------------------------------
# REQUESTS
# ---------------------------------------------------------------------------

class CreateRideRequestSchema(BaseModel):
    picking_point: LocationPoint
    destination: LocationPoint
    suggested_price: float = Field(..., gt=0, examples=[150.00])
    comment: Optional[str] = Field(None, max_length=500)


class DriverOfferSchema(BaseModel):
    driver_price: float = Field(..., gt=0, examples=[180.00])


class SendMessageSchema(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class RateRideSchema(BaseModel):
    rate: int = Field(..., ge=1, le=5, examples=[5])
    comment: Optional[str] = Field(None, max_length=500)


class CancelRideSchema(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


class UpdateLocationSchema(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class UpdateFareSchema(BaseModel):
    proposed_fare: float = Field(..., gt=0, examples=[28.00])


class UpdateOfferSchema(BaseModel):
    offered_price: float = Field(..., gt=0, examples=[24.00])


# ---------------------------------------------------------------------------
# RESPONSES
# ---------------------------------------------------------------------------

class RideRequestResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: Optional[str] = None
    picking_point: dict
    destination: dict
    suggested_price: float
    comment: Optional[str] = None
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DriverOfferResponse(BaseModel):
    id: uuid.UUID
    ride_request_id: uuid.UUID
    driver_id: uuid.UUID
    driver_name: str
    driver_rating: float
    vehicle_info: Optional[dict] = None
    driver_price: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RideRequestWithOffersResponse(BaseModel):
    request: RideRequestResponse
    offers: List[DriverOfferResponse] = []


class RideResponse(BaseModel):
    id: uuid.UUID
    ride_request_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    driver_id: uuid.UUID
    customer_phone: Optional[str] = None
    driver_phone: Optional[str] = None
    picking_point: dict
    destination: dict
    customer_comment: Optional[str] = None
    price: float
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[uuid.UUID] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: uuid.UUID
    ride_id: uuid.UUID
    sender_id: uuid.UUID
    message: str
    sent_at: datetime

    model_config = {"from_attributes": True}


class RatingResponse(BaseModel):
    id: uuid.UUID
    ride_id: uuid.UUID
    customer_id: uuid.UUID
    driver_id: uuid.UUID
    rate: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LocationUpdateResponse(BaseModel):
    success: bool = True
    latitude: float
    longitude: float


class UpdateFareResponse(BaseModel):
    success: bool = True
    proposed_fare: float
    updated_at: datetime


class UpdateOfferResponse(BaseModel):
    success: bool = True
    response_id: uuid.UUID
    offered_price: float
    updated_at: datetime


class WithdrawOfferResponse(BaseModel):
    success: bool = True


class ArrivedResponse(BaseModel):
    success: bool = True
    status: str
    arrived_at: datetime


class RejectOfferResponse(BaseModel):
    success: bool = True


class FareEstimateResponse(BaseModel):
    vehicle_type: str
    distance_km: float
    duration_minutes: float
    estimated_fare: float
    currency: str = "CDF"
