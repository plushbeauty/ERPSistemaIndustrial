import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Boxes, Building2, CalendarDays, ClipboardCheck, Factory, Package, Plus, Search, Settings, Trash2, Truck, Users, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { criarPipeline, type SystemExecutionContext } from './lib/secureDataPipeline'

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'email'; required?: boolean }
type Module = { name: string; title: string; description: string; icon: LucideIcon; table: string; fields: Field[]; group: string }
type Row = Record<string, unknown> & { id: string }
type MetricCard = { label: string; value: number; icon: LucideIcon; target: string }

const M = (name: string, title: string, description: string, icon: LucideIcon, group: string, table: string, fields: Field[]): Module => ({ name, title, description, icon, group, table, fields })

const modules: Module[] = [
  M('Produtos', 'Produtos e materiais', 'Código, nome, grupo, unidade, estoque, custos e venda.', Package, 'Cadastros', 'erp_produtos', [{ key: 'codigo', label: 'Código do produto', required: true }, { key: 'nome', label: 'Nome', required: true }, { key: 'unidade', label: 'Unidade' }, { key: 'tipo', label: 'Tipo / grupo' }, { key: 'estoque_minimo', label: 'Estoque mínimo', type: 'number' }, { key: 'custo_medio', label: 'Custo médio', type: 'number' }, { key: 'preco_venda', label: 'Preço de venda', type: 'number' }]),
  M('Clientes', 'Clientes', 'Cadastro comercial e documentos dos clientes.', Users, 'Cadastros', 'erp_clientes', [{ key: 'nome', label: 'Nome / Razão social', required: true }, { key: 'documento', label: 'CPF / CNPJ' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'telefone', label: 'Telefone' }]),
  M('Fornecedores', 'Fornecedores', 'Cadastro de fornecedores e documentos.', Truck, 'Cadastros', 'erp_fornecedores', [{ key: 'razao_social', label: 'Razão social', required: true }, { key: 'nome_fantasia', label: 'Nome fantasia' }, { key: 'documento', label: 'CNPJ / CPF' }, { key: 'email', label: 'E-mail', type: 'email' }, { key: 'telefone', label: 'Telefone' }]),
  M('Setores', 'Setores', 'Estrutura organizacional e centros operacionais.', Building2, 'Cadastros', 'erp_setores', [{ key: 'codigo', label: 'Código', required: true }, { key: 'nome', label: 'Nome', required: true }]),
  M('Máquinas', 'Máquinas e equipamentos', 'Ativos industriais, identificação e situação.', Wrench, 'Cadastros', 'erp_maquinas', [{ key: 'codigo', label: 'Código', required: true }, { key: 'nome', label: 'Nome', required: true }, { key: 'tipo', label: 'Tipo', required: true }, { key: 'fabricante', label: 'Fabricante' }, { key: 'modelo', label: 'Modelo' }, { key: 'status', label: 'Status' }]),
  M('Engenharia / BOM', 'Engenharia e BOM', 'Ficha técnica, versões e estrutura dos produtos.', Boxes, 'Produção', 'erp_fichas_tecnicas', [{ key: 'produto_id', label: 'Produto ID', required: true }, { key: 'versao', label: 'Versão', type: 'number', required: true }, { key: 'rendimento', label: 'Rendimento', type: 'number' }, { key: 'unidade_rendimento', label: 'Unidade' }, { key: 'observacoes', label: 'Observações' }]),
  M('MRP e Planejamento', 'MRP e planejamento', 'Parâmetros, necessidades e planejamento de materiais.', Activity, 'Produção', 'erp_parametros_processo', [{ key: 'processo_id', label: 'Processo ID', required: true }, { key: 'grupo', label: 'Grupo' }, { key: 'codigo', label: 'Código', required: true }, { key: 'nome', label: 'Nome', required: true }, { key: 'tipo', label: 'Tipo' }, { key: 'unidade', label: 'Unidade' }, { key: 'valor_padrao', label: 'Valor padrão' }]),
  M('Produção / OP', 'Ordens de produção', 'OP, planejamento, execução e apontamentos.', Factory, 'Produção', 'erp_ordens_producao', [{ key: 'produto_id', label: 'Produto ID', required: true }, { key: 'quantidade_planejada', label: 'Quantidade', type: 'number', required: true }, { key: 'status', label: 'Status', required: true }, { key: 'data_prevista', label: 'Data prevista', type: 'date' }, { key: 'observacoes', label: 'Observações' }]),
  M('PCP / Máquinas', 'Agenda de máquinas', 'Sequenciamento de operações e capacidade.', CalendarDays, 'Produção', 'erp_ordem_processos', [{ key: 'ordem_producao_id', label: 'OP ID', required: true }, { key: 'processo_id', label: 'Processo ID', required: true }, { key: 'sequencia', label: 'Sequência', type: 'number', required: true }, { key: 'maquina_id', label: 'Máquina ID' }, { key: 'status', label: 'Status' }]),
  M('Qualidade / QMS', 'Qualidade / RPNC', 'Inspeções, não conformidades, ações e RPN.', ClipboardCheck, 'Qualidade', 'erp_nao_conformidades', [{ key: 'origem', label: 'Origem', required: true }, { key: 'severidade', label: 'Severidade', required: true }, { key: 'descricao', label: 'Descrição', required: true }, { key: 'status', label: 'Status', required: true }, { key: 'prazo', label: 'Prazo', type: 'date' }, { key: 'rpn', label: 'RPN', type: 'number' }]),
  M('Indicadores / OEE', 'OEE e indicadores', 'Disponibilidade, performance, qualidade e paradas.', Activity, 'Gestão', 'erp_apontamentos_producao', [{ key: 'ordem_producao_id', label: 'OP ID', required: true }, { key: 'turno', label: 'Turno' }, { key: 'quantidade_boa', label: 'Quantidade boa', type: 'number' }, { key: 'quantidade_refugo', label: 'Refugo', type: 'number' }, { key: 'parada_min', label: 'Parada (min)', type: 'number' }]),
]

