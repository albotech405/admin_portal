"""
Rating service — post-ride driver rating by customer.
"""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.driver import DriverProfile
from app.models.ride import Ride, RideRating, RideStatus


class RatingService:
    def __init__(self, db: Session):
        self.db = db

    def rate_ride(self, ride_id: uuid.UUID, customer: User, rate: int, comment: str | None) -> RideRating:
        """Customer rates a completed ride."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
        if ride.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the customer can rate this ride.")
        if ride.status != RideStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only rate completed rides.")

        # Check if already rated
        existing = self.db.query(RideRating).filter(RideRating.ride_id == ride_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This ride has already been rated.")

        rating = RideRating(
            ride_id=ride_id,
            customer_id=customer.id,
            driver_id=ride.driver_id,
            rate=rate,
            comment=comment,
        )
        self.db.add(rating)

        # Update driver average rating
        driver = self.db.query(DriverProfile).filter(DriverProfile.id == ride.driver_id).first()
        if driver:
            new_rating = (driver.rating * driver.total_rides + rate) / (driver.total_rides + 1)
            driver.rating = round(new_rating, 2)
            driver.total_rides += 1

        self.db.commit()
        self.db.refresh(rating)
        return rating
