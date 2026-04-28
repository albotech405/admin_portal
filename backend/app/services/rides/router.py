"""
Ride REST API endpoints.
"""

import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db.engine import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.driver import DriverProfile
from app.models.ride import Ride, RideStatus
from app.services.rides.connection_manager import manager
from app.services.rides.ride_service import RideService
from app.services.rides.chat_service import ChatService
from app.services.rides.rating_service import RatingService
from app.services.rides.matching_service import MatchingService
from app.core.config import settings
from app.services.rides.schema import (
    CreateRideRequestSchema,
    DriverOfferSchema,
    SendMessageSchema,
    RateRideSchema,
    CancelRideSchema,
    UpdateLocationSchema,
    UpdateFareSchema,
    UpdateOfferSchema,
    RideRequestResponse,
    DriverOfferResponse,
    RideRequestWithOffersResponse,
    RideResponse,
    MessageResponse,
    RatingResponse,
    LocationUpdateResponse,
    UpdateFareResponse,
    UpdateOfferResponse,
    WithdrawOfferResponse,
    ArrivedResponse,
    RejectOfferResponse,
    FareEstimateResponse,
)

router = APIRouter(prefix="/rides")


# ------------------------------------------------------------------
# FARE ESTIMATION
# ------------------------------------------------------------------

@router.get(
    "/fare/estimate",
    response_model=FareEstimateResponse,
    summary="Estimate fare for a ride",
)
async def estimate_fare(
    distance_km: float = Query(..., gt=0, description="Distance in kilometres"),
    duration_minutes: float = Query(..., gt=0, description="Estimated trip duration in minutes"),
    vehicle_type: str = Query(default="car", pattern=r"^(car|motorcycle)$"),
    user: User = Depends(get_current_user),
):
    if vehicle_type == "motorcycle":
        base = settings.FARE_MOTO_BASE
        per_km = settings.FARE_MOTO_PER_KM
        per_min = settings.FARE_MOTO_PER_MIN
    else:
        base = settings.FARE_CAR_BASE
        per_km = settings.FARE_CAR_PER_KM
        per_min = settings.FARE_CAR_PER_MIN

    fare = base + (per_km * distance_km) + (per_min * duration_minutes)

    return FareEstimateResponse(
        vehicle_type=vehicle_type,
        distance_km=round(distance_km, 2),
        duration_minutes=round(duration_minutes, 2),
        estimated_fare=round(fare, 2),
    )


# ------------------------------------------------------------------
# RIDE REQUEST & NEGOTIATION
# ------------------------------------------------------------------

