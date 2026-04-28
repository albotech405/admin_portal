import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import {
  Dashboard,
  PaymentVerification,
  DriverApproval,
  WalletView,
} from './pages'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">albo taxi</span>
              <span className="text-sm text-gray-600">Admin Portal</span>
            </Link>
            <div className="flex gap-4">
              <Link
                to="/"
                className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                to="/payments"
                className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm"
              >
                Payments
              </Link>
              <Link
                to="/drivers"
                className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium text-sm"
              >
                Drivers
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/payments" element={<PaymentVerification />} />
            <Route path="/drivers" element={<DriverApproval />} />
            <Route path="/wallet/:driverId" element={<WalletView />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
            <p>
              inDrive Admin Portal v1.0 | © 2026 All Rights Reserved | Made with
              ❤️
            </p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
