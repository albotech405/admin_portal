/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_JWT_TOKEN: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_ADMIN_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
