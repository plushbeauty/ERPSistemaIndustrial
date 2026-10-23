/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — ENGENHARIA DE PROCESSOS & SGQ
 * Módulo: Ficha Técnica de Processo Industrial (Injetados & Prensados)
 * Arquivo: src/pages/FichasProcesso.tsx
 * Padrão Visual: SYSNQRA Industrial Compacto (#F4FBFD, #123B50, #2D8DB8, #48B7C7)
 * Estrutura em 3 Abas:
 *   Aba 1 (1/3) — Processo & Mistura (Parâmetros de Injeção, Ciclo, Temperaturas e Setup)
 *   Aba 2 (2/3) — Fotos do Molde & Ferramental (Setup, Fixação e Refrigeração)
 *   Aba 3 (3/3) — Qualidade & Desenho (Especificações Técnicas, Desenho e SGQ)
 * =========================================================================
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  FileDown,
  ImagePlus,
  Layers,
  Maximize2,
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
}

type Machine = {
  id: string
  codigo: string
  nome: string
  tipo: string | null
  status: string
}

type Status = 'RASCUNHO' | 'EM_ANALISE' | 'APROVADA' | 'LIBERADA' | 'OBSOLETA'
type ActiveTab = 'PROCESSO' | 'MOLDE' | 'QUALIDADE'

export type MaterialMixtureItem = {
  id: string
  tipo: string
  descricao: string
  codigo: string
  dosagem_kg: number
  proporcao_pct: number
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

const defaultMistura: MaterialMixtureItem[] = [
  {
    id: 'mat-1',
    tipo: 'Polímero Base',
    descricao: 'Polipropileno Copolímero Fluidez 40%',
    codigo: '20082',
    dosagem_kg: 25.0,
    proporcao_pct: 98.04
  },
  {
    id: 'mat-2',
    tipo: 'Masterbatch / Cor',
    descricao: 'Master Color Preto',
    codigo: '20023',
    dosagem_kg: 0.5,
    proporcao_pct: 1.96
  }
]

const defaultInspecoes: InspectionItem[] = [
  {
    id: 'insp-1',
    caracteristica: 'Visual: Rebarba no fechamento da partição',
    instrumento: 'Inspeção Visual / Lupa 10x',
    frequencia: '1ª peça no setup / A cada 1 hora',
    criterio: 'Isento de rebarbas cortantes',
    status_aprovacao: 'CONFORME'
  },
  {
    id: 'insp-2',
    caracteristica: 'Massa líquida unitária da peça',
    instrumento: 'Balança Analítica 0.01g',
    frequencia: 'A cada início de turno (5 peças)',
    criterio: 'Peso nominal ± 2.0%',
    tolerancia: '± 0.20 g',
    status_aprovacao: 'CONFORME'
  },
  {
    id: 'insp-3',
    caracteristica: 'Cota crítica A (Encaixe / Dimensional)',
    instrumento: 'Paquímetro Digital Calibrado',
    frequencia: 'Início de lote e a cada 4 horas',
    criterio: 'Conforme desenho de engenharia',
    tolerancia: '± 0.05 mm',
    status_aprovacao: 'CONFORME'
  }
]

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
  tolerancia_temp: '5',
  bico: '210',
  zona1: '200',
  zona2: '190',
  zona3: '180',
  zona4: '170',
  zona_molde: '35',
  imagem_url: '',
  observacoes_setup:
    '1 - Realizar Check List para liberação da máquina. Verificar se toda documentação se encontra na mesma. A falta de qualquer informação deve ser comunicada ao responsável da produção ou da qualidade.\n2 - Peças de início de processo, ou seja ajuste de máquina, que saírem com defeito devem ser separadas para reciclagem e não devem ser contadas como refugo operacional.\n3 - Na troca da matéria prima ou material de cor diferente, é necessário efetuar limpeza do canhão, para que não haja contaminação. Após a limpeza é necessário injetar algumas peças para total limpeza do canhão. Essas peças devem ser separadas para posterior reciclagem.\n4 - Após a validação do processo pela Qualidade, as peças com defeito devem ser separadas e encaminhadas junto com o cartão ao setor de acabamento para contagem e finalização.',
  observacoes: '',
  aviso_destaque: 'Aplicar desmoldante a cada 100 injetadas',
  desenho_numero: 'TPA01201',
  desenho_url: '',
  formulario_sgq: 'FPT-1J-010/2 • FPT-1J-010/3',
  especificacoes_acabamento: 'VDI 24 / Polimento espelhado na cavidade',
  especificacoes_cor: 'Preto Técnico Fosco (Master 20023)',
  especificacoes_gravacao: 'Datador ano/mês e gravação da cavidade em alto relevo 0.3mm',
  mistura: defaultMistura,
  fotos_molde: [],
  inspecoes: defaultInspecoes
}

