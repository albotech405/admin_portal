import axios, { AxiosInstance } from 'axios'

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
  // Enhanced fields from GET /drivers/{id}
  category?: 'standard' | 'premium' | 'lady_driver'
  gender?: 'male' | 'female'
  passenger_preference?: 'male' | 'female' | 'any'
  email?: string
  profile_image_url?: string
  payment_phone?: string
  mobile_money_mpesa?: string
  mobile_money_orange?: string
  mobile_money_airtel?: string
  latitude?: number
  longitude?: number
  suspension_end_date?: string
  appeal_contact?: string
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
export interface Ride {
  id: string
  ride_request_id?: string
  customer_id: string
  driver_id: string
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
  created_at: string
  // Enhanced fields from GET /rides/{id}
  customer_name?: string
  customer_avatar_url?: string
  driver_name?: string
  driver_avatar_url?: string
  distance_km?: number
  duration_minutes?: number
  platform_commission_amount?: number
  category?: string
  stops?: { name: string; latitude: number; longitude: number }[]
  reason_code?: string
  reason_text?: string
}

/**
 * Ride Detail Response from GET /rides/{id}
 * Extended ride information with customer/driver names, pricing breakdown
 */
export interface RideDetailResponse {
  id: string
  ride_request_id?: string
  customer_id: string
  driver_id: string
  customer_name?: string
  customer_avatar_url?: string
  customer_phone?: string
  driver_name?: string
  driver_phone?: string
  driver_avatar_url?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  customer_comment?: string
  price: number
  platform_commission_amount?: number
  status: string
  category?: string
  distance_km?: number
  duration_minutes?: number
  stops?: { name: string; latitude: number; longitude: number }[]
  reason_code?: string
  reason_text?: string
  started_at?: string
  completed_at?: string
  arrived_at?: string
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  vehicle_snapshot?: {
    vehicle_type: string
    license_plate: string
    make: string
    model: string
    color: string
  }
  created_at: string
}

/**
 * Trip Response from GET /rides/trips/{id}
 * Completed trip details with ratings
 */
export interface TripResponse {
  id: string
  customer_id: string
  driver_id: string
  customer_name?: string
  customer_phone?: string
  driver_name?: string
  driver_phone?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  price: number
  platform_commission_amount?: number
  status: string
  category?: string
  distance_km?: number
  duration_minutes?: number
  customer_rating?: number
  driver_rating?: number
  started_at?: string
  completed_at?: string
  created_at: string
}

/**
 * Offer history for a specific ride — from GET /rides/{ride_id}/offers
 */
export interface RideOffer {
  id: string
  driver_id: string
  driver_name?: string
  driver_phone?: string
  price: number
  status: string
  created_at: string
  is_update: boolean
}

export interface RideOfferHistory {
  ride_id: string
  ride_request_id?: string
  offers: RideOffer[]
  original_price?: number
  final_price?: number
  update_count: number
}

/**
 * Offer Update Metrics from GET /analytics/admin/offer-update-metrics
 */
export interface OfferUpdateMetrics {
  total_offers_sent: number
  total_updates_received: number
  update_rate: number
  driver_breakdown: {
    driver_id: string
    driver_name: string
    driver_phone: string
    offers_sent: number
    updates_received: number
    update_rate: number
  }[]
  hourly_breakdown: {
    hour: string
    offers_sent: number
    updates_received: number
    update_rate: number
  }[]
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
  active_sos_count?: number
  stale_requests_count?: number
}

/**
 * Driver Location from GET /analytics/admin/driver-locations
 */
export interface DriverLocation {
  driver_id: string
  full_name?: string
  phone_number?: string
  latitude: number
  longitude: number
  is_online: boolean
  updated_at?: string
}

export interface Customer {
  id: string
  full_name: string
  phone_number: string
  email?: string
  is_active: boolean
  is_admin?: boolean
  gender?: string
  profile_image_url?: string
  customer_rating?: number
  total_customer_ratings?: number
  created_at: string
  updated_at: string
}

export interface SosSession {
  id: string
  user_id: string
  user_type: 'driver' | 'customer'
  status: 'active' | 'resolved' | 'cancelled'
  sos_type: string
  latitude?: number
  longitude?: number
  location_name?: string
  notes?: string
  resolved_at?: string
  resolved_by?: string
  created_at: string
}

export interface AppConfigToggle {
  key: string
  value: string
  updated_at?: string
  updated_by?: string
}

export interface ActiveRideRequest {
  id: string
  customer_id: string
  customer_name?: string
  customer_phone?: string
  picking_point: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
  category: string
  price: number
  status: string
  bid_count?: number
  is_stale?: boolean
  created_at: string
}

export interface MarketplaceBidItem {
  driver_id: string
  driver_name?: string | null
  driver_phone?: string | null
  price: number
  created_at: string
  vehicle_make?: string | null
  vehicle_model?: string | null
  vehicle_color?: string | null
  vehicle_license_plate?: string | null
}

export interface MarketplaceRequestItem {
  id: string
  customer_id: string
  customer_name?: string | null
  customer_phone?: string | null
  picking_point?: any
  destination?: any
  comment?: string | null
  suggested_price: number
  status: string
  vehicle_type: string
  category: string
  created_at: string
  expires_at?: string | null
  bid_count: number
  is_stale: boolean
  bids: MarketplaceBidItem[]
}

export interface MarketplaceResponse {
  requests: MarketplaceRequestItem[]
  total_active: number
  stale_count: number
}

export interface ActiveTripItem {
  id: string
  ride_request_id?: string | null
  customer_id: string
  driver_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  driver_name?: string | null
  driver_phone?: string | null
  picking_point?: any
  destination?: any
  price: number
  status: string
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  driver_latitude?: number | null
  driver_longitude?: number | null
  duration_minutes?: number | null
  distance_km?: number | null
}

