/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYNQRA ERP — LISTAGEM MESTRE DE PRODUTOS
 * @DATA_REVISAO_ANTERIOR: 2026-10-21
 * @REVISAO_ANTERIOR: REV-PRODUTO-UI-009 — padrão claro PCP, filtros compactos e alinhamento responsivo
 * @STATUS_ANTERIOR: REVISÃO VISUAL AUTORIZADA EM 2026-10-21
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Building2, Filter, HelpCircle, Layers, Printer, RefreshCw, Search, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; ativo: boolean }
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500'
const th = 'h-8 border-b border-slate-700 bg-[#123B50] px-2.5 text-left text-[9px] font-black uppercase tracking-wider text-white'
const td = 'h-8 border-b border-slate-100 px-2.5 py-1 align-middle text-[10px] text-slate-700'

export default function ListagemProdutos({ onOpenFicha }: { onOpenFicha: (id?: string) => void }) {
  const [rows, setRows] = useState<P[]>([])
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
      const profile = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,ativo').eq('empresa_id', profile.data.empresa_id).order('codigo', { ascending: true }).limit(2000)
      if (result.error) throw result.error
      setRows((result.data ?? []) as P[])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar catálogo mestre.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const categorias = useMemo(() => [...new Set(rows.map(x => x.categoria).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const unidades = useMemo(() => [...new Set(rows.map(x => x.unidade).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const clientes = useMemo(() => [...new Set(rows.map(x => x.cliente).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const data = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(x => (!term || (x.codigo + ' ' + x.nome).toLocaleLowerCase('pt-BR').includes(term)) && (!categoria || x.categoria === categoria) && (!unidade || x.unidade === unidade) && (!cliente || x.cliente === cliente))
  }, [rows,q,categoria,unidade,cliente])
  const hasFilters = Boolean(q || categoria || unidade || cliente)
  const clear = () => { setQ(''); setCategoria(''); setUnidade(''); setCliente('') }

  return <section className="product-list-print mx-auto w-full max-w-[1500px] space-y-3 bg-transparent p-2 text-[11px] text-slate-800">
    <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
      <div><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700"><Box size={12}/> Cadastro mestre · Produtos</p><h2 className="text-sm font-black uppercase text-slate-900">Listagem Geral de Itens</h2><p className="text-[10px] text-slate-500">Dados da empresa autenticada; sem registros demonstrativos.</p></div>
      <div className="flex gap-2"><Link to="/pageprincipal/cadastros/ajuda/listagem-produtos" className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase"><HelpCircle size={12}/> POP / Ajuda</Link><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase disabled:opacity-50"><RefreshCw size={12} className={busy ? 'animate-spin' : ''}/> Atualizar</button></div>
    </header>
    {error && <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-2.5 text-[10px] font-bold text-rose-800">Falha ao carregar produtos: {error}</div>}
    <section className="no-print grid grid-cols-1 items-end gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-12">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-500 xl:col-span-12"><Filter size={11} className="text-sky-700"/> Filtros de especificação</div>
      <label className={label + ' xl:col-span-4'}>SKU / Descrição<span className="flex h-[30px] min-w-0 items-center gap-2 rounded-[2px] border border-slate-300 px-2 focus-within:border-sky-600"><Search size={13} className="shrink-0 text-slate-400"/><input maxLength={50} value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar código ou nome" className="h-full min-w-0 flex-1 border-0 bg-transparent text-[11px] text-slate-800 outline-none"/></span></label>
      <label className={label + ' xl:col-span-3'}><span className="flex items-center gap-1"><Layers size={10}/> Categoria / Família</span><select className={input} value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas as famílias</option>{categorias.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <label className={label + ' xl:col-span-2'}><span className="flex items-center gap-1"><Tag size={10}/> Unidade base</span><select className={input} value={unidade} onChange={e => setUnidade(e.target.value)}><option value="">Todas</option>{unidades.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <label className={label + ' xl:col-span-3'}><span className="flex items-center gap-1"><Building2 size={10}/> Mercado / Cliente</span><select className={input} value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Todos os mercados</option>{clientes.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 xl:col-span-12"><span className="text-[10px] font-semibold text-slate-500">{busy ? 'Sincronizando com Supabase…' : `${data.length} item(ns) filtrado(s) de ${rows.length}`}</span><div className="flex items-center gap-1.5">{hasFilters && <button type="button" onClick={clear} className="h-7 rounded border border-slate-300 bg-white px-2.5 text-[10px] font-bold">Limpar filtros</button>}<button type="button" onClick={() => window.print()} className="inline-flex h-7 items-center gap-1 rounded bg-[#123B50] px-3 text-[9px] font-black uppercase text-white"><Printer size={11}/> Imprimir catálogo</button></div></div>
    </section>
    <div className="hidden border-b-2 border-slate-900 pb-2 print:block"><p className="text-[9px] font-black uppercase text-slate-500">SYNQRA ERP · Cadastro mestre</p><h1 className="mt-1 text-base font-black uppercase text-slate-900">Catálogo mestre de produtos cadastrados</h1><p className="text-[9px] text-slate-500">Emitido em {new Date().toLocaleString('pt-BR')}</p></div>
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"><div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[850px] border-collapse text-left text-[11px]"><thead><tr><th className={th+' w-28 text-center'}>Código SKU</th><th className={th}>Nome / Descrição técnica</th><th className={th+' w-36'}>Categoria</th><th className={th+' w-20 text-center'}>U.M.</th><th className={th+' w-44'}>Mercado / Cliente</th><th className={th+' w-24 text-center'}>Situação</th><th className={th+' w-20 text-center print:hidden'}>Ficha</th></tr></thead><tbody>{data.map((p,i)=><tr key={p.id} className={`transition-colors hover:bg-sky-50/60 ${i%2===0?'bg-white':'bg-slate-50/70'}`}><td className={td+' whitespace-nowrap text-center font-mono font-bold text-sky-800'}>{p.codigo}</td><td className={td+' min-w-[220px] font-semibold text-slate-900'}>{p.nome}</td><td className={td}>{p.categoria||'—'}</td><td className={td+' text-center font-mono'}>{p.unidade}</td><td className={td}>{p.cliente||'Mercado livre'}</td><td className={td+' text-center'}><span className={`inline-flex rounded border px-2 py-0.5 text-[8px] font-black uppercase ${p.ativo?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{p.ativo?'Ativo':'Inativo'}</span></td><td className={td+' text-center print:hidden'}><button type="button" onClick={() => onOpenFicha(p.id)} className="inline-flex h-6 items-center rounded bg-[#123B50] px-2.5 text-[9px] font-bold uppercase text-white">Abrir</button></td></tr>)}{!busy&&!error&&!data.length&&<tr><td colSpan={7} className="px-3 py-10 text-center"><p className="text-xs font-bold text-slate-800">Nenhum registro encontrado</p><p className="mt-1 text-[10px] text-slate-500">{rows.length?'Ajuste ou limpe os filtros.':'Não há produtos cadastrados para esta empresa.'}</p></td></tr>}</tbody></table></div>{busy&&<div className="border-t border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-500 print:hidden">Sincronizando com o Supabase…</div>}</section>
  </section>
}
