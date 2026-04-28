"""
Driver onboarding endpoints.
"""

import uuid
from fastapi import APIRouter, Depends, File, Form, UploadFile, Query, status
from sqlalchemy.orm import Session

from app.db.engine import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.drivers.driver_service import DriverService
from app.services.rides.matching_service import MatchingService
from app.services.drivers.schema import (
    CreateDriverProfileRequest,
    VehicleTypeRequest,
    CreateVehicleRequest,
    UpdateVehicleRequest,
    OnlineStatusRequest,
    UpdateLocationRequest,
    DriverProfileCreateResponse,
    VehicleTypeResponse,
    RequiredDocumentsResponse,
    RequiredDocumentItem,
    VehicleResponse,
    DocumentResponse,
    DocumentsListResponse,
    SubmitVerificationResponse,
    VerificationStatusResponse,
    DriverProfileFullResponse,
    OnlineStatusResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/drivers")


# ------------------------------------------------------------------
# NEARBY DRIVERS (customer map)
# ------------------------------------------------------------------
@router.get(
    "/nearby",
    summary="Get nearby online drivers for customer map",
)
async def get_nearby_drivers(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=5.0, gt=0, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MatchingService(db)
    drivers = service.get_nearby_drivers_for_map(latitude, longitude, radius_km)
    return {"drivers": drivers}


# ------------------------------------------------------------------
# STEP 1: CREATE DRIVER PROFILE
# ------------------------------------------------------------------
@router.post(
    "",
    response_model=DriverProfileCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create driver profile (Step 1)",
)
async def create_driver_profile(
    data: CreateDriverProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = service.create_profile(user, data)
    return DriverProfileCreateResponse(
        id=profile.id,
        user_id=profile.user_id,
        license_number=profile.license_number,
        license_expiry=profile.license_expiry,
        verification_status=profile.verification_status.value
        if hasattr(profile.verification_status, "value")
        else str(profile.verification_status),
        created_at=profile.created_at,
    )


# ------------------------------------------------------------------
# STEP 2: SAVE VEHICLE TYPE
# ------------------------------------------------------------------
@router.post(
    "/{driver_id}/vehicle-type",
    response_model=VehicleTypeResponse,
    summary="Save vehicle type (Step 2)",
)
async def save_vehicle_type(
    driver_id: uuid.UUID,
    data: VehicleTypeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = service.save_vehicle_type(driver_id, user, data)
    return VehicleTypeResponse(success=True, vehicle_type=profile.vehicle_type)


# ------------------------------------------------------------------
# STEP 2b: GET REQUIRED DOCUMENTS
# ------------------------------------------------------------------
@router.get(
    "/required-documents",
    response_model=RequiredDocumentsResponse,
    summary="Get required documents for vehicle type",
)
async def get_required_documents(
    vehicle_type: str = Query(..., pattern="^(car|motorcycle)$"),
    user: User = Depends(get_current_user),
):
    docs = DriverService.get_required_documents(vehicle_type)
    return RequiredDocumentsResponse(
        documents=[RequiredDocumentItem(**d) for d in docs]
    )


# ------------------------------------------------------------------
# STEP 3: CREATE VEHICLE
# ------------------------------------------------------------------
@router.post(
    "/{driver_id}/vehicle",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save vehicle details (Step 3)",
)
async def create_vehicle(
    driver_id: uuid.UUID,
    data: CreateVehicleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return service.create_vehicle(driver_id, user, data)


# ------------------------------------------------------------------
# STEP 3.5: UPDATE VEHICLE
# ------------------------------------------------------------------
@router.put(
    "/{driver_id}/vehicle/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update vehicle details",
)
async def update_vehicle(
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
    data: UpdateVehicleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return service.update_vehicle(driver_id, vehicle_id, user, data)


# ------------------------------------------------------------------
# STEP 4: UPLOAD DOCUMENT
# ------------------------------------------------------------------
@router.post(
    "/{driver_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document (Step 4)",
)
async def upload_document(
    driver_id: uuid.UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return await service.upload_document(driver_id, user, document_type, file)


# ------------------------------------------------------------------
# GET DOCUMENTS
# ------------------------------------------------------------------
@router.get(
    "/{driver_id}/documents",
    response_model=DocumentsListResponse,
    summary="Get uploaded documents",
)
async def get_documents(
    driver_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    docs = service.get_documents(driver_id, user)
    return DocumentsListResponse(documents=docs)


# ------------------------------------------------------------------
# DELETE DOCUMENT
# ------------------------------------------------------------------
@router.delete(
    "/{driver_id}/documents/{document_id}",
    response_model=SuccessResponse,
    summary="Delete a document",
)
async def delete_document(
    driver_id: uuid.UUID,
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    service.delete_document(driver_id, document_id, user)
    return SuccessResponse(success=True)


# ------------------------------------------------------------------
# STEP 5: SUBMIT FOR VERIFICATION
# ------------------------------------------------------------------
@router.post(
    "/{driver_id}/submit-verification",
    response_model=SubmitVerificationResponse,
    summary="Submit for verification (Step 5)",
)
async def submit_verification(
    driver_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return service.submit_verification(driver_id, user)


# ------------------------------------------------------------------
# GET VERIFICATION STATUS
# ------------------------------------------------------------------
@router.get(
    "/{driver_id}/verification-status",
    response_model=VerificationStatusResponse,
    summary="Get verification status",
)
async def get_verification_status(
    driver_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return service.get_verification_status(driver_id, user)


# ------------------------------------------------------------------
# GET DRIVER PROFILE BY USER ID (3.11b)
# ------------------------------------------------------------------
@router.get(
    "/by-user/{user_id}",
    response_model=DriverProfileFullResponse,
    summary="Get driver profile by user_id",
)
async def get_driver_profile_by_user(
    user_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = service.get_driver_profile_by_user_id(user_id)
    vs = profile.verification_status
    return DriverProfileFullResponse(
        id=profile.id,
        user_id=profile.user_id,
        license_number=profile.license_number,
        license_expiry=profile.license_expiry,
        vehicle=profile.vehicle,
        documents=profile.documents,
        verification_status=vs.value if hasattr(vs, "value") else str(vs),
        is_online=profile.is_online,
        rating=profile.rating,
        total_trips=profile.total_rides,
        created_at=profile.created_at,
    )


# ------------------------------------------------------------------
# GET DRIVER PROFILE (FULL)
# ------------------------------------------------------------------
@router.get(
    "/{driver_id}",
    response_model=DriverProfileFullResponse,
    summary="Get full driver profile",
)
async def get_driver_profile(
    driver_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = service.get_driver_profile(driver_id, user)
    vs = profile.verification_status
    return DriverProfileFullResponse(
        id=profile.id,
        user_id=profile.user_id,
        license_number=profile.license_number,
        license_expiry=profile.license_expiry,
        vehicle=profile.vehicle,
        documents=profile.documents,
        verification_status=vs.value if hasattr(vs, "value") else str(vs),
        is_online=profile.is_online,
        rating=profile.rating,
        total_trips=profile.total_rides,
        created_at=profile.created_at,
    )


# ------------------------------------------------------------------
# SET ONLINE STATUS
# ------------------------------------------------------------------
@router.put(
    "/{driver_id}/online-status",
    response_model=OnlineStatusResponse,
    summary="Set online/offline status",
)
async def set_online_status(
    driver_id: uuid.UUID,
    data: OnlineStatusRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    return service.set_online_status(driver_id, user, data)


# ------------------------------------------------------------------
# UPDATE DRIVER LOCATION
# ------------------------------------------------------------------
@router.put(
    "/{driver_id}/location",
    summary="Update driver's current GPS location",
)
async def update_driver_location(
    driver_id: uuid.UUID,
    data: UpdateLocationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MatchingService(db)
    service.update_driver_location(driver_id, user.id, data.latitude, data.longitude)
    return {"success": True}


# ------------------------------------------------------------------
# ADMIN ENDPOINTS
# ------------------------------------------------------------------
@router.patch(
    "/{driver_profile_id}/activate",
    response_model=DriverProfileFullResponse,
    summary="Activate a driver profile (admin)",
)
async def activate_profile(
    driver_profile_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = await service.activate_profile(driver_profile_id)
    vs = profile.verification_status
    return DriverProfileFullResponse(
        id=profile.id,
        user_id=profile.user_id,
        license_number=profile.license_number,
        license_expiry=profile.license_expiry,
        vehicle=profile.vehicle,
        documents=profile.documents,
        verification_status=vs.value if hasattr(vs, "value") else str(vs),
        is_online=profile.is_online,
        rating=profile.rating,
        total_trips=profile.total_rides,
        created_at=profile.created_at,
    )


@router.patch(
    "/{driver_profile_id}/deactivate",
    response_model=DriverProfileFullResponse,
    summary="Deactivate a driver profile (admin)",
)
async def deactivate_profile(
    driver_profile_id: uuid.UUID,
    feedback: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    profile = await service.deactivate_profile(driver_profile_id, feedback=feedback)
    vs = profile.verification_status
    return DriverProfileFullResponse(
        id=profile.id,
        user_id=profile.user_id,
        license_number=profile.license_number,
        license_expiry=profile.license_expiry,
        vehicle=profile.vehicle,
        documents=profile.documents,
        verification_status=vs.value if hasattr(vs, "value") else str(vs),
        is_online=profile.is_online,
        rating=profile.rating,
        total_trips=profile.total_rides,
        created_at=profile.created_at,
    )


@router.delete(
    "/{driver_profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a driver profile (admin)",
)
async def delete_profile(
    driver_profile_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DriverService(db)
    service.delete_profile(driver_profile_id)
