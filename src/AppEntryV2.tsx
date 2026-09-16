import { Component, FormEvent, ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight, KeyRound, LogIn, UserPlus, Clock3 } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import './styles/public-contact.css'
import './styles/visual-showcase-2026.css'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

const AppIndustrial=lazy(()=>import('./AppIndustrialV7'))
const PublicIndustrialHome=lazy(()=>import('./PublicIndustrialHome'))
const IndustrialVisualShowcase=lazy(()=>import('./components/IndustrialVisualShowcase'))
const Blog=lazy(()=>import('./pages/Blog'))
const Contato=lazy(()=>import('./pages/Contato'))
const Fiscal=lazy(()=>import('./pages/Fiscal'))
const FiscalPrevisaoCaixa=lazy(()=>import('./pages/FiscalPrevisaoCaixa'))
const Master=lazy(()=>import('./pages/Master'))
const PCPIndustrial=lazy(()=>import('./pages/PCPIndustrial'))
const QualidadeIndustrial=lazy(()=>import('./pages/QualidadeIndustrial'))
const OperacaoIndustrial=lazy(()=>import('./pages/OperacaoIndustrial'))
const ProdutosVendasIndustrial=lazy(()=>import('./pages/ProdutosVendasIndustrial'))
const CadastroEmpresa=lazy(()=>import('./pages/CadastroEmpresa'))
const SolicitacaoCompra=lazy(()=>import('./pages/SolicitacaoCompra'))
const TesteERP=lazy(()=>import('./pages/TesteERP'))
const UsuariosAdmin=lazy(()=>import('./pages/UsuariosAdmin'))
const DocumentosQualidadeControle=lazy(()=>import('./pages/DocumentosQualidadeControle'))
const RecebimentoMateriais=lazy(()=>import('./pages/RecebimentoMateriais'))
const ManualUsuario=lazy(()=>import('./pages/ManualUsuario'))
const ModuleOverviewIndustrial=lazy(()=>import('./pages/ModuleOverviewIndustrial'))

type AccessResult={ok:boolean;master:boolean;reason:string}

class Boundary extends Component<{children:ReactNode},{error:Error|null}>{
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  render(){
    if(this.state.error)return <div className="error-screen"><div className="error-screen-card"><strong>Erro ao abrir a tela.</strong><p>{this.state.error.message}</p><button className="primary" type="button" onClick={()=>location.reload()}>Recarregar</button></div></div>
    return this.props.children
  }
}

function LoadingSkeleton({label='Carregando SGQ ERP…'}:{label?:string}){
  return <div className="loading-screen"><div className="loading-skeleton-card"><div className="loading-skeleton-brand"/><div className="loading-skeleton-line wide"/><div className="loading-skeleton-line"/><div className="loading-skeleton-line short"/><span>{label}</span></div></div>
}

function lazyFallback(){return <LoadingSkeleton/>}

function profileFromSession(session:Session|null){
  const metadata=session?.user?.app_metadata
  const empresaId=typeof metadata?.empresa_id==='string'?metadata.empresa_id.trim():''
  const role=typeof metadata?.role==='string'?metadata.role.trim():''
  return {empresaId,role}
}

async function validarAcessoERP(session:Session|null):Promise<AccessResult>{
  if(!session?.user)return{ok:false,master:false,reason:'Sessão de autenticação inválida.'}
  const {empresaId,role}=profileFromSession(session)
  if(!empresaId)return{ok:false,master:false,reason:'A sessão não contém a empresa autenticada.'}
  if(!role)return{ok:false,master:false,reason:'A sessão não contém a role autenticada.'}
  const normalizedRole=role.toUpperCase()
  return{ok:true,master:normalizedRole==='MASTER'||normalizedRole==='MASTER_ADMIN'||normalizedRole==='SUPER_ADMIN',reason:''}
}

function safeReturnTo(value:string|null){if(!value||!value.startsWith('/')||value.startsWith('//')||value.startsWith('/login'))return'/erp-industrial';return value}
function requestedTarget(){return safeReturnTo(new URLSearchParams(location.search).get('returnTo'))}

