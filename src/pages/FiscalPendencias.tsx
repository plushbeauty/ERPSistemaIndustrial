import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type PendingNote = {
  id: string
  numero: number | null
  serie: number | null
  status: string
  destinatario_nome: string | null
  valor_total: number | null
  data_emissao: string | null
  mensagem_retorno: string | null
}

const currency = (value: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))

export default function FiscalPendencias() {
  const [notes, setNotes] = useState<PendingNote[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id,ativo,deleted_at').eq('auth_user_id', auth.data.user.id).maybeSingle()
      if (profile.error) throw profile.error
      const currentProfile = profile.data
      if (!currentProfile?.ativo || currentProfile.deleted_at || !currentProfile.empresa_id) throw new Error('Empresa ativa não localizada para a sessão.')
      const result = await fetchAllPages<PendingNote>((from, to) => supabase.from('erp_documentos_fiscais')
        .select('id,numero,serie,status,destinatario_nome,valor_total,data_emissao,mensagem_retorno', { count: 'exact' })
        .eq('empresa_id', currentProfile.empresa_id).eq('modelo', '55')
        .in('status', ['Rascunho', 'Processando', 'Rejeitada', 'Contingência'])
        .order('created_at', { ascending: false }).range(from, to))
      setNotes(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar pendências fiscais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return notes.filter((note) => !needle || [note.numero, note.serie, note.destinatario_nome, note.status, note.mensagem_retorno]
      .some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(needle)))
  }, [notes, query])
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleNotes = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(current => Math.min(current, pageCount)) }, [pageCount])

  return <main className="erp-dense fiscal-workspace min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-800">Fiscal / fila de trabalho</p><h1 className="text-xl font-semibold">Pendências de NF-e</h1><p className="mt-1 text-sm text-slate-600">Documentos reais em rascunho, processamento, rejeição oficial ou contingência registrados no ERP.</p></header>
    <div className="flex flex-col lg:flex-row"><FiscalSidebar/><section className="min-w-0 flex-1 space-y-4 p-4">
      {error && <div role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium text-slate-700">Buscar por número, destinatário ou retorno
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="h-9 rounded-sm border border-slate-300 bg-white px-2 text-sm" />
        </label>
        <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="h-9 rounded-sm border border-slate-300 bg-white px-3 text-sm font-medium">Atualizar</button><Link to="/fiscal/emissao" className="flex h-9 items-center rounded-sm bg-blue-800 px-3 text-sm font-semibold text-white">Criar rascunho</Link></div>
      </div>
      <section className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Número / série</th><th className="px-3 py-2">Destinatário</th><th className="px-3 py-2">Data de emissão</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Status atual</th><th className="px-3 py-2">Retorno</th><th className="px-3 py-2">Consulta</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-600">Consultando fila fiscal…</td></tr>}
            {!loading && visibleNotes.map((note) => <tr key={note.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono">{note.numero ?? 'sem número'} / {note.serie ?? '—'}</td><td className="px-3 py-2">{note.destinatario_nome || '—'}</td>
              <td className="px-3 py-2">{note.data_emissao ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(note.data_emissao)) : '—'}</td>
              <td className="px-3 py-2 tabular-nums">{currency(note.valor_total)}</td><td className="px-3 py-2 font-medium">{note.status}</td>
              <td className="max-w-xs truncate px-3 py-2" title={note.mensagem_retorno || undefined}>{note.mensagem_retorno || 'Sem mensagem registrada.'}</td>
              <td className="px-3 py-2"><Link to="/fiscal/carteira-nfe" className="text-blue-800 underline">Abrir carteira</Link></td>
            </tr>)}
            {!loading && !filtered.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-600">{notes.length ? 'Nenhum documento corresponde à busca.' : 'Não há documentos pendentes registrados nesta empresa.'}</td></tr>}
          </tbody>
        </table>
        {filtered.length > pageSize && <nav aria-label="Paginação de pendências fiscais" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-sm">
          <span aria-live="polite">Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}</span>
          <div className="flex gap-2"><button type="button" className="min-h-9 rounded border px-3 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Anterior</button><span className="self-center">Página {page} de {pageCount}</span><button type="button" className="min-h-9 rounded border px-3 disabled:opacity-50" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Próxima</button></div>
        </nav>}
      </section>
    </section></div>
  </main>
}
