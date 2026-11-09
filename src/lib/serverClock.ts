/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-09
 * @REVISAO: REV-RELOGIO-SERVIDOR-RETORNO-TABLE-20261109-01
 * Aceita o contrato atual da RPC, que devolve TABLE(data_servidor, status_sistema, versao_api),
 * e mantém compatibilidade com versões que devolvam um timestamptz escalar.
 */
import { supabase } from './supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_DATA_SERVIDOR } from './supabaseRpcStatus'

export type RelogioServidor = { agora: Date | null; aviso: string }

const VALIDADE_MS = 3 * 60 * 1000
let cache: { agora: Date; obtidoEm: number } | null = null

function extrairDataServidor(dados: unknown): unknown {
  const linha = Array.isArray(dados) ? dados[0] : dados
  if (linha && typeof linha === 'object') {
    const registro = linha as Record<string, unknown>
    return registro.data_servidor ?? registro.erp_data_servidor ?? registro.agora ?? registro.now
  }
  return linha
}

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

  const valorData = extrairDataServidor(resultado.data)
  const agora = valorData instanceof Date
    ? new Date(valorData.getTime())
    : typeof valorData === 'number'
      ? new Date(valorData)
      : typeof valorData === 'string'
        ? new Date(valorData)
        : new Date(Number.NaN)
  if (!Number.isFinite(agora.getTime())) {
    cache = null
    return { agora: null, aviso: 'A rotina erp_data_servidor não devolveu uma data válida do banco.' }
  }

  cache = { agora, obtidoEm: Date.now() }
  return { agora, aviso: '' }
}
