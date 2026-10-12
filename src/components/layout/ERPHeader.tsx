import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import CompactButton from '../ui/CompactButton'

type Operator = { name: string; email: string }

export default function ERPHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const isQuality = location.pathname.startsWith('/qualidade') || location.pathname.startsWith('/sgq')
  const [operator, setOperator] = useState<Operator>({ name: 'Operador autenticado', email: '' })
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

      const name = typeof metadata?.nome === 'string' && metadata.nome.trim()
        ? metadata.nome.trim()
        : 'Operador autenticado'
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
    <header className="synqra-workspace-header h-[48px] min-h-[48px]">
      <button
        type="button"
        className="synqra-workspace-brand"
        onClick={() => navigate('/erp-industrial')}
        title="Central do ERP"
      >
        <img src="/logo/sgq-erp.png" alt="SGQERP Industrial" />
        <span>
          <strong>SGQERP INDUSTRIAL</strong>
          <small>Central de controle</small>
        </span>
      </button>

      <div className="synqra-header-title">{isQuality ? <button type="button" onClick={() => navigate('/qualidade/tablet')} className="inline-flex h-[30px] items-center gap-2 border border-[#24789D] bg-gradient-to-r from-[#17445A] to-[#2D8DB8] px-4 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:brightness-110">☰ Gestão da Qualidade <span aria-hidden="true">⌄</span></button> : <><strong>Sistema ERP industrial</strong><small>{companyName}</small></>}</div>

      <div className="synqra-session">
        <div>
          <strong>{operator.name}</strong>
          <span>{operator.email || 'Sessão autenticada'} • {date} • {time}</span>
        </div>
        <CompactButton type="button" tone="danger" onClick={() => void logout()} title="Sair">
          <LogOut size={13} />
          Sair
        </CompactButton>
      </div>
    </header>
  )
}
