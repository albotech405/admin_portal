import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Table, Badge } from '../components'
import {
  supabaseService,
  VehiclePricingConfig,
  GlobalPricingConfig,
  CategoryMultiplierItem,
  FareSimulateResponse,
  CategoryMetricsItem,
  PricingAuditLogItem,
} from '../services/supabaseService'
import { formatUsdAsCdf, parseCdfInputToUsd } from '../lib/currency'

// ── Constants ──────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ['car', 'motorcycle'] as const
const CATEGORIES = ['standard', 'premium', 'lady_driver'] as const
const TIME_BANDS = [
  { value: 'day', label: 'Day (06:00–16:59)' },
  { value: 'evening', label: 'Evening (17:00–23:59)' },
  { value: 'night', label: 'Night (00:00–05:59)' },
] as const

const METRICS_COLUMNS = [
  { key: 'category', label: 'Category' },
  { key: 'ride_volume', label: 'Ride Volume' },
  { key: 'average_fare', label: 'Avg Fare (CDF)' },
  { key: 'active_drivers', label: 'Active Drivers' },
  { key: 'total_requests', label: 'Total Requests' },
  { key: 'completed_trips', label: 'Completed' },
  { key: 'conversion_rate', label: 'Conversion Rate' },
]

const AUDIT_COLUMNS = [
  { key: 'created_at', label: 'Date' },
  { key: 'admin_name', label: 'Admin' },
  { key: 'change_type', label: 'Type' },
  { key: 'change_summary', label: 'Summary' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Kinshasa',
    })
  } catch {
    return dateStr
  }
}

function formatAmount(amount: number, exchangeRate?: number | null): string {
  return formatUsdAsCdf(amount, exchangeRate, 0)
}

