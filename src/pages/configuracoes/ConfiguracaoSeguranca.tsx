/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: MFA TOTP da sessão atual, alteração da própria senha, tratamento de sessão e limites explícitos das ações disponíveis.
 * Não validado nesta revisão: MFA real no projeto Supabase, type-check/build, política de senha e testes em navegador.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { KeyRound, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type TotpFactor = { id: string; status: string; friendly_name?: string | null }
const control = 'h-[30px] w-full rounded-[2px] border border-[#CFE1E7] bg-white px-2 text-[10px] text-[#123B50] outline-none focus:border-[#2D8DB8]'
const button = 'inline-flex h-[30px] items-center justify-center gap-2 rounded-[2px] border border-[#CFE1E7] bg-white px-2 text-[9px] font-bold text-[#123B50] disabled:opacity-50'
const primary = 'inline-flex h-[30px] items-center justify-center gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[9px] font-bold text-white disabled:opacity-50'

export default function ConfiguracaoSeguranca() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [factor, setFactor] = useState<TotpFactor | null>(null)
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [aal, setAal] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [{ data: authData, error: authError }, { data: aalData, error: aalError }, { data: factorsData, error: factorsError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ])
      if (authError) throw authError
      if (aalError) throw aalError
      if (factorsError) throw factorsError
      if (!authData.user) throw new Error('Entre no sistema para gerenciar a segurança da sua conta.')
      setEmail(authData.user.email ?? 'E-mail não informado')
      setAal(aalData.currentLevel ?? null)
      const active = factorsData.totp.find(item => item.status === 'verified')
      setFactor(active ? { id: active.id, status: active.status, friendly_name: active.friendly_name } : null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a segurança da conta.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function enroll() {
    setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ERP Industrial' })
      if (enrollError) throw enrollError
      setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret)
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: data.id })
      if (challengeError) throw challengeError
      setChallengeId(challenge.id)
      setMessage('Escaneie o QR code no aplicativo autenticador e informe o código para confirmar.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a configuração de MFA.') }
    finally { setBusy(false) }
  }

  async function verifyMfa(event: FormEvent) {
    event.preventDefault()
    if (!factorId || !challengeId || !/^\d{6}$/.test(code)) { setError('Informe o código de seis dígitos do aplicativo autenticador.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
      if (verifyError) throw verifyError
      setQr(''); setSecret(''); setFactorId(''); setChallengeId(''); setCode('')
      setMessage('MFA ativado e verificado pela autenticação Supabase.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível validar o código MFA.') }
    finally { setBusy(false) }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (password.length < 12) { setError('Use uma senha com pelo menos 12 caracteres.'); return }
    if (password !== confirmPassword) { setError('A confirmação da senha não confere.'); return }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setPassword(''); setConfirmPassword('')
      setMessage('Senha da conta atualizada pelo Supabase Auth.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.') }
    finally { setBusy(false) }
  }

  async function signOutCurrent() {
    setBusy(true); setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
      navigate('/login', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível encerrar esta sessão.') }
    finally { setBusy(false) }
  }

  return <section className="space-y-2 text-[10px] text-slate-700">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] pb-2"><div><div className="text-[9px] font-bold uppercase tracking-wider text-[#176487]">SEGURANÇA / CONTA ATUAL</div><h2 className="mt-1 text-[15px] font-bold text-[#123B50]">Segurança e sessão</h2><p className="mt-1 text-[10px] text-slate-500">MFA, senha e encerramento da sessão deste navegador.</p></div><button type="button" className={button} onClick={() => void load()} disabled={loading || busy}><RefreshCw size={12}/>ATUALIZAR</button></header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-200 bg-red-50 p-2 text-[10px] text-red-800' : 'border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || message}</div>}
    {loading ? <div className="border border-[#CFE1E7] bg-white p-3">Consultando Supabase Auth…</div> : <>
      <article className="border border-[#CFE1E7] bg-white p-3"><div className="flex items-center gap-2 text-[#123B50]"><ShieldCheck size={15}/><h3 className="text-[11px] font-bold">Conta autenticada</h3></div><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-[9px] font-bold uppercase text-slate-500">Identidade</dt><dd className="mt-1 break-all">{email}</dd></div><div><dt className="text-[9px] font-bold uppercase text-slate-500">Nível de autenticação Supabase</dt><dd className="mt-1">{aal ?? 'Não informado'}</dd></div><div><dt className="text-[9px] font-bold uppercase text-slate-500">MFA TOTP</dt><dd className="mt-1">{factor ? 'ATIVADO' : 'NÃO CONFIGURADO'}</dd></div></dl>
      {!factor && !factorId && <button type="button" onClick={() => void enroll()} disabled={busy} className={primary + ' mt-3'}><ShieldCheck size={12}/>CONFIGURAR MFA</button>}
      {factor && <p className="mt-2 text-[9px] text-slate-500">Fator verificado: {factor.friendly_name || 'Aplicativo autenticador'}. A remoção de fatores e a gestão de MFA de outros usuários não são expostas nesta tela.</p>}
      {qr && <form onSubmit={verifyMfa} className="mt-3 grid gap-2 border-t border-[#E2EDF0] pt-3 sm:grid-cols-[160px_1fr]"><div>{qr.startsWith('data:image/') ? <img src={qr} alt="QR code para configurar MFA" className="h-36 w-36 border border-[#CFE1E7] p-1"/> : <p className="text-[9px]">QR code retornado pelo Supabase não está em formato de imagem.</p>}<p className="mt-1 break-all text-[9px] text-slate-500">Chave manual: {secret}</p></div><div className="max-w-[280px]"><label className="mb-1 block text-[9px] font-bold uppercase">Código de seis dígitos<input className={control} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required/></label><button className={primary} type="submit" disabled={busy || code.length !== 6}>VALIDAR E ATIVAR</button></div></form>}
      </article>
      <article className="border border-[#CFE1E7] bg-white p-3"><div className="flex items-center gap-2 text-[#123B50]"><KeyRound size={15}/><h3 className="text-[11px] font-bold">Alterar senha da conta atual</h3></div><form onSubmit={changePassword} className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-[9px] font-bold uppercase">Nova senha<input className={control} type="password" autoComplete="new-password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} required/></label><label className="text-[9px] font-bold uppercase">Confirmar nova senha<input className={control} type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required/></label><div className="sm:col-span-2"><button type="submit" className={primary} disabled={busy}>ATUALIZAR SENHA</button></div></form><p className="mt-2 text-[9px] text-slate-500">A atualização é feita no Supabase Auth; esta tela não altera a senha de outros usuários nem substitui políticas de senha configuradas no provedor.</p></article>
      <article className="flex flex-wrap items-center justify-between gap-3 border border-[#CFE1E7] bg-[#F4FBFD] p-3"><div><div className="flex items-center gap-2 text-[#123B50]"><LogOut size={15}/><h3 className="text-[11px] font-bold">Encerrar sessão deste navegador</h3></div><p className="mt-1 text-[9px] text-slate-500">Encerra a sessão local atual; não revoga remotamente todos os dispositivos da conta.</p></div><button type="button" className={button} disabled={busy} onClick={() => void signOutCurrent()}>SAIR DESTA SESSÃO</button></article>
    </>}
  </section>
}
