# Backend API Reference for AlboTax Admin Portal

## Overview
The backend is a **FastAPI** application with a Python/PostgreSQL stack. It uses **Supabase** for authentication, storage, and some real-time features. The API is organized into service-based routers with admin-specific endpoints.

**Base URL:** `{backend_url}/api/v1`  
**Auth:** JWT Bearer token (from Supabase)  
**Database:** PostgreSQL with SQLAlchemy ORM

---

## Key Backend Structure

### Available Service Routers
1. **Authentication** (`/auth`) - User signup/login
2. **Wallet** (`/wallet`) - Payment topup & transactions
3. **Drivers** (`/drivers`) - Driver profiles & verification
4. **Payments** (`/payments`) - Exchange rates
5. **User** (`/user`) - User profiles
6. **Rides** (`/rides`) - Ride management
7. **Addresses** (`/addresses`) - Saved addresses
8. **SOS** (`/sos`) - Emergency features
9. **Notifications** (`/notifications`) - Push notifications

---

## Admin Portal Required Endpoints

### 1. Dashboard Metrics

#### Get Dashboard Data
The admin portal needs to fetch metrics. Currently, these would need to be calculated from individual endpoints or a custom endpoint should be created.

**Recommended endpoints to combine:**
- List pending topup requests: `GET /api/v1/wallet/admin/topup/requests?status=pending`
- List drivers by status: `GET /api/v1/drivers` (needs pagination & filtering)
- Get online drivers count
- Get active rides count

---

### 2. Payment Verification Workflow

#### List Pending Payment Requests
```
GET /api/v1/wallet/admin/topup/requests?status=pending
```
**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "driver_id": "uuid",
      "amount": 100.00,
      "payment_method": "mpesa|orange_money|airtel_money|bank_transfer",
      "proof_image_url": "https://...",
      "status": "pending",
      "submitted_at": "2024-01-15T10:30:00Z",
      "notes": "optional"
    }
  ],
  "total": 5
}
```

#### Get Payment Request Detail
```
GET /api/v1/wallet/admin/topup/requests/{request_id}
```
Returns full request with driver info.

#### Approve Payment Request
```
PATCH /api/v1/wallet/admin/topup/requests/{request_id}/approve
```
**Response:** Updated topup request with `status: "approved"`

#### Reject Payment Request
```
PATCH /api/v1/wallet/admin/topup/requests/{request_id}/reject
Content-Type: application/json

