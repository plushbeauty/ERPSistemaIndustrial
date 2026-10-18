/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: REV-CUSTOS-014
 * @STATUS: REESTRUTURACAO-UI-PENDENTE-CI
 * @ESCOPO: layout compacto em grid de 12 colunas, sem estilos inline; consultas sempre isoladas por empresa.
 * @NOTA: regra de rateio por produto/lote depende de política contábil aprovada; valores mensais não são automaticamente tratados como custo unitário.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Plus, Save, RefreshCw, Building2, Factory, DollarSign, Layers, PieChart, AlertTriangle, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Center = { id: string; codigo: string; nome: string; tipo: string; parent_id: string | null; ativo: boolean }
type Fixed = { id: string; centro_custo_id: string; categoria: string; descricao: string; valor_mensal: number; percentual_rateio: number; ativo: boolean }
type Product = { id: string; codigo: string; nome: string; custo_materiais_unitario: number; preco_venda: number }
type Tab = 'visao' | 'centros' | 'fixos' | 'produto'
type CostRow = { produto_id: string; materiais: number | null; quantidade_base: number | null; created_at: string }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
const inputClass = 'h-8 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-500'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border px-2.5 text-[10px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40'

export default function CentralCustosIndustrial() {
  const [empresa, setEmpresa] = useState('')
  const [centers, setCenters] = useState<Center[]>([])
  const [fixed, setFixed] = useState<Fixed[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<Tab>('visao')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [newCenter, setNewCenter] = useState({ codigo: '', nome: '', tipo: 'OPERACIONAL' })
  const [newFixed, setNewFixed] = useState({ centro: '', categoria: 'ENERGIA', descricao: '', valor: '0', rateio: '100' })
  const [calc, setCalc] = useState({ produto: '', qtd: '1', mao: '0', maquina: '0', energia: '0', indireto: '0', terceirizacao: '0', embalagem: '0', perda: '0', markup: '20' })

  const load = useCallback(async () => {
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada. Selecione uma empresa autorizada antes de consultar custos.')
      const companyId = String(tenant.data)
      const [centerRows, fixedRows, productRows, costRows] = await Promise.all([
        fetchAllPages<Center>((from, to) => supabase.from('erp_centros_custos').select('id,codigo,nome,tipo,parent_id,ativo', { count: 'exact' }).eq('empresa_id', companyId).order('codigo').range(from, to)),
        fetchAllPages<Fixed>((from, to) => supabase.from('erp_custos_fixos').select('id,centro_custo_id,categoria,descricao,valor_mensal,percentual_rateio,ativo', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('descricao').range(from, to)),
        fetchAllPages<Omit<Product, 'custo_materiais_unitario'>>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,preco_venda', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<CostRow>((from, to) => supabase.from('erp_custos_produtos').select('produto_id,materiais,quantidade_base,created_at', { count: 'exact' }).eq('empresa_id', companyId).order('created_at', { ascending: false }).range(from, to))
      ])
      const unitMaterials = new Map<string, number>()
      for (const row of costRows) {
        if (!unitMaterials.has(row.produto_id)) {
          const quantity = Number(row.quantidade_base || 0)
          unitMaterials.set(row.produto_id, quantity > 0 ? Number(row.materiais || 0) / quantity : 0)
        }
      }
      setEmpresa(companyId)
      setCenters(centerRows)
      setFixed(fixedRows)
      setProducts(productRows.map(product => ({ ...product, custo_materiais_unitario: unitMaterials.get(product.id) ?? 0 })))
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Não foi possível carregar os custos no Supabase.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totalFixed = useMemo(() => fixed.reduce((sum, row) => sum + Number(row.valor_mensal || 0) * Number(row.percentual_rateio || 0) / 100, 0), [fixed])
  const selected = products.find(product => product.id === calc.produto)
  const quantity = Math.max(1, Number(calc.qtd) || 1)
  const estimated = selected ? (Number(selected.custo_materiais_unitario) || 0) * quantity : 0
  const operational = [calc.mao, calc.maquina, calc.energia, calc.indireto, calc.terceirizacao, calc.embalagem, calc.perda].reduce((sum, value) => sum + (Number(value) || 0), 0)
  const total = estimated + operational
  const price = total * (1 + (Number(calc.markup) || 0) / 100)

  async function addCenter() {
    setErr(''); setMsg('')
    if (!empresa || !newCenter.codigo.trim() || !newCenter.nome.trim()) { setErr('Informe o código e o nome do centro.'); return }
    const result = await supabase.from('erp_centros_custos').insert({ ...newCenter, empresa_id: empresa })
    if (result.error) { setErr(result.error.message); return }
    setMsg('Centro de custo criado.')
    setNewCenter({ codigo: '', nome: '', tipo: 'OPERACIONAL' })
    await load()
  }

  async function addFixed() {
    setErr(''); setMsg('')
    const value = Number(newFixed.valor)
    const rate = Number(newFixed.rateio)
    if (!empresa || !newFixed.centro || !newFixed.descricao.trim() || !Number.isFinite(value) || value < 0 || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      setErr('Informe centro, descrição, valor válido e rateio entre 0% e 100%.'); return
    }
    const result = await supabase.from('erp_custos_fixos').insert({ empresa_id: empresa, centro_custo_id: newFixed.centro, categoria: newFixed.categoria, descricao: newFixed.descricao.trim(), valor_mensal: value, percentual_rateio: rate })
    if (result.error) { setErr(result.error.message); return }
    setMsg('Custo fixo salvo.')
    setNewFixed(current => ({ ...current, descricao: '', valor: '0' }))
    await load()
  }

  async function saveCost() {
    setErr(''); setMsg('')
    if (!empresa || !selected) { setErr('Selecione um produto cadastrado.'); return }
    if (!Number.isFinite(estimated) || estimated <= 0) { setErr('O produto não possui custo unitário de materiais válido na base mais recente. Registre e valide a base antes de precificar.'); return }
    const markup = Number(calc.markup) || 0
    const result = await supabase.from('erp_custos_produtos').insert({
      empresa_id: empresa, produto_id: selected.id, tipo_calculo: 'PLANEJADO', materiais: estimated,
      mao_obra: Number(calc.mao) || 0, maquinas: Number(calc.maquina) || 0, energia: Number(calc.energia) || 0,
      custos_indiretos: Number(calc.indireto) || 0, terceirizacao: Number(calc.terceirizacao) || 0,
      embalagem: Number(calc.embalagem) || 0, perdas_refugo: Number(calc.perda) || 0,
      custo_fabricacao: total, custo_total: total, quantidade_base: quantity, preco_venda: price,
      markup_percentual: markup, margem_valor: price - total, margem_percentual: price ? ((price - total) / price) * 100 : 0
    })
    if (result.error) { setErr(result.error.message); return }
    setMsg('Cálculo planejado gravado. Revise o rateio fixo segundo a política contábil antes de tratar o preço como preço homologado.')
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof PieChart }> = [
    { id: 'visao', label: 'Visão geral', icon: PieChart },
    { id: 'centros', label: 'Centros de custo', icon: Building2 },
    { id: 'fixos', label: 'Custos fixos', icon: DollarSign },
    { id: 'produto', label: 'Custo do produto', icon: Calculator }
  ]

  return (
    <main className="mx-auto min-h-full w-full max-w-[1600px] space-y-3 bg-[#F4FBFD] p-3 text-[#123B50]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#123B50] pb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-700">Financeiro • Engenharia de custos</span>
          <h1 className="mt-1 text-base font-black uppercase">Central de Custos Industriais</h1>
          <p className="mt-1 text-[10px] text-slate-600">Centros de responsabilidade, despesas fixas e formação planejada do custo do produto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ajuda/central-custos" className={buttonClass + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}><BookOpen size={13} /> POP de ajuda</Link>
          <button type="button" onClick={() => void load()} disabled={busy} className={buttonClass + ' border-sky-700 bg-sky-700 text-white hover:bg-sky-800'}><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Atualizar</button>
        </div>
      </header>

      {err && <div role="alert" className="flex items-start gap-2 border border-red-300 bg-red-50 p-2 text-[10px] font-bold text-red-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{err}</div>}
      {msg && <div role="status" className="border border-emerald-300 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800">{msg}</div>}

      <nav aria-label="Abas da Central de Custos" className="grid grid-cols-2 gap-1 border border-slate-300 bg-white p-1 md:grid-cols-4">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={'flex h-8 items-center justify-center gap-1.5 border px-2 text-[10px] font-black uppercase ' + (tab === id ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50')}><Icon size={13} />{label}</button>)}
      </nav>

      {tab === 'visao' && <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <article className="border-l-4 border-emerald-600 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase text-slate-500">Custo fixo rateado mensal</span><strong className="mt-1 block font-mono text-base font-black">{money(totalFixed)}</strong></article>
          <article className="border-l-4 border-sky-600 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase text-slate-500">Centros ativos</span><strong className="mt-1 block font-mono text-base font-black">{centers.filter(row => row.ativo).length}</strong></article>
          <article className="border-l-4 border-violet-600 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase text-slate-500">Produtos ativos</span><strong className="mt-1 block font-mono text-base font-black">{products.length}</strong></article>
          <article className="border-l-4 border-amber-500 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase text-slate-500">Critério de rateio</span><strong className="mt-1 block text-xs font-black">Por centro</strong></article>
        </div>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <article className="border border-slate-200 bg-white p-3"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Building2 size={15} /> Estrutura de responsabilidade</h2><p className="mt-2 text-[10px] leading-relaxed text-slate-600">Segregue despesas por centro operacional, administrativo, vendas, produção, qualidade e logística. Os registros exibidos são os retornados pelo banco da empresa autenticada.</p></article>
          <article className="border border-slate-200 bg-white p-3"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Factory size={15} /> Formação do custo industrial</h2><p className="mt-2 text-[10px] leading-relaxed text-slate-600">O cálculo planejado considera materiais, mão de obra, máquina, energia, indiretos, terceirização, embalagem e perdas. O preço sugerido não substitui a homologação contábil.</p></article>
        </div>
      </section>}

      {tab === 'centros' && <section className="space-y-3 border border-slate-200 bg-white p-3">
        <h2 className="text-[11px] font-black uppercase">Cadastrar centro de custo</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Código</span><input className={inputClass} value={newCenter.codigo} onChange={event => setNewCenter({ ...newCenter, codigo: event.target.value })} placeholder="CC-01" /></label>
          <label className="md:col-span-5"><span className={labelClass}>Nome da área / centro</span><input className={inputClass} value={newCenter.nome} onChange={event => setNewCenter({ ...newCenter, nome: event.target.value })} placeholder="Linha de produção" /></label>
          <label className="md:col-span-3"><span className={labelClass}>Classificação</span><select className={inputClass} value={newCenter.tipo} onChange={event => setNewCenter({ ...newCenter, tipo: event.target.value })}><option value="OPERACIONAL">Operacional</option><option value="ADMINISTRATIVO">Administrativo</option><option value="VENDAS">Vendas</option><option value="PRODUCAO">Produção</option><option value="QUALIDADE">Qualidade</option><option value="LOGISTICA">Logística</option></select></label>
          <div className="flex items-end md:col-span-2"><button type="button" onClick={() => void addCenter()} disabled={busy} className={buttonClass + ' w-full border-sky-700 bg-sky-700 text-white hover:bg-sky-800'}><Plus size={13} /> Inserir</button></div>
        </div>
        <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[600px] border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr>{['Código','Centro','Tipo','Status'].map(title => <th key={title} className="h-8 px-2 font-black uppercase">{title}</th>)}</tr></thead><tbody>{centers.map(row => <tr key={row.id} className="border-t border-slate-200 even:bg-slate-50"><td className="h-9 px-2 font-mono font-bold">{row.codigo}</td><td className="px-2">{row.nome}</td><td className="px-2">{row.tipo}</td><td className="px-2"><span className={row.ativo ? 'font-black text-emerald-700' : 'font-black text-red-700'}>{row.ativo ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table></div>
      </section>}

      {tab === 'fixos' && <section className="space-y-3 border border-slate-200 bg-white p-3">
        <h2 className="text-[11px] font-black uppercase">Cadastrar custo fixo mensal</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Centro destinatário</span><select className={inputClass} value={newFixed.centro} onChange={event => setNewFixed({ ...newFixed, centro: event.target.value })}><option value="">Selecione o centro</option>{centers.map(row => <option key={row.id} value={row.id}>{row.codigo} • {row.nome}</option>)}</select></label>
          <label className="md:col-span-2"><span className={labelClass}>Categoria</span><select className={inputClass} value={newFixed.categoria} onChange={event => setNewFixed({ ...newFixed, categoria: event.target.value })}>{['AGUA','ENERGIA','TELEFONE','INTERNET','ALUGUEL','FOLHA','OUTROS'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="md:col-span-3"><span className={labelClass}>Descrição</span><input className={inputClass} value={newFixed.descricao} onChange={event => setNewFixed({ ...newFixed, descricao: event.target.value })} placeholder="Descrição do lançamento" /></label>
          <label className="md:col-span-2"><span className={labelClass}>Valor mensal (R$)</span><input className={inputClass + ' text-right font-mono'} type="number" min="0" step="0.01" value={newFixed.valor} onChange={event => setNewFixed({ ...newFixed, valor: event.target.value })} /></label>
          <label className="md:col-span-1"><span className={labelClass}>Rateio %</span><input className={inputClass + ' text-right font-mono'} type="number" min="0" max="100" value={newFixed.rateio} onChange={event => setNewFixed({ ...newFixed, rateio: event.target.value })} /></label>
          <div className="flex items-end md:col-span-1"><button type="button" onClick={() => void addFixed()} disabled={busy} className={buttonClass + ' w-full border-sky-700 bg-sky-700 px-1 text-white hover:bg-sky-800'}><Save size={13} /></button></div>
        </div>
        <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[700px] border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr>{['Categoria','Descrição','Centro','Valor mensal','Rateio'].map(title => <th key={title} className="h-8 px-2 font-black uppercase">{title}</th>)}</tr></thead><tbody>{fixed.map(row => <tr key={row.id} className="border-t border-slate-200 even:bg-slate-50"><td className="h-9 px-2">{row.categoria}</td><td className="px-2">{row.descricao}</td><td className="px-2">{centers.find(center => center.id === row.centro_custo_id)?.nome || '—'}</td><td className="px-2 text-right font-mono">{money(Number(row.valor_mensal))}</td><td className="px-2 text-right font-mono">{Number(row.percentual_rateio)}%</td></tr>)}</tbody></table></div>
      </section>}

      {tab === 'produto' && <section className="space-y-3 border border-slate-200 bg-white p-3">
        <h2 className="text-[11px] font-black uppercase">Formação planejada do custo e preço</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <label className="lg:col-span-5"><span className={labelClass}>Produto / SKU</span><select className={inputClass} value={calc.produto} onChange={event => setCalc({ ...calc, produto: event.target.value })}><option value="">Selecione o produto</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} • {product.nome}</option>)}</select></label>
          <label className="lg:col-span-2"><span className={labelClass}>Quantidade do lote</span><input className={inputClass} type="number" min="1" value={calc.qtd} onChange={event => setCalc({ ...calc, qtd: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Mão de obra (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.mao} onChange={event => setCalc({ ...calc, mao: event.target.value })} /></label>
          <label className="lg:col-span-3"><span className={labelClass}>Máquinas (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.maquina} onChange={event => setCalc({ ...calc, maquina: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Energia (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.energia} onChange={event => setCalc({ ...calc, energia: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Indiretos (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.indireto} onChange={event => setCalc({ ...calc, indireto: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Terceirização (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.terceirizacao} onChange={event => setCalc({ ...calc, terceirizacao: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Embalagem (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.embalagem} onChange={event => setCalc({ ...calc, embalagem: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Perdas / refugo (R$)</span><input className={inputClass} type="number" min="0" step="0.01" value={calc.perda} onChange={event => setCalc({ ...calc, perda: event.target.value })} /></label>
          <label className="lg:col-span-2"><span className={labelClass}>Markup (%)</span><input className={inputClass + ' border-sky-300 bg-sky-50 text-center font-black'} type="number" min="0" step="0.1" value={calc.markup} onChange={event => setCalc({ ...calc, markup: event.target.value })} /></label>
          <div className="flex items-end lg:col-span-2"><button type="button" disabled={!selected || busy} onClick={() => void saveCost()} className={buttonClass + ' w-full border-teal-700 bg-teal-700 text-white hover:bg-teal-800'}><Calculator size={13} /> Gravar</button></div>
        </div>
        {!selected && <p className="text-[10px] text-amber-800">Selecione um produto. O custo de materiais precisa existir na base de custos para habilitar a gravação.</p>}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <article className="border border-slate-200 bg-slate-50 p-2"><span className="text-[9px] font-black uppercase text-slate-500">Matéria-prima (BOM)</span><strong className="mt-1 block font-mono text-sm">{money(estimated)}</strong></article>
          <article className="border border-slate-200 bg-slate-50 p-2"><span className="text-[9px] font-black uppercase text-slate-500">Custos operacionais</span><strong className="mt-1 block font-mono text-sm">{money(operational)}</strong></article>
          <article className="border border-slate-200 bg-slate-50 p-2"><span className="text-[9px] font-black uppercase text-slate-500">Fixos rateados / mês</span><strong className="mt-1 block font-mono text-sm">{money(totalFixed)}</strong></article>
          <article className="border border-sky-300 bg-sky-50 p-2"><span className="text-[9px] font-black uppercase text-sky-800">Preço sugerido (markup)</span><strong className="mt-1 block font-mono text-sm text-sky-900">{money(price)}</strong></article>
        </div>
        <p className="flex items-start gap-1.5 border border-amber-200 bg-amber-50 p-2 text-[9px] leading-relaxed text-amber-900"><AlertTriangle size={13} className="mt-0.5 shrink-0" />O total mensal de custos fixos é informativo nesta tela. A alocação de despesas fixas por peça/lote deve seguir a política contábil aprovada; não é aplicada automaticamente a este preço planejado.</p>
      </section>}

      {busy && <p role="status" className="text-[9px] font-bold text-slate-500">Sincronizando dados da empresa autenticada…</p>}
      <footer className="flex items-center justify-between border-t border-slate-300 pt-2 text-[9px] text-slate-500"><span><Layers size={11} className="mr-1 inline" /> Dados consultados com escopo de empresa</span><span>REV-CUSTOS-014 • 18/10/2026</span></footer>
    </main>
  )
}
