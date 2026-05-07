from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, List
from app.core.dependencies import require_admin
from app.core.supabase import get_supabase

router = APIRouter(prefix="/rides", tags=["rides"])


class RideResponse(BaseModel):
    id: str
    ride_request_id: Optional[str] = None
    customer_id: str
    driver_id: Optional[str] = None
    customer_phone: Optional[str] = None
    driver_phone: Optional[str] = None
    picking_point: Optional[Any] = None
    destination: Optional[Any] = None
    customer_comment: Optional[str] = None
    price: float = 0.0
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: str


_RIDE_FIELDS = set(RideResponse.model_fields.keys())


@router.get("/admin/list", response_model=List[RideResponse])
def list_rides(
    status: Optional[str] = Query(None),
    limit: int = Query(100),
    _user=Depends(require_admin),
):
    try:
        sb = get_supabase()
        query = sb.table("rides").select("*").limit(limit)
        if status:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    rides = []
    for r in result.data or []:
        row_fields = {k: v for k, v in r.items() if k in _RIDE_FIELDS}
        rides.append(RideResponse(**row_fields))

    return rides
