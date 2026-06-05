import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api'
import { DriverLocation } from '../services/supabaseService'

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
}

const DEFAULT_CENTER = { lat: -4.4419, lng: 15.2663 } // Kinshasa, DRC
const DEFAULT_ZOOM = 12

const MAP_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places']

interface LiveMapProps {
  drivers: DriverLocation[]
  isLoading?: boolean
  onRefresh?: () => void
  lastUpdated?: string
}

export const LiveMap: React.FC<LiveMapProps> = ({
  drivers,
  isLoading = false,
  onRefresh,
  lastUpdated,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [mapCenter] = useState(DEFAULT_CENTER)
  const [mapZoom] = useState(DEFAULT_ZOOM)
  const mapRef = useRef<google.maps.Map | null>(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  })

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  // Fit bounds to show all drivers when data changes
  useEffect(() => {
    if (drivers.length > 0 && mapRef.current) {
      const bounds = new google.maps.LatLngBounds()
      drivers.forEach((d) => {
        bounds.extend({ lat: d.latitude, lng: d.longitude })
      })
      mapRef.current.fitBounds(bounds)
      // Don't zoom in too far
      const listener = google.maps.event.addListener(mapRef.current, 'bounds_changed', () => {
        const zoom = mapRef.current?.getZoom()
        if (zoom && zoom > 15) {
          mapRef.current?.setZoom(15)
        }
        google.maps.event.removeListener(listener)
      })
    }
  }, [drivers])

  const handleRefresh = useCallback(() => {
    setSelectedDriver(null)
    onRefresh?.()
  }, [onRefresh])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-sm font-medium text-red-700">Failed to load Google Maps</p>
        <p className="text-xs text-red-500">Check that VITE_GOOGLE_MAPS_API_KEY is set correctly in .env</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-brand-50 p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-brand-400">Loading map...</p>
        </div>
      </div>
    )
  }

  const onlineDrivers = drivers.filter((d) => d.is_online)
  const offlineDrivers = drivers.filter((d) => !d.is_online)

  return (
    <div className="space-y-3">
      {/* Map Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-900">Live Driver Map</h2>
          <p className="text-xs text-brand-400">
            {drivers.length > 0
              ? `${onlineDrivers.length} online · ${offlineDrivers.length} offline`
              : 'No driver location data'}
            {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 transition-all hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative overflow-hidden rounded-xl border border-brand-100">
        <div className="h-[400px] w-full lg:h-[500px]">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={mapZoom}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
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
            {/* Driver Markers */}
            {drivers.map((driver) => (
              <Marker
                key={driver.driver_id}
                position={{ lat: driver.latitude, lng: driver.longitude }}
                onClick={() => setSelectedDriver(driver)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: driver.is_online ? '#16a34a' : '#94a3b8',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                label={{
                  text: '●',
                  color: driver.is_online ? '#16a34a' : '#94a3b8',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
                title={driver.full_name || driver.driver_id}
              />
            ))}

            {/* Selected Driver InfoWindow */}
            {selectedDriver && (
              <InfoWindow
                position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
                onCloseClick={() => setSelectedDriver(null)}
              >
                <div className="min-w-[180px] p-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedDriver.full_name || 'Unknown Driver'}
                  </p>
                  {selectedDriver.phone_number && (
                    <p className="mt-0.5 text-xs text-gray-500">{selectedDriver.phone_number}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        selectedDriver.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-xs text-gray-600">
                      {selectedDriver.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {selectedDriver.updated_at && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Updated: {new Date(selectedDriver.updated_at).toLocaleTimeString()}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {selectedDriver.latitude.toFixed(4)}, {selectedDriver.longitude.toFixed(4)}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </div>

      {/* Driver Legend */}
      {drivers.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-brand-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
            <span>{onlineDrivers.length} Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
            <span>{offlineDrivers.length} Offline</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveMap
