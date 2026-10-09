import NovoPedido from '../NovoPedido'

/**
 * Laboratório visual de manutenção.
 * Renderiza a tela comercial canônica completa, com seus fluxos reais,
 * consultas Supabase e componentes compartilhados. O escopo visual adicional
 * existe apenas nesta rota de teste; não altera a tela de produção de vendas.
 */
export default function LaboratorioVisual() {
  return (
    <div className="erp-global-surface erp-visual-test-surface min-h-screen">
      <NovoPedido />
    </div>
  )
}
