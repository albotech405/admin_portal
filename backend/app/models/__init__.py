"""
Import all models here so Alembic can detect them.
"""

from app.models.base import Base
from app.models.user import User, UserRole
from app.models.driver import DriverProfile, VehicleDetails, DriverDocument, VerificationStatus, DocumentStatus
from app.models.ride import (
    RideRequest, DriverResponse, Ride, RideMessage, RideRating,
    RideRequestStatus, DriverResponseStatus, RideStatus,
)
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.models.address import SavedAddress
from app.models.sos import EmergencyContact, SosSession
from app.models.wallet import (
    WalletTopupRequest, WalletTransaction,
    PaymentMethod, TopupRequestStatus, TransactionType, TransactionReference,
)
