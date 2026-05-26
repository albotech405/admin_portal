import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // keep session in localStorage across page reloads
    autoRefreshToken: true,     // silently renew access token using refresh token
    detectSessionInUrl: false,  // admin portal — no OAuth redirect flows
    storageKey: 'albo-admin-auth',
  },
})
