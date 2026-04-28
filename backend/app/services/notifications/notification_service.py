"""
Firebase Cloud Messaging push notification service (HTTP v1 API).

Notifications are best-effort: every send failure is logged but never
raises an exception — it must never break the main ride/offer flow.

Required env vars:
    FIREBASE_PROJECT_ID            — Firebase Console → Project Settings → General → Project ID
    FIREBASE_SERVICE_ACCOUNT_JSON  — Full content of the service account JSON key file
                                     (Firebase Console → Project Settings → Service Accounts
                                      → Generate new private key → paste entire JSON as one string)
"""

import asyncio
import json
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_FCM_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
_FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


def _get_access_token() -> Optional[str]:
    """
    Exchange service account credentials for a short-lived OAuth2 bearer token.
    Runs synchronously — call via asyncio.to_thread from async context.
    Returns None if Firebase is not configured or credential refresh fails.
    """
    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests

        sa_info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            sa_info, scopes=_FCM_SCOPES
        )
        credentials.refresh(google.auth.transport.requests.Request())
        return credentials.token
    except Exception as exc:
        logger.error("[FCM] Failed to get OAuth2 access token: %s", exc)
        return None


class NotificationService:
    """
    Static helper class for sending FCM push notifications.
    All methods return bool (True = success) and never raise.
    """

    @staticmethod
    async def send(
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """
        Send a notification + data payload to a single FCM device token.

        The `notification` block tells the OS to show a system-tray banner even
        when the app is closed.  The `data` block is delivered to the app so it
        knows which screen to open on tap.  All data values must be strings.
        """
        if not settings.ENABLE_PUSH_NOTIFICATIONS:
            return False

        if not settings.FIREBASE_PROJECT_ID or not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            logger.debug("[FCM] Firebase not configured — skipping push notification")
            return False

        if not token:
            return False

        # Credential refresh is blocking (network call to Google) — run in thread
        access_token = await asyncio.to_thread(_get_access_token)
        if not access_token:
            return False

        # FCM data values must all be strings
        str_data = {k: str(v) for k, v in (data or {}).items()}

        payload = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body,
                },
                "data": str_data,
                # Android: high-priority delivery + sound
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "channel_id": "albotax_rides",
                    },
                },
                # iOS: badge + sound
                "apns": {
                    "headers": {"apns-priority": "10"},
                    "payload": {
                        "aps": {
                            "sound": "default",
                            "badge": 1,
                        }
                    },
                },
            }
        }

        url = _FCM_URL.format(project_id=settings.FIREBASE_PROJECT_ID)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                )
            if resp.status_code == 200:
                logger.debug("[FCM] Sent '%s' to token ...%s", title, token[-8:])
                return True
            else:
                logger.warning(
                    "[FCM] Send failed (status=%s): %s", resp.status_code, resp.text[:200]
                )
                return False
        except Exception as exc:
            logger.error("[FCM] HTTP error sending notification: %s", exc)
            return False

    @staticmethod
    async def send_to_user(
        user,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """
        Convenience wrapper: sends to a User ORM instance.
        No-ops silently if the user has no fcm_token stored.
        """
        token = getattr(user, "fcm_token", None)
        if not token:
            return False
        return await NotificationService.send(token, title, body, data)

    @staticmethod
    async def send_to_many(
        users: list,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> None:
        """
        Fire-and-forget notifications to a list of User ORM instances.
        Failures are logged individually and do not stop the others.
        """
        for user in users:
            await NotificationService.send_to_user(user, title, body, data)
