import React, { useState, useEffect } from 'react'
import { Card, Button } from '../components'
import { AppConfigToggle, supabaseService } from '../services/supabaseService'

export const SystemView: React.FC = () => {
  const [configs, setConfigs] = useState<AppConfigToggle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setIsLoading(true)
      const data = await supabaseService.getAppConfig()
      setConfigs(data)
      // Initialize edit values
      const values: Record<string, string> = {}
      data.forEach((c) => {
        values[c.key] = c.value
      })
      setEditValues(values)
      setError(null)
    } catch (err) {
      setError('Failed to load app configuration')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      await supabaseService.updateAppConfig(editValues)
      setSuccess('Configuration updated successfully')
      setError(null)
      setTimeout(() => setSuccess(null), 3000)
      loadConfig()
    } catch (err) {
      setError('Failed to update configuration')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLabels: Record<string, { label: string; description: string }> = {
    active_request_resume_enabled: {
      label: 'Active Request Resume',
      description: 'Allow customers to resume interrupted ride requests',
    },
    driver_offer_update_enabled: {
      label: 'Driver Offer Update',
      description: 'Allow drivers to update their offer prices on active requests',
    },
    stale_request_alert_threshold_minutes: {
      label: 'Stale Request Threshold (min)',
      description: 'Minutes after which a ride request without bids is flagged as stale',
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-950">System Configuration</h1>
          <p className="mt-2 max-w-3xl text-brand-600">
            Manage app configuration toggles, feature flags, and system settings.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadConfig} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Card>
        <h2 className="text-xl font-semibold text-brand-950">App Configuration Toggles</h2>
        <p className="mt-1 text-sm text-brand-600">
          These settings control runtime behavior. Changes take effect immediately.
        </p>

        <div className="mt-6 space-y-4">
          {configs.length === 0 && !isLoading && (
            <div className="rounded-2xl bg-brand-50 p-6 text-center text-sm text-brand-500">
              No configuration toggles found. They will appear here once created in the database.
            </div>
          )}

          {configs.map((config) => {
            const meta = toggleLabels[config.key] || {
              label: config.key,
              description: '',
            }
            const isBoolean = config.value === 'true' || config.value === 'false'

            return (
              <div
                key={config.key}
                className="rounded-2xl border border-brand-100 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-brand-950">{meta.label}</p>
                    <p className="mt-1 text-sm text-brand-500">{meta.description}</p>
                    {config.updated_at && (
                      <p className="mt-1 text-xs text-brand-400">
                        Last updated: {new Date(config.updated_at).toLocaleString()}
                        {config.updated_by ? ` by ${config.updated_by}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isBoolean ? (
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={editValues[config.key] === 'true'}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              [config.key]: e.target.checked ? 'true' : 'false',
                            })
                          }
                          className="peer sr-only"
                        />
                        <div className="peer h-7 w-12 rounded-full bg-brand-200 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full" />
                      </label>
                    ) : (
                      <input
                        type="number"
                        value={editValues[config.key] || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [config.key]: e.target.value,
                          })
                        }
                        className="w-24 rounded-2xl border border-brand-200 px-3 py-2 text-sm text-center text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                        min={1}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {configs.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-brand-950">Service Zones</h2>
          <p className="mt-2 text-sm text-brand-600">
            Configure service areas for pickup and dropoff operations.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Kinshasa — City Centre', detail: 'Active zone · rideable' },
              { label: 'Kinshasa — Gombe', detail: 'Active zone · rideable' },
              { label: 'Kinshasa — Limete', detail: 'Active zone · rideable' },
            ].map(z => (
              <div key={z.label} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-900">{z.label}</p>
                  <p className="text-xs text-brand-400">{z.detail}</p>
                </div>
                <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-brand-950">Integrations</h2>
          <p className="mt-2 text-sm text-brand-600">
            Third-party integrations for payments, SMS, and mapping.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { name: 'M-Pesa', type: 'Mobile Money', status: 'Connected' },
              { name: 'Orange Money', type: 'Mobile Money', status: 'Connected' },
              { name: 'Airtel Money', type: 'Mobile Money', status: 'Connected' },
              { name: 'Google Maps', type: 'Mapping', status: 'Connected' },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-900">{i.name}</p>
                  <p className="text-xs text-brand-400">{i.type}</p>
                </div>
                <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{i.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
