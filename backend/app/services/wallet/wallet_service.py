"""
Wallet service — topup request management and transaction ledger.
"""

import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.driver import DriverProfile
from app.models.wallet import (
    WalletTopupRequest, WalletTransaction,
    PaymentMethod, TopupRequestStatus, TransactionType, TransactionReference,
)
from app.core.config import settings
from app.core.supabase import supabase_admin
from app.services.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)

PAYMENT_PROOFS_BUCKET = settings.PAYMENT_PROOFS_BUCKET


class WalletService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # DRIVER: SUBMIT TOPUP REQUEST
    # ------------------------------------------------------------------
    async def submit_topup_request(
        self, driver_user: User, data, proof_file: UploadFile
    ) -> WalletTopupRequest:
        """Driver submits proof of payment — creates a pending topup request."""
        driver_profile = self._get_driver_profile(driver_user)

        # Validate file
        if not proof_file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")
        ext = proof_file.filename.rsplit(".", 1)[-1].lower() if "." in proof_file.filename else ""
        if ext not in settings.allowed_file_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '.{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
            )

        # Upload proof image to Supabase storage
        file_content = await proof_file.read()
        timestamp = int(datetime.now(timezone.utc).timestamp())
        storage_path = f"{driver_profile.id}/proof_{timestamp}.{ext}"

        try:
            supabase_admin.storage.from_(PAYMENT_PROOFS_BUCKET).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": proof_file.content_type or "application/octet-stream"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload proof image: {str(e)}",
            )

        proof_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{PAYMENT_PROOFS_BUCKET}/{storage_path}"

        topup_request = WalletTopupRequest(
            driver_id=driver_profile.id,
            amount=data.amount,
            payment_method=data.payment_method,
            proof_image_url=proof_url,
            notes=data.notes,
            status=TopupRequestStatus.PENDING,
            submitted_at=datetime.now(timezone.utc),
        )
        self.db.add(topup_request)
        self.db.commit()
        self.db.refresh(topup_request)
        return topup_request

    # ------------------------------------------------------------------
    # DRIVER: INITIATE MPESA TOPUP
    # ------------------------------------------------------------------
    async def initiate_mpesa_topup(
        self, driver_user: User, amount: Decimal, phone_number: str
    ) -> WalletTopupRequest:
        """
        Kick off a C2B M-Pesa payment.
        Creates a PENDING topup request and sends a USSD push to the driver's phone.
        The wallet is credited automatically when M-Pesa calls the callback URL.
        """
        from app.services.wallet.mpesa_service import initiate_c2b, MpesaError

        driver_profile = self._get_driver_profile(driver_user)

        # IDs we send to M-Pesa
        third_party_id = uuid.uuid4().hex  # max 40 chars, unique per request
        transaction_ref = f"ALB{third_party_id[:17].upper()}"  # max 20 chars

        try:
            mpesa_response = await initiate_c2b(
                phone_number=phone_number,
                amount=float(amount),
                transaction_reference=transaction_ref,
                third_party_conversation_id=third_party_id,
            )
        except MpesaError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"M-Pesa error: {str(e)}",
            )

        conversation_id = mpesa_response.get("output_ConversationID", "")

        topup_request = WalletTopupRequest(
            driver_id=driver_profile.id,
            amount=amount,
            payment_method=PaymentMethod.MPESA,
            proof_image_url=None,
            notes=f"Phone: {phone_number}",
            status=TopupRequestStatus.PENDING,
            submitted_at=datetime.now(timezone.utc),
            mpesa_conversation_id=conversation_id,
        )
        self.db.add(topup_request)
        self.db.commit()
        self.db.refresh(topup_request)

        logger.info(
            "M-Pesa topup initiated: driver=%s amount=%s conversation_id=%s",
            driver_profile.id, amount, conversation_id,
        )
        return topup_request

    # ------------------------------------------------------------------
    # MPESA ASYNC CALLBACK HANDLER
    # ------------------------------------------------------------------
    def handle_mpesa_callback(self, payload: dict) -> dict:
        """
        Process the asynchronous result posted by M-Pesa to our callback URL.

        M-Pesa sends:
          input_OriginalConversationID  → matches mpesa_conversation_id we stored
          input_ResultCode              → "INS-0" means success
          input_ResultDesc
          input_TransactionID           → M-Pesa's transaction ID (for records)
          input_ThirdPartyConversationID

        We must respond with a confirmation JSON or M-Pesa will retry.
        """
        original_conversation_id = payload.get("input_OriginalConversationID", "")
        result_code = payload.get("input_ResultCode", "")
        result_desc = payload.get("input_ResultDesc", "")
        transaction_id = payload.get("input_TransactionID", "")
        third_party_id = payload.get("input_ThirdPartyConversationID", "")

        topup_request = (
            self.db.query(WalletTopupRequest)
            .filter(WalletTopupRequest.mpesa_conversation_id == original_conversation_id)
            .first()
        )

        if not topup_request:
            logger.warning(
                "M-Pesa callback: no matching topup request for conversation_id=%s",
                original_conversation_id,
            )
            # Still return a valid confirmation so M-Pesa doesn't keep retrying
            return _mpesa_callback_confirmation(third_party_id, original_conversation_id)

        if topup_request.status != TopupRequestStatus.PENDING:
            logger.info(
                "M-Pesa callback: topup %s already processed (status=%s), skipping",
                topup_request.id, topup_request.status,
            )
            return _mpesa_callback_confirmation(third_party_id, original_conversation_id)

        now = datetime.now(timezone.utc)
        topup_request.mpesa_transaction_id = transaction_id
        topup_request.reviewed_at = now

        if result_code == "INS-0":
            # --- SUCCESS: credit the driver's wallet ---
            driver_profile = (
                self.db.query(DriverProfile)
                .filter(DriverProfile.id == topup_request.driver_id)
                .first()
            )
            if driver_profile:
                new_balance = (
                    Decimal(str(driver_profile.credit_balance))
                    + Decimal(str(topup_request.amount))
                )
                driver_profile.credit_balance = new_balance
                topup_request.status = TopupRequestStatus.APPROVED

                transaction = WalletTransaction(
                    driver_id=driver_profile.id,
                    type=TransactionType.CREDIT,
                    amount=topup_request.amount,
                    balance_after=new_balance,
                    reference_type=TransactionReference.TOPUP,
                    reference_id=topup_request.id,
                    description=f"M-Pesa wallet top-up (TxID: {transaction_id})",
                    created_at=now,
                )
                self.db.add(transaction)
                logger.info(
                    "M-Pesa topup approved: driver=%s amount=%s new_balance=%s",
                    driver_profile.id, topup_request.amount, new_balance,
                )
                self.db.commit()

                # Fire-and-forget FCM notification (callback is sync, loop is already running)
                import asyncio
                driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
                asyncio.ensure_future(NotificationService.send_to_user(
                    driver_user,
                    title="M-Pesa payment confirmed!",
                    body=f"${topup_request.amount} added to your wallet. New balance: ${new_balance:.2f}",
                    data={"type": "topup_approved", "amount": str(topup_request.amount), "new_balance": str(new_balance)},
                ))
                return _mpesa_callback_confirmation(third_party_id, original_conversation_id)
        else:
            # --- FAILED ---
            topup_request.status = TopupRequestStatus.REJECTED
            topup_request.rejection_reason = f"[{result_code}] {result_desc}"
            logger.warning(
                "M-Pesa topup rejected: conversation_id=%s code=%s desc=%s",
                original_conversation_id, result_code, result_desc,
            )

            self.db.commit()

            # Fire-and-forget FCM notification
            import asyncio
            driver_profile = (
                self.db.query(DriverProfile)
                .filter(DriverProfile.id == topup_request.driver_id)
                .first()
            )
            if driver_profile:
                driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
                asyncio.ensure_future(NotificationService.send_to_user(
                    driver_user,
                    title="M-Pesa payment failed",
                    body=f"Your M-Pesa payment of ${topup_request.amount} could not be processed. Please try again.",
                    data={"type": "topup_rejected", "amount": str(topup_request.amount), "reason": result_desc},
                ))
            return _mpesa_callback_confirmation(third_party_id, original_conversation_id)

        self.db.commit()
        return _mpesa_callback_confirmation(third_party_id, original_conversation_id)

    # ------------------------------------------------------------------
    # DRIVER: GET BALANCE
    # ------------------------------------------------------------------
    def get_balance(self, driver_user: User) -> dict:
        driver_profile = self._get_driver_profile(driver_user)
        return {
            "driver_id": driver_profile.id,
            "balance": driver_profile.credit_balance,
        }

    # ------------------------------------------------------------------
    # DRIVER: LIST OWN TOPUP REQUESTS
    # ------------------------------------------------------------------
    def get_own_topup_requests(self, driver_user: User) -> list[WalletTopupRequest]:
        driver_profile = self._get_driver_profile(driver_user)
        return (
            self.db.query(WalletTopupRequest)
            .filter(WalletTopupRequest.driver_id == driver_profile.id)
            .order_by(WalletTopupRequest.submitted_at.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # DRIVER: GET TRANSACTION HISTORY
    # ------------------------------------------------------------------
    def get_transactions(self, driver_user: User) -> list[WalletTransaction]:
        driver_profile = self._get_driver_profile(driver_user)
        return (
            self.db.query(WalletTransaction)
            .filter(WalletTransaction.driver_id == driver_profile.id)
            .order_by(WalletTransaction.created_at.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # ADMIN: LIST ALL TOPUP REQUESTS
    # ------------------------------------------------------------------
    def admin_list_topup_requests(
        self, status_filter: TopupRequestStatus | None = None
    ) -> list[WalletTopupRequest]:
        query = self.db.query(WalletTopupRequest)
        if status_filter:
            query = query.filter(WalletTopupRequest.status == status_filter)
        return query.order_by(WalletTopupRequest.submitted_at.desc()).all()

    # ------------------------------------------------------------------
    # ADMIN: APPROVE TOPUP REQUEST
    # ------------------------------------------------------------------
    async def admin_approve_topup(
        self, request_id: uuid.UUID, admin_user: User
    ) -> WalletTopupRequest:
        """Approve topup — credit driver wallet and record transaction."""
        topup_request = self._get_topup_request(request_id)

        if topup_request.status != TopupRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is already {topup_request.status.value}.",
            )

        driver_profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.id == topup_request.driver_id)
            .first()
        )
        if not driver_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

        # Credit the wallet
        new_balance = Decimal(str(driver_profile.credit_balance)) + Decimal(str(topup_request.amount))
        driver_profile.credit_balance = new_balance

        # Mark request approved
        topup_request.status = TopupRequestStatus.APPROVED
        topup_request.reviewed_at = datetime.now(timezone.utc)
        topup_request.reviewed_by = admin_user.id

        # Record transaction
        transaction = WalletTransaction(
            driver_id=driver_profile.id,
            type=TransactionType.CREDIT,
            amount=topup_request.amount,
            balance_after=new_balance,
            reference_type=TransactionReference.TOPUP,
            reference_id=topup_request.id,
            description=f"Wallet topped up via {topup_request.payment_method.value.replace('_', ' ').title()}",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(topup_request)

        # Notify driver
        driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
        await NotificationService.send_to_user(
            driver_user,
            title="Wallet topped up!",
            body=f"${topup_request.amount} has been added to your wallet. New balance: ${new_balance:.2f}",
            data={"type": "topup_approved", "amount": str(topup_request.amount), "new_balance": str(new_balance)},
        )

        return topup_request

    # ------------------------------------------------------------------
    # ADMIN: REJECT TOPUP REQUEST
    # ------------------------------------------------------------------
    async def admin_reject_topup(
        self, request_id: uuid.UUID, admin_user: User, rejection_reason: str
    ) -> WalletTopupRequest:
        topup_request = self._get_topup_request(request_id)

        if topup_request.status != TopupRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request is already {topup_request.status.value}.",
            )

        driver_profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.id == topup_request.driver_id)
            .first()
        )

        topup_request.status = TopupRequestStatus.REJECTED
        topup_request.reviewed_at = datetime.now(timezone.utc)
        topup_request.reviewed_by = admin_user.id
        topup_request.rejection_reason = rejection_reason

        self.db.commit()
        self.db.refresh(topup_request)

        # Notify driver
        if driver_profile:
            driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
            await NotificationService.send_to_user(
                driver_user,
                title="Top-up request rejected",
                body=f"Your top-up request of ${topup_request.amount} was rejected. Reason: {rejection_reason}",
                data={"type": "topup_rejected", "amount": str(topup_request.amount), "reason": rejection_reason},
            )

        return topup_request

    # ------------------------------------------------------------------
    # INTERNAL: DEDUCT RIDE COMMISSION (called by RideService)
    # ------------------------------------------------------------------
    def deduct_ride_commission(
        self, driver_profile: DriverProfile, ride_id: uuid.UUID
    ) -> None:
        """Deduct platform fee from driver wallet after completing a ride.
        Raises HTTP 402 if balance is insufficient.
        """
        fee = Decimal(str(settings.PLATFORM_FEE_PER_RIDE))
        current_balance = Decimal(str(driver_profile.credit_balance))

        if current_balance < fee:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Insufficient wallet balance. "
                    f"Current balance: ${current_balance:.2f}. "
                    f"Required: ${fee:.2f}. Please top up your wallet."
                ),
            )

        new_balance = current_balance - fee
        driver_profile.credit_balance = new_balance

        transaction = WalletTransaction(
            driver_id=driver_profile.id,
            type=TransactionType.DEBIT,
            amount=fee,
            balance_after=new_balance,
            reference_type=TransactionReference.RIDE_COMMISSION,
            reference_id=ride_id,
            description=f"Platform commission for completed ride",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(transaction)
        # Note: caller is responsible for committing the session

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------
    def _get_driver_profile(self, user: User) -> DriverProfile:
        profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.user_id == user.id)
            .first()
        )
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver profile not found.",
            )
        return profile

    def _get_topup_request(self, request_id: uuid.UUID) -> WalletTopupRequest:
        req = self.db.query(WalletTopupRequest).filter(WalletTopupRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topup request not found.")
        return req


# ---------------------------------------------------------------------------
# Module-level helper (used by callback handler)
# ---------------------------------------------------------------------------

def _mpesa_callback_confirmation(third_party_id: str, conversation_id: str) -> dict:
    """The JSON response M-Pesa expects to close the callback session."""
    return {
        "output_OriginalConversationID": conversation_id,
        "output_ResponseCode": "0",
        "output_ResponseDesc": "Successfully Accepted Result",
        "output_ThirdPartyConversationID": third_party_id,
    }
