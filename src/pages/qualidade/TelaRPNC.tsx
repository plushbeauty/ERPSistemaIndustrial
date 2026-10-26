import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, Download, FileText,
  ImagePlus, Plus, Printer, RefreshCw, Save, Search, ShieldAlert, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import '../../styles/rpnc-tokens.css'

type TabId = 'relato' | 'causas' | 'acoes' | 'eficacia' | 'anexos'
type ActionStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'
type Destination = 'FORNECEDOR' | 'CLIENTE' | 'AUDITORIA_INTERNA' | 'AUDITORIA_EXTERNA' | 'PROCESSO' | 'PROCEDIMENTO'
type CauseKind = 'MATERIA_PRIMA' | 'METODO' | 'MATRIZ_RISCO'
type LotLine = { rowId: string; code: string; quantity: string }
type TeamMember = { rowId: string; name: string; role: string; sector: string }
type CauseChain = { rowId: string; kind: CauseKind; immediateCause: string; whys: string[] }
type CorrectiveAction = { rowId: string; action: string; owner: string; dueDate: string; completedAt: string; status: ActionStatus; replication: boolean }
type ReportData = {
  schemaVersion: 1
  recipient?: string
  occurrenceTime: string
  restorationTime: string
  recurrence: 'INICIAL' | 'REINCIDENCIA'
  itemCode: string
  itemDescription: string
  location: string
  equipment: string
  specifiedCondition: string
  receivedCondition: string
  lots: LotLine[]
  investigationSummary: string
  investigationSketch: string
  containment: { action: string; owner: string; completedAt: string }
  team: TeamMember[]
  fishbone: Record<string, string>
  causeChains: CauseChain[]
  actions: CorrectiveAction[]
  preventiveAction: string
  effectiveness: { report: string; dueDate: string; completedAt: string; status: ActionStatus }
  standardization: { pokaYoke: boolean; reason: string; documents: string; owner: string; dueDate: string; reviewedAt: string }
  closure: { date: string; teamLeader: string; supervisor: string }
  qualityOwnerName: string
}
type FormData = { number: string; destination: Destination; recipient: string; date: string; severity: string; description: string; clientId: string; report: ReportData }
type RPNC = {
  id: string
  numero_rpnc: string | null
  descricao_nao_conformidade: string | null
  origem: string | null
  gravidade: string | null
  status: string | null
  criado_em: string
  lote_producao: string | null
  bloqueia_lote: boolean | null
  sgq_tipo_registro: string | null
  sgq_cliente_id: string | null
  sgq_data_ocorrencia: string | null
  sgq_lote: string | null
  quantidade_segregada: number | null
  sgq_responsavel_id: string | null
  sgq_contencao: string | null
  investigacao: string | null
  acao_corretiva: string | null
  sgq_acao_preventiva: string | null
  sgq_verificacao_eficacia: string | null
  sgq_data_prazo: string | null
  sgq_tratamento_anomalia: ReportData | null
}
type Attachment = { id: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null; created_at: string; url: string }

const DESTINATIONS: { value: Destination; label: string; dbType: string; dbOrigin: string }[] = [
  { value: 'FORNECEDOR', label: 'Fornecedor', dbType: 'INTERNO', dbOrigin: 'fornecedor' },
  { value: 'CLIENTE', label: 'Cliente', dbType: 'RPNC_CLIENTE', dbOrigin: 'cliente' },
  { value: 'AUDITORIA_INTERNA', label: 'Auditoria interna', dbType: 'AUDITORIA_INTERNA', dbOrigin: 'auditoria interna' },
  { value: 'AUDITORIA_EXTERNA', label: 'Auditoria externa', dbType: 'AUDITORIA_EXTERNA', dbOrigin: 'auditoria externa' },
  { value: 'PROCESSO', label: 'Processo', dbType: 'RPNC_PROCESSO', dbOrigin: 'processo' },
  { value: 'PROCEDIMENTO', label: 'Procedimento', dbType: 'RPNC_PROCESSO', dbOrigin: 'procedimento' },
]
const TABS: { id: TabId; label: string }[] = [
  { id: 'relato', label: '1 · Relato do problema' },
  { id: 'causas', label: '2 · Ishikawa / 5 Porquês' },
  { id: 'acoes', label: '3 · Contenção e ações' },
  { id: 'eficacia', label: '4 · Eficácia / padronização' },
  { id: 'anexos', label: '5 · Anexos das ações' },
]
const FISHBONE = ['Método', 'Máquina', 'Mão de obra', 'Material', 'Medição', 'Meio ambiente'] as const
const CAUSE_KINDS: { value: CauseKind; label: string }[] = [
  { value: 'MATERIA_PRIMA', label: 'Matéria-prima' },
  { value: 'METODO', label: 'Método / detecção' },
  { value: 'MATRIZ_RISCO', label: 'Matriz de risco' },
]
const ACTION_STATUSES: ActionStatus[] = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO']
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt'])
const tableName = 'erp_documentos_anexos'

const localDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const makeId = () => crypto.randomUUID()
const makeRpnNumber = () => `RPNC-${new Date().getFullYear()}-${makeId().replace(/-/g, '').slice(0, 8).toUpperCase()}`
const newLot = (): LotLine => ({ rowId: makeId(), code: '', quantity: '' })
const newMember = (): TeamMember => ({ rowId: makeId(), name: '', role: '', sector: '' })
const newCauseChain = (): CauseChain => ({ rowId: makeId(), kind: 'MATERIA_PRIMA', immediateCause: '', whys: ['', '', '', '', ''] })
const newAction = (): CorrectiveAction => ({ rowId: makeId(), action: '', owner: '', dueDate: '', completedAt: '', status: 'PENDENTE', replication: false })

const blankReport = (): ReportData => ({
  schemaVersion: 1,
  occurrenceTime: '', restorationTime: '', recurrence: 'INICIAL', itemCode: '', itemDescription: '',
  location: '', equipment: '', specifiedCondition: '', receivedCondition: '', lots: [newLot()],
  investigationSummary: '', investigationSketch: '', containment: { action: '', owner: '', completedAt: '' },
  team: [newMember()], fishbone: Object.fromEntries(FISHBONE.map(item => [item, ''])),
  causeChains: [newCauseChain()], actions: [newAction()], preventiveAction: '',
  effectiveness: { report: '', dueDate: '', completedAt: '', status: 'PENDENTE' },
  standardization: { pokaYoke: false, reason: '', documents: '', owner: '', dueDate: '', reviewedAt: '' },
  closure: { date: '', teamLeader: '', supervisor: '' }, qualityOwnerName: '',
})

const blankForm = (): FormData => ({
  number: makeRpnNumber(), destination: 'FORNECEDOR', recipient: '', date: localDate(), severity: 'Menor',
  description: '', clientId: '', report: blankReport(),
})

