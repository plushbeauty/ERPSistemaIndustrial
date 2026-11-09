/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-SGQ-INSPECAO-TEMPLATE-VIGENTE-20261108-01 — inspeção em processo exige template publicado, revisão e snapshot imutável; removida inclusão ad-hoc de medições
 * @STATUS_APROVACAO: INCREMENTO FUNCIONAL AUTORIZADO NA ORDEM ORDEM-EXECUCAO-SYSNQRA-20261108-01; preservado o fluxo visual industrial
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import VendasLayout from '../VendasLayout'
import EntityCodeLookup, { type LookupRecord } from '../../components/industrial/EntityCodeLookup'
import { fieldClass as input, labelClass as label } from '../../components/industrial/forms/industrialFormStyles'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import { relogioDoServidor } from '../../lib/serverClock'

type Lookup = LookupRecord
type Product = { id: string; codigo: string; nome: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null; status: string | null }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Template = {
  id: string
  codigo: string
  nome: string
  produto_id: string | null
  operacao: string
  revisao: number
  status: string
  vigencia_inicio: string | null
  vigencia_fim: string | null
}
type TemplateItem = {
  id: string
  template_id: string
  sequencia: number
  codigo_item: string
  caracteristica: string
  metodo: string | null
  unidade: string | null
  valor_nominal: number | null
  limite_inferior: number | null
  limite_superior: number | null
  tipo_resposta: 'NUMERICO' | 'TEXTO' | 'SIM_NAO' | 'CONFORME_NAO_CONFORME'
  criticidade: string
  obrigatorio: boolean
  instrucoes: string | null
}
type Measurement = {
  template_item_id: string
  codigo_item: string
  caracteristica: string
  nominal: string
  limite_inferior: string
  limite_superior: string
  encontrado: string
  unidade: string
  metodo: string
  tipo_resposta: TemplateItem['tipo_resposta']
  criticidade: string
  obrigatorio: boolean
  instrucoes: string
}
type InspectionRow = {
  id: string
  tipo: string
  resultado: string
  quantidade_inspecionada: number
  quantidade_aprovada: number
  quantidade_reprovada: number
  ordem_producao_id: string | null
  inspetor_nome: string | null
  template_revisao: number | null
  created_at: string
}

const moneyDate = (value: string) => new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')
const emptyMeasurement = (item: TemplateItem): Measurement => ({
  template_item_id: item.id,
  codigo_item: item.codigo_item,
  caracteristica: item.caracteristica,
  nominal: item.valor_nominal == null ? '' : String(item.valor_nominal),
  limite_inferior: item.limite_inferior == null ? '' : String(item.limite_inferior),
  limite_superior: item.limite_superior == null ? '' : String(item.limite_superior),
  encontrado: '',
  unidade: item.unidade ?? '',
  metodo: item.metodo ?? '',
  tipo_resposta: item.tipo_resposta,
  criticidade: item.criticidade,
  obrigatorio: item.obrigatorio,
  instrucoes: item.instrucoes ?? '',
})

