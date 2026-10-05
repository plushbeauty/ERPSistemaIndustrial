import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, ClipboardCheck, Plus, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import QualitySidebar from '../components/quality/QualitySidebar'

type Sector = { id: string; nome: string }
type User = { id: string; nome: string | null; email: string | null }
type Rpn = {
  id: string
  numero_rpnc: string
  descricao_nao_conformidade: string
  sgq_origem: string
  sgq_severidade: 'Critica' | 'Maior' | 'Menor'
  setor_id: string | null
  status: string
  sgq_vinculo_tipo: string | null
  sgq_vinculo_id: string | null
  criado_em: string
  setor?: { nome: string }[] | null
}
type Capa = {
  id: string
  rpnc_id: string
  tipo: string
  descricao: string
  causa_raiz: string | null
  responsavel_id: string | null
  prazo: string | null
  status: string
  evidencia: string | null
  comentario_aprovacao: string | null
  resultado_eficacia: string | null
  responsavel?: { nome: string | null; email: string | null }[] | null
}
type AuditEntry = { id: number; entidade: string; operacao: string; ocorrido_em: string; ator_id: string | null }

const inputClass = 'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const labelClass = 'grid gap-2 text-xs font-black uppercase tracking-wide text-slate-700'
const statuses = ['aberta', 'em análise', 'em tratamento', 'aguardando eficácia', 'encerrada']
const PAGE_SIZE = 25

