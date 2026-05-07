import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AdminLayout } from './components'
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
} from './pages'

function App() {
  return (
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
          <Route path="/safety" element={<SafetyView />} />
          <Route path="/system" element={<SystemView />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/wallet/:driverId" element={<WalletView />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
