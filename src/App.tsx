import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom'
import { AdminLayout } from './components'
import { AuthProvider, useAuth } from './context/AuthContext'
import { canAccessAdminPath, getDefaultAdminPath } from './lib/adminAccess'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const PaymentVerification = lazy(() => import('./pages/PaymentVerification').then((module) => ({ default: module.PaymentVerification })))
const DriverApproval = lazy(() => import('./pages/DriverApproval').then((module) => ({ default: module.DriverApproval })))
const WalletView = lazy(() => import('./pages/WalletView').then((module) => ({ default: module.WalletView })))
const RidesView = lazy(() => import('./pages/RidesView').then((module) => ({ default: module.RidesView })))
const CustomersView = lazy(() => import('./pages/CustomersView').then((module) => ({ default: module.CustomersView })))
const SupportView = lazy(() => import('./pages/SupportView').then((module) => ({ default: module.SupportView })))
const NotificationsView = lazy(() => import('./pages/NotificationsView').then((module) => ({ default: module.NotificationsView })))
const FinanceView = lazy(() => import('./pages/FinanceView').then((module) => ({ default: module.FinanceView })))
const SafetyView = lazy(() => import('./pages/SafetyView').then((module) => ({ default: module.SafetyView })))
const SystemView = lazy(() => import('./pages/SystemView').then((module) => ({ default: module.SystemView })))
const AuditView = lazy(() => import('./pages/AuditView').then((module) => ({ default: module.AuditView })))
const AdminUsersView = lazy(() => import('./pages/AdminUsersView').then((module) => ({ default: module.AdminUsersView })))
const DisputesView = lazy(() => import('./pages/DisputesView').then((module) => ({ default: module.DisputesView })))
const CancellationAnalyticsView = lazy(() => import('./pages/CancellationAnalytics').then((module) => ({ default: module.CancellationAnalyticsView })))
const PricingView = lazy(() => import('./pages/PricingView').then((module) => ({ default: module.PricingView })))
const OperationsView = lazy(() => import('./pages/OperationsView').then((module) => ({ default: module.OperationsView })))

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-5 text-sm font-medium text-slate-500 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm">
      Loading workspace…
    </div>
  </div>
)

type GuardedRouteProps = {
  path: string
  children: React.ReactElement
}

function HomeRoute() {
  const { user } = useAuth()

  if (user?.admin_role === 'operations') {
    return <Navigate to="/operations" replace />
  }

  return <Dashboard />
}

function GuardedRoute({ path, children }: GuardedRouteProps) {
  const { user } = useAuth()

  if (!user) return children

  if (canAccessAdminPath(user.admin_role, path)) {
    return children
  }

  return <Navigate to={getDefaultAdminPath(user.admin_role)} replace />
}

function App() {
  return (
    <AuthProvider>
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/customers" element={<GuardedRoute path="/customers"><CustomersView /></GuardedRoute>} />
            <Route path="/drivers" element={<GuardedRoute path="/drivers"><DriverApproval /></GuardedRoute>} />
            <Route path="/rides" element={<GuardedRoute path="/rides"><RidesView /></GuardedRoute>} />
            <Route path="/rides/:rideId" element={<GuardedRoute path="/rides"><RidesView /></GuardedRoute>} />
            <Route path="/payments" element={<GuardedRoute path="/payments"><PaymentVerification /></GuardedRoute>} />
            <Route path="/finance" element={<GuardedRoute path="/finance"><FinanceView /></GuardedRoute>} />
            <Route path="/support" element={<GuardedRoute path="/support"><SupportView /></GuardedRoute>} />
            <Route path="/notifications" element={<GuardedRoute path="/notifications"><NotificationsView /></GuardedRoute>} />
            <Route path="/safety" element={<GuardedRoute path="/safety"><SafetyView /></GuardedRoute>} />
            <Route path="/system" element={<GuardedRoute path="/system"><SystemView /></GuardedRoute>} />
            <Route path="/audit" element={<GuardedRoute path="/audit"><AuditView /></GuardedRoute>} />
            <Route path="/pricing" element={<GuardedRoute path="/pricing"><PricingView /></GuardedRoute>} />
            <Route path="/disputes" element={<GuardedRoute path="/disputes"><DisputesView /></GuardedRoute>} />
            <Route path="/admin-users" element={<GuardedRoute path="/admin-users"><AdminUsersView /></GuardedRoute>} />
            <Route path="/cancellations" element={<GuardedRoute path="/cancellations"><CancellationAnalyticsView /></GuardedRoute>} />
            <Route path="/operations" element={<GuardedRoute path="/operations"><OperationsView /></GuardedRoute>} />
            <Route path="/wallet/:driverId" element={<GuardedRoute path="/wallet"><WalletView /></GuardedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
    </AuthProvider>
  )
}

export default App