const referenceForm = (): FormData => {
  const form = blankForm()
  form.number = '06-26'
  form.destination = 'CLIENTE'
  form.recipient = 'Moura'
  form.date = '2026-10-08'
  form.severity = 'Maior'
  form.description = 'Durante a inspeção de recebimento, foi identificada uma não conformidade no acabamento das tampas: coloração preta fosca, divergente do preto com brilho especificado no desenho técnico.'
  form.report = {
    ...blankReport(),
    occurrenceTime: '', restorationTime: '', recurrence: 'INICIAL', itemCode: '18009721',
    itemDescription: 'TAMPA VRLA AGM NOBREAK/AL G2 PP VIRGEM',
    specifiedCondition: 'Preto brilhante, conforme desenho técnico',
    receivedCondition: 'Preto fosco, observado no recebimento',
    lots: [
      { rowId: makeId(), code: '397', quantity: '2352' },
      { rowId: makeId(), code: '402', quantity: '5712' },
      { rowId: makeId(), code: '408', quantity: '6384' },
    ],
    investigationSummary: 'A ocorrência foi relacionada à variação de aditivos no lote de resina e à avaliação visual realizada imediatamente após a injeção. O formulário de referência aponta que a manifestação tardia do aspecto fosco não estava prevista no plano de controle e na matriz de risco.',
    investigationSketch: '',
    containment: {
      action: 'Identificar e bloquear as tampas restantes dos lotes de produto acabado 397, 402 e 408, segregar visualmente as peças e suspender temporariamente o uso do lote de matéria-prima até a tratativa.',
      owner: 'Controle de Qualidade / Logística Interna', completedAt: '2026-10-14',
    },
    team: [
      { rowId: makeId(), name: 'Fernando Schuinsekel', role: 'Insp. Qualidade', sector: 'Qualidade' },
      { rowId: makeId(), name: 'Maria Silvanda', role: 'Gerente Comercial', sector: 'Adm' },
    ],
    fishbone: {
      Método: 'Inspeção final limitada ao aspecto visual imediatamente após a injeção.',
      Máquina: '',
      'Mão de obra': '',
      Material: 'Variação química no lote de polipropileno e migração tardia de aditivos para a superfície.',
      Medição: 'Plano de controle sem retenção temporal de amostras para teste de estabilidade visual.',
      'Meio ambiente': '',
    },
    causeChains: [
      {
        rowId: makeId(), kind: 'MATERIA_PRIMA', immediateCause: 'Variação no acabamento do lote de resina.',
        whys: [
          'Instabilidade química por variação na dosagem de aditivos e auxiliares de fluxo no lote de resina.',
          'Migração excessiva de aditivos de desmoldagem e ceras para a superfície da tampa dias após a moldagem.',
          'Segregação de fases acelerada dos componentes químicos durante o período de pós-cura molecular.',
          'Oscilação térmica nas zonas de plastificação e homogeneização da linha de extrusão do fabricante da resina.',
          'Ausência de manutenção preventiva e calibração periódica nos sensores de controle térmico da linha de extrusão.',
        ],
      },
      {
        rowId: makeId(), kind: 'METODO', immediateCause: 'Falha na detecção visual após o período de estabilização.',
        whys: [
          'A inspeção final se limitava ao aspecto estético imediato pós-injeção.',
          'A liberação considerava a coloração brilhante no momento da extração do molde.',
          'A perda de brilho do polipropileno se manifesta após dias de repouso em estoque.',
          'O plano de controle não previa retenção de amostras nem teste de estabilidade visual.',
          'Não havia janela de quarentena pós-estabilização térmica para auditoria do produto antes da expedição.',
        ],
      },
      {
        rowId: makeId(), kind: 'MATRIZ_RISCO', immediateCause: 'A perda tardia de brilho não constava como modo de falha potencial.',
        whys: [
          'A exsudação tardia não foi incluída na matriz de risco.',
          'O acabamento era atribuído exclusivamente ao polimento das cavidades do molde.',
          'A engenharia não mapeava a relação entre estabilidade visual e variações químicas da resina.',
          'O histórico de homologação do PP era tratado como indicação de comportamento estável.',
          'O FMEA de processo não considerava o impacto da migração de aditivos de fluxo na aparência final.',
        ],
      },
    ],
    actions: [
      { rowId: makeId(), action: 'Emitir notificação de desvio técnico ao fabricante da resina e solicitar laudo laboratorial da corrida química.', owner: 'Compras', dueDate: '2026-10-26', completedAt: '', status: 'EM_ANDAMENTO', replication: false },
      { rowId: makeId(), action: 'Atualizar a auditoria interna de recebimento para exigir teste de envelhecimento térmico antes da liberação de novos lotes de resina.', owner: 'Garantia da Qualidade', dueDate: '2026-10-28', completedAt: '', status: 'EM_ANDAMENTO', replication: false },
      { rowId: makeId(), action: 'Implantar retenção física de amostras de produto acabado por sete dias antes da liberação do faturamento.', owner: 'Garantia da Qualidade', dueDate: '2026-10-28', completedAt: '', status: 'EM_ANDAMENTO', replication: false },
      { rowId: makeId(), action: 'Replicar auditoria de lote e quarentena estática para os códigos de tampas e componentes injetados com resina de alto brilho.', owner: 'Garantia da Qualidade', dueDate: '2026-11-04', completedAt: '', status: 'EM_ANDAMENTO', replication: true },
    ],
    preventiveAction: 'Aplicar as novas regras de auditoria de lote e retenção temporal aos demais componentes injetados com requisito de alto brilho.',
    effectiveness: {
      report: 'O formulário de referência descreve isolamento do lote de resina com desvio, uso de nova corrida acompanhada de certificado químico e avaliação visual após o período de estabilização.',
      dueDate: '2026-11-13', completedAt: '', status: 'EM_ANDAMENTO',
    },
    standardization: {
      pokaYoke: false,
      reason: 'O controle depende de ensaios térmicos laboratoriais e de janela de quarentena pós-cura; o relatório não registra um dispositivo à prova de erro implantado.',
      documents: 'FMEA de Processo e/ou Produto; Plano de Controle; instruções de trabalho; lista de lições aprendidas; formulário de auditoria escalonada.',
      owner: 'Fernando', dueDate: '', reviewedAt: '',
    },
    closure: { date: '', teamLeader: 'Fernando', supervisor: 'Vanda' },
    qualityOwnerName: '',
  }
  return form
}

