import { FormEvent, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setErro('')
    if (!supabaseConfigurado) { setErro('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    setBusy(false)
    if (error) { setErro(error.message.includes('Invalid login credentials') ? 'E-mail ou senha inválidos.' : error.message); return }
    onSuccess()
  }
  return <div className="login"><form onSubmit={submit}><div className="brand"><span>🏭</span><div><strong>ERP Industrial</strong><small>Gestão inteligente da fábrica</small></div></div><h1>Acesso ao sistema</h1><label>E-mail<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" required /></label><label>Senha<input value={senha} onChange={e=>setSenha(e.target.value)} type="password" autoComplete="current-password" required /></label>{erro && <div className="error">{erro}</div>}<button className="primary" disabled={busy}>{busy ? 'Entrando...' : 'Entrar no sistema'}</button></form></div>
}
