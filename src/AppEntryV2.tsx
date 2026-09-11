import { Component, FormEvent, ReactNode, useEffect, useState } from 'react'
import { KeyRound, LogIn, UserPlus } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import AppIndustrial from './AppIndustrialV3'
import PublicIndustrialHome from './PublicIndustrialHome'
import Fiscal from './pages/Fiscal'
import FiscalPublic from './pages/FiscalPublic'
import Master from './pages/Master'
import PCPIndustrial from './pages/PCPIndustrial'
import QualidadeIndustrial from './pages/QualidadeIndustrial'
import CadastroEmpresa from './pages/CadastroEmpresa'
import SolicitacaoCompra from './pages/SolicitacaoCompra'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

type AccessResult = { ok: boolean; master: boolean; reason: string }
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <div className="error-screen"><div className="error-screen-card"><strong>Erro ao abrir a tela.</strong><p>{this.state.error.message}</p><button className="primary" type="button" onClick={() => location.reload()}>Recarregar</button></div></div>
    return this.props.children
  }
}
async function validarAcessoERP(authUserId: string): Promise<AccessResult> {
  const { data: u, error } = await supabase.from('erp_usuarios').select('id,empresa_id,ativo,nivel_admin').eq('auth_user_id', authUserId).maybeSingle()
  if (error || !u || u.ativo === false) return { ok: false, master: false, reason: 'Este acesso não está vinculado a um usuário ativo do ERP.' }
  if (u.nivel_admin === 1) return { ok: true, master: true, reason: '' }
  const { data: e, error: empresaError } = await supabase.from('erp_empresas').select('ativo,plano_status').eq('id', u.empresa_id).maybeSingle()
  if (empresaError) throw empresaError
  if (e && e.ativo === false) return { ok: false, master: false, reason: 'O acesso desta empresa está bloqueado. Regularize a assinatura com a administração.' }
  return { ok: true, master: false, reason: '' }
}
async function resolverLogin(login: string, empresa: string): Promise<string> {
  const l = login.trim().toLowerCase(); const emp = empresa.trim()
  if (l.includes('@')) {
    const { data: u, error } = await supabase.from('erp_usuarios').select('email,ativo,empresa_id').eq('email', l).maybeSingle()
    if (error) throw error
    if (!u || u.ativo === false) throw new Error('Usuário não encontrado ou inativo.')
    if (emp) {
      const { data: e, error: ee } = await supabase.from('erp_empresas').select('id').or(`razao_social.ilike.%${emp}%,nome_fantasia.ilike.%${emp}%`).limit(10)
      if (ee) throw ee
      if (e?.length && !e.some(x => x.id === u.empresa_id)) throw new Error('O usuário informado não pertence à empresa selecionada.')
    }
    return l
  }
  const { data: rows, error } = await supabase.from('erp_usuarios').select('email,ativo,empresa_id,login_nome').eq('ativo', true).ilike('login_nome', login.trim())
  if (error) throw error
  if (!rows?.length) throw new Error('Usuário não encontrado. Confira a empresa e o usuário.')
  if (emp) {
    const { data: e, error: ee } = await supabase.from('erp_empresas').select('id,razao_social,nome_fantasia').or(`razao_social.ilike.%${emp}%,nome_fantasia.ilike.%${emp}%`).limit(10)
    if (ee) throw ee
    const ids = new Set((e || []).map(x => x.id)); const match = rows.find(x => ids.has(x.empresa_id))
    if (!match?.email) throw new Error('Usuário não encontrado nessa empresa. Confira os dados.')
    return match.email.toLowerCase()
  }
  if (rows.length > 1) throw new Error('Informe o Nome da Empresa para identificar o usuário corretamente.')
  if (!rows[0]?.email) throw new Error('Este usuário ainda não possui e-mail de acesso configurado.')
  return rows[0].email.toLowerCase()
}
function Login() {
  const [id, setId] = useState(''); const [empresa, setEmpresa] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [recovery, setRecovery] = useState(false)
  async function submit(e: FormEvent) { e.preventDefault(); setErr(''); setNotice(''); setBusy(true); try { if (!supabaseConfigurado) throw new Error('A conexão do sistema com o banco não está configurada.'); const email = await resolverLogin(id, empresa); const r = await supabase.auth.signInWithPassword({ email, password: pw }); if (r.error) { const msg = r.error.message.toLowerCase(); if (msg.includes('invalid login credentials')) throw new Error('Usuário ou senha inválidos. Confira empresa, usuário e senha.'); throw r.error }; const authUser = (await supabase.auth.getUser()).data.user; if (!authUser) throw new Error('Não foi possível validar a sessão.'); const access = await validarAcessoERP(authUser.id); if (!access.ok) { await supabase.auth.signOut(); throw new Error(access.reason) }; location.href = '/erp-industrial' } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível entrar no sistema.') } finally { setBusy(false) } }
  async function resetPassword() { setErr(''); setNotice(''); const email = id.trim().toLowerCase(); if (!email || !email.includes('@')) { setErr('Para recuperar a senha, informe o e-mail cadastrado.'); return }; setBusy(true); try { const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login` }); if (r.error) throw r.error; setNotice('Se o e-mail estiver cadastrado, o link de recuperação será enviado.'); setRecovery(false) } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível solicitar a recuperação.') } finally { setBusy(false) } }
  return <main className="login-page"><section className="login-art" aria-label="Apresentação do SGQ ERP"><img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP — Gestão Industrial" /></section><form className="login-card" onSubmit={submit}><div className="login-brand"><a className="login-brand-logo" href="/" aria-label="Voltar para a página principal"><img className="login-logo-large" src="/logo-industrial.svg" alt="SGQ ERP" /></a><h1>Acesse seu SGQ ERP</h1><p>Gestão industrial integrada, segura e por empresa.</p></div><label>Nome da Empresa<input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Digite o nome da sua empresa" autoComplete="organization" required /></label><label>Usuário ou e-mail<input value={id} onChange={e => setId(e.target.value)} placeholder="Digite seu usuário ou e-mail" autoComplete="username" required /></label><label>Senha<div className="password-input"><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /><KeyRound size={18} /></div></label>{err && <div className="error">{err}</div>}{notice && <div className="notice">{notice}</div>}{!recovery ? <><button className="primary full login-submit" disabled={busy}> {busy ? 'Entrando…' : 'Acessar sistema'} <LogIn size={18} /></button><button type="button" className="secondary full" disabled={busy} onClick={() => setRecovery(true)}>Esqueci minha senha</button><a className="signup-login-link" href="/cadastro-empresa"><UserPlus size={18} /> Cadastrar nova empresa</a></> : <><button type="button" className="primary full" disabled={busy} onClick={() => void resetPassword()}>{busy ? 'Enviando…' : 'Enviar recuperação'}</button><button type="button" className="secondary full" disabled={busy} onClick={() => setRecovery(false)}>Voltar ao login</button></>}<a className="login-back" href="/">Voltar para o site</a><small className="login-watermark">FernandoSch_System</small></form></main>
}
function ERP() { const [valid, setValid] = useState<boolean | null>(null); useEffect(() => { let alive = true; supabase.auth.getUser().then(async ({ data }) => { if (!data.user) { if (alive) setValid(false); return }; const access = await validarAcessoERP(data.user.id); if (!alive) return; if (!access.ok) { void supabase.auth.signOut(); location.href = '/login'; return }; setValid(true) }).catch(() => { if (alive) setValid(false) }); return () => { alive = false } }, []); if (valid === null) return <div className="loading-screen">Validando acesso…</div>; if (valid === false) return <Login/>; return <AppIndustrial/> }
export default function AppEntryV2() {
  const [path, setPath] = useState(location.pathname); const [session, setSession] = useState<Session | null>(null); const [checking, setChecking] = useState(true)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) }).catch(() => setChecking(false)); const s = supabase.auth.onAuthStateChange((_e, x) => setSession(x)); return () => s.data.subscription.unsubscribe() }, [])
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f) }, [])
  if (path === '/') return <Boundary><PublicIndustrialHome /></Boundary>
  if (path === '/cadastro-empresa') return <Boundary><CadastroEmpresa /></Boundary>
  if (path === '/fiscal') return <Boundary>{session ? <Fiscal /> : <FiscalPublic />}</Boundary>
  if (checking) return <div className="loading-screen">Carregando SGQ ERP…</div>
  if (path === '/login') return <Boundary>{session ? <ERP /> : <Login />}</Boundary>
  if (path === '/master') return <Boundary>{session ? <Master /> : <Login />}</Boundary>
  if (path === '/pcp') return <Boundary>{session ? <PCPIndustrial /> : <Login />}</Boundary>
  if (path === '/qualidade') return <Boundary>{session ? <QualidadeIndustrial /> : <Login />}</Boundary>
  if (path === '/compras-solicitacao') return <Boundary>{session ? <SolicitacaoCompra /> : <Login />}</Boundary>
  if (path === '/erp-industrial') return <Boundary>{session ? <ERP /> : <Login />}</Boundary>
  return <Boundary><PublicIndustrialHome /></Boundary>
}
