from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
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


_DRIVER_FIELDS = {f for f in DriverAdminListItem.model_fields if f not in ("full_name", "phone_number", "total_trips")}


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


@router.patch("/{driver_id}/deactivate")
def deactivate_driver(driver_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        result = sb.table("driver_profiles").update({"verification_status": "suspended"}).eq("id", driver_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not result.data:
        return {"message": "Driver not found"}
    return {"message": "Driver suspended"}