/**
 * Cancellation Analytics from GET /analytics/admin/cancellations
 */
export interface CancellationReasonBreakdown {
  reason_code: string
  reason_text?: string
  count: number
  cancelled_by_customer: number
  cancelled_by_driver: number
}

export interface RepeatCancellationItem {
  user_id: string
  full_name?: string
  phone_number?: string
  user_type: 'customer' | 'driver'
  cancellation_count: number
  latest_cancellation_at?: string
  reason_codes: string[]
}

export interface SafetyConcernCancellation {
  ride_id: string
  customer_id: string
  customer_name?: string
  driver_id?: string
  driver_name?: string
  reason_text?: string
  cancelled_by?: string
  cancelled_at?: string
  picking_point?: { name?: string }
  destination?: { name?: string }
}

export interface CancellationAnalytics {
  total_cancellations: number
  reason_breakdown: CancellationReasonBreakdown[]
  repeat_cancellations: RepeatCancellationItem[]
  safety_concern_queue: SafetyConcernCancellation[]
}

// ── Disputes & Refunds ─────────────────────────────────────────────────

export interface DisputeItem {
  ride_id: string
  customer_id: string
  customer_name?: string | null
  customer_phone?: string | null
  driver_id?: string | null
  driver_name?: string | null
  driver_phone?: string | null
  picking_point?: any
  destination?: any
  price: number
  status: string
  started_at?: string | null
  completed_at?: string | null
  dispute_reason?: string | null
  dispute_raised_by?: string | null
  dispute_raised_at?: string | null
  dispute_status: string
  dispute_resolved_at?: string | null
  dispute_resolved_by?: string | null
  dispute_notes?: string | null
  created_at: string
}

export interface DisputeListResponse {
  disputes: DisputeItem[]
  total: number
}

export interface DisputeActionResponse {
  message: string
  ride_id: string
  dispute_status: string
}

/**
 * Transaction Browser Item
 * Maps to backend: TransactionItem model from GET /payments/admin/transactions
 */
export interface TransactionItem {
  id: string
  type: 'ride_payment' | 'topup' | 'refund' | 'commission'
  trip_id?: string | null
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  driver_id?: string | null
  driver_name?: string | null
  driver_phone?: string | null
  amount: number
  platform_commission_amount?: number | null
  method?: string | null
  status: string
  category?: string | null
  distance_km?: number | null
  duration_minutes?: number | null
  has_refund: boolean
  created_at: string
  completed_at?: string | null
}

export interface TransactionListResponse {
  transactions: TransactionItem[]
  total: number
}

// ── Notification interfaces ───────────────────────────────────────────────

export interface NotificationSendBody {
  target: 'all_users' | 'all_drivers' | 'all_customers' | 'specific'
  user_ids?: string[]
  title: string
  body: string
  notification_type?: string
  schedule_at?: string
}

export interface NotificationHistoryItem {
  id: string
  user_id: string
  user_name?: string | null
  user_role?: string | null
  title: string
  content: string
  notification_type: string
  status: string
  created_at?: string | null
  read_at?: string | null
}

export interface NotificationHistoryResponse {
  items: NotificationHistoryItem[]
  total: number
}

export interface NotificationUserItem {
  id: string
  full_name?: string | null
  phone_number?: string | null
  role?: string | null
  is_active?: boolean | null
}

export interface NotificationUsersResponse {
  items: NotificationUserItem[]
  total: number
}

export interface SendNotificationResponse {
  success: boolean
  recipient_count: number
  message: string
}

// ── Support Tickets & Chat ────────────────────────────────────────────────

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_name?: string | null
  sender_type: 'admin' | 'customer'
  body: string
  created_at: string
}

