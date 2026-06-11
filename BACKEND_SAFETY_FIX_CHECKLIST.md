# Backend Safety Fix Checklist

## Scope
Repair the backend endpoints that block the admin Safety and SOS workflow.

## Environment
- Backend: `https://admin-portal-backend-mgid.onrender.com`
- Local frontend: `http://localhost:3000`
- Deployed frontend: `https://admin-portal-pink-six.vercel.app`
- Example SOS session: `308b680d-79b8-4ca4-9330-32e49693c345`
- Example customer: `a2290953-6838-496f-9466-d89da4ea8e97`

## Must Fix
- `GET /api/v1/live-location/admin/sos/:sosSessionId`
- `GET /api/v1/sos/admin/sessions/:sosSessionId`
- `GET /api/v1/customers/admin/:customerId/emergency-contacts`
- `POST /api/v1/admin/audit/log`
- admin login/session recording used by `recordAdminLogin`

## Checklist
- Add both frontend origins to the backend CORS allowlist.
- Confirm `OPTIONS` preflight succeeds for admin live-location routes.
- Allow auth headers on cross-origin admin requests.
- Ensure admin auth middleware returns `401/403` for invalid auth, not `500`.
- Audit `admin_sessions` production schema for missing columns or drift from local.
- Stop `Database error during admin check` from leaking into API responses.
- Make SOS detail endpoint return `200` for valid admin tokens.
- Make emergency contacts endpoint return `200` with `[]` when there are no contacts.
- Make audit logging fail soft and never break the page.
- Make admin login/session recording fail soft and never disconnect the client.
- Make live-location SOS endpoint return normalized JSON even when realtime share data is missing.
- Map fallback coordinates from the SOS record when no active live session exists.

## Expected Live-Location Response
The admin frontend can render the map if at least one of these is present:
- `participants.customer.point`
- `participants.driver.point`
- `route_path`
- last known SOS latitude/longitude mapped into the normalized response

Recommended top-level fields:
- `id`
- `status`
- `source`
- `started_at`
- `expires_at`
- `ended_at`
- `stop_reason`
- `sos_session_id`
- `customer_id`
- `customer_name`
- `customer_phone`
- `driver_id`
- `driver_name`
- `driver_phone`
- `last_updated_at`
- `route_path`
- `participants`

## Done When
- localhost Safety page opens the SOS session without CORS errors
- Vercel Safety page opens the same SOS session without CORS errors
- the map renders for SOS session `308b680d-79b8-4ca4-9330-32e49693c345`
- no `500` on SOS detail, emergency contacts, audit log, or admin login recording
- no `Database error during admin check` in browser console
