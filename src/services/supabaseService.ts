import axios, { AxiosInstance } from 'axios'

class ServiceRequestError extends Error {
  readonly status?: number
  readonly url?: string
  readonly backendDetail?: string

  constructor(message: string, options?: { status?: number; url?: string; backendDetail?: string }) {
    super(message)
    this.name = 'ServiceRequestError'
    this.status = options?.status
    this.url = options?.url
    this.backendDetail = options?.backendDetail
  }
}

/**
 * Payment Request / Wallet Topup Request
 * Maps to backend: WalletTopupRequest model
 */
export interface PaymentRequest {
  id: string
  driver_id: string
  amount: number
  payment_method: 'mpesa' | 'orange_money' | 'airtel_money' | 'bank_transfer' | 'cash'
  proof_image_url: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  submitted_at: string
  reviewed_at?: string
  rejection_reason?: string
  reference_number?: string
  sender_name?: string
  full_name?: string
  phone_number?: string
}

/**
 * Driver Profile
 * Maps to backend: DriverProfile + VehicleDetails + DriverDocument models
 */
export interface Vehicle {
  id: string
  vehicle_type: string
  license_plate: string
  make: string
  model: string
  year: number
  color: string
  passenger_capacity?: number
  has_air_conditioning?: boolean
  provides_helmet?: boolean
}

export interface DriverDocument {
  id: string
  document_type: string
  file_url: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
}

export interface CreateDriverResponse {
  id: string
  full_name: string
  phone_number: string
  role: string
  verification_status: string
  otp_sent: boolean
}

export interface DriverDocumentUploadInput {
  documentType: string
  file: File
}

export interface Driver {
  id: string
  user_id: string
  full_name?: string
  phone_number?: string
  license_number: string
  license_expiry: string
  vehicle_type?: string
  verification_status: 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended'
  verification_feedback?: string
  is_suspended?: boolean
  address?: string
  is_online: boolean
  rating: number
  total_trips: number
  credit_balance?: number
  submitted_at?: string
  activation_date?: string
  created_at: string
  vehicle?: Vehicle
  documents?: DriverDocument[]
}

/**
 * Wallet Transaction
 * Maps to backend: WalletTransaction model
 */
export interface WalletTransaction {
  id: string
  driver_id: string
  type: 'credit' | 'debit'
  amount: number
  balance_after: number
  reference_type: 'topup' | 'ride_commission'
  reference_id: string
  description: string
  created_at: string
}

/**
 * Ride
 * Maps to backend: Ride model
 */
export interface DriverLocation {
  id: string
  driver_id: string
  latitude: number
  longitude: number
  full_name?: string
  phone_number?: string
  is_online?: boolean
  last_updated?: string
  updated_at?: string
}

export interface Ride {
  id: string
  ride_request_id?: string
  customer_id: string
  driver_id: string
  customer_name?: string
  driver_name?: string
  customer_phone?: string
  driver_phone?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  customer_comment?: string
  price: number
  status: 'pending' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  started_at?: string
  completed_at?: string
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  distance_km?: number
  duration_minutes?: number
  category?: string
  created_at: string
}

/**
 * Dashboard Metrics
 * Calculated from multiple backend endpoints
 */
export interface DashboardMetrics {
  pending_payments_count: number
  pending_drivers_count: number
  active_drivers_count: number
  active_rides_count: number
  completed_trips_today?: number
  gmv_usd_today?: number
  gmv_cdf_today?: number
  commission_today?: number
  open_tickets_count?: number
  sos_active_count?: number
}

export interface ExchangeRate {
  id?: string
  rate_cdf_per_usd: number
  source: 'live' | 'manual'
  effective_from?: string
  effective_to?: string
  set_by?: string
  created_at?: string
}

export interface LockedDriver {
  id: string
  user_id: string
  full_name?: string
  phone_number?: string
  credit_balance: number
  last_topup_at?: string
  is_online: boolean
}

export interface InternalNote {
  id: string
  entity_id: string
  entity_type: 'driver' | 'customer'
  note: string
  created_by?: string
  created_at: string
}

export interface SosAnalytics {
  trigger_rate_trend: Array<{ date: string; count: number }>
  avg_time_to_first_responder_minutes: number
  resolution_outcomes: { false_alarm: number; resolved: number; escalated: number }
  total_sessions: number
}

export interface StandardAnalytics {
  new_customers_by_day: Array<{ date: string; count: number }>
  new_drivers_by_day: Array<{ date: string; count: number }>
  gmv_by_day: Array<{ date: string; usd: number; cdf: number }>
  trips_by_day: Array<{ date: string; count: number }>
  completion_rate: number
  avg_fare_usd: number
  payment_success_rate: number
  kyc_approval_rate: number
}

export interface AdminNotification {
  id: string
  user_id: string
  title: string
  content: string
  notification_type: string
  status: string
  read_at?: string
  created_at: string
}

export interface AdminLog {
  id: string
  action: string
  admin_id?: string
  target_id?: string
  target_table?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ---- Rides extended types ----
export interface RideDetailResponse extends Ride {
  vehicle_snapshot?: Record<string, unknown>
  arrived_at?: string
  stops?: Array<{ name: string; latitude: number; longitude: number }>
  reason_code?: string
  reason_text?: string
}

export interface TripResponse extends Ride {
  ride_id?: string
  customer_rating?: number
  driver_rating?: number
}

export interface ActiveRideRequest {
  id: string
  customer_id: string
  customer_name?: string
  customer_phone?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  vehicle_type?: string
  category?: string
  price?: number
  suggested_price?: number
  bid_count?: number
  status?: string
  is_stale?: boolean
  created_at: string
}

export interface RideOfferHistory {
  ride_id: string
  update_count: number
  original_price?: number
  final_price?: number
  offers: Array<{
    id: string
    driver_id: string
    driver_name?: string
    offered_price?: number
    price?: number
    status: string
    created_at: string
  }>
}

export interface ActiveTripItem {
  id: string
  ride_id: string
  driver_id: string
  customer_id: string
  status: string
  started_at?: string
  [key: string]: unknown
}

export interface MarketplaceRequestItem {
  id: string
  customer_id: string
  customer_name?: string
  customer_phone?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  vehicle_type?: string
  category?: string
  price?: number
  suggested_price?: number
  bid_count: number
  status?: string
  is_stale?: boolean
  bids?: Array<{
    id: string
    driver_id: string
    driver_name?: string
    driver_phone?: string
    price: number
    status: string
    vehicle_make?: string
    vehicle_model?: string
    vehicle_color?: string
    vehicle_license_plate?: string
    created_at: string
  }>
  created_at: string
}

export interface MarketplaceBidItem {
  id: string
  request_id: string
  driver_id: string
  price: number
  status: string
  created_at: string
}

// ---- Disputes ----
export interface DisputeItem {
  ride_id: string
  customer_id?: string
  driver_id?: string
  customer_name?: string
  driver_name?: string
  customer_phone?: string
  driver_phone?: string
  price?: number
  status?: string
  dispute_status: string
  dispute_reason?: string
  dispute_raised_by?: string
  dispute_raised_at?: string
  dispute_resolved_at?: string
  dispute_notes?: string
  reported_at?: string
}

export interface DisputeActionResponse {
  message: string
  dispute_status: string
}

// ---- Payments / Finance ----
export interface TransactionItem {
  id: string
  type: string
  trip_id?: string
  customer_name?: string
  customer_phone?: string
  driver_name?: string
  driver_phone?: string
  amount: number
  platform_commission_amount?: number
  method?: string
  status: string
  category?: string
  distance_km?: number
  duration_minutes?: number
  has_refund?: boolean
  created_at: string
  completed_at?: string
}

// ---- Config ----
export interface AppConfigToggle {
  key: string
  value: string
  updated_at?: string
  updated_by?: string
}

// ---- Analytics ----
export interface CancellationAnalytics {
  total_cancellations?: number
  reason_breakdown: Array<{
    reason_code: string
    reason_text: string
    count: number
    cancelled_by_customer: number
    cancelled_by_driver: number
  }>
  safety_concern_queue: Array<{
    ride_id: string
    customer_id: string
    customer_name?: string
    driver_id: string
    driver_name?: string
    reason_text: string
    cancelled_by: string
    cancelled_at: string
  }>
  repeat_cancellations: Array<{
    user_id: string
    user_type: 'driver' | 'customer'
    full_name?: string
    phone_number?: string
    cancellation_count: number
    reason_codes: string[]
    latest_cancellation_at: string
  }>
}

// ---- Pricing ----
export interface VehiclePricingConfig {
  vehicle_type: string
  base_fare: number
  per_km: number
  per_km_rate?: number
  per_minute_rate?: number
  minimum_fare: number
  night_multiplier: number
  is_active: boolean
  [key: string]: unknown
}

export interface GlobalPricingConfig {
  vat_rate: number
  platform_commission_rate?: number
  commission_rate: number
  day_multiplier: number
  evening_multiplier: number
  surge_multiplier?: number
  [key: string]: unknown
}

export interface CategoryMultiplierItem {
  category: string
  multiplier: number
  is_active?: boolean
  description?: string
  [key: string]: unknown
}

export interface FareSimulateResponse {
  final_price: number
  price_excluding_vat: number
  commission_amount: number
  driver_net: number
  steps: Array<{ step: string; label: string; value: number }>
}

export interface CategoryMetricsItem {
  category: string
  ride_volume: number
  average_fare: number
  active_drivers: number
  total_requests: number
  completed_trips: number
  conversion_rate: number
}

export interface PricingAuditLogItem {
  created_at: string
  admin_id: string
  admin_name?: string
  change_type: string
  change_summary: string
}

// ---- Admin Management ----
export interface AdminUserItem {
  id: string
  email: string
  full_name?: string
  phone_number?: string
  admin_role: string
  two_fa_enabled: boolean
  is_active: boolean
  last_login_at?: string
}

export interface IpAllowlistEntry {
  id: string
  ip_cidr: string
  label?: string
  created_at: string
}

export interface AdminSession {
  id: string
  admin_user_id: string
  admin_email?: string
  ip_address?: string
  created_at: string
  expires_at?: string
  is_active: boolean
}

// ---- SOS ----
export interface SosSession {
  id: string
  ride_id?: string
  triggered_by?: string
  status: string
  resolved_by?: string
  resolved_at?: string
  created_at: string
  [key: string]: unknown
}

export type LiveLocationSessionType = 'ride' | 'sos'
export type LiveLocationShareSource = 'trip_tracking' | 'manual_live_share' | 'sos'
export type LiveLocationParticipantType = 'driver' | 'customer'
export type LiveLocationStatus = 'active' | 'stale' | 'ended' | 'manually_stopped' | 'expired'

export interface LiveLocationPoint {
  latitude: number
  longitude: number
  heading?: number | null
  speed?: number | null
  accuracy?: number | null
  timestamp: string
}

export interface LiveLocationParticipant {
  participant_type: LiveLocationParticipantType
  name?: string
  phone?: string
  is_live: boolean
  status: LiveLocationStatus
  source: LiveLocationShareSource
  started_at?: string
  expires_at?: string
  stopped_at?: string
  stop_reason?: string
  last_updated_at?: string
  point?: LiveLocationPoint
}

export interface LiveLocationSession {
  id: string
  type: LiveLocationSessionType
  status: LiveLocationStatus
  source: LiveLocationShareSource
  started_at?: string
  expires_at?: string
  ended_at?: string
  stopped_at?: string
  stop_reason?: string
  stale_after_seconds: number
  ride_id?: string | null
  sos_session_id?: string | null
  customer_id?: string | null
  customer_name?: string
  customer_phone?: string
  driver_id?: string | null
  driver_name?: string
  driver_phone?: string
  pickup?: { name?: string; latitude: number; longitude: number }
  destination?: { name?: string; latitude: number; longitude: number }
  stops?: Array<{ name?: string; latitude: number; longitude: number }>
  route_path?: Array<{ latitude: number; longitude: number }>
  last_location_timestamp?: string
  participants: {
    driver?: LiveLocationParticipant
    customer?: LiveLocationParticipant
  }
}

export interface LiveLocationSessionFilters {
  status?: LiveLocationStatus | 'all_live'
  type?: LiveLocationSessionType | 'all'
  search?: string
  includeHistory?: boolean
}

// ---- Support ----
export interface SupportTicket {
  id: string
  subject: string
  status: string
  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id?: string
  content: string
  created_at: string
}

/**
 * Service for interacting with AlboTax FastAPI Backend
 * Base URL: {backend_url}/api/v1
 */
class AlboTaxService {
  private api: AxiosInstance
  private backendUrl: string
  private jwtToken: string

