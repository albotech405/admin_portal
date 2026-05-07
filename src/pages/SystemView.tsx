import React from 'react'
import { Card } from '../components'

const configurationAreas = [
  'Admin roles, 2FA, session timeout, IP allowlists, and role-based navigation',
  'Feature flags, maintenance mode, minimum app version, and announcements',
  'Vehicle categories, KYC document requirements, and cancellation policy',
  'Localization manager for English and French only',
  'Cities, service zones, restricted areas, POIs, and integration health checks',
]

export const SystemView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">System Configuration</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Platform configuration must be separated from day-to-day operations, with stronger guard
          rails for auth, integrations, and region-wide behavior changes.
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950">Configuration Domains</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configurationAreas.map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Access Control</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin login is a separate email and password flow with mandatory 2FA. Mobile auth is
            phone-OTP only and must not be conflated with the admin identity model.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Localization Scope</h2>
          <p className="mt-2 text-sm text-slate-600">
            The admin console should manage English and French content only. Lingala has been
            removed from the mobile product and should not appear in new admin filters or editors.
          </p>
        </Card>
      </div>
    </div>
  )
}