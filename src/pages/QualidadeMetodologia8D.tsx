import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, FileText, Plus, Printer, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Rnc = { id: string; numero_rpnc: string; descricao_nao_conformidade: string }
type Protocol8D = {
  id: string
  codigo: string
  rpnc_id: string | null
  etapa_atual: string
  d1_equipe: string | null
  d2_problema: string | null
  d3_contencao: string | null
  d4_causa_raiz: string | null
  d5_acoes: string | null
  d6_validacao: string | null
  d7_preventivas: string | null
  d8_encerramento: string | null
  status: string
  created_at: string
}

const steps = [
  { code: 'D1', label: 'Equipe', field: 'd1_equipe' },
  { code: 'D2', label: 'Problema', field: 'd2_problema' },
  { code: 'D3', label: 'Contenção', field: 'd3_contencao' },
  { code: 'D4', label: 'Causa raiz', field: 'd4_causa_raiz' },
  { code: 'D5', label: 'Ações corretivas', field: 'd5_acoes' },
  { code: 'D6', label: 'Validação', field: 'd6_validacao' },
  { code: 'D7', label: 'Prevenção', field: 'd7_preventivas' },
  { code: 'D8', label: 'Encerramento', field: 'd8_encerramento' },
] as const

const fieldClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const labelClass = 'grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border px-2.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-50'

