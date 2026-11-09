/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-PCP-FICHA-ABAS-20261102-01 — ordem do proprietário: ficha em abas com aba própria de Matéria-prima
 *           (Item, Cód. MP, Descrição, %, Qtde, Unid e botão +) e foto puxada do cadastro de produtos
 *           (erp_produtos.foto_url, bucket público erp-produtos) ao clicar na descrição; aba do Molde passa a trazer
 *           número/desenho/foto do ferramental. Dados de exemplo do print foram removidos: a tela não pode
 *           prefabricar dosagem, temperatura, desenho ou plano de inspeção que não existam no banco.
 * @REVISAO_2: REV-PCP-FICHA-CATEGORIA-20261102-01 — categoria passa a trocar as descrições dos campos de
 *           processo; seletor de ficha em laranja com rótulo orientado pelo proprietário.
 * @STATUS_APROVACAO: COLUNAS CONFERIDAS NAS MIGRATIONS (erp_produtos.foto_url/unidade,
 *           erp_ferramentas_industriais.desenho_referencia/numero_cavidades, erp_fichas_processo.parametros_tecnicos jsonb)
 *           · VALIDAÇÃO ESTÁTICA (TYPECHECK, LINT, GUARDS, BUILD) · BUCKET erp-fichas-processo CRIADO NA MIGRATION
 *           20261102100000 E AGUARDANDO APLICAÇÃO PELO PROPRIETÁRIO
 */
/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — ENGENHARIA DE PROCESSOS & SGQ
 * Módulo: Ficha Técnica de Processo Industrial (Injetados & Prensados)
 * Arquivo: src/pages/FichasProcesso.tsx
 * Padrão Visual: SYSNQRA Industrial Compacto (#F4FBFD, #123B50, #2D8DB8, #48B7C7)
 * Estrutura em 4 Abas:
 *   Aba 1 (1/4) — Processo (Parâmetros de Injeção, Ciclo, Temperaturas e Setup)
 *   Aba 2 (2/4) — Matéria-prima (componentes da batelada com foto do cadastro de produtos)
 *   Aba 3 (3/4) — Molde (número, desenho e galeria fotográfica do ferramental)
 *   Aba 4 (4/4) — Qualidade & SGQ (especificações e plano de inspeção)
 * =========================================================================
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  FileDown,
  ImagePlus,
  Layers,
  Maximize2,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sliders,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'
import '../styles/synqra-premium.css'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao?: string | null
  unidade?: string | null
  foto_url?: string | null
}

type Client = {
  id: string
  codigo: string
  nome: string
  documento?: string | null
}

type Tool = {
  id: string
  codigo: string
  nome: string
  tipo: string
  numero_cavidades: number | null
  cavidades_ativas?: number | null
  desenho_referencia?: string | null
}

type Machine = {
  id: string
  codigo: string
  nome: string
  tipo: string | null
  status: string
}

type Status = 'RASCUNHO' | 'EM_ANALISE' | 'APROVADA' | 'LIBERADA' | 'OBSOLETA'
type ActiveTab = 'PROCESSO' | 'MATERIA_PRIMA' | 'MOLDE' | 'QUALIDADE'

export type MaterialMixtureItem = {
  id: string
  produto_id: string
  codigo: string
  descricao: string
  quantidade: number
  unidade: string
}

const UNIDADES_MISTURA = ['KG', 'G', 'TON', 'L', 'ML', 'UN']

// Fator de conversão para gramas. Proporção da batelada só faz sentido somando massa;
// componentes contados em unidades (UN) ficam fora do total e mostram "%" vazio.
const FATOR_GRAMA: Record<string, number> = { KG: 1000, G: 1, TON: 1_000_000, L: 1000, ML: 1 }

function gramas(m: MaterialMixtureItem): number | null {
  const f = FATOR_GRAMA[m.unidade]
  if (!f) return null
  return (Number(m.quantidade) || 0) * f
}

// Fichas antigas gravaram a mistura com { tipo, dosagem_kg, proporcao_pct }.
// O jsonb aceita as duas formas; a leitura converte para o layout atual (Qtde + Unid).
function normalizeMistura(raw: unknown): MaterialMixtureItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const m = (item ?? {}) as Record<string, unknown>
    const quantidade = Number(m.quantidade ?? m.dosagem_kg ?? 0) || 0
    return {
      id: String(m.id ?? `mp-${i + 1}`),
      produto_id: String(m.produto_id ?? ''),
      codigo: String(m.codigo ?? ''),
      descricao: String(m.descricao ?? ''),
      quantidade,
      unidade: String(m.unidade ?? 'KG')
    }
  })
}

export type MoldPhoto = {
  id: string
  titulo: string
  tipo: 'CAVIDADE' | 'FIXO' | 'GAVETAS' | 'MONTAGEM' | 'OUTRO'
  url: string
}

export type InspectionItem = {
  id: string
  caracteristica: string
  instrumento: string
  frequencia: string
  criterio: string
  tolerancia?: string
  status_aprovacao?: 'CONFORME' | 'NAO_CONFORME' | 'EM_ANALISE'
}

type FormState = {
  id: string
  codigo_ficha: string
  produto_id: string
  codigo_cliente: string
  ferramenta_id: string
  maquina_id: string
  cavidades_ativas: string
  revisao: string
  status: Status
  categoria_processo: string
  forca_fechamento: string
  pressao_trabalho: string
  temperatura_trabalho: string
  pressao_injecao: string
  pressao_recalque: string
  contrapressao: string
  ciclo_seg: string
  tempo_injecao_seg: string
  tempo_resfriamento_seg: string
  peso_peca: string
  peso_canal: string
  tolerancia_temp: string
  bico: string
  zona1: string
  zona2: string
  zona3: string
  zona4: string
  zona_molde: string
  imagem_url: string
  observacoes_setup: string
  observacoes: string
  aviso_destaque: string
  desenho_numero: string
  desenho_url: string
  formulario_sgq: string
  especificacoes_acabamento: string
  especificacoes_cor: string
  especificacoes_gravacao: string
  mistura: MaterialMixtureItem[]
  fotos_molde: MoldPhoto[]
  inspecoes: InspectionItem[]
}

// As fichas começam vazias. Dosagem, temperaturas, desenho, especificações e plano de
// inspeção são informações do processo real: prefabricá-las aqui gravaria dado inventado
// no banco e enganaria o operador. Regra do proprietário: "não inventar dados".
const blank: FormState = {
  id: '',
  codigo_ficha: '',
  produto_id: '',
  codigo_cliente: '',
  ferramenta_id: '',
  maquina_id: '',
  cavidades_ativas: '1',
  revisao: '1',
  status: 'RASCUNHO',
  categoria_processo: 'INJETADOS',
  forca_fechamento: '',
  pressao_trabalho: '',
  temperatura_trabalho: '',
  pressao_injecao: '',
  pressao_recalque: '',
  contrapressao: '',
  ciclo_seg: '',
  tempo_injecao_seg: '',
  tempo_resfriamento_seg: '',
  peso_peca: '',
  peso_canal: '',
  tolerancia_temp: '',
  bico: '',
  zona1: '',
  zona2: '',
  zona3: '',
  zona4: '',
  zona_molde: '',
  imagem_url: '',
  observacoes_setup: '',
  observacoes: '',
  aviso_destaque: '',
  desenho_numero: '',
  desenho_url: '',
  formulario_sgq: '',
  especificacoes_acabamento: '',
  especificacoes_cor: '',
  especificacoes_gravacao: '',
  mistura: [],
  fotos_molde: [],
  inspecoes: []
}

const inputClass =
  'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1'
const cardClass = 'rounded-[2px] border border-slate-200 bg-white p-3.5 shadow-xs'
const btnClass =
  'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-[10px] font-bold tracking-wide uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

const guiaCategoria: Record<string, string[]> = {
  INJETADOS: [
    'Peso e curso da rosca: ajustar a dose de injeção deixando colchão de material (buffer) de 15–20%.',
    'Velocidade de injeção em estágios: lenta na porta (evita mordiscas/jatos) e rápida no meio da cavidade.',
    'Secagem da resina: PP máx. 0,05% de umidade; demais materiais seguir ponto de orvalho da ficha do fornecedor.',
    'Resfriamento: mínimo de 1 s por mm de espessura; priorizar controle efetivo da temperatura do molde.',
    'Validação da primeira peça: visual (rebarba, injeção curta, rechupe) + massa e cota crítica aprovadas pela Qualidade.',
  ],
  PRENSADOS: [
    'Tempo de vulcanização: base ~1 min por mm de espessura da borracha (confirmar por composto).',
    'Temperatura dos platôs: tolerância ±5 °C; conferir a cada hora com termômetro infravermelho.',
    'Realizar ciclos de escape (abrir/fechar a prensa) para liberar ar e evitar bolhas internas.',
    'Controlar espessura da rebarba de corte como critério no plano de inspeção.',
    'Registrar lote da borracha e % de agente de cura na composição da batelada.',
  ],
  ESTAMPARIA: [
    'Curso, tonelagem e avanço: seguir a folha de setup da prensa e do ferramental.',
    'Lubrificação da matriz: definir tipo e frequência de aplicação do óleo.',
    'Limite de rebarba: critério conforme desenho; inspecionar aresta de corte.',
    'Bobina/chapa: conferir espessura, tipo de liga e lote do material.',
  ],
  ACABAMENTO: [
    'Corte de galhos/rebarbação: usar gabarito e ferramenta especificada; nunca cortar sem batente.',
    'Peças não podem apresentar arestas cortantes — teste de tato com luva antes da liberação.',
    'Inspeção visual 100% contra padrão de acabamento superficial (VDI/brilho) e mestre de cor sob luz D65.',
    'Gravação/datador legíveis e posicionados conforme desenho da peça.',
    'Transferência quantitativa ao embalador com cartão de apontamento assinado.',
  ],
  MONTAGEM_EMBALAGEM: [
    'Conferir quantidade por saco/blister e torque de montagem (quando aplicável) antes do fechamento.',
    'Caixa de papelão: resistência/aba especificada (ex.: ECT 30) e tara registrada no padrão de embalagem.',
    'Etiqueta da caixa: código do produto, quantidade, lote, data de fabricação e código do cliente.',
    'Lacre com fita e verificação de integridade; ensaio de queda/empilhamento conforme padrão interno.',
    'Paletização: desenho de empilhamento, altura máxima e peso bruto líquido registrado na etiqueta do palete.',
  ],
}

