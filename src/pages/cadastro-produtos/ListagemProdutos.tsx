import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Building2, Filter, HelpCircle, Layers, Printer, RefreshCw, Search, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; ativo: boolean }
const input = 'h-[38px] w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label = 'grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500'
const th = 'h-10 border-b border-slate-200 bg-slate-100 px-3 text-left text-[9px] font-black uppercase tracking-[0.14em] text-slate-700'
const td = 'h-10 border-b border-slate-100 px-3 py-2 align-middle text-[10px] text-slate-700'

export default function ListagemProdutos({ onOpenFicha }: { onOpenFicha: (id?: string) => void }) {
  const [rows, setRows] = useState<P[]>([])
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('')
  const [cliente, setCliente] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão corporativa não autenticada.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,ativo').eq('empresa_id', profile.data.empresa_id).order('codigo', { ascending: true }).limit(500)
      if (result.error) throw result.error
      setRows((result.data ?? []) as P[])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar catálogo mestre.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const categorias = useMemo(() => [...new Set(rows.map(x => x.categoria).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows])
  const unidades = useMemo(() => [...new Set(rows.map(x => x.unidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows])
  const clientes = useMemo(() => [...new Set(rows.map(x => x.cliente).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows])

  const data = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR')
    return rows.filter((x) => {
      const matchesTerm = !term || `${x.codigo} ${x.nome}`.toLocaleLowerCase('pt-BR').includes(term)
      const matchesCategoria = !categoria || x.categoria === categoria
      const matchesUnidade = !unidade || x.unidade === unidade
      const matchesCliente = !cliente || x.cliente === cliente
      return matchesTerm && matchesCategoria && matchesUnidade && matchesCliente
    })
  }, [rows, q, categoria, unidade, cliente])

  const hasFilters = Boolean(q || categoria || unidade || cliente)
  const clear = () => { setQ(''); setCategoria(''); setUnidade(''); setCliente('') }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-4 bg-transparent text-[11px] text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-700"><Box size={12} /> Cadastro mestre · Produtos</p>
          <h2 className="mt-1 text-[22px] font-black tracking-[-0.05em] text-slate-900">Catálogo de produtos</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/pageprincipal/cadastros/ajuda/listagem-produtos" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase text-slate-700 shadow-sm transition hover:bg-slate-50"> <HelpCircle size={12} /> Ajuda </Link>
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase text-slate-700 shadow-sm transition hover:bg-slate-50"> <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Atualizar </button>
          <button type="button" onClick={() => onOpenFicha()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-[10px] font-black uppercase text-white shadow-md shadow-sky-200 transition hover:bg-sky-700"> <Box size={12} /> Novo produto </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10px] font-bold text-rose-800">Falha ao carregar produtos: {error}</div>}

      <section className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-12">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 xl:col-span-12">
          <Filter size={11} className="text-sky-700" />
          Filtros
        </div>

        <label className={`${label} xl:col-span-4`}>
          SKU / Descrição
          <div className="flex h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
            <Search size={12} className="text-slate-400" />
            <input aria-label="Buscar SKU ou descrição" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="w-full border-0 bg-transparent text-[11px] font-semibold text-slate-800 outline-none placeholder:text-slate-400" />
          </div>
        </label>

        <label className={`${label} xl:col-span-3`}>
          <span className="flex items-center gap-1"><Layers size={10} /> Categoria / Família</span>
          <select className={input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className={`${label} xl:col-span-2`}>
          <span className="flex items-center gap-1"><Tag size={10} /> Unidade base</span>
          <select className={input} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            <option value="">Todas</option>
            {unidades.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className={`${label} xl:col-span-3`}>
          <span className="flex items-center gap-1"><Building2 size={10} /> Mercado / Cliente</span>
          <select className={input} value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 xl:col-span-12">
          <span className="text-[10px] font-semibold text-slate-500">{busy ? 'Sincronizando catálogo...' : `${data.length} item(s) encontrado(s)`}</span>
          {hasFilters && (
            <button type="button" onClick={clear} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase text-slate-700 transition hover:bg-slate-100">
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>SKU</th>
                <th className={th}>Nome</th>
                <th className={th}>Categoria</th>
                <th className={th}>Unidade</th>
                <th className={th}>Cliente</th>
                <th className={th}>Status</th>
                <th className={th}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {busy && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Carregando catálogo...</td></tr>
              )}

              {!busy && !data.length && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Nenhum produto encontrado</td></tr>
              )}

              {!busy && data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className={td}>
                    <span className="inline-flex rounded-full bg-sky-50 px-2 py-1 font-mono text-[10px] font-black text-sky-700">{item.codigo}</span>
                  </td>
                  <td className={td}>{item.nome}</td>
                  <td className={td}>{item.categoria || '—'}</td>
                  <td className={td}>{item.unidade || '—'}</td>
                  <td className={td}>{item.cliente || '—'}</td>
                  <td className={td}>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className={td}>
                    <button type="button" onClick={() => onOpenFicha(item.id)} className="inline-flex h-8 items-center rounded-xl bg-sky-600 px-3 text-[9px] font-black uppercase text-white shadow-sm transition hover:bg-sky-700">Abrir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="hidden border-b-2 border-slate-200 pb-2 print:block">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">SYNQRA ERP · Cadastro mestre</p>
        <h1 className="mt-1 text-base font-black text-slate-900">Catálogo de produtos</h1>
      </div>

      <div className="flex items-center justify-end gap-3 print:hidden">
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase text-slate-700 shadow-sm hover:bg-slate-50"><Printer size={12} /> Imprimir </button>
      </div>
    </section>
  )
}