const valueForForm = (value: unknown): string => value === null || value === undefined ? '' : String(value)

const toPayload = (fields: Field[], form: Record<string, string>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = form[field.key]?.trim() ?? ''
    if (!raw) {
      if (field.required) throw new Error(`Informe ${field.label}.`)
      payload[field.key] = null
      continue
    }
    if (field.type === 'number') {
      const numberValue = Number(raw)
      if (!Number.isFinite(numberValue)) throw new Error(`${field.label} deve ser numérico.`)
      payload[field.key] = numberValue
    } else payload[field.key] = raw
  }
  return payload
}

export default function AppIndustrialV5() {
  const [active, setActive] = useState('Dashboard')
  const [profile, setProfile] = useState<{ nome: string; nivel_admin: number; empresa_id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (alive) setLoading(false); return }
      const { data } = await supabase.from('erp_usuarios').select('nome,nivel_admin,empresa_id').eq('auth_user_id', auth.user.id).maybeSingle()
      if (alive) {
        setProfile(data ? { nome: data.nome, nivel_admin: data.nivel_admin, empresa_id: data.empresa_id } : null)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) return <div className="loading-screen">Carregando SGQ ERP…</div>

  return <div className="v2-shell">
    <aside className="v2-sidebar">
      <div className="v2-brand"><img src="/logo-industrial.svg" alt="SGQ ERP"/><div><strong>SGQ ERP</strong><span>Sistema de Gestão Industrial</span></div></div>
      <nav>
        <button type="button" className={active === 'Dashboard' ? 'v2-nav active' : 'v2-nav'} onClick={() => setActive('Dashboard')}><BarChart3 size={17}/><span>Dashboard</span></button>
        {modules.map(module => <button type="button" key={module.name} className={active === module.name ? 'v2-nav active' : 'v2-nav'} onClick={() => setActive(module.name)}><module.icon size={17}/><span>{module.name}</span></button>)}
      </nav>
      <button type="button" className="v2-nav" onClick={() => setActive('Configurações')}><Settings size={17}/><span>Configurações</span></button>
      <button type="button" className="v2-logout" onClick={() => void supabase.auth.signOut().then(() => { location.href = '/login' })}>Sair</button>
    </aside>
    <main className="v2-main">
      <header className="v2-top"><div><span className="v2-eyebrow">OPERAÇÃO INDUSTRIAL • CRUD SEGURO</span><h1>{active === 'Dashboard' ? 'Visão geral' : modules.find(m => m.name === active)?.title ?? active}</h1></div><span className="v2-status"><i/> Conectado</span></header>
      <section className="v2-content">{active === 'Dashboard' ? <Dashboard setActive={setActive}/> : active === 'Configurações' ? <Feature title="Configurações" icon={Settings} description="Usuários, permissões e parâmetros permanecem protegidos pelo tenant e pelas políticas do banco."/> : <SecureCrud module={modules.find(m => m.name === active)!} profile={profile}/>}</section>
      <footer className="v2-footer">FernandoSch_System • SGQ ERP • {profile?.nome ?? 'Usuário'} • Empresa {profile?.empresa_id ?? '—'}</footer>
    </main>
  </div>
}