const textosInjetados = {
  recurso: 'MÁQUINA / INJETORA *',
  cicloTitulo: 'CICLO DE INJEÇÃO & RENDIMENTO',
  etapa: 'Injeção (s)',
  etapaFinal: 'Resfriamento (s)',
  forca: 'Fechamento (Ton)',
  pesoResiduo: 'Peso Canal / Galho (kg)',
  temperaturaTitulo: 'TEMPERATURAS DO CANHÃO & MOLDE (°C)',
  perfilTermico: 'Perfil Térmico do Canhão de Plastificação',
  zonas: ['Bico (°C)', 'Zona 1 (°C)', 'Zona 2 (°C)', 'Zona 3 (°C)', 'Zona 4 (°C)', 'Molde (°C)'],
  diagrama: ['Bico', 'Z1 (Frente)', 'Z2 (Meio)', 'Z3 (Alim.)', 'Z4 (Funil)'],
  pressaoTitulo: 'PRESSÕES & TEMPERATURA DE PROCESSAMENTO',
  pressoes: ['Injeção (bar)', 'Recalque / packing (bar)', 'Contrapressão (bar)', 'Hidráulica / trabalho (bar)', 'Temperatura de processo (°C)'],
  pressaoAjuda: 'Pressão de injeção e recalque definem preenchimento e combate a rechupes; a contrapressão controla homogeneidade da plastificação (ar na massa). Valores fora da janela do material devem ser comunicados à Engenharia de Processo.',
  aviso: 'Ex: Aplicar desmoldante a cada 100 injetadas',
}

const textosCategoria: Record<string, typeof textosInjetados> = {
  INJETADOS: textosInjetados,
  PRENSADOS: {
    ...textosInjetados,
    recurso: 'PRENSA / RECURSO *',
    cicloTitulo: 'CICLO DE VULCANIZAÇÃO & RENDIMENTO',
    etapa: 'Vulcanização (s)',
    etapaFinal: 'Cura / estabilização (s)',
    forca: 'Força da prensa (Ton)',
    pesoResiduo: 'Peso Rebarba / Corte (kg)',
    temperaturaTitulo: 'TEMPERATURAS DOS PLATÔS & MOLDE (°C)',
    perfilTermico: 'Perfil Térmico dos Platôs e do Molde',
    zonas: ['Platô superior (°C)', 'Platô inferior (°C)', 'Zona 2 (°C)', 'Zona 3 (°C)', 'Zona 4 (°C)', 'Molde (°C)'],
    diagrama: ['Platô sup.', 'Platô inf.', 'Z2', 'Z3', 'Z4'],
    pressaoTitulo: 'PRESSÕES & TEMPERATURA DE VULCANIZAÇÃO',
    pressoes: ['Prensagem (bar)', 'Manutenção (bar)', 'Escape (bar)', 'Hidráulica / trabalho (bar)', 'Temperatura dos platôs (°C)'],
    pressaoAjuda: 'Pressão de prensagem, tempo de vulcanização e escapes controlam enchimento, bolhas e cura da borracha. Ajustes fora da janela validada do composto devem ser comunicados à Engenharia de Processo.',
    aviso: 'Ex: Realizar 2 escapes antes de iniciar a vulcanização',
  },
  ESTAMPARIA: {
    ...textosInjetados,
    recurso: 'PRENSA / RECURSO *',
    cicloTitulo: 'CICLO DE ESTAMPAGEM & RENDIMENTO',
    etapa: 'Avanço (s)',
    etapaFinal: 'Retorno (s)',
    forca: 'Ton. da prensa',
    pesoResiduo: 'Peso Refugo / Recorte (kg)',
    temperaturaTitulo: 'TEMPERATURAS DE PROCESSO & FERRAMENTAL (°C)',
    perfilTermico: 'Temperaturas Monitoradas do Ferramental',
    zonas: ['Matriz (°C)', 'Punção (°C)', 'Zona 2 (°C)', 'Zona 3 (°C)', 'Zona 4 (°C)', 'Ferramental (°C)'],
    diagrama: ['Matriz', 'Punção', 'Z2', 'Z3', 'Z4'],
    pressaoTitulo: 'PRESSÕES & TEMPERATURA DE ESTAMPAGEM',
    pressoes: ['Estampagem (bar)', 'Manutenção (bar)', 'Contra-punção (bar)', 'Hidráulica / trabalho (bar)', 'Temperatura do ferramental (°C)'],
    pressaoAjuda: 'Tonagem, curso e avanço devem respeitar a folha de setup da prensa e do ferramental. Valores fora da janela aprovada devem ser comunicados à Engenharia de Processo.',
    aviso: 'Ex: Lubrificar a matriz conforme frequência do setup',
  },
  ACABAMENTO: {
    ...textosInjetados,
    recurso: 'BANCADA / MÁQUINA *',
    cicloTitulo: 'CICLO DE ACABAMENTO & RENDIMENTO',
    etapa: 'Rebarbação (s)',
    etapaFinal: 'Inspeção (s)',
    forca: 'Força / capacidade (Ton)',
    pesoResiduo: 'Peso Rebarba / Refugo (kg)',
    temperaturaTitulo: 'TEMPERATURAS DE PROCESSO & AMBIENTE (°C)',
    perfilTermico: 'Temperaturas Monitoradas no Acabamento',
    zonas: ['Entrada (°C)', 'Processo 1 (°C)', 'Processo 2 (°C)', 'Processo 3 (°C)', 'Processo 4 (°C)', 'Ambiente (°C)'],
    diagrama: ['Entrada', 'P1', 'P2', 'P3', 'P4'],
    pressaoTitulo: 'PRESSÕES & TEMPERATURA DE ACABAMENTO',
    pressoes: ['Corte (bar)', 'Fixação (bar)', 'Retorno (bar)', 'Hidráulica / trabalho (bar)', 'Temperatura de processo (°C)'],
    pressaoAjuda: 'Força de corte, fixação e ferramenta especificada devem preservar a peça e eliminar arestas cortantes. Desvios do padrão aprovado devem ser comunicados à Engenharia de Processo.',
    aviso: 'Ex: Inspecionar arestas com luva antes da liberação',
  },
  MONTAGEM_EMBALAGEM: {
    ...textosInjetados,
    recurso: 'LINHA / MÁQUINA *',
    cicloTitulo: 'CICLO DE MONTAGEM & RENDIMENTO',
    etapa: 'Montagem (s)',
    etapaFinal: 'Embalagem (s)',
    forca: 'Capacidade (Ton)',
    pesoResiduo: 'Peso Embalagem / Refugo (kg)',
    temperaturaTitulo: 'TEMPERATURAS DE PROCESSO & AMBIENTE (°C)',
    perfilTermico: 'Temperaturas Monitoradas na Montagem',
    zonas: ['Entrada (°C)', 'Processo 1 (°C)', 'Processo 2 (°C)', 'Processo 3 (°C)', 'Processo 4 (°C)', 'Ambiente (°C)'],
    diagrama: ['Entrada', 'P1', 'P2', 'P3', 'P4'],
    pressaoTitulo: 'PRESSÕES & TEMPERATURA DE MONTAGEM',
    pressoes: ['Montagem (bar)', 'Fixação (bar)', 'Retorno (bar)', 'Hidráulica / trabalho (bar)', 'Temperatura de processo (°C)'],
    pressaoAjuda: 'Torque, quantidade por embalagem e integridade do fechamento devem seguir o padrão aprovado. Desvios devem ser comunicados à Engenharia de Processo antes da liberação.',
    aviso: 'Ex: Conferir quantidade e etiqueta antes de fechar a caixa',
  },
}

