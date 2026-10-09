import { useEffect, useMemo, useState } from 'react'
import { Printer, RotateCcw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type PFMEARow = { id: string; codigo: string; processo: string; etapa: string; falha: string; efeito: string; causa: string; controle: string; severidade: number; ocorrencia: number; deteccao: number; rpn: number; acao: string | null; responsavel: string | null; data_limite: string | null; status: string }

const inputClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-0'
const labelClass = 'grid min-w-0 gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-50'
const scoreClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]'

export default function QualidadePFMEA() {
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [busy, setBusy] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [processo, setProcesso] = useState('')
  const [etapa, setEtapa] = useState('')
  const [falha, setFalha] = useState('')
  const [efeito, setEfeito] = useState('')
  const [causa, setCausa] = useState('')
  const [controle, setControle] = useState('')
  const [gravidade, setGravidade] = useState(8)
  const [ocorrencia, setOcorrencia] = useState(4)
  const [deteccao, setDeteccao] = useState(3)
  const [acao, setAcao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [status, setStatus] = useState('ABERTO')
  const [rows, setRows] = useState<PFMEARow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const npr = useMemo(() => gravidade * ocorrencia * deteccao, [gravidade, ocorrencia, deteccao])
  const filteredRows = useMemo(() => rows.filter(row => !query.trim() || [row.codigo, row.processo, row.etapa, row.falha, row.efeito, row.causa, row.controle, row.status, row.acao ?? '', row.responsavel ?? ''].join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))), [rows, query])
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  const load = async () => {
    setLoadingRows(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada na sessão atual.')
      const companyId = String(company.data)
      const data = await fetchAllPages<PFMEARow>((from, to) => supabase.from('erp_fmea')
        .select('id,codigo,processo,etapa,falha,efeito,causa,controle,severidade,ocorrencia,deteccao,rpn,acao,responsavel,data_limite,status', { count: 'exact' })
        .eq('empresa_id', companyId)
        .order('rpn', { ascending: false })
        .order('codigo')
        .range(from, to))
      setRows(data)
    } catch (causeError) {
      setMessage(causeError instanceof Error ? causeError.message : 'Não foi possível carregar os registros PFMEA.')
      setMessageType('error')
    } finally {
      setLoadingRows(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { setPage(current => Math.min(current, pageCount)) }, [pageCount])

  const reset = (keepMessage = false) => {
    setCodigo('')
    setProcesso('')
    setEtapa('')
    setFalha('')
    setEfeito('')
    setCausa('')
    setControle('')
    setGravidade(8)
    setOcorrencia(4)
    setDeteccao(3)
    setAcao('')
    setResponsavel('')
    setDataLimite('')
    setEditingId(null)
    setStatus('ABERTO')
    if (!keepMessage) { setMessage(''); setMessageType('') }
  }

  const editRow = (row: PFMEARow) => {
    setEditingId(row.id); setCodigo(row.codigo); setProcesso(row.processo); setEtapa(row.etapa); setFalha(row.falha); setEfeito(row.efeito ?? ''); setCausa(row.causa ?? ''); setControle(row.controle ?? ''); setGravidade(row.severidade); setOcorrencia(row.ocorrencia); setDeteccao(row.deteccao); setAcao(row.acao ?? ''); setResponsavel(row.responsavel ?? ''); setDataLimite(row.data_limite ?? ''); setStatus(row.status || 'ABERTO'); setMessage(''); setMessageType('')
  }

  const save = async () => {
    setMessage('')
    setMessageType('')
    if (!codigo.trim() || !processo.trim() || !falha.trim()) {
      setMessage('Preencha Código PFMEA, Processo/Operação e Modo de Falha.')
      setMessageType('error')
      return
    }
    if (![gravidade, ocorrencia, deteccao].every((value) => Number.isInteger(value) && value >= 1 && value <= 10)) {
      setMessage('Gravidade, Ocorrência e Detecção devem ser números inteiros de 1 a 10.')
      setMessageType('error')
      return
    }

    setBusy(true)
    try {
      const emp = await supabase.rpc('erp_current_empresa_id')
      if (emp.error) throw emp.error
      if (!emp.data) throw new Error('Empresa não identificada na sessão atual.')

      const payload = {
        empresa_id: String(emp.data),
        codigo: codigo.trim(),
        processo: processo.trim(),
        etapa: etapa.trim(),
        falha: falha.trim(),
        efeito: efeito.trim(),
        causa: causa.trim(),
        controle: controle.trim(),
        acao: acao.trim() || null,
        responsavel: responsavel.trim() || null,
        data_limite: dataLimite || null,
        severidade: gravidade,
        ocorrencia,
        deteccao,
        status,
      }
      const updating = Boolean(editingId)
      const result = editingId
        ? await supabase.from('erp_fmea').update(payload).eq('id', editingId).eq('empresa_id', String(emp.data)).select('id').single()
        : await supabase.from('erp_fmea').insert(payload).select('id').single()
      if (result.error) throw result.error
      reset(true)
      setMessage(updating ? 'PFMEA atualizado com sucesso.' : 'PFMEA cadastrado com sucesso.')
      setMessageType('success')
      await load()
    } catch (causeError) {
      setMessage(causeError instanceof Error ? causeError.message : 'Não foi possível salvar o PFMEA.')
      setMessageType('error')
    } finally {
      setBusy(false)
    }
  }

  const scoreInput = (label: string, value: number, setValue: (value: number) => void) => (
    <label className={labelClass}>
      {label} (1–10)
      <input
        className={scoreClass}
        type="number"
        min={1}
        max={10}
        step={1}
        required
        value={value}
        onChange={(event) => setValue(event.target.value === '' ? 0 : Number(event.target.value))}
        onBlur={() => setValue(Math.min(10, Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1)))}
      />
    </label>
  )

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2 text-[#123B50] md:p-3">
      <div className="mx-auto max-w-[1440px] space-y-2">
        <header className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-white px-3 py-2">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Qualidade / Engenharia de riscos</p>
            <h1 className="text-[15px] font-semibold leading-5">Matriz PFMEA — Análise de Modo e Efeito de Falha</h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={reset} disabled={busy}><RotateCcw size={12}/> NOVO</button>
            <button type="button" className={`${buttonClass} border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#24769A]`} onClick={() => void save()} disabled={busy}><Save size={12}/> {busy ? 'SALVANDO…' : editingId ? 'ATUALIZAR PFMEA' : 'SALVAR PFMEA'}</button>
            <button type="button" className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => window.print()}><Printer size={12}/> IMPRIMIR</button>
          </div>
        </header>

        {message && <div role="status" aria-live="polite" className={`border px-3 py-2 text-[11px] ${messageType === 'error' ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{message}</div>}

        <section className="border border-slate-300 bg-white p-2">
          <h2 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold">01 · IDENTIFICAÇÃO DO PROCESSO</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>Código PFMEA *<input className={inputClass} value={codigo} onChange={(event) => setCodigo(event.target.value)} maxLength={80} required placeholder="Código único da análise"/></label>
            <label className={labelClass}>Processo / Operação *<input className={inputClass} value={processo} onChange={(event) => setProcesso(event.target.value)} maxLength={200} required placeholder="Processo analisado"/></label>
            <label className={labelClass}>Etapa do processo<input className={inputClass} value={etapa} onChange={(event) => setEtapa(event.target.value)} maxLength={200} placeholder="Etapa / operação"/></label>
            <label className={labelClass}>Status<input className={`${inputClass} bg-slate-50`} value={status} readOnly aria-label="Status da análise"/></label>
          </div>
        </section>

        <section className="border border-slate-300 bg-white p-2">
          <h2 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold">02 · MODO DE FALHA E EFEITOS</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className={labelClass}>Modo de falha *<textarea className="min-h-[64px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] outline-none focus:border-[#2D8DB8]" value={falha} onChange={(event) => setFalha(event.target.value)} maxLength={4000} required placeholder="Como o processo ou produto pode falhar?"/></label>
            <label className={labelClass}>Efeito da falha<textarea className="min-h-[64px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] outline-none focus:border-[#2D8DB8]" value={efeito} onChange={(event) => setEfeito(event.target.value)} maxLength={4000} placeholder="Efeito para o processo, cliente ou produto"/></label>
            <label className={labelClass}>Causa potencial<textarea className="min-h-[56px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] outline-none focus:border-[#2D8DB8]" value={causa} onChange={(event) => setCausa(event.target.value)} maxLength={4000} placeholder="Causa potencial da falha"/></label>
            <label className={labelClass}>Controles atuais<textarea className="min-h-[56px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] outline-none focus:border-[#2D8DB8]" value={controle} onChange={(event) => setControle(event.target.value)} maxLength={4000} placeholder="Prevenção e detecção já existentes"/></label>
          </div>
        </section>

        <section className="border border-slate-300 bg-white p-2">
          <h2 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold">03 · AVALIAÇÃO DO RISCO</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {scoreInput('Gravidade', gravidade, setGravidade)}
            {scoreInput('Ocorrência', ocorrencia, setOcorrencia)}
            {scoreInput('Detecção', deteccao, setDeteccao)}
            <div className="flex flex-col justify-end border border-slate-200 bg-[#F4FBFD] px-3 py-1.5">
              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-600">NPR (G × O × D)</span>
              <output className="text-[20px] font-semibold leading-7 tabular-nums" aria-live="polite">{npr}</output>
              <span className="text-[9px] text-slate-500">Faixa matemática: 1–1000</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">A classificação e as ações prioritárias devem seguir a matriz de risco aprovada pela organização.</p>
        </section>

        <section className="border border-slate-300 bg-white p-2">
          <h2 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold">04 · PLANO DE AÇÃO</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className={labelClass + ' md:col-span-1'}>Ação recomendada<textarea className="min-h-[56px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] outline-none focus:border-[#2D8DB8]" value={acao} onChange={(event) => setAcao(event.target.value)} maxLength={4000} placeholder="Ação para reduzir ou eliminar o risco" /></label>
            <label className={labelClass}>Responsável pela ação<input className={inputClass} value={responsavel} onChange={(event) => setResponsavel(event.target.value)} maxLength={200} placeholder="Responsável pela execução" /></label>
            <label className={labelClass}>Data limite<input className={inputClass} type="date" value={dataLimite} onChange={(event) => setDataLimite(event.target.value)} /></label>
          </div>
        </section>

        <section className="border border-slate-300 bg-white p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1">
            <h2 className="text-[11px] font-semibold">05 · REGISTROS PFMEA DA EMPRESA</h2>
            <input className={inputClass + ' max-w-[280px]'} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} aria-label="Pesquisar registros PFMEA" placeholder="Buscar código, processo, falha ou responsável" />
          </div>
          {loadingRows ? <p className="p-2 text-[11px] text-slate-500" role="status">Carregando registros PFMEA…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1320px] border-collapse text-[10px]"><thead className="bg-[#123B50] text-left text-white"><tr><th className="p-2">Código</th><th className="p-2">Processo / etapa</th><th className="p-2">Modo de falha</th><th className="p-2">Efeito / causa / controle</th><th className="p-2">G</th><th className="p-2">O</th><th className="p-2">D</th><th className="p-2">NPR</th><th className="p-2">Ação</th><th className="p-2">Responsável</th><th className="p-2">Data limite</th><th className="p-2">Status</th><th className="p-2">Ações</th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.id} className="border-b border-slate-200 even:bg-slate-50"><td className="p-2">{row.codigo}</td><td className="p-2">{row.processo}{row.etapa ? ` / ${row.etapa}` : ''}</td><td className="p-2">{row.falha}</td><td className="p-2"><div>Efeito: {row.efeito || "—"}</div><div>Causa: {row.causa || "—"}</div><div>Controle: {row.controle || "—"}</div></td><td className="p-2 tabular-nums">{row.severidade}</td><td className="p-2 tabular-nums">{row.ocorrencia}</td><td className="p-2 tabular-nums">{row.deteccao}</td><td className="p-2 font-semibold tabular-nums">{row.rpn}</td><td className="p-2">{row.acao || '—'}</td><td className="p-2">{row.responsavel || '—'}</td><td className="p-2">{row.data_limite ? new Date(`${row.data_limite}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</td><td className="p-2">{row.status}</td><td className="p-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => editRow(row)}>Editar</button></td></tr>)}{!visibleRows.length && <tr><td className="p-3 text-center text-slate-500" colSpan={13}>Nenhum registro PFMEA encontrado para esta empresa e filtro.</td></tr>}</tbody></table></div>}
          {filteredRows.length > pageSize && <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px]"><span>Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} de {filteredRows.length}</span><div className="flex items-center gap-2"><button type="button" className={buttonClass} disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Anterior</button><span>Página {page} de {pageCount}</span><button type="button" className={buttonClass} disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Próxima</button></div></div>}
        </section>
      </div>
    </main>
  )
}
