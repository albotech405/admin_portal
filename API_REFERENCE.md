# API Reference

## Overview

The admin portal communicates with a Supabase backend. This document details all API methods available through `supabaseService`.

## Initialization

The service is automatically initialized with credentials from `.env`:

```typescript
import { supabaseService } from '@/services/supabaseService'

// Use anywhere in the app
const payments = await supabaseService.getPaymentRequests()
```

## Payment Requests API

### Get Pending Payment Requests

```typescript
async getPaymentRequests(status?: string): Promise<PaymentRequest[]>
```

**Parameters:**
- `status` (optional): Filter by status - 'pending', 'approved', 'rejected'

**Returns:** Array of payment requests

**Example:**
```typescript
// Get all pending requests
const pending = await supabaseService.getPaymentRequests('pending')

// Get all requests regardless of status
const all = await supabaseService.getPaymentRequests()
```

**Response Schema:**
```typescript
interface PaymentRequest {
  id: string                          // Unique request ID
  driver_id: string                   // Driver who made the request
  driver_name: string                 // Driver's full name
  amount: number                      // Amount in rupees
  payment_method: string              // e.g., 'UPI', 'Bank Transfer', 'Card'
  reference_number: string            // Transaction/UTR reference
  proof_url: string                   // URL to image/PDF of proof
  proof_type: 'image' | 'pdf'        // Type of proof document
  date: string                        // ISO date string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string                  // ISO timestamp of request creation
}
```

### Get Payment Request Detail

```typescript
async getPaymentRequestDetail(id: string): Promise<PaymentRequest>
```

**Parameters:**
- `id`: Payment request ID

**Returns:** Single payment request object

**Example:**
```typescript
const payment = await supabaseService.getPaymentRequestDetail('req_123')
```

### Approve Payment Request

```typescript
async approvePaymentRequest(requestId: string, adminId: string): Promise<void>
```

**Parameters:**
- `requestId`: ID of the payment request
- `adminId`: ID of the admin approving (typically from localStorage)

**Example:**
```typescript
const adminId = localStorage.getItem('adminId') || 'default-admin'
await supabaseService.approvePaymentRequest('req_123', adminId)
```

**Calls RPC:** `approve_wallet_topup(request_id, admin_id)`

**Backend Actions:**
- Updates request status to 'approved'
- Credits driver's wallet
- Records admin action for audit trail

### Reject Payment Request

```typescript
async rejectPaymentRequest(
  requestId: string, 
  adminId: string, 
  reason: string
): Promise<void>
```

**Parameters:**
- `requestId`: ID of the payment request
- `adminId`: ID of the admin rejecting
- `reason`: Reason for rejection (shown to driver)

**Example:**
```typescript
await supabaseService.rejectPaymentRequest(
  'req_123',
  'admin_456',
  'Invalid proof document'
)
```

**Calls RPC:** `reject_wallet_topup(request_id, admin_id, reason)`

**Backend Actions:**
- Updates request status to 'rejected'
- Sends notification to driver with reason
- Records admin action for audit trail

---

## Driver API

### Get Drivers

```typescript
async getDrivers(status?: string): Promise<Driver[]>
```

**Parameters:**
- `status` (optional): Filter by status - 'pending', 'approved', 'rejected', 'suspended'

**Returns:** Array of driver objects

**Example:**
```typescript
// Get pending applications
const pending = await supabaseService.getDrivers('pending')

// Get all drivers
const all = await supabaseService.getDrivers()
```

**Response Schema:**
```typescript
interface Driver {
  id: string                          // Driver ID
  name: string                        // Full name
  email: string                       // Email address
  phone: string                       // Phone number
  vehicle_info: {
    model: string                     // Vehicle model
    plate_number: string              // License plate
    color: string                     // Vehicle color
  }
  documents: {
    license_url: string               // Driver license image/PDF
    insurance_url: string             // Insurance document
    registration_url: string          // Vehicle registration
  }
  wallet_balance: number              // Current balance in rupees
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string                  // Application date
}
```

### Get Driver Detail

```typescript
async getDriverDetail(id: string): Promise<Driver>
```

**Parameters:**
- `id`: Driver ID

**Returns:** Single driver object

**Example:**
```typescript
const driver = await supabaseService.getDriverDetail('driver_789')
```

### Approve Driver

```typescript
async approveDriver(driverId: string): Promise<void>
```

**Parameters:**
- `driverId`: ID of driver to approve

**Example:**
```typescript
await supabaseService.approveDriver('driver_789')
```

**Calls RPC:** `approve_driver(driver_id)`

**Backend Actions:**
- Updates driver status to 'approved'
- Activates driver account
- Sends approval notification
- Records timestamp

### Reject Driver

```typescript
async rejectDriver(driverId: string, reason: string): Promise<void>
```

**Parameters:**
- `driverId`: ID of driver to reject
- `reason`: Reason for rejection

**Example:**
```typescript
await supabaseService.rejectDriver(
  'driver_789',
  'Insurance document expired'
)
```

**Calls RPC:** `reject_driver(driver_id, reason)`

