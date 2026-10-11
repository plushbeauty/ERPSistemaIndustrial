import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import CompactButton from '../ui/CompactButton'

type Operator = { name: string; email: string }
type Company = { nome: string | null }

export default function ERPHeader() {
  const navigate = useNavigate()
  const [operator, setOperator] = useState<Operator>({ name: 'Operador autenticado', email: '' })
  const [now, setNow] = useState(() => new Date())
  const [companyName, setCompanyName] = useState('Empresa não identificada')

  useEffect(() => {
    let alive = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return
      const metadata = data.user.user_metadata
      const profile = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', data.user.id).is('deleted_at', null).maybeSingle()
      if (profile.data?.empresa_id) {
        const company = await supabase.from('erp_empresas').select('nome').eq('id', profile.data.empresa_id).maybeSingle()
        if (alive && !company.error && company.data?.nome) setCompanyName((company.data as Company).nome ?? 'Empresa')
      }
      const name = typeof metadata?.nome === 'string' && metadata.nome.trim()
        ? metadata.nome.trim()
        : 'Operador autenticado'
      setOperator({ name, email: data.user.email ?? '' })
    })
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

      <div className="synqra-header-title"><strong>Sistema ERP industrial</strong><small>{companyName}</small></div>

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
