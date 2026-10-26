// Atualizado · Padrão Premium · 26/10/2026 — Carteira de documentos fiscais.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCode2, FilePlus2, FileText, Receipt, RefreshCw } from 'lucide-react'
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
const statusBadge = (status: string) => {
  const value = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/autoriz|aprov|conclu/.test(value)) return 'invoice-badge invoice-success'
  if (/rejeit|erro|cancel|deneg/.test(value)) return 'invoice-badge invoice-danger'
  if (/process|penden|rascunho|conting/.test(value)) return 'invoice-badge invoice-pending'
  return 'invoice-badge invoice-neutral'
}

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

  const totalValue = notes.reduce((sum, note) => sum + Number(note.valor_total ?? 0), 0)
  const authorizedCount = notes.filter(note => /autoriz|aprov/i.test(note.status)).length
  const pendingCount = notes.filter(note => /rascunho|process|penden|conting/i.test(note.status)).length
  return (
    <main className="invoice-page">
      <div className="invoice-content">
        <header className="invoice-hero"><div><span>FISCAL · DOCUMENTOS ELETRÔNICOS</span><h1>Carteira de documentos fiscais</h1><p>Status registrados, protocolos e arquivos NF-e persistidos pela empresa no ERP.</p><small>Atualizado · Padrão Premium · 26/10/2026</small></div><Receipt size={38} aria-hidden="true"/></header>
        <FiscalSidebar/>
        <div className="invoice-actions"><span>Consulta fiscal da empresa ativa</span><div><button type="button" className="invoice-button invoice-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading?'animate-spin':''}/>{loading?'Atualizando…':'Atualizar dados'}</button><Link to="/fiscal/emissao" className="invoice-button invoice-primary"><FilePlus2 size={15}/> Nova NF-e</Link></div></div>
        {error&&<div role="alert" className="invoice-alert">{error}</div>}
        <section className="invoice-kpis" aria-label="Resumo da carteira fiscal"><article><span>Documentos localizados</span><strong>{notes.length}</strong></article><article className="invoice-kpi-success"><span>Autorizadas</span><strong>{authorizedCount}</strong></article><article className="invoice-kpi-pending"><span>Em acompanhamento</span><strong>{pendingCount}</strong></article><article><span>Valor total</span><strong>{currency(totalValue)}</strong></article></section>
        <div className="invoice-workspace">
          <section className="invoice-panel invoice-list-panel">
            <div className="invoice-toolbar"><div><h2>Notas fiscais</h2><p>Status e valores registrados pelo ERP, sem autorização presumida.</p></div><label>Pesquisar documentos<input aria-label="Buscar número, destinatário, chave ou status" value={filter} onChange={event=>{setFilter(event.target.value);setPage(0)}} placeholder="Número, destinatário, chave ou status…"/></label></div>
            <div className="invoice-table-wrap"><table className="invoice-table"><thead><tr><th>Número / série</th><th>Destinatário</th><th>Emissão</th><th className="numeric">Total</th><th>Status registrado</th></tr></thead><tbody>
              {loading&&<tr><td colSpan={5} className="invoice-empty">Consultando documentos fiscais…</td></tr>}
              {!loading&&visiblePageNotes.map(note=><tr key={note.id} className={selectedId===note.id?'selected':''}>
                <td><button type="button" aria-pressed={selectedId===note.id} onClick={()=>setSelectedId(note.id)} className="invoice-row-select">{note.numero??'—'} / {note.serie??'—'}</button></td>
                <td>{note.destinatario_nome||'—'}</td><td>{dateTime(note.data_emissao)}</td><td className="numeric">{currency(note.valor_total)}</td><td><span className={statusBadge(note.status)}>{note.status||'Sem status'}</span></td>
              </tr>)}
              {!loading&&!visibleNotes.length&&<tr><td colSpan={5} className="invoice-empty">{notes.length?'Nenhuma NF-e corresponde à busca.':'Nenhum documento NF-e cadastrado para esta empresa.'}</td></tr>}
            </tbody></table></div>
            <nav aria-label="Paginação da carteira fiscal" className="invoice-pagination"><span>{visibleNotes.length} NF-e(s) · página {page+1} de {pageCount}</span><div><button type="button" className="invoice-button invoice-secondary" disabled={page===0} onClick={()=>setPage(current=>Math.max(0,current-1))}>Anterior</button><button type="button" className="invoice-button invoice-secondary" disabled={page+1>=pageCount} onClick={()=>setPage(current=>Math.min(pageCount-1,current+1))}>Próxima</button></div></nav>
          </section>
          <aside className="invoice-panel invoice-detail-panel">
            <div className="invoice-detail-heading"><div><span>PROTOCOLO E ARQUIVOS</span><h2>{selected?`NF-e ${selected.numero??'sem número'}`:'Nenhuma nota selecionada'}</h2></div>{selected&&<span className={statusBadge(selected.status)}>{selected.status}</span>}</div>
            {selected?<>
              <dl className="invoice-details"><div><dt>Chave de acesso</dt><dd className="breakable">{selected.chave_acesso||'Não retornada pelo integrador.'}</dd></div><div><dt>Protocolo de autorização</dt><dd className="breakable">{selected.protocolo||'Não registrado.'}</dd></div><div><dt>Autorização em</dt><dd>{dateTime(selected.authorizedAt)}</dd></div><div><dt>Retorno fiscal</dt><dd className="invoice-return">{selected.retorno||'Sem mensagem registrada.'}</dd></div></dl>
              <div className="invoice-file-actions"><button type="button" className="invoice-button invoice-secondary" disabled={busy||!selected.xmlPath} onClick={()=>void openStoredFile(selected.xmlPath,'XML')}><FileCode2 size={15}/>{busy?'Abrindo…':'Abrir XML'}</button><button type="button" className="invoice-button invoice-primary" disabled={busy||!selected.danfePath} onClick={()=>void openStoredFile(selected.danfePath,'DANFE')}><FileText size={15}/>Visualizar DANFE</button></div>
              {!selected.xmlPath&&!selected.danfePath&&<p className="invoice-file-note">Arquivos ainda não foram associados a esta NF-e.</p>}
            </>:<p className="invoice-detail-empty">Selecione uma nota na lista para consultar chave, protocolo, retorno fiscal e arquivos.</p>}
          </aside>
        </div>
      </div>
      <style>{`.invoice-page{min-height:100vh;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}.invoice-content{width:min(100%,1600px);margin:0 auto;padding:18px 22px 32px;display:grid;gap:13px}.invoice-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:130px;overflow:hidden;padding:20px 26px;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}.invoice-hero:after{position:absolute;right:9%;top:-115px;width:270px;height:270px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 30px rgba(255,255,255,.04),0 0 0 62px rgba(255,255,255,.025);content:"";pointer-events:none}.invoice-hero>div,.invoice-hero>svg{position:relative;z-index:1}.invoice-hero div>span{color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em}.invoice-hero h1{margin:7px 0 5px;color:#fff;font-size:24px;font-weight:800;line-height:1.2}.invoice-hero p{margin:0;color:#e1edf9;font-size:12px;line-height:1.5}.invoice-hero small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-size:10px;font-weight:700}.invoice-hero>svg{margin-right:18px;color:#dbeafe}.invoice-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.045)}.invoice-actions>span{color:#64748b;font-size:11px;font-weight:650}.invoice-actions>div,.invoice-pagination>div{display:flex;flex-wrap:wrap;gap:8px}.invoice-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 12px;border:1px solid transparent;border-radius:8px;font-size:10px;font-weight:750;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer}.invoice-button:disabled{cursor:not-allowed;opacity:.48}.invoice-primary{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 0 #173f91}.invoice-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.invoice-alert{padding:10px 13px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b42318;font-size:11px;font-weight:700}.invoice-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.invoice-kpis article{display:flex;min-width:0;min-height:78px;flex-direction:column;justify-content:center;padding:11px 14px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.invoice-kpis span{color:#64748b;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.invoice-kpis strong{margin-top:5px;color:#102c4e;font-size:19px;font-weight:850;overflow-wrap:anywhere}.invoice-kpis .invoice-kpi-success{border-color:#bbf7d0;background:#f0fdf4}.invoice-kpis .invoice-kpi-success strong{color:#15803d}.invoice-kpis .invoice-kpi-pending{border-color:#fde68a;background:#fffbeb}.invoice-kpis .invoice-kpi-pending strong{color:#b45309}.invoice-workspace{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.9fr);align-items:start;gap:13px}.invoice-panel{min-width:0;padding:14px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.invoice-toolbar{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px;padding-bottom:11px;border-bottom:1px solid #e7edf5}.invoice-toolbar h2,.invoice-detail-heading h2{margin:0;color:#173452;font-size:14px;font-weight:800}.invoice-toolbar p{margin:4px 0 0;color:#64748b;font-size:10px}.invoice-toolbar label{display:grid;min-width:min(100%,300px);gap:4px;color:#475569;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.invoice-toolbar input{height:36px;min-height:36px;box-sizing:border-box;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font:500 11px Inter,Segoe UI,Arial,sans-serif;outline:none;text-transform:none}.invoice-toolbar input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.invoice-table-wrap{overflow:auto}.invoice-table{width:100%;min-width:720px;border-collapse:separate;border-spacing:0;text-align:left;font-size:10px}.invoice-table th{padding:9px;border-bottom:1px solid #dfe7f1;background:#f1f5f9;color:#475569;font-size:8px;font-weight:800;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.invoice-table td{padding:9px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.invoice-table tbody tr:nth-child(even){background:#f8fafc}.invoice-table tbody tr:hover,.invoice-table tbody tr.selected{background:#eff6ff}.invoice-table .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.invoice-row-select{padding:0;border:0;background:none;color:#1d4ed8;font:750 10px Inter,Segoe UI,Arial,sans-serif;cursor:pointer}.invoice-row-select:hover{text-decoration:underline}.invoice-badge{display:inline-flex;align-items:center;min-height:21px;padding:3px 7px;border:1px solid;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap}.invoice-success{border-color:#bbf7d0;background:#dcfce7;color:#166534}.invoice-danger{border-color:#fecaca;background:#fee2e2;color:#b91c1c}.invoice-pending{border-color:#fde68a;background:#fef3c7;color:#92400e}.invoice-neutral{border-color:#bfdbfe;background:#dbeafe;color:#1d4ed8}.invoice-empty,.invoice-detail-empty{padding:22px!important;color:#64748b!important;font-size:11px;text-align:center}.invoice-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:11px;color:#64748b;font-size:10px}.invoice-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #e7edf5}.invoice-detail-heading>div>span{display:block;margin-bottom:5px;color:#1d4ed8;font-size:8px;font-weight:850;letter-spacing:.11em}.invoice-details{display:grid;gap:12px;margin:13px 0}.invoice-details>div{min-width:0}.invoice-details dt{margin-bottom:3px;color:#64748b;font-size:9px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}.invoice-details dd{margin:0;color:#334155;font-size:10px;line-height:1.5}.invoice-details .breakable{overflow-wrap:anywhere;font-family:ui-monospace,Consolas,monospace}.invoice-details .invoice-return{max-height:130px;overflow:auto;white-space:pre-wrap}.invoice-file-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:12px;border-top:1px solid #e7edf5}.invoice-file-note{margin:9px 0 0;color:#64748b;font-size:9px}.invoice-page :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}@media(max-width:1000px){.invoice-workspace{grid-template-columns:minmax(0,1fr)}.invoice-detail-panel{grid-row:1}.invoice-list-panel{grid-row:2}}@media(max-width:720px){.invoice-content{padding:10px 10px 24px}.invoice-hero{min-height:0;padding:17px}.invoice-hero h1{font-size:20px}.invoice-hero>svg{width:28px;height:28px;margin:0}.invoice-actions{align-items:stretch;flex-direction:column}.invoice-actions>div{display:grid;grid-template-columns:1fr 1fr}.invoice-button{padding:0 8px;font-size:9px}.invoice-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.invoice-kpis article{min-height:68px;padding:9px}.invoice-kpis strong{font-size:16px}.invoice-panel{padding:11px}.invoice-toolbar{align-items:stretch;flex-direction:column}.invoice-toolbar label{min-width:0}.invoice-pagination{align-items:flex-start;flex-direction:column}}@media(max-width:460px){.invoice-hero>svg{display:none}.invoice-actions>div,.invoice-file-actions{grid-template-columns:minmax(0,1fr)}.invoice-detail-heading{align-items:flex-start;flex-direction:column}}@media print{.invoice-page{background:#fff}.invoice-content{padding:0}.invoice-actions{display:none}.invoice-hero{background:#0b2545!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-panel,.invoice-kpis article{box-shadow:none;break-inside:avoid}}
      `}</style>
    </main>
  )
}
