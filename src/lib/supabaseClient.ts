import { createClient } from '@supabase/supabase-js'

const PROJECT_URL = 'https://wdkvrqekixczuhrfygen.supabase.co'
const PROJECT_PUBLISHABLE_KEY = 'sb_publishable_QX10nEg-hrWd_5UOuYSpQg_v5M-1xuM'

const env = import.meta.env
const configuredUrl = env.VITE_SUPABASE_URL?.trim()
const configuredKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim()

const url = configuredUrl || PROJECT_URL
const key = configuredKey || PROJECT_PUBLISHABLE_KEY

export const supabaseConfigurado = Boolean(url && key)

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