export default function QualidadeMetodologia8D() {
  const [rncs, setRncs] = useState<Rnc[]>([])
  const [protocols, setProtocols] = useState<Protocol8D[]>([])
  const [selectedProtocolId, setSelectedProtocolId] = useState('')
  const [rncId, setRncId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [step, setStep] = useState(0)
  const [texts, setTexts] = useState<string[]>(Array(8).fill(''))
  const [status, setStatus] = useState('EM_ANALISE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const [rncRows, protocolRows] = await Promise.all([
        fetchAllPages<Rnc>((from, to) => supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade', { count: 'exact' }).eq('empresa_id', companyId).not('sgq_origem', 'is', null).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Protocol8D>((from, to) => supabase.from('erp_qualidade_8d').select('id,codigo,rpnc_id,etapa_atual,d1_equipe,d2_problema,d3_contencao,d4_causa_raiz,d5_acoes,d6_validacao,d7_preventivas,d8_encerramento,status,created_at', { count: 'exact' }).eq('empresa_id', companyId).order('created_at', { ascending: false }).order('id').range(from, to)),
      ])
      setRncs(rncRows)
      setProtocols(protocolRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os protocolos 8D.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const resetDraft = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_sgq_novo_codigo_8d')
      if (result.error) throw result.error
      if (!result.data || typeof result.data !== 'string') throw new Error('O banco não retornou um código 8D válido.')
      setSelectedProtocolId('')
      setRncId('')
      setCodigo(result.data)
      setStep(0)
      setTexts(Array(8).fill(''))
      setStatus('EM_ANALISE')
      setMessage('Novo protocolo iniciado. O código foi reservado no banco para a empresa atual.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar um código 8D.')
    } finally {
      setBusy(false)
    }
  }

  const openProtocol = (protocolId: string) => {
    setSelectedProtocolId(protocolId)
    const protocol = protocols.find(item => item.id === protocolId)
    if (!protocol) {
      setRncId('')
      setCodigo('')
      setStep(0)
      setTexts(Array(8).fill(''))
      setStatus('EM_ANALISE')
      return
    }
    setRncId(protocol.rpnc_id ?? '')
    setCodigo(protocol.codigo)
    const activeStep = Number(protocol.etapa_atual.replace(/\\D/g, ''))
    setStep(Number.isInteger(activeStep) ? Math.max(0, Math.min(7, activeStep - 1)) : 0)
    setTexts([
      protocol.d1_equipe ?? '',
      protocol.d2_problema ?? '',
      protocol.d3_contencao ?? '',
      protocol.d4_causa_raiz ?? '',
      protocol.d5_acoes ?? '',
      protocol.d6_validacao ?? '',
      protocol.d7_preventivas ?? '',
      protocol.d8_encerramento ?? '',
    ])
    setStatus(protocol.status)
    setError('')
    setMessage('Protocolo carregado do banco.')
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      if (!codigo.trim()) throw new Error('Gere um código de protocolo pelo botão NOVO 8D.')
      if (!rncId || !rncs.some(rnc => rnc.id === rncId)) throw new Error('Selecione uma RPNC válida da empresa atual.')
      if (!texts[1].trim()) throw new Error('Preencha a descrição do problema na etapa D2.')
      if (status === 'ENCERRADO' && texts.some(value => !value.trim())) throw new Error('Para encerrar, preencha todas as oito disciplinas do 8D.')
      const result = await supabase.from('erp_qualidade_8d').upsert({
        empresa_id: String(company.data),
        codigo: codigo.trim(),
        rpnc_id: rncId,
        etapa_atual: steps[step].code,
        d1_equipe: texts[0].trim() || null,
        d2_problema: texts[1].trim(),
        d3_contencao: texts[2].trim() || null,
        d4_causa_raiz: texts[3].trim() || null,
        d5_acoes: texts[4].trim() || null,
        d6_validacao: texts[5].trim() || null,
        d7_preventivas: texts[6].trim() || null,
        d8_encerramento: texts[7].trim() || null,
        status,
      }, { onConflict: 'empresa_id,codigo' }).select('id').single()
      if (result.error) throw result.error
      setSelectedProtocolId(result.data.id)
      setMessage('Protocolo 8D salvo no banco real.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar o protocolo 8D.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Qualidade / Metodologia 8D" subtitle="Tratativa de anomalias • RPNC • causa raiz • ações corretivas e preventivas">
    <main className="erp-global-surface erp-compact min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-4">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 py-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-sky-700">Qualidade / SGQ / Metodologia 8D</p>
            <h1 className="mt-0.5 text-[16px] font-semibold text-slate-900">Tratativa de anomalias — Protocolo 8D</h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void resetDraft()} disabled={busy} className={buttonClass + ' border-emerald-700 bg-emerald-700 text-white'}><Plus size={13}/> NOVO 8D</button>
            <button type="button" onClick={() => void save()} disabled={busy} className={buttonClass + ' border-[#2D8DB8] bg-[#2D8DB8] text-white'}><Save size={13}/> SALVAR</button>
            <button type="button" onClick={() => window.print()} className={buttonClass + ' border-slate-300 bg-white text-slate-700'}><Printer size={13}/> IMPRIMIR</button>
          </div>
        </header>

        {(error || message) && <div role={error ? 'alert' : 'status'} className={'mt-2 border px-3 py-2 text-[10px] ' + (error ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>{error || message}</div>}

        <section className="mt-2 border border-slate-300 bg-white">
          <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 p-2 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,0.7fr)]">
            <label className={labelClass}>PROTOCOLO 8D SALVO
              <select className={fieldClass} value={selectedProtocolId} onChange={event => openProtocol(event.target.value)}>
                <option value="">Novo protocolo / não selecionado</option>
                {protocols.map(protocol => <option key={protocol.id} value={protocol.id}>{protocol.codigo} · {protocol.status}</option>)}
              </select>
            </label>
            <label className={labelClass}>RPNC DE ORIGEM
              <select className={fieldClass} value={rncId} onChange={event => setRncId(event.target.value)}>
                <option value="">Selecione RPNC...</option>
                {rncs.map(rnc => <option key={rnc.id} value={rnc.id}>{rnc.numero_rpnc} · {rnc.descricao_nao_conformidade}</option>)}
              </select>
            </label>
            <label className={labelClass}>CÓDIGO 8D
              <input className={fieldClass} value={codigo} readOnly placeholder="Use NOVO 8D para gerar no banco"/>
            </label>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2">
            {steps.map((item, index) => <button type="button" key={item.code} onClick={() => setStep(index)} className={'flex h-[30px] shrink-0 items-center gap-1 border px-2 text-[10px] ' + (step === index ? 'border-[#2D8DB8] bg-sky-50 font-semibold text-sky-900' : 'border-slate-200 bg-white text-slate-600')}><span>{item.code}</span><span>{item.label}</span>{texts[index].trim() && <CheckCircle2 size={12} className="text-emerald-600"/>}</button>)}
          </div>

          <div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_240px]">
            <section className="min-w-0 border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{steps[step].code} / DISCIPLINA</p><h2 className="text-[13px] font-semibold text-slate-900">{steps[step].label}</h2></div>
                <span className="text-[10px] tabular-nums text-slate-500">{step + 1} / {steps.length}</span>
              </div>
              <textarea className="min-h-40 w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] leading-5 text-slate-800 outline-none focus:border-[#2D8DB8]" value={texts[step]} onChange={event => setTexts(current => current.map((value, index) => index === step ? event.target.value : value))} placeholder="Registre evidências verificáveis, responsável, prazo, resultado e validação da disciplina."/>
              <div className="mt-2 flex justify-between gap-2">
                <button type="button" disabled={step === 0} onClick={() => setStep(index => index - 1)} className={buttonClass + ' border-slate-300 bg-white text-slate-700'}>ANTERIOR</button>
                <button type="button" disabled={step === steps.length - 1} onClick={() => setStep(index => index + 1)} className={buttonClass + ' border-[#2D8DB8] bg-[#2D8DB8] text-white'}>PRÓXIMA DISCIPLINA</button>
              </div>
            </section>

            <aside className="border border-slate-200 bg-white p-2">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Resumo do protocolo</p>
              <dl className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="border border-slate-200 p-2"><dt className="text-slate-500">Disciplinas preenchidas</dt><dd className="mt-1 text-[16px] font-semibold tabular-nums">{texts.filter(value => value.trim()).length}/8</dd></div>
                <div className="border border-slate-200 p-2"><dt className="text-slate-500">Etapa atual</dt><dd className="mt-1 text-[16px] font-semibold">{steps[step].code}</dd></div>
              </dl>
              <label className={labelClass + ' mt-3'}>STATUS DO PROTOCOLO
                <select className={fieldClass} value={status} onChange={event => setStatus(event.target.value)}>
                  <option value="EM_ANALISE">EM ANÁLISE</option>
                  <option value="ACOES_EM_EXECUCAO">AÇÕES EM EXECUÇÃO</option>
                  <option value="VALIDACAO">VALIDAÇÃO</option>
                  <option value="ENCERRADO">ENCERRADO</option>
                </select>
              </label>
              <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-4 text-slate-600">O encerramento exige as oito disciplinas preenchidas e vínculo com uma RPNC da empresa atual. Os registros salvos podem ser reabertos pela lista superior.</p>
            </aside>
          </div>
        </section>
      </div>
    </main>
    </VendasLayout>
  )
}
