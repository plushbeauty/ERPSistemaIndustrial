import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleHelp, ClipboardList, Plus, Printer, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import ERPHorizontalShell from '../../components/layout/ERPHorizontalShell'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; quantidade_disponivel: number; status_inspecao: string }
type Rnc = { id: string; numero_rpnc: string; descricao_nao_conformidade: string; origem: string | null; status: string; lote_producao: string | null; criado_em: string; gravidade?: string | null; quantidade_segregada?: number | null; bloqueia_lote?: boolean | null; data_ocorrencia?: string | null; inspetor_id?: string | null; disposicao_fisica?: string | null; requisito_violado?: string | null; evidencias_objetivas?: unknown; porques_evidencias?: unknown; causa_raiz_validada?: boolean | null; causa_raiz_validacao_observacao?: string | null; investigacao?: string | null }
type Sector = { id: string; nome: string }
type Operator = { id: string; nome: string | null; email: string | null }
type ActionRow = { id: string; oQue: string; quem: string; quando: string; como: string; porQue: string; onde: string; quanto: string }
type WhyAnswer = { question: string; answer: string; evidence: string }

const WHY_QUESTIONS = [
  'Por que o defeito ocorreu diretamente?',
  'Por que a causa direta aconteceu?',
  'Por que o processo permitiu essa condição?',
  'Por que o controle anterior não detectou ou preveniu?',
  'Qual falha sistêmica permitiu a recorrência?'
] as const
const origins = [
  { value: 'rpnc_interno', label: 'RPNC Interno' },
  { value: 'auditoria_interna', label: 'Auditoria Interna' },
  { value: 'auditoria_externa', label: 'Auditoria Externa' },
  { value: 'rpnc_cliente', label: 'RPNC Cliente' },
  { value: 'rpnc_processo', label: 'RPNC Processo' }
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
  const [origin, setOrigin] = useState<(typeof origins)[number]['value']>('rpnc_interno')
  const [description, setDescription] = useState('')
  const [requirementViolated, setRequirementViolated] = useState('')
  const [objectiveEvidence, setObjectiveEvidence] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [criticality, setCriticality] = useState<'Critica' | 'Maior' | 'Menor'>('Menor')
  const [inspectorId, setInspectorId] = useState('')
  const [rootCauseValidated, setRootCauseValidated] = useState(false)
  const [rootCauseValidationNote, setRootCauseValidationNote] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [disposition, setDisposition] = useState<(typeof dispositions)[number]['value']>('REPROCESSAR')
  const [segregatedQty, setSegregatedQty] = useState('0')
  const [whys, setWhys] = useState<WhyAnswer[]>(WHY_QUESTIONS.map(question => ({ question, answer: '', evidence: '' })))
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
        fetchAllPages<Rnc>((from, to) => supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,origem,status,lote_producao,criado_em,gravidade,quantidade_segregada,bloqueia_lote,data_ocorrencia,inspetor_id,disposicao_fisica,requisito_violado,evidencias_objetivas,porques_evidencias,causa_raiz_validada,causa_raiz_validacao_observacao,investigacao', { count: 'exact' }).eq('empresa_id', tenantId).order('criado_em', { ascending: false }).range(from, to))
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
    if (!inspectorId) { setError('Identifique o inspetor/emissor responsável pelo registro.'); return }
    if (!occurredAt || Number.isNaN(new Date(occurredAt).getTime())) { setError('Informe a data e hora válidas da ocorrência.'); return }
    if (!requirementViolated.trim()) { setError('Informe o requisito ou especificação violada.'); return }
    if (!objectiveEvidence.trim()) { setError('Registre ao menos uma evidência objetiva observada.'); return }
    if (whys.some(item => item.answer.trim().length > 0) && whys.some(item => !item.answer.trim() || !item.evidence.trim())) { setError('Cada etapa dos 5 Porquês preenchida precisa conter resposta e evidência objetiva.'); return }
    if (rootCauseValidated && !rootCauseValidationNote.trim()) { setError('Explique a validação da causa raiz antes de confirmar que ela bloqueia a reincidência.'); return }
    setBusy(true)
    try {
      const whyAnswers = whys.filter(item => item.answer.trim()).map(item => ({ question: item.question, answer: item.answer.trim(), evidence: item.evidence.trim() }))
      const whyText = whyAnswers.map((item, index) => (index + 1) + '. ' + item.question + '\nCausa: ' + item.answer + '\nEvidência objetiva: ' + item.evidence).join('\n\n')
      const readyActions = actions.filter(row => row.oQue.trim() && row.quem && row.quando && row.como.trim())
      const actionPayload = readyActions.map(row => ({
        what: row.oQue.trim(), why: row.porQue.trim() || null, where_to: row.onde.trim() || null,
        when_date: row.quando, who_id: row.quem, how: row.como.trim(),
        how_much: row.quanto.trim() ? Number(row.quanto) : null
      }))
      const result = await supabase.rpc('erp_criar_rpnc_com_quarentena', {
        p_lote_id: lotId,
        p_setor_id: sectorId,
        p_descricao: description.trim(),
        p_origem: origin,
        p_quantidade: quantity,
        p_disposition: disposition,
        p_whys_text: whyText || null,
        p_whys_json: whyAnswers,
        p_actions_json: actionPayload
      })
      if (result.error) throw result.error
      const created = result.data as (Rnc & { codigo_8d?: string; acoes_gravadas?: number }) | null
      if (!created?.id || !created.numero_rpnc) throw new Error('O banco não retornou a RPNC criada.')
      const metadata = await supabase.from('erp_rpnc').update({ gravidade: criticality.toLocaleLowerCase('pt-BR'), data_ocorrencia: new Date(occurredAt).toISOString(), inspetor_id: inspectorId, disposicao_fisica: disposition, requisito_violado: requirementViolated.trim(), evidencias_objetivas: [{ descricao: objectiveEvidence.trim(), registrada_em: new Date().toISOString() }], porques_evidencias: whyAnswers, causa_raiz_validada: rootCauseValidated, causa_raiz_validacao_observacao: rootCauseValidationNote.trim() || null }).eq('id', created.id).eq('empresa_id', companyId)
      if (metadata.error) throw new Error('RPNC criada e lote retido, mas os metadados complementares não foram gravados: ' + metadata.error.message + '. Abra o registro e complete os campos antes de encerrar.')
      const sourceRecord = await supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,lote_producao,quantidade_segregada,bloqueia_lote,status,criado_em,data_ocorrencia,inspetor_id,disposicao_fisica,requisito_violado,evidencias_objetivas,porques_evidencias,causa_raiz_validada,causa_raiz_validacao_observacao,investigacao').eq('id', created.id).eq('empresa_id', companyId).single()
      if (sourceRecord.error) throw new Error('RPNC gravada, mas não foi possível ler sua fotografia para o protocolo 8D: ' + sourceRecord.error.message)
      const snapshot = await supabase.from('erp_qualidade_8d').update({ rpnc_snapshot: sourceRecord.data, snapshot_capturado_em: new Date().toISOString(), numero_rpnc_origem: created.numero_rpnc, origem_rpnc: sourceRecord.data.origem }).eq('empresa_id', companyId).eq('rpnc_id', created.id).is('rpnc_snapshot', null)
      if (snapshot.error) throw new Error('RPNC gravada, mas a fotografia histórica do protocolo 8D não foi anexada: ' + snapshot.error.message)
      setNotice('RPNC ' + created.numero_rpnc + ', análise 8D, CAPA/5W2H e retenção do lote gravadas em transação única. Ações iniciais: ' + String(created.acoes_gravadas ?? 0) + '.')
      setSelectedRnc(created.id)
      setDescription('')
      setRequirementViolated('')
      setObjectiveEvidence('')
      setOccurredAt(new Date().toISOString().slice(0, 16))
      setCriticality('Menor')
      setInspectorId('')
      setRootCauseValidated(false)
      setRootCauseValidationNote('')
      setLotId('')
      setSegregatedQty('0')
      setWhys(WHY_QUESTIONS.map(question => ({ question, answer: '', evidence: '' })))
      setActions([emptyAction()])
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar a RPNC e a retenção do lote.')
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
      const actionPayload = ready.map(row => ({
        what: row.oQue.trim(), why: row.porQue.trim() || null, where_to: row.onde.trim() || null,
        when_date: row.quando, who_id: row.quem, how: row.como.trim(),
        how_much: row.quanto.trim() ? Number(row.quanto) : null
      }))
      const result = await supabase.rpc('erp_salvar_acoes_rnc', {
        p_rpnc_id: selectedRecord.id,
        p_actions_json: actionPayload
      })
      if (result.error) throw result.error
      const saved = result.data as { count?: number } | null
      setNotice(String(saved?.count ?? ready.length) + ' ação(ões) CAPA gravada(s) com atualização do plano 5W2H.')
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
          <div className="flex flex-col justify-center border-r border-slate-400 p-2"><strong className="text-[10px] uppercase">TRATAMENTO DE ANOMALIA / RPNC</strong><span className="text-[8px]">SYSNQRA ERP &amp; SGQ INDUSTRIAL · CAPA / 5W2H</span></div>
          <div className="flex flex-col justify-center p-2 text-left text-[8px]"><span>CÓDIGO: {selectedRecord?.numero_rpnc || 'GERADO AO SALVAR'}</span><span>EMISSÃO: {new Date().toLocaleString('pt-BR')}</span></div>
        </div>
        <div className="rnc-mgf-report hidden print:block">
          <section className="mgf-page">
            <div className="mgf-doc-head"><strong>SYSNQRA ERP &amp; SGQ INDUSTRIAL</strong><strong>MGF3657_B · TRATAMENTO DE ANOMALIA</strong><span>RPNC: {selectedRecord?.numero_rpnc || 'SEM REGISTRO SELECIONADO'}</span></div>
            <h2>1. IDENTIFICAÇÃO E RELATO DA ANOMALIA</h2>
            <div className="mgf-grid">
              <div><b>Origem</b><span>{origins.find(item => item.value === selectedRecord?.origem)?.label || selectedRecord?.origem || '—'}</span></div>
              <div><b>Status</b><span>{selectedRecord?.status || '—'}</span></div>
              <div><b>Data da ocorrência</b><span>{selectedRecord?.data_ocorrencia ? new Date(selectedRecord.data_ocorrencia).toLocaleString('pt-BR') : '—'}</span></div>
              <div><b>Data de abertura</b><span>{selectedRecord?.criado_em ? new Date(selectedRecord.criado_em).toLocaleString('pt-BR') : '—'}</span></div>
              <div><b>Lote / rastreabilidade</b><span>{selectedRecord?.lote_producao || '—'}</span></div>
              <div><b>Criticidade</b><span>{selectedRecord?.gravidade || '—'}</span></div>
              <div><b>Quantidade segregada</b><span>{selectedRecord?.quantidade_segregada ?? '—'}</span></div>
              <div><b>Disposição física</b><span>{selectedRecord?.disposicao_fisica || '—'}</span></div>
              <div className="mgf-wide"><b>Requisito / especificação violada</b><span>{selectedRecord?.requisito_violado || '—'}</span></div>
              <div className="mgf-wide"><b>Descrição da anomalia / problema</b><span className="mgf-long">{selectedRecord?.descricao_nao_conformidade || 'Selecione um registro existente na lista da tela.'}</span></div>
              <div className="mgf-wide"><b>Evidência objetiva inicial</b><span className="mgf-long">{Array.isArray(selectedRecord?.evidencias_objetivas) ? selectedRecord.evidencias_objetivas.map((e) => typeof e === 'object' && e !== null && 'descricao' in e ? String(e.descricao) : JSON.stringify(e)).join(' · ') : typeof selectedRecord?.evidencias_objetivas === 'string' ? selectedRecord.evidencias_objetivas : 'Consultar evidências anexadas ao registro no SGQ.'}</span></div>
            </div>
            <h2>2. CONTENÇÃO E CONTROLE IMEDIATO</h2>
            <div className="mgf-grid">
              <div><b>Lote bloqueado / retenção</b><span>{selectedRecord?.bloqueia_lote ? 'SIM' : selectedRecord?.bloqueia_lote === false ? 'NÃO' : 'A confirmar no registro'}</span></div>
              <div><b>Quantidade e disposição</b><span>{selectedRecord?.quantidade_segregada ?? '—'} · {selectedRecord?.disposicao_fisica || '—'}</span></div>
              <div className="mgf-wide"><b>Ações de contenção executadas</b><span className="mgf-lines">{' '.repeat(1)}</span></div>
              <div className="mgf-wide"><b>Abrangência / produtos potencialmente afetados / comunicação</b><span className="mgf-lines"></span></div>
            </div>
            <div className="mgf-sign"><span>Responsável pela identificação</span><span>Responsável pela contenção</span></div>
            <p className="mgf-note">Documento de trabalho gerado a partir do registro selecionado. Campos sem informação persistida são apresentados para preenchimento controlado; não representam evidência de execução.</p>
          </section>
          <section className="mgf-page">
            <div className="mgf-doc-head"><strong>SYSNQRA ERP &amp; SGQ INDUSTRIAL</strong><strong>INVESTIGAÇÃO E CAUSA RAIZ</strong><span>RPNC: {selectedRecord?.numero_rpnc || '—'}</span></div>
            <h2>3. INVESTIGAÇÃO · ISHIKAWA / 6M</h2>
            <div className="mgf-grid mgf-six">
              {['Método','Mão de obra','Máquina','Material','Medição','Meio ambiente'].map(label => <div key={label}><b>{label}</b><span className="mgf-lines"></span></div>)}
            </div>
            <h2>4. ANÁLISE DOS 5 PORQUÊS E EVIDÊNCIAS</h2>
            {WHY_QUESTIONS.map((question, index) => {
              const saved = Array.isArray(selectedRecord?.porques_evidencias) ? selectedRecord.porques_evidencias[index] : null
              const item = typeof saved === 'object' && saved !== null ? saved as { answer?: string; evidence?: string } : null
              return <div className="mgf-why" key={question}><b>{index + 1}. {question}</b><span><strong>Causa:</strong> {item?.answer || '—'}</span><span><strong>Evidência objetiva:</strong> {item?.evidence || '—'}</span></div>
            })}
            <div className="mgf-grid">
              <div className="mgf-wide"><b>Causa raiz / investigação complementar</b><span className="mgf-long">{selectedRecord?.investigacao || '—'}</span></div>
              <div><b>Causa raiz validada</b><span>{selectedRecord?.causa_raiz_validada ? 'SIM' : selectedRecord?.causa_raiz_validada === false ? 'NÃO' : 'PENDENTE'}</span></div>
              <div><b>Justificativa da validação</b><span>{selectedRecord?.causa_raiz_validacao_observacao || '—'}</span></div>
            </div>
            <div className="mgf-sign"><span>Líder da investigação</span><span>Responsável SGQ</span></div>
          </section>
          <section className="mgf-page">
            <div className="mgf-doc-head"><strong>SYSNQRA ERP &amp; SGQ INDUSTRIAL</strong><strong>PLANO DE AÇÃO · VERIFICAÇÃO</strong><span>RPNC: {selectedRecord?.numero_rpnc || '—'}</span></div>
            <h2>5. AÇÕES CORRETIVAS E PREVENTIVAS · CAPA / 5W2H</h2>
            <table className="mgf-action"><thead><tr>{['O quê','Por quê','Onde','Quem','Quando','Como','Quanto'].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{[0,1,2,3,4].map(i => <tr key={i}>{[0,1,2,3,4,5,6].map(j => <td key={j}></td>)}</tr>)}</tbody></table>
            <h2>6. VERIFICAÇÃO DE EFICÁCIA</h2>
            <div className="mgf-grid">
              <div><b>Critério objetivo de eficácia</b><span className="mgf-lines"></span></div>
              <div><b>Data / amostra verificada</b><span className="mgf-lines"></span></div>
              <div className="mgf-wide"><b>Resultado, evidência e conclusão</b><span className="mgf-lines"></span></div>
            </div>
            <h2>7. PADRONIZAÇÃO, REPLICAÇÃO E ENCERRAMENTO</h2>
            <div className="mgf-grid">
              <div className="mgf-wide"><b>Documentos / instruções / treinamentos atualizados e áreas para replicação</b><span className="mgf-lines"></span></div>
              <div><b>Decisão</b><span>☐ Eficaz ☐ Não eficaz ☐ Reabrir</span></div>
              <div><b>Data de encerramento</b><span></span></div>
            </div>
            <div className="mgf-sign mgf-sign-four"><span>Responsável pela ação</span><span>Verificador da eficácia</span><span>Gestão da qualidade</span><span>Aprovação / cliente (quando aplicável)</span></div>
            <p className="mgf-note">Relatório para análise e impressão. Antes do envio ao cliente, valide os campos de eficácia, ações concluídas, aprovações e evidências anexas. Dados não persistidos não são presumidos.</p>
          </section>
        </div>

        <header className="rnc-screen-header flex min-h-[64px] flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 print:hidden">
          <span className="grid size-9 place-items-center rounded-[2px] bg-[#123B50] text-white"><ClipboardList size={18}/></span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#2D8DB8]">SYSNQRA · SGQ · RPNC MULTIORIGEM</p>
            <h1 className="text-base font-semibold text-[#123B50]">Gestão Integrada de RPNC</h1>
            <p className="text-[10px] text-slate-500">Cinco origens, rastreabilidade, investigação de causa raiz, contenção e plano CAPA / 5W2H.</p>
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
                <div><FieldLabel help="Data e hora em que o desvio foi observado; diferente da data automática de abertura do registro.">Data/hora da ocorrência *</FieldLabel><input className={fieldClass} type="datetime-local" value={occurredAt} onChange={event => setOccurredAt(event.target.value)} required/></div>
                <div><FieldLabel help="Classificação inicial do risco. A reclassificação deve seguir a matriz de criticidade do SGQ.">Grau de criticidade *</FieldLabel><select className={fieldClass} value={criticality} onChange={event => setCriticality(event.target.value as typeof criticality)}><option value="Critica">Crítica</option><option value="Maior">Maior</option><option value="Menor">Menor</option></select></div>
                <div><FieldLabel help="Pessoa responsável pela identificação e emissão da não conformidade.">Inspetor / emissor *</FieldLabel><select className={fieldClass} value={inspectorId} onChange={event => setInspectorId(event.target.value)} required><option value="">Selecione o inspetor…</option>{operators.map(operator => <option key={operator.id} value={operator.id}>{operator.nome || operator.email || operator.id}</option>)}</select></div>
                <div><FieldLabel help="Referência objetiva à especificação, desenho, procedimento, pedido ou requisito que não foi atendido.">Requisito violado *</FieldLabel><input className={fieldClass} value={requirementViolated} onChange={event => setRequirementViolated(event.target.value)} placeholder="Código/revisão/limite de especificação" required/></div>
                <div><FieldLabel help="Selecione o lote real cadastrado no estoque da empresa atual. Lotes retidos ou bloqueados não devem ser consumidos na produção.">Vínculo do lote</FieldLabel><select className={fieldClass} value={lotId} onChange={event => setLotId(event.target.value)}><option value="">Selecione lote…</option>{lots.map(lot => <option key={lot.id} value={lot.id}>{lot.lote_interno}{lot.lote_fornecedor ? ' · Forn. ' + lot.lote_fornecedor : ''} · Disp. {lot.quantidade_disponivel} · {lot.status_inspecao}</option>)}</select></div>
                <div><FieldLabel help="Informe a origem rastreável do desvio. A origem será registrada no cadastro de RPNC para análise de recorrência.">Origem do desvio</FieldLabel><select className={fieldClass} value={origin} onChange={event => setOrigin(event.target.value as (typeof origins)[number]['value'])}>{origins.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div><FieldLabel help="Escolha o setor que deve investigar e responder pela tratativa. A lista é limitada aos setores ativos da empresa.">Setor responsável</FieldLabel><select className={fieldClass} value={sectorId} onChange={event => setSectorId(event.target.value)}><option value="">Selecione setor…</option>{sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></div>
                <div><FieldLabel help="Informe a quantidade física identificada para segregação. Não pode ser negativa; confirme unidade e contagem antes de registrar.">Quantidade segregada</FieldLabel><input className={fieldClass} inputMode="decimal" type="number" min="0" step="0.001" value={segregatedQty} onChange={event => setSegregatedQty(event.target.value)}/></div>
                <div><FieldLabel help="Selecione a disposição proposta. A decisão final deve ser autorizada conforme o procedimento de controle de produto não conforme da empresa.">Disposição física</FieldLabel><select className={fieldClass} value={disposition} onChange={event => setDisposition(event.target.value as (typeof dispositions)[number]['value'])}>{dispositions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div className="md:col-span-2 xl:col-span-3"><FieldLabel help="Registre o defeito de forma objetiva: condição observada, característica, medida, impacto e extensão conhecida.">Descrição técnica do defeito *</FieldLabel><textarea className={areaClass} value={description} onChange={event => setDescription(event.target.value)} placeholder="Condição observada, característica, medida, impacto e extensão conhecida…" required/></div>
                <div className="md:col-span-2 xl:col-span-4"><FieldLabel help="Descreva a evidência objetiva inicial: medição, laudo, foto, inspeção ou documento identificável. Anexos documentais devem permanecer vinculados ao registro. ">Evidência objetiva inicial *</FieldLabel><textarea className={areaClass} value={objectiveEvidence} onChange={event => setObjectiveEvidence(event.target.value)} placeholder="Medição observada, instrumento, amostra, laudo ou referência da evidência…" required/></div>
              </div>
              {selectedLot && <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px]"><strong>Lote selecionado: {selectedLot.lote_interno}</strong><span>Disponível: {selectedLot.quantidade_disponivel}</span><span>Status inspeção: {selectedLot.status_inspecao}</span><span className="text-amber-700">O registro solicita retenção do lote no fluxo de quarentena.</span></div>}
            </section>

            <section className="rnc-section border border-slate-200 bg-white print:break-inside-avoid">
              <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-[#eaf4f8] px-3"><span className="text-[10px] font-bold text-[#123B50]">02</span><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Análise da causa raiz · 5 Porquês</h2></div>
              <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">{whys.map((item, index) => <div key={item.question}><FieldLabel help="Registre a causa com base em evidência verificável; a quinta etapa deve identificar uma falha sistêmica e não apenas atribuir culpa individual.">{'Por quê ' + (index + 1)}</FieldLabel><p className="mb-1 min-h-[28px] text-[10px] font-medium text-slate-600">{item.question}</p><textarea className={areaClass} value={item.answer} onChange={event => setWhys(current => current.map((why, i) => i === index ? { ...why, answer: event.target.value } : why))} placeholder={'Resposta / causa ' + (index + 1) + '…'}/><label className="mt-2 grid gap-1 text-[9px] font-bold uppercase text-slate-600">Evidência objetiva<textarea className={areaClass} value={item.evidence} onChange={event => setWhys(current => current.map((why, i) => i === index ? { ...why, evidence: event.target.value } : why))} placeholder="Medição, documento, observação ou registro que comprova esta causa…"/></label></div>)}</div>
              <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-3 md:grid-cols-2"><label className="flex items-start gap-2 text-[10px] font-bold text-slate-700"><input type="checkbox" checked={rootCauseValidated} onChange={event => setRootCauseValidated(event.target.checked)} className="mt-0.5"/>Causa raiz validada: a ação proposta bloqueia a reincidência?</label><label className="grid gap-1 text-[9px] font-bold uppercase text-slate-600">Justificativa da validação<textarea className={areaClass} value={rootCauseValidationNote} onChange={event => setRootCauseValidationNote(event.target.value)} placeholder="Evidência da validação ou motivo de ainda não estar confirmada…"/></label></div>
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
        <style>{'@media print{@page{size:A4 portrait;margin:10mm}.rnc-screen-header,.rnc-print-header,.rnc-history-section,.rnc-section,.rnc-signatures{display:none!important}.rnc-mgf-report{display:block!important;font-family:Arial,sans-serif;color:#111;font-size:9pt}.mgf-page{display:block;min-height:276mm;page-break-after:always;break-after:page;position:relative}.mgf-page:last-child{page-break-after:auto;break-after:auto}.mgf-doc-head{display:grid;grid-template-columns:1fr 1fr;gap:5px;border:1px solid #333;padding:8px;margin-bottom:10px;font-size:8pt}.mgf-doc-head span{grid-column:1/-1;text-align:right}.mgf-page h2{background:#e8edf1;border:1px solid #555;padding:5px;margin:10px 0 5px;font-size:9pt;font-weight:bold}.mgf-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.mgf-grid>div{border:1px solid #777;min-height:25px;padding:5px;display:flex;flex-direction:column;gap:3px}.mgf-grid b,.mgf-why b{font-size:7.5pt}.mgf-grid span,.mgf-why span{font-size:8pt;overflow-wrap:anywhere}.mgf-wide{grid-column:1/-1}.mgf-long{min-height:30px;white-space:pre-wrap}.mgf-lines{display:block;min-height:42px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 18px,#bbb 19px)}.mgf-six{grid-template-columns:1fr 1fr 1fr}.mgf-six .mgf-lines{min-height:52px}.mgf-why{border:1px solid #888;padding:5px;margin:4px 0;display:grid;gap:4px;min-height:34px}.mgf-action{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7pt}.mgf-action th,.mgf-action td{border:1px solid #555;padding:4px;overflow-wrap:anywhere}.mgf-action th{background:#e8edf1}.mgf-action td{height:24px}.mgf-sign{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:35px}.mgf-sign span{border-top:1px solid #333;padding-top:4px;text-align:center;font-size:7pt}.mgf-sign-four{grid-template-columns:1fr 1fr;row-gap:28px}.mgf-note{margin-top:12px;font-size:7pt;color:#444}.rnc-screen-header,.rnc-history-section{display:none!important}.rnc-print-header{display:grid!important}.rnc-print-document{max-width:none!important;width:100%!important}.rnc-actions-table{min-width:0!important;font-size:8px!important}.rnc-actions-table th,.rnc-actions-table td{padding:2px!important;overflow-wrap:anywhere}.rnc-actions-table input,.rnc-actions-table select{height:auto!important;min-height:0!important;padding:1px!important;border:0!important;background:transparent!important;font-size:8px!important;color:#111!important}.rnc-actions-table button,.group span[role=tooltip]{display:none!important}.rnc-section{margin-bottom:6px!important;break-inside:avoid}.rnc-signatures{padding-top:22px!important;padding-bottom:8px!important}.rnc-signatures div{min-height:22px}}'}</style>
      </main>
    </ERPHorizontalShell>
  )
}
