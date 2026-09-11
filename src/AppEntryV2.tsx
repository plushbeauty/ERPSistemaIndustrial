import { Component, FormEvent, ReactNode, useEffect, useState } from 'react'
import { KeyRound, LogIn, UserPlus, Clock3 } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import AppIndustrial from './AppIndustrialV7'
import PublicIndustrialHome from './PublicIndustrialHomeV3'
import Blog from './pages/Blog'
import Fiscal from './pages/Fiscal'
import FiscalPublic from './pages/FiscalPublic'
import Master from './pages/Master'
import PCPIndustrial from './pages/PCPIndustrial'
import QualidadeIndustrial from './pages/QualidadeIndustrial'
import CadastroEmpresa from './pages/CadastroEmpresa'
import SolicitacaoCompra from './pages/SolicitacaoCompra'
import './styles/login-blog-fix.css'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

type AccessResult = { ok: boolean; master: boolean; reason: string }
type LoginResponse = { session?: { access_token: string; refresh_token: string }; profile?: { id: string; empresa_id: string; nivel_admin: number }; error?: string }

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <div className="error-screen"><div className="error-screen-card"><strong>Erro ao abrir a tela.</strong><p>{this.state.error.message}</p><button className="primary" type="button" onClick={() => location.reload()}>Recarregar</button></div></div>
    return this.props.children
  }
}

function trialExpired(ends: string | null, status: string | null) { return !!ends && Date.now() >= new Date(ends).getTime() && status !== 'ativo' }

async function validarAcessoERP(authUserId: string): Promise<AccessResult> {
  const { data: u, error } = await supabase.from('erp_usuarios').select('id,empresa_id,ativo,nivel_admin').eq('auth_user_id', authUserId).maybeSingle()
  if (error || !u || u.ativo === false) return { ok: false, master: false, reason: 'Este acesso não está vinculado a um usuário ativo do ERP.' }
  if (u.nivel_admin === 1) return { ok: true, master: true, reason: '' }
  const { data: e, error: ee } = await supabase.from('erp_empresas').select('ativo,plano_status,trial_ends_at').eq('id', u.empresa_id).maybeSingle()
  if (ee) throw ee
  if (e?.ativo === false) return { ok: false, master: false, reason: 'O acesso desta empresa está bloqueado. Regularize o plano com a administração.' }
  if (trialExpired(e?.trial_ends_at ?? null, e?.plano_status ?? null)) return { ok: false, master: false, reason: 'Seu teste gratuito terminou. Ative seu plano para continuar.' }
  return { ok: true, master: false, reason: '' }
}

async function autenticarERP(empresa: string, setor: string, senha: string): Promise<LoginResponse> {
  const { data, error } = await supabase.functions.invoke('erp-login', { body: { empresa: empresa.trim(), setor: setor.trim(), senha } })
  if (error) throw new Error('Não foi possível autenticar no ERP. Verifique a configuração da função de login.')
  const result = data as LoginResponse | null
  if (!result?.session?.access_token || !result.session.refresh_token) throw new Error(result?.error || 'A função de autenticação não retornou uma sessão válida.')
  return result
}