**Backend Actions:**
- Updates driver status to 'rejected'
- Sends rejection notification with reason
- Records timestamp and reason

### Suspend Driver

```typescript
async suspendDriver(driverId: string): Promise<void>
```

**Parameters:**
- `driverId`: ID of driver to suspend

**Example:**
```typescript
await supabaseService.suspendDriver('driver_789')
```

**Note:** This can be used for safety issues, policy violations, or temporary deactivation.

---

## Wallet API

### Get Wallet Balance

```typescript
async getWalletBalance(driverId: string): Promise<number>
```

**Parameters:**
- `driverId`: Driver ID

**Returns:** Current balance in rupees

**Example:**
```typescript
const balance = await supabaseService.getWalletBalance('driver_789')
console.log(`Balance: ₹${balance}`)
```

### Get Wallet Transactions

```typescript
async getWalletTransactions(driverId: string): Promise<WalletTransaction[]>
```

**Parameters:**
- `driverId`: Driver ID

**Returns:** Array of transactions (most recent first)

**Example:**
```typescript
const transactions = await supabaseService.getWalletTransactions('driver_789')
```

**Response Schema:**
```typescript
interface WalletTransaction {
  id: string                          // Transaction ID
  driver_id: string                   // Associated driver
  type: 'credit' | 'debit'           // Type of transaction
  amount: number                      // Amount in rupees
  description: string                 // What the transaction was for
  date: string                        // ISO date string
  reference_id?: string               // Related request/ride ID
}
```

**Examples of Transactions:**
- Credit: Wallet topup, ride completion payment
- Debit: Ride cancellation penalty, balance adjustment

---

## Dashboard API

### Get Dashboard Metrics

```typescript
async getDashboardMetrics(): Promise<DashboardMetrics>
```

**Returns:** Dashboard metrics object

**Example:**
```typescript
const metrics = await supabaseService.getDashboardMetrics()
console.log(`Pending payments: ${metrics.pending_payments_count}`)
```

**Response Schema:**
```typescript
interface DashboardMetrics {
  pending_payments_count: number      // Awaiting approval
  pending_drivers_count: number       // Awaiting review
  active_drivers_count: number        // Online/active drivers
  active_rides_count: number          // In-progress rides
}
```

**Calls RPC:** `get_dashboard_metrics()`

**Use Cases:**
- Display metrics on dashboard
- Show action-required alerts
- Real-time updates with polling

---

## Error Handling

All API methods throw errors that should be caught:

```typescript
try {
  const payments = await supabaseService.getPaymentRequests('pending')
} catch (error) {
  console.error('Failed to load payments:', error)
  // Show error to user
}
```

**Common Errors:**
- Network errors (connection issues)
- 401 Unauthorized (invalid token)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (resource doesn't exist)
- 500 Server Error (backend issue)

---

## Usage Patterns

### Loading Data with Error Handling

```typescript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true)
      const result = await supabaseService.getPaymentRequests('pending')
      setData(result)
      setError(null)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  loadData()
}, [])
```

### Parallel Requests

```typescript
const [balance, transactions] = await Promise.all([
  supabaseService.getWalletBalance(driverId),
  supabaseService.getWalletTransactions(driverId),
])
```

### With Polling (Auto-Refresh)

```typescript
useEffect(() => {
  const loadMetrics = async () => {
    const metrics = await supabaseService.getDashboardMetrics()
    setMetrics(metrics)
  }
  
  loadMetrics() // Load immediately
  const interval = setInterval(loadMetrics, 30000) // Then every 30 seconds
  
  return () => clearInterval(interval)
}, [])
```

---

## Authentication

The service uses JWT authentication via Supabase:

```
Authorization: Bearer <admin-token>
apikey: <admin-token>
```

**Token Storage:**
- Stored in `.env` as `VITE_ADMIN_TOKEN`
- Never exposed to client-side logs
- Included in all API requests automatically

**Token Permissions:**
- Read: All payment/driver/wallet tables
- Write: Can create/update status records
- Execute: Can call RPC functions

---

## Rate Limiting

Supabase has default rate limits:
- 60 requests per minute per IP
- Contact Supabase support for higher limits if needed

---

## Data Consistency

- **Real-time updates**: Implement polling for live data
- **Stale data**: Clear cache when making mutations
- **Optimistic updates**: Update UI before server confirmation

---

## Testing

### Test API Connectivity

```typescript
// In browser console
const supabaseService = window.supabaseService
supabaseService.getPaymentRequests()
  .then(data => console.log('✓ API works:', data))
  .catch(err => console.error('✗ API failed:', err))
```

### Mock Data for Development

See `IMPLEMENTATION_GUIDE.md` for setting up mock data.

---

## Migration Guide

If updating the service layer:

1. **Add new method** to `supabaseService` class
2. **Update types** in interface definitions
3. **Test the method** in component
4. **Update this documentation**
5. **Commit with clear message**

---

## Support

- Check error messages in browser console
- Verify Supabase setup and RPC functions
- Test API calls with curl or Postman
- Review Supabase logs for backend errors

---

**Last Updated:** April 2026  
**Supabase Version:** v2+  
**React Version:** 18.2+
