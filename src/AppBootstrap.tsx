import { Component, lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import PublicIndustrialHome from './PublicIndustrialHome'
import IndustrialVisualShowcase from './components/IndustrialVisualShowcase'
import IndustrialLoginDirect from './IndustrialLoginDirect'
import { supabase } from './lib/supabaseClient'
import './styles/index.css'
import './styles/public-industrial.css'
import './styles/public-home-v2.css'
import './styles/industrial-public-restoration.css'
import './styles/visual-showcase-2026.css'

const AppEntryV2 = lazy(() => import('./AppEntryV2'))
const publicPaths = new Set(['/','/home','/login','/cadastro-empresa','/contato','/blog'])

class BootstrapBoundary extends Component<{children:ReactNode},{error:Error|null}>{
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  render(){
    if(this.state.error)return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f4f7f5',fontFamily:'Inter,system-ui,sans-serif',color:'#17342f'}}><section style={{width:'min(680px,100%)',border:'1px solid #d9e3df',borderRadius:24,padding:28,background:'#fff',boxShadow:'0 30px 90px rgba(20,55,49,.12)'}}><div style={{fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#9a763b'}}>SGQ ERP INDUSTRIAL</div><h1 style={{fontSize:28,margin:'10px 0 8px'}}>O ambiente encontrou uma falha ao iniciar</h1><p style={{color:'#667975',lineHeight:1.7,margin:0}}>A inicialização falhou. Esta tela de recuperação evita o antigo estado azul/blank e permite reiniciar o bootstrap.</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',marginTop:18,padding:16,borderRadius:14,background:'#f2f5f3',color:'#8a5d23',fontSize:12}}>{this.state.error.message}</pre><div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}><button type="button" onClick={()=>location.reload()} style={{border:0,borderRadius:12,padding:'12px 18px',fontWeight:900,cursor:'pointer',background:'#0f766e',color:'#fff'}}>Recarregar ambiente</button><button type="button" onClick={()=>{void supabase.auth.signOut();location.replace('/login')}} style={{border:'1px solid #d7e1dc',borderRadius:12,padding:'12px 18px',fontWeight:900,cursor:'pointer',background:'#fff',color:'#17342f'}}>Limpar sessão e entrar</button><a href="/" style={{border:'1px solid #d7e1dc',borderRadius:12,padding:'12px 18px',fontWeight:900,color:'#17342f',textDecoration:'none'}}>Voltar ao site</a></div></section></main>
    return this.props.children
  }
}

function LoginBootstrap(){
  const[ready,setReady]=useState(false)
  useEffect(()=>{let alive=true;void supabase.auth.getSession().finally(()=>{if(alive)setReady(true)});return()=>{alive=false}},[])
  if(!ready)return <div role="status" aria-live="polite" style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif',background:'#f5f7f6',color:'#172126'}}>Preparando acesso seguro…</div>
  const params=new URLSearchParams(window.location.search)
  return <IndustrialLoginDirect returnTo={params.get('returnTo') ?? undefined}/>
}

function AccessGate({children}:{children:ReactNode}){
  const[state,setState]=useState<'checking'|'allowed'|'denied'>('checking')
  useEffect(()=>{let alive=true;void(async()=>{try{const{data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session?.user){if(alive)setState('denied');return}const metadata=data.session.user.app_metadata??{};const empresaId=typeof metadata.empresa_id==='string'?metadata.empresa_id.trim():'';const role=typeof metadata.role==='string'?metadata.role.trim():'';if(!empresaId&&!['MASTER','MASTER_ADMIN','SUPER_ADMIN'].includes(role.toUpperCase())){if(alive)setState('denied');return}if(alive)setState('allowed')}catch(error){console.error('[Protected route bootstrap]',error);if(alive)setState('denied')}})();return()=>{alive=false}},[])
  if(state==='checking')return <div role="status" aria-live="polite" style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'}}>Validando acesso…</div>
  if(state==='denied'){const returnTo=`${window.location.pathname}${window.location.search}`;window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);return <div role="status" aria-live="polite" style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Redirecionando para o login…</div>}
  return <>{children}</>
}

export default function AppBootstrap(){
  const path=window.location.pathname
  if(path==='/login')return <BootstrapBoundary><LoginBootstrap/></BootstrapBoundary>
  if(path==='/'||path==='/home')return <BootstrapBoundary><main aria-label="SGQ ERP Industrial"><PublicIndustrialHome/><IndustrialVisualShowcase/></main></BootstrapBoundary>
  const app=<BootstrapBoundary><Suspense fallback={<div role="status" aria-live="polite" style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'}}>Carregando SGQ ERP…</div>}><AppEntryV2/></Suspense></BootstrapBoundary>
  const isPublic=publicPaths.has(path)||path.startsWith('/modulos/')
  return isPublic?app:<AccessGate>{app}</AccessGate>
}
