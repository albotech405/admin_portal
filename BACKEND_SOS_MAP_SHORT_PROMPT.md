# Short Backend Prompt

Fix the admin Safety/SOS backend flow on `https://admin-portal-backend-mgid.onrender.com`.

Current frontend symptoms:
- CORS failure on `GET /api/v1/live-location/admin/sos/:sosSessionId` from:
  - `http://localhost:3000`
  - `https://admin-portal-pink-six.vercel.app`
- `GET /api/v1/sos/admin/sessions/:sosSessionId` returns `500`
- SOS detail sometimes fails with `Database error during admin check`
- `GET /api/v1/customers/admin/:customerId/emergency-contacts` returns `500`
- `POST /api/v1/admin/audit/log` returns `500`
- admin login recording fails with `ServiceRequestError: Server disconnected`

Required fixes:
1. Fix CORS on `GET /api/v1/live-location/admin/sos/:sosSessionId` for both frontend origins.
2. Make `GET /api/v1/live-location/admin/sos/:sosSessionId` return `200` JSON with usable coordinates for the SOS map.
3. Make `GET /api/v1/sos/admin/sessions/:sosSessionId` return `200` and stop failing admin validation with database errors.
4. Make `GET /api/v1/customers/admin/:customerId/emergency-contacts` return `200` or `[]` instead of `500`.
5. Make `POST /api/v1/admin/audit/log` fail soft so logging problems never break the admin UI.
6. Fix admin login/session persistence so `recordAdminLogin` does not disconnect or return `500`.
7. Audit admin auth middleware and `admin_sessions` schema mismatches in production. Invalid admin checks should return `401/403`, not `500`.

Acceptance criteria:
- Opening SOS session `308b680d-79b8-4ca4-9330-32e49693c345` works from both localhost and Vercel.
- No CORS errors in browser console.
- No `Database error during admin check`.
- No `500`s for SOS detail, emergency contacts, audit log, or admin login recording.
- The SOS map renders with live or fallback coordinates.
