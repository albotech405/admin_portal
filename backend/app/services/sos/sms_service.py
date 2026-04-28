"""
SMS service — Twilio integration.
Used exclusively for SOS alerts to emergency contacts.
"""

import asyncio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_sms(phone_numbers: list[str], message: str) -> None:
    """
    Send an SMS to one or more phone numbers via Twilio.
    Runs synchronously in a thread pool so it doesn't block the event loop.

    Phone numbers must be in E.164 format: +243812345678
    """
    if not phone_numbers:
        return

    def _send():
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        for number in phone_numbers:
            try:
                client.messages.create(
                    body=message,
                    from_=settings.TWILIO_FROM_NUMBER,
                    to=number,
                )
                logger.info("SOS SMS sent to %s", number)
            except Exception as e:
                logger.error("Failed to send SMS to %s: %s", number, str(e))

    try:
        await asyncio.to_thread(_send)
    except Exception as e:
        # SMS failure must never crash the SOS trigger — log and continue
        logger.error("Twilio SMS thread error: %s", str(e))


def build_sos_alert_message(user_name: str, tracking_url: str) -> str:
    return (
        f"🚨 URGENT: {user_name} has triggered an SOS alert and may need help!\n"
        f"Track their live location here:\n"
        f"{tracking_url}\n"
        f"This link is active for 24 hours."
    )


def build_sos_cancelled_message(user_name: str) -> str:
    return (
        f"✅ {user_name} is now safe and has cancelled their SOS alert. "
        f"Thank you for your concern."
    )
