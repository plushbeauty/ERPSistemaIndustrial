/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELOGIO-RPC-TABLE-20261105-01 — normaliza retorno escalar e RETURNS TABLE de erp_data_servidor
 * @STATUS_APROVACAO: CORREÇÃO DE CAUSA RAIZ — o Postgres retorna data_servidor em uma linha estruturada
 */
import { supabase } from './supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_DATA_SERVIDOR } from './supabaseRpcStatus'

export type RelogioServidor = { agora: Date | null; aviso: string }

type LinhaRelogioServidor = { data_servidor?: unknown }

/**
 * Compatibilidade com os dois contratos encontrados entre bancos/ambientes:
 * - RETURNS TABLE(data_servidor timestamptz, ...): PostgREST entrega array de linhas;
 * - RETURNS timestamptz: PostgREST entrega o timestamp diretamente.
 * Não usa o relógio local como substituto para uma resposta ausente ou inválida.
 */
export function extrairValorDataServidor(data: unknown): unknown {
  const linha = Array.isArray(data)
    ? data.length === 1 ? data[0] : null
    : data

  if (typeof linha === 'object' && linha !== null && !Array.isArray(linha)) {
    return (linha as LinhaRelogioServidor).data_servidor
  }

  return linha
}

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

  const valorData = extrairValorDataServidor(resultado.data)
  const agora = new Date(String(valorData ?? ''))
  if (!Number.isFinite(agora.getTime())) {
    cache = null
    return { agora: null, aviso: 'A rotina erp_data_servidor não devolveu uma data válida do banco.' }
  }

  cache = { agora, obtidoEm: Date.now() }
  return { agora, aviso: '' }
}
