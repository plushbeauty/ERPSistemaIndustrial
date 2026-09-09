import { FormEvent, useEffect, useState } from 'react'
import { Bot, FileText, KeyRound, LogIn, X } from 'lucide-react'
import AppIndustrial from './AppIndustrial'
import Fiscal from './pages/Fiscal'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice('')
    if (!supabaseConfigurado) { setError('A conexão do sistema com o banco não está configurada.'); return }
    setBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (signInError) throw signInError
      window.location.assign('/erp-industrial')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível entrar.'
      setError(message.toLowerCase().includes('invalid login credentials') ? 'Usuário ou senha inválidos.' : message)
    } finally { setBusy(false) }
  }

  async function resetPassword() {
    setError(''); setNotice('')
    if (!email.trim()) { setError('Informe seu e-mail para receber o link de recuperação.'); return }
    setBusy(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/login` })
      if (resetError) throw resetError
      setNotice('Se o e-mail estiver cadastrado, o link de recuperação será enviado.')
      setRecovery(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível solicitar a recuperação.') }
    finally { setBusy(false) }
  }

  return <div className="login-page">
    <div className="login-art"><img src="/login-sgq-erp.svg" alt="SGQ ERP — Sistema de Gestão Industrial"/></div>
    <form className="login-card" onSubmit={submit}>
      <div className="login-brand"><img className="login-logo-large" src="/logo-industrial.svg" alt="SGQ ERP"/><h1>SGQ ERP</h1><p>Sistema de Gestão Industrial</p></div>
      <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required/></label>
      <label>Senha<div className="password-input"><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required/><KeyRound size={18}/></div></label>
      {error && <div className="error">{error}</div>}{notice && <div className="notice">{notice}</div>}
      {!recovery ? <><button className="primary full" disabled={busy}><LogIn size={18}/>{busy ? 'Entrando…' : 'Acessar sistema'}</button><button type="button" className="secondary full" onClick={() => setRecovery(true)}>Esqueci minha senha</button></> : <><button type="button" className="primary full" disabled={busy} onClick={() => void resetPassword()}>{busy ? 'Enviando…' : 'Enviar recuperação'}</button><button type="button" className="secondary full" onClick={() => setRecovery(false)}>Voltar ao login</button></>}
      <a className="login-back" href="/">Voltar para o site</a>
    </form>
  </div>
}

function HelpAI() {
  const [open, setOpen] = useState(false)
  const questions = ['Como cadastrar uma ordem de produção?', 'Como funciona o MRP?', 'Como importar uma NF-e da contabilidade?', 'Onde encontro a chave de acesso?', 'Como configurar a emissão fiscal?']
  return <>
    <button className="ai-help-button" onClick={() => setOpen(!open)} aria-label="Abrir ajuda do ERP">{open ? <X size={20}/> : <Bot size={20}/>}<span>Ajuda IA</span></button>
    {open && <div className="ai-help-panel"><div className="ai-help-head"><div><strong>Assistente SGQ ERP</strong><small>Ajuda rápida por módulo</small></div><button onClick={() => setOpen(false)}><X size={18}/></button></div><p>Escolha uma pergunta para abrir a orientação correspondente.</p>{questions.map(q => <button key={q} onClick={() => alert(q + '\n\nO assistente orientará passo a passo conforme os dados e permissões da sua empresa.')}>{q}</button>)}</div>}
  </>
}

function ERPWithShortcuts() {
  return <><AppIndustrial/><div className="erp-shortcuts"><a href="/fiscal"><FileText size={18}/><span>Fiscal</span></a></div><HelpAI/></>
}

export default function AppEntry() {
  const [path, setPath] = useState(window.location.pathname)
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<any>(null)
  useEffect(() => { let alive = true; supabase.auth.getSession().then(({ data }) => { if (!alive) return; setSession(data.session); setChecking(false) }); const sub = supabase.auth.onAuthStateChange((_event, next) => setSession(next)); return () => { alive = false; sub.data.subscription.unsubscribe() } }, [])
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])
  if (checking && path !== '/') return <div className="loading-screen">Carregando SGQ ERP…</div>
  if (path === '/login') return session ? <ERPWithShortcuts/> : <Login/>
  if (path === '/fiscal') return session ? <><Fiscal/><HelpAI/></> : <Login/>
  if (path === '/erp-industrial') return session ? <ERPWithShortcuts/> : <Login/>
  return <AppIndustrial/>
}
