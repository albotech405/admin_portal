# Backend Prompt: Admin Live Location Tracking for AlboTaxi

Implement the backend support required for the admin portal to provide a WhatsApp-style live location experience for rides and SOS incidents.

The admin portal needs reliable, time-bounded, read-only live location monitoring for trip operations and safety workflows. The experience must make it obvious when a location is truly live, when it is stale, when it has expired, and when sharing was manually stopped.

## Objective

Support authenticated admin users with permission-scoped access to:

- active ride live-location sessions
- active SOS live-location sessions
- recent ended live-location sessions for search/history
- last-known location recovery on reconnect
- real-time updates without page reload
- audit logging of every admin live-location view

Admins are observers only. The backend must never allow the admin portal to write, spoof, override, or publish participant coordinates.

## Product Behavior to Support

The backend contract must support the following user experience:

- ride live-location sharing is session-based, not an unlimited background stream
- each session has a clear lifecycle with start, freshness, expiry, and stop semantics
- driver and customer live positions can both be shown when available
- a session may expose only one participant if the other side has not shared location yet
- stale streams must be distinguishable from active streams
- expired or manually stopped shares must immediately lose live status
- last-known position must remain available after expiry/end when retention rules allow it
- SOS-linked sessions must be prioritized over ordinary ride tracking

## Required Session States

Use only these states for admin-facing live-location sessions:

- `active`
- `stale`
- `ended`
- `manually_stopped`
- `expired`

Do not invent additional frontend-only states. The backend should be authoritative for session lifecycle when possible.

## Permissions

Implement admin-authorized read access with explicit role checks.

Required default policy:

- `super_admin`: full access to ride and SOS live-location sessions
- `operations`: full access to ride and SOS live-location sessions
- `support`: optional scoped access only if product/security approves case-linked access
- `finance`: no live coordinate access by default
- `readonly` or KYC-only roles: no live coordinate access by default

If support access is implemented, it must be scoped to tickets, rides, or SOS incidents the agent is actively assigned to or handling.

## Audit Requirements

Every admin view of a live-location surface must be audit-logged.

Required audit fields:

- `admin_id`
- `admin_role`
- `action`: `live_location_view`
- `entity_viewed`
- `session_id`
- `session_type`: `trip_tracking` or `sos_tracking`
- `timestamp`
- optional `ride_id`
- optional `sos_session_id`
- optional `source_surface`: `dashboard`, `ride_detail`, `sos_detail`, `search_history`

The backend should expose a write endpoint the admin portal can call, or automatically write this audit entry when read endpoints are invoked.

## Required Endpoints

Implement admin-read endpoints under a consistent namespace such as `/api/v1/live-location/admin`.

### 1. List active sessions

`GET /api/v1/live-location/admin/sessions`

Supports query params:

- `status`: `active | stale | ended | manually_stopped | expired`
- `type`: `ride | sos`
- `search`
- `limit`
- `offset`

Expected behavior:

- returns active and stale sessions by default
- supports filtering for dashboard layers and stale-only views
- returns enough metadata to render the operations map and side panel without extra calls for every row

### 2. Get one session by ID

`GET /api/v1/live-location/admin/sessions/{session_id}`

Expected behavior:

- returns one fully hydrated session
- includes participant metadata, timestamps, route anchors, and last-known positions
- supports both ride sessions and SOS sessions using a normalized response

### 3. Get ride live-location view

`GET /api/v1/live-location/admin/rides/{ride_id}`

Expected behavior:

- resolves the ride-linked live-location session if one exists
- returns a normalized session payload
- includes pickup, destination, and stops when available

### 4. Get SOS live-location view

`GET /api/v1/live-location/admin/sos/{sos_session_id}`

Expected behavior:

- resolves the SOS-linked live-location session if one exists
- returns a normalized session payload
- includes session timing, stop metadata, and last-known point after end/expiry when allowed

### 5. List recent ended sessions

`GET /api/v1/live-location/admin/sessions/history`

Supports query params:

- `type`
- `status`
- `search`
- `date_from`
- `date_to`
- `city`
- `zone`
- `limit`
- `offset`

Expected behavior:

