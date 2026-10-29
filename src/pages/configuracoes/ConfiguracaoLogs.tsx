/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: autenticação, paginação, estado de erro, expansão de detalhes e mascaramento visual de chaves sensíveis.
 * Não validado nesta revisão: políticas RLS de auditoria, minimização na origem, type-check/build e consultas remotas.
 */
import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, FileText, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Log = {
  id: string; empresa_id: string | null; actor_user_id: string | null; action: string
  entity_type: string; entity_id: string | null; created_at: string; old_data: unknown; new_data: unknown
}
const PAGE_SIZE = 25
const buttonClass = 'inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-[#CFE1E7] bg-white px-2 text-[9px] font-bold text-[#123B50] disabled:opacity-50'
const sensitiveKey = /password|senha|token|secret|authorization|cookie|credential|api.?key|refresh.?token|access.?token/i
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sensitiveKey.test(key) ? '[REDACTED]' : redact(item)]))
  return value
}
function stringify(value: unknown) {
  try { return JSON.stringify(redact(value), null, 2) ?? '{}' } catch { return '[Conteúdo indisponível]' }
}

export default function ConfiguracaoLogs() {
  const [rows, setRows] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sessão autenticada necessária para consultar a auditoria.')
      const { data, count, error: queryError } = await supabase.from('erp_audit_logs')
        .select('id,empresa_id,actor_user_id,action,entity_type,entity_id,created_at,old_data,new_data', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (queryError) throw queryError
      setRows((data ?? []) as Log[])
      setTotal(count ?? 0)
    } catch (cause) {
      setRows([]); setTotal(0)
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.')
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { void load() }, [load])
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <section className="space-y-2 text-[10px] text-slate-700">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] pb-2">
      <div><div className="text-[9px] font-bold uppercase tracking-wider text-[#176487]">SEGURANÇA / RASTREABILIDADE</div><h2 className="mt-1 text-[15px] font-bold text-[#123B50]">Logs e auditoria</h2><p className="mt-1 text-[10px] text-slate-500">Eventos persistidos em erp_audit_logs; o escopo é limitado pelas policies RLS.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className={buttonClass}><RefreshCw size={12}/>ATUALIZAR</button>
    </header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 p-2 text-[10px] text-red-800">{error}</div>}
    <div className="overflow-auto border border-[#CFE1E7] bg-white">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead className="bg-[#123B50] text-white"><tr>{['Data','Ação','Entidade','Empresa','Ator','Detalhes'].map(label=><th key={label} scope="col" className="h-[28px] px-2 text-[9px] font-bold uppercase tracking-wide">{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="p-5 text-center text-slate-500">Consultando auditoria persistida…</td></tr> : rows.map(row=><tr key={row.id} className="border-t border-[#E2EDF0] align-top even:bg-[#F8FCFD]">
          <td className="whitespace-nowrap px-2 py-2 text-slate-500">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="px-2 py-2 font-bold text-[#123B50]">{row.action}</td><td className="px-2 py-2">{row.entity_type}<small className="block font-mono text-slate-400">{row.entity_id || '—'}</small></td><td className="px-2 py-2 font-mono">{row.empresa_id || 'Plataforma'}</td><td className="px-2 py-2 font-mono">{row.actor_user_id || 'Sistema'}</td>
          <td className="max-w-[360px] px-2 py-2"><details><summary className="flex cursor-pointer items-center gap-1 text-[#176487]"><ChevronDown size={12}/>Ver alterações</summary><div className="mt-2 grid gap-2"><div><strong>Antes</strong><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all border border-[#E2EDF0] bg-[#F8FCFD] p-2 font-mono text-[9px]">{stringify(row.old_data)}</pre></div><div><strong>Depois</strong><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all border border-[#E2EDF0] bg-[#F8FCFD] p-2 font-mono text-[9px]">{stringify(row.new_data)}</pre></div></div></details></td>
        </tr>)}</tbody>
      </table>
      {!loading && !rows.length && !error && <div className="p-5 text-center text-slate-500"><FileText size={20} className="mx-auto mb-2 text-[#2D8DB8]"/>Nenhum evento de auditoria foi retornado.</div>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500"><span>{total} evento(s) · página {Math.min(page+1,pageCount)} de {pageCount}</span><div className="flex gap-1"><button type="button" disabled={page===0||loading} onClick={()=>setPage(value=>Math.max(0,value-1))} className={buttonClass}>ANTERIOR</button><button type="button" disabled={page>=pageCount-1||loading} onClick={()=>setPage(value=>Math.min(pageCount-1,value+1))} className={buttonClass}>PRÓXIMA</button></div></footer>
  </section>
}
