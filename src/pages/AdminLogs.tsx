/**
 * @DATA_REVISAO: 2026-10-19
 * @MODULO: Configurações / Auditoria administrativa
 * @REVISAO: compactação visual Steel Blue e correção do vínculo ator/usuário.
 * @ESCOPO: mantém erp_audit_logs, RLS existente e paginação de servidor; sem DDL.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, History, RefreshCw, ShieldCheck, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
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

type User = {
  id: string
  auth_user_id: string | null
  nome: string | null
  email: string | null
}

const PAGE_SIZE = 25
const panelClass = 'border border-[#2E4A62] bg-[#123B50]'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#B8CDD8]'
const controlClass = 'h-8 w-full rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2 text-[11px] font-semibold text-[#F4FBFD] outline-none focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/30'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2E4A62] px-2.5 text-[10px] font-bold text-[#F4FBFD] transition-colors hover:border-[#48B7C7] hover:bg-[#0E1E2F] disabled:cursor-not-allowed disabled:opacity-40'

export default function AdminLogs() {
  const [rows, setRows] = useState<Log[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [moduleOptions, setModuleOptions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [usuarioFiltro, setUsuarioFiltro] = useState('Todos')
  const [moduloFiltro, setModuloFiltro] = useState('Todos')
  const [acaoFiltro, setAcaoFiltro] = useState('Todos')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      let logQuery = supabase.from('erp_audit_logs')
        .select('id,created_at,actor_user_id,action,entity_type,entity_id', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (usuarioFiltro !== 'Todos') {
        const selectedUser = users.find(user => user.id === usuarioFiltro)
        if (selectedUser) {
          const actorIds = [selectedUser.id, selectedUser.auth_user_id].filter((id): id is string => Boolean(id))
          if (actorIds.length === 1) logQuery = logQuery.eq('actor_user_id', actorIds[0])
          else if (actorIds.length > 1) logQuery = logQuery.or(actorIds.map(id => `actor_user_id.eq.${id}`).join(','))
        }
      }
      if (moduloFiltro !== 'Todos') logQuery = logQuery.eq('entity_type', moduloFiltro)
      if (acaoFiltro !== 'Todos') logQuery = logQuery.eq('action', acaoFiltro)

      const [logResult, userRows] = await Promise.all([
        logQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        fetchAllPages<User>((from, to) => supabase.from('erp_usuarios')
          .select('id,auth_user_id,nome,email', { count: 'exact' })
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
  }, [acaoFiltro, moduloFiltro, page, usuarioFiltro])

  useEffect(() => { void load() }, [load])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const userMap = useMemo(() => {
    const map = new Map<string, User>()
    users.forEach(user => {
      map.set(user.id, user)
      if (user.auth_user_id) map.set(user.auth_user_id, user)
    })
    return map
  }, [users])

  const visibleRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row => [
      row.action,
      row.entity_type,
      row.entity_id ?? '',
      userMap.get(row.actor_user_id ?? '')?.nome ?? '',
      userMap.get(row.actor_user_id ?? '')?.email ?? '',
    ].join(' ').toLocaleLowerCase('pt-BR').includes(term))
  }, [query, rows, userMap])

  const clearFilters = () => {
    setUsuarioFiltro('Todos')
    setModuloFiltro('Todos')
    setAcaoFiltro('Todos')
    setQuery('')
    setPage(0)
  }

  return (
    <main className="min-h-full space-y-3 bg-[#0E1E2F] p-3 text-[#F4FBFD] antialiased">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E4A62] pb-3">
        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#48B7C7]">Configurações / Segurança / Auditoria</div>
          <h2 className="text-base font-black tracking-wide text-[#F4FBFD]">Logs do Administrador</h2>
          <p className="mt-1 text-[10px] text-[#B8CDD8]">Eventos persistidos em erp_audit_logs. A autorização e o escopo de acesso dependem das políticas RLS do banco.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className={buttonClass}>
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> ATUALIZAR
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 border border-[#D65B61] bg-[#D65B61]/10 p-2.5 text-[11px] font-semibold text-[#FFD7D9]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className={panelClass + ' p-3'}>
        <div className="mb-3 flex items-center gap-2 border-b border-[#2E4A62] pb-2 text-[9px] font-black uppercase tracking-widest text-[#48B7C7]">
          <Filter size={13} /> Filtros de rastreabilidade
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className={labelClass}>Usuário responsável</span>
            <select value={usuarioFiltro} onChange={event => { setUsuarioFiltro(event.target.value); setPage(0) }} className={controlClass}>
              <option value="Todos">Todos os usuários</option>
              {users.filter(user => user.id).map(user => (
                <option key={user.id} value={user.id}>{user.nome || user.email || user.id}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Módulo / entidade</span>
            <select value={moduloFiltro} onChange={event => { setModuloFiltro(event.target.value); setPage(0) }} className={controlClass}>
              <option value="Todos">Todos os módulos</option>
              {moduleOptions.map(module => <option key={module} value={module}>{module}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Ação registrada</span>
            <select value={acaoFiltro} onChange={event => { setAcaoFiltro(event.target.value); setPage(0) }} className={controlClass}>
              <option value="Todos">Todas as ações</option>
              {['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'SELECT'].map(action => <option key={action} value={action}>{action}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Pesquisar nesta página</span>
            <span className="relative block">
              <Search size={12} className="pointer-events-none absolute left-2 top-2.5 text-[#8CA8B8]" />
              <input value={query} onChange={event => setQuery(event.target.value)} className={controlClass + ' pl-7'} placeholder="Ação, entidade ou registro..." />
            </span>
          </label>
        </div>
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={clearFilters} className={buttonClass}>LIMPAR FILTROS</button>
        </div>
      </section>

      <section className={panelClass + ' overflow-hidden'}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] px-3 py-2">
          <h3 className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#48B7C7]">
            <History size={13} /> Histórico cronológico
          </h3>
          <span className="border border-[#2E4A62] bg-[#0E1E2F] px-2 py-1 text-[9px] font-bold text-[#B8CDD8]">
            {total.toLocaleString('pt-BR')} EVENTOS
          </span>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#0E1E2F] text-[9px] font-black uppercase tracking-wide text-[#48B7C7]">
              <tr>
                <th scope="col" className="border-b border-r border-[#2E4A62] px-2 py-2">Data / hora</th>
                <th scope="col" className="border-b border-r border-[#2E4A62] px-2 py-2">Usuário</th>
                <th scope="col" className="border-b border-r border-[#2E4A62] px-2 py-2">Entidade</th>
                <th scope="col" className="border-b border-r border-[#2E4A62] px-2 py-2">Ação</th>
                <th scope="col" className="border-b border-[#2E4A62] px-2 py-2">ID do registro</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {busy ? (
                <tr><td colSpan={5} className="p-5 text-center text-[#B8CDD8]"><RefreshCw size={13} className="mr-2 inline animate-spin text-[#48B7C7]" />Consultando trilha de auditoria…</td></tr>
              ) : visibleRows.length ? visibleRows.map(row => {
                const actor = userMap.get(row.actor_user_id ?? '')
                return (
                  <tr key={row.id} className="border-b border-[#2E4A62]/70 odd:bg-[#123B50] even:bg-[#102B40] hover:bg-[#19445A]">
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-[#D8E8EF]">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                    <td className="max-w-[200px] px-2 py-2 text-[#F4FBFD]">
                      <span className="block truncate font-bold">{actor?.nome || actor?.email || (row.actor_user_id ? row.actor_user_id : 'Sistema')}</span>
                    </td>
                    <td className="px-2 py-2 font-semibold text-[#B8E8EF]">{row.entity_type}</td>
                    <td className="px-2 py-2"><span className="inline-block border border-[#2E4A62] bg-[#0E1E2F] px-1.5 py-0.5 font-bold text-[#F4FBFD]">{row.action}</span></td>
                    <td className="max-w-[230px] truncate px-2 py-2 font-mono text-[9px] text-[#B8CDD8]" title={row.entity_id ?? undefined}>{row.entity_id || '—'}</td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={5} className="p-6 text-center text-[10px] text-[#B8CDD8]">Nenhum evento de auditoria localizado com os filtros atuais.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <nav aria-label="Paginação da auditoria" className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] px-3 py-2 text-[10px] text-[#B8CDD8]">
          <span>{visibleRows.length} exibido(s) nesta página · página {Math.min(page + 1, pageCount)} de {pageCount}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={page === 0 || busy} onClick={() => setPage(current => Math.max(0, current - 1))} className={buttonClass}><ChevronLeft size={12} /> ANTERIOR</button>
            <button type="button" disabled={page >= pageCount - 1 || busy} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className={buttonClass}>PRÓXIMA <ChevronRight size={12} /></button>
          </div>
        </nav>
      </section>

      <section className={panelClass + ' flex items-start gap-2 p-3'}>
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#48B7C7]" />
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-[#48B7C7]">Integridade e isolamento</div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#B8CDD8]">Esta tela consulta a tabela oficial erp_audit_logs e não cria uma trilha paralela. O banco continua responsável por aplicar RLS e permissões. Os detalhes old_data/new_data não são expostos nesta listagem.</p>
        </div>
      </section>
    </main>
  )
}
