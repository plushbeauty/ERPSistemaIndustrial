/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO: 2026-11-24
 * @REVISAO: REV-CADASTRO-PRODUTOS-PADRAO-OURO-20261124-03
 * Catálogo completo com filtros, KPIs, paginação e clientes resolvidos por código/nome.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Building2, ChevronLeft, ChevronRight, Filter, HelpCircle, Layers, Plus, Printer, RefreshCw, Search, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; ativo: boolean }
type Client = { id: string; codigo: string | null; nome: string; documento: string | null }
const PAGE_SIZE = 25
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-600'
const th = 'h-8 border-b border-slate-700 bg-[#123B50] px-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-white'
const td = 'h-8 border-b border-slate-100 px-2.5 py-1 align-middle text-[10px] text-slate-700'

export default function ListagemProdutos({ onOpenFicha }: { onOpenFicha: (id?: string) => void }) {
  const [rows, setRows] = useState<P[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('')
  const [cliente, setCliente] = useState('')
  const [status, setStatus] = useState<'all' | 'ativo' | 'inativo' | 'com_cliente'>('all')
  const [page, setPage] = useState(1)
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
      const empresaId = profile.data?.empresa_id
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      const [products, customerRows] = await Promise.all([
        fetchAllPages<P>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,ativo', { count: 'exact' }).eq('empresa_id', empresaId).order('codigo').order('id').range(from, to)),
        fetchAllPages<Client>((from, to) => supabase.from('erp_clientes').select('id,codigo,nome,documento', { count: 'exact' }).eq('empresa_id', empresaId).eq('ativo', true).order('nome').order('id').range(from, to)),
      ])
      setRows(products); setClients(customerRows)
    } catch (e) {
      setRows([]); setClients([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar catálogo mestre.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const clientByName = useMemo(() => {
    const map = new Map<string, Client | null>()
    clients.forEach(item => {
      const key = item.nome.trim().toLocaleLowerCase('pt-BR')
      if (!key) return
      if (map.has(key)) map.set(key, null)
      else map.set(key, item)
    })
    return map
  }, [clients])
  const categories = useMemo(() => [...new Set(rows.map(item => item.categoria).filter((value): value is string => Boolean(value)))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const units = useMemo(() => [...new Set(rows.map(item => item.unidade).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const customerNames = useMemo(() => [...new Set(rows.map(item => item.cliente).filter((value): value is string => Boolean(value)))].sort((a,b) => a.localeCompare(b, 'pt-BR')), [rows])
  const kpis = useMemo(() => ({ total: rows.length, active: rows.filter(item => item.ativo).length, inactive: rows.filter(item => !item.ativo).length, linked: rows.filter(item => Boolean(item.cliente)).length }), [rows])
  const data = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(item => {
      const customer = item.cliente ? clientByName.get(item.cliente.trim().toLocaleLowerCase('pt-BR')) : undefined
      const haystack = `${item.codigo} ${item.nome} ${item.categoria ?? ''} ${item.cliente ?? ''} ${customer?.codigo ?? ''} ${customer?.documento ?? ''}`.toLocaleLowerCase('pt-BR')
      if (term && !haystack.includes(term)) return false
      if (categoria && item.categoria !== categoria) return false
      if (unidade && item.unidade !== unidade) return false
      if (cliente && item.cliente !== cliente) return false
      if (status === 'ativo' && !item.ativo) return false
      if (status === 'inativo' && item.ativo) return false
      if (status === 'com_cliente' && !item.cliente) return false
      return true
    })
  }, [rows, q, categoria, unidade, cliente, status, clientByName])
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => data.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [data, safePage])
  useEffect(() => { setPage(1) }, [q, categoria, unidade, cliente, status])
  const hasFilters = Boolean(q || categoria || unidade || cliente || status !== 'all')
  const clear = () => { setQ(''); setCategoria(''); setUnidade(''); setCliente(''); setStatus('all') }

  return (
    <section className="product-list-print mx-auto w-full max-w-[1500px] space-y-3 text-[11px] text-slate-800">
      <header className="no-print flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]"><Box size={12}/> Cadastro Mestre · Produtos</p><h2 className="text-sm font-bold text-slate-900">Listagem Geral de Produtos</h2><p className="text-[9px] text-slate-500">Catálogo da empresa autenticada · dados reais do banco</p></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to="/pageprincipal/cadastros/ajuda/listagem-produtos" className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"><HelpCircle size={12}/> Ajuda</Link>
          <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"><Printer size={12}/> Imprimir</button>
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={12} className={busy ? 'animate-spin' : ''}/> Atualizar</button>
          <button type="button" onClick={() => onOpenFicha()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[9px] font-bold uppercase text-white hover:bg-[#246f91]"><Plus size={12}/> Novo Produto</button>
        </div>
      </header>

      <div className="no-print grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { id: 'all' as const, title: 'Total de Produtos', value: kpis.total, tone: 'text-slate-900' },
          { id: 'ativo' as const, title: 'Ativos', value: kpis.active, tone: 'text-emerald-700' },
          { id: 'inativo' as const, title: 'Inativos', value: kpis.inactive, tone: 'text-rose-700' },
          { id: 'com_cliente' as const, title: 'Com Cliente', value: kpis.linked, tone: 'text-[#2D8DB8]' },
        ].map(card => <button key={card.id} type="button" onClick={() => setStatus(current => current === card.id ? 'all' : card.id)} className={`rounded-[2px] border p-2.5 text-left transition-colors ${status === card.id ? 'border-[#2D8DB8] bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{card.title}</p><p className={`mt-1 font-mono text-lg font-bold tabular-nums ${card.tone}`}>{card.value}</p></button>)}
      </div>

      {error && <div role="alert" className="rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-800">Falha ao carregar produtos: {error}</div>}

      <section className="no-print grid grid-cols-1 items-end gap-2 rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-12">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8] xl:col-span-12"><Filter size={12}/> Filtros de Especificação</div>
        <label className={label + ' xl:col-span-4'}>SKU / Descrição / Cliente<span className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-2 focus-within:border-[#2D8DB8]"><Search size={12} className="text-slate-400"/><input value={q} onChange={e => setQ(e.target.value)} maxLength={80} placeholder="Pesquisar código, produto ou cliente" className="h-full min-w-0 flex-1 border-0 bg-transparent text-[11px] outline-none"/></span></label>
        <label className={label + ' xl:col-span-3'}><span className="flex items-center gap-1"><Layers size={11}/> Categoria</span><select className={input} value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas as categorias</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className={label + ' xl:col-span-2'}><span className="flex items-center gap-1"><Tag size={11}/> Unidade</span><select className={input} value={unidade} onChange={e => setUnidade(e.target.value)}><option value="">Todas</option>{units.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className={label + ' xl:col-span-3'}><span className="flex items-center gap-1"><Building2 size={11}/> Cliente</span><select className={input} value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Todos os clientes</option>{customerNames.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 xl:col-span-12"><span className="text-[10px] text-slate-500">{busy ? 'Sincronizando com o banco…' : `${data.length} item(ns) filtrado(s) de ${rows.length}`}</span>{hasFilters && <button type="button" onClick={clear} className="inline-flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-3 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50">Limpar Filtros</button>}</div>
      </section>

      <div className="hidden border-b-2 border-slate-900 pb-2 print:block"><p className="text-[9px] font-bold uppercase text-slate-500">SYSNQRA ERP · Cadastro Mestre</p><h1 className="mt-1 text-sm font-bold uppercase text-slate-900">Catálogo de Produtos</h1><p className="text-[9px] text-slate-500">Emitido em {new Date().toLocaleString('pt-BR')}</p></div>
      <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[980px] border-collapse text-left text-[10px]"><thead><tr><th className={th + ' w-28'}>Código SKU</th><th className={th}>Nome / Descrição</th><th className={th + ' w-32'}>Categoria</th><th className={th + ' w-14 text-center'}>U.M.</th><th className={th + ' w-28'}>Cód. Cliente</th><th className={th + ' w-44'}>Nome do Cliente</th><th className={th + ' w-20 text-center'}>Situação</th><th className={th + ' w-20 text-center print:hidden'}>Ação</th></tr></thead>
          <tbody>{pageRows.map((item,index) => { const client = item.cliente ? clientByName.get(item.cliente.trim().toLocaleLowerCase('pt-BR')) : undefined; return <tr key={item.id} className={`hover:bg-sky-50/70 ${index % 2 ? 'bg-slate-50/60' : 'bg-white'}`}><td className={td + ' whitespace-nowrap font-mono font-bold text-[#2D8DB8]'}>{item.codigo}</td><td className={td + ' max-w-[300px] truncate font-semibold text-slate-900'} title={item.nome}>{item.nome}</td><td className={td + ' max-w-[130px] truncate'}>{item.categoria || '—'}</td><td className={td + ' text-center font-mono'}>{item.unidade}</td><td className={td + ' whitespace-nowrap font-mono'}>{client?.codigo || '—'}</td><td className={td + ' max-w-[190px] truncate'} title={item.cliente || ''}>{item.cliente || '—'}</td><td className={td + ' text-center'}><span className={`inline-flex rounded-[2px] border px-2 py-0.5 text-[9px] font-bold ${item.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td><td className={td + ' text-center print:hidden'}><button type="button" onClick={() => onOpenFicha(item.id)} className="inline-flex h-7 items-center rounded-[2px] border border-slate-300 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-700 hover:border-[#2D8DB8] hover:text-[#2D8DB8]">Abrir</button></td></tr> })}{!busy && !error && !data.length && <tr><td colSpan={8} className="px-4 py-10 text-center"><p className="text-xs font-bold text-slate-800">Nenhum produto encontrado</p><p className="mt-1 text-[10px] text-slate-500">{rows.length ? 'Ajuste ou limpe os filtros.' : 'Não há produtos cadastrados para esta empresa.'}</p></td></tr>}</tbody>
        </table></div>
        {!busy && data.length > PAGE_SIZE && <div className="no-print flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><span className="font-mono">Página {safePage} de {totalPages} · {data.length} itens</span><div className="flex gap-1.5"><button type="button" disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1,current-1))} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 font-bold disabled:opacity-40"><ChevronLeft size={12}/> Anterior</button><button type="button" disabled={safePage >= totalPages} onClick={() => setPage(current => Math.min(totalPages,current+1))} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 font-bold disabled:opacity-40">Próxima <ChevronRight size={12}/></button></div></div>}
        {busy && <div className="border-t border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-500">Sincronizando com o banco de dados…</div>}
      </section>
    </section>
  )
}
