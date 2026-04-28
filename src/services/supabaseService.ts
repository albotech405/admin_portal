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
  license_number: string
  license_expiry: string
  vehicle_type?: string
  verification_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended'
  address?: string
  is_online: boolean
  rating: number
  total_trips: number
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
  description: string
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
    this.jwtToken = jwtToken

    this.api = axios.create({
      baseURL: `${backendUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    })
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
      console.error('Error fetching payment requests:', error)
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
   * List drivers with optional status filter
   */
  async getDrivers(status?: string): Promise<Driver[]> {
    try {
      const params = status ? { verification_status: status } : {}
      const response = await this.api.get('/drivers', { params })
      return response.data.drivers || response.data || []
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
   * Get a driver's current wallet balance
   * Note: Requires driver's own JWT token
   */
  async getWalletBalance(driverId: string): Promise<number> {
    try {
      const response = await this.api.get('/wallet/balance')
      return response.data.balance || 0
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      throw error
    }
  }

  /**
   * Get transaction history for a driver
   * Note: Requires driver's own JWT token
   */
  async getWalletTransactions(driverId?: string): Promise<WalletTransaction[]> {
    try {
      const response = await this.api.get('/wallet/transactions')
      return response.data.transactions || []
    } catch (error) {
      console.error('Error fetching wallet transactions:', error)
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

      // TODO: Fetch active rides from /rides endpoint when available
      const active_rides_count = 0

      return {
        pending_payments_count,
        pending_drivers_count,
        active_drivers_count,
        active_rides_count,
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      // Return zeros if metrics fail to load
      return {
        pending_payments_count: 0,
        pending_drivers_count: 0,
        active_drivers_count: 0,
        active_rides_count: 0,
      }
    }
  }
}

// Initialize service with environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const JWT_TOKEN = import.meta.env.VITE_JWT_TOKEN || ''

export const supabaseService = new AlboTaxService(BACKEND_URL, JWT_TOKEN)

export default SupabaseService
