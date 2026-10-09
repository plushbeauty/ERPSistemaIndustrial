import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Pencil, Plus, Printer, RefreshCw, Save, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type FmeaRecord = {
  id: string
  codigo: string
  processo: string
  etapa: string
  falha: string
  efeito: string
  causa: string
  controle: string
  severidade: number
  ocorrencia: number
  deteccao: number
  rpn: number
  acao: string | null
  responsavel: string | null
  data_limite: string | null
  status: string
  created_at: string
  updated_at: string
}

type FmeaForm = {
  id: string
  codigo: string
  processo: string
  etapa: string
  falha: string
  efeito: string
  causa: string
  controle: string
  severidade: number
  ocorrencia: number
  deteccao: number
  acao: string
  responsavel: string
  data_limite: string
  status: string
}

const columns = 'id,codigo,processo,etapa,falha,efeito,causa,controle,severidade,ocorrencia,deteccao,rpn,acao,responsavel,data_limite,status,created_at,updated_at'
const statuses = ['ABERTO', 'EM_TRATAMENTO', 'MITIGADO', 'ENCERRADO']
const emptyForm = (): FmeaForm => ({
  id: '', codigo: '', processo: '', etapa: '', falha: '', efeito: '', causa: '', controle: '',
  severidade: 8, ocorrencia: 4, deteccao: 3, acao: '', responsavel: '', data_limite: '', status: 'ABERTO',
})
const formFromRecord = (row: FmeaRecord): FmeaForm => ({
  id: row.id, codigo: row.codigo, processo: row.processo, etapa: row.etapa, falha: row.falha,
  efeito: row.efeito, causa: row.causa, controle: row.controle, severidade: row.severidade,
  ocorrencia: row.ocorrencia, deteccao: row.deteccao, acao: row.acao ?? '',
  responsavel: row.responsavel ?? '', data_limite: row.data_limite ?? '', status: row.status || 'ABERTO',
})
const errorText = (error: unknown) => error instanceof Error ? error.message : String((error as { message?: string } | null)?.message ?? 'Operação recusada pelo banco.')

const currentCompanyId = async () => {
  const result = await supabase.rpc('erp_current_empresa_id')
  if (result.error || !result.data) throw new Error(result.error?.message || 'Empresa da sessão não identificada.')
  return String(result.data)
}

