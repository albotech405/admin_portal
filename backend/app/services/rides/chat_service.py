"""
Chat service — in-ride messaging (ephemeral, deleted on ride completion).
"""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.driver import DriverProfile
from app.models.ride import Ride, RideMessage, RideStatus
from app.services.rides.connection_manager import manager


class ChatService:
    def __init__(self, db: Session):
        self.db = db

    async def send_message(self, ride_id: uuid.UUID, sender: User, message_text: str) -> RideMessage:
        """Send a chat message during an active ride."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        if ride.status not in (RideStatus.DRIVER_EN_ROUTE, RideStatus.IN_PROGRESS):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat is only available during active rides.")

        # Verify sender is a participant
        recipient_user_id = self._get_other_participant(ride, sender)

        msg = RideMessage(
            ride_id=ride_id,
            sender_id=sender.id,
            message=message_text,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)

        # Push to the other participant
        await manager.send_to_user(recipient_user_id, "new_message", {
            "ride_id": str(ride_id),
            "sender_id": str(sender.id),
            "message": message_text,
            "sent_at": msg.sent_at.isoformat(),
        })

        return msg

    def get_messages(self, ride_id: uuid.UUID, user: User) -> list[RideMessage]:
        """Get chat history for a ride (only during active ride)."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        if ride.status not in (RideStatus.DRIVER_EN_ROUTE, RideStatus.IN_PROGRESS):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat is only available during active rides.")

        self._get_other_participant(ride, user)  # validates participant

        return (
            self.db.query(RideMessage)
            .filter(RideMessage.ride_id == ride_id)
            .order_by(RideMessage.sent_at)
            .all()
        )

    def _get_other_participant(self, ride: Ride, user: User) -> str:
        """Verify user is participant and return the other participant's user_id as string."""
        if ride.customer_id == user.id:
            driver = self.db.query(DriverProfile).filter(DriverProfile.id == ride.driver_id).first()
            return str(driver.user_id) if driver else ""

        driver = self.db.query(DriverProfile).filter(
            DriverProfile.user_id == user.id,
            DriverProfile.id == ride.driver_id,
        ).first()
        if driver:
            return str(ride.customer_id)

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
