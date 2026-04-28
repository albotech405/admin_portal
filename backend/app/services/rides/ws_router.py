"""
WebSocket endpoint for real-time ride events and chat.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.engine import SessionLocal
from app.core.supabase import supabase
from app.models.user import User
from app.services.rides.connection_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)

# Render's proxy closes WebSocket connections idle for >55 seconds.
# We send a server-side ping every 25 seconds to keep the connection alive.
PING_INTERVAL = 25


def _authenticate_ws(token: str) -> tuple["User", str] | None:
    """
    Authenticate a WebSocket connection using JWT token.
    Returns (local_user, supabase_uid) on success, None on failure.
    Opens and closes its own DB session — does NOT hold one for the WS lifetime.

    The supabase_uid is the JWT `sub` — this is what the frontend puts in the
    WS URL. The local_user.id is a separate UUID used internally by ride_service
    to route WebSocket events. Both are needed.
    """
    try:
        auth_response = supabase.auth.get_user(token)
    except Exception as e:
        logger.warning("[WS] Supabase auth failed: %s", e)
        return None

    if not auth_response or not auth_response.user:
        logger.warning("[WS] Supabase returned no user for token (first 20 chars): %s", token[:20])
        return None

    supabase_uid = str(auth_response.user.id)
    phone = auth_response.user.phone
    if not phone:
        logger.warning("[WS] Supabase user %s has no phone", supabase_uid)
        return None
    if not phone.startswith("+"):
        phone = f"+{phone}"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone_number == phone).first()
        if not user:
            logger.warning("[WS] No local user found for phone %s (supabase_uid=%s)", phone, supabase_uid)
            return None
        return user, supabase_uid
    except Exception as e:
        logger.error("[WS] DB query failed during auth: %s", e)
        return None
    finally:
        db.close()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = "",
):
    """
    WebSocket connection for real-time ride events.
    Connect: wss://host/api/v1/ws/{user_id}?token={jwt_token}

    Keeps itself alive with server-side pings every 25 s so Render's proxy
    never hits its idle timeout and closes the connection.
    """
    await websocket.accept()
    logger.info("[WS] Connection accepted for user_id=%s", user_id)

    if not token:
        logger.warning("[WS] No token provided for user_id=%s", user_id)
        await websocket.close(code=4001, reason="Missing token")
        return

    # Run blocking Supabase + DB auth in a thread so we don't block the event loop
    # A slow Supabase response while blocking could cause the client to timeout
    try:
        result = await asyncio.to_thread(_authenticate_ws, token)
    except Exception as e:
        logger.error("[WS] Auth thread error for user_id=%s: %s", user_id, e)
        await websocket.close(code=4003, reason="Authentication error")
        return

    if not result:
        logger.warning("[WS] Auth failed for user_id=%s", user_id)
        await websocket.close(code=4003, reason="Authentication failed")
        return

    user, supabase_uid = result

    # The frontend puts the Supabase auth UID (JWT `sub`) in the URL.
    # Validate it matches the token — this prevents one user connecting as another.
    if supabase_uid != user_id:
        logger.warning("[WS] user_id mismatch: token=%s url=%s", supabase_uid, user_id)
        await websocket.close(code=4003, reason="Authentication failed")
        return

    # Store connection under local DB user.id — ride_service sends events to this ID.
    local_user_id = str(user.id)
    logger.info("[WS] Auth OK — supabase_uid=%s local_user_id=%s", supabase_uid, local_user_id)
    await manager.connect(local_user_id, websocket)

    async def ping_loop():
        """Send a server→client ping every PING_INTERVAL seconds.
        Produces outgoing frames that reset Render's idle timer."""
        while True:
            await asyncio.sleep(PING_INTERVAL)
            try:
                await websocket.send_text(json.dumps({"event": "ping"}))
            except Exception:
                break  # connection gone, let receive_loop handle cleanup

    ping_task = asyncio.create_task(ping_loop())
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("[WS] Client disconnected: local_user_id=%s", local_user_id)
    except Exception as e:
        logger.error("[WS] Unexpected error for local_user_id=%s: %s", local_user_id, e)
    finally:
        ping_task.cancel()
        manager.disconnect(local_user_id, websocket)
        logger.info("[WS] Cleaned up connection for local_user_id=%s", local_user_id)
