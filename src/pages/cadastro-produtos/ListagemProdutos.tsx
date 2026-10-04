import { RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type P = { id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null; ativo: boolean }

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
      if (!u.data.user) throw new Error('Sessão não autenticada.')
      const p = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (p.error) throw p.error
      if (!p.data?.empresa_id) throw new Error('Empresa não identificada.')
      const r = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,cliente,ativo').eq('empresa_id', p.data.empresa_id).order('codigo').limit(2000)
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

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-xs font-black tracking-[.2em] text-blue-700">CADASTRO MESTRE</p>
          <h2 className="text-2xl font-black text-slate-900">Listagem Geral</h2>
          <p className="text-sm font-semibold text-slate-500">Dados reais da empresa autenticada. Nenhuma linha demonstrativa é criada.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw size={17} /> Atualizar
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-xs font-black text-slate-700">
            SKU / Nome
            <span className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={17} />
              <input className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar produto" />
            </span>
          </label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Categoria<select className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{categorias.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">U.M.<select className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={unidade} onChange={e => setUnidade(e.target.value)}><option value="">Todas</option>{unidades.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-black text-slate-700">Cliente / Mercado<select className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900" value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Todos</option>{clientes.map(x => <option key={x}>{x}</option>)}</select></label>
          <button type="button" onClick={() => window.print()} className="self-end rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-md hover:bg-slate-800 print:hidden">IMPRIMIR CATÁLOGO</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="hidden border-b border-slate-200 p-5 print:block">
          <p className="font-black text-slate-900">PLASTIBOR INDUSTRIAL</p>
          <h3 className="text-xl font-black text-slate-900">CATÁLOGO MESTRE DE PRODUTOS</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="h-[54px] bg-slate-900 text-left font-black text-white"><th className="px-4">CÓDIGO SKU</th><th className="px-4">NOME DO PRODUTO</th><th className="px-4">CATEGORIA</th><th className="px-4">U.M.</th><th className="px-4">CLIENTE</th><th className="px-4">STATUS</th><th className="px-4"></th></tr></thead>
            <tbody>
              {data.map(p => <tr key={p.id} className="h-[54px] border-b border-slate-200 hover:bg-slate-50"><td className="px-4 font-black text-blue-800">{p.codigo}</td><td className="px-4 font-bold text-slate-900">{p.nome}</td><td className="px-4 text-slate-700">{p.categoria || '—'}</td><td className="px-4 text-slate-700">{p.unidade}</td><td className="px-4 text-slate-700">{p.cliente || '—'}</td><td className="px-4"><span className={p.ativo ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900' : 'rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-900'}>{p.ativo ? 'ATIVO' : 'INATIVO'}</span></td><td className="px-4"><button type="button" onClick={() => onOpenFicha(p.id)} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">ABRIR</button></td></tr>)}
              {!busy && !data.length && <tr><td colSpan={7} className="py-16 text-center"><p className="font-black text-slate-900">Nenhum produto encontrado</p><p className="text-sm font-semibold text-slate-500">{rows.length ? 'Ajuste os filtros.' : 'O banco está vazio para esta empresa.'}</p></td></tr>}
            </tbody>
          </table>
        </div>
        {busy && <p className="p-8 text-center font-bold text-slate-500">Carregando dados reais…</p>}
        {error && <p className="border-t border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{error}</p>}
      </div>

      <style>{'@media print{body{background:#fff!important}.print\\:hidden{display:none!important}.print\\:block{display:block!important}button,aside,header{display:none!important}.rounded-3xl{box-shadow:none!important;border-color:#cbd5e1!important}.bg-slate-900{background:#fff!important;color:#111827!important}.bg-white{background:#fff!important}.text-white{color:#111827!important}}'}</style>
    </section>
  )
}
