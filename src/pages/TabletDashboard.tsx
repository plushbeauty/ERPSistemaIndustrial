import { useEffect, useMemo, useState } from 'react'
import { LogOut, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import synqraLogo from '../assets/synqra/logo-synqra.png'
import { supabase } from '../lib/supabaseClient'
import '../styles/synqra-tablet.css'

type Profile = { nome: string | null; perfil: string | null }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

async function getProfile(): Promise<Profile | null> {
  const auth = await supabase.auth.getUser()
  if (auth.error) throw auth.error
  if (!auth.data.user) {
    window.location.assign('/login?returnTo=/tablet/dashboard')
    return null
  }
  const result = await supabase.from('erp_usuarios').select('nome,perfil').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
  if (result.error) throw result.error
  return result.data ? { nome: result.data.nome ?? 'Usuário', perfil: result.data.perfil ?? '' } : null
}

export default function TabletDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    void getProfile().then(value => { if (mounted) setProfile(value) }).catch(reason => {
      if (mounted) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { mounted = false }
  }, [])

  const modules = useMemo(() => {
    const term = normalize(search.trim())
    return term ? SYNQRA_MODULES.filter(module => normalize(module.label).includes(term)) : SYNQRA_MODULES
  }, [search])

  const logout = async () => {
    const result = await supabase.auth.signOut()
    if (result.error) { setError(result.error.message); return }
    window.location.assign('/login')
  }

  return <main className="synqra-tablet">
    <header className="tablet-header">
      <div className="tablet-brand"><img src={synqraLogo} alt="SYNQRA ERP & SGQ Industrial" /><div><strong>SYNQRA INDUSTRIAL</strong><span>CENTRAL DE MÓDULOS</span></div></div>
      <div className="tablet-user"><div><strong>{profile?.nome ?? 'Usuário'}</strong><span>{profile?.perfil || 'Perfil'} · {now.toLocaleDateString('pt-BR')} · {now.toLocaleTimeString('pt-BR')}</span></div><button type="button" onClick={() => void logout()}><LogOut size={14}/> SAIR</button></div>
    </header>
    <section className="tablet-bar"><div><span>TABLET OPERACIONAL</span><h1>MENU PRINCIPAL</h1></div><div className="tablet-search"><span>{modules.length}/{SYNQRA_MODULES.length}</span><label><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar módulo" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar"><X size={13}/></button>}</label></div></section>
    {error && <div className="tablet-error">{error}</div>}
    <section className="tablet-grid" aria-label="Módulos do ERP">{modules.map(({key,label,route,Icon}) => <button key={key} type="button" className="tablet-card" disabled={!route} onClick={() => route && navigate(route)}><span className="tablet-icon"><Icon size={38} strokeWidth={1.7}/></span><strong>{label}</strong></button>)}</section>
    <footer className="tablet-footer"><strong>SYNQRA</strong><span>ERP & SGQ INDUSTRIAL</span><span>{SYNQRA_MODULES.filter(m => m.route).length} MÓDULOS ATIVOS</span></footer>
  </main>
}