/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-ATIVAR-ACESSO-OPERADOR-20261102-01 — ativação do convite recebido por e-mail na branch de produção
 * @STATUS_APROVACAO: PENDENTE DE VALIDAÇÃO VISUAL DO PROPRIETÁRIO NO PREVIEW (tela nova, sem revisão anterior)
 *
 * A função erp-user-admin já enviava o código para o e-mail do convidado com
 * emailRedirectTo = <origem>/ativar-acesso, mas essa rota não existia nesta branch: o link do convite
 * abria uma tela vazia e o aviso de Usuários ("o usuário conclui o cadastro em /ativar-acesso")
 * apontava para um endereço morto. Regras de senha idênticas à função (12 caracteres, maiúscula,
 * minúscula, número e símbolo) — a versão anterior pedia 6 e o servidor rejeitava depois do envio.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, RefreshCw, ShieldCheck, UserRound } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

const field = 'h-[42px] w-full min-w-0 rounded-[3px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label = 'mt-3 flex flex-col gap-1 text-[11px] font-black uppercase text-slate-500'

// Espelha passwordIsStrong() de supabase/functions/erp-user-admin/index.ts.
function passwordAccepted(value: string) {
  return value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
}

export default function AtivarAcesso() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [nome, setNome] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function sendAgain() {
    setError(''); setMessage('')
    if (!supabaseConfigurado) { setError('O ambiente Supabase não está configurado neste deploy.'); return }
    if (!email.includes('@')) { setError('Informe o mesmo e-mail usado no convite.'); return }
    setBusy(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } })
      if (otpError) throw otpError
      setSent(true)
      setMessage('Novo código enviado para o e-mail do convite. Verifique a caixa de entrada e o spam.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar outro código.')
    } finally {
      setBusy(false)
    }
  }

  async function finish(event: { preventDefault: () => void }) {
    event.preventDefault(); setError(''); setMessage('')
    if (!supabaseConfigurado) { setError('O ambiente Supabase não está configurado neste deploy.'); return }
    if (!email.includes('@') || !/^\d{6,8}$/.test(code.trim())) { setError('Informe o e-mail do convite e o código de 6 a 8 dígitos recebido.'); return }
    if (nome.trim().length < 3) { setError('Informe seu nome completo como consta no RH.'); return }
    if (!passwordAccepted(password)) { setError('A senha precisa ter ao menos 12 caracteres, com letra maiúscula, minúscula, número e símbolo.'); return }
    if (password !== confirm) { setError('A confirmação da senha não confere.'); return }
    setBusy(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
      if (verifyError) throw verifyError
      const { data, error: invokeError } = await supabase.functions.invoke('erp-user-admin', { body: { action: 'finalize_invite', nome: nome.trim(), password } })
      if (invokeError) throw invokeError
      if (!data?.ok) throw new Error(String(data?.error || 'A função de usuários não confirmou a conclusão do cadastro.'))

      // Para onde o convidado vai depois de ativar: o mesmo perfil que a tela de login oficial consulta.
      const { data: sessionData } = await supabase.auth.getUser()
      const userId = sessionData.user?.id ?? ''
      let destino = '/pageprincipal'
      if (userId) {
        const { data: profile } = await supabase.from('erp_usuarios')
          .select('perfil')
          .eq('auth_user_id', userId)
          .maybeSingle()
        if (String(profile?.perfil ?? '').toUpperCase() === 'OPERADOR_FABRIL') destino = '/pageprincipal/chao-de-fabrica/portal-operador'
      }
      setMessage('Código validado e senha gravada. Abrindo o sistema…')
      window.setTimeout(() => navigate(destino, { replace: true }), 700)
    } catch (cause) {
      await supabase.auth.signOut().catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Código inválido, expirado ou convite já utilizado.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#F4FBFD] px-4 py-10 text-slate-900">
    <div className="mx-auto w-full max-w-[560px]">
      <section className="border border-[#C8E3EE] bg-white shadow-[0_3px_12px_rgba(18,59,80,.06)]">
        <header className="flex items-center gap-3 border-b border-[#C8E3EE] bg-[#EAF6FA] px-5 py-4">
          <span className="grid h-11 w-11 place-items-center border border-[#C8E3EE] bg-white text-[#2D8DB8]"><KeyRound size={22} /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#2D8DB8]">SYSNQRA ERP · Ativação de acesso</p>
            <h1 className="text-lg font-black leading-snug text-[#123B50]">Finalize seu cadastro</h1>
          </div>
        </header>

        <div className="px-5 py-4 text-sm leading-relaxed text-slate-600">
          <p>O administrador criou seu acesso e o Supabase enviou um <strong>código de uso único</strong> para o seu e-mail. Digite o código abaixo e defina sua senha pessoal; sem esse passo o cadastro fica inativo e você não entra no sistema.</p>
          <p className="mt-2 text-xs font-bold text-amber-800">O convite expira em 15 minutos (coluna <code>expira_em</code> de <code>erp_convites_acesso</code>). Se o prazo passou, use "Enviar outro código" ou peça um novo convite ao administrador.</p>
          {sent && <p className="mt-2 text-xs font-bold text-emerald-800">Código reenviado. Se não chegar em alguns minutos, confira o spam ou peça ao administrador para reenviar o convite.</p>}
        </div>

        <form className="space-y-1 px-5 pb-5" onSubmit={event => { void finish(event) }}>
          <label className={label}>E-mail do convite
            <span className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={field + ' pl-9'} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="voce@empresa.com" required />
            </span>
          </label>
          <label className={label}>Código recebido no e-mail
            <input className={field + ' tracking-[.3em] text-center text-base font-black'} inputMode="numeric" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
          </label>
          <label className={label}>Seu nome
            <span className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={field + ' pl-9'} value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" placeholder="Nome completo" required />
            </span>
          </label>
          <label className={label}>Nova senha
            <input className={field} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo" required />
          </label>
          <label className={label}>Confirmar senha
            <input className={field} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repita a senha" required />
          </label>

          {error && <div role="alert" className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</div>}
          {message && <div role="status" className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div>}

          <button type="submit" disabled={busy} className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[3px] border border-[#2D8DB8] bg-[#2D8DB8] px-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {busy ? 'Validando…' : 'Validar código e concluir cadastro'}
          </button>
          <button type="button" onClick={() => void sendAgain()} disabled={busy} className="mt-3 w-full text-center text-xs font-black text-[#2D8DB8] hover:underline">Não recebeu? Enviar outro código</button>
          <a href="/login" className="mt-4 flex items-center justify-center gap-2 border-t border-slate-200 pt-4 text-xs font-bold text-slate-500 hover:text-[#123B50]"><ArrowLeft size={14} /> Voltar ao login</a>
        </form>
      </section>
      <p className="mt-4 px-1 text-[11px] leading-relaxed text-slate-500">O código é emitido pelo Supabase Auth e só vale para o e-mail convidado. A senha é gravada pela função <code>erp-user-admin</code>, que habilita o cadastro na empresa; nada aqui é validado apenas no navegador.</p>
    </div>
  </main>
}
