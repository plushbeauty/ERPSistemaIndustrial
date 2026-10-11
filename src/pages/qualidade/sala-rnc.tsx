import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleHelp, ClipboardList, Plus, Printer, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import ERPHorizontalShell from '../../components/layout/ERPHorizontalShell'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; quantidade_disponivel: number; status_inspecao: string }
type Rnc = { id: string; numero_rpnc: string; descricao_nao_conformidade: string; origem: string | null; status: string; lote_producao: string | null; criado_em: string }
type Sector = { id: string; nome: string }
type Operator = { id: string; nome: string | null; email: string | null }
type ActionRow = { id: string; oQue: string; quem: string; quando: string; como: string; porQue: string; onde: string; quanto: string }
type WhyAnswer = { question: string; answer: string }

const WHY_QUESTIONS = [
  'Por que o defeito ocorreu diretamente?',
  'Por que a causa direta aconteceu?',
  'Por que o processo permitiu essa condição?',
  'Por que o controle anterior não detectou ou preveniu?',
  'Qual falha sistêmica permitiu a recorrência?'
] as const
const origins = [
  { value: 'Fornecedor', label: 'Fornecedor' },
  { value: 'Processo Interno', label: 'Processo interno' },
  { value: 'Cliente', label: 'Cliente' }
] as const
const dispositions = [
  { value: 'SUCATEAR', label: 'Sucatear' },
  { value: 'REPROCESSAR', label: 'Reprocessar' },
  { value: 'DEVOLVER', label: 'Devolver ao fornecedor' }
] as const
const fieldClass = 'h-[30px] min-h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100'
const areaClass = 'min-h-[74px] w-full resize-y rounded-[2px] border border-slate-300 bg-white px-2 py-1.5 text-[10px] leading-4 text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const labelClass = 'mb-1 flex min-h-[12px] items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white hover:bg-[#236f91] disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const emptyAction = (): ActionRow => ({ id: crypto.randomUUID(), oQue: '', quem: '', quando: '', como: '', porQue: '', onde: '', quanto: '' })
const Help = ({ text }: { text: string }) => <span className="group relative inline-flex shrink-0 items-center" title={text} aria-label={text}><CircleHelp size={10} className="cursor-help text-[#2D8DB8]" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden w-64 rounded-[2px] border border-sky-200 bg-[#123B50] p-2 text-[10px] font-normal normal-case leading-4 text-white shadow-lg group-hover:block group-focus-within:block">{text}</span></span>
function FieldLabel({ children, help }: { children: string; help: string }) { return <label className={labelClass}>{children}<Help text={help}/></label> }

export default function SalaRNC() {
  const [companyId, setCompanyId] = useState('')
  const [lots, setLots] = useState<Lot[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [records, setRecords] = useState<Rnc[]>([])
  const [selectedRnc, setSelectedRnc] = useState('')
  const [lotId, setLotId] = useState('')
  const [origin, setOrigin] = useState<(typeof origins)[number]['value']>('Processo Interno')
  const [description, setDescription] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [disposition, setDisposition] = useState<(typeof dispositions)[number]['value']>('REPROCESSAR')
  const [segregatedQty, setSegregatedQty] = useState('0')
  const [whys, setWhys] = useState<WhyAnswer[]>(WHY_QUESTIONS.map(question => ({ question, answer: '' })))
  const [actions, setActions] = useState<ActionRow[]>([emptyAction()])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deployStatus, setDeployStatus] = useState('VALIDAÇÃO PENDENTE')

  const selectedLot = useMemo(() => lots.find(lot => lot.id === lotId) ?? null, [lots, lotId])
  const selectedRecord = useMemo(() => records.find(record => record.id === selectedRnc) ?? null, [records, selectedRnc])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('A sessão não possui empresa vinculada. Entre novamente no ERP.')
      const tenantId = String(company.data)
      setCompanyId(tenantId)
      const [lotRows, sectorRows, userRows, rncRows] = await Promise.all([
        fetchAllPages<Lot>((from, to) => supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao', { count: 'exact' }).eq('empresa_id', tenantId).order('lote_interno').range(from, to)),
        fetchAllPages<Sector>((from, to) => supabase.from('erp_setores').select('id,nome', { count: 'exact' }).eq('empresa_id', tenantId).eq('ativo', true).order('nome').range(from, to)),
        fetchAllPages<Operator>((from, to) => supabase.from('erp_usuarios').select('id,nome,email', { count: 'exact' }).eq('empresa_id', tenantId).eq('ativo', true).is('deleted_at', null).order('nome').range(from, to)),
        fetchAllPages<Rnc>((from, to) => supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,origem,status,lote_producao,criado_em', { count: 'exact' }).eq('empresa_id', tenantId).order('criado_em', { ascending: false }).range(from, to))
      ])
      setLots(lotRows)
      setSectors(sectorRows)
      setOperators(userRows)
      setRecords(rncRows)
      if (!selectedRnc && rncRows[0]) setSelectedRnc(rncRows[0].id)
      setDeployStatus('CÓDIGO ENVIADO · BUILD PENDENTE')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados da Sala de RNC.')
    } finally {
      setLoading(false)
    }
  }, [selectedRnc])

  useEffect(() => { void load() }, [load])

  const createRnc = async () => {
    setError('')
    setNotice('')
    if (!companyId) { setError('Empresa não identificada. Atualize os dados e tente novamente.'); return }
    if (!lotId || !selectedLot) { setError('Selecione um lote válido da empresa.'); return }
    if (!sectorId) { setError('Selecione o setor responsável pela investigação.'); return }
    if (description.trim().length < 10) { setError('Descreva tecnicamente o defeito com pelo menos 10 caracteres.'); return }
    const quantity = Number(segregatedQty)
    if (!Number.isFinite(quantity) || quantity < 0) { setError('A quantidade segregada deve ser um número igual ou maior que zero.'); return }
    if (whys.some(item => item.answer.trim().length > 0) && whys.some(item => !item.answer.trim())) { setError('Para usar os 5 Porquês, preencha todas as cinco etapas em sequência.'); return }
    setBusy(true)
    try {
      const whyText = whys.map((item, index) => (index + 1) + '. ' + item.question + '\\n' + item.answer.trim()).filter(item => !item.endsWith('\\n')).join('\\n\\n')
      const result = await supabase.rpc('erp_criar_rpnc_com_quarentena', {
        p_lote_id: lotId,
        p_setor_id: sectorId,
        p_descricao: description.trim(),
        p_origem: origin.toLowerCase(),
        p_quantidade: quantity,
        p_disposition: disposition,
        p_whys_text: whyText || null
      })
      if (result.error) throw result.error
      const created = result.data as Rnc | null
      if (!created?.id || !created.numero_rpnc) throw new Error('O banco não retornou a RPNC criada.')
      setNotice('RPNC ' + created.numero_rpnc + ', análise 8D e retenção/quarentena do lote foram gravadas em uma única transação.')
      const actionRows = actions.filter(row => row.oQue.trim() && row.quem && row.quando && row.como.trim())
      if (actionRows.length) {
        const results = await Promise.all(actionRows.map(row => supabase.from('erp_sgq_capa_acoes').insert({
          empresa_id: companyId,
          rpnc_id: created.id,
          tipo: 'Corretiva',
          descricao: row.oQue.trim(),
          causa_raiz: whys.map(item => item.answer.trim()).filter(Boolean).join('\n'),
          responsavel_id: row.quem,
          prazo: row.quando,
          status: 'Planejada',
          acao_o_que: row.oQue.trim(),
          acao_por_que: row.porQue.trim() || null,
          acao_onde: row.onde.trim() || null,
          acao_quem: operators.find(operator => operator.id === row.quem)?.nome ?? row.quem,
          acao_quando: row.quando,
          acao_como: row.como.trim(),
          acao_quanto: row.quanto.trim() ? Number(row.quanto) : null
        })))
        const failed = results.find(result => result.error)
        if (failed?.error) setError((current) => (current ? current + ' ' : '') + 'A RPNC existe, mas houve falha ao salvar uma ação 5W2H: ' + failed.error.message)
      }
      setSelectedRnc(created.id)
      setDescription('')
      setLotId('')
      setSegregatedQty('0')
      setWhys(WHY_QUESTIONS.map(question => ({ question, answer: '' })))
      setActions([emptyAction()])
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar a RPNC.')
    } finally {
      setBusy(false)
    }
  }

  const saveActions = async () => {
    if (!selectedRecord) { setError('Selecione ou registre uma RPNC antes de salvar ações.'); return }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const ready = actions.filter(row => row.oQue.trim() && row.quem && row.quando && row.como.trim())
      if (!ready.length) throw new Error('Preencha O QUÊ, QUEM, QUANDO e COMO em pelo menos uma ação.')
      const results = await Promise.all(ready.map(row => supabase.from('erp_sgq_capa_acoes').insert({
        empresa_id: companyId, rpnc_id: selectedRecord.id, tipo: 'Corretiva',
        descricao: row.oQue.trim(), causa_raiz: null, responsavel_id: row.quem, prazo: row.quando,
        status: 'Planejada', acao_o_que: row.oQue.trim(), acao_por_que: row.porQue.trim() || null,
        acao_onde: row.onde.trim() || null, acao_quem: operators.find(operator => operator.id === row.quem)?.nome ?? row.quem,
        acao_quando: row.quando, acao_como: row.como.trim(), acao_quanto: row.quanto.trim() ? Number(row.quanto) : null
      })))
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error
      setNotice(ready.length + ' ação(ões) CAPA gravada(s) no banco.')
      setActions([emptyAction()])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar ações CAPA.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ERPHorizontalShell>
      <main className="rnc-print-document min-h-[calc(100vh-48px)] bg-[#F4FBFD] pb-12 text-slate-800 print:min-h-0 print:bg-white print:p-0">
        <div className="rnc-print-header hidden grid-cols-3 border border-slate-400 bg-white text-center text-slate-900">
          <div className="flex min-h-[48px] items-center justify-center border-r border-slate-400 p-2 text-[10px] font-bold uppercase">SYSNQRA ERP &amp; SGQ INDUSTRIAL</div>
          <div className="flex flex-col justify-center border-r border-slate-400 p-2"><strong className="text-[10px] uppercase">Registro de Não Conformidade</strong><span className="text-[8px]">Sistema de Gestão da Qualidade · CAPA</span></div>
          <div className="flex flex-col justify-center p-2 text-left text-[8px]"><span>CÓDIGO: {selectedRecord?.numero_rpnc || 'GERADO AO SALVAR'}</span><span>EMISSÃO: {new Date().toLocaleString('pt-BR')}</span></div>
        </div>
        <header className="rnc-screen-header flex min-h-[64px] flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 print:hidden">
          <span className="grid size-9 place-items-center rounded-[2px] bg-[#123B50] text-white"><ClipboardList size={18}/></span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#2D8DB8]">SGQ · SALA DE NÃO CONFORMIDADES</p>
            <h1 className="text-base font-semibold text-[#123B50]">Sala de RNC / RPNC</h1>
            <p className="text-[10px] text-slate-500">Triagem, disposição física, análise dos 5 Porquês e ações mitigatórias 5W2H.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className={secondaryButton} onClick={() => window.print()} disabled={loading} title="Imprimir formulário em A4"><Printer size={12}/> Imprimir A4</button><button type="button" className={secondaryButton} onClick={() => void load()} disabled={loading || busy}><RefreshCw size={12}/> Atualizar</button>
            <button type="button" className={buttonClass} onClick={() => void createRnc()} disabled={busy || loading}><Save size={12}/> {busy ? 'Salvando…' : 'Registrar RPNC'}</button>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1600px] gap-3 p-3 print:max-w-none print:gap-2 print:p-0">
          {error && <div role="alert" className="flex items-start gap-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
          {notice && <div role="status" className="flex items-start gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800"><Check size={14} className="mt-0.5 shrink-0"/><span>{notice}</span></div>}
          {loading ? <div className="border border-slate-200 bg-white p-5 text-center text-[10px]">Carregando cadastros reais da empresa…</div> : <>
            <section className="rnc-section border border-slate-200 bg-white print:break-inside-avoid">
              <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-[#eaf4f8] px-3"><span className="text-[10px] font-bold text-[#123B50]">01</span><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Triagem e disposição física</h2><ShieldCheck size={13} className="ml-auto text-[#2D8DB8]"/></div>
              <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
                <div><FieldLabel help="Selecione o lote real cadastrado no estoque da empresa atual. Lotes retidos ou bloqueados não devem ser consumidos na produção.">Vínculo do lote</FieldLabel><select className={fieldClass} value={lotId} onChange={event => setLotId(event.target.value)}><option value="">Selecione lote…</option>{lots.map(lot => <option key={lot.id} value={lot.id}>{lot.lote_interno}{lot.lote_fornecedor ? ' · Forn. ' + lot.lote_fornecedor : ''} · Disp. {lot.quantidade_disponivel} · {lot.status_inspecao}</option>)}</select></div>
                <div><FieldLabel help="Informe a origem rastreável do desvio. A origem será registrada no cadastro de RPNC para análise de recorrência.">Origem do desvio</FieldLabel><select className={fieldClass} value={origin} onChange={event => setOrigin(event.target.value as (typeof origins)[number]['value'])}>{origins.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div><FieldLabel help="Escolha o setor que deve investigar e responder pela tratativa. A lista é limitada aos setores ativos da empresa.">Setor responsável</FieldLabel><select className={fieldClass} value={sectorId} onChange={event => setSectorId(event.target.value)}><option value="">Selecione setor…</option>{sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></div>
                <div><FieldLabel help="Informe a quantidade física identificada para segregação. Não pode ser negativa; confirme unidade e contagem antes de registrar.">Quantidade segregada</FieldLabel><input className={fieldClass} inputMode="decimal" type="number" min="0" step="0.001" value={segregatedQty} onChange={event => setSegregatedQty(event.target.value)}/></div>
                <div><FieldLabel help="Selecione a disposição proposta. A decisão final deve ser autorizada conforme o procedimento de controle de produto não conforme da empresa.">Disposição física</FieldLabel><select className={fieldClass} value={disposition} onChange={event => setDisposition(event.target.value as (typeof dispositions)[number]['value'])}>{dispositions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div className="md:col-span-2 xl:col-span-3"><FieldLabel help="Registre o defeito de forma objetiva: requisito violado, característica, medida observada, especificação, lote, impacto no produto e evidência disponível. Evite apenas 'peça ruim' ou conclusões sem evidência.">Descrição técnica do defeito</FieldLabel><textarea className={areaClass} value={description} onChange={event => setDescription(event.target.value)} placeholder="Requisito/specificação, condição observada, evidência, impacto e extensão conhecida…"/></div>
              </div>
              {selectedLot && <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px]"><strong>Lote selecionado: {selectedLot.lote_interno}</strong><span>Disponível: {selectedLot.quantidade_disponivel}</span><span>Status inspeção: {selectedLot.status_inspecao}</span><span className="text-amber-700">O registro solicita retenção do lote no fluxo de quarentena.</span></div>}
            </section>

            <section className="rnc-section border border-slate-200 bg-white print:break-inside-avoid">
              <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-[#eaf4f8] px-3"><span className="text-[10px] font-bold text-[#123B50]">02</span><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Análise da causa raiz · 5 Porquês</h2></div>
              <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">{whys.map((item, index) => <div key={item.question}><FieldLabel help="Responda com base em evidências. Cada etapa deve aprofundar a causa anterior; a quinta deve apontar uma falha sistêmica de processo, padrão, treinamento, controle ou gestão, não culpar apenas uma pessoa.">{'Por quê ' + (index + 1)}</FieldLabel><p className="mb-1 min-h-[28px] text-[10px] font-medium text-slate-600">{item.question}</p><textarea className={areaClass} value={item.answer} onChange={event => setWhys(current => current.map((why, i) => i === index ? { ...why, answer: event.target.value } : why))} placeholder={'Evidência e causa ' + (index + 1) + '…'}/></div>)}</div>
            </section>

            <section className="rnc-section border border-slate-200 bg-white print:break-inside-avoid">
              <div className="flex min-h-8 flex-wrap items-center gap-2 border-b border-slate-200 bg-[#eaf4f8] px-3 py-1.5"><span className="text-[10px] font-bold text-[#123B50]">03</span><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Plano de ação mitigatório · 5W2H</h2><button type="button" className={secondaryButton + ' ml-auto'} onClick={() => setActions(current => [...current, emptyAction()])}><Plus size={12}/> Adicionar ação</button><button type="button" className={buttonClass} onClick={() => void saveActions()} disabled={busy || !selectedRecord}><Save size={12}/> Salvar ações</button></div>
              <div className="overflow-x-auto">
                <table className="rnc-actions-table w-full min-w-[1000px] table-fixed border-collapse print:min-w-0">
                  <thead className="bg-slate-100 text-left text-[9px] font-bold uppercase text-slate-600"><tr className="h-8">{['O quê','Quem · responsável','Quando · prazo','Como','Por quê','Onde','Quanto',''].map((title, index) => <th key={title || index} className="border-b border-r border-slate-200 px-2">{title}</th>)}</tr></thead>
                  <tbody className="text-[10px]">{actions.map((row, index) => <tr key={row.id} className="h-8 odd:bg-white even:bg-slate-50/70">
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="O quê" className={fieldClass} value={row.oQue} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, oQue: event.target.value } : item))} placeholder="Ação concreta"/></td>
                    <td className="border-b border-r border-slate-100 p-1"><select aria-label="Responsável" className={fieldClass} value={row.quem} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, quem: event.target.value } : item))}><option value="">Responsável…</option>{operators.map(operator => <option key={operator.id} value={operator.id}>{operator.nome || operator.email || operator.id}</option>)}</select></td>
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="Prazo" type="date" className={fieldClass} value={row.quando} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, quando: event.target.value } : item))}/></td>
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="Como" className={fieldClass} value={row.como} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, como: event.target.value } : item))} placeholder="Método / evidência"/></td>
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="Por quê" className={fieldClass} value={row.porQue} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, porQue: event.target.value } : item))}/></td>
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="Onde" className={fieldClass} value={row.onde} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, onde: event.target.value } : item))}/></td>
                    <td className="border-b border-r border-slate-100 p-1"><input aria-label="Quanto" type="number" min="0" step="0.01" className={fieldClass} value={row.quanto} onChange={event => setActions(current => current.map(item => item.id === row.id ? { ...item, quanto: event.target.value } : item))} placeholder="R$"/></td>
                    <td className="border-b border-slate-100 p-1 text-center"><button type="button" aria-label={'Remover ação ' + (index + 1)} title="Remover ação" className="inline-flex size-[30px] items-center justify-center text-rose-600 hover:bg-rose-50" onClick={() => setActions(current => current.filter(item => item.id !== row.id))}><Trash2 size={12}/></button></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-3 py-2 text-[9px] text-slate-500">Uma ação só será persistida quando O QUÊ, QUEM, QUANDO e COMO estiverem preenchidos. As ações são gravadas na tabela CAPA existente, sob as políticas RLS da empresa.</p>
            </section>

            <section className="rnc-history-section border border-slate-200 bg-white print:hidden">
              <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-[#eaf4f8] px-3"><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Registro de RPNCs da empresa</h2><span className="ml-auto text-[9px] text-slate-500">{records.length} registro(s)</span></div>
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full min-w-[800px] border-collapse text-left">
                  <thead className="sticky top-0 bg-slate-100 text-[9px] font-bold uppercase text-slate-600"><tr className="h-8"><th className="px-2">Número</th><th className="px-2">Descrição</th><th className="px-2">Origem</th><th className="px-2">Lote</th><th className="px-2">Status</th><th className="px-2">Criada em</th></tr></thead>
                  <tbody className="text-[10px]">{records.map(record => <tr key={record.id} className={'h-8 cursor-pointer border-t border-slate-100 hover:bg-sky-50 ' + (record.id === selectedRnc ? 'bg-sky-50' : '')} onClick={() => setSelectedRnc(record.id)}><td className="px-2 font-semibold text-[#2D8DB8]">{record.numero_rpnc}</td><td className="max-w-[420px] truncate px-2" title={record.descricao_nao_conformidade}>{record.descricao_nao_conformidade}</td><td className="px-2">{record.origem || '—'}</td><td className="px-2">{record.lote_producao || '—'}</td><td className="px-2">{record.status}</td><td className="px-2">{record.criado_em ? new Date(record.criado_em).toLocaleString('pt-BR') : '—'}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
            <section className="rnc-signatures grid grid-cols-2 gap-8 px-3 pb-5 pt-8 print:break-inside-avoid">
              <div className="border-t border-slate-500 pt-1 text-center text-[9px] uppercase">Assinatura do inspetor / emissor</div>
              <div className="border-t border-slate-500 pt-1 text-center text-[9px] uppercase">Assinatura da gestão da qualidade (SGQ)</div>
            </section>
          </>}
        </div>

        <footer className="fixed bottom-0 left-0 right-0 z-40 grid h-8 grid-cols-2 items-center border-t border-slate-300 bg-[#123B50] px-3 text-[9px] text-white md:grid-cols-4 print:static print:mt-4 print:grid print:bg-white print:text-slate-800">
          <span><strong>SGQ-RNC</strong> · ISO 9001:2015</span>
          <span className="hidden text-center md:block">Revisão automática · RPNC / 5W2H</span>
          <span className="text-right md:text-center">{deployStatus}</span>
          <span className="text-right">Dados por empresa · RLS ativo</span>
        </footer>
        <style>{'@media print{@page{size:A4 portrait;margin:10mm}.rnc-screen-header,.rnc-history-section{display:none!important}.rnc-print-header{display:grid!important}.rnc-print-document{max-width:none!important;width:100%!important}.rnc-actions-table{min-width:0!important;font-size:8px!important}.rnc-actions-table th,.rnc-actions-table td{padding:2px!important;overflow-wrap:anywhere}.rnc-actions-table input,.rnc-actions-table select{height:auto!important;min-height:0!important;padding:1px!important;border:0!important;background:transparent!important;font-size:8px!important;color:#111!important}.rnc-actions-table button,.group span[role=tooltip]{display:none!important}.rnc-section{margin-bottom:6px!important;break-inside:avoid}.rnc-signatures{padding-top:22px!important;padding-bottom:8px!important}.rnc-signatures div{min-height:22px}}'}</style>
      </main>
    </ERPHorizontalShell>
  )
}
