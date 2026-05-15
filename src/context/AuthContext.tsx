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

const SESSION_TIMEOUT_MS = 30 * 60 * 1000  // 30 min

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function canRoleAccess(userRole: AdminRole, required: AdminRole | AdminRole[]): boolean {
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

  const logout = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const { sessionId } = state
    try {
      if (sessionId) {
        await supabaseService.invalidateAdminSession(sessionId)
      }
    } catch { /* non-critical */ }
    await supabase.auth.signOut()
    setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
  }, [state])

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
      if (state.isAuthenticated) refreshSession()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [state.isAuthenticated, refreshSession])

  // Boot: check existing session
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState(s => ({ ...s, isLoading: false }))
        return
      }
      await resolveAdminUser(session.access_token)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
        return
      }
      await resolveAdminUser(session.access_token)
    })

    return () => subscription.unsubscribe()
  }, [])

  const resolveAdminUser = async (token: string) => {
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

      setState({
        user: {
          id: (await supabase.auth.getUser()).data.user?.id ?? '',
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
      await supabase.auth.signOut()
      setState({ user: null, sessionId: null, isLoading: false, isAuthenticated: false, sessionExpiresAt: null })
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
