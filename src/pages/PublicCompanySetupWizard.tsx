/**
 * SYNQRA ERP INDUSTRIAL — Cadastro e configuração inicial da empresa
 * @REVISAO 29/10/2026
 * Cadastro real via Edge Function existente; preferências persistidas após autenticação.
 * Nenhum usuário, empresa, módulo ou permissão fictícia é criado no navegador.
 */
import { useState, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Factory, Globe2, Building2,
  Boxes, ShieldCheck, AlertCircle, LoaderCircle, LockKeyhole,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type ModuleKey = 'compras' | 'estoque' | 'pcp' | 'qualidade' | 'financeiro' | 'rh' | 'vendas'
type ReadinessKey = 'produtos' | 'estruturas' | 'centros_trabalho' | 'capacidade' | 'rastreabilidade' | 'custos'
const moduleOptions: { id: ModuleKey; title: string; description: string; tone: string }[] = [
  { id: 'compras', title: 'Compras', description: 'Solicitações, cotações e pedidos', tone: 'border-orange-400/40 bg-orange-500/10' },
  { id: 'estoque', title: 'Estoque', description: 'Saldos, depósitos e rastreabilidade', tone: 'border-cyan-400/40 bg-cyan-500/10' },
  { id: 'pcp', title: 'PCP / Fabricação', description: 'Ordens, operações e capacidade', tone: 'border-violet-400/40 bg-violet-50' },
  { id: 'qualidade', title: 'Qualidade', description: 'Inspeções, RPNC e equipamentos', tone: 'border-rose-400/40 bg-rose-500/10' },
  { id: 'financeiro', title: 'Financeiro', description: 'Contas, caixa e custos', tone: 'border-emerald-400/40 bg-emerald-500/10' },
  { id: 'vendas', title: 'Vendas', description: 'Clientes e pedidos comerciais', tone: 'border-blue-400/40 bg-blue-500/10' },
  { id: 'rh', title: 'Recursos Humanos', description: 'Pessoas, treinamentos e ponto', tone: 'border-amber-400/40 bg-amber-500/10' },
]
const readinessOptions: { id: ReadinessKey; title: string; description: string }[] = [
  { id: 'produtos', title: 'Produtos e unidades', description: 'Cadastro real de itens e unidades de medida' },
  { id: 'estruturas', title: 'Estruturas / fichas de processo', description: 'BOM, componentes, operações e sequência produtiva' },
  { id: 'centros_trabalho', title: 'Máquinas e centros de trabalho', description: 'Recursos, turnos e calendários' },
  { id: 'capacidade', title: 'Capacidade e planejamento', description: 'Tempos, disponibilidade e carga de produção' },
  { id: 'rastreabilidade', title: 'Lotes e qualidade', description: 'Rastreabilidade, inspeções e critérios de aceite' },
  { id: 'custos', title: 'Custos industriais', description: 'Centros de custo e parâmetros de apuração' },
]
const field = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
const label = 'text-xs font-bold uppercase tracking-[.12em] text-slate-600'
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'
const panel = 'rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.08)]'

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir o cadastro inicial.'
}

