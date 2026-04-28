"""
WebSocket connection manager for real-time ride events and chat.
"""

import json
from datetime import datetime, timezone
from fastapi import WebSocket
from typing import Any


class ConnectionManager:
    """Manages active WebSocket connections by user_id."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        # WebSocket is already accepted by the router before calling connect
        # Close any existing connection for this user
        old = self.active_connections.get(user_id)
        if old is not None and old is not websocket:
            try:
                await old.close()
            except Exception:
                pass
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str, websocket: WebSocket):
        # Only remove if the stored connection is the one that disconnected.
        # This prevents a late disconnect() from an old connection from evicting
        # a newer connection that already replaced it.
        current = self.active_connections.get(user_id)
        if current is websocket:
            self.active_connections.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        return user_id in self.active_connections

    async def send_to_user(self, user_id: str, event: str, data: dict[str, Any]):
        websocket = self.active_connections.get(user_id)
        if websocket:
            message = {
                "event": event,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            try:
                await websocket.send_text(json.dumps(message, default=str))
            except Exception:
                self.disconnect(user_id, websocket)

    async def broadcast_to_users(self, user_ids: list[str], event: str, data: dict[str, Any]):
        for user_id in user_ids:
            await self.send_to_user(user_id, event, data)


# Singleton instance shared across the app
manager = ConnectionManager()
