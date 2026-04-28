"""
M-Pesa OpenAPI client for DRC (vodacomDRC).

Handles:
  - RSA encryption of API key / session key using the M-Pesa public key
  - Session key fetching and in-process caching (valid 23 h)
  - C2B single-stage payment initiation (async flow)

No third-party SDK required — uses httpx + cryptography.
"""

import base64
import uuid
import logging
from datetime import datetime, timedelta, timezone

import httpx
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-process session key cache (singleton per process)
# ---------------------------------------------------------------------------
_SESSION_CACHE: dict = {
    "session_id": None,
    "expires_at": datetime.min.replace(tzinfo=timezone.utc),
}

# Session keys are valid for ~24 h — we refresh at 23 h to be safe
_SESSION_TTL_HOURS = 23


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _encrypt(value: str) -> str:
    """
    RSA-encrypt *value* with the M-Pesa OpenAPI public key.

    The public key in the .env is a base64-encoded DER SubjectPublicKeyInfo blob
    (the long MIICIjAN... string).  We load it, apply PKCS1v15 padding, and
    return a base64-encoded ciphertext — which becomes the Bearer token.
    """
    public_key_der = base64.b64decode(settings.MPESA_PUBLIC_KEY)
    public_key = serialization.load_der_public_key(public_key_der, backend=default_backend())
    encrypted_bytes = public_key.encrypt(value.encode(), padding.PKCS1v15())
    return base64.b64encode(encrypted_bytes).decode()


def _auth_header(value: str) -> str:
    """Return the Authorization header value for an already-encrypted token."""
    return f"Bearer {_encrypt(value)}"


def _base_headers(bearer_value: str) -> dict:
    return {
        "Content-Type": "application/json",
        "Authorization": _auth_header(bearer_value),
        "Origin": "*",
    }


# ---------------------------------------------------------------------------
# Session Key
# ---------------------------------------------------------------------------

async def get_session_key() -> str:
    """
    Return a valid session key, fetching a fresh one from M-Pesa if the
    cached one has expired.
    """
    now = datetime.now(timezone.utc)
    if _SESSION_CACHE["session_id"] and _SESSION_CACHE["expires_at"] > now:
        return _SESSION_CACHE["session_id"]

    url = f"{settings.mpesa_base_url}/getSession/"
    headers = _base_headers(settings.MPESA_API_KEY)

    async with httpx.AsyncClient(verify=True, timeout=30) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        logger.error("M-Pesa getSession failed: %s %s", response.status_code, response.text)
        raise MpesaError(f"Failed to obtain M-Pesa session key: {response.text}")

    body = response.json()
    session_id = body.get("output_SessionID")
    if not session_id:
        raise MpesaError("M-Pesa getSession response missing output_SessionID")

    _SESSION_CACHE["session_id"] = session_id
    _SESSION_CACHE["expires_at"] = now + timedelta(hours=_SESSION_TTL_HOURS)

    logger.info("M-Pesa session key refreshed, valid until %s", _SESSION_CACHE["expires_at"])
    return session_id


# ---------------------------------------------------------------------------
# C2B Single Stage
# ---------------------------------------------------------------------------

async def initiate_c2b(
    phone_number: str,
    amount: float,
    transaction_reference: str,
    third_party_conversation_id: str,
) -> dict:
    """
    Initiate a C2B (customer-to-business) payment.

    M-Pesa will push a USSD prompt to the customer's phone.
    In async mode the immediate response contains output_ConversationID;
    the final result arrives at MPESA_CALLBACK_URL.

    Returns the parsed JSON body from M-Pesa.
    Raises MpesaError on non-201 responses.
    """
    session_key = await get_session_key()
    url = f"{settings.mpesa_base_url}/c2bPayment/singleStage/"
    headers = _base_headers(session_key)

    payload = {
        "input_Amount": str(amount),
        "input_Country": "DRC",
        "input_Currency": "USD",
        "input_CustomerMSISDN": phone_number,
        "input_ServiceProviderCode": settings.MPESA_SERVICE_PROVIDER_CODE,
        "input_TransactionReference": transaction_reference[:20],  # max 20 chars
        "input_ThirdPartyConversationID": third_party_conversation_id[:40],
        "input_PurchasedItemsDesc": "AlboTax wallet top-up",
    }

    async with httpx.AsyncClient(verify=True, timeout=30) as client:
        response = await client.post(url, json=payload, headers=headers)

    body = response.json()

    if response.status_code != 201:
        code = body.get("output_ResponseCode", "UNKNOWN")
        desc = body.get("output_ResponseDesc", response.text)
        logger.error("M-Pesa C2B failed [%s]: %s", code, desc)
        raise MpesaError(desc, response_code=code)

    return body


# ---------------------------------------------------------------------------
# Error class
# ---------------------------------------------------------------------------

class MpesaError(Exception):
    def __init__(self, message: str, response_code: str = ""):
        super().__init__(message)
        self.response_code = response_code
