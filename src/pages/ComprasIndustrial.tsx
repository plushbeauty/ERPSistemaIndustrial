/**
 * @AUTOR: SYSNQRA
 * @REVISAO: REV-COMPRAS-ALIAS-CENTRAL-20261110-01
 * @STATUS: ALIAS COMPATÍVEL; remove shell duplicado e encaminha para a Central de Compras oficial.
 */
import ComprasWorkspace from './ComprasWorkspace'

type LegacyTab = 'dashboard' | 'solicitacoes' | 'pedidos' | 'fornecedores' | 'recebimentos'

const tabMap: Record<LegacyTab, 'visao-geral' | 'requisicoes' | 'pedidos' | 'fornecedores' | 'recebimentos'> = {
  dashboard: 'visao-geral',
  solicitacoes: 'requisicoes',
  pedidos: 'pedidos',
  fornecedores: 'fornecedores',
  recebimentos: 'recebimentos',
}

export default function ComprasIndustrial({ initialTab = 'dashboard' }: { initialTab?: LegacyTab }) {
  return <ComprasWorkspace initialTab={tabMap[initialTab]} />
}
