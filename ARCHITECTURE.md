# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER / CLIENT                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Admin Portal (SPA)                │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │         App.tsx (Router & Layout)           │    │  │
│  │  │                                             │    │  │
│  │  │  ┌──────────────────────────────────────┐  │    │  │
│  │  │  │  Header & Navigation                │  │    │  │
│  │  │  └──────────────────────────────────────┘  │    │  │
│  │  │                                             │    │  │
│  │  │  ┌──────────────────────────────────────┐  │    │  │
│  │  │  │  Routes:                             │  │    │  │
│  │  │  │  - /           → Dashboard           │  │    │  │
│  │  │  │  - /payments   → PaymentVerification │  │    │  │
│  │  │  │  - /drivers    → DriverApproval      │  │    │  │
│  │  │  │  - /wallet/:id → WalletView          │  │    │  │
│  │  │  └──────────────────────────────────────┘  │    │  │
│  │  │                                             │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │           Page Components                      │ │  │
│  │  │                                                │ │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │  │
│  │  │  │Dashboard │ │Payments  │ │Drivers       │  │ │  │
│  │  │  └──────────┘ └──────────┘ └──────────────┘  │ │  │
│  │  │                                                │ │  │
│  │  │  ┌──────────┐                                 │ │  │
│  │  │  │ Wallet   │                                 │ │  │
│  │  │  └──────────┘                                 │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │       Reusable UI Components                  │ │  │
│  │  │                                                │ │  │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │ │  │
│  │  │  │Button│ │Card  │ │Modal │ │Table │         │ │  │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘         │ │  │
│  │  │                                                │ │  │
│  │  │  ┌──────────┐ ┌────────────────┐             │ │  │
│  │  │  │Badge     │ │DocumentPreview │             │ │  │
│  │  │  └──────────┘ └────────────────┘             │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │        Services (API Layer)                    │ │  │
│  │  │                                                │ │  │
│  │  │  ┌───────────────────────────────────────┐   │ │  │
│  │  │  │  SupabaseService (supabaseService.ts)│   │ │  │
│  │  │  │                                       │   │ │  │
│  │  │  │  - Payment Methods                    │   │ │  │
│  │  │  │  - Driver Methods                     │   │ │  │
│  │  │  │  - Wallet Methods                     │   │ │  │
│  │  │  │  - Dashboard Methods                  │   │ │  │
│  │  │  │  - Generic RPC Caller                 │   │ │  │
│  │  │  └───────────────────────────────────────┘   │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│           State Management: React Hooks                    │
│           Styling: Tailwind CSS                           │
│           Build Tool: Vite                                │
│           Language: TypeScript                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP/HTTPS (Axios)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Supabase Project                          │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │      PostgreSQL Database Tables             │    │  │
│  │  │                                             │    │  │
│  │  │  - payment_requests                         │    │  │
│  │  │  - drivers                                  │    │  │
│  │  │  - wallet_transactions                      │    │  │
│  │  │  - (+ other tables)                         │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │      RPC Functions (Stored Procedures)      │    │  │
│  │  │                                             │    │  │
│  │  │  - approve_wallet_topup()                   │    │  │
│  │  │  - reject_wallet_topup()                    │    │  │
│  │  │  - approve_driver()                         │    │  │
│  │  │  - reject_driver()                          │    │  │
│  │  │  - get_dashboard_metrics()                  │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │      Authentication                         │    │  │
│  │  │      - JWT Token Validation                 │    │  │
│  │  │      - Role-Based Access Control            │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │      Storage (for documents/proofs)         │    │  │
│  │  │      - Cloud Storage Bucket                 │    │  │
│  │  │      - URL-based access                     │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Page Load
```
User opens App
     ↓
React loads App.tsx
     ↓
Router matches URL
     ↓
Page Component (e.g., Dashboard) loads
     ↓
useEffect() triggers
     ↓
SupabaseService.getDashboardMetrics() called
     ↓
Axios sends GET request to Supabase
     ↓
Supabase RPC executes get_dashboard_metrics()
     ↓
Returns data to frontend
     ↓
setState(metrics)
     ↓
Component re-renders with data
```

### 2. User Action (Approve Payment)
```
User clicks "Approve" button
     ↓
onClick handler executes handleApprove()
     ↓
Button shows loading state (isLoading = true)
     ↓
SupabaseService.approvePaymentRequest() called
     ↓
Axios POSTs to Supabase RPC endpoint
     ↓
Backend executes approve_wallet_topup()
     ↓
Updates payment_requests table (status = 'approved')
     ↓
Credits driver wallet_transactions table
     ↓
Returns success response
     ↓
Frontend removes payment from list
     ↓
Navigate back to list view
     ↓
User sees confirmation
```

---

## Component Hierarchy

