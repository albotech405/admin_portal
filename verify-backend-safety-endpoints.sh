#!/usr/bin/env bash
set -euo pipefail

BACKEND_BASE_URL="${BACKEND_BASE_URL:-https://admin-portal-backend-mgid.onrender.com}"
ORIGIN_LOCAL="${ORIGIN_LOCAL:-http://localhost:3000}"
ORIGIN_VERCEL="${ORIGIN_VERCEL:-https://admin-portal-pink-six.vercel.app}"
SOS_SESSION_ID="${SOS_SESSION_ID:-308b680d-79b8-4ca4-9330-32e49693c345}"
CUSTOMER_ID="${CUSTOMER_ID:-a2290953-6838-496f-9466-d89da4ea8e97}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if [[ -z "${ADMIN_TOKEN}" ]]; then
  echo "Set ADMIN_TOKEN before running this script."
  echo "Example: ADMIN_TOKEN=your_token ./verify-backend-safety-endpoints.sh"
  exit 1
fi

print_header() {
  printf '\n%s\n' "$1"
}

show_status() {
  local method="$1"
  local origin="$2"
  local url="$3"
  local label="$4"

  print_header "${label}"
  curl -i -sS -X "$method" \
    -H "Origin: ${origin}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "$url" | sed -n '1,20p'
}

show_json_status() {
  local origin="$1"
  local url="$2"
  local label="$3"

  print_header "${label}"
  curl -sS \
    -H "Origin: ${origin}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "$url" | sed -n '1,40p'
}

print_header "Preflight: live-location endpoint from localhost"
show_status OPTIONS "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "OPTIONS localhost live-location"

print_header "Preflight: live-location endpoint from Vercel"
show_status OPTIONS "$ORIGIN_VERCEL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "OPTIONS vercel live-location"

show_status GET "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "GET localhost live-location headers"
show_json_status "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "GET localhost live-location body"

show_status GET "$ORIGIN_VERCEL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "GET vercel live-location headers"
show_json_status "$ORIGIN_VERCEL" "${BACKEND_BASE_URL}/api/v1/live-location/admin/sos/${SOS_SESSION_ID}" "GET vercel live-location body"

show_status GET "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/sos/admin/sessions/${SOS_SESSION_ID}" "GET localhost SOS detail headers"
show_json_status "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/sos/admin/sessions/${SOS_SESSION_ID}" "GET localhost SOS detail body"

show_status GET "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/customers/admin/${CUSTOMER_ID}/emergency-contacts" "GET localhost emergency contacts headers"
show_json_status "$ORIGIN_LOCAL" "${BACKEND_BASE_URL}/api/v1/customers/admin/${CUSTOMER_ID}/emergency-contacts" "GET localhost emergency contacts body"

print_header "POST localhost admin audit log"
curl -i -sS -X POST \
  -H "Origin: ${ORIGIN_LOCAL}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"admin_safety_verification","resource_type":"sos_session","resource_id":"308b680d-79b8-4ca4-9330-32e49693c345","metadata":{"source":"verify-backend-safety-endpoints.sh"}}' \
  "${BACKEND_BASE_URL}/api/v1/admin/audit/log" | sed -n '1,40p'

print_header "Verification complete"
echo "Review status codes, Access-Control-Allow-Origin headers, and response bodies above."
