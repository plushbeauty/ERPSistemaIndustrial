import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Factory, LoaderCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { planosErp, planoPorChave, precoFormatado, type ErpPlano } from '../config/planosPublicos'

type DocumentoTipo = 'CNPJ' | 'CPF'
type FormValues = {
  razao_social: string
  nome_fantasia: string
  tipo_documento: DocumentoTipo
  documento: string
  email: string
  nome_admin: string
  nome_acesso: string
  senha: string
}
type SignupResponse = {
  ok?: boolean
  error?: string
  empresa?: { id: string; nome_fantasia: string; razao_social: string }
  login_nome?: string
  email?: string
  trial_ends_at?: string
  plano?: string
}

const initialForm: FormValues = {
  razao_social: '',
  nome_fantasia: '',
  tipo_documento: 'CNPJ',
  documento: '',
  email: '',
  nome_admin: '',
  nome_acesso: '',
  senha: '',
}

const digits = (value: string) => value.replace(/\D/g, '')

function validCpf(value: string) {
  const cpf = digits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const check = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return (remainder === 10 ? 0 : remainder) === Number(cpf[length])
  }
  return check(9) && check(10)
}

function validCnpj(value: string) {
  const cnpj = digits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const check = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = cnpj.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0)
    const remainder = sum % 11
    return (remainder < 2 ? 0 : 11 - remainder) === Number(cnpj[length])
  }
  return check(12) && check(13)
}

function formatTrialDate(value?: string) {
  if (!value) return '15 dias após a ativação'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '15 dias após a ativação' : date.toLocaleDateString('pt-BR')
}

