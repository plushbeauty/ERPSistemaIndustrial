import { ArrowLeft, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import CompactButton from '../ui/CompactButton'

type Operator = { name: string; email: string }
type ModuleInfo = { label: string; route: string }

function moduleInfo(pathname: string): ModuleInfo {
  if (pathname.startsWith('/vendas')) return { label: 'MENU VENDAS', route: '/vendas' }
  if (pathname.startsWith('/fiscal')) return { label: 'MENU FISCAL', route: '/fiscal' }
  if (pathname.startsWith('/estoque')) return { label: 'MENU ESTOQUE', route: '/estoque' }
  if (pathname.startsWith('/qualidade') || pathname.startsWith('/sgq')) return { label: 'MENU QUALIDADE', route: '/qualidade' }
  if (pathname.startsWith('/pcp')) return { label: 'MENU PCP', route: '/pcp' }
  if (pathname.startsWith('/compras')) return { label: 'MENU COMPRAS', route: '/compras' }
  if (pathname.startsWith('/financeiro')) return { label: 'MENU FINANCEIRO', route: '/financeiro' }
  if (pathname.startsWith('/rh')) return { label: 'MENU RH', route: '/rh' }
  return { label: 'MENU PRINCIPAL', route: '/erp-industrial' }
}

export default function ERPHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [operator, setOperator] = useState<Operator>({ name: 'Operador autenticado', email: '' })
  const [now, setNow] = useState(() => new Date())
  const menu = moduleInfo(pathname)

  useEffect(() => {
    let alive = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return
      const metadata = data.user.user_metadata
      const name = typeof metadata?.nome === 'string' && metadata.nome.trim() ? metadata.nome.trim() : 'Operador autenticado'
      setOperator({ name, email: data.user.email ?? '' })
    })
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)
  const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(now)

  return <header className="synqra-workspace-header h-[48px] min-h-[48px]">
    <button type="button" className="synqra-workspace-brand" onClick={() => navigate('/tablet/dashboard')} title="Centro de comando">
      <img src="/logo/sgq-erp.png" alt="Synqra ERP Industrial" />
      <span><strong>SYNQRA ERP INDUSTRIAL</strong><small>ERP INDUSTRIAL • CENTRAL DE CONTROLE</small></span>
    </button>
    <button type="button" className="synqra-master-menu" onClick={() => navigate(menu.route)} title={menu.label}>{menu.label}</button>
    <div className="flex min-w-0 items-center gap-2">
      <div className="text-right">
        <strong className="block truncate text-[11px]">{operator.name}</strong>
        <span className="block text-[9px] text-slate-500">{operator.email || 'Sessão autenticada'} • {date} • {time}</span>
      </div>
      <CompactButton type="button" onClick={() => navigate(-1)} title="Voltar"><ArrowLeft size={13} /> VOLTAR</CompactButton>
      <CompactButton type="button" tone="orange" onClick={() => void logout()} title="Sair"><LogOut size={13} /> SAIR</CompactButton>
    </div>
  </header>
}