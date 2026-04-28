# Frontend & Backend Integration Guide

## ✅ What Has Been Done

I've analyzed the backend FastAPI application and adapted the frontend to work with it. Here's what changed:

### 1. **Updated API Service Layer** (`src/services/supabaseService.ts`)
   - Renamed service class to `AlboTaxService` (more descriptive)
   - Changed from Supabase RPC calls to FastAPI REST endpoints
   - Updated all method signatures to match backend endpoints
   - Updated data interfaces to match backend models

### 2. **Updated Environment Variables**
   - Added `VITE_BACKEND_URL` (default: `http://localhost:8000`)
   - Added `VITE_JWT_TOKEN` for authentication
   - Updated `.env.example` with clear documentation
   - Updated `.env` with new variables

### 3. **Updated TypeScript Types** (`src/vite-env.d.ts`)
   - Added new environment variable type declarations
   - Proper Vite type support

### 4. **Updated Page Components**
   - Modified `PaymentVerification.tsx` to use new API method signatures
   - Modified `DriverApproval.tsx` to use new API methods and driver properties
   - Updated data property names to match backend response structures

---

## 📋 Frontend API Changes Summary

### Key Endpoint Changes

| Purpose | Old Method | New Endpoint |
|---------|-----------|-------------|
| **List Payments** | RPC `payment_requests` | `GET /api/v1/wallet/admin/topup/requests?status=pending` |
| **Approve Payment** | RPC `approve_wallet_topup` | `PATCH /api/v1/wallet/admin/topup/requests/{id}/approve` |
| **Reject Payment** | RPC `reject_wallet_topup` | `PATCH /api/v1/wallet/admin/topup/requests/{id}/reject` |
| **List Drivers** | Table query | `GET /api/v1/drivers?verification_status=pending` |
| **Get Driver Detail** | Query filter | `GET /api/v1/drivers/{driver_id}` |
| **Approve Driver** | RPC `approve_driver` | `PATCH /api/v1/drivers/{id}/activate` |
| **Reject/Suspend Driver** | RPC `reject_driver` | `PATCH /api/v1/drivers/{id}/deactivate` |

### Method Signature Changes

#### Payment Approval
**Before:**
```typescript
async approvePaymentRequest(requestId: string, adminId: string): Promise<void>
```

**After:**
```typescript
async approvePaymentRequest(requestId: string): Promise<PaymentRequest>
```

#### Payment Rejection
**Before:**
```typescript
async rejectPaymentRequest(requestId: string, adminId: string, reason: string): Promise<void>
```

**After:**
```typescript
async rejectPaymentRequest(requestId: string, rejectionReason: string): Promise<PaymentRequest>
```

#### Driver Approval
**Before:**
```typescript
async approveDriver(driverId: string): Promise<void>
```

**After:**
```typescript
async approveDriver(driverId: string): Promise<Driver>
```

#### Driver Rejection
**Before:**
```typescript
async rejectDriver(driverId: string, reason: string): Promise<void>
```

**After:**
```typescript
async rejectDriver(driverId: string, feedback?: string): Promise<Driver>
```

---

## 🔧 Implementation Details

### PaymentRequest Interface Changes
```typescript
// Old
{
  id: string
  driver_name: string        // ❌ Not in backend
  reference_number: string   // ❌ Not in backend
  proof_url: string          // ❌ Different name
  proof_type: 'image' | 'pdf' // ❌ Always image in backend
  date: string               // ❌ Different field name
}

// New
{
  id: string
  driver_id: string          // ✅ From backend
  amount: number             // ✅ Required for sorting
  payment_method: string     // ✅ Payment method enum
  proof_image_url: string    // ✅ Correct field name
  status: string             // ✅ pending | approved | rejected
  submitted_at: string       // ✅ ISO datetime
  rejection_reason?: string  // ✅ When rejected
  notes?: string             // ✅ Optional notes
}
```

### Driver Interface Changes
```typescript
// Old
{
  id: string
  name: string               // ❌ Not in backend
  email: string              // ❌ In User table, not Driver
  phone: string              // ❌ In User table, not Driver
  status: string             // ❌ Wrong field name
  vehicle_info: { ... }      // ❌ Flat structure
  documents: { [key]: url }  // ❌ Different structure
  wallet_balance: number     // ❌ Not in Driver table
}

// New
{
  id: string
  user_id: string            // ✅ FK to User table
  license_number: string     // ✅ Driver info
  license_expiry: string     // ✅ License expiry date
  verification_status: string // ✅ pending | approved | rejected | suspended
  vehicle?: Vehicle {        // ✅ Related object
    vehicle_type: string
    license_plate: string
    make: string
    model: string
    // ... etc
  }
  documents?: DriverDocument[] // ✅ Array of documents
  is_online: boolean         // ✅ Current status
  rating: number             // ✅ Driver rating
  total_trips: number        // ✅ Trip count
}
```

