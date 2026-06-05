import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginPageProps {
  accessDenied?: boolean
}

export const LoginPage: React.FC<LoginPageProps> = ({ accessDenied }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    accessDenied ? 'Access denied. Admin privileges required.' : null
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
      }
      // App.tsx onAuthStateChange handles the admin check and sets isAuthenticated
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.2),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.14),transparent_60%)]" />
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="hidden rounded-[2.5rem] border border-white/50 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,105,161,0.9))] p-10 text-white shadow-[0_40px_100px_-44px_rgba(15,23,42,0.7)] backdrop-blur lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-200">Operations Command</p>
          <h2 className="mt-5 max-w-lg text-5xl font-bold leading-tight">Run support, safety, finance, and live dispatch from one control room.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
            Review KYC, approve top-ups, investigate incidents, and keep marketplace operations moving with a single admin surface.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Safety', 'Escalations and SOS monitoring'],
              ['Finance', 'Wallet approvals and reconciliation'],
              ['Support', 'Tickets, users, and audit actions'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full max-w-md justify-self-center rounded-[2rem] border border-white/70 bg-white/88 p-8 shadow-[0_30px_80px_-38px_rgba(30,64,175,0.45)] backdrop-blur">
        <div className="mb-8 text-center">
          <img src="/albo_logo.jpeg" alt="Albo Taxi" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <h1 className="mt-5 text-3xl font-bold text-slate-950">Albo Taxi</h1>
          <p className="mt-1 text-slate-600">Admin portal</p>
          <p className="mt-3 text-sm text-slate-500">Secure access for operations, finance, and support teams.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-sky-600 disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
