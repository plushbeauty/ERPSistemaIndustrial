/**
 * @DATA_REVISAO: 2026-10-18
 * @ESCOPO: Cadastro público de empresa — ajuste visual e responsivo
 * @STATUS: PARCIAL — contrato da Edge Function requer homologação de segurança.
 */
import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  UserPlus,
  Package,
  ShieldCheck,
  KeyRound,
  Globe,
  HelpCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import InfrastructureTrust from '../components/InfrastructureTrust'

interface SuccessData {
  empresa: string
  acesso: string
  email: string
}

const formatDocumento = (value: string, tipo: 'CNPJ' | 'CPF') => {
  const digits = value.replace(/\D/g, '')
  if (tipo === 'CNPJ') {
    return digits.slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  return digits.slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const firstName = (value: string) => value.trim().replace(/\s+/g, ' ').split(' ')[0] || ''
const plans: Record<string, string> = {
  essencial: 'Essencial',
  profissional: 'Profissional',
  diamante: 'Diamante',
}
const prices: Record<string, string> = {
  essencial: 'R$ 199/mês',
  profissional: 'R$ 349/mês',
  diamante: 'R$ 549/mês',
}
const inputClass =
  'h-8 w-full min-w-0 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const labelClass = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500'

export default function CadastroEmpresa() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const plan = params.get('plano') || ''
  const module = params.get('modulo') || ''

  const [razao, setRazao] = useState('')
  const [fantasia, setFantasia] = useState('')
  const [documento, setDocumento] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState<SuccessData | null>(null)

  const acesso = useMemo(() => firstName(fantasia || razao), [fantasia, razao])

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const doc = documento.replace(/\D/g, '')

    if ((tipoDocumento === 'CNPJ' && doc.length !== 14) || (tipoDocumento === 'CPF' && doc.length !== 11)) {
      setError(`Informe um ${tipoDocumento} válido com todos os dígitos.`)
      return
    }
    if (senha.length < 8) {
      setError('A senha deve possuir pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirm) {
      setError('A confirmação da senha não confere.')
      return
    }

    setLoading(true)
    try {
      // Preserve o contrato atual da Edge Function; provisionamento privilegiado permanece no servidor.
      const { data, error: invokeError } = await supabase.functions.invoke('erp-company-signup', {
        body: {
          razao_social: razao.trim(),
          nome_fantasia: fantasia.trim(),
          documento: doc,
          tipo_documento: tipoDocumento,
          email: email.trim().toLowerCase(),
          nome_admin: nome.trim(),
          nome_acesso: acesso,
          senha,
          plano: plan || null,
          modulo: module || null,
        },
      })

      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível concluir o provisionamento.')

      setOk({
        empresa: data.empresa?.nome_fantasia || fantasia.trim(),
        acesso: data.login_nome || acesso,
        email: data.email || email.trim().toLowerCase(),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir o provisionamento.')
    } finally {
      setLoading(false)
    }
  }

  if (ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans antialiased text-[#123B50]">
        <section className="w-full max-w-[500px] space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div className="space-y-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-700">Cadastro concluído</span>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Ambiente cadastrado</h1>
            <p className="text-[11px] font-medium leading-relaxed text-slate-500">
              A solicitação de criação da empresa e do administrador inicial foi concluída.
            </p>
          </div>
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-left font-mono text-[10px]">
            <div>
              <span className="text-slate-400">NOME DE ACESSO: </span>
              <strong className="text-xs font-black text-sky-800">{ok.acesso}</strong>
            </div>
            <div><span className="text-slate-400">EMPRESA: </span><strong className="text-slate-700">{ok.empresa}</strong></div>
            <div><span className="text-slate-400">E-MAIL ADMIN: </span><strong className="break-all text-slate-700">{ok.email}</strong></div>
          </div>
          <a className="flex h-9 w-full items-center justify-center rounded bg-teal-700 text-[10px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-teal-800" href="/login">
            Entrar no sistema ERP
          </a>
          <a className="flex h-8 w-full items-center justify-center rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-500" href="/">
            Voltar ao portal
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-3 font-sans antialiased text-[#123B50] sm:p-4">
      <div className="grid w-full max-w-[1100px] grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl lg:grid-cols-12">
        <section className="relative flex flex-col justify-between overflow-hidden border-b border-slate-700 bg-[#123B50] p-5 text-white sm:p-6 lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="relative z-10 space-y-5">
            <img src="/logo/logo.png" alt="SYSNQRA ERP" className="h-8 max-w-full object-contain object-left" />
            <div className="space-y-1.5">
              <span className="block text-[9px] font-black uppercase tracking-widest text-cyan-300">Ambiente industrial multiempresa</span>
              <h1 className="text-xl font-black leading-tight tracking-tight">Cadastro de empresa e administrador</h1>
              <p className="text-[11px] font-medium leading-relaxed text-cyan-50/80">
                Informe os dados da organização e do primeiro administrador para solicitar a criação do ambiente ERP.
              </p>
            </div>
          </div>
          <div className="relative z-10 grid gap-2 pt-6 font-mono text-[9px] font-bold uppercase tracking-wide text-cyan-100/80">
            <div className="flex items-center gap-1.5"><ShieldCheck size={13} /> Políticas de acesso no servidor</div>
            <div className="flex items-center gap-1.5"><Globe size={13} /> Cadastro de organização</div>
            <div className="flex items-center gap-1.5"><KeyRound size={13} /> Primeiro administrador</div>
          </div>
        </section>

        <section className="min-w-0 space-y-4 p-4 sm:p-6 lg:col-span-8">
          <InfrastructureTrust />
          <header className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <a className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50" href="/planos">
              <ArrowLeft size={11} /> Voltar
            </a>
            <a className="inline-flex h-7 items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 text-[10px] font-black text-sky-700" href="/ajuda/cadastro-empresa" target="_blank" rel="noreferrer">
              <HelpCircle size={11} /> POP técnico
            </a>
          </header>

          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Novo cliente</span>
            <h2 className="text-base font-black tracking-tight text-slate-800">Cadastre sua empresa</h2>
            <p className="text-[11px] font-medium text-slate-500">Crie a solicitação do ambiente e do primeiro acesso administrativo.</p>
          </div>

          {(plan || module) && (
            <div className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 p-3">
              <div className="flex min-w-0 items-start gap-2">
                <Package size={18} className="mt-0.5 shrink-0 text-sky-700" />
                <div className="min-w-0 space-y-0.5">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Seleção recebida pelo link</span>
                  <strong className="block break-words text-[11px] font-bold uppercase tracking-wide text-slate-800">
                    {plan ? (plans[plan] || plan) + (prices[plan] ? ' • ' + prices[plan] : '') : 'Plano não especificado'}
                  </strong>
                  {module && <span className="block break-words text-[9px] text-slate-500">Módulo solicitado: {module}</span>}
                </div>
              </div>
            </div>
          )}

          {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-[10px] font-bold text-red-800" role="alert">{error}</div>}

          <form onSubmit={cadastrar} className="space-y-4">
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
                <Building2 size={12} /> 1. Dados da empresa
              </h3>
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                <label className={labelClass + ' md:col-span-7'}>
                  Razão social jurídica *
                  <input value={razao} onChange={(event) => setRazao(event.target.value)} className={inputClass} autoComplete="organization" maxLength={200} required />
                </label>
                <label className={labelClass + ' md:col-span-5'}>
                  Nome fantasia *
                  <input value={fantasia} onChange={(event) => setFantasia(event.target.value)} className={inputClass} autoComplete="organization" maxLength={120} required />
                </label>
                <label className={labelClass + ' md:col-span-4'}>
                  Tipo de documento
                  <select value={tipoDocumento} onChange={(event) => { setTipoDocumento(event.target.value as 'CNPJ' | 'CPF'); setDocumento('') }} className={inputClass}>
                    <option value="CNPJ">CNPJ — empresa</option>
                    <option value="CPF">CPF — profissional</option>
                  </select>
                </label>
                <label className={labelClass + ' md:col-span-5'}>
                  {tipoDocumento} *
                  <input value={documento} onChange={(event) => setDocumento(formatDocumento(event.target.value, tipoDocumento))} className={inputClass + ' font-mono'} autoComplete="off" inputMode="numeric" placeholder={tipoDocumento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'} required />
                </label>
                <div className="grid min-w-0 gap-1 md:col-span-3">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Nome de acesso</span>
                  <div className="flex h-8 min-w-0 items-center rounded border border-slate-200 bg-slate-50 px-2.5 font-mono text-[11px] font-bold text-slate-600">
                    <span className="truncate">{acesso || 'Aguardando nome'}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
                <UserPlus size={12} /> 2. Primeiro administrador
              </h3>
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                <label className={labelClass + ' md:col-span-6'}>
                  Nome completo *
                  <input value={nome} onChange={(event) => setNome(event.target.value)} className={inputClass} autoComplete="name" maxLength={160} required />
                </label>
                <label className={labelClass + ' md:col-span-6'}>
                  E-mail corporativo *
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass + ' font-mono'} autoComplete="email" maxLength={254} required />
                </label>
                <label className={labelClass + ' md:col-span-6'}>
                  Criar senha *
                  <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={128} required />
                  <span className="text-[9px] font-medium normal-case text-slate-400">Mínimo de 8 caracteres.</span>
                </label>
                <label className={labelClass + ' md:col-span-6'}>
                  Confirmar senha *
                  <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={128} required />
                </label>
              </div>
            </section>

            <button type="submit" disabled={loading} className="flex h-9 w-full items-center justify-center rounded bg-teal-700 px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Provisionando ambiente…' : 'Criar empresa e acesso administrativo'}
            </button>
            <p className="text-center text-[9px] font-medium leading-relaxed text-slate-400">
              O provisionamento é executado pela Edge Function do servidor. Não conceda nem compartilhe credenciais administrativas.
            </p>
          </form>
          <small className="block text-right font-mono text-[8px] uppercase tracking-wider text-slate-300">SYSNQRA · Onboarding industrial · 2026</small>
        </section>
      </div>
    </main>
  )
}
