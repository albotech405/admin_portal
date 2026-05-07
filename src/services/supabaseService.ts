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
   * Reject or suspend a driver profile (deactivate)
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
   * Alias for rejectDriver - suspend a driver
   */
  async suspendDriver(driverId: string, feedback?: string): Promise<Driver> {
    return this.rejectDriver(driverId, feedback)
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

  // ==========================================
  // DASHBOARD ENDPOINTS
  // ==========================================

  /**
   * Get dashboard metrics by aggregating multiple endpoints
   * Since the backend doesn't have a single dashboard endpoint,
   * we fetch individual metrics and combine them
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Fetch pending payments
      const pendingPayments = await this.getPaymentRequests('pending')
      const pending_payments_count = pendingPayments.length

      // Fetch pending drivers
      const pendingDrivers = await this.getDrivers('pending')
      const pending_drivers_count = pendingDrivers.length

      // Fetch active drivers (approved and online)
      const approvedDrivers = await this.getDrivers('approved')
      const active_drivers_count = approvedDrivers.filter((d) => d.is_online).length

      // Fetch active rides (in_progress + driver_en_route + arrived)
      let active_rides_count = 0
      try {
        const activeRides = await this.getRides('in_progress')
        const enRouteRides = await this.getRides('driver_en_route')
        active_rides_count = activeRides.length + enRouteRides.length
      } catch {
        // Rides endpoint may not be available yet
      }

      return {
        pending_payments_count,
        pending_drivers_count,
        active_drivers_count,
        active_rides_count,
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', this.normalizeError(error))
      // Return zeros if metrics fail to load
      return {
        pending_payments_count: 0,
        pending_drivers_count: 0,
        active_drivers_count: 0,
        active_rides_count: 0,
      }
    }
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
