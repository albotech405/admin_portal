from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timezone
from app.core.dependencies import require_admin
from app.core.supabase import get_supabase

router = APIRouter(prefix="/drivers", tags=["drivers"])


class DriverAdminListItem(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    license_number: str
    license_expiry: str
    vehicle_type: Optional[str] = None
    verification_status: str
    is_online: bool = False
    rating: float = 0.0
    total_trips: int = 0
    credit_balance: float = 0.0
    submitted_at: Optional[str] = None
    activation_date: Optional[str] = None
    verification_feedback: Optional[str] = None
    created_at: str


class DriverAdminListResponse(BaseModel):
    drivers: List[DriverAdminListItem]
    total: int


class VehicleDetail(BaseModel):
    id: str
    vehicle_type: str
    license_plate: str
    make: str
    model: str
    year: int
    color: str
    passenger_capacity: Optional[int] = None
    has_air_conditioning: Optional[bool] = None
    provides_helmet: Optional[bool] = None


class DriverDocumentItem(BaseModel):
    id: str
    document_type: str
    file_url: str
    status: str
    uploaded_at: str
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None


class DriverProfileFullResponse(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    profile_image_url: Optional[str] = None
    license_number: str
    license_expiry: str
    vehicle_type: Optional[str] = None
    verification_status: str
    is_online: bool = False
    rating: float = 0.0
    total_trips: int = 0
    credit_balance: float = 0.0
    category: Optional[str] = None
    gender: Optional[str] = None
    passenger_preference: str = "any"
    address: Optional[str] = None
    payment_phone: Optional[str] = None
    mobile_money_mpesa: Optional[str] = None
    mobile_money_orange: Optional[str] = None
    mobile_money_airtel: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    submitted_at: Optional[str] = None
    activation_date: Optional[str] = None
    verification_feedback: Optional[str] = None
    created_at: str
    vehicle: Optional[VehicleDetail] = None
    documents: List[DriverDocumentItem] = []


class UpdateCategoryBody(BaseModel):
    category: Literal["standard", "premium", "lady_driver"]


class SuspendDriverBody(BaseModel):
    reason: str
    end_date: Optional[str] = None  # ISO date string, or null for indefinite
    appeal_contact: Optional[str] = None


class UnsuspendDriverBody(BaseModel):
    note: Optional[str] = None


_DRIVER_FIELDS = {f for f in DriverAdminListItem.model_fields if f not in ("full_name", "phone_number", "total_trips")}

_FULL_PROFILE_FIELDS = {
    "id", "user_id", "license_number", "license_expiry", "vehicle_type",
    "verification_status", "is_online", "rating", "total_rides", "credit_balance",
    "category", "gender", "passenger_preference", "address", "payment_phone",
    "mobile_money_mpesa", "mobile_money_orange", "mobile_money_airtel",
    "latitude", "longitude", "submitted_at", "activation_date",
    "verification_feedback", "created_at",
}


@router.get("/admin/list", response_model=DriverAdminListResponse)
def list_drivers(
    verification_status: Optional[str] = Query(None),
    _user=Depends(require_admin),
):
    try:
        sb = get_supabase()
        query = sb.table("driver_profiles").select(
            "*, users(full_name, phone_number)"
        )
        if verification_status:
            query = query.eq("verification_status", verification_status)
        result = query.order("created_at", desc=True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    drivers = []
    for r in result.data or []:
        user_info = r.pop("users", {}) or {}
        row_fields = {k: v for k, v in r.items() if k in _DRIVER_FIELDS}
        drivers.append(DriverAdminListItem(
            **row_fields,
            full_name=user_info.get("full_name"),
            phone_number=user_info.get("phone_number"),
            total_trips=r.get("total_rides", 0) or 0,
        ))

    return DriverAdminListResponse(drivers=drivers, total=len(drivers))


@router.get("/{driver_id}", response_model=DriverProfileFullResponse)
def get_driver_detail(driver_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        result = (
            sb.table("driver_profiles")
            .select(
                "*, users(full_name, phone_number, email, profile_image_url), "
                "vehicle_details(*), driver_documents(*)"
            )
            .eq("id", driver_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not result.data:
        raise HTTPException(status_code=404, detail="Driver not found")

    r = result.data
    user_info = r.pop("users", {}) or {}
    vehicle_data = r.pop("vehicle_details", None)
    documents_data = r.pop("driver_documents", []) or []

    row_fields = {k: v for k, v in r.items() if k in _FULL_PROFILE_FIELDS}

    vehicle = None
    if vehicle_data:
        vehicle = VehicleDetail(**vehicle_data)

    documents = []
    for doc in documents_data:
        documents.append(DriverDocumentItem(**doc))

    return DriverProfileFullResponse(
        **row_fields,
        full_name=user_info.get("full_name"),
        phone_number=user_info.get("phone_number"),
        email=user_info.get("email"),
        profile_image_url=user_info.get("profile_image_url"),
        total_trips=r.get("total_rides", 0) or 0,
        vehicle=vehicle,
        documents=documents,
    )


@router.patch("/{driver_id}/category", response_model=DriverProfileFullResponse)
def update_driver_category(
    driver_id: str,
    body: UpdateCategoryBody,
    _user=Depends(require_admin),
):
    try:
        sb = get_supabase()
        sb.table("driver_profiles").update({"category": body.category}).eq("id", driver_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Return full updated profile
    return get_driver_detail(driver_id, _user)


@router.delete("/{driver_profile_id}", status_code=204)
def delete_driver(driver_profile_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        # Delete related records first (driver_documents, vehicle_details)
        sb.table("driver_documents").delete().eq("driver_id", driver_profile_id).execute()
        sb.table("vehicle_details").delete().eq("driver_id", driver_profile_id).execute()
        # Delete the driver profile
        result = sb.table("driver_profiles").delete().eq("id", driver_profile_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not result.data:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    return None


@router.patch("/{driver_id}/activate")
def activate_driver(driver_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        result = sb.table("driver_profiles").update({"verification_status": "approved"}).eq("id", driver_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not result.data:
        return {"message": "Driver not found or already approved"}
    return {"message": "Driver activated"}


@router.patch("/{driver_id}/suspend")
def suspend_driver(driver_id: str, body: SuspendDriverBody, _user=Depends(require_admin)):
    """
    Suspend a driver with full metadata: reason, optional end date, optional appeal contact.
    The driver-side SuspendedPage surfaces the reason verbatim.
    For indefinite suspensions, end_date should be null (two-person rule enforced client-side).
    """
    if not body.reason or len(body.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Suspension reason must be at least 10 characters")
    try:
        sb = get_supabase()
        update_data = {
            "verification_status": "suspended",
            "verification_feedback": body.reason.strip(),
        }
        if body.end_date:
            update_data["suspension_end_date"] = body.end_date
        if body.appeal_contact:
            update_data["appeal_contact"] = body.appeal_contact

        result = sb.table("driver_profiles").update(update_data).eq("id", driver_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not result.data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver suspended", "reason": body.reason.strip()}


@router.patch("/{driver_id}/unsuspend")
def unsuspend_driver(driver_id: str, body: UnsuspendDriverBody = UnsuspendDriverBody(), _user=Depends(require_admin)):
    """
    Reinstate a suspended driver. Clears suspension metadata and sets status back to 'approved'.
    Sends a fixed "Your account has been reinstated" message.
    """
    try:
        sb = get_supabase()
        update_data = {
            "verification_status": "approved",
            "verification_feedback": None,
            "suspension_end_date": None,
            "appeal_contact": None,
        }
        result = sb.table("driver_profiles").update(update_data).eq("id", driver_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not result.data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver reinstated"}


# ── Driver profile tab endpoints ───────────────────────────────────────────────

@router.get("/{driver_id}/trips")
def get_driver_trips(
    driver_id: str,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _user=Depends(require_admin),
):
    """Trips for a driver profile. rides.driver_id is a FK to driver_profiles.id."""
    sb = get_supabase()
    try:
        result = (
            sb.table("rides")
            .select("id, status, picking_point, destination, price, created_at, customer_id")
            .eq("driver_id", driver_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        count_result = (
            sb.table("rides")
            .select("id", count="exact")
            .eq("driver_id", driver_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"trips": result.data or [], "total": count_result.count or 0}


@router.get("/{driver_id}/earnings")
def get_driver_earnings(
    driver_id: str,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _user=Depends(require_admin),
):
    """Wallet transactions for this driver. wallet_transactions.driver_id is a FK to driver_profiles.id."""
    sb = get_supabase()
    try:
        profile = sb.table("driver_profiles").select("credit_balance").eq("id", driver_id).maybe_single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not profile.data:
        raise HTTPException(status_code=404, detail="Driver not found")

    credit_balance = float(profile.data.get("credit_balance") or 0)

    try:
        result = (
            sb.table("wallet_transactions")
            .select("id, type, amount, balance_after, description, created_at, reference_id, reference_type")
            .eq("driver_id", driver_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        count_result = (
            sb.table("wallet_transactions")
            .select("id", count="exact")
            .eq("driver_id", driver_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "transactions": result.data or [],
        "total": count_result.count or 0,
        "credit_balance": credit_balance,
    }


@router.get("/{driver_id}/ratings")
def get_driver_ratings(
    driver_id: str,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _user=Depends(require_admin),
):
    sb = get_supabase()
    try:
        profile = sb.table("driver_profiles").select("rating").eq("id", driver_id).maybe_single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not profile.data:
        raise HTTPException(status_code=404, detail="Driver not found")

    avg_rating = float(profile.data.get("rating") or 0)

    try:
        # ride_ratings.driver_id is FK to driver_profiles.id
        result = (
            sb.table("ride_ratings")
            .select("id, ride_id, rate, comment, created_at, customer_id")
            .eq("driver_id", driver_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        count_result = (
            sb.table("ride_ratings")
            .select("id", count="exact")
            .eq("driver_id", driver_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "ratings": result.data or [],
        "total": count_result.count or 0,
        "avg_rating": avg_rating,
    }


@router.get("/{driver_id}/compliance")
def get_driver_compliance(driver_id: str, _user=Depends(require_admin)):
    """Documents + verification status for the compliance tab."""
    sb = get_supabase()
    try:
        profile = (
            sb.table("driver_profiles")
            .select("id, user_id, verification_status, license_number, license_expiry, verification_feedback, submitted_at, activation_date")
            .eq("id", driver_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not profile.data:
        raise HTTPException(status_code=404, detail="Driver not found")

    p = profile.data
    documents: list = []
    try:
        docs = (
            sb.table("driver_documents")
            .select("id, document_type, file_url, status, uploaded_at, reviewed_at, rejection_reason")
            .eq("driver_id", driver_id)
            .execute()
        )
        documents = docs.data or []
    except Exception:
        pass

    return {
        "verification_status": p.get("verification_status"),
        "license_number": p.get("license_number"),
        "license_expiry": p.get("license_expiry"),
        "verification_feedback": p.get("verification_feedback"),
        "submitted_at": p.get("submitted_at"),
        "activation_date": p.get("activation_date"),
        "documents": documents,
    }


@router.get("/{driver_id}/activity")
def get_driver_activity(
    driver_id: str,
    limit: int = Query(30, ge=1, le=100),
    _user=Depends(require_admin),
):
    """Merged activity feed: recent trips + recent notifications for this driver."""
    sb = get_supabase()
    try:
        profile = sb.table("driver_profiles").select("user_id").eq("id", driver_id).maybe_single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not profile.data:
        raise HTTPException(status_code=404, detail="Driver not found")

    user_id = profile.data["user_id"]
    events: list = []

    try:
        rides = (
            sb.table("rides")
            .select("id, status, picking_point, destination, price, created_at")
            .eq("driver_id", driver_id)  # rides.driver_id FK → driver_profiles.id
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        for r in rides.data or []:
            pickup = (r.get("picking_point") or {}).get("name", "")
            dropoff = (r.get("destination") or {}).get("name", "")
            events.append({
                "type": "ride",
                "id": r["id"],
                "summary": f"Ride {r.get('status', '')} — {pickup} → {dropoff}",
                "amount": r.get("price"),
                "created_at": r.get("created_at"),
            })
    except Exception:
        pass

    try:
        notifs = (
            sb.table("notifications")
            .select("id, notification_type, title, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        for n in notifs.data or []:
            events.append({
                "type": "notification",
                "id": n["id"],
                "summary": n.get("title", ""),
                "notification_type": n.get("notification_type"),
                "created_at": n.get("created_at"),
            })
    except Exception:
        pass

    events.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"events": events[:limit]}