export default function PublicCompanySetupWizard() {
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [companyCreated, setCompanyCreated] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [fantasyName, setFantasyName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [accessName, setAccessName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [idioma, setIdioma] = useState('pt-BR')
  const [fusoHorario, setFusoHorario] = useState('America/Sao_Paulo')
  const [moeda, setMoeda] = useState('BRL')
  const [fiscalStart, setFiscalStart] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10))
  const [modules, setModules] = useState<ModuleKey[]>(['compras', 'estoque', 'pcp', 'qualidade'])
  const [readiness, setReadiness] = useState<ReadinessKey[]>(['produtos', 'estruturas', 'centros_trabalho', 'capacidade', 'rastreabilidade', 'custos'])

  const toggleModule = (id: ModuleKey) => setModules(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const toggleReadiness = (id: ReadinessKey) => setReadiness(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])

  const next = () => {
    setError('')
    if (step === 1) {
      if (companyName.trim().length < 3 || fantasyName.trim().length < 2) return setError('Informe a razão social e o nome fantasia da empresa.')
      if (cnpj.replace(/\D/g, '').length !== 14) return setError('Informe um CNPJ com 14 dígitos.')
      if (adminName.trim().length < 3) return setError('Informe o nome completo do administrador.')
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Informe um e-mail válido.')
      if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
      if (password !== passwordConfirm) return setError('A confirmação da senha não confere.')
    }
    if (step === 2 && !fiscalStart) return setError('Informe o início do exercício fiscal.')
    if (step === 3 && modules.length === 0) return setError('Selecione pelo menos um módulo prioritário.')
    setStep(current => Math.min(4, current + 1))
  }

  const savePreferences = async (userId: string) => {
    const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
    if (tenantError) throw tenantError
    if (typeof tenant !== 'string' || !tenant) throw new Error('Conta autenticada, mas a empresa não foi resolvida pela sessão. Entre novamente e retome a configuração.')
    const now = new Date().toISOString()
    const { error: saveError } = await supabase.from('erp_setup_configuracao').upsert({
      empresa_id: tenant,
      idioma,
      fuso_horario: fusoHorario,
      moeda,
      ano_fiscal_inicio: fiscalStart,
      modulos_planejados: modules,
      requisitos_industriais: readiness,
      wizard_concluido_em: now,
      atualizado_por: userId,
      atualizado_em: now,
    }, { onConflict: 'empresa_id' })
    if (saveError) throw saveError
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!companyCreated) {
        const { data, error: signupError } = await supabase.functions.invoke('erp-company-signup', {
          body: {
            razao_social: companyName.trim(),
            nome_fantasia: fantasyName.trim(),
            documento: cnpj.replace(/\D/g, ''),
            tipo_documento: 'CNPJ',
            email: email.trim().toLowerCase(),
            nome_admin: adminName.trim(),
            senha: password,
            nome_acesso: accessName.trim(),
          },
        })
        if (signupError) throw signupError
        if (!data?.ok) throw new Error(String(data?.error || 'O serviço não confirmou a criação da empresa.'))
        setCompanyCreated(true)
        setNotice('Empresa e conta administrativa criadas. Autenticando e salvando as preferências iniciais…')
      }
      const normalizedEmail = email.trim().toLowerCase()
      const { data: login, error: loginError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (loginError) throw new Error('A empresa foi criada, mas não foi possível iniciar a sessão. Faça login com o e-mail cadastrado e retome em /setup-inicial.')
      if (!login.user) throw new Error('A autenticação não retornou um usuário válido.')
      try {
        await savePreferences(login.user.id)
      } catch (setupError) {
        setError('Empresa e usuário já foram criados e a sessão está ativa, mas as preferências não foram salvas. Confirme se a migration do Setup Wizard foi aplicada e tente novamente. Detalhe: ' + messageOf(setupError))
        setNotice('')
        return
      }
      setNotice('Cadastro empresarial e preferências iniciais salvos. Abrindo o workspace seguro…')
      window.location.replace('/pageprincipal')
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  const stepTitles = [
    { title: 'Empresa e administrador', subtitle: 'Dados reais da implantação', icon: Building2 },
    { title: 'Preferências regionais', subtitle: 'Idioma, moeda e exercício fiscal', icon: Globe2 },
    { title: 'Módulos prioritários', subtitle: 'Planejamento da implantação', icon: Boxes },
    { title: 'Preparação industrial', subtitle: 'Estruturas, máquinas e capacidade', icon: Factory },
  ]
  const pageTitle = companyCreated ? 'Concluir configuração inicial' : 'Configure seu ambiente industrial'

  return <main className="min-h-screen bg-[#f4fbfd] px-4 py-7 text-slate-900 md:px-8 md:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-orange-300"><Factory size={13}/> SYNQRA · ERP industrial</div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Um assistente de implantação com dados empresariais reais, isolamento por empresa e preferências persistidas no Supabase.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-400 text-white"><LockKeyhole size={22}/></div>
            <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cadastro protegido</div><div className="mt-1 text-sm font-extrabold text-slate-900">Supabase Auth + RLS</div><div className="mt-1 text-xs text-cyan-700">Sem dados de demonstração</div></div>
          </div>
        </div>
      </header>

      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600"/><span>{error}</span></div>}
      {notice && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-cyan-700"/><span>{notice}</span></div>}

      <form onSubmit={submit} className={panel + ' overflow-hidden'}>
        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-4 md:p-5">
          {stepTitles.map((item, index) => { const number = index + 1; const Icon = item.icon; const active = number === step; const passed = number < step; return <button key={item.title} type="button" onClick={() => { if (number <= step && !companyCreated) { setStep(number); setError('') } }} className={'flex items-center gap-3 rounded-xl border p-3 text-left transition ' + (active ? 'border-orange-400/60 bg-orange-400/10' : passed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white')}><span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (active ? 'bg-orange-400 text-white' : passed ? 'bg-emerald-400/15 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{passed ? <Check size={17}/> : <Icon size={17}/>}</span><span className="min-w-0"><strong className={'block text-xs ' + (active ? 'text-orange-700' : 'text-slate-800')}>{item.title}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-600">{item.subtitle}</small></span></button>})}
        </div>

        <div className="min-h-[390px] p-5 md:p-8">
          {step === 1 && <section><h2 className="text-xl font-extrabold text-slate-900">Dados da empresa e do administrador</h2><p className="mt-2 text-sm text-slate-600">Será criada uma empresa real e uma conta administrativa vinculada pelo serviço seguro do ERP.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><label className={label}>Razão social<input className={field} autoComplete="organization" value={companyName} onChange={e => setCompanyName(e.target.value)} required minLength={3} disabled={companyCreated}/></label><label className={label}>Nome fantasia<input className={field} value={fantasyName} onChange={e => setFantasyName(e.target.value)} required minLength={2} disabled={companyCreated}/></label><label className={label}>CNPJ<input className={field} inputMode="numeric" autoComplete="off" value={cnpj} onChange={e => setCnpj(e.target.value)} required maxLength={18} disabled={companyCreated}/></label><label className={label}>Nome completo do administrador<input className={field} autoComplete="name" value={adminName} onChange={e => setAdminName(e.target.value)} required minLength={3} disabled={companyCreated}/></label><label className={label}>E-mail de acesso<input className={field} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={companyCreated}/></label><label className={label}>Nome de acesso (opcional)<input className={field} autoComplete="username" value={accessName} onChange={e => setAccessName(e.target.value)} disabled={companyCreated}/></label><label className={label}>Senha (mínimo 8 caracteres)<input className={field} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required disabled={companyCreated}/></label><label className={label}>Confirmar senha<input className={field} type="password" autoComplete="new-password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength={8} required disabled={companyCreated}/></label></div></section>}

          {step === 2 && <section className="max-w-3xl"><h2 className="text-xl font-extrabold text-slate-900">Preferências regionais</h2><p className="mt-2 text-sm text-slate-600">Essas opções serão gravadas para a empresa depois da autenticação do administrador.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><label className={label}>Idioma<select className={field} value={idioma} onChange={e => setIdioma(e.target.value)}><option value="pt-BR">Português brasileiro (pt-BR)</option><option value="en-US">English (US)</option><option value="es">Español</option></select></label><label className={label}>Fuso horário<select className={field} value={fusoHorario} onChange={e => setFusoHorario(e.target.value)}><option value="America/Sao_Paulo">América/São Paulo</option><option value="America/Manaus">América/Manaus</option><option value="America/Belem">América/Belém</option><option value="UTC">UTC</option></select></label><label className={label}>Moeda principal<select className={field} value={moeda} onChange={e => setMoeda(e.target.value)}><option value="BRL">BRL — Real brasileiro</option><option value="USD">USD — Dólar americano</option><option value="EUR">EUR — Euro</option></select></label><label className={label}>Início do exercício fiscal<input className={field} type="date" value={fiscalStart} onChange={e => setFiscalStart(e.target.value)} required/></label></div><p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertCircle size={15} className="mr-2 inline"/> As preferências serão registradas; o assistente não reescreve lançamentos nem define impostos automaticamente.</p></section>}

          {step === 3 && <section><h2 className="text-xl font-extrabold text-slate-900">Módulos prioritários</h2><p className="mt-2 text-sm text-slate-600">Selecione as áreas que a implantação deve priorizar. A seleção não concede permissões nem ativa funcionalidades por conta própria.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{moduleOptions.map(item => { const checked = modules.includes(item.id); return <label key={item.id} className={'flex cursor-pointer gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 ' + item.tone + (checked ? ' ring-1 ring-orange-300/60' : ' opacity-75')}><input className="mt-1 h-4 w-4 accent-orange-400" type="checkbox" checked={checked} onChange={() => toggleModule(item.id)}/><span><strong className="block text-sm text-slate-900">{item.title}</strong><small className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</small></span></label>})}</div></section>}

          {step === 4 && <section><h2 className="text-xl font-extrabold text-slate-900">Preparação industrial</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">A implantação industrial exige estruturas de materiais, operações, centros de trabalho e capacidade, conectados ao estoque e à qualidade.</p><div className="mt-6 grid gap-3 md:grid-cols-2">{readinessOptions.map(item => { const checked = readiness.includes(item.id); return <label key={item.id} className={'flex cursor-pointer gap-3 rounded-xl border p-4 transition ' + (checked ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white')}><input className="mt-1 h-4 w-4 accent-orange-400" type="checkbox" checked={checked} onChange={() => toggleReadiness(item.id)}/><span><strong className="block text-sm text-slate-900">{item.title}</strong><small className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</small></span></label>})}</div><div className="mt-5 flex gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-cyan-700"/><p className="text-xs leading-5 text-slate-600">O usuário administrativo será criado pelo backend, associado à empresa e autenticado pelo Supabase. RLS controla o acesso aos dados da configuração.</p></div></section>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 md:px-8 md:py-5">
          <span className="text-xs text-slate-600">Etapa {step} de 4 · Configuração por empresa</span>
          <div className="flex gap-2">{step > 1 && !companyCreated && <button type="button" className={secondary} onClick={() => { setStep(value => value - 1); setError('') }} disabled={busy}><ArrowLeft size={16}/> Voltar</button>}{step < 4 && !companyCreated ? <button type="button" className={primary} onClick={next}>Continuar <ArrowRight size={16}/></button> : <button type="submit" className={primary} disabled={busy}>{busy ? <><LoaderCircle size={16} className="animate-spin"/> Processando…</> : <><CheckCircle2 size={16}/> {companyCreated ? 'Tentar concluir configuração' : 'Criar empresa e concluir'}</>}</button>}</div>
        </footer>
      </form>
      <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">SYNQRA ERP INDUSTRIAL · Onboarding seguro · 29/10/2026</p>
    </div>
  </main>
}
