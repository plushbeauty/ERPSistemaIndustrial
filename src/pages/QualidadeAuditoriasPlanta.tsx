/**
 * SYSNQRA ERP · Auditorias internas de processo e produto
 * Revisão: SGQ-AUDITORIAS-PLANTA-2026-10-22-R1
 * Escopo: auditorias reais por empresa, checklist sem aprovação automática e histórico rastreável.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, HelpCircle, RefreshCw, Save, Search, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Machine = { id: string; codigo: string; nome: string }
type Audit = {
  id: string
  codigo_auditoria: string
  maquina_id: string
  auditor_nome: string
  posto_operador: string
  data_auditoria: string
  ficha_processo_conforme: boolean | null
  instrumento_calibrado: boolean | null
  fifo_lote_correto: boolean | null
  observacoes_desvio: string | null
  resultado_final: 'PLANEJADA' | 'EM_EXECUCAO' | 'CONFORME' | 'NAO_CONFORME'
  criado_em: string
}
type CheckValue = boolean | null
const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label = 'flex min-w-0 flex-col gap-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-500'
const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 border px-3 text-[10px] font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50'
const localDate = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const statusLabel = (value: Audit['resultado_final']) =>
  value === 'CONFORME' ? 'Conforme' : value === 'NAO_CONFORME' ? 'Não conforme' : value === 'PLANEJADA' ? 'Programada' : 'Em execução'

export default function QualidadeAuditoriasPlanta() {
  const [companyId, setCompanyId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [code, setCode] = useState('')
  const [machineId, setMachineId] = useState('')
  const [auditor, setAuditor] = useState('')
  const [operator, setOperator] = useState('')
  const [auditDate, setAuditDate] = useState(localDate)
  const [checkFicha, setCheckFicha] = useState<CheckValue>(null)
  const [checkCalibration, setCheckCalibration] = useState<CheckValue>(null)
  const [checkFifo, setCheckFifo] = useState<CheckValue>(null)
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const tenantId = tenant.data
      setCompanyId(tenantId)
      const [machineResult, auditResult] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', tenantId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Audit>((from, to) => supabase.from('erp_qualidade_auditorias_planta').select('id,codigo_auditoria,maquina_id,auditor_nome,posto_operador,data_auditoria,ficha_processo_conforme,instrumento_calibrado,fifo_lote_correto,observacoes_desvio,resultado_final,criado_em').eq('empresa_id', tenantId).order('data_auditoria', { ascending: false }).range(from, to))
      ])
      setMachines(machineResult)
      setAudits(auditResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os registros reais de auditoria.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const machineMap = useMemo(() => new Map(machines.map(machine => [machine.id, machine])), [machines])
  const filtered = useMemo(() => audits.filter(item => {
    const machine = machineMap.get(item.maquina_id)
    return [item.codigo_auditoria, item.auditor_nome, item.posto_operador, machine?.codigo, machine?.nome]
      .join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))
  }), [audits, machineMap, query])
  const result: Audit['resultado_final'] = [checkFicha, checkCalibration, checkFifo].some(value => value === false)
    ? 'NAO_CONFORME'
    : [checkFicha, checkCalibration, checkFifo].every(value => value === true) ? 'CONFORME' : 'EM_EXECUCAO'
  const completedChecks = [checkFicha, checkCalibration, checkFifo].filter(value => value !== null).length

  function reset() {
    setSelectedId('')
    setCode('')
    setMachineId('')
    setAuditor('')
    setOperator('')
    setAuditDate(localDate())
    setCheckFicha(null)
    setCheckCalibration(null)
    setCheckFifo(null)
    setNotes('')
    setError('')
    setMessage('Novo registro pronto para preenchimento. O código será gerado pelo banco.')
  }

  function edit(item: Audit) {
    setSelectedId(item.id)
    setCode(item.codigo_auditoria)
    setMachineId(item.maquina_id)
    setAuditor(item.auditor_nome)
    setOperator(item.posto_operador)
    setAuditDate(item.data_auditoria.slice(0, 10))
    setCheckFicha(item.ficha_processo_conforme)
    setCheckCalibration(item.instrumento_calibrado)
    setCheckFifo(item.fifo_lote_correto)
    setNotes(item.observacoes_desvio ?? '')
    setError('')
    setMessage('')
  }

  async function save() {
    setError('')
    setMessage('')
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    if (!machineId || !auditor.trim() || !operator.trim() || !auditDate) {
      setError('Informe máquina/posto, auditor, operador e data da auditoria.')
      return
    }
    if (completedChecks !== 3) {
      setError('Responda aos três critérios: ficha vigente, calibração e rastreabilidade FIFO.')
      return
    }
    if (result === 'NAO_CONFORME' && !notes.trim()) {
      setError('Descreva o desvio detectado antes de registrar uma auditoria não conforme.')
      return
    }
    setSaving(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError ?? new Error('Sessão autenticada necessária.')
      const payload = {
        empresa_id: companyId,
        ...(selectedId ? {} : { codigo_auditoria: '' }),
        maquina_id: machineId,
        auditor_nome: auditor.trim(),
        posto_operador: operator.trim(),
        data_auditoria: auditDate,
        ficha_processo_conforme: checkFicha,
        instrumento_calibrado: checkCalibration,
        fifo_lote_correto: checkFifo,
        observacoes_desvio: notes.trim() || null,
        resultado_final: result,
        ...(selectedId ? {} : { criado_por: authData.user.id })
      }
      const response = selectedId
        ? await supabase.from('erp_qualidade_auditorias_planta').update(payload).eq('empresa_id', companyId).eq('id', selectedId)
        : await supabase.from('erp_qualidade_auditorias_planta').insert(payload)
      if (response.error) throw response.error
      setMessage(selectedId ? 'Auditoria atualizada no histórico do SGQ.' : 'Auditoria registrada no histórico do SGQ.')
      reset()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar auditoria.')
    } finally {
      setSaving(false)
    }
  }

  const checklist = [
    { title: 'Ficha de processo vigente', detail: 'Confirmar revisão aprovada e parâmetros liberados para o produto/OP.', value: checkFicha, set: setCheckFicha },
    { title: 'Instrumento de medição', detail: 'Confirmar identificação, aprovação e validade da calibração.', value: checkCalibration, set: setCheckCalibration },
    { title: 'Matéria-prima / FIFO', detail: 'Confirmar lote físico e regra FIFO conforme procedimento aplicável.', value: checkFifo, set: setCheckFifo }
  ]

  return <VendasLayout title="Auditoria Interna de Posto de Trabalho" subtitle="Auditorias de processo e produto · registros vinculados à empresa autenticada." onRefresh={() => void load()} topContent={<div className="flex min-h-[30px] items-center justify-between border border-[#C8E3EE] bg-[#EAF6FA] px-3 py-1"><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#123B50]">SGQ INDUSTRIAL · AUDITORIAS INTERNAS</span><span className="text-[9px] font-bold text-[#2D8DB8]">ISO 9001 · 9.2</span></div>}>
    <div className="space-y-3">
      {(error || message) && <p role={error ? 'alert' : 'status'} className={'border px-3 py-2 text-[10px] font-bold ' + (error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || message}</p>}
      <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {[{label:'Auditorias registradas',value:audits.length,Icon:ClipboardCheck},{label:'Conformes',value:audits.filter(a=>a.resultado_final==='CONFORME').length,Icon:CheckCircle2},{label:'Não conformes',value:audits.filter(a=>a.resultado_final==='NAO_CONFORME').length,Icon:XCircle},{label:'Em execução',value:audits.filter(a=>a.resultado_final==='EM_EXECUCAO').length,Icon:AlertTriangle}].map(item=><article key={item.label} className="flex min-h-[68px] items-center gap-2 border border-slate-200 bg-white px-3 py-2 shadow-[0_2px_7px_rgba(18,59,80,.06)]"><span className="grid h-8 w-8 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]"><item.Icon size={16}/></span><div><p className="text-[9px] font-black uppercase text-slate-500">{item.label}</p><p className="text-[20px] font-black text-[#123B50]">{item.value}</p></div></article>)}
      </section>
      <section className="border border-slate-200 bg-white shadow-[0_3px_12px_rgba(18,59,80,.05)]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#F8FBFC] px-3 py-2"><div className="flex items-center gap-2"><ClipboardCheck size={16} className="text-[#2D8DB8]"/><div><h2 className="text-[11px] font-black uppercase text-[#123B50]">{selectedId ? 'Editar auditoria' : 'Nova auditoria de processo'}</h2><p className="text-[9px] text-slate-500">Campos compactos de 30 px · checklist sem valores positivos pré-selecionados.</p></div></div><div className="flex gap-1"><button type="button" onClick={()=>setHelpOpen(value=>!value)} className={button+' border-slate-300 bg-white text-slate-700'}><HelpCircle size={12}/>{helpOpen?'Ocultar ajuda':'Ajuda'}</button><button type="button" onClick={reset} className={button+' border-slate-300 bg-white text-slate-700'}>Novo</button></div></header>
        {helpOpen&&<div className="border-b border-[#C8E3EE] bg-[#F4FBFD] px-3 py-2 text-[10px] text-[#123B50]"><p className="font-bold">Como preencher</p><p>Escolha a máquina, identifique auditor e operador, confira os três critérios e registre evidências/desvios. Uma resposta negativa exige descrição do desvio. A tela registra o resultado informado; ela não valida automaticamente a ficha, calibração ou FIFO nos módulos de origem.</p></div>}
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
          <label className={label}>Código da auditoria<input className={field+' bg-slate-100'} value={code || 'Gerado ao salvar'} readOnly /></label>
          <label className={label}>Data da auditoria<input type="date" className={field+' max-h-[30px]'} value={auditDate} onChange={e=>setAuditDate(e.target.value)} max="2099-12-31" required /></label>
          <label className={label}>Máquina / posto<select className={field} value={machineId} onChange={e=>setMachineId(e.target.value)} required><option value="">Selecione máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></label>
          <label className={label}>Auditor responsável<input className={field} value={auditor} onChange={e=>setAuditor(e.target.value)} placeholder="Nome do auditor" required /></label>
          <label className={label}>Operador do posto<input className={field} value={operator} onChange={e=>setOperator(e.target.value)} placeholder="Nome do operador" required /></label>
          <label className={label+' md:col-span-2 xl:col-span-3'}>Observações / descrição do desvio<textarea className="min-h-[60px] w-full rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] font-semibold outline-none focus:border-[#2D8DB8]" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Descreva a evidência, desvio, lote ou ação imediata quando aplicável." /></label>
        </div>
        <div className="grid grid-cols-1 gap-2 px-3 pb-3 lg:grid-cols-3">
          {checklist.map(item=><article key={item.title} className="border border-slate-200 bg-[#FBFDFE] p-3"><h3 className="text-[10px] font-black text-[#123B50]">{item.title}</h3><p className="mt-1 min-h-[30px] text-[9px] leading-relaxed text-slate-500">{item.detail}</p><div className="mt-2 grid grid-cols-3 gap-1">{([{value:null,label:'Não verificado'},{value:true,label:'Conforme'},{value:false,label:'Desvio'}] as const).map(choice=><button key={String(choice.value)} type="button" onClick={()=>item.set(choice.value)} className={'min-h-[30px] border px-1 text-[9px] font-black '+(item.value===choice.value?(choice.value===true?'border-emerald-600 bg-emerald-600 text-white':choice.value===false?'border-rose-600 bg-rose-600 text-white':'border-slate-500 bg-slate-600 text-white'):'border-slate-200 bg-white text-slate-600')}>{choice.label}</button>)}</div></article>)}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2"><div className="flex items-center gap-2 text-[10px] font-bold"><span className="text-slate-500">Checklist {completedChecks}/3</span><span className={'border px-2 py-1 '+(result==='CONFORME'?'border-emerald-200 bg-emerald-50 text-emerald-800':result==='NAO_CONFORME'?'border-rose-200 bg-rose-50 text-rose-800':'border-amber-200 bg-amber-50 text-amber-800')}>{statusLabel(result)}</span></div><button type="button" disabled={saving||loading||machines.length===0} onClick={()=>void save()} className={button+' border-[#123B50] bg-[#123B50] text-white'}>{saving?<RefreshCw size={12} className="animate-spin"/>:<Save size={12}/>} {saving?'Gravando…':'Salvar auditoria'}</button></footer>
      </section>
      <section className="border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#F8FBFC] px-3 py-2"><div className="flex items-center gap-2"><CalendarDays size={15} className="text-[#2D8DB8]"/><div><h2 className="text-[11px] font-black uppercase text-[#123B50]">Histórico de auditorias da planta</h2><p className="text-[9px] text-slate-500">Dados reais do banco · empresa autenticada</p></div></div><div className="relative w-full max-w-[340px]"><Search size={12} className="absolute left-2 top-2 text-slate-400"/><input className={field+' pl-7'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar código, máquina, auditor..." /></div></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left"><thead><tr className="h-[30px] bg-[#EAF4F8] text-[9px] uppercase text-[#34566A]">{['Código','Data','Máquina','Auditor','Operador','Resultado',''].map((text,i)=><th key={i} className="px-2">{text}</th>)}</tr></thead><tbody>{filtered.map(item=><tr key={item.id} className="h-[32px] border-t border-slate-100 text-[10px] hover:bg-[#F4FBFD]"><td className="px-2 font-bold">{item.codigo_auditoria}</td><td className="px-2">{new Date(item.data_auditoria+'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="px-2">{machineMap.get(item.maquina_id)?.codigo ?? 'Máquina não localizada'}</td><td className="px-2">{item.auditor_nome}</td><td className="px-2">{item.posto_operador}</td><td className="px-2"><span className={'inline-flex border px-2 py-1 text-[9px] font-black '+(item.resultado_final==='CONFORME'?'border-emerald-200 bg-emerald-50 text-emerald-800':item.resultado_final==='NAO_CONFORME'?'border-rose-200 bg-rose-50 text-rose-800':'border-amber-200 bg-amber-50 text-amber-800')}>{statusLabel(item.resultado_final)}</span></td><td className="px-2"><button type="button" onClick={()=>edit(item)} className="border border-slate-300 px-2 py-1 text-[9px] font-bold">Abrir</button></td></tr>)}{!loading&&filtered.length===0&&<tr><td colSpan={7} className="p-8 text-center text-[10px] text-slate-500">Nenhuma auditoria encontrada para esta empresa.</td></tr>}{loading&&<tr><td colSpan={7} className="p-8 text-center text-[10px] text-slate-500">Carregando registros reais…</td></tr>}</tbody></table></div>
      </section>
      <p className="text-[9px] text-slate-500">Importante: os critérios são registrados pelo auditor. A validação automática contra ficha vigente, calibração e FIFO depende das integrações com Engenharia, Metrologia e Estoque e permanece identificada como etapa de integração.</p>
    </div>
  </VendasLayout>
}