function Login(){
  const[usuario,setUsuario]=useState(''),[pw,setPw]=useState(''),[err,setErr]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)

  async function submit(e:FormEvent){
    e.preventDefault();setErr('');setNotice('');setBusy(true)
    try{
      if(!supabaseConfigurado)throw new Error('A conexão do sistema com o banco não está configurada.')
      if(!usuario.trim()||!pw)throw new Error('Informe usuário/e-mail e senha.')
      const{data,error}=await supabase.functions.invoke('erp-login',{body:{email:usuario.trim(),password:pw}})
      if(error)throw error
      if(!data?.session?.access_token||!data?.session?.refresh_token||!data?.profile)throw new Error(data?.error||'O serviço de autenticação não retornou uma sessão válida.')
      const{error:sessionError}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token})
      if(sessionError)throw sessionError
      const{data:authUser,error:authError}=await supabase.auth.getUser()
      if(authError||!authUser.user)throw authError??new Error('Sessão autenticada sem usuário válido.')
      const{data:sessionData,error:sessionReadError}=await supabase.auth.getSession()
      if(sessionReadError||!sessionData.session)throw sessionReadError??new Error('Sessão não disponível após autenticação.')
      const access=await validarAcessoERP(sessionData.session)
      if(!access.ok){await supabase.auth.signOut();throw new Error(access.reason)}
      if(authUser.user.id!==data.profile.id)throw new Error('O perfil retornado não corresponde ao usuário autenticado.')
      if(sessionData.session.user.app_metadata?.empresa_id!==data.profile.empresa_id)throw new Error('A empresa da sessão não corresponde ao perfil autenticado.')
      if(sessionData.session.user.app_metadata?.role!==data.profile.role)throw new Error('A role da sessão não corresponde ao perfil autenticado.')
      location.replace(requestedTarget())
    }catch(e){setErr(e instanceof Error?e.message:'Não foi possível entrar no sistema.')}
    finally{setBusy(false)}
  }

  return <main className="auth-screen">
    <section className="auth-visual" aria-label="SGQ ERP Industrial">
      <img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP Industrial"/><div className="auth-visual-shade"/>
      <div className="auth-visual-content">
        <a href="/" className="auth-visual-logo"><img src="/logo-industrial.svg" alt="SGQ ERP"/></a>
        <div className="auth-visual-message"><span>SGQ ERP • GESTÃO INDUSTRIAL</span><h2>Uma fábrica inteira. Um único controle.</h2><p>PCP, produção, qualidade, estoque, manutenção, financeiro e fiscal trabalhando sobre os mesmos dados.</p><div className="auth-trust"><b>✓ Multiempresa</b><b>✓ Rastreabilidade</b><b>✓ Controle de acesso</b></div></div>
        <small>FernandoSch_System</small>
      </div>
    </section>
    <section className="auth-panel"><div className="auth-panel-inner">
      <div className="auth-mobile-brand"><a href="/"><img src="/logo-industrial.svg" alt="SGQ ERP"/></a></div>
      <span className="auth-overline">ACESSO SEGURO</span><h1>Entrar no SGQ ERP</h1>
      <p className="auth-description">Informe seu e-mail e sua senha. A empresa e as permissões são identificadas automaticamente pelo vínculo autenticado no ERP.</p>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="erp-user">E-mail</label><div className="auth-input-wrap"><input id="erp-user" type="email" value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="seu@email.com" autoComplete="username" autoFocus required/></div>
        <label htmlFor="erp-password">Senha</label><div className="auth-input-wrap"><input id="erp-password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required/><KeyRound size={17} aria-hidden="true"/></div>
        {err&&<div className="auth-message auth-error" role="alert">{err}</div>}{notice&&<div className="auth-message auth-notice" role="status">{notice}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy?'Entrando…':'Entrar'} <LogIn size={18}/></button>
        <div className="auth-divider"><span>ou</span></div><a className="auth-register" href="/cadastro-empresa"><UserPlus size={18}/> Criar uma nova empresa</a><a className="auth-trial" href="/cadastro-empresa"><Clock3 size={17}/> Começar teste grátis de 15 dias <ArrowRight size={16}/></a>
      </form>
      <div className="auth-footer"><a href="/">Voltar para o site</a><span>•</span><a href="/contato">Fale conosco</a></div>
    </div></section>
  </main>
}

function ERP(){
  const[valid,setValid]=useState<boolean|null>(null)
  useEffect(()=>{let alive=true;void(async()=>{try{const{data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session){if(alive)setValid(false);return}const access=await validarAcessoERP(data.session);if(!alive)return;if(!access.ok){await supabase.auth.signOut();location.replace('/login');return}setValid(true)}catch(error){console.error('[ERP access]',error);if(alive){setValid(false);location.replace('/login')}}})();return()=>{alive=false}},[])
  if(valid===null)return <LoadingSkeleton label="Validando acesso…"/>;if(valid===false)return <Login/>;return <Suspense fallback={<LoadingSkeleton/>}><AppIndustrial/></Suspense>
}

function Protected({children,masterOnly=false}:{children:ReactNode;masterOnly?:boolean}){
  const[state,setState]=useState<'checking'|'allowed'|'denied'>('checking')
  useEffect(()=>{let alive=true;void(async()=>{try{const{data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session){if(alive)setState('denied');return}const access=await validarAcessoERP(data.session);if(!alive)return;if(!access.ok||(masterOnly&&!access.master)){setState('denied');return}setState('allowed')}catch(error){console.error('[Protected]',error);if(alive)setState('denied')}})();return()=>{alive=false}},[masterOnly])
  if(state==='checking')return <LoadingSkeleton label="Validando permissões…"/>;if(state==='denied'){const target=encodeURIComponent(location.pathname+location.search);return <LoginRedirect target={target}/>};return <Boundary>{children}</Boundary>
}

