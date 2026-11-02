/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-RPC-AUSENTE-20261102-01 — distingue "a rotina não existe no banco" de falha de regra, para a tela declarar a pendência em vez de mostrar erro genérico
 * @STATUS_APROVACAO: REGRAS DE NEGÓCIO AUTORIZADAS PELO PROPRIETÁRIO · AGUARDA APLICAÇÃO DAS MIGRATIONS CITADAS
 */

type ErroBanco = { code?: string; message?: string } | null | undefined

export const MIGRACAO_CODIGO_PRODUTO = '20261102030000_erp_gerar_codigo_produto_v1.sql'
export const MIGRACAO_LIBERACAO_ITEM_FISCAL = '20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql'
export const MIGRACAO_PEDIDO_COMPRA_COMPLETO = '20261102032000_erp_compras_salvar_pedido_completo_v1.sql'
export const MIGRACAO_NFE_PAGAMENTO = '20261102013000_erp_nfe_pagamento_v1.sql'

// PGRST202 = RPC fora do schema cache; PGRST205 = tabela/visão ausente; 42P01 = relação inexistente no Postgres.
function objetoAusente(erro: ErroBanco): boolean {
  const codigo = String(erro?.code ?? '')
  const mensagem = String(erro?.message ?? '').toLowerCase()
  return codigo === 'PGRST202'
    || codigo === 'PGRST205'
    || codigo === '42P01'
    || mensagem.includes('could not find the function')
    || mensagem.includes('could not find the table')
    || mensagem.includes('does not exist')
}

export function erroBancoNaoInstalado(
  erro: ErroBanco,
  nomeObjeto: string,
  arquivoMigration: string
): string | null {
  if (!objetoAusente(erro)) return null
  return `${nomeObjeto} ainda não existe neste banco. Aplique a migration ${arquivoMigration} e tente novamente; nenhum registro foi gravado ou alterado.`
}