export interface TicketListItem {
  id: string
  user_id: string
  user_name?: string | null
  user_phone?: string | null
  user_type: string
  subject: string
  status: string
  priority: string
  assigned_to?: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface TicketListResponse {
  tickets: TicketListItem[]
  total: number
}

export interface TicketUserContext {
  id: string
  full_name?: string | null
  phone_number?: string | null
  email?: string | null
  is_active: boolean
  customer_rating: number
  created_at: string
}

export interface TicketDetail {
  id: string
  user_id: string
  user_type: string
  subject: string
  body: string
  status: string
  priority: string
  assigned_to?: string | null
  created_at: string
  updated_at: string
  messages: TicketMessage[]
  user_context?: TicketUserContext | null
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: string
  admin_user_id?: string | null
  admin_email?: string | null
  action_type: string
  entity_type: string
  entity_id?: string | null
  summary: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  ip_address?: string | null
  created_at: string
}

export interface AuditLogResponse {
  items: AuditLogItem[]
  total: number
}

// ── Customer Profile Tabs ─────────────────────────────────────────────────

export interface CustomerTripItem {
  id: string
  status: string
  picking_point?: { name?: string; latitude?: number; longitude?: number } | null
  destination?: { name?: string; latitude?: number; longitude?: number } | null
  price?: number | null
  created_at: string
  driver_id?: string | null
}

export interface CustomerTripsResponse {
  trips: CustomerTripItem[]
  total: number
}

export interface SavedAddress {
  id: string
  user_id: string
  name?: string | null
  display_name?: string | null
  address_type?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at: string
}

export interface EmergencyContact {
  id: string
  user_id: string
  name: string
  phone_number: string
  contact_relationship?: string | null
  created_at: string
}

export interface CustomerNotificationItem {
  id: string
  notification_type: string
  title: string
  content: string
  status: string
  created_at: string
}

export interface CustomerNotificationsResponse {
  notifications: CustomerNotificationItem[]
  total: number
}

export interface ActivityEvent {
  type: 'ride' | 'notification'
  id: string
  summary: string
  amount?: number | null
  notification_type?: string | null
  created_at?: string | null
}

export interface GdprErasureRequest {
  id: string
  user_id: string
  requested_by_admin?: string | null
  status: string
  notes?: string | null
  requested_at: string
  processed_at?: string | null
}

// ── Driver Profile Tabs ───────────────────────────────────────────────────

export interface DriverTripItem {
  id: string
  status: string
  picking_point?: { name?: string; latitude?: number; longitude?: number } | null
  destination?: { name?: string; latitude?: number; longitude?: number } | null
  price?: number | null
  created_at: string
  customer_id?: string | null
}

export interface DriverEarningsResponse {
  transactions: Array<{
    id: string
    type: string
    amount: number
    balance_after?: number | null
    reference_type?: string | null
    description?: string | null
    created_at: string
    reference_id?: string | null
  }>
  total: number
  credit_balance: number
}

export interface DriverRatingItem {
  id: string
  ride_id?: string | null
  rate: number
  comment?: string | null
  created_at: string
  customer_id?: string | null
}

export interface DriverRatingsResponse {
  ratings: DriverRatingItem[]
  total: number
  avg_rating: number
}

export interface DriverComplianceResponse {
  verification_status: string
  license_number?: string | null
  license_expiry?: string | null
  verification_feedback?: string | null
  submitted_at?: string | null
  activation_date?: string | null
  documents: Array<{
    id: string
    document_type: string
    file_url: string
    status: string
    uploaded_at: string
    reviewed_at?: string | null
    rejection_reason?: string | null
  }>
}

// ── Targeted Notifications ────────────────────────────────────────────────

export interface SendTargetedBody {
  title: string
  body: string
  notification_type?: string
  role?: string
  is_active?: boolean
  user_ids?: string[]
  schedule_at?: string
}

// ── Admin Management Types ────────────────────────────────────────────────

export interface AdminUserItem {
  id: string
  email?: string | null
  full_name?: string | null
  phone_number?: string | null
  admin_role?: string | null
  is_active: boolean
  is_admin: boolean
  two_fa_enabled: boolean
  created_at: string
  updated_at: string
  last_login_at?: string | null
}

export interface AdminUserListResponse {
  admins: AdminUserItem[]
  total: number
}

export interface CreateAdminBody {
  email: string
  full_name: string
  phone_number?: string
  admin_role: string
  password: string
}

export interface UpdateAdminBody {
  full_name?: string
  phone_number?: string
  admin_role?: string
  is_active?: boolean
}

export interface IpAllowlistEntry {
  id: string
  ip_cidr: string
  label?: string | null
  created_by?: string | null
  created_at: string
}

export interface AdminSession {
  id: string
  admin_user_id: string
  admin_email?: string | null
  ip_address?: string | null
  created_at: string
  expires_at: string
  is_active: boolean
}

// ── Pricing Engine Types ──────────────────────────────────────────────────

export interface VehiclePricingConfig {
  vehicle_type: string
  base_fare: number
  per_km: number
  minimum_fare: number
  night_multiplier: number
  is_active: boolean
}

export interface GlobalPricingConfig {
  vat_rate: number
  day_multiplier: number
  evening_multiplier: number
  commission_rate: number
}

export interface CategoryMultiplierItem {
  category: string
  multiplier: number
  description: string
  is_active: boolean
}

export interface PricingConfigResponse {
  vehicles: VehiclePricingConfig[]
  global_config: GlobalPricingConfig
  category_multipliers: CategoryMultiplierItem[]
}

export interface FareSimulateStep {
  step: string
  label: string
  value: number
}

export interface FareSimulateResponse {
  steps: FareSimulateStep[]
  final_price: number
  price_excluding_vat: number
  commission_amount: number
  vat_amount: number
  driver_net: number
}

export interface CategoryMetricsItem {
  category: string
  ride_volume: number
  average_fare: number | null
  active_drivers: number
  total_requests: number
  completed_trips: number
  conversion_rate: number | null
}

export interface PricingAuditLogItem {
  id: string
  admin_id: string
  admin_name: string | null
  change_type: string
  change_summary: string
  previous_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
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
    this.backendUrl = backendUrl
    this.jwtToken = jwtToken.trim()

    this.api = axios.create({
      baseURL: `${backendUrl}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Always attach the freshest token before each request.
    this.api.interceptors.request.use((config) => {
      const token = this.getAuthToken()

      if (token) {
        config.headers = config.headers ?? {}
        ;(config.headers as any).Authorization = `Bearer ${token}`
      } else if (config.headers) {
        delete (config.headers as any).Authorization
      }

      return config
    })
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
      console.error('Error fetching payment requests:', this.normalizeError(error))
      throw error
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

  /**
   * Reject a driver profile
   */
  async rejectDriver(driverId: string, feedback?: string): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/deactivate`, null, {
        params: feedback ? { feedback } : {},
      })
      return response.data
    } catch (error) {
      console.error('Error rejecting driver:', error)
      throw error
    }
  }

