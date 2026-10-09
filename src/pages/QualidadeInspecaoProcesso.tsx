import { useEffect, useState } from 'react'
import { Plus, Printer, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import QualitySidebar from '../components/quality/QualitySidebar'

type Lookup = LookupRecord
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; status_inspecao: string | null }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Plan = { id: string; produto_id: string; codigo: string; caracteristica: string | null; unidade: string | null; nominal: number | null; limite_inferior: number | null; limite_superior: number | null; frequencia: string | null; metodo_inspecao: string; tipo_inspecao: string; instrumento_id: string | null; status: string | null; vigencia_inicio: string | null; vigencia_fim: string | null; aprovador_id: string | null; aprovado_em: string | null; revisao: number }
type InspectionRow = { id: string; produto_id: string | null; ordem_producao_id: string | null; maquina_id: string | null; tipo: string; resultado: string; quantidade_inspecionada: number; quantidade_aprovada: number; quantidade_reprovada: number; observacao: string | null; inspetor_nome: string | null; medicoes: unknown; acao_bloqueio: string | null }

type Measurement = { plano_inspecao_id: string; instrumento_id: string | null; caracteristica: string; nominal: string; encontrado: string; unidade: string; limite_inferior: number | null; limite_superior: number | null; metodo_inspecao: string }

function evaluateMeasurement(item: Measurement): 'OK' | 'NOK' | 'PENDENTE' | 'SEM CRITÉRIO' {
  if (!item.encontrado.trim()) return 'PENDENTE'
  if (item.metodo_inspecao === 'VISUAL' || item.metodo_inspecao === 'DOCUMENTAL') {
    const answer = item.encontrado.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    if (['OK','CONFORME','APROVADO','SIM'].includes(answer)) return 'OK'
    if (['NOK','NAO CONFORME','REPROVADO','NAO','FALHA'].includes(answer)) return 'NOK'
    return 'PENDENTE'
  }
  if (item.limite_inferior === null && item.limite_superior === null) return 'SEM CRITÉRIO'
  const value = Number(item.encontrado.trim().replace(',', '.'))
  if (!Number.isFinite(value)) return 'PENDENTE'
  if (item.limite_inferior !== null && value < item.limite_inferior) return 'NOK'
  if (item.limite_superior !== null && value > item.limite_superior) return 'NOK'
  return 'OK'
}

const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'

function validInstrument(item: Instrument): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today)
}

type InspectionKind = 'PROCESSO' | 'FINAL'

