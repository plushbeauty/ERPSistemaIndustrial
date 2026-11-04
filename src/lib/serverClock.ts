import { supabase } from './supabaseClient'

export async function relogioDoServidor(): Promise<{ agora: Date | null; aviso?: string }> {
  const result = await supabase.rpc('erp_data_servidor')
  if (result.error) return { agora: null, aviso: result.error.message }
  const value = typeof result.data === 'string' ? result.data : ''
  const parsed = value ? new Date(value) : null
  if (!parsed || Number.isNaN(parsed.getTime())) return { agora: null, aviso: 'A RPC erp_data_servidor não retornou uma data válida.' }
  return { agora: parsed }
}
