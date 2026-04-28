# AlboTax — Driver E-Wallet Implementation

> **Scope:** This document covers the driver wallet system end-to-end — database models, all API endpoints, request/response shapes, flow diagrams, and integration notes for both backend and frontend developers.

---

## Table of Contents

1. [Overview](#overview)
2. [How the Wallet Works](#how-the-wallet-works)
3. [Database Models](#database-models)
4. [Enums Reference](#enums-reference)
5. [Flow A — Manual Topup (Proof of Payment)](#flow-a--manual-topup-proof-of-payment)
6. [Flow B — M-Pesa Automatic Topup](#flow-b--m-pesa-automatic-topup)
7. [Ride Commission Deduction](#ride-commission-deduction)
8. [API Endpoints — Full Reference](#api-endpoints--full-reference)
9. [Authentication](#authentication)
10. [Error Reference](#error-reference)
11. [Environment Variables](#environment-variables)
12. [Frontend Integration Guide](#frontend-integration-guide)
13. [Backend Notes](#backend-notes)

---

## Overview

Each driver on the platform has an **e-wallet** (`credit_balance` on their driver profile). After every completed ride, the platform automatically deducts a **$10 commission** from that wallet. If the balance is insufficient the ride cannot be marked as completed — the driver must top up first.

There are **two ways** to top up:

| Method | Who reviews? | How fast? | Payment proof needed? |
|---|---|---|---|
| Manual (bank/Orange Money/Airtel) | Admin | Hours/days | Yes — screenshot required |
| M-Pesa C2B | Automatic (M-Pesa API) | ~30 seconds | No — M-Pesa verifies PIN |

---

## How the Wallet Works

```
Driver balance starts at $0.00
         │
         ▼
Driver tops up (Manual or M-Pesa)
         │
    ┌────┴─────────────────────┐
    │ Manual flow              │ M-Pesa flow
    │ Driver submits proof     │ Driver enters phone + amount
    │ Admin reviews            │ M-Pesa pushes USSD to phone
    │ Admin approves           │ Driver enters PIN
    │ Balance credited ✓       │ M-Pesa calls our callback
    └──────────────────────────┘ Balance credited automatically ✓
         │
         ▼
   Driver completes a ride
         │
         ▼
   $10 deducted automatically
   WalletTransaction (DEBIT) created
         │
         ▼
   If balance < $10 → ride cannot be completed (HTTP 402)
```

---

## Database Models

### `wallet_topup_requests`

Tracks every topup attempt (both manual and M-Pesa).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `driver_id` | UUID (FK → driver_profiles) | No | Which driver |
| `amount` | Numeric(12,2) | No | Amount in USD |
| `payment_method` | Enum | No | `mpesa` / `orange_money` / `airtel_money` / `bank_transfer` |
| `proof_image_url` | String(500) | **Yes** | Supabase storage URL — only for manual payments |
| `status` | Enum | No | `pending` / `approved` / `rejected` |
| `notes` | Text | Yes | Driver's optional note |
| `submitted_at` | DateTime | No | When the request was created |
| `reviewed_at` | DateTime | Yes | When admin approved/rejected (or M-Pesa callback arrived) |
| `reviewed_by` | UUID (FK → users) | Yes | Admin user ID — `null` for M-Pesa (auto-processed) |
| `rejection_reason` | Text | Yes | Populated on rejection |
| `mpesa_conversation_id` | String(100) | Yes | M-Pesa's `output_ConversationID` — used to match callbacks |
| `mpesa_transaction_id` | String(100) | Yes | M-Pesa's `output_TransactionID` — final reference number |

---

### `wallet_transactions`

Immutable ledger. One row per credit or debit event. Never deleted or updated.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `driver_id` | UUID (FK → driver_profiles) | No | Which driver |
| `type` | Enum | No | `credit` or `debit` |
| `amount` | Numeric(12,2) | No | Always positive |
| `balance_after` | Numeric(12,2) | No | Balance snapshot after this transaction |
| `reference_type` | Enum | No | `topup` or `ride_commission` |
| `reference_id` | UUID | No | ID of the topup request or ride that triggered this |
| `description` | String(255) | No | Human-readable description |
| `created_at` | DateTime | No | Transaction timestamp |

---

### `driver_profiles` (updated field)

| Column | Description |
|---|---|
| `credit_balance` | Current live wallet balance (Numeric 12,2). Updated on every approve/deduct. |

---

### `users` (updated field)

| Column | Description |
|---|---|
| `is_admin` | Boolean — set to `true` in the DB for users who can review manual topup requests. |

---

## Enums Reference

```
PaymentMethod:       mpesa | orange_money | airtel_money | bank_transfer
TopupRequestStatus:  pending | approved | rejected
TransactionType:     credit | debit
TransactionReference: topup | ride_commission
```

---

## Flow A — Manual Topup (Proof of Payment)

Used when the driver pays via **bank transfer, Orange Money, or Airtel Money** (no API available yet).

### Step-by-step

```
1. Driver pays to AlboTax's bank/Orange/Airtel account (outside the app)
2. Driver opens the app → "Top Up Wallet" → "Manual Payment"
3. Driver selects payment_method, enters amount, adds optional note
4. Driver uploads a screenshot of the payment receipt
5. App calls POST /api/v1/wallet/topup/submit  (multipart/form-data)
6. Backend uploads image to Supabase storage ("payment-proofs" bucket)
7. WalletTopupRequest created with status = "pending"
8. ─── Admin side ───
9. Admin logs into dashboard → calls GET /api/v1/wallet/admin/topup/requests?status=pending
10. Admin views the proof image and verifies the payment
11. Admin calls PATCH /api/v1/wallet/admin/topup/requests/{id}/approve
    OR
    Admin calls PATCH /api/v1/wallet/admin/topup/requests/{id}/reject  (with reason)
12. On approval → driver's credit_balance is incremented, WalletTransaction created
13. Driver refreshes balance → sees new amount
```

### Request — Submit Manual Topup

```
POST /api/v1/wallet/topup/submit
Content-Type: multipart/form-data
Authorization: Bearer <driver_jwt>

Fields:
  amount         float    required   Amount paid in USD (e.g. 50)
  payment_method string   required   orange_money | airtel_money | bank_transfer
  notes          string   optional   e.g. "Paid to account 1234, ref ABC"
  proof_image    file     required   JPG, PNG, or PDF (max 10MB)
```

### Response — 201 Created

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "driver_id": "...",
  "amount": "50.00",
  "payment_method": "orange_money",
  "proof_image_url": "https://...supabase.co/storage/v1/object/public/payment-proofs/...",
  "status": "pending",
  "notes": "Paid to account 1234, ref ABC",
  "submitted_at": "2026-03-30T10:00:00Z",
  "reviewed_at": null,
  "reviewed_by": null,
  "rejection_reason": null,
  "mpesa_conversation_id": null,
  "mpesa_transaction_id": null
}
```

---

## Flow B — M-Pesa Automatic Topup

Used when the driver pays via **Vodacom M-Pesa (DRC)**. The platform uses the M-Pesa OpenAPI C2B (Customer-to-Business) endpoint. No admin review needed — M-Pesa verifies the PIN and notifies us automatically.

### Step-by-step

```
Driver App                    AlboTax Backend              M-Pesa OpenAPI
    │                               │                            │
    │  POST /wallet/mpesa/topup     │                            │
    │  { amount, phone_number }     │                            │
    │──────────────────────────────►│                            │
    │                               │  GET /getSession/          │
    │                               │───────────────────────────►│
    │                               │  ◄── { output_SessionID } ─│
    │                               │                            │
    │                               │  POST /c2bPayment/         │
    │                               │  singleStage/              │
    │                               │───────────────────────────►│
    │                               │  ◄── { ConversationID,  ───│
    │                               │        ResponseCode }      │
    │                               │                            │
    │  202 { message, topup_id,     │                            │
    │         conversation_id }     │         ~30 seconds...     │
    │◄──────────────────────────────│  USSD pushed to driver's   │
    │                               │  phone ────────────────────►(driver's phone)
    │  [Driver sees USSD prompt     │                            │
    │   enters M-Pesa PIN]          │                            │
    │                               │◄── POST /wallet/mpesa/ ────│
    │                               │    callback                │
    │                               │  { ResultCode: "INS-0",    │
    │                               │    TransactionID, ... }    │
    │                               │                            │
    │                               │  Credit wallet ✓           │
    │                               │  Create WalletTransaction  │
    │                               │                            │
    │                               │  ◄── 200 confirmation ─────│
```

### Request — Initiate M-Pesa Topup

```
POST /api/v1/wallet/mpesa/topup
Content-Type: application/json
Authorization: Bearer <driver_jwt>

{
  "amount": 50.00,
  "phone_number": "243812345678"
}
```

> **Phone number format:** DRC country code (243) + 9 digits, no `+` prefix, no spaces.
> Examples: `243812345678`, `243971234567`

### Response — 202 Accepted

```json
{
  "message": "Payment initiated. Please check your phone for the M-Pesa prompt and enter your PIN.",
  "topup_request_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "mpesa_conversation_id": "fd1e9143d22544459f7c66e1860ef276",
  "status": "pending"
}
```

### What happens next (frontend)

After receiving 202, the driver app should:
1. Show a message: *"Check your phone — enter your M-Pesa PIN to confirm"*
2. **Poll** `GET /api/v1/wallet/topup/requests` every 5 seconds (up to ~2 minutes)
   — look for the topup_request_id entry to change from `pending` → `approved` or `rejected`
3. On `approved` — show success, refresh wallet balance
4. On `rejected` — show `rejection_reason` to the driver

### M-Pesa Callback (internal — not called by frontend)

```
POST /api/v1/wallet/mpesa/callback
(Called by M-Pesa servers — no Authorization header)

Incoming payload from M-Pesa:
{
  "input_OriginalConversationID": "fd1e9143d22544459f7c66e1860ef276",
  "input_TransactionID": "hv9ahxcg4ccv",
  "input_ResultCode": "INS-0",
  "input_ResultDesc": "Request processed successfully",
  "input_ThirdPartyConversationID": "alb3f2a1..."
}
```

Backend response (required by M-Pesa to close the session):
```json
{
  "output_OriginalConversationID": "fd1e9143d22544459f7c66e1860ef276",
  "output_ResponseCode": "0",
  "output_ResponseDesc": "Successfully Accepted Result",
  "output_ThirdPartyConversationID": "alb3f2a1..."
}
```

> This endpoint is **hidden from Swagger docs** and must never be called by the app directly.

---

## Ride Commission Deduction

This happens **automatically** inside the ride completion flow. The frontend does not need to call anything extra.

When a driver calls `PATCH /api/v1/rides/{ride_id}/complete`:
1. Backend checks `driver.credit_balance >= $10.00`
2. **If insufficient** → returns `HTTP 402` (do not mark ride complete)
3. **If sufficient** → deducts $10, creates a `WalletTransaction` (DEBIT), marks ride COMPLETED

### HTTP 402 response shape

```json
{
  "detail": "Insufficient wallet balance. Current balance: $2.00. Required: $10.00. Please top up your wallet."
}
```

> **Frontend tip:** On receiving 402 from complete-ride, redirect the driver to the wallet top-up screen with a clear message explaining why.

---

## API Endpoints — Full Reference

Base URL: `/api/v1/wallet`

All endpoints except `/mpesa/callback` require `Authorization: Bearer <jwt>`.

---

### Driver Endpoints

#### `GET /wallet/balance`
Get the driver's current wallet balance.

**Response 200**
```json
{
  "driver_id": "uuid",
  "balance": "45.00"
}
```

---

#### `POST /wallet/topup/submit`
Submit a manual proof-of-payment topup request.

**Request** — `multipart/form-data`
| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | float | Yes | USD amount |
| `payment_method` | string | Yes | `orange_money` \| `airtel_money` \| `bank_transfer` |
| `notes` | string | No | Max 500 chars |
| `proof_image` | file | Yes | JPG / PNG / PDF, max 10 MB |

**Response 201** — `TopupRequestResponse` (see shape above)

---

#### `POST /wallet/mpesa/topup`
Initiate an M-Pesa C2B topup. Driver receives a USSD push on their phone.

**Request** — `application/json`
```json
{
  "amount": 50.00,
  "phone_number": "243812345678"
}
```

**Response 202** — `MpesaTopupInitiatedResponse`
```json
{
  "message": "...",
  "topup_request_id": "uuid",
  "mpesa_conversation_id": "string",
  "status": "pending"
}
```

**Errors**
| Code | Meaning |
|---|---|
| 400 | Driver profile not found |
| 502 | M-Pesa API returned an error (check `detail` field) |

---

#### `GET /wallet/topup/requests`
List all of the authenticated driver's topup requests (newest first).

**Response 200**
```json
{
  "requests": [ ...TopupRequestResponse ],
  "total": 3
}
```

---

#### `GET /wallet/transactions`
Get the authenticated driver's full transaction history (newest first).

**Response 200**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "driver_id": "uuid",
      "type": "credit",
      "amount": "50.00",
      "balance_after": "95.00",
      "reference_type": "topup",
      "reference_id": "uuid",
      "description": "M-Pesa wallet top-up (TxID: hv9ahxcg4ccv)",
      "created_at": "2026-03-30T10:32:00Z"
    },
    {
      "id": "uuid",
      "driver_id": "uuid",
      "type": "debit",
      "amount": "10.00",
      "balance_after": "85.00",
      "reference_type": "ride_commission",
      "reference_id": "uuid",
      "description": "Platform commission for completed ride",
      "created_at": "2026-03-30T11:05:00Z"
    }
  ],
  "total": 2
}
```

---

### Admin Endpoints

> Require `is_admin = true` on the user record. Returns `403` otherwise.

#### `GET /wallet/admin/topup/requests`
List topup requests across all drivers.

**Query parameters**
| Param | Type | Description |
|---|---|---|
| `status` | string | Optional filter: `pending` \| `approved` \| `rejected` |

**Response 200** — `TopupRequestListResponse`

---

#### `PATCH /wallet/admin/topup/requests/{request_id}/approve`
Approve a manual topup — credits the driver's wallet immediately.

**Response 200** — `TopupRequestResponse` (status = `approved`)

**Errors**
| Code | Meaning |
|---|---|
| 400 | Request is already approved or rejected |
| 404 | Request not found |

---

#### `PATCH /wallet/admin/topup/requests/{request_id}/reject`
Reject a topup request with a reason.

**Request** — `application/json`
```json
{
  "rejection_reason": "Payment amount does not match. Screenshot shows $20 but $50 was entered."
}
```

**Response 200** — `TopupRequestResponse` (status = `rejected`)

---

## Authentication

All driver and admin endpoints use **Bearer token** auth (Supabase JWT):

```
Authorization: Bearer <access_token>
```

Admin endpoints additionally check `user.is_admin == true` in the database.
To grant admin access, set `is_admin = true` directly in the `users` table for the relevant user.

---

## Error Reference

| HTTP Code | When it happens |
|---|---|
| 400 | Driver profile not found / request already processed |
| 402 | Ride completion blocked — insufficient wallet balance |
| 403 | Admin-only endpoint called by non-admin |
| 404 | Topup request not found |
| 422 | Validation error (invalid payment_method, phone format, etc.) |
| 502 | M-Pesa OpenAPI returned an error |

---

## Environment Variables

Add these to your `.env` file:

```env
# Wallet
PLATFORM_FEE_PER_RIDE=10.00
PAYMENT_PROOFS_BUCKET=payment-proofs

# M-Pesa OpenAPI (DRC — vodacomDRC)
MPESA_API_KEY=<from M-Pesa OpenAPI portal>
MPESA_PUBLIC_KEY=<base64 DER public key from portal — the long MIICIjAN... string>
MPESA_SERVICE_PROVIDER_CODE=<your organization shortcode>
MPESA_ENVIRONMENT=sandbox          # change to "openapi" for production
MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/wallet/mpesa/callback
```

> **Local development:** M-Pesa cannot reach `localhost`. Use [ngrok](https://ngrok.com/) to expose your local server:
> ```bash
> ngrok http 8000
> # then set MPESA_CALLBACK_URL=https://xxxx.ngrok.io/api/v1/wallet/mpesa/callback
> ```

---

## Frontend Integration Guide

### Wallet Screen — what to display

| Element | Data source |
|---|---|
| Current balance | `GET /wallet/balance` → `balance` |
| Transaction history | `GET /wallet/transactions` → `transactions[]` |
| Top-up request history | `GET /wallet/topup/requests` → `requests[]` |
| Pending request badge | Count items where `status == "pending"` |

---

### Manual Topup — UI flow

```
1. Show form:
   - Amount input (USD)
   - Payment method selector (Orange Money / Airtel Money / Bank Transfer)
   - Notes field (optional)
   - Image picker for payment screenshot
2. POST /wallet/topup/submit  (multipart/form-data)
3. On 201 → show "Request submitted! Our team will verify within 24h."
4. On wallet screen → show pending request with status badge
5. When admin approves → status changes to "approved", balance updates
```

---

### M-Pesa Topup — UI flow

```
1. Show form:
   - Amount input (USD)
   - Phone number input (pre-fill from user's registered phone if available)
     ► Format: 12–14 digits, no +, no spaces (e.g. 243812345678)
2. POST /wallet/mpesa/topup
3. On 202 → show "Check your phone — enter your M-Pesa PIN to confirm payment"
           → store topup_request_id locally
4. Start polling GET /wallet/topup/requests every 5 seconds
   → find entry matching topup_request_id
   → when status changes from "pending":
       "approved" → show success toast, refresh balance
       "rejected" → show error with rejection_reason
5. Stop polling after 2 minutes if still pending → show timeout message
   (driver can try again or use manual method)
```

---

### Admin Dashboard — what to build

```
1. List pending requests: GET /wallet/admin/topup/requests?status=pending
2. For each request show:
   - Driver name (resolve driver_id via driver profile)
   - Amount + payment method
   - Submitted date/time
   - Proof image (proof_image_url) — show as clickable thumbnail
   - Notes from driver
3. Approve button → PATCH /wallet/admin/topup/requests/{id}/approve
4. Reject button → prompt for reason → PATCH /wallet/admin/topup/requests/{id}/reject
5. Show approved/rejected history with filter tabs
```

---

## Backend Notes

### Session key caching
The M-Pesa session key is cached **in-process memory** for 23 hours (`mpesa_service.py`). This means:
- On first M-Pesa topup after server restart, one extra `getSession` call is made
- Multiple worker processes (e.g. with Gunicorn) will each cache their own key — this is fine, M-Pesa accepts multiple valid sessions concurrently
- If you need distributed caching (Redis), replace `_SESSION_CACHE` in `mpesa_service.py`

### Commission amount
Configured via `PLATFORM_FEE_PER_RIDE` in `.env` (default `10.00`). Changing this value takes effect immediately without a code deploy.

### Migrations
Run in order after pulling this feature:
```bash
alembic upgrade head
```
This applies two migrations:
- `a1b2c3d4e5f6` — creates `wallet_topup_requests`, `wallet_transactions`, adds `is_admin` to users
- `b2c3d4e5f6a7` — makes `proof_image_url` nullable, adds `mpesa_conversation_id` and `mpesa_transaction_id`

### File structure
```
app/
├── models/
│   ├── wallet.py               ← WalletTopupRequest + WalletTransaction models
│   └── user.py                 ← is_admin field added
├── services/
│   └── wallet/
│       ├── mpesa_service.py    ← M-Pesa OpenAPI client (session + C2B)
│       ├── wallet_service.py   ← Business logic (all topup flows + deduction)
│       ├── schemas.py          ← Pydantic request/response models
│       └── router.py           ← FastAPI routes
└── core/
    └── config.py               ← M-Pesa + wallet env vars
```