function getChangeTypeBadge(type: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (type) {
    case 'vehicle_pricing':
      return 'info'
    case 'global_config':
      return 'warning'
    case 'category_multiplier':
      return 'success'
    default:
      return 'neutral'
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

const VehiclePricingCard: React.FC<{
  vehicle: VehiclePricingConfig
  onSave: (body: Partial<VehiclePricingConfig>) => Promise<void>
  isSaving: boolean
  exchangeRate: number | null
}> = ({ vehicle, onSave, isSaving, exchangeRate }) => {
  const [baseFare, setBaseFare] = useState(vehicle.base_fare)
  const [perKm, setPerKm] = useState(vehicle.per_km)
  const [minFare, setMinFare] = useState(vehicle.minimum_fare)
  const [nightMult, setNightMult] = useState(vehicle.night_multiplier)
  const [isActive, setIsActive] = useState(vehicle.is_active)
  const [localSaving, setLocalSaving] = useState(false)

  useEffect(() => {
    setBaseFare(vehicle.base_fare)
    setPerKm(vehicle.per_km)
    setMinFare(vehicle.minimum_fare)
    setNightMult(vehicle.night_multiplier)
    setIsActive(vehicle.is_active)
  }, [vehicle])

  const handleSave = async () => {
    setLocalSaving(true)
    try {
      await onSave({
        base_fare: baseFare,
        per_km: perKm,
        minimum_fare: minFare,
        night_multiplier: nightMult,
        is_active: isActive,
      })
    } finally {
      setLocalSaving(false)
    }
  }

  const sampleDayFare = baseFare + 5 * perKm
  const sampleNightFare = (baseFare + 5 * perKm) * nightMult
  const finalDayFare = Math.max(sampleDayFare, minFare)
  const finalNightFare = Math.max(sampleNightFare, minFare)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize text-brand-900">{vehicle.vehicle_type}</h3>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-brand-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-brand-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          <span className="ml-2 text-sm text-brand-600">{isActive ? 'Active' : 'Inactive'}</span>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-brand-600">Base Fare (CDF)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={exchangeRate ? (baseFare * exchangeRate).toFixed(0) : ''}
            onChange={(e) => setBaseFare(parseCdfInputToUsd(e.target.value, exchangeRate) || 0)}
            disabled={!exchangeRate}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Per KM (CDF)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={exchangeRate ? (perKm * exchangeRate).toFixed(0) : ''}
            onChange={(e) => setPerKm(parseCdfInputToUsd(e.target.value, exchangeRate) || 0)}
            disabled={!exchangeRate}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Min Fare (CDF)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={exchangeRate ? (minFare * exchangeRate).toFixed(0) : ''}
            onChange={(e) => setMinFare(parseCdfInputToUsd(e.target.value, exchangeRate) || 0)}
            disabled={!exchangeRate}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Night Multiplier</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={nightMult}
            onChange={(e) => setNightMult(parseFloat(e.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-4 rounded-lg bg-brand-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Live Preview (5 km)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-brand-500">Day fare:</span>{' '}
            <span className="font-semibold text-brand-900">{formatAmount(finalDayFare, exchangeRate)}</span>
          </div>
          <div>
            <span className="text-brand-500">Night fare:</span>{' '}
            <span className="font-semibold text-brand-900">{formatAmount(finalNightFare, exchangeRate)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving || localSaving} size="sm">
          Save {vehicle.vehicle_type} pricing
        </Button>
      </div>
    </Card>
  )
}

const GlobalConfigCard: React.FC<{
  config: GlobalPricingConfig
  onSave: (body: Partial<GlobalPricingConfig>) => Promise<void>
  isSaving: boolean
  exchangeRate: number | null
}> = ({ config, onSave, isSaving, exchangeRate }) => {
  const [vatRate, setVatRate] = useState(config.vat_rate)
  const [dayMult, setDayMult] = useState(config.day_multiplier)
  const [eveningMult, setEveningMult] = useState(config.evening_multiplier)
  const [commissionRate, setCommissionRate] = useState(config.commission_rate)
  const [localSaving, setLocalSaving] = useState(false)

  useEffect(() => {
    setVatRate(config.vat_rate)
    setDayMult(config.day_multiplier)
    setEveningMult(config.evening_multiplier)
    setCommissionRate(config.commission_rate)
  }, [config])

  const handleSave = async () => {
    setLocalSaving(true)
    try {
      await onSave({
        vat_rate: vatRate,
        day_multiplier: dayMult,
        evening_multiplier: eveningMult,
        commission_rate: commissionRate,
      })
    } finally {
      setLocalSaving(false)
    }
  }

  // Sample fares for car (using default values for preview)
  const sampleCarBase = 2.0
  const sampleCarPerKm = 0.7
  const sampleCarMin = 2.5
  const sampleDist = 5
  const basePrice = sampleCarBase + sampleDist * sampleCarPerKm
  const dayFare = Math.max(basePrice * dayMult, sampleCarMin)
  const eveningFare = Math.max(basePrice * eveningMult, sampleCarMin)
  const nightFare = Math.max(basePrice * 1.2, sampleCarMin) // default night multiplier

  return (
    <Card>
      <h3 className="text-lg font-bold text-brand-900">Global Time-Band Config</h3>
      <p className="mt-1 text-sm text-brand-600">
        VAT, time-band multipliers, and platform commission
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-brand-600">VAT Rate</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={vatRate}
            onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-0.5 text-xs text-brand-400">{(vatRate * 100).toFixed(0)}%</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Day Multiplier</label>
          <input
            type="number"
            step="0.01"
            min="0.5"
            max="2"
            value={dayMult}
            onChange={(e) => setDayMult(parseFloat(e.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Evening Multiplier</label>
          <input
            type="number"
            step="0.01"
            min="0.5"
            max="2"
            value={eveningMult}
            onChange={(e) => setEveningMult(parseFloat(e.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Commission Rate</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={commissionRate}
            onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-0.5 text-xs text-brand-400">{(commissionRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-4 rounded-lg bg-brand-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Sample Car Fares (5 km, Standard)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-brand-500">Day:</span>{' '}
            <span className="font-semibold text-brand-900">
              {formatAmount(dayFare * (1 + vatRate), exchangeRate)}
            </span>
          </div>
          <div>
            <span className="text-brand-500">Evening:</span>{' '}
            <span className="font-semibold text-brand-900">
              {formatAmount(eveningFare * (1 + vatRate), exchangeRate)}
            </span>
          </div>
          <div>
            <span className="text-brand-500">Night:</span>{' '}
            <span className="font-semibold text-brand-900">
              {formatAmount(nightFare * (1 + vatRate), exchangeRate)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving || localSaving} size="sm">
          Save global config
        </Button>
      </div>
    </Card>
  )
}

const CategoryMultiplierCard: React.FC<{
  category: CategoryMultiplierItem
  onSave: (body: Partial<CategoryMultiplierItem>) => Promise<void>
  isSaving: boolean
  exchangeRate: number | null
}> = ({ category, onSave, isSaving, exchangeRate }) => {
  const [multiplier, setMultiplier] = useState(category.multiplier)
  const [isActive, setIsActive] = useState(category.is_active)
  const [localSaving, setLocalSaving] = useState(false)

  useEffect(() => {
    setMultiplier(category.multiplier)
    setIsActive(category.is_active)
  }, [category])

  const handleSave = async () => {
    setLocalSaving(true)
    try {
      await onSave({
        multiplier,
        is_active: isActive,
      })
    } finally {
      setLocalSaving(false)
    }
  }

  // Price impact preview (5 km car, day, standard base = $5.50)
  const sampleBasePrice = 5.5
  const impactPrice = sampleBasePrice * multiplier

  return (
    <Card className={!isActive ? 'opacity-60' : ''}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold capitalize text-brand-900">{category.category}</h4>
          <p className="text-xs text-brand-500">{category.description}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-brand-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-brand-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-brand-600">Multiplier</label>
        <input
          type="number"
          step="0.01"
          min="0.5"
          max="3"
          value={multiplier}
          onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="mt-3 rounded-lg bg-brand-50 p-2 text-sm">
        <span className="text-brand-500">Price impact (5 km sample):</span>{' '}
        <span className="font-semibold text-brand-900">{formatAmount(impactPrice, exchangeRate)}</span>
        <span className="ml-1 text-xs text-brand-400">
          (×{multiplier.toFixed(2)} of base {formatAmount(sampleBasePrice, exchangeRate)})
        </span>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving || localSaving} size="sm">
          Save
        </Button>
      </div>
    </Card>
  )
}

const FareSimulator: React.FC<{ exchangeRate: number | null }> = ({ exchangeRate }) => {
  const [vehicleType, setVehicleType] = useState('car')
  const [distanceKm, setDistanceKm] = useState(5)
  const [timeBand, setTimeBand] = useState<'day' | 'evening' | 'night'>('day')
  const [category, setCategory] = useState('standard')
  const [result, setResult] = useState<FareSimulateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSimulate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await supabaseService.simulateFare({
        vehicle_type: vehicleType,
        distance_km: distanceKm,
        time_band: timeBand,
        category,
      })
      setResult(res)
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate fare')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-brand-900">Fare Simulator</h3>
      <p className="mt-1 text-sm text-brand-600">
        Simulate a fare with the full pricing pipeline breakdown
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-brand-600">Vehicle</label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {VEHICLE_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt.charAt(0).toUpperCase() + vt.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Distance (km)</label>
          <input
            type="number"
            min="0.5"
            max="100"
            step="0.5"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Time Band</label>
          <select
            value={timeBand}
            onChange={(e) => setTimeBand(e.target.value as 'day' | 'evening' | 'night')}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {TIME_BANDS.map((tb) => (
              <option key={tb.value} value={tb.value}>
                {tb.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={handleSimulate} isLoading={isLoading}>
          Simulate Fare
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-brand-200 bg-white">
            <div className="border-b border-brand-100 bg-brand-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Pricing Pipeline
              </p>
            </div>
            <div className="divide-y divide-brand-100">
              {result.steps.map((step) => (
                <div key={step.step} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-brand-700">{step.label}</span>
                  <span className="font-mono font-semibold text-brand-900">
                    {formatAmount(step.value)}
                    
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-brand-700 p-3 text-white">
              <p className="text-xs text-brand-200">Final Price</p>
              <p className="mt-1 text-xl font-bold">{formatAmount(result.final_price, exchangeRate)}</p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-500">Excl. VAT</p>
              <p className="mt-1 text-lg font-semibold text-brand-900">
                {formatAmount(result.price_excluding_vat, exchangeRate)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-600">Commission</p>
              <p className="mt-1 text-lg font-semibold text-amber-800">
                {formatAmount(result.commission_amount, exchangeRate)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-green-600">Driver Net</p>
              <p className="mt-1 text-lg font-semibold text-green-800">
                {formatAmount(result.driver_net, exchangeRate)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

const CategoryMetricsTable: React.FC<{
  metrics: CategoryMetricsItem[]
  isLoading: boolean
  exchangeRate: number | null
}> = ({ metrics, isLoading, exchangeRate }) => {
  const tableData = metrics.map((m) => ({
    category: (
      <span className="font-medium capitalize">{m.category.replace('_', ' ')}</span>
    ),
    ride_volume: m.ride_volume,
    average_fare: m.average_fare !== null ? formatAmount(m.average_fare, exchangeRate) : '—',
    active_drivers: m.active_drivers,
    total_requests: m.total_requests,
    completed_trips: m.completed_trips,
    conversion_rate:
      m.conversion_rate !== null ? `${m.conversion_rate.toFixed(1)}%` : '—',
  }))

  return (
    <Card>
      <h3 className="text-lg font-bold text-brand-900">Per-Category Metrics</h3>
      <p className="mt-1 text-sm text-brand-600">
        Ride volume, supply, demand, and conversion by category
      </p>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : metrics.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-400">No metrics available</p>
        ) : (
          <Table columns={METRICS_COLUMNS} data={tableData} />
        )}
      </div>
    </Card>
  )
}

const AuditLogTable: React.FC<{
  logs: PricingAuditLogItem[]
  isLoading: boolean
}> = ({ logs, isLoading }) => {
  const tableData = logs.map((log) => ({
    created_at: formatDateTime(log.created_at),
    admin_name: log.admin_name || log.admin_id.slice(0, 8) + '...',
    change_type: (
      <Badge status={getChangeTypeBadge(log.change_type)}>
        {log.change_type.replace(/_/g, ' ')}
      </Badge>
    ),
    change_summary: log.change_summary,
  }))

  return (
    <Card>
      <h3 className="text-lg font-bold text-brand-900">Pricing Audit Log</h3>
      <p className="mt-1 text-sm text-brand-600">
        Every pricing config change preserved with who, when, and what
      </p>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-400">No audit log entries yet</p>
        ) : (
          <Table columns={AUDIT_COLUMNS} data={tableData} />
        )}
      </div>
    </Card>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────

export const PricingView: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehiclePricingConfig[]>([])
  const [globalConfig, setGlobalConfig] = useState<GlobalPricingConfig>({
    vat_rate: 0.16,
    day_multiplier: 1.0,
    evening_multiplier: 1.1,
    commission_rate: 0.05,
  })
  const [categoryMultipliers, setCategoryMultipliers] = useState<CategoryMultiplierItem[]>([])
  const [metrics, setMetrics] = useState<CategoryMetricsItem[]>([])
  const [auditLogs, setAuditLogs] = useState<PricingAuditLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMetricsLoading, setIsMetricsLoading] = useState(false)
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const config = await supabaseService.getPricingConfig()
      setVehicles(config.vehicles)
      setGlobalConfig(config.global_config)
      setCategoryMultipliers(config.category_multipliers)
    } catch (err: any) {
      setError(err?.message || 'Failed to load pricing config')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    setIsMetricsLoading(true)
    try {
      const data = await supabaseService.getPricingMetrics(7)
      setMetrics(data)
    } catch {
      // Non-critical
    } finally {
      setIsMetricsLoading(false)
    }
  }, [])

  const loadAuditLog = useCallback(async () => {
    setIsAuditLoading(true)
    try {
      const data = await supabaseService.getPricingAuditLog({ limit: 20 })
      setAuditLogs(data)
    } catch {
      // Non-critical
    } finally {
      setIsAuditLoading(false)
    }
  }, [])

  const loadExchangeRate = useCallback(async () => {
    try {
      const data = await supabaseService.getExchangeRate()
      setExchangeRate(data.rate_cdf_per_usd)
    } catch (err: any) {
      setError(err?.message || 'Failed to load exchange rate for CDF display')
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadMetrics()
    loadAuditLog()
    loadExchangeRate()
  }, [loadConfig, loadMetrics, loadAuditLog, loadExchangeRate])

  const handleVehicleSave = (vehicleType: string) => async (body: Partial<VehiclePricingConfig>) => {
    setIsSaving(true)
    try {
      const updated = await supabaseService.updateVehiclePricing(vehicleType, body)
      setVehicles((prev) => prev.map((v) => (v.vehicle_type === vehicleType ? updated : v)))
      await loadAuditLog()
    } catch (err: any) {
      setError(err?.message || 'Failed to save vehicle pricing')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGlobalSave = async (body: Partial<GlobalPricingConfig>) => {
    setIsSaving(true)
    try {
      const updated = await supabaseService.updateGlobalPricing(body)
      setGlobalConfig(updated)
      await loadAuditLog()
    } catch (err: any) {
      setError(err?.message || 'Failed to save global config')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategorySave = (category: string) => async (body: Partial<CategoryMultiplierItem>) => {
    setIsSaving(true)
    try {
      const updated = await supabaseService.updateCategoryMultiplier(category, body)
      setCategoryMultipliers((prev) => prev.map((c) => (c.category === category ? updated : c)))
      await loadAuditLog()
    } catch (err: any) {
      setError(err?.message || 'Failed to save category multiplier')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Pricing Engine Configuration</h1>
        <p className="mt-1 text-sm text-brand-600">
          View and edit pricing rules in CDF. Stored fare values remain backend-compatible and are converted using the active exchange rate.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Per-vehicle pricing */}
      <div className="grid gap-6 lg:grid-cols-2">
        {vehicles.map((vehicle) => (
          <VehiclePricingCard
            key={vehicle.vehicle_type}
            vehicle={vehicle}
            onSave={handleVehicleSave(vehicle.vehicle_type)}
            isSaving={isSaving}
            exchangeRate={exchangeRate}
          />
        ))}
      </div>

      {/* Global config */}
      <GlobalConfigCard config={globalConfig} onSave={handleGlobalSave} isSaving={isSaving} exchangeRate={exchangeRate} />

      {/* Category multipliers */}
      <Card>
        <h3 className="text-lg font-bold text-brand-900">Category Multipliers</h3>
        <p className="mt-1 text-sm text-brand-600">
          Edit category multipliers. Structure (three categories) is locked per V1 rules.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {categoryMultipliers.map((cat) => (
            <CategoryMultiplierCard
              key={cat.category}
              category={cat}
              onSave={handleCategorySave(cat.category)}
              isSaving={isSaving}
              exchangeRate={exchangeRate}
            />
          ))}
        </div>
      </Card>

      {/* Fare Simulator */}
      <FareSimulator exchangeRate={exchangeRate} />

      {/* Per-category metrics */}
      <CategoryMetricsTable metrics={metrics} isLoading={isMetricsLoading} exchangeRate={exchangeRate} />

      {/* Audit log */}
      <AuditLogTable logs={auditLogs} isLoading={isAuditLoading} />
    </div>
  )
}
