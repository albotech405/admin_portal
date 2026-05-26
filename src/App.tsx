import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AdminLayout } from './components'
import { AuthProvider } from './context/AuthContext'
import {
  Dashboard,
  PaymentVerification,
  DriverApproval,
  WalletView,
  RidesView,
  CustomersView,
  SupportView,
  NotificationsView,
  FinanceView,
  SafetyView,
  SystemView,
  AuditView,
  AdminUsersView,
  DisputesView,
  CancellationAnalyticsView,
  PricingView,
  OperationsView,
} from './pages'

function App() {
  return (
    <AuthProvider>
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomersView />} />
          <Route path="/drivers" element={<DriverApproval />} />
          <Route path="/rides" element={<RidesView />} />
          <Route path="/payments" element={<PaymentVerification />} />
          <Route path="/finance" element={<FinanceView />} />
          <Route path="/support" element={<SupportView />} />
          <Route path="/notifications" element={<NotificationsView />} />
          <Route path="/safety" element={<SafetyView />} />
          <Route path="/system" element={<SystemView />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/pricing" element={<PricingView />} />
          <Route path="/disputes" element={<DisputesView />} />
          <Route path="/admin-users" element={<AdminUsersView />} />
          <Route path="/cancellations" element={<CancellationAnalyticsView />} />
          <Route path="/operations" element={<OperationsView />} />
          <Route path="/wallet/:driverId" element={<WalletView />} />
        </Route>
      </Routes>
    </Router>
    </AuthProvider>
  )
}

export default App
