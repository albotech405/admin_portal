"""
Payments endpoints — exchange rates and currency utilities.
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/payments")


@router.get(
    "/exchange-rate",
    summary="Get USD to CDF exchange rate",
)
def get_exchange_rate():
    """
    Returns the current USD → CDF exchange rate.
    The rate is configured via the USD_TO_CDF_RATE environment variable.
    """
    return {
        "base": "USD",
        "target": "CDF",
        "rate": settings.USD_TO_CDF_RATE,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
