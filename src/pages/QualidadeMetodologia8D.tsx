import { useEffect, useState } from 'react'
import { Save, Plus, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Rnc = { id: string; numero_rpnc: string; descricao_nao_conformidade: string }
type OitoD = {
  id: string
  codigo: string
  rpnc_id: string | null
  etapa_atual: string
  d1_equipe: string
  d2_problema: string
  d3_contencao: string
  d4_causa_raiz: string
  d5_acoes: string
  d6_validacao: string
  d7_preventivas: string
  d8_encerramento: string
  status: string
  updated_at: string
}
const steps = ['D1 - EQUIPE','D2 - PROBLEMA','D3 - CONTENÇÃO','D4 - CAUSA RAIZ','D5 - AÇÕES','D6 - VALIDAÇÃO','D7 - PREVENÇÃO','D8 - ENCERRAMENTO'] as const
const fields = ['d1_equipe','d2_problema','d3_contencao','d4_causa_raiz','d5_acoes','d6_validacao','d7_preventivas','d8_encerramento'] as const
const blankTexts = (): string[] => Array.from({ length: 8 }, () => '')
const newCode = () => '8D-' + new Date().getFullYear() + '-' + Date.now().toString()

export default function QualidadeMetodologia8D() {
  const [rncs, setRncs] = useState<Rnc[]>([])
  const [records, setRecords] = useState<OitoD[]>([])
  const [recordId, setRecordId] = useState('')
  const [id, setId] = useState('')
  const [codigo, setCodigo] = useState(newCode)
  const [step, setStep] = useState(0)
  const [texts, setTexts] = useState<string[]>(blankTexts)
  const [status, setStatus] = useState('EM_ANALISE')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const [r, d] = await Promise.all([
        supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade').eq('empresa_id', company.data).order('criado_em', { ascending: false }).limit(500),
        supabase.from('erp_qualidade_8d').select('id,codigo,rpnc_id,etapa_atual,d1_equipe,d2_problema,d3_contencao,d4_causa_raiz,d5_acoes,d6_validacao,d7_preventivas,d8_encerramento,status,updated_at').eq('empresa_id', company.data).order('updated_at', { ascending: false }).limit(500),
      ])
      if (r.error || d.error) throw r.error ?? d.error
      setRncs(r.data ?? [])
      setRecords(d.data ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os registros 8D.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  function startNew() {
    setRecordId('')
    setId('')
    setCodigo(newCode())
    setTexts(blankTexts())
    setStep(0)
    setStatus('EM_ANALISE')
    setMsg('')
    setError('')
  }

  function selectRecord(value: string) {
    setRecordId(value)
    const record = records.find(item => item.id === value)
    if (!record) return
    setCodigo(record.codigo)
    setId(record.rpnc_id ?? '')
    setStep(Math.max(0, fields.indexOf(record.etapa_atual.toLowerCase().startsWith('d') ? fields[Number(record.etapa_atual.slice(1)) - 1] : fields[0])))
    setTexts(fields.map(field => record[field] ?? ''))
    setStatus(record.status)
    setMsg('')
    setError('')
  }

  async function save() {
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setError(company.error?.message ?? 'Empresa da sessão não identificada.')
      return
    }
    if (!codigo.trim()) { setError('O código 8D é obrigatório.'); return }
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const payload = {
        empresa_id: company.data,
        codigo: codigo.trim(),
        rpnc_id: id || null,
        etapa_atual: 'D' + (step + 1),
        d1_equipe: texts[0],
        d2_problema: texts[1],
        d3_contencao: texts[2],
        d4_causa_raiz: texts[3],
        d5_acoes: texts[4],
        d6_validacao: texts[5],
        d7_preventivas: texts[6],
        d8_encerramento: texts[7],
        status,
      }
      const saved = await supabase.from('erp_qualidade_8d').upsert(payload, { onConflict: 'empresa_id,codigo' }).select('id').single()
      if (saved.error) throw saved.error
      setRecordId(saved.data.id)
      setMsg('Relatório 8D salvo no banco da empresa. As etapas podem ser reabertas para continuidade.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o relatório 8D.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900"><div className="mx-auto max-w-[1800px] space-y-3">
    <QualitySidebar active="/qualidade/metodologia-8d" />
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><div><p className="text-xs font-bold text-sky-700">QUALIDADE &gt; METODOLOGIA 8D</p><h1 className="text-xl font-bold text-slate-950">Tratativa de Anomalias — Protocolo 8D</h1></div><div className="flex flex-wrap gap-2"><button type="button" onClick={startNew} className="erp-row-action"><Plus size={14} className="mr-1"/>NOVO 8D</button><button type="button" onClick={() => void load()} disabled={busy} className="erp-row-action"><RefreshCw size={14} className="mr-1"/>ATUALIZAR</button><button type="button" onClick={() => void save()} disabled={busy} className="erp-row-action"><Save size={14} className="mr-1"/>SALVAR 8D</button><button type="button" onClick={() => window.print()} className="erp-row-action"><Printer size={14} className="mr-1"/>IMPRIMIR</button></div></header>
    {error && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {msg && <p role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{msg}</p>}
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <label className="text-xs font-bold uppercase lg:col-span-2">Reabrir relatório 8D existente<select className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-sm font-normal" value={recordId} onChange={e => selectRecord(e.target.value)}><option value="">Novo relatório</option>{records.map(record => <option key={record.id} value={record.id}>{record.codigo} · {record.status}</option>)}</select></label>
      <label className="text-xs font-bold uppercase">Código 8D<input className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-sm font-normal" value={codigo} onChange={e => setCodigo(e.target.value)} required/></label>
      <label className="text-xs font-bold uppercase lg:col-span-2">RNC de origem<select className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-sm font-normal" value={id} onChange={e => setId(e.target.value)}><option value="">Sem RNC vinculada</option>{rncs.map(r => <option key={r.id} value={r.id}>{r.numero_rpnc} — {r.descricao_nao_conformidade}</option>)}</select></label>
      <label className="text-xs font-bold uppercase">Status<select className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-sm font-normal" value={status} onChange={e => setStatus(e.target.value)}><option value="EM_ANALISE">EM ANÁLISE</option><option value="ACOES_EM_EXECUCAO">AÇÕES EM EXECUÇÃO</option><option value="VALIDACAO">VALIDAÇÃO</option><option value="ENCERRADO">ENCERRADO</option></select></label>
    </section>
    <section className="rounded-[2px] border border-slate-200 bg-white p-3"><div className="flex flex-wrap gap-2">{steps.map((label, i) => <button type="button" key={label} onClick={() => setStep(i)} className={'h-[30px] rounded-[2px] border px-3 text-xs font-bold '+(step===i?'border-[#123B50] bg-[#123B50] text-white':'border-slate-300 bg-[#F4FBFD] text-[#123B50]')}>{label}</button>)}</div><div className="mt-3 border border-slate-200 bg-slate-50 p-3"><h2 className="text-sm font-bold">{steps[step]}</h2><textarea className="mt-2 min-h-52 w-full rounded-[2px] border border-slate-300 bg-white p-3 text-sm text-slate-900" value={texts[step]} onChange={e => setTexts(current => current.map((value, index) => index===step ? e.target.value : value))} placeholder="Registre evidências, decisões, responsáveis e validação da etapa."/><div className="mt-3 flex justify-between gap-2"><button type="button" disabled={step===0} onClick={() => setStep(current => current-1)} className="erp-row-action">ANTERIOR</button><button type="button" disabled={step===7} onClick={() => setStep(current => current+1)} className="erp-row-action">PRÓXIMA ETAPA</button></div></div></section>
  </div></main>
}