export function FichasProcesso() {
  const [form, setForm] = useState<FormState>(blank)
  const [activeTab, setActiveTab] = useState<ActiveTab>('PROCESSO')
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [rows, setRows] = useState<FormState[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<string | null>(null)
  const [mpPhoto, setMpPhoto] = useState<Product | null>(null)
  const [mpPickerIdx, setMpPickerIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const moldPhotoRef = useRef<HTMLInputElement>(null)
  const desenhoRef = useRef<HTMLInputElement>(null)

  // Carrega registros da empresa atual com RLS
  const load = useCallback(async () => {
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error || new Error('Empresa ERP não identificada.')
      }
      const empresaId = String(company.data)

      const [p, c, t, m, f] = await Promise.all([
        supabase
          .from('erp_produtos')
          .select('id,codigo,nome,descricao,unidade,foto_url')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('codigo')
          .limit(3000),
        supabase
          .from('erp_clientes')
          .select('id,codigo,nome,documento')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('codigo')
          .limit(3000),
        supabase
          .from('erp_ferramentas_industriais')
          .select('id,codigo,nome,tipo,numero_cavidades,desenho_referencia,parametros')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('codigo')
          .limit(2000),
        supabase
          .from('erp_maquinas')
          .select('id,codigo,nome,tipo,status')
          .eq('empresa_id', empresaId)
          .not('status', 'eq', 'INATIVA')
          .order('codigo')
          .limit(2000),
        supabase
          .from('erp_fichas_processo')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('codigo_ficha')
          .limit(500)
      ])

      for (const x of [p, c, t, m, f]) {
        if (x.error) throw x.error
      }

      setProducts((p.data ?? []) as Product[])
      setClients((c.data ?? []) as Client[])
      setTools((t.data ?? []) as Tool[])
      setMachines((m.data ?? []) as Machine[])
      setRows(((f.data ?? []) as Record<string, unknown>[]).map(fromDb))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar fichas de processo.')
    }
  }, [])

  function fromDb(x: Record<string, unknown>): FormState {
    const z = (x.zonas_temperatura ?? {}) as Record<string, unknown>
    const pt = (x.parametros_tecnicos ?? {}) as Record<string, unknown>

    return {
      id: String(x.id ?? ''),
      codigo_ficha: String(x.codigo_ficha ?? ''),
      produto_id: String(x.produto_id ?? ''),
      codigo_cliente: String(x.codigo_cliente ?? ''),
      ferramenta_id: String(x.ferramenta_id ?? ''),
      maquina_id: String(x.maquina_id ?? ''),
      cavidades_ativas: String(x.cavidades_ativas ?? '1'),
      revisao: String(x.revisao ?? '1'),
      status: (String(x.status ?? 'RASCUNHO') as Status),
      categoria_processo: String(x.categoria_processo ?? 'INJETADOS'),
      forca_fechamento: String(x.forca_fechamento ?? ''),
      pressao_trabalho: String(x.pressao_trabalho ?? ''),
      temperatura_trabalho: String(x.temperatura_trabalho ?? ''),
      pressao_injecao: String(x.pressao_injecao ?? ''),
      pressao_recalque: String(pt.pressao_recalque ?? ''),
      contrapressao: String(pt.contrapressao ?? ''),
      ciclo_seg: String(x.ciclo_seg ?? ''),
      tempo_injecao_seg: String(pt.tempo_injecao_seg ?? ''),
      tempo_resfriamento_seg: String(pt.tempo_resfriamento_seg ?? ''),
      peso_peca: String(x.peso_peca ?? ''),
      peso_canal: String(x.peso_canal ?? ''),
      tolerancia_temp: String(z.tolerancia ?? ''),
      bico: String(z.bico ?? ''),
      zona1: String(z.zona1 ?? ''),
      zona2: String(z.zona2 ?? ''),
      zona3: String(z.zona3 ?? ''),
      zona4: String(z.zona4 ?? ''),
      zona_molde: String(z.molde ?? ''),
      imagem_url: String(x.imagem_url ?? ''),
      observacoes_setup: String(x.observacoes_setup ?? ''),
      observacoes: String(x.observacoes ?? ''),
      aviso_destaque: String(pt.aviso_destaque ?? ''),
      desenho_numero: String(pt.desenho_numero ?? ''),
      desenho_url: String(pt.desenho_url ?? ''),
      formulario_sgq: String(pt.formulario_sgq ?? ''),
      especificacoes_acabamento: String(pt.especificacoes_acabamento ?? ''),
      especificacoes_cor: String(pt.especificacoes_cor ?? ''),
      especificacoes_gravacao: String(pt.especificacoes_gravacao ?? ''),
      mistura: normalizeMistura(pt.mistura),
      fotos_molde: Array.isArray(pt.fotos_molde) ? (pt.fotos_molde as MoldPhoto[]) : [],
      inspecoes: Array.isArray(pt.inspecoes) ? (pt.inspecoes as InspectionItem[]) : []
    }
  }

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () =>
      rows.filter(
        x =>
          !query ||
          [x.codigo_ficha, x.codigo_cliente, x.status, x.categoria_processo]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [rows, query]
  )

  const selectedProduct = products.find(x => x.id === form.produto_id)
  const selectedTool = tools.find(x => x.id === form.ferramenta_id)
  const selectedMachine = machines.find(x => x.id === form.maquina_id)
  const textos = textosCategoria[form.categoria_processo] ?? textosInjetados

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(x => ({ ...x, [key]: value }))
    setMessage('')
    setError('')
  }

  function newFicha() {
    setForm(blank)
    // reset preview
    setActiveTab('PROCESSO')
    setMessage('Nova ficha técnica pronta para edição.')
    setError('')
  }

  function openFicha(x: FormState) {
    setForm(x)
    // set preview
    setActiveTab('PROCESSO')
    setMessage('')
    setError('')
  }

  // Upload para o bucket erp-fichas-processo (criado na migration 20261102100000).
  // A URL pública é gravada na ficha: URL assinada expira e quebraria a imagem do chão de fábrica.
  async function uploadDaFicha(file: File, prefixo: string): Promise<string> {
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      throw company.error || new Error('Empresa ERP não identificada.')
    }
    const caminhoSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${company.data}/${prefixo}-${crypto.randomUUID()}-${caminhoSeguro}`
    const upload = await supabase.storage.from('erp-fichas-processo').upload(path, file, {
      upsert: false,
      contentType: file.type
    })
    if (upload.error) throw upload.error
    return supabase.storage.from('erp-fichas-processo').getPublicUrl(path).data.publicUrl
  }

  // Upload de Imagem Técnica Geral / Matéria-Prima
  async function handleFile(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use imagem no formato PNG, JPG ou WEBP.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 8 MB.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const url = await uploadDaFicha(file, 'pca')
      update('imagem_url', url)
      setMessage('Imagem técnica vinculada à ficha com sucesso.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a imagem técnica.')
    } finally {
      setBusy(false)
    }
  }

  // Upload específico para fotos do molde na aba do Molde
  async function handleMoldPhotoUpload(file?: File, tipo: MoldPhoto['tipo'] = 'CAVIDADE') {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('A foto do molde deve ser PNG, JPG ou WEBP.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('A foto do molde deve ter no máximo 8 MB.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const url = await uploadDaFicha(file, 'molde')

      const newPhoto: MoldPhoto = {
        id: crypto.randomUUID(),
        titulo: file.name.replace(/\.[^/.]+$/, ''),
        tipo,
        url
      }

      setForm(prev => ({
        ...prev,
        fotos_molde: [...prev.fotos_molde, newPhoto]
      }))
      setMessage('Foto do molde adicionada à galeria.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto do molde.')
    } finally {
      setBusy(false)
    }
  }

  // Upload do desenho do molde (PNG/JPG/WEBP ou PDF)
  async function handleDesenhoUpload(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('O desenho do molde deve ser PNG, JPG, WEBP ou PDF.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('O desenho do molde deve ter no máximo 8 MB.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const url = await uploadDaFicha(file, 'desenho')
      update('desenho_url', url)
      setMessage('Desenho do molde anexado à ficha.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar o desenho do molde.')
    } finally {
      setBusy(false)
    }
  }

  // Salvar no Supabase
  async function save() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!form.codigo_ficha.trim()) throw new Error('Código da ficha é obrigatório.')
      if (!form.produto_id) throw new Error('Selecione o produto vinculado à ficha.')

      const cavities = Number(form.cavidades_ativas)
      if (!Number.isFinite(cavities) || cavities <= 0) {
        throw new Error('Informe o número de cavidades ativas maior que zero.')
      }

      const revision = Number(form.revisao)
      if (!Number.isInteger(revision) || revision < 1) {
        throw new Error('A revisão deve ser um número inteiro positivo.')
      }

      const company = await supabase.rpc('erp_current_empresa_id')
      const user = await supabase.auth.getUser()
      if (company.error || !company.data) throw company.error || new Error('Empresa ERP não identificada.')
      const empresaId = String(company.data)

      const payload = {
        empresa_id: empresaId,
        codigo_ficha: form.codigo_ficha.trim(),
        produto_id: form.produto_id,
        codigo_cliente: form.codigo_cliente.trim() || null,
        ferramenta_id: form.ferramenta_id || null,
        maquina_id: form.maquina_id || null,
        cavidades_ativas: cavities,
        revisao: revision,
        status: form.status,
        categoria_processo: form.categoria_processo,
        forca_fechamento: Number(form.forca_fechamento) || null,
        pressao_trabalho: Number(form.pressao_trabalho) || null,
        temperatura_trabalho: Number(form.temperatura_trabalho) || null,
        pressao_injecao: Number(form.pressao_injecao) || null,
        ciclo_seg: Number(form.ciclo_seg) || null,
        peso_peca: Number(form.peso_peca) || null,
        peso_canal: Number(form.peso_canal) || null,
        zonas_temperatura: {
          tolerancia: form.tolerancia_temp,
          bico: form.bico,
          zona1: form.zona1,
          zona2: form.zona2,
          zona3: form.zona3,
          zona4: form.zona4,
          molde: form.zona_molde
        },
        parametros_tecnicos: {
          pressao_recalque: form.pressao_recalque,
          contrapressao: form.contrapressao,
          tempo_injecao_seg: form.tempo_injecao_seg,
          tempo_resfriamento_seg: form.tempo_resfriamento_seg,
          aviso_destaque: form.aviso_destaque,
          desenho_numero: form.desenho_numero,
          desenho_url: form.desenho_url,
          formulario_sgq: form.formulario_sgq,
          especificacoes_acabamento: form.especificacoes_acabamento,
          especificacoes_cor: form.especificacoes_cor,
          especificacoes_gravacao: form.especificacoes_gravacao,
          mistura: form.mistura,
          fotos_molde: form.fotos_molde,
          inspecoes: form.inspecoes
        },
        imagem_url: form.imagem_url || null,
        observacoes_setup: form.observacoes_setup.trim() || null,
        observacoes: form.observacoes.trim() || null,
        atualizado_por: user.data.user?.id || null,
        atualizado_em: new Date().toISOString()
      }

      const result = form.id
        ? await supabase.from('erp_fichas_processo').update(payload).eq('id', form.id).select('*').single()
        : await supabase
            .from('erp_fichas_processo')
            .insert({ ...payload, criado_por: user.data.user?.id || null })
            .select('*')
            .single()

      if (result.error) throw result.error

      setForm(fromDb(result.data as Record<string, unknown>))
      // set preview
      setMessage('Ficha técnica gravada com sucesso no sistema!')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar a ficha técnica.')
    } finally {
      setBusy(false)
    }
  }

  // Deletar ficha
  async function remove() {
    if (!form.id) return
    if (!window.confirm(`Deseja excluir a ficha técnica ${form.codigo_ficha}?`)) return
    setBusy(true)
    setError('')
    try {
      const r = await supabase.from('erp_fichas_processo').delete().eq('id', form.id)
      if (r.error) throw r.error
      newFicha()
      setMessage('Ficha técnica excluída.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir a ficha.')
    } finally {
      setBusy(false)
    }
  }

  // Cálculos automáticos de capacidade
  const cycleSec = Number(form.ciclo_seg) || 0
  const cavitiesNum = Number(form.cavidades_ativas) || 1
  const pcsPerHour = cycleSec > 0 ? ((3600 / cycleSec) * cavitiesNum).toFixed(0) : '—'
  const cyclesPerHour = cycleSec > 0 ? (3600 / cycleSec).toFixed(0) : '—'

  // Proporção da batelada: só itens medidos em massa entram no somatório.
  const bateladaGramas = form.mistura.reduce((acc, m) => acc + (gramas(m) ?? 0), 0)
  const totalBateladaKg = bateladaGramas / 1000
  const itensSemUnidadeMassa = form.mistura.filter(m => gramas(m) === null).length

  function proporcaoPct(m: MaterialMixtureItem): string {
    const g = gramas(m)
    if (g === null || bateladaGramas <= 0) return '—'
    return `${((g / bateladaGramas) * 100).toFixed(2)}%`
  }

  // Foto do componente: vem do cadastro de produtos, nunca da ficha.
  function produtoDaMateriaPrima(m: MaterialMixtureItem): Product | null {
    if (m.produto_id) return products.find(p => p.id === m.produto_id) ?? null
    return products.find(p => p.codigo === m.codigo) ?? null
  }

  return (
    <>
      {/* Folha Oficial de Impressão A4 SYSNQRA — SGQ IT-PCP-001 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ficha-print-sheet, .ficha-print-sheet * { visibility: visible !important; }
          .ficha-print-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 8mm !important;
            background: #fff !important;
            color: #0f172a !important;
            font-family: Arial, sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ficha-print-sheet table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          .ficha-print-sheet th, .ficha-print-sheet td {
            border: 1px solid #334155;
            padding: 4px 6px;
            font-size: 8pt;
            text-align: left;
          }
          .ficha-print-sheet th {
            background: #f1f5f9 !important;
            font-weight: bold;
            text-transform: uppercase;
          }
        }
        @media screen {
          .ficha-print-sheet { display: none; }
        }
      `}</style>

      <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
        <div className="mx-auto max-w-[1750px] space-y-3.5">
          
          {/* Header Superior — SYSNQRA SGQ IT-PCP-001 */}
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-[#123B50] text-[#48B7C7]">
                <Layers size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#123B50] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    SYSNQRA SGQ • IT-PCP-001
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]">
                    ENGENHARIA DE PROCESSOS • PADRÃO INDUSTRIAL A4
                  </span>
                </div>
                <h1 className="mt-0.5 text-base font-black tracking-tight text-[#123B50]">
                  Ficha Técnica de Processo Industrial ({form.codigo_ficha || 'Nova Ficha'})
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={newFicha}
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <FileDown size={13} />
                <span>Nova Ficha</span>
              </button>

              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className={`${btnClass} bg-[#2D8DB8] text-white hover:bg-[#236F91] shadow-xs`}
              >
                <Save size={13} />
                <span>{busy ? 'Gravando...' : 'Gravar Ficha'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Printer size={13} />
                <span>Imprimir A4</span>
              </button>

              <button
                type="button"
                onClick={() => void load()}
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                title="Recarregar"
              >
                <RotateCcw size={13} />
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={busy}
                  className={`${btnClass} border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100`}
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </header>

          {/* Notificações e Alertas */}
          {(noticeMessage(error, message)) && (
            <div
              className={`flex items-center justify-between rounded-[2px] border px-3 py-2 text-xs font-bold ${
                error
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span>{error || message}</span>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMessage('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Barra de Abas Industriais (1/4, 2/4, 3/4, 4/4) */}
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-2 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              
              {/* Aba 1: Processo (1/4) */}
              <button
                type="button"
                onClick={() => setActiveTab('PROCESSO')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'PROCESSO'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">1 / 4</span>
                <Sliders size={13} />
                <span>Processo</span>
              </button>

              {/* Aba 2: Matéria-prima (2/4) */}
              <button
                type="button"
                onClick={() => setActiveTab('MATERIA_PRIMA')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'MATERIA_PRIMA'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">2 / 4</span>
                <Package size={13} />
                <span>Matéria-prima</span>
                {form.mistura.length > 0 && (
                  <span className="rounded-full bg-[#2D8DB8] px-1.5 py-0.2 text-[8px] text-white">
                    {form.mistura.length}
                  </span>
                )}
              </button>

              {/* Aba 3: Molde — número, desenho e fotos (3/4) */}
              <button
                type="button"
                onClick={() => setActiveTab('MOLDE')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'MOLDE'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">3 / 4</span>
                <Wrench size={13} />
                <span>Molde, Desenho &amp; Fotos</span>
                {form.fotos_molde.length > 0 && (
                  <span className="rounded-full bg-[#2D8DB8] px-1.5 py-0.2 text-[8px] text-white">
                    {form.fotos_molde.length}
                  </span>
                )}
              </button>

              {/* Aba 4: Qualidade, Especificações & SGQ (4/4) */}
              <button
                type="button"
                onClick={() => setActiveTab('QUALIDADE')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'QUALIDADE'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">4 / 4</span>
                <ShieldCheck size={13} />
                <span>Qualidade &amp; SGQ</span>
              </button>
            </div>

            {/* Informações de Cabeçalho da Ficha */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
              <span className="rounded bg-slate-100 px-2 py-1">
                Revisão: <strong className="text-slate-900">Rev. {form.revisao}</strong>
              </span>
              <span
                className={`rounded px-2 py-1 uppercase text-[9px] font-black ${
                  form.status === 'APROVADA' || form.status === 'LIBERADA'
                    ? 'bg-emerald-100 text-emerald-800'
                    : form.status === 'EM_ANALISE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {form.status}
              </span>
            </div>
          </nav>

          {/* Layout Principal: Lista Lateral de Fichas + Conteúdo das Abas */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            
            {/* Sidebar Esquerda: Fichas Cadastradas */}
            <aside className="rounded-[2px] border border-slate-200 bg-white shadow-xs h-fit">
              <div className="border-b border-slate-200 p-2.5">
                <label htmlFor="seletor-ficha-processo" className="block text-[10px] font-black uppercase tracking-wide text-[#9A4600]">
                  Escolha sua Ficha de Processo
                </label>
                <select
                  id="seletor-ficha-processo"
                  value={form.id}
                  onChange={e => {
                    const ficha = rows.find(x => x.id === e.target.value)
                    if (ficha) openFicha(ficha)
                  }}
                  className="mt-1.5 h-[34px] w-full rounded-[2px] border border-[#9A4600] !bg-[#C65D00] px-2 text-[11px] font-black !text-white outline-none focus:ring-2 focus:ring-[#C65D00]/30"
                >
                  <option value="" className="bg-white text-slate-800">Selecione uma ficha cadastrada</option>
                  {rows.map(x => (
                    <option key={x.id} value={x.id} className="bg-white text-slate-800">
                      {x.codigo_ficha} — Rev. {x.revisao} — {x.categoria_processo}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    FICHAS CADASTRADAS ({filtered.length})
                  </span>
                </div>
                <div className="mt-2 relative">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar código ou peça..."
                    className="h-[28px] w-full rounded-[2px] border border-slate-300 bg-white pl-8 pr-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
                  />
                </div>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-1.5 space-y-1">
                {filtered.map(x => {
                  const prod = products.find(p => p.id === x.produto_id)
                  const isCurrent = x.id === form.id

                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => openFicha(x)}
                      className={`w-full rounded-[2px] border p-2 text-left transition-all ${
                        isCurrent
                          ? 'border-[#2D8DB8] bg-sky-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[11px] font-black text-[#123B50]">{x.codigo_ficha}</strong>
                        <span className="text-[9px] font-bold text-slate-500">Rev. {x.revisao}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-slate-700">
                        {prod ? `${prod.codigo} — ${prod.nome}` : 'Produto não selecionado'}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                        <span className="text-[#2D8DB8]">{x.categoria_processo}</span>
                        <span className="text-slate-500">{x.status}</span>
                      </div>
                    </button>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="p-4 text-center text-xs font-semibold text-slate-400">
                    Nenhuma ficha cadastrada.
                  </div>
                )}
              </div>
            </aside>

            {/* Conteúdo Dinâmico por Aba */}
            <div className="space-y-3">
              
              {/* ========================================================================= */}
              {/* ABA 1 (1/4): PROCESSO (Ciclo, Parâmetros, Temperaturas e Setup) */}
              {/* ========================================================================= */}
              {activeTab === 'PROCESSO' && (
                <div className="space-y-3">
                  
                  {/* Bloco 1: Identificação Master (Produto, Molde, Máquina, Cliente) */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          SEÇÃO 1
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          IDENTIFICAÇÃO DO PRODUTO, FERRAMENTAL E RECURSO
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold text-slate-500">Categoria:</label>
                        <select
                          value={form.categoria_processo}
                          onChange={e => update('categoria_processo', e.target.value)}
                          className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-[#2D8DB8]"
                        >
                          <option value="INJETADOS">INJETADOS (TERMOPLÁSTICOS)</option>
                          <option value="PRENSADOS">PRENSADOS (BORRACHA)</option>
                          <option value="ESTAMPARIA">ESTAMPARIA</option>
                          <option value="ACABAMENTO">ACABAMENTO (REBARBAÇÃO / CORTE)</option>
                          <option value="MONTAGEM_EMBALAGEM">MONTAGEM / EMBALAGEM DE CAIXA</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>Cód. da Ficha *</label>
                        <input
                          type="text"
                          required
                          value={form.codigo_ficha}
                          onChange={e => update('codigo_ficha', e.target.value)}
                          placeholder="Ex: FP-01/001 ou FCH-2026-089"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Revisão *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={form.revisao}
                          onChange={e => update('revisao', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Cavidades Ativas *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={form.cavidades_ativas}
                          onChange={e => update('cavidades_ativas', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Status da Ficha</label>
                        <select
                          value={form.status}
                          onChange={e => update('status', e.target.value as Status)}
                          className={inputClass}
                        >
                          <option value="RASCUNHO">RASCUNHO</option>
                          <option value="EM_ANALISE">EM ANÁLISE</option>
                          <option value="APROVADA">APROVADA</option>
                          <option value="LIBERADA">LIBERADA P/ PRODUÇÃO</option>
                          <option value="OBSOLETA">OBSOLETA</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <EntityCodeLookup
                          label="PRODUTO / PEÇA *"
                          value={form.produto_id}
                          records={products.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome }))}
                          onChange={v => update('produto_id', v)}
                          onSelect={r => {
                            update('produto_id', r.id)
                            setMessage(`Produto ${r.codigo} selecionado.`)
                          }}
                          required
                          compact
                          placeholder="Buscar peça..."
                        />
                      </div>

                      <div>
                        <EntityCodeLookup
                          label="MOLDE / FERRAMENTAL *"
                          value={form.ferramenta_id}
                          records={tools.map(t => ({
                            id: t.id,
                            codigo: t.codigo,
                            nome: t.nome,
                            dimensoes: t.tipo
                          }))}
                          onChange={v => update('ferramenta_id', v)}
                          onSelect={r => {
                            update('ferramenta_id', r.id)
                            const tHit = tools.find(x => x.id === r.id)
                            if (tHit?.cavidades_ativas || tHit?.numero_cavidades) {
                              update('cavidades_ativas', String(tHit.cavidades_ativas || tHit.numero_cavidades))
                            }
                          }}
                          compact
                          placeholder="Buscar molde..."
                        />
                      </div>

                      <div>
                        <EntityCodeLookup
                          label={textos.recurso}
                          value={form.maquina_id}
                          records={machines.map(m => ({
                            id: m.id,
                            codigo: m.codigo,
                            nome: m.nome,
                            dimensoes: m.tipo
                          }))}
                          onChange={v => update('maquina_id', v)}
                          compact
                          placeholder="Buscar máquina..."
                        />
                      </div>

                      <div>
                        <EntityCodeLookup
                          label="CLIENTE INDUSTRIAL"
                          value={form.codigo_cliente}
                          records={clients.map(c => ({
                            id: c.codigo,
                            codigo: c.codigo,
                            nome: c.nome,
                            documento: c.documento
                          }))}
                          onChange={v => update('codigo_cliente', v)}
                          compact
                          placeholder="Cód. do cliente..."
                        />
                      </div>
                    </div>

                    {/* Resumo Dinâmico do Item Selecionado */}
                    <div className="mt-2.5 rounded-[2px] bg-slate-50 p-2 text-[10px] text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-200">
                      <div>
                        <strong>Peça:</strong> {selectedProduct ? `${selectedProduct.codigo} — ${selectedProduct.nome}` : 'Nenhuma selecionada'}
                      </div>
                      <div>
                        <strong>Molde:</strong> {selectedTool ? `${selectedTool.codigo} (${selectedTool.numero_cavidades ?? '1'} cav.)` : 'Nenhum selecionado'}
                      </div>
                      <div>
                        <strong>Máquina:</strong> {selectedMachine ? `${selectedMachine.codigo} — ${selectedMachine.nome}` : 'Nenhuma alocada'}
                      </div>
                    </div>
                  </section>

                  {/* Bloco 3: Ciclo Produtivo & Parâmetros Térmicos */}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    
                    {/* Ciclo e Rendimento da Máquina */}
                    <section className={cardClass}>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          SEÇÃO 3A
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          {textos.cicloTitulo}
                        </h2>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <div>
                          <label className={labelClass}>Ciclo Total (s) *</label>
                          <input
                            type="number"
                            step="any"
                            value={form.ciclo_seg}
                            onChange={e => update('ciclo_seg', e.target.value)}
                            placeholder="36"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.etapa}</label>
                          <input
                            type="number"
                            step="any"
                            value={form.tempo_injecao_seg}
                            onChange={e => update('tempo_injecao_seg', e.target.value)}
                            placeholder="3.5"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.etapaFinal}</label>
                          <input
                            type="number"
                            step="any"
                            value={form.tempo_resfriamento_seg}
                            onChange={e => update('tempo_resfriamento_seg', e.target.value)}
                            placeholder="18"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.forca}</label>
                          <input
                            type="number"
                            step="any"
                            value={form.forca_fechamento}
                            onChange={e => update('forca_fechamento', e.target.value)}
                            placeholder="120"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* KPIs Calculados de Rendimento */}
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-[2px] bg-slate-50 p-2 border border-slate-200">
                        <div className="text-center">
                          <span className="text-[8.5px] font-bold uppercase text-slate-500">Capacidade</span>
                          <div className="text-sm font-black text-[#123B50] font-mono">{pcsPerHour} un/h</div>
                        </div>
                        <div className="text-center">
                          <span className="text-[8.5px] font-bold uppercase text-slate-500">Ciclos / Hora</span>
                          <div className="text-sm font-black text-[#2D8DB8] font-mono">{cyclesPerHour} cic/h</div>
                        </div>
                        <div className="text-center">
                          <span className="text-[8.5px] font-bold uppercase text-slate-500">Cavidades</span>
                          <div className="text-sm font-black text-slate-800 font-mono">{cavitiesNum} ativas</div>
                        </div>
                      </div>

                      {/* Parâmetros de Peso */}
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelClass}>Peso Peça Líquida (kg)</label>
                          <input
                            type="number"
                            step="any"
                            value={form.peso_peca}
                            onChange={e => update('peso_peca', e.target.value)}
                            placeholder="0.035"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.pesoResiduo}</label>
                          <input
                            type="number"
                            step="any"
                            value={form.peso_canal}
                            onChange={e => update('peso_canal', e.target.value)}
                            placeholder="0.005"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </section>

                    {/* Temperaturas das Zonas de Plastificação */}
                    <section className={cardClass}>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                            SEÇÃO 3B
                          </span>
                          <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                            {textos.temperaturaTitulo}
                          </h2>
                        </div>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Tolerância: ± {form.tolerancia_temp || '5'} °C
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <div>
                          <label className={labelClass}>{textos.zonas[0]}</label>
                          <input
                            type="number"
                            value={form.bico}
                            onChange={e => update('bico', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.zonas[1]}</label>
                          <input
                            type="number"
                            value={form.zona1}
                            onChange={e => update('zona1', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.zonas[2]}</label>
                          <input
                            type="number"
                            value={form.zona2}
                            onChange={e => update('zona2', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.zonas[3]}</label>
                          <input
                            type="number"
                            value={form.zona3}
                            onChange={e => update('zona3', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.zonas[4]}</label>
                          <input
                            type="number"
                            value={form.zona4}
                            onChange={e => update('zona4', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{textos.zonas[5]}</label>
                          <input
                            type="number"
                            value={form.zona_molde}
                            onChange={e => update('zona_molde', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Diagrama Visual Esquemático do Canhão de Injeção */}
                      <div className="mt-3 rounded-[2px] border border-slate-200 bg-slate-900 p-2.5 text-white">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#48B7C7] mb-1">
                          {textos.perfilTermico}
                        </div>
                        <div className="flex items-center justify-between text-center gap-1 font-mono text-[10px]">
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-rose-500/40">
                            <span className="text-[8px] text-slate-400 block">{textos.diagrama[0]}</span>
                            <strong className="text-rose-400">{tempC(form.bico)}</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-amber-500/40">
                            <span className="text-[8px] text-slate-400 block">{textos.diagrama[1]}</span>
                            <strong className="text-amber-400">{tempC(form.zona1)}</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-yellow-500/40">
                            <span className="text-[8px] text-slate-400 block">{textos.diagrama[2]}</span>
                            <strong className="text-yellow-400">{tempC(form.zona2)}</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-sky-500/40">
                            <span className="text-[8px] text-slate-400 block">{textos.diagrama[3]}</span>
                            <strong className="text-sky-400">{tempC(form.zona3)}</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-teal-500/40">
                            <span className="text-[8px] text-slate-400 block">{textos.diagrama[4]}</span>
                            <strong className="text-teal-400">{tempC(form.zona4)}</strong>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Bloco 3C: Parâmetros de Pressão & Temperatura de Processamento */}
                  <section className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                      <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                        SEÇÃO 3C
                      </span>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                        {textos.pressaoTitulo}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <label className={labelClass}>{textos.pressoes[0]}</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.pressao_injecao}
                          onChange={e => update('pressao_injecao', e.target.value)}
                          placeholder="Ex: 1200"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{textos.pressoes[1]}</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.pressao_recalque}
                          onChange={e => update('pressao_recalque', e.target.value)}
                          placeholder="Ex: 800"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{textos.pressoes[2]}</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.contrapressao}
                          onChange={e => update('contrapressao', e.target.value)}
                          placeholder="Ex: 50"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{textos.pressoes[3]}</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.pressao_trabalho}
                          onChange={e => update('pressao_trabalho', e.target.value)}
                          placeholder="Ex: 140"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{textos.pressoes[4]}</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={form.temperatura_trabalho}
                          onChange={e => update('temperatura_trabalho', e.target.value)}
                          placeholder="Ex: 220"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <p className="mt-2 text-[9px] italic text-slate-500">
                      {textos.pressaoAjuda}
                    </p>
                  </section>

                  {/* Bloco 4: Aviso Importante & Instruções de Operação (Conforme Modelo do PDF) */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#D65B61] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          AVISO OBRIGATÓRIO
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#D65B61]">
                          INSTRUÇÕES OPERACIONAIS &amp; LIBERAÇÃO DA MÁQUINA
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        SGQ • Auditoria de Posto de Trabalho
                      </span>
                    </div>

                    {/* Caixa de Destaque com Alerta (ex: Desmoldante) */}
                    <div className="rounded-[2px] border-l-4 border-l-[#D65B61] bg-rose-50/80 p-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-[#D65B61]" />
                        <strong className="text-xs font-black uppercase text-rose-900">
                          Alerta Crítico de Processo:
                        </strong>
                      </div>
                      <input
                        type="text"
                        value={form.aviso_destaque}
                        onChange={e => update('aviso_destaque', e.target.value)}
                        placeholder={textos.aviso}
                        className="mt-1 h-[28px] w-full rounded border border-rose-300 bg-white px-2 text-[11px] font-bold text-rose-900 outline-none"
                      />
                    </div>

                    {/* Procedimentos Padrão de Setup */}
                    <div className="mt-3">
                      <label className={labelClass}>Procedimento Operacional Padronizado (POP Chão de Fábrica)</label>
                      <textarea
                        rows={5}
                        value={form.observacoes_setup}
                        onChange={e => update('observacoes_setup', e.target.value)}
                        className="w-full rounded-[2px] border border-slate-300 bg-white p-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]"
                      />
                    </div>
                  </section>

                  {/* Bloco 5: Guia Técnico por Categoria de Processo */}
                  <section className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                      <span className="rounded bg-[#48B7C7] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                        GUIA RÁPIDO
                      </span>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                        Pontos técnicos da categoria: {form.categoria_processo}
                      </h2>
                    </div>

                    <ol className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {(guiaCategoria[form.categoria_processo] ?? guiaCategoria.INJETADOS).map((g, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[11px] leading-snug text-slate-700"
                        >
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#123B50] text-[9px] font-black text-white">
                            {idx + 1}
                          </span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 2 (2/4): MATÉRIA-PRIMA — componentes da batelada com foto do cadastro */}
              {/* ========================================================================= */}
              {activeTab === 'MATERIA_PRIMA' && (
                <div className="space-y-3">
                  <section className={cardClass}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          SEÇÃO 2
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          MATÉRIA-PRIMA DA BATELADA
                        </h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={e => void handleFile(e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="h-7 px-2.5 text-[10px] font-bold uppercase rounded-[2px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                        >
                          <ImagePlus size={12} />
                          <span>Foto da Peça (ficha)</span>
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-600">
                          Total batelada: <strong className="text-[#123B50]">{totalBateladaKg.toFixed(3)} kg</strong>
                        </span>
                      </div>
                    </div>

                    <div className="mb-2 flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-semibold text-[#123B50]">
                      <Search size={13} className="mt-0.5 shrink-0 text-[#2D8DB8]" />
                      <span>
                        Clique na <strong>descrição</strong> de um componente para abrir o card flutuante com a
                        foto. A foto não é anexada aqui: ela vem do <strong>Cadastro de Produtos</strong>
                        (coluna <code className="font-mono text-[9px]">erp_produtos.foto_url</code>).
                        O campo &quot;%&quot; é calculado pelo sistema sobre a massa informada.
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-[2px] border border-slate-200">
                      <table className="w-full border-collapse text-[11px]">
                        <thead className="bg-[#123B50] text-white">
                          <tr className="h-[28px]">
                            <th className="w-[44px] px-2 text-center font-bold uppercase text-[9px]">Item</th>
                            <th className="w-[150px] px-2 text-left font-bold uppercase text-[9px]">Código MP</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px]">Descrição</th>
                            <th className="w-[80px] px-2 text-right font-bold uppercase text-[9px]">%</th>
                            <th className="w-[110px] px-2 text-right font-bold uppercase text-[9px]">Qtde</th>
                            <th className="w-[90px] px-2 text-left font-bold uppercase text-[9px]">Unid</th>
                            <th className="w-[74px] px-2 text-center font-bold uppercase text-[9px]">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {form.mistura.map((mat, idx) => {
                            const prod = produtoDaMateriaPrima(mat)
                            return (
                              <tr key={mat.id} className="hover:bg-slate-50">
                                <td className="px-2 text-center font-mono text-[10px] font-bold text-slate-500">
                                  {String(idx + 1).padStart(2, '0')}
                                </td>
                                <td className="p-1.5">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={mat.codigo}
                                      readOnly={!!prod}
                                      onChange={e => {
                                        const next = [...form.mistura]
                                        next[idx] = { ...next[idx], codigo: e.target.value }
                                        update('mistura', next)
                                      }}
                                      placeholder="Cód. MP"
                                      className={`h-7 w-full min-w-0 rounded-[2px] border px-2 font-mono text-[11px] font-bold outline-none focus:border-[#2D8DB8] ${
                                        prod ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-300 text-slate-800'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setMpPickerIdx(idx)}
                                      title="Buscar produto do cadastro"
                                      className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#2D8DB8] cursor-pointer"
                                    >
                                      <Search size={12} />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-1.5">
                                  {prod ? (
                                    <button
                                      type="button"
                                      onClick={() => setMpPhoto(prod)}
                                      title="Clique para ver a foto do cadastro de produtos"
                                      className="flex w-full items-center gap-1.5 text-left text-[11px] text-slate-800 hover:text-[#2D8DB8]"
                                    >
                                      <ImagePlus size={12} className="shrink-0 text-[#2D8DB8]" />
                                      <span className="truncate underline decoration-dotted underline-offset-2">
                                        {mat.descricao || prod.nome || '(sem descrição no cadastro)'}
                                      </span>
                                    </button>
                                  ) : (
                                    <input
                                      type="text"
                                      value={mat.descricao}
                                      onChange={e => {
                                        const next = [...form.mistura]
                                        next[idx] = { ...next[idx], descricao: e.target.value }
                                        update('mistura', next)
                                      }}
                                      placeholder="Descrição da matéria-prima"
                                      className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] outline-none focus:border-[#2D8DB8]"
                                    />
                                  )}
                                </td>
                                <td className="px-2 text-right font-mono text-[11px] font-bold text-slate-700">
                                  {proporcaoPct(mat)}
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={mat.quantidade === 0 ? '' : mat.quantidade}
                                    onChange={e => {
                                      const next = [...form.mistura]
                                      next[idx] = { ...next[idx], quantidade: Number(e.target.value) || 0 }
                                      update('mistura', next)
                                    }}
                                    className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-right font-mono text-[11px] font-bold text-[#123B50] outline-none focus:border-[#2D8DB8]"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    list="unidades-mistura"
                                    value={mat.unidade}
                                    onChange={e => {
                                      const next = [...form.mistura]
                                      next[idx] = { ...next[idx], unidade: e.target.value.toUpperCase() }
                                      update('mistura', next)
                                    }}
                                    className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] font-bold uppercase outline-none focus:border-[#2D8DB8]"
                                  />
                                </td>
                                <td className="p-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setMpPickerIdx(idx)}
                                      title="Vincular produto do cadastro"
                                      className="grid h-7 w-7 place-items-center rounded-[2px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <Layers size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => update('mistura', form.mistura.filter((_, i) => i !== idx))}
                                      className="text-slate-400 hover:text-rose-600"
                                      title="Remover componente"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {form.mistura.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-[11px] font-semibold text-slate-400">
                                Nenhum componente cadastrado. Use &quot;+ Adicionar matéria-prima&quot; e vincule o
                                produto do cadastro para liberar a foto.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <datalist id="unidades-mistura">
                      {UNIDADES_MISTURA.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          update('mistura', [
                            ...form.mistura,
                            { id: crypto.randomUUID(), produto_id: '', codigo: '', descricao: '', quantidade: 0, unidade: 'KG' }
                          ])
                        }
                        className="h-7 px-2.5 text-[10px] font-bold uppercase rounded-[2px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Adicionar matéria-prima</span>
                      </button>

                      <span className="text-[9px] italic text-slate-500">
                        {itensSemUnidadeMassa > 0
                          ? `${itensSemUnidadeMassa} item(ns) em unidade avulsa (UN) ficam fora do somatório de massa.`
                          : 'Proporção recalculada sobre a massa (KG, G, TON, L, ML) informada em cada linha.'}
                      </span>
                    </div>
                  </section>

                  {/* Card flutuante com a foto da matéria-prima (origem: cadastro de produtos) */}
                  {mpPhoto && (
                    <div
                      className="fixed inset-0 z-[10060] flex items-center justify-center bg-slate-950/60 p-4"
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Foto da matéria-prima ${mpPhoto.codigo}`}
                      onMouseDown={e => {
                        if (e.target === e.currentTarget) setMpPhoto(null)
                      }}
                    >
                      <section className="w-full max-w-[440px] overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-2xl">
                        <header className="flex items-center justify-between border-b border-slate-200 bg-[#123B50] px-3 py-2">
                          <div className="min-w-0">
                            <span className="block text-[8.5px] font-black uppercase tracking-widest text-[#48B7C7]">
                              Matéria-prima · cadastro de produtos
                            </span>
                            <strong className="block truncate text-[12px] text-white">
                              {mpPhoto.codigo} — {mpPhoto.nome}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMpPhoto(null)}
                            aria-label="Fechar foto da matéria-prima"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] border border-slate-500 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </header>

                        <div className="grid h-[300px] place-items-center bg-slate-100 p-3">
                          {mpPhoto.foto_url ? (
                            <img
                              src={mpPhoto.foto_url}
                              alt={`Foto de ${mpPhoto.nome}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="max-w-[300px] text-center">
                              <ImagePlus size={30} className="mx-auto text-slate-400" />
                              <p className="mt-2 text-[11px] font-bold text-slate-600">
                                Sem foto no cadastro de produtos
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Abra <strong>Cadastro de Produtos</strong> e envie a imagem do item{' '}
                                <strong className="font-mono">{mpPhoto.codigo}</strong>. A ficha passa a exibir a
                                foto automaticamente, sem anexar nada aqui.
                              </p>
                            </div>
                          )}
                        </div>

                        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                          <span>
                            {mpPhoto.descricao ? <span className="truncate">{mpPhoto.descricao}</span> : 'Sem descrição complementar.'}
                          </span>
                          <span className="shrink-0 font-mono font-bold text-slate-700">
                            Unid.: {mpPhoto.unidade ?? '—'}
                          </span>
                        </footer>
                      </section>
                    </div>
                  )}

                  {/* Seleção de produto do cadastro para a linha da mistura */}
                  {mpPickerIdx !== null && (
                    <MateriaPrimaPicker
                      produtos={products}
                      onFechar={() => setMpPickerIdx(null)}
                      onEscolher={p => {
                        const next = [...form.mistura]
                        next[mpPickerIdx] = {
                          ...next[mpPickerIdx],
                          produto_id: p.id,
                          codigo: p.codigo,
                          descricao: p.nome || p.descricao || '',
                          unidade: (p.unidade || 'KG').toUpperCase()
                        }
                        update('mistura', next)
                        setMpPickerIdx(null)
                        setMessage(`Matéria-prima ${p.codigo} vinculada ao cadastro de produtos.`)
                      }}
                    />
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 3 (3/4): MOLDE — número, desenho e galeria fotográfica               */}
              {/* ========================================================================= */}
              {activeTab === 'MOLDE' && (
                <div className="space-y-3">

                  {/* Identificação do molde: número, cavidades e desenho (origem erp_ferramentas_industriais) */}
                  <section className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                      <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                        MOLDE 3/4
                      </span>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                        NÚMERO DO MOLDE &amp; DESENHO TÉCNICO
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      <EntityCodeLookup
                        label="Nº DO MOLDE / FERRAMENTAL"
                        value={form.ferramenta_id}
                        records={tools.map(t => ({
                          id: t.id,
                          codigo: t.codigo,
                          nome: t.nome,
                          dimensoes: t.tipo
                        }))}
                        onChange={v => update('ferramenta_id', v)}
                        onSelect={r => {
                          const tHit = tools.find(x => x.id === r.id)
                          if (!tHit) return
                          update('ferramenta_id', tHit.id)
                          if (tHit.numero_cavidades) update('cavidades_ativas', String(tHit.numero_cavidades))
                          if (tHit.desenho_referencia && !form.desenho_numero) {
                            update('desenho_numero', tHit.desenho_referencia)
                          }
                        }}
                        compact
                        placeholder="Buscar molde..."
                      />

                      <div>
                        <label className={labelClass}>Número de cavidades do molde</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedTool ? String(selectedTool.numero_cavidades ?? '') : ''}
                          placeholder={selectedTool ? 'Não informado no cadastro' : 'Selecione o molde'}
                          className={`${inputClass} bg-slate-50 text-slate-600`}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Desenho nº (referência)</label>
                        <input
                          type="text"
                          value={form.desenho_numero}
                          onChange={e => update('desenho_numero', e.target.value)}
                          placeholder="Ex.: 01201"
                          className={inputClass}
                        />
                      </div>

                      <div className="flex items-end">
                        <input
                          ref={desenhoRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          className="hidden"
                          onChange={e => {
                            void handleDesenhoUpload(e.target.files?.[0])
                            e.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => desenhoRef.current?.click()}
                          className={`${btnClass} w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                        >
                          <FileDown size={13} />
                          <span>Anexar desenho (PDF/PNG/JPG)</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-700">
                      <strong>Molde selecionado:</strong>{' '}
                      {selectedTool
                        ? `${selectedTool.codigo} — ${selectedTool.nome} (${selectedTool.tipo})`
                        : 'Nenhum molde vinculado. O número acima é o do cadastro de ferramental, não da peça.'}
                    </div>

                    {form.desenho_url && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-[2px] border border-slate-200 bg-white p-2">
                        {form.desenho_url.toLowerCase().endsWith('.pdf') || form.desenho_url.includes('.pdf?') ? (
                          <span className="grid h-[46px] w-[38px] shrink-0 place-items-center rounded border border-slate-300 bg-slate-100 text-[8px] font-black text-slate-600">
                            PDF
                          </span>
                        ) : (
                          <img
                            src={form.desenho_url}
                            alt="Desenho do molde"
                            className="h-[64px] w-[64px] shrink-0 rounded border border-slate-200 object-contain"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-700">
                          {form.desenho_numero ? `Desenho ${form.desenho_numero} · ` : 'Desenho anexado · '}
                          <a
                            href={form.desenho_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2D8DB8] underline"
                          >
                            abrir em nova aba
                          </a>
                        </span>
                        <button
                          type="button"
                          onClick={() => update('desenho_url', '')}
                          className="shrink-0 text-slate-400 hover:text-rose-600"
                          title="Remover vínculo do desenho"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Seção Superior de Upload de Fotos do Molde */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          FOTOS 3/4
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          GALERIA FOTOGRÁFICA DO MOLDE &amp; FERRAMENTAL
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => moldPhotoRef.current?.click()}
                        className={`${btnClass} bg-[#2D8DB8] text-white hover:bg-[#236F91]`}
                      >
                        <ImagePlus size={13} />
                        <span>Adicionar Foto do Molde</span>
                      </button>
                    </div>

                    <input
                      ref={moldPhotoRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => void handleMoldPhotoUpload(e.target.files?.[0])}
                    />

                    {/* Grid de Fotos Técnicas Sem Repetição */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      
                      {/* Foto Principal da Ficha (se houver) */}
                      {form.imagem_url && (
                        <div className="rounded-[2px] border border-slate-200 bg-white overflow-hidden shadow-xs group relative">
                          <div className="h-72 bg-slate-100 flex items-center justify-center p-2">
                            <img
                              src={form.imagem_url}
                              alt="Foto Principal"
                              className="max-h-full max-w-full object-contain cursor-pointer"
                              onClick={() => setSelectedPhotoZoom(form.imagem_url)}
                            />
                          </div>
                          <div className="p-2 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                              <strong className="text-[10px] text-slate-800 block">Foto Principal da Peça</strong>
                              <span className="text-[8.5px] text-slate-500">Imagem Mestre</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoZoom(form.imagem_url)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Visualizar ampliada"
                            >
                              <Maximize2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Fotos Adicionadas à Galeria do Molde */}
                      {form.fotos_molde.map((foto, idx) => (
                        <div
                          key={foto.id}
                          className="rounded-[2px] border border-slate-200 bg-white overflow-hidden shadow-xs relative group"
                        >
                          <div className="h-72 bg-slate-100 flex items-center justify-center p-2">
                            <img
                              src={foto.url}
                              alt={foto.titulo}
                              className="max-h-full max-w-full object-contain cursor-pointer"
                              onClick={() => setSelectedPhotoZoom(foto.url)}
                            />
                          </div>
                          <div className="p-2 border-t border-slate-100 bg-slate-50">
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-[#123B50] px-1 py-0.2 text-[8px] font-black uppercase text-white">
                                {foto.tipo}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoZoom(foto.url)}
                                  className="text-slate-400 hover:text-slate-700"
                                  title="Ver ampliada"
                                >
                                  <Maximize2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = form.fotos_molde.filter((_, i) => i !== idx)
                                    update('fotos_molde', next)
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                  title="Remover foto"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={foto.titulo}
                              onChange={e => {
                                const next = [...form.fotos_molde]
                                next[idx].titulo = e.target.value
                                update('fotos_molde', next)
                              }}
                              className="mt-1 h-6 w-full text-[11px] font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-[#2D8DB8] outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Card de Adição Rápida */}
                      <div
                        onClick={() => moldPhotoRef.current?.click()}
                        className="h-72 rounded-[2px] border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-sky-50/50 hover:border-[#2D8DB8] flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-colors"
                      >
                        <ImagePlus size={34} className="text-[#2D8DB8]" />
                        <strong className="mt-2 text-[12px] text-slate-800">Enviar Foto do Molde</strong>
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          Cavidade, lado fixo, gavetas ou montagem
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Checklist Técnico de Montagem e Fixação do Molde */}
                  <section className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                      <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                        CHECKLIST
                      </span>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                        CONEXÕES TÉCNICAS DE FIXAÇÃO &amp; REFRIGERAÇÃO
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[10px]">
                      <div className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1">
                        <strong className="text-slate-800 block text-[11px]">1. Refrigeração</strong>
                        <div>• Circuito de água conectado</div>
                        <div>• Temperatura do molde: {form.zona_molde ? `${tempC(form.zona_molde)}` : 'não informada'}</div>
                        <div>• Mangueiras de engate rápido conferidas</div>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1">
                        <strong className="text-slate-800 block text-[11px]">2. Fixação e Grampos</strong>
                        <div>• Flange de centragem encaixada</div>
                        <div>• Parafusos e grampos torquizados</div>
                        <div>• Proteção frontal e traseira liberadas</div>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1">
                        <strong className="text-slate-800 block text-[11px]">3. Extração &amp; Gavetas</strong>
                        <div>• Tirantes do extrator engatados</div>
                        <div>• Fim de curso mecânico regulado</div>
                        <div>• Gavetas lubrificadas com graxa técnica</div>
                      </div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1">
                        <strong className="text-slate-800 block text-[11px]">4. Desmoldante &amp; Bico</strong>
                        <div>• Raio da bucha compatível com o bico</div>
                        <div>• Desmoldante: {form.aviso_destaque || 'não definido na ficha'}</div>
                        <div>• Canal de injeção polido e desobstruído</div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 4 (4/4): QUALIDADE, ESPECIFICAÇÕES TÉCNICAS & ESPECIFICAÇÕES SGQ      */}
              {/* ========================================================================= */}
              {activeTab === 'QUALIDADE' && (
                <div className="space-y-3">
                  
                  {/* Seção Superior: Especificações da Peça & Documentos Relacionados */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          SGQ 4/4
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          ESPECIFICAÇÕES DA PEÇA &amp; DOCUMENTOS DA QUALIDADE
                        </h2>
                      </div>
                      <span className="text-[9.5px] font-semibold text-slate-500">
                        Número e desenho do molde: aba 3 (Molde)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className={labelClass}>Formulário SGQ Relacionado</label>
                        <input
                          type="text"
                          value={form.formulario_sgq}
                          onChange={e => update('formulario_sgq', e.target.value)}
                          placeholder="FPT-1J-010/2 • FPT-1J-010/3"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Acabamento Superficial</label>
                        <input
                          type="text"
                          value={form.especificacoes_acabamento}
                          onChange={e => update('especificacoes_acabamento', e.target.value)}
                          placeholder="VDI 24 / Polimento espelhado"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Cor / Padrão Visual</label>
                        <input
                          type="text"
                          value={form.especificacoes_cor}
                          onChange={e => update('especificacoes_cor', e.target.value)}
                          placeholder="Preto Técnico Fosco"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <label className={labelClass}>Gravação, Datador &amp; Rastreabilidade na Peça</label>
                      <input
                        type="text"
                        value={form.especificacoes_gravacao}
                        onChange={e => update('especificacoes_gravacao', e.target.value)}
                        placeholder="Datador ano/mês e gravação da cavidade em relevo"
                        className={inputClass}
                      />
                    </div>
                  </section>

                  {/* Plano de Inspeção e Controle de Qualidade */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          PLANO SGQ
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          ITENS DE INSPEÇÃO OPERACIONAL NO POSTO DE TRABALHO
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const novoItem: InspectionItem = {
                            id: crypto.randomUUID(),
                            caracteristica: 'Nova característica crítica',
                            instrumento: 'Paquímetro / Visual',
                            frequencia: 'A cada 1 hora',
                            criterio: 'Sem rebarbas / Dentro do dimensional',
                            tolerancia: '± 0.05 mm',
                            status_aprovacao: 'CONFORME'
                          }
                          update('inspecoes', [...form.inspecoes, novoItem])
                        }}
                        className="h-7 px-2.5 text-[10px] font-bold uppercase rounded-[2px] border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Adicionar Item de Inspeção</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-[2px] border border-slate-200">
                      <table className="w-full border-collapse text-[11px]">
                        <thead className="bg-[#123B50] text-white">
                          <tr className="h-[28px]">
                            <th className="px-2 text-left font-bold uppercase text-[9px]">Característica Inspecionada</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px] w-[180px]">Instrumento / Método</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px] w-[160px]">Frequência</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px] w-[180px]">Critério de Aceitação</th>
                            <th className="px-2 text-center font-bold uppercase text-[9px] w-[90px]">Situação</th>
                            <th className="px-2 text-center font-bold uppercase text-[9px] w-[40px]">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {form.inspecoes.map((insp, idx) => (
                            <tr key={insp.id} className="hover:bg-slate-50">
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={insp.caracteristica}
                                  onChange={e => {
                                    const next = [...form.inspecoes]
                                    next[idx].caracteristica = e.target.value
                                    update('inspecoes', next)
                                  }}
                                  className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] font-semibold outline-none focus:border-[#2D8DB8]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={insp.instrumento}
                                  onChange={e => {
                                    const next = [...form.inspecoes]
                                    next[idx].instrumento = e.target.value
                                    update('inspecoes', next)
                                  }}
                                  className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] outline-none focus:border-[#2D8DB8]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={insp.frequencia}
                                  onChange={e => {
                                    const next = [...form.inspecoes]
                                    next[idx].frequencia = e.target.value
                                    update('inspecoes', next)
                                  }}
                                  className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] outline-none focus:border-[#2D8DB8]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={insp.criterio}
                                  onChange={e => {
                                    const next = [...form.inspecoes]
                                    next[idx].criterio = e.target.value
                                    update('inspecoes', next)
                                  }}
                                  className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 px-2 text-[11px] outline-none focus:border-[#2D8DB8]"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <select
                                  value={insp.status_aprovacao || 'CONFORME'}
                                  onChange={e => {
                                    const next = [...form.inspecoes]
                                    next[idx].status_aprovacao = e.target.value as 'CONFORME' | 'NAO_CONFORME' | 'EM_ANALISE'
                                    update('inspecoes', next)
                                  }}
                                  className="h-7 w-full min-w-0 rounded-[2px] border border-slate-300 bg-emerald-50 px-1.5 text-[10px] font-black uppercase text-emerald-800 outline-none focus:border-[#2D8DB8]"
                                >
                                  <option value="CONFORME">Conforme</option>
                                  <option value="NAO_CONFORME">Não Conforme</option>
                                  <option value="EM_ANALISE">Em Análise</option>
                                </select>
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = form.inspecoes.filter((_, i) => i !== idx)
                                    update('inspecoes', next)
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Zoom de Foto */}
      {selectedPhotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setSelectedPhotoZoom(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] rounded bg-white p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedPhotoZoom(null)}
              className="absolute right-3 top-3 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
            >
              <X size={18} />
            </button>
            <img src={selectedPhotoZoom} alt="Visualização técnica ampliada" className="max-h-[85vh] max-w-full object-contain" />
          </div>
        </div>
      )}

      {/* Espelho de Impressão A4 Oficial da Ficha (SYSNQRA IT-PCP-001) */}
      <section className="ficha-print-sheet" aria-label="Espelho A4 da Ficha Técnica">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '6px' }}>
          <div>
            <h1 style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0 }}>SYSNQRA SISTEMAS INDUSTRIAIS</h1>
            <p style={{ fontSize: '8pt', color: '#475569', margin: '2px 0 0 0' }}>
              FICHA DE PROCESSO TÉCNICA (IT-PCP-001) • ENGENHARIA &amp; SGQ
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>FICHA: {form.codigo_ficha || '—'}</span>
            <p style={{ fontSize: '8pt', color: '#64748b', margin: '2px 0 0 0' }}>
              Folha 1 / 3 • Rev. {form.revisao} • {form.status}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '9pt', lineHeight: 1.5 }}>
          <div><strong>Produto:</strong> {selectedProduct ? `${selectedProduct.codigo} — ${selectedProduct.nome}` : '—'}</div>
          <div><strong>Molde / Ferramental:</strong> {selectedTool ? `${selectedTool.codigo} (${form.cavidades_ativas} cavidades ativas)` : '—'}</div>
          <div><strong>Desenho do molde:</strong> {form.desenho_numero || 'não informado'}{form.desenho_url ? ' · arquivo anexado na ficha (aba Molde)' : ' · sem arquivo anexado'}</div>
          <div><strong>Máquina / Recurso:</strong> {selectedMachine ? `${selectedMachine.codigo} — ${selectedMachine.nome}` : '—'}</div>
          <div><strong>Alerta Operacional:</strong> <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{form.aviso_destaque || 'Sem alerta operacional definido.'}</span></div>
        </div>

        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th colSpan={6} style={{ textAlign: 'center', background: '#e2e8f0' }}>PARÂMETROS DE TEMPERATURA (°C) — TOLERÂNCIA ±{form.tolerancia_temp}°C</th>
            </tr>
            <tr>
              <th>Bico</th><th>Zona 1</th><th>Zona 2</th><th>Zona 3</th><th>Zona 4</th><th>Molde</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{tempC(form.bico)}</td><td>{tempC(form.zona1)}</td><td>{tempC(form.zona2)}</td><td>{tempC(form.zona3)}</td><td>{tempC(form.zona4)}</td><td>{tempC(form.zona_molde)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th colSpan={6} style={{ textAlign: 'center', background: '#e2e8f0' }}>COMPOSIÇÃO E MISTURA DE MATÉRIA-PRIMA</th>
            </tr>
            <tr>
              <th>Item</th><th>Cód. MP</th><th>Descrição</th><th style={{ textAlign: 'right' }}>%</th><th style={{ textAlign: 'right' }}>Qtde</th><th>Unid</th>
            </tr>
          </thead>
          <tbody>
            {form.mistura.map((m, i) => (
              <tr key={m.id}>
                <td>{i + 1}</td><td>{m.codigo}</td><td>{m.descricao}</td>
                <td style={{ textAlign: 'right' }}>{proporcaoPct(m)}</td>
                <td style={{ textAlign: 'right' }}>{m.quantidade}</td>
                <td>{m.unidade}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {form.fotos_molde.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '8pt', fontWeight: 'bold', borderBottom: '1px solid #0f172a', paddingBottom: '2px' }}>
              FOTOS DO MOLDE / FERRAMENTAL ({form.fotos_molde.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {form.fotos_molde.slice(0, 4).map(foto => (
                <div key={foto.id} style={{ width: '110px', border: '1px solid #cbd5e1', padding: '2px' }}>
                  <img
                    src={foto.url}
                    alt={foto.titulo}
                    style={{ width: '106px', height: '80px', objectFit: 'contain', background: '#f8fafc' }}
                  />
                  <div style={{ fontSize: '6.5pt', textAlign: 'center' }}>{foto.titulo || foto.tipo}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', fontSize: '8pt', border: '1px solid #cbd5e1', padding: '6px', background: '#f8fafc' }}>
          <strong>INSTRUÇÕES OBRIGATÓRIAS DO SGQ:</strong>
          <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', fontSize: '7.5pt' }}>
            {form.observacoes_setup || 'Sem instruções de setup registradas para esta ficha.'}
          </pre>
        </div>
      </section>
    </>
  )
}

function noticeMessage(error: string, message: string): string {
  return error || message
}

// Temperatura sem valor: mostra traço em vez de "°C" solto (o print e o perfil térmico usam isso).
function tempC(v: string): string {
  return v.trim() ? `${v}°C` : '—'
}

// Modal de escolha da matéria-prima dentro do cadastro de produtos da empresa (RLS).
function MateriaPrimaPicker({
  produtos,
  onFechar,
  onEscolher
}: {
  produtos: Product[]
  onFechar: () => void
  onEscolher: (p: Product) => void
}) {
  const [filtro, setFiltro] = useState('')

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    const base = q
      ? produtos.filter(p => [p.codigo, p.nome, p.descricao].join(' ').toLowerCase().includes(q))
      : produtos
    return base.slice(0, 200)
  }, [produtos, filtro])

  return (
    <div
      className="fixed inset-0 z-[10070] flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Seleção de matéria-prima do cadastro de produtos"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <section className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <span className="block text-[8.5px] font-black uppercase tracking-widest text-[#2D8DB8]">
              Cadastro de produtos
            </span>
            <h2 className="text-[13px] font-black uppercase tracking-wider text-[#123B50]">
              Vincular matéria-prima à linha
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar seleção"
            className="grid h-7 w-7 place-items-center rounded-[2px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </header>

        <div className="border-b border-slate-200 p-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white pl-8 pr-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 bg-[#123B50] text-white">
              <tr className="h-[26px]">
                <th className="w-[120px] px-2 text-left font-bold uppercase text-[9px]">Código</th>
                <th className="px-2 text-left font-bold uppercase text-[9px]">Descrição</th>
                <th className="w-[70px] px-2 text-center font-bold uppercase text-[9px]">Unid</th>
                <th className="w-[70px] px-2 text-center font-bold uppercase text-[9px]">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lista.map(p => (
                <tr
                  key={p.id}
                  tabIndex={0}
                  onClick={() => onEscolher(p)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onEscolher(p)
                  }}
                  className="cursor-pointer hover:bg-sky-50"
                >
                  <td className="px-2 py-1.5 font-mono font-bold text-[#123B50]">{p.codigo}</td>
                  <td className="px-2 py-1.5 text-slate-700">{p.nome}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-slate-600">{p.unidade ?? '—'}</td>
                  <td className="px-2 py-1.5 text-center">
                    {p.foto_url ? (
                      <img
                        src={p.foto_url}
                        alt=""
                        className="mx-auto h-7 w-7 rounded-[2px] border border-slate-200 object-contain"
                      />
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-slate-400">sem foto</span>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[11px] font-semibold text-slate-400">
                    Nenhum produto encontrado no cadastro desta empresa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-600">
          <span>
            {lista.length} de {produtos.length} produto(s){lista.length >= 200 ? ' — refine a busca' : ''}
          </span>
          <button
            type="button"
            onClick={onFechar}
            className="h-7 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
        </footer>
      </section>
    </div>
  )
}

export default FichasProcesso