- returns recent ended, expired, or manually stopped sessions
- powers admin search/history without requiring full route replay

### 6. Stream updates

Provide one of the following:

- `GET /api/v1/live-location/admin/stream` via SSE
- `WS /api/v1/live-location/admin/ws` via WebSocket

The stream must push:

- session starts
- participant coordinate updates
- status changes to `stale`, `expired`, `ended`, `manually_stopped`
- session deletion/removal from active layer when no longer active

If both SSE and WebSocket are available, the admin portal can prefer WebSocket and fall back to SSE.

### 7. Audit endpoint

Either expose:

`POST /api/v1/admin/audit/log`

or a dedicated endpoint such as:

`POST /api/v1/live-location/admin/audit-view`

Request body should allow:

```json
{
  "action": "live_location_view",
  "entity_viewed": "ride:123" ,
  "session_id": "session_abc",
  "session_type": "trip_tracking",
  "source_surface": "ride_detail"
}
```

## Required Session Payload

Each live-location session returned by the backend should follow a normalized shape like this:

```json
{
  "id": "session_abc123",
  "type": "ride",
  "source": "trip_tracking",
  "status": "active",
  "is_live": true,
  "started_at": "2026-06-08T12:00:00Z",
  "expires_at": "2026-06-08T12:45:00Z",
  "ended_at": null,
  "stopped_at": null,
  "stop_reason": null,
  "stale_after_seconds": 120,
  "ride_id": "ride_123",
  "sos_session_id": null,
  "customer_id": "user_1",
  "customer_name": "Jane Doe",
  "customer_phone": "+243...",
  "driver_id": "driver_9",
  "driver_name": "Patrick Ilunga",
  "driver_phone": "+243...",
  "pickup": {
    "name": "Gombe",
    "latitude": -4.317,
    "longitude": 15.298
  },
  "destination": {
    "name": "Ngaliema",
    "latitude": -4.362,
    "longitude": 15.235
  },
  "stops": [],
  "route_path": [],
  "last_location_timestamp": "2026-06-08T12:08:04Z",
  "participants": {
    "driver": {
      "participant_type": "driver",
      "source": "trip_tracking",
      "status": "active",
      "is_live": true,
      "started_at": "2026-06-08T12:00:00Z",
      "expires_at": "2026-06-08T12:45:00Z",
      "stopped_at": null,
      "stop_reason": null,
      "last_updated_at": "2026-06-08T12:08:04Z",
      "point": {
        "latitude": -4.331,
        "longitude": 15.274,
        "heading": 143,
        "speed": 11.2,
        "accuracy": 8,
        "timestamp": "2026-06-08T12:08:04Z"
      }
    },
    "customer": {
      "participant_type": "customer",
      "source": "manual_live_share",
      "status": "active",
      "is_live": true,
      "started_at": "2026-06-08T12:01:00Z",
      "expires_at": "2026-06-08T12:31:00Z",
      "stopped_at": null,
      "stop_reason": null,
      "last_updated_at": "2026-06-08T12:08:00Z",
      "point": {
        "latitude": -4.329,
        "longitude": 15.279,
        "heading": null,
        "speed": null,
        "accuracy": 14,
        "timestamp": "2026-06-08T12:08:00Z"
      }
    }
  }
}
```

## Field Requirements

These fields are required or strongly recommended for the admin UI:

- `id`
- `type`: `ride | sos`
- `source`: `trip_tracking | manual_live_share | sos`
- `status`: `active | stale | ended | manually_stopped | expired`
- `is_live`
- `started_at`
- `expires_at`
- `ended_at`
- `stopped_at`
- `stop_reason`
- `stale_after_seconds`
- `ride_id` nullable
- `sos_session_id` nullable
- `pickup` nullable
- `destination` nullable
- `stops` optional
- `route_path` optional
- `last_location_timestamp`
- `participants.driver`
- `participants.customer`

For each participant location object:

- `participant_type`
- `source`
- `status`
- `is_live`
- `started_at`
- `expires_at`
- `stopped_at`
- `stop_reason`
- `last_updated_at`
- `point.latitude`
- `point.longitude`
- `point.heading` nullable
- `point.speed` nullable
- `point.accuracy` nullable
- `point.timestamp`

