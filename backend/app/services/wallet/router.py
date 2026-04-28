"""
Wallet endpoints — driver topup requests and admin review.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.engine import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.wallet import TopupRequestStatus
from app.services.wallet.wallet_service import WalletService
from app.services.wallet.schemas import (
    SubmitTopupRequest,
    RejectTopupRequest,
    InitiateMpesaTopupRequest,
    MpesaTopupInitiatedResponse,
    TopupRequestResponse,
    TopupRequestListResponse,
    WalletTransactionResponse,
    WalletTransactionListResponse,
    WalletBalanceResponse,
)

router = APIRouter(prefix="/wallet")


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency — only allow admin users."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


# ------------------------------------------------------------------
# DRIVER: GET WALLET BALANCE
# ------------------------------------------------------------------
@router.get(
    "/balance",
    response_model=WalletBalanceResponse,
    summary="Get driver wallet balance",
)
def get_balance(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.get_balance(user)


# ------------------------------------------------------------------
# DRIVER: SUBMIT TOPUP REQUEST (multipart: form fields + proof image)
# ------------------------------------------------------------------
@router.post(
    "/topup/submit",
    response_model=TopupRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit proof of payment to request wallet top-up",
)
async def submit_topup(
    amount: float = Form(..., gt=0, description="Amount paid in USD"),
    payment_method: str = Form(..., description="mpesa | orange_money | airtel_money | bank_transfer"),
    notes: Optional[str] = Form(None),
    proof_image: UploadFile = File(..., description="Screenshot or photo of payment receipt"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.wallet import PaymentMethod
    from decimal import Decimal

    # Validate payment_method enum
    try:
        pm = PaymentMethod(payment_method)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid payment_method. Allowed values: {[e.value for e in PaymentMethod]}",
        )

    class _Data:
        pass

    data = _Data()
    data.amount = Decimal(str(amount))
    data.payment_method = pm
    data.notes = notes

    service = WalletService(db)
    return await service.submit_topup_request(user, data, proof_image)


# ------------------------------------------------------------------
# DRIVER: LIST OWN TOPUP REQUESTS
# ------------------------------------------------------------------
@router.get(
    "/topup/requests",
    response_model=TopupRequestListResponse,
    summary="List my topup requests",
)
def list_my_topup_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    requests = service.get_own_topup_requests(user)
    return TopupRequestListResponse(requests=requests, total=len(requests))


# ------------------------------------------------------------------
# DRIVER: GET TRANSACTION HISTORY
# ------------------------------------------------------------------
@router.get(
    "/transactions",
    response_model=WalletTransactionListResponse,
    summary="Get wallet transaction history",
)
def get_transactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    transactions = service.get_transactions(user)
    return WalletTransactionListResponse(transactions=transactions, total=len(transactions))


# ------------------------------------------------------------------
# DRIVER: INITIATE MPESA TOPUP
# ------------------------------------------------------------------
@router.post(
    "/mpesa/topup",
    response_model=MpesaTopupInitiatedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate M-Pesa C2B wallet top-up (driver will receive USSD prompt)",
)
async def initiate_mpesa_topup(
    data: InitiateMpesaTopupRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    topup = await service.initiate_mpesa_topup(user, data.amount, data.phone_number)
    return MpesaTopupInitiatedResponse(
        message="Payment initiated. Please check your phone for the M-Pesa prompt and enter your PIN.",
        topup_request_id=topup.id,
        mpesa_conversation_id=topup.mpesa_conversation_id or "",
        status=topup.status,
    )


# ------------------------------------------------------------------
# MPESA ASYNC CALLBACK (called by M-Pesa — no auth)
# ------------------------------------------------------------------
@router.post(
    "/mpesa/callback",
    status_code=status.HTTP_200_OK,
    summary="M-Pesa async callback — do not call manually",
    include_in_schema=False,  # hide from Swagger docs
)
def mpesa_callback(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    M-Pesa posts the final transaction result here.
    We credit the driver's wallet on success and respond with the required
    confirmation JSON so M-Pesa closes the session.
    """
    service = WalletService(db)
    return service.handle_mpesa_callback(payload)


# ------------------------------------------------------------------
# ADMIN: LIST ALL TOPUP REQUESTS
# ------------------------------------------------------------------
@router.get(
    "/admin/topup/requests",
    response_model=TopupRequestListResponse,
    summary="[Admin] List all topup requests",
)
def admin_list_topup_requests(
    status_filter: Optional[TopupRequestStatus] = Query(None, alias="status"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    requests = service.admin_list_topup_requests(status_filter)
    return TopupRequestListResponse(requests=requests, total=len(requests))


# ------------------------------------------------------------------
# ADMIN: APPROVE TOPUP REQUEST
# ------------------------------------------------------------------
@router.patch(
    "/admin/topup/requests/{request_id}/approve",
    response_model=TopupRequestResponse,
    summary="[Admin] Approve topup request and credit driver wallet",
)
async def admin_approve_topup(
    request_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return await service.admin_approve_topup(request_id, admin)


# ------------------------------------------------------------------
# ADMIN: REJECT TOPUP REQUEST
# ------------------------------------------------------------------
@router.patch(
    "/admin/topup/requests/{request_id}/reject",
    response_model=TopupRequestResponse,
    summary="[Admin] Reject topup request with reason",
)
async def admin_reject_topup(
    request_id: uuid.UUID,
    data: RejectTopupRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return await service.admin_reject_topup(request_id, admin, data.rejection_reason)
