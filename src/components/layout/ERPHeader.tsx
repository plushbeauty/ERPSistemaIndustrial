import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import CompactButton from '../ui/CompactButton'

type Operator = { name: string; email: string }

export default function ERPHeader() {
  const navigate = useNavigate()
  const [operator, setOperator] = useState<Operator>({ name: 'Operador autenticado', email: '' })
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let alive = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return
      const metadata = data.user.user_metadata
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

      <div className="synqra-header-title">Sistema ERP industrial</div>

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
