"""
Driver onboarding service - 5-step driver registration flow.
"""

import uuid
import os
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.models.user import User, UserRole
from app.models.driver import (
    DriverProfile, VehicleDetails, DriverDocument,
    VerificationStatus, DocumentStatus,
)
from app.core.supabase import supabase_admin
from app.core.config import settings
from app.services.notifications.notification_service import NotificationService

DRIVER_DOCUMENTS_BUCKET = "driver-documents"

# Required documents per vehicle type
CAR_DOCUMENTS = [
    {"type": "drivers_license", "name": "Driver's License", "required": True},
    {"type": "national_id", "name": "National ID (Carte Electeur / Passport)", "required": True},
    {"type": "selfie_with_id", "name": "Selfie Holding ID/License", "required": True},
    {"type": "vehicle_registration", "name": "Vehicle Registration", "required": True},
    {"type": "insurance", "name": "Insurance Certificate", "required": True},
    {"type": "profile_photo", "name": "Profile Photo", "required": True},
    {"type": "vehicle_photo_front", "name": "Vehicle Photo - Front", "required": True},
    {"type": "vehicle_photo_back", "name": "Vehicle Photo - Back", "required": True},
    {"type": "vehicle_photo_left", "name": "Vehicle Photo - Left Side", "required": True},
    {"type": "vehicle_photo_right", "name": "Vehicle Photo - Right Side", "required": True},
]

MOTORCYCLE_DOCUMENTS = [
    {"type": "drivers_license", "name": "Driver's License", "required": True},
    {"type": "national_id", "name": "National ID (Carte Electeur / Passport)", "required": True},
    {"type": "selfie_with_id", "name": "Selfie Holding ID/License", "required": True},
    {"type": "vehicle_registration", "name": "Vehicle Registration", "required": True},
    {"type": "insurance", "name": "Insurance Certificate", "required": True},
    {"type": "profile_photo", "name": "Profile Photo", "required": True},
    {"type": "vehicle_photo_front", "name": "Vehicle Photo - Front", "required": True},
    {"type": "vehicle_photo_back", "name": "Vehicle Photo - Back", "required": True},
]


