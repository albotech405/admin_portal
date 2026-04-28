# Driver Onboarding API - Implementation Guide

## Overview

The driver onboarding is a **5-step flow** that allows users with role "driver" to register, upload documents, and get verified before they can start accepting rides.

**Base URL:** `/api/v1/drivers`
**Auth:** All endpoints require `Authorization: Bearer <access_token>`

---

## Database Models

### DriverProfile (`driver_profiles`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id, unique |
| license_number | String(50) | Required |
| license_expiry | Date | Required |
| vehicle_type | String(20) | Nullable, set in Step 2 ("car" or "motorcycle") |
| verification_status | Enum | not_started, pending, under_review, approved, rejected, suspended |
| address | String(255) | Nullable |
| is_online | Boolean | Default false |
| rating | Float | Default 0.0 |
| total_rides | Integer | Default 0 |
| credit_balance | Numeric(12,2) | Default 0.00 |
| activation_date | DateTime | Nullable |
| submitted_at | DateTime | Nullable, set when verification submitted |

### VehicleDetails (`vehicle_details`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| driver_id | UUID | FK → driver_profiles.id, unique |
| vehicle_type | String(50) | "car" or "motorcycle" |
| license_plate | String(20) | Unique |
| make | String(50) | e.g. "Toyota" |
| model | String(50) | e.g. "Corolla" |
| year | Integer | e.g. 2022 |
| color | String(50) | |
| passenger_capacity | Integer | Nullable, for cars |
| has_air_conditioning | Boolean | Nullable, for cars |
| provides_helmet | Boolean | Nullable, for motorcycles |

### DriverDocument (`driver_documents`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| driver_id | UUID | FK → driver_profiles.id |
| document_type | String(50) | e.g. "drivers_license", "national_id" |
| file_url | String(500) | Public URL from Supabase Storage |
| status | Enum | pending, under_review, approved, rejected |
| uploaded_at | DateTime | |
| reviewed_at | DateTime | Nullable |
| rejection_reason | String(500) | Nullable |

---

## API Endpoints

### Step 1: Create Driver Profile

```
POST /api/v1/drivers
Auth: Yes
Body:
{
    "user_id": "uuid-from-signup",
    "license_number": "DRV123456789",
    "license_expiry": "2027-12-31"
}

Response (201):
{
    "id": "driver-uuid",
    "user_id": "user-uuid",
    "license_number": "DRV123456789",
    "license_expiry": "2027-12-31",
    "verification_status": "pending",
    "created_at": "2026-02-21T14:00:00Z"
}
```

### Step 2: Save Vehicle Type

```
POST /api/v1/drivers/{driver_id}/vehicle-type
Auth: Yes
Body:
{
    "vehicle_type": "car"
}
Possible values: "car", "motorcycle"

Response (200):
{
    "success": true,
    "vehicle_type": "car"
}
```

### Step 2b: Get Required Documents

```
GET /api/v1/drivers/required-documents?vehicle_type=car
Auth: Yes

Response (200) for CAR:
{
    "documents": [
        { "type": "drivers_license", "name": "Driver's License", "required": true },
        { "type": "national_id", "name": "National ID (Carte Electeur / Passport)", "required": true },
        { "type": "selfie_with_id", "name": "Selfie Holding ID/License", "required": true },
        { "type": "vehicle_registration", "name": "Vehicle Registration", "required": true },
        { "type": "insurance", "name": "Insurance Certificate", "required": true },
        { "type": "profile_photo", "name": "Profile Photo", "required": true },
        { "type": "vehicle_photo_front", "name": "Vehicle Photo - Front", "required": true },
        { "type": "vehicle_photo_back", "name": "Vehicle Photo - Back", "required": true },
        { "type": "vehicle_photo_left", "name": "Vehicle Photo - Left Side", "required": true },
        { "type": "vehicle_photo_right", "name": "Vehicle Photo - Right Side", "required": true }
    ]
}

Response (200) for MOTORCYCLE:
(same but without vehicle_photo_left and vehicle_photo_right — 8 documents)
```

### Step 3: Save Vehicle Details

```
POST /api/v1/drivers/{driver_id}/vehicle
Auth: Yes

For Car:
{
    "vehicle_type": "car",
    "license_plate": "ABC 123 GP",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "color": "White",
    "passenger_capacity": 4,
    "has_air_conditioning": true
}

For Motorcycle:
{
    "vehicle_type": "motorcycle",
    "license_plate": "XYZ 789 GP",
    "make": "Honda",
    "model": "CBR",
    "year": 2021,
    "color": "Red",
    "provides_helmet": true
}

Response (201): full vehicle object with id, driver_id, and all fields
```

### Step 3.5: Update Vehicle Details

```
PUT /api/v1/drivers/{driver_id}/vehicle/{vehicle_id}
Auth: Yes
Body: same fields as Step 3 (all optional)

Response (200): updated vehicle object
```

### Step 4: Upload Document

