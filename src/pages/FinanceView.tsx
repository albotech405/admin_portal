import React from 'react'
import { Card } from '../components'

const categoryRows = [
  { category: 'standard', multiplier: '1.00', notes: 'Default for all cars and motorcycles' },
  { category: 'premium', multiplier: '1.25', notes: 'Cars only, AC required, vehicle year >= 2015' },
  { category: 'lady_driver', multiplier: '1.15', notes: 'Cars only, female drivers with verified gender' },
]

const financeModules = [
  'Transaction browser with provider statuses and reconciliation exports',
  'Driver wallet management with ok, low, and locked states',
  'Pricing config editor with locked formula and two-person approval',
  'Payout queue, failed payout retries, and provider statement reconciliation',
  'Exchange-rate management with historical auditability',
]

export const FinanceView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Finance & Pricing</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          The finance workspace combines top-up review, pricing governance, driver wallets, and
          reconciliation requirements from the v1 admin specification.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Locked Pricing Model</h2>
          <div className="mt-4 rounded-2xl bg-slate-950 p-4 font-mono text-sm text-slate-100">
            <p>1. base_price = base_fare + distance_km * per_km</p>
            <p>2. time_adjusted = base_price * time_multiplier</p>
            <p>3. floored_price = max(time_adjusted, minimum_fare)</p>
            <p>4. category_adjusted = floored_price * category_multiplier</p>
            <p>5. final_price = category_adjusted * (1 + vat_rate)</p>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Category multiplier is applied before VAT, and pricing always follows the request
            category even when asymmetric dispatch lets higher-tier drivers see lower-tier work.
          </p>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-slate-950">Finance Control Surfaces</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {financeModules.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950">Category Multipliers</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {categoryRows.map((row) => (
            <div key={row.category} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{row.category}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{row.multiplier}x</p>
              <p className="mt-2 text-sm text-slate-600">{row.notes}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}