class DriverService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # STEP 1: CREATE DRIVER PROFILE
    # ------------------------------------------------------------------
    def create_profile(self, user: User, data) -> DriverProfile:
        existing = self.db.query(DriverProfile).filter(DriverProfile.user_id == user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Driver profile already exists for this user.",
            )

        profile = DriverProfile(
            user_id=user.id,
            license_number=data.license_number,
            license_expiry=data.license_expiry,
            verification_status=VerificationStatus.PENDING,
        )
        self.db.add(profile)

        user.role = UserRole.DRIVER

        self.db.commit()
        self.db.refresh(profile)
        return profile

    # ------------------------------------------------------------------
    # STEP 2: SAVE VEHICLE TYPE
    # ------------------------------------------------------------------
    def save_vehicle_type(self, driver_id: uuid.UUID, user: User, data) -> DriverProfile:
        profile = self._get_own_profile(driver_id, user)
        profile.vehicle_type = data.vehicle_type
        self.db.commit()
        self.db.refresh(profile)
        return profile

    # ------------------------------------------------------------------
    # STEP 2b: GET REQUIRED DOCUMENTS
    # ------------------------------------------------------------------
    @staticmethod
    def get_required_documents(vehicle_type: str) -> list[dict]:
        if vehicle_type == "car":
            return CAR_DOCUMENTS
        elif vehicle_type == "motorcycle":
            return MOTORCYCLE_DOCUMENTS
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vehicle type. Must be 'car' or 'motorcycle'.",
            )

    # ------------------------------------------------------------------
    # STEP 3: CREATE VEHICLE
    # ------------------------------------------------------------------
    def create_vehicle(self, driver_id: uuid.UUID, user: User, data) -> VehicleDetails:
        profile = self._get_own_profile(driver_id, user)

        if profile.vehicle:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vehicle already exists. Use PUT to update.",
            )

        plate_exists = (
            self.db.query(VehicleDetails)
            .filter(VehicleDetails.license_plate == data.license_plate)
            .first()
        )
        if plate_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A vehicle with this plate number already exists.",
            )

        vehicle = VehicleDetails(
            driver_id=profile.id,
            vehicle_type=data.vehicle_type,
            license_plate=data.license_plate,
            make=data.make,
            model=data.model,
            year=data.year,
            color=data.color,
            passenger_capacity=data.passenger_capacity,
            has_air_conditioning=data.has_air_conditioning,
            provides_helmet=data.provides_helmet,
        )
        self.db.add(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    # ------------------------------------------------------------------
    # STEP 3.5: UPDATE VEHICLE
    # ------------------------------------------------------------------
    def update_vehicle(self, driver_id: uuid.UUID, vehicle_id: uuid.UUID, user: User, data) -> VehicleDetails:
        profile = self._get_own_profile(driver_id, user)

        vehicle = (
            self.db.query(VehicleDetails)
            .filter(VehicleDetails.id == vehicle_id, VehicleDetails.driver_id == profile.id)
            .first()
        )
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found.",
            )

        if data.license_plate and data.license_plate != vehicle.license_plate:
            plate_exists = (
                self.db.query(VehicleDetails)
                .filter(
                    VehicleDetails.license_plate == data.license_plate,
                    VehicleDetails.id != vehicle.id,
                )
                .first()
            )
            if plate_exists:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A vehicle with this plate number already exists.",
                )
            vehicle.license_plate = data.license_plate

        for field in ["vehicle_type", "make", "model", "year", "color",
                       "passenger_capacity", "has_air_conditioning", "provides_helmet"]:
            value = getattr(data, field, None)
            if value is not None:
                setattr(vehicle, field, value)

        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    # ------------------------------------------------------------------
    # STEP 4: UPLOAD DOCUMENT
    # ------------------------------------------------------------------
    async def upload_document(
        self, driver_id: uuid.UUID, user: User,
        document_type: str, file: UploadFile,
    ) -> DriverDocument:
        profile = self._get_own_profile(driver_id, user)

        # Validate document type
        valid_types = {d["type"] for d in CAR_DOCUMENTS}  # superset of motorcycle types
        if document_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document type: {document_type}",
            )

        # Validate file extension
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in settings.allowed_file_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '.{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
            )

        # Delete existing document of same type (replace)
        existing_doc = (
            self.db.query(DriverDocument)
            .filter(DriverDocument.driver_id == profile.id, DriverDocument.document_type == document_type)
            .first()
        )
        if existing_doc:
            self._delete_storage_file(existing_doc.file_url)
            self.db.delete(existing_doc)
            self.db.flush()

        # Upload to Supabase storage
        file_content = await file.read()
        timestamp = int(datetime.now(timezone.utc).timestamp())
        storage_path = f"{profile.id}/{document_type}_{timestamp}.{ext}"

        try:
            supabase_admin.storage.from_(DRIVER_DOCUMENTS_BUCKET).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}",
            )

        file_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{DRIVER_DOCUMENTS_BUCKET}/{storage_path}"

        doc = DriverDocument(
            driver_id=profile.id,
            document_type=document_type,
            file_url=file_url,
            status=DocumentStatus.PENDING,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    # ------------------------------------------------------------------
    # GET DOCUMENTS
    # ------------------------------------------------------------------
    def get_documents(self, driver_id: uuid.UUID, user: User) -> list[DriverDocument]:
        profile = self._get_own_profile(driver_id, user)
        return (
            self.db.query(DriverDocument)
            .filter(DriverDocument.driver_id == profile.id)
            .order_by(DriverDocument.uploaded_at)
            .all()
        )

    # ------------------------------------------------------------------
    # DELETE DOCUMENT
    # ------------------------------------------------------------------
    def delete_document(self, driver_id: uuid.UUID, document_id: uuid.UUID, user: User) -> None:
        profile = self._get_own_profile(driver_id, user)

        doc = (
            self.db.query(DriverDocument)
            .filter(DriverDocument.id == document_id, DriverDocument.driver_id == profile.id)
            .first()
        )
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

        self._delete_storage_file(doc.file_url)
        self.db.delete(doc)
        self.db.commit()

    # ------------------------------------------------------------------
    # STEP 5: SUBMIT FOR VERIFICATION
    # ------------------------------------------------------------------
    def submit_verification(self, driver_id: uuid.UUID, user: User) -> dict:
        profile = self._get_own_profile(driver_id, user)

        if not profile.vehicle_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle type not selected.",
            )

        # Determine required documents
        required = CAR_DOCUMENTS if profile.vehicle_type == "car" else MOTORCYCLE_DOCUMENTS
        required_types = {d["type"] for d in required}

        # Check uploaded documents
        uploaded_docs = (
            self.db.query(DriverDocument)
            .filter(DriverDocument.driver_id == profile.id)
            .all()
        )
        uploaded_types = {d.document_type for d in uploaded_docs}
        missing = required_types - uploaded_types

        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": "Missing required documents",
                    "missing_documents": sorted(missing),
                },
            )

        # Check vehicle exists
        if not profile.vehicle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle details not provided.",
            )

        profile.verification_status = VerificationStatus.UNDER_REVIEW
        profile.submitted_at = datetime.now(timezone.utc)
        self.db.commit()

        return {
            "success": True,
            "verification_status": "under_review",
            "estimated_review_time": "24-48 hours",
        }

    # ------------------------------------------------------------------
    # GET VERIFICATION STATUS
    # ------------------------------------------------------------------
    def get_verification_status(self, driver_id: uuid.UUID, user: User) -> dict:
        profile = self._get_own_profile(driver_id, user)

        docs = (
            self.db.query(DriverDocument)
            .filter(DriverDocument.driver_id == profile.id)
            .all()
        )

        documents_status = [
            {"type": d.document_type, "status": d.status.value if hasattr(d.status, "value") else str(d.status)}
            for d in docs
        ]

        estimated_completion = None
        if profile.submitted_at:
            estimated_completion = profile.submitted_at + timedelta(hours=48)

        return {
            "status": profile.verification_status.value if hasattr(profile.verification_status, "value") else str(profile.verification_status),
            "submitted_at": profile.submitted_at,
            "estimated_completion": estimated_completion,
            "documents_status": documents_status,
        }

    # ------------------------------------------------------------------
    # GET DRIVER PROFILE (FULL)
    # ------------------------------------------------------------------
    def get_driver_profile(self, driver_id: uuid.UUID, user: User) -> DriverProfile:
        """
        Look up by profile id first. If not found, try treating the id as a user_id —
        handles the common case where the app passes user_id instead of profile id.
        """
        opts = [
            joinedload(DriverProfile.user),
            joinedload(DriverProfile.vehicle),
            joinedload(DriverProfile.documents),
        ]
        profile = (
            self.db.query(DriverProfile)
            .options(*opts)
            .filter(DriverProfile.id == driver_id)
            .first()
        )
        if not profile:
            # Fallback: the caller may have passed user_id instead of profile id
            profile = (
                self.db.query(DriverProfile)
                .options(*opts)
                .filter(DriverProfile.user_id == driver_id)
                .first()
            )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        if profile.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return profile

    # ------------------------------------------------------------------
    # SET ONLINE STATUS
    # ------------------------------------------------------------------
    def set_online_status(self, driver_id: uuid.UUID, user: User, data) -> dict:
        profile = self._get_own_profile(driver_id, user)

        vs = profile.verification_status
        status_val = vs.value if hasattr(vs, "value") else str(vs)
        if status_val != VerificationStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only approved drivers can go online.",
            )

        profile.is_online = data.is_online
        self.db.commit()

        return {"success": True, "is_online": profile.is_online}

    # ------------------------------------------------------------------
    # ADMIN: ACTIVATE PROFILE
    # ------------------------------------------------------------------
    async def activate_profile(self, driver_profile_id: uuid.UUID) -> DriverProfile:
        profile = self._load_profile(driver_profile_id)
        profile.verification_status = VerificationStatus.APPROVED
        profile.activation_date = datetime.now(timezone.utc)
        self.db.commit()

        # Notify driver their account is approved
        driver_user = self.db.query(User).filter(User.id == profile.user_id).first()
        await NotificationService.send_to_user(
            driver_user,
            title="Account approved!",
            body="Your driver account has been approved. You can now go online and accept rides.",
            data={"type": "account_approved"},
        )

        return self._load_profile_full(driver_profile_id)

    # ------------------------------------------------------------------
    # ADMIN: DEACTIVATE PROFILE
    # ------------------------------------------------------------------
    async def deactivate_profile(self, driver_profile_id: uuid.UUID, feedback: str | None = None) -> DriverProfile:
        profile = self._load_profile(driver_profile_id)
        profile.verification_status = VerificationStatus.SUSPENDED
        profile.is_online = False
        if feedback is not None:
            profile.verification_feedback = feedback
        self.db.commit()

        # Notify driver their account has been suspended
        driver_user = self.db.query(User).filter(User.id == profile.user_id).first()
        body = feedback or "Your driver account has been suspended. Please contact support for more information."
        await NotificationService.send_to_user(
            driver_user,
            title="Account suspended",
            body=body,
            data={"type": "account_suspended"},
        )

        return self._load_profile_full(driver_profile_id)

    # ------------------------------------------------------------------
    # ADMIN: DELETE PROFILE
    # ------------------------------------------------------------------
    def delete_profile(self, driver_profile_id: uuid.UUID) -> None:
        profile = (
            self.db.query(DriverProfile)
            .options(joinedload(DriverProfile.user))
            .filter(DriverProfile.id == driver_profile_id)
            .first()
        )
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver profile not found.",
            )

        profile.user.role = UserRole.CUSTOMER
        self.db.delete(profile)
        self.db.commit()

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------
    def _get_own_profile(self, driver_id: uuid.UUID, user: User) -> DriverProfile:
        """Load profile and verify ownership."""
        profile = self.db.query(DriverProfile).filter(DriverProfile.id == driver_id).first()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        if profile.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return profile

    def _get_own_profile_full(self, driver_id: uuid.UUID, user: User) -> DriverProfile:
        """Load profile with all relationships and verify ownership."""
        profile = (
            self.db.query(DriverProfile)
            .options(
                joinedload(DriverProfile.user),
                joinedload(DriverProfile.vehicle),
                joinedload(DriverProfile.documents),
            )
            .filter(DriverProfile.id == driver_id)
            .first()
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        if profile.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return profile

    def _load_profile(self, profile_id: uuid.UUID) -> DriverProfile:
        profile = self.db.query(DriverProfile).filter(DriverProfile.id == profile_id).first()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        return profile

    def get_driver_profile_by_user_id(self, user_id: uuid.UUID) -> DriverProfile:
        """Look up a driver profile by user_id (for the Flutter app which only knows user_id from auth)."""
        profile = (
            self.db.query(DriverProfile)
            .options(
                joinedload(DriverProfile.user),
                joinedload(DriverProfile.vehicle),
                joinedload(DriverProfile.documents),
            )
            .filter(DriverProfile.user_id == user_id)
            .first()
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        return profile

    def _load_profile_full(self, profile_id: uuid.UUID) -> DriverProfile:
        return (
            self.db.query(DriverProfile)
            .options(
                joinedload(DriverProfile.user),
                joinedload(DriverProfile.vehicle),
                joinedload(DriverProfile.documents),
            )
            .filter(DriverProfile.id == profile_id)
            .first()
        )

    @staticmethod
    def _delete_storage_file(file_url: str) -> None:
        """Delete a file from Supabase storage by its public URL."""
        try:
            prefix = f"/storage/v1/object/public/{DRIVER_DOCUMENTS_BUCKET}/"
            if prefix in file_url:
                path = file_url.split(prefix, 1)[1]
                supabase_admin.storage.from_(DRIVER_DOCUMENTS_BUCKET).remove([path])
        except Exception:
            pass  # Non-critical: storage cleanup failure shouldn't block the operation