  constructor(backendUrl: string, jwtToken: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '')
    this.jwtToken = jwtToken.trim()

    this.api = axios.create({
      baseURL: `${this.backendUrl}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Use the stored token (kept fresh by setAuthToken() on every auth event).
    // Calling supabase.auth.getSession() here caused lock contention with the
    // Navigator LockManager API, deadlocking requests made inside onAuthStateChange callbacks.
    this.api.interceptors.request.use((config) => {
      const token = this.jwtToken

      if (token) {
        config.headers = config.headers ?? {}
        ;(config.headers as any).Authorization = `Bearer ${token}`
      } else if (config.headers) {
        delete (config.headers as any).Authorization
      }

      return config
    })

    // Extract backend error detail so callers see the real message, not "Request failed with status code 4xx"
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response) {
          const data = error.response.data as Record<string, unknown> | undefined
          const detail =
            (typeof data?.detail === 'string' && data.detail) ||
            (typeof data?.message === 'string' && data.message) ||
            (typeof data?.error === 'string' && data.error) ||
            null
          if (detail) {
            const wrapped = new ServiceRequestError(detail, {
              status: error.response.status,
              url: error.config?.url,
              backendDetail: detail,
            })
            return Promise.reject(wrapped)
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token: string) {
    this.jwtToken = token.trim()
  }

  private getAuthToken(): string {
    if (this.jwtToken) return this.jwtToken

    const envToken =
      import.meta.env.VITE_ADMIN_TOKEN?.trim() ||
      import.meta.env.VITE_JWT_TOKEN?.trim() ||
      ''
    if (envToken) return envToken

    if (typeof window === 'undefined') return ''

    const simpleKeys = [
      'admin_token',
      'jwt_token',
      'access_token',
      'token',
      'VITE_ADMIN_TOKEN',
      'VITE_JWT_TOKEN',
    ]

    for (const key of simpleKeys) {
      const localValue = window.localStorage.getItem(key)?.trim()
      if (localValue) return localValue

      const sessionValue = window.sessionStorage.getItem(key)?.trim()
      if (sessionValue) return sessionValue
    }

    // Supabase JS stores the auth session in localStorage under sb-*-auth-token.
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) {
        continue
      }

      const raw = window.localStorage.getItem(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)

        // Some versions store an object, others store an array.
        if (typeof parsed?.access_token === 'string' && parsed.access_token.trim()) {
          return parsed.access_token.trim()
        }

        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
          return parsed[0].trim()
        }
      } catch {
        // Ignore malformed storage values and keep searching.
      }
    }

    return ''
  }

  // ==========================================
  // PAYMENT VERIFICATION ENDPOINTS
  // ==========================================

  /**
   * List all pending wallet topup requests (admin view)
   */
  async getPaymentRequests(status?: string): Promise<PaymentRequest[]> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/wallet/admin/topup/requests', { params })
      return response.data.requests || []
    } catch (error) {
      const normalized = this.normalizeError(error)
      console.error('Error fetching payment requests:', normalized)
      throw this.toServiceError(normalized, 'load payment requests')
    }
  }

  /**
   * Get detailed information about a specific payment request
   * Note: Backend doesn't have a dedicated GET/{id} endpoint,
   * so we fetch from the list and find it
   */
  async getPaymentRequestDetail(id: string): Promise<PaymentRequest> {
    try {
      const all = await this.getPaymentRequests()
      const found = all.find((r) => r.id === id)
      if (!found) throw new Error(`Payment request ${id} not found`)
      return found
    } catch (error) {
      console.error('Error fetching payment request detail:', error)
      throw error
    }
  }

  /**
   * Approve a wallet topup request (credits driver's wallet)
   */
  async approvePaymentRequest(requestId: string): Promise<PaymentRequest> {
    try {
      const response = await this.api.patch(
        `/wallet/admin/topup/requests/${requestId}/approve`
      )
      return response.data
    } catch (error) {
      console.error('Error approving payment request:', error)
      throw error
    }
  }

  /**
   * Reject a wallet topup request
   */
  async rejectPaymentRequest(
    requestId: string,
    rejectionReason: string
  ): Promise<PaymentRequest> {
    try {
      const response = await this.api.patch(
        `/wallet/admin/topup/requests/${requestId}/reject`,
        { rejection_reason: rejectionReason }
      )
      return response.data
    } catch (error) {
      console.error('Error rejecting payment request:', error)
      throw error
    }
  }

  // ==========================================
  // DRIVER APPROVAL ENDPOINTS
  // ==========================================

  /**
   * List drivers with optional status filter (admin endpoint)
   */
  async getDrivers(status?: string): Promise<Driver[]> {
    try {
      const params = status ? { verification_status: status } : {}
      const response = await this.api.get('/drivers/admin/list', { params })
      return response.data.drivers || []
    } catch (error) {
      console.error('Error fetching drivers:', error)
      throw error
    }
  }

  async createDriver(form: {
    full_name: string
    phone_number: string
    email?: string
    license_number: string
    license_expiry: string
    vehicle_type: string
  }): Promise<CreateDriverResponse> {
    try {
      const response = await this.api.post('/drivers/admin/create', form)
      return response.data
    } catch (error) {
      console.error('Error creating driver:', error)
      throw error
    }
  }

  async uploadDriverDocuments(driverId: string, documents: DriverDocumentUploadInput[]): Promise<DriverDocument[]> {
    const uploadedDocuments: DriverDocument[] = []

    for (const [index, document] of documents.entries()) {
      const objectPath = `${driverId}/${this.buildDriverDocumentFileName(document.documentType, document.file, index)}`

      await this.uploadToSupabaseStorage('driver-documents', objectPath, document.file)

      const inserted = await this.insertDriverDocumentRecord({
        driver_id: driverId,
        document_type: document.documentType,
        file_url: this.getPublicStorageUrl('driver-documents', objectPath),
        status: 'pending',
      })

      uploadedDocuments.push(inserted)
    }

    return uploadedDocuments
  }

  private buildDriverDocumentFileName(documentType: string, file: File, index: number): string {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? 'bin' : 'bin'
    const timestamp = Date.now() + index
    return `${documentType}_${timestamp}.${extension}`
  }

  private getSupabaseAdminHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
    const adminToken = (import.meta.env.VITE_ADMIN_TOKEN as string | undefined)?.trim() || this.getAuthToken()

    if (!import.meta.env.VITE_SUPABASE_URL || !anonKey || !adminToken) {
      throw new ServiceRequestError('Supabase document upload is not configured for this environment.')
    }

    return {
      apikey: anonKey,
      Authorization: `Bearer ${adminToken}`,
      ...extraHeaders,
    }
  }

  private getPublicStorageUrl(bucket: string, objectPath: string): string {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()

    if (!supabaseUrl) {
      throw new ServiceRequestError('Supabase storage URL is not configured.')
    }

    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/')
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`
  }

  private async uploadToSupabaseStorage(bucket: string, objectPath: string, file: File): Promise<void> {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()

    if (!supabaseUrl) {
      throw new ServiceRequestError('Supabase storage URL is not configured.')
    }

    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
      method: 'POST',
      headers: this.getSupabaseAdminHeaders({
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      }),
      body: file,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new ServiceRequestError('Failed to upload driver document.', {
        status: response.status,
        url: `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`,
        backendDetail: detail,
      })
    }
  }