## Stale and Expiry Rules

The backend should provide enough metadata for the UI to compute freshness correctly, but it should also be capable of returning already-derived status when possible.

Rules:

- if current time exceeds `expires_at`, status becomes `expired`
- if sharing was manually terminated, status becomes `manually_stopped`
- if a terminal stop occurred for another reason, status becomes `ended`
- if no fresh update arrives within `stale_after_seconds`, status becomes `stale`
- if updates are within freshness window and sharing is still valid, status is `active`

The backend must never report `is_live = true` for `stale`, `expired`, `ended`, or `manually_stopped` sessions.

## Stream Event Contract

If WebSocket or SSE is implemented, emit normalized events such as:

```json
{
  "event": "session_updated",
  "session": {
    "id": "session_abc123",
    "type": "ride",
    "status": "active",
    "participants": {
      "driver": {
        "last_updated_at": "2026-06-08T12:08:04Z",
        "point": {
          "latitude": -4.331,
          "longitude": 15.274,
          "heading": 143,
          "speed": 11.2,
          "accuracy": 8,
          "timestamp": "2026-06-08T12:08:04Z"
        }
      }
    }
  }
}
```

Other useful events:

- `session_started`
- `session_updated`
- `session_status_changed`
- `session_ended`
- `session_removed`

## Search Requirements

Search support must work across:

- `trip_id`
- `ride_id`
- `customer_name`
- `customer_phone`
- `driver_name`
- `driver_phone`
- `sos_session_id`
- `session_id`

Search should be available on both active sessions and recent history.

## History Requirements

Recent ended sessions should expose enough data for support and audit review without full breadcrumb replay.

Required history fields:

- `session_id`
- `type`
- `participants`
- `linked ride or sos id`
- `started_at`
- `ended_at`
- `expires_at`
- `final status`
- `last location timestamp`
- `stop_reason`
- `last known city/zone` when derivable

If breadcrumb replay already exists, it can be exposed later, but v1 should not block on that.

## Privacy and Retention

Required privacy controls:

- no admin endpoint may accept location writes
- no admin endpoint may expose raw coordinate export in CSV for v1
- do not retain full breadcrumb history in admin responses beyond approved retention policy
- last-known point after session end should respect retention rules and permission scope
- session visibility must be permission-checked before data is returned

## Failure Handling

The admin portal will degrade gracefully if some data is unavailable, but the backend should aim to return explicit signals instead of silent omission.

Please support these cases explicitly:

- driver live location available but customer location absent
- customer live location available through SOS while driver is absent
- share exists but no first fix has arrived yet
- share expired but last-known point remains available
- stream disconnected or permission revoked mid-session

Recommended fields:

- `waiting_for_first_update`
- `stream_error_code`
- `end_reason`
- `permission_revoked_at`

## Acceptance Criteria

Backend work is complete when:

- admin can fetch active ride and SOS live-location sessions through authenticated read endpoints
- admin can fetch one session by session ID, ride ID, or SOS session ID
- admin can receive near-real-time updates through WebSocket or SSE
- backend returns authoritative status for `active`, `stale`, `ended`, `manually_stopped`, and `expired`
- every admin live-location view is audit-logged
- finance and KYC-only roles cannot access live coordinates by default
- last-known location is available after end/expiry when retention policy permits
- sessions become non-live immediately when revoked, stopped, or expired

## Implementation Notes for Backend Team

- favor a normalized session contract across ride and SOS tracking to keep the admin UI simple and reliable
- if existing mobile tracking tables already exist, wrap them behind admin-safe read endpoints rather than leaking internal schema directly
- include `stale_after_seconds` in responses so the UI and backend remain aligned on freshness semantics
- if route polyline or breadcrumbs are not ready, return `route_path: []` and keep the rest of the session usable
- if customer live sharing is opt-in and absent, omit the participant point and return clear timestamps/status instead of fake coordinates

## Requested Response From Backend Team

Please return:

