import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseService } from '../services/supabaseService'

export type AdminRole = 'super_admin' | 'operations' | 'finance' | 'support' | 'readonly'

export interface AdminUser {
  id: string
  email: string
  full_name?: string | null
  admin_role: AdminRole
  two_fa_enabled: boolean
}

interface AuthState {
  user: AdminUser | null
  sessionId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionExpiresAt: number | null  // unix ms
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>
  refreshSession: () => void
  canAccess: (requiredRole: AdminRole | AdminRole[]) => boolean
}

const ROLE_RANK: Record<AdminRole, number> = {
  readonly: 0,
  support: 1,
  finance: 2,
  operations: 3,
  super_admin: 4,
}

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000  // 8 hours idle timeout

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

function canRoleAccess(userRole: AdminRole, required: AdminRole | AdminRole[]): boolean {
  const requiredArr = Array.isArray(required) ? required : [required]
  if (userRole === 'super_admin') return true
  return requiredArr.some(r => ROLE_RANK[userRole] >= ROLE_RANK[r])
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    sessionId: null,
    isLoading: true,
    isAuthenticated: false,
    sessionExpiresAt: null,
  })

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activityRef = useRef<number>(Date.now())
  // Refs to avoid stale closures and prevent double-resolve on boot
  const sessionIdRef = useRef<string | null>(null)
  const isAuthenticatedRef = useRef(false)
  const resolvingRef = useRef(false)

  const logout = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // Reset resolvingRef immediately so a fast re-login is never blocked by an
    // in-flight resolveAdminUser call that was started before this logout.
    resolvingRef.current = false
    const sid = sessionIdRef.current
    sessionIdRef.current = null
    isAuthenticatedRef.current = false
    // Optimistically clear UI before async calls complete
    setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
    try {
      if (sid) await supabaseService.invalidateAdminSession(sid)
    } catch { /* non-critical */ }
    await supabase.auth.signOut()
  }, [])  // stable — reads sessionId from ref, not state

  const scheduleTimeout = useCallback((expiresAt: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    timeoutRef.current = setTimeout(() => {
      logout()
    }, remaining)
  }, [logout])

  const refreshSession = useCallback(() => {
    activityRef.current = Date.now()
    const newExpiry = Date.now() + SESSION_TIMEOUT_MS
    setState(s => ({ ...s, sessionExpiresAt: newExpiry }))
    scheduleTimeout(newExpiry)
  }, [scheduleTimeout])

  // Reset idle timer on any user interaction
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => {
      if (isAuthenticatedRef.current) refreshSession()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [refreshSession])  // refreshSession is now stable → registers only once

  // When the tab regains visibility (user switches back to the portal after it was
  // in the background), proactively ask Supabase to refresh the session so the
  // stored token is always current before the next API call.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticatedRef.current) {
        supabase.auth.refreshSession().catch(() => { /* handled by TOKEN_REFRESHED / SIGNED_OUT */ })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Boot: onAuthStateChange fires INITIAL_SESSION immediately for existing sessions,
  // so no separate init() call is needed — avoids double resolveAdminUser on boot.
  useEffect(() => {
    let resolved = false

    const handleSession = async (session: { access_token: string; user?: { id: string } } | null) => {
      if (resolved) return
      resolved = true
      clearTimeout(fallbackTimer)
      if (!session) {
        setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
        return
      }
      await resolveAdminUser(session.access_token, session.user?.id ?? '')
    }

    // Safety fallback: if neither getSession nor onAuthStateChange resolves within 5 s
    // (e.g. Supabase key format issue or network problem), clear the loading spinner.
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        setState(s => s.isLoading ? { ...s, isLoading: false } : s)
      }
    }, 2000)

    // Explicitly fetch the current session — faster than waiting for INITIAL_SESSION
    // event, and works with both legacy JWT and newer sb_publishable_* key formats.
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Keep the stored token current whenever Supabase silently refreshes it.
      // This is non-blocking and must not call any method that acquires the SDK lock
      // (e.g. getSession) because this callback runs while the lock may be held.
      if (_event === 'TOKEN_REFRESHED' && session) {
        supabaseService.setAuthToken(session.access_token)
        // Extend the idle timeout — a fresh token means the session is still active.
        if (isAuthenticatedRef.current) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          const newExpiry = Date.now() + SESSION_TIMEOUT_MS
          timeoutRef.current = setTimeout(() => logout(), SESSION_TIMEOUT_MS)
          setState(s => s.isAuthenticated ? { ...s, sessionExpiresAt: newExpiry } : s)
        }
        return
      }

      // Skip INITIAL_SESSION if getSession already resolved it
      if (!resolved || _event !== 'INITIAL_SESSION') {
        resolved = true
        clearTimeout(fallbackTimer)
        if (!session) {
          setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
          return
        }
        await resolveAdminUser(session.access_token, session.user?.id ?? '')
      }
    })

    return () => {
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  const resolveAdminUser = async (token: string, userId: string) => {
    if (resolvingRef.current) return
    resolvingRef.current = true
    supabaseService.setAuthToken(token)
    try {
      const roleData = await supabaseService.getMyAdminRole()
      const expiresAt = Date.now() + SESSION_TIMEOUT_MS

      // Record the login and get a session ID
      let sessionId: string | null = null
      try {
        const sessionResp = await supabaseService.recordAdminLogin()
        sessionId = sessionResp.session_id ?? null
      } catch { /* non-critical */ }

      sessionIdRef.current = sessionId
      isAuthenticatedRef.current = true

      setState({
        user: {
          id: userId,
          email: roleData.email ?? '',
          full_name: roleData.full_name ?? null,
          admin_role: (roleData.admin_role ?? 'readonly') as AdminRole,
          two_fa_enabled: roleData.two_fa_enabled ?? false,
        },
        sessionId,
        isLoading: false,
        isAuthenticated: true,
        sessionExpiresAt: expiresAt,
      })
      scheduleTimeout(expiresAt)
    } catch {
      // Not an admin — sign out
      isAuthenticatedRef.current = false
      sessionIdRef.current = null
      await supabase.auth.signOut()
      setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
    } finally {
      resolvingRef.current = false
    }
  }

  const canAccess = useCallback((required: AdminRole | AdminRole[]) => {
    if (!state.user) return false
    return canRoleAccess(state.user.admin_role, required)
  }, [state.user])

  return (
    <AuthContext.Provider value={{ ...state, logout, refreshSession, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}
