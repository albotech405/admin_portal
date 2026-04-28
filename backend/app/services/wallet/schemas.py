"""
Pydantic schemas for wallet endpoints.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.wallet import PaymentMethod, TopupRequestStatus, TransactionType, TransactionReference


# ------------------------------------------------------------------
# REQUEST SCHEMAS
# ------------------------------------------------------------------

class SubmitTopupRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount paid (USD)")
    payment_method: PaymentMethod
    notes: Optional[str] = Field(None, max_length=500)


class RejectTopupRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=500)


class InitiateMpesaTopupRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount to top up (USD)")
    phone_number: str = Field(
        ...,
        pattern=r"^[0-9]{12,14}$",
        description="Customer MSISDN — 12 to 14 digits, no + prefix (e.g. 243812345678 for DRC)",
    )


# ------------------------------------------------------------------
# RESPONSE SCHEMAS
# ------------------------------------------------------------------

class TopupRequestResponse(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    amount: Decimal
    payment_method: PaymentMethod
    proof_image_url: Optional[str]
    status: TopupRequestStatus
    notes: Optional[str]
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[uuid.UUID]
    rejection_reason: Optional[str]
    mpesa_conversation_id: Optional[str]
    mpesa_transaction_id: Optional[str]

    model_config = {"from_attributes": True}


class MpesaTopupInitiatedResponse(BaseModel):
    message: str
    topup_request_id: uuid.UUID
    mpesa_conversation_id: str
    status: TopupRequestStatus


class TopupRequestListResponse(BaseModel):
    requests: List[TopupRequestResponse]
    total: int


class WalletTransactionResponse(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    type: TransactionType
    amount: Decimal
    balance_after: Decimal
    reference_type: TransactionReference
    reference_id: uuid.UUID
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletTransactionListResponse(BaseModel):
    transactions: List[WalletTransactionResponse]
    total: int


class WalletBalanceResponse(BaseModel):
    driver_id: uuid.UUID
    balance: Decimal
