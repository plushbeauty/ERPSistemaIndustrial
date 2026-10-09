import { useMemo, useState } from 'react'
import { Printer, RotateCcw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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

  const npr = useMemo(() => gravidade * ocorrencia * deteccao, [gravidade, ocorrencia, deteccao])

  const reset = () => {
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
    setMessage('')
    setMessageType('')
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

      const result = await supabase.from('erp_fmea').upsert({
        empresa_id: String(emp.data),
        codigo: codigo.trim(),
        processo: processo.trim(),
        etapa: etapa.trim(),
        falha: falha.trim(),
        efeito: efeito.trim(),
        causa: causa.trim(),
        controle: controle.trim(),
        severidade: gravidade,
        ocorrencia,
        deteccao,
        status: 'ABERTO',
      }, { onConflict: 'empresa_id,codigo' })

      if (result.error) throw result.error
      setMessage('PFMEA gravado com sucesso no banco de dados da empresa atual.')
      setMessageType('success')
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
            <button type="button" className={`${buttonClass} border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#24769A]`} onClick={() => void save()} disabled={busy}><Save size={12}/> {busy ? 'SALVANDO…' : 'SALVAR PFMEA'}</button>
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
            <label className={labelClass}>Status<input className={`${inputClass} bg-slate-50`} value="ABERTO" readOnly aria-label="Status inicial da análise"/></label>
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
      </div>
    </main>
  )
}