export default function QualidadePFMEA() {
  const [rows, setRows] = useState<FmeaRecord[]>([])
  const [form, setForm] = useState<FmeaForm>(emptyForm)
  const [companyId, setCompanyId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)

  const npr = useMemo(() => form.severidade * form.ocorrencia * form.deteccao, [form.severidade, form.ocorrencia, form.deteccao])
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(row => {
      const text = [row.codigo, row.processo, row.etapa, row.falha, row.efeito, row.causa, row.responsavel].join(' ').toLocaleLowerCase('pt-BR')
      return (!term || text.includes(term)) && (!statusFilter || row.status === statusFilter)
    })
  }, [rows, query, statusFilter])

  const loadRecords = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_fmea').select(columns).eq('empresa_id', empresaId).order('updated_at', { ascending: false }).limit(500)
      if (result.error) throw result.error
      setCompanyId(empresaId)
      setRows((result.data ?? []) as FmeaRecord[])
      setMessage('')
      setMessageIsError(false)
    } catch (error) {
      setMessage(errorText(error))
      setMessageIsError(true)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => { void loadRecords() }, [loadRecords])

  const updateField = <K extends keyof FmeaForm,>(key: K, value: FmeaForm[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm())
    setMessage('')
    setMessageIsError(false)
  }

  const openRecord = (row: FmeaRecord) => {
    setForm(formFromRecord(row))
    setMessage('PFMEA carregada para edição. Grave para persistir as alterações.')
    setMessageIsError(false)
  }

  const save = async () => {
    if (!form.codigo.trim() || !form.processo.trim() || !form.etapa.trim() || !form.falha.trim()) {
      setMessage('Preencha código, processo, etapa e modo de falha.')
      setMessageIsError(true)
      return
    }
    if (![form.severidade, form.ocorrencia, form.deteccao].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) {
      setMessage('Gravidade, ocorrência e detecção devem ser números inteiros entre 1 e 10.')
      setMessageIsError(true)
      return
    }
    setBusy(true)
    setMessage('')
    setMessageIsError(false)
    try {
      const empresaId = await currentCompanyId()
      const payload = {
        codigo: form.codigo.trim(),
        processo: form.processo.trim(),
        etapa: form.etapa.trim(),
        falha: form.falha.trim(),
        efeito: form.efeito.trim(),
        causa: form.causa.trim(),
        controle: form.controle.trim(),
        severidade: form.severidade,
        ocorrencia: form.ocorrencia,
        deteccao: form.deteccao,
        acao: form.acao.trim() || null,
        responsavel: form.responsavel.trim() || null,
        data_limite: form.data_limite || null,
        status: form.status || 'ABERTO',
      }
      const result = form.id
        ? await supabase.from('erp_fmea').update(payload).eq('id', form.id).eq('empresa_id', empresaId).select(columns).single()
        : await supabase.from('erp_fmea').insert({ ...payload, empresa_id: empresaId }).select(columns).single()
      if (result.error) throw result.error
      if (!result.data) throw new Error('O banco não retornou a análise PFMEA gravada.')
      const saved = result.data as FmeaRecord
      setForm(formFromRecord(saved))
      const refreshed = await supabase.from('erp_fmea').select(columns).eq('empresa_id', empresaId).order('updated_at', { ascending: false }).limit(500)
      if (refreshed.error) {
        setMessage('PFMEA gravada, mas a lista não pôde ser atualizada: ' + refreshed.error.message)
        setMessageIsError(true)
      } else {
        setRows((refreshed.data ?? []) as FmeaRecord[])
        setMessage('PFMEA gravada no banco. NPR calculado pelo PostgreSQL e lista atualizada.')
        setMessageIsError(false)
      }
    } catch (error) {
      setMessage(errorText(error))
      setMessageIsError(true)
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'mt-1 h-10 md:h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[12px] text-slate-900 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]'
  const labelClass = 'block min-w-0 text-[9px] font-bold uppercase tracking-wide text-slate-600'
  const buttonClass = 'inline-flex min-h-10 md:min-h-8 items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

  return <main className="industrial-form-page" style={{ maxWidth: 1600, margin: '0 auto', padding: 10, color: '#123B50' }}>
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
      <div><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Qualidade / SGQ • Engenharia de riscos</span><h1 className="mt-1 text-[16px] font-bold">PFMEA — Análise de modos e efeitos de falha</h1><p className="text-[11px] text-slate-600">Registro multiempresa com NPR calculado no banco e ações rastreáveis.</p></div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={buttonClass} onClick={resetForm} disabled={busy}><Plus size={13}/>Novo</button>
        <button type="button" className={buttonClass} onClick={() => void loadRecords()} disabled={busy}><RefreshCw size={13}/>Atualizar</button>
        <button type="button" className={buttonClass} onClick={() => window.print()}><Printer size={13}/>Imprimir</button>
        <button type="button" className="inline-flex min-h-10 md:min-h-8 items-center justify-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[11px] font-semibold text-white hover:bg-[#246f91] disabled:opacity-50" onClick={() => void save()} disabled={busy || loading}><Save size={13}/>{busy ? 'Gravando…' : form.id ? 'Salvar alterações' : 'Gravar PFMEA'}</button>
      </div>
    </header>

    {message && <div role="status" aria-live="polite" className={'mt-2 border px-3 py-2 text-[11px] ' + (messageIsError ? 'border-red-300 bg-red-50 text-red-800' : 'border-sky-200 bg-sky-50 text-sky-900')}>{message}</div>}

    <section className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] gap-3">
      <div className="min-w-0 border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-[12px] font-bold">1 • Identificação e análise</h2>{form.id && <span className="text-[9px] font-bold uppercase text-sky-700">Editando registro existente</span>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          <label className={labelClass}>Código PFMEA *<input className={fieldClass} value={form.codigo} onChange={e => updateField('codigo', e.target.value)} maxLength={80} required placeholder="Código único da análise"/></label>
          <label className={labelClass}>Processo *<input className={fieldClass} value={form.processo} onChange={e => updateField('processo', e.target.value)} maxLength={160} required placeholder="Ex.: Injeção"/></label>
          <label className={labelClass}>Etapa *<input className={fieldClass} value={form.etapa} onChange={e => updateField('etapa', e.target.value)} maxLength={160} required placeholder="Ex.: Recalque"/></label>
          <label className={labelClass + ' sm:col-span-2 xl:col-span-3'}>Modo de falha *<textarea className="mt-1 min-h-[68px] w-full rounded-[2px] border border-slate-300 p-2 text-[12px] outline-none focus:border-[#2D8DB8]" value={form.falha} onChange={e => updateField('falha', e.target.value)} maxLength={4000} required placeholder="Como o processo pode falhar?"/></label>
          <label className={labelClass + ' sm:col-span-2 xl:col-span-3'}>Efeito da falha<textarea className="mt-1 min-h-[56px] w-full rounded-[2px] border border-slate-300 p-2 text-[12px] outline-none focus:border-[#2D8DB8]" value={form.efeito} onChange={e => updateField('efeito', e.target.value)} maxLength={4000} placeholder="Impacto no produto, operador, cliente ou processo"/></label>
          <label className={labelClass + ' sm:col-span-2 xl:col-span-3'}>Causa potencial<textarea className="mt-1 min-h-[56px] w-full rounded-[2px] border border-slate-300 p-2 text-[12px] outline-none focus:border-[#2D8DB8]" value={form.causa} onChange={e => updateField('causa', e.target.value)} maxLength={4000} placeholder="Causa física, método ou condição que origina a falha"/></label>
          <label className={labelClass + ' sm:col-span-2 xl:col-span-3'}>Controles preventivos / de detecção<textarea className="mt-1 min-h-[56px] w-full rounded-[2px] border border-slate-300 p-2 text-[12px] outline-none focus:border-[#2D8DB8]" value={form.controle} onChange={e => updateField('controle', e.target.value)} maxLength={4000} placeholder="Controle atual usado para prevenir ou detectar a falha"/></label>
        </div>
      </div>

      <div className="min-w-0 border border-slate-200 bg-white p-3">
        <h2 className="mb-2 text-[12px] font-bold">2 • Avaliação de risco</h2>
        <div className="grid grid-cols-3 gap-2">
          {([['severidade','Gravidade'],['ocorrencia','Ocorrência'],['deteccao','Detecção']] as const).map(([key,title]) => <label key={key} className={labelClass}>{title} (1–10)<input className="mt-1 h-12 w-full rounded-[2px] border border-slate-300 px-2 text-center text-[18px] font-bold outline-none focus:border-[#2D8DB8]" type="number" min={1} max={10} step={1} value={form[key]} onChange={e => updateField(key, Number(e.target.value))}/></label>)}
        </div>
        <div className="mt-3 border border-[#cbdde4] bg-[#f4f9fb] p-3"><span className="text-[10px] font-bold uppercase text-slate-600">NPR • Gravidade × Ocorrência × Detecção</span><div className="text-[30px] font-bold leading-tight text-[#17445A]">{npr}</div><p className="text-[10px] text-slate-600">O valor persistido é gerado pelo PostgreSQL a partir dos três fatores.</p></div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={labelClass}>Responsável pela ação<input className={fieldClass} value={form.responsavel} onChange={e => updateField('responsavel', e.target.value)} maxLength={160} placeholder="Responsável definido"/></label>
          <label className={labelClass}>Prazo da ação<input className={fieldClass} type="date" value={form.data_limite} onChange={e => updateField('data_limite', e.target.value)}/></label>
          <label className={labelClass + ' sm:col-span-2'}>Ação recomendada<textarea className="mt-1 min-h-[80px] w-full rounded-[2px] border border-slate-300 p-2 text-[12px] outline-none focus:border-[#2D8DB8]" value={form.acao} onChange={e => updateField('acao', e.target.value)} maxLength={4000} placeholder="Ação para reduzir o risco e verificar eficácia"/></label>
          <label className={labelClass + ' sm:col-span-2'}>Status<select className={fieldClass} value={form.status} onChange={e => updateField('status', e.target.value)}>{!statuses.includes(form.status) && <option value={form.status}>{form.status}</option>}{statuses.map(status => <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={resetForm} disabled={busy}><X size={13}/>Limpar formulário</button><button type="button" className="inline-flex min-h-10 md:min-h-8 items-center justify-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[11px] font-semibold text-white hover:bg-[#246f91] disabled:opacity-50" onClick={() => void save()} disabled={busy || loading}><Save size={13}/>{busy ? 'Gravando…' : form.id ? 'Salvar alterações' : 'Gravar PFMEA'}</button></div>
      </div>
    </section>

    <section className="mt-3 border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-[12px] font-bold">3 • Matriz de riscos cadastrada</h2><span className="text-[10px] text-slate-600">{filteredRows.length} registro(s)</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(220px,1fr)_180px] gap-2">
        <label className={labelClass}>Pesquisar<input className={fieldClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Código, processo, falha, causa ou responsável"/></label>
        <label className={labelClass}>Filtrar status<select className={fieldClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos</option>{Array.from(new Set([...statuses, ...rows.map(row => row.status)])).map(status => <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[10px]">
          <thead className="sticky top-0 bg-[#17445A] text-left text-[9px] uppercase text-white"><tr className="h-8"><th className="px-2">Código</th><th className="px-2">Processo / etapa</th><th className="px-2">Modo de falha</th><th className="px-2 text-center">G</th><th className="px-2 text-center">O</th><th className="px-2 text-center">D</th><th className="px-2 text-center">NPR</th><th className="px-2">Status</th><th className="px-2">Ação</th></tr></thead>
          <tbody>
            {filteredRows.map(row => <tr key={row.id} className="h-8 border-b border-slate-100 even:bg-slate-50 hover:bg-sky-50"><td className="px-2 font-semibold">{row.codigo}</td><td className="px-2">{row.processo} / {row.etapa}</td><td className="max-w-[260px] truncate px-2" title={row.falha}>{row.falha}</td><td className="px-2 text-center">{row.severidade}</td><td className="px-2 text-center">{row.ocorrencia}</td><td className="px-2 text-center">{row.deteccao}</td><td className="px-2 text-center font-bold">{row.rpn}</td><td className="px-2">{row.status.replaceAll('_',' ')}</td><td className="px-2"><button type="button" className={buttonClass} onClick={() => openRecord(row)}><Pencil size={12}/>Abrir</button></td></tr>)}
            {!loading && !filteredRows.length && <tr><td colSpan={9} className="p-5 text-center text-[11px] text-slate-600"><ClipboardList size={18} className="mx-auto mb-1"/>Nenhuma análise encontrada para os filtros.</td></tr>}
            {loading && <tr><td colSpan={9} className="p-5 text-center text-[11px] text-slate-600">Carregando análises PFMEA…</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[9px] text-slate-500">A lista apresenta até 500 registros recentes da empresa da sessão. O acesso também é limitado pelas políticas RLS do Supabase.</p>
    </section>
    {companyId && <span className="sr-only">Empresa carregada para sessão: {companyId}</span>}
  </main>
}
