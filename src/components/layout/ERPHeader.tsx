import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import CompactButton from '../ui/CompactButton'

type Operator = { name: string; email: string }

export default function ERPHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const pageTitle = location.pathname === '/fiscal/emissao' ? 'EMISSÃO DE NF-e'
    : location.pathname === '/compras/pedido' ? 'PEDIDO DE COMPRA'
    : location.pathname.startsWith('/compras') ? 'COMPRAS'
    : location.pathname.startsWith('/qualidade') || location.pathname.startsWith('/sgq') ? (location.pathname === '/qualidade/tablet' ? 'QUALIDADE TABLET' : 'QUALIDADE')
    : location.pathname.startsWith('/pcp') ? (location.pathname === '/pcp/tablet' ? 'PCP TABLET' : 'PCP')
    : location.pathname.startsWith('/vendas/novo-pedido') ? 'NOVO PEDIDO DE VENDA'
    : location.pathname.startsWith('/vendas') ? 'VENDAS'
    : location.pathname.startsWith('/fiscal') ? 'FISCAL'
    : location.pathname.startsWith('/estoque') ? 'ESTOQUE'
    : location.pathname.startsWith('/financeiro') ? 'FINANCEIRO'
    : location.pathname.startsWith('/engenharia') ? 'ENGENHARIA'
    : location.pathname.startsWith('/manutencao') ? 'MANUTENÇÃO'
    : location.pathname.split('/').filter(Boolean).slice(-1)[0]?.replaceAll('-', ' ').toLocaleUpperCase('pt-BR') || 'CENTRAL DO ERP'
  const [operator, setOperator] = useState<Operator>({ name: 'Carregando usuário...', email: '' })
  const [now, setNow] = useState(() => new Date())
  const [companyName, setCompanyName] = useState('Empresa não identificada')

  useEffect(() => {
    let alive = true

    async function loadSessionHeader() {
      const { data, error } = await supabase.auth.getUser()
      if (error || !alive || !data.user) return

      const metadata = data.user.user_metadata
      const profile = await supabase
        .from('erp_usuarios')
        .select('empresa_id')
        .eq('auth_user_id', data.user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (profile.data?.empresa_id) {
        const company = await supabase
          .from('erp_empresas')
          .select('nome_fantasia,razao_social')
          .eq('id', profile.data.empresa_id)
          .maybeSingle()

        if (alive && !company.error && company.data) {
          const row = company.data as { nome_fantasia?: string | null; razao_social?: string | null }
          setCompanyName(row.nome_fantasia || row.razao_social || 'Empresa')
        }
      }

      const metadataName = [metadata?.nome, metadata?.name, metadata?.full_name].find(value => typeof value === 'string' && value.trim())
      const name = typeof metadataName === 'string' ? metadataName.trim() : data.user.email || 'Usuário autenticado'
      if (alive) setOperator({ name, email: data.user.email ?? '' })
    }

    void loadSessionHeader()
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)
  const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(now)

  return (
    <header className="synqra-workspace-header">
      <button
        type="button"
        className="synqra-workspace-brand"
        onClick={() => navigate('/erp-industrial')}
        title="Central do ERP"
      >
        <img src="/logo/sgq-erp.png" alt="Logotipo SGQERP Industrial" />
        <span>
          <strong>SGQERP INDUSTRIAL</strong>
        </span>
      </button>

      <div className="synqra-header-title" aria-label="Módulo atual"><strong>{pageTitle}</strong></div>

      <div className="synqra-session">
        <div>
          <strong>{operator.name}</strong>
          <span>{operator.email || 'Sessão autenticada'} • {companyName} • {date} • {time}</span>
        </div>
        <CompactButton type="button" tone="danger" onClick={() => void logout()} title="Sair">
          <LogOut size={13} />
          Sair
        </CompactButton>
      </div>
    </header>
  )
}