const inputClass =
  'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1'
const cardClass = 'rounded-[2px] border border-slate-200 bg-white p-3.5 shadow-xs'
const btnClass =
  'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-[10px] font-bold tracking-wide uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const moldPhotoRef = useRef<HTMLInputElement>(null)

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
          .select('id,codigo,nome,descricao')
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
          .select('id,codigo,nome,tipo,numero_cavidades,parametros')
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
      tolerancia_temp: String(z.tolerancia ?? '5'),
      bico: String(z.bico ?? '210'),
      zona1: String(z.zona1 ?? '200'),
      zona2: String(z.zona2 ?? '190'),
      zona3: String(z.zona3 ?? '180'),
      zona4: String(z.zona4 ?? '170'),
      zona_molde: String(z.molde ?? '35'),
      imagem_url: String(x.imagem_url ?? ''),
      observacoes_setup: String(x.observacoes_setup ?? blank.observacoes_setup),
      observacoes: String(x.observacoes ?? ''),
      aviso_destaque: String(pt.aviso_destaque ?? blank.aviso_destaque),
      desenho_numero: String(pt.desenho_numero ?? blank.desenho_numero),
      desenho_url: String(pt.desenho_url ?? ''),
      formulario_sgq: String(pt.formulario_sgq ?? blank.formulario_sgq),
      especificacoes_acabamento: String(pt.especificacoes_acabamento ?? blank.especificacoes_acabamento),
      especificacoes_cor: String(pt.especificacoes_cor ?? blank.especificacoes_cor),
      especificacoes_gravacao: String(pt.especificacoes_gravacao ?? blank.especificacoes_gravacao),
      mistura: Array.isArray(pt.mistura) ? (pt.mistura as MaterialMixtureItem[]) : defaultMistura,
      fotos_molde: Array.isArray(pt.fotos_molde) ? (pt.fotos_molde as MoldPhoto[]) : [],
      inspecoes: Array.isArray(pt.inspecoes) ? (pt.inspecoes as InspectionItem[]) : defaultInspecoes
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
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error || new Error('Empresa ERP não identificada.')
      }
      const path = `${company.data}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const upload = await supabase.storage.from('erp-fichas-processo').upload(path, file, {
        upsert: false,
        contentType: file.type
      })
      if (upload.error) throw upload.error

      const signed = await supabase.storage.from('erp-fichas-processo').createSignedUrl(path, 60 * 60 * 24 * 30)
      if (signed.error) throw signed.error

      update('imagem_url', signed.data.signedUrl)
      // set preview
      setMessage('Imagem técnica vinculada à ficha com sucesso.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a imagem técnica.')
    } finally {
      setBusy(false)
    }
  }

  // Upload específico para fotos do molde na Aba 2
  async function handleMoldPhotoUpload(file?: File, tipo: MoldPhoto['tipo'] = 'CAVIDADE') {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('A foto do molde deve ser PNG, JPG ou WEBP.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error || new Error('Empresa ERP não identificada.')
      }
      const path = `${company.data}/molde-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const upload = await supabase.storage.from('erp-fichas-processo').upload(path, file, {
        upsert: false,
        contentType: file.type
      })
      if (upload.error) throw upload.error

      const signed = await supabase.storage.from('erp-fichas-processo').createSignedUrl(path, 60 * 60 * 24 * 30)
      if (signed.error) throw signed.error

      const newPhoto: MoldPhoto = {
        id: crypto.randomUUID(),
        titulo: file.name.replace(/\.[^/.]+$/, ''),
        tipo,
        url: signed.data.signedUrl
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
  const totalBateladaKg = form.mistura.reduce((acc, m) => acc + (Number(m.dosagem_kg) || 0), 0)

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

          {/* Barra de Abas Industriais (1/3, 2/3, 3/3) */}
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-2 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              
              {/* Aba 1: Processo & Mistura (1/3) */}
              <button
                type="button"
                onClick={() => setActiveTab('PROCESSO')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'PROCESSO'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">1 / 3</span>
                <Sliders size={13} />
                <span>Processo &amp; Mistura</span>
              </button>

              {/* Aba 2: Fotos do Molde & Ferramental (2/3) */}
              <button
                type="button"
                onClick={() => setActiveTab('MOLDE')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'MOLDE'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">2 / 3</span>
                <Wrench size={13} />
                <span>Fotos do Molde &amp; Setup</span>
                {form.fotos_molde.length > 0 && (
                  <span className="rounded-full bg-[#2D8DB8] px-1.5 py-0.2 text-[8px] text-white">
                    {form.fotos_molde.length}
                  </span>
                )}
              </button>

              {/* Aba 3: Qualidade, Especificações & Desenho (3/3) */}
              <button
                type="button"
                onClick={() => setActiveTab('QUALIDADE')}
                className={`flex h-[32px] items-center gap-2 rounded-[2px] px-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === 'QUALIDADE'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] text-[#48B7C7]">3 / 3</span>
                <ShieldCheck size={13} />
                <span>Qualidade, Desenho &amp; SGQ</span>
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
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  FICHAS CADASTRADAS ({filtered.length})
                </span>
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
              {/* ABA 1 (1/3): PROCESSO & MISTURA (Ciclo, Parâmetros, Temperaturas e Setup) */}
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
                          className="h-[24px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none"
                        >
                          <option value="INJETADOS">INJETADOS (TERMOPLÁSTICOS)</option>
                          <option value="PRENSADOS">PRENSADOS (BORRACHA)</option>
                          <option value="ESTAMPARIA">ESTAMPARIA</option>
                          <option value="MONTAGEM_EMBALAGEM">MONTAGEM / EMBALAGEM</option>
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
                          label="MÁQUINA / INJETORA *"
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

                  {/* Bloco 2: Matéria-Prima & Mistura do Material (Conforme Modelo do PDF) */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          SEÇÃO 2
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          COMPOSIÇÕES &amp; MISTURA DO MATERIAL (DOSAGEM DA BATELADA)
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="h-6 px-2 text-[9px] font-bold uppercase rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                        >
                          <ImagePlus size={12} />
                          <span>Foto Material/Resina</span>
                        </button>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600">
                        Total Batelada: <strong className="text-[#123B50]">{totalBateladaKg.toFixed(3)} kg</strong>
                      </span>
                    </div>

                    {/* Tabela de Componentes da Mistura */}
                    <div className="overflow-x-auto rounded-[2px] border border-slate-200">
                      <table className="w-full border-collapse text-[11px]">
                        <thead className="bg-[#123B50] text-white">
                          <tr className="h-[28px]">
                            <th className="px-2 text-left font-bold uppercase text-[9px] w-[140px]">Tipo Componente</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px]">Descrição do Material</th>
                            <th className="px-2 text-left font-bold uppercase text-[9px] w-[100px]">Cód. MP</th>
                            <th className="px-2 text-right font-bold uppercase text-[9px] w-[110px]">Dosagem (kg)</th>
                            <th className="px-2 text-right font-bold uppercase text-[9px] w-[90px]">Proporção (%)</th>
                            <th className="px-2 text-center font-bold uppercase text-[9px] w-[50px]">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {form.mistura.map((mat, idx) => (
                            <tr key={mat.id} className="hover:bg-slate-50">
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={mat.tipo}
                                  onChange={e => {
                                    const next = [...form.mistura]
                                    next[idx].tipo = e.target.value
                                    update('mistura', next)
                                  }}
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px] font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={mat.descricao}
                                  onChange={e => {
                                    const next = [...form.mistura]
                                    next[idx].descricao = e.target.value
                                    update('mistura', next)
                                  }}
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={mat.codigo}
                                  onChange={e => {
                                    const next = [...form.mistura]
                                    next[idx].codigo = e.target.value
                                    update('mistura', next)
                                  }}
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px] font-mono font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={mat.dosagem_kg}
                                  onChange={e => {
                                    const val = Number(e.target.value) || 0
                                    const next = [...form.mistura]
                                    next[idx].dosagem_kg = val
                                    const newTotal = next.reduce((acc, m) => acc + (m.dosagem_kg || 0), 0)
                                    if (newTotal > 0) {
                                      next.forEach(m => {
                                        m.proporcao_pct = Number(((m.dosagem_kg / newTotal) * 100).toFixed(2))
                                      })
                                    }
                                    update('mistura', next)
                                  }}
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px] text-right font-mono font-bold text-[#123B50]"
                                />
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold text-slate-700">
                                {mat.proporcao_pct}%
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = form.mistura.filter((_, i) => i !== idx)
                                    update('mistura', next)
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                  title="Remover componente"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [
                            ...form.mistura,
                            {
                              id: crypto.randomUUID(),
                              tipo: 'Aditivo / Moído',
                              descricao: 'Material Moído Reutilizável',
                              codigo: 'MOIDO-01',
                              dosagem_kg: 1.0,
                              proporcao_pct: 0
                            }
                          ]
                          update('mistura', next)
                        }}
                        className="h-6 px-2 text-[9px] font-bold uppercase rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Adicionar Componente à Mistura</span>
                      </button>

                      <span className="text-[9px] text-slate-500 italic">
                        Proporções recalculadas automaticamente com base no peso de cada componente.
                      </span>
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
                          CICLO DE INJEÇÃO &amp; RENDIMENTO
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
                          <label className={labelClass}>Injeção (s)</label>
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
                          <label className={labelClass}>Resfriamento (s)</label>
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
                          <label className={labelClass}>Fechamento (Ton)</label>
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
                          <label className={labelClass}>Peso Canal / Galho (kg)</label>
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
                            TEMPERATURAS DO CANHÃO &amp; MOLDE (°C)
                          </h2>
                        </div>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Tolerância: ± {form.tolerancia_temp || '5'} °C
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <div>
                          <label className={labelClass}>Bico (°C)</label>
                          <input
                            type="number"
                            value={form.bico}
                            onChange={e => update('bico', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Zona 1 (°C)</label>
                          <input
                            type="number"
                            value={form.zona1}
                            onChange={e => update('zona1', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Zona 2 (°C)</label>
                          <input
                            type="number"
                            value={form.zona2}
                            onChange={e => update('zona2', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Zona 3 (°C)</label>
                          <input
                            type="number"
                            value={form.zona3}
                            onChange={e => update('zona3', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Zona 4 (°C)</label>
                          <input
                            type="number"
                            value={form.zona4}
                            onChange={e => update('zona4', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Molde (°C)</label>
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
                          Perfil Térmico do Canhão de Plastificação
                        </div>
                        <div className="flex items-center justify-between text-center gap-1 font-mono text-[10px]">
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-rose-500/40">
                            <span className="text-[8px] text-slate-400 block">Bico</span>
                            <strong className="text-rose-400">{form.bico}°C</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-amber-500/40">
                            <span className="text-[8px] text-slate-400 block">Z1 (Frente)</span>
                            <strong className="text-amber-400">{form.zona1}°C</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-yellow-500/40">
                            <span className="text-[8px] text-slate-400 block">Z2 (Meio)</span>
                            <strong className="text-yellow-400">{form.zona2}°C</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-sky-500/40">
                            <span className="text-[8px] text-slate-400 block">Z3 (Alim.)</span>
                            <strong className="text-sky-400">{form.zona3}°C</strong>
                          </div>
                          <span className="text-slate-600">→</span>
                          <div className="flex-1 bg-slate-800 p-1 rounded border border-teal-500/40">
                            <span className="text-[8px] text-slate-400 block">Z4 (Funil)</span>
                            <strong className="text-teal-400">{form.zona4}°C</strong>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

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
                        placeholder="Ex: Aplicar desmoldante a cada 100 injetadas"
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
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 2 (2/3): FOTOS DO MOLDE & FERRAMENTAL (Setup, Cavidade e Refrigeração) */}
              {/* ========================================================================= */}
              {activeTab === 'MOLDE' && (
                <div className="space-y-3">
                  
                  {/* Seção Superior de Upload de Fotos do Molde */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          MOLDE 2/3
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      
                      {/* Foto Principal da Ficha (se houver) */}
                      {form.imagem_url && (
                        <div className="rounded-[2px] border border-slate-200 bg-white overflow-hidden shadow-xs group relative">
                          <div className="h-44 bg-slate-100 flex items-center justify-center p-2">
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
                          <div className="h-44 bg-slate-100 flex items-center justify-center p-2">
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
                              className="mt-1 h-5 w-full text-[10px] font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-[#2D8DB8] outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Card de Adição Rápida */}
                      <div
                        onClick={() => moldPhotoRef.current?.click()}
                        className="h-56 rounded-[2px] border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-sky-50/50 hover:border-[#2D8DB8] flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-colors"
                      >
                        <ImagePlus size={28} className="text-[#2D8DB8]" />
                        <strong className="mt-2 text-[11px] text-slate-800">Enviar Foto do Molde</strong>
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
                        <div>• Temperatura do molde: {form.zona_molde || '35'}°C</div>
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
                        <div>• Desmoldante: {form.aviso_destaque}</div>
                        <div>• Canal de injeção polido e desobstruído</div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 3 (3/3): QUALIDADE, DESENHO TÉCNICO & ESPECIFICAÇÕES SGQ              */}
              {/* ========================================================================= */}
              {activeTab === 'QUALIDADE' && (
                <div className="space-y-3">
                  
                  {/* Seção Superior: Desenho Técnico & Documentos Relacionados */}
                  <section className={cardClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase">
                          DESENHO 3/3
                        </span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#123B50]">
                          DESENHO TÉCNICO DA PEÇA &amp; DOCUMENTOS DA QUALIDADE
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">Desenho nº:</span>
                        <input
                          type="text"
                          value={form.desenho_numero}
                          onChange={e => update('desenho_numero', e.target.value)}
                          placeholder="Ex: TPA01201"
                          className="h-[24px] w-28 rounded border border-slate-300 px-1.5 text-[10px] font-mono font-bold"
                        />
                      </div>
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
                        className="h-6 px-2 text-[9px] font-bold uppercase rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1"
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
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px] font-semibold"
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
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px]"
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
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px]"
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
                                  className="h-6 w-full rounded border border-slate-300 px-1.5 text-[10px]"
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
                                  className="h-6 rounded border border-slate-300 px-1 text-[9px] font-black uppercase text-emerald-800 bg-emerald-50"
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
          <div><strong>Máquina / Recurso:</strong> {selectedMachine ? `${selectedMachine.codigo} — ${selectedMachine.nome}` : '—'}</div>
          <div><strong>Alerta Operacional:</strong> <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{form.aviso_destaque}</span></div>
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
              <td>{form.bico}°C</td><td>{form.zona1}°C</td><td>{form.zona2}°C</td><td>{form.zona3}°C</td><td>{form.zona4}°C</td><td>{form.zona_molde}°C</td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ textAlign: 'center', background: '#e2e8f0' }}>COMPOSIÇÃO E MISTURA DE MATÉRIA-PRIMA</th>
            </tr>
            <tr>
              <th>Tipo</th><th>Material</th><th>Código</th><th style={{ textAlign: 'right' }}>Dosagem</th><th style={{ textAlign: 'right' }}>Proporção</th>
            </tr>
          </thead>
          <tbody>
            {form.mistura.map(m => (
              <tr key={m.id}>
                <td>{m.tipo}</td><td>{m.descricao}</td><td>{m.codigo}</td><td style={{ textAlign: 'right' }}>{m.dosagem_kg} kg</td><td style={{ textAlign: 'right' }}>{m.proporcao_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '12px', fontSize: '8pt', border: '1px solid #cbd5e1', padding: '6px', background: '#f8fafc' }}>
          <strong>INSTRUÇÕES OBRIGATÓRIAS DO SGQ:</strong>
          <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', fontSize: '7.5pt' }}>
            {form.observacoes_setup}
          </pre>
        </div>
      </section>
    </>
  )
}

function noticeMessage(error: string, message: string): string {
  return error || message
}

export default FichasProcesso
