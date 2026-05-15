import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from './components'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import {
  Dashboard,
  PaymentVerification,
  DriverApproval,
  WalletView,
  RidesView,
  CustomersView,
  SupportView,
  FinanceView,
  SafetyView,
  SystemView,
  AuditView,
  CancellationAnalyticsView,
  DisputesView,
  NotificationsView,
  PricingView,
} from './pages'
import { AdminUsersView } from './pages/AdminUsersView'

// ── Auth guard ────────────────────────────────────────────────────────────────

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Inner app (needs AuthContext) ─────────────────────────────────────────────

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected — all wrapped in AdminLayout */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<CustomersView />} />
        <Route path="/drivers" element={<DriverApproval />} />
        <Route path="/rides" element={<RidesView />} />
        <Route path="/payments" element={<PaymentVerification />} />
        <Route path="/finance" element={<FinanceView />} />
        <Route path="/support" element={<SupportView />} />
        <Route path="/safety" element={<SafetyView />} />
        <Route path="/system" element={<SystemView />} />
        <Route path="/audit" element={<AuditView />} />
        <Route path="/cancellations" element={<CancellationAnalyticsView />} />
        <Route path="/disputes" element={<DisputesView />} />
        <Route path="/notifications" element={<NotificationsView />} />
        <Route path="/pricing" element={<PricingView />} />
        <Route path="/wallet/:driverId" element={<WalletView />} />
        <Route path="/admin-users" element={<AdminUsersView />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
