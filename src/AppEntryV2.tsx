import { Component, FormEvent, ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight, KeyRound, LogIn, UserPlus, Clock3 } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import './styles/public-contact.css'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const PublicIndustrialHome = lazy(() => import('./PublicIndustrialHome'))
const Blog = lazy(() => import('./pages/Blog'))
const Contato = lazy(() => import('./pages/Contato'))
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

type AccessResult = { ok: boolean; master: boolean; reason: string }

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <div className="error-screen"><div className="error-screen-card"><strong>Erro ao abrir a tela.</strong><p>{this.state.error.message}</p><button className="primary" type="button" onClick={() => location.reload()}>Recarregar</button></div></div>
    return this.props.children
  }
}

function LoadingSkeleton({ label = 'Carregando SGQ ERP…' }: { label?: string }) {
  return <div className="loading-screen"><div className="loading-skeleton-card"><div className="loading-skeleton-brand"/><div className="loading-skeleton-line wide"/><div className="loading-skeleton-line"/><div className="loading-skeleton-line short"/><span>{label}</span></div></div>
}

function lazyFallback() { return <LoadingSkeleton /> }
function trialExpired(ends: string | null, status: string | null) { return !!ends && Date.now() >= new Date(ends).getTime() && status !== 'ativo' }

async function validarAcessoERP(authUserId: string): Promise<AccessResult> {
  const { data: u, error } = await supabase.from('erp_usuarios').select('id,empresa_id,ativo,nivel_admin').eq('auth_user_id', authUserId).maybeSingle()
  if (error) throw error
  if (!u || u.ativo === false) return { ok: false, master: false, reason: 'Este acesso não está vinculado a um usuário ativo do ERP.' }
  const master = Number(u.nivel_admin) >= 9
  if (master) return { ok: true, master: true, reason: '' }
  const { data: e, error: ee } = await supabase.from('erp_empresas').select('ativo,plano_status,trial_ends_at').eq('id', u.empresa_id).maybeSingle()
  if (ee) throw ee
  if (e?.ativo === false) return { ok: false, master: false, reason: 'O acesso desta empresa está bloqueado.' }
  if (trialExpired(e?.trial_ends_at ?? null, e?.plano_status ?? null)) return { ok: false, master: false, reason: 'Seu teste gratuito terminou. Ative seu plano para continuar.' }
  return { ok: true, master, reason: '' }
}

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/erp-industrial'
  return value
}
function requestedTarget() { return safeReturnTo(new URLSearchParams(location.search).get('returnTo')) }

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setNotice(''); setBusy(true)
    try {
      if (!supabaseConfigurado) throw new Error('A conexão do sistema com o banco não está configurada.')
      if (!email.trim() || !pw) throw new Error('Informe e-mail e senha.')
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw })
      if (error) throw error
      if (!data.user) throw new Error('O Supabase Auth não retornou o usuário autenticado.')
      const access = await validarAcessoERP(data.user.id)
      if (!access.ok) { await supabase.auth.signOut(); throw new Error(access.reason) }
      location.replace(requestedTarget())
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível entrar no sistema.') }
    finally { setBusy(false) }
  }

  async function resetPassword() {
    setErr(''); setNotice('')
    const target = email.trim().toLowerCase()
    if (!target || !target.includes('@')) { setErr('Informe o e-mail cadastrado para recuperar a senha.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: `${location.origin}/login` })
      if (error) throw error
      setNotice('Se o e-mail estiver cadastrado, o link de recuperação será enviado.')
      setRecovery(false)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível solicitar a recuperação.') }
    finally { setBusy(false) }
  }

  return <main className="auth-screen">
    <section className="auth-visual" aria-label="SGQ ERP Industrial">
      <img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP Industrial" />
      <div className="auth-visual-shade" />
      <div className="auth-visual-content">
        <a href="/" className="auth-visual-logo"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
        <div className="auth-visual-message">
          <span>SGQ ERP • GESTÃO INDUSTRIAL</span>
          <h2>Uma fábrica inteira. Um único controle.</h2>
          <p>PCP, produção, qualidade, estoque, manutenção, financeiro e fiscal trabalhando sobre os mesmos dados.</p>
          <div className="auth-trust"><b>✓ Multiempresa</b><b>✓ Rastreabilidade</b><b>✓ Controle de acesso</b></div>
        </div>
        <small>FernandoSch_System</small>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-panel-inner">
        <div className="auth-mobile-brand"><a href="/"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a></div>
        <span className="auth-overline">ACESSO SEGURO</span>
        <h1>Entrar no SGQ ERP</h1>
        <p className="auth-description">Use seu e-mail corporativo para acessar o ambiente da sua empresa.</p>

        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="erp-email">E-mail corporativo</label>
          <div className="auth-input-wrap"><input id="erp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com.br" autoComplete="username" required /></div>
          <div className="auth-label-row"><label htmlFor="erp-password">Senha</label>{!recovery && <button type="button" className="auth-text-button" onClick={() => setRecovery(true)} disabled={busy}>Esqueci minha senha</button>}</div>
          <div className="auth-input-wrap"><input id="erp-password" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /><KeyRound size={17} aria-hidden="true" /></div>
          {err && <div className="auth-message auth-error" role="alert">{err}</div>}
          {notice && <div className="auth-message auth-notice" role="status">{notice}</div>}
          {!recovery ? <>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'} <LogIn size={18} /></button>
            <div className="auth-divider"><span>ou</span></div>
            <a className="auth-register" href="/cadastro-empresa"><UserPlus size={18} /> Criar uma nova empresa</a>
            <a className="auth-trial" href="/cadastro-empresa"><Clock3 size={17} /> Começar teste grátis de 15 dias <ArrowRight size={16} /></a>
          </> : <>
            <button className="auth-submit" type="button" disabled={busy} onClick={() => void resetPassword()}>{busy ? 'Enviando…' : 'Enviar recuperação'} <ArrowRight size={18} /></button>
            <button className="auth-secondary" type="button" disabled={busy} onClick={() => setRecovery(false)}>Voltar ao login</button>
          </>}
        </form>

        <div className="auth-footer"><a href="/">Voltar para o site</a><span>•</span><a href="/contato">Fale conosco</a></div>
      </div>
    </section>
  </main>
}

function ERP() {
  const [valid, setValid] = useState<boolean | null>(null)
  useEffect(() => { let alive = true; void supabase.auth.getUser().then(async ({ data }) => { if (!data.user) { if (alive) setValid(false); return } const access = await validarAcessoERP(data.user.id); if (!alive) return; if (!access.ok) { void supabase.auth.signOut(); location.href = '/login'; return } setValid(true) }).catch(() => { if (alive) setValid(false) }); return () => { alive = false } }, [])
  if (valid === null) return <LoadingSkeleton label="Validando acesso…" />
  if (valid === false) return <Login />
  return <Suspense fallback={<LoadingSkeleton />}><AppIndustrial /><VirtualGuide brand="SGQ ERP" name="Dri" /></Suspense>
}

function Protected({ children, masterOnly = false }: { children: ReactNode; masterOnly?: boolean }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking')
  useEffect(() => { let alive = true; void supabase.auth.getUser().then(async ({ data }) => { if (!data.user) { if (alive) setState('denied'); return } const access = await validarAcessoERP(data.user.id); if (!alive) return; if (!access.ok || (masterOnly && !access.master)) { void supabase.auth.signOut(); setState('denied'); return } setState('allowed') }).catch(() => { if (alive) setState('denied') }); return () => { alive = false } }, [masterOnly])
  if (state === 'checking') return <LoadingSkeleton label="Validando permissões…" />
  if (state === 'denied') { const target = encodeURIComponent(location.pathname + location.search); return <LoginRedirect target={target} /> }
  return <Boundary>{children}</Boundary>
}
function LoginRedirect({ target }: { target: string }) { useEffect(() => { const safe = safeReturnTo(decodeURIComponent(target)); if (location.pathname !== '/login') location.replace(`/login?returnTo=${encodeURIComponent(safe)}`) }, [target]); return <LoadingSkeleton label="Redirecionando para o login…" /> }

export default function AppEntryV2() {
  const [path, setPath] = useState(location.pathname)
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) }).catch(() => setChecking(false)); const s = supabase.auth.onAuthStateChange((_e, x) => setSession(x)); return () => s.data.subscription.unsubscribe() }, [])
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f) }, [])
  if (path === '/' || path === '/home') return <Boundary><Suspense fallback={<LoadingSkeleton />}>{session ? <ERP /> : <PublicIndustrialHome />}</Suspense></Boundary>
  if (checking) return <LoadingSkeleton />
  if (path === '/login') return session ? <ERP /> : <Login />
  if (path === '/cadastro-empresa') return <Boundary><Suspense fallback={lazyFallback()}><CadastroEmpresa /></Suspense></Boundary>
  if (path === '/contato') return <Boundary><Suspense fallback={lazyFallback()}><Contato /></Suspense></Boundary>
  if (path === '/blog') return <Boundary><Suspense fallback={lazyFallback()}><Blog /></Suspense></Boundary>
  if (path === '/erp-industrial') return <Protected><ERP /></Protected>
  if (path === '/master') return <Protected masterOnly><Suspense fallback={lazyFallback()}><Master /></Suspense></Protected>
  if (path === '/usuarios') return <Protected><Suspense fallback={lazyFallback()}><UsuariosAdmin /></Suspense></Protected>
  if (path === '/pcp') return <Protected><Suspense fallback={lazyFallback()}><PCPIndustrial /></Suspense></Protected>
  if (path === '/operacao-industrial') return <Protected><Suspense fallback={lazyFallback()}><OperacaoIndustrial /></Suspense></Protected>
  if (path === '/produtos-vendas') return <Protected><Suspense fallback={lazyFallback()}><ProdutosVendasIndustrial /></Suspense></Protected>
  if (path === '/qualidade') return <Protected><Suspense fallback={lazyFallback()}><QualidadeIndustrial /></Suspense></Protected>
  if (path === '/qualidade/documentos') return <Protected><Suspense fallback={lazyFallback()}><DocumentosQualidadeControle /></Suspense></Protected>
  if (path === '/manual-usuario') return <Protected><Suspense fallback={lazyFallback()}><ManualUsuario /></Suspense></Protected>
  if (path === '/compras-solicitacao') return <Protected><Suspense fallback={lazyFallback()}><SolicitacaoCompra /></Suspense></Protected>
  if (path === '/fiscal') return <Protected><Suspense fallback={lazyFallback()}><Fiscal /></Suspense></Protected>
  if (path === '/fiscal/previsao-caixa') return <Protected><Suspense fallback={lazyFallback()}><FiscalPrevisaoCaixa /></Suspense></Protected>
  if (path === '/teste-erp') return <Protected><Suspense fallback={lazyFallback()}><TesteERP /></Suspense></Protected>
  return <Boundary><Suspense fallback={<LoadingSkeleton />}>{session ? <ERP /> : <Login />}</Suspense></Boundary>
}
