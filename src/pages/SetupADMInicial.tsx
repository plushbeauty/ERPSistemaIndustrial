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
      if (!supabaseConfigurado) { if (alive) { setAvailable(false); setError('Supabase não está configurado neste ambiente.') }; return }
      try {
        const { data, error: fnError } = await supabase.functions.invoke('erp-login', { body:{ action:'setup_status' } })
        if (fnError) throw fnError
        if (alive) setAvailable(Boolean(data?.available))
      } catch (e) {
        if (alive) { setAvailable(false); setError(e instanceof Error ? e.message : 'Não foi possível verificar o cadastro Master.') }
      }
    }
    void check()
    return () => { alive = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(''); setMessage('')
    if (nome.trim().length < 3) return setError('Informe seu nome completo.')
    if (!email.includes('@')) return setError('Informe um e-mail válido.')
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError('A senha precisa ter pelo menos 10 caracteres e conter letras e números.')
    if (password !== confirm) return setError('A confirmação da senha não confere.')
    setBusy(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-login', { body:{ action:'bootstrap_master', nome:nome.trim(), email:email.trim().toLowerCase(), password } })
      if (fnError) throw fnError
      if (!data?.ok) throw new Error(String(data?.error || 'Não foi possível concluir o cadastro Master.'))
      const { error:loginError } = await supabase.auth.signInWithPassword({ email:email.trim().toLowerCase(), password })
      if (loginError) throw loginError
      setMessage('Proprietário Master cadastrado. Abrindo a tela de configurações…')
      window.setTimeout(() => { window.location.replace('/master') }, 500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao cadastrar o proprietário Master.')
    } finally { setBusy(false) }
  }

  if (available === null) return <main style={shell}><section style={card}><LockKeyhole/><h1>Preparando cadastro do proprietário</h1><p style={muted}>Verificando se o sistema ainda aceita o primeiro Master…</p></section></main>

  if (!available) return <main style={shell}><section style={card}><span style={{fontSize:11,fontWeight:900,letterSpacing:'.16em',color:'#e0c56f'}}>ACESSO DO PROPRIETÁRIO</span><h1>O cadastro inicial do Master já foi encerrado.</h1><p style={muted}>Existe um proprietário Master ativo ou o ambiente não pôde liberar o cadastro. Se você já é o proprietário, entre pelo login normal.</p>{error&&<div style={{...box,background:'rgba(150,25,25,.18)',color:'#ffb6b6'}}>{error}</div>}<a href="/login?mode=master&returnTo=%2Fmaster" style={{...button,textDecoration:'none'}}>Ir para o login</a><a href="/" style={{display:'block',marginTop:15,textAlign:'center',color:'#e0c56f',fontSize:12}}>Voltar ao site</a></section></main>

  return <main style={shell}><section style={card}>
    <div style={{display:'flex',alignItems:'center',gap:10,color:'#e0c56f'}}><ShieldCheck size={22}/><span style={{fontSize:11,fontWeight:900,letterSpacing:'.16em'}}>PROPRIETÁRIO • MASTER DO SISTEMA</span></div>
    <h1 style={{fontSize:34,margin:'12px 0 8px'}}>Cadastre seu acesso de dono</h1>
    <p style={muted}>Este é o cadastro único do proprietário do SGQ ERP Industrial. Depois de concluir, você entra na área Master para configurar empresas, usuários, demonstrações e permissões.</p>
    <form onSubmit={submit}>
      <label style={label}>Seu nome<input style={input} value={nome} onChange={e=>setNome(e.target.value)} autoComplete="name" placeholder="Nome completo"/></label>
      <label style={label}>Seu e-mail<input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="seu@email.com"/></label>
      <label style={label}>Senha Master<input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo de 10 caracteres"/></label>
      <label style={label}>Confirmar senha<input style={input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repita a senha"/></label>
      {error&&<div style={{...box,background:'rgba(150,25,25,.18)',color:'#ffb6b6'}}>{error}</div>}
      {message&&<div style={box}><CheckCircle2 size={15} style={{verticalAlign:'middle',marginRight:6}}/>{message}</div>}
      <button disabled={busy} type="submit" style={{...button,opacity:busy?.7:1}}>{busy?'Criando acesso Master…':'Cadastrar meu acesso de proprietário'}</button>
    </form>
    <div style={{...box,marginTop:18}}>Depois do cadastro, o sistema usa o Supabase Auth para a identidade e o perfil Master nível 9 para autorizar a área administrativa. A senha não fica no código nem no navegador.</div>
    <a href="/login?mode=master&returnTo=%2Fmaster" style={{display:'block',marginTop:17,textAlign:'center',color:'#e0c56f',fontSize:12}}>Já tenho acesso · entrar</a>
  </section></main>
}
