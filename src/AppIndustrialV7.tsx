/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — dashboard principal.
 * Indicadores permanecem conectados ao Supabase com isolamento por empresa/RLS.
 * A navegação das telas partiu do catálogo único de menu (erpNavigation), então
 * este contêiner repassa apenas o componente: não existe mais mapa de rotas local.
 */
import DashboardPrincipal from './components/IndustrialCommandDashboard'

export default function AppIndustrialV7() {
  return <DashboardPrincipal />
}