- the exact endpoints implemented
- the auth/permission rules enforced per endpoint
- the final JSON schema for session list, session detail, and stream events
- how stale detection is computed
- how expiry and manual stop are represented
- how audit logging is handled
- any missing dependencies from mobile or tracking infrastructure# Backend Prompt: Admin Live Location for Trips and SOS

Use this prompt with the backend team to implement the APIs, stream contract, permissions, and audit logging needed for the admin portal's live-location experience.

## Goal

Implement backend support for admin-side live location tracking that behaves like WhatsApp Live Location, adapted for AlboTaxi trip operations and safety workflows.

Admins must be able to observe live trip and SOS location sessions in near real time, with explicit session boundaries, freshness indicators, expiry, and audit logging.

This is read-only for admins. Admins must never be able to modify, inject, or spoof location data.

## Product Behavior the Backend Must Support

The admin portal needs live-location sessions to behave like time-bounded shares, not generic background telemetry.

Each session must support:

- a clear start time
- an expiry time when applicable
- an explicit live/not-live status
- participant-specific last update timestamps
- manual stop and automatic end
- stale detection when updates stop arriving
- last known point retained after end/expiry for operational review

The backend must support:

- active ride tracking
- active SOS tracking
- recent ended session history
- both driver and customer participant streams when available
- driver-only or customer-only degraded cases
- admin audit logging for every live-location view

## Required Session States

Use only these states in the API contract:

- `active`
- `stale`
- `ended`
- `manually_stopped`
- `expired`

Do not invent extra backend states unless they are mapped cleanly to one of the states above.

## Required Session Types and Sources

Session type:

- `ride`
- `sos`

Location source:

- `trip_tracking`
- `manual_live_share`
- `sos`

Participant type:

- `driver`
- `customer`

## Required Admin Permissions

Implement server-side permission checks for live-location endpoints and streams.

Minimum rules:

- `super_admin` can view all ride and SOS live-location sessions
- `operations` can view all ride and SOS live-location sessions
- `support` should only be allowed if product/security explicitly approves scoped access; if not approved, deny by default
- `finance` must not be allowed by default
- `readonly` must not be allowed by default

The backend must enforce these rules even if the frontend hides UI.

## Audit Logging Requirements

Every admin view/open of a live-location surface must create an audit log entry.

Required audit fields:

- `admin_id`
- `admin_role`
- `action` = `live_location_view`
- `entity_viewed`
- `session_type` = `trip_tracking` or `sos_tracking`
- `session_id`
- `timestamp`
- optional metadata such as `ride_id`, `sos_session_id`, `source`, `participants_present`

Required write capability:

- `POST /api/v1/admin/audit/log`

Example request body:

```json
{
  "action": "live_location_view",
  "target_id": "ride:abc123",
  "target_table": "trip_tracking",
  "metadata": {
    "entity_viewed": "ride:abc123",
    "session_type": "trip_tracking",
    "role": "operations",
    "ride_id": "abc123"
  }
}
```

## Required REST Endpoints

Please implement the following admin-authorized read endpoints.

### 1. List active live sessions

`GET /api/v1/live-location/admin/sessions`

Query params:

- `status` optional: `active|stale|ended|manually_stopped|expired`
- `type` optional: `ride|sos`
- `search` optional

Behavior:

- returns active and stale sessions by default
- supports filtering by session type and status
- supports searching by trip ID, ride/request ID, customer name/phone, driver name/phone, and SOS session ID

### 2. List recent session history

`GET /api/v1/live-location/admin/sessions/history`

Query params:

- `type` optional: `ride|sos`
- `search` optional
- `status` optional: `ended|manually_stopped|expired|stale`
- `date_from` optional ISO string
- `date_to` optional ISO string
- `limit` optional
- `offset` optional

Behavior:

- returns recent closed sessions for audit/support use
- includes last known timestamps and stop reasons
- does not need full breadcrumb replay in v1

### 3. Get one session by global session ID

`GET /api/v1/live-location/admin/sessions/{session_id}`

Behavior:

- returns the current last-known state for one live-location session
- includes participant location payloads and session metadata

### 4. Get live-location state for a ride

`GET /api/v1/live-location/admin/rides/{ride_id}`

Behavior:

- resolves the current or most recent ride live-location session
- includes pickup, destination, and stops when available
- returns both driver and customer positions if available

### 5. Get live-location state for an SOS session

`GET /api/v1/live-location/admin/sos/{sos_session_id}`

Behavior:

- returns the current or most recent SOS-linked live-location session
- prioritizes the SOS context over generic ride tracking

## Required Streaming Contract

The admin portal should not rely only on polling. Please provide a real-time admin stream.

Either of the following is acceptable:

- WebSocket
- Server-Sent Events

Preferred paths:

- `GET /api/v1/live-location/admin/stream` for SSE
- or `WS /api/v1/live-location/admin/stream`

Required behavior:

- stream updates for active sessions without page reload
- emit participant position updates
- emit session status transitions immediately
- emit expiry/manual stop immediately
- allow reconnect and return last-known state on reconnect
- support filtering by `type=ride|sos` when practical

Required event categories:

- `session_snapshot`
- `session_started`
- `location_updated`
- `session_stale`
- `session_resumed`
- `session_expired`
- `session_manually_stopped`
- `session_ended`

## Required Response Contract

The admin portal expects a normalized session payload shaped like this.

```json
{
  "id": "ride:abc123",
  "type": "ride",
  "status": "active",
  "source": "trip_tracking",
  "started_at": "2026-06-08T10:10:00Z",
  "expires_at": "2026-06-08T11:10:00Z",
  "ended_at": null,
  "stopped_at": null,
  "stop_reason": null,
  "stale_after_seconds": 120,
  "ride_id": "abc123",
  "sos_session_id": null,
  "customer_id": "cust_1",
  "customer_name": "Jane Doe",
  "customer_phone": "+243...",
  "driver_id": "drv_1",
  "driver_name": "John Driver",
  "driver_phone": "+243...",
  "pickup": {
    "name": "Gombe",
    "latitude": -4.3201,
    "longitude": 15.2988
  },
  "destination": {
    "name": "Ngaliema",
    "latitude": -4.3650,
    "longitude": 15.2500
  },
  "stops": [
    {
      "name": "Stop 1",
      "latitude": -4.3400,
      "longitude": 15.2800
    }
  ],
  "route_path": [
    {
      "latitude": -4.3201,
      "longitude": 15.2988
    }
  ],
  "last_location_timestamp": "2026-06-08T10:13:40Z",
  "participants": {
    "driver": {
      "participant_type": "driver",
      "name": "John Driver",
      "phone": "+243...",
      "is_live": true,
      "status": "active",
      "source": "trip_tracking",
      "started_at": "2026-06-08T10:10:00Z",
      "expires_at": "2026-06-08T11:10:00Z",
      "stopped_at": null,
      "stop_reason": null,
      "last_updated_at": "2026-06-08T10:13:40Z",
      "point": {
        "latitude": -4.3330,
        "longitude": 15.2870,
        "heading": 180,
        "speed": 12.4,
        "accuracy": 8.5,
        "timestamp": "2026-06-08T10:13:40Z"
      }
    },
    "customer": {
      "participant_type": "customer",
      "name": "Jane Doe",
      "phone": "+243...",
      "is_live": true,
      "status": "active",
      "source": "manual_live_share",
      "started_at": "2026-06-08T10:11:00Z",
      "expires_at": "2026-06-08T10:41:00Z",
      "stopped_at": null,
      "stop_reason": null,
      "last_updated_at": "2026-06-08T10:13:35Z",
      "point": {
        "latitude": -4.3340,
        "longitude": 15.2865,
        "heading": null,
        "speed": 0,
        "accuracy": 12,
        "timestamp": "2026-06-08T10:13:35Z"
      }
    }
  }
}
```

## Minimum Required Fields

At minimum, each session payload must include:

- `id`
- `type`
- `status`
- `source`
- `started_at`
- `expires_at`
- `ended_at`
- `stopped_at`
- `stop_reason`
- `stale_after_seconds`
- `ride_id` nullable
- `sos_session_id` nullable
- `last_location_timestamp`
- `participants.driver` optional
- `participants.customer` optional

Each participant payload must support:

