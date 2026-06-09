# Backend Prompt: Fix Admin Live Location Access

## Context
The admin portal frontend now has a graceful fallback for live-location failures, but the backend is still blocking the intended admin live-location flow.

Frontend workspace:
- `/Users/kagiso/Documents/Projects/admin_portal/admin_portal`

Observed runtime backend issues from the browser at `http://localhost:3000/safety`:
1. `GET /api/v1/live-location/admin/sos/:sosSessionId` is blocked by CORS when called from the local admin frontend.
2. Admin login audit recording returns `500` with: `Could not find the 'admin_id' column of 'admin_sessions' in the schema cache`.

Example failing request:
- `https://admin-portal-backend-mgid.onrender.com/api/v1/live-location/admin/sos/308b680d-79b8-4ca4-9330-32e49693c345`

## Required backend fixes

### 1. Fix CORS for admin live-location endpoints
Ensure the backend allows the admin frontend origin to call all admin live-location endpoints, including authenticated requests and preflight requests.

Required coverage:
- `GET /api/v1/live-location/admin/sessions`
- `GET /api/v1/live-location/admin/sessions/history`
- `GET /api/v1/live-location/admin/sessions/:sessionId`
- `GET /api/v1/live-location/admin/rides/:rideId`
- `GET /api/v1/live-location/admin/sos/:sosSessionId`

Acceptance criteria:
- Responses include `Access-Control-Allow-Origin` for the admin frontend origin.
- `OPTIONS` preflight succeeds for these routes.
- Auth headers used by the admin portal are allowed.
- The frontend can poll these endpoints from `http://localhost:3000` without browser CORS failures.

### 2. Return stable live-location payloads for SOS tracking
For `GET /api/v1/live-location/admin/sos/:sosSessionId`, return a normalized admin payload with:
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
- `ride_id`
- `sos_session_id`
- `customer_id`
- `customer_name`
- `customer_phone`
- `driver_id`
- `driver_name`
- `driver_phone`
- `last_updated_at` or role-specific timestamps
- `participants.customer`
- `participants.driver`

Each participant should include when available:
- `participant_type`
- `name`
- `phone`
- `status`
- `is_live`
- `source`
- `started_at`
- `expires_at`
- `stopped_at`
- `stop_reason`
- `last_updated_at`
- `point.latitude`
- `point.longitude`
- `point.heading`
- `point.speed`
- `point.accuracy`
- `point.timestamp`

Notes:
- Coordinates may be emitted as numbers or numeric strings, but they must always be present when the SOS record has usable location data.
- If only customer coordinates exist, still return a valid customer participant object.
- If only driver coordinates exist, still return a valid driver participant object.

### 3. Fix admin session audit insert path
The frontend is hitting an auth-side backend error during admin session logging:
- `Could not find the 'admin_id' column of 'admin_sessions' in the schema cache`

Required action:
- Align the backend write path with the actual `admin_sessions` table schema.
- If `admin_id` is the intended column, add/fix the migration and refresh the schema cache.
- If another column should be used, update the backend code accordingly.

Acceptance criteria:
- Admin login/session recording no longer returns `500`.
- The browser console no longer shows the schema-cache error during sign-in or refresh.

### 4. Send admin alert notifications for every SOS / emergency alert
When an SOS alert or emergency live-location alert is created, the backend must notify admin users immediately so operations staff do not have to discover alerts only by refreshing the Safety page.

Required behavior:
- Trigger an admin-facing notification as soon as a new SOS or emergency alert is created.
- Send the notification to all active admin users or to the configured operations / safety admin roles.
- Persist the alert notification so it appears in the admin portal notifications feed and can also be surfaced as an unread alert badge.
- Include enough data for the admin frontend to open the exact SOS / live-location session directly.

Minimum admin notification payload:
- `notification_type`: `sos_alert` or `emergency_alert`
- `sos_session_id`
- `ride_id` when available
- `customer_id`
- `customer_name`
- `customer_phone`
- `driver_id` when available
- `driver_name` when available
- `driver_phone` when available
- `latitude`
- `longitude`
- `location_name` or `address` when available
- `alert_type`
- `alert_source`
- `created_at`
- `deep_link` or route information for the admin portal, for example `/safety?sosSessionId=:id`

Acceptance criteria:
- Admin users receive a new notification immediately after an SOS alert is created.
- The admin notification contains enough metadata to identify the people involved and open the alert from the admin UI.
- Admin notifications are queryable from the backend and remain visible until acknowledged or resolved.

### 5. Alert nearby drivers with location and involved-party information
When an SOS alert is created, the backend must also notify nearby available drivers so they can respond quickly if the business rules allow driver-assisted escalation.

