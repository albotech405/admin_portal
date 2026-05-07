from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.core.dependencies import require_admin
from app.core.supabase import get_supabase

router = APIRouter(prefix="/wallet", tags=["wallet"])


class TopupRequest(BaseModel):
    id: str
    driver_id: str
    amount: float
    status: str
    payment_method: Optional[str] = None
    proof_image_url: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    mpesa_conversation_id: Optional[str] = None
    mpesa_transaction_id: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class TopupRequestsResponse(BaseModel):
    requests: List[TopupRequest]
    total: int


class WalletTransaction(BaseModel):
    id: str
    driver_id: str
    type: str
    amount: float
    balance_after: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: str


class WalletBalanceResponse(BaseModel):
    driver_id: str
    balance: float


class WalletTransactionListResponse(BaseModel):
    transactions: List[WalletTransaction]


class RejectBody(BaseModel):
    rejection_reason: Optional[str] = None


@router.get("/admin/topup/requests", response_model=TopupRequestsResponse)
def list_topup_requests(
    status: Optional[str] = Query(None),
    _user=Depends(require_admin),
):
    try:
        sb = get_supabase()
        query = sb.table("wallet_topup_requests").select(
            "*, driver_profiles(user_id, users(full_name, phone_number))"
        )
        if status:
            query = query.eq("status", status)
        result = query.order("submitted_at", desc=True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    rows = []
    for r in result.data or []:
        dp = r.pop("driver_profiles", {}) or {}
        user_info = (dp.get("users") or {})
        rows.append(TopupRequest(
            **r,
            full_name=user_info.get("full_name"),
            phone_number=user_info.get("phone_number"),
        ))

    return TopupRequestsResponse(requests=rows, total=len(rows))


@router.patch("/admin/topup/requests/{request_id}/approve")
def approve_topup(request_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        req = sb.table("wallet_topup_requests").select("*").eq("id", request_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found")

    data = req.data
    if data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    # driver_id in wallet_topup_requests IS the driver_profiles.id
    driver_profile_id = data["driver_id"]

    try:
        driver = sb.table("driver_profiles").select("id, credit_balance").eq("id", driver_profile_id).maybe_single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not driver.data:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    new_balance = (driver.data.get("credit_balance") or 0) + data["amount"]

    try:
        sb.table("driver_profiles").update({"credit_balance": new_balance}).eq("id", driver_profile_id).execute()
        sb.table("wallet_transactions").insert({
            "driver_id": driver_profile_id,
            "type": "credit",
            "amount": data["amount"],
            "balance_after": new_balance,
            "reference_type": "topup",
            "description": "Wallet topup approved",
            "reference_id": request_id,
        }).execute()
        sb.table("wallet_topup_requests").update({"status": "approved"}).eq("id", request_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Topup approved", "new_balance": new_balance}


@router.patch("/admin/topup/requests/{request_id}/reject")
def reject_topup(request_id: str, body: Optional[RejectBody] = None, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        update_data: dict = {"status": "rejected"}
        if body and body.rejection_reason:
            update_data["rejection_reason"] = body.rejection_reason
        result = sb.table("wallet_topup_requests").update(update_data).eq("id", request_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not result.data:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Topup rejected"}


@router.get("/admin/driver/{driver_id}/balance", response_model=WalletBalanceResponse)
def get_driver_balance(driver_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        result = sb.table("driver_profiles").select("id, credit_balance").eq("id", driver_id).maybe_single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not result.data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return WalletBalanceResponse(driver_id=driver_id, balance=result.data.get("credit_balance") or 0)


@router.get("/admin/driver/{driver_id}/transactions", response_model=WalletTransactionListResponse)
def get_driver_transactions(driver_id: str, _user=Depends(require_admin)):
    try:
        sb = get_supabase()
        result = (
            sb.table("wallet_transactions")
            .select("*")
            .eq("driver_id", driver_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    transactions = [WalletTransaction(**t) for t in (result.data or [])]
    return WalletTransactionListResponse(transactions=transactions)
