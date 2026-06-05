import type { AdminRole } from '../context/AuthContext'

const OPERATIONS_ALLOWED_PATHS = new Set(['/operations'])

export function getDefaultAdminPath(role?: AdminRole | null): string {
  if (role === 'operations') return '/operations'
  return '/'
}

export function canAccessAdminPath(role: AdminRole | undefined, path: string): boolean {
  if (!role) return false
  if (role === 'super_admin') return true

  if (role === 'operations') {
    return OPERATIONS_ALLOWED_PATHS.has(path)
  }

  return true
}