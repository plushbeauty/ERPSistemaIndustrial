import { ArrowLeft, Plus, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type BomRow = { id: string; item_pai_id: string | null; produto_id: string; sku_insumo: string; qtd: number; unidade: string; custo_unitario: number; perda_galvanica_percent: number; perda_mecanica_percent: number; revisao: number; vigencia_inicio: string; vigencia_fim: string | null }
const input = 'h-[30px] min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100'
const label = 'mb-[2px] block text-[9px] font-medium uppercase tracking-[.04em] text-slate-600'
const button = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40'
const num = (value: string) => Number(value.trim().replace(',', '.'))

export default function EngenhariaBOM() {
  const navigate = useNavigate()
  const [tenantId, setTenantId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<BomRow[]>([])
  const [parentId, setParentId] = useState('')
  const [componentId, setComponentId] = useState('')
  const [itemParentId, setItemParentId] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('UN')
  const [cost, setCost] = useState('0')
  const [galvanic, setGalvanic] = useState('0')
  const [mechanical, setMechanical] = useState('0')
  const [revision, setRevision] = useState('1')
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa da sessão não identificada.')
      setTenantId(tenant.data)
      const productResult = await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000)
      if (productResult.error) throw productResult.error
      setProducts((productResult.data ?? []) as Product[])
      if (!parentId) { setRows([]); return }
      const bom = await supabase.from('erp_pcp_bom_itens').select('id,item_pai_id,produto_id,sku_insumo,qtd,unidade,custo_unitario,perda_galvanica_percent,perda_mecanica_percent,revisao,vigencia_inicio,vigencia_fim').eq('empresa_id', tenant.data).eq('produto_pai_id', parentId).eq('ativo', true).order('created_at')
      if (bom.error) throw bom.error
      setRows((bom.data ?? []) as BomRow[])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar a estrutura de produto.') }
    finally { setBusy(false) }
  }, [parentId])

  useEffect(() => { void load() }, [load])
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const visibleRows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    const filtered = rows.filter((row) => !q || [row.sku_insumo, productMap.get(row.produto_id)?.codigo ?? '', productMap.get(row.produto_id)?.nome ?? ''].some((value) => value.toLocaleLowerCase('pt-BR').includes(q)))
    const children = new Map<string | null, BomRow[]>()
    for (const row of filtered) children.set(row.item_pai_id, [...(children.get(row.item_pai_id) ?? []), row])
    const result: Array<{ row: BomRow; depth: number }> = []; const seen = new Set<string>()
    const walk = (id: string | null, depth: number) => { for (const row of children.get(id) ?? []) { if (seen.has(row.id)) continue; seen.add(row.id); result.push({ row, depth }); walk(row.id, depth + 1) } }
    walk(null, 0); for (const row of filtered) if (!seen.has(row.id)) result.push({ row, depth: 0 })
    return result
  }, [rows, query, productMap])
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
  const fmt = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(Number(value) || 0)

  const add = async () => {
    setError(''); setNotice('')
    const quantity = num(qty), unitCost = num(cost), lossGalvanic = num(galvanic), lossMechanical = num(mechanical), rev = Number(revision)
    if (!tenantId || !parentId || !componentId) { setError('Selecione o produto acabado e o componente cadastrado.'); return }
    if (parentId === componentId) { setError('Um produto não pode ser componente de si mesmo.'); return }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0 ||
      !Number.isFinite(lossGalvanic) || lossGalvanic < 0 || lossGalvanic >= 100 ||
      !Number.isFinite(lossMechanical) || lossMechanical < 0 || lossMechanical >= 100 ||
      !Number.isInteger(rev) || rev < 1 || !from || (to && to < from) || !unit.trim()) {
      setError('Revise quantidade, custo, perdas (0–99,9999%), revisão, unidade e vigência.'); return
    }
    setBusy(true)
    try {
      const result = await supabase.rpc('erp_pcp_bom_adicionar_detalhado', {
        p_produto_pai_id: parentId, p_produto_id: componentId,
        p_sku_insumo: productMap.get(componentId)?.codigo ?? '', p_qtd: quantity,
        p_unidade: unit.trim(), p_custo_unitario: unitCost, p_item_pai_id: itemParentId || null,
        p_perda_galvanica_percent: lossGalvanic, p_perda_mecanica_percent: lossMechanical,
        p_revisao: rev, p_vigencia_inicio: from, p_vigencia_fim: to || null,
      })
      if (result.error) throw result.error
      setComponentId(''); setItemParentId(''); setQty('1'); setCost('0'); setGalvanic('0'); setMechanical('0')
      setNotice('Componente registrado na estrutura.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao registrar componente.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]"><div className="mx-auto max-w-[1600px] space-y-2">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"><div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/engenharia')} className={button + ' border-slate-300 bg-white text-slate-700'}><ArrowLeft size={14}/>Voltar</button><div><h1 className="text-[13px] font-semibold">ENGENHARIA DE PRODUTO · BOM MULTINÍVEL</h1><p className="text-[10px] text-slate-500">Estrutura, perdas de processo, custo e vigência por empresa</p></div></div><button type="button" onClick={() => void load()} disabled={busy} className={button + ' border-slate-300 bg-white text-slate-700'}><RefreshCw size={13} className={busy ? 'animate-spin' : ''}/>Atualizar</button></header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] text-red-700">{error}</div>}{notice && <div role="status" className="border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-800">{notice}</div>}
    <section className="grid grid-cols-1 gap-2 border border-slate-200 bg-white p-2 md:grid-cols-4">
      <label><span className={label}>Produto acabado / pai</span><select className={input+' w-full'} value={parentId} onChange={(e) => {setParentId(e.target.value);setItemParentId('')}}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
      <label><span className={label}>Componente</span><select className={input+' w-full'} value={componentId} onChange={(e)=>setComponentId(e.target.value)} disabled={!parentId}><option value="">Selecione o componente</option>{products.filter(p=>p.id!==parentId).map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
      <label><span className={label}>Item superior (opcional)</span><select className={input+' w-full'} value={itemParentId} onChange={(e)=>setItemParentId(e.target.value)} disabled={!parentId}><option value="">Raiz da estrutura</option>{rows.map(r=><option key={r.id} value={r.id}>{r.sku_insumo} · {productMap.get(r.produto_id)?.nome ?? 'Componente'}</option>)}</select></label>
      <label><span className={label}>Busca rápida</span><span className="relative block"><Search size={13} className="absolute left-2 top-[8px] text-slate-400"/><input className={input+' w-full pl-7'} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Código ou descrição"/></span></label>
    </section>
    <section className="grid grid-cols-2 gap-2 border border-slate-200 bg-slate-50 p-2 sm:grid-cols-4 lg:grid-cols-7">
      <label><span className={label}>Quantidade</span><input className={input+' w-full text-right tabular-nums'} inputMode="decimal" value={qty} onChange={(e)=>setQty(e.target.value)}/></label>
      <label><span className={label}>Unidade</span><input className={input+' w-full uppercase'} maxLength={8} value={unit} onChange={(e)=>setUnit(e.target.value)}/></label>
      <label><span className={label}>Custo unitário (R$)</span><input className={input+' w-full text-right tabular-nums'} inputMode="decimal" value={cost} onChange={(e)=>setCost(e.target.value)}/></label>
      <label><span className={label}>Perda galvânica %</span><input className={input+' w-full text-right tabular-nums'} inputMode="decimal" value={galvanic} onChange={(e)=>setGalvanic(e.target.value)}/></label>
      <label><span className={label}>Perda mecânica %</span><input className={input+' w-full text-right tabular-nums'} inputMode="decimal" value={mechanical} onChange={(e)=>setMechanical(e.target.value)}/></label>
      <label><span className={label}>Revisão</span><input className={input+' w-full text-right tabular-nums'} inputMode="numeric" value={revision} onChange={(e)=>setRevision(e.target.value)}/></label>
      <div className="flex items-end"><button type="button" onClick={()=>void add()} disabled={busy||!parentId||!componentId} className={button+' w-full border-[#2D8DB8] bg-[#2D8DB8] text-white'}><Plus size={13}/>Adicionar</button></div>
      <label><span className={label}>Vigência inicial</span><input className={input+' w-full'} type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label><span className={label}>Vigência final</span><input className={input+' w-full'} type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label>
    </section>
    <section className="overflow-auto border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5"><div><h2 className="text-[11px] font-semibold">ESTRUTURA DE MATERIAIS</h2><p className="text-[9px] text-slate-500">{products.find(p=>p.id===parentId)?.codigo ?? 'Selecione o produto'} · {visibleRows.length} componentes</p></div><span className="text-[10px] text-slate-500">{busy?'Carregando…':'Dados do ERP'}</span></div>
      <table className="w-full min-w-[1050px] border-collapse text-[10px]"><thead className="sticky top-0 bg-[#123B50] text-left text-white"><tr className="h-8">{['COMPONENTE / NÍVEL','QTD.','UN.','CUSTO UNIT.','CUSTO TOTAL','PERDA GALV.','PERDA MEC.','REV.','VIGÊNCIA'].map((h,i)=><th key={h} className={'px-2 font-medium '+(i===1||(i>=3&&i<=7)?'text-right':'')}>{h}</th>)}</tr></thead><tbody>{visibleRows.map(({row,depth})=><tr key={row.id} className="h-8 border-b border-slate-100 hover:bg-neutral-50/80"><td className="px-2"><span style={{paddingLeft:depth*18}}>{depth?'↳':'•'} <b className="font-medium">{row.sku_insumo}</b> <span className="text-slate-500">{productMap.get(row.produto_id)?.nome??''}</span></span></td><td className="px-2 text-right tabular-nums">{fmt(row.qtd)}</td><td className="px-2">{row.unidade}</td><td className="px-2 text-right tabular-nums">{money(row.custo_unitario)}</td><td className="px-2 text-right tabular-nums">{money(row.qtd*row.custo_unitario)}</td><td className="px-2 text-right tabular-nums">{fmt(row.perda_galvanica_percent)}%</td><td className="px-2 text-right tabular-nums">{fmt(row.perda_mecanica_percent)}%</td><td className="px-2 text-right tabular-nums">{row.revisao}</td><td className="px-2">{row.vigencia_inicio}{row.vigencia_fim?' → '+row.vigencia_fim:' → aberto'}</td></tr>)}{!busy&&visibleRows.length===0&&<tr><td colSpan={9} className="h-16 px-3 text-center text-[10px] text-slate-500">{parentId?'Nenhum componente cadastrado.':'Selecione um produto para consultar a árvore.'}</td></tr>}</tbody></table>
    </section><p className="text-[9px] text-slate-500 print:hidden">Quantidades por unidade do produto acabado. Perdas galvânica e mecânica devem ser validadas pela Engenharia de Processo.</p>
  </div></main>
}
