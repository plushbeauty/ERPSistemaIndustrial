/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:47 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-054
 * Alterações: Inclusão do cabeçalho obrigatório de revisão no fluxo de ativação de acesso.
 * Status do Build Local: Não executado — gate remoto após commit.
 * =========================================================================
 */

import { FormEvent, useState, type CSSProperties } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

const shell: CSSProperties = { minHeight:'100vh', display:'grid', placeItems:'center', padding:24, background:'#f4f7f5', color:'#17342f', fontFamily:'Inter,system-ui,sans-serif' }
const card: CSSProperties = { width:'min(100%,620px)', background:'#fff', border:'1px solid #d9e3df', borderRadius:24, padding:30, boxShadow:'0 25px 80px rgba(20,55,49,.13)' }
const input: CSSProperties = { display:'block', width:'100%', height:50, marginTop:7, marginBottom:14, padding:'0 14px', borderRadius:11, border:'1px solid #d4dfda', background:'#fff', color:'#17342f', fontSize:14 }
const button: CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', minHeight:50, border:0, borderRadius:11, background:'#0f766e', color:'#fff', fontWeight:900, cursor:'pointer' }
const label: CSSProperties = { display:'block', marginTop:13, fontSize:12, fontWeight:900 }
const msg: CSSProperties = { marginTop:14, padding:12, borderRadius:11, background:'#eef7f4', border:'1px solid #cde5de', color:'#176257', fontSize:12, lineHeight:1.55 }

export default function AtivarAcesso() {
  const [email,setEmail]=useState('')
  const [code,setCode]=useState('')
  const [nome,setNome]=useState('')
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  const [sent,setSent]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  async function sendAgain() {
    setError(''); setMessage('')
    if (!supabaseConfigurado) return setError('Ambiente Supabase não configurado.')
    if (!email.includes('@')) return setError('Informe o mesmo e-mail usado no convite.')
    setBusy(true)
    try {
      const { error: e } = await supabase.auth.signInWithOtp({ email:email.trim().toLowerCase(), options:{ shouldCreateUser:false } })
      if (e) throw e
      setSent(true); setMessage('Novo código enviado. Verifique sua caixa de entrada e o spam.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível enviar outro código.') }
    finally { setBusy(false) }
  }

  async function finish(event:FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!supabaseConfigurado) return setError('Ambiente Supabase não configurado.')
    if (!email.includes('@') || !/^\d{6,8}$/.test(code.trim())) return setError('Informe e-mail e o código recebido por e-mail.')
    if (nome.trim().length < 3) return setError('Informe seu nome completo.')
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== confirm) return setError('A confirmação da senha não confere.')
    setBusy(true)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({ email:email.trim().toLowerCase(), token:code.trim(), type:'email' })
      if (otpError) throw otpError
      const { data, error: fnError } = await supabase.functions.invoke('erp-user-admin', { body:{ action:'finalize_invite', nome:nome.trim(), password } })
      if (fnError) throw fnError
      if (!data?.ok) throw new Error(String(data?.error || 'Não foi possível concluir o cadastro.'))
      setMessage('Código validado. Cadastro concluído. Abrindo o sistema…')
      window.setTimeout(()=>window.location.replace('/erp-industrial'),600)
    } catch (e) {
      await supabase.auth.signOut().catch(()=>undefined)
      setError(e instanceof Error ? e.message : 'Código inválido ou convite expirado.')
    } finally { setBusy(false) }
  }

  return <main style={shell}><section style={card}>
    <div style={{display:'flex',alignItems:'center',gap:9,color:'#0f766e'}}><KeyRound size={22}/><span style={{fontSize:11,fontWeight:900,letterSpacing:'.16em'}}>ATIVAÇÃO DE ACESSO</span></div>
    <h1 style={{fontSize:32,margin:'12px 0 8px'}}>Finalize seu cadastro</h1>
    <p style={{color:'#667975',lineHeight:1.7,fontSize:14}}>O administrador criou seu acesso. Digite o código de uso único enviado para o seu e-mail e defina sua senha pessoal.</p>
    <form onSubmit={finish}>
      <label style={label}>E-mail do convite<input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com"/></label>
      <label style={label}>Código recebido<input style={{...input,letterSpacing:'.25em',fontSize:20,fontWeight:900}} inputMode="numeric" maxLength={8} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000"/></label>
      <label style={label}>Seu nome<input style={input} value={nome} onChange={e=>setNome(e.target.value)} autoComplete="name" placeholder="Nome completo"/></label>
      <label style={label}>Nova senha<input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo de 6 caracteres"/></label>
      <label style={label}>Confirmar senha<input style={input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repita a senha"/></label>
      {error&&<div style={{...msg,background:'#fff3f3',borderColor:'#f0c8c8',color:'#a83a3a'}} role="alert">{error}</div>}
      {message&&<div style={msg} role="status">{message}</div>}
      <button style={{...button,marginTop:16,opacity:busy?.7:1}} disabled={busy} type="submit"><ShieldCheck size={17}/>{busy?'Validando…':'Validar código e concluir cadastro'}</button>
    </form>
    <button type="button" onClick={()=>void sendAgain()} disabled={busy} style={{display:'block',margin:'16px auto 0',border:0,background:'transparent',color:'#0f766e',fontWeight:900,cursor:'pointer',fontSize:12}}>Não recebeu? Enviar outro código</button>
    <a href="/login" style={{display:'block',marginTop:16,textAlign:'center',color:'#56736d',fontSize:12}}>Voltar ao login</a>
  </section></main>
}
