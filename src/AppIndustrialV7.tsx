/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — dashboard principal.
 * Indicadores permanecem conectados ao Supabase com isolamento por empresa/RLS.
 */
import { useNavigate } from 'react-router-dom'
import DashboardPrincipal from './components/IndustrialCommandDashboard'

export default function AppIndustrialV7() {
  const navigate = useNavigate()
  const handleNavigate = (route: string) => {
    if (route === '/fiscal' || route.startsWith('/fiscal/')) {
      navigate('/pageprincipal/fiscal')
    } else if (route === '/paquimetro' || route === '/qualidade/paquimetro') {
      navigate('/pageprincipal/paquimetro')
    } else if (route.startsWith('/pcp')) {
      navigate('/pageprincipal/pcp')
    } else {
      navigate('/pageprincipal')
    }
  }
  return <DashboardPrincipal onNavigate={handleNavigate} />
}
