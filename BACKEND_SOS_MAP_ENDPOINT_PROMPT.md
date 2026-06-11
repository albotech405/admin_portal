# Backend Prompt: Fix SOS Live Location Endpoint For Admin Map

## Problem
The admin frontend can now:
- sign in successfully
- load the Safety page
- load the SOS session list
- open an SOS session
- load the Google Maps JavaScript SDK

But the SOS map still does not render fully because the backend live-location endpoint is failing in the browser.

Failing endpoint:
- `GET /api/v1/live-location/admin/sos/:sosSessionId`

Example failing session:
- `308b680d-79b8-4ca4-9330-32e49693c345`

Backend host:
- `https://admin-portal-backend-mgid.onrender.com`

Frontend origin currently being tested:
- `http://localhost:3000`

Possible deployed origin that must also work:
- `https://admin-portal-pink-six.vercel.app`

## Current browser behavior
The frontend opens the SOS session and mounts the map container, but the request below is still blocked / failing:
- `GET https://admin-portal-backend-mgid.onrender.com/api/v1/live-location/admin/sos/308b680d-79b8-4ca4-9330-32e49693c345`

Observed symptoms:
- browser CORS failure for the live-location admin SOS endpoint
- browser `net::ERR_FAILED`
- occasional backend `500`
- Google Maps loads, but the live location data request does not complete successfully

Additional production errors now confirmed from the deployed frontend:
- `POST /api/v1/admin/audit/log` returns `500`
- admin login recording fails with `ServiceRequestError: Server disconnected`
- `GET /api/v1/customers/admin/:customerId/emergency-contacts` returns `500`
- `GET /api/v1/sos/admin/sessions/:sosSessionId` returns `500`
- SOS session detail sometimes fails with `Database error during admin check`
- the Vercel origin `https://admin-portal-pink-six.vercel.app` is also blocked by CORS on the live-location SOS endpoint

This means the issue is broader than the map itself. The admin Safety flow is being degraded by failures in:
- live-location admin SOS endpoint
- SOS admin detail endpoint
- emergency contacts endpoint
- admin audit logging endpoint
- admin login/session logging endpoint

## Required backend fix

### 1. Fix CORS for the exact failing endpoint
Ensure this endpoint allows requests from both frontend origins:
- `http://localhost:3000`
- `https://admin-portal-pink-six.vercel.app`

Required behavior:
- `Access-Control-Allow-Origin` must be present for allowed origins
- `OPTIONS` preflight must succeed
- auth headers must be allowed
- browser GET requests must complete without CORS rejection

At minimum, fix CORS for:
- `GET /api/v1/live-location/admin/sos/:sosSessionId`

If CORS is applied per-router or per-prefix instead of globally, confirm the admin live-location router is not missing the deployed frontend origin.

### 2. Make the endpoint return `200` with a valid payload
For:
- `GET /api/v1/live-location/admin/sos/:sosSessionId`

Return a normalized payload shaped like:
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
- `last_updated_at`
- `route_path`
- `participants.customer`
- `participants.driver`

Each participant should include when available:
- `participant_type`
- `name`
- `phone`
- `status`
- `is_live`
- `source`
- `last_updated_at`
- `point.latitude`
- `point.longitude`
- `point.heading`
- `point.speed`
- `point.accuracy`
- `point.timestamp`

### 3. Always return a usable location for the map
The admin map should be able to render even if full live tracking is temporarily unavailable.

If realtime live-share data is missing, return at least one usable location source:
- `participants.customer.point`, or
- `participants.driver.point`, or
- `route_path`, or
- the last known SOS coordinates mapped into the normalized response

The frontend already supports fallback rendering if at least one valid coordinate source is returned.

### 4. Fix server-side failures in this route
If the route is returning `500`, fix the underlying error so the browser receives a valid JSON response.

Likely related areas:
- admin authorization check
- SOS session lookup
- live-location join / serializer logic
- null handling when no active live-share row exists

### 5. Fix the other failing admin endpoints used by the same Safety screen
The map experience is still broken if these requests fail, even after the live-location route is fixed.

Required fixes:
- `GET /api/v1/sos/admin/sessions/:sosSessionId`
	- must return `200`
	- must stop failing with `Database error during admin check`
- `GET /api/v1/customers/admin/:customerId/emergency-contacts`
	- must return `200`
	- must safely return an empty list instead of `500` when no contacts exist
- `POST /api/v1/admin/audit/log`
	- must not crash the request lifecycle
	- audit logging failures must not break admin screen usage
- admin login/session recording endpoint used by `recordAdminLogin`
	- must stop returning `500`
	- must stop disconnecting the client
	- if audit/session persistence is optional, fail soft and return a non-breaking response

### 6. Fix admin auth / session schema problems
The backend appears to have unstable admin-check logic.

Investigate:
- any query against `admin_sessions`
- any lookup expecting columns that do not exist in production
- any mismatch between local schema and Render production schema
- any admin auth middleware that throws a database error instead of returning a controlled `401` or `403`

Required behavior:
- if the admin token is valid, the request should continue normally
- if the admin token is invalid, return a controlled auth error
- do not return `500` for ordinary admin validation failures

## Acceptance criteria
1. Opening an SOS session from the Safety page no longer triggers a CORS error.
2. `GET /api/v1/live-location/admin/sos/:sosSessionId` returns `200` in the browser.
3. The response contains at least one valid coordinate source for the SOS map.
4. The admin map renders for session `308b680d-79b8-4ca4-9330-32e49693c345`.
5. The same endpoint works from both localhost and the deployed Vercel frontend.
6. `GET /api/v1/sos/admin/sessions/:sosSessionId` returns `200` without `Database error during admin check`.
7. `GET /api/v1/customers/admin/:customerId/emergency-contacts` returns `200` or an empty array, not `500`.
8. `POST /api/v1/admin/audit/log` no longer breaks admin usage if logging fails.
9. Admin login recording no longer throws `ServiceRequestError: Server disconnected`.

## Verification steps
1. Open the admin portal on `http://localhost:3000/safety`.
2. Open SOS session `308b680d-79b8-4ca4-9330-32e49693c345`.
3. Confirm the browser no longer shows a CORS error for `/api/v1/live-location/admin/sos/:id`.
4. Confirm the map renders instead of staying blank.
5. Repeat from `https://admin-portal-pink-six.vercel.app/safety`.
6. Confirm the console no longer shows:
	- `Database error during admin check`
	- `ServiceRequestError: Server disconnected`
	- `500` for emergency contacts
	- `500` for admin audit logging