{
  "rejection_reason": "Invalid proof document"
}
```
**Response:** Updated topup request with `status: "rejected"`

---

### 3. Driver Approval Workflow

#### List Drivers (with filtering)
```
GET /api/v1/drivers?status=pending
GET /api/v1/drivers?status=approved
GET /api/v1/drivers?status=rejected
```

**Possible filters:**
- `verification_status`: pending | under_review | approved | rejected | suspended
- `is_online`: true | false
- `limit`, `offset` (for pagination)

**Response Structure:**
```json
{
  "drivers": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "license_number": "ABC123",
      "license_expiry": "2025-12-31",
      "vehicle_type": "car",
      "verification_status": "pending",
      "address": "123 Main St",
      "is_online": false,
      "rating": 4.5,
      "total_trips": 25,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Driver Profile (Full Details)
```
GET /api/v1/drivers/{driver_id}
```
**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "license_number": "ABC123",
  "license_expiry": "2025-12-31",
  "vehicle": {
    "id": "uuid",
    "vehicle_type": "car",
    "license_plate": "XYZ789",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "color": "silver",
    "passenger_capacity": 5,
    "has_air_conditioning": true,
    "provides_helmet": false
  },
  "documents": [
    {
      "id": "uuid",
      "document_type": "license|insurance|inspection",
      "file_url": "https://...",
      "status": "pending|approved|rejected"
    }
  ],
  "verification_status": "pending|under_review|approved|rejected|suspended",
  "address": "123 Main St",
  "is_online": false,
  "rating": 4.5,
  "total_trips": 25,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Activate Driver Profile (Approve)
```
PATCH /api/v1/drivers/{driver_profile_id}/activate
```
**Response:** Updated driver profile with `verification_status: "approved"`

#### Deactivate Driver Profile (Reject/Suspend)
```
PATCH /api/v1/drivers/{driver_profile_id}/deactivate
Query Parameters:
  ?feedback=Optional+rejection+reason
```
**Response:** Updated driver profile with `verification_status: "suspended"`

#### Delete Driver Profile
```
DELETE /api/v1/drivers/{driver_profile_id}
```
**Response:** 204 No Content

---

### 4. Wallet View / Transaction History

#### Get Driver Wallet Balance
```
GET /api/v1/wallet/balance
Authorization: Bearer {driver_jwt_token}
```
**Response:**
```json
{
  "driver_id": "uuid",
  "balance": 1250.50
}
```

#### Get Driver Transaction History
```
GET /api/v1/wallet/transactions
Authorization: Bearer {driver_jwt_token}
```
**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "credit|debit",
      "amount": 100.00,
      "balance_after": 1250.50,
      "reference_type": "topup|ride_commission",
      "description": "Wallet topped up via M-Pesa",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

---

## Data Models Reference

### Driver Profile
```python
{
  "id": UUID,
  "user_id": UUID,
  "license_number": str,
  "license_expiry": date,
  "vehicle_type": str,  # "car", "motorcycle"
  "verification_status": "pending" | "under_review" | "approved" | "rejected" | "suspended",
  "address": str,
  "is_online": bool,
  "rating": float,
  "total_rides": int,
  "created_at": datetime
}
```

### Wallet Topup Request
```python
{
  "id": UUID,
  "driver_id": UUID,
  "amount": Decimal,
  "payment_method": "mpesa" | "orange_money" | "airtel_money" | "bank_transfer" | "cash",
  "proof_image_url": str,
  "status": "pending" | "approved" | "rejected",
  "submitted_at": datetime,
  "reviewed_at": datetime | None,
  "rejection_reason": str | None
}
```

### Wallet Transaction
```python
{
  "id": UUID,
  "driver_id": UUID,
  "type": "credit" | "debit",
  "amount": Decimal,
  "balance_after": Decimal,
  "reference_type": "topup" | "ride_commission",
  "description": str,
  "created_at": datetime
}
```

---

## Authentication

The backend uses **JWT tokens** from Supabase. The admin portal needs:

1. **JWT Token:** Obtained from Supabase Auth
2. **Header Format:** `Authorization: Bearer {token}`
3. **Admin Check:** The backend checks `user.is_admin` flag on specific endpoints
4. **Admin Endpoints:** Prefixed with `/admin` require `require_admin()` dependency

---

## Key Differences from Initial Assumptions

| Assumption | Reality |
|-----------|---------|
| Supabase RPC functions | FastAPI REST endpoints with standard HTTP verbs |
| Generic endpoint paths | Service-organized routers (wallet/, drivers/, payments/) |
| Enum-based filtering | Query parameters with string values |
| Payment table | `wallet_topup_requests` table with full details |
| Driver status field | `verification_status` enum field (not just binary) |

---

## Admin Endpoints Summary

All admin endpoints require `require_admin()` dependency (checks `user.is_admin == True`):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/wallet/admin/topup/requests` | List topup requests |
| `PATCH` | `/wallet/admin/topup/requests/{id}/approve` | Approve topup |
| `PATCH` | `/wallet/admin/topup/requests/{id}/reject` | Reject topup |
| `PATCH` | `/drivers/{id}/activate` | Approve driver |
| `PATCH` | `/drivers/{id}/deactivate` | Reject/suspend driver |
| `DELETE` | `/drivers/{id}` | Delete driver |

---

## Next Steps for Frontend

1. Update `supabaseService.ts` to call actual FastAPI endpoints instead of RPC functions
2. Map interface property names to match backend response structures
3. Update API method signatures to match endpoint requirements
4. Add proper error handling for HTTP status codes
5. Implement JWT token management from Supabase Auth
6. Test all endpoints against actual backend

