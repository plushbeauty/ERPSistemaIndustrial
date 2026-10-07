import { useEffect, useMemo, useState } from 'react'
import { LogOut, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import synqraLogo from '../assets/synqra/logo-synqra.png'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

async function loadProfile(): Promise<Profile | null> {
  const auth = await supabase.auth.getUser()
  if (auth.error) throw auth.error
  if (!auth.data.user) {
    window.location.href = '/login?returnTo=/tablet/dashboard'
    return null
  }
  const result = await supabase
    .from('erp_usuarios')
    .select('nome,perfil')
    .eq('auth_user_id', auth.data.user.id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (result.error) throw result.error
  return result.data ? { nome: result.data.nome ?? 'Usuário', perfil: result.data.perfil ?? '' } : null
}

export default function TabletDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    void loadProfile().then(value => {
      if (alive) setProfile(value)
    }).catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { alive = false }
  }, [])

  const modules = useMemo(() => {
    const term = normalize(search.trim())
    return term ? SYNQRA_MODULES.filter(module => normalize(module.label).includes(term)) : SYNQRA_MODULES
  }, [search])

  const logout = async () => {
    const result = await supabase.auth.signOut()
    if (result.error) {
      setError(result.error.message)
      return
    }
    window.location.href = '/login'
  }

  return (
    <main className="synqra-tablet">
      <header className="synqra-tablet-header">
        <div className="synqra-brand">
          <img src={synqraLogo} alt="SYNQRA ERP & SGQ Industrial" />
          <div className="synqra-brand-copy">
            <strong>SGQERP INDUSTRIAL</strong>
            <span>CENTRAL DE CONTROLE</span>
          </div>
        </div>

        <button type="button" className="synqra-master-menu" onClick={() => navigate('/vendas/tablet')} title="Abrir menu de Vendas">
          MENU VENDAS
        </button>

        <div className="synqra-session">
          <div className="synqra-session-text">
            <strong>{profile?.nome ?? 'Usuário'}</strong>
            <span>{profile?.perfil || 'Perfil'}</span>
            <time>{now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}</time>
          </div>
          <button type="button" className="synqra-logout" onClick={() => void logout()}>
            <LogOut size={14} aria-hidden="true" /> SAIR
          </button>
        </div>
      </header>

      <section className="synqra-tablet-toolbar">
        <div className="synqra-toolbar-title">
          <span>CENTRO DE COMANDO</span>
          <strong>TABLET OPERACIONAL</strong>
        </div>
        <label className="synqra-search">
          <Search size={15} aria-hidden="true" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo" aria-label="Pesquisar módulo" />
          {search && <button type="button" aria-label="Limpar pesquisa" onClick={() => setSearch('')}><X size={13} /></button>}
        </label>
      </section>

      {error && <div className="synqra-tablet-error" role="alert">{error}</div>}

      <section className="synqra-module-grid" aria-label="Módulos do ERP">
        {modules.map(({ key, label, route, Icon }) => (
          <button
            key={key}
            type="button"
            className="synqra-module-card"
            disabled={!route}
            title={route ? label : 'Módulo sem rota operacional cadastrada'}
            onClick={() => route && navigate(route)}
          >
            <span className="synqra-module-icon" aria-hidden="true"><Icon size={52} strokeWidth={1.8} /></span>
            <span className="synqra-module-label">{label}</span>
          </button>
        ))}
      </section>

      <footer className="synqra-tablet-footer">
        <span>SYNQRA</span>
        <span>ERP & SGQ INDUSTRIAL</span>
        <span>{SYNQRA_MODULES.filter(module => module.route).length} módulos com rota operacional</span>
        <span>{SYNQRA_MODULES.filter(module => !module.route).length} módulos sem rota</span>
        <span className="synqra-footer-slashes" aria-hidden="true"><i /><i /><i /></span>
      </footer>
    </main>
  )
}
