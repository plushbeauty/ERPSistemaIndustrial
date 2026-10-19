/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_APROVACAO: INSPECAO-PROCESSO-CEP-STEEL-BLUE-OK
 *
 * Revisão visual Steel Blue. Mantém o contrato real existente:
 * erp_inspecoes, erp_produtos, erp_ordens_producao, erp_maquinas,
 * erp_equipamentos_medicao, erp_planos_inspecao e erp_current_empresa_id.
 * As seis medidas e os atributos são persistidos no JSONB existente "medicoes".
 * Não cria tabela, coluna ou RPC nova.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Microscope, Plus,
  RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Lookup = { id: string; codigo: string; nome: string; documento?: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Plan = { id: string; codigo: string; caracteristica: string | null; unidade: string | null; frequencia: string | null; status: string | null }
type InspectionRow = {
  id: string
  produto_id: string | null
  ordem_producao_id: string | null
  maquina_id: string | null
  tipo: string
  resultado: string
  quantidade_inspecionada: number
  quantidade_aprovada: number
  quantidade_reprovada: number
  observacao: string | null
  inspetor_nome: string | null
  medicoes: unknown
  acao_bloqueio: string | null
  created_at?: string
}
type Measurement = { caracteristica: string; nominal: string; encontrado: string; unidade: string }
type Tab = 'DIMENSIONAL' | 'ATRIBUTOS'

const panel = 'min-w-0 border border-[#2E4A62] bg-[#0D2638] p-3'
const input = 'h-8 min-w-0 w-full rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2 text-[11px] font-semibold text-[#F4FBFD] outline-none transition-colors placeholder:text-slate-500 focus:border-[#48B7C7] disabled:cursor-not-allowed disabled:opacity-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-wide text-[#A8BBC8]'
const sectionTitle = 'mb-3 flex items-center gap-2 border-b border-[#2E4A62] pb-2 text-[10px] font-black uppercase tracking-widest text-[#48B7C7]'
const button = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2E4A62] px-2.5 text-[9px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const buttonPrimary = button + ' border-[#287DA0] bg-[#176487] text-white hover:bg-[#1D789F]'
const buttonQuiet = button + ' bg-[#102C40] text-[#D5E5ED] hover:bg-[#183B51]'
const buttonDanger = button + ' border-red-900 bg-[#32151C] text-red-200 hover:bg-[#491A23]'
const tableHead = 'bg-[#123B50] px-2 py-2 text-left text-[9px] font-black uppercase tracking-wide text-[#DFF5FC]'
const cell = 'border-b border-[#203D51] px-2 py-1.5 align-middle text-[10px] text-[#D9E8EF]'

function validInstrument(item: Instrument): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today)
}

function blankMeasurements(): Measurement[] {
  return Array.from({ length: 6 }, (_, index) => ({
    caracteristica: 'Medida ' + (index + 1),
    nominal: '',
    encontrado: '',
    unidade: 'mm',
  }))
}

function displayDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function QualidadeInspecaoProcesso() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Lookup[]>([])
  const [ops, setOps] = useState<Lookup[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [history, setHistory] = useState<InspectionRow[]>([])
  const [produto, setProduto] = useState('')
  const [op, setOp] = useState('')
  const [machine, setMachine] = useState('')
  const [instrument, setInstrument] = useState('')
  const [inspetor, setInspetor] = useState('')
  const [quantidadeInspecionada, setQuantidadeInspecionada] = useState('')
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('')
  const [obs, setObs] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<Tab>('DIMENSIONAL')
  const [minLimit, setMinLimit] = useState('')
  const [maxLimit, setMaxLimit] = useState('')
  const [medicoes, setMedicoes] = useState<Measurement[]>(blankMeasurements)
  const [rebarba, setRebarba] = useState(false)
  const [riscado, setRiscado] = useState(false)
  const [manchado, setManchado] = useState(false)
  const [resultadoManual, setResultadoManual] = useState('APROVADO')
  const [acaoBloqueio, setAcaoBloqueio] = useState('NENHUMA')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      setEmpresaId(companyId)
      const [productsResult, opsResult, machinesResult, instrumentsResult, plansResult, inspectionsResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,descricao').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status').eq('empresa_id', companyId).order('numero_op', { ascending: false }).limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', companyId).not('status', 'eq', 'INATIVA').order('codigo'),
        supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao').eq('empresa_id', companyId).order('codigo'),
        supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,frequencia,status').eq('empresa_id', companyId).order('codigo'),
        supabase.from('erp_inspecoes').select('id,produto_id,ordem_producao_id,maquina_id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,observacao,inspetor_nome,medicoes,acao_bloqueio,created_at').eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(100),
      ])
      for (const result of [productsResult, opsResult, machinesResult, instrumentsResult, plansResult, inspectionsResult]) {
        if (result.error) throw result.error
      }
      setProducts((productsResult.data ?? []) as Lookup[])
      setOps((opsResult.data ?? []).map(row => ({
        id: String(row.id), codigo: String(row.numero_op), nome: String(row.status), documento: String(row.produto_id ?? ''),
      })))
      setMachines((machinesResult.data ?? []) as Machine[])
      setInstruments((instrumentsResult.data ?? []) as Instrument[])
      setPlans((plansResult.data ?? []) as Plan[])
      setHistory((inspectionsResult.data ?? []) as InspectionRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar registros reais de inspeção.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selectedInstrument = useMemo(() => instruments.find(item => item.id === instrument), [instruments, instrument])
  const dimensionalOutOfTolerance = useMemo(() => {
    if (minLimit.trim() === '' || maxLimit.trim() === '') return false
    const min = Number(minLimit)
    const max = Number(maxLimit)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return false
    return medicoes.some(item => {
      if (item.encontrado.trim() === '') return false
      const value = Number(item.encontrado)
      return !Number.isFinite(value) || value < min || value > max
    })
  }, [medicoes, minLimit, maxLimit])

  const resultadoCalculado = abaAtiva === 'DIMENSIONAL'
    ? (dimensionalOutOfTolerance ? 'REPROVADO' : resultadoManual)
    : ((rebarba || riscado || manchado) ? 'REPROVADO' : resultadoManual)

  function updateMeasurement(index: number, field: keyof Measurement, value: string) {
    setMedicoes(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addPlanMeasurement(plan: Plan) {
    const index = medicoes.findIndex(item => !item.encontrado.trim())
    if (index < 0) {
      setError('As seis posições já estão preenchidas. Limpe uma posição antes de aplicar outro critério.')
      return
    }
    updateMeasurement(index, 'caracteristica', plan.caracteristica || plan.codigo)
    updateMeasurement(index, 'unidade', plan.unidade || '')
    setNotice('Critério ' + plan.codigo + ' aplicado à posição ' + (index + 1) + '. Confira nominal e tolerância antes de registrar.')
    setError('')
  }

  function resetForm() {
    setProduto('')
    setOp('')
    setMachine('')
    setInstrument('')
    setInspetor('')
    setQuantidadeInspecionada('')
    setQuantidadeAprovada('')
    setQuantidadeReprovada('')
    setObs('')
    setAbaAtiva('DIMENSIONAL')
    setMinLimit('')
    setMaxLimit('')
    setMedicoes(blankMeasurements())
    setRebarba(false)
    setRiscado(false)
    setManchado(false)
    setResultadoManual('APROVADO')
    setAcaoBloqueio('NENHUMA')
    setNotice('Formulário limpo. Selecione entidades reais e preencha os dados da coleta.')
    setError('')
  }

  async function save(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      const user = await supabase.auth.getUser()
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      if (!produto) throw new Error('Selecione um produto cadastrado.')
      if (!instrument) throw new Error('Selecione o instrumento de medição.')
      if (!selectedInstrument || !validInstrument(selectedInstrument)) throw new Error('Instrumento bloqueado: exige calibração APROVADA e vigente.')
      const inspected = Number(quantidadeInspecionada)
      const approved = Number(quantidadeAprovada)
      const rejected = Number(quantidadeReprovada)
      if (!Number.isFinite(inspected) || inspected <= 0) throw new Error('Informe a quantidade inspecionada.')
      if (!Number.isFinite(approved) || approved < 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error('Informe quantidades aprovadas e reprovadas válidas.')
      if (approved + rejected !== inspected) throw new Error('A soma de aprovadas e reprovadas deve ser igual à quantidade inspecionada.')
      if (abaAtiva === 'DIMENSIONAL') {
        if (minLimit.trim() === '' || maxLimit.trim() === '') throw new Error('Informe os limites mínimo e máximo da característica dimensional.')
        const min = Number(minLimit)
        const max = Number(maxLimit)
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new Error('Limites dimensionais inválidos: mínimo deve ser menor ou igual ao máximo.')
        if (medicoes.some(item => item.encontrado.trim() === '' || !Number.isFinite(Number(item.encontrado)))) throw new Error('Preencha as seis medidas com valores numéricos válidos.')
      } else if (!(rebarba || riscado || manchado) && resultadoManual === 'REPROVADO') {
        throw new Error('Informe ao menos um atributo de defeito ou revise o resultado.')
      }
      const finalResult = resultadoCalculado
      const finalBlockAction = finalResult === 'APROVADO' ? 'NENHUMA' : acaoBloqueio
      if (finalResult !== 'APROVADO' && finalBlockAction === 'NENHUMA') throw new Error('Inspeção reprovada exige uma ação de bloqueio.')
      const measurementsPayload = abaAtiva === 'DIMENSIONAL'
        ? {
            tipo_inspecao: 'DIMENSIONAL',
            limite_min: Number(minLimit),
            limite_max: Number(maxLimit),
            medidas: medicoes.map((item, index) => ({
              posicao: index + 1,
              caracteristica: item.caracteristica.trim(),
              nominal: item.nominal.trim(),
              unidade: item.unidade.trim(),
              encontrado: Number(item.encontrado),
              limite_min: Number(minLimit),
              limite_max: Number(maxLimit),
              dentro_tolerancia: Number(item.encontrado) >= Number(minLimit) && Number(item.encontrado) <= Number(maxLimit),
            })),
          }
        : {
            tipo_inspecao: 'ATRIBUTOS',
            atributos: { rebarba, riscado, manchado },
          }
      const result = await supabase.from('erp_inspecoes').insert({
        empresa_id: company.data,
        produto_id: produto,
        lote_id: null,
        ordem_producao_id: op || null,
        maquina_id: machine || null,
        tipo: 'PROCESSO_METROLOGIA',
        resultado: finalResult,
        quantidade_inspecionada: inspected,
        quantidade_aprovada: approved,
        quantidade_reprovada: rejected,
        observacao: obs.trim() || null,
        inspetor_nome: inspetor.trim() || null,
        medicoes: measurementsPayload,
        acao_bloqueio: finalBlockAction,
        criado_por: user.data.user?.id || null,
      })
      if (result.error) throw result.error
      setNotice('Coleta registrada no histórico real de inspeções.')
      resetForm()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a inspeção.')
    } finally {
      setBusy(false)
    }
  }

  const filteredHistory = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return history
    return history.filter(item => {
      const product = products.find(p => p.id === item.produto_id)
      const order = ops.find(o => o.id === item.ordem_producao_id)
      return [item.tipo, item.resultado, item.inspetor_nome, item.ordem_producao_id, product?.codigo, product?.nome, order?.codigo]
        .some(value => String(value ?? '').toLowerCase().includes(term))
    })
  }, [history, query, products, ops])

  function colorForMeasurement(value: string) {
    if (!value.trim() || minLimit.trim() === '' || maxLimit.trim() === '') return 'border-[#2E4A62] bg-[#0E1E2F] text-[#F4FBFD]'
    const v = Number(value)
    const min = Number(minLimit)
    const max = Number(maxLimit)
    if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max) || min > max) return 'border-[#2E4A62] bg-[#0E1E2F] text-[#F4FBFD]'
    return v >= min && v <= max
      ? 'border-emerald-700 bg-[#0A261D] text-emerald-300'
      : 'border-red-800 bg-[#2C1115] text-red-300'
  }

  return (
    <main data-quality-workspace className="min-h-screen bg-[#0E1E2F] font-mono text-[#F4FBFD] antialiased">
      <header className="border-b border-[#2E4A62] bg-[#0B1927] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#48B7C7]">MOLDPLÁS ERP INDUSTRIAL · QUALIDADE · REVISÃO 2026-10-19</p>
            <h1 className="mt-1 text-[13px] font-black uppercase tracking-wide text-white">Inspeção em processo · Monitoramento CEP</h1>
            <p className="mt-1 text-[10px] text-[#A8BBC8]">Coleta dimensional e triagem visual com rastreabilidade da empresa autenticada.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={resetForm} className={buttonQuiet}><Plus size={13}/> Nova coleta</button>
            <button type="button" onClick={() => void load()} disabled={loading || busy} className={buttonQuiet}><RefreshCw size={13}/> Atualizar</button>
            <button type="button" onClick={() => window.print()} className={buttonQuiet}>Imprimir</button>
            <button type="button" onClick={() => void save()} disabled={busy || loading} className={buttonPrimary}><Save size={13}/> {busy ? 'Gravando...' : 'Registrar coleta'}</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-3 p-3 xl:grid-cols-12">
        <section className="min-w-0 space-y-3 xl:col-span-8">
          {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-800 bg-[#32151C] px-3 py-2 text-[10px] font-bold text-red-200' : 'border border-emerald-800 bg-[#0A261D] px-3 py-2 text-[10px] font-bold text-emerald-200'}>{error || notice}</div>}

          <section className={panel}>
            <div className={sectionTitle}><SlidersHorizontal size={13}/> 1. Rastreabilidade do posto e da coleta <span className="ml-auto text-[9px] font-semibold text-slate-400">{empresaId ? 'EMPRESA DA SESSÃO OK' : 'VALIDANDO SESSÃO'}</span></div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <label className={label + ' md:col-span-4'}>Produto / SKU *
                <select className={input} required value={produto} onChange={event => setProduto(event.target.value)}><option value="">Selecione o cadastro real...</option>{products.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>)}</select>
              </label>
              <label className={label + ' md:col-span-4'}>Ordem de produção
                <select className={input} value={op} onChange={event => setOp(event.target.value)}><option value="">Sem OP vinculada</option>{ops.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>)}</select>
              </label>
              <label className={label + ' md:col-span-4'}>Máquina / posto
                <select className={input} value={machine} onChange={event => setMachine(event.target.value)}><option value="">Selecione se aplicável...</option>{machines.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>)}</select>
              </label>
              <label className={label + ' md:col-span-6'}>Instrumento de medição calibrado *
                <select className={input} required value={instrument} onChange={event => setInstrument(event.target.value)}><option value="">Selecione instrumento aprovado...</option>{instruments.map(item => <option key={item.id} value={item.id} disabled={!validInstrument(item)}>{item.codigo} — {item.descricao}{validInstrument(item) ? '' : ' · BLOQUEADO'}</option>)}</select>
                <span className="text-[9px] font-medium normal-case text-slate-400">{selectedInstrument ? (validInstrument(selectedInstrument) ? 'Calibração aprovada e vigente.' : 'Instrumento sem calibração válida.') : 'Instrumentos vencidos ou não aprovados ficam bloqueados.'}</span>
              </label>
              <label className={label + ' md:col-span-3'}>Inspetor responsável
                <input className={input} value={inspetor} onChange={event => setInspetor(event.target.value)} placeholder="Identificação do inspetor"/>
              </label>
              <label className={label + ' md:col-span-3'}>Tipo de coleta
                <select className={input} value={abaAtiva} onChange={event => { setAbaAtiva(event.target.value as Tab); setError(''); setNotice('') }}><option value="DIMENSIONAL">Dimensional · 6 medidas</option><option value="ATRIBUTOS">Atributos visuais</option></select>
              </label>
            </div>
          </section>

          <form onSubmit={save} className="space-y-3">
            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={sectionTitle + ' mb-0 flex-1'}><Microscope size={13}/> 2. Controle de processo · CEP</div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => { setAbaAtiva('DIMENSIONAL'); setError('') }} className={abaAtiva === 'DIMENSIONAL' ? buttonPrimary : buttonQuiet}>6 medidas</button>
                  <button type="button" onClick={() => { setAbaAtiva('ATRIBUTOS'); setError('') }} className={abaAtiva === 'ATRIBUTOS' ? buttonPrimary : buttonQuiet}>Atributos</button>
                </div>
              </div>

              {abaAtiva === 'DIMENSIONAL' ? <>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className={label}>Limite mínimo (mm) *
                    <input className={input} type="number" step="0.001" value={minLimit} onChange={event => setMinLimit(event.target.value)} placeholder="Informar limite inferior"/>
                  </label>
                  <label className={label}>Limite máximo (mm) *
                    <input className={input} type="number" step="0.001" value={maxLimit} onChange={event => setMaxLimit(event.target.value)} placeholder="Informar limite superior"/>
                  </label>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[680px] table-fixed border-collapse">
                    <thead><tr><th className={tableHead + ' w-12'}>Ponto</th><th className={tableHead}>Característica</th><th className={tableHead + ' w-24'}>Nominal</th><th className={tableHead + ' w-20'}>Unid.</th><th className={tableHead + ' w-28'}>Medida real</th><th className={tableHead + ' w-24'}>Condição</th></tr></thead>
                    <tbody>{medicoes.map((item, index) => {
                      const filled = item.encontrado.trim() !== '' && minLimit.trim() !== '' && maxLimit.trim() !== ''
                      const valid = filled && Number(item.encontrado) >= Number(minLimit) && Number(item.encontrado) <= Number(maxLimit)
                      return <tr key={index}>
                        <td className={cell + ' text-center font-black text-[#48B7C7]'}>{String(index + 1).padStart(2, '0')}</td>
                        <td className={cell}><input aria-label={'Característica da medida ' + (index + 1)} className={input} value={item.caracteristica} onChange={event => updateMeasurement(index, 'caracteristica', event.target.value)}/></td>
                        <td className={cell}><input aria-label={'Nominal da medida ' + (index + 1)} className={input + ' text-right'} type="number" step="0.001" value={item.nominal} onChange={event => updateMeasurement(index, 'nominal', event.target.value)} placeholder="—"/></td>
                        <td className={cell}><input aria-label={'Unidade da medida ' + (index + 1)} className={input} value={item.unidade} onChange={event => updateMeasurement(index, 'unidade', event.target.value)}/></td>
                        <td className={cell}><input aria-label={'Valor encontrado da medida ' + (index + 1)} className={input + ' text-right font-black ' + colorForMeasurement(item.encontrado)} type="number" step="0.001" value={item.encontrado} onChange={event => updateMeasurement(index, 'encontrado', event.target.value)} placeholder="0.000"/></td>
                        <td className={cell}>{!filled ? <span className="text-slate-500">PENDENTE</span> : valid ? <span className="inline-flex items-center gap-1 font-black text-emerald-300"><CheckCircle2 size={12}/> DENTRO</span> : <span className="inline-flex items-center gap-1 font-black text-red-300"><AlertTriangle size={12}/> FORA</span>}</td>
                      </tr>
                    })}</tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] font-bold uppercase">
                  <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-2 w-2 bg-emerald-700"/> Dentro da tolerância</span>
                  <span className="inline-flex items-center gap-1 text-red-300"><span className="h-2 w-2 bg-red-800"/> Fora da tolerância</span>
                  <span className="ml-auto text-[#A8BBC8]">Status calculado: <strong className={dimensionalOutOfTolerance ? 'text-red-300' : 'text-emerald-300'}>{dimensionalOutOfTolerance ? 'REPROVADO' : 'AGUARDANDO / APROVADO'}</strong></span>
                </div>
                {plans.length > 0 && <div className="mt-3 border-t border-[#2E4A62] pt-2">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wide text-[#A8BBC8]">Aplicar característica cadastrada no plano de inspeção (preenche a próxima posição vazia)</p>
                  <div className="flex flex-wrap gap-1">{plans.slice(0, 12).map(plan => <button key={plan.id} type="button" onClick={() => addPlanMeasurement(plan)} className={buttonQuiet}>{plan.codigo} · {plan.caracteristica || 'Característica'}</button>)}</div>
                </div>}
              </> : <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: 'Rebarba', value: rebarba, set: setRebarba, detail: 'Excesso de material / rebarba' },
                  { label: 'Riscado', value: riscado, set: setRiscado, detail: 'Risco visível na peça' },
                  { label: 'Manchado', value: manchado, set: setManchado, detail: 'Mancha ou alteração visual' },
                ].map(item => <label key={item.label} className={'flex min-h-20 cursor-pointer items-start gap-2 border p-3 ' + (item.value ? 'border-red-800 bg-[#32151C]' : 'border-[#2E4A62] bg-[#0E1E2F]')}>
                  <input type="checkbox" checked={item.value} onChange={event => item.set(event.target.checked)} className="mt-0.5 accent-red-500"/>
                  <span><span className="block text-[10px] font-black uppercase">{item.label}</span><span className="mt-1 block text-[9px] text-[#A8BBC8]">{item.detail}</span></span>
                </label>)}
                <p className="sm:col-span-3 text-[9px] text-[#A8BBC8]">Marcar qualquer defeito reprova a coleta e exige uma ação de bloqueio antes de gravar.</p>
              </div>}
            </section>

            <section className={panel}>
              <div className={sectionTitle}><Activity size={13}/> 3. Quantidade, decisão e contenção</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-12">
                <label className={label + ' md:col-span-3'}>Qtd. inspecionada *
                  <input className={input} required type="number" min="1" step="1" value={quantidadeInspecionada} onChange={event => setQuantidadeInspecionada(event.target.value)}/>
                </label>
                <label className={label + ' md:col-span-3'}>Qtd. aprovada *
                  <input className={input} required type="number" min="0" step="1" value={quantidadeAprovada} onChange={event => setQuantidadeAprovada(event.target.value)}/>
                </label>
                <label className={label + ' md:col-span-3'}>Qtd. reprovada *
                  <input className={input} required type="number" min="0" step="1" value={quantidadeReprovada} onChange={event => setQuantidadeReprovada(event.target.value)}/>
                </label>
                <label className={label + ' md:col-span-3'}>Resultado
                  <select className={input} value={resultadoCalculado} onChange={event => setResultadoManual(event.target.value)} disabled={dimensionalOutOfTolerance || (abaAtiva === 'ATRIBUTOS' && (rebarba || riscado || manchado))}><option value="APROVADO">APROVADO</option><option value="REPROVADO">REPROVADO</option><option value="CONDICIONAL">CONDICIONAL</option></select>
                </label>
                <label className={label + ' col-span-2 md:col-span-5'}>Ação de bloqueio
                  <select className={input} value={acaoBloqueio} onChange={event => setAcaoBloqueio(event.target.value)}><option value="NENHUMA">Nenhuma</option><option value="BLOQUEAR_LOTE">Bloquear lote</option><option value="RETER_RETRABALHO">Reter / retrabalho</option><option value="SEGREGAR">Segregar</option></select>
                </label>
                <label className={label + ' col-span-2 md:col-span-7'}>Observações da coleta
                  <input className={input} value={obs} onChange={event => setObs(event.target.value)} placeholder="Evidência, desvio ou observação técnica"/>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] pt-3">
                <span className={'inline-flex items-center gap-1.5 text-[10px] font-black ' + (resultadoCalculado === 'REPROVADO' ? 'text-red-300' : 'text-emerald-300')}>{resultadoCalculado === 'REPROVADO' ? <AlertTriangle size={14}/> : <ShieldCheck size={14}/>} DECISÃO: {resultadoCalculado}</span>
                <button type="submit" disabled={busy || loading} className={buttonPrimary}><Save size={13}/> {busy ? 'Persistindo...' : 'Registrar inspeção real'}</button>
              </div>
            </section>
          </form>
        </section>

        <aside className="min-w-0 space-y-3 xl:col-span-4">
          <section className={panel}>
            <div className={sectionTitle}><Clock3 size={13}/> 4. Histórico de coletas do turno</div>
            <label className={label}>Pesquisar registros
              <span className="relative block"><Search size={13} className="pointer-events-none absolute left-2 top-2 text-slate-500"/><input className={input + ' pl-7'} value={query} onChange={event => setQuery(event.target.value)} placeholder="OP, SKU, resultado, inspetor..."/></span>
            </label>
            <div className="mt-3 flex items-center justify-between border-b border-[#2E4A62] pb-2 text-[9px] font-bold uppercase text-[#A8BBC8]"><span>{filteredHistory.length} registro(s) listado(s)</span><span>{loading ? 'Atualizando...' : 'Dados do banco'}</span></div>
            <div className="mt-2 space-y-2">
              {loading && <div className="border border-[#2E4A62] p-3 text-[10px] text-[#A8BBC8]">Carregando registros da empresa...</div>}
              {!loading && filteredHistory.map(item => {
                const product = products.find(p => p.id === item.produto_id)
                const order = ops.find(o => o.id === item.ordem_producao_id)
                return <article key={item.id} className="border border-[#2E4A62] bg-[#0E1E2F] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-[10px] font-black text-white">{order?.codigo || (item.ordem_producao_id ? item.ordem_producao_id.slice(0, 8) : 'SEM OP')}</p><p className="mt-0.5 truncate text-[9px] text-[#A8BBC8]">{product ? product.codigo + ' — ' + product.nome : item.produto_id || 'Produto não informado'}</p></div>
                    <span className={'shrink-0 border px-1.5 py-1 text-[8px] font-black ' + (item.resultado === 'REPROVADO' ? 'border-red-800 bg-[#32151C] text-red-300' : item.resultado === 'CONDICIONAL' ? 'border-amber-800 bg-[#302515] text-amber-300' : 'border-emerald-800 bg-[#0A261D] text-emerald-300')}>{item.resultado}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 border-y border-[#203D51] py-2 text-[9px]"><span className="text-[#A8BBC8]">Inspec. <b className="block text-white">{item.quantidade_inspecionada}</b></span><span className="text-[#A8BBC8]">Aprov. <b className="block text-emerald-300">{item.quantidade_aprovada}</b></span><span className="text-[#A8BBC8]">Reprov. <b className="block text-red-300">{item.quantidade_reprovada}</b></span></div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-[#A8BBC8]"><span className="truncate">{item.acao_bloqueio || 'SEM AÇÃO'}</span><span className="shrink-0">{displayDate(item.created_at)}</span></div>
                  {item.inspetor_nome && <p className="mt-1 text-[9px] text-slate-400">Inspetor: {item.inspetor_nome}</p>}
                </article>
              })}
              {!loading && !filteredHistory.length && <div className="border border-dashed border-[#2E4A62] p-4 text-center text-[10px] text-[#A8BBC8]">{query ? 'Nenhum registro corresponde à pesquisa.' : 'Nenhuma inspeção registrada para esta empresa.'}</div>}
            </div>
          </section>
          <section className={panel}>
            <div className={sectionTitle}><ShieldCheck size={13}/> Critérios de integridade</div>
            <ul className="space-y-2 text-[9px] leading-relaxed text-[#B7CAD5]">
              <li className="flex gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#48B7C7]"/> Empresa obtida pela RPC autenticada e consultas filtradas por empresa.</li>
              <li className="flex gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#48B7C7]"/> Instrumento vencido ou não aprovado não pode ser selecionado.</li>
              <li className="flex gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#48B7C7]"/> As seis medições e os limites ficam no campo JSONB existente de medições.</li>
              <li className="flex gap-2"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#48B7C7]"/> Reprovação exige ação de contenção antes da gravação.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  )
}
