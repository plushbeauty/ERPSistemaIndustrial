/**
 * SYNQRA ERP — LISTAGEM GERAL E FILTROS MESTRE DE PRODUTOS
 * REVISÃO: 1.1 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-LISTAGEM-20261016-12
 * ESCOPO: Alinhamento industrial compacto, filtros e impressão do catálogo.
 * NOTA: Dados reais do tenant autenticado; sem registros demonstrativos.
 */
import { RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type P = {
  id: string
  codigo: string
  nome: string
  categoria: string | null
  unidade: string
  cliente: string | null
  ativo: boolean
}

export default function ListagemProdutos({ onOpenFicha }: { onOpenFicha: (id?: string) => void }) {
  const [rows, setRows] = useState<P[]>([])
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('')
  const [cliente, setCliente] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const u = await supabase.auth.getUser()
      if (u.error) throw u.error
      if (!u.data.user) throw new Error('Sessão não autenticada.')

      const p = await supabase
        .from('erp_usuarios')
        .select('empresa_id')
        .eq('auth_user_id', u.data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (p.error) throw p.error
      if (!p.data?.empresa_id) throw new Error('Empresa não identificada.')

      const r = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,categoria,unidade,cliente,ativo')
        .eq('empresa_id', p.data.empresa_id)
        .order('codigo')
        .limit(2000)
      if (r.error) throw r.error
      setRows((r.data ?? []) as P[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar produtos.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const categorias = useMemo(() => [...new Set(rows.map(x => x.categoria).filter(Boolean) as string[])].sort(), [rows])
  const unidades = useMemo(() => [...new Set(rows.map(x => x.unidade).filter(Boolean))].sort(), [rows])
  const clientes = useMemo(() => [...new Set(rows.map(x => x.cliente).filter(Boolean) as string[])].sort(), [rows])
  const data = rows.filter(x => {
    const term = q.trim().toLowerCase()
    return (!term || (x.codigo + ' ' + x.nome).toLowerCase().includes(term))
      && (!categoria || x.categoria === categoria)
      && (!unidade || x.unidade === unidade)
      && (!cliente || x.cliente === cliente)
  })

  const labelClass = 'flex min-w-0 flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-600'
  const field = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100'
  const sectionTitle = 'mb-3 block border-b border-slate-200 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-[#2D8DB8]'
  const tableHeaderClass = 'h-9 border-b border-slate-700 bg-[#123B50] px-3 text-left align-middle text-[9px] font-bold uppercase tracking-wider text-white'
  const tableCellClass = 'h-8 border-b border-slate-200 px-3 py-1 align-middle text-[11px] font-medium text-slate-800'

  return (
    <section className="product-list-print space-y-3 bg-[#f8fafc] p-3 text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">Cadastro mestre · Produtos</p>
          <h2 className="text-base font-bold leading-6 text-[#123B50]">Listagem Geral de Itens</h2>
          <p className="text-[10px] text-slate-600">Dados reais da empresa autenticada. Nenhuma linha demonstrativa é criada.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 print:hidden">
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
          Atualizar dados
        </button>
      </div>

      <div className="rounded-[2px] border border-slate-300 bg-white p-3 shadow-sm">
        <span className={sectionTitle}>Filtros de busca</span>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className={`${labelClass} xl:col-span-2`}>
            SKU / Descrição do produto
            <span className="relative block w-full">
              <Search className="pointer-events-none absolute left-2.5 top-2 text-slate-400" size={14} />
              <input className={`${field} pl-8`} value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar código ou nome" />
            </span>
          </label>
          <label className={labelClass}>
            Categoria
            <select className={field} value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Unidade base
            <select className={field} value={unidade} onChange={e => setUnidade(e.target.value)}>
              <option value="">Todas</option>
              {unidades.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Mercado / Cliente
            <select className={field} value={cliente} onChange={e => setCliente(e.target.value)}>
              <option value="">Todos</option>
              {clientes.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
          <span className="text-[10px] text-slate-500">{busy ? 'Consultando Supabase…' : `${data.length} produto(s) exibido(s)`}</span>
          <div className="flex items-center gap-2 print:hidden">
            {(q || categoria || unidade || cliente) && <button type="button" onClick={() => { setQ(''); setCategoria(''); setUnidade(''); setCliente('') }} className="h-7 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-bold text-[#123B50] hover:bg-slate-50">Limpar filtros</button>}
            <button type="button" onClick={() => window.print()} className="h-7 rounded-[2px] bg-[#123B50] px-3 text-[10px] font-bold text-white hover:bg-[#1a4f6c]">IMPRIMIR CATÁLOGO</button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-sm">
        <div className="hidden border-b border-slate-200 bg-slate-50 p-3 print:block">
          <p className="text-[10px] font-bold tracking-wider text-slate-900">SYNQRA ERP · CADASTRO MESTRE</p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-700">CATÁLOGO OFICIAL DE PRODUTOS</h3>
          <p className="text-[9px] text-slate-500">Emitido em {new Date().toLocaleString('pt-BR')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={tableHeaderClass}>Código SKU</th>
                <th className={tableHeaderClass}>Nome / descrição técnica</th>
                <th className={tableHeaderClass}>Categoria</th>
                <th className={tableHeaderClass}>U.M.</th>
                <th className={tableHeaderClass}>Mercado / cliente</th>
                <th className={tableHeaderClass}>Status</th>
                <th className={`${tableHeaderClass} text-center print:hidden`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id} className="hover:bg-[#F4FBFD]">
                  <td className={`${tableCellClass} whitespace-nowrap font-bold tabular-nums text-[#2D8DB8]`}>{p.codigo}</td>
                  <td className={`${tableCellClass} min-w-[180px] font-semibold text-slate-900`}>{p.nome}</td>
                  <td className={tableCellClass}>{p.categoria || '—'}</td>
                  <td className={`${tableCellClass} whitespace-nowrap font-mono text-[10px]`}>{p.unidade}</td>
                  <td className={tableCellClass}>{p.cliente || '—'}</td>
                  <td className={tableCellClass}>
                    <span className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${p.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                      {p.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-center print:hidden`}>
                    <button type="button" onClick={() => onOpenFicha(p.id)} className="inline-flex h-6 items-center rounded-[2px] bg-[#123B50] px-3 text-[9px] font-bold text-white hover:bg-[#1a4f6c]">ABRIR</button>
                  </td>
                </tr>
              ))}
              {!busy && !error && !data.length && (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <p className="text-xs font-bold text-slate-800">Nenhum registro encontrado</p>
                    <p className="mt-1 text-[10px] text-slate-500">{rows.length ? 'Ajuste os filtros ou limpe a pesquisa.' : 'Não há produtos cadastrados para esta empresa.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {busy && <div className="animate-pulse border-t border-slate-200 bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-500">Sincronizando com o Supabase…</div>}
        {error && <div role="alert" className="border-t border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800">Falha ao carregar produtos: {error}</div>}
      </div>

      <style>{`@media print {
        @page { size: landscape; margin: 12mm; }
        body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .product-list-print, .product-list-print * { visibility: visible !important; }
        .product-list-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; background: #fff !important; }
        .product-list-print .print\\:hidden, .product-list-print button { display: none !important; }
        .product-list-print .print\\:block { display: block !important; }
        .product-list-print .overflow-hidden, .product-list-print .overflow-x-auto { overflow: visible !important; }
        .product-list-print table { width: 100% !important; font-size: 9pt !important; }
        .product-list-print th, .product-list-print td { border: 1px solid #cbd5e1 !important; padding: 4px 6px !important; }
        .product-list-print th { background: #fff !important; color: #111827 !important; }
        .product-list-print tr { height: auto !important; break-inside: avoid; }
        .product-list-print .shadow-sm { box-shadow: none !important; }
      }`}</style>
    </section>
  )
}
