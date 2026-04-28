"""
SOS service — emergency contacts CRUD and SOS session management.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.sos import EmergencyContact, SosSession
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_EMERGENCY_CONTACTS = 3


class SosService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # EMERGENCY CONTACTS
    # ------------------------------------------------------------------

    def list_contacts(self, user: User) -> list[EmergencyContact]:
        return (
            self.db.query(EmergencyContact)
            .filter(EmergencyContact.user_id == user.id)
            .order_by(EmergencyContact.created_at)
            .all()
        )

    def add_contact(self, user: User, data) -> EmergencyContact:
        count = (
            self.db.query(EmergencyContact)
            .filter(EmergencyContact.user_id == user.id)
            .count()
        )
        if count >= MAX_EMERGENCY_CONTACTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_EMERGENCY_CONTACTS} emergency contacts allowed.",
            )

        contact = EmergencyContact(
            user_id=user.id,
            name=data.name,
            phone_number=data.phone_number,
            contact_relationship=data.relationship,
        )
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def update_contact(self, user: User, contact_id: uuid.UUID, data) -> EmergencyContact:
        contact = self._get_own_contact(user, contact_id)
        if data.name is not None:
            contact.name = data.name
        if data.phone_number is not None:
            contact.phone_number = data.phone_number
        if data.relationship is not None:
            contact.contact_relationship = data.relationship
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def delete_contact(self, user: User, contact_id: uuid.UUID) -> None:
        contact = self._get_own_contact(user, contact_id)
        self.db.delete(contact)
        self.db.commit()

    # ------------------------------------------------------------------
    # SOS TRIGGER
    # ------------------------------------------------------------------

    async def trigger_sos(self, user: User, data) -> SosSession:
        """
        Create an SOS session and fire SMS alerts to all emergency contacts.
        If a session is already active, return it (idempotent — safe for retries).
        """
        from app.services.sos.sms_service import send_sms, build_sos_alert_message

        # Return existing active session rather than creating a duplicate
        existing = (
            self.db.query(SosSession)
            .filter(SosSession.user_id == user.id, SosSession.is_active == True)
            .first()
        )
        if existing:
            # Update location on re-trigger
            existing.last_latitude = data.latitude
            existing.last_longitude = data.longitude
            existing.last_location_update = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(existing)
            return existing

        now = datetime.now(timezone.utc)
        session = SosSession(
            user_id=user.id,
            is_active=True,
            triggered_at=now,
            expires_at=now + timedelta(hours=settings.SOS_SESSION_EXPIRY_HOURS),
            last_latitude=data.latitude,
            last_longitude=data.longitude,
            last_location_update=now,
            ride_id=data.ride_id,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        # Notify all emergency contacts via SMS
        contacts = self.list_contacts(user)
        if contacts:
            tracking_url = _build_tracking_url(session.token)
            message = build_sos_alert_message(user.full_name, tracking_url)
            phone_numbers = [c.phone_number for c in contacts]
            await send_sms(phone_numbers, message)
        else:
            logger.warning("SOS triggered by user %s but no emergency contacts configured", user.id)

        return session

    # ------------------------------------------------------------------
    # UPDATE LIVE LOCATION
    # ------------------------------------------------------------------

    def update_location(self, user: User, session_id: uuid.UUID, data) -> SosSession:
        session = self._get_active_session(user, session_id)
        session.last_latitude = data.latitude
        session.last_longitude = data.longitude
        session.last_location_update = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(session)
        return session

    # ------------------------------------------------------------------
    # CANCEL SOS
    # ------------------------------------------------------------------

    async def cancel_sos(self, user: User, session_id: uuid.UUID) -> SosSession:
        from app.services.sos.sms_service import send_sms, build_sos_cancelled_message

        session = self._get_active_session(user, session_id)
        now = datetime.now(timezone.utc)
        session.is_active = False
        session.cancelled_at = now
        self.db.commit()
        self.db.refresh(session)

        # Notify contacts that the person is safe
        contacts = self.list_contacts(user)
        if contacts:
            message = build_sos_cancelled_message(user.full_name)
            phone_numbers = [c.phone_number for c in contacts]
            await send_sms(phone_numbers, message)

        return session

    # ------------------------------------------------------------------
    # GET ACTIVE SESSION
    # ------------------------------------------------------------------

    def get_active_session(self, user: User) -> SosSession | None:
        return (
            self.db.query(SosSession)
            .filter(SosSession.user_id == user.id, SosSession.is_active == True)
            .first()
        )

    # ------------------------------------------------------------------
    # PUBLIC TRACKING (no auth)
    # ------------------------------------------------------------------

    def get_tracking_data(self, token: str) -> dict:
        """Return public tracking data for the live map page."""
        session = (
            self.db.query(SosSession)
            .filter(SosSession.token == token)
            .first()
        )
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracking link not found.")

        user = self.db.query(User).filter(User.id == session.user_id).first()

        return {
            "user_name": user.full_name if user else "Unknown",
            "is_active": session.is_active,
            "triggered_at": session.triggered_at,
            "last_latitude": session.last_latitude,
            "last_longitude": session.last_longitude,
            "last_location_update": session.last_location_update,
            "expires_at": session.expires_at,
        }

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _get_own_contact(self, user: User, contact_id: uuid.UUID) -> EmergencyContact:
        contact = (
            self.db.query(EmergencyContact)
            .filter(EmergencyContact.id == contact_id, EmergencyContact.user_id == user.id)
            .first()
        )
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found.")
        return contact

    def _get_active_session(self, user: User, session_id: uuid.UUID) -> SosSession:
        session = (
            self.db.query(SosSession)
            .filter(SosSession.id == session_id, SosSession.user_id == user.id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS session not found.")
        if not session.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SOS session is no longer active.")
        return session


def _build_tracking_url(token: str) -> str:
    base = settings.APP_BASE_URL.rstrip("/")
    prefix = settings.API_V1_PREFIX.rstrip("/")
    return f"{base}{prefix}/sos/track/{token}/map"
