# inDrive Admin Portal

A modern, fast, and secure React admin panel for managing ride-sharing payments and driver approvals. Built with React 18, TypeScript, Tailwind CSS, and Vite.

## 🎯 Features

### Core Functionality

- **Payment Verification Screen** - Review and approve/reject pending payment requests with document preview
- **Driver Approval Screen** - Manage driver applications with document verification and wallet info
- **Wallet View** - Track driver wallet balance and transaction history
- **Admin Dashboard** - Real-time metrics on pending actions and active operations

### Technical Highlights

- ⚡ **Lightning Fast** - Built with Vite for instant HMR and optimized builds
- 🎨 **Beautiful UI** - Tailwind CSS with responsive design for desktop and tablet
- 🔐 **Secure** - TypeScript for type safety, JWT authentication with Supabase
- 📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- 🔄 **Real-time Updates** - Live status updates with polling mechanism
- ⏱️ **Minimal Clicks** - Maximum 2 clicks to complete any action

## 📋 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   ├── Badge.tsx
│   ├── DocumentPreview.tsx
│   └── index.ts
├── pages/              # Page components
│   ├── Dashboard.tsx
│   ├── PaymentVerification.tsx
│   ├── DriverApproval.tsx
│   ├── WalletView.tsx
│   └── index.ts
├── services/           # API integration
│   └── supabaseService.ts
├── App.tsx            # Main app with routing
├── main.tsx           # Entry point
├── index.css          # Global styles
└── vite-env.d.ts     # Vite environment types
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- Supabase account with backend setup
- Admin JWT token for API authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd admin_portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_ADMIN_TOKEN=your-admin-jwt-token
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run preview
```

## 🎨 UI/UX Design

### Color Coding

- 🟢 **Green** - Approved/Success status
- 🔴 **Red** - Rejected/Danger actions
- 🟡 **Yellow** - Pending/Warning status
- 🔵 **Blue** - Primary actions and links

### Components

#### Button

```tsx
<Button variant="success" onClick={handleApprove}>
  ✓ Approve
</Button>

// Available variants: primary, success, danger, warning, secondary
// Available sizes: sm, md, lg
```

#### Card

```tsx
<Card>
  <h2>Title</h2>
  <p>Content</p>
</Card>
```

#### Modal

```tsx
<Modal
  isOpen={isOpen}
  title="Confirm Action"
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirm}
  confirmText="Confirm"
>
  Confirmation message here
</Modal>
```

#### Table

```tsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]}
  data={data}
  onRowClick={(row) => console.log(row)}
  isLoading={false}
/>
```

#### Badge

```tsx
<Badge status="pending">Pending</Badge>
// Available statuses: pending, approved, rejected, suspended
```

#### DocumentPreview

```tsx
<DocumentPreview
  fileUrl="https://example.com/file.pdf"
  fileType="pdf"
  fileName="Payment Proof"
/>
// fileType: 'image' | 'pdf'
```

## 🔌 API Integration

The app communicates with Supabase backend via RPC functions and REST API.

### Supabase Service Methods

#### Payment Requests

```typescript
// Get pending payment requests
const payments = await supabaseService.getPaymentRequests('pending');

// Get single payment detail
const payment = await supabaseService.getPaymentRequestDetail(id);

// Approve payment
await supabaseService.approvePaymentRequest(requestId, adminId);

// Reject payment
await supabaseService.rejectPaymentRequest(requestId, adminId, reason);
```

#### Drivers

```typescript
// Get drivers (optionally filtered by status)
const drivers = await supabaseService.getDrivers('pending');

// Get driver detail
const driver = await supabaseService.getDriverDetail(id);

// Approve driver
await supabaseService.approveDriver(driverId);

// Reject driver
await supabaseService.rejectDriver(driverId, reason);

// Suspend driver
await supabaseService.suspendDriver(driverId);
```

#### Wallet

```typescript
// Get wallet balance
const balance = await supabaseService.getWalletBalance(driverId);

// Get transaction history
const transactions = await supabaseService.getWalletTransactions(driverId);
```

#### Dashboard

```typescript
// Get dashboard metrics
const metrics = await supabaseService.getDashboardMetrics();
// Returns: { pending_payments_count, pending_drivers_count, active_drivers_count, active_rides_count }
```

## 📄 Page Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Overview with metrics and quick actions |
| `/payments` | PaymentVerification | List and detail view for payment requests |
| `/drivers` | DriverApproval | List and detail view for driver applications |
| `/wallet/:driverId` | WalletView | Driver wallet balance and transaction history |

## ⚙️ Configuration

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_ADMIN_TOKEN=your-jwt-token-here
```

### Tailwind CSS Configuration

The project uses Tailwind CSS with custom color extensions:
- `success: #10b981` (Green)
- `error: #ef4444` (Red)
- `warning: #eab308` (Yellow)

## 📦 Dependencies

### Core
- `react@^18.2.0` - UI framework
- `react-dom@^18.2.0` - React DOM renderer
- `react-router-dom@^6.20.0` - Client-side routing
- `axios@^1.6.0` - HTTP client
- `lucide-react@^0.294.0` - Icon library

### Build & Dev
- `vite@^5.0.0` - Build tool
- `tailwindcss@^3.3.0` - CSS framework
- `typescript@^5.3.0` - Type checking

## 🛡️ Error Handling

All pages include comprehensive error handling:

```typescript
try {
  // API call
  const data = await supabaseService.getPayments();
  setData(data);
} catch (err) {
  setError('Failed to load data');
  console.error(err);
} finally {
  setIsLoading(false);
}
```

Error messages are displayed in red alert boxes at the top of each page.

## 📱 Responsive Design

The UI is fully responsive using Tailwind's breakpoints:
- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

## 🔐 Security Best Practices

1. **JWT Authentication** - Admin token stored in environment variables
2. **Type Safety** - Full TypeScript coverage prevents runtime errors
3. **API Validation** - All API responses are validated against types
4. **Environment Secrets** - Sensitive data never committed to git
5. **CORS** - Configured at Supabase backend level

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
npm run dev -- --port 3001
```

### Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### Vite environment variables not loading
Make sure `.env` file is in root directory and restart dev server.

### API calls failing
- Verify Supabase URL and token in `.env`
- Check CORS settings in Supabase console
- Ensure admin token has required permissions

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Router](https://reactrouter.com/)
- [Supabase Documentation](https://supabase.com/docs)

## 📝 Development Workflow

1. Create a new branch: `git checkout -b feature/feature-name`
2. Make your changes and test locally
3. Commit with clear messages: `git commit -m "feat: add new feature"`
4. Push to branch: `git push origin feature/feature-name`
5. Create a Pull Request

## 📄 License

Copyright © 2026. All rights reserved.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review existing issues on GitHub
3. Create a new issue with detailed description

---

**Built with ❤️ for the inDrive platform**
