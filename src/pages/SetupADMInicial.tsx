import { FormEvent, useEffect, useState, type CSSProperties } from 'react'
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

const shell: CSSProperties = { minHeight:'100vh', display:'grid', placeItems:'center', padding:24, background:'radial-gradient(circle at top,#173f48,#070b0d 62%)', color:'#fff', fontFamily:'Inter,system-ui,sans-serif' }
const card: CSSProperties = { width:'min(100%,680px)', background:'#101619', border:'1px solid rgba(201,168,76,.28)', borderRadius:24, padding:32, boxShadow:'0 30px 90px rgba(0,0,0,.45)' }
const input: CSSProperties = { display:'block', width:'100%', height:50, marginTop:7, marginBottom:14, padding:'0 14px', borderRadius:11, border:'1px solid rgba(255,255,255,.14)', background:'#0a0d0f', color:'#fff', fontSize:14, outline:'none' }
const button: CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', minHeight:52, marginTop:8, border:0, borderRadius:11, background:'#c9a84c', color:'#0b0d0e', fontWeight:900, cursor:'pointer' }
const label: CSSProperties = { display:'block', marginTop:13, fontSize:12, fontWeight:900 }
const muted: CSSProperties = { color:'rgba(255,255,255,.66)', lineHeight:1.7, fontSize:14 }
const box: CSSProperties = { marginTop:14, padding:13, borderRadius:11, background:'rgba(15,118,110,.14)', border:'1px solid rgba(88,190,175,.25)', color:'#baf1e8', fontSize:12, lineHeight:1.55 }

export default function SetupADMInicial() {
  const [available,setAvailable] = useState<boolean|null>(null)
  const [nome,setNome] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirm,setConfirm] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  useEffect(() => {
    let alive = true
    async function check() {
      if (!supabaseConfigurado) { if (alive) { setAvailable(false); setError('Supabase não está configurado neste ambiente.') } return }
      try {
        const { data, error:fnError } = await supabase.functions.invoke('erp-master-bootstrap', { body:{ action:'status' } })
        if (fnError) throw fnError
        if (alive) setAvailable(Boolean(data?.available))
      } catch (e) {
        if (alive) { setAvailable(false); setError(e instanceof Error ? e.message : 'Não foi possível verificar o cadastro Master.') }
      }
    }
    void check()
    return () => { alive = false }
  }, [])

  async function submit(event:FormEvent) {
    event.preventDefault()
    setError(''); setMessage('')
    if (nome.trim().length < 3) return setError('Informe seu nome completo.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Informe um e-mail válido.')
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('A confirmação da senha não confere.')
    setBusy(true)
    try {
      const { data, error:fnError } = await supabase.functions.invoke('erp-master-bootstrap', {
        body:{ action:'bootstrap_master', nome:nome.trim(), email:email.trim().toLowerCase(), password }
      })
      if (fnError) throw fnError
      if (!data?.ok) throw new Error(String(data?.error || 'Não foi possível concluir o cadastro Master.'))
      const { error:loginError } = await supabase.auth.signInWithPassword({ email:email.trim().toLowerCase(), password })
      if (loginError) throw loginError
      setAvailable(false)
      setMessage('Proprietário Master criado. Abrindo o painel universal…')
      window.setTimeout(() => window.location.replace('/master'), 400)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir o cadastro Master.')
    } finally { setBusy(false) }
  }

  if (available === null) return <main style={shell}><section style={card}><p style={muted}>Verificando a disponibilidade do primeiro acesso…</p></section></main>
  if (!available) return <main style={shell}><section style={card}><ShieldCheck size={28}/><h1 style={{fontSize:28,margin:'12px 0'}}>Cadastro Master indisponível</h1><p style={muted}>{message || 'Já existe um proprietário Master ou o serviço ainda não está disponível.'}</p><a href="/login" style={{...button,textDecoration:'none'}}>Ir para o login</a></section></main>

  return <main style={shell}><section style={card}>
    <div style={{display:'flex',gap:12,alignItems:'center'}}><LockKeyhole size={28}/><div><strong style={{display:'block',fontSize:11,letterSpacing:2}}>SGQ ERP INDUSTRIAL</strong><h1 style={{fontSize:28,margin:'4px 0'}}>Criar proprietário Master</h1></div></div>
    <p style={muted}>Este acesso é universal. O Master não pertence a uma empresa nem exige setor. Depois do cadastro, o login usa exclusivamente o Supabase Auth.</p>
    {error && <div style={{...box,background:'rgba(180,40,40,.12)',borderColor:'rgba(255,120,120,.3)',color:'#ffd0d0'}}>{error}</div>}
    <form onSubmit={submit}>
      <label style={label}>Nome completo<input style={input} value={nome} onChange={e=>setNome(e.target.value)} autoComplete="name" required/></label>
      <label style={label}>E-mail<input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label>
      <label style={label}>Senha<input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required/></label>
      <label style={label}>Confirmar senha<input style={input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required/></label>
      <button style={button} disabled={busy}>{busy?'Criando acesso…':'Criar proprietário Master'}</button>
    </form>
    <div style={box}><CheckCircle2 size={15} style={{verticalAlign:'middle',marginRight:7}}/> Nenhuma empresa será criada nesta etapa.</div>
  </section></main>
}
