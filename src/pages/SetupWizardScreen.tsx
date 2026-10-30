/**
 * SYNQRA ERP INDUSTRIAL — Assistente de Configuração Inicial
 * @REVISAO 29/10/2026
 * @STATUS Em implantação controlada — sem ativação automática de módulos.
 *
 * Preferências e pendências são persistidas por empresa; a tela nunca cria
 * usuários, empresas, permissões ou dados industriais fictícios.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Factory,
  Globe2, Building2, Boxes, ShieldCheck, Settings2, AlertCircle, LoaderCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type ModuleKey = 'compras' | 'estoque' | 'pcp' | 'qualidade' | 'financeiro' | 'rh' | 'vendas'
type ReadinessKey = 'produtos' | 'estruturas' | 'centros_trabalho' | 'capacidade' | 'rastreabilidade' | 'custos'
type Company = { id: string; razao_social: string | null; nome_fantasia: string | null; cnpj: string | null }
type SetupRecord = {
  idioma: string
  fuso_horario: string
  moeda: string
  ano_fiscal_inicio: string
  modulos_planejados: ModuleKey[]
  requisitos_industriais: ReadinessKey[]
  wizard_concluido_em: string | null
}
const steps = [
  { title: 'Ambiente', subtitle: 'Idioma, moeda e calendário', icon: Globe2 },
  { title: 'Empresa', subtitle: 'Identidade empresarial', icon: Building2 },
  { title: 'Módulos', subtitle: 'Prioridades de implantação', icon: Boxes },
  { title: 'Operação industrial', subtitle: 'Pré-requisitos de fábrica', icon: Factory },
]
const moduleOptions: { id: ModuleKey; title: string; description: string; tone: string }[] = [
  { id: 'compras', title: 'Compras', description: 'Solicitações, cotações e pedidos', tone: 'border-orange-400/40 bg-orange-500/10' },
  { id: 'estoque', title: 'Estoque', description: 'Saldos, depósitos e rastreabilidade', tone: 'border-cyan-400/40 bg-cyan-500/10' },
  { id: 'pcp', title: 'PCP / Fabricação', description: 'Ordens, operações e capacidade', tone: 'border-violet-400/40 bg-violet-500/10' },
  { id: 'qualidade', title: 'Qualidade', description: 'Inspeções, RPNC e equipamentos', tone: 'border-rose-400/40 bg-rose-500/10' },
  { id: 'financeiro', title: 'Financeiro', description: 'Contas, caixa e custos', tone: 'border-emerald-400/40 bg-emerald-500/10' },
  { id: 'vendas', title: 'Vendas', description: 'Clientes e pedidos comerciais', tone: 'border-blue-400/40 bg-blue-500/10' },
  { id: 'rh', title: 'Recursos Humanos', description: 'Pessoas, treinamentos e ponto', tone: 'border-amber-400/40 bg-amber-500/10' },
]
const readinessOptions: { id: ReadinessKey; title: string; description: string }[] = [
  { id: 'produtos', title: 'Cadastro de produtos e unidades', description: 'Itens reais, unidades e dados de engenharia' },
  { id: 'estruturas', title: 'Estruturas / fichas de processo', description: 'BOM, componentes, operações e sequência produtiva' },
  { id: 'centros_trabalho', title: 'Máquinas e centros de trabalho', description: 'Recursos, turnos e calendários' },
  { id: 'capacidade', title: 'Capacidade e planejamento', description: 'Tempos, disponibilidade e carga de produção' },
  { id: 'rastreabilidade', title: 'Lotes e qualidade', description: 'Rastreabilidade, inspeções e critérios de aceite' },
  { id: 'custos', title: 'Custos industriais', description: 'Centros de custo e parâmetros de apuração' },
]
const panel = 'rounded-2xl border border-slate-700/70 bg-[#151d2d] shadow-[0_18px_60px_rgba(2,6,23,.24)]'
const field = 'mt-2 w-full rounded-xl border border-slate-600 bg-[#0c1423] px-3.5 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20'
const label = 'text-xs font-bold uppercase tracking-[.12em] text-slate-400'
const buttonPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50'
const buttonSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível carregar ou salvar a configuração.'
}

export default function SetupWizardScreen() {
  const [step, setStep] = useState(1)
  const [company, setCompany] = useState<Company | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [complete, setComplete] = useState(false)
  const [form, setForm] = useState<SetupRecord>({
    idioma: 'pt-BR',
    fuso_horario: 'America/Sao_Paulo',
    moeda: 'BRL',
    ano_fiscal_inicio: '',
    modulos_planejados: ['compras', 'estoque', 'pcp', 'qualidade'],
    requisitos_industriais: ['produtos', 'estruturas', 'centros_trabalho', 'capacidade', 'rastreabilidade', 'custos'],
    wizard_concluido_em: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sua sessão expirou. Entre novamente para configurar a empresa.')
      const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (typeof tenant !== 'string' || !tenant) throw new Error('A sessão não possui uma empresa ativa. O Setup Wizard deve ser executado após o vínculo seguro do usuário à empresa.')
      setEmpresaId(tenant)
      const [companyResult, setupResult] = await Promise.all([
        supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,cnpj').eq('id', tenant).maybeSingle(),
        supabase.from('erp_setup_configuracao').select('idioma,fuso_horario,moeda,ano_fiscal_inicio,modulos_planejados,requisitos_industriais,wizard_concluido_em').eq('empresa_id', tenant).maybeSingle(),
      ])
      if (companyResult.error) throw companyResult.error
      if (setupResult.error) throw setupResult.error
      if (!companyResult.data) throw new Error('Empresa não encontrada em erp_empresas para a empresa ativa.')
      setCompany(companyResult.data as Company)
      if (setupResult.data) {
        const saved = setupResult.data
        setForm({
          idioma: saved.idioma,
          fuso_horario: saved.fuso_horario,
          moeda: saved.moeda,
          ano_fiscal_inicio: saved.ano_fiscal_inicio,
          modulos_planejados: (saved.modulos_planejados ?? []) as ModuleKey[],
          requisitos_industriais: (saved.requisitos_industriais ?? []) as ReadinessKey[],
          wizard_concluido_em: saved.wizard_concluido_em,
        })
        setComplete(Boolean(saved.wizard_concluido_em))
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggleModule = (id: ModuleKey) => setForm(current => ({
    ...current,
    modulos_planejados: current.modulos_planejados.includes(id)
      ? current.modulos_planejados.filter(item => item !== id)
      : [...current.modulos_planejados, id],
  }))
  const toggleReadiness = (id: ReadinessKey) => setForm(current => ({
    ...current,
    requisitos_industriais: current.requisitos_industriais.includes(id)
      ? current.requisitos_industriais.filter(item => item !== id)
      : [...current.requisitos_industriais, id],
  }))

  const next = () => {
    setError('')
    if (step === 1 && !form.ano_fiscal_inicio) {
      setError('Informe a data de início do exercício fiscal.')
      return
    }
    if (step === 3 && form.modulos_planejados.length === 0) {
      setError('Selecione ao menos um módulo prioritário ou volte para revisar sua escolha.')
      return
    }
    setStep(current => Math.min(4, current + 1))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (!empresaId || !company) throw new Error('A empresa ativa não foi validada.')
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const { data: currentTenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (currentTenant !== empresaId) throw new Error('A empresa ativa mudou durante a configuração. Atualize a página e tente novamente.')
      const now = new Date().toISOString()
      const { error: saveError } = await supabase.from('erp_setup_configuracao').upsert({
        empresa_id: empresaId,
        idioma: form.idioma,
        fuso_horario: form.fuso_horario,
        moeda: form.moeda,
        ano_fiscal_inicio: form.ano_fiscal_inicio,
        modulos_planejados: form.modulos_planejados,
        requisitos_industriais: form.requisitos_industriais,
        wizard_concluido_em: now,
        atualizado_por: authData.user.id,
        atualizado_em: now,
      }, { onConflict: 'empresa_id' })
      if (saveError) throw saveError
      setForm(current => ({ ...current, wizard_concluido_em: now }))
      setComplete(true)
      setNotice('Preferências iniciais salvas para a empresa ativa.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="min-h-[70vh] bg-[#0b1220] p-6 text-slate-100"><div className={panel + ' mx-auto max-w-4xl p-8'}><LoaderCircle className="animate-spin text-orange-400" size={24}/><p className="mt-4 text-sm text-slate-300">Validando sessão e carregando a configuração da empresa…</p></div></main>

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#0b1220] px-4 py-7 text-slate-100 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-r from-[#19253b] via-[#242447] to-[#123a48] shadow-2xl">
          <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-orange-300"><Settings2 size={13}/> SYNQRA · Implantação industrial</div>
              <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Assistente de configuração inicial</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Configure as preferências da empresa e organize as prioridades de implantação. O assistente não ativa permissões nem cria cadastros industriais automaticamente.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-400 text-slate-950"><Factory size={23}/></div>
              <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Empresa ativa</div><div className="mt-1 max-w-52 truncate text-sm font-extrabold text-white">{company?.nome_fantasia || company?.razao_social || 'Empresa vinculada'}</div><div className="mt-1 text-xs text-cyan-300">{company?.cnpj || 'Documento não informado'}</div></div>
            </div>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-300"/><span>{error}</span></div>}
        {notice && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300"/><span>{notice}</span></div>}

        {complete ? (
          <section className={panel + ' p-6 md:p-8'}>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 size={30}/></div>
            <h2 className="text-xl font-extrabold text-white">Preferências iniciais salvas</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">O assistente foi concluído. Isso confirma a gravação das preferências, não a implantação automática de cada módulo industrial.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4"><h3 className="font-bold text-cyan-200">Módulos priorizados</h3><p className="mt-2 text-sm text-slate-300">{moduleOptions.filter(item => form.modulos_planejados.includes(item.id)).map(item => item.title).join(', ') || 'Nenhum módulo selecionado'}</p></div>
              <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4"><h3 className="font-bold text-violet-200">Frentes industriais pendentes</h3><p className="mt-2 text-sm text-slate-300">{readinessOptions.filter(item => form.requisitos_industriais.includes(item.id)).map(item => item.title).join(', ') || 'Nenhuma prioridade selecionada'}</p></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><button className={buttonSecondary} type="button" onClick={() => { setComplete(false); setStep(1); setNotice(''); setError('') }}>Revisar configuração</button><button className={buttonPrimary} type="button" onClick={() => window.location.assign('/pageprincipal/administracao-configuracoes')}>Abrir configurações da empresa <ArrowRight size={16}/></button></div>
          </section>
        ) : (
          <form onSubmit={save} className={panel + ' overflow-hidden'}>
            <div className="grid gap-2 border-b border-slate-700/80 bg-slate-950/25 p-4 md:grid-cols-4 md:p-5">
              {steps.map((item, index) => {
                const number = index + 1
                const Icon = item.icon
                const active = number === step
                const passed = number < step
                return <button key={item.title} type="button" onClick={() => { if (number <= step) { setStep(number); setError('') } }} className={'flex items-center gap-3 rounded-xl border p-3 text-left transition ' + (active ? 'border-orange-400/60 bg-orange-400/10' : passed ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-slate-700 bg-slate-900/30')}><span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (active ? 'bg-orange-400 text-slate-950' : passed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-800 text-slate-400')}>{passed ? <Check size={17}/> : <Icon size={17}/>}</span><span className="min-w-0"><strong className={'block text-xs ' + (active ? 'text-orange-200' : 'text-slate-200')}>{item.title}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-400">{item.subtitle}</small></span></button>
              })}
            </div>

            <div className="min-h-[360px] p-5 md:p-8">
              {step === 1 && <section className="max-w-3xl"><h2 className="text-xl font-extrabold text-white">Preferências regionais</h2><p className="mt-2 text-sm text-slate-400">Essas opções serão salvas para a empresa e usadas como parâmetros de implantação.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><label className={label}>Idioma<select className={field} value={form.idioma} onChange={e => setForm(v => ({ ...v, idioma: e.target.value }))}><option value="pt-BR">Português brasileiro (pt-BR)</option><option value="en-US">English (US)</option><option value="es">Español</option></select></label><label className={label}>Fuso horário<select className={field} value={form.fuso_horario} onChange={e => setForm(v => ({ ...v, fuso_horario: e.target.value }))}><option value="America/Sao_Paulo">América/São Paulo</option><option value="America/Manaus">América/Manaus</option><option value="America/Belem">América/Belém</option><option value="UTC">UTC</option></select></label><label className={label}>Moeda principal<select className={field} value={form.moeda} onChange={e => setForm(v => ({ ...v, moeda: e.target.value }))}><option value="BRL">BRL — Real brasileiro</option><option value="USD">USD — Dólar americano</option><option value="EUR">EUR — Euro</option></select></label><label className={label}>Início do exercício fiscal<input className={field} type="date" value={form.ano_fiscal_inicio} onChange={e => setForm(v => ({ ...v, ano_fiscal_inicio: e.target.value }))} required/></label></div><p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100"><AlertCircle size={15} className="mr-2 inline"/> Alterar moeda e calendário fiscal depois de lançamentos pode exigir revisão contábil. Esta etapa registra preferências; não altera lançamentos existentes.</p></section>}

              {step === 2 && <section><h2 className="text-xl font-extrabold text-white">Confirme a empresa ativa</h2><p className="mt-2 text-sm text-slate-400">Os dados abaixo vêm de <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-300">erp_empresas</code>. Para editar a razão social, CNPJ ou endereço, use a tela corporativa autorizada.</p>{company ? <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4 md:col-span-2"><div className={label}>Razão social</div><p className="mt-2 break-words text-sm font-bold text-white">{company.razao_social || 'Não informado no cadastro'}</p></div><div className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-4"><div className={label}>CNPJ</div><p className="mt-2 text-sm font-bold text-white">{company.cnpj || 'Não informado'}</p></div><div className="rounded-xl border border-orange-400/25 bg-orange-500/5 p-4 md:col-span-3"><div className={label}>Nome fantasia</div><p className="mt-2 text-sm font-bold text-white">{company.nome_fantasia || 'Não informado no cadastro'}</p></div></div> : <p className="mt-5 text-sm text-rose-200">Empresa não disponível.</p>}</section>}

              {step === 3 && <section><h2 className="text-xl font-extrabold text-white">Módulos prioritários</h2><p className="mt-2 text-sm text-slate-400">Escolha as áreas que a implantação deve priorizar. A seleção não concede permissões nem ativa funcionalidades por conta própria.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{moduleOptions.map(item => { const checked = form.modulos_planejados.includes(item.id); return <label key={item.id} className={'flex cursor-pointer gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 ' + item.tone + (checked ? ' ring-1 ring-orange-300/60' : ' opacity-75')}><input className="mt-1 h-4 w-4 accent-orange-400" type="checkbox" checked={checked} onChange={() => toggleModule(item.id)}/><span><strong className="block text-sm text-white">{item.title}</strong><small className="mt-1 block text-xs leading-5 text-slate-300">{item.description}</small></span></label>})}</div></section>}

              {step === 4 && <section><h2 className="text-xl font-extrabold text-white">Preparação da fábrica</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Marque as frentes que precisam ser configuradas. A abordagem segue o modelo industrial do Odoo: estruturas de materiais, operações, centros de trabalho e capacidade, conectados ao estoque e à qualidade.</p><div className="mt-6 grid gap-3 md:grid-cols-2">{readinessOptions.map(item => { const checked = form.requisitos_industriais.includes(item.id); return <label key={item.id} className={'flex cursor-pointer gap-3 rounded-xl border p-4 transition ' + (checked ? 'border-violet-400/50 bg-violet-500/10' : 'border-slate-700 bg-slate-900/30')}><input className="mt-1 h-4 w-4 accent-orange-400" type="checkbox" checked={checked} onChange={() => toggleReadiness(item.id)}/><span><strong className="block text-sm text-white">{item.title}</strong><small className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</small></span></label>})}</div><div className="mt-5 flex gap-3 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-cyan-300"/><p className="text-xs leading-5 text-slate-300">O acesso continua controlado por Supabase Auth, RBAC e RLS. Esta tela não cria perfis administrativos, não desativa políticas e não injeta dados de demonstração.</p></div></section>}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/80 bg-slate-950/30 p-4 md:px-8 md:py-5">
              <span className="text-xs text-slate-500">Etapa {step} de 4 <span className="mx-1.5 text-slate-700">·</span> Preferências por empresa</span>
              <div className="flex gap-2">{step > 1 && <button type="button" className={buttonSecondary} onClick={() => { setStep(v => v - 1); setError('') }} disabled={saving}><ArrowLeft size={16}/> Voltar</button>}{step < 4 ? <button type="button" className={buttonPrimary} onClick={next}>Continuar <ArrowRight size={16}/></button> : <button type="submit" className={buttonPrimary} disabled={saving || !company || !empresaId}>{saving ? <><LoaderCircle size={16} className="animate-spin"/> Salvando…</> : <><CheckCircle2 size={16}/> Salvar configuração</>}</button>}</div>
            </footer>
          </form>
        )}
        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">SYNQRA ERP INDUSTRIAL · Setup Wizard · 29/10/2026</p>
      </div>
    </main>
  )
}
