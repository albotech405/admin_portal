# Ride Feature — Implementation Design

> Backend implementation plan for the full ride lifecycle: from ride request to trip completion and rating.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Data Models](#data-models)
4. [Ride Lifecycle](#ride-lifecycle)
5. [WebSocket Design](#websocket-design)
6. [Driver Location & Matching](#driver-location--matching)
7. [Chat System](#chat-system)
8. [Cancellation Policy](#cancellation-policy)
9. [Rating System](#rating-system)
10. [Service Layer Structure](#service-layer-structure)
11. [API Endpoints](#api-endpoints)
12. [Background Tasks](#background-tasks)
13. [Model Changes Required](#model-changes-required)

---

## Overview

The ride flow follows a **negotiation-based model**: the customer proposes a ride with a suggested price, nearby online drivers can counter-offer with their own price, and the customer picks the best offer. Once accepted, the driver heads to the pickup point, a chat channel opens, and the trip proceeds until completion and rating.

**Payment model:** Cash only (no in-app payment processing for now).

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time communication | **FastAPI WebSocket** | Built-in, full control over logic, no external dependency |
| Driver proximity | **PostGIS ST_DWithin** | Accurate geo-queries, scalable, industry standard |
| Ride request expiry | **Background task (APScheduler)** | Reliable, doesn't depend on client reads, handles edge cases |
| Concurrency on accept | **Minimal concern** | A driver can only have one active offer at a time — they must choose which request to bid on. Race conditions are unlikely but we still use DB-level checks |
| Chat persistence | **Ephemeral** — deleted after trip completion | Chat is a coordination tool, not a record. Clean up on ride completion |
| Cancellation | **Both parties can cancel** | With status tracking and reason logging |
| Payment | **Cash only** | No payment gateway integration for now. Price is agreed and recorded, settled in cash |

---

## Data Models

### Existing Models (already in `app/models/ride.py`)

These models are already defined and cover most of the data layer:

- **RideRequest** — customer's ride request with pickup, destination, suggested price
- **DriverResponse** — driver's counter-offer with their price
- **Ride** — the active/completed trip record
- **RideMessage** — chat messages during a ride
- **RideRating** — post-ride rating and comment

### Existing Enums

```
RideRequestStatus: PENDING, ACCEPTED, EXPIRED, CANCELLED
DriverResponseStatus: PENDING, ACCEPTED, REJECTED, EXPIRED
RideStatus: PENDING, DRIVER_EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED
```

---

## Model Changes Required

### 1. Add location fields to `DriverProfile`

```python
# In app/models/driver.py — DriverProfile
latitude = mapped_column(Float, nullable=True)       # current lat
longitude = mapped_column(Float, nullable=True)      # current lng
last_location_update = mapped_column(DateTime, nullable=True)  # when location was last updated
```

> **PostGIS Note:** For production, consider adding a `geography` column for native PostGIS queries. For MVP, storing lat/lng as floats and using `ST_DWithin` with `ST_MakePoint` works fine since Supabase PostgreSQL supports PostGIS out of the box.

### 2. Add cancellation fields to `Ride`

```python
# In app/models/ride.py — Ride
cancelled_at = mapped_column(DateTime, nullable=True)
cancelled_by = mapped_column(UUID, ForeignKey("users.id"), nullable=True)
cancellation_reason = mapped_column(Text, nullable=True)
```

### 3. Add constraint to `DriverResponse`

Enforce that a driver can only have **one PENDING response at a time** (across all active ride requests):

```python
# Business logic constraint (enforced in service layer):
# A driver cannot submit a new DriverResponse if they already have one with status=PENDING
```

### 4. Enable PostGIS Extension

```sql
-- Migration: enable PostGIS (Supabase has it available, just needs activation)
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## Ride Lifecycle

### State Machine

```
CUSTOMER SIDE                          DRIVER SIDE
─────────────                          ───────────
1. Create Ride Request
   (status: PENDING)
                                       2. Receive request via WebSocket
                                          (nearby + online drivers)

                                       3. Driver sends price offer
                                          (DriverResponse created)
                                          - OR ignores / dismisses

4. Customer sees all offers
   in real-time via WebSocket

5. Customer picks one offer
   → RideRequest: ACCEPTED
   → Chosen DriverResponse: ACCEPTED   6. Driver notified: "Offer accepted"
   → Other DriverResponses: REJECTED      Other drivers: "Request closed"
   → Ride created: DRIVER_EN_ROUTE

   [Chat unlocked]                     [Chat unlocked]

                                       7. Driver arrives at pickup
                                          → clicks "Start Trip"
                                          → Ride: IN_PROGRESS

8. Customer sees trip in progress

                                       9. Driver clicks "Complete Trip"
                                          → Ride: COMPLETED
                                          → completed_at set

10. Customer prompted to rate
    → RideRating created
    → Chat messages deleted

--- CANCELLATION (at any point before COMPLETED) ---

Either party cancels
→ Ride: CANCELLED
→ cancelled_at, cancelled_by,
  cancellation_reason recorded
→ Both parties notified via WebSocket
→ Chat messages deleted
```

### Status Transition Rules

| From | To | Who Can Trigger |
|------|----|-----------------|
| `PENDING` (RideRequest) | `ACCEPTED` | Customer (by picking an offer) |
| `PENDING` (RideRequest) | `CANCELLED` | Customer |
| `PENDING` (RideRequest) | `EXPIRED` | System (background task) |
| `DRIVER_EN_ROUTE` | `IN_PROGRESS` | Driver only |
| `DRIVER_EN_ROUTE` | `CANCELLED` | Customer or Driver |
| `IN_PROGRESS` | `COMPLETED` | Driver only |
| `IN_PROGRESS` | `CANCELLED` | Customer or Driver |

---

## WebSocket Design

### Connection Model

Each user maintains **one WebSocket connection** (not per-ride):

```
ws://host/api/v1/ws/{user_id}?token={jwt_token}
```

- Authenticated via JWT query param on connection
- Connection is validated against the user's session
- Reconnection is handled client-side with exponential backoff

### Connection Manager

A `ConnectionManager` class manages all active connections:

```python
class ConnectionManager:
    """
    Manages WebSocket connections.

    For scale: swap the internal dict for Redis pub/sub
    so multiple server instances can communicate.
    """
    active_connections: dict[str, WebSocket]  # user_id → WebSocket

    async def connect(user_id, websocket)
    async def disconnect(user_id)
    async def send_to_user(user_id, event_type, payload)
    async def broadcast_to_users(user_ids, event_type, payload)
```

### Event Types

| Event | Direction | Recipient | Payload |
|-------|-----------|-----------|---------|
| `new_ride_request` | Server → Drivers | Nearby online drivers | `{ request_id, pickup, destination, suggested_price, distance, customer_name }` |
| `driver_offer` | Server → Customer | Ride request owner | `{ response_id, driver_id, driver_name, driver_rating, vehicle_info, driver_price }` |
| `offer_accepted` | Server → Driver | Selected driver | `{ ride_id, pickup, destination, agreed_price, customer_name, customer_phone }` |
| `request_closed` | Server → Drivers | Rejected/remaining drivers | `{ request_id, reason: "accepted_by_other" }` |
| `ride_status_update` | Server → Both | Customer + Driver | `{ ride_id, status, timestamp }` |
| `new_message` | Server → Other party | The other participant | `{ ride_id, sender_id, message, sent_at }` |
| `ride_cancelled` | Server → Both | Customer + Driver | `{ ride_id, cancelled_by, reason }` |
| `ride_completed` | Server → Customer | Customer | `{ ride_id, final_price, driver_name, prompt_rating: true }` |
| `request_expired` | Server → Customer | Customer | `{ request_id, reason: "expired" }` |

### Message Format

All WebSocket messages follow a consistent JSON structure:

```json
{
  "event": "driver_offer",
  "data": {
    "response_id": "uuid",
    "driver_id": "uuid",
    "driver_name": "John",
    "driver_rating": 4.5,
    "vehicle_info": { "make": "Toyota", "model": "Corolla", "color": "White" },
    "driver_price": 150.00
  },
  "timestamp": "2026-03-05T10:30:00Z"
}
```

---

## Driver Location & Matching

### Location Updates

Drivers update their location periodically while online:

```
PATCH /api/v1/drivers/{driver_id}/location
Body: { "latitude": -26.2041, "longitude": 28.0473 }
```

- Frontend sends location every **30 seconds** while driver is online
- `last_location_update` timestamp is recorded
- Drivers with stale locations (> 5 min) are considered offline for matching

### Finding Nearby Drivers

When a customer creates a ride request, find drivers using PostGIS:

```sql
SELECT dp.* FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_online = true
  AND dp.verification_status = 'APPROVED'
  AND dp.latitude IS NOT NULL
  AND dp.longitude IS NOT NULL
  AND dp.last_location_update > NOW() - INTERVAL '5 minutes'
  AND ST_DWithin(
    ST_MakePoint(dp.longitude, dp.latitude)::geography,
    ST_MakePoint(:pickup_lng, :pickup_lat)::geography,
    :radius_meters  -- e.g., 10000 for 10km
  )
ORDER BY ST_Distance(
    ST_MakePoint(dp.longitude, dp.latitude)::geography,
    ST_MakePoint(:pickup_lng, :pickup_lat)::geography
);
```

### Matching Config

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SEARCH_RADIUS_KM` | 10 | How far to search for drivers |
| `LOCATION_STALE_MINUTES` | 5 | Max age of location update before driver is excluded |
| `LOCATION_UPDATE_INTERVAL_SECONDS` | 30 | How often frontend should send location |

---

## Chat System

### Design

- Chat is **only available** when a `Ride` record exists (status: `DRIVER_EN_ROUTE` or `IN_PROGRESS`)
- Messages flow through the **same WebSocket connection** (event type: `new_message`)
- Messages are persisted in `ride_messages` table during the ride
- A REST endpoint provides message history (in case of reconnection)
- **Messages are deleted when the ride is completed or cancelled** — chat is ephemeral

### Sending a Message

Via REST (which then pushes via WebSocket to the other party):

```
POST /api/v1/rides/{ride_id}/messages
Body: { "message": "I'm at the blue gate" }
```

**Flow:**
1. Validate sender is participant of this ride
2. Validate ride status is `DRIVER_EN_ROUTE` or `IN_PROGRESS`
3. Save to `ride_messages`
4. Push `new_message` event to the other participant via WebSocket

### Message History (for reconnection)

```
GET /api/v1/rides/{ride_id}/messages
```

Returns all messages for the active ride, ordered by `sent_at`.

### Cleanup

On ride completion or cancellation:

```python
# Delete all messages for this ride
db.execute(delete(RideMessage).where(RideMessage.ride_id == ride_id))
```

---

## Cancellation Policy

### Rules

- **Customer** can cancel at any time before `COMPLETED`
- **Driver** can cancel at any time before `COMPLETED`
- Cancellation reason is required
- Both parties are notified via WebSocket

### Cancellation Flow

```
PATCH /api/v1/rides/{ride_id}/cancel
Body: { "reason": "Changed my mind" }
```

**Backend actions:**
1. Validate the user is a participant
2. Validate ride is not already `COMPLETED` or `CANCELLED`
3. Update ride: `status=CANCELLED`, `cancelled_at=now()`, `cancelled_by=user_id`, `cancellation_reason=reason`
4. Delete chat messages
5. Notify the other party via WebSocket (`ride_cancelled` event)
6. Free up the driver (they can receive new requests)

### Future Considerations (not for MVP)

- Cancellation penalties / fees
- Cancellation rate tracking
- Cooldown period after repeated cancellations

---

## Rating System

### Flow

1. After ride status → `COMPLETED`, customer is prompted to rate
2. Rating is optional but encouraged (via push notification reminder)

```
POST /api/v1/rides/{ride_id}/rate
Body: { "rate": 5, "comment": "Great driver, very friendly" }
```

### Rules

- Only the **customer** can rate
- Only after ride is `COMPLETED`
- One rating per ride (enforced by unique constraint on `ride_id`)
- Rate: 1–5 (integer)
- Comment: optional text

### Driver Rating Update

On each new rating, update the driver's average:

```python
# Calculate new average
new_rating = (driver.rating * driver.total_rides + new_rate) / (driver.total_rides + 1)
driver.rating = new_rating
driver.total_rides += 1
```

---

## Service Layer Structure

```
app/services/rides/
├── __init__.py
├── ride_service.py            # Core ride request & lifecycle logic
│   ├── create_ride_request()
│   ├── get_ride_request()
│   ├── get_customer_ride_requests()
│   ├── submit_driver_offer()
│   ├── accept_driver_offer()
│   ├── update_ride_status()     # start trip, complete trip
│   ├── cancel_ride()
│   └── get_ride_details()
│
├── matching_service.py         # Driver discovery & broadcasting
│   ├── find_nearby_drivers()    # PostGIS query
│   ├── broadcast_ride_request() # Push to nearby drivers via WS
│   └── update_driver_location()
│
├── chat_service.py             # Chat message handling
│   ├── send_message()
│   ├── get_messages()
│   └── delete_ride_messages()
│
├── rating_service.py           # Rating logic
│   ├── rate_ride()
│   └── get_ride_rating()
│
├── connection_manager.py       # WebSocket connection tracking
│   ├── connect()
│   ├── disconnect()
│   ├── send_to_user()
│   └── broadcast_to_users()
│
├── router.py                   # REST API endpoints
├── ws_router.py                # WebSocket endpoint
└── schema.py                   # Pydantic request/response schemas
```

---

## API Endpoints

### Ride Request & Negotiation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/rides/request` | Customer | Create a new ride request |
| `GET` | `/api/v1/rides/request/{request_id}` | Customer | Get ride request details with all driver offers |
| `GET` | `/api/v1/rides/requests/active` | Customer | Get customer's active ride requests |
| `POST` | `/api/v1/rides/request/{request_id}/cancel` | Customer | Cancel a ride request |

### Driver Responses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/rides/request/{request_id}/offer` | Driver | Submit a price offer |
| `GET` | `/api/v1/rides/requests/nearby` | Driver | Get available ride requests near driver (REST fallback) |
| `POST` | `/api/v1/rides/request/{request_id}/accept/{response_id}` | Customer | Accept a driver's offer |

### Ride Lifecycle

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/rides/{ride_id}` | Both | Get ride details |
| `PATCH` | `/api/v1/rides/{ride_id}/start` | Driver | Start the trip (status → IN_PROGRESS) |
| `PATCH` | `/api/v1/rides/{ride_id}/complete` | Driver | Complete the trip (status → COMPLETED) |
| `PATCH` | `/api/v1/rides/{ride_id}/cancel` | Both | Cancel the ride |
| `GET` | `/api/v1/rides/history` | Both | Get completed rides history |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/rides/{ride_id}/messages` | Both | Send a message |
| `GET` | `/api/v1/rides/{ride_id}/messages` | Both | Get message history |

### Rating

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/rides/{ride_id}/rate` | Customer | Rate a completed ride |

### Driver Location

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `PATCH` | `/api/v1/drivers/{driver_id}/location` | Driver | Update current location |

### WebSocket

| Endpoint | Auth | Description |
|----------|------|-------------|
| `ws://host/api/v1/ws/{user_id}?token={jwt}` | JWT | Persistent connection for real-time events |

---

## Background Tasks

### Ride Request Expiry

Using **APScheduler** (add `apscheduler` to requirements):

```python
# Runs every 30 seconds
async def expire_stale_ride_requests():
    """
    Find all PENDING ride requests past their expires_at.
    - Set status to EXPIRED
    - Set all PENDING driver responses to EXPIRED
    - Notify customer via WebSocket (request_expired event)
    """
```

### Stale Driver Location Cleanup

```python
# Runs every 60 seconds
async def mark_stale_drivers_offline():
    """
    Drivers whose last_location_update > 5 minutes ago
    are set to is_online = False.
    """
```

### Chat Cleanup

No background task needed — messages are deleted synchronously when a ride is completed or cancelled.

---

## Dependencies to Add

```
# requirements.txt additions
apscheduler          # Background task scheduling
geoalchemy2          # SQLAlchemy PostGIS integration (optional, can use raw SQL)
```

---

## Implementation Order

1. **PostGIS setup** — Enable extension, add location fields to DriverProfile, migration
2. **Driver location endpoint** — `PATCH /drivers/{id}/location`
3. **WebSocket infrastructure** — ConnectionManager + ws endpoint + auth
4. **Ride request creation** — `POST /rides/request` + broadcast to nearby drivers
5. **Driver offer submission** — `POST /rides/request/{id}/offer` + push to customer
6. **Accept offer** — `POST /rides/request/{id}/accept/{response_id}` + create Ride + notify all
7. **Ride status transitions** — start, complete endpoints
8. **Chat** — send message, get history, cleanup on completion
9. **Cancellation** — cancel endpoint for both parties
10. **Rating** — rate endpoint + driver average update
11. **Background tasks** — request expiry, stale location cleanup
12. **Testing** — unit tests for services, integration tests for WebSocket flow
