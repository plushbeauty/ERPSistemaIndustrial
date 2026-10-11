import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Plus, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Score = number | ''
type AuditRow = {
  id: string
  setor: string
  auditor: string
  acompanhante: string
  seiri: number
  seiton: number
  seiso: number
  seiketsu: number
  shitsuke: number
  observacoes: unknown
  status: string
  created_at: string
}
const senses = [
  { key: 'seiri', label: 'SEIRI · UTILIZAÇÃO' },
  { key: 'seiton', label: 'SEITON · ORGANIZAÇÃO' },
  { key: 'seiso', label: 'SEISO · LIMPEZA' },
  { key: 'seiketsu', label: 'SEIKETSU · PADRONIZAÇÃO' },
  { key: 'shitsuke', label: 'SHITSUKE · DISCIPLINA' },
] as const
const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-semibold uppercase text-slate-600'
const button = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-50'
const emptyScores = (): Score[] => Array(5).fill('')
const emptyNotes = (): string[] => Array(5).fill('')
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export default function QualidadeAuditoria5S() {
  const [companyId, setCompanyId] = useState('')
  const [rows, setRows] = useState<AuditRow[]>([])
  const [scores, setScores] = useState<Score[]>(emptyScores)
  const [sector, setSector] = useState('')
  const [auditor, setAuditor] = useState('')
  const [companion, setCompanion] = useState('')
  const [notes, setNotes] = useState<string[]>(emptyNotes)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const average = useMemo(() => scores.every((score): score is number => typeof score === 'number')
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : null, [scores])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const tenantId = String(company.data)
      setCompanyId(tenantId)
      const result = await supabase.from('erp_qualidade_5s_auditorias')
        .select('id,setor,auditor,acompanhante,seiri,seiton,seiso,seiketsu,shitsuke,observacoes,status,created_at')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (result.error) throw result.error
      setRows((result.data ?? []) as AuditRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar as auditorias 5S.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function resetForm() {
    setSector('')
    setAuditor('')
    setCompanion('')
    setScores(emptyScores())
    setNotes(emptyNotes())
    setError('')
    setNotice('')
  }

  async function save() {
    setError('')
    setNotice('')
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    if (!sector.trim()) { setError('Informe o setor auditado.'); return }
    if (!auditor.trim()) { setError('Informe o auditor responsável.'); return }
    if (!scores.every((score): score is number => typeof score === 'number' && score >= 1 && score <= 5)) {
      setError('Informe uma nota de 1 a 5 para cada um dos cinco sensos antes de salvar.')
      return
    }
    setSaving(true)
    try {
      const result = await supabase.from('erp_qualidade_5s_auditorias').insert({
        empresa_id: companyId,
        setor: sector.trim(),
        auditor: auditor.trim(),
        acompanhante: companion.trim(),
        seiri: scores[0],
        seiton: scores[1],
        seiso: scores[2],
        seiketsu: scores[3],
        shitsuke: scores[4],
        observacoes: { seiri: notes[0].trim(), seiton: notes[1].trim(), seiso: notes[2].trim(), seiketsu: notes[3].trim(), shitsuke: notes[4].trim() },
        status: 'ENCERRADA',
      }).select('id').single()
      if (result.error) throw result.error
      resetForm()
      setNotice('Auditoria 5S gravada no banco da empresa.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar a auditoria 5S.')
    } finally {
      setSaving(false)
    }
  }

  const notesOf = (row: AuditRow) => {
    const value = isRecord(row.observacoes) ? row.observacoes : {}
    return senses.map(sense => String(value[sense.key] ?? '')).filter(Boolean).join(' · ')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <QualitySidebar active="/qualidade/auditoria-5s" />
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C8E3EE] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center border border-[#C8E3EE] bg-white text-[#2D8DB8]"><ClipboardCheck size={17} /></span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">ERP INDUSTRIAL · SGQ</p>
              <h1 className="text-[15px] font-semibold leading-tight">Auditoria 5S</h1>
              <p className="text-[10px] text-slate-500">Registros reais por empresa · sem notas pré-preenchidas</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={resetForm} className={secondaryButton}><Plus size={12} /> NOVA</button>
            <button type="button" onClick={() => void load()} disabled={loading || saving} className={secondaryButton}><RefreshCw size={12} /> ATUALIZAR</button>
            <button type="button" onClick={() => void save()} disabled={saving || loading} className={button}><Save size={12} /> SALVAR AUDITORIA</button>
            <button type="button" onClick={() => window.print()} className={secondaryButton}><Printer size={12} /> IMPRIMIR</button>
          </div>
        </header>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-300 bg-red-50 p-2 text-[10px] text-red-800' : 'border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || notice}</div>}
        <section className="grid gap-2 border border-[#C8E3EE] bg-white p-3 md:grid-cols-3">
          <label className={label}>Setor auditado<input className={field} value={sector} onChange={event => setSector(event.target.value)} placeholder="Informe o setor" /></label>
          <label className={label}>Auditor responsável<input className={field} value={auditor} onChange={event => setAuditor(event.target.value)} placeholder="Nome do auditor" /></label>
          <label className={label}>Acompanhante<input className={field} value={companion} onChange={event => setCompanion(event.target.value)} placeholder="Opcional" /></label>
        </section>
        <section className="overflow-x-auto border border-[#C8E3EE] bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#123B50] text-white"><tr><th className="px-3 py-2 text-[9px] font-semibold">SENSO</th><th className="w-32 px-3 py-2 text-[9px] font-semibold">NOTA (1–5)</th><th className="px-3 py-2 text-[9px] font-semibold">OBSERVAÇÃO / EVIDÊNCIA</th></tr></thead>
            <tbody>{senses.map((sense, index) => (
              <tr key={sense.key} className="border-b border-slate-100">
                <td className="px-3 py-2 text-[10px] font-semibold">{sense.label}</td>
                <td className="px-3 py-2"><select className={field} value={scores[index]} onChange={event => setScores(current => current.map((score, i) => i === index ? (event.target.value ? Number(event.target.value) : '') : score))}><option value="">Selecionar…</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></td>
                <td className="px-3 py-2"><input className={field} value={notes[index]} onChange={event => setNotes(current => current.map((note, i) => i === index ? event.target.value : note))} placeholder="Registrar evidência observada" /></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
        <section className="grid gap-2 border border-[#C8E3EE] bg-white p-3 sm:grid-cols-2">
          <div><p className="text-[9px] font-semibold uppercase text-slate-500">Média dos cinco sensos</p><p className="mt-1 text-[18px] font-semibold">{average === null ? '—' : average.toFixed(1) + ' / 5,0'}</p></div>
          <div><p className="text-[9px] font-semibold uppercase text-slate-500">Resultado</p><p className="mt-1 text-[11px] font-semibold">{average === null ? 'Preencha as cinco notas para calcular' : average >= 4 ? 'Meta atingida (≥ 4,0)' : 'Necessário plano de ação (< 4,0)'}</p></div>
        </section>
        <section className="border border-[#C8E3EE] bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><h2 className="text-[11px] font-semibold">Histórico recente</h2><span className="text-[9px] text-slate-500">{rows.length} registros</span></div>
          {loading ? <p className="p-3 text-[10px] text-slate-500">Carregando auditorias…</p> : rows.length === 0 ? <p className="p-3 text-[10px] text-slate-500">Nenhuma auditoria registrada para esta empresa.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-[9px]">DATA</th><th className="px-3 py-2 text-[9px]">SETOR</th><th className="px-3 py-2 text-[9px]">AUDITOR</th><th className="px-3 py-2 text-[9px]">MÉDIA</th><th className="px-3 py-2 text-[9px]">OBSERVAÇÕES</th><th className="px-3 py-2 text-[9px]">STATUS</th></tr></thead><tbody>{rows.map(row => { const rowAverage = (row.seiri + row.seiton + row.seiso + row.seiketsu + row.shitsuke) / 5; return <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2 text-[10px]">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="px-3 py-2 text-[10px]">{row.setor}</td><td className="px-3 py-2 text-[10px]">{row.auditor}</td><td className="px-3 py-2 text-[10px]">{rowAverage.toFixed(1)}</td><td className="px-3 py-2 text-[10px]">{notesOf(row) || '—'}</td><td className="px-3 py-2 text-[10px]">{row.status}</td></tr> })}</tbody></table></div>}
        </section>
      </div>
    </main>
  )
}