function LoginRedirect({target}:{target:string}){useEffect(()=>{const safe=safeReturnTo(decodeURIComponent(target));if(location.pathname!=='/login')location.replace(`/login?returnTo=${encodeURIComponent(safe)}`)},[target]);return <LoadingSkeleton label="Redirecionando para o login…"/>}

const overviewRoutes:Record<string,ReactNode>={
  '/modulos/pcp':<ModuleOverviewIndustrial module="pcp"/>,
  '/modulos/estoque':<ModuleOverviewIndustrial module="estoque"/>,
  '/modulos/recebimento':<ModuleOverviewIndustrial module="recebimento"/>,
  '/modulos/qualidade':<ModuleOverviewIndustrial module="qualidade"/>,
  '/modulos/manutencao':<ModuleOverviewIndustrial module="manutencao"/>,
  '/modulos/fiscal':<ModuleOverviewIndustrial module="fiscal"/>,
  '/modulos/indicadores':<ModuleOverviewIndustrial module="indicadores"/>
}

export default function AppEntryV2(){
  const[path,setPath]=useState(location.pathname),[session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true)
  useEffect(()=>{let alive=true;void supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setChecking(false)}}).catch(error=>{console.error('[Auth bootstrap]',error);if(alive){setSession(null);setChecking(false)}});const s=supabase.auth.onAuthStateChange((_e,x)=>{if(alive)setSession(x)});return()=>{alive=false;s.data.subscription.unsubscribe()}},[])
  useEffect(()=>{const f=()=>setPath(location.pathname);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[])
  if(path==='/'||path==='/home')return <Boundary><Suspense fallback={<LoadingSkeleton/>}>{session?<ERP/>:<><PublicIndustrialHome/><IndustrialVisualShowcase/></>}</Suspense></Boundary>
  if(checking)return <LoadingSkeleton/>
  if(path==='/login')return session?<ERP/>:<Login/>
  if(path==='/cadastro-empresa')return <Boundary><Suspense fallback={lazyFallback()}><CadastroEmpresa/></Suspense></Boundary>
  if(path==='/contato')return <Boundary><Suspense fallback={lazyFallback()}><Contato/></Suspense></Boundary>
  if(path==='/blog')return <Boundary><Suspense fallback={lazyFallback()}><Blog/></Suspense></Boundary>
  if(overviewRoutes[path])return <Boundary><Suspense fallback={lazyFallback()}>{overviewRoutes[path]}</Suspense></Boundary>
  if(path==='/recebimento-materiais')return <Protected><Suspense fallback={lazyFallback()}><RecebimentoMateriais/></Suspense></Protected>
  if(path==='/erp-industrial')return <Protected><ERP/></Protected>
  if(path==='/master')return <Protected masterOnly><Suspense fallback={lazyFallback()}><Master/></Suspense></Protected>
  if(path==='/usuarios')return <Protected><Suspense fallback={lazyFallback()}><UsuariosAdmin/></Suspense></Protected>
  if(path==='/pcp')return <Protected><Suspense fallback={lazyFallback()}><PCPIndustrial/></Suspense></Protected>
  if(path==='/operacao-industrial')return <Protected><Suspense fallback={lazyFallback()}><OperacaoIndustrial/></Suspense></Protected>
  if(path==='/produtos-vendas')return <Protected><Suspense fallback={lazyFallback()}><ProdutosVendasIndustrial/></Suspense></Protected>
  if(path==='/qualidade')return <Protected><Suspense fallback={lazyFallback()}><QualidadeIndustrial/></Suspense></Protected>
  if(path==='/qualidade/documentos')return <Protected><Suspense fallback={lazyFallback()}><DocumentosQualidadeControle/></Suspense></Protected>
  if(path==='/manual-usuario')return <Protected><Suspense fallback={lazyFallback()}><ManualUsuario/></Suspense></Protected>
  if(path==='/compras-solicitacao')return <Protected><Suspense fallback={lazyFallback()}><SolicitacaoCompra/></Suspense></Protected>
  if(path==='/fiscal')return <Protected><Suspense fallback={lazyFallback()}><Fiscal/></Suspense></Protected>
  if(path==='/fiscal/previsao-caixa')return <Protected><Suspense fallback={lazyFallback()}><FiscalPrevisaoCaixa/></Suspense></Protected>
  if(path==='/teste-erp')return <Protected><Suspense fallback={lazyFallback()}><TesteERP/></Suspense></Protected>
  return <Boundary><Suspense fallback={<LoadingSkeleton/>}>{session?<ERP/>:<Login/>}</Suspense></Boundary>
}
