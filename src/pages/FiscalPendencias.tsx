// Atualizado · Padrão Premium · 26/10/2026 — Fila de pendências de NF-e.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
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
const fiscalBadge = (status: string) => {
  const value = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (value.includes('rejeit') || value.includes('erro')) return 'pending-badge pending-danger'
  if (value.includes('process')) return 'pending-badge pending-info'
  if (value.includes('conting')) return 'pending-badge pending-warning'
  return 'pending-badge pending-neutral'
}

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

  const rejectedCount = notes.filter(note => /rejeit|erro/i.test(note.status)).length
  const processingCount = notes.filter(note => /process/i.test(note.status)).length
  return (
    <main className="pending-page">
      <div className="pending-content">
        <header className="pending-hero"><div><span>FISCAL · FILA DE TRABALHO</span><h1>Pendências de NF-e</h1><p>Documentos reais em rascunho, processamento, rejeição oficial ou contingência registrados no ERP.</p><small>Atualizado · Padrão Premium · 26/10/2026</small></div></header>
        <FiscalSidebar/>
        <div className="pending-actions"><span>Fila fiscal da empresa ativa</span><div><button type="button" className="pending-button pending-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading?'animate-spin':''}/>{loading?'Atualizando…':'Atualizar dados'}</button><Link to="/fiscal/emissao" className="pending-button pending-primary">Criar rascunho</Link></div></div>
        {error&&<div role="alert" className="pending-alert">{error}</div>}
        <section className="pending-kpis" aria-label="Resumo das pendências">
          <article><span>Documentos na fila</span><strong>{notes.length}</strong></article>
          <article className="pending-kpi-warning"><span>Em processamento</span><strong>{processingCount}</strong></article>
          <article className="pending-kpi-danger"><span>Rejeitados / com erro</span><strong>{rejectedCount}</strong></article>
          <article><span>Resultados filtrados</span><strong>{filtered.length}</strong></article>
        </section>
        <section className="pending-panel">
          <div className="pending-toolbar"><div><h2>Documentos que precisam de acompanhamento</h2><p>O status e o retorno abaixo vêm da persistência fiscal do ERP.</p></div><label>Pesquisar na fila<input aria-label="Buscar por número, destinatário, status ou retorno" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="Número, destinatário, status ou retorno…"/></label></div>
          <div className="pending-table-wrap"><table className="pending-table"><thead><tr><th>Número / série</th><th>Destinatário</th><th>Emissão</th><th className="numeric">Valor</th><th>Status</th><th>Retorno registrado</th><th>Ação</th></tr></thead><tbody>
            {loading&&<tr><td colSpan={7} className="pending-empty">Consultando fila fiscal…</td></tr>}
            {!loading&&visibleNotes.map(note=><tr key={note.id}>
              <td><strong>{note.numero??'Sem número'}</strong><small>Série {note.serie??'—'}</small></td><td>{note.destinatario_nome||'—'}</td>
              <td>{note.data_emissao?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(new Date(note.data_emissao)):'—'}</td>
              <td className="numeric">{currency(note.valor_total)}</td><td><span className={fiscalBadge(note.status)}>{note.status}</span></td>
              <td className="pending-return" title={note.mensagem_retorno||undefined}>{note.mensagem_retorno||'Sem mensagem registrada.'}</td><td><Link to="/fiscal/carteira-nfe" className="pending-open-link">Abrir carteira</Link></td>
            </tr>)}
            {!loading&&!filtered.length&&<tr><td colSpan={7} className="pending-empty">{notes.length?'Nenhum documento corresponde à busca.':'Não há documentos pendentes registrados nesta empresa.'}</td></tr>}
          </tbody></table></div>
          {filtered.length>pageSize&&<nav aria-label="Paginação de pendências fiscais" className="pending-pagination"><span aria-live="polite">Exibindo {(page-1)*pageSize+1}–{Math.min(page*pageSize,filtered.length)} de {filtered.length}</span><div><button type="button" className="pending-button pending-secondary" disabled={page===1} onClick={()=>setPage(current=>Math.max(1,current-1))}>Anterior</button><span>Página {page} de {pageCount}</span><button type="button" className="pending-button pending-secondary" disabled={page===pageCount} onClick={()=>setPage(current=>Math.min(pageCount,current+1))}>Próxima</button></div></nav>}
        </section>
      </div>
      <style>{`.pending-page{min-height:100vh;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}.pending-content{width:min(100%,1560px);margin:0 auto;padding:18px 22px 32px;display:grid;gap:13px}.pending-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:132px;overflow:hidden;padding:20px 26px;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}.pending-hero:after{position:absolute;right:9%;top:-115px;width:270px;height:270px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 30px rgba(255,255,255,.04),0 0 0 62px rgba(255,255,255,.025);content:"";pointer-events:none}.pending-hero>div,.pending-hero>nav,.pending-hero>aside{position:relative;z-index:1}.pending-hero div>span{color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em}.pending-hero h1{margin:7px 0 5px;color:#fff;font-size:24px;font-weight:800;line-height:1.2}.pending-hero p{margin:0;color:#e1edf9;font-size:12px;line-height:1.5}.pending-hero small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-size:10px;font-weight:700}.pending-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.045)}.pending-actions>span{color:#64748b;font-size:11px;font-weight:650}.pending-actions>div,.pending-pagination>div{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.pending-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 13px;border:1px solid transparent;border-radius:8px;font-size:11px;font-weight:750;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer}.pending-button:disabled{opacity:.48;cursor:not-allowed}.pending-primary{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 0 #173f91}.pending-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.pending-alert{padding:10px 13px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b42318;font-size:11px;font-weight:700}.pending-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.pending-kpis article{display:flex;min-width:0;min-height:82px;flex-direction:column;justify-content:center;padding:12px 15px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.pending-kpis span{color:#64748b;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.pending-kpis strong{margin-top:6px;color:#102c4e;font-size:21px;font-weight:850}.pending-kpis .pending-kpi-warning{border-color:#fde68a;background:#fffbeb}.pending-kpis .pending-kpi-warning strong{color:#b45309}.pending-kpis .pending-kpi-danger{border-color:#fecaca;background:#fff1f2}.pending-kpis .pending-kpi-danger strong{color:#b91c1c}.pending-panel{min-width:0;padding:16px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.pending-toolbar{display:flex;align-items:end;justify-content:space-between;gap:13px;margin:0 0 13px;padding-bottom:11px;border-bottom:1px solid #e7edf5}.pending-toolbar h2{margin:0;color:#173452;font-size:14px;font-weight:800}.pending-toolbar p{margin:4px 0 0;color:#64748b;font-size:11px}.pending-toolbar label{display:grid;min-width:min(100%,330px);gap:4px;color:#475569;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.pending-toolbar input{height:36px;min-height:36px;box-sizing:border-box;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font:500 11px Inter,Segoe UI,Arial,sans-serif;outline:none;text-transform:none}.pending-toolbar input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.pending-table-wrap{overflow:auto}.pending-table{width:100%;min-width:940px;border-collapse:separate;border-spacing:0;text-align:left;font-size:11px}.pending-table th{padding:9px 10px;border-bottom:1px solid #dfe7f1;background:#f1f5f9;color:#475569;font-size:9px;font-weight:800;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.pending-table td{padding:9px 10px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.pending-table tbody tr:nth-child(even){background:#f8fafc}.pending-table tbody tr:hover{background:#eff6ff}.pending-table td:first-child strong,.pending-table td:first-child small{display:block}.pending-table td:first-child strong{color:#1d4ed8}.pending-table td:first-child small{margin-top:3px;color:#64748b;font-size:9px}.pending-table .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.pending-return{max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pending-badge{display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border:1px solid;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap}.pending-danger{border-color:#fecaca;background:#fee2e2;color:#b91c1c}.pending-warning{border-color:#fdba74;background:#ffedd5;color:#c2410c}.pending-info{border-color:#bfdbfe;background:#dbeafe;color:#1d4ed8}.pending-neutral{border-color:#fde68a;background:#fef3c7;color:#92400e}.pending-open-link{display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 9px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:750;text-decoration:none;white-space:nowrap}.pending-open-link:hover{background:#dbeafe}.pending-empty{padding:24px!important;color:#64748b!important;text-align:center}.pending-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:11px;color:#64748b;font-size:10px}.pending-page :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}@media(max-width:900px){.pending-toolbar{align-items:stretch;flex-direction:column}.pending-toolbar label{min-width:0}.pending-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.pending-content{padding:10px 10px 24px}.pending-hero{min-height:0;padding:17px}.pending-hero h1{font-size:20px}.pending-actions{align-items:stretch;flex-direction:column}.pending-actions>div{display:grid;grid-template-columns:1fr 1fr}.pending-button{padding:0 8px;font-size:10px}.pending-panel{padding:11px}.pending-pagination{align-items:flex-start;flex-direction:column}}@media print{.pending-page{background:#fff}.pending-content{padding:0}.pending-actions{display:none}.pending-hero{background:#0b2545!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pending-panel,.pending-kpis article{box-shadow:none;break-inside:avoid}}`}</style>
    </main>
  )
}
