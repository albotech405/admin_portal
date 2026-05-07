import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Table } from '../components'
import { Ride, supabaseService } from '../services/supabaseService'

export const RidesView: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('in_progress')

  useEffect(() => {
    loadRides()
  }, [filterStatus])

  const loadRides = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getRides(
        filterStatus !== 'all' ? filterStatus : undefined
      )
      setRides(data)
      setError(null)
    } catch (err) {
      setError('Failed to load rides')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    all: 'All',
    pending: 'Pending',
    driver_en_route: 'En Route',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  const tableColumns = [
    { key: 'customer_phone', label: 'Customer' },
    { key: 'driver_phone', label: 'Driver' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'destination', label: 'Destination' },
    { key: 'price', label: 'Price', width: 'w-24' },
    { key: 'status', label: 'Status', width: 'w-28' },
    { key: 'created_at', label: 'Date', width: 'w-32' },
  ]

  const tableData = rides.map((ride: Ride) => ({
    ...ride,
    customer_phone: ride.customer_phone || ride.customer_id.slice(0, 8) + '…',
    driver_phone: ride.driver_phone || ride.driver_id.slice(0, 8) + '…',
    pickup: ride.picking_point?.name || 'N/A',
    destination: ride.destination?.name || 'N/A',
    price: ride.price.toFixed(2),
    created_at: new Date(ride.created_at).toLocaleDateString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rides</h1>
        <p className="text-gray-600 mt-2">Monitor and review all rides on the platform</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusLabels).map(([value, label]) => (
              <Button
                key={value}
                variant={filterStatus === value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterStatus(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={loadRides}>
            Refresh
          </Button>
        </div>

        {!isLoading && (
          <p className="text-sm text-gray-500 mb-3">{rides.length} ride(s) found</p>
        )}

        <Table
          columns={tableColumns}
          data={tableData}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
}
