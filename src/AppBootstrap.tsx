import { Component, lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import IndustrialLoginDirect from './IndustrialLoginDirect'
import SetupADMInicial from './pages/SetupADMInicial'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'
import './styles/index.css'
import './styles/public-industrial.css'
import './styles/public-home-v2.css'
import './styles/industrial-public-restoration.css'
import './styles/visual-showcase-2026.css'

const PublicIndustrialHome = lazy(() => import('./PublicIndustrialHome'))
const AppEntryV2 = lazy(() => import('./AppEntryV2'))
const publicPaths = new Set(['/','/home','/login','/cadastro-empresa','/contato','/blog','/configuracao-adm-master','/cadastro-master','/planos','/ativar-acesso','/demo'])

class BootstrapBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return (
      <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f4f7f5',fontFamily:'Inter,system-ui,sans-serif',color:'#17342f'}}>
        <section style={{width:'min(680px,100%)',border:'1px solid #d9e3df',borderRadius:24,padding:28,background:'#fff',boxShadow:'0 30px 90px rgba(20,55,49,.12)'}}>
          <div style={{fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#9a763b'}}>SGQ ERP INDUSTRIAL • PLASTIBOR</div>
          <h1 style={{fontSize:28,margin:'10px 0 8px'}}>O ambiente encontrou uma falha ao iniciar</h1>
          <p style={{color:'#667975',lineHeight:1.7,margin:0}}>A inicialização falhou. Esta tela evita o antigo estado azul/blank e permite reiniciar o bootstrap.</p>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',marginTop:18,padding:16,borderRadius:14,background:'#f2f5f3',color:'#8a5d23',fontSize:12}}>{this.state.error.message}</pre>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}>
            <button type="button" onClick={() => location.reload()} style={{border:0,borderRadius:12,padding:'12px 18px',fontWeight:900,cursor:'pointer',background:'#0f766e',color:'#fff'}}>Recarregar ambiente</button>
            <button type="button" onClick={() => { void supabase.auth.signOut(); location.replace('/login') }} style={{border:'1px solid #d7e1dc',borderRadius:12,padding:'12px 18px',fontWeight:900,cursor:'pointer',background:'#fff',color:'#17342f'}}>Limpar sessão e entrar</button>
            <a href="/" style={{border:'1px solid #d7e1dc',borderRadius:12,padding:'12px 18px',fontWeight:900,color:'#17342f',textDecoration:'none'}}>Voltar ao site</a>
          </div>
        </section>
      </main>
    )
    return this.props.children
  }
}

function Loading({ label = 'Carregando SGQ ERP…' }: { label?: string }) {
  return <div role="status" aria-live="polite" style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif',background:'#f4f7f5',color:'#17342f'}}>
    <div style={{textAlign:'center'}}><div style={{margin:'0 auto 14px',width:34,height:34,border:'4px solid #dbe5e1',borderTopColor:'#0f766e',borderRadius:'50%',animation:'sgqspin .8s linear infinite'}}/><strong>{label}</strong></div>
    <style>{'@keyframes sgqspin{to{transform:rotate(360deg)}}'}</style>
  </div>
}

function LoginBootstrap() {
  const [ready,setReady] = useState(false)
  useEffect(() => {
    let alive = true
    if (!supabaseConfigurado) { setReady(true); return () => { alive = false } }
    void supabase.auth.getSession().finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  if (!ready) return <Loading label="Preparando acesso seguro…" />
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('returnTo') ?? ''
  if (returnTo === '/cadastro-master' || returnTo.startsWith('/cadastro-master?')) return <SetupADMInicial />
  return <IndustrialLoginDirect returnTo={returnTo || undefined} masterMode={params.get('mode') === 'master'} />
}

function AccessGate({ children }: { children: ReactNode }) {
  const [state,setState] = useState<'checking'|'allowed'|'denied'>('checking')
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (!supabaseConfigurado) throw new Error('SUPABASE_ENV_NOT_CONFIGURED')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const user = sessionData.session?.user
        if (!user) { if (alive) setState('denied'); return }
        const { data: profile, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('id,auth_user_id,empresa_id,ativo,is_master,nivel_admin,perfil,deleted_at')
          .eq('auth_user_id', user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profileError) throw profileError
        let master = false
        let empresaId = profile?.empresa_id ?? null
        if (profile?.auth_user_id === user.id) {
          master = profile?.is_master === true && Number(profile?.nivel_admin ?? 0) >= 100 && String(profile?.perfil ?? '').trim().toUpperCase() === 'MASTER' && profile?.empresa_id === null
        } else {
          const { data: global, error: globalError } = await supabase.from('usuarios').select('id,auth_user_id,ativo,nivel_admin,perfil,empresa_id').eq('auth_user_id', user.id).eq('ativo', true).maybeSingle()
          if (globalError) throw globalError
          const globalRole = String(global?.perfil ?? '').trim().toUpperCase()
          master = Boolean(global?.auth_user_id) && Number(global?.nivel_admin ?? 0) >= 100 && ['SUPER_ADMIN','MASTER','MASTER_ADMIN'].includes(globalRole) && global?.empresa_id === null
          empresaId = global?.empresa_id ?? null
        }
        if (!profile?.auth_user_id && !master) { if (alive) setState('denied'); return }
        if (!master && !empresaId) { if (alive) setState('denied'); return }
        if (!master) {
          const { data: empresa, error: empresaError } = await supabase.from('erp_empresas').select('id,ativo').eq('id', empresaId).eq('ativo', true).maybeSingle()
          if (empresaError) throw empresaError
          if (!empresa?.ativo) { if (alive) setState('denied'); return }
        }
        if (alive) setState('allowed')
      } catch (error) {
        console.error('[Protected route bootstrap]', error)
        if (alive) setState('denied')
      }
    })()
    return () => { alive = false }
  }, [])
  if (state === 'checking') return <Loading label="Validando empresa, perfil e permissões…" />
  if (state === 'denied') {
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    return <Loading label="Redirecionando para o login…" />
  }
  return <>{children}</>
}

export default function AppBootstrap() {
  const path = window.location.pathname
  if (path === '/login') return <BootstrapBoundary><LoginBootstrap /></BootstrapBoundary>
  if (path === '/' || path === '/home') return <BootstrapBoundary><Suspense fallback={<Loading label="Abrindo SGQ ERP Industrial…" />}><PublicIndustrialHome /></Suspense></BootstrapBoundary>
  const app = <BootstrapBoundary><Suspense fallback={<Loading />}><AppEntryV2 /></Suspense></BootstrapBoundary>
  const isPublic = publicPaths.has(path) || path.startsWith('/demo/') || path.startsWith('/modulos/')
  return isPublic ? app : <AccessGate>{app}</AccessGate>
}
