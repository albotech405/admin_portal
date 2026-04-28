import React, { useState, useEffect } from 'react'
import { Card, Button } from '../components'
import { supabaseService, DashboardMetrics } from '../services/supabaseService'
import { useNavigate } from 'react-router-dom'

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadMetrics()
    // Poll for updates every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getDashboardMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard metrics')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the AlboTax admin portal</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500 text-lg">Loading dashboard...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Payments */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-full -mr-8 -mt-8"></div>
              <div className="relative z-10">
                <p className="text-gray-600 text-sm">Pending Payments</p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.pending_payments_count}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => navigate('/payments')}
                >
                  Review Now
                </Button>
              </div>
            </Card>

            {/* Pending Drivers */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-100 rounded-full -mr-8 -mt-8"></div>
              <div className="relative z-10">
                <p className="text-gray-600 text-sm">Pending Drivers</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {metrics.pending_drivers_count}
                </p>
                <Button
                  variant="warning"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => navigate('/drivers')}
                >
                  Review Now
                </Button>
              </div>
            </Card>

            {/* Active Drivers */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-100 rounded-full -mr-8 -mt-8"></div>
              <div className="relative z-10">
                <p className="text-gray-600 text-sm">Active Drivers</p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.active_drivers_count}
                </p>
                <p className="text-gray-500 text-xs mt-4">Online now</p>
              </div>
            </Card>

            {/* Active Rides */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full -mr-8 -mt-8"></div>
              <div className="relative z-10">
                <p className="text-gray-600 text-sm">Active Rides</p>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics.active_rides_count}
                </p>
                <p className="text-gray-500 text-xs mt-4">In progress</p>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => navigate('/payments')}
              >
                Review Payment Requests
              </Button>
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => navigate('/drivers')}
              >
                Review Driver Applications
              </Button>
            </div>
          </Card>

          {/* Action Required Section */}
          {(metrics.pending_payments_count > 0 ||
            metrics.pending_drivers_count > 0) && (
            <Card className="border-l-4 border-l-orange-500 bg-orange-50">
              <h2 className="text-lg font-semibold text-orange-900 mb-3">
                ⚠️ Action Required
              </h2>
              <ul className="space-y-2 text-sm text-orange-800">
                {metrics.pending_payments_count > 0 && (
                  <li>
                    • {metrics.pending_payments_count} payment request
                    {metrics.pending_payments_count > 1 ? 's' : ''} awaiting
                    approval
                  </li>
                )}
                {metrics.pending_drivers_count > 0 && (
                  <li>
                    • {metrics.pending_drivers_count} driver application
                    {metrics.pending_drivers_count > 1 ? 's' : ''} awaiting
                    review
                  </li>
                )}
              </ul>
            </Card>
          )}

          <div className="text-right text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