function Dashboard({ setActive }: { setActive: (name: string) => void }) {
  const [metrics, setMetrics] = useState({ produtos: 0, clientes: 0, ops: 0, rpnc: 0 })
  useEffect(() => {
    let alive = true
    void Promise.all([
      supabase.from('erp_produtos').select('id', { count: 'exact', head: true }),
      supabase.from('erp_clientes').select('id', { count: 'exact', head: true }),
      supabase.from('erp_ordens_producao').select('id', { count: 'exact', head: true }),
      supabase.from('erp_nao_conformidades').select('id', { count: 'exact', head: true }),
    ]).then(([produtos, clientes, ops, rpnc]) => {
      if (alive) setMetrics({ produtos: produtos.count ?? 0, clientes: clientes.count ?? 0, ops: ops.count ?? 0, rpnc: rpnc.count ?? 0 })
    })
    return () => { alive = false }
  }, [])
  const cards: MetricCard[] = [
    { label: 'Produtos', value: metrics.produtos, icon: Package, target: 'Produtos' },
    { label: 'Clientes', value: metrics.clientes, icon: Users, target: 'Clientes' },
    { label: 'Ordens de produção', value: metrics.ops, icon: Factory, target: 'Produção / OP' },
    { label: 'RPNC', value: metrics.rpnc, icon: ClipboardCheck, target: 'Qualidade / QMS' },
  ]
  return <div className="dashboard-v2">
    <div className="dashboard-hero"><div><span className="v2-eyebrow">CRUD INDUSTRIAL VALIDADO</span><h2>Dados operacionais gravados por empresa, sem cruzamento de tenants.</h2><p>Cadastros, produção, PCP, qualidade e indicadores usando o cliente Supabase autenticado.</p></div><button className="menu-green" type="button" onClick={() => setActive('Produtos')}><Plus size={18}/> Abrir cadastro</button></div>
    <div className="dashboard-metrics">{cards.map(({ label, value, icon: MetricIcon, target }) => <button type="button" className="dashboard-metric" key={label} onClick={() => setActive(target)}><MetricIcon size={22}/><span>{label}</span><strong>{value}</strong></button>)}</div>
    <div className="feature-v2"><h3>Fluxo operacional</h3><div className="process-flow">{['Pedido','PCP / MRP','Compras','Estoque','Produção','Qualidade','Expedição','Fiscal','Financeiro'].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < 8 && <b>→</b>}</div>)}</div></div>
  </div>
}

function Feature({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return <div className="feature-v2"><Icon size={34}/><h2>{title}</h2><p>{description}</p></div>
}

function SecureCrud({ module, profile }: { module: Module; profile: { nome: string; nivel_admin: number; empresa_id: string } | null }) {
  const fields = module.fields
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pipeline = useMemo(() => criarPipeline<Row>(module.table), [module.table])
  const context: SystemExecutionContext | null = profile ? { tenantId: profile.empresa_id, userEmail: '', role: profile.nivel_admin <= 1 ? 'master' : profile.nivel_admin <= 2 ? 'admin' : 'operator', strictMode: true } : null

  const load = async (): Promise<void> => {
    if (!context) return
    setBusy(true); setMessage('')
    try { setRows(await pipeline.fetchRecords(context.tenantId)) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao carregar registros.') }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [context?.tenantId, module.table])
  const filtered = rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()))

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!context) return
    setBusy(true); setMessage('')
    try {
      const payload = toPayload(fields, form)
      if (editingId) await pipeline.updateRecord(context.tenantId, editingId, payload as Partial<Row>)
      else await pipeline.persistRecord(context.tenantId, payload as Omit<Row, 'id' | 'empresa_id'>)
      setForm({}); setEditingId(null); await load(); setMessage(editingId ? 'Registro atualizado.' : 'Registro gravado.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao gravar registro.') }
    finally { setBusy(false) }
  }

  const edit = (row: Row): void => { const next: Record<string, string> = {}; for (const field of fields) next[field.key] = valueForForm(row[field.key]); setForm(next); setEditingId(row.id); setMessage('') }
  const remove = async (id: string): Promise<void> => {
    if (!context || !window.confirm('Excluir este registro?')) return
    setBusy(true); setMessage('')
    try { await pipeline.removeRecord(context.tenantId, id); if (editingId === id) { setEditingId(null); setForm({}) }; await load(); setMessage('Registro excluído.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao excluir registro.') }
    finally { setBusy(false) }
  }

  return <div className="crud-page">
    <div className="feature-v2 crud-header"><div><span className="v2-eyebrow">{module.group.toUpperCase()} • {module.table}</span><h2>{module.title}</h2><p>{module.description}</p></div><button className="secondary-v2" type="button" onClick={() => { setEditingId(null); setForm({}); setMessage('Novo registro pronto.') }}><Plus size={18}/> Novo</button></div>
    <div className="crud-grid">
      <form className="crud-form" onSubmit={submit}><div className="crud-form-head"><strong>{editingId ? 'Editar registro' : 'Novo registro'}</strong>{editingId && <button type="button" className="icon-button" onClick={() => { setEditingId(null); setForm({}) }} aria-label="Cancelar edição"><X size={18}/></button>}</div>{fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}<input type={field.type ?? 'text'} value={form[field.key] ?? ''} required={field.required} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}/></label>)}<button className="menu-green" type="submit" disabled={busy}>{busy ? 'Processando…' : editingId ? 'Salvar alterações' : 'Gravar registro'}</button>{message && <div className="notice">{message}</div>}</form>
      <section className="crud-list"><div className="crud-list-head"><strong>{filtered.length} registro(s)</strong><label className="crud-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar"/></label></div>{!filtered.length ? <div className="crud-empty">Nenhum registro encontrado neste tenant.</div> : <div className="crud-table-wrap"><table><thead><tr>{fields.map(field => <th key={field.key}>{field.label}</th>)}<th>Ações</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{fields.map(field => <td key={field.key}>{valueForForm(row[field.key]) || '—'}</td>)}<td><div className="crud-actions"><button type="button" onClick={() => edit(row)}>Editar</button><button type="button" onClick={() => void remove(row.id)} title="Excluir"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}</section>
    </div>
  </div>
}
