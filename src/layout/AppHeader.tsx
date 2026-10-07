import { useEffect, useState } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabaseClient'

type Profile = {
  nome: string | null
  empresa_id: string | null
}

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [empresaNome, setEmpresaNome] = useState('Empresa industrial')
  const [clock, setClock] = useState(() => new Date())
  const [error, setError] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) return
        const result = await supabase
          .from('erp_usuarios')
          .select('nome,empresa_id,auth_user_id,ativo,deleted_at,is_master,nivel_admin,perfil')
          .eq('auth_user_id', auth.data.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (result.error) throw result.error
        if (!result.data || !alive) return
        setProfile({ nome: result.data.nome ?? 'Usuário', empresa_id: result.data.empresa_id ?? null })
        if (result.data.empresa_id) {
          const company = await supabase
            .from('erp_empresas')
            .select('nome_fantasia,razao_social')
            .eq('id', result.data.empresa_id)
            .eq('ativo', true)
            .maybeSingle()
          if (!company.error && alive) {
            setEmpresaNome(String(company.data?.nome_fantasia ?? company.data?.razao_social ?? 'Empresa industrial'))
          }
        } else if (
          result.data.is_master === true &&
          Number(result.data.nivel_admin ?? 0) >= 100 &&
          String(result.data.perfil ?? '').trim().toUpperCase() === 'MASTER'
        ) {
          setEmpresaNome('Visão Master do Ecossistema')
        }
      } catch (reason: unknown) {
        if (alive) setError(reason instanceof Error ? reason.message : String(reason))
      }
    })()
    return () => { alive = false }
  }, [])

  const logout = async () => {
    const result = await supabase.auth.signOut()
    if (result.error) {
      setError(result.error.message)
      return
    }
    window.location.href = '/login'
  }

  const goTablet = () => navigate('/tablet/dashboard')

  return (
    <header className="synqra-app-header" aria-label="Barra superior padrão do ERP">
      <div className="synqra-header-brand">
        <button
          type="button"
          className="synqra-header-menu synqra-header-menu-desktop"
          onClick={toggleSidebar}
          aria-label={isExpanded ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
        >
          {isExpanded ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>
        <button
          type="button"
          className="synqra-header-menu synqra-header-menu-mobile"
          onClick={toggleMobileSidebar}
          aria-label={isMobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          aria-expanded={isMobileOpen}
        >
          <Menu size={20} />
        </button>
        <div className="synqra-header-logo">
          <img src="/logo/sgq-erp.png" alt="SGQERP Industrial" />
        </div>
        <div className="synqra-header-title">
          <strong>SGQERP INDUSTRIAL</strong>
          <span>CENTRAL DE CONTROLE</span>
          <small>{empresaNome}</small>
        </div>
      </div>

      <div className="synqra-header-actions">
        <button type="button" className="synqra-header-tablet" onClick={goTablet} aria-label="Abrir Tablet operacional">
          MÓDULOS TABLET
        </button>
        <div className="synqra-header-user">
          <span>OPERADOR</span>
          <strong>{profile?.nome ?? 'Usuário'}</strong>
        </div>
        <div className="synqra-header-date">
          <strong>{clock.toLocaleDateString('pt-BR')}</strong>
          <span>{clock.toLocaleTimeString('pt-BR')}</span>
        </div>
        <span className="synqra-header-data">DADOS: SUPABASE</span>
        <button type="button" className="synqra-header-exit" onClick={() => void logout()}>SAIR</button>
      </div>
      {error && <span className="synqra-header-error" role="alert">{error}</span>}
      <span className="synqra-header-route" aria-hidden="true">{location.pathname}</span>
      <button type="button" className="synqra-header-mobile-close" onClick={closeMobileSidebar} aria-hidden="true" tabIndex={-1} />
    </header>
  )
}
