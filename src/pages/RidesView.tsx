import React, { useEffect, useState, useRef, useCallback } from 'react'
import { supabaseService, Ride, RideDetailResponse, TripResponse, ActiveRideRequest, RideOfferHistory, ActiveTripItem, MarketplaceRequestItem, MarketplaceBidItem } from '../services/supabaseService'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api'

type TabType = 'active_rides' | 'ride_requests' | 'history'

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  driver_en_route: 'Driver En Route',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  driver_en_route: 'info',
  arrived: 'info',
  in_progress: 'success',
  completed: 'default',
  cancelled: 'danger',
}

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
}

const DEFAULT_CENTER = { lat: -4.4419, lng: 15.2663 } // Kinshasa, DRC
const MAP_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places']

export const RidesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('active_rides')
  const [rides, setRides] = useState<Ride[]>([])
  const [activeTrips, setActiveTrips] = useState<ActiveTripItem[]>([])
  const [requests, setRequests] = useState<ActiveRideRequest[]>([])
  const [history, setHistory] = useState<Ride[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<ActiveRideRequest | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedRide, setSelectedRide] = useState<RideDetailResponse | TripResponse | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [rideOffers, setRideOffers] = useState<RideOfferHistory | null>(null)
  const [isOfferLoading, setIsOfferLoading] = useState(false)
  const [showBatchCancelModal, setShowBatchCancelModal] = useState(false)
  const [batchCancelReason, setBatchCancelReason] = useState('')
  const [isBatchCancelling, setIsBatchCancelling] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const mapRef = useRef<google.maps.Map | null>(null)

  // Marketplace state
  const [marketplaceRequests, setMarketplaceRequests] = useState<MarketplaceRequestItem[]>([])
  const [selectedMarketplaceRequest, setSelectedMarketplaceRequest] = useState<MarketplaceRequestItem | null>(null)
  const [marketplaceInfoRequest, setMarketplaceInfoRequest] = useState<MarketplaceRequestItem | null>(null)
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(false)
  const marketplaceMapRef = useRef<google.maps.Map | null>(null)

  // Live Trip Intervention state
  const [showForceEndModal, setShowForceEndModal] = useState(false)
  const [forceEndReason, setForceEndReason] = useState('')
  const [forceEndRole, setForceEndRole] = useState<'super_admin' | 'operations_manager'>('operations_manager')
  const [isForceEnding, setIsForceEnding] = useState(false)
  const [showSendPushModal, setShowSendPushModal] = useState(false)
  const [pushTarget, setPushTarget] = useState<'customer' | 'driver'>('customer')
  const [pushTitle, setPushTitle] = useState('')
  const [pushMessage, setPushMessage] = useState('')
  const [isSendingPush, setIsSendingPush] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  })

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  // Fit map bounds to show both pickup and destination
  useEffect(() => {
    if (selectedRequest && mapRef.current && isLoaded) {
      const bounds = new google.maps.LatLngBounds()
      if (selectedRequest.picking_point?.latitude && selectedRequest.picking_point?.longitude) {
        bounds.extend({
          lat: selectedRequest.picking_point.latitude,
          lng: selectedRequest.picking_point.longitude,
        })
      }
      if (selectedRequest.destination?.latitude && selectedRequest.destination?.longitude) {
        bounds.extend({
          lat: selectedRequest.destination.latitude,
          lng: selectedRequest.destination.longitude,
        })
      }
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds)
      }
    }
  }, [selectedRequest, isLoaded])

  // Fit marketplace map bounds to show all request markers
  useEffect(() => {
    if (marketplaceMapRef.current && isLoaded && marketplaceRequests.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      let hasValidCoords = false
      marketplaceRequests.forEach((req) => {
        if (req.picking_point?.latitude && req.picking_point?.longitude) {
          bounds.extend({
            lat: req.picking_point.latitude,
            lng: req.picking_point.longitude,
          })
          hasValidCoords = true
        }
      })
      if (hasValidCoords) {
        marketplaceMapRef.current.fitBounds(bounds)
      }
    }
  }, [marketplaceRequests, isLoaded])

  const onMarketplaceMapLoad = useCallback((map: google.maps.Map) => {
    marketplaceMapRef.current = map
  }, [])

  // Auto-refresh for active rides and ride requests tabs (30s interval)
  useEffect(() => {
    if (activeTab === 'ride_requests') {
      const interval = setInterval(() => {
        loadRequests(true)
        loadMarketplaceData(true)
      }, 30000)
      return () => clearInterval(interval)
    }
    if (activeTab === 'active_rides') {
      const interval = setInterval(() => {
        loadActiveTrips()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'active_rides') {
      loadActiveTrips()
      loadRides()
    } else if (activeTab === 'ride_requests') {
      loadRequests()
      loadMarketplaceData()
    } else if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, statusFilter])

  const loadRides = async () => {
    setIsLoading(true)
    try {
      const data = await supabaseService.getRides(statusFilter || undefined)
      setRides(data)
    } catch (error) {
      console.error('Failed to load rides:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRequests = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await supabaseService.getActiveRideRequests()
      setRequests(data)
      setLastUpdated(new Date().toISOString())
    } catch (error) {
      console.error('Failed to load ride requests:', error)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const loadMarketplaceData = async (silent = false) => {
    if (!silent) setIsMarketplaceLoading(true)
    try {
      const data = await supabaseService.getMarketplaceData()
      setMarketplaceRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to load marketplace data:', error)
    } finally {
      if (!silent) setIsMarketplaceLoading(false)
    }
  }

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await supabaseService.getRideHistory()
      setHistory(data)
    } catch (error) {
      console.error('Failed to load ride history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadActiveTrips = async () => {
    try {
      const data = await supabaseService.getActiveTrips()
      setActiveTrips(data)
    } catch (error) {
      console.error('Failed to load active trips:', error)
    }
  }

  const handleForceEndTrip = async () => {
    if (!selectedRide || !forceEndReason.trim()) return
    setIsForceEnding(true)
    try {
      await supabaseService.forceEndTrip(selectedRide.id, forceEndReason, forceEndRole)
      setShowForceEndModal(false)
      setForceEndReason('')
      setSelectedRide(null)
      loadActiveTrips()
      loadRides()
    } catch (error) {
      console.error('Failed to force-end trip:', error)
    } finally {
      setIsForceEnding(false)
    }
  }

  const handleSendPush = async () => {
    if (!selectedRide || !pushTitle.trim() || !pushMessage.trim()) return
    setIsSendingPush(true)
    try {
      await supabaseService.sendPushToTrip(selectedRide.id, pushTarget, pushTitle, pushMessage)
      setShowSendPushModal(false)
      setPushTitle('')
      setPushMessage('')
    } catch (error) {
      console.error('Failed to send push notification:', error)
    } finally {
      setIsSendingPush(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!selectedRequest) return
    try {
      await supabaseService.cancelRideRequest(selectedRequest.id, cancelReason)
      setShowCancelModal(false)
      setSelectedRequest(null)
      setCancelReason('')
      loadRequests()
    } catch (error) {
      console.error('Failed to cancel ride request:', error)
    }
  }

  const handleBatchCancelStale = async () => {
    const staleRequests = requests.filter((r) => r.is_stale)
    if (staleRequests.length === 0) return

    setIsBatchCancelling(true)
    try {
      for (const req of staleRequests) {
        await supabaseService.cancelRideRequest(req.id, batchCancelReason || 'Batch cancel: stale request')
      }
      setShowBatchCancelModal(false)
      setBatchCancelReason('')
      setSelectedRequest(null)
      loadRequests()
    } catch (error) {
      console.error('Failed to batch cancel stale requests:', error)
    } finally {
      setIsBatchCancelling(false)
    }
  }

  const handleRideClick = async (ride: Ride) => {
    setIsDetailLoading(true)
    setRideOffers(null)
    try {
      if (ride.status === 'completed' || ride.status === 'cancelled') {
        try {
          const tripData = await supabaseService.getTripDetail(ride.id)
          setSelectedRide(tripData)
        } catch {
          const rideData = await supabaseService.getRideDetail(ride.id)
          setSelectedRide(rideData)
        }
      } else {
        const rideData = await supabaseService.getRideDetail(ride.id)
        setSelectedRide(rideData)
      }
    } catch (error) {
      console.error('Failed to load ride detail:', error)
    } finally {
      setIsDetailLoading(false)
    }

    // Load offer history in parallel
    setIsOfferLoading(true)
    try {
      const offers = await supabaseService.getRideOffers(ride.id)
      setRideOffers(offers)
    } catch (error) {
      console.error('Failed to load ride offers:', error)
    } finally {
      setIsOfferLoading(false)
    }
  }

  const getTimeSince = (createdAt: string): string => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ${diffMin % 60}m ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays}d ago`
  }

  const rideColumns = [
    { key: 'id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'price', label: 'Price' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date' },
  ]

  const historyColumns = [
    { key: 'id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'price', label: 'Price' },
    { key: 'distance_km', label: 'Distance' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date' },
  ]

  const requestColumns = [
    { key: 'id', label: 'ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'customer_phone', label: 'Phone' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price' },
    { key: 'bid_count', label: 'Bids' },
    { key: 'time_since', label: 'Created' },
    { key: 'status', label: 'Status' },
  ]

  const rideTableData = rides.map((ride: Ride) => ({
    ...ride,
    id: ride.id.slice(0, 8),
    customer_name: ride.customer_name || ride.customer_id?.slice(0, 8) || '-',
    driver_name: ride.driver_name || ride.driver_id?.slice(0, 8) || '-',
    price: ride.price != null ? `${ride.price.toLocaleString()} CDF` : '-',
    status: ride.status,
    created_at: ride.created_at ? new Date(ride.created_at).toLocaleDateString() : '-',
  }))

  const historyTableData = history.map((ride: Ride) => ({
    ...ride,
    id: ride.id.slice(0, 8),
    customer_name: ride.customer_name || ride.customer_id?.slice(0, 8) || '-',
    driver_name: ride.driver_name || ride.driver_id?.slice(0, 8) || '-',
    price: ride.price != null ? `${ride.price.toLocaleString()} CDF` : '-',
    distance_km: ride.distance_km != null ? `${ride.distance_km.toFixed(1)} km` : '-',
    status: ride.status,
    created_at: ride.created_at ? new Date(ride.created_at).toLocaleDateString() : '-',
  }))

  // Sort requests: stale first, then by created_at descending
  const sortedRequests = [...requests].sort((a, b) => {
    if (a.is_stale && !b.is_stale) return -1
    if (!a.is_stale && b.is_stale) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const requestTableData = sortedRequests.map((req) => ({
    ...req,
    id: req.id.slice(0, 8),
    price: req.price != null ? `${req.price.toLocaleString()} CDF` : '-',
    bid_count: String(req.bid_count ?? 0),
    time_since: getTimeSince(req.created_at),
    status: req.is_stale ? 'Stale' : (req.status || 'pending'),
    _is_stale: req.is_stale,
  }))

  const staleCount = requests.filter((r) => r.is_stale).length

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-'
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const isTripResponse = (r: any): r is TripResponse => {
    return 'customer_rating' in r || 'driver_rating' in r
  }

  const isRideDetailResponse = (r: any): r is RideDetailResponse => {
    return 'vehicle_snapshot' in r || 'arrived_at' in r
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Rides</h1>
          <p className="mt-1 text-sm text-brand-500">
            Monitor active rides, ride requests, and ride history
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            if (activeTab === 'active_rides') {
              loadActiveTrips()
              loadRides()
            } else if (activeTab === 'ride_requests') loadRequests()
            else loadHistory()
          }}
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-100 pb-2">
        {(['active_rides', 'ride_requests', 'history'] as TabType[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab(tab)
              setSelectedRide(null)
              setSelectedRequest(null)
            }}
          >
            {tab === 'active_rides'
              ? 'Active Rides'
              : tab === 'ride_requests'
              ? `Ride Requests${staleCount > 0 ? ` (${staleCount} stale)` : ''}`
              : 'History'}
          </Button>
        ))}
      </div>

      {/* Active Rides / History Tab */}
      {(activeTab === 'active_rides' || activeTab === 'history') && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* List */}
          <Card>
            {activeTab === 'active_rides' && (
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === '' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  All
                </Button>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={statusFilter === value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            <Table
              columns={activeTab === 'history' ? historyColumns : rideColumns}
              data={activeTab === 'history' ? historyTableData : rideTableData}
              isLoading={isLoading}
              onRowClick={(row: any) => {
                const fullRide = (activeTab === 'history' ? history : rides).find(
                  (r) => r.id.startsWith(row.id)
                )
                if (fullRide) handleRideClick(fullRide)
              }}
            />
          </Card>

          {/* Detail Panel */}
          <Card className="border-l-4 border-l-brand-500">
            {isDetailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : selectedRide ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-brand-900">
                    Ride Detail
                  </h3>
                  <Badge status={statusColors[selectedRide.status] || 'default'}>
                    {statusLabels[selectedRide.status] || selectedRide.status}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-brand-700">Timeline</h4>
                  <div className="space-y-3 text-sm">
                    {selectedRide.created_at && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-brand-400" />
                        <span className="text-brand-500">Requested</span>
                        <span className="ml-auto font-medium text-brand-900">{new Date(selectedRide.created_at).toLocaleString()}</span>
                      </div>
                    )}
                    {isRideDetailResponse(selectedRide) && selectedRide.arrived_at && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-brand-500">Arrived</span>
                        <span className="ml-auto font-medium text-brand-900">{new Date(selectedRide.arrived_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRide.started_at && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                        <span className="text-brand-500">Started</span>
                        <span className="ml-auto font-medium text-brand-900">{new Date(selectedRide.started_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRide.completed_at && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-brand-500">Completed</span>
                        <span className="ml-auto font-medium text-brand-900">{new Date(selectedRide.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {isRideDetailResponse(selectedRide) && selectedRide.cancelled_at && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                        <span className="text-brand-500">Cancelled</span>
                        <span className="ml-auto font-medium text-brand-900">{new Date(selectedRide.cancelled_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer & Driver Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-brand-100 p-3">
                    <h4 className="mb-2 text-sm font-medium text-brand-700">Customer</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-brand-900">
                        {selectedRide.customer_name || 'N/A'}
                      </p>
                      {'customer_phone' in selectedRide && selectedRide.customer_phone && (
                        <p className="text-brand-500">{selectedRide.customer_phone}</p>
                      )}
                      <p className="text-xs text-brand-400">ID: {selectedRide.customer_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-100 p-3">
                    <h4 className="mb-2 text-sm font-medium text-brand-700">Driver</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-brand-900">
                        {selectedRide.driver_name || 'N/A'}
                      </p>
                      {'driver_phone' in selectedRide && selectedRide.driver_phone && (
                        <p className="text-brand-500">{selectedRide.driver_phone}</p>
                      )}
                      <p className="text-xs text-brand-400">ID: {selectedRide.driver_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>

                {/* Route */}
                <div className="rounded-xl border border-brand-100 p-3">
                  <h4 className="mb-2 text-sm font-medium text-brand-700">Route</h4>
                  <div className="space-y-2 text-sm text-brand-600">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      <span className="font-medium">From:</span>{' '}
                      {selectedRide.picking_point?.name || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="font-medium">To:</span>{' '}
                      {selectedRide.destination?.name || 'N/A'}
                    </div>
                    {isRideDetailResponse(selectedRide) && selectedRide.stops && selectedRide.stops.length > 0 && (
                      <div className="ml-4 space-y-1">
                        <span className="font-medium">Stops:</span>
                        <ul className="ml-4 list-disc text-brand-400">
                          {selectedRide.stops.map((stop: any, i: number) => (
                            <li key={i}>{stop.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="rounded-xl border border-brand-100 p-3">
                  <h4 className="mb-2 text-sm font-medium text-brand-700">Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-brand-500">Fare</span>
                      <span className="font-medium text-brand-900">
                        {selectedRide.price != null ? `${selectedRide.price.toLocaleString()} CDF` : '-'}
                      </span>
                    </div>
                    {'platform_commission_amount' in selectedRide && selectedRide.platform_commission_amount != null && (
                      <div className="flex justify-between">
                        <span className="text-brand-500">Platform Commission</span>
                        <span className="font-medium text-red-600">
                          -{selectedRide.platform_commission_amount.toLocaleString()} CDF
                        </span>
                      </div>
                    )}
                    {selectedRide.distance_km != null && (
                      <div className="flex justify-between text-brand-400">
                        <span>Distance</span>
                        <span>{selectedRide.distance_km.toFixed(1)} km</span>
                      </div>
                    )}
                    {selectedRide.duration_minutes != null && (
                      <div className="flex justify-between text-brand-400">
                        <span>Duration</span>
                        <span>{formatDuration(selectedRide.duration_minutes)}</span>
                      </div>
                    )}
                    {selectedRide.category && (
                      <div className="flex justify-between text-brand-400">
                        <span>Category</span>
                        <span className="capitalize font-medium">{selectedRide.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ratings (for trips) */}
                {isTripResponse(selectedRide) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-brand-100 p-3">
                      <h4 className="mb-1 text-sm font-medium text-brand-700">Customer Rating</h4>
                      <p className="text-lg font-bold text-amber-500">
                        {selectedRide.customer_rating != null
                          ? `${'★'.repeat(Math.round(selectedRide.customer_rating))}${'☆'.repeat(5 - Math.round(selectedRide.customer_rating))}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-brand-100 p-3">
                      <h4 className="mb-1 text-sm font-medium text-brand-700">Driver Rating</h4>
                      <p className="text-lg font-bold text-amber-500">
                        {selectedRide.driver_rating != null
                          ? `${'★'.repeat(Math.round(selectedRide.driver_rating))}${'☆'.repeat(5 - Math.round(selectedRide.driver_rating))}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vehicle Snapshot */}
                {isRideDetailResponse(selectedRide) && selectedRide.vehicle_snapshot && (
                  <div className="rounded-xl border border-brand-100 p-3">
                    <h4 className="mb-2 text-sm font-medium text-brand-700">Vehicle</h4>
                    <div className="space-y-1 text-sm text-brand-600">
                      <p className="font-medium text-brand-900">{(selectedRide.vehicle_snapshot.make as string) || ''} {(selectedRide.vehicle_snapshot.model as string) || ''}</p>
                      <p>{(selectedRide.vehicle_snapshot.vehicle_type as string) || ''} · {(selectedRide.vehicle_snapshot.color as string) || ''}</p>
                      <p className="font-mono text-xs text-brand-400">{(selectedRide.vehicle_snapshot.license_plate as string) || ''}</p>
                    </div>
                  </div>
                )}

                {/* Cancellation Info */}
                {isRideDetailResponse(selectedRide) && selectedRide.cancellation_reason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <h4 className="mb-1 text-sm font-medium text-red-700">Cancellation Reason</h4>
                    <p className="text-sm text-red-600">{selectedRide.cancellation_reason}</p>
                    {selectedRide.cancelled_by && (
                      <p className="mt-1 text-xs text-red-500">Cancelled by: {selectedRide.cancelled_by}</p>
                    )}
                  </div>
                )}

                {/* Reason code/text for cancelled rides */}
                {isRideDetailResponse(selectedRide) && selectedRide.reason_code && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <h4 className="mb-1 text-sm font-medium text-amber-700">Reason Code</h4>
                    <p className="text-sm text-amber-600">
                      {selectedRide.reason_code}{selectedRide.reason_text ? `: ${selectedRide.reason_text}` : ''}
                    </p>
                  </div>
                )}

                {/* Offer History — shows which drivers updated their offers */}
                <div className="rounded-xl border border-brand-100 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-brand-700">Offer History</h4>
                    {isOfferLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    ) : rideOffers ? (
                      <Badge status={rideOffers.update_count > 0 ? 'warning' : 'default'}>
                        {rideOffers.update_count} update{rideOffers.update_count !== 1 ? 's' : ''}
                      </Badge>
                    ) : null}
                  </div>

                  {isOfferLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    </div>
                  ) : rideOffers && rideOffers.offers.length > 0 ? (
                    <div className="space-y-2">
                      {/* Original offer */}
                      <div className="rounded-lg border border-green-100 bg-green-50 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-green-700">Original Offer</span>
                          <span className="font-mono font-bold text-green-800">
                            {rideOffers.original_price?.toLocaleString()} CDF
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-green-600">
                          {rideOffers.offers[0]?.driver_name || 'Unknown driver'}
                        </p>
                      </div>

                      {/* Updates (if any) */}
                      {rideOffers.offers.slice(1).map((offer, idx) => (
                        <div key={offer.id} className="rounded-lg border border-amber-100 bg-amber-50 p-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-amber-700">Update #{idx + 1}</span>
                            <span className="font-mono font-bold text-amber-800">
                              {(offer.price ?? 0).toLocaleString()} CDF
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-xs text-amber-600">
                            <span>{offer.driver_name || 'Unknown driver'}</span>
                            <span>{new Date(offer.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}

                      {/* Final price */}
                      {rideOffers.final_price != null && (
                        <div className="rounded-lg border border-brand-100 bg-brand-50 p-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-brand-700">Final Accepted Price</span>
                            <span className="font-mono font-bold text-brand-800">
                              {rideOffers.final_price.toLocaleString()} CDF
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : rideOffers ? (
                    <p className="text-xs text-brand-400">No offer data available for this ride.</p>
                  ) : (
                    <p className="text-xs text-brand-400">Click a ride to load offer history.</p>
                  )}
                </div>

                {/* Live Trip Intervention — only for active/in-progress rides */}
                {selectedRide.status !== 'completed' && selectedRide.status !== 'cancelled' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <h4 className="mb-3 text-sm font-semibold text-red-700">Live Trip Intervention</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setForceEndReason('')
                          setForceEndRole('operations_manager')
                          setShowForceEndModal(true)
                        }}
                      >
                        ⚠ Force End Trip
                      </Button>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => {
                          setPushTarget('customer')
                          setPushTitle('')
                          setPushMessage('')
                          setShowSendPushModal(true)
                        }}
                      >
                        📨 Send Push
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-brand-400">
                <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">Select a ride to view details</p>
                <p className="mt-1 text-sm">Click on any ride row to see its full information</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Ride Requests Tab — Marketplace View */}
      {activeTab === 'ride_requests' && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Left column: Marketplace Map + Request List */}
          <div className="space-y-4">
            {/* Marketplace Map — all requests as color-coded markers */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-brand-700">
                    Marketplace · {marketplaceRequests.length} Active
                  </h3>
                  {isMarketplaceLoading && (
                    <svg className="h-3.5 w-3.5 animate-spin text-brand-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    Has bids
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                    1–2 bids
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                    Stale
                  </span>
                </div>
              </div>

              {isLoaded && !loadError && (
                <div className="overflow-hidden rounded-xl border border-brand-100">
                  <div className="h-[320px] w-full">
                    <GoogleMap
                      mapContainerStyle={MAP_CONTAINER_STYLE}
                      center={DEFAULT_CENTER}
                      zoom={12}
                      onLoad={onMarketplaceMapLoad}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        zoomControl: true,
                        styles: [
                          {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }],
                          },
                        ],
                      }}
                    >
                      {marketplaceRequests.map((req) => {
                        if (!req.picking_point?.latitude || !req.picking_point?.longitude) return null
                        const hasBids = req.bid_count > 0
                        const isStale = req.is_stale
                        let markerColor = '#f59e0b' // amber — 1-2 bids (default)
                        if (isStale) markerColor = '#f87171' // red — stale
                        else if (hasBids && req.bid_count >= 3) markerColor = '#22c55e' // green — has bids (3+)

                        return (
                          <Marker
                            key={req.id}
                            position={{
                              lat: req.picking_point.latitude,
                              lng: req.picking_point.longitude,
                            }}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: markerColor,
                              fillOpacity: 0.9,
                              strokeColor: '#ffffff',
                              strokeWeight: 2,
                            }}
                            title={`${req.customer_name || 'Unknown'} — ${req.bid_count} bid(s)`}
                            onClick={() => {
                              setSelectedMarketplaceRequest(req)
                              // Also sync the existing selectedRequest for cancel functionality
                              setSelectedRequest({
                                id: req.id,
                                customer_id: req.customer_id,
                                customer_name: req.customer_name || undefined,
                                customer_phone: req.customer_phone || undefined,
                                picking_point: req.picking_point,
                                destination: req.destination,
                                category: req.category,
                                price: req.suggested_price,
                                status: req.status,
                                bid_count: req.bid_count,
                                is_stale: req.is_stale,
                                created_at: req.created_at,
                              })
                            }}
                          />
                        )
                      })}

                      {/* InfoWindow for selected marketplace request */}
                      {selectedMarketplaceRequest && selectedMarketplaceRequest.picking_point?.latitude && selectedMarketplaceRequest.picking_point?.longitude && (
                        <InfoWindow
                          position={{
                            lat: selectedMarketplaceRequest.picking_point.latitude,
                            lng: selectedMarketplaceRequest.picking_point.longitude,
                          }}
                          onCloseClick={() => setSelectedMarketplaceRequest(null)}
                        >
                          <div className="max-w-[200px] p-1">
                            <p className="text-xs font-semibold text-brand-900">
                              {selectedMarketplaceRequest.customer_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {selectedMarketplaceRequest.picking_point?.name || 'No pickup'}
                            </p>
                            <p className="mt-1 text-xs font-medium">
                              {selectedMarketplaceRequest.bid_count} bid{selectedMarketplaceRequest.bid_count !== 1 ? 's' : ''}
                              {selectedMarketplaceRequest.is_stale && (
                                <span className="ml-1 text-red-500">· Stale</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(selectedMarketplaceRequest.suggested_price ?? 0).toLocaleString()} CDF
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </GoogleMap>
                  </div>
                </div>
              )}
              {!isLoaded && !loadError && (
                <div className="flex h-[320px] items-center justify-center rounded-xl border border-brand-100 bg-brand-50/50">
                  <p className="text-sm text-brand-400">Loading map...</p>
                </div>
              )}
              {loadError && (
                <div className="flex h-[320px] items-center justify-center rounded-xl border border-red-200 bg-red-50">
                  <p className="text-sm text-red-500">Failed to load Google Maps</p>
                </div>
              )}
            </Card>

            {/* Request List Table */}
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-brand-700">
                    {requests.length} Request{requests.length !== 1 ? 's' : ''}
                  </h3>
                  {lastUpdated && (
                    <span className="text-xs text-brand-400">
                      · Auto-refresh 30s · {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {staleCount > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowBatchCancelModal(true)}
                  >
                    ✕ Cancel {staleCount} Stale
                  </Button>
                )}
              </div>

              {staleCount > 0 && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-medium text-red-700">
                    ⚠ {staleCount} stale request{staleCount !== 1 ? 's' : ''} — no driver has placed a bid. Consider cancelling to free up capacity.
                  </p>
                </div>
              )}

              <Table
                columns={requestColumns}
                data={requestTableData}
                isLoading={isLoading}
                onRowClick={(row: any) => {
                  const fullReq = requests.find((r) => r.id.startsWith(row.id))
                  if (fullReq) {
                    setSelectedRequest(fullReq)
                    // Also sync marketplace selection
                    const mktReq = marketplaceRequests.find((r) => r.id.startsWith(row.id))
                    if (mktReq) setSelectedMarketplaceRequest(mktReq)
                  }
                }}
                rowClassName={(row: any) =>
                  row._is_stale ? 'bg-red-50/50 hover:bg-red-100/50' : ''
                }
              />
            </Card>
          </div>

          {/* Right column: Request Detail + Bid Stream */}
          <div className="space-y-4">
            {selectedRequest ? (
              <>
                {/* Request Detail Card */}
                <Card className="border-l-4 border-l-brand-500">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-brand-900">
                        Ride Request Detail
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedRequest.is_stale && <Badge status="danger">Stale</Badge>}
                        <Badge status="warning">{getTimeSince(selectedRequest.created_at)}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-brand-100 p-3">
                        <h4 className="mb-1 text-sm font-medium text-brand-700">Customer</h4>
                        <p className="font-medium text-brand-900">{selectedRequest.customer_name || 'N/A'}</p>
                        <p className="text-sm text-brand-500">{selectedRequest.customer_phone}</p>
                        <p className="mt-1 text-xs text-brand-400">ID: {selectedRequest.customer_id?.slice(0, 8)}</p>
                      </div>
                      <div className="rounded-xl border border-brand-100 p-3">
                        <h4 className="mb-1 text-sm font-medium text-brand-700">Details</h4>
                        <p className="text-sm text-brand-600">
                          Category: <span className="capitalize font-medium text-brand-900">{selectedRequest.category}</span>
                        </p>
                        <p className="text-sm text-brand-600">
                          Bids: <span className="font-medium text-brand-900">{selectedRequest.bid_count ?? 0}</span>
                        </p>
                        <p className="text-sm text-brand-600">
                          Price: <span className="font-medium text-brand-900">{(selectedRequest.price ?? 0).toLocaleString()} CDF</span>
                        </p>
                        <p className="text-sm text-brand-600">
                          Created: <span className="font-medium text-brand-900">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="rounded-xl border border-brand-100 p-3">
                      <h4 className="mb-1 text-sm font-medium text-brand-700">Route</h4>
                      <p className="text-sm text-brand-600">
                        <span className="font-medium">From:</span> {selectedRequest.picking_point?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-brand-600">
                        <span className="font-medium">To:</span> {selectedRequest.destination?.name || 'N/A'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => setShowCancelModal(true)}
                      >
                        ✕ Cancel Request
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Bid Stream Panel */}
                <Card className="border-l-4 border-l-accent-500">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-brand-700">
                        Bid Stream · {selectedRequest.bid_count ?? 0} bid{(selectedRequest.bid_count ?? 0) !== 1 ? 's' : ''}
                      </h3>
                      {selectedRequest.bid_count && selectedRequest.bid_count > 0 && (
                        <span className="text-xs text-brand-400">Live</span>
                      )}
                    </div>

                    {(() => {
                      // Find the marketplace request with bid details
                      const mktReq = marketplaceRequests.find((r) => r.id === selectedRequest.id)
                      if (!mktReq || !mktReq.bids || mktReq.bids.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-brand-400">
                            <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium">No bids yet</p>
                            <p className="mt-0.5 text-xs">Waiting for drivers to respond...</p>
                          </div>
                        )
                      }

                      // Sort bids by price ascending (lowest first)
                      const sortedBids = [...mktReq.bids].sort((a, b) => a.price - b.price)

                      return (
                        <div className="max-h-[360px] space-y-2 overflow-y-auto">
                          {sortedBids.map((bid, idx) => (
                            <div
                              key={`${bid.driver_id}-${idx}`}
                              className={`rounded-xl border p-3 ${
                                idx === 0
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-brand-100 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-brand-900">
                                      {bid.driver_name || 'Unknown Driver'}
                                    </p>
                                    <p className="text-xs text-brand-500">{bid.driver_phone}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${idx === 0 ? 'text-green-700' : 'text-brand-900'}`}>
                                    {bid.price.toLocaleString()} CDF
                                  </p>
                                  <p className="text-xs text-brand-400">
                                    {getTimeSince(bid.created_at)}
                                  </p>
                                </div>
                              </div>
                              {/* Vehicle info */}
                              {(bid.vehicle_make || bid.vehicle_model) && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-brand-500">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>
                                    {[bid.vehicle_make, bid.vehicle_model].filter(Boolean).join(' ')}
                                    {bid.vehicle_color ? ` · ${bid.vehicle_color}` : ''}
                                    {bid.vehicle_license_plate ? ` · ${bid.vehicle_license_plate}` : ''}
                                  </span>
                                </div>
                              )}
                              {idx === 0 && (
                                <div className="mt-1.5">
                                  <span className="rounded-full bg-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                                    Lowest bid
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <div className="flex flex-col items-center justify-center py-12 text-brand-400">
                  <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">Select a request</p>
                  <p className="mt-1 text-sm">Click on the map or table to see details and bids</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Cancel Single Request Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancelReason('')
        }}
        title="Cancel Ride Request"
        onConfirm={handleCancelRequest}
        confirmText="Cancel Request"
        confirmVariant="danger"
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-brand-700">
            Reason for cancellation
          </label>
          <textarea
            className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter cancellation reason..."
          />
        </div>
      </Modal>

      {/* Batch Cancel Stale Requests Modal */}
      <Modal
        isOpen={showBatchCancelModal}
        onClose={() => {
          setShowBatchCancelModal(false)
          setBatchCancelReason('')
        }}
        title={`Cancel ${staleCount} Stale Request${staleCount !== 1 ? 's' : ''}`}
        onConfirm={handleBatchCancelStale}
        confirmText={isBatchCancelling ? 'Cancelling...' : `Cancel ${staleCount} Request${staleCount !== 1 ? 's' : ''}`}
        confirmVariant="danger"
        isConfirmLoading={isBatchCancelling}
      >
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              ⚠ This will cancel <strong>{staleCount}</strong> stale ride request{staleCount !== 1 ? 's' : ''} that ha{staleCount !== 1 ? 've' : 's'} received no bids.
            </p>
          </div>
          <label className="block text-sm font-medium text-brand-700">
            Reason for batch cancellation (optional)
          </label>
          <textarea
            className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            rows={3}
            value={batchCancelReason}
            onChange={(e) => setBatchCancelReason(e.target.value)}
            placeholder="Batch cancel: stale requests with no bids..."
          />
        </div>
      </Modal>

      {/* Force End Trip Modal */}
      <Modal
        isOpen={showForceEndModal}
        onClose={() => {
          setShowForceEndModal(false)
          setForceEndReason('')
        }}
        title="⚠ Force End Trip"
        onConfirm={handleForceEndTrip}
        confirmText={isForceEnding ? 'Force Ending...' : 'Force End Trip'}
        confirmVariant="danger"
        isConfirmLoading={isForceEnding}
        confirmDisabled={!forceEndReason.trim()}
      >
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              ⚠ This will immediately end the active trip. Both the customer and driver will be notified.
              This action is for emergencies only.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Reason for force-ending
            </label>
            <textarea
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              rows={3}
              value={forceEndReason}
              onChange={(e) => setForceEndReason(e.target.value)}
              placeholder="Enter the reason for force-ending this trip..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Initiated by
            </label>
            <div className="mt-2 flex gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 text-sm hover:bg-brand-50 has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="forceEndRole"
                  value="operations_manager"
                  checked={forceEndRole === 'operations_manager'}
                  onChange={() => setForceEndRole('operations_manager')}
                  className="text-red-600 focus:ring-red-500"
                />
                Operations Manager
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 text-sm hover:bg-brand-50 has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="forceEndRole"
                  value="super_admin"
                  checked={forceEndRole === 'super_admin'}
                  onChange={() => setForceEndRole('super_admin')}
                  className="text-red-600 focus:ring-red-500"
                />
                Super Admin
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Send Push Notification Modal */}
      <Modal
        isOpen={showSendPushModal}
        onClose={() => {
          setShowSendPushModal(false)
          setPushTitle('')
          setPushMessage('')
        }}
        title="📨 Send Push Notification"
        onConfirm={handleSendPush}
        confirmText={isSendingPush ? 'Sending...' : 'Send Notification'}
        confirmVariant="primary"
        isConfirmLoading={isSendingPush}
        confirmDisabled={!pushTitle.trim() || !pushMessage.trim()}
      >
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Send to
            </label>
            <div className="mt-2 flex gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 text-sm hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="pushTarget"
                  value="customer"
                  checked={pushTarget === 'customer'}
                  onChange={() => setPushTarget('customer')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Customer
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 text-sm hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="pushTarget"
                  value="driver"
                  checked={pushTarget === 'driver'}
                  onChange={() => setPushTarget('driver')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Driver
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Title
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="Notification title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">
              Message
            </label>
            <textarea
              className="mt-1 block w-full rounded-xl border border-brand-200 px-3 py-2 text-sm shadow-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              rows={3}
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              placeholder="Enter the notification message..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
