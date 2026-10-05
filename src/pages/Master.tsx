import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, CheckCircle2, CircleDollarSign, Clock3, RefreshCw, Save, Search, ShieldCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Company = {
  id: string
  razao_social: string | null
  nome_fantasia: string | null
  codigo: string | null
  ativo: boolean
  plano: string | null
  plano_status: string | null
  plan_type: string | null
  subscription_status: string | null
  subscription_ends_at: string | null
  trial_ends_at: string | null
}
type UserSummary = { id: string; empresa_id: string | null; ativo: boolean }
type Plan = { id: string; codigo: string; nome: string; preco_mensal: number; descricao: string | null; ativo: boolean; ordem: number }
type PlanModule = { id: string; plano_codigo: string; modulo_codigo: string; modulo_nome: string; acesso: boolean; limite_usuarios: number | null; limite_empresas: number | null; recursos: Record<string, unknown> }
type Audit = { id: string; empresa_id: string | null; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string; old_data: unknown; new_data: unknown }
type MasterData = { companies: Company[]; users: UserSummary[]; plans: Plan[]; modules: PlanModule[]; activity: Audit[] }
type PlanDraft = { codigo: string; nome: string; preco_mensal: string; descricao: string; ativo: boolean }

const emptyData: MasterData = { companies: [], users: [], plans: [], modules: [], activity: [] }
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const companyName = (company: Company) => company.nome_fantasia || company.razao_social || company.codigo || company.id

