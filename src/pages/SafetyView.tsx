import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, InfoWindow, Marker, Polyline, useLoadScript } from '@react-google-maps/api'
import { Badge, Button, Card, Modal } from '../components'
import { LiveLocationSession, SosSession, supabaseService } from '../services/supabaseService'

const STATUS_TABS = ['all', 'active', 'resolved', 'cancelled'] as const
type StatusTab = typeof STATUS_TABS[number]
type MarkerKey = 'customer' | 'driver'

type EmergencyContact = {
  id: string
  name?: string
  phone_number?: string
  contact_relationship?: string
  created_at?: string
}

type ContactTarget = {
  kind: 'customer' | 'driver'
  label: string
  phone?: string
  notificationUserId?: string
}

type SafetyMarker = {
  key: MarkerKey
  label: string
  phone?: string
  color: string
  updatedAt?: string
  position: { lat: number; lng: number }
}

type SafetyPathPoint = {
  lat: number
  lng: number
}

const EXCLUDED_SOS_KEYS = ['id', 'ride_id', 'triggered_by', 'status', 'created_at', 'resolved_by', 'resolved_at']
const PRIORITY_SOS_KEYS = [
  'message',
  'description',
  'reason',
  'note',
  'notes',
  'alert_type',
  'alert_source',
  'location_name',
  'address',
  'expires_at',
  'latitude',
  'longitude',
]

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
}

const DEFAULT_CENTER = { lat: -4.4419, lng: 15.2663 }
const MAP_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places']

const fmtKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const formatDateTime = (value: unknown, fallback = '—'): string => {
  if (value == null || value === '') return fallback
  if (typeof value !== 'string' && typeof value !== 'number') return String(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : fallback
  return date.toLocaleString()
}

const formatCoordinate = (value: number): string => value.toFixed(6)

const createGoogleMapsHref = (lat: number, lng: number): string => {
  const query = encodeURIComponent(`${lat},${lng}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const extractSosFallbackPoint = (session: SosSession | null): { lat: number; lng: number; updatedAt?: string } | null => {
  if (!session) return null

  const data = session as Record<string, unknown>
  const latitude =
    toFiniteNumber(data.latitude) ??
    toFiniteNumber(data.lat) ??
    toFiniteNumber(data.customer_latitude) ??
    toFiniteNumber(data.customer_lat) ??
    toFiniteNumber(data.last_known_latitude) ??
    toFiniteNumber(data.last_known_lat)
  const longitude =
    toFiniteNumber(data.longitude) ??
    toFiniteNumber(data.lng) ??
    toFiniteNumber(data.customer_longitude) ??
    toFiniteNumber(data.customer_lng) ??
    toFiniteNumber(data.last_known_longitude) ??
    toFiniteNumber(data.last_known_lng)

  if (latitude == null || longitude == null) return null

  return {
    lat: latitude,
    lng: longitude,
    updatedAt:
      (typeof data.last_location_timestamp === 'string' ? data.last_location_timestamp : undefined) ??
      (typeof data.last_updated_at === 'string' ? data.last_updated_at : undefined) ??
      session.created_at,
  }
}

const normalizeRoutePath = (session: LiveLocationSession | null): SafetyPathPoint[] => {
  if (!session?.route_path || !Array.isArray(session.route_path)) return []

  const points = session.route_path
    .map((point) => {
      const lat = toFiniteNumber(point?.latitude)
      const lng = toFiniteNumber(point?.longitude)
      return lat != null && lng != null ? { lat, lng } : null
    })
    .filter(Boolean) as SafetyPathPoint[]

  return points.filter((point, index, allPoints) => {
    if (index === 0) return true
    const previous = allPoints[index - 1]
    return previous.lat !== point.lat || previous.lng !== point.lng
  })
}

const fmtVal = (key: string, value: unknown): string => {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length === 0 ? 'None' : `${value.length} item${value.length === 1 ? '' : 's'}`
  if (typeof value === 'string' && (key.endsWith('_at') || key === 'expires_at')) return formatDateTime(value, value)
  if ((key.includes('latitude') || key.includes('longitude')) && typeof value === 'number') return Number(value).toFixed(6)
  if (typeof value === 'number') return String(value)
  return String(value)
}

const getPriorityEntries = (session: SosSession) => {
  return Object.entries(session).filter(([key, value]) => {
    if (EXCLUDED_SOS_KEYS.includes(key) || value == null || value === '') return false
    return PRIORITY_SOS_KEYS.some((priorityKey) => key.toLowerCase().includes(priorityKey))
  })
}

const getRemainingEntries = (session: SosSession) => {
  const priorityKeys = new Set(getPriorityEntries(session).map(([key]) => key))
  return Object.entries(session).filter(([key, value]) => {
    if (EXCLUDED_SOS_KEYS.includes(key) || value == null || value === '') return false
    return !priorityKeys.has(key)
  })
}

const getAlertPreview = (session: SosSession): string => {
  const priority = getPriorityEntries(session)
  if (priority.length === 0) return 'Open to review incident details, contacts, and location data.'
  return priority
    .slice(0, 2)
    .map(([key, value]) => `${fmtKey(key)}: ${fmtVal(key, value)}`)
    .join(' • ')
}

const statusColor = (status: string) => {
  if (status === 'active') return 'bg-red-100 text-red-800 border border-red-200'
  if (status === 'resolved') return 'bg-green-100 text-green-800 border border-green-200'
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}

const liveStatusBadge = (status?: string) => {
  if (status === 'active') return 'danger'
  if (status === 'stale') return 'warning'
  if (status === 'expired' || status === 'ended' || status === 'manually_stopped') return 'default'
  return 'info'
}

const SafetyLiveLocationMap: React.FC<{
  apiKey: string
  markers: SafetyMarker[]
  routePath: SafetyPathPoint[]
  activeMarker: MarkerKey | null
  onMarkerSelect: (markerKey: MarkerKey | null) => void
}> = ({ apiKey, markers, routePath, activeMarker, onMarkerSelect }) => {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const lastViewportSignatureRef = useRef<string>('')
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  })

  useEffect(() => {
    if (!isLoaded || !mapRef || markers.length === 0) return
    const viewportSignature = markers
      .map((marker) => `${marker.key}:${marker.position.lat.toFixed(6)},${marker.position.lng.toFixed(6)}`)
      .sort()
      .join('|')

    if (lastViewportSignatureRef.current === viewportSignature) return
    lastViewportSignatureRef.current = viewportSignature

    if (markers.length === 1) {
      mapRef.panTo(markers[0].position)
      mapRef.setZoom(16)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    markers.forEach((marker) => bounds.extend(marker.position))
    if (!bounds.isEmpty()) mapRef.fitBounds(bounds, 64)
  }, [isLoaded, mapRef, markers])

  if (loadError) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm text-red-600 sm:h-[420px]">
        Google Maps failed to load for SOS tracking.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-[420px]">
        Loading map...
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="h-[320px] w-full sm:h-[420px]">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={markers[0]?.position || DEFAULT_CENTER}
          zoom={14}
          onLoad={(map) => { setMapRef(map) }}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
          }}
        >
          {routePath.length > 1 && (
            <Polyline
              path={routePath}
              options={{
                geodesic: true,
                strokeColor: '#dc2626',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                zIndex: 1,
              }}
            />
          )}
          {markers.map((marker) => (
            <Marker
              key={marker.key}
              position={marker.position}
              title={marker.label}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: marker.color,
                fillOpacity: 0.95,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              onClick={() => onMarkerSelect(marker.key)}
            />
          ))}
          {activeMarker && (() => {
            const marker = markers.find((item) => item.key === activeMarker)
            if (!marker) return null
            return (
              <InfoWindow position={marker.position} onCloseClick={() => onMarkerSelect(null)}>
                <div className="max-w-[220px] p-1 text-sm">
                  <p className="font-semibold text-slate-900">{marker.label}</p>
                  {marker.phone && <p className="text-slate-600">{marker.phone}</p>}
                  <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(marker.updatedAt, 'unknown')}</p>
                </div>
              </InfoWindow>
            )
          })()}
        </GoogleMap>
      </div>
    </div>
  )
}

export const SafetyView: React.FC = () => {
  const [sessions, setSessions] = useState<SosSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [error, setError] = useState<string | null>(null)

  const [selectedSession, setSelectedSession] = useState<SosSession | null>(null)
  const [liveSession, setLiveSession] = useState<LiveLocationSession | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false)
  const [activeMarker, setActiveMarker] = useState<MarkerKey | null>(null)

  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const [showContactModal, setShowContactModal] = useState(false)
  const [contactTarget, setContactTarget] = useState<ContactTarget | null>(null)
  const [contactMessage, setContactMessage] = useState('')
  const [isSendingContact, setIsSendingContact] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  const hasMapApiKey = apiKey.trim().length > 0

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getSosSessions(statusFilter !== 'all' ? statusFilter : undefined)
      setSessions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOS sessions')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const loadEmergencyContacts = useCallback(async (userId?: string) => {
    if (!userId) {
      setEmergencyContacts([])
      return
    }

    try {
      setIsEmergencyLoading(true)
      const contacts = await supabaseService.getCustomerEmergencyContacts(userId)
      setEmergencyContacts(contacts as EmergencyContact[])
    } catch {
      setEmergencyContacts([])
    } finally {
      setIsEmergencyLoading(false)
    }
  }, [])

  const openSession = async (sessionId: string) => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getSosSessionDetail(sessionId)
      setSelectedSession(data)
      setLiveSession(null)
      setLiveError(null)
      setEmergencyContacts([])
      setActiveMarker(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session detail')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedSession) {
      setLiveSession(null)
      setEmergencyContacts([])
      setLiveError(null)
      setActiveMarker(null)
      return
    }

    void loadEmergencyContacts(selectedSession.triggered_by as string | undefined)
    void supabaseService.recordLiveLocationView({
      entity_viewed: `sos:${selectedSession.id}`,
      session_type: 'sos_tracking',
      session_id: selectedSession.id,
      role: 'operations',
    })

    const unsubscribe = supabaseService.subscribeToLiveLocationSession(
      { sosSessionId: selectedSession.id },
      (session) => {
        setLiveSession(session)
        setLiveError(null)
      },
      (subscriptionError) => {
        setLiveError(subscriptionError.message)
      },
      10000,
    )

    return () => unsubscribe()
  }, [selectedSession?.id, selectedSession?.triggered_by, loadEmergencyContacts])

  const fallbackSosPoint = extractSosFallbackPoint(selectedSession)
  const routePath = normalizeRoutePath(liveSession)
  const latestRoutePoint = routePath.length > 0 ? routePath[routePath.length - 1] : null

  const markers = [
    liveSession?.participants.customer?.point
      ? {
          key: 'customer' as const,
          label: liveSession.customer_name || 'Customer',
          phone: liveSession.customer_phone,
          color: '#dc2626',
          updatedAt: liveSession.participants.customer.last_updated_at,
          position: {
            lat: liveSession.participants.customer.point.latitude,
            lng: liveSession.participants.customer.point.longitude,
          },
        }
      : null,
    !liveSession?.participants.customer?.point && latestRoutePoint
      ? {
          key: 'customer' as const,
          label: liveSession?.customer_name || 'Customer',
          phone: liveSession?.customer_phone,
          color: '#dc2626',
          updatedAt: liveSession?.participants.customer?.last_updated_at ?? liveSession?.last_location_timestamp,
          position: latestRoutePoint,
        }
      : null,
    liveSession?.participants.driver?.point
      ? {
          key: 'driver' as const,
          label: liveSession.driver_name || 'Driver',
          phone: liveSession.driver_phone,
          color: '#2563eb',
          updatedAt: liveSession.participants.driver.last_updated_at,
          position: {
            lat: liveSession.participants.driver.point.latitude,
            lng: liveSession.participants.driver.point.longitude,
          },
        }
      : null,
    !liveSession?.participants.customer?.point && fallbackSosPoint
      ? {
          key: 'customer' as const,
          label:
            (selectedSession && typeof (selectedSession as Record<string, unknown>).customer_name === 'string'
              ? (selectedSession as Record<string, unknown>).customer_name as string
              : liveSession?.customer_name) || 'Person who triggered SOS',
          phone:
            selectedSession && typeof (selectedSession as Record<string, unknown>).customer_phone === 'string'
              ? (selectedSession as Record<string, unknown>).customer_phone as string
              : liveSession?.customer_phone,
          color: '#dc2626',
          updatedAt: fallbackSosPoint.updatedAt,
          position: {
            lat: fallbackSosPoint.lat,
            lng: fallbackSosPoint.lng,
          },
        }
      : null,
  ].filter(Boolean) as SafetyMarker[]

  const mapUnavailableReason = !hasMapApiKey
    ? 'Google Maps API key is missing in this environment.'
    : null

  const handleResolve = async () => {
    if (!selectedSession || !resolveNotes.trim()) return
    try {
      setIsProcessing(true)
      await supabaseService.resolveSosSession(selectedSession.id, resolveNotes)
      if (selectedSession.triggered_by) {
        supabaseService.sendTargetedNotification({
          user_ids: [selectedSession.triggered_by],
          title: 'Safety Alert Resolved',
          message: 'Your safety alert has been reviewed and resolved by an admin. If you need further assistance, please contact support.',
        }).catch(() => {})
      }
      const updated = { ...selectedSession, status: 'resolved', resolved_at: new Date().toISOString() }
      setSelectedSession(updated)
      setSessions((current) => current.map((session) => (session.id === selectedSession.id ? updated : session)))
      setShowResolveModal(false)
      setResolveNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve session')
    } finally {
      setIsProcessing(false)
    }
  }

  const openDialer = (phone?: string) => {
    if (!phone) return
    window.location.href = `tel:${phone}`
  }

  const openContactModal = (target: ContactTarget) => {
    setContactTarget(target)
    setContactMessage('This is Albo Taxi safety support. We are reviewing your SOS alert and need to reach you immediately.')
    setShowContactModal(true)
  }

  const handleSendContactNotification = async () => {
    if (!contactTarget?.notificationUserId || !contactMessage.trim()) return
    try {
      setIsSendingContact(true)
      await supabaseService.sendTargetedNotification({
        user_ids: [contactTarget.notificationUserId],
        title: 'Albo Safety Team Contact',
        message: contactMessage,
      })
      setShowContactModal(false)
      setContactTarget(null)
      setContactMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to contact the SOS participant')
    } finally {
      setIsSendingContact(false)
    }
  }

  if (selectedSession) {
    const isActive = selectedSession.status === 'active'
    const priorityEntries = getPriorityEntries(selectedSession)
    const remainingEntries = getRemainingEntries(selectedSession)
    const selectedSessionData = selectedSession as Record<string, unknown>
    const customerNotificationUserId = selectedSession.triggered_by ? String(selectedSession.triggered_by) : undefined
    const driverNotificationUserId = typeof selectedSessionData.driver_user_id === 'string'
      ? selectedSessionData.driver_user_id as string
      : undefined
    const customerLabel = liveSession?.customer_name
      || (typeof selectedSessionData.customer_name === 'string' ? selectedSessionData.customer_name as string : '')
      || 'Person who triggered SOS'
    const customerPhone = liveSession?.customer_phone
      || (typeof selectedSessionData.customer_phone === 'string' ? selectedSessionData.customer_phone as string : undefined)
    const driverLabel = liveSession?.driver_name
      || (typeof selectedSessionData.driver_name === 'string' ? selectedSessionData.driver_name as string : '')
      || 'Associated driver'
    const driverPhone = liveSession?.driver_phone
      || (typeof selectedSessionData.driver_phone === 'string' ? selectedSessionData.driver_phone as string : undefined)

    const contactTargets: ContactTarget[] = [
      {
        kind: 'customer',
        label: customerLabel,
        phone: customerPhone,
        notificationUserId: customerNotificationUserId,
      },
      ...((driverPhone || typeof selectedSessionData.driver_name === 'string' || liveSession?.driver_name)
        ? [{
            kind: 'driver' as const,
            label: driverLabel,
            phone: driverPhone,
            notificationUserId: driverNotificationUserId,
          }]
        : []),
    ]

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedSession(null)} className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          ← Back to SOS Sessions
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">SOS Session</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600 font-mono">{selectedSession.id}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusColor(selectedSession.status)}`}>
                {selectedSession.status}
              </span>
              {liveSession && (
                <Badge status={liveStatusBadge(liveSession.status)}>
                  Live Location {liveSession.status}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" onClick={() => void openSession(selectedSession.id)}>Refresh SOS</Button>
            {isActive && <Button variant="danger" onClick={() => setShowResolveModal(true)}>Resolve Session</Button>}
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}
        {liveError && <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-700 text-sm">{liveError}</div>}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="min-w-0 overflow-hidden">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Live Location</h2>
                <p className="mt-1 text-sm text-slate-500">Track the person in distress and any linked driver using the most recent live coordinates.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Last update: {formatDateTime(liveSession?.last_location_timestamp, 'No live update yet')}</span>
                {routePath.length > 1 && <span>Trail points: {routePath.length}</span>}
              </div>
            </div>

            {!mapUnavailableReason && markers.length > 0 ? (
              <SafetyLiveLocationMap
                apiKey={apiKey}
                markers={markers}
                routePath={routePath}
                activeMarker={activeMarker}
                onMarkerSelect={setActiveMarker}
              />
            ) : markers.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Map unavailable in this environment</p>
                    <p className="mt-1 text-sm text-amber-800">{mapUnavailableReason || 'Google Maps is temporarily unavailable.'}</p>
                  </div>
                  <p className="text-xs text-amber-700">Location tracking data is still available below.</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {markers.map((marker) => (
                    <div key={marker.key} className="rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {marker.key === 'customer' ? 'Person in distress' : 'Associated driver'}
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">{marker.label}</p>
                          {marker.phone && <p className="text-sm text-slate-500">{marker.phone}</p>}
                        </div>
                        <span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: marker.color }} />
                      </div>

                      <dl className="mt-4 space-y-2 text-sm text-slate-700">
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-slate-500">Latitude</dt>
                          <dd className="font-medium text-slate-950">{formatCoordinate(marker.position.lat)}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-slate-500">Longitude</dt>
                          <dd className="font-medium text-slate-950">{formatCoordinate(marker.position.lng)}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-slate-500">Updated</dt>
                          <dd className="font-medium text-slate-950 text-right">{formatDateTime(marker.updatedAt, 'Unknown')}</dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={createGoogleMapsHref(marker.position.lat, marker.position.lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Open in Google Maps
                        </a>
                        <Button variant="secondary" size="sm" disabled={!marker.phone} onClick={() => openDialer(marker.phone)}>
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {routePath.length > 1 && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                    Movement trail available: {routePath.length} recent location point{routePath.length === 1 ? '' : 's'}.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center sm:h-[420px]">
                <p className="text-sm font-semibold text-slate-700">No live coordinates available yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  {mapUnavailableReason
                    ? `${mapUnavailableReason} The SOS record is loaded, but there are no mappable coordinates in the current payload.`
                    : 'The SOS record is loaded, but neither the customer nor the driver has a mappable live location in the current payload.'}
                </p>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="min-w-0">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">Operational Snapshot</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                {[
                  ['Created', formatDateTime(selectedSession.created_at)],
                  ['Resolved At', formatDateTime(selectedSession.resolved_at)],
                  ['Live Status', liveSession?.status || 'No live session'],
                  ['Last Location Update', formatDateTime(liveSession?.last_location_timestamp, 'No update yet')],
                  ['Share Expires', formatDateTime(liveSession?.expires_at)],
                  ['Stop Reason', liveSession?.stop_reason || '—'],
                  ['Ride ID', (selectedSession.ride_id as string) || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-950 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="min-w-0">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">Contact Actions</h2>
              <div className="space-y-3">
                {contactTargets.map((target) => (
                  <div key={`${target.kind}-${target.label}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{target.kind === 'customer' ? 'Person in distress' : 'Associated driver'}</p>
                        <p className="mt-1 font-semibold text-slate-950">{target.label}</p>
                        <p className="text-sm text-slate-500">{target.phone || 'No phone number available'}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="secondary" size="sm" disabled={!target.phone} onClick={() => openDialer(target.phone)}>
                          Call now
                        </Button>
                        <Button variant="primary" size="sm" disabled={!target.notificationUserId} onClick={() => openContactModal(target)}>
                          Send push
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emergency Contacts</p>
                      <p className="mt-1 text-sm text-slate-600">Escalation contacts linked to the SOS user.</p>
                    </div>
                    {isEmergencyLoading && <span className="text-xs text-slate-400">Loading...</span>}
                  </div>
                  {emergencyContacts.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No emergency contacts available for this SOS user.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {emergencyContacts.map((contact) => (
                        <div key={contact.id} className="rounded-xl border border-red-100 bg-red-50 px-3 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-950">{contact.name || 'Emergency Contact'}</p>
                              <p className="text-sm text-slate-600">{contact.phone_number || 'No phone number available'}</p>
                              {contact.contact_relationship && <p className="text-xs text-slate-500 capitalize">{contact.contact_relationship}</p>}
                            </div>
                            <Button variant="danger" size="sm" disabled={!contact.phone_number} onClick={() => openDialer(contact.phone_number)}>
                              Call contact
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Session Details</h2>
            <dl className="space-y-3 text-sm">
              {([
                ['Session ID', selectedSession.id],
                ['Ride ID', (selectedSession.ride_id as string) || 'N/A'],
                ['Triggered By', (selectedSession.triggered_by as string) || 'N/A'],
                ['Status', selectedSession.status],
                ['Created', formatDateTime(selectedSession.created_at)],
                ['Resolved By', (selectedSession.resolved_by as string) || '—'],
                ['Resolved At', formatDateTime(selectedSession.resolved_at)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="mt-1 break-all font-medium text-slate-950 sm:mt-0 sm:max-w-[65%] sm:text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="space-y-6">
            {priorityEntries.length > 0 && (
              <Card className="min-w-0">
                <h2 className="mb-4 text-lg font-semibold text-slate-950">Active Alerts</h2>
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  {priorityEntries.map(([key, val]) => (
                    <div key={key} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fmtKey(key)}</dt>
                      <dd className="mt-1 break-words font-medium text-slate-950">{fmtVal(key, val)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {remainingEntries.length > 0 && (
              <Card className="min-w-0">
                <h2 className="mb-4 text-lg font-semibold text-slate-950">Additional Data</h2>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {remainingEntries.map(([key, val]) => (
                    <div key={key} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fmtKey(key)}</dt>
                      <dd className="mt-1 break-all font-medium text-slate-950">{fmtVal(key, val)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
        </div>

        <Modal isOpen={showResolveModal} onClose={() => { setShowResolveModal(false); setResolveNotes('') }} title="Resolve SOS Session">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Describe the resolution outcome. This is required before closing the session.</p>
            <textarea
              className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4}
              placeholder="Resolution notes..."
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowResolveModal(false); setResolveNotes('') }}>Cancel</Button>
              <Button variant="primary" onClick={handleResolve} disabled={!resolveNotes.trim() || isProcessing}>
                {isProcessing ? 'Resolving...' : 'Mark Resolved'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showContactModal} onClose={() => { setShowContactModal(false); setContactTarget(null); setContactMessage('') }} title={`Contact ${contactTarget?.label || 'SOS Participant'}`}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Send a direct push notification to the selected SOS participant.</p>
            {contactTarget?.phone && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Phone: {contactTarget.phone}
              </div>
            )}
            <textarea
              className="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4}
              placeholder="Message to send..."
              value={contactMessage}
              onChange={e => setContactMessage(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowContactModal(false); setContactTarget(null); setContactMessage('') }}>Cancel</Button>
              <Button variant="primary" onClick={handleSendContactNotification} disabled={!contactTarget?.notificationUserId || !contactMessage.trim() || isSendingContact}>
                {isSendingContact ? 'Sending...' : 'Send Push'}
              </Button>
            </div>
            {!contactTarget?.notificationUserId && (
              <p className="text-xs text-amber-600">Push messaging requires a backend user ID for this contact. Phone calling still works.</p>
            )}
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Safety & SOS</h1>
          <p className="mt-2 text-slate-600">Monitor alerts, inspect live locations, contact involved people, and resolve incidents.</p>
        </div>
        <Button variant="secondary" onClick={loadSessions}>Refresh</Button>
      </div>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <div className="flex h-40 items-center justify-center text-slate-500">No SOS sessions found.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => void openSession(session.id)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-slate-400 sm:px-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950 font-mono text-sm">{session.id}</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  {session.ride_id && <p className="text-xs text-slate-500 mt-1">Ride: {session.ride_id as string}</p>}
                  {session.triggered_by && <p className="mt-2 text-sm text-slate-600">Triggered by: {session.triggered_by as string}</p>}
                  <p className="mt-2 text-sm text-slate-500">{getAlertPreview(session)}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2 lg:min-w-[340px]">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(session.created_at)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Resolved</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{session.resolved_at ? formatDateTime(session.resolved_at) : 'Pending'}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}