Required behavior:
- Find nearby eligible drivers within a configurable search radius around the SOS coordinates.
- Only notify drivers who are active, online, and allowed to receive emergency escalation alerts.
- Exclude the driver already involved in the SOS incident from the nearby-driver broadcast unless product rules explicitly allow it.
- Send the nearby-driver alert with the incident location plus the relevant customer and associated-driver information.
- Record which drivers were targeted, when they were notified, and whether delivery succeeded or failed.

Minimum nearby-driver notification payload:
- `notification_type`: `nearby_sos_alert`
- `sos_session_id`
- `ride_id` when available
- `incident_latitude`
- `incident_longitude`
- `location_name` or `address` when available
- `customer_name`
- `customer_phone` when policy allows it
- `associated_driver_name` when available
- `associated_driver_phone` when policy allows it
- `alert_type`
- `alert_source`
- `created_at`
- `distance_to_incident_km`
- `response_instructions`

Policy notes:
- If customer or driver phone numbers are sensitive, apply your privacy rules and send masked values instead of raw numbers.
- The search radius and driver eligibility rules should be configurable rather than hard-coded.
- The backend should store an audit record of all nearby-driver alert recipients.

Acceptance criteria:
- Nearby eligible drivers receive the SOS alert with incident coordinates and enough context to identify the emergency.
- The backend can return which nearby drivers were notified for each SOS session.
- Delivery and recipient status can be audited from the backend.

### 6. Support WhatsApp-style live location tracking
The SOS live-location experience should behave like a real shared live location session, not a single coordinate snapshot.

Required behavior:
- Create and maintain an active live-share session for the SOS user and any associated driver.
- Accept frequent location updates while the share is active.
- Persist the latest point and a short route history so the admin can see movement over time.
- Expose whether the share is currently active, stale, expired, manually stopped, or ended.
- Support share expiry windows similar to WhatsApp live location, for example configurable durations such as 15 minutes, 1 hour, or 8 hours.
- Allow the share to be manually stopped by the originating user, by the backend workflow, or by admin intervention.

Minimum session fields for WhatsApp-style tracking:
- `id`
- `type`
- `source`
- `status`
- `started_at`
- `expires_at`
- `ended_at`
- `stopped_at`
- `stop_reason`
- `stale_after_seconds`
- `last_updated_at`
- `route_path`
- `participants.customer`
- `participants.driver`

Minimum participant point fields:
- `latitude`
- `longitude`
- `heading`
- `speed`
- `accuracy`
- `timestamp`

Route history requirements:
- Return `route_path` as an ordered array of recent points or simplified path points.
- Preserve enough recent history for admins to understand direction of travel and last known movement.
- Include timestamps on the route points or make them derivable from adjacent metadata.

Realtime / polling requirements:
- Admin reads should always return the newest stored point for the session.
- If realtime streaming is available, expose a subscription or websocket / SSE channel for live-share updates.
- If realtime streaming is not available, the polling endpoints must still return fresh coordinates reliably at short intervals.

Share lifecycle requirements:
- Mark the session `stale` when updates stop arriving past the configured heartbeat threshold.
- Mark the session `expired` when `expires_at` is reached.
- Mark the session `manually_stopped` when the user or admin stops sharing.
- Preserve the last known point even after the session stops so the admin can still see the final location.

Acceptance criteria:
- An active SOS user can be tracked continuously on the admin map as new points arrive.
- The admin can see both the latest position and recent movement history.
- The backend exposes enough session metadata to show whether the share is active, stale, expired, or manually stopped.
- The final last-known location remains visible after sharing ends.

## Validation to run on backend
1. Run the backend locally or in staging with CORS enabled for the admin frontend origin.
2. Call the live-location admin endpoints from the browser and verify no CORS errors appear.
3. Open the Safety page, select an active SOS session, and confirm the frontend receives live-location payloads instead of falling back.
4. Confirm admin login/session audit writes succeed without schema errors.
5. Trigger a test SOS alert and verify that admin users receive a notification immediately.
6. Trigger a test SOS alert with valid coordinates and verify that nearby eligible drivers are selected and notified.
7. Verify the backend stores recipient, delivery, and audit records for both admin and nearby-driver alerts.
8. Start a live-share session for a test SOS user and confirm that successive location updates move the admin map over time.
9. Confirm the backend returns recent route history and the final last-known location after the share stops.

## Expected outcome
After the backend fix:
- The Safety page should load live-location sessions directly from the admin endpoints.
- Live updates should continue polling without CORS failures.
- The admin console should stop showing the `admin_sessions.admin_id` schema error.
- Admin users should receive real-time alert notifications for SOS events.
- Nearby drivers should receive emergency alerts with location and involved-party context.
- SOS tracking should behave like a continuous live-share session similar to WhatsApp live location.
