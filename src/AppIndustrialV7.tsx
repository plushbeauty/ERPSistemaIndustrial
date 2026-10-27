/**
 * SYSNQRA ERP INDUSTRIAL — base limpa de reconstrução.
 * Mantém o dashboard industrial aprovado e os indicadores conectados ao Supabase.
 * Todas as telas operacionais antigas foram retiradas da navegação.
 */
import { useNavigate } from 'react-router-dom'
import DashboardPrincipal from './components/IndustrialCommandDashboard'

export default function AppIndustrialV7() {
  const navigate = useNavigate()
  const handleNavigate = (route: string) => {
    // Somente a referência Fiscal aprovada permanece disponível nesta etapa.
    if (route === '/fiscal') navigate('/fiscal')
    else navigate('/erp-industrial')
  }

  return <DashboardPrincipal onNavigate={handleNavigate} />
}
