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
