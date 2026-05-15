# AlboTaxi Admin Portal

A full-stack, production-ready admin dashboard for the **AlboTaxi** ride-sharing platform, built to give operations teams complete visibility and control over drivers, customers, rides, payments, disputes, safety, and system configuration.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features & Pages](#features--pages)
- [Backend API Routers](#backend-api-routers)
- [Role-Based Access Control](#role-based-access-control)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Database Setup SQL](#database-setup-sql)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The AlboTaxi Admin Portal is a secure, role-gated web application for internal operations teams. It connects directly to the AlboTaxi Supabase PostgreSQL database and a FastAPI backend, giving administrators real-time control over every aspect of the platform.

All currency is displayed in **CDF (Congolese Franc)**. The platform currently serves the **Kinshasa, DRC** market.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| TypeScript | 5.3 | Type safety |
| Vite | 5.0 | Build tool & dev server |
| Tailwind CSS | 3.3 | Styling |
| React Router | 6.20 | Client-side routing |
| Supabase JS | 2.x | Auth + realtime |
| Axios | 1.6 | HTTP client |
| Lucide React | 0.294 | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.115 | API framework |
| Uvicorn | 0.30 | ASGI server |
| Pydantic | 2.9 | Data validation |
| Supabase Python | 2.9 | DB client |
| python-jose | 3.3 | JWT verification |

### Infrastructure

| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database + Auth + Storage |
| Render / VPS | Backend hosting |
| Vercel / Netlify | Frontend hosting |
| Google Maps API | Mapping & geolocation |
| Firebase | Push notifications |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Admin Browser                   │
│        React 18 + TypeScript + Vite          │
│     http://localhost:3000  (dev)             │
└──────────────────┬──────────────────────────┘
                   │ HTTPS / JWT Bearer token
                   ▼
┌─────────────────────────────────────────────┐
│        FastAPI Backend (Python 3.11)         │
│        http://localhost:8000  (dev)          │
│        /api/v1/...  (14 routers)             │
└──────────────────┬──────────────────────────┘
                   │ Supabase SDK / PostgreSQL
                   ▼
┌─────────────────────────────────────────────┐
│           Supabase (PostgreSQL)              │
│   Auth · Database · Storage · Realtime      │
└─────────────────────────────────────────────┘
```

**Auth flow:**
1. Admin logs in with email + password via Supabase Auth
2. If TOTP enrolled — MFA challenge required before access is granted
3. JWT token issued by Supabase; every backend request carries it as a `Bearer` token
4. Backend verifies the JWT against `SUPABASE_JWT_SECRET`; checks `users.admin_role` and `users.is_active`
5. Role-based guards enforce access on both the backend (FastAPI dependencies) and the frontend (React context)

---

## Features & Pages

| Route | Page | Description | Min Role |
|---|---|---|---|
| `/` | Dashboard | KPI tiles, live ride feed, quick actions | readonly |
| `/drivers` | Driver Approval | Approve / reject / suspend drivers, view documents | operations |
| `/customers` | Customers | Customer profiles, trip history, wallet, disputes | support |
| `/rides` | Rides | Live and historical ride table with map preview | readonly |
| `/payments` | Payment Verification | Review topup evidence documents | finance |
| `/finance` | Finance | Transaction ledger, revenue metrics | finance |
| `/wallet/:driverId` | Driver Wallet | Per-driver balance + transaction history | finance |
| `/disputes` | Disputes & Refunds | Open dispute queue, issue refunds / charge drivers | operations |
| `/safety` | Safety & SOS | Active SOS alerts, incident log | operations |
| `/support` | Support Tickets | Ticket queue + threaded chat per ticket | support |
| `/notifications` | Notifications | Compose & send targeted push notifications | operations |
| `/pricing` | Pricing Engine | Base fare, per-km/min rates, surge config | super_admin |
| `/cancellation-analytics` | Cancellation Analytics | Cancellation rate trends by reason | readonly |
| `/audit` | Audit Log | Admin action trail, data privacy requests | super_admin |
| `/system` | System Config | Feature flags, app config toggles | super_admin |
| `/admin-users` | Admin Users | Create/edit admins, IP allowlist, session audit | super_admin |

---

## Backend API Routers

All routes are prefixed with `/api/v1`.

| Router prefix | Service | Endpoints |
|---|---|---|
| `/wallet` | `services/wallet/` | Balance, transactions, adjustments |
| `/drivers` | `services/drivers/` | List, detail, approve, reject, suspend, trips, earnings, ratings |
| `/rides` | `services/rides/` | List, detail, live map |
| `/customers` | `services/customers/` | List, detail, trips, payments, saved places, emergency contacts, activity |
| `/sos` | `services/sos/` | Active alerts, incident log |
| `/config` | `services/config/` | App config toggles CRUD |
| `/analytics` | `services/analytics/` | Dashboard metrics, cancellation rates |
| `/disputes` | `services/disputes/` | List disputes, refund, charge driver, dismiss, escalate |
| `/payments` | `services/payments/` | Payment request list, approve, reject |
| `/notifications` | `services/notifications/` | Send targeted push, notification history |
| `/pricing` | `services/pricing/` | Get/update pricing rules |
| `/support` | `services/support/` | Ticket list, thread messages, reply |
| `/audit` | `services/audit/` | Audit log list, export CSV |
| `/admin/mgmt` | `services/admin_mgmt/` | Admin CRUD, 2FA, IP allowlist, sessions |

Interactive Swagger docs available at **`http://localhost:8000/docs`** when the backend is running.

---

## Role-Based Access Control

Five roles, strictly hierarchical:

```
super_admin  >  operations  >  finance  >  support  >  readonly
```

| Role | Access |
|---|---|
| `super_admin` | Full access to every page and API endpoint, including admin user management, pricing, audit log, and system config |
| `operations` | Drivers, rides, disputes, safety, notifications |
| `finance` | Payment verification, finance ledger, wallet views |
| `support` | Customers, support tickets |
| `readonly` | Dashboard, rides (read-only) |

**How it works:**
- Roles are stored in `users.admin_role` in the database — never chosen at login
- After successful auth, the frontend calls `GET /api/v1/admin/mgmt/role` to resolve the current admin's role
- Sidebar nav items are filtered client-side by `canAccess(requiredRole)`
- Every backend route uses a `require_role(...)` FastAPI dependency for server-side enforcement
- `super_admin` bypasses all role checks automatically

**Session timeout:** 30 minutes of inactivity automatically signs the admin out and redirects to `/login`.

---

## Project Structure

```
admin_portal/
├── src/                            # Frontend source
│   ├── components/
│   │   ├── AdminLayout.tsx         # Sidebar, header, session timer
│   │   ├── Badge.tsx               # Status badges
│   │   ├── Button.tsx              # Button variants
│   │   ├── Card.tsx                # Content cards
│   │   ├── DocumentPreview.tsx     # PDF/image viewer
│   │   ├── LiveMap.tsx             # Google Maps embed
│   │   ├── Modal.tsx               # Confirmation modals
│   │   ├── Table.tsx               # Data table with row click
│   │   └── index.ts
│   ├── context/
│   │   └── AuthContext.tsx         # Auth state, role, 30-min timeout
│   ├── lib/
│   │   └── supabase.ts             # Supabase client singleton
│   ├── pages/
│   │   ├── AdminUsersView.tsx
│   │   ├── AuditView.tsx
│   │   ├── CancellationAnalytics.tsx
│   │   ├── CustomersView.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DisputesView.tsx
│   │   ├── DriverApproval.tsx
│   │   ├── FinanceView.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotificationsView.tsx
│   │   ├── PaymentVerification.tsx
│   │   ├── PricingView.tsx
│   │   ├── RidesView.tsx
│   │   ├── SafetyView.tsx
│   │   ├── SupportView.tsx
│   │   ├── SystemView.tsx
│   │   ├── WalletView.tsx
│   │   └── index.ts
│   ├── services/
│   │   └── supabaseService.ts      # All API calls + TypeScript types
│   ├── App.tsx                     # Router + RequireAuth guard
│   ├── index.css                   # Tailwind base + custom styles
│   └── main.tsx                    # React entry point
│
├── backend/                        # FastAPI backend
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings (reads .env)
│   │   │   ├── dependencies.py     # require_admin, require_role()
│   │   │   └── supabase.py         # Supabase client singletons
│   │   ├── services/               # One subdirectory per domain
│   │   │   ├── admin_mgmt/
│   │   │   ├── analytics/
│   │   │   ├── audit/
│   │   │   ├── config/
│   │   │   ├── customers/
│   │   │   ├── disputes/
│   │   │   ├── drivers/
│   │   │   ├── notifications/
│   │   │   ├── payments/
│   │   │   ├── pricing/
│   │   │   ├── rides/
│   │   │   ├── sos/
│   │   │   ├── support/
│   │   │   └── wallet/
│   │   └── main.py                 # App factory + router registration
│   ├── requirements.txt
│   └── .env                        # Backend secrets (not committed)
│
├── .env                            # Frontend env (not committed)
├── .env.example                    # Template — safe to commit
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

| Tool | Min Version | Notes |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | Bundled with Node |
| Python | 3.11 | 3.12/3.13 OK — 3.14 is NOT supported (pydantic-core limitation) |
| Git | any | — |

You also need:
- A **Supabase project** with the AlboTaxi schema applied
- A **Google Maps API key** (for map components)
- A **Firebase project** (for push notifications)

---

### Frontend Setup

```bash
# 1. Clone the repo
git clone https://github.com/albotech405/admin_portal.git
cd admin_portal

# 2. Install dependencies
npm install

# 3. Create your .env from the template
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

---

### Backend Setup

```bash
cd backend

# Create a Python 3.11 virtual environment
# Windows (using py launcher):
py -3.11 -m venv venv

# macOS / Linux:
python3.11 -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create backend/.env
# Copy the template and fill in your secrets (see Environment Variables section)
```

---

### Database Setup SQL

Run the following in your Supabase project's **SQL Editor**. All statements are additive and will not modify or drop existing data.

```sql
-- Add admin columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_role TEXT
    CHECK (admin_role IN ('super_admin','operations','finance','support','readonly')),
  ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE;

-- Admin session audit table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE
);

-- IP allowlist table
CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr        TEXT        NOT NULL UNIQUE,
  note        TEXT,
  created_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security (backend uses service key which bypasses RLS)
ALTER TABLE admin_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_sessions"  ON admin_sessions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_allowlist" ON admin_ip_allowlist
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed your first super_admin account
-- Replace the email with your Supabase auth account email
UPDATE users
SET admin_role = 'super_admin', is_active = TRUE
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin@example.com'
);
```

---

## Environment Variables

### Frontend — `.env` (repo root)

```env
# Supabase project credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# FastAPI backend URL
VITE_BACKEND_URL=http://localhost:8000
```

### Backend — `backend/.env`

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# PostgreSQL direct connection
DATABASE_URL=postgresql://postgres.your-project-id:password@aws-region.pooler.supabase.com:6543/postgres

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_PLACE_API_KEY=your-google-maps-api-key
GOOGLE_DIRECTIONS_API_KEY=your-google-maps-api-key
GOOGLE_GEOLOCATION_API_KEY=your-google-maps-api-key

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id

# CORS — comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-production-domain.com

# Backend public URL
ALBO_API_BASE_URL=https://your-backend.onrender.com
```

> **Where to find Supabase credentials:**
> Supabase Dashboard → Project Settings → API
> - `SUPABASE_URL` = Project URL
> - `SUPABASE_KEY` = `anon` public key
> - `SUPABASE_SERVICE_KEY` = `service_role` secret key
> - `SUPABASE_JWT_SECRET` = JWT Settings → JWT Secret

---

## Running Locally

Open two terminals from the repo root.

**Terminal 1 — Backend**

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Backend: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

**Terminal 2 — Frontend**

```bash
npm run dev
```

- Frontend: `http://localhost:3000`

**Logging in:**
1. Open `http://localhost:3000` — redirects to `/login`
2. Enter your Supabase auth email and password
3. If TOTP is enrolled — enter your authenticator code
4. Dashboard loads based on your assigned `admin_role`

> Accounts without an `admin_role` set in the database are denied access with a 403 error.

---

## Deployment

### Backend (Render or any Python host)

1. Add all `backend/.env` key-value pairs as environment variables on your hosting platform
2. Set the start command:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Set Python version to **3.11** explicitly
4. Add your production frontend URL to `ALLOWED_ORIGINS`

### Frontend (Vercel or Netlify)

1. Set all `VITE_*` environment variables in the platform dashboard
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set `VITE_BACKEND_URL` to your live backend URL

---

## API Reference

Every request must include:
```
Authorization: Bearer <supabase-jwt-token>
```

### Health Check
```
GET /health
→ { "status": "ok" }
```

### Admin Management — `/api/v1/admin/mgmt`

| Method | Path | Description | Min Role |
|---|---|---|---|
| GET | `/role` | Get current admin's role & profile | any admin |
| POST | `/me/record-login` | Record login + check IP allowlist | any admin |
| POST | `/me/invalidate-session` | Invalidate current session | any admin |
| GET | `/me/2fa/status` | Check if 2FA is enabled | any admin |
| POST | `/me/2fa/enable` | Enable 2FA flag | any admin |
| POST | `/me/2fa/disable` | Disable 2FA flag | any admin |
| GET | `/users` | List all admin accounts | super_admin |
| POST | `/users` | Create new admin account | super_admin |
| PATCH | `/users/{id}` | Update admin role/name | super_admin |
| DELETE | `/users/{id}` | Disable admin account | super_admin |
| GET | `/ip-allowlist` | List IP allowlist entries | super_admin |
| POST | `/ip-allowlist` | Add CIDR to allowlist | super_admin |
| DELETE | `/ip-allowlist/{id}` | Remove CIDR entry | super_admin |
| GET | `/sessions` | View all admin sessions | super_admin |

### Drivers — `/api/v1/drivers`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List drivers (filter by status) |
| GET | `/{id}` | Driver detail + documents |
| POST | `/{id}/approve` | Approve driver |
| POST | `/{id}/reject` | Reject with reason |
| POST | `/{id}/suspend` | Suspend driver |
| GET | `/{id}/trips` | Driver trip history |
| GET | `/{id}/earnings` | Earnings + wallet transactions |
| GET | `/{id}/ratings` | Customer ratings |

### Customers — `/api/v1/customers`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List customers |
| GET | `/{id}` | Customer profile |
| GET | `/{id}/trips` | Trip history |
| GET | `/{id}/payments` | Payment history |
| GET | `/{id}/saved-addresses` | Saved places |
| GET | `/{id}/emergency-contacts` | Emergency contacts |

### Disputes — `/api/v1/disputes`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List disputes (filter by status) |
| POST | `/{ride_id}/refund` | Mark as refunded |
| POST | `/{ride_id}/charge-driver` | Deduct driver fee |
| POST | `/{ride_id}/dismiss` | Dismiss dispute |
| POST | `/{ride_id}/escalate` | Escalate to super admin |

Full interactive documentation is available at `http://localhost:8000/docs`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test locally (frontend + backend)
4. Open a pull request against `main`

Commit message format:
```
feat: add cancellation analytics chart
fix: correct CDF formatting on wallet view
chore: update pydantic to 2.9.2
```

---

## License

Copyright © 2026 AlboTaxi. All rights reserved.

---

*Built for the AlboTaxi platform — Kinshasa, DRC*
