/**
 * REV-CENTRAIS-031 | 2026-10-18
 * STATUS: REVISÃO VISUAL ISOLADA — GRID TAILWIND / CONSULTAS POR MÓDULO
 */
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ClipboardCheck, Factory, FileText, Gauge, HelpCircle, Plus, RefreshCw, Truck, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Module = 'financeiro' | 'expedicao' | 'metrologia' | 'treinamentos' | 'auditoria' | 'paradas' | 'refugos' | 'materiais'
type Profile = { empresa_id: string | null; is_master: boolean }
type Row = Record<string, unknown> & { id: string; erp_produtos?: { codigo: string; nome: string } | null }
type Column = [string, string]
const inputClass = 'h-8 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const money = (v: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
const date = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('pt-BR') : '—'

export default function CentraisIndustriais({ module }: { module: Module }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Sessão não encontrada.')
        const { data, error: profileError } = await supabase.from('erp_usuarios').select('empresa_id,is_master').eq('auth_user_id', auth.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profileError) throw profileError
        if (!data?.empresa_id) throw new Error('Empresa não identificada. Se o perfil for Master, selecione explicitamente uma empresa autorizada antes de consultar dados.')
        if (alive) setProfile(data as Profile)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível validar o acesso.')
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!profile) return
    let alive = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const configs: Record<Exclude<Module, 'materiais'>, { table: string; select: string; order: string; ascending?: boolean }> = {
          financeiro: { table: 'erp_contas_pagar', select: 'id,descricao,documento,valor,vencimento,pagamento,status,created_at', order: 'vencimento' },
          expedicao: { table: 'erp_expedicoes', select: 'id,numero,status,transportadora,rastreio,data_expedicao,observacoes,created_at', order: 'numero', ascending: false },
          metrologia: { table: 'erp_equipamentos_medicao', select: 'id,codigo,descricao,fabricante,modelo,status,proxima_calibracao,setor_localizacao,ultima_calibracao', order: 'codigo' },
          treinamentos: { table: 'erp_treinamentos', select: 'id,titulo,instrutor,data,carga_horas,status,evidencia_storage_path', order: 'data', ascending: false },
          auditoria: { table: 'erp_auditorias', select: 'id,auditor,criterio,data_auditoria,resultado,evidencia,created_at', order: 'data_auditoria', ascending: false },
          paradas: { table: 'erp_pcp_paradas', select: 'id,programacao_id,maquina_id,molde_id,lado_prensagem,inicio,fim,categoria,motivo,setup_changeover,observacoes', order: 'inicio', ascending: false },
          refugos: { table: 'erp_refugos_retrabalhos', select: 'id,ordem_producao_id,produto_id,tipo,quantidade,motivo,custo,created_at', order: 'created_at', ascending: false },
        }
        if (module === 'materiais') {
          throw new Error('A consulta de Materiais ainda precisa ser vinculada à tabela de estoque validada; nenhuma tabela de auditoria será exibida como substituta.')
        }
        const config = configs[module]
        let request = supabase.from(config.table).select(config.select).order(config.order, { ascending: config.ascending ?? true }).limit(500)
        if (!profile.empresa_id) throw new Error('Consulta bloqueada: nenhuma empresa foi selecionada.')
        request = request.eq('empresa_id', profile.empresa_id)
        const { data, error: queryError } = await request
        if (queryError) throw queryError
        let result = (data ?? []) as unknown as Row[]
        // Evita depender de uma FK PostgREST não confirmada para resolver o produto do refugo.
        if (module === 'refugos' && result.length) {
          const productIds = [...new Set(result.map(r => String(r.produto_id ?? '')).filter(Boolean))]
          if (productIds.length) {
            let productsQuery = supabase.from('erp_produtos').select('id,codigo,nome').in('id', productIds)
            productsQuery = productsQuery.eq('empresa_id', profile.empresa_id as string)
            const { data: products, error: productsError } = await productsQuery
            if (productsError) throw productsError
            const byId = new Map((products ?? []).map((p: { id: string; codigo: string; nome: string }) => [p.id, { codigo: p.codigo, nome: p.nome }]))
            result = result.map(r => ({ ...r, erp_produtos: byId.get(String(r.produto_id ?? '')) ?? null }))
          }
        }
        if (alive) setRows(result)
      } catch (cause) {
        if (alive) { setRows([]); setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados.') }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [profile, module, refresh])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(row => JSON.stringify(row).toLowerCase().includes(term))
  }, [rows, query])
  const titles: Record<Module, string> = { financeiro: 'Central Financeira', expedicao: 'Expedição e Logística', metrologia: 'Metrologia e Calibração', treinamentos: 'Treinamentos e Competências', auditoria: 'Auditorias e Conformidade', paradas: 'Paradas, Setup e Downtime', refugos: 'Refugo e Retrabalho', materiais: 'Materiais e Estoque' }
  const descriptions: Record<Module, string> = { financeiro: 'Contas a pagar, fluxo financeiro e compromissos da empresa.', expedicao: 'Separação, transporte, rastreio e expedição.', metrologia: 'Instrumentos, validade de calibração e certificados.', treinamentos: 'Capacitação, conclusão e evidências.', auditoria: 'Evidências e resultados das auditorias.', paradas: 'Paradas, setup/changeover e motivos no PCP.', refugos: 'Apontamento de perdas e vínculo com produto/OP.', materiais: 'Materiais e saldos de estoque; fonte de dados ainda precisa ser validada.' }
  const columns = headers(module)

  async function addFinance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile?.empresa_id) return
    const formData = new FormData(event.currentTarget)
    const { error: insertError } = await supabase.from('erp_contas_pagar').insert({ empresa_id: profile.empresa_id, descricao: String(formData.get('descricao')), documento: String(formData.get('documento') || ''), valor: Number(formData.get('valor')), vencimento: String(formData.get('vencimento')), status: 'aberta' })
    if (insertError) { setError(insertError.message); return }
    setForm(false); setRefresh(v => v + 1)
  }
  async function addExpedicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile?.empresa_id) return
    const formData = new FormData(event.currentTarget)
    const { error: insertError } = await supabase.from('erp_expedicoes').insert({ empresa_id: profile.empresa_id, numero: Number(formData.get('numero')), status: 'preparacao', transportadora: String(formData.get('transportadora') || ''), rastreio: String(formData.get('rastreio') || ''), observacoes: String(formData.get('observacoes') || '') })
    if (insertError) { setError(insertError.message); return }
    setForm(false); setRefresh(v => v + 1)
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 font-sans text-[#123B50] antialiased">
    {(module === 'metrologia' || module === 'refugos') && <QualitySidebar active={module === 'metrologia' ? '/qualidade/metrologia' : '/qualidade/refugos'} />}
    <div className="mx-auto max-w-[1700px] space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div><div className="text-[9px] font-black uppercase tracking-widest text-sky-700">ERP INDUSTRIAL • CONSOLE OPERACIONAL</div><h1 className="text-lg font-bold tracking-tight text-slate-800">{titles[module]}</h1><p className="text-[11px] text-slate-500">{descriptions[module]}</p></div>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Atualizar" onClick={() => setRefresh(v => v + 1)} className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"><RefreshCw size={13}/></button>
          {(module === 'financeiro' || module === 'expedicao') && !profile?.is_master && <button type="button" onClick={() => setForm(true)} className="flex h-8 items-center gap-1 rounded-sm bg-teal-700 px-3 text-[10px] font-black uppercase text-white hover:bg-teal-800"><Plus size={12}/> Novo registro</button>}
          <a className="inline-flex h-8 items-center gap-1 rounded-sm border border-sky-200 bg-sky-50 px-2 text-[10px] font-black text-sky-700" href={module === 'metrologia' ? '/qualidade/calibracao/ajuda' : '/ajuda/centrais-industriais'} target="_blank" rel="noreferrer"><HelpCircle size={12}/> Ajuda</a>
        </div>
      </header>
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-2 text-[11px] font-semibold text-red-800">{error}</div>}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi icon={module === 'financeiro' ? ArrowDownCircle : module === 'expedicao' ? Truck : module === 'metrologia' ? Gauge : module === 'treinamentos' ? Users : ClipboardCheck} label="Registros encontrados" value={loading ? '…' : String(filtered.length)} />
        {module === 'financeiro' && <Kpi icon={ArrowUpCircle} label="Total a pagar" value={money(rows.reduce((sum, row) => sum + Number(row.valor || 0), 0))}/>}
        {module === 'expedicao' && <Kpi icon={Truck} label="Em trânsito" value={String(rows.filter(row => /transito|transporte/i.test(String(row.status))).length)}/>}
        {module === 'metrologia' && <Kpi icon={Gauge} label="Calibrações em 30 dias" value={String(rows.filter(row => row.proxima_calibracao && new Date(String(row.proxima_calibracao)) <= new Date(Date.now() + 30 * 86400000)).length)}/>}
        {module === 'paradas' && <Kpi icon={Factory} label="Paradas abertas" value={String(rows.filter(row => !row.fim).length)}/>}
        {module === 'refugos' && <Kpi icon={AlertTriangle} label="Quantidade rejeitada" value={String(rows.reduce((sum, row) => sum + Number(row.quantidade || 0), 0))}/>}
        {module === 'auditoria' && <Kpi icon={ClipboardCheck} label="Resultados conformes" value={String(rows.filter(row => /conforme/i.test(String(row.resultado))).length)}/>}
      </section>
      <section className="flex h-8 items-center gap-2 rounded-sm border border-slate-200 bg-white px-2">
        <FileText size={13} className="shrink-0 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar descrição, código, rastreio, máquina, motivo ou status…" className="h-full min-w-0 flex-1 bg-transparent text-[11px] font-semibold outline-none"/>
      </section>
      <section className="overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="p-10 text-center text-[11px] font-bold text-slate-500">Consultando registros autorizados…</div> : filtered.length === 0 ? <div className="p-10 text-center"><FileText size={24} className="mx-auto text-slate-300"/><h2 className="mt-2 text-xs font-black text-slate-700">Nenhum registro encontrado</h2><p className="mt-1 text-[10px] text-slate-500">Não são criados dados fictícios para preencher esta central.</p></div> : <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-[#123B50] text-white"><tr>{columns.map(([key, label]) => <th key={key} className="border-b border-slate-200 px-2 py-2 text-[9px] font-black uppercase tracking-wide">{label}</th>)}</tr></thead>
          <tbody>{filtered.map(row => <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/50">{columns.map(([key]) => <td key={key} className="px-2 py-2 text-[10px] font-medium text-slate-700">{key === 'produto' ? (row.erp_produtos ? <><strong>{row.erp_produtos.codigo}</strong><span className="ml-1">{row.erp_produtos.nome}</span></> : <span>OP {String(row.ordem_producao_id || '—')} · produto não vinculado</span>) : formatCell(row, key)}</td>)}</tr>)}</tbody>
        </table>}
      </section>
      {form && <div role="dialog" aria-modal="true" aria-labelledby="central-form-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-3">
        <div className="w-full max-w-xl rounded-sm border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between"><h2 id="central-form-title" className="text-sm font-black text-slate-800">{module === 'financeiro' ? 'Nova conta a pagar' : 'Nova expedição'}</h2><button type="button" aria-label="Fechar" onClick={() => setForm(false)} className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500"><X size={15}/></button></div>
          {module === 'financeiro' ? <form onSubmit={addFinance} className="grid grid-cols-1 gap-3 sm:grid-cols-12"><Field name="descricao" label="Descrição" required span="sm:col-span-12"/><Field name="documento" label="Documento / NF" span="sm:col-span-6"/><Field name="valor" label="Valor (R$)" type="number" step="0.01" required span="sm:col-span-6"/><Field name="vencimento" label="Vencimento" type="date" required span="sm:col-span-6"/><div className="sm:col-span-12"><button type="submit" className="h-8 rounded-sm bg-sky-700 px-4 text-[10px] font-black uppercase text-white">Gravar conta</button></div></form> : <form onSubmit={addExpedicao} className="grid grid-cols-1 gap-3 sm:grid-cols-12"><Field name="numero" label="Número do manifesto" type="number" required span="sm:col-span-4"/><Field name="transportadora" label="Transportadora" span="sm:col-span-8"/><Field name="rastreio" label="Código de rastreio" span="sm:col-span-6"/><Field name="observacoes" label="Observações" span="sm:col-span-12"/><div className="sm:col-span-12"><button type="submit" className="h-8 rounded-sm bg-sky-700 px-4 text-[10px] font-black uppercase text-white">Gravar expedição</button></div></form>}
        </div>
      </div>}
    </div>
  </main>
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <article className="flex items-center gap-3 rounded-sm border border-slate-200 bg-white p-3 shadow-sm"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-sky-50 text-sky-700"><Icon size={17}/></span><div><p className="text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</p><strong className="text-base font-black text-slate-800">{value}</strong></div></article>
}
function Field({ name, label, type = 'text', required = false, step, span = 'sm:col-span-6' }: { name: string; label: string; type?: string; required?: boolean; step?: string; span?: string }) {
  return <label className={`block min-w-0 ${span}`}><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-500">{label}{required ? ' *' : ''}</span><input name={name} type={type} required={required} step={step} className={inputClass}/></label>
}
function headers(module: Module): Column[] {
  if (module === 'financeiro') return [['descricao','Descrição'],['documento','Documento'],['valor','Valor'],['vencimento','Vencimento'],['pagamento','Pagamento'],['status','Status']]
  if (module === 'expedicao') return [['numero','Manifesto'],['status','Status'],['transportadora','Transportadora'],['rastreio','Rastreio'],['data_expedicao','Data de saída']]
  if (module === 'metrologia') return [['codigo','TAG'],['descricao','Instrumento'],['status','Status'],['proxima_calibracao','Próxima calibração'],['setor_localizacao','Localização']]
  if (module === 'treinamentos') return [['titulo','Treinamento / POP'],['instrutor','Instrutor'],['data','Data'],['carga_horas','Carga horária'],['status','Status']]
  if (module === 'paradas') return [['maquina_id','Máquina'],['inicio','Início'],['fim','Fim'],['categoria','Categoria'],['motivo','Motivo'],['setup_changeover','Setup']]
  if (module === 'refugos') return [['produto','Produto / OP'],['tipo','Tipo'],['quantidade','Quantidade'],['motivo','Motivo'],['custo','Custo estimado'],['created_at','Registro']]
  if (module === 'materiais') return [['id','Registro']]
  return [['auditor','Auditor'],['criterio','Critério'],['data_auditoria','Data'],['resultado','Resultado'],['evidencia','Evidência']]
}
function formatCell(row: Row, key: string) {
  if (key === 'valor' || key === 'custo') return money(row[key])
  if (key.includes('data') || key === 'vencimento' || key === 'pagamento' || key === 'proxima_calibracao' || key === 'inicio' || key === 'fim' || key === 'created_at') return date(row[key])
  const value = row[key]
  return value == null || value === '' ? '—' : String(value)
}