export default function Master() {
  const [data, setData] = useState<MasterData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [companyPage, setCompanyPage] = useState(0)
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set())
  const pageSize = 25

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [companies, users, plans, modules, activity] = await Promise.all([
        fetchAllPages<Company>((from, to) => supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,codigo,ativo,plano,plano_status,plan_type,subscription_status,subscription_ends_at,trial_ends_at', { count: 'exact' }).order('razao_social').range(from, to)),
        fetchAllPages<UserSummary>((from, to) => supabase.from('erp_usuarios').select('id,empresa_id,ativo', { count: 'exact' }).not('empresa_id', 'is', null).is('deleted_at', null).range(from, to)),
        fetchAllPages<Plan>((from, to) => supabase.from('erp_planos_catalogo').select('id,codigo,nome,preco_mensal,descricao,ativo,ordem', { count: 'exact' }).order('ordem').range(from, to)),
        fetchAllPages<PlanModule>((from, to) => supabase.from('erp_plano_modulos').select('id,plano_codigo,modulo_codigo,modulo_nome,acesso,limite_usuarios,limite_empresas,recursos', { count: 'exact' }).order('modulo_nome').range(from, to)),
        supabase.from('erp_audit_logs').select('id,empresa_id,actor_user_id,action,entity_type,entity_id,created_at,old_data,new_data').order('created_at', { ascending: false }).limit(50).then(result => {
          if (result.error) throw result.error
          return (result.data ?? []) as Audit[]
        }),
      ])
      setData({ companies, users, plans, modules, activity })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados administrativos Master.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  const moduleCatalog = useMemo(() => {
    const byCode = new Map<string, PlanModule>()
    data.modules.forEach(module => {
      if (!byCode.has(module.modulo_codigo)) byCode.set(module.modulo_codigo, module)
    })
    return Array.from(byCode.values()).sort((a, b) => a.modulo_nome.localeCompare(b.modulo_nome, 'pt-BR'))
  }, [data.modules])
  const activeCompanies = data.companies.filter(company => company.ativo)
  const inactiveCompanies = data.companies.length - activeCompanies.length
  const activeUsers = data.users.filter(user => user.ativo)
  const usersByCompany = useMemo(() => {
    const result = new Map<string, number>()
    data.users.forEach(user => {
      if (user.empresa_id) result.set(user.empresa_id, (result.get(user.empresa_id) ?? 0) + 1)
    })
    return result
  }, [data.users])
  const planByCode = useMemo(() => new Map(data.plans.map(plan => [plan.codigo, plan])), [data.plans])
  const projectedMrr = activeCompanies.reduce((total, company) => {
    const status = String(company.subscription_status || company.plano_status || '').trim().toLowerCase()
    if (!['active', 'ativo', 'em_dia', 'paid'].includes(status)) return total
    const plan = planByCode.get(company.plano || company.plan_type || '')
    return total + Number(plan?.preco_mensal || 0)
  }, 0)
  const filteredCompanies = data.companies.filter(company => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return !term || [companyName(company), company.codigo, company.plano, company.plan_type, company.subscription_status, company.plano_status]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
  })
  const companyPageCount = Math.max(1, Math.ceil(filteredCompanies.length / pageSize))
  const visibleCompanies = filteredCompanies.slice(companyPage * pageSize, (companyPage + 1) * pageSize)
  const planWithoutCatalog = activeCompanies.filter(company => !planByCode.has(company.plano || company.plan_type || '')).length
  const setCompanyStatus = async (company: Company) => {
    const nextActive = !company.ativo
    if (!window.confirm(`${nextActive ? 'Reativar' : 'Desativar'} o acesso de ${companyName(company)}? A alteração será registrada na auditoria global.`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: resultError } = await supabase.rpc('erp_master_set_empresa_status', { p_empresa_id: company.id, p_ativo: nextActive })
      if (resultError) throw resultError
      setMessage(`Acesso da empresa ${nextActive ? 'reativado' : 'desativado'} e registrado.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o status da empresa.')
    } finally {
      setBusy(false)
    }
  }
  const openPlan = (plan: Plan) => {
    const modules = data.modules.filter(module => module.plano_codigo === plan.codigo)
    setDraft({ codigo: plan.codigo, nome: plan.nome, preco_mensal: String(plan.preco_mensal), descricao: plan.descricao || '', ativo: plan.ativo })
    setEnabledModules(new Set(modules.filter(module => module.acesso).map(module => module.modulo_codigo)))
  }
  const savePlan = async () => {
    if (!draft) return
    const price = Number(draft.preco_mensal)
    if (!draft.nome.trim() || !Number.isFinite(price) || price < 0) {
      setError('Informe o nome do plano e um preço mensal válido.')
      return
    }
    const modules = moduleCatalog.map(module => {
      const existing = data.modules.find(row => row.plano_codigo === draft.codigo && row.modulo_codigo === module.modulo_codigo)
      return {
        codigo: module.modulo_codigo,
        nome: module.modulo_nome,
        acesso: enabledModules.has(module.modulo_codigo),
        limite_usuarios: existing?.limite_usuarios ?? null,
        limite_empresas: existing?.limite_empresas ?? null,
        recursos: existing?.recursos ?? {},
      }
    })
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: resultError } = await supabase.rpc('erp_master_save_plan', {
        p_codigo: draft.codigo,
        p_nome: draft.nome.trim(),
        p_preco_mensal: price,
        p_descricao: draft.descricao.trim() || null,
        p_ativo: draft.ativo,
        p_modulos: modules,
      })
      if (resultError) throw resultError
      setDraft(null)
      setMessage('Plano e módulos contratados atualizados e registrados na auditoria global.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o plano.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="master-page">
      <header>
        <div>
          <span className="master-kicker">SYNQRA ERP • MASTER</span>
          <h1>Console da plataforma</h1>
          <p>Empresas, usuários, catálogo de planos, módulos contratados e auditoria global.</p>
        </div>
        <div className="master-actions">
          <Link to="/usuarios"><Users size={17} /> Usuários por empresa</Link>
          <button type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={17} /> Atualizar</button>
        </div>
      </header>

      {error && <div className="master-error" role="alert">{error}</div>}
      {message && <div className="master-success" role="status">{message}</div>}

      <main className="master-main">
        <section className="master-kpis master-kpis-5" aria-label="Resumo da plataforma">
          <article><Building2 /><span>Empresas</span><strong>{loading ? '—' : data.companies.length}</strong></article>
          <article><CheckCircle2 /><span>Ativas</span><strong>{loading ? '—' : activeCompanies.length}</strong></article>
          <article><AlertTriangle /><span>Inativas</span><strong>{loading ? '—' : inactiveCompanies}</strong></article>
          <article><Users /><span>Usuários ativos</span><strong>{loading ? '—' : activeUsers.length}</strong></article>
          <article><CircleDollarSign /><span>MRR contratado previsto</span><strong>{loading ? '—' : money(projectedMrr)}</strong></article>
        </section>

        <section className="master-panel">
          <div className="master-panel-title">
            <div><ShieldCheck /><div><strong>Conciliação de cobrança</strong><small>Valores previstos pelo catálogo de planos; não representam recebimentos confirmados.</small></div></div>
            <b>{planWithoutCatalog} sem plano de catálogo</b>
          </div>
          <p className="master-data-note">
            O schema versionado local contém status de assinatura e vencimentos de teste/assinatura, mas não contém um razão de mensalidades, pagamentos ou baixas da plataforma. Valores recebido, em aberto e inadimplência financeira não são inferidos sem essa fonte transacional.
          </p>
        </section>

        <section className="master-panel master-companies">
          <div className="master-panel-title">
            <div><Building2 /><div><strong>Empresas clientes</strong><small>Tenant Master separado dos dados operacionais da empresa.</small></div></div>
            <label className="master-search"><Search size={15} /><input value={search} onChange={event => { setSearch(event.target.value); setCompanyPage(0) }} placeholder="Buscar empresa, plano ou status" aria-label="Buscar empresas" /></label>
          </div>
          <div className="master-table">
            <div className="master-row master-head"><span>Empresa</span><span>Plano / cobrança</span><span>Usuários</span><span>Vencimento</span><span>Acesso</span></div>
            {visibleCompanies.map(company => {
              const plan = planByCode.get(company.plano || company.plan_type || '')
              const dueAt = company.subscription_ends_at || company.trial_ends_at
              return <div className="master-row" key={company.id}>
                <span><strong>{companyName(company)}</strong><small>{company.codigo || company.id}</small></span>
                <span>{plan?.nome || company.plano || company.plan_type || '—'}<small>{company.subscription_status || company.plano_status || 'Sem status informado'}</small></span>
                <span>{usersByCompany.get(company.id) ?? 0}<small>usuário(s)</small></span>
                <span>{dueAt ? new Date(dueAt).toLocaleDateString('pt-BR') : '—'}<small>{company.trial_ends_at ? 'Fim do período de teste' : 'Vigência da assinatura'}</small></span>
                <span>{company.ativo ? <em className="master-active">Ativa</em> : <em className="danger">Inativa</em>}<button type="button" className="master-reactivate" disabled={busy} onClick={() => void setCompanyStatus(company)}>{company.ativo ? 'Desativar' : 'Reativar'}</button></span>
              </div>
            })}
            {!loading && !visibleCompanies.length && <div className="master-empty">Nenhuma empresa corresponde à busca.</div>}
          </div>
          <div className="master-pagination"><span>{filteredCompanies.length} empresa(s) · página {companyPage + 1} de {companyPageCount}</span><div><button type="button" disabled={companyPage === 0} onClick={() => setCompanyPage(value => Math.max(0, value - 1))}>Anterior</button><button type="button" disabled={companyPage >= companyPageCount - 1} onClick={() => setCompanyPage(value => Math.min(companyPageCount - 1, value + 1))}>Próxima</button></div></div>
        </section>

        <section className="master-panel">
          <div className="master-panel-title"><div><CircleDollarSign /><div><strong>Planos e módulos contratados</strong><small>Catálogo e permissões de produto já persistidos no banco.</small></div></div></div>
          <div className="master-plan-grid">
            {data.plans.map(plan => <article className="master-plan-card" key={plan.id}>
              <div><span>{plan.nome}</span><small>{data.companies.filter(company => (company.plano || company.plan_type) === plan.codigo).length} empresa(s) vinculada(s)</small></div>
              <strong>{money(plan.preco_mensal)}<em>/mês</em></strong>
              <button type="button" onClick={() => openPlan(plan)} disabled={busy}><Save size={14} /> Gerenciar</button>
            </article>)}
          </div>
          {draft && <div className="master-plan-editor">
            <div className="master-editor-heading"><div><h2>Editar plano {draft.nome}</h2><p>As alterações afetam novas consultas e contratos vinculados a este código.</p></div><button type="button" onClick={() => setDraft(null)} disabled={busy}>Cancelar</button></div>
            <div className="master-editor-fields">
              <label>Código<input value={draft.codigo} disabled aria-label="Código do plano" /></label>
              <label>Nome<input value={draft.nome} onChange={event => setDraft({ ...draft, nome: event.target.value })} /></label>
              <label>Preço mensal<input type="number" min="0" step="0.01" value={draft.preco_mensal} onChange={event => setDraft({ ...draft, preco_mensal: event.target.value })} /></label>
              <label>Descrição<input value={draft.descricao} onChange={event => setDraft({ ...draft, descricao: event.target.value })} /></label>
              <label className="master-checkbox"><input type="checkbox" checked={draft.ativo} onChange={event => setDraft({ ...draft, ativo: event.target.checked })} /> Plano ativo</label>
            </div>
            <div className="master-module-grid">{moduleCatalog.map(module => <label key={module.modulo_codigo}><input type="checkbox" checked={enabledModules.has(module.modulo_codigo)} onChange={event => setEnabledModules(current => { const next = new Set(current); if (event.target.checked) next.add(module.modulo_codigo); else next.delete(module.modulo_codigo); return next })} /><span>{module.modulo_nome}</span><small>{module.modulo_codigo}</small></label>)}</div>
            <button type="button" className="master-save" onClick={() => void savePlan()} disabled={busy}><Save size={16} />{busy ? 'Salvando…' : 'Salvar plano e módulos'}</button>
          </div>}
        </section>

        <section className="master-panel">
          <div className="master-panel-title"><div><Clock3 /><div><strong>Atividade e auditoria global</strong><small>Eventos persistidos em erp_audit_logs.</small></div></div><b>{data.activity.length}</b></div>
          <div className="master-activity-list">
            {data.activity.slice(0, 20).map(row => <article key={row.id}><time>{new Date(row.created_at).toLocaleString('pt-BR')}</time><strong>{row.action}</strong><span>{row.entity_type} · {row.entity_id || 'sem identificador'} · {row.empresa_id || 'plataforma'}</span><small>Ator {row.actor_user_id || 'sistema'}</small></article>)}
            {!loading && !data.activity.length && <p className="master-empty">Nenhuma auditoria retornada pelo banco.</p>}
          </div>
        </section>
      </main>
      <footer>Console operacional Master • A autorização global depende de erp_is_master() e RLS.</footer>
    </div>
  )
}
