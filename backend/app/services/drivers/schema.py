"""
Driver onboarding request/response schemas.
"""

import uuid
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# REQUESTS
# ---------------------------------------------------------------------------

class CreateDriverProfileRequest(BaseModel):
    user_id: uuid.UUID = Field(..., description="UUID from signup")
    license_number: str = Field(..., min_length=1, max_length=50, examples=["DRV123456789"])
    license_expiry: date = Field(..., examples=["2027-12-31"])


class VehicleTypeRequest(BaseModel):
    vehicle_type: str = Field(..., pattern="^(car|motorcycle)$", examples=["car"])


class CreateVehicleRequest(BaseModel):
    vehicle_type: str = Field(..., pattern="^(car|motorcycle)$", examples=["car"])
    license_plate: str = Field(..., min_length=1, max_length=20, examples=["ABC 123 GP"])
    make: str = Field(..., min_length=1, max_length=50, examples=["Toyota"])
    model: str = Field(..., min_length=1, max_length=50, examples=["Corolla"])
    year: int = Field(..., ge=1900, le=2100, examples=[2022])
    color: str = Field(..., min_length=1, max_length=50, examples=["White"])
    passenger_capacity: Optional[int] = Field(None, ge=1, le=20, examples=[4])
    has_air_conditioning: Optional[bool] = Field(None, examples=[True])
    provides_helmet: Optional[bool] = Field(None, examples=[True])


class UpdateVehicleRequest(BaseModel):
    vehicle_type: Optional[str] = Field(None, pattern="^(car|motorcycle)$")
    license_plate: Optional[str] = Field(None, min_length=1, max_length=20)
    make: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    color: Optional[str] = Field(None, min_length=1, max_length=50)
    passenger_capacity: Optional[int] = Field(None, ge=1, le=20)
    has_air_conditioning: Optional[bool] = None
    provides_helmet: Optional[bool] = None


class OnlineStatusRequest(BaseModel):
    is_online: bool


class UpdateLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ---------------------------------------------------------------------------
# RESPONSES
# ---------------------------------------------------------------------------

class DriverProfileCreateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    license_number: str
    license_expiry: date
    verification_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VehicleTypeResponse(BaseModel):
    success: bool = True
    vehicle_type: str


class RequiredDocumentItem(BaseModel):
    type: str
    name: str
    required: bool = True


class RequiredDocumentsResponse(BaseModel):
    documents: List[RequiredDocumentItem]


class VehicleResponse(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    vehicle_type: str
    license_plate: str
    make: str
    model: str
    year: int
    color: str
    passenger_capacity: Optional[int] = None
    has_air_conditioning: Optional[bool] = None
    provides_helmet: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    document_type: str
    file_url: str
    status: str
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class DocumentsListResponse(BaseModel):
    documents: List[DocumentResponse]


class SubmitVerificationResponse(BaseModel):
    success: bool
    verification_status: str
    estimated_review_time: str = "24-48 hours"


class SubmitVerificationErrorResponse(BaseModel):
    success: bool = False
    error: str
    missing_documents: List[str]


class DocumentStatusItem(BaseModel):
    type: str
    status: str


class VerificationStatusResponse(BaseModel):
    status: str
    submitted_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    documents_status: List[DocumentStatusItem]


class DriverProfileFullResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    license_number: str
    license_expiry: date
    vehicle: Optional[VehicleResponse] = None
    documents: List[DocumentResponse] = []
    verification_status: str
    is_online: bool
    rating: float
    total_trips: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class OnlineStatusResponse(BaseModel):
    success: bool = True
    is_online: bool


class SuccessResponse(BaseModel):
    success: bool = True
