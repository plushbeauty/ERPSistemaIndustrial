import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, History, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Log = {
  id: string
  created_at: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
}
type User = { auth_user_id: string | null; nome: string | null; email: string | null }

const PAGE_SIZE = 25

export default function AdminLogs() {
  const [rows, setRows] = useState<Log[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [moduleOptions, setModuleOptions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [usuarioFiltro, setUsuarioFiltro] = useState('Todos')
  const [moduloFiltro, setModuloFiltro] = useState('Todos')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      let logQuery = supabase.from('erp_audit_logs')
        .select('id,created_at,actor_user_id,action,entity_type,entity_id', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (usuarioFiltro !== 'Todos') logQuery = logQuery.eq('actor_user_id', usuarioFiltro)
      if (moduloFiltro !== 'Todos') logQuery = logQuery.eq('entity_type', moduloFiltro)

      const [logResult, userRows] = await Promise.all([
        logQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        fetchAllPages<User>((from, to) => supabase.from('erp_usuarios')
          .select('auth_user_id,nome,email', { count: 'exact' })
          .eq('ativo', true)
          .is('deleted_at', null)
          .order('nome')
          .range(from, to)),
      ])
      if (logResult.error) throw logResult.error
      setRows((logResult.data ?? []) as Log[])
      setTotal(logResult.count ?? 0)
      setUsers(userRows)
      setModuleOptions(current => Array.from(new Set([
        ...current,
        ...(logResult.data ?? []).map(row => String(row.entity_type ?? '')).filter(Boolean),
        ...(moduloFiltro === 'Todos' ? [] : [moduloFiltro]),
      ])).sort((left, right) => left.localeCompare(right, 'pt-BR')))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a trilha de auditoria.')
    } finally {
      setBusy(false)
    }
  }, [moduloFiltro, page, usuarioFiltro])

  useEffect(() => { void load() }, [load])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const userMap = useMemo(() => new Map(
    users.filter((user): user is User & { auth_user_id: string } => Boolean(user.auth_user_id))
      .map(user => [user.auth_user_id, user]),
  ), [users])

  return <div className="space-y-6 bg-[#F4F7FE]">
    <header className="border-b border-slate-200 pb-4">
      <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">Configurações / Auditoria</span>
      <h2 className="text-3xl font-black tracking-tight text-slate-900">Logs do Sistema</h2>
      <p className="mt-1 text-sm text-slate-500">Rastreamento persistido em erp_audit_logs, protegido pelas políticas RLS do tenant.</p>
    </header>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Filter size={17} className="text-[#2D8DB8}" />Filtros de rastreabilidade</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-[11px] font-black uppercase text-slate-500">Filtrar por usuário
          <select value={usuarioFiltro} onChange={event => { setUsuarioFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todos">Todos os usuários</option>
            {users.filter(user => user.auth_user_id).map(user => <option key={user.auth_user_id} value={user.auth_user_id ?? ''}>{user.nome || user.email || user.auth_user_id}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-black uppercase text-slate-500">Módulo / entidade
          <select value={moduloFiltro} onChange={event => { setModuloFiltro(event.target.value); setPage(0) }} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">
            <option value="Todos">Todos os módulos</option>
            {moduleOptions.map(module => <option key={module} value={module}>{module}</option>)}
          </select>
        </label>
      </div>
    </section>
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
      <div className="flex items-center justify-between border-b border-slate-100 p-6">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><History size={17} className="text-[#2D8DB8}" />Histórico cronológico de ocorrências</h3>
        <button type="button" onClick={() => void load()} disabled={busy} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#123B50] disabled:opacity-50"><RefreshCw size={15} />Atualizar</button>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-[#123B50] text-white"><tr><th scope="col" className="p-4 text-left">Data / hora</th><th scope="col" className="p-4 text-left">Usuário</th><th scope="col" className="p-4 text-left">Entidade</th><th scope="col" className="p-4 text-left">Ação registrada</th><th scope="col" className="p-4 text-left">Registro</th></tr></thead>
          <tbody>
            {busy
              ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Consultando trilha de auditoria…</td></tr>
              : rows.length
                ? rows.map(row => <tr key={row.id} className="border-t border-slate-100 even:bg-slate-50">
                  <td className="whitespace-nowrap p-4 font-mono text-xs">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-4 font-bold">{userMap.get(row.actor_user_id ?? '')?.nome || row.actor_user_id || 'Sistema'}</td>
                  <td className="p-4 font-semibold text-[#123B50]">{row.entity_type}</td>
                  <td className="p-4">{row.action}</td>
                  <td className="p-4 text-xs text-slate-500">{row.entity_id || '—'}</td>
                </tr>)
                : <tr><td colSpan={5} className="p-10 text-center font-bold text-slate-400">Nenhum evento de auditoria foi retornado.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginação da auditoria" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
        <span>{total} evento(s) · página {Math.min(page + 1, pageCount)} de {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0 || busy} onClick={() => setPage(current => Math.max(0, current - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Anterior</button>
          <button type="button" disabled={page >= pageCount - 1 || busy} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold disabled:opacity-50">Próxima</button>
        </div>
      </nav>
    </section>
    <section className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-xl shadow-slate-200/30">
      <div className="flex items-center gap-2 font-black text-[#123B50]"><ShieldCheck size={18} className="text-[#2D8DB8}" />Rastreabilidade por empresa</div>
      <p className="mt-2 text-sm text-slate-600">A consulta usa a tabela de auditoria oficial. A separação entre tenants e a autorização de leitura são aplicadas pelo RLS do banco.</p>
    </section>
  </div>
}