```
App
├── Header (Navigation)
├── Routes
│   ├── Route "/" → Dashboard
│   │   ├── MetricCard (x4)
│   │   └── QuickActions
│   │
│   ├── Route "/payments" → PaymentVerification
│   │   ├── ListView
│   │   │   └── Table (PaymentRequest[])
│   │   │       └── onRowClick → DetailView
│   │   │
│   │   └── DetailView
│   │       ├── DocumentPreview
│   │       ├── PaymentDetails (Card)
│   │       ├── Button (Approve)
│   │       ├── Button (Reject)
│   │       └── Modal (RejectReason)
│   │
│   ├── Route "/drivers" → DriverApproval
│   │   ├── ListView
│   │   │   ├── Filter (Status buttons)
│   │   │   └── Table (Driver[])
│   │   │       └── onRowClick → DetailView
│   │   │
│   │   └── DetailView
│   │       ├── PersonalInfo (Card)
│   │       ├── VehicleInfo (Card)
│   │       ├── Documents (Card)
│   │       ├── WalletBalance (Card)
│   │       ├── Button (Approve/Reject/Suspend)
│   │       └── Modal (RejectReason)
│   │
│   └── Route "/wallet/:driverId" → WalletView
│       ├── BalanceCard
│       └── TransactionHistoryTable
│
└── Footer
```

---

## State Management Flow

### Local Component State
```typescript
// Example: PaymentVerification.tsx
const [payments, setPayments] = useState<PaymentRequest[]>([])
const [isLoading, setIsLoading] = useState(true)
const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null)
const [showDetailView, setShowDetailView] = useState(false)
const [error, setError] = useState<string | null>(null)

// Flow:
// 1. Load: setIsLoading(true)
// 2. Fetch: const data = await service.getPayments()
// 3. Store: setPayments(data)
// 4. Done: setIsLoading(false)
```

---

## API Communication Pattern

```
Frontend (Axios)
     ↓
supabaseService.js
     ↓
axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    Authorization: `Bearer ${adminToken}`,
    apikey: adminToken,
  }
})
     ↓
HTTP Request to Supabase
     ↓
Supabase REST API / RPC Handler
     ↓
PostgreSQL Query / Function Execute
     ↓
Response (JSON)
     ↓
Frontend State Update
     ↓
Component Re-render
```

---

## Error Handling Strategy

```
try {
  // API call
  const data = await supabaseService.getPayments()
  setData(data)
  setError(null)
} catch (err) {
  // Set error message
  setError('Failed to load payments')
  console.error(err)
} finally {
  // Always disable loading
  setIsLoading(false)
}

// UI Shows:
// Loading: spinner/skeleton
// Success: data displayed
// Error: red alert box with message
```

---

## File Dependency Tree

```
index.html
  └── main.tsx
        └── App.tsx (Router)
              ├── Header
              ├── Routes
              │   ├── Dashboard.tsx
              │   │   └── supabaseService
              │   ├── PaymentVerification.tsx
              │   │   ├── components (Button, Card, Modal, etc.)
              │   │   └── supabaseService
              │   ├── DriverApproval.tsx
              │   │   ├── components
              │   │   └── supabaseService
              │   └── WalletView.tsx
              │       ├── components
              │       └── supabaseService
              └── Footer

supabaseService.ts
  └── axios (HTTP client)

components/
  ├── Button.tsx
  ├── Card.tsx
  ├── Modal.tsx
  ├── Table.tsx
  ├── Badge.tsx
  ├── DocumentPreview.tsx
  └── index.ts (barrel export)

Styling:
  ├── index.css (Tailwind directives)
  ├── tailwind.config.js
  └── postcss.config.js
```

---

## Development Workflow

```
Developer
  ↓
Code Changes
  ↓
Vite Hot Module Replacement (HMR)
  ↓
Browser Auto-refresh
  ↓
TypeScript Type Checking
  ↓
Component Re-render
  ↓
Test in Browser DevTools
```

---

## Build & Deployment

```
npm run build
  ↓
Vite Bundle
  ↓
TypeScript Compilation
  ↓
CSS Minification (Tailwind)
  ↓
JavaScript Minification
  ↓
Code Splitting
  ↓
dist/ folder (optimized)
  ↓
Deploy to Hosting (Vercel/Netlify/etc)
  ↓
CDN Distribution
  ↓
Users download optimized assets
```

---

## Security Architecture

```
.env (Local Development)
  ↓
VITE_ Prefix variables
  ↓
Vite preprocesses (removed from build if unused)
  ↓
supabaseService.ts
  ↓
Axios headers (Authorization: Bearer TOKEN)
  ↓
HTTPS Connection to Supabase
  ↓
Supabase validates JWT
  ↓
RLS (Row Level Security) policies
  ↓
Database access control
```

---

## Scalability Considerations

### Current (MVP)
- ✅ Single admin user
- ✅ Basic operations only
- ✅ Real-time polling (every 30s)

### Future Enhancements
- Real-time WebSocket connections
- Advanced filtering and search
- Batch operations
- Caching layer (React Query)
- Advanced analytics
- Multi-admin support with roles
- Audit logging
- Notifications system

---

## Performance Optimizations

1. **Code Splitting**: React Router lazy loading
2. **Tree Shaking**: Unused code removed in build
3. **Minification**: CSS and JS minified
4. **Asset Optimization**: Vite handles compression
5. **Component Memoization**: React.memo for large lists
6. **Lazy Loading**: Images load on demand
7. **Caching**: Browser caches static assets

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 | UI components |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite | Fast builds |
| **Styling** | Tailwind CSS | Utility CSS |
| **Routing** | React Router v6 | Navigation |
| **HTTP Client** | Axios | API calls |
| **Backend** | Supabase | Database + Auth |
| **Database** | PostgreSQL | Data storage |
| **Storage** | Supabase Storage | File uploads |
| **Authentication** | Supabase Auth | Admin login |

---

This architecture provides a scalable, maintainable, and user-friendly admin portal that's production-ready right out of the box.