@router.post(
    "/request",
    response_model=RideRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ride request",
)
async def create_ride_request(
    data: CreateRideRequestSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.create_ride_request(user, data)


@router.get(
    "/request/{request_id}",
    response_model=RideRequestWithOffersResponse,
    summary="Get ride request with all driver offers",
)
async def get_ride_request(
    request_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    ride_request = service.get_ride_request(request_id, user)

    # Build offer responses with driver info
    offers = []
    for resp in ride_request.driver_responses:
        driver = db.query(DriverProfile).options(
            joinedload(DriverProfile.vehicle),
            joinedload(DriverProfile.user),
        ).filter(DriverProfile.id == resp.driver_id).first()

        vehicle_info = None
        if driver and driver.vehicle:
            v = driver.vehicle
            vehicle_info = {
                "make": v.make,
                "model": v.model,
                "color": v.color,
                "license_plate": v.license_plate,
                "vehicle_type": v.vehicle_type,
            }

        offers.append(DriverOfferResponse(
            id=resp.id,
            ride_request_id=resp.ride_request_id,
            driver_id=resp.driver_id,
            driver_name=driver.user.full_name if driver and driver.user else "Unknown",
            driver_rating=driver.rating if driver else 0.0,
            vehicle_info=vehicle_info,
            driver_price=float(resp.driver_price),
            status=resp.status.value if hasattr(resp.status, "value") else str(resp.status),
            created_at=resp.created_at,
        ))

    return RideRequestWithOffersResponse(
        request=RideRequestResponse(
            id=ride_request.id,
            customer_id=ride_request.customer_id,
            picking_point=ride_request.picking_point,
            destination=ride_request.destination,
            suggested_price=float(ride_request.suggested_price),
            comment=ride_request.comment,
            status=ride_request.status.value if hasattr(ride_request.status, "value") else str(ride_request.status),
            created_at=ride_request.created_at,
            expires_at=ride_request.expires_at,
        ),
        offers=offers,
    )


@router.get(
    "/requests/active",
    response_model=list[RideRequestResponse],
    summary="Get customer's active ride requests",
)
async def get_active_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    requests = service.get_active_requests(user)
    return [
        RideRequestResponse(
            id=r.id,
            customer_id=r.customer_id,
            picking_point=r.picking_point,
            destination=r.destination,
            suggested_price=float(r.suggested_price),
            comment=r.comment,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at,
            expires_at=r.expires_at,
        )
        for r in requests
    ]


@router.put(
    "/request/{request_id}/fare",
    response_model=UpdateFareResponse,
    summary="Customer updates their proposed fare while waiting (1.2)",
)
async def update_proposed_fare(
    request_id: uuid.UUID,
    data: UpdateFareSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    ride_request = await service.update_proposed_fare(request_id, user, data.proposed_fare)
    return UpdateFareResponse(
        proposed_fare=float(ride_request.suggested_price),
        updated_at=ride_request.created_at,  # updated_at not on model; created_at used as fallback
    )


@router.post(
    "/request/{request_id}/cancel",
    response_model=RideRequestResponse,
    summary="Cancel a pending ride request",
)
async def cancel_ride_request(
    request_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.cancel_ride_request(request_id, user)


# ------------------------------------------------------------------
# DRIVER OFFERS
# ------------------------------------------------------------------

@router.post(
    "/request/{request_id}/offer",
    response_model=DriverOfferResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Driver submits a price offer",
)
async def submit_driver_offer(
    request_id: uuid.UUID,
    data: DriverOfferSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    response = await service.submit_driver_offer(request_id, user, data)

    # Build full response with driver info
    driver = db.query(DriverProfile).options(
        joinedload(DriverProfile.vehicle),
    ).filter(DriverProfile.id == response.driver_id).first()

    vehicle_info = None
    if driver and driver.vehicle:
        v = driver.vehicle
        vehicle_info = {
            "make": v.make, "model": v.model,
            "color": v.color, "license_plate": v.license_plate,
            "vehicle_type": v.vehicle_type,
        }

    return DriverOfferResponse(
        id=response.id,
        ride_request_id=response.ride_request_id,
        driver_id=response.driver_id,
        driver_name=user.full_name,
        driver_rating=driver.rating if driver else 0.0,
        vehicle_info=vehicle_info,
        driver_price=float(response.driver_price),
        status=response.status.value if hasattr(response.status, "value") else str(response.status),
        created_at=response.created_at,
    )


@router.get(
    "/requests/nearby",
    response_model=list[RideRequestResponse],
    summary="Get pending ride requests near the driver (REST fallback)",
)
async def get_nearby_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    requests = service.get_nearby_requests(user)

    # Batch-load customer names
    customer_ids = list({r.customer_id for r in requests})
    customers = {
        u.id: u.full_name
        for u in db.query(User).filter(User.id.in_(customer_ids)).all()
    }

    return [
        RideRequestResponse(
            id=r.id,
            customer_id=r.customer_id,
            customer_name=customers.get(r.customer_id),
            picking_point=r.picking_point,
            destination=r.destination,
            suggested_price=float(r.suggested_price),
            comment=r.comment,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at,
            expires_at=r.expires_at,
        )
        for r in requests
    ]


@router.put(
    "/request/{request_id}/offer/{response_id}",
    response_model=UpdateOfferResponse,
    summary="Driver updates their offer price (2.3)",
)
async def update_driver_offer(
    request_id: uuid.UUID,
    response_id: uuid.UUID,
    data: UpdateOfferSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    response = await service.update_driver_offer(request_id, response_id, user, data.offered_price)
    return UpdateOfferResponse(
        response_id=response.id,
        offered_price=float(response.driver_price),
        updated_at=response.created_at,
    )


@router.delete(
    "/request/{request_id}/offer/{response_id}",
    response_model=WithdrawOfferResponse,
    summary="Driver withdraws their offer (2.4)",
)
async def withdraw_driver_offer(
    request_id: uuid.UUID,
    response_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.withdraw_driver_offer(request_id, response_id, user)


@router.post(
    "/request/{request_id}/reject/{response_id}",
    response_model=RejectOfferResponse,
    summary="Customer explicitly rejects a driver's offer",
)
async def reject_driver_offer(
    request_id: uuid.UUID,
    response_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.reject_driver_offer(request_id, response_id, user)


@router.post(
    "/request/{request_id}/accept/{response_id}",
    response_model=RideResponse,
    summary="Customer accepts a driver's offer",
)
async def accept_driver_offer(
    request_id: uuid.UUID,
    response_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.accept_driver_offer(request_id, response_id, user)


# ------------------------------------------------------------------
# RIDE LIFECYCLE
# ------------------------------------------------------------------

@router.get(
    "/{ride_id}",
    response_model=RideResponse,
    summary="Get ride details",
)
async def get_ride(
    ride_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    ride = service.get_ride(ride_id, user)

    # Fetch phone numbers for both parties
    customer = db.query(User).filter(User.id == ride.customer_id).first()
    driver_profile = db.query(DriverProfile).filter(DriverProfile.id == ride.driver_id).first()
    driver_user = db.query(User).filter(User.id == driver_profile.user_id).first() if driver_profile else None

    return RideResponse(
        id=ride.id,
        ride_request_id=ride.ride_request_id,
        customer_id=ride.customer_id,
        driver_id=ride.driver_id,
        customer_phone=customer.phone_number if customer else None,
        driver_phone=driver_user.phone_number if driver_user else None,
        picking_point=ride.picking_point,
        destination=ride.destination,
        customer_comment=ride.customer_comment,
        price=float(ride.price),
        status=ride.status.value if hasattr(ride.status, "value") else str(ride.status),
        started_at=ride.started_at,
        completed_at=ride.completed_at,
        cancelled_at=ride.cancelled_at,
        cancelled_by=ride.cancelled_by,
        cancellation_reason=ride.cancellation_reason,
        created_at=ride.created_at,
    )


@router.patch(
    "/{ride_id}/arrived",
    response_model=ArrivedResponse,
    summary="Driver signals arrival at pickup point (3.2)",
)
async def driver_arrived(
    ride_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    ride = await service.driver_arrived(ride_id, user)
    return ArrivedResponse(status=ride.status.value, arrived_at=ride.arrived_at)


@router.patch(
    "/{ride_id}/start",
    response_model=RideResponse,
    summary="Driver starts the trip",
)
async def start_ride(
    ride_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.start_ride(ride_id, user)


@router.patch(
    "/{ride_id}/complete",
    response_model=RideResponse,
    summary="Driver completes the trip",
)
async def complete_ride(
    ride_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.complete_ride(ride_id, user)


@router.patch(
    "/{ride_id}/cancel",
    response_model=RideResponse,
    summary="Cancel an active ride",
)
async def cancel_ride(
    ride_id: uuid.UUID,
    data: CancelRideSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return await service.cancel_ride(ride_id, user, data.reason)


@router.get(
    "/history/all",
    response_model=list[RideResponse],
    summary="Get ride history",
)
async def get_ride_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RideService(db)
    return service.get_ride_history(user)


# ------------------------------------------------------------------
# CHAT
# ------------------------------------------------------------------

@router.post(
    "/{ride_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a chat message",
)
async def send_message(
    ride_id: uuid.UUID,
    data: SendMessageSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    return await service.send_message(ride_id, user, data.message)


@router.get(
    "/{ride_id}/messages",
    response_model=list[MessageResponse],
    summary="Get chat message history",
)
async def get_messages(
    ride_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    return service.get_messages(ride_id, user)


# ------------------------------------------------------------------
# RATING
# ------------------------------------------------------------------

@router.post(
    "/{ride_id}/rate",
    response_model=RatingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Rate a completed ride",
)
async def rate_ride(
    ride_id: uuid.UUID,
    data: RateRideSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RatingService(db)
    return service.rate_ride(ride_id, user, data.rate, data.comment)


# ------------------------------------------------------------------
# DRIVER LOCATION
# ------------------------------------------------------------------

@router.patch(
    "/driver/{driver_id}/location",
    response_model=LocationUpdateResponse,
    summary="Update driver's current location",
)
async def update_driver_location(
    driver_id: uuid.UUID,
    data: UpdateLocationSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MatchingService(db)
    profile = service.update_driver_location(driver_id, user.id, data.latitude, data.longitude)

    # Push live location to customer if driver has an active ride
    active_ride = (
        db.query(Ride)
        .filter(
            Ride.driver_id == profile.id,
            Ride.status.in_([
                RideStatus.DRIVER_EN_ROUTE,
                RideStatus.ARRIVED,
                RideStatus.IN_PROGRESS,
            ]),
        )
        .first()
    )
    if active_ride:
        await manager.send_to_user(str(active_ride.customer_id), "driver_location", {
            "ride_id": str(active_ride.id),
            "latitude": data.latitude,
            "longitude": data.longitude,
        })

    return LocationUpdateResponse(latitude=profile.latitude, longitude=profile.longitude)
