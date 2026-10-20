/**
 * SYNQRA ERP — LISTAGEM MESTRE DE PRODUTOS
 * Revisão: 2026-10-19 | Reconstrução da listagem e integração com ficha mestre.
 * Dados reais do tenant autenticado; sem registros demonstrativos.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Building2, Filter, HelpCircle, Layers, Plus, Printer, RefreshCw, Search, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type ProductRow = {
  id: string
  codigo: string
  nome: string
  categoria: string | null
  unidade: string
  cliente: string | null
  ativo: boolean
  grupo: string | null
  subgrupo: string | null
  codigo_barras: string | null
}
const input = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-600'
const th = 'h-8 border-b border-slate-700 bg-[#123B50] px-2 text-left text-[9px] font-black uppercase tracking-wide text-white'
const td = 'h-8 border-b border-slate-100 px-2 py-1 align-middle text-[10px] text-slate-700'

export default function ListagemProdutos({
  onOpenFicha,
  onNewFicha,
  selectedId,
  refreshKey = 0,
}: {
  onOpenFicha: (id?: string) => void
  onNewFicha?: () => void
  selectedId?: string
  refreshKey?: number
}) {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('')
  const [cliente, setCliente] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão corporativa não autenticada.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_produtos')
        .select('id,codigo,nome,categoria,unidade,cliente,ativo,grupo,subgrupo,codigo_barras')
        .eq('empresa_id', String(tenant.data)).order('codigo', { ascending: true }).limit(2000)
      if (result.error) throw result.error
      setRows((result.data ?? []) as ProductRow[])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar catálogo mestre.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])
  const categorias = useMemo(() => [...new Set(rows.map(x => x.categoria).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b,'pt-BR')), [rows])
  const unidades = useMemo(() => [...new Set(rows.map(x => x.unidade).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR')), [rows])
  const clientes = useMemo(() => [...new Set(rows.map(x => x.cliente).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b,'pt-BR')), [rows])
  const data = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(x =>
      (!term || [x.codigo,x.nome,x.grupo,x.subgrupo,x.codigo_barras].some(v => String(v ?? '').toLocaleLowerCase('pt-BR').includes(term))) &&
      (!categoria || x.categoria === categoria) && (!unidade || x.unidade === unidade) && (!cliente || x.cliente === cliente)
    )
  }, [rows,q,categoria,unidade,cliente])
  const hasFilters = Boolean(q || categoria || unidade || cliente)
  const clear = () => { setQ(''); setCategoria(''); setUnidade(''); setCliente('') }

  return <section className="min-w-0 space-y-2 bg-transparent text-[11px] text-slate-800">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
      <div className="min-w-0"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-sky-700"><Box size={12}/> Cadastro mestre · Produtos</p><h2 className="text-sm font-black uppercase text-slate-900">Listagem geral</h2><p className="text-[10px] text-slate-500">Dados reais da empresa autenticada.</p></div>
      <div className="flex flex-wrap gap-1">
        <Link to="/ajuda/listagem-produtos" className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase"><HelpCircle size={12}/> POP</Link>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase disabled:opacity-50"><RefreshCw size={12} className={busy?'animate-spin':''}/> Atualizar</button>
        {onNewFicha && <button type="button" onClick={onNewFicha} className="inline-flex h-8 items-center gap-1 rounded-[2px] bg-[#D9822B] px-2 text-[9px] font-black uppercase text-white hover:bg-[#bd6d20]"><Plus size={12}/> Novo</button>}
      </div>
    </header>
    {error && <div role="alert" className="rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800">Falha ao carregar produtos: {error}</div>}
    <section className="grid grid-cols-1 items-end gap-2 rounded-[2px] border border-slate-200 bg-white p-2 sm:grid-cols-2">
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500 sm:col-span-2"><Filter size={11} className="text-sky-700"/> Filtros</div>
      <label className={label+' sm:col-span-2'}>SKU / descrição
        <span className="flex h-8 min-w-0 items-center gap-2 rounded-[2px] border border-slate-300 px-2 focus-within:border-sky-600"><Search size={12} className="shrink-0 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Código, nome, grupo, subgrupo ou barras" className="h-full min-w-0 flex-1 border-0 bg-transparent text-[11px] outline-none"/></span>
      </label>
      <label className={label}><span className="flex items-center gap-1"><Layers size={10}/> Categoria</span><select className={input} value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas</option>{categorias.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label className={label}><span className="flex items-center gap-1"><Tag size={10}/> Unidade</span><select className={input} value={unidade} onChange={e=>setUnidade(e.target.value)}><option value="">Todas</option>{unidades.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label className={label+' sm:col-span-2'}><span className="flex items-center gap-1"><Building2 size={10}/> Cliente / mercado</span><select className={input} value={cliente} onChange={e=>setCliente(e.target.value)}><option value="">Todos</option>{clientes.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:col-span-2"><span className="text-[10px] text-slate-500">{busy?'Sincronizando…':`${data.length} item(ns) de ${rows.length}`}</span><div className="flex gap-1">{hasFilters&&<button type="button" onClick={clear} className="h-7 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold">Limpar</button>}<button type="button" onClick={()=>window.print()} className="inline-flex h-7 items-center gap-1 rounded-[2px] bg-[#123B50] px-2 text-[9px] font-black uppercase text-white"><Printer size={11}/> Imprimir</button></div></div>
    </section>
    <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[530px] border-collapse text-left">
        <thead><tr><th className={th+' w-24'}>SKU</th><th className={th}>Produto</th><th className={th+' w-20'}>U.M.</th><th className={th+' w-20'}>Status</th><th className={th+' w-16'}>Ação</th></tr></thead>
        <tbody>{data.map((p,i)=><tr key={p.id} onClick={()=>onOpenFicha(p.id)} className={`cursor-pointer transition-colors hover:bg-sky-50 ${selectedId===p.id?'bg-sky-100':' '}${i%2===0?'':'bg-slate-50/60'}`}>
          <td className={td+' whitespace-nowrap font-mono font-bold text-sky-800'}>{p.codigo}</td><td className={td}><span className="block truncate font-semibold text-slate-900" title={p.nome}>{p.nome}</span><span className="block truncate text-[9px] text-slate-500">{p.grupo||p.categoria||'Sem grupo'}{p.cliente?' · '+p.cliente:''}</span></td><td className={td+' text-center font-mono'}>{p.unidade}</td><td className={td+' text-center'}><span className={p.ativo?'font-bold text-emerald-700':'font-bold text-rose-700'}>{p.ativo?'ATIVO':'INATIVO'}</span></td><td className={td+' text-center'}><button type="button" onClick={e=>{e.stopPropagation();onOpenFicha(p.id)}} className="h-6 rounded-[2px] bg-[#123B50] px-2 text-[9px] font-bold uppercase text-white">Editar</button></td>
        </tr>)}{!busy&&!error&&!data.length&&<tr><td colSpan={5} className="px-3 py-8 text-center"><p className="text-xs font-bold">Nenhum produto encontrado</p><p className="mt-1 text-[10px] text-slate-500">{rows.length?'Ajuste os filtros.':'Não há produtos cadastrados para esta empresa.'}</p></td></tr>}</tbody>
      </table></div>
      {busy&&<div className="border-t border-slate-200 bg-slate-50 p-2 text-center text-[10px] text-slate-500">Sincronizando com o Supabase…</div>}
    </section>
  </section>
}
