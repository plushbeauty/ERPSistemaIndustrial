import { useCallback, useEffect, useState } from 'react'
import { Save, Plus, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Rnc = { id: string; numero_rpnc: string; descricao_nao_conformidade: string }
type Record8D = {
  id: string; empresa_id: string; codigo: string; rpnc_id: string | null; etapa_atual: string
  d1_equipe: string | null; d2_problema: string | null; d3_contencao: string | null; d4_causa_raiz: string | null
  d5_acoes: string | null; d6_validacao: string | null; d7_preventivas: string | null; d8_encerramento: string | null
  status: string; updated_at: string
}
const steps = ['D1 - EQUIPE','D2 - PROBLEMA','D3 - CONTENÇÃO','D4 - CAUSA RAIZ','D5 - AÇÕES','D6 - VALIDAÇÃO','D7 - PREVENÇÃO','D8 - ENCERRAMENTO']
const newCode = () => '8D-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6)
const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 focus:border-[#2D8DB8] focus:outline-none'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase text-slate-600'
const action = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-medium text-white disabled:opacity-50'
const blankTexts = () => Array.from({ length: 8 }, () => '')

export default function QualidadeMetodologia8D() {
  const [empresaId, setEmpresaId] = useState('')
  const [rncs, setRncs] = useState<Rnc[]>([])
  const [records, setRecords] = useState<Record8D[]>([])
  const [recordId, setRecordId] = useState('')
  const [rncId, setRncId] = useState('')
  const [codigo, setCodigo] = useState(newCode)
  const [step, setStep] = useState(0)
  const [texts, setTexts] = useState<string[]>(blankTexts)
  const [status, setStatus] = useState('EM_ANALISE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const company = String(tenant.data)
      const [rncResult, recordResult] = await Promise.all([
        supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade').eq('empresa_id', company).order('criado_em', { ascending: false }).limit(1000),
        supabase.from('erp_qualidade_8d').select('id,empresa_id,codigo,rpnc_id,etapa_atual,d1_equipe,d2_problema,d3_contencao,d4_causa_raiz,d5_acoes,d6_validacao,d7_preventivas,d8_encerramento,status,updated_at').eq('empresa_id', company).order('updated_at', { ascending: false }).limit(1000),
      ])
      if (rncResult.error) throw rncResult.error
      if (recordResult.error) throw recordResult.error
      setEmpresaId(company)
      setRncs((rncResult.data ?? []) as Rnc[])
      setRecords((recordResult.data ?? []) as Record8D[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o fluxo 8D.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  function openRecord(id: string) {
    setRecordId(id)
    const record = records.find(item => item.id === id)
    if (!record) return
    setCodigo(record.codigo)
    setRncId(record.rpnc_id ?? '')
    setStep(Math.max(0, steps.findIndex((_, index) => 'D' + (index + 1) === record.etapa_atual)))
    setTexts([record.d1_equipe,record.d2_problema,record.d3_contencao,record.d4_causa_raiz,record.d5_acoes,record.d6_validacao,record.d7_preventivas,record.d8_encerramento].map(value => value ?? ''))
    setStatus(record.status)
    setMsg('')
  }

  function startNew() {
    setRecordId('')
    setRncId('')
    setCodigo(newCode())
    setStep(0)
    setTexts(blankTexts())
    setStatus('EM_ANALISE')
    setError('')
    setMsg('')
  }

  async function save() {
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!codigo.trim()) { setError('Informe o número do 8D.'); return }
    if (!texts.some(value => value.trim())) { setError('Registre ao menos uma evidência antes de salvar.'); return }
    setBusy(true); setError(''); setMsg('')
    try {
      const payload = {
        empresa_id: empresaId,
        codigo: codigo.trim(),
        rpnc_id: rncId || null,
        etapa_atual: 'D' + (step + 1),
        d1_equipe: texts[0].trim() || null,
        d2_problema: texts[1].trim() || null,
        d3_contencao: texts[2].trim() || null,
        d4_causa_raiz: texts[3].trim() || null,
        d5_acoes: texts[4].trim() || null,
        d6_validacao: texts[5].trim() || null,
        d7_preventivas: texts[6].trim() || null,
        d8_encerramento: texts[7].trim() || null,
        status,
        updated_at: new Date().toISOString(),
      }
      const result = await supabase.from('erp_qualidade_8d').upsert(payload, { onConflict: 'empresa_id,codigo' }).select('id').single()
      if (result.error) throw result.error
      setRecordId(result.data.id)
      setMsg('Registro 8D salvo no banco da empresa.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o 8D.')
    } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900">
    <div className="mx-auto max-w-[1800px] space-y-3">
      <QualitySidebar active="/qualidade/metodologia-8d" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div><p className="text-[9px] font-medium uppercase text-[#2D8DB8]">QUALIDADE / METODOLOGIA 8D</p><h1 className="text-[15px] font-semibold">Tratativa de Anomalias — Protocolo 8D</h1></div>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => void load()} disabled={busy} className={action}><RefreshCw size={13}/> ATUALIZAR</button>
          <button type="button" onClick={startNew} disabled={busy} className={action}><Plus size={13}/> NOVO 8D</button>
          <button type="button" onClick={() => void save()} disabled={busy} className={action}><Save size={13}/> {busy ? 'SALVANDO…' : 'SALVAR'}</button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px]"><Printer size={13}/> IMPRIMIR</button>
        </div>
      </header>
      {error && <div role="alert" className="border border-red-300 bg-red-50 p-2 text-[11px] text-red-800">{error}</div>}
      {msg && <div role="status" className="border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-800">{msg}</div>}
      <section className="grid gap-2 rounded-[2px] border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-4">
        <label className={label}>ABRIR REGISTRO EXISTENTE<select className={field} value={recordId} onChange={event => openRecord(event.target.value)}><option value="">Novo registro</option>{records.map(record => <option key={record.id} value={record.id}>{record.codigo} · {record.status}</option>)}</select></label>
        <label className={label}>NÚMERO DO 8D<input className={field} value={codigo} onChange={event => setCodigo(event.target.value)} maxLength={60}/></label>
        <label className={label}>RNC DE ORIGEM<select className={field} value={rncId} onChange={event => setRncId(event.target.value)}><option value="">Sem RNC vinculada</option>{rncs.map(rnc => <option key={rnc.id} value={rnc.id}>{rnc.numero_rpnc} · {rnc.descricao_nao_conformidade.slice(0,80)}</option>)}</select></label>
        <label className={label}>STATUS<select className={field} value={status} onChange={event => setStatus(event.target.value)}><option value="EM_ANALISE">EM ANÁLISE</option><option value="ACOES_EM_EXECUCAO">AÇÕES EM EXECUÇÃO</option><option value="VALIDACAO">VALIDAÇÃO</option><option value="ENCERRADO">ENCERRADO</option></select></label>
      </section>
      <nav className="flex flex-wrap gap-1" aria-label="Etapas 8D">{steps.map((title,index)=><button key={title} type="button" onClick={() => setStep(index)} aria-pressed={step===index} className={step===index?'h-[30px] rounded-[2px] border border-[#17445A] bg-[#17445A] px-2 text-[10px] font-medium text-white':'h-[30px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-medium text-slate-700'}>{title}</button>)}</nav>
      <section className="rounded-[2px] border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-[12px] font-semibold">{steps[step]}</h2><span className="text-[10px] text-slate-500">Etapa {step+1} de 8</span></div>
        <textarea className="min-h-48 w-full rounded-[2px] border border-slate-300 p-2 text-[12px] focus:border-[#2D8DB8] focus:outline-none" value={texts[step]} onChange={event => setTexts(current => current.map((value,index)=>index===step?event.target.value:value))} placeholder="Registre evidências, decisões, responsáveis, datas e validação desta etapa."/>
        <div className="mt-2 flex justify-between gap-2"><button type="button" disabled={step===0} onClick={()=>setStep(value=>value-1)} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] disabled:opacity-40">ANTERIOR</button><button type="button" disabled={step===7} onClick={()=>setStep(value=>value+1)} className={action}>PRÓXIMA ETAPA</button></div>
      </section>
    </div>
  </main>
}
