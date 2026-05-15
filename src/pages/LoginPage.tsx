import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type LoginStep = 'credentials' | 'mfa'

interface LoginPageProps {
  onLogin?: () => void
  accessDenied?: boolean
}

export const LoginPage: React.FC<LoginPageProps> = ({ accessDenied }) => {
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    accessDenied ? 'Access denied. Admin privileges required.' : null
  )
  const [isLoading, setIsLoading] = useState(false)

  // Auto-focus TOTP input when step changes
  useEffect(() => {
    if (step === 'mfa') {
      setTimeout(() => document.getElementById('totp-input')?.focus(), 100)
    }
  }, [step])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }

      // Check if MFA is required
      if (data.session) {
        // Fully authenticated — AuthContext will pick it up via onAuthStateChange
        return
      }

      // Supabase returns no session when MFA is pending — check factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const totp = factorsData?.totp?.find(f => f.status === 'verified')

      if (totp) {
        // Challenge the TOTP factor
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
        if (challengeErr) { setError(challengeErr.message); return }
        setFactorId(totp.id)
        setChallengeId(challengeData.id)
        setStep('mfa')
      }
      // If no verified TOTP factor — session was set above, AuthContext handles it
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || !challengeId) return
    setError(null)
    setIsLoading(true)

    try {
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: totpCode.trim(),
      })
      if (verifyErr) {
        setError('Invalid code. Please try again.')
        setTotpCode('')
        return
      }
      // AuthContext onAuthStateChange will fire and resolve the admin role
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep('credentials')
    setTotpCode('')
    setFactorId(null)
    setChallengeId(null)
    setError(null)
    supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-950">
      <div className="w-full max-w-md animate-fade-in rounded-3xl border border-brand-400/20 bg-white p-8 shadow-2xl">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold text-brand-900">albo taxi</h1>
          <p className="mt-1 text-sm font-medium text-accent-600">Admin Portal</p>
          <p className="mt-2 text-xs text-brand-400">DRC Operations · CDF-first</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-brand-900 placeholder-brand-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm text-brand-900 placeholder-brand-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="••••••••"
              />
            </div>

            <ErrorBanner message={error} />

            <SubmitButton loading={isLoading} label="Sign In" />
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={handleMFA} className="space-y-5">
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              <p className="font-medium">Two-factor authentication required</p>
              <p className="mt-0.5 text-xs text-brand-500">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-700">Authenticator Code</label>
              <input
                id="totp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-center text-2xl font-mono tracking-[0.4em] text-brand-900 placeholder-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="000000"
              />
            </div>

            <ErrorBanner message={error} />

            <SubmitButton loading={isLoading} label="Verify" />

            <button
              type="button"
              onClick={handleBack}
              className="w-full text-center text-xs text-brand-400 hover:text-brand-600 transition-colors"
            >
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-brand-400">
          Authorized administrators only. All actions are audited.
        </p>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {message}
      </div>
    </div>
  )
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loading ? 'Please wait…' : label}
        </span>
      ) : label}
    </button>
  )
}