export default function QualidadeInspecaoProcessoVersionada() {
  const [empresaId, setEmpresaId] = useState('')
  const [today, setToday] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [ops, setOps] = useState<Lookup[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [history, setHistory] = useState<InspectionRow[]>([])
  const [produto, setProduto] = useState('')
  const [op, setOp] = useState('')
  const [machine, setMachine] = useState('')
  const [instrument, setInstrument] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [inspetor, setInspetor] = useState('')
  const [resultado, setResultado] = useState('APROVADO')
  const [acaoBloqueio, setAcaoBloqueio] = useState('NENHUMA')
  const [quantidadeInspecionada, setQuantidadeInspecionada] = useState('')
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('')
  const [obs, setObs] = useState('')
  const [medicoes, setMedicoes] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [company, clock] = await Promise.all([
        supabase.rpc('erp_current_empresa_id'),
        relogioDoServidor(),
      ])
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      if (!clock.agora) throw new Error('Relógio do servidor indisponível para validar vigência de templates e calibrações.')
      const tenant = String(company.data)
      const serverDate = clock.agora.toISOString().slice(0, 10)
      setEmpresaId(tenant)
      setToday(serverDate)

      const [productRows, opRows, machineRows, instrumentRows, templateRows, inspectionRows] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome', { count: 'exact' })
          .eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<{ id: string; numero_op: string; produto_id: string | null; status: string }>((from, to) => supabase.from('erp_ordens_producao')
          .select('id,numero_op,produto_id,status', { count: 'exact' })
          .eq('empresa_id', tenant).order('numero_op', { ascending: false }).range(from, to)),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas')
          .select('id,codigo,nome,tipo,status', { count: 'exact' })
          .eq('empresa_id', tenant).neq('status', 'INATIVA').order('codigo').range(from, to)),
        fetchAllPages<Instrument>((from, to) => supabase.from('erp_equipamentos_medicao')
          .select('id,codigo,descricao,status,proxima_calibracao', { count: 'exact' })
          .eq('empresa_id', tenant).order('codigo').range(from, to)),
        fetchAllPages<Template>((from, to) => supabase.from('erp_qualidade_inspecao_templates')
          .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim', { count: 'exact' })
          .eq('empresa_id', tenant).eq('operacao', 'PROCESSO_METROLOGIA').eq('status', 'VIGENTE')
          .lte('vigencia_inicio', serverDate)
          .or('vigencia_fim.is.null,vigencia_fim.gte.' + serverDate)
          .order('codigo').order('revisao', { ascending: false }).range(from, to)),
        fetchAllPages<InspectionRow>((from, to) => supabase.from('erp_inspecoes')
          .select('id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,ordem_producao_id,inspetor_nome,template_revisao,created_at', { count: 'exact' })
          .eq('empresa_id', tenant).eq('tipo', 'PROCESSO_METROLOGIA')
          .order('created_at', { ascending: false }).range(from, to)),
      ])
      const templateIds = templateRows.map(row => row.id)
      const itemRows = templateIds.length
        ? await fetchAllPages<TemplateItem>((from, to) => supabase.from('erp_qualidade_inspecao_template_itens')
          .select('id,template_id,sequencia,codigo_item,caracteristica,metodo,unidade,valor_nominal,limite_inferior,limite_superior,tipo_resposta,criticidade,obrigatorio,instrucoes', { count: 'exact' })
          .eq('empresa_id', tenant).in('template_id', templateIds).order('sequencia').range(from, to))
        : []

      setProducts(productRows)
      setOps(opRows.map(row => ({ id: row.id, codigo: row.numero_op, nome: row.status, documento: row.produto_id ?? '' })))
      setMachines(machineRows)
      setInstruments(instrumentRows)
      setTemplates(templateRows)
      setTemplateItems(itemRows)
      setHistory(inspectionRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados reais da inspeção.')
      setTemplates([])
      setTemplateItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const availableTemplates = useMemo(() => templates.filter(template =>
    !template.produto_id || template.produto_id === produto
  ), [templates, produto])
  const selectedTemplate = templates.find(template => template.id === templateId) ?? null
  const selectedItems = useMemo(() => templateItems
    .filter(item => item.template_id === templateId)
    .sort((a, b) => a.sequencia - b.sequencia), [templateItems, templateId])
  const invalidInstrument = (item: Instrument) =>
    item.status.toUpperCase() !== 'APROVADO' || !item.proxima_calibracao || !today || item.proxima_calibracao < today
  const outOfRange = useMemo(() => medicoes.some(item => {
    if (item.tipo_resposta !== 'NUMERICO' || item.encontrado.trim() === '') return false
    const value = Number(item.encontrado)
    if (!Number.isFinite(value)) return true
    return (item.limite_inferior !== '' && value < Number(item.limite_inferior))
      || (item.limite_superior !== '' && value > Number(item.limite_superior))
  }), [medicoes])

  const resetForm = () => {
    setProduto('')
    setOp('')
    setMachine('')
    setInstrument('')
    setTemplateId('')
    setInspetor('')
    setResultado('APROVADO')
    setAcaoBloqueio('NENHUMA')
    setQuantidadeInspecionada('')
    setQuantidadeAprovada('')
    setQuantidadeReprovada('')
    setObs('')
    setMedicoes([])
    setNotice('Nova inspeção pronta. Selecione produto e template vigente.')
    setError('')
  }

  const changeProduct = (value: string) => {
    setProduto(value)
    setTemplateId('')
    setMedicoes([])
  }

  const changeTemplate = (id: string) => {
    setTemplateId(id)
    const items = templateItems.filter(item => item.template_id === id).sort((a, b) => a.sequencia - b.sequencia)
    setMedicoes(items.map(emptyMeasurement))
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      if (!produto) throw new Error('Informe o produto.')
      if (!selectedTemplate) throw new Error('Selecione um template de inspeção vigente. Medição manual não é permitida.')
      if (selectedTemplate.produto_id && selectedTemplate.produto_id !== produto) throw new Error('O template selecionado pertence a outro produto.')
      if (!selectedItems.length || medicoes.length !== selectedItems.length) throw new Error('O template não possui itens válidos para inspeção.')
      if (!instrument) throw new Error('Selecione o instrumento de medição.')
      const selectedInstrument = instruments.find(item => item.id === instrument)
      if (!selectedInstrument || invalidInstrument(selectedInstrument)) throw new Error('Instrumento bloqueado: somente calibração APROVADA e vigente pode participar da inspeção.')
      if (medicoes.some(item => item.obrigatorio && !item.encontrado.trim())) throw new Error('Preencha todos os resultados obrigatórios do template.')
      if (medicoes.some(item => item.tipo_resposta === 'NUMERICO' && item.encontrado.trim() && !Number.isFinite(Number(item.encontrado)))) {
        throw new Error('Há resultado numérico inválido no template.')
      }
      if (outOfRange && resultado === 'APROVADO') throw new Error('Há medição fora dos limites do template. Altere o resultado para REPROVADO ou corrija a medição.')
      const inspected = Number(quantidadeInspecionada)
      const approved = Number(quantidadeAprovada)
      const rejected = Number(quantidadeReprovada)
      if (!Number.isFinite(inspected) || inspected <= 0) throw new Error('Informe a quantidade inspecionada.')
      if (!Number.isFinite(approved) || approved < 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error('Informe quantidades aprovadas e reprovadas válidas.')
      if (approved + rejected !== inspected) throw new Error('Aprovadas + reprovadas deve ser igual à quantidade inspecionada.')
      if (resultado !== 'APROVADO' && acaoBloqueio === 'NENHUMA') throw new Error('Inspeção não aprovada exige uma ação de bloqueio.')

      const user = await supabase.auth.getUser()
      const snapshot = {
        id: selectedTemplate.id,
        codigo: selectedTemplate.codigo,
        revisao: selectedTemplate.revisao,
        nome: selectedTemplate.nome,
        produto_id: selectedTemplate.produto_id,
        operacao: selectedTemplate.operacao,
        itens: selectedItems.map(item => ({
          id: item.id,
          codigo_item: item.codigo_item,
          caracteristica: item.caracteristica,
          metodo: item.metodo,
          unidade: item.unidade,
          valor_nominal: item.valor_nominal,
          limite_inferior: item.limite_inferior,
          limite_superior: item.limite_superior,
          tipo_resposta: item.tipo_resposta,
          criticidade: item.criticidade,
          obrigatorio: item.obrigatorio,
          instrucoes: item.instrucoes,
        })),
      }
      const result = await supabase.from('erp_inspecoes').insert({
        empresa_id: empresaId,
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
        template_id: selectedTemplate.id,
        template_revisao: selectedTemplate.revisao,
        template_snapshot: snapshot,
        medicoes: medicoes.map(item => ({
          ...item,
          nominal: item.nominal.trim(),
          encontrado: item.encontrado.trim(),
          unidade: item.unidade.trim(),
        })),
        acao_bloqueio: resultado === 'APROVADO' ? 'NENHUMA' : acaoBloqueio,
        criado_por: user.data.user?.id ?? null,
      })
      if (result.error) throw result.error
      setNotice('Inspeção salva no banco real com revisão e snapshot imutável do template.')
      resetForm()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar inspeção.')
    } finally {
      setBusy(false)
    }
  }

  const productRecords = products.map(product => ({ id: product.id, codigo: product.codigo, nome: product.nome }))
  const opRecords = ops
  const machineRecords = machines.map(machineRow => ({ id: machineRow.id, codigo: machineRow.codigo, nome: machineRow.nome }))

  return (
    <VendasLayout
      title="Inspeção em processo — template versionado"
      subtitle="Toda inspeção usa critérios publicados por revisão; não existe inclusão manual de características."
      onRefresh={() => void load()}
      topContent={
        <div className="flex flex-wrap items-center justify-between gap-2 border border-[#C8E3EE] bg-[#EAF6FA] px-3 py-2 text-[#123B50]">
          <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#2D8DB8]" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">SGQ · INSPEÇÃO CONTROLADA POR TEMPLATE</p></div>
          <Link to="/pageprincipal/qualidade/templates-inspecao" className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white">Gerenciar templates →</Link>
        </div>
      }
    >
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={error ? 'border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800' : 'border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800'}>{error || notice}</p>}
      <section className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#176487]">1. Produto, OP e máquina</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <EntityCodeLookup label="ITEM / PEÇA" value={produto} records={productRecords} onChange={changeProduct} onSelect={record => changeProduct(record.id)} required />
            <EntityCodeLookup label="Nº DA OP" value={op} records={opRecords} onChange={setOp} onSelect={record => setOp(record.id)} />
            <EntityCodeLookup label="MÁQUINA / POSTO" value={machine} records={machineRecords} onChange={setMachine} onSelect={record => setMachine(record.id)} />
            <label className={label}>INSTRUMENTO DE MEDIÇÃO
              <select className={input} value={instrument} onChange={event => setInstrument(event.target.value)}>
                <option value="">Selecione instrumento vigente</option>
                {instruments.map(item => <option key={item.id} value={item.id} disabled={invalidInstrument(item)}>{item.codigo} · {item.descricao}{invalidInstrument(item) ? ' · BLOQUEADO' : ''}</option>)}
              </select>
            </label>
            <label className={label}>INSPETOR RESPONSÁVEL<input className={input} value={inspetor} onChange={event => setInspetor(event.target.value)} placeholder="Nome do inspetor" /></label>
          </div>
        </article>
        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#176487]">2. Template vigente</h2>
          <label className={label}>CRITÉRIO DE INSPEÇÃO
            <select className={input} value={templateId} onChange={event => changeTemplate(event.target.value)} disabled={!produto}>
              <option value="">{produto ? 'Selecione template publicado para o produto' : 'Selecione primeiro o produto'}</option>
              {availableTemplates.map(template => <option key={template.id} value={template.id}>{template.codigo} · R{template.revisao} · {template.nome}</option>)}
            </select>
          </label>
          {selectedTemplate ? <p className="mt-2 border border-emerald-200 bg-emerald-50 p-2 text-[9px] text-emerald-900">Vigente desde {selectedTemplate.vigencia_inicio ? moneyDate(selectedTemplate.vigencia_inicio) : '—'} · {selectedItems.length} característica(s) controlada(s).</p>
            : <p className="mt-2 border border-amber-200 bg-amber-50 p-2 text-[9px] text-amber-900">Sem template vigente selecionado. A inspeção não poderá ser salva com medições avulsas.</p>}
        </article>
      </section>

      <section className="border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-[10px] font-black uppercase tracking-wider text-[#176487]">3. Medições do template</h2><p className="text-[9px] text-slate-500">Os critérios publicados são somente leitura; registre apenas o resultado encontrado.</p></div>
          {outOfRange && <span className="inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-800"><AlertTriangle size={12} /> Resultado fora de limite</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-[10px]">
            <thead className="bg-[#EAF4F7] text-[9px] uppercase"><tr>
              <th className="h-[30px] px-2">Código / característica</th><th className="px-2">Método</th><th className="px-2">Nominal</th><th className="px-2">Limites</th><th className="px-2">Unidade</th><th className="px-2">Resultado encontrado</th><th className="px-2">Criticidade</th>
            </tr></thead>
            <tbody>
              {medicoes.map((item, index) => <tr key={item.template_item_id} className="h-[34px] border-t border-slate-100">
                <td className="px-2 py-1"><strong>{item.codigo_item}</strong><br />{item.caracteristica}{item.obrigatorio ? ' *' : ''}</td>
                <td className="px-2">{item.metodo || '—'}</td>
                <td className="px-2">{item.nominal || '—'}</td>
                <td className="px-2">{item.limite_inferior || '—'} a {item.limite_superior || '—'}</td>
                <td className="px-2">{item.unidade || '—'}</td>
                <td className="px-2">
                  {item.tipo_resposta === 'SIM_NAO' || item.tipo_resposta === 'CONFORME_NAO_CONFORME'
                    ? <select className={input} value={item.encontrado} onChange={event => setMedicoes(rows => rows.map((row, i) => i === index ? { ...row, encontrado: event.target.value } : row))}>
                      <option value="">Selecione</option>
                      {(item.tipo_resposta === 'SIM_NAO' ? ['SIM', 'NÃO'] : ['CONFORME', 'NÃO CONFORME']).map(value => <option key={value}>{value}</option>)}
                    </select>
                    : <input className={input} type={item.tipo_resposta === 'NUMERICO' ? 'number' : 'text'} step={item.tipo_resposta === 'NUMERICO' ? 'any' : undefined} value={item.encontrado} onChange={event => setMedicoes(rows => rows.map((row, i) => i === index ? { ...row, encontrado: event.target.value } : row))} placeholder={item.obrigatorio ? 'Obrigatório' : 'Opcional'} />}
                </td>
                <td className="px-2">{item.criticidade}</td>
              </tr>)}
              {!medicoes.length && <tr><td colSpan={7} className="p-8 text-center text-slate-600">{loading ? 'Carregando templates vigentes...' : 'Selecione produto e template vigente para carregar as características controladas.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#176487]">4. Quantidade e decisão</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className={label}>QTD. INSPECIONADA<input className={input} type="number" min="1" step="any" value={quantidadeInspecionada} onChange={event => setQuantidadeInspecionada(event.target.value)} /></label>
            <label className={label}>QTD. APROVADA<input className={input} type="number" min="0" step="any" value={quantidadeAprovada} onChange={event => setQuantidadeAprovada(event.target.value)} /></label>
            <label className={label}>QTD. REPROVADA<input className={input} type="number" min="0" step="any" value={quantidadeReprovada} onChange={event => setQuantidadeReprovada(event.target.value)} /></label>
            <label className={label}>RESULTADO<select className={input} value={resultado} onChange={event => setResultado(event.target.value)}><option>APROVADO</option><option>REPROVADO</option><option>CONDICIONAL</option></select></label>
            <label className={label}>AÇÃO DE BLOQUEIO<select className={input} value={acaoBloqueio} onChange={event => setAcaoBloqueio(event.target.value)}><option>NENHUMA</option><option>BLOQUEAR_LOTE</option><option>RETER_RETRABALHO</option><option>SEGREGAR</option></select></label>
          </div>
        </article>
        <article className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#176487]">Observações do inspetor</h2>
          <textarea className="min-h-28 w-full border border-slate-300 bg-white p-2 text-[10px] text-[#123B50]" value={obs} onChange={event => setObs(event.target.value)} placeholder="Registre evidências, desvios e decisão técnica." />
        </article>
      </section>

      <section className="border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-[10px] font-black uppercase tracking-wider text-[#176487]">5. Histórico recente</h2><span className="text-[9px] text-slate-500">Somente inspeções persistidas no Supabase</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-[10px]">
          <thead className="bg-[#EAF4F7] text-[9px] uppercase"><tr><th className="h-[30px] px-2">Data</th><th className="px-2">Resultado</th><th className="px-2">Inspecionada</th><th className="px-2">Aprovada</th><th className="px-2">Reprovada</th><th className="px-2">Revisão</th><th className="px-2">Inspetor</th></tr></thead>
          <tbody>{history.slice(0, 30).map(item => <tr key={item.id} className="h-[30px] border-t border-slate-100">
            <td className="px-2">{new Date(item.created_at).toLocaleString('pt-BR')}</td><td className="px-2 font-bold">{item.resultado}</td><td className="px-2">{item.quantidade_inspecionada}</td><td className="px-2">{item.quantidade_aprovada}</td><td className="px-2">{item.quantidade_reprovada}</td><td className="px-2">{item.template_revisao ?? '—'}</td><td className="px-2">{item.inspetor_nome || '—'}</td>
          </tr>)}{!history.length && <tr><td colSpan={7} className="p-6 text-center text-slate-600">Nenhuma inspeção registrada para esta empresa.</td></tr>}</tbody>
        </table></div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-[#D8E8EE] bg-white px-3 py-2">
        <p className="text-[9px] text-slate-500">Empresa: {empresaId || '—'} · Data do servidor: {today || '—'}</p>
        <div className="flex gap-2">
          <button type="button" onClick={resetForm} disabled={busy} className="inline-flex h-[30px] items-center border border-slate-300 px-3 text-[10px] font-bold text-slate-700">LIMPAR</button>
          <button type="button" onClick={() => void load()} disabled={busy || loading} className="inline-flex h-[30px] items-center gap-1 border border-slate-300 px-3 text-[10px] font-bold text-slate-700"><RefreshCw size={13} /> ATUALIZAR</button>
          <button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50"><Save size={13} /> SALVAR INSPEÇÃO</button>
        </div>
      </div>
    </VendasLayout>
  )
}
