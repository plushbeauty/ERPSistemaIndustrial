/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-CONTRATO-BANCO-20261103-01 — relógio do Postgres como única base para prazos e vencimentos
 * @STATUS_APROVACAO: REGRA DO PROPRIETÁRIO: "o prazo deve ser calculado pelo servidor, e não pelo relógio do navegador"
 */
import { supabase } from './supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_DATA_SERVIDOR } from './supabaseRpcStatus'

export type RelogioServidor = { agora: Date | null; aviso: string }

// A resposta é reaproveitada por alguns minutos para não consultar o banco a cada recálculo de tela.
const VALIDADE_MS = 3 * 60 * 1000
let cache: { agora: Date; obtidoEm: number } | null = null

export async function relogioDoServidor(): Promise<RelogioServidor> {
  if (cache && Date.now() - cache.obtidoEm < VALIDADE_MS) {
    return { agora: new Date(cache.agora.getTime() + (Date.now() - cache.obtidoEm)), aviso: '' }
  }
  const resultado = await supabase.rpc('erp_data_servidor')
  if (resultado.error) {
    cache = null
    return {
      agora: null,
      aviso: erroBancoNaoInstalado(resultado.error, 'erp_data_servidor', MIGRACAO_DATA_SERVIDOR)
        ?? `Não foi possível ler o relógio do servidor: ${resultado.error.message}`,
    }
  }
  const agora = new Date(String(resultado.data ?? ''))
  if (!Number.isFinite(agora.getTime())) {
    cache = null
    return { agora: null, aviso: 'A rotina erp_data_servidor não devolveu uma data válida do banco.' }
  }
  cache = { agora, obtidoEm: Date.now() }
  return { agora, aviso: '' }
}
