import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type FmeaRow = {
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
}

const inputClass = 'h-[30px] min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'mb-[2px] block text-[9px] font-semibold uppercase tracking-wider text-slate-500'

const emptyForm = {
  codigo: '', processo: '', etapa: '', falha: '', efeito: '', causa: '', controle: '',
  severidade: 8, ocorrencia: 4, deteccao: 3, acao: '', responsavel: '', data_limite: '', status: 'ABERTO',
}

export default function QualidadePFMEA() {
  const [empresaId, setEmpresaId] = useState('')
  const [rows, setRows] = useState<FmeaRow[]>([])
  const [form, setForm] = useState(emptyForm)
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')

  const npr = useMemo(() => form.severidade * form.ocorrencia * form.deteccao, [form.severidade, form.ocorrencia, form.deteccao])

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const result = await supabase.from('erp_fmea')
        .select('id,codigo,processo,etapa,falha,efeito,causa,controle,severidade,ocorrencia,deteccao,rpn,acao,responsavel,data_limite,status')
        .eq('empresa_id', companyId)
        .order('rpn', { ascending: false })
        .limit(1000)
      if (result.error) throw result.error
      setEmpresaId(companyId)
      setRows((result.data ?? []) as FmeaRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a matriz PFMEA.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const update = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
    setMessage('')
  }

  const reset = () => {
    setSelectedId('')
    setForm({ ...emptyForm })
    setError('')
    setMessage('')
  }

  const selectRow = (row: FmeaRow) => {
    setSelectedId(row.id)
    setForm({
      codigo: row.codigo,
      processo: row.processo,
      etapa: row.etapa ?? '',
      falha: row.falha,
      efeito: row.efeito ?? '',
      causa: row.causa ?? '',
      controle: row.controle ?? '',
      severidade: Number(row.severidade),
      ocorrencia: Number(row.ocorrencia),
      deteccao: Number(row.deteccao),
      acao: row.acao ?? '',
      responsavel: row.responsavel ?? '',
      data_limite: row.data_limite ?? '',
      status: row.status,
    })
    setError('')
    setMessage('Registro carregado para revisão.')
  }

  const save = async () => {
    setError('')
    setMessage('')
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!form.codigo.trim() || !form.processo.trim() || !form.falha.trim()) {
      setError('Código, processo e modo de falha são obrigatórios.')
      return
    }
    if (![form.severidade, form.ocorrencia, form.deteccao].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) {
      setError('Severidade, ocorrência e detecção devem ser inteiros entre 1 e 10.')
      return
    }
    setBusy(true)
    try {
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
        status: form.status,
      }
      const result = selectedId
        ? await supabase.from('erp_fmea').update(payload).eq('id', selectedId).eq('empresa_id', empresaId)
        : await supabase.from('erp_fmea').insert({ ...payload, empresa_id: empresaId })
      if (result.error) throw result.error
      setMessage('PFMEA gravado. NPR calculado pelo banco com base em S × O × D.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar a análise PFMEA.')
    } finally {
      setBusy(false)
    }
  }

  const filteredRows = rows.filter(row => {
    const term = query.trim().toLowerCase()
    return !term || [row.codigo, row.processo, row.falha, row.status].some(value => String(value ?? '').toLowerCase().includes(term))
  })

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-2 text-[#123B50]">
      <div className="mx-auto max-w-[1700px] space-y-2">
        <header className="flex min-h-[38px] flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Qualidade · Engenharia de riscos</p>
            <h1 className="text-[12px] font-semibold">MATRIZ PFMEA · ANÁLISE DE MODO E EFEITO DE FALHA</h1>
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={reset} className={buttonClass + ' border-slate-300 bg-white'}><Plus size={13} /> NOVO</button>
            <button type="button" onClick={() => void load()} disabled={busy} className={buttonClass + ' border-slate-300 bg-white'}><RefreshCw size={13} /> ATUALIZAR</button>
            <button type="button" onClick={() => void save()} disabled={busy} className={buttonClass + ' border-sky-700 bg-sky-700 text-white'}><Save size={13} /> SALVAR</button>
            <button type="button" onClick={() => window.print()} className={buttonClass + ' border-slate-300 bg-white'}><Printer size={13} /> IMPRIMIR</button>
          </div>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800">{error}</div> : null}
        {message ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">{message}</div> : null}

        <section className="border border-slate-200 bg-white p-2">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider">{selectedId ? 'Revisão de análise existente' : 'Identificação e avaliação do risco'}</h2>
            <span className="text-[10px] text-slate-500">NPR = Severidade × Ocorrência × Detecção</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div><label className={labelClass} htmlFor="fmea-codigo">Código PFMEA *</label><input id="fmea-codigo" className={inputClass + ' w-full'} maxLength={80} value={form.codigo} onChange={event => update('codigo', event.target.value)} /></div>
            <div><label className={labelClass} htmlFor="fmea-processo">Processo / operação *</label><input id="fmea-processo" className={inputClass + ' w-full'} maxLength={160} value={form.processo} onChange={event => update('processo', event.target.value)} /></div>
            <div><label className={labelClass} htmlFor="fmea-etapa">Etapa</label><input id="fmea-etapa" className={inputClass + ' w-full'} maxLength={160} value={form.etapa} onChange={event => update('etapa', event.target.value)} /></div>
            <div><label className={labelClass} htmlFor="fmea-status">Status</label><select id="fmea-status" className={inputClass + ' w-full'} value={form.status} onChange={event => update('status', event.target.value)}><option value="ABERTO">ABERTO</option><option value="EM_TRATAMENTO">EM TRATAMENTO</option><option value="CONTROLADO">CONTROLADO</option><option value="ENCERRADO">ENCERRADO</option></select></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="fmea-falha">Modo de falha *</label><input id="fmea-falha" className={inputClass + ' w-full'} maxLength={500} value={form.falha} onChange={event => update('falha', event.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="fmea-efeito">Efeito potencial</label><input id="fmea-efeito" className={inputClass + ' w-full'} maxLength={500} value={form.efeito} onChange={event => update('efeito', event.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="fmea-causa">Causa potencial</label><input id="fmea-causa" className={inputClass + ' w-full'} maxLength={500} value={form.causa} onChange={event => update('causa', event.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="fmea-controle">Controle preventivo / detecção atual</label><input id="fmea-controle" className={inputClass + ' w-full'} maxLength={500} value={form.controle} onChange={event => update('controle', event.target.value)} /></div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div><label className={labelClass} htmlFor="fmea-severidade">Severidade (S) · 1–10</label><input id="fmea-severidade" className={inputClass + ' w-full text-right'} type="number" min="1" max="10" step="1" value={form.severidade} onChange={event => update('severidade', Number(event.target.value))} /></div>
            <div><label className={labelClass} htmlFor="fmea-ocorrencia">Ocorrência (O) · 1–10</label><input id="fmea-ocorrencia" className={inputClass + ' w-full text-right'} type="number" min="1" max="10" step="1" value={form.ocorrencia} onChange={event => update('ocorrencia', Number(event.target.value))} /></div>
            <div><label className={labelClass} htmlFor="fmea-deteccao">Detecção (D) · 1–10</label><input id="fmea-deteccao" className={inputClass + ' w-full text-right'} type="number" min="1" max="10" step="1" value={form.deteccao} onChange={event => update('deteccao', Number(event.target.value))} /></div>
            <div className="border border-slate-200 bg-slate-50 px-2 py-1"><span className={labelClass}>NPR calculado</span><strong className="block h-[30px] text-right text-[18px] leading-[30px] tabular-nums">{npr}</strong></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="fmea-acao">Ação recomendada</label><input id="fmea-acao" className={inputClass + ' w-full'} maxLength={1000} value={form.acao} onChange={event => update('acao', event.target.value)} /></div>
            <div><label className={labelClass} htmlFor="fmea-responsavel">Responsável</label><input id="fmea-responsavel" className={inputClass + ' w-full'} maxLength={160} value={form.responsavel} onChange={event => update('responsavel', event.target.value)} /></div>
            <div><label className={labelClass} htmlFor="fmea-data-limite">Prazo da ação</label><input id="fmea-data-limite" className={inputClass + ' w-full'} type="date" value={form.data_limite} onChange={event => update('data_limite', event.target.value)} /></div>
          </div>
        </section>

        <section className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider">Registros PFMEA da empresa</h2>
            <div className="flex items-center gap-2"><span className="text-[10px] text-slate-500">{filteredRows.length} registro(s)</span><input aria-label="Pesquisar PFMEA" className={inputClass + ' w-[220px]'} placeholder="Código, processo, falha ou status" value={query} onChange={event => setQuery(event.target.value)} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-600"><tr className="h-[30px]"><th className="px-2">Código</th><th className="px-2">Processo</th><th className="px-2">Modo de falha</th><th className="px-2 text-right">S</th><th className="px-2 text-right">O</th><th className="px-2 text-right">D</th><th className="px-2 text-right">NPR</th><th className="px-2">Status</th></tr></thead>
              <tbody>
                {filteredRows.map(row => <tr key={row.id} onClick={() => selectRow(row)} className={'h-[32px] cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 ' + (selectedId === row.id ? 'bg-sky-50' : '')}><td className="px-2">{row.codigo}</td><td className="px-2">{row.processo}</td><td className="max-w-[420px] truncate px-2" title={row.falha}>{row.falha}</td><td className="px-2 text-right tabular-nums">{row.severidade}</td><td className="px-2 text-right tabular-nums">{row.ocorrencia}</td><td className="px-2 text-right tabular-nums">{row.deteccao}</td><td className="px-2 text-right font-semibold tabular-nums">{row.rpn}</td><td className="px-2">{row.status}</td></tr>)}
                {!busy && filteredRows.length === 0 ? <tr><td colSpan={8} className="h-[56px] px-2 text-center text-[10px] text-slate-500">Nenhuma análise PFMEA encontrada para os filtros informados.</td></tr> : null}
                {busy && filteredRows.length === 0 ? <tr><td colSpan={8} className="h-[32px] animate-pulse bg-slate-50 px-2 text-center text-[10px] text-slate-500">Carregando matriz PFMEA…</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
