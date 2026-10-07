import { useEffect, useMemo, useState } from 'react'
import { LogOut, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import synqraLogo from '../assets/synqra/logo-synqra.png'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')

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
  const [now, setNow] = useState(new Date())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    void loadProfile()
      .then(value => { if (alive) setProfile(value) })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => { alive = false }
  }, [])

  const filteredModules = useMemo(() => {
    const term = normalize(search.trim())
    return term ? SYNQRA_MODULES.filter(module => normalize(module.label).includes(term)) : SYNQRA_MODULES
  }, [search])

  const logout = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        setError(signOutError.message)
        return
      }
      window.location.href = '/login'
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return (
    <main className={`synqra-tablet${error ? ' has-error' : ''}`}>
      <header className="synqra-tablet-header">
        <div className="synqra-brand">
          <img src={synqraLogo} alt="SYNQRA ERP & SGQ Industrial" />
          <div className="synqra-brand-copy">
            <strong>ERP & SGQ INDUSTRIAL</strong>
            <span>MAIS CONTROLE<br />PARA O SEU RESULTADO</span>
          </div>
        </div>
        <button type="button" className="synqra-master-menu" onClick={() => navigate('/tablet/dashboard')} title="Menu principal">
          MENU TABLET
        </button>
        <div className="synqra-session">
          <div className="synqra-session-text">
            <strong>{profile?.nome ?? 'Usuário'}</strong>
            <span>{profile?.perfil || 'Perfil'}</span>
            <time>{now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}</time>
          </div>
          <button type="button" className="synqra-logout" onClick={() => void logout()}>
            <LogOut size={15} aria-hidden="true" /> SAIR
          </button>
        </div>
      </header>

      <style>{`
.synqra-master-menu{justify-self:center;height:32px;padding:0 18px;border:1px solid #ea580c;border-radius:2px;background:#ea580c;color:#fff;font-size:15px;font-weight:900;line-height:32px;text-transform:uppercase;letter-spacing:.02em;cursor:pointer}
.synqra-master-menu:hover{background:#c2410c;border-color:#c2410c}
`}</style>

      <section className="synqra-tablet-toolbar">
        <div>
          <span className="synqra-eyebrow">CENTRO DE COMANDO</span>
          <h1>TABLET OPERACIONAL</h1>
        </div>
        <label className="synqra-search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo" aria-label="Pesquisar módulo" />
          {search && (
            <button type="button" aria-label="Limpar pesquisa" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </label>
      </section>

      {error && <div className="synqra-tablet-error" role="alert">{error}</div>}

      <section className="synqra-module-grid" aria-label="Módulos do ERP">
        {filteredModules.map(({ key, label, route, Icon }) => {
          const available = Boolean(route)
          return (
            <button
              key={key}
              type="button"
              className="synqra-module-card"
              disabled={!available}
              title={available ? label : 'Módulo sem rota operacional cadastrada'}
              onClick={() => route && navigate(route)}
            >
              <span className="synqra-module-icon" aria-hidden="true">
                <Icon size={52} strokeWidth={1.8} />
              </span>
              <span className="synqra-module-label">{label}</span>
              {!available && <span className="synqra-module-status">EM IMPLANTAÇÃO</span>}
            </button>
          )
        })}
      </section>

      <footer className="synqra-tablet-footer">
        <span>SYNQRA</span>
        <span>ERP & SGQ INDUSTRIAL</span>
        <span>{SYNQRA_MODULES.filter(module => module.route).length} módulos com rota operacional</span>
        <span>{SYNQRA_MODULES.filter(module => !module.route).length} módulos a implementar</span>
        <span className="synqra-footer-slashes" aria-hidden="true"><i /><i /><i /></span>
      </footer>
    </main>
  )
}