export default function QualidadeInspecaoProcesso({ inspectionType = 'PROCESSO' }: { inspectionType?: InspectionKind }) {
  const [products, setProducts] = useState<Lookup[]>([])
  const [ops, setOps] = useState<Lookup[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [lote, setLote] = useState('')
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [history, setHistory] = useState<InspectionRow[]>([])
  const [produto, setProduto] = useState('')
  const [op, setOp] = useState('')
  const [machine, setMachine] = useState('')
  const [instrument, setInstrument] = useState('')
  const [inspetor, setInspetor] = useState('')
  const [resultado, setResultado] = useState('APROVADO')
  const [acaoBloqueio, setAcaoBloqueio] = useState('NENHUMA')
  const [quantidadeInspecionada, setQuantidadeInspecionada] = useState('')
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('')
  const [obs, setObs] = useState('')
  const [medicoes, setMedicoes] = useState<Measurement[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const [productsResult, opsResult, machinesResult, lotsResult, instrumentsResult, plansResult, inspectionsResult] = await Promise.all([
        fetchAllPages((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,descricao', { count: 'exact' }).eq('empresa_id', company.data).eq('ativo', true).order('codigo').order('id').range(from, to)),
        fetchAllPages((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status', { count: 'exact' }).eq('empresa_id', company.data).order('numero_op', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,tipo', { count: 'exact' }).eq('empresa_id', company.data).not('status', 'eq', 'INATIVA').order('codigo').order('id').range(from, to)),
        fetchAllPages<Lot>((from, to) => supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,produto_id,status_inspecao', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Instrument>((from, to) => supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao', { count: 'exact' }).eq('empresa_id', company.data).order('codigo').order('id').range(from, to)),
        fetchAllPages<Plan>((from, to) => supabase.from('erp_planos_inspecao').select('id,produto_id,codigo,caracteristica,unidade,nominal,limite_inferior,limite_superior,frequencia,metodo_inspecao,tipo_inspecao,instrumento_id,status,vigencia_inicio,vigencia_fim,aprovador_id,aprovado_em,revisao', { count: 'exact' }).eq('empresa_id', company.data).order('codigo').order('id').range(from, to)),
        fetchAllPages<InspectionRow>((from, to) => supabase.from('erp_inspecoes').select('id,produto_id,ordem_producao_id,maquina_id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,observacao,inspetor_nome,medicoes,acao_bloqueio', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).order('id').range(from, to)),
      ])
      setProducts(productsResult as Lookup[])
      setOps(opsResult.map(row => ({ id: String(row.id), codigo: String(row.numero_op), nome: String(row.status), documento: String(row.produto_id ?? '') })) as Lookup[])
      setMachines(machinesResult)
      setLots(lotsResult)
      setInstruments(instrumentsResult)
      setPlans(plansResult)
      setHistory(inspectionsResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a inspeção em processo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const today = new Date().toISOString().slice(0, 10)
  const isPlanEffective = (plan: Plan) => plan.tipo_inspecao === inspectionType && (plan.status ?? '').toUpperCase() === 'ATIVO' && Boolean(plan.aprovador_id) && Boolean(plan.aprovado_em) && (!plan.vigencia_inicio || plan.vigencia_inicio <= today) && (!plan.vigencia_fim || plan.vigencia_fim >= today) && (!['DIMENSIONAL','FUNCIONAL'].includes(plan.metodo_inspecao) || instruments.some(item => item.id === plan.instrumento_id && validInstrument(item)))
  const effectivePlans = plans.filter(isPlanEffective)

  function addMeasurement(plan: Plan) {
    if (plan.instrumento_id) setInstrument(plan.instrumento_id)
    setMedicoes(rows => [...rows, { plano_inspecao_id: plan.id, instrumento_id: plan.instrumento_id, caracteristica: plan.caracteristica || '', nominal: plan.nominal == null ? '' : String(plan.nominal), encontrado: '', unidade: plan.unidade || '', limite_inferior: plan.limite_inferior ?? null, limite_superior: plan.limite_superior ?? null, metodo_inspecao: plan.metodo_inspecao }])
  }

  function resetForm() {
    setProduto('')
    setLote('')
    setOp('')
    setMachine('')
    setInstrument('')
    setInspetor('')
    setResultado('APROVADO')
    setAcaoBloqueio('NENHUMA')
    setQuantidadeInspecionada('')
    setQuantidadeAprovada('')
    setQuantidadeReprovada('')
    setObs('')
    setMedicoes([])
    setNotice('Nova inspeção pronta para preenchimento.')
    setError('')
  }

  async function save() {
    setBusy(true)
    setError('')
    setNotice('')
    let lotRetained = false
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      const user = await supabase.auth.getUser()
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      if (!produto) throw new Error('Informe o produto.')
      if (inspectionType === 'FINAL' && !lote) throw new Error('Inspeção final exige um lote de produto acabado rastreável.')
      const inspected = Number(quantidadeInspecionada)
      const approved = Number(quantidadeAprovada)
      const rejected = Number(quantidadeReprovada)
      if (!Number.isFinite(inspected) || inspected <= 0) throw new Error('Informe a quantidade inspecionada.')
      if (!Number.isFinite(approved) || approved < 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error('Informe quantidades aprovadas e reprovadas válidas.')
      if (approved + rejected !== inspected) throw new Error('Aprovadas + reprovadas deve ser igual à quantidade inspecionada.')
      if (!medicoes.length || medicoes.some(item => !item.caracteristica.trim() || !item.encontrado.trim())) throw new Error('Registre ao menos uma característica e seu valor encontrado.')
      if (medicoes.some(item => item.limite_inferior === null && item.limite_superior === null && !['VISUAL','DOCUMENTAL'].includes(item.metodo_inspecao))) {
        throw new Error('Toda medição dimensional ou funcional precisa de limite técnico. Para visual/documental, use CONFORME ou NÃO CONFORME.')
      }
      if (medicoes.some(item => item.limite_inferior !== null && item.limite_superior !== null && item.limite_inferior > item.limite_superior)) {
        throw new Error('O limite mínimo não pode ser maior que o limite máximo.')
      }
      const invalidPlan = medicoes.some(item => {
        const plan = plans.find(candidate => candidate.id === item.plano_inspecao_id && candidate.produto_id === produto && candidate.tipo_inspecao === inspectionType && (candidate.status ?? '').toUpperCase() === 'ATIVO')
        if (!plan || !isPlanEffective(plan) || plan.metodo_inspecao !== item.metodo_inspecao) return true
        if (plan.metodo_inspecao === 'DIMENSIONAL' || plan.metodo_inspecao === 'FUNCIONAL') {
          return plan.nominal == null || item.nominal !== String(plan.nominal) || item.limite_inferior !== plan.limite_inferior || item.limite_superior !== plan.limite_superior
        }
        return false
      })
      if (invalidPlan) throw new Error('Um critério foi alterado ou deixou de estar ativo. Recarregue o plano mestre da Qualidade antes de salvar.')
      const evaluatedMeasurements = medicoes.map(item => ({ ...item, instrumento_id: item.instrumento_id || instrument || null, status: evaluateMeasurement(item) }))
      for (const item of evaluatedMeasurements) {
        if (!['VISUAL','DOCUMENTAL'].includes(item.metodo_inspecao)) {
          const selectedInstrument = instruments.find(candidate => candidate.id === item.instrumento_id)
          if (!selectedInstrument || !validInstrument(selectedInstrument)) throw new Error('Cada critério dimensional/funcional precisa de instrumento aprovado e com calibração vigente.')
        }
      }
      const invalidNumericReading = evaluatedMeasurements.some(item => !['VISUAL','DOCUMENTAL'].includes(item.metodo_inspecao) && (item.limite_inferior !== null || item.limite_superior !== null) && !Number.isFinite(Number(item.encontrado.trim().replace(',', '.'))))
      if (invalidNumericReading) throw new Error('Informe valores numéricos válidos para as características com limites técnicos.')
      if (evaluatedMeasurements.some(item => item.status === 'PENDENTE' || item.status === 'SEM CRITÉRIO')) throw new Error('Conclua cada critério: valores numéricos dentro dos limites ou CONFORME/NÃO CONFORME para visual/documental.')
      const hasOutOfSpec = evaluatedMeasurements.some(item => item.status === 'NOK')
      const effectiveResult = hasOutOfSpec ? 'REPROVADO' : resultado
      if (hasOutOfSpec && rejected <= 0) throw new Error('Há medição fora dos limites; registre quantidade reprovada maior que zero.')
      if (effectiveResult !== 'APROVADO' && rejected <= 0) throw new Error('Inspeção não aprovada exige quantidade reprovada maior que zero.')
      if (effectiveResult !== 'APROVADO' && acaoBloqueio === 'NENHUMA') throw new Error('Inspeção não aprovada exige uma ação de bloqueio.')
      if (effectiveResult === 'APROVADO' && acaoBloqueio !== 'NENHUMA') throw new Error('Remova a ação de bloqueio ou marque a inspeção como não aprovada.')
      if (effectiveResult !== 'APROVADO' && !lote) throw new Error('Selecione o lote real que será retido em quarentena.')
      const selectedLot = lots.find(item => item.id === lote)
      if (lote && (!selectedLot || selectedLot.produto_id !== produto)) throw new Error('O lote selecionado não pertence ao produto inspecionado.')
      if (effectiveResult !== 'APROVADO' && lote) {
        if (selectedLot?.status_inspecao?.toUpperCase() === 'RETIDO') {
          lotRetained = true
        } else {
          const hold = await supabase.rpc('erp_reter_lote', { p_lote_id: lote, p_motivo: `Inspeção de processo ${effectiveResult}: ${obs.trim() || 'desvio nos critérios técnicos'}` })
          if (hold.error) throw hold.error
          lotRetained = true
        }
      }
      const result = await supabase.from('erp_inspecoes').insert({
        empresa_id: company.data,
        produto_id: produto,
        lote_id: lote || null,
        ordem_producao_id: op || null,
        maquina_id: machine || null,
        tipo: inspectionType === 'FINAL' ? 'FINAL' : 'PROCESSO_METROLOGIA',
        resultado: effectiveResult,
        quantidade_inspecionada: inspected,
        quantidade_aprovada: approved,
        quantidade_reprovada: rejected,
        observacao: obs.trim() || null,
        inspetor_nome: inspetor.trim() || null,
        medicoes: evaluatedMeasurements.map(item => ({ ...item, caracteristica: item.caracteristica.trim(), nominal: item.nominal.trim(), encontrado: item.encontrado.trim(), unidade: item.unidade.trim() })),
        acao_bloqueio: effectiveResult === 'APROVADO' ? 'NENHUMA' : acaoBloqueio,
        criado_por: user.data.user?.id || null,
      })
      if (result.error) throw result.error
      setNotice('Laudo de inspeção salvo no banco real.')
      resetForm()
      await load()
    } catch (cause) {
      setError(lotRetained ? `O lote foi retido em quarentena, mas o laudo não foi confirmado: ${cause instanceof Error ? cause.message : 'falha ao salvar inspeção'}` : cause instanceof Error ? cause.message : 'Falha ao salvar inspeção.')
    } finally {
      setBusy(false)
    }
  }

  return <main data-quality-workspace className="erp-global-surface erp-compact min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white"><div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3"><div><p className="text-[9px] font-medium uppercase tracking-widest text-sky-300">MÓDULO: QUALIDADE • {inspectionType === 'FINAL' ? 'INSPEÇÃO FINAL' : 'INSPEÇÃO EM PROCESSO'}</p><h1 className="text-[15px] font-semibold">Laudo de Inspeção {inspectionType === 'FINAL' ? 'Final' : 'em Processo'}</h1><p className="mt-1 text-[10px] text-slate-300">Critérios técnicos do produto, rastreabilidade de lote e medições conforme plano vigente.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={resetForm} className="rounded-[2px] border border-slate-500 px-4 py-3 text-[11px] font-extrabold text-white"><Plus className="mr-2 inline" size={18}/> NOVA INSPEÇÃO</button><button type="button" onClick={() => void save()} disabled={busy} className="rounded-[2px] bg-sky-600 px-5 py-3 text-[11px] font-extrabold text-white"><Save className="mr-2 inline" size={18}/> SALVAR LAUDO</button><button type="button" onClick={() => window.print()} className="rounded-[2px] border border-slate-500 px-4 py-3 text-[11px] font-extrabold text-white"><Printer className="mr-2 inline" size={18}/> IMPRIMIR</button></div></div></header>
    <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-5 p-4 lg:grid-cols-[280px_minmax(0,1fr)]"><QualitySidebar active={inspectionType === 'FINAL' ? '/qualidade/inspecao-final' : '/qualidade/inspecao-processo'}/><section className="min-w-0 space-y-5">
      {(error || notice) && <div className={error ? 'rounded-[2px] border border-red-200 bg-red-50 p-4 text-[11px] font-bold text-red-800' : 'rounded-[2px] border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-bold text-emerald-800'}>{error || notice}</div>}
      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">1. AMARRAÇÃO DE ENTIDADES DA PRODUÇÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EntityCodeLookup label="ITEM / PEÇA" value={produto} records={products} onChange={value => { setProduto(value); if (lote && lots.find(item => item.id === lote)?.produto_id !== value) setLote('') }} onSelect={record => { setProduto(record.id); if (lote && lots.find(item => item.id === lote)?.produto_id !== record.id) setLote('') }} required/>
        <EntityCodeLookup label="LOTE / RASTREABILIDADE" value={lote} records={lots.filter(item => item.produto_id === produto).map(item => ({ id: item.id, codigo: item.lote_interno, nome: item.status_inspecao ? `Status: ${item.status_inspecao}` : 'Sem inspeção registrada', documento: item.lote_fornecedor ?? undefined }))} onChange={setLote} onSelect={record => setLote(record.id)} helper="Obrigatório para retenção ou bloqueio."/>
        <EntityCodeLookup label="Nº DA OP" value={op} records={ops} onChange={setOp} onSelect={record => setOp(record.id)} helper="OP real do PCP."/>
        <EntityCodeLookup label="MÁQUINA / POSTO" value={machine} records={machines} onChange={setMachine} onSelect={record => setMachine(record.id)}/>
        <EntityCodeLookup label="INSTRUMENTO DE MEDIÇÃO" value={instrument} records={instruments.map(item => ({ ...item, nome: validInstrument(item) ? item.descricao : item.descricao + ' • BLOQUEADO' }))} onChange={setInstrument} onSelect={record => setInstrument(record.id)} required helper="Somente instrumentos aprovados e vigentes."/>
        <label className={label}>INSPETOR RESPONSÁVEL<input className={input} value={inspetor} onChange={event => setInspetor(event.target.value)} placeholder="Nome do inspetor"/></label>
      </div></section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[13px] font-extrabold">2. PLANO / MEDIÇÕES TÉCNICAS</h2><p className="mt-1 text-sm text-slate-600">Use critérios ativos do produto para a etapa PROCESSO. Critérios visuais/documentais aceitam CONFORME ou NÃO CONFORME; dimensionais exigem limites.</p></div><div className="flex flex-wrap gap-2">{effectivePlans.filter(plan => plan.produto_id === produto).slice(0,12).map(plan => <button key={plan.id} type="button" onClick={() => addMeasurement(plan)} className="rounded-[2px] border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50">{plan.codigo} • {plan.caracteristica || 'Característica'}</button>)}</div></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-[11px]"><thead className="bg-slate-900 text-white"><tr><th className="p-3 text-left">Característica</th><th className="p-3 text-left">Valor nominal</th><th className="p-3 text-left">Unidade</th><th className="p-3 text-left">Valor encontrado</th><th className="p-3 text-left">Limites</th><th className="p-3 text-left">Situação</th><th className="p-3"></th></tr></thead><tbody>
          {medicoes.map((row, index) => <tr key={index} className="border-b border-slate-200"><td className="p-2"><input className={input} value={row.caracteristica} readOnly/></td><td className="p-2"><input className={input} value={row.nominal} readOnly/></td><td className="p-2"><input className={input} value={row.unidade} readOnly/></td><td className="p-2"><input className={input} value={row.encontrado} placeholder={row.metodo_inspecao === 'VISUAL' || row.metodo_inspecao === 'DOCUMENTAL' ? 'CONFORME / NÃO CONFORME' : 'Valor medido'} onChange={event => setMedicoes(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, encontrado: event.target.value } : item))}/></td><td className="p-2 whitespace-nowrap">{row.limite_inferior ?? '—'} a {row.limite_superior ?? '—'}</td><td className="p-2"><span className={evaluateMeasurement(row) === 'NOK' ? 'font-bold text-red-700' : evaluateMeasurement(row) === 'OK' ? 'font-bold text-emerald-700' : 'text-slate-500'}>{evaluateMeasurement(row)}</span></td><td className="p-2"><button type="button" onClick={() => setMedicoes(rows => rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-[2px] border border-rose-300 p-3 text-rose-800" title="Remover medição"><Trash2 size={17}/></button></td></tr>)}
          {!medicoes.length && <tr><td colSpan={7} className="p-8 text-center font-semibold text-slate-600">Nenhuma característica adicionada. Selecione um critério mestre ativo da etapa PROCESSO; os limites não são editados no laudo.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2"><div className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">3. QUANTIDADE E DECISÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={label}>QTD. INSPECIONADA<input className={input} type="number" min="1" step="any" value={quantidadeInspecionada} onChange={event => setQuantidadeInspecionada(event.target.value)}/></label>
        <label className={label}>QTD. APROVADA<input className={input} type="number" min="0" step="any" value={quantidadeAprovada} onChange={event => setQuantidadeAprovada(event.target.value)}/></label>
        <label className={label}>QTD. REPROVADA<input className={input} type="number" min="0" step="any" value={quantidadeReprovada} onChange={event => setQuantidadeReprovada(event.target.value)}/></label>
        <label className={label}>RESULTADO<select className={input} value={resultado} onChange={event => setResultado(event.target.value)}><option>APROVADO</option><option>REPROVADO</option><option>CONDICIONAL</option></select></label>
        <label className={label}>AÇÃO DE BLOQUEIO<select className={input} value={acaoBloqueio} onChange={event => setAcaoBloqueio(event.target.value)}><option>NENHUMA</option><option>BLOQUEAR_LOTE</option><option>RETER_RETRABALHO</option><option>SEGREGAR</option></select></label>
      </div></div><div className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">OBSERVAÇÕES DO INSPETOR</h2><textarea className="mt-4 min-h-40 w-full rounded-[2px] border border-slate-300 bg-white p-3 text-[11px] text-slate-900" value={obs} onChange={event => setObs(event.target.value)} placeholder="Registre evidências, desvios e decisão técnica."/></div></section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">4. HISTÓRICO RECENTE</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3">Tipo</th><th className="p-3">Resultado</th><th className="p-3">Inspecionada</th><th className="p-3">Aprovada</th><th className="p-3">Reprovada</th><th className="p-3">OP</th><th className="p-3">Ação</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="h-[54px] border-b border-slate-200"><td className="p-3">{item.tipo}</td><td className="p-3 font-bold">{item.resultado}</td><td className="p-3">{item.quantidade_inspecionada}</td><td className="p-3">{item.quantidade_aprovada}</td><td className="p-3">{item.quantidade_reprovada}</td><td className="p-3">{item.ordem_producao_id || '—'}</td><td className="p-3">{item.acao_bloqueio || '—'}</td></tr>)}{!history.length && <tr><td colSpan={7} className="p-6 text-center text-slate-600">Nenhuma inspeção registrada.</td></tr>}</tbody></table></div></section>
    </section></div>
  </main>
}
