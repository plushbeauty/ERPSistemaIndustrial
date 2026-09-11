import { createClient } from '@supabase/supabase-js'

const PROJECT_URL = 'https://zsklkydlawgvwgnvxwwx.supabase.co'
const PROJECT_PUBLISHABLE_KEY = 'sb_publishable_BcwsSbBx8dWof7d_hAKtQA_XzQGAYwR'

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
