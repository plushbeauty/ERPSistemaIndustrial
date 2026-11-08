/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-INSPECAO-TEMPLATE-VERSIONADO-20261108-01 — inspeção em processo exige template vigente e snapshot de revisão
 * @STATUS_APROVACAO: INCREMENTO FUNCIONAL AUTORIZADO NA ORDEM DE EXECUÇÃO DE 2026-11-08; fluxo de inspeção preservado
 */
/**
 * SYSNQRA ERP INDUSTRIAL — QUALIDADE / INSPEÇÃO EM PROCESSO
 * Data: 2026-11-08 | Revisão: REV-INSPECAO-TEMPLATE-20261108-01
 * Escopo: inspeção baseada em template vigente, revisão imutável e snapshot persistido; sem fallback ad-hoc.
 */
import { useEffect, useState } from 'react'
import { ClipboardList, Printer, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { relogioDoServidor } from '../lib/serverClock'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import { fieldClass as input, labelClass as label } from '../components/industrial/forms/industrialFormStyles'

type Lookup = LookupRecord
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type InspectionTemplate = { id: string; codigo: string; nome: string; produto_id: string | null; operacao: string; revisao: number; status: string; vigencia_inicio: string | null; vigencia_fim: string | null }
type TemplateItem = { id: string; sequencia: number; codigo_item: string; caracteristica: string; metodo: string | null; unidade: string | null; valor_nominal: number | null; limite_inferior: number | null; limite_superior: number | null; tipo_resposta: string; criticidade: string; obrigatorio: boolean; instrucoes: string | null }
type InspectionRow = { id: string; produto_id: string | null; ordem_producao_id: string | null; maquina_id: string | null; tipo: string; resultado: string; quantidade_inspecionada: number; quantidade_aprovada: number; quantidade_reprovada: number; observacao: string | null; inspetor_nome: string | null; medicoes: unknown; acao_bloqueio: string | null; template_id: string | null; template_revisao: number | null; template_snapshot: unknown }

type Measurement = { template_item_id: string; codigo_item: string; caracteristica: string; metodo: string | null; nominal: string; encontrado: string; unidade: string | null; limite_inferior: number | null; limite_superior: number | null; tipo_resposta: string; criticidade: string; obrigatorio: boolean; instrucoes: string | null; resultado: 'APROVADO' | 'REPROVADO' | 'NAO_AVALIADO' }

function validInstrument(item: Instrument): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today)
}

