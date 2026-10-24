import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, Ruler, ShieldCheck, Unlock, XCircle } from 'lucide-react'

type HistoryLog = {
  id: string
  instrumentTag: string
  partNumber: string
  value: string
  unit: 'mm' | 'in'
  status: 'APROVADO' | 'REJEITADO'
  timestamp: string
}

type Props = {
  instrumentOptions?: Array<{ codigo: string; descricao: string; status: string }>
}

const fieldClass = 'h-8 w-full rounded-sm border border-slate-700 bg-slate-950 px-2 text-xs font-mono text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60'
const labelClass = 'block space-y-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400'

export default function DigitalCaliper({ instrumentOptions = [] }: Props) {
  const [rawValue, setRawValue] = useState(0)
  const [unit, setUnit] = useState<'mm' | 'in'>('mm')
  const [zeroOffset, setZeroOffset] = useState(0)
  const [history, setHistory] = useState<HistoryLog[]>([])
  const [instrumentTag, setInstrumentTag] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [targetValue, setTargetValue] = useState('50.00')
  const [tolerance, setTolerance] = useState('0.50')
  const [notice, setNotice] = useState('')

  const calibratedValueInMM = rawValue - zeroOffset
  const currentMeasure = unit === 'mm' ? calibratedValueInMM : calibratedValueInMM / 25.4
  const displayValue = unit === 'mm' ? calibratedValueInMM.toFixed(2) : (calibratedValueInMM / 25.4).toFixed(3)
  const target = Number.parseFloat(targetValue) || 0
  const tol = Number.parseFloat(tolerance) || 0
  const minAllowed = target - tol
  const maxAllowed = target + tol
  const hasTargetSet = target > 0 && tol > 0
  const isOutOfTolerance = hasTargetSet && (currentMeasure < minAllowed || currentMeasure > maxAllowed)
  const selectedInstrument = instrumentOptions.find(item => item.codigo === instrumentTag)
  const blockedInstrument = !!selectedInstrument && /BLOQUEADO|VENCIDO|INATIVO|REPROVADO/i.test(selectedInstrument.status)

  function toggleUnit() {
    if (isLocked) return
    if (unit === 'mm') {
      setTargetValue((target / 25.4).toFixed(3))
      setTolerance((tol / 25.4).toFixed(3))
      setUnit('in')
    } else {
      setTargetValue((target * 25.4).toFixed(2))
      setTolerance((tol * 25.4).toFixed(2))
      setUnit('mm')
    }
  }

  function saveMeasurement() {
    if (!instrumentTag.trim()) {
      setNotice('Selecione ou informe a TAG de um instrumento cadastrado.')
      return
    }
    if (!partNumber.trim()) {
      setNotice('Informe a identificação da peça ou lote para garantir a rastreabilidade.')
      return
    }
    if (!selectedInstrument) {
      setNotice('A TAG precisa corresponder a um instrumento cadastrado no painel.')
      return
    }
    if (blockedInstrument) {
      setNotice('Medição não registrada: o instrumento está bloqueado ou com calibração vencida.')
      return
    }
    const status = isOutOfTolerance ? 'REJEITADO' : 'APROVADO'
    setHistory(previous => [{
      id: `${Date.now()}-${previous.length}`,
      instrumentTag,
      partNumber: partNumber.trim(),
      value: displayValue,
      unit,
      status,
      timestamp: new Date().toLocaleString('pt-BR'),
    }, ...previous])
    setNotice(`Medição registrada nesta sessão: ${status}. Para rastreabilidade permanente, grave o resultado no fluxo de inspeção aprovado do ERP.`)
  }

  return (
    <section className="grid w-full grid-cols-1 gap-3 xl:grid-cols-4">
      <article className="border border-slate-700 bg-slate-900 text-slate-100 shadow-xl xl:col-span-1">
        <header className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-400">SYSNQRA • METROLOGIA</p>
            <p className="mt-1 text-[10px] text-slate-400">Rastreabilidade ISO 9001 / IATF 16949</p>
          </div>
          <ShieldCheck size={18} className="text-sky-400" />
        </header>
        <div className="space-y-4 p-3">
          <label className={labelClass}>TAG do instrumento
            {instrumentOptions.length > 0 ? (
              <select className={fieldClass} value={instrumentTag} disabled={isLocked} onChange={event => setInstrumentTag(event.target.value)}>
                <option value="">Selecione instrumento cadastrado</option>
                {instrumentOptions.map(item => <option key={item.codigo} value={item.codigo}>{item.codigo} — {item.descricao}</option>)}
              </select>
            ) : <input className={fieldClass} value={instrumentTag} disabled={isLocked} onChange={event => setInstrumentTag(event.target.value)} placeholder="TAG cadastrada no ERP" />}
          </label>
          {selectedInstrument && <p className={`text-[10px] ${blockedInstrument ? 'text-rose-400' : 'text-emerald-400'}`}>Status cadastral: {selectedInstrument.status}</p>}
          <label className={labelClass}>ID da peça / lote
            <input className={fieldClass} value={partNumber} onChange={event => setPartNumber(event.target.value)} placeholder="Ex.: lote ou ordem" />
          </label>
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Parâmetros de medição</span>
            <button type="button" onClick={() => setIsLocked(value => !value)} className={`inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-[10px] font-bold ${isLocked ? 'border-amber-500/50 text-amber-300' : 'border-slate-700 text-slate-400'}`} title={isLocked ? 'Desbloquear parâmetros' : 'Bloquear parâmetros'}>
              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}{isLocked ? 'Bloqueado' : 'Travar'}
            </button>
          </div>
          <label className={labelClass}>Medida alvo ({unit})
            <input type="number" step="any" className={fieldClass} disabled={isLocked} value={targetValue} onChange={event => setTargetValue(event.target.value)} />
          </label>
          <label className={labelClass}>Tolerância de engenharia (±)
            <input type="number" min="0" step="any" className={fieldClass} disabled={isLocked} value={tolerance} onChange={event => setTolerance(event.target.value)} />
          </label>
          {hasTargetSet && <div className="space-y-1 border border-slate-800 bg-slate-950/70 p-2 font-mono text-[10px] text-slate-400"><p className="font-sans text-[9px] font-bold uppercase tracking-wider text-slate-500">Limites de engenharia</p><p>Mín.: {minAllowed.toFixed(unit === 'mm' ? 2 : 3)} {unit}</p><p>Máx.: {maxAllowed.toFixed(unit === 'mm' ? 2 : 3)} {unit}</p></div>}
        </div>
      </article>

      <article className={`flex flex-col justify-between border bg-slate-900 text-slate-100 shadow-xl transition-colors xl:col-span-3 ${isOutOfTolerance ? 'border-rose-600 ring-1 ring-rose-600/60' : 'border-slate-700'}`}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <h2 className="flex items-center gap-2 text-xs font-bold"><Ruler size={16} className="text-sky-400" /> Leitura ativa do paquímetro digital</h2>
          {hasTargetSet && (isOutOfTolerance
            ? <span className="inline-flex items-center gap-1 border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[9px] font-black tracking-wide text-rose-300"><XCircle size={12}/> FORA DA ESPECIFICAÇÃO</span>
            : <span className="inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[9px] font-black tracking-wide text-emerald-300"><CheckCircle2 size={12}/> DIMENSIONAL OK</span>)}
        </header>
        <div className="space-y-5 p-4">
          <div className={`relative flex h-32 flex-col items-end justify-center border p-4 font-mono transition-colors ${isOutOfTolerance ? 'border-rose-500/50 bg-rose-950/40' : 'border-emerald-500/25 bg-emerald-950/20'}`}>
            <p className={`absolute left-3 top-3 text-[9px] font-bold uppercase tracking-widest ${isOutOfTolerance ? 'text-rose-300' : 'text-slate-500'}`}>{isOutOfTolerance ? 'Alerta: discrepância detectada' : `Instrumento selecionado: ${instrumentTag || 'não informado'}`}</p>
            <p className={`text-5xl font-black tracking-tight sm:text-6xl ${isOutOfTolerance ? 'text-rose-400' : 'text-emerald-400'}`}>{displayValue}</p>
            <p className={`mt-1 text-xs font-bold uppercase tracking-widest ${isOutOfTolerance ? 'text-rose-400' : 'text-emerald-500'}`}>{unit}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between gap-2 font-mono text-[10px] text-slate-500"><span>0,00 mm</span><span className="font-bold text-slate-300">Curso simulado: {rawValue.toFixed(2)} mm</span><span>150,00 mm</span></div>
            <input aria-label="Deslocamento simulado do paquímetro" type="range" min="0" max="150" step="0.01" value={rawValue} disabled={isLocked} onChange={event => setRawValue(Number(event.target.value))} className="w-full cursor-pointer accent-sky-400 disabled:cursor-not-allowed" />
            <p className="text-[10px] text-amber-300/80">Leitura demonstrativa por controle deslizante; não representa conexão física com sensor.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isLocked} onClick={() => setUnit(value => value === 'mm' ? 'in' : 'mm')} className="h-8 border border-slate-700 px-3 text-[10px] font-bold uppercase hover:border-sky-400 disabled:opacity-40">Unidade: {unit} · alternar</button>
            <button type="button" disabled={isLocked} onClick={() => setZeroOffset(rawValue)} className="h-8 border border-slate-700 px-3 text-[10px] font-bold uppercase hover:border-sky-400 disabled:opacity-40">Zero / tara</button>
            <button type="button" disabled={isLocked} onClick={() => { setZeroOffset(0); setRawValue(0) }} className="h-8 border border-slate-700 px-3 text-[10px] font-bold uppercase hover:border-sky-400 disabled:opacity-40">Resetar</button>
            <button type="button" onClick={saveMeasurement} disabled={blockedInstrument} className="ml-auto inline-flex h-8 items-center gap-1.5 border border-sky-500 bg-sky-600 px-3 text-[10px] font-black uppercase text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={13}/> Registrar medição</button>
          </div>
          {blockedInstrument && <p role="alert" className="flex items-center gap-2 border border-rose-500/40 bg-rose-950/40 p-2 text-[10px] font-bold text-rose-300"><AlertTriangle size={14}/> Instrumento bloqueado: não é permitido registrar medição.</p>}
          {notice && <p role="status" className="border border-slate-700 bg-slate-950 p-2 text-[10px] text-slate-300">{notice}</p>}
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico de medições desta sessão</h3><span className="font-mono text-[10px] text-slate-500">{history.length} registro(s)</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[10px]">
              <thead className="text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Data/hora','TAG','Peça / lote','Leitura','Resultado'].map(label => <th key={label} className="border-b border-slate-800 px-2 py-2">{label}</th>)}</tr></thead>
              <tbody>{history.map(item => <tr key={item.id} className="border-b border-slate-800/70"><td className="px-2 py-2 text-slate-400">{item.timestamp}</td><td className="px-2 py-2 font-mono">{item.instrumentTag}</td><td className="px-2 py-2">{item.partNumber}</td><td className="px-2 py-2 font-mono">{item.value} {item.unit}</td><td className={`px-2 py-2 font-black ${item.status === 'APROVADO' ? 'text-emerald-400' : 'text-rose-400'}`}>{item.status}</td></tr>)}</tbody>
            </table>
          </div>
          {!history.length && <p className="py-4 text-center text-[10px] text-slate-500">Nenhuma medição registrada nesta sessão.</p>}
        </div>
      </article>
    </section>
  )
}