function Login() {
  const [id, setId] = useState(''), [empresa, setEmpresa] = useState(''), [setor, setSetor] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [recovery, setRecovery] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setNotice(''); setBusy(true)
    try {
      if (!supabaseConfigurado) throw new Error('A conexão do sistema com o banco não está configurada.')
      if (!empresa.trim() || !setor.trim() || !id.trim() || !pw) throw new Error('Informe empresa, setor, usuário e senha.')
      const loginResult = await autenticarERP(empresa, setor, pw)
      const { error: sessionError } = await supabase.auth.setSession(loginResult.session!)
      if (sessionError) throw sessionError
      const authUser = (await supabase.auth.getUser()).data.user
      if (!authUser) throw new Error('Não foi possível validar a sessão.')
      const access = await validarAcessoERP(authUser.id)
      if (!access.ok) { await supabase.auth.signOut(); throw new Error(access.reason) }
      location.href = '/erp-industrial'
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível entrar no sistema.') }
    finally { setBusy(false) }
  }
  async function resetPassword() {
    setErr(''); setNotice(''); const email = id.trim().toLowerCase()
    if (!email || !email.includes('@')) { setErr('Para recuperar a senha, informe o e-mail cadastrado.'); return }
    setBusy(true)
    try { const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login` }); if (r.error) throw r.error; setNotice('Se o e-mail estiver cadastrado, o link de recuperação será enviado.'); setRecovery(false) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível solicitar a recuperação.') }
    finally { setBusy(false) }
  }
  return <main className="login-page"><section className="login-art" aria-label="Apresentação do SGQ ERP"><img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP — Gestão Industrial" /></section><form className="login-card" onSubmit={submit}><div className="login-brand"><a className="login-brand-logo" href="/" aria-label="Voltar para a página principal"><img className="login-logo-large" src="/logo-industrial.svg" alt="SGQ ERP" /></a><h1>Acesse seu SGQ ERP</h1><p>Gestão integrada, segura e separada por empresa.</p></div><div className="login-fields"><label>Nome da Empresa<input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Digite o nome da sua empresa" autoComplete="organization" required /></label><label>Setor<input value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex.: ADM, QUALIDADE, PRODUCAO" autoComplete="organization-title" required /></label><label>Usuário ou e-mail<input value={id} onChange={e => setId(e.target.value)} placeholder="Digite seu usuário ou e-mail" autoComplete="username" required /></label><label>Senha><div className="password-input"><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /><KeyRound size={18} /></div></label></div>{err && <div className="error">{err}</div>}{notice && <div className="notice">{notice}</div>}{!recovery ? <><button className="primary full login-submit" disabled={busy}>{busy ? 'Entrando…' : 'Acessar sistema'} <LogIn size={18} /></button><a className="trial-login-button" href="/cadastro-empresa"><Clock3 size={18} /> Teste grátis por 15 dias</a><button type="button" className="secondary full" disabled={busy} onClick={() => setRecovery(true)}>Esqueci minha senha</button><a className="signup-login-link" href="/cadastro-empresa"><UserPlus size={18} /> Cadastrar nova empresa</a></> : <><button type="button" className="primary full" disabled={busy} onClick={() => void resetPassword()}>{busy ? 'Enviando…' : 'Enviar recuperação'}</button><button type="button" className="secondary full" disabled={busy} onClick={() => setRecovery(false)}>Voltar ao login</button></>}<a className="login-back" href="/">Voltar para o site</a><small className="login-watermark">FernandoSch_System</small></form></main>
}

function ERP() {
  const [valid, setValid] = useState<boolean | null>(null)
  useEffect(() => { let alive = true; void supabase.auth.getUser().then(async ({ data }) => { if (!data.user) { if (alive) setValid(false); return } const access = await validarAcessoERP(data.user.id); if (!alive) return; if (!access.ok) { void supabase.auth.signOut(); location.href = '/login'; return } setValid(true) }).catch(() => { if (alive) setValid(false) }); return () => { alive = false } }, [])
  if (valid === null) return <div className="loading-screen">Validando acesso…</div>
  if (valid === false) return <Login />
  return <AppIndustrial />
}

function Protected({ children, masterOnly = false }: { children: ReactNode; masterOnly?: boolean }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking')
  useEffect(() => { let alive = true; void supabase.auth.getUser().then(async ({ data }) => { if (!data.user) { if (alive) setState('denied'); return } const access = await validarAcessoERP(data.user.id); if (!alive) return; if (!access.ok || (masterOnly && !access.master)) { void supabase.auth.signOut(); setState('denied'); return } setState('allowed') }).catch(() => { if (alive) setState('denied') }); return () => { alive = false } }, [masterOnly])
  if (state === 'checking') return <div className="loading-screen">Validando acesso…</div>
  if (state === 'denied') return <Login />
  return <Boundary>{children}</Boundary>
}

export default function AppEntryV2() {
  const [path, setPath] = useState(location.pathname), [session, setSession] = useState<Session | null>(null), [checking, setChecking] = useState(true)
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) }).catch(() => setChecking(false)); const s = supabase.auth.onAuthStateChange((_e, x) => setSession(x)); return () => s.data.subscription.unsubscribe() }, [])
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f) }, [])
  if (path === '/') return <Boundary><PublicIndustrialHome /></Boundary>
  if (path === '/blog') return <Boundary><Blog /></Boundary>
  if (path === '/cadastro-empresa') return <Boundary><CadastroEmpresa /></Boundary>
  if (checking) return <div className="loading-screen">Carregando SGQ ERP…</div>
  if (path === '/login') return session ? <ERP /> : <Login />
  if (path === '/erp-industrial') return <Protected><ERP /></Protected>
  if (path === '/master') return <Protected masterOnly><Master /></Protected>
  if (path === '/pcp') return <Protected><PCPIndustrial /></Protected>
  if (path === '/qualidade') return <Protected><QualidadeIndustrial /></Protected>
  if (path === '/compras-solicitacao') return <Protected><SolicitacaoCompra /></Protected>
  if (path === '/fiscal') return <Protected><Fiscal /></Protected>
  return <Boundary><PublicIndustrialHome /></Boundary>
}
