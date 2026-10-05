import { useCallback, useEffect, useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Log = {
  id: string
  empresa_id: string | null
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  old_data: unknown
  new_data: unknown
}

const PAGE_SIZE = 25
const stringify = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value ?? {})

export default function ConfiguracaoLogs() {
  const [rows, setRows] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, count, error: queryError } = await supabase.from('erp_audit_logs')
        .select('id,empresa_id,actor_user_id,action,entity_type,entity_id,created_at,old_data,new_data', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (queryError) throw queryError
      setRows((data ?? []) as Log[])
      setTotal(count ?? 0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { void load() }, [load])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visibleRows = rows

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div><span className="text-[9px] font-black uppercase tracking-[.16em] text-[#176487]">ADMINISTRAÇÃO • AUDITORIA</span><h2 className="mt-1 text-xl font-black text-[#123B50]">Logs do Sistema</h2><p className="mt-1 text-[11px] font-semibold text-slate-500">Eventos persistidos em erp_audit_logs; o acesso é limitado pelas policies RLS.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[#B8D5DE] bg-white px-3 text-[10px] font-black text-[#123B50] disabled:opacity-50"><RefreshCw size={14} />ATUALIZAR</button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{error}</div>}
    <div className="overflow-auto rounded-xl border border-[#C5DEE6]">
      <table className="w-full min-w-[1050px] text-[10px]">
        <thead className="bg-[#123B50] text-white"><tr><th scope="col" className="p-3 text-left">Data</th><th scope="col" className="p-3 text-left">Ação</th><th scope="col" className="p-3 text-left">Entidade</th><th scope="col" className="p-3 text-left">Empresa</th><th scope="col" className="p-3 text-left">Ator</th><th scope="col" className="p-3 text-left">Alterações</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-500">Consultando auditoria persistida…</td></tr>
            : visibleRows.map(row => <tr key={row.id} className="border-t border-slate-100 align-top even:bg-slate-50">
              <td className="whitespace-nowrap p-3 text-slate-500">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
              <td className="p-3 font-black text-[#123B50]">{row.action}</td>
              <td className="p-3 text-slate-600">{row.entity_type}<small className="block font-mono text-slate-400">{row.entity_id || '—'}</small></td>
              <td className="p-3 font-mono text-slate-600">{row.empresa_id || 'Plataforma'}</td>
              <td className="p-3 font-mono text-slate-600">{row.actor_user_id || 'Sistema'}</td>
              <td className="max-w-[440px] whitespace-pre-wrap break-all p-3 font-mono text-slate-500">{`Antes: ${stringify(row.old_data)}\nDepois: ${stringify(row.new_data)}`}</td>
            </tr>)}
          {!loading && !visibleRows.length && <tr><td colSpan={6} className="p-8 text-center"><FileText className="mx-auto mb-2 text-[#2D8DB8]" size={24} />Nenhum evento de auditoria foi retornado.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <span>{total} evento(s) · página {Math.min(page + 1, pageCount)} de {pageCount}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page === 0 || loading} onClick={() => setPage(current => Math.max(0, current - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Anterior</button>
        <button type="button" disabled={page >= pageCount - 1 || loading} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Próxima</button>
      </div>
    </div>
  </section>
}
