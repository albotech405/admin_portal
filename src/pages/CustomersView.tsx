import React from 'react'
import { Card } from '../components'

const profileTabs = [
  'Overview with gender, ratings, spend, payment methods, and status',
  'Trip History with drill-in to trip detail',
  'Payments with refund history and payment method outcomes',
  'Saved Places as a customer-only read-only tab',
  'Emergency Contacts, Notifications, Tickets, and Activity Log',
]

const filters = [
  'Status: active, banned, inactive',
  'Gender: male, female, not_set for legacy accounts',
  'Signup date, total trips, rating, unresolved tickets',
  'Search by phone, name, email, or customer ID',
]

const adminActions = [
  'Ban or unban with a required reason',
  'Force logout from all devices',
  'Reset phone via an audited workflow',
  'Add internal notes and issue refunds',
  'Send direct push notifications and adjust ratings in extreme abuse cases',
]

export const CustomersView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Customer Operations</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          This surface maps the customer-management requirements in the admin specification so
          support and operations can work from a consistent profile model.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">List View Requirements</h2>
          <p className="mt-2 text-sm text-slate-600">
            Customer rows must expose identity, activity, and support context at scan speed.
          </p>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            ID, full name, phone, email, gender, total trips, rating, signup date, status, and
            last active are required columns for v1.
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Filters & Search</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {filters.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Admin Actions</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {adminActions.map((item) => (
              <li key={item} className="rounded-2xl bg-orange-50 px-4 py-3 text-orange-900">
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950">Customer Profile Tabs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profileTabs.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <h2 className="text-lg font-semibold text-blue-950">Gender Field Handling</h2>
        <p className="mt-2 text-sm text-blue-900">
          New customers always provide gender at signup. Legacy customers may remain not_set until
          they complete the reminder flow, so the admin UI must preserve null visibility instead of
          backfilling or hiding it.
        </p>
      </Card>
    </div>
  )
}