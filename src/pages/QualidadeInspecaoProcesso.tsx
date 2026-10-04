import { useEffect, useState } from 'react'
import { Plus, Printer, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import QualitySidebar from '../components/quality/QualitySidebar'

type Lookup = LookupRecord
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Plan = { id: string; codigo: string; caracteristica: string | null; unidade: string | null; frequencia: string | null; status: string | null }
type InspectionRow = { id: string; produto_id: string | null; ordem_producao_id: string | null; maquina_id: string | null; tipo: string; resultado: string; quantidade_inspecionada: number; quantidade_aprovada: number; quantidade_reprovada: number; observacao: string | null; inspetor_nome: string | null; medicoes: unknown; acao_bloqueio: string | null }

type Measurement = { caracteristica: string; nominal: string; encontrado: string; unidade: string }

const input = 'h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const label = 'grid gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-800'

function validInstrument(item: Instrument): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today)
}

export default function QualidadeInspecaoProcesso() {
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
      const [productsResult, opsResult, machinesResult, instrumentsResult, plansResult, inspectionsResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,descricao').eq('empresa_id', company.data).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status').eq('empresa_id', company.data).order('numero_op', { ascending: false }).limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', company.data).not('status', 'eq', 'INATIVA').order('codigo'),
        supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao').eq('empresa_id', company.data).order('codigo'),
        supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,frequencia,status').eq('empresa_id', company.data).order('codigo'),
        supabase.from('erp_inspecoes').select('id,produto_id,ordem_producao_id,maquina_id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,observacao,inspetor_nome,medicoes,acao_bloqueio').eq('empresa_id', company.data).order('created_at', { ascending: false }).limit(100),
      ])
      for (const result of [productsResult, opsResult, machinesResult, instrumentsResult, plansResult, inspectionsResult]) if (result.error) throw result.error
      setProducts((productsResult.data ?? []) as Lookup[])
      setOps((opsResult.data ?? []).map(row => ({ id: String(row.id), codigo: String(row.numero_op), nome: String(row.status), documento: String(row.produto_id ?? '') })) as Lookup[])
      setMachines((machinesResult.data ?? []) as Machine[])
      setInstruments((instrumentsResult.data ?? []) as Instrument[])
      setPlans((plansResult.data ?? []) as Plan[])
      setHistory((inspectionsResult.data ?? []) as InspectionRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a inspeção em processo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  function addMeasurement(plan?: Plan) {
    setMedicoes(rows => [...rows, { caracteristica: plan?.caracteristica || '', nominal: '', encontrado: '', unidade: plan?.unidade || '' }])
  }

  function resetForm() {
    setProduto('')
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
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      const user = await supabase.auth.getUser()
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      if (!produto) throw new Error('Informe o produto.')
      if (!instrument) throw new Error('Selecione o instrumento de medição.')
      const selectedInstrument = instruments.find(item => item.id === instrument)
      if (!selectedInstrument || !validInstrument(selectedInstrument)) throw new Error('Instrumento bloqueado: somente calibração APROVADA e vigente pode participar da inspeção.')
      const inspected = Number(quantidadeInspecionada)
      const approved = Number(quantidadeAprovada)
      const rejected = Number(quantidadeReprovada)
      if (!Number.isFinite(inspected) || inspected <= 0) throw new Error('Informe a quantidade inspecionada.')
      if (!Number.isFinite(approved) || approved < 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error('Informe quantidades aprovadas e reprovadas válidas.')
      if (approved + rejected !== inspected) throw new Error('Aprovadas + reprovadas deve ser igual à quantidade inspecionada.')
      if (!medicoes.length || medicoes.some(item => !item.caracteristica.trim() || !item.encontrado.trim())) throw new Error('Registre ao menos uma característica e seu valor encontrado.')
      if (resultado !== 'APROVADO' && acaoBloqueio === 'NENHUMA') throw new Error('Inspeção não aprovada exige uma ação de bloqueio.')
      const result = await supabase.from('erp_inspecoes').insert({
        empresa_id: company.data,
        produto_id: produto,
        lote_id: null,
        ordem_producao_id: op || null,
        maquina_id: machine || null,
        tipo: 'PROCESSO_METROLOGIA',
        resultado,
        quantidade_inspecionada: inspected,
        quantidade_aprovada: approved,
        quantidade_reprovada: rejected,
        observacao: obs.trim() || null,
        inspetor_nome: inspetor.trim() || null,
        medicoes: medicoes.map(item => ({ ...item, caracteristica: item.caracteristica.trim(), nominal: item.nominal.trim(), encontrado: item.encontrado.trim(), unidade: item.unidade.trim() })),
        acao_bloqueio: resultado === 'APROVADO' ? 'NENHUMA' : acaoBloqueio,
        criado_por: user.data.user?.id || null,
      })
      if (result.error) throw result.error
      setNotice('Laudo de inspeção salvo no banco real.')
      resetForm()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar inspeção.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white"><div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3"><div><p className="text-sm font-extrabold uppercase tracking-widest text-sky-300">MÓDULO: QUALIDADE • INSPEÇÃO EM PROCESSO</p><h1 className="text-2xl font-extrabold">Laudo de Inspeção de Produto</h1><p className="mt-1 text-sm text-slate-300">Inspeção ligada a produto, OP, máquina, instrumento calibrado e registros reais.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={resetForm} className="rounded-md border border-slate-500 px-4 py-3 text-base font-extrabold text-white"><Plus className="mr-2 inline" size={18}/> NOVA INSPEÇÃO</button><button type="button" onClick={() => void save()} disabled={busy} className="rounded-md bg-sky-600 px-5 py-3 text-base font-extrabold text-white"><Save className="mr-2 inline" size={18}/> SALVAR LAUDO</button><button type="button" onClick={() => window.print()} className="rounded-md border border-slate-500 px-4 py-3 text-base font-extrabold text-white"><Printer className="mr-2 inline" size={18}/> IMPRIMIR</button></div></div></header>
    <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-5 p-4 lg:grid-cols-[280px_minmax(0,1fr)]"><QualitySidebar active="/qualidade/inspecao-processo"/><section className="space-y-5">
      {(error || notice) && <div className={error ? 'rounded-md border border-red-200 bg-red-50 p-4 text-base font-bold text-red-800' : 'rounded-md border border-emerald-200 bg-emerald-50 p-4 text-base font-bold text-emerald-800'}>{error || notice}</div>}
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-extrabold">1. AMARRAÇÃO DE ENTIDADES DA PRODUÇÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EntityCodeLookup label="ITEM / PEÇA" value={produto} records={products} onChange={setProduto} onSelect={record => setProduto(record.id)} required/>
        <EntityCodeLookup label="Nº DA OP" value={op} records={ops} onChange={setOp} onSelect={record => setOp(record.id)} helper="OP real do PCP."/>
        <EntityCodeLookup label="MÁQUINA / POSTO" value={machine} records={machines} onChange={setMachine} onSelect={record => setMachine(record.id)}/>
        <EntityCodeLookup label="INSTRUMENTO DE MEDIÇÃO" value={instrument} records={instruments.map(item => ({ ...item, nome: validInstrument(item) ? item.descricao : item.descricao + ' • BLOQUEADO' }))} onChange={setInstrument} onSelect={record => setInstrument(record.id)} required helper="Somente instrumentos aprovados e vigentes."/>
        <label className={label}>INSPETOR RESPONSÁVEL<input className={input} value={inspetor} onChange={event => setInspetor(event.target.value)} placeholder="Nome do inspetor"/></label>
      </div></section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">2. PLANO / MEDIÇÕES TÉCNICAS</h2><p className="mt-1 text-sm text-slate-600">Use critérios cadastrados no banco ou adicione uma característica explicitamente na inspeção.</p></div><div className="flex flex-wrap gap-2">{plans.slice(0,12).map(plan => <button key={plan.id} type="button" onClick={() => addMeasurement(plan)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50">{plan.codigo} • {plan.caracteristica || 'Característica'}</button>)}<button type="button" onClick={() => addMeasurement()} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-extrabold text-white"><Plus size={15}/> Medição manual</button></div></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-base"><thead className="bg-slate-900 text-white"><tr><th className="p-3 text-left">Característica</th><th className="p-3 text-left">Valor nominal</th><th className="p-3 text-left">Unidade</th><th className="p-3 text-left">Valor encontrado</th><th className="p-3"></th></tr></thead><tbody>
          {medicoes.map((row, index) => <tr key={index} className="border-b border-slate-200"><td className="p-2"><input className={input} value={row.caracteristica} onChange={event => setMedicoes(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, caracteristica: event.target.value } : item))}/></td><td className="p-2"><input className={input} value={row.nominal} onChange={event => setMedicoes(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, nominal: event.target.value } : item))}/></td><td className="p-2"><input className={input} value={row.unidade} onChange={event => setMedicoes(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, unidade: event.target.value } : item))}/></td><td className="p-2"><input className={input} value={row.encontrado} onChange={event => setMedicoes(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, encontrado: event.target.value } : item))}/></td><td className="p-2"><button type="button" onClick={() => setMedicoes(rows => rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-md border border-rose-300 p-3 text-rose-800" title="Remover medição"><Trash2 size={17}/></button></td></tr>)}
          {!medicoes.length && <tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-600">Nenhuma característica adicionada. Se houver Plano de Inspeção, use um dos critérios acima; caso contrário, adicione uma medição manual.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2"><div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-extrabold">3. QUANTIDADE E DECISÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={label}>QTD. INSPECIONADA<input className={input} type="number" min="1" step="any" value={quantidadeInspecionada} onChange={event => setQuantidadeInspecionada(event.target.value)}/></label>
        <label className={label}>QTD. APROVADA<input className={input} type="number" min="0" step="any" value={quantidadeAprovada} onChange={event => setQuantidadeAprovada(event.target.value)}/></label>
        <label className={label}>QTD. REPROVADA<input className={input} type="number" min="0" step="any" value={quantidadeReprovada} onChange={event => setQuantidadeReprovada(event.target.value)}/></label>
        <label className={label}>RESULTADO<select className={input} value={resultado} onChange={event => setResultado(event.target.value)}><option>APROVADO</option><option>REPROVADO</option><option>CONDICIONAL</option></select></label>
        <label className={label}>AÇÃO DE BLOQUEIO<select className={input} value={acaoBloqueio} onChange={event => setAcaoBloqueio(event.target.value)}><option>NENHUMA</option><option>BLOQUEAR_LOTE</option><option>RETER_RETRABALHO</option><option>SEGREGAR</option></select></label>
      </div></div><div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-extrabold">OBSERVAÇÕES DO INSPETOR</h2><textarea className="mt-4 min-h-40 w-full rounded-md border border-slate-300 bg-white p-3 text-base text-slate-900" value={obs} onChange={event => setObs(event.target.value)} placeholder="Registre evidências, desvios e decisão técnica."/></div></section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-extrabold">4. HISTÓRICO RECENTE</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3">Tipo</th><th className="p-3">Resultado</th><th className="p-3">Inspecionada</th><th className="p-3">Aprovada</th><th className="p-3">Reprovada</th><th className="p-3">OP</th><th className="p-3">Ação</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="h-[54px] border-b border-slate-200"><td className="p-3">{item.tipo}</td><td className="p-3 font-bold">{item.resultado}</td><td className="p-3">{item.quantidade_inspecionada}</td><td className="p-3">{item.quantidade_aprovada}</td><td className="p-3">{item.quantidade_reprovada}</td><td className="p-3">{item.ordem_producao_id || '—'}</td><td className="p-3">{item.acao_bloqueio || '—'}</td></tr>)}{!history.length && <tr><td colSpan={7} className="p-6 text-center text-slate-600">Nenhuma inspeção registrada.</td></tr>}</tbody></table></div></section>
    </section></div>
  </main>
}
