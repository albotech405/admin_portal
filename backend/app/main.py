"""
AlboTax Backend - Main Application Entry Point
"""

import logging

# Configure root logger before uvicorn starts so all app loggers
# (e.g. app.services.rides.ws_router) write to stdout on Render.
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings
from app.core.supabase import supabase_admin
from app.db.engine import SessionLocal

from app.services.auth.router import router as auth_router
from app.services.user.router import router as user_router
from app.services.drivers.router import router as driver_router
from app.services.rides.router import router as rides_router
from app.services.rides.ws_router import router as ws_router
from app.services.addresses.router import router as addresses_router
from app.services.wallet.router import router as wallet_router
from app.services.sos.router import router as sos_router
from app.services.payments.router import router as payments_router

DRIVER_DOCUMENTS_BUCKET = "driver-documents"
PAYMENT_PROOFS_BUCKET = "payment-proofs"
USER_AVATARS_BUCKET = "user-avatars"

scheduler = AsyncIOScheduler()


async def expire_stale_ride_requests():
    """Expire ride requests that have passed their expires_at time."""
    from app.models.ride import RideRequest, DriverResponse, RideRequestStatus, DriverResponseStatus
    from app.services.rides.connection_manager import manager

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired_requests = (
            db.query(RideRequest)
            .filter(
                RideRequest.status == RideRequestStatus.PENDING,
                RideRequest.expires_at <= now,
            )
            .all()
        )

        for req in expired_requests:
            req.status = RideRequestStatus.EXPIRED

            # Expire all pending driver responses
            pending_responses = (
                db.query(DriverResponse)
                .filter(
                    DriverResponse.ride_request_id == req.id,
                    DriverResponse.status == DriverResponseStatus.PENDING,
                )
                .all()
            )
            for resp in pending_responses:
                resp.status = DriverResponseStatus.EXPIRED

            # Notify customer
            await manager.send_to_user(str(req.customer_id), "request_expired", {
                "request_id": str(req.id),
                "reason": "expired",
            })

        if expired_requests:
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error expiring ride requests: {e}")
    finally:
        db.close()


async def expire_stale_sos_sessions():
    """Deactivate SOS sessions that have passed their expires_at time."""
    from app.models.sos import SosSession

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        stale = (
            db.query(SosSession)
            .filter(SosSession.is_active == True, SosSession.expires_at <= now)
            .all()
        )
        for session in stale:
            session.is_active = False
            session.cancelled_at = now
        if stale:
            db.commit()
            print(f"Expired {len(stale)} stale SOS session(s)")
    except Exception as e:
        db.rollback()
        print(f"Error expiring SOS sessions: {e}")
    finally:
        db.close()


async def keep_alive_ping():
    """Ping self to prevent Render free-tier cold starts."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.get(f"{settings.APP_BASE_URL}/")
    except Exception:
        pass  # Silent — this is just a keep-alive, not critical


async def mark_stale_drivers_offline():
    """Mark drivers with stale locations as offline."""
    from app.models.driver import DriverProfile

    db = SessionLocal()
    try:
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.DRIVER_LOCATION_STALE_MINUTES)
        stale_drivers = (
            db.query(DriverProfile)
            .filter(
                DriverProfile.is_online == True,
                DriverProfile.last_location_update != None,
                DriverProfile.last_location_update < stale_cutoff,
            )
            .all()
        )

        for driver in stale_drivers:
            driver.is_online = False

        if stale_drivers:
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error marking stale drivers offline: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure storage buckets exist
    for bucket_name in (DRIVER_DOCUMENTS_BUCKET, PAYMENT_PROOFS_BUCKET, USER_AVATARS_BUCKET):
        try:
            supabase_admin.storage.get_bucket(bucket_name)
        except Exception:
            try:
                supabase_admin.storage.create_bucket(bucket_name, options={"public": True})
                print(f"Created storage bucket: {bucket_name}")
            except Exception as e:
                print(f"Warning: Could not create storage bucket '{bucket_name}': {e}")

    # Start background scheduler
    scheduler.add_job(expire_stale_ride_requests, "interval", seconds=30, id="expire_requests")
    scheduler.add_job(mark_stale_drivers_offline, "interval", seconds=60, id="stale_drivers")
    scheduler.add_job(expire_stale_sos_sessions, "interval", seconds=90, id="expire_sos")
    scheduler.add_job(keep_alive_ping, "interval", seconds=600, id="keep_alive")
    scheduler.start()
    print("Background scheduler started")

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    print("Background scheduler stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for AlboTax - Taxi Booking Application",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=settings.cors_methods,
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to AlboTax Backend API", "status": "running"}


# API routes
app.include_router(auth_router, prefix=settings.API_V1_PREFIX, tags=["User Authentication"])
app.include_router(user_router, prefix=settings.API_V1_PREFIX, tags=["User Endpoints"])
app.include_router(driver_router, prefix=settings.API_V1_PREFIX, tags=["Driver Endpoints"])
app.include_router(rides_router, prefix=settings.API_V1_PREFIX, tags=["Ride Endpoints"])
app.include_router(ws_router, prefix=settings.API_V1_PREFIX, tags=["WebSocket"])
app.include_router(addresses_router, prefix=settings.API_V1_PREFIX, tags=["Saved Addresses"])
app.include_router(wallet_router, prefix=settings.API_V1_PREFIX, tags=["Wallet"])
app.include_router(sos_router, prefix=settings.API_V1_PREFIX, tags=["SOS"])
app.include_router(payments_router, prefix=settings.API_V1_PREFIX, tags=["Payments"])

# Run with: uvicorn main:app --reload