  private async insertDriverDocumentRecord(body: {
    driver_id: string
    document_type: string
    file_url: string
    status: 'pending'
  }): Promise<DriverDocument> {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()

    if (!supabaseUrl) {
      throw new ServiceRequestError('Supabase REST URL is not configured.')
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/driver_documents`, {
      method: 'POST',
      headers: this.getSupabaseAdminHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new ServiceRequestError('Failed to save driver document record.', {
        status: response.status,
        url: `${supabaseUrl}/rest/v1/driver_documents`,
        backendDetail: detail,
      })
    }

    const [inserted] = await response.json() as DriverDocument[]
    return inserted
  }

  /**
   * Get detailed information about a specific driver
   */
  async getDriverDetail(driverId: string): Promise<Driver> {
    try {
      const response = await this.api.get(`/drivers/${driverId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching driver detail:', error)
      throw error
    }
  }

  /**
   * Approve a driver profile (activate)
   */
  async approveDriver(driverId: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/activate`)
      return response.data
    } catch (error) {
      console.error('Error approving driver:', error)
      throw error
    }
  }

  async rejectDriver(driverId: string, feedback?: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/reject`, { feedback, reason: feedback })
      return response.data
    } catch (error) {
      console.error('Error rejecting driver:', error)
      throw error
    }
  }

  async suspendDriver(
    driverId: string,
    body: string | { reason: string; end_date?: string; appeal_url?: string }
  ): Promise<Driver> {
    try {
      const payload = typeof body === 'string' ? { reason: body } : body
      const response = await this.api.patch(`/drivers/${driverId}/suspend`, payload)
      return response.data
    } catch (error) {
      console.error('Error suspending driver:', error)
      throw error
    }
  }

