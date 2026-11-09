/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-09
 * @REVISAO: REV-RELOGIO-SERVIDOR-RETORNO-TABLE-20261109-02 — ordem do proprietário em 2026-11-09: corrigir o alerta de data inválida no OEE; leitura tolerante a retorno escalar, TABLE, objeto e envelope JSON do PostgREST, sem usar relógio local como substituto.
 */
import { supabase } from './supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_DATA_SERVIDOR } from './supabaseRpcStatus'

export type RelogioServidor = { agora: Date | null; aviso: string }

const VALIDADE_MS = 3 * 60 * 1000
let cache: { agora: Date; obtidoEm: number } | null = null

function extrairDataServidor(dados: unknown, profundidade = 0): unknown {
  if (profundidade > 5 || dados == null) return null
  if (Array.isArray(dados)) {
    for (const item of dados) {
      const valor = extrairDataServidor(item, profundidade + 1)
      if (valor != null) return valor
    }
    return null
  }
  if (typeof dados === 'object') {
    const registro = dados as Record<string, unknown>
    const chaves = ['data_servidor', 'dataServidor', 'erp_data_servidor', 'agora', 'now', 'current_timestamp', 'result', 'data']
    for (const chave of chaves) {
      if (registro[chave] == null) continue
      const valor = extrairDataServidor(registro[chave], profundidade + 1)
      if (valor != null) return valor
    }
    return null
  }
  if (typeof dados === 'string') {
    const texto = dados.trim()
    if ((texto.startsWith('{') && texto.endsWith('}')) || (texto.startsWith('[') && texto.endsWith(']'))) {
      try { return extrairDataServidor(JSON.parse(texto), profundidade + 1) } catch { /* string pode ser o timestamp */ }
    }
  }
  return dados
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
