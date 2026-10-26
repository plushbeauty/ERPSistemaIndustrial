/** Atualizado: padrão visual premium SYSNQRA · 26/10/2026 · leitura demonstrativa sem sensor físico. */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
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
  instrumentOptions?: Array<{ codigo: string; descricao: string; status: string; proxima_calibracao: string | null }>
}

const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60'
const labelClass = 'block space-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-600'

export default function DigitalCaliper({ instrumentOptions = [] }: Props) {
  const [rawValue, setRawValue] = useState(50)
  const [unit, setUnit] = useState<'mm' | 'in'>('mm')
  const [zeroOffset, setZeroOffset] = useState(0)
  const [history, setHistory] = useState<HistoryLog[]>([])
  const [instrumentTag, setInstrumentTag] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [targetValue, setTargetValue] = useState('50.00')
  const [tolerance, setTolerance] = useState('0.50')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)

  const calibratedValueInMM = rawValue - zeroOffset
  const currentMeasure = unit === 'mm' ? calibratedValueInMM : calibratedValueInMM / 25.4
  const displayValue = unit === 'mm' ? calibratedValueInMM.toFixed(2) : (calibratedValueInMM / 25.4).toFixed(3)
  const target = Number.parseFloat(targetValue) || 0
  const tol = Number.parseFloat(tolerance) || 0
  const minAllowed = target - tol
  const maxAllowed = target + tol
  const hasTargetSet = targetValue.trim() !== '' && tolerance.trim() !== '' && Number.isFinite(target) && target > 0 && Number.isFinite(tol) && tol >= 0
  const isOutOfTolerance = hasTargetSet && (currentMeasure < minAllowed || currentMeasure > maxAllowed)
  const selectedInstrument = instrumentOptions.find(item => item.codigo === instrumentTag)
  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ativa não identificada.')
      const result = await supabase.from('erp_inspecoes')
        .select('id,resultado,medicoes,created_at')
        .eq('empresa_id', company.data)
        .eq('tipo', 'PAQUIMETRO_DIGITAL')
        .order('created_at', { ascending: false })
        .limit(50)
      if (result.error) throw result.error
      const rows: HistoryLog[] = (result.data ?? []).map(item => {
        const first = Array.isArray(item.medicoes) && item.medicoes.length > 0
          ? item.medicoes[0] as Record<string, unknown>
          : {}
        const stamp = typeof item.created_at === 'string' ? new Date(item.created_at) : new Date()
        return {
          id: String(item.id),
          instrumentTag: String(first.instrumentTag ?? ''),
          partNumber: String(first.partNumber ?? ''),
          value: String(first.value ?? ''),
          unit: first.unit === 'in' ? 'in' : 'mm',
          status: item.resultado === 'APROVADO' ? 'APROVADO' : 'REJEITADO',
          timestamp: Number.isNaN(stamp.getTime()) ? '—' : stamp.toLocaleString('pt-BR'),
        }
      })
      setHistory(rows)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível consultar o histórico persistido.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { void loadHistory() }, [])

  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const blockedInstrument = !!selectedInstrument && (selectedInstrument.status.trim().toUpperCase() !== 'APROVADO' || !selectedInstrument.proxima_calibracao || selectedInstrument.proxima_calibracao < todayISO)

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

  async function saveMeasurement() {
    if (!instrumentTag.trim()) {
      setNotice('Selecione ou informe a TAG de um instrumento cadastrado.')
      return
    }
    if (!partNumber.trim()) {
      setNotice('Informe a identificação da peça ou lote para garantir a rastreabilidade.')
      return
    }
    if (!hasTargetSet) {
      setNotice('Informe uma medida alvo maior que zero e uma tolerância válida (zero ou positiva) antes de registrar.')
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
    setSaving(true)
    setNotice('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      const user = await supabase.auth.getUser()
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ativa não identificada.')
      if (user.error) throw user.error
      const status: HistoryLog['status'] = isOutOfTolerance ? 'REJEITADO' : 'APROVADO'
      const result = await supabase.from('erp_inspecoes').insert({
        empresa_id: company.data,
        produto_id: null,
        lote_id: null,
        ordem_producao_id: null,
        maquina_id: null,
        tipo: 'PAQUIMETRO_DIGITAL',
        resultado: status,
        quantidade_inspecionada: 1,
        quantidade_aprovada: status === 'APROVADO' ? 1 : 0,
        quantidade_reprovada: status === 'REJEITADO' ? 1 : 0,
        observacao: 'Controle dimensional — peça/lote: ' + partNumber.trim(),
        inspetor_nome: user.data.user?.email ?? null,
        medicoes: [{
          instrumentTag,
          instrumentId: selectedInstrument.codigo,
          instrumentDescription: selectedInstrument.descricao,
          partNumber: partNumber.trim(),
          value: displayValue,
          valueMm: calibratedValueInMM.toFixed(4),
          unit,
          target: targetValue,
          tolerance,
          minimum: minAllowed.toFixed(4),
          maximum: maxAllowed.toFixed(4),
          status,
          source: 'DIGITAL_CALIPER_SLIDER_DEMONSTRATION',
        }],
        acao_bloqueio: status === 'APROVADO' ? 'NENHUMA' : 'SEGREGAR_LOTE',
        criado_por: user.data.user?.id ?? null,
      })
      if (result.error) throw result.error
      setNotice(`Medição salva no banco da empresa: ${status}.`)
      await loadHistory()
    } catch (cause) {
      setNotice(cause instanceof Error ? 'Falha ao gravar medição: ' + cause.message : 'Falha ao gravar medição no banco.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="quality-metrology-caliper grid w-full grid-cols-1 gap-4 xl:grid-cols-4">
      <article className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm xl:col-span-1">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">SYSNQRA • METROLOGIA</p>
            <p className="mt-1 text-[10px] text-slate-500">Rastreabilidade ISO 9001 / IATF 16949</p>
          </div>
          <ShieldCheck size={18} className="text-blue-600" />
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
          {selectedInstrument && <p className={`text-[10px] font-semibold ${blockedInstrument ? 'text-red-700' : 'text-emerald-700'}`}>Status cadastral: {selectedInstrument.status}</p>}
          <label className={labelClass}>ID da peça / lote
            <input className={fieldClass} value={partNumber} onChange={event => setPartNumber(event.target.value)} placeholder="Ex.: lote ou ordem" />
          </label>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Parâmetros de medição</span>
            <button type="button" onClick={() => setIsLocked(value => !value)} className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-bold ${isLocked ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-300 bg-white text-slate-600'}`} title={isLocked ? 'Desbloquear parâmetros' : 'Bloquear parâmetros'}>
              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}{isLocked ? 'Bloqueado' : 'Travar'}
            </button>
          </div>
          <label className={labelClass}>Medida alvo ({unit})
            <input type="number" step="any" className={fieldClass} disabled={isLocked} value={targetValue} onChange={event => setTargetValue(event.target.value)} />
          </label>
          <label className={labelClass}>Tolerância de engenharia (±)
            <input type="number" min="0" step="any" className={fieldClass} disabled={isLocked} value={tolerance} onChange={event => setTolerance(event.target.value)} />
          </label>
          {hasTargetSet && <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] text-slate-700"><p className="font-sans text-[9px] font-bold uppercase tracking-wider text-slate-500">Limites de engenharia</p><p>Mín.: {minAllowed.toFixed(unit === 'mm' ? 2 : 3)} {unit}</p><p>Máx.: {maxAllowed.toFixed(unit === 'mm' ? 2 : 3)} {unit}</p></div>}
        </div>
      </article>

      <article className={`flex flex-col justify-between rounded-xl border bg-white text-slate-900 shadow-sm transition-colors xl:col-span-3 ${isOutOfTolerance ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'}`}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><Ruler size={16} className="text-blue-700" /> Leitura ativa do paquímetro digital</h2>
          {hasTargetSet && (isOutOfTolerance
            ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9px] font-black tracking-wide text-rose-700"><XCircle size={12}/> FORA DA ESPECIFICAÇÃO</span>
            : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black tracking-wide text-emerald-700"><CheckCircle2 size={12}/> DIMENSIONAL OK</span>)}
        </header>
        <div className="space-y-5 p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
            <svg viewBox="0 0 420 130" role="img" aria-label={`Ilustração de paquímetro digital com leitura de ${displayValue} ${unit}`} className="h-auto w-full">
              <defs>
                <linearGradient id="sysnqra-caliper-steel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e2e8f0"/><stop offset="1" stopColor="#64748b"/></linearGradient>
                <linearGradient id="sysnqra-caliper-body" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#334155"/><stop offset="1" stopColor="#0f172a"/></linearGradient>
              </defs>
              <path d="M20 30 h22 v80 l-10 14 h-12 z" fill="url(#sysnqra-caliper-steel)"/>
              <path d="M20 30 h22 v-18 l-8 -8 h-14 z" fill="url(#sysnqra-caliper-steel)"/>
              <rect x="20" y="30" width="390" height="26" rx="2" fill="url(#sysnqra-caliper-steel)"/>
              {Array.from({ length: 61 }, (_, i) => <line key={i} x1={48 + i * 5.9} x2={48 + i * 5.9} y1="30" y2={i % 10 === 0 ? 42 : i % 5 === 0 ? 38 : 35} stroke="#334155" strokeWidth="0.8"/>)}
              {Array.from({ length: 7 }, (_, i) => <text key={i} x={48 + i * 59} y="51" fontSize="6" textAnchor="middle" fill="#334155" fontFamily="monospace">{i * 25}</text>)}
              <g transform={`translate(${(rawValue / 150) * 185} 0)`} style={{ transition: 'transform 120ms linear' }}>
                <path d="M44 56 h18 v54 l-10 14 h-8 z" fill="url(#sysnqra-caliper-steel)"/>
                <path d="M44 30 v-18 l6 -8 h12 v26 z" fill="url(#sysnqra-caliper-steel)"/>
                <rect x="44" y="22" width="130" height="62" rx="8" fill="url(#sysnqra-caliper-body)" stroke="#64748b"/>
                <rect x="56" y="30" width="96" height="30" rx="3" fill="#bbf7d0"/>
                <text x="104" y="51" fontSize={displayValue.length > 7 ? "13" : "16"} textAnchor="middle" fill="#14532d" fontFamily="monospace" fontWeight="700">{displayValue}</text>
                <text x="148" y="58" fontSize="7" textAnchor="end" fill="#14532d" fontFamily="monospace">{unit}</text>
                <circle cx="70" cy="72" r="5" fill="#38bdf8"/><circle cx="90" cy="72" r="5" fill="#64748b"/>
                <text x="122" y="75" fontSize="6" textAnchor="middle" fill="#cbd5e1" fontFamily="sans-serif" letterSpacing="1">SYSNQRA</text>
                <rect x="160" y="26" width="6" height="10" rx="2" fill="#475569"/>
              </g>
            </svg>
          </div>
          <div className={`relative flex h-32 flex-col items-end justify-center rounded-xl border p-4 font-mono transition-colors ${isOutOfTolerance ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className={`absolute left-3 top-3 text-[9px] font-bold uppercase tracking-widest ${isOutOfTolerance ? 'text-rose-700' : 'text-slate-500'}`}>{isOutOfTolerance ? 'Alerta: discrepância detectada' : `Instrumento selecionado: ${instrumentTag || 'não informado'}`}</p>
            <p className={`text-5xl font-black tracking-tight sm:text-6xl ${isOutOfTolerance ? 'text-rose-700' : 'text-emerald-800'}`}>{displayValue}</p>
            <p className={`mt-1 text-xs font-bold uppercase tracking-widest ${isOutOfTolerance ? 'text-rose-700' : 'text-emerald-700'}`}>{unit}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between gap-2 font-mono text-[10px] text-slate-500"><span>0,00 mm</span><span className="font-bold text-slate-700">Curso simulado: {rawValue.toFixed(2)} mm</span><span>150,00 mm</span></div>
            <input aria-label="Deslocamento simulado do paquímetro" type="range" min="0" max="150" step="0.01" value={rawValue} disabled={isLocked} onChange={event => setRawValue(Number(event.target.value))} className="w-full cursor-pointer accent-sky-400 disabled:cursor-not-allowed" />
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Leitura demonstrativa por controle deslizante; não representa conexão física com sensor.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isLocked} onClick={toggleUnit} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40">Unidade: {unit} · alternar</button>
            <button type="button" disabled={isLocked} onClick={() => setZeroOffset(rawValue)} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40">Zero / tara</button>
            <button type="button" disabled={isLocked} onClick={() => { setZeroOffset(0); setRawValue(0) }} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40">Resetar</button>
            <button type="button" onClick={() => void saveMeasurement()} disabled={!selectedInstrument || blockedInstrument || saving} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-700 px-4 text-[10px] font-black uppercase text-white shadow-sm transition hover:-translate-y-px hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={13}/> {saving ? 'Gravando…' : 'Registrar medição'}</button>
          </div>
          {blockedInstrument && <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[10px] font-bold text-rose-800"><AlertTriangle size={14}/> Instrumento bloqueado: não é permitido registrar medição.</p>}
          {notice && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[10px] text-blue-900">{notice}</p>}
        </div>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Histórico de medições persistido no ERP</h3><span className="font-mono text-[10px] text-slate-500">{history.length} registro(s)</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[10px]">
              <thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Data/hora','TAG','Peça / lote','Leitura','Resultado'].map(label => <th key={label} className="border-b border-slate-200 px-3 py-2 text-left">{label}</th>)}</tr></thead>
              <tbody>{history.map(item => <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-3 py-2 text-slate-600">{item.timestamp}</td><td className="px-3 py-2 font-mono font-bold text-blue-800">{item.instrumentTag}</td><td className="px-3 py-2 text-slate-800">{item.partNumber}</td><td className="px-3 py-2 font-mono text-slate-800">{item.value} {item.unit}</td><td className={`px-3 py-2 font-black ${item.status === 'APROVADO' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.status}</td></tr>)}</tbody>
            </table>
          </div>
          {!history.length && <p className="py-4 text-center text-[10px] text-slate-500">{historyLoading ? 'Consultando histórico do ERP…' : 'Nenhuma medição registrada para esta empresa.'}</p>}
        </div>
      </article>
    </section>
  )
}

