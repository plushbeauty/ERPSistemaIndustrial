/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 18/10/2026
 * ID da Revisão: REV-055
 * Alterações: layout compacto responsivo e validação de senha alinhada à Edge Function.
 * Segurança: timestamp de aceite persistido exclusivamente pela Edge Function após OTP e convite válidos.
 * Validação: pendente dos checks do repositório e teste integrado Supabase.
 * =========================================================================
 */
import { FormEvent, useState } from 'react'
import { AlertTriangle, ArrowLeft, KeyRound, LockKeyhole, Mail, RefreshCw, ShieldCheck, User } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

export default function AtivarAcesso() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [nome, setNome] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function sendAgain() {
    setError('')
    setMessage('')
    if (!supabaseConfigurado) return setError('Ambiente Supabase não configurado.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Informe o mesmo e-mail usado no convite.')
    setBusy(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      })
      if (otpError) throw otpError
      setMessage('Novo código enviado. Verifique sua caixa de entrada e a pasta de spam.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível reenviar o código.')
    } finally {
      setBusy(false)
    }
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabaseConfigurado) return setError('Ambiente Supabase não configurado.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !/^\d{6,8}$/.test(code.trim())) {
      return setError('Informe o e-mail do convite e o código numérico recebido.')
    }
    if (nome.trim().length < 3) return setError('Informe seu nome completo.')
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return setError('A senha deve ter 12 caracteres ou mais e incluir maiúscula, minúscula, número e símbolo.')
    }
    if (password !== confirm) return setError('A confirmação da senha não confere.')

    setBusy(true)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      })
      if (otpError) throw otpError

      const { data, error: functionError } = await supabase.functions.invoke('erp-user-admin', {
        body: { action: 'finalize_invite', nome: nome.trim(), password },
      })
      if (functionError) throw functionError
      if (!data?.ok) throw new Error(String(data?.error || 'Não foi possível concluir o cadastro.'))

      setMessage('Acesso ativado com sucesso. Abrindo o sistema…')
      window.setTimeout(() => window.location.replace('/erp-industrial'), 600)
    } catch (cause) {
      await supabase.auth.signOut().catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Código inválido ou convite expirado.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'h-8 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:opacity-60'
  const labelClass = 'mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-600'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4FBFD] px-4 py-6 font-sans antialiased text-[#123B50]">
      <section className="w-full max-w-[520px] space-y-4 rounded-[3px] border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
        <header className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#167A91]">
            <KeyRound size={18} />
            <span className="text-[10px] font-black uppercase tracking-[.14em]">Ativação de credenciais</span>
          </div>
          <span className="font-mono text-[9px] font-bold text-slate-400">ERP INDUSTRIAL</span>
        </header>

        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tight text-[#123B50]">Finalize seu acesso</h1>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Use o código temporário enviado ao e-mail do convite para validar sua identidade e cadastrar uma senha pessoal.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[2px] border border-red-200 bg-red-50 p-2 text-[10px] font-semibold text-red-800" role="alert">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && <div className="rounded-[2px] border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800" role="status">{message}</div>}

        <form onSubmit={finish} className="grid grid-cols-1 items-end gap-x-3 gap-y-3 sm:grid-cols-12">
          <div className="sm:col-span-12">
            <label className={labelClass}><Mail size={11} /> E-mail corporativo do convite</label>
            <input className={fieldClass} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="voce@empresa.com.br" required disabled={busy} />
          </div>
          <div className="sm:col-span-4">
            <label className={labelClass}>Código OTP</label>
            <input className={fieldClass + ' text-center font-mono font-black tracking-[.2em]'} inputMode="numeric" maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" autoComplete="one-time-code" required disabled={busy} />
          </div>
          <div className="sm:col-span-8">
            <label className={labelClass}><User size={11} /> Nome completo</label>
            <input className={fieldClass} value={nome} onChange={event => setNome(event.target.value)} autoComplete="name" placeholder="Nome completo do funcionário" required disabled={busy} />
          </div>
          <div className="sm:col-span-6">
            <label className={labelClass}><LockKeyhole size={11} /> Definir senha</label>
            <input className={fieldClass} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="12+ caracteres, com símbolo" minLength={12} required disabled={busy} />
          </div>
          <div className="sm:col-span-6">
            <label className={labelClass}>Confirmar senha</label>
            <input className={fieldClass} type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" placeholder="Repita a senha" minLength={12} required disabled={busy} />
          </div>
          <div className="pt-1 sm:col-span-12">
            <button className="flex h-9 w-full items-center justify-center gap-2 rounded-[2px] bg-[#167A91] px-3 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-[#123B50] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} type="submit">
              <ShieldCheck size={14} /> {busy ? 'Validando código e convite…' : 'Validar acesso e concluir'}
            </button>
          </div>
        </form>

        <footer className="space-y-3 border-t border-slate-100 pt-3 text-center">
          <button type="button" onClick={() => void sendAgain()} disabled={busy} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#167A91] transition hover:text-[#123B50] disabled:opacity-50">
            <RefreshCw size={11} className={busy ? 'animate-spin' : ''} /> Não recebeu? Reenviar código
          </button>
          <a href="/login" className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#123B50]">
            <ArrowLeft size={11} /> Voltar ao login
          </a>
        </footer>
      </section>
    </main>
  )
}
