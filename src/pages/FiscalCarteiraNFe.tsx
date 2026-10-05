import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type FiscalDocument = {
  id: string
  numero: number | null
  serie: number | null
  status: string
  destinatario_nome: string | null
  data_emissao: string | null
  valor_total: number | null
  chave_acesso: string | null
  mensagem_retorno: string | null
  xml_storage_path: string | null
  pdf_storage_path: string | null
}

type InvoiceRecord = {
  documento_id: string
  status: string | null
  chave_acesso: string | null
  protocolo_autorizacao: string | null
  mensagem_sefaz: string | null
  xml_autorizado_path: string | null
  danfe_pdf_path: string | null
  authorized_at: string | null
}

type Note = FiscalDocument & {
  protocolo: string | null
  retorno: string | null
  xmlPath: string | null
  danfePath: string | null
  authorizedAt: string | null
}

const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const currency = (value: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
const PAGE_SIZE = 25

export default function FiscalCarteiraNFe() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id,ativo,deleted_at').eq('auth_user_id', auth.data.user.id).maybeSingle()
      if (profile.error) throw profile.error
      const profileData = profile.data
      if (!profileData?.ativo || profileData.deleted_at || !profileData.empresa_id) throw new Error('Empresa ativa não localizada para a sessão.')
      const companyId = profileData.empresa_id

      const [documents, invoices] = await Promise.all([
        fetchAllPages<FiscalDocument>((from, to) => supabase.from('erp_documentos_fiscais')
          .select('id,numero,serie,status,destinatario_nome,data_emissao,valor_total,chave_acesso,mensagem_retorno,xml_storage_path,pdf_storage_path', { count: 'exact' })
          .eq('empresa_id', companyId).eq('modelo', '55').order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<InvoiceRecord>((from, to) => supabase.from('erp_notas_fiscais')
          .select('documento_id,status,chave_acesso,protocolo_autorizacao,mensagem_sefaz,xml_autorizado_path,danfe_pdf_path,authorized_at', { count: 'exact' })
          .eq('empresa_id', companyId).order('created_at', { ascending: false }).range(from, to)),
      ])
      if (!documents.length) {
        setNotes([])
        setSelectedId('')
        return
      }
      const byDocument = new Map(invoices.map((invoice) => [invoice.documento_id, invoice]))
      const mapped = documents.map((document): Note => {
        const invoice = byDocument.get(document.id)
        return {
          ...document,
          status: invoice?.status || document.status,
          chave_acesso: invoice?.chave_acesso || document.chave_acesso,
          protocolo: invoice?.protocolo_autorizacao || null,
          retorno: invoice?.mensagem_sefaz || document.mensagem_retorno,
          xmlPath: invoice?.xml_autorizado_path || document.xml_storage_path,
          danfePath: invoice?.danfe_pdf_path || document.pdf_storage_path,
          authorizedAt: invoice?.authorized_at || null,
        }
      })
      setNotes(mapped)
      setSelectedId((current) => mapped.some((note) => note.id === current) ? current : mapped[0]?.id ?? '')
      setPage(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar a carteira fiscal.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleNotes = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase('pt-BR')
    return notes.filter((note) => !needle || [
      note.numero,
      note.serie,
      note.destinatario_nome,
      note.chave_acesso,
      note.status,
    ].some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(needle)))
  }, [filter, notes])
  const selected = notes.find((note) => note.id === selectedId) ?? null
  const pageCount = Math.max(1, Math.ceil(visibleNotes.length / PAGE_SIZE))
  const visiblePageNotes = visibleNotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage((current) => Math.min(current, pageCount - 1)) }, [pageCount])

  const openStoredFile = async (path: string | null, kind: 'XML' | 'DANFE') => {
    if (!path) {
      setError(`${kind} não disponível no armazenamento para esta NF-e.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await supabase.storage.from('documentos-erp').createSignedUrl(path, 60)
      if (result.error) throw result.error
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Falha ao abrir ${kind}.`)
    } finally {
      setBusy(false)
    }
  }

  return <main className="erp-dense fiscal-workspace min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Fiscal / NF-e</p>
      <h1 className="text-xl font-semibold">Carteira de documentos fiscais</h1>
      <p className="mt-1 text-sm text-slate-600">Status, protocolos e arquivos consultados do banco do ERP; nenhuma autorização é inferida pela interface.</p>
    </header>
    <div className="block">
      <FiscalSidebar />
      <section className="min-w-0 flex-1 space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid min-w-64 flex-1 gap-1 text-xs font-semibold text-slate-700">
            Buscar por número, destinatário, chave ou status
            <input value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0) }} className="h-9 rounded-sm border border-slate-300 bg-white px-2 text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="h-9 rounded-sm border border-slate-300 bg-white px-3 text-sm font-medium disabled:opacity-50">Atualizar</button>
            <Link to="/fiscal/emissao" className="flex h-9 items-center rounded-sm bg-blue-800 px-3 text-sm font-semibold text-white">Nova NF-e</Link>
          </div>
        </div>
        {error && <div role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <section className="overflow-hidden border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>
                  <th className="px-3 py-2">Número / série</th><th className="px-3 py-2">Destinatário</th><th className="px-3 py-2">Emissão</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status registrado</th>
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-600">Consultando documentos fiscais…</td></tr>}
                  {!loading && visiblePageNotes.map((note) => <tr key={note.id} className={`border-t border-slate-100 hover:bg-blue-50 ${selectedId === note.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-2 font-mono"><button type="button" aria-pressed={selectedId === note.id} onClick={() => setSelectedId(note.id)} className="underline decoration-dotted underline-offset-2">{note.numero ?? '—'} / {note.serie ?? '—'}</button></td>
                    <td className="px-3 py-2">{note.destinatario_nome || '—'}</td>
                    <td className="px-3 py-2">{dateTime(note.data_emissao)}</td>
                    <td className="px-3 py-2 tabular-nums">{currency(note.valor_total)}</td>
                    <td className="px-3 py-2">{note.status || '—'}</td>
                  </tr>)}
                  {!loading && !visibleNotes.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-600">{notes.length ? 'Nenhuma NF-e corresponde à busca.' : 'Nenhum documento NF-e cadastrado para esta empresa.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <nav aria-label="Paginação da carteira fiscal" className="flex items-center justify-between gap-3 border-t border-slate-200 p-3 text-sm"><span>{visibleNotes.length} NF-e(s) · página {page + 1} de {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="min-h-10 rounded border border-slate-300 px-3 font-semibold disabled:opacity-50">Anterior</button><button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="min-h-10 rounded border border-slate-300 px-3 font-semibold disabled:opacity-50">Próxima</button></div></nav>
          </section>
          <aside className="border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs font-bold uppercase text-blue-800">Protocolo e documentos</p><h2 className="mt-1 text-base font-semibold">{selected ? `NF-e ${selected.numero ?? 'sem número'}` : 'Nenhuma nota selecionada'}</h2></div>
              {selected && <span className="text-xs font-semibold text-slate-700">{selected.status}</span>}
            </div>
            {selected ? <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Chave de acesso</dt><dd className="break-all font-mono">{selected.chave_acesso || 'Não retornada pelo integrador.'}</dd></div>
              <div><dt className="text-xs text-slate-500">Protocolo de autorização</dt><dd className="break-all font-mono">{selected.protocolo || 'Não registrado.'}</dd></div>
              <div><dt className="text-xs text-slate-500">Autorização em</dt><dd>{dateTime(selected.authorizedAt)}</dd></div>
              <div><dt className="text-xs text-slate-500">Retorno fiscal</dt><dd className="whitespace-pre-wrap">{selected.retorno || 'Sem mensagem registrada.'}</dd></div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" disabled={busy || !selected.xmlPath} onClick={() => void openStoredFile(selected.xmlPath, 'XML')} className="h-9 rounded-sm border border-slate-300 px-3 text-sm font-medium disabled:opacity-50">Abrir XML</button>
                <button type="button" disabled={busy || !selected.danfePath} onClick={() => void openStoredFile(selected.danfePath, 'DANFE')} className="h-9 rounded-sm bg-blue-800 px-3 text-sm font-semibold text-white disabled:opacity-50">Visualizar DANFE</button>
              </div>
            </dl> : <p className="mt-4 text-sm text-slate-600">Selecione um documento para consultar os dados persistidos.</p>}
          </aside>
        </div>
      </section>
    </div>
  </main>
}
