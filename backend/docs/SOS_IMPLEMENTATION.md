# AlboTax — SOS Feature Implementation

> Both drivers and customers can trigger an SOS alert at any time with a single button press. The system sends an SMS with a live tracking link to up to 3 pre-configured emergency contacts. No app install required for the contacts — the link opens in any browser.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Models](#database-models)
3. [Full Flow — Step by Step](#full-flow--step-by-step)
4. [API Endpoints — Full Reference](#api-endpoints--full-reference)
5. [The Live Tracking Page](#the-live-tracking-page)
6. [SMS Delivery](#sms-delivery)
7. [Background Jobs](#background-jobs)
8. [Environment Variables](#environment-variables)
9. [Frontend Integration Guide](#frontend-integration-guide)
10. [Backend Notes](#backend-notes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AlboTax Backend                       │
│                                                          │
│  emergency_contacts  ──┐                                 │
│  sos_sessions        ──┤── SosService                   │
│                        │     │                           │
│                        │     ├── sms_service (AT)        │
│                        │     └── sos_service             │
│                                                          │
│  Public endpoints (no auth):                            │
│    GET /sos/track/{token}        ← JSON location data   │
│    GET /sos/track/{token}/map    ← HTML tracking page   │
└─────────────────────────────────────────────────────────┘
        │ SMS via Africa's Talking
        ▼
  Emergency contacts' phones
  (receive link: https://domain/api/v1/sos/track/{token}/map)
        │ click link
        ▼
  Browser opens live map, polls every 5 s
```

---

## Database Models

### `emergency_contacts`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID PK | No | |
| `user_id` | UUID → users | No | Owner of this contact |
| `name` | String(100) | No | e.g. "Jean-Pierre" |
| `phone_number` | String(20) | No | E.164 format: `+243812345678` |
| `relationship` | String(50) | No | e.g. "Brother", "Wife", "Friend" |
| `created_at` | DateTime | No | |

**Constraint:** max 3 contacts per user (enforced in service layer).

---

### `sos_sessions`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID PK | No | |
| `user_id` | UUID → users | No | Who triggered SOS |
| `token` | String(32) unique | No | Random hex — used in public tracking URL |
| `is_active` | Boolean | No | `true` while tracking is live |
| `triggered_at` | DateTime | No | When SOS was triggered |
| `expires_at` | DateTime | No | `triggered_at + 24h` |
| `last_latitude` | Float | Yes | Updated by app every 5–10 s |
| `last_longitude` | Float | Yes | Updated by app every 5–10 s |
| `last_location_update` | DateTime | Yes | Timestamp of last location push |
| `cancelled_at` | DateTime | Yes | Set when user cancels or session expires |
| `ride_id` | UUID → rides | Yes | Populated if SOS triggered during a ride |

---

## Full Flow — Step by Step

### Setup (one-time, before an emergency)

```
User opens Settings → Emergency Contacts
  → POST /sos/contacts  { name, phone_number, relationship }
  → Repeat up to 3 times
```

---

### SOS Trigger Flow

```
1. User presses the SOS button
   App collects current GPS coordinates

2. POST /sos/trigger
   { latitude, longitude, ride_id? }
        │
        ├─ Backend creates SosSession
        │    token = random 32-char hex
        │    expires_at = now + 24h
        │
        ├─ Builds tracking URL:
        │    https://domain/api/v1/sos/track/{token}/map
        │
        └─ Sends SMS to all emergency contacts:
             "🚨 URGENT: [Name] has triggered an SOS alert..."
             "[tracking URL]"

3. App receives { session_id, tracking_url, ... }
   App starts location update loop:
     Every 5–10 seconds → PATCH /sos/session/{id}/location { lat, lng }

4. Emergency contacts click the SMS link
   Browser opens the live tracking page
   Page polls GET /sos/track/{token} every 5 seconds
   Map marker moves in real time

5. User is safe → presses "I'm Safe / Cancel SOS"
   PATCH /sos/session/{id}/cancel
        │
        ├─ Session marked is_active = false
        │
        └─ Sends SMS to contacts:
             "✅ [Name] is now safe..."

6. If user never cancels:
   Background job checks every 60s
   Sessions past expires_at are auto-deactivated
```

---

## API Endpoints — Full Reference

Base URL: `/api/v1/sos`

All endpoints **except** `/track/{token}` and `/track/{token}/map` require `Authorization: Bearer <jwt>`.

---

### Emergency Contacts

#### `GET /sos/contacts`
List the current user's emergency contacts.

**Response 200**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Jean-Pierre",
      "phone_number": "+243812345678",
      "relationship": "Brother",
      "created_at": "2026-03-30T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### `POST /sos/contacts`
Add an emergency contact. Returns `400` if already at 3 contacts.

**Request**
```json
{
  "name": "Marie",
  "phone_number": "+243971234567",
  "relationship": "Wife"
}
```

**Response 201** — `EmergencyContactResponse`

---

#### `PUT /sos/contacts/{contact_id}`
Update an existing contact. All fields optional.

```json
{
  "name": "Marie Kabila",
  "phone_number": "+243971234567",
  "relationship": "Wife"
}
```

**Response 200** — `EmergencyContactResponse`

---

#### `DELETE /sos/contacts/{contact_id}`
**Response 204 No Content**

---

### SOS Session

#### `POST /sos/trigger`
Trigger SOS. Sends SMS to all contacts. If an active session already exists, updates its location and returns it (idempotent — safe to retry).

**Request**
```json
{
  "latitude": -4.3217,
  "longitude": 15.3222,
  "ride_id": "uuid-optional"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "token": "a3f9b2c1d4e5f678...",
  "is_active": true,
  "triggered_at": "2026-03-30T11:00:00Z",
  "expires_at": "2026-03-31T11:00:00Z",
  "last_latitude": -4.3217,
  "last_longitude": 15.3222,
  "last_location_update": "2026-03-30T11:00:00Z",
  "cancelled_at": null,
  "ride_id": null,
  "tracking_url": "https://domain/api/v1/sos/track/a3f9b2c1d4e5f678.../map"
}
```

---

#### `PATCH /sos/session/{session_id}/location`
Push updated GPS coordinates. App should call this every **5–10 seconds** while SOS is active.

**Request**
```json
{
  "latitude": -4.3220,
  "longitude": 15.3230
}
```

**Response 200** — `SosSessionResponse`

**Errors**
| Code | Meaning |
|---|---|
| 404 | Session not found |
| 400 | Session is no longer active |

---

#### `PATCH /sos/session/{session_id}/cancel`
Cancel the SOS alert. Marks session inactive and sends a "user is safe" SMS to all contacts.

**Response 200** — `SosSessionResponse` (is_active = false)

---

#### `GET /sos/session/active`
Get the current user's active SOS session. Returns `null` if none.

**Response 200** — `SosSessionResponse | null`

---

### Public Endpoints (no auth)

#### `GET /sos/track/{token}`
JSON data used by the tracking page to poll for location updates.

**Response 200**
```json
{
  "user_name": "Alain Mutombo",
  "is_active": true,
  "triggered_at": "2026-03-30T11:00:00Z",
  "last_latitude": -4.3220,
  "last_longitude": 15.3230,
  "last_location_update": "2026-03-30T11:00:05Z",
  "expires_at": "2026-03-31T11:00:00Z"
}
```

> **Note:** Only `user_name` is exposed — no phone number, no ride details, no user ID.

---

#### `GET /sos/track/{token}/map`
Returns the HTML live tracking page. This is the URL sent in the SOS SMS.
Works in **any browser** — no app install needed.
Hidden from Swagger docs.

---

## The Live Tracking Page

Served at `GET /sos/track/{token}/map`.

**What it does:**
- Shows the person's name and alert status in a red header
- Displays a Google Maps map with a red pin at their last known location
- Polls `GET /sos/track/{token}` every **5 seconds** and moves the pin
- Shows "triggered at" and "last update" timestamps
- When `is_active = false` (cancelled or expired): header turns green, shows "Person is safe ✓"
- Fully responsive — works on mobile and desktop

**Requirements:**
- `GOOGLE_MAPS_API_KEY` must be set in `.env`
- The API key must have the **Maps JavaScript API** enabled in Google Cloud Console
- Restrict the key to your domain in production

---

## SMS Delivery

Uses **Twilio** for SMS delivery.

**SMS sent on trigger:**
```
🚨 URGENT: Alain Mutombo has triggered an SOS alert and may need help!
Track their live location here:
https://yourdomain.com/api/v1/sos/track/a3f9b2.../map
This link is active for 24 hours.
```

**SMS sent on cancel:**
```
✅ Alain Mutombo is now safe and has cancelled their SOS alert.
Thank you for your concern.
```

**Sandbox testing:**
- Use a [Twilio trial account](https://www.twilio.com/try-twilio) — SMS sent only to verified numbers
- Upgrade to a paid account for unrestricted delivery to any number

---

## Background Jobs

A scheduler job runs every **60 seconds** to expire stale SOS sessions:

```python
# app/main.py
scheduler.add_job(expire_stale_sos_sessions, "interval", seconds=60, id="expire_sos")
```

Any session where `expires_at <= now` and `is_active = true` is automatically deactivated. This ensures tracking links expire after 24 hours even if the user never cancels.

---

## Environment Variables

```env
# Twilio — SMS
TWILIO_ACCOUNT_SID=ACyour-account-sid-here
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_FROM_NUMBER=+12345678900           # your Twilio sender number (E.164)

# Google Maps — Live tracking page
GOOGLE_MAPS_API_KEY=your-google-maps-js-api-key

# SOS
SOS_SESSION_EXPIRY_HOURS=24
APP_BASE_URL=https://yourdomain.com       # used to build the tracking URL in SMS
```

---

## Frontend Integration Guide

### Setup screen — Emergency Contacts

```
Show a list of emergency contacts (GET /sos/contacts)
Each card shows: name, phone, relationship + Edit/Delete buttons

"Add Contact" button (disabled if total == 3):
  → Form: name, phone (E.164), relationship
  → POST /sos/contacts

Edit → PUT /sos/contacts/{id}
Delete → DELETE /sos/contacts/{id}
```

---

### SOS Button — placement recommendations

- **During a ride:** Floating button (red, shield icon) always visible on the ride screen
- **Outside a ride:** In the main menu or profile screen
- **Optional:** Shake-to-activate (Flutter `shake` package) as a secondary trigger

---

### SOS Trigger flow

```dart
// 1. Get GPS position
final position = await Geolocator.getCurrentPosition();

// 2. Trigger SOS
final response = await api.post('/sos/trigger', {
  'latitude': position.latitude,
  'longitude': position.longitude,
  'ride_id': currentRideId,   // null if not in a ride
});

final sessionId = response['id'];

// 3. Show confirmation UI
showSosActiveScreen(trackingUrl: response['tracking_url']);

// 4. Start location update loop
Timer.periodic(Duration(seconds: 8), (timer) async {
  if (!sosActive) { timer.cancel(); return; }
  final pos = await Geolocator.getCurrentPosition();
  await api.patch('/sos/session/$sessionId/location', {
    'latitude': pos.latitude,
    'longitude': pos.longitude,
  });
});
```

**Important Flutter permissions needed:**
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<!-- Background location needed so SOS keeps updating even when app is minimized -->
```

---

### SOS Active screen

While SOS is active, show:
- Red "SOS ACTIVE" banner at the top
- "I'm Safe — Cancel SOS" button (prominent, green)
- Tracking URL (copyable / shareable)
- Location update indicator ("Sharing location — last updated 3s ago")

On "Cancel SOS":
```dart
await api.patch('/sos/session/$sessionId/cancel');
// Stop location timer
// Show "You're safe — SOS cancelled" confirmation
```

---

### On app startup / resume

Check if there's an active session that was started before the app was closed:

```dart
final session = await api.get('/sos/session/active');
if (session != null) {
  // Resume location update loop using session['id']
  resumeSosLoop(session['id']);
}
```

---

## Backend Notes

### File structure

```
app/
├── models/
│   └── sos.py                        ← EmergencyContact + SosSession
├── services/
│   └── sos/
│       ├── sms_service.py            ← Africa's Talking wrapper
│       ├── sos_service.py            ← Business logic
│       ├── schemas.py                ← Pydantic models
│       └── router.py                 ← FastAPI routes + HTML tracking page
└── main.py                           ← Router registered + expiry job added
```

### Migration

Run: `alembic upgrade head`

New migration `c3d4e5f6a7b8`:
- Creates `emergency_contacts` table
- Creates `sos_sessions` table
- Adds `sos` value to `notificationtype` PostgreSQL enum

### Full migration chain (corrected)

```
initial → rename_client → driver_onboarding → user_full_name →
rides_location → merge_branches → email_verification →
arrived_withdrawn (cec6fc9ed599) →
wallet_tables (a1b2c3d4e5f6) →
wallet_mpesa (b2c3d4e5f6a7) →
sos_tables (c3d4e5f6a7b8)  ← current HEAD
```

### Token security

The SOS `token` is generated with `secrets.token_hex(16)` — 128 bits of randomness, cryptographically secure. The tracking URL is public but unguessable.

### SMS failures

SMS sending failures are caught and logged but **never bubble up to the user**. The SOS session is still created and the API still returns success — a failed SMS should never block an SOS trigger.