  async unsuspendDriver(driverId: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/unsuspend`)
      return response.data
    } catch (error) {
      console.error('Error unsuspending driver:', error)
      throw error
    }
  }

  async approveDocument(driverId: string, documentId: string): Promise<DriverDocument> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/documents/${documentId}/approve`)
      return response.data
    } catch (error) {
      console.error('Error approving document:', error)
      throw error
    }
  }

  async rejectDocument(driverId: string, documentId: string, reason?: string): Promise<DriverDocument> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/documents/${documentId}/reject`, { reason })
      return response.data
    } catch (error) {
      console.error('Error rejecting document:', error)
      throw error
    }
  }

  async updateDriverCategory(driverId: string, category: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/category`, { category })
      return response.data
    } catch (error) {
      console.error('Error updating driver category:', error)
      throw error
    }
  }

  async deleteDriver(driverId: string): Promise<void> {
    try {
      await this.api.delete(`/drivers/${driverId}`)
    } catch (error) {
      console.error('Error deleting driver:', error)
      throw error
    }
  }

  async getDriverTrips(driverId: string, limit = 50, offset = 0): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/trips`, { params: { limit, offset } })
      return response.data.trips || []
    } catch (error) {
      console.error('Error fetching driver trips:', error)
      throw error
    }
  }

  async getDriverEarnings(driverId: string): Promise<{ transactions: unknown[]; current_balance: number }> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/earnings`)
      return response.data
    } catch (error) {
      console.error('Error fetching driver earnings:', error)
      throw error
    }
  }

  async getDriverRatings(driverId: string): Promise<{ ratings: unknown[]; average_rating: number; total_trips: number }> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/ratings`)
      return response.data
    } catch (error) {
      console.error('Error fetching driver ratings:', error)
      throw error
    }
  }

  async getDriverCompliance(driverId: string): Promise<unknown> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/compliance`)
      return response.data
    } catch (error) {
      console.error('Error fetching driver compliance:', error)
      throw error
    }
  }

  async getDriverActivity(driverId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/activity`)
      return response.data.activity || []
    } catch (error) {
      console.error('Error fetching driver activity:', error)
      throw error
    }
  }

  // ==========================================
  // WALLET / TRANSACTION ENDPOINTS
  // ==========================================

  /**
   * Get a driver's current wallet balance (admin endpoint)
   */
  async getWalletBalance(driverId: string): Promise<number> {
    try {
      const response = await this.api.get(`/wallet/admin/driver/${driverId}/balance`)
      return response.data.balance || 0
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      throw error
    }
  }

  /**
   * Get transaction history for a driver (admin endpoint)
   */
  async getWalletTransactions(driverId: string): Promise<WalletTransaction[]> {
    try {
      const response = await this.api.get(`/wallet/admin/driver/${driverId}/transactions`)
      return response.data.transactions || []
    } catch (error) {
      console.error('Error fetching wallet transactions:', error)
      throw error
    }
  }

  // ==========================================
  // RIDES ENDPOINTS
  // ==========================================

  /**
   * List all rides (admin endpoint)
   */
  async getRides(status?: string): Promise<Ride[]> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/rides/admin/list', { params })
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Error fetching rides:', error)
      throw error
    }
  }

  async getNotifications(status?: string): Promise<AdminNotification[]> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/admin/notifications/history', { params })
      return response.data.notifications || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  async getAdminLogs(action?: string): Promise<AdminLog[]> {
    try {
      const params = action ? { action } : {}
      const response = await this.api.get('/admin/audit/log', { params })
      return response.data.logs || []
    } catch (error) {
      console.error('Error fetching admin logs:', error)
      throw error
    }
  }

  // ==========================================
  // RIDES — EXTENDED ENDPOINTS
  // ==========================================

  async getRideHistory(limit = 50, offset = 0): Promise<Ride[]> {
    try {
      const response = await this.api.get('/rides/history/all', { params: { limit, offset } })
      return Array.isArray(response.data) ? response.data : response.data.rides || []
    } catch (error) {
      console.error('Error fetching ride history:', error)
      throw error
    }
  }

  async getActiveRideRequests(): Promise<ActiveRideRequest[]> {
    try {
      const response = await this.api.get('/rides/requests/active')
      return Array.isArray(response.data) ? response.data : response.data.requests || []
    } catch (error) {
      console.error('Error fetching active ride requests:', error)
      throw error
    }
  }

  async getActiveTrips(): Promise<ActiveTripItem[]> {
    try {
      const response = await this.api.get('/rides/admin/active')
      return Array.isArray(response.data) ? response.data : response.data.trips || []
    } catch (error) {
      console.error('Error fetching active trips:', error)
      throw error
    }
  }

  async getMarketplaceData(): Promise<{ requests: MarketplaceRequestItem[] }> {
    try {
      const response = await this.api.get('/rides/admin/marketplace')
      return { requests: Array.isArray(response.data) ? response.data : response.data.requests || [] }
    } catch (error) {
      console.error('Error fetching marketplace data:', error)
      throw error
    }
  }

  async getRideDetail(rideId: string): Promise<RideDetailResponse> {
    try {
      const response = await this.api.get(`/rides/${rideId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching ride detail:', error)
      throw error
    }
  }

  async getTripDetail(tripId: string): Promise<TripResponse> {
    try {
      const response = await this.api.get(`/rides/trips/${tripId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching trip detail:', error)
      throw error
    }
  }

  async getRideOffers(rideId: string): Promise<RideOfferHistory> {
    try {
      const response = await this.api.get(`/rides/${rideId}/offers`)
      return response.data
    } catch (error) {
      console.error('Error fetching ride offers:', error)
      throw error
    }
  }

  async cancelRideRequest(requestId: string, reason: string): Promise<void> {
    try {
      await this.api.post(`/rides/request/${requestId}/cancel`, { reason })
    } catch (error) {
      console.error('Error cancelling ride request:', error)
      throw error
    }
  }

  async forceEndTrip(rideId: string, reason: string, role: string): Promise<void> {
    try {
      await this.api.patch(`/rides/admin/${rideId}/force-end`, { reason, role })
    } catch (error) {
      console.error('Error force-ending trip:', error)
      throw error
    }
  }

  async sendPushToTrip(
    rideId: string,
    target: 'customer' | 'driver',
    title: string,
    message: string
  ): Promise<void> {
    try {
      await this.api.post(`/rides/admin/${rideId}/send-push`, { target, title, message })
    } catch (error) {
      console.error('Error sending push to trip:', error)
      throw error
    }
  }

  // ==========================================
  // DISPUTES ENDPOINTS
  // ==========================================

  async getDisputes(status?: string): Promise<{ disputes: DisputeItem[] }> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/rides/admin/disputes', { params })
      return { disputes: Array.isArray(response.data) ? response.data : response.data.disputes || [] }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      throw error
    }
  }

  async refundDispute(rideId: string, notes?: string): Promise<DisputeActionResponse> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/refund`, { notes })
      return response.data
    } catch (error) {
      console.error('Error refunding dispute:', error)
      throw error
    }
  }

  async chargeDriverDispute(rideId: string, notes?: string): Promise<DisputeActionResponse> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/charge-driver`, { notes })
      return response.data
    } catch (error) {
      console.error('Error charging driver for dispute:', error)
      throw error
    }
  }

  async dismissDispute(rideId: string, notes?: string): Promise<DisputeActionResponse> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/dismiss`, { notes })
      return response.data
    } catch (error) {
      console.error('Error dismissing dispute:', error)
      throw error
    }
  }

  async escalateDispute(rideId: string, notes?: string): Promise<DisputeActionResponse> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/escalate`, { notes })
      return response.data
    } catch (error) {
      console.error('Error escalating dispute:', error)
      throw error
    }
  }

  // ==========================================
  // PAYMENTS / FINANCE ENDPOINTS
  // ==========================================

  async getTransactions(params: {
    limit: number
    offset: number
    status?: string
    method?: string
    type?: string
    date_from?: string
    date_to?: string
    amount_min?: number
    amount_max?: number
    has_refund?: boolean
    search?: string
  }): Promise<{ transactions: TransactionItem[]; total: number }> {
    try {
      const response = await this.api.get('/payments/admin/transactions', { params })
      return {
        transactions: response.data.transactions || [],
        total: response.data.total || 0,
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  }

  // ==========================================
  // CONFIG / APP TOGGLES ENDPOINTS
  // ==========================================

  async getAppConfig(): Promise<AppConfigToggle[]> {
    try {
      const response = await this.api.get('/config/admin/app-toggles')
      return Array.isArray(response.data) ? response.data : response.data.toggles || []
    } catch (error) {
      console.error('Error fetching app config:', error)
      throw error
    }
  }

  async updateAppConfig(values: Record<string, string>): Promise<void> {
    try {
      await this.api.patch('/config/admin/app-toggles', values)
    } catch (error) {
      console.error('Error updating app config:', error)
      throw error
    }
  }

  // ==========================================
  // ANALYTICS ENDPOINTS
  // ==========================================

  async getAnalyticsDashboard(): Promise<Record<string, unknown>> {
    try {
      const response = await this.api.get('/analytics/admin/dashboard')
      return response.data
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error)
      throw error
    }
  }

  async getCancellationAnalytics(days: number): Promise<CancellationAnalytics> {
    try {
      const response = await this.api.get('/analytics/admin/cancellations', { params: { days } })
      return response.data
    } catch (error) {
      console.error('Error fetching cancellation analytics:', error)
      throw error
    }
  }

  async getDriverLocations(onlineOnly = false): Promise<DriverLocation[]> {
    try {
      const params = onlineOnly ? { online_only: true } : {}
      const response = await this.api.get('/analytics/admin/driver-locations', { params })
      return Array.isArray(response.data) ? response.data : response.data.locations || []
    } catch (error) {
      console.error('Error fetching driver locations:', error)
      throw error
    }
  }

  async getOfferUpdateMetrics(): Promise<Record<string, unknown>> {
    try {
      const response = await this.api.get('/analytics/admin/offer-update-metrics')
      return response.data
    } catch (error) {
      console.error('Error fetching offer update metrics:', error)
      throw error
    }
  }

  // ==========================================
  // PRICING ENDPOINTS
  // ==========================================

  async getPricingConfig(): Promise<{
    vehicles: VehiclePricingConfig[]
    global_config: GlobalPricingConfig
    category_multipliers: CategoryMultiplierItem[]
  }> {
    try {
      const response = await this.api.get('/admin/pricing/config')
      return response.data
    } catch (error) {
      console.error('Error fetching pricing config:', error)
      throw error
    }
  }

  async updateVehiclePricing(
    vehicleType: string,
    body: Partial<VehiclePricingConfig>
  ): Promise<VehiclePricingConfig> {
    try {
      const response = await this.api.put(`/admin/pricing/vehicle/${vehicleType}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating vehicle pricing:', error)
      throw error
    }
  }

  async updateGlobalPricing(body: Partial<GlobalPricingConfig>): Promise<GlobalPricingConfig> {
    try {
      const response = await this.api.put('/admin/pricing/global', body)
      return response.data
    } catch (error) {
      console.error('Error updating global pricing:', error)
      throw error
    }
  }

  async updateCategoryMultiplier(
    category: string,
    body: Partial<CategoryMultiplierItem>
  ): Promise<CategoryMultiplierItem> {
    try {
      const response = await this.api.put(`/admin/pricing/category/${category}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating category multiplier:', error)
      throw error
    }
  }

  async simulateFare(body: {
    vehicle_type: string
    distance_km: number
    time_band: 'day' | 'evening' | 'night'
    category: string
  }): Promise<FareSimulateResponse> {
    try {
      const response = await this.api.post('/admin/pricing/simulate', body)
      return response.data
    } catch (error) {
      console.error('Error simulating fare:', error)
      throw error
    }
  }

  async getPricingMetrics(days: number): Promise<CategoryMetricsItem[]> {
    try {
      const response = await this.api.get('/admin/pricing/metrics', { params: { days } })
      return Array.isArray(response.data) ? response.data : response.data.metrics || []
    } catch (error) {
      console.error('Error fetching pricing metrics:', error)
      throw error
    }
  }

  async getPricingAuditLog(params: { limit: number }): Promise<PricingAuditLogItem[]> {
    try {
      const response = await this.api.get('/admin/pricing/audit-log', { params })
      return Array.isArray(response.data) ? response.data : response.data.logs || []
    } catch (error) {
      console.error('Error fetching pricing audit log:', error)
      throw error
    }
  }

  // ==========================================
  // AUTH / ROLE ENDPOINTS
  // ==========================================

  async getMyAdminRole(): Promise<{ email: string; full_name?: string; admin_role: string; two_fa_enabled: boolean }> {
    try {
      const response = await this.api.get('/admin/mgmt/role')
      return response.data
    } catch (error) {
      console.error('Error fetching admin role:', error)
      throw error
    }
  }

  async recordAdminLogin(): Promise<{ session_id: string }> {
    try {
      const response = await this.api.post('/admin/mgmt/me/record-login')
      return response.data
    } catch (error) {
      console.error('Error recording admin login:', error)
      throw error
    }
  }

  async invalidateAdminSession(sessionId: string): Promise<void> {
    try {
      await this.api.post(`/admin/mgmt/me/invalidate-session?session_id=${sessionId}`)
    } catch (error) {
      console.error('Error invalidating admin session:', error)
      throw error
    }
  }

  // ==========================================
  // ADMIN MANAGEMENT ENDPOINTS
  // ==========================================

  async listAdminUsers(): Promise<{ admins: AdminUserItem[] }> {
    try {
      const response = await this.api.get('/admin/mgmt/users')
      return { admins: Array.isArray(response.data) ? response.data : response.data.admins || [] }
    } catch (error) {
      console.error('Error listing admin users:', error)
      throw error
    }
  }

  async createAdminUser(form: {
    email: string
    full_name: string
    phone_number: string
    password: string
    admin_role: string
  }): Promise<void> {
    try {
      await this.api.post('/admin/mgmt/users', form)
    } catch (error) {
      console.error('Error creating admin user:', error)
      throw error
    }
  }

  async updateAdminUser(
    id: string,
    form: { full_name: string; phone_number: string; admin_role: string; is_active: boolean }
  ): Promise<void> {
    try {
      await this.api.patch(`/admin/mgmt/users/${id}`, form)
    } catch (error) {
      console.error('Error updating admin user:', error)
      throw error
    }
  }

  async disableAdminUser(id: string): Promise<void> {
    try {
      await this.api.delete(`/admin/mgmt/users/${id}`)
    } catch (error) {
      console.error('Error disabling admin user:', error)
      throw error
    }
  }

  async listIpAllowlist(): Promise<{ entries: IpAllowlistEntry[] }> {
    try {
      const response = await this.api.get('/admin/mgmt/ip-allowlist')
      return { entries: Array.isArray(response.data) ? response.data : response.data.entries || [] }
    } catch (error) {
      console.error('Error listing IP allowlist:', error)
      throw error
    }
  }

  async addIpAllowlist(body: { ip_cidr: string; label?: string }): Promise<void> {
    try {
      await this.api.post('/admin/mgmt/ip-allowlist', body)
    } catch (error) {
      console.error('Error adding IP allowlist entry:', error)
      throw error
    }
  }

  async removeIpAllowlist(id: string): Promise<void> {
    try {
      await this.api.delete(`/admin/mgmt/ip-allowlist/${id}`)
    } catch (error) {
      console.error('Error removing IP allowlist entry:', error)
      throw error
    }
  }

  async listAdminSessions(params: { limit: number }): Promise<{ sessions: AdminSession[]; total: number }> {
    try {
      const response = await this.api.get('/admin/mgmt/sessions', { params })
      return {
        sessions: Array.isArray(response.data) ? response.data : response.data.sessions || [],
        total: response.data.total || 0,
      }
    } catch (error) {
      console.error('Error listing admin sessions:', error)
      throw error
    }
  }

  // ==========================================
  // SOS ENDPOINTS
  // ==========================================

  async getSosSessions(status?: string): Promise<SosSession[]> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/sos/admin/sessions', { params })
      return Array.isArray(response.data) ? response.data : response.data.sessions || []
    } catch (error) {
      console.error('Error fetching SOS sessions:', error)
      throw error
    }
  }

  async getSosSessionDetail(sessionId: string): Promise<SosSession> {
    try {
      const response = await this.api.get(`/sos/admin/sessions/${sessionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SOS session detail:', error)
      throw error
    }
  }

  async resolveSosSession(sessionId: string, notes?: string): Promise<void> {
    try {
      await this.api.patch(`/sos/admin/sessions/${sessionId}/resolve`, notes ? { notes } : {})
    } catch (error) {
      console.error('Error resolving SOS session:', error)
      throw error
    }
  }

  // ==========================================
  // SUPPORT ENDPOINTS
  // ==========================================

  async listSupportTickets(params?: { status?: string; priority?: string }): Promise<SupportTicket[]> {
    try {
      const response = await this.api.get('/admin/support/tickets', { params })
      return Array.isArray(response.data) ? response.data : response.data.tickets || []
    } catch (error) {
      console.error('Error listing support tickets:', error)
      throw error
    }
  }

  // Aliases used by SupportView
  getTickets = (status?: string, priority?: string) =>
    this.listSupportTickets({ status, priority })

  getTicketDetail = (ticketId: string) => this.getSupportTicket(ticketId)

  addTicketMessage = (ticketId: string, body: string | { content: string }) => {
    const content = typeof body === 'string' ? body : body.content
    return this.addSupportMessage(ticketId, content)
  }

  updateTicket = (ticketId: string, updates: Partial<SupportTicket>) =>
    this.updateSupportTicket(ticketId, updates)

  createTicket = (body: { subject: string; [key: string]: unknown }) =>
    this.createSupportTicket(body)

  async createSupportTicket(body: { subject: string; [key: string]: unknown }): Promise<SupportTicket> {
    try {
      const response = await this.api.post('/admin/support/tickets', body)
      return response.data
    } catch (error) {
      console.error('Error creating support ticket:', error)
      throw error
    }
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket> {
    try {
      const response = await this.api.get(`/admin/support/tickets/${ticketId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching support ticket:', error)
      throw error
    }
  }

  async updateSupportTicket(
    ticketId: string,
    body: Partial<SupportTicket>
  ): Promise<SupportTicket> {
    try {
      const response = await this.api.patch(`/admin/support/tickets/${ticketId}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating support ticket:', error)
      throw error
    }
  }

  async addSupportMessage(ticketId: string, content: string): Promise<SupportMessage> {
    try {
      const response = await this.api.post(`/admin/support/tickets/${ticketId}/messages`, { content })
      return response.data
    } catch (error) {
      console.error('Error adding support message:', error)
      throw error
    }
  }

  // ==========================================
  // CUSTOMERS ENDPOINTS
  // ==========================================

  async getCustomers(params?: { search?: string; status?: string }): Promise<unknown[]> {
    try {
      const response = await this.api.get('/customers/admin/list', { params })
      return Array.isArray(response.data) ? response.data : response.data.customers || []
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error
    }
  }

  async createCustomer(form: {
    full_name: string
    phone_number: string
    email?: string
  }): Promise<void> {
    try {
      await this.api.post('/customers/admin/create', form)
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error
    }
  }

  async getCustomerDetail(userId: string): Promise<unknown> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching customer detail:', error)
      throw error
    }
  }

  async banCustomer(userId: string, reason?: string): Promise<void> {
    try {
      await this.api.patch(`/customers/admin/${userId}/ban`, { reason })
    } catch (error) {
      console.error('Error banning customer:', error)
      throw error
    }
  }

  async unbanCustomer(userId: string): Promise<void> {
    try {
      await this.api.patch(`/customers/admin/${userId}/unban`)
    } catch (error) {
      console.error('Error unbanning customer:', error)
      throw error
    }
  }

  async getCustomerTrips(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/trips`)
      return Array.isArray(response.data) ? response.data : response.data.trips || []
    } catch (error) {
      console.error('Error fetching customer trips:', error)
      throw error
    }
  }

  async getCustomerActivity(userId: string): Promise<unknown> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/activity`)
      return response.data
    } catch (error) {
      console.error('Error fetching customer activity:', error)
      throw error
    }
  }

  async exportCustomerGdpr(userId: string): Promise<unknown> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/gdpr/export`)
      return response.data
    } catch (error) {
      console.error('Error exporting customer GDPR data:', error)
      throw error
    }
  }

  async requestCustomerErasure(userId: string, notes?: string): Promise<void> {
    try {
      await this.api.post(`/customers/admin/${userId}/gdpr/erasure-request`, notes ? { notes } : {})
    } catch (error) {
      console.error('Error requesting customer erasure:', error)
      throw error
    }
  }

  async listGdprErasureRequests(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/gdpr/erasure-requests`)
      return Array.isArray(response.data) ? response.data : response.data.requests || []
    } catch (error) {
      console.error('Error listing GDPR erasure requests:', error)
      throw error
    }
  }

  async approveGdprErasure(userId: string, requestId: string): Promise<void> {
    try {
      await this.api.patch(`/customers/admin/${userId}/gdpr/erasure-requests/${requestId}/approve`)
    } catch (error) {
      console.error('Error approving GDPR erasure:', error)
      throw error
    }
  }

  async getCustomerSavedAddresses(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/saved-addresses`)
      return Array.isArray(response.data) ? response.data : response.data.addresses || []
    } catch (error) {
      console.error('Error fetching customer saved addresses:', error)
      throw error
    }
  }

  async getCustomerEmergencyContacts(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/emergency-contacts`)
      return Array.isArray(response.data) ? response.data : response.data.contacts || []
    } catch (error) {
      console.error('Error fetching customer emergency contacts:', error)
      throw error
    }
  }

  async getCustomerNotifications(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/notifications`)
      return Array.isArray(response.data) ? response.data : response.data.notifications || []
    } catch (error) {
      console.error('Error fetching customer notifications:', error)
      throw error
    }
  }

  // ==========================================
  // AUDIT LOG EXPORT
  // ==========================================

  async exportAuditLog(): Promise<Blob> {
    try {
      const response = await this.api.get('/admin/audit/log/export', { responseType: 'blob' })
      return response.data
    } catch (error) {
      console.error('Error exporting audit log:', error)
      throw error
    }
  }

  // Alias used by AuditView
  getAuditLogExportUrl = () => this.exportAuditLog()

  // ==========================================
  // NOTIFICATIONS — SEND ENDPOINTS
  // ==========================================

  async previewNotificationSegment(role?: string, isActive?: boolean): Promise<{ count: number }> {
    try {
      const params: Record<string, unknown> = {}
      if (role) params.role = role
      if (isActive !== undefined) params.is_active = isActive
      const response = await this.api.get('/admin/notifications/segment-preview', { params })
      return response.data
    } catch (error) {
      console.error('Error previewing notification segment:', error)
      throw error
    }
  }

  async getNotificationUsers(search?: string, role?: string): Promise<unknown[]> {
    try {
      const params: Record<string, unknown> = {}
      if (search) params.search = search
      if (role) params.role = role
      const response = await this.api.get('/admin/notifications/users', { params })
      return Array.isArray(response.data) ? response.data : response.data.users || []
    } catch (error) {
      console.error('Error fetching notification users:', error)
      throw error
    }
  }

  async getNotificationHistory(
    limit = 50,
    offset = 0,
    status?: string
  ): Promise<AdminNotification[]> {
    try {
      const params: Record<string, unknown> = { limit, offset }
      if (status) params.status = status
      const response = await this.api.get('/admin/notifications/history', { params })
      return response.data.notifications || []
    } catch (error) {
      console.error('Error fetching notification history:', error)
      throw error
    }
  }

  async sendNotification(body: {
    title: string
    message: string
    target?: string
  }): Promise<void> {
    try {
      await this.api.post('/admin/notifications/send', body)
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  async sendTargetedNotification(body: {
    user_ids: string[]
    title: string
    message: string
  }): Promise<void> {
    try {
      await this.api.post('/admin/notifications/send-targeted', body)
    } catch (error) {
      console.error('Error sending targeted notification:', error)
      throw error
    }
  }

  // ==========================================
  // DASHBOARD ENDPOINTS
  // ==========================================

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await this.api.get('/analytics/admin/dashboard')
      const d = response.data
      return {
        pending_payments_count: d.pending_payments_count ?? d.pending_topup_count ?? 0,
        pending_drivers_count: d.pending_drivers_count ?? d.pending_kyc_count ?? 0,
        active_drivers_count: d.active_drivers_count ?? d.online_drivers ?? 0,
        active_rides_count: d.active_rides_count ?? d.active_rides ?? 0,
      }
    } catch {
      // Fallback: aggregate from individual endpoints if analytics router not yet populated
      try {
        const [pendingPayments, pendingDrivers, approvedDrivers] = await Promise.all([
          this.getPaymentRequests('pending'),
          this.getDrivers('pending'),
          this.getDrivers('approved'),
        ])
        let active_rides_count = 0
        try {
          const [inProgress, enRoute] = await Promise.all([
            this.getRides('in_progress'),
            this.getRides('driver_en_route'),
          ])
          active_rides_count = inProgress.length + enRoute.length
        } catch { /* ignore */ }
        return {
          pending_payments_count: pendingPayments.length,
          pending_drivers_count: pendingDrivers.length,
          active_drivers_count: approvedDrivers.filter((d) => d.is_online).length,
          active_rides_count,
        }
      } catch (fallbackError) {
        const normalized = this.normalizeError(fallbackError)
        throw this.toServiceError(normalized, 'load dashboard metrics')
      }
    }
  }

  // ==========================================
  // DRIVER — EXTENDED ADMIN ACTIONS
  // ==========================================

  async grantDriverCategory(driverId: string, category: string, reason: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/category`, { category, reason })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'update driver category')
    }
  }

  async permanentBanDriver(driverId: string, reason: string): Promise<void> {
    try {
      await this.api.patch(`/drivers/${driverId}/ban`, { reason })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'ban driver')
    }
  }

  async forceOfflineDriver(driverId: string): Promise<void> {
    try {
      await this.api.patch(`/drivers/${driverId}/force-offline`)
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'force driver offline')
    }
  }

  async forceLogoutDriver(driverId: string): Promise<void> {
    try {
      await this.api.post(`/drivers/${driverId}/force-logout`)
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'force logout driver')
    }
  }

  async addDriverNote(driverId: string, note: string): Promise<InternalNote> {
    try {
      const response = await this.api.post(`/drivers/${driverId}/notes`, { note })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'add driver note')
    }
  }

  async getDriverNotes(driverId: string): Promise<InternalNote[]> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/notes`)
      return Array.isArray(response.data) ? response.data : response.data.notes || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get driver notes')
    }
  }

  async reRequestDocument(driverId: string, documentType: string): Promise<void> {
    try {
      await this.api.post(`/drivers/${driverId}/re-request-document`, { document_type: documentType })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 're-request document')
    }
  }

  // ==========================================
  // CUSTOMER — EXTENDED ADMIN ACTIONS
  // ==========================================

  async forceLogoutCustomer(userId: string): Promise<void> {
    try {
      await this.api.post(`/customers/admin/${userId}/force-logout`)
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'force logout customer')
    }
  }

  async addCustomerNote(userId: string, note: string): Promise<InternalNote> {
    try {
      const response = await this.api.post(`/customers/admin/${userId}/notes`, { note })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'add customer note')
    }
  }

  async getCustomerNotes(userId: string): Promise<InternalNote[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/notes`)
      return Array.isArray(response.data) ? response.data : response.data.notes || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get customer notes')
    }
  }

  async adjustCustomerRating(userId: string, rating: number, reason: string): Promise<void> {
    try {
      await this.api.patch(`/customers/admin/${userId}/rating`, { rating, reason })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'adjust customer rating')
    }
  }

  async getCustomerPayments(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/payments`)
      return Array.isArray(response.data) ? response.data : response.data.payments || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get customer payments')
    }
  }

  async getCustomerTickets(userId: string): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/customers/admin/${userId}/tickets`)
      return Array.isArray(response.data) ? response.data : response.data.tickets || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get customer tickets')
    }
  }

  // ==========================================
  // WARNINGS — GENERIC COMPOSER (§9.2.5)
  // ==========================================

  async sendWarningToUser(body: {
    user_id: string
    user_type: 'driver' | 'customer'
    category: 'rate_abuse' | 'no_show' | 'safety' | 'payment_fraud' | 'other'
    message: string
  }): Promise<void> {
    try {
      await this.api.post('/admin/notifications/warning', body)
    } catch (error) {
      // Fallback to targeted push if dedicated endpoint not ready
      await this.sendTargetedNotification({
        user_ids: [body.user_id],
        title: `Warning: ${body.category.replace('_', ' ')}`,
        message: body.message,
      })
    }
  }

  // ==========================================
  // EXCHANGE RATE (§6.6)
  // ==========================================

  async getExchangeRate(): Promise<ExchangeRate> {
    try {
      const response = await this.api.get('/config/admin/exchange-rate')
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get exchange rate')
    }
  }

  async setExchangeRate(rate: number, effectiveFrom?: string): Promise<ExchangeRate> {
    try {
      const response = await this.api.put('/config/admin/exchange-rate', {
        rate_cdf_per_usd: rate,
        effective_from: effectiveFrom,
        source: 'manual',
      })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'set exchange rate')
    }
  }

  // ==========================================
  // WALLET — LOCKED DRIVERS + MANUAL ADJUST (§6.4)
  // ==========================================

  async getLockedDrivers(): Promise<LockedDriver[]> {
    try {
      const response = await this.api.get('/drivers/admin/list', { params: { wallet_state: 'locked' } })
      return Array.isArray(response.data) ? response.data : response.data.drivers || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get locked drivers')
    }
  }

  async manualWalletAdjustment(driverId: string, amount: number, reason: string): Promise<void> {
    try {
      await this.api.post(`/wallet/admin/driver/${driverId}/adjust`, { amount, reason })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'manual wallet adjustment')
    }
  }

  async getWalletLowBalanceThreshold(): Promise<{ threshold: number }> {
    try {
      const response = await this.api.get('/config/admin/wallet-threshold')
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get wallet threshold')
    }
  }

  async setWalletLowBalanceThreshold(threshold: number): Promise<void> {
    try {
      await this.api.put('/config/admin/wallet-threshold', { threshold })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'set wallet threshold')
    }
  }

  // ==========================================
  // SUPPORT — INTERNAL NOTES (§7.2)
  // ==========================================

  async addTicketInternalNote(ticketId: string, note: string): Promise<void> {
    try {
      await this.api.post(`/admin/support/tickets/${ticketId}/internal-notes`, { note })
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'add internal note')
    }
  }

  async getTicketInternalNotes(ticketId: string): Promise<Array<{ id: string; note: string; created_by?: string; created_at: string }>> {
    try {
      const response = await this.api.get(`/admin/support/tickets/${ticketId}/internal-notes`)
      return Array.isArray(response.data) ? response.data : response.data.notes || []
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get internal notes')
    }
  }

  // ==========================================
  // AUDIT LOG — SEARCH / FILTER / EXPORT (§14.1)
  // ==========================================

  async searchAuditLog(params: {
    action?: string
    admin_id?: string
    target_table?: string
    target_id?: string
    date_from?: string
    date_to?: string
    limit?: number
    offset?: number
  }): Promise<{ logs: AdminLog[]; total: number }> {
    try {
      const response = await this.api.get('/admin/audit/log', { params })
      const data = response.data
      return {
        logs: Array.isArray(data) ? data : data.logs || [],
        total: data.total || 0,
      }
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'search audit log')
    }
  }

  // ==========================================
  // SOS ANALYTICS (§8.3)
  // ==========================================

  async getSosAnalytics(days: number): Promise<SosAnalytics> {
    try {
      const response = await this.api.get('/sos/admin/analytics', { params: { days } })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get SOS analytics')
    }
  }

  // ==========================================
  // STANDARD ANALYTICS DASHBOARDS (§12.1)
  // ==========================================

  async getStandardAnalytics(days: number): Promise<StandardAnalytics> {
    try {
      const response = await this.api.get('/analytics/admin/standard', { params: { days } })
      return response.data
    } catch (error) {
      throw this.toServiceError(this.normalizeError(error), 'get standard analytics')
    }
  }

  async getFullDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await this.api.get('/analytics/admin/dashboard')
      const d = response.data
      return {
        pending_payments_count: d.pending_payments_count ?? d.pending_topup_count ?? 0,
        pending_drivers_count: d.pending_drivers_count ?? d.pending_kyc_count ?? 0,
        active_drivers_count: d.active_drivers_count ?? d.online_drivers ?? 0,
        active_rides_count: d.active_rides_count ?? d.active_rides ?? 0,
        completed_trips_today: d.completed_trips_today ?? d.completed_today ?? 0,
        gmv_usd_today: d.gmv_usd_today ?? d.gmv_usd ?? 0,
        gmv_cdf_today: d.gmv_cdf_today ?? d.gmv_cdf ?? 0,
        commission_today: d.commission_today ?? d.commission_usd ?? 0,
        open_tickets_count: d.open_tickets_count ?? d.open_tickets ?? 0,
        sos_active_count: d.sos_active_count ?? d.active_sos ?? 0,
      }
    } catch {
      return this.getDashboardMetrics()
    }
  }

  async getLiveLocationSessions(filters: LiveLocationSessionFilters = {}): Promise<LiveLocationSession[]> {
    try {
      const params: Record<string, string> = {}
      if (filters.status && filters.status !== 'all_live') params.status = filters.status
      if (filters.type && filters.type !== 'all') params.type = filters.type
      if (filters.search) params.search = filters.search

      const response = await this.api.get('/live-location/admin/sessions', { params })
      const data = Array.isArray(response.data) ? response.data : response.data.sessions || []
      return this.filterLiveLocationSessions(data.map((item: unknown) => this.normalizeLiveLocationSession(item)), filters)
    } catch {
      return this.getFallbackLiveLocationSessions(filters)
    }
  }

  async getRecentLiveLocationSessions(filters: LiveLocationSessionFilters = {}): Promise<LiveLocationSession[]> {
    try {
      const params: Record<string, string> = {}
      if (filters.search) params.search = filters.search
      if (filters.type && filters.type !== 'all') params.type = filters.type

      const response = await this.api.get('/live-location/admin/sessions/history', { params })
      const data = Array.isArray(response.data) ? response.data : response.data.sessions || []
      return this.filterLiveLocationSessions(data.map((item: unknown) => this.normalizeLiveLocationSession(item)), {
        ...filters,
        includeHistory: true,
      })
    } catch {
      const sessions = await this.getFallbackLiveLocationSessions({ ...filters, includeHistory: true })
      return sessions.filter((session) => session.status !== 'active' && session.status !== 'stale')
    }
  }

  async getLiveLocationSession(locator: {
    sessionId?: string
    rideId?: string
    sosSessionId?: string
  }): Promise<LiveLocationSession | null> {
    try {
      if (locator.sessionId) {
        const response = await this.api.get(`/live-location/admin/sessions/${locator.sessionId}`)
        return this.normalizeLiveLocationSession(response.data)
      }
      if (locator.rideId) {
        const response = await this.api.get(`/live-location/admin/rides/${locator.rideId}`)
        return this.normalizeLiveLocationSession(response.data)
      }
      if (locator.sosSessionId) {
        const response = await this.api.get(`/live-location/admin/sos/${locator.sosSessionId}`)
        return this.normalizeLiveLocationSession(response.data)
      }
    } catch {
      // Fall back to current endpoints below.
    }

    if (locator.rideId) {
      const [ride, driverLocations] = await Promise.all([
        this.getRideDetail(locator.rideId),
        this.getDriverLocations(false).catch(() => []),
      ])
      return this.buildRideLiveLocationSession(ride, driverLocations)
    }

    if (locator.sosSessionId) {
      const sos = await this.getSosSessionDetail(locator.sosSessionId)
      return this.buildSosLiveLocationSession(sos)
    }

    if (locator.sessionId) {
      const sessions = await this.getFallbackLiveLocationSessions({ includeHistory: true })
      return sessions.find((session) => session.id === locator.sessionId) ?? null
    }

    return null
  }

  subscribeToLiveLocationSessions(
    filters: LiveLocationSessionFilters,
    onUpdate: (sessions: LiveLocationSession[]) => void,
    onError?: (error: Error) => void,
    intervalMs = 15000,
  ): () => void {
    let cancelled = false

    const load = async () => {
      try {
        const sessions = await this.getLiveLocationSessions(filters)
        if (!cancelled) onUpdate(sessions)
      } catch (error) {
        if (!cancelled && onError) onError(error instanceof Error ? error : new Error('Failed to load live location sessions'))
      }
    }

    void load()
    const intervalId = window.setInterval(() => void load(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }

  subscribeToLiveLocationSession(
    locator: { sessionId?: string; rideId?: string; sosSessionId?: string },
    onUpdate: (session: LiveLocationSession | null) => void,
    onError?: (error: Error) => void,
    intervalMs = 10000,
  ): () => void {
    let cancelled = false

    const load = async () => {
      try {
        const session = await this.getLiveLocationSession(locator)
        if (!cancelled) onUpdate(session)
      } catch (error) {
        if (!cancelled && onError) onError(error instanceof Error ? error : new Error('Failed to load live location session'))
      }
    }

    void load()
    const intervalId = window.setInterval(() => void load(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }

  async recordLiveLocationView(body: {
    entity_viewed: string
    session_type: 'trip_tracking' | 'sos_tracking'
    session_id?: string
    role?: string
  }): Promise<void> {
    try {
      await this.api.post('/admin/audit/log', {
        action: 'live_location_view',
        target_id: body.session_id ?? body.entity_viewed,
        target_table: body.session_type,
        metadata: {
          entity_viewed: body.entity_viewed,
          session_type: body.session_type,
          role: body.role,
        },
      })
    } catch (error) {
      console.warn('Live location audit logging unavailable:', error)
    }
  }

  private async getFallbackLiveLocationSessions(filters: LiveLocationSessionFilters): Promise<LiveLocationSession[]> {
    const activeRideStatuses = ['in_progress', 'driver_en_route', 'arrived']
    const ridePromises = activeRideStatuses.map((status) => this.getRides(status).catch(() => []))
    const [rideGroups, driverLocations, sosActive, rideHistory, sosAll] = await Promise.all([
      Promise.all(ridePromises),
      this.getDriverLocations(false).catch(() => []),
      this.getSosSessions('active').catch(() => []),
      filters.includeHistory ? this.getRideHistory(25, 0).catch(() => []) : Promise.resolve([]),
      filters.includeHistory ? this.getSosSessions().catch(() => []) : Promise.resolve([]),
    ])

    const rides = rideGroups.flat()
    const rideSessions = rides.map((ride) => this.buildRideLiveLocationSession(ride, driverLocations))
    const sosSessions = sosActive.map((session) => this.buildSosLiveLocationSession(session))

    const historyRideSessions = filters.includeHistory
      ? rideHistory.map((ride) => this.buildRideLiveLocationSession(ride, driverLocations, true))
      : []
    const historySosSessions = filters.includeHistory
      ? sosAll
          .filter((session) => session.status !== 'active')
          .map((session) => this.buildSosLiveLocationSession(session, true))
      : []

    const merged = [...rideSessions, ...sosSessions, ...historyRideSessions, ...historySosSessions]
    const deduped = Array.from(new Map(merged.map((session) => [session.id, session])).values())
    return this.filterLiveLocationSessions(deduped, filters)
  }

  private filterLiveLocationSessions(
    sessions: LiveLocationSession[],
    filters: LiveLocationSessionFilters,
  ): LiveLocationSession[] {
    const search = filters.search?.trim().toLowerCase()

    return sessions.filter((session) => {
      if (!filters.includeHistory && !['active', 'stale'].includes(session.status)) return false
      if (filters.type && filters.type !== 'all' && session.type !== filters.type) return false
      if (filters.status && filters.status !== 'all_live') {
        if (filters.status === 'active' && session.status !== 'active') return false
        if (filters.status === 'stale' && session.status !== 'stale') return false
        if (filters.status === 'ended' && session.status !== 'ended') return false
        if (filters.status === 'manually_stopped' && session.status !== 'manually_stopped') return false
        if (filters.status === 'expired' && session.status !== 'expired') return false
      }

      if (!search) return true
      const haystack = [
        session.id,
        session.ride_id,
        session.sos_session_id,
        session.customer_name,
        session.customer_phone,
        session.driver_name,
        session.driver_phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(search)
    })
  }

  private buildRideLiveLocationSession(
    ride: Ride | RideDetailResponse,
    driverLocations: DriverLocation[],
    forceHistory = false,
  ): LiveLocationSession {
    const driverLocation = driverLocations.find((item) => item.driver_id === ride.driver_id)
    const driverLastUpdated = driverLocation?.updated_at ?? driverLocation?.last_updated
    const driverStatus = this.resolveLiveLocationStatus({
      status: forceHistory ? 'ended' : undefined,
      is_live: !forceHistory && Boolean(driverLastUpdated),
      ended_at: ride.completed_at ?? ride.cancelled_at,
      last_updated_at: driverLastUpdated,
      stale_after_seconds: 90,
      stop_reason: ride.cancellation_reason,
    })

    return {
      id: `ride:${ride.id}`,
      type: 'ride',
      status: forceHistory ? (ride.cancelled_at ? 'ended' : 'ended') : driverStatus,
      source: 'trip_tracking',
      started_at: ride.started_at ?? ride.created_at,
      expires_at: ride.completed_at ?? ride.cancelled_at,
      ended_at: ride.completed_at ?? ride.cancelled_at,
      stop_reason: ride.cancellation_reason,
      stale_after_seconds: 90,
      ride_id: ride.id,
      sos_session_id: null,
      customer_id: ride.customer_id,
      customer_name: ride.customer_name,
      customer_phone: ride.customer_phone,
      driver_id: ride.driver_id,
      driver_name: ride.driver_name,
      driver_phone: ride.driver_phone,
      pickup: ride.picking_point,
      destination: ride.destination,
      stops: 'stops' in ride && Array.isArray(ride.stops) ? ride.stops : [],
      last_location_timestamp: driverLastUpdated,
      participants: {
        driver: driverLocation
          ? {
              participant_type: 'driver',
              name: ride.driver_name ?? driverLocation.full_name,
              phone: ride.driver_phone ?? driverLocation.phone_number,
              is_live: driverStatus === 'active',
              status: driverStatus,
              source: 'trip_tracking',
              started_at: ride.started_at ?? ride.created_at,
              expires_at: ride.completed_at ?? ride.cancelled_at,
              stop_reason: ride.cancellation_reason,
              last_updated_at: driverLastUpdated,
              point: {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                timestamp: driverLastUpdated ?? ride.started_at ?? ride.created_at,
              },
            }
          : undefined,
      },
    }
  }

  private buildSosLiveLocationSession(session: SosSession, forceHistory = false): LiveLocationSession {
    const customerPoint = this.extractLiveLocationPoint(
      (session as Record<string, unknown>).last_customer_location,
      session,
      ['customer_', 'user_', 'last_known_'],
    )
    const driverPoint = this.extractLiveLocationPoint(
      (session as Record<string, unknown>).last_driver_location,
      session,
      ['driver_'],
    )
    const customerUpdatedAt = this.extractTimestamp(session, ['last_customer_update_at', 'customer_last_updated_at', 'last_updated_at'])
    const driverUpdatedAt = this.extractTimestamp(session, ['last_driver_update_at', 'driver_last_updated_at'])
    const endedAt = this.extractTimestamp(session, ['ended_at', 'resolved_at', 'stopped_at'])
    const expiresAt = this.extractTimestamp(session, ['expires_at'])
    const status = this.resolveLiveLocationStatus({
      status: forceHistory ? 'ended' : (session.status as string | undefined),
      ended_at: endedAt,
      expires_at: expiresAt,
      last_updated_at: customerUpdatedAt ?? driverUpdatedAt,
      stale_after_seconds: Number((session as Record<string, unknown>).stale_after_seconds ?? 120),
      stop_reason: typeof (session as Record<string, unknown>).stop_reason === 'string' ? (session as Record<string, unknown>).stop_reason as string : undefined,
    })

    return {
      id: `sos:${session.id}`,
      type: 'sos',
      status,
      source: 'sos',
      started_at: session.created_at,
      expires_at: expiresAt,
      ended_at: endedAt,
      stopped_at: this.extractTimestamp(session, ['stopped_at']),
      stop_reason: typeof (session as Record<string, unknown>).stop_reason === 'string' ? (session as Record<string, unknown>).stop_reason as string : undefined,
      stale_after_seconds: Number((session as Record<string, unknown>).stale_after_seconds ?? 120),
      ride_id: typeof session.ride_id === 'string' ? session.ride_id : null,
      sos_session_id: session.id,
      customer_id: typeof session.triggered_by === 'string' ? session.triggered_by : null,
      customer_name: typeof (session as Record<string, unknown>).customer_name === 'string' ? (session as Record<string, unknown>).customer_name as string : undefined,
      customer_phone: typeof (session as Record<string, unknown>).customer_phone === 'string' ? (session as Record<string, unknown>).customer_phone as string : undefined,
      driver_id: typeof (session as Record<string, unknown>).driver_id === 'string' ? (session as Record<string, unknown>).driver_id as string : null,
      driver_name: typeof (session as Record<string, unknown>).driver_name === 'string' ? (session as Record<string, unknown>).driver_name as string : undefined,
      driver_phone: typeof (session as Record<string, unknown>).driver_phone === 'string' ? (session as Record<string, unknown>).driver_phone as string : undefined,
      last_location_timestamp: customerUpdatedAt ?? driverUpdatedAt,
      participants: {
        customer: customerPoint
          ? {
              participant_type: 'customer',
              name: typeof (session as Record<string, unknown>).customer_name === 'string' ? (session as Record<string, unknown>).customer_name as string : undefined,
              phone: typeof (session as Record<string, unknown>).customer_phone === 'string' ? (session as Record<string, unknown>).customer_phone as string : undefined,
              is_live: status === 'active',
              status,
              source: 'sos',
              started_at: session.created_at,
              expires_at: expiresAt,
              stopped_at: this.extractTimestamp(session, ['stopped_at']),
              stop_reason: typeof (session as Record<string, unknown>).stop_reason === 'string' ? (session as Record<string, unknown>).stop_reason as string : undefined,
              last_updated_at: customerUpdatedAt,
              point: customerPoint,
            }
          : undefined,
        driver: driverPoint
          ? {
              participant_type: 'driver',
              name: typeof (session as Record<string, unknown>).driver_name === 'string' ? (session as Record<string, unknown>).driver_name as string : undefined,
              phone: typeof (session as Record<string, unknown>).driver_phone === 'string' ? (session as Record<string, unknown>).driver_phone as string : undefined,
              is_live: status === 'active',
              status,
              source: 'sos',
              started_at: session.created_at,
              expires_at: expiresAt,
              stopped_at: this.extractTimestamp(session, ['stopped_at']),
              stop_reason: typeof (session as Record<string, unknown>).stop_reason === 'string' ? (session as Record<string, unknown>).stop_reason as string : undefined,
              last_updated_at: driverUpdatedAt,
              point: driverPoint,
            }
          : undefined,
      },
    }
  }

  private normalizeLiveLocationSession(payload: unknown): LiveLocationSession {
    const data = (payload ?? {}) as Record<string, any>
    const driver = data.driver ?? data.participants?.driver
    const customer = data.customer ?? data.participants?.customer
    const status = this.resolveLiveLocationStatus({
      status: typeof data.status === 'string' ? data.status : undefined,
      is_live: data.is_live,
      ended_at: data.ended_at,
      expires_at: data.expires_at,
      stopped_at: data.stopped_at,
      last_updated_at: data.last_updated_at ?? data.last_customer_update_at ?? data.last_driver_update_at,
      stale_after_seconds: Number(data.stale_after_seconds ?? 120),
      stop_reason: data.stop_reason,
    })

    return {
      id: String(data.id ?? data.session_id ?? `session:${Date.now()}`),
      type: data.type === 'sos' ? 'sos' : 'ride',
      status,
      source: data.source === 'sos' ? 'sos' : data.source === 'manual_live_share' ? 'manual_live_share' : 'trip_tracking',
      started_at: data.started_at,
      expires_at: data.expires_at,
      ended_at: data.ended_at,
      stopped_at: data.stopped_at,
      stop_reason: data.stop_reason,
      stale_after_seconds: Number(data.stale_after_seconds ?? 120),
      ride_id: data.ride_id ?? null,
      sos_session_id: data.sos_session_id ?? null,
      customer_id: data.customer_id ?? null,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      driver_id: data.driver_id ?? null,
      driver_name: data.driver_name,
      driver_phone: data.driver_phone,
      pickup: data.pickup,
      destination: data.destination,
      stops: Array.isArray(data.stops) ? data.stops : [],
      route_path: Array.isArray(data.route_path) ? data.route_path : undefined,
      last_location_timestamp: data.last_updated_at ?? data.last_customer_update_at ?? data.last_driver_update_at,
      participants: {
        driver: this.normalizeLiveLocationParticipant(driver, 'driver', status, data),
        customer: this.normalizeLiveLocationParticipant(customer, 'customer', status, data),
      },
    }
  }

  private normalizeLiveLocationParticipant(
    payload: Record<string, any> | undefined,
    participantType: LiveLocationParticipantType,
    fallbackStatus: LiveLocationStatus,
    sessionData: Record<string, any>,
  ): LiveLocationParticipant | undefined {
    if (!payload) return undefined
    const lastUpdatedAt = payload.last_updated_at ?? payload.timestamp ?? sessionData[`last_${participantType}_update_at`]
    const status = this.resolveLiveLocationStatus({
      status: payload.status,
      is_live: payload.is_live,
      ended_at: sessionData.ended_at,
      expires_at: payload.expires_at ?? sessionData.expires_at,
      stopped_at: payload.stopped_at ?? sessionData.stopped_at,
      last_updated_at: lastUpdatedAt,
      stale_after_seconds: Number(payload.stale_after_seconds ?? sessionData.stale_after_seconds ?? 120),
      stop_reason: payload.stop_reason ?? sessionData.stop_reason,
    })

    const point = this.extractLiveLocationPoint(payload, payload, [])
    return {
      participant_type: participantType,
      name: payload.name,
      phone: payload.phone,
      is_live: status === 'active',
      status,
      source: payload.source === 'sos' ? 'sos' : payload.source === 'manual_live_share' ? 'manual_live_share' : 'trip_tracking',
      started_at: payload.started_at ?? sessionData.started_at,
      expires_at: payload.expires_at ?? sessionData.expires_at,
      stopped_at: payload.stopped_at ?? sessionData.stopped_at,
      stop_reason: payload.stop_reason ?? sessionData.stop_reason,
      last_updated_at: lastUpdatedAt,
      point,
    }
  }

  private resolveLiveLocationStatus(input: {
    status?: string
    is_live?: boolean
    ended_at?: string
    expires_at?: string
    stopped_at?: string
    last_updated_at?: string
    stale_after_seconds?: number
    stop_reason?: string
  }): LiveLocationStatus {
    const rawStatus = input.status?.toLowerCase()
    if (rawStatus === 'active' || rawStatus === 'stale' || rawStatus === 'ended' || rawStatus === 'manually_stopped' || rawStatus === 'expired') {
      return rawStatus
    }
    if (input.stopped_at || rawStatus === 'stopped' || rawStatus === 'manually_stopped') return 'manually_stopped'
    if (input.ended_at || rawStatus === 'resolved' || rawStatus === 'cancelled' || rawStatus === 'completed') return 'ended'
    if (input.expires_at && new Date(input.expires_at).getTime() <= Date.now()) return 'expired'
    if (!input.last_updated_at) return input.is_live === false ? 'stale' : 'active'

    const staleAfterMs = (input.stale_after_seconds ?? 120) * 1000
    const ageMs = Date.now() - new Date(input.last_updated_at).getTime()
    if (!Number.isFinite(ageMs) || ageMs < 0) return 'active'
    return ageMs > staleAfterMs ? 'stale' : 'active'
  }

  private extractLiveLocationPoint(
    value: unknown,
    fallbackObject: Record<string, unknown>,
    prefixes: string[],
  ): LiveLocationPoint | undefined {
    const direct = value as Record<string, unknown> | undefined
    const candidates = [direct, fallbackObject]

    for (const candidate of candidates) {
      if (!candidate) continue
      for (const prefix of prefixes.length > 0 ? prefixes : ['']) {
        const latitude = candidate[`${prefix}latitude`] ?? candidate[`${prefix}lat`] ?? candidate.latitude ?? candidate.lat
        const longitude = candidate[`${prefix}longitude`] ?? candidate[`${prefix}lng`] ?? candidate.longitude ?? candidate.lng
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          return {
            latitude,
            longitude,
            heading: typeof (candidate[`${prefix}heading`] ?? candidate.heading) === 'number' ? Number(candidate[`${prefix}heading`] ?? candidate.heading) : null,
            speed: typeof (candidate[`${prefix}speed`] ?? candidate.speed) === 'number' ? Number(candidate[`${prefix}speed`] ?? candidate.speed) : null,
            accuracy: typeof (candidate[`${prefix}accuracy`] ?? candidate.accuracy) === 'number' ? Number(candidate[`${prefix}accuracy`] ?? candidate.accuracy) : null,
            timestamp: this.extractTimestamp(candidate, [`${prefix}timestamp`, `${prefix}updated_at`, `${prefix}last_updated_at`, 'timestamp', 'updated_at', 'last_updated_at']) ?? new Date().toISOString(),
          }
        }
      }
    }

    return undefined
  }

  private extractTimestamp(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && value.trim().length > 0) return value
    }
    return undefined
  }

  private normalizeError(error: unknown): {
    message: string
    status?: number
    backendDetail?: string
    url?: string
  } {
    if (!axios.isAxiosError(error)) {
      return {
        message: error instanceof Error ? error.message : 'Unexpected error',
      }
    }

    const status = error.response?.status
    const backendDetail =
      (error.response?.data as any)?.detail || (error.response?.data as any)?.error || ''
    const url = error.config?.url

    if (!error.response) {
      return {
        message: `Backend API is unavailable at ${this.backendUrl}. Start the FastAPI server or set VITE_BACKEND_URL to a reachable API host.`,
        status,
        backendDetail,
        url,
      }
    }

    if (status === 401) {
      return {
        message:
          'Unauthorized (401). Ensure the admin token is valid and backend Supabase environment variables use real project credentials.',
        backendDetail,
        status,
        url,
      }
    }

    return {
      message: error.message,
      status,
      backendDetail,
      url,
    }
  }

  private toServiceError(
    normalized: { message: string; status?: number; backendDetail?: string; url?: string },
    action: string
  ): ServiceRequestError {
    return new ServiceRequestError(`Failed to ${action}. ${normalized.message}`, normalized)
  }
}

// Initialize service — token is always resolved dynamically from the Supabase session
// inside the axios interceptor; no static token needed at startup.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
)

export const supabaseService = new AlboTaxService(BACKEND_URL, '')

export default AlboTaxService