export default function QualidadeRNC() {
  const [rows, setRows] = useState<Rpn[]>([])
  const [actions, setActions] = useState<Capa[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ descricao: '', origem: '', severidade: 'Menor', setor_id: '', linked_entity_type: '', linked_entity_id: '' })
  const [actionForm, setActionForm] = useState({ tipo: 'Corretiva', descricao: '', causa_raiz: '', responsavel_id: '', prazo: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ERP não identificada.')
      const [r, a, s, u] = await Promise.all([
        fetchAllPages<Rpn>((from, to) => supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,sgq_origem,sgq_severidade,setor_id,status,sgq_vinculo_tipo,sgq_vinculo_id,criado_em,setor:erp_setores(nome)', { count: 'exact' }).eq('empresa_id', company.data).not('sgq_origem', 'is', null).order('criado_em', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Capa>((from, to) => supabase.from('erp_sgq_capa_acoes').select('id,rpnc_id,tipo,descricao,causa_raiz,responsavel_id,prazo,status,evidencia,resultado_eficacia,comentario_aprovacao,responsavel:erp_usuarios!erp_sgq_capa_acoes_responsavel_id_fkey(nome,email)', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Sector>((from, to) => supabase.from('erp_setores').select('id,nome', { count: 'exact' }).eq('empresa_id', company.data).eq('ativo', true).order('nome').range(from, to)),
        fetchAllPages<User>((from, to) => supabase.from('erp_usuarios').select('id,nome,email', { count: 'exact' }).eq('empresa_id', company.data).eq('ativo', true).is('deleted_at', null).order('nome').range(from, to)),
      ])
      setRows(r)
      setActions(a)
      setSectors(s)
      setUsers(u)
      setSelectedId((current) => current || (r[0]?.id ?? ''))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao consultar RPNCs e ações CAPA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selected = rows.find((row) => row.id === selectedId) ?? null
  const selectedActions = actions.filter((action) => action.rpnc_id === selectedId)
  const openCount = rows.filter((row) => !['encerrada', 'Encerrada'].includes(row.status)).length
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  useEffect(() => {
    if (!selectedId) {
      setAuditEntries([])
      return
    }
    let active = true
    const entityIds = [selectedId, ...actions.filter((action) => action.rpnc_id === selectedId).map((action) => action.id)]
    setAuditLoading(true)
    setAuditError('')
    void (async () => {
      try {
        const { data, error: queryError } = await supabase.from('erp_sgq_auditoria')
          .select('id,entidade,operacao,ocorrido_em,ator_id')
          .in('entidade_id', entityIds).order('ocorrido_em', { ascending: false }).limit(100)
        if (!active) return
        if (queryError) throw queryError
        setAuditEntries((data ?? []) as AuditEntry[])
      } catch (queryError) {
        if (active) setAuditError(queryError instanceof Error ? queryError.message : 'Falha ao consultar a auditoria da RPNC.')
      } finally {
        if (active) setAuditLoading(false)
      }
    })()
    return () => { active = false }
  }, [selectedId, actions])

  async function openRpn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_sgq_abrir_rpnc', {
        p_descricao: form.descricao,
        p_origem: form.origem,
        p_severidade: form.severidade,
        p_setor_id: form.setor_id || null,
        p_linked_entity_type: form.linked_entity_type || null,
        p_linked_entity_id: form.linked_entity_id || null,
      })
      if (rpcError) throw rpcError
      if (!data || typeof data !== 'object' || !('id' in data) || !('numero_rpnc' in data)) {
        throw new Error('A abertura da RPNC não retornou o registro criado.')
      }
      const created = data as Rpn
      setSelectedId(created.id)
      setForm({ descricao: '', origem: '', severidade: 'Menor', setor_id: '', linked_entity_type: '', linked_entity_id: '' })
      setNotice(`RPNC ${created.numero_rpnc} aberta com numeração sequencial.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível abrir a RPNC.')
    } finally {
      setBusy(false)
    }
  }

  async function createAction(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data: company, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!company) throw new Error('Empresa não identificada.')
      const { error: insertError } = await supabase.from('erp_sgq_capa_acoes').insert({
        empresa_id: company,
        rpnc_id: selected.id,
        tipo: actionForm.tipo,
        descricao: actionForm.descricao.trim(),
        causa_raiz: actionForm.causa_raiz.trim() || null,
        responsavel_id: actionForm.responsavel_id,
        prazo: actionForm.prazo,
      })
      if (insertError) throw insertError
      setActionForm({ tipo: 'Corretiva', descricao: '', causa_raiz: '', responsavel_id: '', prazo: '' })
      setNotice('Ação CAPA registrada.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível registrar a ação CAPA.')
    } finally {
      setBusy(false)
    }
  }

  async function updateAction(action: Capa, status: string) {
    const evidencia = status === 'Aguardando aprovacao'
      ? window.prompt('Registre a evidência de execução para submeter à aprovação:')
      : undefined
    if (status === 'Aguardando aprovacao' && !evidencia?.trim()) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error: updateError } = await supabase.from('erp_sgq_capa_acoes').update({ status, ...(evidencia ? { evidencia: evidencia.trim() } : {}) }).eq('id', action.id)
      if (updateError) throw updateError
      setNotice('Etapa da ação atualizada.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar a ação.')
    } finally {
      setBusy(false)
    }
  }

  async function decideAction(action: Capa, decision: string) {
    const evidence = window.prompt(decision.startsWith('verificar') ? 'Registre a evidência da verificação de eficácia:' : 'Comentário de aprovação (opcional):')
    if (evidence === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error: rpcError } = await supabase.rpc('erp_sgq_capa_decidir', {
        p_acao_id: action.id,
        p_decisao: decision,
        p_evidencia: evidence,
      })
      if (rpcError) throw rpcError
      setNotice('Decisão registrada no histórico de auditoria.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Decisão não autorizada ou inválida.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error: rpcError } = await supabase.rpc('erp_sgq_transicionar_rpnc', { p_rpnc_id: selected.id, p_status: status })
      if (rpcError) throw rpcError
      setNotice('Status da RPNC atualizado.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar o status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main data-quality-workspace className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto grid max-w-[1800px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <QualitySidebar active="/qualidade/rnc" />
        <div className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-end gap-4 border-b border-slate-300 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-sky-700">QUALIDADE › SGQ › RPNC / CAPA</p>
              <h1 className="text-2xl font-black md:text-3xl">Não conformidades e ações corretivas</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Registro sequencial, causa raiz, responsáveis, aprovação e eficácia.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-bold"><RefreshCw size={17}/>Atualizar</button>
            <div className="rounded-lg bg-slate-900 px-4 py-2 text-white"><span className="block text-[11px] font-bold uppercase text-sky-200">Em aberto</span><b className="text-2xl">{openCount}</b></div>
          </header>

          {(error || notice) && <div role="alert" className={`rounded-lg border p-3 font-semibold ${error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{error || notice}</div>}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.95fr)]">
            <section className="space-y-4">
              <form onSubmit={(event) => void openRpn(event)} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
                <div className="md:col-span-2"><h2 className="flex items-center gap-2 text-lg font-black"><Plus size={19} className="text-sky-700"/>Abrir RPNC</h2><p className="text-sm text-slate-600">O número é reservado pelo banco em transação e não pode colidir entre usuários.</p></div>
                <label className={`${labelClass} md:col-span-2`}>Falha / não conformidade<textarea className={`${inputClass} min-h-24 py-3`} required value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })}/></label>
                <label className={labelClass}>Origem<input className={inputClass} required placeholder="Inspeção, cliente, auditoria…" value={form.origem} onChange={(event) => setForm({ ...form, origem: event.target.value })}/></label>
                <label className={labelClass}>Gravidade<select className={inputClass} value={form.severidade} onChange={(event) => setForm({ ...form, severidade: event.target.value })}><option>Critica</option><option>Maior</option><option>Menor</option></select></label>
                <label className={labelClass}>Setor responsável<select required className={inputClass} value={form.setor_id} onChange={(event) => setForm({ ...form, setor_id: event.target.value })}><option value="">Selecionar setor</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></label>
                <label className={labelClass}>Vínculo ERP<input className={inputClass} placeholder="Tipo: lote / pedido / produto" value={form.linked_entity_type} onChange={(event) => setForm({ ...form, linked_entity_type: event.target.value })}/></label>
                <label className={`${labelClass} md:col-span-2`}>Identificador do registro vinculado (opcional)<input className={inputClass} placeholder="UUID do lote, pedido ou produto" value={form.linked_entity_id} onChange={(event) => setForm({ ...form, linked_entity_id: event.target.value })}/></label>
                <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 font-black text-white disabled:opacity-50 md:col-span-2"><Save size={17}/>{busy ? 'Processando…' : 'Abrir RPNC'}</button>
              </form>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-black">RPNCs registradas</h2><span className="text-sm text-slate-500">{rows.length} registro(s)</span></div>
                <div className="max-h-[680px] overflow-auto">
                  {loading ? <p role="status" className="p-6 text-center font-semibold text-slate-500">Carregando dados do SGQ…</p> : rows.length === 0 ? <p className="p-6 text-center font-semibold text-slate-500">Nenhuma RPNC registrada.</p> : (
                    <ul className="divide-y divide-slate-100">{visibleRows.map((row) => <li key={row.id}><button type="button" onClick={() => setSelectedId(row.id)} aria-current={selectedId === row.id ? 'true' : undefined} className={`w-full p-4 text-left hover:bg-sky-50 ${selectedId === row.id ? 'bg-sky-50 ring-2 ring-inset ring-sky-500' : ''}`}><span className="flex flex-wrap items-center gap-2"><b className="text-sky-800">{row.numero_rpnc}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{row.status}</span><Severity value={row.sgq_severidade}/></span><span className="mt-2 block font-semibold">{row.descricao_nao_conformidade}</span><span className="mt-1 block text-xs text-slate-500">{row.sgq_origem} · {row.setor?.[0]?.nome || 'Sem setor'} · {new Date(row.criado_em).toLocaleDateString('pt-BR')}</span></button></li>)}</ul>
                  )}
                </div>
                {!loading && rows.length > PAGE_SIZE && <nav aria-label="Paginação de RPNCs" className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
                  <span className="text-xs text-slate-600">Página {page} de {pageCount} · {rows.length} RPNCs</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex min-h-9 items-center gap-1 border border-slate-300 bg-white px-3 text-xs font-bold disabled:opacity-50"><ArrowLeft size={14}/>Anterior</button>
                    <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex min-h-9 items-center gap-1 border border-slate-300 bg-white px-3 text-xs font-bold disabled:opacity-50">Próxima<ArrowRight size={14}/></button>
                  </div>
                </nav>}
              </section>
            </section>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {!selected ? <div className="grid min-h-72 place-items-center text-center text-slate-500"><div><ClipboardCheck size={36} className="mx-auto text-sky-700"/><p className="mt-3 font-bold">Selecione uma RPNC para consultar a tratativa.</p></div></div> : <>
                <div className="flex items-start gap-3 border-b border-slate-200 pb-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800"><AlertTriangle size={20}/></span><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-sky-700">Detalhe da ocorrência</p><h2 className="break-all text-xl font-black">{selected.numero_rpnc}</h2><p className="mt-1 text-sm text-slate-600">{selected.descricao_nao_conformidade}</p></div></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Origem" value={selected.sgq_origem}/><Info label="Setor" value={selected.setor?.[0]?.nome || 'Sem setor'}/><Info label="Gravidade" value={selected.sgq_severidade}/><Info label="Vínculo ERP" value={selected.sgq_vinculo_tipo ? `${selected.sgq_vinculo_tipo}: ${selected.sgq_vinculo_id || '—'}` : 'Não informado'}/></div>
                <label className={`${labelClass} mt-4`}>Etapa da RPNC<select className={inputClass} disabled={busy} value={selected.status} onChange={(event) => void changeStatus(event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>

                <form onSubmit={(event) => void createAction(event)} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  <h3 className="flex items-center gap-2 font-black"><ShieldCheck size={18} className="text-sky-700"/>Plano de ação CAPA</h3>
                  <label className={labelClass}>Tipo<select className={inputClass} value={actionForm.tipo} onChange={(event) => setActionForm({ ...actionForm, tipo: event.target.value })}><option>Contencao</option><option>Corretiva</option><option>Preventiva</option></select></label>
                  <label className={labelClass}>Ação / plano<textarea required className={`${inputClass} min-h-20 py-3`} value={actionForm.descricao} onChange={(event) => setActionForm({ ...actionForm, descricao: event.target.value })}/></label>
                  <label className={labelClass}>Investigação de causa raiz<textarea required className={`${inputClass} min-h-20 py-3`} value={actionForm.causa_raiz} onChange={(event) => setActionForm({ ...actionForm, causa_raiz: event.target.value })}/></label>
                    <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Responsável<select required className={inputClass} value={actionForm.responsavel_id} onChange={(event) => setActionForm({ ...actionForm, responsavel_id: event.target.value })}><option value="">Selecionar responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nome || user.email || user.id}</option>)}</select></label><label className={labelClass}>Prazo<input required className={inputClass} type="date" value={actionForm.prazo} onChange={(event) => setActionForm({ ...actionForm, prazo: event.target.value })}/></label></div>
                  <button disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-bold text-white disabled:opacity-50"><Plus size={16}/>Adicionar ação</button>
                </form>

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between"><h3 className="font-black">Ações, aprovações e eficácia</h3><span className="text-sm text-slate-500">{selectedActions.length}</span></div>
                  {!selectedActions.length ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">Sem ações. Cadastre a contenção ou ação corretiva acima.</p> : selectedActions.map((action) => <article key={action.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{action.descricao}</p><p className="text-xs text-slate-600">{action.tipo} · {action.responsavel?.[0]?.nome || action.responsavel?.[0]?.email || 'Sem responsável'} · prazo {action.prazo || 'não definido'}</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-black">{action.status}</span></div>
                    {action.causa_raiz && <p className="text-sm"><b>Causa raiz:</b> {action.causa_raiz}</p>}
                    {action.evidencia && <p className="text-sm"><b>Evidência:</b> {action.evidencia}</p>}
                    {action.comentario_aprovacao && <p className="text-sm"><b>Comentário da aprovação:</b> {action.comentario_aprovacao}</p>}
                    {action.resultado_eficacia && <p className={`text-sm font-black ${action.resultado_eficacia === 'Eficaz' ? 'text-emerald-700' : 'text-rose-700'}`}>Eficácia: {action.resultado_eficacia}</p>}
                    <div className="flex flex-wrap gap-2">
                      {['Planejada','Em execucao','Concluida','Aguardando aprovacao'].includes(action.status) && <select aria-label={`Atualizar etapa da ação ${action.descricao}`} className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold" value={action.status} disabled={busy} onChange={(event) => void updateAction(action, event.target.value)}>{['Planejada','Em execucao','Concluida','Aguardando aprovacao'].map((status) => <option key={status}>{status}</option>)}</select>}
                      {action.status === 'Aguardando aprovacao' && <><button type="button" disabled={busy} onClick={() => void decideAction(action, 'aprovar')} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-black text-white">Aprovar</button><button type="button" disabled={busy} onClick={() => void decideAction(action, 'reprovar')} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-black text-white">Reprovar</button></>}
                      {action.status === 'Aprovada' && <><button type="button" disabled={busy} onClick={() => void decideAction(action, 'verificar_eficaz')} className="rounded-md bg-sky-700 px-3 py-2 text-xs font-black text-white">Verificar eficaz</button><button type="button" disabled={busy} onClick={() => void decideAction(action, 'verificar_ineficaz')} className="rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-800">Verificar ineficaz</button></>}
                    </div>
                  </article>)}
                </div>
                <section className="mt-5 border-t border-slate-200 pt-4" aria-label="Trilha de auditoria da RPNC">
                  <h3 className="font-black">Histórico de auditoria</h3>
                  {auditError ? <p role="alert" className="mt-2 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{auditError}</p>
                    : auditLoading ? <p role="status" className="mt-2 text-sm text-slate-500">Carregando histórico…</p>
                    : auditEntries.length ? <ol className="mt-2 space-y-2">{auditEntries.map((entry) => <li key={entry.id} className="rounded-md bg-slate-50 p-3 text-sm"><b>{entry.entidade.replaceAll('_', ' ')} · {entry.operacao}</b><time className="ml-2 text-slate-500">{new Date(entry.ocorrido_em).toLocaleString('pt-BR')}</time><span className="ml-2 text-slate-500">ator {entry.ator_id||'sistema'}</span></li>)}</ol>
                    : <p className="mt-2 text-sm text-slate-500">Nenhum evento de auditoria disponível.</p>}
                </section>
                {selected.sgq_vinculo_id && <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700"><ArrowUpRight size={16}/><span>Vínculo ERP: {selected.sgq_vinculo_tipo || 'registro'} · {selected.sgq_vinculo_id}</span>{['pedido_venda','venda','pedido de venda'].includes((selected.sgq_vinculo_tipo || '').toLowerCase()) && <a className="text-sky-800 underline" href="/vendas">Abrir Vendas</a>}</div>}
              </>}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><span className="block text-[11px] font-black uppercase text-slate-500">{label}</span><b className="mt-1 block break-words text-sm">{value}</b></div>
}

function Severity({ value }: { value: string }) {
  const classes = value === 'Critica' ? 'bg-rose-100 text-rose-800' : value === 'Maior' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
  return <span className={`rounded-full px-2 py-1 text-xs font-black ${classes}`}>{value}</span>
}