export default function QualidadeInspecaoProcesso() {
  const [products, setProducts] = useState<Lookup[]>([])
  const [ops, setOps] = useState<Lookup[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
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
      const relogio = await relogioDoServidor()
      if (!relogio.agora) throw new Error('Relógio do servidor indisponível para validar a vigência do template.')
      const hoje = relogio.agora.toISOString().slice(0, 10)
      const [productsResult, opsResult, machinesResult, instrumentsResult, templatesResult, inspectionsResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome,descricao').eq('empresa_id', company.data).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status').eq('empresa_id', company.data).order('numero_op', { ascending: false }).limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', company.data).not('status', 'eq', 'INATIVA').order('codigo'),
        supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao').eq('empresa_id', company.data).order('codigo'),
        supabase.from('erp_qualidade_inspecao_templates')
          .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim')
          .eq('empresa_id', company.data).eq('status', 'VIGENTE').eq('operacao', 'PROCESSO_METROLOGIA')
          .lte('vigencia_inicio', hoje).or(`vigencia_fim.is.null,vigencia_fim.gte.${hoje}`).order('codigo'),
        supabase.from('erp_inspecoes').select('id,produto_id,ordem_producao_id,maquina_id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,observacao,inspetor_nome,medicoes,acao_bloqueio,template_id,template_revisao,template_snapshot').eq('empresa_id', company.data).order('created_at', { ascending: false }).limit(100),
      ])
      for (const result of [productsResult, opsResult, machinesResult, instrumentsResult, templatesResult, inspectionsResult]) if (result.error) throw result.error
      setProducts((productsResult.data ?? []) as Lookup[])
      setOps((opsResult.data ?? []).map(row => ({ id: String(row.id), codigo: String(row.numero_op), nome: String(row.status), documento: String(row.produto_id ?? '') })) as Lookup[])
      setMachines((machinesResult.data ?? []) as Machine[])
      setInstruments((instrumentsResult.data ?? []) as Instrument[])
      setTemplates((templatesResult.data ?? []) as InspectionTemplate[])
      setHistory((inspectionsResult.data ?? []) as InspectionRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a inspeção em processo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selectedTemplate = templates.find(template => template.id === selectedTemplateId) ?? null
  const availableTemplates = templates.filter(template => !template.produto_id || (produto && template.produto_id === produto))

  async function selectTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    setTemplateItems([])
    setMedicoes([])
    setError('')
    if (!templateId) return
    const template = templates.find(item => item.id === templateId)
    if (!template) { setError('Template não encontrado na empresa atual.'); return }
    if (template.produto_id && template.produto_id !== produto) { setError('Este template pertence a outro produto.'); setSelectedTemplateId(''); return }
    setBusy(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const result = await supabase.from('erp_qualidade_inspecao_template_itens')
        .select('id,sequencia,codigo_item,caracteristica,metodo,unidade,valor_nominal,limite_inferior,limite_superior,tipo_resposta,criticidade,obrigatorio,instrucoes')
        .eq('empresa_id', company.data).eq('template_id', templateId).order('sequencia')
      if (result.error) throw result.error
      const loaded = (result.data ?? []) as TemplateItem[]
      if (!loaded.length) throw new Error('Template vigente sem itens. Corrija o template antes de inspecionar.')
      setTemplateItems(loaded)
      setMedicoes(loaded.map(item => ({
        template_item_id: item.id,
        codigo_item: item.codigo_item,
        caracteristica: item.caracteristica,
        metodo: item.metodo,
        nominal: item.valor_nominal == null ? '' : String(item.valor_nominal),
        encontrado: '',
        unidade: item.unidade,
        limite_inferior: item.limite_inferior,
        limite_superior: item.limite_superior,
        tipo_resposta: item.tipo_resposta,
        criticidade: item.criticidade,
        obrigatorio: item.obrigatorio,
        instrucoes: item.instrucoes,
        resultado: 'NAO_AVALIADO' as const,
      })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os itens do template.')
      setSelectedTemplateId('')
    } finally {
      setBusy(false)
    }
  }

  function updateMeasurement(index: number, value: string) {
    setMedicoes(rows => rows.map((item, rowIndex) => {
      if (rowIndex !== index) return item
      let itemResult: Measurement['resultado'] = 'NAO_AVALIADO'
      if (item.tipo_resposta === 'NUMERICO' && value.trim()) {
        const number = Number(value)
        if (Number.isFinite(number)) itemResult = (item.limite_inferior !== null && number < item.limite_inferior) || (item.limite_superior !== null && number > item.limite_superior) ? 'REPROVADO' : 'APROVADO'
      } else if (item.tipo_resposta === 'SIM_NAO') {
        itemResult = value === 'NAO' ? 'REPROVADO' : value === 'SIM' ? 'APROVADO' : 'NAO_AVALIADO'
      } else if (item.tipo_resposta === 'CONFORME_NAO_CONFORME') {
        itemResult = value === 'NAO_CONFORME' ? 'REPROVADO' : value === 'CONFORME' ? 'APROVADO' : 'NAO_AVALIADO'
      }
      return { ...item, encontrado: value, resultado: itemResult }
    }))
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
    setSelectedTemplateId('')
    setTemplateItems([])
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
      if (!selectedTemplate) throw new Error('Selecione um template vigente. Inspeção manual sem template não é permitida.')
      if (!templateItems.length || medicoes.length !== templateItems.length) throw new Error('Template sem itens ou resultados incompletos.')
      if (!instrument) throw new Error('Selecione o instrumento de medição.')
      const selectedInstrument = instruments.find(item => item.id === instrument)
      if (!selectedInstrument || !validInstrument(selectedInstrument)) throw new Error('Instrumento bloqueado: somente calibração APROVADA e vigente pode participar da inspeção.')
      const inspected = Number(quantidadeInspecionada)
      const approved = Number(quantidadeAprovada)
      const rejected = Number(quantidadeReprovada)
      if (!Number.isFinite(inspected) || inspected <= 0) throw new Error('Informe a quantidade inspecionada.')
      if (!Number.isFinite(approved) || approved < 0 || !Number.isFinite(rejected) || rejected < 0) throw new Error('Informe quantidades aprovadas e reprovadas válidas.')
      if (approved + rejected !== inspected) throw new Error('Aprovadas + reprovadas deve ser igual à quantidade inspecionada.')
      if (medicoes.some(item => item.obrigatorio && !item.encontrado.trim())) throw new Error('Preencha todos os itens obrigatórios do template.')
      if (medicoes.some(item => item.tipo_resposta === 'NUMERICO' && item.encontrado.trim() && !Number.isFinite(Number(item.encontrado)))) throw new Error('Há medição numérica inválida.')
      const resultadoFinal = medicoes.some(item => item.resultado === 'REPROVADO') || rejected > 0 ? 'REPROVADO' : resultado
      if (resultadoFinal !== 'APROVADO' && acaoBloqueio === 'NENHUMA') throw new Error('Inspeção não aprovada exige uma ação de bloqueio.')
      const snapshot = {
        codigo: selectedTemplate.codigo,
        nome: selectedTemplate.nome,
        revisao: selectedTemplate.revisao,
        operacao: selectedTemplate.operacao,
        produto_id: selectedTemplate.produto_id,
        itens: templateItems.map(item => ({
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
        empresa_id: company.data,
        produto_id: produto,
        lote_id: null,
        ordem_producao_id: op || null,
        maquina_id: machine || null,
        tipo: 'PROCESSO_METROLOGIA',
        template_id: selectedTemplate.id,
        template_revisao: selectedTemplate.revisao,
        template_snapshot: snapshot,
        resultado: resultadoFinal,
        quantidade_inspecionada: inspected,
        quantidade_aprovada: approved,
        quantidade_reprovada: rejected,
        observacao: obs.trim() || null,
        inspetor_nome: inspetor.trim() || null,
        medicoes: medicoes.map(item => ({
          template_item_id: item.template_item_id,
          codigo_item: item.codigo_item,
          caracteristica: item.caracteristica,
          metodo: item.metodo,
          nominal: item.nominal,
          encontrado: item.encontrado.trim(),
          unidade: item.unidade,
          limite_inferior: item.limite_inferior,
          limite_superior: item.limite_superior,
          tipo_resposta: item.tipo_resposta,
          criticidade: item.criticidade,
          obrigatorio: item.obrigatorio,
          instrucoes: item.instrucoes,
          resultado: item.resultado,
        })),
        acao_bloqueio: resultadoFinal === 'APROVADO' ? 'NENHUMA' : acaoBloqueio,
        criado_por: user.data.user?.id || null,
      })
      if (result.error) throw result.error
      setNotice(`Laudo salvo com template ${selectedTemplate.codigo} R${selectedTemplate.revisao} no banco real.`)
      resetForm()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar inspeção.')
    } finally {
      setBusy(false)
    }
  }

  return <main data-quality-workspace className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white"><div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3"><div><p className="text-sm font-extrabold uppercase tracking-widest text-sky-300">MÓDULO: QUALIDADE • INSPEÇÃO EM PROCESSO</p><h1 className="text-[15px] font-extrabold">Laudo de Inspeção de Produto</h1><p className="mt-1 text-sm text-slate-300">Inspeção ligada a produto, OP, máquina, instrumento calibrado e registros reais.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={resetForm} className="inline-flex h-8 items-center rounded-[2px] border border-slate-500 px-3 text-[10px] font-bold text-white"><Plus className="mr-1 inline" size={14}/> NOVA INSPEÇÃO</button><button type="button" onClick={() => void save()} disabled={busy} className="inline-flex h-8 items-center rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50"><Save className="mr-1 inline" size={14}/> SALVAR LAUDO</button><button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center rounded-[2px] border border-slate-500 px-3 text-[10px] font-bold text-white"><Printer className="mr-1 inline" size={14}/> IMPRIMIR</button></div></div></header>
    <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-3 p-3"><section className="min-w-0 space-y-5">
      {(error || notice) && <div className={error ? 'rounded-[2px] border border-red-200 bg-red-50 p-4 text-[11px] font-bold text-red-800' : 'rounded-[2px] border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-bold text-emerald-800'}>{error || notice}</div>}
      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">1. AMARRAÇÃO DE ENTIDADES DA PRODUÇÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EntityCodeLookup label="ITEM / PEÇA" value={produto} records={products} onChange={value => { setProduto(value); setSelectedTemplateId(''); setTemplateItems([]); setMedicoes([]) }} onSelect={record => { setProduto(record.id); setSelectedTemplateId(''); setTemplateItems([]); setMedicoes([]) }} required/>
        <EntityCodeLookup label="Nº DA OP" value={op} records={ops} onChange={setOp} onSelect={record => setOp(record.id)} helper="OP real do PCP."/>
        <EntityCodeLookup label="MÁQUINA / POSTO" value={machine} records={machines} onChange={setMachine} onSelect={record => setMachine(record.id)}/>
        <EntityCodeLookup label="INSTRUMENTO DE MEDIÇÃO" value={instrument} records={instruments.map(item => ({ ...item, nome: validInstrument(item) ? item.descricao : item.descricao + ' • BLOQUEADO' }))} onChange={setInstrument} onSelect={record => setInstrument(record.id)} required helper="Somente instrumentos aprovados e vigentes."/>
        <label className={label}>INSPETOR RESPONSÁVEL<input className={input} value={inspetor} onChange={event => setInspetor(event.target.value)} placeholder="Nome do inspetor"/></label>
      </div></section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[13px] font-extrabold">2. TEMPLATE VIGENTE / MEDIÇÕES TÉCNICAS</h2><p className="mt-1 text-sm text-slate-600">Critérios e limites vêm da revisão vigente do template; não existe inclusão manual de características.</p></div>
          <Link to="/pageprincipal/qualidade/templates-inspecao" className="inline-flex h-8 items-center gap-1 border border-[#2D8DB8] px-3 text-[10px] font-bold text-[#176487]"><ClipboardList size={14}/> Gerenciar templates</Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className={label}>TEMPLATE VIGENTE *<select className={input} value={selectedTemplateId} onChange={event => void selectTemplate(event.target.value)} disabled={!produto || busy}><option value="">Selecione o template da operação…</option>{availableTemplates.map(template => <option key={template.id} value={template.id}>{template.codigo} · R{template.revisao} · {template.nome}</option>)}</select></label>
          {selectedTemplate && <div className="flex items-end pb-1 text-[10px] font-bold text-emerald-700">VIGENTE · R{selectedTemplate.revisao}</div>}
        </div>
        {selectedTemplate && <p className="mt-2 border border-[#C8E3EE] bg-[#EAF6FA] p-2 text-[9px] text-[#123B50]">Template: <strong>{selectedTemplate.codigo} — {selectedTemplate.nome}</strong> · operação <strong>{selectedTemplate.operacao}</strong> · revisão imutável <strong>R{selectedTemplate.revisao}</strong>.</p>}
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1050px] border-collapse text-[10px]"><thead className="bg-slate-900 text-white"><tr><th className="p-2 text-left">Item / característica</th><th className="p-2 text-left">Método / critério</th><th className="p-2 text-left">Nominal / limites</th><th className="p-2 text-left">Unidade</th><th className="p-2 text-left">Valor encontrado</th><th className="p-2 text-left">Resultado</th></tr></thead><tbody>
          {medicoes.map((row, index) => <tr key={row.template_item_id} className="border-b border-slate-200 align-middle"><td className="p-2"><strong>{row.codigo_item} · {row.caracteristica}</strong><span className="block text-[8px] text-slate-500">{row.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL'} · {row.criticidade}</span>{row.instrucoes && <span className="block text-[8px] text-slate-500">{row.instrucoes}</span>}</td><td className="p-2">{row.metodo || '—'}<span className="block text-[8px] text-slate-500">{row.tipo_resposta}</span></td><td className="p-2">{row.nominal || '—'}<span className="block text-[8px] text-slate-500">Min: {row.limite_inferior ?? '—'} · Máx: {row.limite_superior ?? '—'}</span></td><td className="p-2">{row.unidade || '—'}</td><td className="p-2">{row.tipo_resposta === 'NUMERICO' ? <input type="number" step="any" className={input} value={row.encontrado} onChange={event => updateMeasurement(index, event.target.value)} /> : row.tipo_resposta === 'TEXTO' ? <input className={input} value={row.encontrado} onChange={event => updateMeasurement(index, event.target.value)} /> : <select className={input} value={row.encontrado} onChange={event => updateMeasurement(index, event.target.value)}><option value="">Selecione…</option>{row.tipo_resposta === 'SIM_NAO' ? <><option value="SIM">SIM</option><option value="NAO">NÃO</option></> : <><option value="CONFORME">CONFORME</option><option value="NAO_CONFORME">NÃO CONFORME</option></>}</select>}</td><td className={`p-2 font-black ${row.resultado === 'REPROVADO' ? 'text-rose-700' : row.resultado === 'APROVADO' ? 'text-emerald-700' : 'text-slate-500'}`}>{row.resultado}</td></tr>)}
          {!medicoes.length && <tr><td colSpan={6} className="p-8 text-center font-semibold text-slate-600">{!produto ? 'Selecione o produto para localizar templates vigentes.' : availableTemplates.length ? 'Selecione um template vigente para carregar os critérios.' : 'Nenhum template vigente para este produto/operação. Não é permitido salvar inspeção manual.'}</td></tr>}
        </tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2"><div className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">3. QUANTIDADE E DECISÃO</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={label}>QTD. INSPECIONADA<input className={input} type="number" min="1" step="any" value={quantidadeInspecionada} onChange={event => setQuantidadeInspecionada(event.target.value)}/></label>
        <label className={label}>QTD. APROVADA<input className={input} type="number" min="0" step="any" value={quantidadeAprovada} onChange={event => setQuantidadeAprovada(event.target.value)}/></label>
        <label className={label}>QTD. REPROVADA<input className={input} type="number" min="0" step="any" value={quantidadeReprovada} onChange={event => setQuantidadeReprovada(event.target.value)}/></label>
        <label className={label}>RESULTADO GERAL<select className={input} value={resultado} onChange={event => setResultado(event.target.value)}><option>APROVADO</option><option>REPROVADO</option><option>CONDICIONAL</option></select><span className="mt-1 block text-[8px] text-slate-500">Qualquer item fora do limite força REPROVADO.</span></label>
        <label className={label}>AÇÃO DE BLOQUEIO<select className={input} value={acaoBloqueio} onChange={event => setAcaoBloqueio(event.target.value)}><option>NENHUMA</option><option>BLOQUEAR_LOTE</option><option>RETER_RETRABALHO</option><option>SEGREGAR</option></select></label>
      </div></div><div className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">OBSERVAÇÕES DO INSPETOR</h2><textarea className="mt-4 min-h-40 w-full rounded-[2px] border border-slate-300 bg-white p-3 text-[11px] text-slate-900" value={obs} onChange={event => setObs(event.target.value)} placeholder="Registre evidências, desvios e decisão técnica."/></div></section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-[13px] font-extrabold">4. HISTÓRICO RECENTE</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3">Tipo</th><th className="p-3">Template / revisão</th><th className="p-3">Resultado</th><th className="p-3">Inspecionada</th><th className="p-3">Aprovada</th><th className="p-3">Reprovada</th><th className="p-3">OP</th><th className="p-3">Ação</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="h-[54px] border-b border-slate-200"><td className="p-3">{item.tipo}</td><td className="p-3">{item.template_revisao ? `R${item.template_revisao}` : 'LEGADO / SEM TEMPLATE'}</td><td className="p-3 font-bold">{item.resultado}</td><td className="p-3">{item.quantidade_inspecionada}</td><td className="p-3">{item.quantidade_aprovada}</td><td className="p-3">{item.quantidade_reprovada}</td><td className="p-3">{item.ordem_producao_id || '—'}</td><td className="p-3">{item.acao_bloqueio || '—'}</td></tr>)}{!history.length && <tr><td colSpan={8} className="p-6 text-center text-slate-600">Nenhuma inspeção registrada.</td></tr>}</tbody></table></div></section>
    </section></div>
  </main>
}