function PlanSummary({ plan }: { plan: ErpPlano }) {
  return (
    <section className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black tracking-[.18em] text-cyan-100">{plan.selo}</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold">15 dias de avaliação</span>
      </div>
      <h2 className="mt-3 text-2xl font-black">{plan.nome}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-200">{plan.descricao}</p>
      <p className="mt-4 text-2xl font-black">{plan.precoMensal === null ? 'Sob consulta' : precoFormatado(plan.precoMensal)}{plan.precoMensal !== null && <span className="ml-1 text-xs font-semibold text-slate-300">/ mês</span>}</p>
      <ul className="mt-4 space-y-2">
        {plan.recursos.map(resource => <li key={resource} className="flex gap-2 text-xs leading-5 text-slate-100"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan-200"/><span>{resource}</span></li>)}
      </ul>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-[10px] text-slate-200">
        <span><b className="block text-sm text-white">{plan.limites.usuarios}</b>Usuários</span>
        <span><b className="block text-sm text-white">{plan.limites.empresas}</b>Empresas</span>
        <span><b className="block text-sm text-white">15 dias</b>Avaliação</span>
      </div>
    </section>
  )
}

export default function CadastroEmpresa() {
  const initialPlan = new URLSearchParams(window.location.search).get('plano')
  const [planKey, setPlanKey] = useState(() => planoPorChave(initialPlan)?.chave ?? 'start')
  const [form, setForm] = useState<FormValues>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SignupResponse | null>(null)
  const plan = planoPorChave(planKey) ?? planosErp[0]

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const documentValid = form.tipo_documento === 'CNPJ' ? validCnpj(form.documento) : validCpf(form.documento)
    if (!documentValid) {
      setError(`Informe um ${form.tipo_documento} válido.`)
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    if (form.senha.length < 8) {
      setError('A senha deve possuir pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<SignupResponse>('erp-company-signup', {
        body: {
          ...form,
          documento: digits(form.documento),
          email: form.email.trim().toLowerCase(),
          plano: plan.chave,
        },
      })
      if (invokeError) throw invokeError
      if (!data?.ok || !data.empresa) throw new Error(data?.error || 'Não foi possível concluir o cadastro.')
      setSuccess(data)
      setForm(current => ({ ...current, senha: '' }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao cadastrar a empresa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success?.empresa) {
    return (
      <main className="min-h-screen bg-[#F4FBFD] px-4 py-10 text-[#123B50]">
        <section className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={28}/></span>
          <p className="mt-5 text-[10px] font-black tracking-[.18em] text-emerald-700">CADASTRO CONCLUÍDO</p>
          <h1 className="mt-2 text-2xl font-black">Sua empresa está pronta para começar.</h1>
          <p className="mt-3 text-sm text-slate-600">{success.empresa.nome_fantasia} foi cadastrada no plano {plan.nome}.</p>
          <p className="mt-2 text-sm text-slate-600">Avaliação disponível até <b>{formatTrialDate(success.trial_ends_at)}</b>.</p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p><b>Login:</b> {success.login_nome || form.nome_acesso || form.email}</p>
            <p className="mt-1"><b>E-mail:</b> {success.email || form.email}</p>
          </div>
          <a href="/login" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#123B50] px-6 text-sm font-bold text-white">Entrar no SYSNQRA <ArrowRight size={16}/></a>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] px-4 py-8 text-[#123B50]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-3xl bg-[#102F42] p-6 shadow-2xl shadow-slate-900/10 sm:p-8">
          <a href="/" className="inline-flex items-center gap-2 text-xs font-bold text-cyan-100 hover:text-white"><ArrowLeft size={15}/> Voltar ao site</a>
          <div className="mt-8 flex items-center gap-3 text-cyan-100"><Factory size={22}/><span className="text-[10px] font-black tracking-[.2em]">SYSNQRA ERP INDUSTRIAL</span></div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white">Comece a organizar sua operação industrial.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">Cadastre sua empresa e o primeiro usuário administrador. O ambiente será criado com isolamento por empresa e acesso autenticado.</p>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-5 text-slate-100"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-200"/><span>O cadastro cria uma empresa e um usuário administrador. Os dados operacionais permanecem protegidos pelas permissões e políticas do ERP.</span></div>
          <div className="mt-6">
            <label htmlFor="plan" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-cyan-100">Plano comercial</label>
            <select id="plan" value={planKey} onChange={event => setPlanKey(event.target.value as ErpPlano['chave'])} className="h-11 w-full rounded-xl border border-white/20 bg-[#173E52] px-3 text-sm font-bold text-white outline-none focus:border-cyan-200">
              {planosErp.map(item => <option key={item.chave} value={item.chave}>{item.nome} — {item.precoMensal === null ? 'Sob consulta' : precoFormatado(item.precoMensal) + '/mês'}</option>)}
            </select>
          </div>
          <div className="mt-5"><PlanSummary plan={plan}/></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-6"><p className="text-[10px] font-black tracking-[.18em] text-[#2D8DB8]">NOVO AMBIENTE</p><h2 className="mt-2 text-2xl font-black">Dados da empresa e administrador</h2><p className="mt-2 text-xs leading-5 text-slate-500">Preencha os dados para criar o tenant e o acesso inicial.</p></div>
          <form onSubmit={event => void submit(event)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Razão social" value={form.razao_social} onChange={value => update('razao_social', value)} required/>
              <Field label="Nome fantasia" value={form.nome_fantasia} onChange={value => update('nome_fantasia', value)} required/>
            </div>
            <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
              <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-600">Documento</span><select value={form.tipo_documento} onChange={event => update('tipo_documento', event.target.value as DocumentoTipo)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2D8DB8]"><option value="CNPJ">CNPJ</option><option value="CPF">CPF</option></select></label>
              <Field label={form.tipo_documento} value={form.documento} onChange={value => update('documento', value)} required inputMode="numeric" maxLength={18}/>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do administrador" value={form.nome_admin} onChange={value => update('nome_admin', value)} required/>
              <Field label="Nome de acesso (opcional)" value={form.nome_acesso} onChange={value => update('nome_acesso', value)} />
            </div>
            <Field label="E-mail de acesso" value={form.email} onChange={value => update('email', value)} required type="email"/>
            <Field label="Senha (mínimo 8 caracteres)" value={form.senha} onChange={value => update('senha', value)} required type="password" minLength={8}/>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123B50] px-5 text-sm font-black text-white transition hover:bg-[#1D5F7D] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><LoaderCircle size={17} className="animate-spin"/> Criando ambiente...</> : <>Criar empresa e iniciar avaliação <ArrowRight size={17}/></>}</button>
            <p className="text-center text-[10px] leading-5 text-slate-500">Ao continuar, você confirma que os dados informados são verdadeiros e autoriza a criação do ambiente empresarial.</p>
          </form>
        </section>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, required = false, type = 'text', inputMode, maxLength, minLength }: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'search' | 'url' | 'none' | 'decimal'
  maxLength?: number
  minLength?: number
}) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} required={required} inputMode={inputMode} maxLength={maxLength} minLength={minLength} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/10"/></label>
}
