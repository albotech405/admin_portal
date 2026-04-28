# Quick Reference Card

## 🚀 Start Here

### Step 1: Start Backend (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API at: http://localhost:8000
# Docs at: http://localhost:8000/docs
```

### Step 2: Get JWT Token
1. Open Supabase dashboard
2. Create admin user account
3. Log in to admin account
4. Open browser DevTools → Application → Local Storage
5. Copy `supabase.auth.token` value
6. Add to `.env`: `VITE_JWT_TOKEN=<copied-token>`

### Step 3: Start Frontend (Terminal 2)
```bash
npm install  # First time only
npm run dev
# Portal at: http://localhost:5173
```

### Step 4: Test
1. Login to admin portal
2. Try Payment Verification workflow
3. Try Driver Approval workflow
4. Check Dashboard metrics

---

## 📡 API Quick Reference

### Payment Endpoints
```
GET /api/v1/wallet/admin/topup/requests?status=pending
PATCH /api/v1/wallet/admin/topup/requests/{id}/approve
PATCH /api/v1/wallet/admin/topup/requests/{id}/reject
  Body: { "rejection_reason": "string" }
```

### Driver Endpoints
```
GET /api/v1/drivers?verification_status=pending
GET /api/v1/drivers/{driver_id}
PATCH /api/v1/drivers/{id}/activate
PATCH /api/v1/drivers/{id}/deactivate?feedback=string
```

### Wallet Endpoints
```
GET /api/v1/wallet/balance
GET /api/v1/wallet/transactions
```

---

## 🔑 Environment Variables

### Frontend (.env)
```bash
VITE_BACKEND_URL=http://localhost:8000
VITE_JWT_TOKEN=your-supabase-jwt-token
```

### Backend (create in /backend/.env)
```bash
SUPABASE_URL=https://txulwrdevjuwumqvevjt.supabase.co
SUPABASE_KEY=your-supabase-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://...
```

---

## 📊 Data Models

### PaymentRequest
```typescript
{
  id: string
  driver_id: string
  amount: number
  payment_method: "mpesa" | "orange_money" | "airtel_money" | "bank_transfer" | "cash"
  proof_image_url: string
  status: "pending" | "approved" | "rejected"
  submitted_at: string (ISO)
  rejection_reason?: string
}
```

### Driver
```typescript
{
  id: string
  user_id: string
  license_number: string
  license_expiry: string
  verification_status: "pending" | "approved" | "rejected" | "suspended"
  vehicle?: {
    id: string
    vehicle_type: string
    license_plate: string
    make: string
    model: string
    year: number
    color: string
  }
  documents?: {
    id: string
    document_type: string
    file_url: string
    status: string
  }[]
  is_online: boolean
  rating: number
  total_trips: number
  created_at: string (ISO)
}
```

---

## 🧪 Testing Workflows

### Payment Verification Test
1. Navigate to "Payments" tab
2. See list of pending payments
3. Click payment to view details
4. Click "Approve" → Should move to approved
5. Test "Reject" with reason
6. Verify payment disappears from list

### Driver Approval Test
1. Navigate to "Drivers" tab
2. Filter by "Pending"
3. Click driver to see full profile
4. View vehicle details and documents
5. Click "Approve" → Status changes to approved
6. Test "Reject" with feedback
7. Test "Suspend" on approved drivers

### Dashboard Test
1. Check metric counts
2. Wait 30 seconds → Should auto-refresh
3. Click "Review Now" buttons
4. Verify navigation works

---

## 🔍 Troubleshooting

### "Failed to load" Error
✓ Check backend is running  
✓ Check JWT token is valid  
✓ Check VITE_BACKEND_URL is correct  
✓ Check browser DevTools Network tab

### "Admin access required"
✓ Ensure user has `is_admin = true` in database  
✓ Get fresh JWT token from Supabase  
✓ Add token to .env and restart frontend

### CORS Errors
✓ Backend and frontend must be different ports  
✓ Check backend CORS config  
✓ Typically works out-of-the-box for local dev

### No Data Showing
✓ Create test data in backend database  
✓ Check API response in DevTools Network  
✓ Check backend logs for errors

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `src/services/supabaseService.ts` | API calls |
| `src/pages/PaymentVerification.tsx` | Payment workflow UI |
| `src/pages/DriverApproval.tsx` | Driver approval UI |
| `src/pages/Dashboard.tsx` | Metrics display |
| `.env` | Configuration |
| `BACKEND_API_REFERENCE.md` | API docs |
| `INTEGRATION_GUIDE.md` | Full setup guide |

---

## 🎯 Workflow Summaries

### Admin Payment Review
```
Pending Payments → Click Payment → View Proof Image → 
Approve/Reject → Confirmation → Updated Status
```

### Admin Driver Review
```
Pending Drivers → Click Driver → View Profile/Vehicle/Docs → 
Approve/Reject/Suspend → Confirmation → Updated Status
```

### Dashboard Monitoring
```
View Metrics → Auto-refresh every 30s → 
Quick Action Buttons → Navigate to Review Pages
```

---

## ✨ Features Available

✅ Payment verification with document preview  
✅ Driver profile review with vehicle details  
✅ Document viewing and status tracking  
✅ Real-time metric updates  
✅ Admin action confirmation modals  
✅ Error handling and user feedback  
✅ Responsive mobile design  
✅ Clean, professional UI  

---

## 📞 Documentation Links

- **API Reference**: See `BACKEND_API_REFERENCE.md`
- **Setup Guide**: See `INTEGRATION_GUIDE.md`
- **Task Checklist**: See `INTEGRATION_CHECKLIST.md`
- **Complete Summary**: See `INTEGRATION_COMPLETE.md`

---

## ⚡ Common Commands

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
npm run dev

# Build frontend
npm run build

# Check types
npx tsc --noEmit

# View API docs
open http://localhost:8000/docs
```

---

## 🎓 Quick Learning

### How It Works
1. Frontend (React) calls service methods
2. Service layer makes HTTP requests to backend
3. Backend validates JWT token and admin role
4. Backend queries database via SQLAlchemy
5. Backend returns JSON response
6. Frontend updates UI with response data

### Authentication Flow
```
Login (Supabase) → Get JWT Token → 
Store in .env → Include in API headers → 
Backend validates → Access granted
```

---

**Status**: ✅ Ready to Use  
**Last Updated**: 2024  
**Compatibility**: 100%

