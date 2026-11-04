/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-STATUS-OP-20261104-01 — domínio de status da ordem de produção com todas as grafias gravadas pelo sistema
 * @STATUS_APROVACAO: AGUARDANDO APROVACAO VISUAL DO PROPRIETARIO
 *
 * erp_ordens_producao.status não tem CHECK no banco: telas e rotinas SQL gravam grafias
 * diferentes ('ABERTA', 'aberta', 'pendente', 'planejada', 'em_producao', 'EM PRODUCAO',
 * 'Programada', 'concluida', 'CONCLUIDA'). Um filtro que lista apenas uma grafia devolve zero
 * linhas e a tela parece vazia. Este módulo centraliza o único domínio fechado (OP terminada),
 * em todas as grafias, para que a leitura seja "tudo que não foi finalizado" — assim nenhum
 * status novo escrito por alguma tela deixa de aparecer.
 */

const FECHADOS = ['concluida', 'fechada', 'cancelada', 'cancelado', 'encerrada'] as const

const emTodasAsGrafias = (valores: readonly string[]) => {
  const saida = new Set<string>()
  for (const v of valores) {
    const maiusculo = v.toUpperCase()
    saida.add(v)
    saida.add(maiusculo)
    saida.add(maiusculo.replace(/_/g, ' '))
    saida.add(v.replace(/_/g, ' '))
  }
  return [...saida]
}

export const STATUS_OP_FECHADOS = emTodasAsGrafias(FECHADOS)

/** Lista pronta para o PostgREST excluir as OPs finalizadas em qualquer grafia. */
export const LISTA_STATUS_OP_FECHADAS = `(${STATUS_OP_FECHADOS.join(',')})`