- `participant_type`
- `is_live`
- `status`
- `source`
- `last_updated_at`
- `point.latitude`
- `point.longitude`
- `point.timestamp`
- `point.heading` nullable
- `point.speed` nullable
- `point.accuracy` nullable

## Freshness and Staleness Rules

The backend must be the source of truth for freshness.

Required behavior:

- expose `stale_after_seconds` per session
- mark session or participant `stale` when no update is received after the threshold
- if a session is expired or revoked, stop reporting it as live immediately
- return the last known point even when stale/ended/expired
- do not report `is_live = true` for expired, stopped, or stale sessions

Recommended logic:

- if `now - last_updated_at <= stale_after_seconds`, status may remain `active`
- if `now - last_updated_at > stale_after_seconds`, status becomes `stale`
- if `stopped_at` is set by user action, status becomes `manually_stopped`
- if `expires_at < now` and no explicit end already exists, status becomes `expired`
- if trip/SOS resolution lifecycle ends the session, status becomes `ended`

## Ride-Specific Requirements

For active rides:

- provide driver live location whenever driver tracking exists
- provide customer live location when customer app is sharing it
- include pickup and destination coordinates
- include stops when present
- expose ride/trip identifiers needed by operations UI
- surface whether the share is automatic trip tracking or a user-initiated live share

## SOS-Specific Requirements

For SOS sessions:

- provide a dedicated SOS-linked session view even if it references an underlying ride
- prioritize SOS metadata and lifecycle over generic ride tracking
- expose start time, expiry time, stop state, and stop reason
- keep the last known location visible after expiry or stop
- expose whether sharing was manually stopped

## Search Requirements

The backend search must support:

- trip ID
- ride/request ID
- customer name
- customer phone
- driver name
- driver phone
- SOS session ID

The backend may implement this either directly in live-session endpoints or via indexed search behind the same endpoints.

## History Requirements

For closed/recent sessions, return lightweight audit/support history rows with:

- session ID
- type
- participants
- linked ride or SOS entity
- started at
- ended at
- expiry time
- last location timestamp
- final status
- stop reason
- optional final city/zone if derivable cheaply

Do not build full route replay in v1 unless retention and backend storage already support it.

## Operational Alerts the Backend Should Support

The admin portal needs reliable signals for:

- SOS live-location session started
- ride live-location session became stale
- SOS live-location session became stale
- session ended unexpectedly because of disconnect, permission loss, or stream failure

If there is already an admin notification/event feed, please publish these state changes there as well.

## Security and Privacy Requirements

- all endpoints must be admin-authorized read-only endpoints
- do not expose these payloads to normal user tokens
- deny finance and readonly roles by default
- do not allow CSV export of raw coordinate streams in v1
- do not retain infinite breadcrumb history unless retention policy explicitly allows it
- log all access to live-location data

## Frontend Compatibility Notes

The admin portal is being structured to consume these endpoints first:

- `GET /api/v1/live-location/admin/sessions`
- `GET /api/v1/live-location/admin/sessions/history`
- `GET /api/v1/live-location/admin/sessions/{session_id}`
- `GET /api/v1/live-location/admin/rides/{ride_id}`
- `GET /api/v1/live-location/admin/sos/{sos_session_id}`
- `POST /api/v1/admin/audit/log`

The frontend can degrade gracefully with polling and partial data, but full delivery requires the normalized session contract above.

## Acceptance Criteria

- admin can list active ride and SOS live-location sessions without manual refresh
- admin can open a ride and see driver and customer positions when available
- admin can open an SOS session and monitor its live location with higher priority styling
- admin can distinguish `active`, `stale`, `ended`, `manually_stopped`, and `expired`
- admin can search sessions by trip, user, phone, or SOS identifiers
- every live-location view is audit logged
- unauthorized roles are denied server-side
- stale or expired coordinates are never presented as still live

## Expected Response From Backend Team

Please return:

- exact endpoints implemented
- request and response schemas
- WebSocket or SSE contract
- permission rules enforced per role
- audit-log write behavior
- stale/expiry logic used by the server
- any blockers or missing mobile-app data needed to support customer or driver live sharing
