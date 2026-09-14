import { Component, FormEvent, ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { KeyRound, LogIn, UserPlus, Clock3 } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import InfrastructureTrust from './components/InfrastructureTrust'
import './styles/login-blog-fix.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const PublicIndustrialHome = lazy(() => import('./PublicIndustrialHome'))
const Blog = lazy(() => import('./pages/Blog'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const FiscalPrevisaoCaixa = lazy(() => import('./pages/FiscalPrevisaoCaixa'))
const Master = lazy(() => import('./pages/Master'))
const PCPIndustrial = lazy(() => import('./pages/PCPIndustrial'))
const QualidadeIndustrial = lazy(() => import('./pages/QualidadeIndustrial'))
const OperacaoIndustrial = lazy(() => import('./pages/OperacaoIndustrial'))
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'))
const CadastroEmpresa = lazy(() => import('./pages/CadastroEmpresa'))
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'))
const TesteERP = lazy(() => import('./pages/TesteERP'))
const UsuariosAdmin = lazy(() => import('./pages/UsuariosAdmin'))
const DocumentosQualidadeControle = lazy(() => import('./pages/DocumentosQualidadeControle'))
const ManualUsuario = lazy(() => import('./pages/ManualUsuario'))
const VirtualGuide = lazy(() => import('./components/VirtualGuide'))

type AccessResult={ok:boolean;master:boolean;reason:string}
type LoginResponse={session?:Session;profile?:{id:string;empresa_id:string;nivel_admin:number};error?:string}

class Boundary extends Component<{children:ReactNode},{error:Error|null}>{
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  render(){
    if(this.state.error)return <div className="error-screen"><div className="error-screen-card"><strong>Erro ao abrir a tela.</strong><p>{this.state.error.message}</p><button className="primary" type="button" onClick={()=>location.reload()}>Recarregar</button></div></div>
    return this.props.children
  }
}

function LoadingSkeleton({label='Carregando SGQ ERP…'}:{label?:string}){return <div className="loading-screen" role="status" aria-live="polite"><div className="loading-skeleton-card"><div className="loading-skeleton-brand"/><div className="loading-skeleton-line wide"/><div className="loading-skeleton-line"/><div className="loading-skeleton-line short"/><span>{label}</span></div></div>}
function lazyFallback(){return <LoadingSkeleton/>}
function trialExpired(ends:string|null,status:string|null){return!!ends&&Date.now()>=new Date(ends).getTime()&&status!=='ativo'}

async function validarAcessoERP(authUserId:string):Promise<AccessResult>{
  const{data:u,error}=await supabase.from('erp_usuarios').select('id,empresa_id,ativo,nivel_admin,is_master').eq('auth_user_id',authUserId).is('deleted_at',null).maybeSingle()
  if(error)throw error
  if(!u||u.ativo===false)return{ok:false,master:false,reason:'Este acesso não está vinculado a um usuário ativo do ERP.'}
  const master=Boolean(u.is_master)||Number(u.nivel_admin)>=9
  if(master)return{ok:true,master:true,reason:''}
  const{data:e,error:ee}=await supabase.from('erp_empresas').select('ativo,plano_status,trial_ends_at').eq('id',u.empresa_id).maybeSingle()
  if(ee)throw ee
  if(e?.ativo===false)return{ok:false,master:false,reason:'O acesso desta empresa está bloqueado.'}
  if(trialExpired(e?.trial_ends_at??null,e?.plano_status??null))return{ok:false,master:false,reason:'Seu teste gratuito terminou. Ative seu plano para continuar.'}
  return{ok:true,master:false,reason:''}
}

function safeReturnTo(value:string|null){if(!value||!value.startsWith('/')||value.startsWith('//')||value.startsWith('/login'))return'/erp-industrial';return value}
function requestedTarget(){return safeReturnTo(new URLSearchParams(location.search).get('returnTo'))}

async function autenticarERP(empresa:string,identificador:string,senha:string):Promise<LoginResponse>{
  const payload={empresa:empresa.trim(),identificador:identificador.trim(),senha}
  const{data,error}=await supabase.functions.invoke('erp-login',{body:payload})
  if(error)throw new Error('Não foi possível conectar ao serviço de autenticação do ERP.')
  const result=(data??{}) as {session?:Session;profile?:{id:string;empresa_id:string;nivel_admin:number};error?:string}
  if(result.error||!result.session||!result.profile)throw new Error(result.error||'Empresa, usuário ou senha inválidos.')
  return{session:result.session,profile:result.profile}
}

function Login(){
  const[id,setId]=useState(''),[empresa,setEmpresa]=useState(''),[pw,setPw]=useState(''),[err,setErr]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(false)
  async function submit(e:FormEvent){
    e.preventDefault();setErr('');setNotice('');setBusy(true)
    try{
      if(!supabaseConfigurado)throw new Error('A conexão do sistema com o banco não está configurada.')
      if(!empresa.trim()||!id.trim()||!pw)throw new Error('Informe empresa, usuário/e-mail e senha.')
      const loginResult=await autenticarERP(empresa,id,pw)
      const{error:sessionError}=await supabase.auth.setSession(loginResult.session!)
      if(sessionError)throw sessionError
      const authUser=(await supabase.auth.getUser()).data.user
      if(!authUser)throw new Error('Não foi possível validar a sessão.')
      const access=await validarAcessoERP(authUser.id)
      if(!access.ok){await supabase.auth.signOut();throw new Error(access.reason)}
      location.href=requestedTarget()
    }catch(e){setErr(e instanceof Error?e.message:'Não foi possível entrar no sistema.')}finally{setBusy(false)}
  }
  async function resetPassword(){
    setErr('');setNotice('');const email=id.trim().toLowerCase()
    if(!email||!email.includes('@')){setErr('Para recuperar a senha, informe o e-mail cadastrado.');return}
    setBusy(true)
    try{const r=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/login`});if(r.error)throw r.error;setNotice('Se o e-mail estiver cadastrado, o link de recuperação será enviado.');setRecovery(false)}catch(e){setErr(e instanceof Error?e.message:'Não foi possível solicitar a recuperação.')}finally{setBusy(false)}
  }
  return <main className="login-page"><section className="login-art" aria-label="Apresentação do SGQ ERP"><img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP — Gestão Industrial"/><div style={{position:'absolute',left:24,right:24,bottom:20}}><InfrastructureTrust/></div></section><form className="login-card" onSubmit={submit}><div className="login-brand"><a className="login-brand-logo" href="/" aria-label="Voltar para a página principal"><img className="login-logo-large" src="/logo-industrial.svg" alt="SGQ ERP"/></a><h1>Acesse seu SGQ ERP</h1><p>Gestão integrada, segura e separada por empresa.</p></div><div className="login-fields"><label>Nome ou código da Empresa<input value={empresa} onChange={e=>setEmpresa(e.target.value)} placeholder="Ex.: PLASTIBOR" autoComplete="organization" required/></label><label>Usuário ou e-mail<input value={id} onChange={e=>setId(e.target.value)} placeholder="Digite o usuário ou e-mail cadastrado" autoComplete="username" required/></label><label>Senha<div className="password-input"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required/><KeyRound size={18}/></div></label></div>{err&&<div className="error">{err}</div>}{notice&&<div className="notice">{notice}</div>}{!recovery?<><button className="primary full login-submit" disabled={busy}>{busy?'Entrando…':'Acessar sistema'} <LogIn size={18}/></button><a className="trial-login-button" href="/cadastro-empresa"><Clock3 size={18}/> Teste grátis por 15 dias</a><button type="button" className="secondary full" disabled={busy} onClick={()=>setRecovery(true)}>Esqueci minha senha</button><a className="signup-login-link" href="/cadastro-empresa"><UserPlus size={18}/> Cadastrar nova empresa</a></>:<><button type="button" className="primary full" disabled={busy} onClick={()=>void resetPassword()}>{busy?'Enviando…':'Enviar recuperação'}</button><button type="button" className="secondary full" disabled={busy} onClick={()=>setRecovery(false)}>Voltar ao login</button></>}<a className="login-back" href="/">Voltar para o site</a><small className="login-watermark">FernandoSch_System</small></form></main>
}

function ERP(){
  const[valid,setValid]=useState<boolean|null>(null)
  useEffect(()=>{let alive=true;void supabase.auth.getUser().then(async({data})=>{if(!data.user){if(alive)setValid(false);return}const access=await validarAcessoERP(data.user.id);if(!alive)return;if(!access.ok){void supabase.auth.signOut();location.href='/login';return}setValid(true)}).catch(()=>{if(alive)setValid(false)});return()=>{alive=false}},[])
  if(valid===null)return <LoadingSkeleton label="Validando acesso…"/>
  if(valid===false)return <Login/>
  return <Suspense fallback={<LoadingSkeleton/>}><AppIndustrial/><VirtualGuide brand="SGQ ERP" name="Dri"/></Suspense>
}

function Protected({children,masterOnly=false}:{children:ReactNode;masterOnly?:boolean}){
  const[state,setState]=useState<'checking'|'allowed'|'denied'>('checking')
  useEffect(()=>{let alive=true;void supabase.auth.getUser().then(async({data})=>{if(!data.user){if(alive)setState('denied');return}const access=await validarAcessoERP(data.user.id);if(!alive)return;if(!access.ok||(masterOnly&&!access.master)){void supabase.auth.signOut();setState('denied');return}setState('allowed')}).catch(()=>{if(alive)setState('denied')});return()=>{alive=false}},[masterOnly])
  if(state==='checking')return <LoadingSkeleton label="Validando permissões…"/>
  if(state==='denied'){const target=encodeURIComponent(location.pathname+location.search);return <LoginRedirect target={target}/>}
  return <Boundary>{children}</Boundary>
}
function LoginRedirect({target}:{target:string}){useEffect(()=>{const safe=safeReturnTo(decodeURIComponent(target));if(location.pathname!=='/login')location.replace(`/login?returnTo=${encodeURIComponent(safe)}`)},[target]);return <LoadingSkeleton label="Redirecionando para o login…"/>}

export default function AppEntryV2(){
  const[path,setPath]=useState(location.pathname),[session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true)
  useEffect(()=>{void supabase.auth.getSession().then(({data})=>{setSession(data.session);setChecking(false)}).catch(()=>setChecking(false));const s=supabase.auth.onAuthStateChange((_e,x)=>setSession(x));return()=>s.data.subscription.unsubscribe()},[])
  useEffect(()=>{const f=()=>setPath(location.pathname);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[])
  // The public root is intentionally routed to login. This prevents eager loading of the full ERP/public module graph from blanking the entry screen.
  if(path==='/'||path==='/home')return <Boundary><Suspense fallback={<LoadingSkeleton/>}><PublicIndustrialHome/></Suspense></Boundary>
  if(checking)return <LoadingSkeleton/>
  if(path==='/login')return session?<ERP/>:<Login/>
  if(path==='/cadastro-empresa')return <Boundary><Suspense fallback={lazyFallback()}><CadastroEmpresa/></Suspense></Boundary>
  if(path==='/blog')return <Boundary><Suspense fallback={lazyFallback()}><Blog/></Suspense></Boundary>
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
  return <Boundary><Suspense fallback={<LoadingSkeleton/>}><PublicIndustrialHome/></Suspense></Boundary>
}
