/// <reference types="vite/client" />

/**
 * Fallback explícito para ambientes TypeScript em que os tipos de vite/client
 * não expõem ImportMeta.env durante o type-check do build.
 * Mantém as variáveis VITE_* tipadas sem introduzir any.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
