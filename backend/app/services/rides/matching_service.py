"""
Driver matching service — finds nearby online drivers using PostGIS.
Falls back to a simple query when PostGIS is not available.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.driver import DriverProfile, VerificationStatus
from app.core.config import settings

logger = logging.getLogger(__name__)


class MatchingService:
    def __init__(self, db: Session):
        self.db = db

    def find_nearby_drivers(self, pickup_lat: float, pickup_lng: float) -> list[DriverProfile]:
        """
        Find online, approved drivers near the pickup point.
        Uses PostGIS for geographic filtering when available.
        Falls back to returning all online approved drivers if PostGIS is not installed.
        """
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.DRIVER_LOCATION_STALE_MINUTES)

        try:
            return self._find_with_postgis(pickup_lat, pickup_lng, stale_cutoff)
        except Exception as e:
            logger.warning(
                "PostGIS query failed (extension may not be installed) — falling back to simple query. Error: %s", e
            )
            return self._find_without_postgis(stale_cutoff)

    def _find_with_postgis(
        self, pickup_lat: float, pickup_lng: float, stale_cutoff: datetime
    ) -> list[DriverProfile]:
        radius_meters = settings.RIDE_SEARCH_RADIUS_KM * 1000

        query = text("""
            SELECT dp.id FROM driver_profiles dp
            WHERE dp.is_online = true
              AND dp.verification_status = 'approved'
              AND dp.latitude IS NOT NULL
              AND dp.longitude IS NOT NULL
              AND dp.last_location_update > :stale_cutoff
              AND ST_DWithin(
                  ST_MakePoint(dp.longitude, dp.latitude)::geography,
                  ST_MakePoint(:pickup_lng, :pickup_lat)::geography,
                  :radius_meters
              )
            ORDER BY ST_Distance(
                ST_MakePoint(dp.longitude, dp.latitude)::geography,
                ST_MakePoint(:pickup_lng, :pickup_lat)::geography
            )
        """)

        result = self.db.execute(query, {
            "stale_cutoff": stale_cutoff,
            "pickup_lng": pickup_lng,
            "pickup_lat": pickup_lat,
            "radius_meters": radius_meters,
        })

        driver_ids = [row[0] for row in result]
        if not driver_ids:
            return []

        return (
            self.db.query(DriverProfile)
            .filter(DriverProfile.id.in_(driver_ids))
            .all()
        )

    def _find_without_postgis(self, stale_cutoff: datetime) -> list[DriverProfile]:
        """Fallback: return all online approved drivers (location optional)."""
        return (
            self.db.query(DriverProfile)
            .filter(
                DriverProfile.is_online == True,
                DriverProfile.verification_status == VerificationStatus.APPROVED.value,
            )
            .all()
        )

    def get_nearby_drivers_for_map(
        self, latitude: float, longitude: float, radius_km: float
    ) -> list[dict]:
        """
        Return lightweight driver positions for the customer map (car icons).
        Only includes online, approved drivers with a recent location.
        """
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.DRIVER_LOCATION_STALE_MINUTES)
        radius_meters = radius_km * 1000

        try:
            query = text("""
                SELECT dp.id, dp.user_id, dp.latitude, dp.longitude, dp.vehicle_type,
                       vd.make, vd.model, vd.color
                FROM driver_profiles dp
                LEFT JOIN vehicle_details vd ON vd.driver_id = dp.id
                WHERE dp.is_online = true
                  AND dp.verification_status = 'approved'
                  AND dp.latitude IS NOT NULL
                  AND dp.longitude IS NOT NULL
                  AND dp.last_location_update > :stale_cutoff
                  AND ST_DWithin(
                      ST_MakePoint(dp.longitude, dp.latitude)::geography,
                      ST_MakePoint(:lng, :lat)::geography,
                      :radius_meters
                  )
                ORDER BY ST_Distance(
                    ST_MakePoint(dp.longitude, dp.latitude)::geography,
                    ST_MakePoint(:lng, :lat)::geography
                )
                LIMIT 50
            """)
            result = self.db.execute(query, {
                "stale_cutoff": stale_cutoff,
                "lat": latitude,
                "lng": longitude,
                "radius_meters": radius_meters,
            })
            rows = result.fetchall()
        except Exception as e:
            logger.warning("PostGIS nearby map query failed — falling back. Error: %s", e)
            rows = self.db.execute(
                text("""
                    SELECT dp.id, dp.user_id, dp.latitude, dp.longitude, dp.vehicle_type,
                           vd.make, vd.model, vd.color
                    FROM driver_profiles dp
                    LEFT JOIN vehicle_details vd ON vd.driver_id = dp.id
                    WHERE dp.is_online = true
                      AND dp.verification_status = 'approved'
                      AND dp.latitude IS NOT NULL
                      AND dp.longitude IS NOT NULL
                      AND dp.last_location_update > :stale_cutoff
                    LIMIT 50
                """),
                {"stale_cutoff": stale_cutoff},
            ).fetchall()

        return [
            {
                "driver_id": str(row[0]),
                "latitude": row[2],
                "longitude": row[3],
                "vehicle_type": row[4] or "car",
                "car_make": row[5],
                "car_model": row[6],
                "car_color": row[7],
            }
            for row in rows
        ]

    def update_driver_location(
        self, driver_id: uuid.UUID, user_id: uuid.UUID, latitude: float, longitude: float
    ) -> DriverProfile:
        """Update a driver's current location."""
        profile = (
            self.db.query(DriverProfile)
            .filter(DriverProfile.id == driver_id)
            .first()
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found.")
        if profile.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        profile.latitude = latitude
        profile.longitude = longitude
        profile.last_location_update = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(profile)
        return profile