```
POST /api/v1/drivers/{driver_id}/documents
Auth: Yes
Content-Type: multipart/form-data
Form fields:
  - document_type: string (e.g. "drivers_license", "national_id", etc.)
  - file: binary image file (jpg/png/pdf)

Response (201):
{
    "id": "doc-uuid",
    "driver_id": "driver-uuid",
    "document_type": "drivers_license",
    "file_url": "https://<supabase-url>/storage/v1/object/public/driver-documents/<path>",
    "status": "pending",
    "uploaded_at": "2026-02-21T14:00:00Z",
    "reviewed_at": null,
    "rejection_reason": null
}

Notes:
- Re-uploading the same document_type replaces the previous one
- Files are stored in Supabase Storage bucket "driver-documents"
- Storage path: {driver_id}/{document_type}_{timestamp}.{ext}
```

### Get Uploaded Documents

```
GET /api/v1/drivers/{driver_id}/documents
Auth: Yes

Response (200):
{
    "documents": [ ...array of document objects... ]
}
```

### Delete Document

```
DELETE /api/v1/drivers/{driver_id}/documents/{document_id}
Auth: Yes

Response (200):
{
    "success": true
}
```

### Step 5: Submit for Verification

```
POST /api/v1/drivers/{driver_id}/submit-verification
Auth: Yes

Response (200) on success:
{
    "success": true,
    "verification_status": "under_review",
    "estimated_review_time": "24-48 hours"
}

Response (400) if documents missing:
{
    "success": false,
    "error": "Missing required documents",
    "missing_documents": ["insurance", "profile_photo"]
}

Validation:
- Vehicle type must be selected (Step 2)
- Vehicle details must exist (Step 3)
- All required documents for the vehicle type must be uploaded
```

### Get Verification Status

```
GET /api/v1/drivers/{driver_id}/verification-status
Auth: Yes

Response (200):
{
    "status": "under_review",
    "submitted_at": "2026-02-21T14:00:00Z",
    "estimated_completion": "2026-02-23T14:00:00Z",
    "documents_status": [
        { "type": "drivers_license", "status": "approved" },
        { "type": "vehicle_registration", "status": "pending" }
    ]
}
```

### Get Full Driver Profile

```
GET /api/v1/drivers/{driver_id}
Auth: Yes

Response (200):
{
    "id": "driver-uuid",
    "user_id": "user-uuid",
    "license_number": "DRV123456789",
    "license_expiry": "2027-12-31",
    "vehicle": { ...vehicle object or null... },
    "documents": [ ...array of document objects... ],
    "verification_status": "approved",
    "is_online": false,
    "rating": 4.8,
    "total_trips": 0,
    "created_at": "2026-02-21T14:00:00Z"
}
```

### Set Online Status (after approval)

```
PUT /api/v1/drivers/{driver_id}/online-status
Auth: Yes
Body:
{
    "is_online": true
}

Response (200):
{
    "success": true,
    "is_online": true
}

Note: Only approved drivers can go online.
```

---

## Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/v1/drivers/{id}/activate` | Approve driver (sets status to "approved") |
| PATCH | `/api/v1/drivers/{id}/deactivate` | Suspend driver (sets status to "suspended") |
| DELETE | `/api/v1/drivers/{id}` | Delete driver profile, reset user role to customer |

---

## Files Modified

| File | Description |
|------|-------------|
| `app/models/driver.py` | Updated DriverProfile, VehicleDetails; added DriverDocument model |
| `app/models/__init__.py` | Updated imports for new models/enums |
| `app/services/drivers/schema.py` | All request/response Pydantic schemas |
| `app/services/drivers/driver_service.py` | Business logic for all onboarding steps |
| `app/services/drivers/router.py` | All FastAPI endpoint definitions |
| `app/core/supabase.py` | Added `supabase_admin` service-role client |
| `app/main.py` | Added lifespan event to auto-create storage bucket |
| `requirements.txt` | Added `python-multipart` dependency |
| `migrations/versions/582a37ba071c_*.py` | Database migration |

---

## Supabase Storage

- **Bucket:** `driver-documents` (auto-created on app startup)
- **Visibility:** Public (URLs are directly accessible)
- **Upload client:** Uses `supabase_admin` (service role key) for write permissions
- **File path pattern:** `{driver_id}/{document_type}_{timestamp}.{extension}`
- **Allowed extensions:** jpg, jpeg, png, pdf
- **Max upload size:** 10MB (configured in `app/core/config.py`)

---

## Onboarding Flow Summary

```
1. Sign up with role "driver"        → POST /auth/signup
2. Create driver profile             → POST /drivers
3. Select vehicle type               → POST /drivers/{id}/vehicle-type
4. View required documents           → GET  /drivers/required-documents?vehicle_type=car
5. Add vehicle details               → POST /drivers/{id}/vehicle
6. Upload all required documents     → POST /drivers/{id}/documents (repeat per doc)
7. Submit for verification           → POST /drivers/{id}/submit-verification
8. Wait for admin approval           → GET  /drivers/{id}/verification-status
9. Go online                         → PUT  /drivers/{id}/online-status
```
