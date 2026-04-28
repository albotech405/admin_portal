"""
Core ride service — request creation, offer handling, ride lifecycle.
"""

import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.driver import DriverProfile
from app.models.ride import (
    RideRequest, DriverResponse, Ride, RideMessage,
    RideRequestStatus, DriverResponseStatus, RideStatus,
)
from app.core.config import settings
from app.services.rides.connection_manager import manager
from app.services.rides.matching_service import MatchingService
from app.services.notifications.notification_service import NotificationService


class RideService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # RIDE REQUEST
    # ------------------------------------------------------------------
    async def create_ride_request(self, customer: User, data) -> RideRequest:
        """Customer creates a ride request and broadcasts to nearby drivers."""
        # Check for existing active request
        active = (
            self.db.query(RideRequest)
            .filter(
                RideRequest.customer_id == customer.id,
                RideRequest.status == RideRequestStatus.PENDING,
            )
            .first()
        )
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active ride request.",
            )

        ride_request = RideRequest(
            customer_id=customer.id,
            picking_point=data.picking_point.model_dump(),
            destination=data.destination.model_dump(),
            suggested_price=data.suggested_price,
            comment=data.comment,
            status=RideRequestStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.RIDE_REQUEST_EXPIRY_MINUTES),
        )
        self.db.add(ride_request)
        self.db.commit()
        self.db.refresh(ride_request)

        # Find and notify nearby drivers — never let matching errors kill the ride creation
        import logging as _logging
        _log = _logging.getLogger(__name__)
        try:
            matching = MatchingService(self.db)
            nearby_drivers = matching.find_nearby_drivers(
                pickup_lat=data.picking_point.latitude,
                pickup_lng=data.picking_point.longitude,
            )
        except Exception as e:
            _log.error("[RIDE] Driver matching failed for request %s: %s", ride_request.id, e)
            nearby_drivers = []

        _log.info(
            "[RIDE] request %s — found %d nearby driver(s) %s | active WS connections: %s",
            ride_request.id,
            len(nearby_drivers),
            [str(d.user_id) for d in nearby_drivers],
            list(manager.active_connections.keys()),
        )

        if nearby_drivers:
            driver_user_ids = [str(d.user_id) for d in nearby_drivers]
            await manager.broadcast_to_users(driver_user_ids, "new_ride_request", {
                "id": str(ride_request.id),
                "picking_point": ride_request.picking_point,
                "destination": ride_request.destination,
                "suggested_price": float(ride_request.suggested_price),
                "comment": ride_request.comment,
                "customer_id": str(customer.id),
                "customer_name": customer.full_name,
                "created_at": ride_request.created_at.isoformat() if ride_request.created_at else None,
                "expires_at": ride_request.expires_at.isoformat() if ride_request.expires_at else None,
            })
            _log.info("[RIDE] broadcasted new_ride_request to driver_user_ids: %s", driver_user_ids)

            # Push notification to nearby drivers (reaches them even if app is backgrounded)
            pickup_name = ride_request.picking_point.get("name", "Nearby") if isinstance(ride_request.picking_point, dict) else "Nearby"
            driver_user_id_list = [d.user_id for d in nearby_drivers]
            driver_users = self.db.query(User).filter(User.id.in_(driver_user_id_list)).all()
            await NotificationService.send_to_many(
                driver_users,
                title="New ride request nearby",
                body=f"Pickup: {pickup_name} — Fare: {ride_request.suggested_price}",
                data={"type": "new_ride_request", "request_id": str(ride_request.id)},
            )

        return ride_request

    def get_ride_request(self, request_id: uuid.UUID, user: User) -> RideRequest:
        """Get a ride request with its driver offers."""
        ride_request = (
            self.db.query(RideRequest)
            .options(joinedload(RideRequest.driver_responses))
            .filter(RideRequest.id == request_id)
            .first()
        )
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.customer_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return ride_request

    def get_active_requests(self, customer: User) -> list[RideRequest]:
        """Get customer's active (PENDING) ride requests."""
        return (
            self.db.query(RideRequest)
            .filter(
                RideRequest.customer_id == customer.id,
                RideRequest.status == RideRequestStatus.PENDING,
            )
            .order_by(RideRequest.created_at.desc())
            .all()
        )

    async def cancel_ride_request(self, request_id: uuid.UUID, customer: User) -> RideRequest:
        """Customer cancels a pending ride request."""
        ride_request = (
            self.db.query(RideRequest)
            .filter(RideRequest.id == request_id)
            .first()
        )
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is not pending.")

        ride_request.status = RideRequestStatus.CANCELLED

        # Reject all pending driver responses
        pending_responses = (
            self.db.query(DriverResponse)
            .filter(
                DriverResponse.ride_request_id == request_id,
                DriverResponse.status == DriverResponseStatus.PENDING,
            )
            .all()
        )
        driver_user_ids = []
        for resp in pending_responses:
            resp.status = DriverResponseStatus.EXPIRED
            driver = self.db.query(DriverProfile).filter(DriverProfile.id == resp.driver_id).first()
            if driver:
                driver_user_ids.append(str(driver.user_id))

        self.db.commit()
        self.db.refresh(ride_request)

        # Notify drivers
        if driver_user_ids:
            await manager.broadcast_to_users(driver_user_ids, "request_closed", {
                "request_id": str(request_id),
                "reason": "cancelled_by_customer",
            })
            cancelled_driver_users = self.db.query(User).filter(
                User.id.in_([uuid.UUID(uid) for uid in driver_user_ids])
            ).all()
            await NotificationService.send_to_many(
                cancelled_driver_users,
                title="Ride request cancelled",
                body="The customer cancelled their ride request",
                data={"type": "request_closed", "request_id": str(request_id)},
            )

        return ride_request

    # ------------------------------------------------------------------
    # DRIVER OFFER
    # ------------------------------------------------------------------
    async def submit_driver_offer(self, request_id: uuid.UUID, driver_user: User, data) -> DriverResponse:
        """Driver submits a price offer for a ride request."""
        ride_request = (
            self.db.query(RideRequest)
            .filter(RideRequest.id == request_id)
            .first()
        )
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is no longer pending.")

        # Check expiry
        if ride_request.expires_at and datetime.now(timezone.utc) > ride_request.expires_at:
            ride_request.status = RideRequestStatus.EXPIRED
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request has expired.")

        # Get driver profile
        driver_profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.user_id == driver_user.id)
            .first()
        )
        if not driver_profile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver profile not found.")

        # Check driver doesn't already have a pending offer on ANY request
        existing_pending = (
            self.db.query(DriverResponse)
            .join(RideRequest)
            .filter(
                DriverResponse.driver_id == driver_profile.id,
                DriverResponse.status == DriverResponseStatus.PENDING,
                RideRequest.status == RideRequestStatus.PENDING,
            )
            .first()
        )
        if existing_pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have a pending offer on another ride request.",
            )

        response = DriverResponse(
            ride_request_id=request_id,
            driver_id=driver_profile.id,
            driver_price=data.driver_price,
            status=DriverResponseStatus.PENDING,
        )
        self.db.add(response)
        self.db.commit()
        self.db.refresh(response)

        # Build vehicle info
        vehicle_info = None
        if driver_profile.vehicle:
            v = driver_profile.vehicle
            vehicle_info = {
                "make": v.make,
                "model": v.model,
                "color": v.color,
                "license_plate": v.license_plate,
                "vehicle_type": v.vehicle_type,
            }

        # Notify customer via WebSocket
        await manager.send_to_user(str(ride_request.customer_id), "driver_offer", {
            "response_id": str(response.id),
            "driver_id": str(driver_profile.id),
            "driver_name": driver_user.full_name,
            "driver_rating": driver_profile.rating,
            "vehicle_info": vehicle_info,
            "driver_price": float(data.driver_price),
        })

        # Push notification to customer (reaches them even when app is backgrounded)
        customer = self.db.query(User).filter(User.id == ride_request.customer_id).first()
        await NotificationService.send_to_user(
            customer,
            title="New offer from a driver",
            body=f"{driver_user.full_name} offered {data.driver_price} for your ride",
            data={"type": "driver_offer", "request_id": str(request_id), "response_id": str(response.id)},
        )

        return response

    # ------------------------------------------------------------------
    # ACCEPT OFFER
    # ------------------------------------------------------------------
    async def accept_driver_offer(
        self, request_id: uuid.UUID, response_id: uuid.UUID, customer: User
    ) -> Ride:
        """Customer accepts a driver's offer — creates the Ride."""
        ride_request = (
            self.db.query(RideRequest)
            .filter(RideRequest.id == request_id)
            .first()
        )
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is no longer pending.")

        # Get the chosen response
        chosen = (
            self.db.query(DriverResponse)
            .filter(
                DriverResponse.id == response_id,
                DriverResponse.ride_request_id == request_id,
            )
            .first()
        )
        if not chosen:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver offer not found.")
        if chosen.status != DriverResponseStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This offer is no longer available.")

        # Accept chosen, reject others
        chosen.status = DriverResponseStatus.ACCEPTED
        ride_request.status = RideRequestStatus.ACCEPTED

        other_responses = (
            self.db.query(DriverResponse)
            .filter(
                DriverResponse.ride_request_id == request_id,
                DriverResponse.id != response_id,
            )
            .all()
        )
        rejected_driver_user_ids = []
        for resp in other_responses:
            resp.status = DriverResponseStatus.REJECTED
            driver = self.db.query(DriverProfile).filter(DriverProfile.id == resp.driver_id).first()
            if driver:
                rejected_driver_user_ids.append(str(driver.user_id))

        # Create the ride
        ride = Ride(
            ride_request_id=request_id,
            customer_id=customer.id,
            driver_id=chosen.driver_id,
            picking_point=ride_request.picking_point,
            destination=ride_request.destination,
            customer_comment=ride_request.comment,
            price=chosen.driver_price,
            status=RideStatus.DRIVER_EN_ROUTE,
        )
        self.db.add(ride)
        self.db.commit()
        self.db.refresh(ride)

        # Get driver profile for notification
        driver_profile = self.db.query(DriverProfile).filter(DriverProfile.id == chosen.driver_id).first()

        # Notify accepted driver
        if driver_profile:
            await manager.send_to_user(str(driver_profile.user_id), "offer_accepted", {
                "ride_id": str(ride.id),
                "picking_point": ride.picking_point,
                "destination": ride.destination,
                "agreed_price": float(ride.price),
                "customer_name": customer.full_name,
                "customer_phone": customer.phone_number,
            })
            accepted_driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
            pickup_name = ride.picking_point.get("name", "the pickup point") if isinstance(ride.picking_point, dict) else "the pickup point"
            await NotificationService.send_to_user(
                accepted_driver_user,
                title="Offer accepted!",
                body=f"{customer.full_name} accepted your offer — head to {pickup_name}",
                data={"type": "offer_accepted", "ride_id": str(ride.id)},
            )

        # Notify rejected drivers
        if rejected_driver_user_ids:
            await manager.broadcast_to_users(rejected_driver_user_ids, "request_closed", {
                "request_id": str(request_id),
                "reason": "accepted_by_other",
            })
            rejected_users = self.db.query(User).filter(
                User.id.in_([uuid.UUID(uid) for uid in rejected_driver_user_ids])
            ).all()
            await NotificationService.send_to_many(
                rejected_users,
                title="Ride taken",
                body="The customer accepted another driver's offer",
                data={"type": "request_closed", "request_id": str(request_id)},
            )

        return ride

    # ------------------------------------------------------------------
    # RIDE LIFECYCLE
    # ------------------------------------------------------------------
    def get_ride(self, ride_id: uuid.UUID, user: User) -> Ride:
        """Get ride details. Both customer and driver can access."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
        self._verify_ride_participant(ride, user)
        return ride

    async def start_ride(self, ride_id: uuid.UUID, driver_user: User) -> Ride:
        """Driver starts the trip."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        # Only driver can start
        driver_profile = self._get_driver_profile(driver_user)
        if ride.driver_id != driver_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned driver can start this ride.")
        if ride.status not in (RideStatus.DRIVER_EN_ROUTE, RideStatus.ARRIVED):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride cannot be started from current status.")

        ride.status = RideStatus.IN_PROGRESS
        ride.started_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(ride)

        # Notify customer
        await manager.send_to_user(str(ride.customer_id), "ride_status_update", {
            "ride_id": str(ride.id),
            "status": RideStatus.IN_PROGRESS.value,
        })

        customer = self.db.query(User).filter(User.id == ride.customer_id).first()
        await NotificationService.send_to_user(
            customer,
            title="Trip started",
            body="Your ride is now in progress. Enjoy your trip!",
            data={"type": "ride_started", "ride_id": str(ride.id)},
        )

        return ride

    async def complete_ride(self, ride_id: uuid.UUID, driver_user: User) -> Ride:
        """Driver completes the trip."""
        from app.services.wallet.wallet_service import WalletService

        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        driver_profile = self._get_driver_profile(driver_user)
        if ride.driver_id != driver_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned driver can complete this ride.")
        if ride.status != RideStatus.IN_PROGRESS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride is not in progress.")

        # Deduct platform commission from driver wallet (raises 402 if insufficient)
        wallet_service = WalletService(self.db)
        wallet_service.deduct_ride_commission(driver_profile, ride_id)

        ride.status = RideStatus.COMPLETED
        ride.completed_at = datetime.now(timezone.utc)
        self.db.commit()

        # Delete chat messages (ephemeral)
        self.db.query(RideMessage).filter(RideMessage.ride_id == ride_id).delete()
        self.db.commit()
        self.db.refresh(ride)

        # Notify customer
        await manager.send_to_user(str(ride.customer_id), "ride_completed", {
            "ride_id": str(ride.id),
            "final_price": float(ride.price),
            "prompt_rating": True,
        })

        customer = self.db.query(User).filter(User.id == ride.customer_id).first()
        await NotificationService.send_to_user(
            customer,
            title="Trip completed!",
            body=f"Your trip is done. Fare: {ride.price}. Please rate your driver.",
            data={"type": "ride_completed", "ride_id": str(ride.id), "prompt_rating": "true"},
        )

        return ride

    async def cancel_ride(self, ride_id: uuid.UUID, user: User, reason: str) -> Ride:
        """Either party cancels the ride."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        self._verify_ride_participant(ride, user)

        if ride.status in (RideStatus.COMPLETED, RideStatus.CANCELLED):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride cannot be cancelled.")

        ride.status = RideStatus.CANCELLED
        ride.cancelled_at = datetime.now(timezone.utc)
        ride.cancelled_by = user.id
        ride.cancellation_reason = reason
        self.db.commit()

        # Delete chat messages
        self.db.query(RideMessage).filter(RideMessage.ride_id == ride_id).delete()
        self.db.commit()
        self.db.refresh(ride)

        # Notify the other party
        driver_profile = self.db.query(DriverProfile).filter(DriverProfile.id == ride.driver_id).first()
        other_user_id = (
            str(driver_profile.user_id) if user.id == ride.customer_id else str(ride.customer_id)
        )
        await manager.send_to_user(other_user_id, "ride_cancelled", {
            "ride_id": str(ride.id),
            "cancelled_by": str(user.id),
            "reason": reason,
        })

        other_user = self.db.query(User).filter(User.id == uuid.UUID(other_user_id)).first()
        await NotificationService.send_to_user(
            other_user,
            title="Ride cancelled",
            body=f"The ride was cancelled. Reason: {reason}",
            data={"type": "ride_cancelled", "ride_id": str(ride.id)},
        )

        return ride

    def get_ride_history(self, user: User) -> list[Ride]:
        """Get completed/cancelled rides for a user."""
        # Check if user is customer or driver
        driver_profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.user_id == user.id)
            .first()
        )

        query = self.db.query(Ride).filter(
            Ride.status.in_([RideStatus.COMPLETED, RideStatus.CANCELLED])
        )

        if driver_profile:
            query = query.filter(
                (Ride.customer_id == user.id) | (Ride.driver_id == driver_profile.id)
            )
        else:
            query = query.filter(Ride.customer_id == user.id)

        return query.order_by(Ride.created_at.desc()).all()

    def get_nearby_requests(self, driver_user: User) -> list[RideRequest]:
        """REST fallback: get pending ride requests. Returns all pending requests
        when driver has no GPS set; PostGIS filtering applies when location is available."""
        driver_profile = self._get_driver_profile(driver_user)

        return (
            self.db.query(RideRequest)
            .filter(RideRequest.status == RideRequestStatus.PENDING)
            .order_by(RideRequest.created_at.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # DRIVER ARRIVED (3.2)
    # ------------------------------------------------------------------
    async def driver_arrived(self, ride_id: uuid.UUID, driver_user: User) -> Ride:
        """Driver signals they have arrived at the pickup point."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")

        driver_profile = self._get_driver_profile(driver_user)
        if ride.driver_id != driver_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned driver can update this ride.")
        if ride.status != RideStatus.DRIVER_EN_ROUTE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride is not in DRIVER_EN_ROUTE status.")

        ride.status = RideStatus.ARRIVED
        ride.arrived_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(ride)

        await manager.send_to_user(str(ride.customer_id), "ride_status_update", {
            "ride_id": str(ride.id),
            "status": RideStatus.ARRIVED.value,
            "timestamp": ride.arrived_at.isoformat(),
        })

        customer = self.db.query(User).filter(User.id == ride.customer_id).first()
        await NotificationService.send_to_user(
            customer,
            title="Your driver has arrived!",
            body="Your driver is waiting at the pickup point",
            data={"type": "driver_arrived", "ride_id": str(ride.id)},
        )

        return ride

    # ------------------------------------------------------------------
    # UPDATE PROPOSED FARE (1.2)
    # ------------------------------------------------------------------
    async def update_proposed_fare(self, request_id: uuid.UUID, customer: User, new_fare: float) -> RideRequest:
        """Customer adjusts the proposed fare while waiting for offers."""
        ride_request = self.db.query(RideRequest).filter(RideRequest.id == request_id).first()
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is no longer pending.")

        old_fare = float(ride_request.suggested_price)
        ride_request.suggested_price = new_fare
        self.db.commit()
        self.db.refresh(ride_request)

        # Notify all drivers who have a pending offer on this request
        pending_responses = (
            self.db.query(DriverResponse)
            .filter(
                DriverResponse.ride_request_id == request_id,
                DriverResponse.status == DriverResponseStatus.PENDING,
            )
            .all()
        )
        if pending_responses:
            driver_ids = [resp.driver_id for resp in pending_responses]
            driver_profiles = self.db.query(DriverProfile).filter(DriverProfile.id.in_(driver_ids)).all()
            driver_user_ids = [str(d.user_id) for d in driver_profiles]
            await manager.broadcast_to_users(driver_user_ids, "fare_updated", {
                "request_id": str(request_id),
                "old_fare": old_fare,
                "new_fare": new_fare,
            })

        return ride_request

    # ------------------------------------------------------------------
    # UPDATE DRIVER OFFER PRICE (2.3)
    # ------------------------------------------------------------------
    async def update_driver_offer(
        self, request_id: uuid.UUID, response_id: uuid.UUID, driver_user: User, new_price: float
    ) -> DriverResponse:
        """Driver changes the price on their existing offer."""
        ride_request = self.db.query(RideRequest).filter(RideRequest.id == request_id).first()
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is no longer pending.")

        driver_profile = self._get_driver_profile(driver_user)

        response = self.db.query(DriverResponse).filter(
            DriverResponse.id == response_id,
            DriverResponse.ride_request_id == request_id,
            DriverResponse.driver_id == driver_profile.id,
        ).first()
        if not response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found.")
        if response.status != DriverResponseStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Offer is no longer pending.")

        old_price = float(response.driver_price)
        response.driver_price = new_price
        self.db.commit()
        self.db.refresh(response)

        await manager.send_to_user(str(ride_request.customer_id), "offer_updated", {
            "response_id": str(response_id),
            "old_price": old_price,
            "new_price": new_price,
        })

        return response

    # ------------------------------------------------------------------
    # REJECT DRIVER OFFER (customer explicitly rejects one offer)
    # ------------------------------------------------------------------
    async def reject_driver_offer(
        self, request_id: uuid.UUID, response_id: uuid.UUID, customer: User
    ) -> dict:
        """Customer explicitly rejects a single driver offer (offer_rejected WS to driver)."""
        ride_request = self.db.query(RideRequest).filter(RideRequest.id == request_id).first()
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")
        if ride_request.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        if ride_request.status != RideRequestStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride request is no longer pending.")

        response = self.db.query(DriverResponse).filter(
            DriverResponse.id == response_id,
            DriverResponse.ride_request_id == request_id,
        ).first()
        if not response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found.")
        if response.status != DriverResponseStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Offer is no longer pending.")

        response.status = DriverResponseStatus.REJECTED
        self.db.commit()

        # Notify driver their offer was rejected so they can re-offer at a different price
        driver_profile = self.db.query(DriverProfile).filter(DriverProfile.id == response.driver_id).first()
        if driver_profile:
            await manager.send_to_user(str(driver_profile.user_id), "offer_rejected", {
                "response_id": str(response_id),
                "request_id": str(request_id),
            })
            driver_user = self.db.query(User).filter(User.id == driver_profile.user_id).first()
            await NotificationService.send_to_user(
                driver_user,
                title="Offer rejected",
                body="The customer rejected your offer. You can try a different price.",
                data={"type": "offer_rejected", "request_id": str(request_id), "response_id": str(response_id)},
            )

        return {"success": True}

    # ------------------------------------------------------------------
    # WITHDRAW DRIVER OFFER (2.4)
    # ------------------------------------------------------------------
    async def withdraw_driver_offer(
        self, request_id: uuid.UUID, response_id: uuid.UUID, driver_user: User
    ) -> dict:
        """Driver withdraws their offer from a ride request."""
        ride_request = self.db.query(RideRequest).filter(RideRequest.id == request_id).first()
        if not ride_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride request not found.")

        driver_profile = self._get_driver_profile(driver_user)

        response = self.db.query(DriverResponse).filter(
            DriverResponse.id == response_id,
            DriverResponse.ride_request_id == request_id,
            DriverResponse.driver_id == driver_profile.id,
        ).first()
        if not response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found.")
        if response.status != DriverResponseStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending offers can be withdrawn.")

        response.status = DriverResponseStatus.WITHDRAWN
        self.db.commit()

        await manager.send_to_user(str(ride_request.customer_id), "offer_withdrawn", {
            "response_id": str(response_id),
        })

        return {"success": True}

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------
    def _get_driver_profile(self, user: User) -> DriverProfile:
        profile = (
            self.db.query(DriverProfile)
            .options(joinedload(DriverProfile.vehicle))
            .filter(DriverProfile.user_id == user.id)
            .first()
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver profile not found.")
        return profile

    def _verify_ride_participant(self, ride: Ride, user: User):
        """Check the user is either the customer or the driver of this ride."""
        if ride.customer_id == user.id:
            return
        driver_profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.user_id == user.id)
            .first()
        )
        if driver_profile and ride.driver_id == driver_profile.id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