  /**
   * Suspend a driver with full metadata (reason, end date, appeal contact)
   * Maps to: PATCH /api/v1/drivers/{driver_id}/suspend
   */
  async suspendDriver(
    driverId: string,
    payload: { reason: string; end_date?: string; appeal_contact?: string }
  ): Promise<any> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/suspend`, payload)
      return response.data
    } catch (error) {
      console.error('Error suspending driver:', error)
      throw error
    }
  }

  /**
   * Unsuspend / reinstate a suspended driver
   * Maps to: PATCH /api/v1/drivers/{driver_id}/unsuspend
   */
  async unsuspendDriver(driverId: string, note?: string): Promise<any> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/unsuspend`, { note })
      return response.data
    } catch (error) {
      console.error('Error unsuspending driver:', error)
      throw error
    }
  }

  /**
   * Update a driver's category (grant/demote)
   * Maps to: PATCH /api/v1/drivers/{driver_id}/category
   */
  async updateDriverCategory(driverId: string, category: 'standard' | 'premium' | 'lady_driver'): Promise<Driver> {
    try {
      const response = await this.api.patch(`/drivers/${driverId}/category`, { category })
      return response.data
    } catch (error) {
      console.error('Error updating driver category:', error)
      throw error
    }
  }

  /**
   * Delete a driver profile permanently
   * Maps to: DELETE /api/v1/drivers/{driver_profile_id}
   */
  async deleteDriver(driverId: string): Promise<void> {
    try {
      await this.api.delete(`/drivers/${driverId}`)
    } catch (error) {
      console.error('Error deleting driver:', error)
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

  /**
   * Get active ride requests with bid counts and staleness info
   * Maps to: GET /api/v1/rides/requests/active
   */
  async getActiveRideRequests(): Promise<ActiveRideRequest[]> {
    try {
      const response = await this.api.get('/rides/requests/active')
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Error fetching active ride requests:', error)
      throw error
    }
  }

  /**
   * Fetch marketplace data — all pending ride requests with full bid details
   * Maps to: GET /api/v1/rides/admin/marketplace
   */
  async getMarketplaceData(): Promise<MarketplaceResponse> {
    try {
      const response = await this.api.get('/rides/admin/marketplace')
      return response.data as MarketplaceResponse
    } catch (error) {
      console.error('Error fetching marketplace data:', this.normalizeError(error))
      return { requests: [], total_active: 0, stale_count: 0 }
    }
  }

  /**
   * Cancel a pending ride request
   * Maps to: POST /api/v1/rides/request/{request_id}/cancel
   */
  async cancelRideRequest(requestId: string, reason?: string): Promise<any> {
    try {
      const response = await this.api.post(`/rides/request/${requestId}/cancel`, {
        reason: reason || 'Cancelled by admin',
      })
      return response.data
    } catch (error) {
      console.error('Error cancelling ride request:', error)
      throw error
    }
  }

  /**
   * Get detailed information about a specific ride
   * Maps to: GET /api/v1/rides/{ride_id}
   */
  async getRideDetail(rideId: string): Promise<RideDetailResponse> {
    try {
      const response = await this.api.get(`/rides/${rideId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching ride detail:', error)
      throw error
    }
  }

  /**
   * Get offer history for a specific ride — original offer, updates, final price
   * Maps to: GET /api/v1/rides/{ride_id}/offers
   */
  async getRideOffers(rideId: string): Promise<RideOfferHistory> {
    try {
      const response = await this.api.get(`/rides/${rideId}/offers`)
      return response.data
    } catch (error) {
      console.error('Error fetching ride offers:', error)
      throw error
    }
  }

  /**
   * Get detailed information about a completed trip
   * Maps to: GET /api/v1/rides/trips/{trip_id}
   */
  async getTripDetail(tripId: string): Promise<TripResponse> {
    try {
      const response = await this.api.get(`/rides/trips/${tripId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching trip detail:', error)
      throw error
    }
  }

  /**
   * Get ride history (all completed/cancelled rides)
   * Maps to: GET /api/v1/rides/history/all
   */
  async getRideHistory(): Promise<Ride[]> {
    try {
      const response = await this.api.get('/rides/history/all')
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Error fetching ride history:', error)
      throw error
    }
  }

  // ==========================================
  // CUSTOMERS ENDPOINTS
  // ==========================================

  /**
   * List all customers (admin endpoint)
   * Maps to: GET /api/v1/customers/admin/list
   */
  async getCustomers(search?: string, status?: string): Promise<Customer[]> {
    try {
      const params: any = {}
      if (search) params.search = search
      if (status) params.status = status
      const response = await this.api.get('/customers/admin/list', { params })
      return response.data.customers || []
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error
    }
  }

  /**
   * Get customer detail
   * Maps to: GET /api/v1/customers/admin/{user_id}
   */
  async getCustomerDetail(customerId: string): Promise<Customer> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching customer detail:', error)
      throw error
    }
  }

  /**
   * Ban a customer
   * Maps to: PATCH /api/v1/customers/admin/{user_id}/ban
   */
  async banCustomer(customerId: string, reason: string): Promise<any> {
    try {
      const response = await this.api.patch(`/customers/admin/${customerId}/ban`, { reason })
      return response.data
    } catch (error) {
      console.error('Error banning customer:', error)
      throw error
    }
  }

  /**
   * Unban a customer
   * Maps to: PATCH /api/v1/customers/admin/{user_id}/unban
   */
  async unbanCustomer(customerId: string): Promise<any> {
    try {
      const response = await this.api.patch(`/customers/admin/${customerId}/unban`)
      return response.data
    } catch (error) {
      console.error('Error unbanning customer:', error)
      throw error
    }
  }

  // ==========================================
  // SOS ENDPOINTS
  // ==========================================

  /**
   * List SOS sessions (admin endpoint)
   * Maps to: GET /api/v1/sos/admin/sessions
   */
  async getSosSessions(status?: string): Promise<SosSession[]> {
    try {
      const params = status ? { status } : {}
      const response = await this.api.get('/sos/admin/sessions', { params })
      return response.data.sessions || []
    } catch (error) {
      console.error('Error fetching SOS sessions:', error)
      throw error
    }
  }

  /**
   * Get SOS session detail
   * Maps to: GET /api/v1/sos/admin/sessions/{session_id}
   */
  async getSosSessionDetail(sessionId: string): Promise<SosSession> {
    try {
      const response = await this.api.get(`/sos/admin/sessions/${sessionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SOS session detail:', error)
      throw error
    }
  }

  /**
   * Resolve an SOS session
   * Maps to: PATCH /api/v1/sos/admin/sessions/{session_id}/resolve
   */
  async resolveSosSession(sessionId: string, resolution: string): Promise<any> {
    try {
      const response = await this.api.patch(`/sos/admin/sessions/${sessionId}/resolve`, { resolution })
      return response.data
    } catch (error) {
      console.error('Error resolving SOS session:', error)
      throw error
    }
  }

  // ==========================================
  // CONFIG / APP TOGGLES ENDPOINTS
  // ==========================================

  /**
   * Get app configuration toggles
   * Backend returns a structured object like:
   *   { active_request_resume_enabled: true, driver_offer_update_enabled: true, stale_request_alert_threshold_minutes: 10 }
   * We transform it into AppConfigToggle[] for the frontend.
   * Maps to: GET /api/v1/config/admin/app-toggles
   */
  async getAppConfig(): Promise<AppConfigToggle[]> {
    try {
      const response = await this.api.get('/config/admin/app-toggles')
      const data = response.data
      // Backend returns a flat object with known keys
      const toggles: AppConfigToggle[] = []
      if (data.active_request_resume_enabled !== undefined) {
        toggles.push({ key: 'active_request_resume_enabled', value: String(data.active_request_resume_enabled) })
      }
      if (data.driver_offer_update_enabled !== undefined) {
        toggles.push({ key: 'driver_offer_update_enabled', value: String(data.driver_offer_update_enabled) })
      }
      if (data.stale_request_alert_threshold_minutes !== undefined) {
        toggles.push({ key: 'stale_request_alert_threshold_minutes', value: String(data.stale_request_alert_threshold_minutes) })
      }
      return toggles
    } catch (error) {
      console.error('Error fetching app config:', error)
      throw error
    }
  }

  /**
   * Update app configuration toggles
   * Transforms the flat key-value map into the structured body the backend expects.
   * Maps to: PATCH /api/v1/config/admin/app-toggles
   */
  async updateAppConfig(toggles: Record<string, string>): Promise<any> {
    try {
      const body: Record<string, any> = {}
      if (toggles.active_request_resume_enabled !== undefined) {
        body.active_request_resume_enabled = toggles.active_request_resume_enabled === 'true'
      }
      if (toggles.driver_offer_update_enabled !== undefined) {
        body.driver_offer_update_enabled = toggles.driver_offer_update_enabled === 'true'
      }
      if (toggles.stale_request_alert_threshold_minutes !== undefined) {
        body.stale_request_alert_threshold_minutes = parseInt(toggles.stale_request_alert_threshold_minutes, 10)
      }
      const response = await this.api.patch('/config/admin/app-toggles', body)
      return response.data
    } catch (error) {
      console.error('Error updating app config:', error)
      throw error
    }
  }

  // ==========================================
  // DASHBOARD / ANALYTICS ENDPOINTS
  // ==========================================

  /**
   * Get dashboard metrics — tries the analytics endpoint first,
   * falls back to aggregating individual endpoints
   * Maps to: GET /api/v1/analytics/admin/dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Try the dedicated analytics endpoint first
      const response = await this.api.get('/analytics/admin/dashboard')
      return {
        pending_payments_count: response.data.pending_payments_count || 0,
        pending_drivers_count: response.data.pending_drivers_count || 0,
        active_drivers_count: response.data.active_drivers_count || 0,
        active_rides_count: response.data.active_rides_count || 0,
        active_sos_count: response.data.active_sos_count || 0,
        stale_requests_count: response.data.stale_requests_count || 0,
      }
    } catch {
      // Fallback: aggregate from individual endpoints
      try {
        const pendingPayments = await this.getPaymentRequests('pending')
        const pendingDrivers = await this.getDrivers('pending')
        const approvedDrivers = await this.getDrivers('approved')
        const activeRides = await this.getRides('in_progress')
        const enRouteRides = await this.getRides('driver_en_route')

        return {
          pending_payments_count: pendingPayments.length,
          pending_drivers_count: pendingDrivers.length,
          active_drivers_count: approvedDrivers.filter((d) => d.is_online).length,
          active_rides_count: activeRides.length + enRouteRides.length,
          active_sos_count: 0,
          stale_requests_count: 0,
        }
      } catch {
        return {
          pending_payments_count: 0,
          pending_drivers_count: 0,
          active_drivers_count: 0,
          active_rides_count: 0,
          active_sos_count: 0,
          stale_requests_count: 0,
        }
      }
    }
  }

  /**
   * Get offer update metrics — driver offer update rates
   * Maps to: GET /api/v1/analytics/admin/offer-update-metrics
   */
  async getOfferUpdateMetrics(): Promise<OfferUpdateMetrics> {
    try {
      const response = await this.api.get('/analytics/admin/offer-update-metrics')
      return response.data
    } catch (error) {
      console.error('Error fetching offer update metrics:', error)
      throw error
    }
  }

  /**
   * Get current locations of active/online drivers for the live map
   * Maps to: GET /api/v1/analytics/admin/driver-locations
   */
  async getCancellationAnalytics(days: number = 7): Promise<CancellationAnalytics> {
    try {
      const response = await this.api.get('/analytics/admin/cancellations', {
        params: { days },
      })
      return response.data
    } catch (error) {
      console.error('Error fetching cancellation analytics:', this.normalizeError(error))
      throw error
    }
  }

  async getDriverLocations(onlineOnly: boolean = true): Promise<DriverLocation[]> {
    try {
      const response = await this.api.get('/analytics/admin/driver-locations', {
        params: { online_only: onlineOnly, stale_minutes: 5 },
      })
      return response.data.drivers || []
    } catch (error) {
      console.error('Error fetching driver locations:', this.normalizeError(error))
      return []
    }
  }

  // ── Disputes & Refunds ───────────────────────────────────────────────

  async getDisputes(status?: string): Promise<DisputeListResponse> {
    try {
      const response = await this.api.get('/rides/admin/disputes', {
        params: status ? { status } : {},
      })
      return response.data as DisputeListResponse
    } catch (error) {
      console.error('Error fetching disputes:', this.normalizeError(error))
      return { disputes: [], total: 0 }
    }
  }

  async refundDispute(rideId: string, notes?: string): Promise<DisputeActionResponse | null> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/refund`, { notes })
      return response.data as DisputeActionResponse
    } catch (error) {
      console.error('Error refunding dispute:', this.normalizeError(error))
      return null
    }
  }

  async chargeDriverDispute(rideId: string, notes?: string): Promise<DisputeActionResponse | null> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/charge-driver`, { notes })
      return response.data as DisputeActionResponse
    } catch (error) {
      console.error('Error charging driver for dispute:', this.normalizeError(error))
      return null
    }
  }

  async dismissDispute(rideId: string, notes?: string): Promise<DisputeActionResponse | null> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/dismiss`, { notes })
      return response.data as DisputeActionResponse
    } catch (error) {
      console.error('Error dismissing dispute:', this.normalizeError(error))
      return null
    }
  }

  async escalateDispute(rideId: string, notes?: string): Promise<DisputeActionResponse | null> {
    try {
      const response = await this.api.patch(`/rides/admin/disputes/${rideId}/escalate`, { notes })
      return response.data as DisputeActionResponse
    } catch (error) {
      console.error('Error escalating dispute:', this.normalizeError(error))
      return null
    }
  }

  async getActiveTrips(): Promise<ActiveTripItem[]> {
    try {
      const response = await this.api.get('/rides/admin/active')
      return response.data as ActiveTripItem[]
    } catch (error) {
      console.error('Error fetching active trips:', this.normalizeError(error))
      return []
    }
  }

  async forceEndTrip(rideId: string, reason: string, initiatedBy: string = 'operations_manager'): Promise<any> {
    try {
      const response = await this.api.patch(`/rides/admin/${rideId}/force-end`, {
        reason,
        initiated_by: initiatedBy,
      })
      return response.data
    } catch (error) {
      console.error('Error force-ending trip:', this.normalizeError(error))
      throw error
    }
  }

  async sendPushToTrip(rideId: string, target: string, title: string, message: string): Promise<any> {
    try {
      const response = await this.api.post(`/rides/admin/${rideId}/send-push`, {
        target,
        title,
        message,
      })
      return response.data
    } catch (error) {
      console.error('Error sending push to trip party:', this.normalizeError(error))
      throw error
    }
  }

  // ==========================================
  // TRANSACTION BROWSER ENDPOINTS
  // ==========================================

  /**
   * List all financial transactions with filtering (admin transaction browser)
   * Maps to: GET /api/v1/payments/admin/transactions
   */
  async getTransactions(params?: {
    status?: string
    method?: string
    date_from?: string
    date_to?: string
    amount_min?: number
    amount_max?: number
    has_refund?: boolean
    search?: string
    type?: string
    limit?: number
    offset?: number
  }): Promise<TransactionListResponse> {
    try {
      const response = await this.api.get('/payments/admin/transactions', { params })
      return {
        transactions: response.data.transactions || [],
        total: response.data.total || 0,
      }
    } catch (error) {
      console.error('Error fetching transactions:', this.normalizeError(error))
      throw error
    }
  }

  // ── Notification methods ────────────────────────────────────────────────

  async sendNotification(body: NotificationSendBody): Promise<SendNotificationResponse> {
    try {
      const response = await this.api.post('/admin/notifications/send', body)
      return response.data
    } catch (error) {
      console.error('Error sending notification:', this.normalizeError(error))
      throw error
    }
  }

  async getNotificationHistory(params?: {
    limit?: number
    offset?: number
    status?: string
  }): Promise<NotificationHistoryResponse> {
    try {
      const response = await this.api.get('/admin/notifications/history', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching notification history:', this.normalizeError(error))
      throw error
    }
  }

  async getNotificationUsers(params?: {
    search?: string
    role?: string
    limit?: number
    offset?: number
  }): Promise<NotificationUsersResponse> {
    try {
      const response = await this.api.get('/admin/notifications/users', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching notification users:', this.normalizeError(error))
      throw error
    }
  }

  // ==========================================
  // PRICING ENGINE ENDPOINTS
  // ==========================================

  /**
   * Get full pricing configuration (vehicles, global, category multipliers)
   * Maps to: GET /api/v1/admin/pricing/config
   */
  async getPricingConfig(): Promise<PricingConfigResponse> {
    try {
      const response = await this.api.get('/admin/pricing/config')
      return response.data
    } catch (error) {
      console.error('Error fetching pricing config:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Update per-vehicle pricing config
   * Maps to: PUT /api/v1/admin/pricing/vehicle/{vehicle_type}
   */
  async updateVehiclePricing(
    vehicleType: string,
    body: Partial<{
      base_fare: number
      per_km: number
      minimum_fare: number
      night_multiplier: number
      is_active: boolean
    }>
  ): Promise<VehiclePricingConfig> {
    try {
      const response = await this.api.put(`/admin/pricing/vehicle/${vehicleType}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating vehicle pricing:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Update global pricing config (vat_rate, day_multiplier, evening_multiplier, commission_rate)
   * Maps to: PUT /api/v1/admin/pricing/global
   */
  async updateGlobalPricing(
    body: Partial<{
      vat_rate: number
      day_multiplier: number
      evening_multiplier: number
      commission_rate: number
    }>
  ): Promise<GlobalPricingConfig> {
    try {
      const response = await this.api.put('/admin/pricing/global', body)
      return response.data
    } catch (error) {
      console.error('Error updating global pricing:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Update category multiplier
   * Maps to: PUT /api/v1/admin/pricing/category/{category}
   */
  async updateCategoryMultiplier(
    category: string,
    body: Partial<{
      multiplier: number
      description: string
      is_active: boolean
    }>
  ): Promise<CategoryMultiplierItem> {
    try {
      const response = await this.api.put(`/admin/pricing/category/${category}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating category multiplier:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Simulate a fare with the full pipeline breakdown
   * Maps to: POST /api/v1/admin/pricing/simulate
   */
  async simulateFare(body: {
    vehicle_type: string
    distance_km: number
    time_band: string
    category: string
  }): Promise<FareSimulateResponse> {
    try {
      const response = await this.api.post('/admin/pricing/simulate', body)
      return response.data
    } catch (error) {
      console.error('Error simulating fare:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Get per-category pricing metrics
   * Maps to: GET /api/v1/admin/pricing/metrics
   */
  async getPricingMetrics(days: number = 7): Promise<CategoryMetricsItem[]> {
    try {
      const response = await this.api.get('/admin/pricing/metrics', { params: { days } })
      return response.data
    } catch (error) {
      console.error('Error fetching pricing metrics:', this.normalizeError(error))
      throw error
    }
  }

  /**
   * Get pricing audit log
   * Maps to: GET /api/v1/admin/pricing/audit-log
   */
  async getPricingAuditLog(params?: {
    limit?: number
    offset?: number
  }): Promise<PricingAuditLogItem[]> {
    try {
      const response = await this.api.get('/admin/pricing/audit-log', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching pricing audit log:', this.normalizeError(error))
      throw error
    }
  }

  // ── Support Tickets ─────────────────────────────────────────────────────

  async getTickets(params?: { status?: string; priority?: string; limit?: number; offset?: number }): Promise<TicketListResponse> {
    try {
      const response = await this.api.get('/admin/support/tickets', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching tickets:', this.normalizeError(error))
      throw error
    }
  }

  async getTicketDetail(ticketId: string): Promise<TicketDetail> {
    try {
      const response = await this.api.get(`/admin/support/tickets/${ticketId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching ticket detail:', this.normalizeError(error))
      throw error
    }
  }

  async createTicket(body: { user_id: string; user_type?: string; subject: string; body: string; priority?: string }): Promise<{ id: string; message: string }> {
    try {
      const response = await this.api.post('/admin/support/tickets', body)
      return response.data
    } catch (error) {
      console.error('Error creating ticket:', this.normalizeError(error))
      throw error
    }
  }

  async updateTicket(ticketId: string, body: { status?: string; priority?: string; assigned_to?: string }): Promise<any> {
    try {
      const response = await this.api.patch(`/admin/support/tickets/${ticketId}`, body)
      return response.data
    } catch (error) {
      console.error('Error updating ticket:', this.normalizeError(error))
      throw error
    }
  }

  async addTicketMessage(ticketId: string, body: string, senderType: 'admin' | 'customer' = 'admin'): Promise<{ id: string; message: string }> {
    try {
      const response = await this.api.post(`/admin/support/tickets/${ticketId}/messages`, { body, sender_type: senderType })
      return response.data
    } catch (error) {
      console.error('Error adding ticket message:', this.normalizeError(error))
      throw error
    }
  }

  // ── Audit Log ────────────────────────────────────────────────────────────

  async getAuditLog(params?: {
    date_from?: string
    date_to?: string
    action_type?: string
    entity_type?: string
    admin_user_id?: string
    limit?: number
    offset?: number
  }): Promise<AuditLogResponse> {
    try {
      const response = await this.api.get('/admin/audit/log', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching audit log:', this.normalizeError(error))
      throw error
    }
  }

  getAuditLogExportUrl(): string {
    return `${this.backendUrl}/api/v1/admin/audit/log/export`
  }

  // ── Customer Profile Tabs ────────────────────────────────────────────────

  async getCustomerTrips(customerId: string, params?: { limit?: number; offset?: number }): Promise<CustomerTripsResponse> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/trips`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching customer trips:', this.normalizeError(error))
      throw error
    }
  }

  async getCustomerSavedAddresses(customerId: string): Promise<SavedAddress[]> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/saved-addresses`)
      return response.data.addresses || []
    } catch (error) {
      console.error('Error fetching saved addresses:', this.normalizeError(error))
      throw error
    }
  }

  async getCustomerEmergencyContacts(customerId: string): Promise<EmergencyContact[]> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/emergency-contacts`)
      return response.data.contacts || []
    } catch (error) {
      console.error('Error fetching emergency contacts:', this.normalizeError(error))
      throw error
    }
  }

  async getCustomerNotifications(customerId: string, params?: { limit?: number; offset?: number }): Promise<CustomerNotificationsResponse> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/notifications`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching customer notifications:', this.normalizeError(error))
      throw error
    }
  }

  async getCustomerActivity(customerId: string, limit?: number): Promise<ActivityEvent[]> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/activity`, { params: limit ? { limit } : {} })
      return response.data.events || []
    } catch (error) {
      console.error('Error fetching customer activity:', this.normalizeError(error))
      throw error
    }
  }

  async exportCustomerGdprData(customerId: string): Promise<any> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/gdpr/export`)
      return response.data
    } catch (error) {
      console.error('Error exporting GDPR data:', this.normalizeError(error))
      throw error
    }
  }

  async requestGdprErasure(customerId: string): Promise<{ id: string; message: string }> {
    try {
      const response = await this.api.post(`/customers/admin/${customerId}/gdpr/erasure-request`)
      return response.data
    } catch (error) {
      console.error('Error requesting GDPR erasure:', this.normalizeError(error))
      throw error
    }
  }

  async listGdprErasureRequests(customerId: string): Promise<GdprErasureRequest[]> {
    try {
      const response = await this.api.get(`/customers/admin/${customerId}/gdpr/erasure-requests`)
      return response.data.requests || []
    } catch (error) {
      console.error('Error fetching GDPR erasure requests:', this.normalizeError(error))
      throw error
    }
  }

  async approveGdprErasure(customerId: string, requestId: string): Promise<any> {
    try {
      const response = await this.api.patch(`/customers/admin/${customerId}/gdpr/erasure-requests/${requestId}/approve`)
      return response.data
    } catch (error) {
      console.error('Error approving GDPR erasure:', this.normalizeError(error))
      throw error
    }
  }

  // ── Driver Profile Tabs ──────────────────────────────────────────────────

  async getDriverTrips(driverId: string, params?: { limit?: number; offset?: number }): Promise<{ trips: DriverTripItem[]; total: number }> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/trips`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching driver trips:', this.normalizeError(error))
      throw error
    }
  }

  async getDriverEarnings(driverId: string, params?: { limit?: number; offset?: number }): Promise<DriverEarningsResponse> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/earnings`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching driver earnings:', this.normalizeError(error))
      throw error
    }
  }

  async getDriverRatings(driverId: string, params?: { limit?: number; offset?: number }): Promise<DriverRatingsResponse> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/ratings`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching driver ratings:', this.normalizeError(error))
      throw error
    }
  }

  async getDriverCompliance(driverId: string): Promise<DriverComplianceResponse> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/compliance`)
      return response.data
    } catch (error) {
      console.error('Error fetching driver compliance:', this.normalizeError(error))
      throw error
    }
  }

  async getDriverActivity(driverId: string, limit?: number): Promise<ActivityEvent[]> {
    try {
      const response = await this.api.get(`/drivers/${driverId}/activity`, { params: limit ? { limit } : {} })
      return response.data.events || []
    } catch (error) {
      console.error('Error fetching driver activity:', this.normalizeError(error))
      throw error
    }
  }

  // ── Targeted Notifications ───────────────────────────────────────────────

  async sendTargetedNotification(body: SendTargetedBody): Promise<SendNotificationResponse> {
    try {
      const response = await this.api.post('/admin/notifications/send-targeted', body)
      return response.data
    } catch (error) {
      console.error('Error sending targeted notification:', this.normalizeError(error))
      throw error
    }
  }

  async previewNotificationSegment(params: { role?: string; is_active?: boolean }): Promise<{ recipient_count: number }> {
    try {
      const response = await this.api.get('/admin/notifications/segment-preview', { params })
      return response.data
    } catch (error) {
      console.error('Error previewing segment:', this.normalizeError(error))
      throw error
    }
  }

  // ── Admin Management ────────────────────────────────────────────────────────

  async getMyAdminRole(): Promise<{ admin_role: string; full_name: string | null; email: string; two_fa_enabled: boolean }> {
    const response = await this.api.get('/admin/mgmt/role')
    return response.data
  }

  async recordAdminLogin(): Promise<{ session_id: string; expires_at: string }> {
    const response = await this.api.post('/admin/mgmt/me/record-login')
    return response.data
  }

  async invalidateAdminSession(sessionId: string): Promise<void> {
    await this.api.post('/admin/mgmt/me/invalidate-session', null, { params: { session_id: sessionId } })
  }

  async getMyAdminProfile(): Promise<AdminUserItem> {
    const response = await this.api.get('/admin/mgmt/me')
    return response.data
  }

  async get2FAStatus(): Promise<{ two_fa_enabled: boolean }> {
    const response = await this.api.get('/admin/mgmt/me/2fa/status')
    return response.data
  }

  async enable2FA(): Promise<void> {
    await this.api.post('/admin/mgmt/me/2fa/enable')
  }

  async disable2FA(): Promise<void> {
    await this.api.post('/admin/mgmt/me/2fa/disable')
  }

  async listAdminUsers(): Promise<AdminUserListResponse> {
    const response = await this.api.get('/admin/mgmt/users')
    return response.data
  }

  async createAdminUser(body: CreateAdminBody): Promise<{ id: string; message: string }> {
    const response = await this.api.post('/admin/mgmt/users', body)
    return response.data
  }

  async updateAdminUser(userId: string, body: Partial<UpdateAdminBody>): Promise<void> {
    await this.api.patch(`/admin/mgmt/users/${userId}`, body)
  }

  async disableAdminUser(userId: string): Promise<void> {
    await this.api.delete(`/admin/mgmt/users/${userId}`)
  }

  async listIpAllowlist(): Promise<{ entries: IpAllowlistEntry[] }> {
    const response = await this.api.get('/admin/mgmt/ip-allowlist')
    return response.data
  }

  async addIpAllowlist(body: { ip_cidr: string; label?: string }): Promise<{ id: string }> {
    const response = await this.api.post('/admin/mgmt/ip-allowlist', body)
    return response.data
  }

  async removeIpAllowlist(entryId: string): Promise<void> {
    await this.api.delete(`/admin/mgmt/ip-allowlist/${entryId}`)
  }

  async listAdminSessions(params?: { limit?: number; offset?: number }): Promise<{ sessions: AdminSession[]; total: number }> {
    const response = await this.api.get('/admin/mgmt/sessions', { params })
    return response.data
  }

  private normalizeError(error: unknown): unknown {
    if (!axios.isAxiosError(error)) return error

    const status = error.response?.status
    const backendDetail =
      (error.response?.data as any)?.detail || (error.response?.data as any)?.error || ''

    if (status === 401) {
      return {
        message:
          'Unauthorized (401). Ensure frontend token is valid and backend Supabase env values are real project credentials (not example/dev placeholders).',
        backendDetail,
        url: error.config?.url,
      }
    }

    return {
      message: error.message,
      status,
      backendDetail,
      url: error.config?.url,
    }
  }
}

// Initialize service with environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const JWT_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || import.meta.env.VITE_JWT_TOKEN || ''

export const supabaseService = new AlboTaxService(BACKEND_URL, JWT_TOKEN)

export default AlboTaxService
