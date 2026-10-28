/**
 * SYSNQRA ERP INDUSTRIAL — dashboard principal.
 * Indicadores permanecem conectados ao Supabase com isolamento por empresa/RLS.
 */
import { useNavigate } from 'react-router-dom'
import DashboardPrincipal from './components/IndustrialCommandDashboard'

export default function AppIndustrialV7() {
  const navigate = useNavigate()
  const handleNavigate = (route: string) => {
    if (route === '/fiscal') navigate('/fiscal')
    else if (route === '/cadastros' || route === '/cadastro' || route === '/cadastro-mestre') navigate('/pageprincipal')
    else if (route === '/pcp/portal-operador') navigate('/pageprincipal/pcp')
    else navigate('/pageprincipal')
  }
  return <DashboardPrincipal onNavigate={handleNavigate} />
}