---

## 🚀 Next Steps

### 1. **Set Up Backend Environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. **Start Backend Server**
```bash
cd backend
uvicorn app.main:app --reload
# API will be available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 3. **Get JWT Token from Supabase**
1. Go to your Supabase dashboard
2. Create an admin user account
3. Log in and copy the JWT token from browser local storage
4. Add to `.env`:
   ```
   VITE_JWT_TOKEN=your-jwt-token-here
   ```

### 4. **Verify Backend URL**
In `.env`, ensure:
```
VITE_BACKEND_URL=http://localhost:8000
```

### 5. **Install Frontend Dependencies**
```bash
cd frontend  # or root if frontend is at root
npm install
```

### 6. **Start Frontend Development Server**
```bash
npm run dev
# Frontend will be at http://localhost:5173
```

### 7. **Test Each Feature**

#### Test Payment Verification
1. Navigate to "Payments" tab
2. Should see list of pending payment requests (if any exist in backend)
3. Click a payment to see details
4. Try approving/rejecting with test reason

#### Test Driver Approval
1. Navigate to "Drivers" tab
2. Should see list of pending drivers
3. Click a driver to see full profile with vehicle and documents
4. Try approving/rejecting with test feedback

#### Test Dashboard
1. Should display counts of pending items
2. Refresh should update counts

---

## ⚠️ Important Notes

### Authentication
- **All requests** now require a valid JWT token from Supabase Auth
- The backend validates `user.is_admin` flag for admin endpoints
- Make sure the admin user has `is_admin = true` in the database

### Admin Check
The backend endpoints check for `require_admin()` dependency. Ensure:
1. You're logged in as an admin user
2. Your JWT token includes admin claims
3. The Supabase user row has `is_admin = true`

### CORS Configuration
The backend has CORS enabled. If you get CORS errors:
- Check backend `app/core/config.py` for `CORS_ORIGINS`
- Ensure frontend origin is in the allowed list
- For local dev, typically `http://localhost:5173` should be allowed

---

## 🔍 API Response Format Reference

### Payment List Response
```json
{
  "requests": [
    {
      "id": "uuid",
      "driver_id": "uuid",
      "amount": 100.00,
      "payment_method": "mpesa",
      "proof_image_url": "https://...",
      "status": "pending",
      "submitted_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5
}
```

### Driver Detail Response
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "license_number": "ABC123",
  "license_expiry": "2025-12-31",
  "verification_status": "pending",
  "vehicle": {
    "id": "uuid",
    "vehicle_type": "car",
    "license_plate": "XYZ789",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "color": "silver"
  },
  "documents": [
    {
      "id": "uuid",
      "document_type": "license",
      "file_url": "https://...",
      "status": "pending"
    }
  ],
  "is_online": false,
  "rating": 4.5,
  "total_trips": 25,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 🐛 Troubleshooting

### "Failed to load payment requests" Error
1. Check backend is running: `http://localhost:8000/`
2. Check JWT token is valid in `.env`
3. Check backend logs for auth errors
4. Verify VITE_BACKEND_URL is correct in `.env`

### "Admin access required" Error
1. Ensure user has `is_admin = true` in database
2. Get fresh JWT token from Supabase
3. Add to `.env` and restart frontend

### No Data Showing
1. Check backend database has test data
2. Verify status filters match backend enum values
3. Check browser DevTools Network tab for API responses
4. Look at backend logs for SQL errors

### CORS Error
1. Frontend and backend must be on different ports (e.g., 5173 vs 8000)
2. Check backend CORS config allows frontend origin
3. For local dev, should work out of the box

---

## 📚 Additional Resources

- **Backend API Documentation:** `http://localhost:8000/docs` (when running)
- **Backend Reference:** See `BACKEND_API_REFERENCE.md` in project root
- **Frontend Service:** `src/services/supabaseService.ts`
- **Example Data Models:** `backend/app/models/`

---

## ✨ Summary of Changes

- ✅ Service layer completely refactored for FastAPI
- ✅ Data interfaces updated to match backend models
- ✅ Environment variables configured for new setup
- ✅ Page components updated for new API signatures
- ✅ Ready for integration testing with actual backend

All changes maintain the existing UI/UX while supporting the FastAPI backend architecture.