const styles = {
  panel: 'rounded-[3px] border border-[#d5e2e7] bg-white p-3 shadow-sm',
  button: 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[2px] border border-[#c7d7df] bg-white px-3 py-1.5 text-[11px] font-bold text-[#123B50] hover:border-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-50',
  primary: 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[2px] border border-[#123B50] bg-[#123B50] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#174d68] disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-800 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-50',
  input: 'rpnc-control',
}

const escapeHtml = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
const formatDate = (value: string | null | undefined) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'
const formatQty = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value)
const typeForDestination = (value: Destination) => DESTINATIONS.find(item => item.value === value) ?? DESTINATIONS[0]

function rowStatus(row: RPNC): string {
  if (row.bloqueia_lote) return 'EM_QUARENTENA'
  if (['encerrada', 'fechada', 'concluida', 'concluído'].includes((row.status || '').toLocaleLowerCase('pt-BR'))) return 'CONCLUIDO'
  return 'ABERTO'
}

function durationMinutes(start: string, end: string): number | null {
  if (!start || !end) return null
  const [startHours, startMinutes] = start.split(':').map(Number)
  const [endHours, endMinutes] = end.split(':').map(Number)
  if (![startHours, startMinutes, endHours, endMinutes].every(Number.isFinite)) return null
  let minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}

function durationLabel(minutes: number | null): string {
  if (minutes === null) return '—'
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

function noteRecipient(note: string | null): string {
  return (note || '').match(/^Destinatário:\s*(.*)$/mi)?.[1]?.trim() ?? ''
}

function formFromRow(row: RPNC): FormData {
  const base = blankForm()
  const stored = row.sgq_tratamento_anomalia && typeof row.sgq_tratamento_anomalia === 'object'
    ? row.sgq_tratamento_anomalia
    : null
  const origin = (row.origem || '').toLowerCase()
  const destination = origin.includes('cliente') ? 'CLIENTE'
    : origin.includes('fornecedor') ? 'FORNECEDOR'
      : origin.includes('auditoria externa') ? 'AUDITORIA_EXTERNA'
        : origin.includes('auditoria interna') ? 'AUDITORIA_INTERNA'
          : origin.includes('procedimento') ? 'PROCEDIMENTO'
            : origin.includes('processo') ? 'PROCESSO' : 'FORNECEDOR'
  const report = stored ? {
    ...base.report,
    ...stored,
    containment: { ...base.report.containment, ...(stored.containment ?? {}) },
    effectiveness: { ...base.report.effectiveness, ...(stored.effectiveness ?? {}) },
    standardization: { ...base.report.standardization, ...(stored.standardization ?? {}) },
    closure: { ...base.report.closure, ...(stored.closure ?? {}) },
    fishbone: { ...base.report.fishbone, ...(stored.fishbone ?? {}) },
    lots: Array.isArray(stored.lots) && stored.lots.length ? stored.lots : base.report.lots,
    team: Array.isArray(stored.team) && stored.team.length ? stored.team : base.report.team,
    causeChains: Array.isArray(stored.causeChains) && stored.causeChains.length ? stored.causeChains : base.report.causeChains,
    actions: Array.isArray(stored.actions) && stored.actions.length ? stored.actions : base.report.actions,
  } as ReportData : {
    ...base.report,
    itemDescription: '',
    lots: row.sgq_lote ? [{ rowId: makeId(), code: row.sgq_lote, quantity: String(row.quantidade_segregada ?? '') }] : base.report.lots,
    containment: { ...base.report.containment, action: row.sgq_contencao ?? '' },
    investigationSummary: row.investigacao ?? '',
    actions: row.acao_corretiva ? [{ ...newAction(), action: row.acao_corretiva, owner: '', dueDate: row.sgq_data_prazo ?? '' }] : base.report.actions,
    preventiveAction: row.sgq_acao_preventiva ?? '',
    effectiveness: { ...base.report.effectiveness, report: row.sgq_verificacao_eficacia ?? '', dueDate: row.sgq_data_prazo ?? '' },
  }
  return {
    number: row.numero_rpnc ?? base.number,
    destination,
    recipient: stored?.recipient ?? noteRecipient(row.investigacao),
    date: row.sgq_data_ocorrencia ?? row.criado_em.slice(0, 10),
    severity: row.gravidade ?? 'Menor',
    description: row.descricao_nao_conformidade ?? '',
    clientId: row.sgq_cliente_id ?? '',
    report: { ...report, qualityOwnerName: report.qualityOwnerName || '' },
  }
}

function buildInvestigationText(form: FormData): string {
  const lines = [
    `Destinatário: ${form.recipient.trim() || 'Não informado'}`,
    `Item de controle: ${form.report.itemCode.trim()} · ${form.report.itemDescription.trim()}`,
    `Local / equipamento: ${form.report.location.trim()} · ${form.report.equipment.trim()}`,
    'RESULTADOS DA INVESTIGAÇÃO',
    form.report.investigationSummary.trim(),
    'ANÁLISE DE CAUSAS — ISHIKAWA (6M)',
    ...FISHBONE.map(key => `${key}: ${form.report.fishbone[key]?.trim() || '—'}`),
    'ANÁLISE DOS 5 PORQUÊS',
    ...form.report.causeChains.flatMap((chain, index) => [
      `CAUSA ${index + 1} · ${CAUSE_KINDS.find(item => item.value === chain.kind)?.label ?? chain.kind}: ${chain.immediateCause.trim() || '—'}`,
      ...chain.whys.map((why, whyIndex) => `${whyIndex + 1}º porquê: ${why.trim() || '—'}`),
    ]),
    `Croqui / ilustração: ${form.report.investigationSketch.trim() || '—'}`,
  ]
  return lines.filter((line, index) => line || ['RESULTADOS DA INVESTIGAÇÃO', 'ANÁLISE DE CAUSAS — ISHIKAWA (6M)', 'ANÁLISE DOS 5 PORQUÊS'].includes(line) || index < 3).join('\n')
}

export default function TelaRPNC({ companyName = 'SYSNQRA', logoUrl }: { companyName?: string; logoUrl?: string }) {
  const [rows, setRows] = useState<RPNC[]>([])
  const [selected, setSelected] = useState<RPNC | null>(null)
  const [form, setForm] = useState<FormData>(blankForm)
  const [editingId, setEditingId] = useState('')
  const [tab, setTab] = useState<TabId>('relato')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [companyId, setCompanyId] = useState('')
  const [erpUserId, setErpUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const currentCompany = tenant.data
      setCompanyId(currentCompany)
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Entre com uma conta autorizada para consultar o SGQ.')
      const [records, profile] = await Promise.all([
        supabase.from('erp_rpnc')
          .select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,status,criado_em,lote_producao,bloqueia_lote,sgq_tipo_registro,sgq_cliente_id,sgq_data_ocorrencia,sgq_lote,quantidade_segregada,sgq_responsavel_id,sgq_contencao,investigacao,acao_corretiva,sgq_acao_preventiva,sgq_verificacao_eficacia,sgq_data_prazo,sgq_tratamento_anomalia')
          .eq('empresa_id', currentCompany)
          .order('criado_em', { ascending: false })
          .limit(500),
        supabase.from('erp_usuarios')
          .select('id,nome,email')
          .eq('auth_user_id', auth.data.user.id)
          .eq('empresa_id', currentCompany)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle(),
      ])
      if (records.error) throw records.error
      if (profile.error) throw profile.error
      setErpUserId(profile.data?.id ? String(profile.data.id) : '')
      const nextRows = (records.data ?? []) as RPNC[]
      setRows(nextRows)
      setSelected(current => current ? nextRows.find(row => row.id === current.id) ?? current : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar os relatórios RPNC.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => rows.filter(row => {
    const report = row.sgq_tratamento_anomalia
    const term = query.trim().toLocaleLowerCase('pt-BR')
    const searchValues = [row.numero_rpnc, row.descricao_nao_conformidade, row.origem, row.sgq_lote, report?.recipient, report?.itemCode, report?.itemDescription, ...(report?.lots ?? []).map(item => item.code)]
    const matchesTerm = !term || searchValues.some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    return matchesTerm && (statusFilter === 'TODOS' || rowStatus(row) === statusFilter)
  }), [rows, query, statusFilter])

  const totals = useMemo(() => ({
    open: rows.filter(row => rowStatus(row) === 'ABERTO').length,
    quarantined: rows.filter(row => rowStatus(row) === 'EM_QUARENTENA').length,
    closed: rows.filter(row => rowStatus(row) === 'CONCLUIDO').length,
  }), [rows])

  const currentLotTotal = form.report.lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.quantity) || 0), 0)
  const computedDuration = durationMinutes(form.report.occurrenceTime, form.report.restorationTime)

  async function loadAttachments(rpncId: string, tenantId = companyId) {
    if (!rpncId || !tenantId) { setAttachments([]); return }
    const result = await supabase.from(tableName)
      .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at')
      .eq('empresa_id', tenantId)
      .eq('entidade_tipo', 'rnc_acao')
      .eq('entidade_id', rpncId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (result.error) throw result.error
    const files = await Promise.all((result.data ?? []).map(async row => {
      const path = String(row.storage_path)
      const signed = await supabase.storage.from('documentos-erp').createSignedUrl(path, 600)
      return {
        id: String(row.id), nome_arquivo: String(row.nome_arquivo), storage_path: path,
        mime_type: row.mime_type ? String(row.mime_type) : null,
        tamanho_bytes: row.tamanho_bytes === null ? null : Number(row.tamanho_bytes),
        created_at: String(row.created_at), url: signed.error ? '' : signed.data?.signedUrl ?? '',
      } satisfies Attachment
    }))
    setAttachments(files)
  }

  function openNew() {
    setError(''); setNotice(''); setSelected(null); setEditingId(''); setAttachments([])
    setForm(blankForm()); setTab('relato'); setOpen(true)
  }

  function loadReferenceDraft() {
    setForm(referenceForm())
    setNotice('Dados do relatório enviado carregados como rascunho. Revise cada campo antes de gravar; nada foi enviado ao banco ainda.')
    setError('')
  }

  function openRecord(row: RPNC) {
    setSelected(row); setEditingId(row.id); setForm(formFromRow(row)); setTab('relato'); setOpen(true); setError(''); setNotice('')
    void loadAttachments(row.id).catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os anexos da RPNC.'))
  }

  function setReport<K extends keyof ReportData>(key: K, value: ReportData[K]) {
    setForm(current => ({ ...current, report: { ...current.report, [key]: value } }))
  }

  function setContainment(key: keyof ReportData['containment'], value: string) {
    setForm(current => ({ ...current, report: { ...current.report, containment: { ...current.report.containment, [key]: value } } }))
  }

  function setEffectiveness(key: keyof ReportData['effectiveness'], value: string) {
    setForm(current => ({ ...current, report: { ...current.report, effectiveness: { ...current.report.effectiveness, [key]: value } } }))
  }

  function setStandardization(key: keyof ReportData['standardization'], value: string | boolean) {
    setForm(current => ({ ...current, report: { ...current.report, standardization: { ...current.report.standardization, [key]: value } } }))
  }

  function setClosure(key: keyof ReportData['closure'], value: string) {
    setForm(current => ({ ...current, report: { ...current.report, closure: { ...current.report.closure, [key]: value } } }))
  }

  function updateLot(rowId: string, key: keyof LotLine, value: string) {
    setReport('lots', form.report.lots.map(row => row.rowId === rowId ? { ...row, [key]: value } : row))
  }

  function updateMember(rowId: string, key: keyof TeamMember, value: string) {
    setReport('team', form.report.team.map(row => row.rowId === rowId ? { ...row, [key]: value } : row))
  }

  function updateCauseChain(rowId: string, key: 'kind' | 'immediateCause', value: string) {
    setReport('causeChains', form.report.causeChains.map(row => row.rowId === rowId ? { ...row, [key]: value } as CauseChain : row))
  }

  function updateWhy(rowId: string, index: number, value: string) {
    setReport('causeChains', form.report.causeChains.map(row => row.rowId === rowId ? { ...row, whys: row.whys.map((why, whyIndex) => whyIndex === index ? value : why) } : row))
  }

  function updateAction(rowId: string, key: keyof CorrectiveAction, value: string | boolean) {
    setReport('actions', form.report.actions.map(row => row.rowId === rowId ? { ...row, [key]: value } as CorrectiveAction : row))
  }

  async function save() {
    setError(''); setNotice('')
    if (!form.number.trim()) { setError('Informe o número do relatório.'); setTab('relato'); return }
    if (!form.date) { setError('Informe a data da ocorrência.'); setTab('relato'); return }
    if (!form.report.itemCode.trim() || !form.report.itemDescription.trim()) { setError('Informe o código e a descrição do item de controle.'); setTab('relato'); return }
    if (form.description.trim().length < 10) { setError('Descreva a anomalia com pelo menos 10 caracteres.'); setTab('relato'); return }
    if (!erpUserId) { setError('O usuário autenticado não está vinculado a um usuário ERP ativo nesta empresa. O relatório não foi gravado.'); setTab('relato'); return }

    setSaving(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada indisponível.')
      const profile = await supabase.from('erp_usuarios')
        .select('id,nome,email')
        .eq('auth_user_id', auth.data.user.id)
        .eq('empresa_id', tenant.data)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.id) throw new Error('Usuário ERP ativo não encontrado para esta empresa.')

      const destination = typeForDestination(form.destination)
      const report: ReportData = {
        ...form.report,
        qualityOwnerName: profile.data.nome || profile.data.email || auth.data.user.email || '',
        lots: form.report.lots.filter(lot => lot.code.trim() || lot.quantity.trim()),
        team: form.report.team.filter(member => member.name.trim() || member.role.trim() || member.sector.trim()),
        causeChains: form.report.causeChains.filter(chain => chain.immediateCause.trim() || chain.whys.some(why => why.trim())),
        actions: form.report.actions.filter(action => action.action.trim() || action.owner.trim() || action.dueDate || action.completedAt),
      }
      const lotCodes = report.lots.map(lot => lot.code.trim()).filter(Boolean)
      const totalQuantity = report.lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.quantity) || 0), 0)
      const actionText = report.actions.map(action => action.action.trim()).filter(Boolean).join('\n')
      const dueDates = report.actions.map(action => action.dueDate).filter(Boolean).sort()
      const payload = {
        empresa_id: tenant.data,
        numero_rpnc: form.number.trim(),
        descricao_nao_conformidade: form.description.trim(),
        origem: destination.dbOrigin,
        gravidade: form.severity.toLocaleLowerCase('pt-BR'),
        status: editingId ? selected?.status ?? 'aberta' : 'aberta',
        sgq_tipo_registro: destination.dbType,
        sgq_lote: lotCodes[0] ?? null,
        lote_producao: lotCodes[0] ?? null,
        quantidade_segregada: totalQuantity,
        sgq_data_ocorrencia: form.date,
        sgq_responsavel_id: profile.data.id,
        sgq_data_prazo: dueDates[0] ?? (report.effectiveness.dueDate || null),
        sgq_contencao: report.containment.action.trim() || null,
        investigacao: buildInvestigationText({ ...form, report }),
        acao_corretiva: actionText || null,
        sgq_acao_preventiva: report.preventiveAction.trim() || null,
        sgq_verificacao_eficacia: report.effectiveness.report.trim() || null,
        sgq_tratamento_anomalia: { ...report, recipient: form.recipient.trim() },
        bloqueia_lote: editingId ? Boolean(selected?.bloqueia_lote) : false,
      }

      let saved: RPNC
      if (editingId) {
        const result = await supabase.from('erp_rpnc').update(payload).eq('empresa_id', tenant.data).eq('id', editingId)
          .select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,status,criado_em,lote_producao,bloqueia_lote,sgq_tipo_registro,sgq_cliente_id,sgq_data_ocorrencia,sgq_lote,quantidade_segregada,sgq_responsavel_id,sgq_contencao,investigacao,acao_corretiva,sgq_acao_preventiva,sgq_verificacao_eficacia,sgq_data_prazo,sgq_tratamento_anomalia')
          .single()
        if (result.error) throw result.error
        saved = result.data as RPNC
      } else {
        const result = await supabase.from('erp_rpnc').insert({ ...payload, sgq_cliente_id: null, sgq_produto_id: null, sgq_ordem_producao_id: null })
          .select('id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,status,criado_em,lote_producao,bloqueia_lote,sgq_tipo_registro,sgq_cliente_id,sgq_data_ocorrencia,sgq_lote,quantidade_segregada,sgq_responsavel_id,sgq_contencao,investigacao,acao_corretiva,sgq_acao_preventiva,sgq_verificacao_eficacia,sgq_data_prazo,sgq_tratamento_anomalia')
          .single()
        if (result.error) throw result.error
        saved = result.data as RPNC
      }

      setErpUserId(String(profile.data.id))
      setEditingId(saved.id); setSelected(saved)
      setRows(current => [saved, ...current.filter(row => row.id !== saved.id)])
      setForm({ ...form, report })
      setNotice(`RPNC ${saved.numero_rpnc ?? form.number} gravada. Você já pode consultar o registro, anexar evidências e, se aplicável, solicitar a quarentena dos lotes.`)
    } catch (cause) {
      setError(cause instanceof Error ? `Não foi possível gravar a RPNC: ${cause.message}` : 'Não foi possível gravar a RPNC.')
    } finally { setSaving(false) }
  }

  async function blockLots() {
    setError(''); setNotice('')
    if (!editingId || !selected) { setError('Grave a RPNC antes de solicitar a retenção dos lotes.'); return }
    if (selected.bloqueia_lote) { setNotice('Esta RPNC já está marcada com lotes em quarentena.'); return }
    const entries = form.report.lots.filter(lot => lot.code.trim())
    if (!entries.length) { setError('Informe pelo menos um código de lote antes de solicitar a quarentena.'); setTab('relato'); return }
    if (new Set(entries.map(lot => lot.code.trim().toLocaleUpperCase('pt-BR'))).size !== entries.length) { setError('Remova códigos de lote duplicados antes de solicitar a quarentena.'); setTab('relato'); return }
    setBlocking(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const lotIds: string[] = []
      for (const entry of entries) {
        const internal = await supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor').eq('empresa_id', tenant.data).eq('lote_interno', entry.code.trim()).maybeSingle()
        if (internal.error) throw internal.error
        const supplier = internal.data ? null : await supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor').eq('empresa_id', tenant.data).eq('lote_fornecedor', entry.code.trim()).maybeSingle()
        if (supplier?.error) throw supplier.error
        const inventoryLot = internal.data ?? supplier?.data
        if (!inventoryLot?.id) throw new Error(`Lote ${entry.code} não foi encontrado no estoque da empresa; nenhum bloqueio foi solicitado.`)
        lotIds.push(String(inventoryLot.id))
      }
      const reason = `RPNC ${selected.numero_rpnc ?? form.number}: ${form.description.trim()}`.slice(0, 450)
      const result = await supabase.rpc('erp_rpnc_reter_lotes', { p_rpnc_id: editingId, p_lote_ids: lotIds, p_motivo: reason })
      if (result.error) throw result.error
      setNotice(`${lotIds.length} lote(s) retido(s) pelo fluxo transacional de quarentena do ERP.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? `Quarentena não confirmada: ${cause.message}` : 'Quarentena não confirmada. Consulte o estoque antes de repetir.')
    } finally { setBlocking(false) }
  }

  async function uploadAttachment(file?: File) {
    if (!file || !editingId || !companyId) return
    setError(''); setNotice('')
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.has(extension)) { setError('Formato não permitido. Use PDF, imagem, Word, Excel ou TXT.'); return }
    if (file.size > MAX_ATTACHMENT_BYTES) { setError('O anexo excede o limite de 25 MB.'); return }
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `${companyId}/rpnc/${editingId}/${makeId()}-${safeName}`
    try {
      const stored = await supabase.storage.from('documentos-erp').upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (stored.error) throw stored.error
      const inserted = await supabase.from(tableName).insert({
        empresa_id: companyId,
        entidade_tipo: 'rnc_acao',
        entidade_id: editingId,
        nome_arquivo: file.name,
        storage_path: path,
        mime_type: file.type || null,
        tamanho_bytes: file.size,
      })
      if (inserted.error) {
        await supabase.storage.from('documentos-erp').remove([path])
        throw inserted.error
      }
      setNotice('Evidência da ação anexada e vinculada à RPNC.')
      await loadAttachments(editingId, companyId)
    } catch (cause) {
      setError(cause instanceof Error ? `Falha ao salvar o anexo: ${cause.message}` : 'Falha ao salvar o anexo da ação.')
    } finally { setUploading(false) }
  }

  function printReport(row: RPNC) {
    const data = row.sgq_tratamento_anomalia ?? blankReport()
    const windowRef = window.open('', '_blank')
    if (!windowRef) { setError('O navegador bloqueou a janela de impressão. Autorize pop-ups para gerar o relatório.'); return }
    const logo = logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(companyName)}" />` : ''
    const tableRow = (label: string, value: unknown) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '—')}</td></tr>`
    const lots = data.lots.map(lot => `<tr><td>${escapeHtml(lot.code)}</td><td class="num">${escapeHtml(lot.quantity ? formatQty(Number(lot.quantity)) : '—')}</td></tr>`).join('')
    const causes = data.causeChains.map((chain, index) => `<section><h3>Causa ${index + 1} · ${escapeHtml(CAUSE_KINDS.find(item => item.value === chain.kind)?.label ?? chain.kind)}</h3><p><b>Causa imediata:</b> ${escapeHtml(chain.immediateCause)}</p><ol>${chain.whys.map((why, whyIndex) => `<li>${whyIndex + 1}º porquê: ${escapeHtml(why)}</li>`).join('')}</ol></section>`).join('')
    const actions = data.actions.map(action => `<tr><td>${escapeHtml(action.action)}</td><td>${escapeHtml(action.owner)}</td><td>${escapeHtml(formatDate(action.dueDate))}</td><td>${escapeHtml(formatDate(action.completedAt))}</td><td>${escapeHtml(action.status)}</td></tr>`).join('')
    const fishbone = FISHBONE.map(key => tableRow(key, data.fishbone?.[key])).join('')
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(row.numero_rpnc || 'RPNC')}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#173b4d;margin:0;line-height:1.4}header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #2d8db8;padding:0 0 9px;margin-bottom:10px}.logo{max-width:95px;max-height:52px;object-fit:contain}h1{font-size:18px;margin:0 0 3px;color:#123b50}h2{margin:12px 0 5px;padding:4px 6px;background:#edf6f9;border-left:3px solid #2d8db8;font-size:11px;color:#123b50}h3{font-size:10px;margin:8px 0 3px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd8de;text-align:left;vertical-align:top;padding:5px;white-space:pre-wrap;overflow-wrap:anywhere}th{width:25%;background:#f4f8fa;font-weight:700}.num{text-align:right;font-variant-numeric:tabular-nums}.sub{font-size:8px;color:#617783}.footer{margin-top:12px;font-size:8px;color:#617783}.sign{display:flex;gap:18px;margin-top:30px}.sign div{border-top:1px solid #637b85;padding-top:5px;width:50%;font-size:9px}@media print{.no-print{display:none}}
    </style></head><body><header>${logo}<div><div class="sub">${escapeHtml(companyName)} · SISTEMA DE GESTÃO DA QUALIDADE</div><h1>Relatório de Tratamento de Anomalia / RPNC</h1><div>RNC: <b>${escapeHtml(row.numero_rpnc || row.id)}</b> · Emitido em ${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</div></div></header>
    <h2>1. Relato do problema</h2><table>${tableRow('Destinatário / origem', `${data.recipient || ''} · ${row.origem || ''}`)}${tableRow('Data e horário da ocorrência', `${formatDate(row.sgq_data_ocorrencia)} · ${data.occurrenceTime || '—'}`)}${tableRow('Restauração / duração', `${data.restorationTime || '—'} · ${durationLabel(durationMinutes(data.occurrenceTime, data.restorationTime))}`)}${tableRow('Ocorrência', data.recurrence === 'REINCIDENCIA' ? 'Reincidência' : 'Inicial')}${tableRow('Item de controle', `${data.itemCode || ''} · ${data.itemDescription || ''}`)}${tableRow('Local / equipamento', `${data.location || ''} · ${data.equipment || ''}`)}${tableRow('Gravidade', row.gravidade)}${tableRow('Descrição da anomalia', row.descricao_nao_conformidade)}${tableRow('Especificado', data.specifiedCondition)}${tableRow('Recebido / observado', data.receivedCondition)}</table>
    <h2>2. Lotes e quantidades reprovadas</h2><table><thead><tr><th>Lote</th><th>Quantidade reprovada</th></tr></thead><tbody>${lots || '<tr><td colspan="2">—</td></tr>'}<tr><th>Total de peças</th><th class="num">${escapeHtml(formatQty(Number(row.quantidade_segregada ?? 0)))}</th></tr></tbody></table>
    <h2>3. Investigação da ocorrência</h2><table>${tableRow('Resultados da investigação', data.investigationSummary || row.investigacao)}${tableRow('Ilustração / croqui', data.investigationSketch)}</table><h3>Ishikawa · 6M</h3><table>${fishbone}</table>${causes}
    <h2>4. Contenção, equipe e ações</h2><table>${tableRow('Ação de contenção', data.containment?.action || row.sgq_contencao)}${tableRow('Responsável pela contenção', data.containment?.owner)}${tableRow('Realizada em', formatDate(data.containment?.completedAt))}${tableRow('Responsável da Qualidade', data.qualityOwnerName)}${tableRow('Equipe de tratamento', (data.team ?? []).map(member => `${member.name} · ${member.role} · ${member.sector}`).join('\n'))}</table><table><thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Concluída em</th><th>Status</th></tr></thead><tbody>${actions || '<tr><td colspan="5">—</td></tr>'}</tbody></table>${tableRow('Prevenção da recorrência', data.preventiveAction || row.sgq_acao_preventiva)}
    <h2>5. Eficácia, padronização e encerramento</h2><table>${tableRow('Verificação de eficácia', data.effectiveness?.report || row.sgq_verificacao_eficacia)}${tableRow('Prazo / conclusão da eficácia', `${formatDate(data.effectiveness?.dueDate)} · ${formatDate(data.effectiveness?.completedAt)} · ${data.effectiveness?.status || 'PENDENTE'}`)}${tableRow('Sistema à prova de erro', data.standardization?.pokaYoke ? 'Sim' : `Não${data.standardization?.reason ? ` · ${data.standardization.reason}` : ''}`)}${tableRow('Documentos a revisar', data.standardization?.documents)}${tableRow('Responsável / prazo / revisão', `${data.standardization?.owner || ''} · ${formatDate(data.standardization?.dueDate)} · ${formatDate(data.standardization?.reviewedAt)}`)}${tableRow('Data / líder / supervisão', `${formatDate(data.closure?.date)} · ${data.closure?.teamLeader || ''} · ${data.closure?.supervisor || ''}`)}${tableRow('Status do registro', rowStatus(row))}</table>
    <div class="sign"><div>Responsável da Qualidade</div><div>Supervisão / aprovação</div></div><p class="footer">Relatório de trabalho gerado a partir do registro persistido no ERP. A impressão não substitui aprovação nem assinatura digital certificada.</p><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`
    windowRef.document.open(); windowRef.document.write(html); windowRef.document.close()
  }

  async function requestQuarantine() {
    await blockLots()
  }

  const Field = ({ label, children, span = 6 }: { label: string; children: React.ReactNode; span?: number }) => (
    <label className="block min-w-0" style={{ gridColumn: `span ${span}` }}>
      <span className="rpnc-label">{label}</span>{children}
    </label>
  )
  const input = (value: string, onChange: (value: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input {...props} className={`${styles.input} ${props.className ?? ''}`} value={value} onChange={event => onChange(event.target.value)} />
  )
  const textarea = (value: string, onChange: (value: string) => void, rows = 3) => (
    <textarea className={styles.input} rows={rows} value={value} onChange={event => onChange(event.target.value)} />
  )

  return (
    <main className="rpnc-workspace min-h-[calc(100vh-80px)] bg-[#F4FBFD] p-3 text-[#123B50]">
      <div className="mx-auto max-w-[1700px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d2e2e8] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {logoUrl && <img src={logoUrl} alt={`Logo ${companyName}`} className="max-h-10 max-w-24 object-contain" />}
            <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#2D8DB8]">{companyName} · SGQ · RPNC</p><h1 className="text-xl font-black">Tratamento de anomalia e produto não conforme</h1><p className="text-[11px] text-[#617783]">Relato, investigação, contenção, ações, evidências e consulta pelo registro persistido.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={styles.button} onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />{loading ? 'Consultando…' : 'Atualizar consulta'}</button>
            <button type="button" className={styles.primary} onClick={openNew}><Plus size={13} />Nova RPNC</button>
          </div>
        </header>

        {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 border px-3 py-2 text-[11px] font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}{error || notice}</div>}

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'RNC abertas', value: totals.open, color: 'text-[#B54708]', icon: <FileText size={15} /> },
            { label: 'Em quarentena', value: totals.quarantined, color: 'text-[#B42318]', icon: <ShieldAlert size={15} /> },
            { label: 'Concluídas', value: totals.closed, color: 'text-[#067647]', icon: <CheckCircle2 size={15} /> },
          ].map(card => <article key={card.label} className="border border-[#d5e2e7] bg-white px-3 py-2"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#617783]">{card.icon}{card.label}</p><strong className={`mt-1 block font-mono text-2xl ${card.color}`}>{loading ? '—' : card.value}</strong></article>)}
        </section>

        <section className={`${styles.panel} grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_220px]`}>
          <label className="relative block"><Search size={14} className="absolute left-2.5 top-[11px] text-slate-400" /><input className="rpnc-control pl-8" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar RNC, item, destinatário ou lote…" aria-label="Pesquisar RPNC" /></label>
          <select className="rpnc-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar status"><option value="TODOS">Todos os status</option><option value="ABERTO">Aberto</option><option value="EM_QUARENTENA">Em quarentena</option><option value="CONCLUIDO">Concluído</option></select>
        </section>

        <section className="overflow-x-auto border border-[#d5e2e7] bg-white">
          <table className="rpnc-table min-w-[920px]"><thead><tr><th>RNC</th><th>Item de controle</th><th>Destinatário</th><th>Data</th><th className="text-right">Lotes / peças</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {visible.map(row => {
              const report = row.sgq_tratamento_anomalia
              const lotCount = report?.lots?.filter(lot => lot.code).length ?? (row.sgq_lote ? 1 : 0)
              return <tr key={row.id} className={selected?.id === row.id ? 'bg-[#f0f8fa]' : ''}>
                <td className="font-mono font-bold">{row.numero_rpnc || row.id.slice(0, 8)}</td>
                <td>{report?.itemCode ? `${report.itemCode} · ${report.itemDescription}` : row.descricao_nao_conformidade || '—'}</td>
                <td>{report?.recipient || noteRecipient(row.investigacao) || '—'}</td>
                <td className="whitespace-nowrap">{formatDate(row.sgq_data_ocorrencia || row.criado_em)}</td>
                <td className="rpnc-number">{lotCount} / {formatQty(Number(row.quantidade_segregada ?? 0))}</td>
                <td><span className={`inline-flex rounded-sm border px-2 py-1 text-[9px] font-black ${rowStatus(row) === 'EM_QUARENTENA' ? 'border-rose-200 bg-rose-50 text-rose-800' : rowStatus(row) === 'CONCLUIDO' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{rowStatus(row).replace('_', ' ')}</span></td>
                <td className="whitespace-nowrap"><button type="button" className={`${styles.button} min-h-8 px-2`} onClick={() => openRecord(row)}><FileText size={12} />Consultar / editar</button><button type="button" className={`${styles.button} ml-1 min-h-8 px-2`} aria-label={`Imprimir ${row.numero_rpnc || 'RPNC'}`} onClick={() => printReport(row)}><Printer size={12} /></button></td>
              </tr>
            })}
            {!visible.length && <tr><td colSpan={7} className="p-8 text-center text-[11px] text-slate-500">{loading ? 'Consultando registros do ERP…' : 'Nenhuma RPNC encontrada para esta pesquisa.'}</td></tr>}
          </tbody></table>
        </section>

        <footer className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-[#617783]"><ClipboardCheck size={13} className="mt-0.5 shrink-0" /><span>Os registros são carregados e gravados na empresa da sessão. O bloqueio de estoque só é confirmado quando o RPC transacional de quarentena aceita todos os lotes vinculados.</span></footer>
      </div>

      {open && <div role="dialog" aria-modal="true" aria-labelledby="rpnc-title" className="fixed inset-0 z-[1000] grid place-items-center bg-[#071522]/70 p-2 sm:p-4">
        <section className="flex max-h-[96vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-[3px] border border-[#b8ccd4] bg-white shadow-2xl">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5e2e7] px-3 py-2.5 sm:px-4">
            <div><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#2D8DB8]">{companyName} · FORMULÁRIO DE TRATAMENTO</p><h2 id="rpnc-title" className="text-base font-black">{editingId ? `RPNC ${form.number}` : 'Nova RPNC · relatório de anomalia'}</h2></div>
            <div className="flex flex-wrap items-center gap-1.5">
              {!editingId && <button type="button" className={styles.button} onClick={loadReferenceDraft}><FileText size={13} />Usar relatório enviado como rascunho</button>}
              <button type="button" className={styles.button} aria-label="Fechar formulário" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
          </header>

          {editingId && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5edf0] bg-[#f8fbfc] px-3 py-1.5 text-[10px]">
            <span className="font-bold text-[#526d79]">Responsável da Qualidade: {form.report.qualityOwnerName || 'Usuário autenticado'}</span>
            <span className={`inline-flex items-center gap-1 font-black ${selected?.bloqueia_lote ? 'text-rose-700' : 'text-emerald-700'}`}>{selected?.bloqueia_lote ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}{selected?.bloqueia_lote ? 'LOTES EM QUARENTENA' : 'SEM QUARENTENA REGISTRADA'}</span>
          </div>}

          {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mx-3 mt-2 flex items-start gap-2 border px-2.5 py-2 text-[10px] font-bold sm:mx-4 ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}{error || notice}</div>}

          <nav aria-label="Etapas do relatório RPNC" className="flex shrink-0 gap-0 overflow-x-auto border-b border-[#d5e2e7] px-2">
            {TABS.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="rpnc-tab" onClick={() => setTab(item.id)}>{item.label}{index < TABS.length - 1 && <ChevronRight size={11} className="ml-1 inline" />}</button>)}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {tab === 'relato' && <div className="grid grid-cols-1 gap-[var(--rpnc-grid-gap)] md:grid-cols-12">
              <Field label="Número do relatório *" span={3}>{input(form.number, value => setForm(current => ({ ...current, number: value.toUpperCase() })), { maxLength: 40, placeholder: 'RPNC-2026-0001' })}</Field>
              <Field label="Data da ocorrência *" span={3}>{input(form.date, value => setForm(current => ({ ...current, date: value })), { type: 'date' })}</Field>
              <Field label="Hora da ocorrência" span={2}>{input(form.report.occurrenceTime, value => setReport('occurrenceTime', value), { type: 'time' })}</Field>
              <Field label="Hora da restauração" span={2}>{input(form.report.restorationTime, value => setReport('restorationTime', value), { type: 'time' })}</Field>
              <Field label="Duração da anormalidade" span={2}><div className="rpnc-control flex items-center bg-slate-50 font-mono font-bold">{durationLabel(computedDuration)}</div></Field>
              <Field label="Destinatário / origem" span={4}><select className="rpnc-control" value={form.destination} onChange={event => setForm(current => ({ ...current, destination: event.target.value as Destination }))}>{DESTINATIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Cliente / fornecedor / área" span={5}>{input(form.recipient, value => setForm(current => ({ ...current, recipient: value })), { maxLength: 200, placeholder: 'Nome do destinatário ou área responsável' })}</Field>
              <Field label="Ocorrência" span={3}><select className="rpnc-control" value={form.report.recurrence} onChange={event => setReport('recurrence', event.target.value as ReportData['recurrence'])}><option value="INICIAL">Inicial</option><option value="REINCIDENCIA">Reincidência</option></select></Field>
              <Field label="Código do item de controle *" span={3}>{input(form.report.itemCode, value => setReport('itemCode', value), { maxLength: 80, placeholder: 'Código do item' })}</Field>
              <Field label="Descrição do item *" span={6}>{input(form.report.itemDescription, value => setReport('itemDescription', value), { maxLength: 255, placeholder: 'Descrição conforme cadastro ou desenho' })}</Field>
              <Field label="Local / setor" span={3}>{input(form.report.location, value => setReport('location', value), { maxLength: 120, placeholder: 'Recebimento, linha, setor…' })}</Field>
              <Field label="Máquina / equipamento" span={3}>{input(form.report.equipment, value => setReport('equipment', value), { maxLength: 120 })}</Field>
              <Field label="Gravidade" span={3}><select className="rpnc-control" value={form.severity} onChange={event => setForm(current => ({ ...current, severity: event.target.value }))}><option>Menor</option><option>Maior</option><option>Crítica</option></select></Field>
              <Field label="Condição especificada" span={3}>{input(form.report.specifiedCondition, value => setReport('specifiedCondition', value), { maxLength: 200, placeholder: 'Requisito do desenho / especificação' })}</Field>
              <Field label="Condição recebida / observada" span={3}>{input(form.report.receivedCondition, value => setReport('receivedCondition', value), { maxLength: 200, placeholder: 'Condição encontrada na inspeção' })}</Field>
              {(form.report.specifiedCondition || form.report.receivedCondition) && <div className="col-span-full grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Comparação visual de especificação e recebimento">
                <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2"><span className="rpnc-state-success"><CheckCircle2 size={16} /></span><div><span className="block text-[9px] font-black uppercase tracking-wide text-emerald-800">Especificado / conforme</span><strong className="text-[11px] text-emerald-900">{form.report.specifiedCondition || 'Não informado'}</strong></div></div>
                <div className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2"><span className="rpnc-state-error"><AlertTriangle size={16} /></span><div><span className="block text-[9px] font-black uppercase tracking-wide text-rose-800">Recebido / defeito</span><strong className="text-[11px] text-rose-900">{form.report.receivedCondition || 'Não informado'}</strong></div></div>
              </div>}
              <Field label="Descrição da anomalia ou fenômeno *" span={12}>{textarea(form.description, value => setForm(current => ({ ...current, description: value })), 4)}</Field>

              <section className="col-span-full overflow-x-auto border border-[#d5e2e7]">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f8fbfc] px-2.5 py-2"><div><h3 className="text-[11px] font-black uppercase">Lotes afetados e quantidades reprovadas</h3><p className="text-[9px] text-[#617783]">Informe os códigos exatamente como aparecem no estoque para habilitar a quarentena transacional.</p></div><button type="button" className={styles.button} onClick={() => setReport('lots', [...form.report.lots, newLot()])}><Plus size={12} />Adicionar lote</button></div>
                <table className="rpnc-table min-w-[520px]"><thead><tr><th>Lote</th><th className="w-48 text-right">Quantidade reprovada</th><th className="w-14">Remover</th></tr></thead><tbody>
                  {form.report.lots.map(lot => <tr key={lot.rowId}><td><input className="rpnc-control" value={lot.code} maxLength={80} onChange={event => updateLot(lot.rowId, 'code', event.target.value)} placeholder="Código do lote" /></td><td><input className="rpnc-control rpnc-number" type="number" min="0" step="1" value={lot.quantity} onChange={event => updateLot(lot.rowId, 'quantity', event.target.value)} placeholder="0" /></td><td><button type="button" className={`${styles.button} min-h-8 px-2`} aria-label="Remover lote" disabled={form.report.lots.length === 1} onClick={() => setReport('lots', form.report.lots.filter(item => item.rowId !== lot.rowId))}><X size={13} /></button></td></tr>)}
                </tbody><tfoot><tr><th>Total de peças reprovadas</th><th className="rpnc-number text-base">{formatQty(currentLotTotal)}</th><th /></tr></tfoot></table>
              </section>
            </div>}

            {tab === 'causas' && <div className="space-y-3">
              <p className="text-[10px] text-[#617783]">Registre hipóteses e evidências por categoria. A análise Ishikawa organiza causas possíveis; os 5 Porquês devem desdobrar causas imediatas até causas-raiz verificáveis.</p>
              <section className={styles.panel}><div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center border border-[#d5e2e7] bg-[#f0f8fa] text-[#2D8DB8]"><ClipboardCheck size={14} /></span><div><h3 className="text-[12px] font-black">Espinha de peixe · Ishikawa (6M)</h3><p className="text-[9px] text-[#617783]">Descreva causas observadas em cada eixo.</p></div></div><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{FISHBONE.map(key => <Field key={key} label={key} span={1}>{textarea(form.report.fishbone[key] ?? '', value => setReport('fishbone', { ...form.report.fishbone, [key]: value }), 2)}</Field>)}</div></section>
              <section className="overflow-hidden border border-[#d5e2e7] bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5e2e7] bg-[#f8fbfc] p-2.5"><div><h3 className="text-[12px] font-black">5 Porquês · causas imediatas e raiz</h3><p className="text-[9px] text-[#617783]">Cada causa tem cinco etapas em ordem, com o quinto porquê identificado como causa-raiz.</p></div><button type="button" className={styles.button} onClick={() => setReport('causeChains', [...form.report.causeChains, newCauseChain()])}><Plus size={12} />Adicionar causa</button></div>
                <div className="space-y-2 p-2.5">{form.report.causeChains.map((chain, index) => <article key={chain.rowId} className="border border-[#e3ebee] p-2.5"><div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]"><Field label={`Causa ${index + 1} · categoria`} span={1}><select className="rpnc-control" value={chain.kind} onChange={event => updateCauseChain(chain.rowId, 'kind', event.target.value)}>{CAUSE_KINDS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="Causa imediata" span={1}>{input(chain.immediateCause, value => updateCauseChain(chain.rowId, 'immediateCause', value), { placeholder: 'Descreva o efeito ou causa imediata' })}</Field><div className="flex items-end"><button type="button" className={`${styles.button} min-h-9`} disabled={form.report.causeChains.length === 1} onClick={() => setReport('causeChains', form.report.causeChains.filter(item => item.rowId !== chain.rowId))}><X size={12} />Remover</button></div></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">{chain.whys.map((why, whyIndex) => <Field key={`${chain.rowId}-${whyIndex}`} label={`${whyIndex + 1}º porquê${whyIndex === 0 ? ' · causa imediata' : whyIndex === 4 ? ' · causa-raiz' : ''}`} span={1}><textarea className={`${styles.input} min-h-[82px]`} value={why} onChange={event => updateWhy(chain.rowId, whyIndex, event.target.value)} /></Field>)}</div></article>)}</div>
              </section>
              <Field label="Resultados da investigação · ocorrência, detecção e prevenção" span={12}>{textarea(form.report.investigationSummary, value => setReport('investigationSummary', value), 4)}</Field>
              <Field label="Ilustração, desenho esquemático ou croqui · descrição / referência" span={12}>{textarea(form.report.investigationSketch, value => setReport('investigationSketch', value), 2)}</Field>
            </div>}

            {tab === 'acoes' && <div className="space-y-3">
              <section className={`${styles.panel} grid grid-cols-1 gap-2 md:grid-cols-12`}>
                <Field label="Ação de contenção · bloqueio / medida provisória" span={12}>{textarea(form.report.containment.action, value => setContainment('action', value), 3)}</Field>
                <Field label="Responsável pela contenção" span={6}>{input(form.report.containment.owner, value => setContainment('owner', value), { maxLength: 160 })}</Field>
                <Field label="Realizada em" span={3}>{input(form.report.containment.completedAt, value => setContainment('completedAt', value), { type: 'date' })}</Field>
              </section>
              <section className="overflow-x-auto border border-[#d5e2e7] bg-white"><div className="flex flex-wrap items-center justify-between gap-2 bg-[#f8fbfc] p-2.5"><div><h3 className="text-[12px] font-black">Ações corretivas e prevenção da recorrência</h3><p className="text-[9px] text-[#617783]">Informe o que será feito, responsável, prazo e data de conclusão.</p></div><button type="button" className={styles.button} onClick={() => setReport('actions', [...form.report.actions, newAction()])}><Plus size={12} />Adicionar ação</button></div>
                <table className="rpnc-table min-w-[1020px]"><thead><tr><th>Ação (o quê?)</th><th>Responsável (quem?)</th><th>Prazo</th><th>Concluída em</th><th>Status</th><th>Replicação</th><th /></tr></thead><tbody>
                  {form.report.actions.map(action => <tr key={action.rowId}>
                    <td className="min-w-[260px]"><textarea className={`${styles.input} min-h-[56px]`} value={action.action} onChange={event => updateAction(action.rowId, 'action', event.target.value)} placeholder="Descreva a ação" /></td>
                    <td><input className="rpnc-control" value={action.owner} onChange={event => updateAction(action.rowId, 'owner', event.target.value)} placeholder="Responsável" /></td>
                    <td><input className="rpnc-control" type="date" value={action.dueDate} onChange={event => updateAction(action.rowId, 'dueDate', event.target.value)} /></td>
                    <td><input className="rpnc-control" type="date" value={action.completedAt} onChange={event => updateAction(action.rowId, 'completedAt', event.target.value)} /></td>
                    <td><select className="rpnc-control" value={action.status} onChange={event => updateAction(action.rowId, 'status', event.target.value)}>{ACTION_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></td>
                    <td className="text-center"><input type="checkbox" checked={action.replication} onChange={event => updateAction(action.rowId, 'replication', event.target.checked)} aria-label="Ação de replicação" /></td>
                    <td><button type="button" className={`${styles.button} min-h-8 px-2`} disabled={form.report.actions.length === 1} aria-label="Remover ação" onClick={() => setReport('actions', form.report.actions.filter(item => item.rowId !== action.rowId))}><X size={13} /></button></td>
                  </tr>)}
                </tbody></table>
              </section>
              <Field label="Ação preventiva / extensão para evitar recorrência" span={12}>{textarea(form.report.preventiveAction, value => setReport('preventiveAction', value), 3)}</Field>
              <section className="flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50 p-2.5"><div><strong className="block text-[10px] font-black uppercase text-amber-900">Bloqueio de lotes no estoque</strong><span className="text-[10px] text-amber-800">O ERP valida cada lote da RNC e executa retenção transacional; códigos sem lote de estoque correspondente não são bloqueados.</span></div><button type="button" className={styles.danger} disabled={!editingId || blocking || Boolean(selected?.bloqueia_lote)} onClick={() => void requestQuarantine()}><ShieldAlert size={14} />{blocking ? 'Solicitando quarentena…' : selected?.bloqueia_lote ? 'Lotes já em quarentena' : 'Bloquear lotes no estoque'}</button></section>
            </div>}

            {tab === 'eficacia' && <div className="space-y-3">
              <section className={`${styles.panel} grid grid-cols-1 gap-2 md:grid-cols-12`}>
                <Field label="Resultados da verificação de eficácia" span={12}>{textarea(form.report.effectiveness.report, value => setEffectiveness('report', value), 4)}</Field>
                <Field label="Prazo para verificação" span={3}>{input(form.report.effectiveness.dueDate, value => setEffectiveness('dueDate', value), { type: 'date' })}</Field>
                <Field label="Concluída em" span={3}>{input(form.report.effectiveness.completedAt, value => setEffectiveness('completedAt', value), { type: 'date' })}</Field>
                <Field label="Status da eficácia" span={3}><select className="rpnc-control" value={form.report.effectiveness.status} onChange={event => setEffectiveness('status', event.target.value)}>{ACTION_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></Field>
              </section>
              <section className={`${styles.panel} grid grid-cols-1 gap-2 md:grid-cols-12`}>
                <label className="flex items-center gap-2 border border-[#e3ebee] px-2 py-2 text-[10px] font-black uppercase md:col-span-4"><input type="checkbox" checked={form.report.standardization.pokaYoke} onChange={event => setStandardization('pokaYoke', event.target.checked)} />Sistema à prova de erro implantado</label>
                <Field label="Motivo / controle adotado quando não há poka-yoke" span={8}>{input(form.report.standardization.reason, value => setStandardization('reason', value), { maxLength: 500 })}</Field>
                <Field label="Documentos revisados / a revisar" span={12}>{textarea(form.report.standardization.documents, value => setStandardization('documents', value), 2)}</Field>
                <Field label="Responsável pela padronização" span={4}>{input(form.report.standardization.owner, value => setStandardization('owner', value), { maxLength: 160 })}</Field>
                <Field label="Prazo" span={3}>{input(form.report.standardization.dueDate, value => setStandardization('dueDate', value), { type: 'date' })}</Field>
                <Field label="Revisado em" span={3}>{input(form.report.standardization.reviewedAt, value => setStandardization('reviewedAt', value), { type: 'date' })}</Field>
              </section>
              <section className={`${styles.panel} grid grid-cols-1 gap-2 md:grid-cols-12`}>
                <Field label="Equipe de tratamento · nome" span={5}><span className="rpnc-label">Nome</span></Field>
                <div className="hidden md:block" />
                <div className="col-span-12 overflow-x-auto"><table className="rpnc-table min-w-[660px]"><thead><tr><th>Nome</th><th>Função</th><th>Setor</th><th /></tr></thead><tbody>{form.report.team.map(member => <tr key={member.rowId}><td><input className="rpnc-control" value={member.name} onChange={event => updateMember(member.rowId, 'name', event.target.value)} /></td><td><input className="rpnc-control" value={member.role} onChange={event => updateMember(member.rowId, 'role', event.target.value)} /></td><td><input className="rpnc-control" value={member.sector} onChange={event => updateMember(member.rowId, 'sector', event.target.value)} /></td><td><button type="button" className={`${styles.button} min-h-8 px-2`} disabled={form.report.team.length === 1} aria-label="Remover integrante" onClick={() => setReport('team', form.report.team.filter(item => item.rowId !== member.rowId))}><X size={13} /></button></td></tr>)}</tbody></table></div>
                <div className="col-span-full"><button type="button" className={styles.button} onClick={() => setReport('team', [...form.report.team, newMember()])}><Plus size={12} />Adicionar integrante</button></div>
                <Field label="Data de encerramento" span={3}>{input(form.report.closure.date, value => setClosure('date', value), { type: 'date' })}</Field>
                <Field label="Líder da equipe" span={4}>{input(form.report.closure.teamLeader, value => setClosure('teamLeader', value), { maxLength: 160 })}</Field>
                <Field label="Supervisor / encarregado" span={4}>{input(form.report.closure.supervisor, value => setClosure('supervisor', value), { maxLength: 160 })}</Field>
              </section>
            </div>}

            {tab === 'anexos' && <div className="space-y-3">
              {!editingId ? <div className="border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">Grave a RPNC primeiro para vincular croquis, fotos, laudos e comprovantes das ações ao registro correto.</div> : <>
                <section className={`${styles.panel} flex flex-wrap items-center justify-between gap-3`}><div><h3 className="text-[12px] font-black">Evidências das ações tomadas</h3><p className="mt-1 text-[10px] text-[#617783]">Os arquivos ficam no Storage privado da empresa e são vinculados à RPNC {form.number}. Limite de 25 MB por arquivo.</p></div><label className={`${styles.primary} cursor-pointer`}><ImagePlus size={14} />{uploading ? 'Enviando…' : 'Anexar evidência'}<input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void uploadAttachment(file) }} /></label></section>
                {attachments.length ? <section className="overflow-x-auto border border-[#d5e2e7] bg-white"><table className="rpnc-table min-w-[620px]"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Enviado em</th><th /></tr></thead><tbody>{attachments.map(file => <tr key={file.id}><td className="font-semibold">{file.nome_arquivo}</td><td>{file.mime_type || 'Arquivo'}</td><td>{file.tamanho_bytes ? `${formatQty(file.tamanho_bytes / 1024)} KB` : '—'}</td><td>{new Date(file.created_at).toLocaleString('pt-BR')}</td><td><a className={`${styles.button} min-h-8 px-2 ${file.url ? '' : 'pointer-events-none opacity-50'}`} href={file.url || undefined} target="_blank" rel="noreferrer"><Download size={12} />Abrir</a></td></tr>)}</tbody></table></section> : <div className="grid min-h-36 place-items-center border border-dashed border-[#cbd5e1] bg-[#f8fbfc] p-4 text-center"><div><FileText size={22} className="mx-auto text-[#2D8DB8]" /><p className="mt-2 text-[11px] font-bold">Nenhuma evidência anexada a esta RPNC.</p><p className="text-[10px] text-[#617783]">Anexe fotos do defeito, laudos, comprovantes de contenção ou documentos revisados.</p></div></div>}
              </>}
            </div>}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d5e2e7] bg-[#f8fbfc] px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap gap-2">
              {editingId && <button type="button" className={styles.button} onClick={() => selected && printReport(selected)}><Printer size={13} />Imprimir relatório</button>}
              {editingId && <button type="button" className={styles.button} onClick={() => void loadAttachments(editingId)}><RefreshCw size={12} />Atualizar anexos</button>}
            </div>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" className={styles.button} onClick={() => setOpen(false)}>Fechar</button><button type="button" className={styles.primary} onClick={() => void save()} disabled={saving}><Save size={13} />{saving ? 'Gravando…' : editingId ? 'Salvar alterações' : 'Gravar RNC'}</button></div>
          </footer>
        </section>
      </div>}
    </main>
  )
}
