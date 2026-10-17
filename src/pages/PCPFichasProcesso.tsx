import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, FileSliders, Printer, RefreshCw, Save, Search } from 'lucide-react'
import PCPMoldPhotoPanel from '../components/PCPMoldPhotoPanel'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id: string; codigo: string; nome: string }
type Tool = { id: string; codigo: string; nome: string; tipo: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Category = 'INJETADOS' | 'PRENSADOS' | 'ESTAMPARIA' | 'MECANICA' | 'TRATAMENTO_SUPERFICIAL' | 'PINTURA_QUIMICA' | 'CORTE_VINCO' | 'ACABAMENTO' | 'MONTAGEM_EMBALAGEM'
type Param = { key: string; label: string; unit: string; type?: 'number' | 'text' | 'select'; required?: boolean; step?: string; multiline?: boolean; options?: string[]; group?: string }
type Saved = { id: string; codigo_ficha: string; produto_id: string; ferramenta_id?: string | null; maquina_id?: string | null; categoria_processo: Category; versao_ficha: number; status: string; data_homologacao?: string | null; assinatura_tecnica?: string | null; parametros_tecnicos: Record<string, unknown>; revisao?: number }
type FichaAudit = { id: string; acao: 'INSERT' | 'UPDATE' | 'DELETE'; dados_antigos: Record<string, unknown> | null; dados_novos: Record<string, unknown> | null; executado_por: string | null; executado_em: string }
const categories: { value: Category; label: string }[] = [
 { value: 'INJETADOS', label: 'Injetados' }, { value: 'PRENSADOS', label: 'Prensados' },
 { value: 'ESTAMPARIA', label: 'Estampos / Estamparia' }, { value: 'MECANICA', label: 'Mecânica' },
 { value: 'TRATAMENTO_SUPERFICIAL', label: 'Tratamento superficial' },
 { value: 'PINTURA_QUIMICA', label: 'Pintura / Química' }, { value: 'CORTE_VINCO', label: 'Corte e vinco' },
 { value: 'ACABAMENTO', label: 'Acabamento unificado' }, { value: 'MONTAGEM_EMBALAGEM', label: 'Montagem, embalagem e paletização' },
]
const common: Param[] = [
 {key:'tempo_ciclo_seg',label:'Tempo de ciclo padrão',unit:'s',type:'number',step:'0.01',required:true,group:'Ciclo, setup e segurança'},
 {key:'velocidade_dosagem_curso',label:'Velocidade de dosagem / curso',unit:'mm/s',type:'number',step:'0.01',group:'Ciclo, setup e segurança'},
 {key:'altura_molde_mm',label:'Altura do molde',unit:'mm',type:'number',step:'0.01',group:'Ciclo, setup e segurança'},
 {key:'tipo_fixacao',label:'Tipo de fixação',unit:'—',type:'text',group:'Ciclo, setup e segurança'},
 {key:'torque_aperto_nm',label:'Torque de aperto',unit:'N·m',type:'number',step:'0.1',group:'Ciclo, setup e segurança'},
 {key:'tipo_refrigeracao',label:'Refrigeração conectada',unit:'—',type:'text',group:'Ciclo, setup e segurança'},
 {key:'vazao_refrigeracao_l_min',label:'Vazão de refrigeração',unit:'L/min',type:'number',step:'0.1',group:'Ciclo, setup e segurança'},
 {key:'tempo_setup_min',label:'Tempo padrão de setup',unit:'min',type:'number',step:'0.1',group:'Ciclo, setup e segurança'},
 {key:'tempo_limpeza_min',label:'Tempo de limpeza / troca',unit:'min',type:'number',step:'0.1',group:'Ciclo, setup e segurança'},
 {key:'seguranca_ppe',label:'EPI e segurança obrigatórios',unit:'—',type:'text',group:'Ciclo, setup e segurança'},
]
const injection: Param[] = [
 {key:'material_polimero',label:'Material / polímero cadastrado',unit:'—',type:'text',required:true,group:'Material e preparação'},
 {key:'temperatura_secagem_c',label:'Temperatura de secagem',unit:'°C',type:'number',step:'0.1',group:'Material e preparação'},
 {key:'tempo_secagem_h',label:'Tempo de secagem',unit:'h',type:'number',step:'0.1',group:'Material e preparação'},
 {key:'peso_peca_g',label:'Peso líquido da peça',unit:'g',type:'number',step:'0.001',group:'Material e preparação'},
 {key:'peso_canal_g',label:'Peso de canal / refugo',unit:'g',type:'number',step:'0.001',group:'Material e preparação'},
 {key:'temperatura_bico_c',label:'Temperatura do bico',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'zona1_c',label:'Temperatura zona 1',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'zona2_c',label:'Temperatura zona 2',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'zona3_c',label:'Temperatura zona 3',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'zona4_c',label:'Temperatura zona 4',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'temperatura_alimentacao_c',label:'Temperatura da alimentação',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'temperatura_molde_c',label:'Temperatura do molde',unit:'°C',type:'number',step:'0.1',group:'Perfil de temperatura'},
 {key:'cavidades_ativas',label:'Cavidades ativas',unit:'un',type:'number',step:'1',required:true,group:'Ciclo de produção'},
 {key:'tempo_injecao_seg',label:'Tempo de preenchimento / injeção',unit:'s',type:'number',step:'0.01',group:'Ciclo de produção'},
 {key:'tempo_recalque_seg',label:'Tempo de recalque',unit:'s',type:'number',step:'0.01',group:'Ciclo de produção'},
 {key:'tempo_resfriamento_seg',label:'Tempo de resfriamento',unit:'s',type:'number',step:'0.01',group:'Ciclo de produção'},
 {key:'velocidade_injecao_mm_s',label:'Velocidade de injeção',unit:'mm/s',type:'number',step:'0.01',group:'Injeção e recalque'},
 {key:'pressao_injecao_bar',label:'Pressão de injeção',unit:'bar',type:'number',step:'0.1',group:'Injeção e recalque'},
 {key:'posicao_injecao_mm',label:'Posição final de injeção',unit:'mm',type:'number',step:'0.01',group:'Injeção e recalque'},
 {key:'velocidade_recalque_mm_s',label:'Velocidade de recalque',unit:'mm/s',type:'number',step:'0.01',group:'Injeção e recalque'},
 {key:'pressao_recalque_bar',label:'Pressão de recalque',unit:'bar',type:'number',step:'0.1',group:'Injeção e recalque'},
 {key:'posicao_recalque_mm',label:'Posição de recalque',unit:'mm',type:'number',step:'0.01',group:'Injeção e recalque'},
 {key:'rpm_rosca',label:'Rotação da rosca',unit:'rpm',type:'number',step:'1',group:'Plasticização e dosagem'},
 {key:'contrapressao_bar',label:'Contrapressão',unit:'bar',type:'number',step:'0.1',group:'Plasticização e dosagem'},
 {key:'curso_dosagem_mm',label:'Curso / posição de dosagem',unit:'mm',type:'number',step:'0.01',group:'Plasticização e dosagem'},
 {key:'tempo_dosagem_seg',label:'Tempo de dosagem',unit:'s',type:'number',step:'0.01',group:'Plasticização e dosagem'},
 {key:'descompressao_mm',label:'Descompressão da rosca',unit:'mm',type:'number',step:'0.01',group:'Plasticização e dosagem'},
 {key:'forca_fechamento_ton',label:'Força de fechamento',unit:'ton',type:'number',step:'0.1',required:true,group:'Fechamento e proteção do molde'},
 {key:'pressao_protecao_molde_bar',label:'Pressão de proteção do molde',unit:'bar',type:'number',step:'0.1',group:'Fechamento e proteção do molde'},
 {key:'curso_abertura_mm',label:'Curso de abertura',unit:'mm',type:'number',step:'0.1',group:'Fechamento e proteção do molde'},
 {key:'curso_fechamento_mm',label:'Curso de fechamento',unit:'mm',type:'number',step:'0.1',group:'Fechamento e proteção do molde'},
]
const press: Param[] = [
 {key:'composto_material',label:'Composto / material',unit:'—',type:'text',required:true,group:'Matéria-prima e carga'},
 {key:'dureza_solicitada_shore_a',label:'Dureza solicitada',unit:'Shore A',type:'number',step:'0.1',group:'Matéria-prima e carga'},
 {key:'peso_carga_cavidade_g',label:'Peso de carga por cavidade',unit:'g',type:'number',step:'0.001',group:'Matéria-prima e carga'},
 {key:'peso_carga_total_g',label:'Peso total de carga',unit:'g',type:'number',step:'0.001',group:'Matéria-prima e carga'},
 {key:'tonelagem_prensa',label:'Tonelagem requerida',unit:'ton',type:'number',step:'0.1',required:true,group:'Prensagem e setup'},
 {key:'pressao_prensagem_bar',label:'Pressão de prensagem',unit:'bar',type:'number',step:'0.1',group:'Prensagem e setup'},
 {key:'tempo_pre_aquecimento_material_min',label:'Pré-aquecimento da matéria-prima',unit:'min',type:'number',step:'0.1',group:'Prensagem e setup'},
 {key:'tempo_pre_aquecimento_molde_min',label:'Pré-aquecimento do molde / setup',unit:'min',type:'number',step:'0.1',group:'Prensagem e setup'},
 {key:'temperatura_plato_superior_c',label:'Temperatura do platô superior',unit:'°C',type:'number',step:'0.1',group:'Temperatura dos platôs'},
 {key:'temperatura_plato_inferior_c',label:'Temperatura do platô inferior',unit:'°C',type:'number',step:'0.1',group:'Temperatura dos platôs'},
 {key:'temperatura_molde_c',label:'Temperatura do molde',unit:'°C',type:'number',step:'0.1',group:'Temperatura dos platôs'},
 {key:'tempo_cura_seg',label:'Tempo de cura / vulcanização',unit:'s',type:'number',step:'0.1',group:'Cura e vulcanização'},
 {key:'tempo_pos_cura_min',label:'Tempo de pós-cura',unit:'min',type:'number',step:'0.1',group:'Cura e vulcanização'},
 {key:'numero_respiros',label:'Número de respiros',unit:'ciclos',type:'number',step:'1',group:'Ciclo de desgaseificação'},
 {key:'tempo_ate_primeiro_respiro_seg',label:'Tempo até o primeiro respiro',unit:'s',type:'number',step:'0.1',group:'Ciclo de desgaseificação'},
 {key:'tempo_alivio_prensa_aberta_seg',label:'Tempo de alívio com prensa aberta',unit:'s',type:'number',step:'0.1',group:'Ciclo de desgaseificação'},
]
const stamping: Param[] = [
 {key:'material_chapa',label:'Material da chapa',unit:'—',type:'text',required:true},
 {key:'espessura_chapa_mm',label:'Espessura da chapa',unit:'mm',type:'number',step:'0.001',required:true},
 {key:'forca_prensa_ton',label:'Força da prensa',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'curso_prensa_mm',label:'Curso da prensa',unit:'mm',type:'number',step:'0.1'},
 {key:'passo_alimentacao_mm',label:'Passo de alimentação',unit:'mm',type:'number',step:'0.01'},
 {key:'lubrificante',label:'Lubrificante',unit:'—',type:'text'},
 {key:'folga_matriz_mm',label:'Folga de matriz',unit:'mm',type:'number',step:'0.001'},
]
const surface: Param[] = [
 {key:'tempo_imersao_min',label:'Tempo de imersão / exposição',unit:'min',type:'number',step:'0.1',required:true},
 {key:'temperatura_banho_estufa_c',label:'Temperatura do banho / estufa',unit:'°C',type:'number',step:'0.1',required:true},
 {key:'ph_tanque',label:'pH do tanque',unit:'pH',type:'number',step:'0.01'},
 {key:'concentracao_quimica_pct',label:'Concentração química',unit:'%',type:'number',step:'0.01'},
 {key:'camada_requerida_um',label:'Camada de tinta / zinco requerida',unit:'µm',type:'number',step:'0.1',required:true},
 {key:'pressao_pistola_psi',label:'Pressão de aplicação / pistola',unit:'psi',type:'number',step:'0.1'},
 {key:'tempo_cura_secagem_min',label:'Tempo de cura / secagem',unit:'min',type:'number',step:'0.1',required:true},
 {key:'produto_quimico',label:'Produto químico / ficha de segurança',unit:'—',type:'text',required:true},
]
const cutting: Param[] = [
 {key:'material_base',label:'Material base',unit:'—',type:'text',required:true},
 {key:'espessura_material_mm',label:'Espessura do material',unit:'mm',type:'number',step:'0.001',required:true},
 {key:'ferramenta_corte',label:'Faca / ferramenta de corte',unit:'—',type:'text',required:true},
 {key:'pressao_corte',label:'Pressão de corte',unit:'bar',type:'number',step:'0.1'},
 {key:'registro_corte_mm',label:'Tolerância de registro',unit:'mm',type:'number',step:'0.01'},
 {key:'sequencia_operacao',label:'Sequência de corte e vinco',unit:'—',type:'text',required:true},
 {key:'criterio_rebarba',label:'Critério de rebarba / descarte',unit:'—',type:'text'},
]
const finishing: Param[] = [
 {key:'acabamento_inspecao_posto',label:'Posto de inspeção visual',unit:'—',type:'text'},
 {key:'acabamento_inspecao_setor',label:'Setor de inspeção',unit:'—',type:'text'},
 {key:'acabamento_inspecao_ambiente',label:'Condição / temperatura ambiente',unit:'—',type:'text'},
 {key:'acabamento_inspecao_tempo',label:'Tempo de preparação — inspeção',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_inspecao_checklist',label:'Checklist de inspeção e separação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_inspecao_referencia',label:'Referência visual de defeitos',unit:'—',type:'text'},
 {key:'acabamento_rebarba_posto',label:'Posto de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_rebarba_setor',label:'Setor de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_rebarba_tempo',label:'Tempo de preparação — rebarbação',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_rebarba_checklist',label:'Checklist de rebarbação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_rebarba_referencia',label:'Referência de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_limpeza_posto',label:'Posto de limpeza',unit:'—',type:'text'},
 {key:'acabamento_limpeza_setor',label:'Setor de limpeza',unit:'—',type:'text'},
 {key:'acabamento_limpeza_tempo',label:'Tempo de preparação — limpeza',unit:'s/lote',type:'number',step:'0.01'},
 {key:'acabamento_limpeza_checklist',label:'Checklist de limpeza e lubrificação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_limpeza_referencia',label:'Procedimento de limpeza',unit:'—',type:'text'},
 {key:'acabamento_embalagem_posto',label:'Posto de embalagem',unit:'—',type:'text'},
 {key:'acabamento_embalagem_setor',label:'Setor de embalagem',unit:'—',type:'text'},
 {key:'acabamento_embalagem_tempo',label:'Tempo de preparação — embalagem',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_embalagem_checklist',label:'Checklist de embalagem e etiqueta',unit:'—',type:'text',multiline:true},
 {key:'acabamento_embalagem_referencia',label:'Modelo de etiqueta / embalagem',unit:'—',type:'text'},
]
const packaging: Param[] = [
 {key:'aplica_embalagem_plastica',label:'Aplicar embalagem plástica?',unit:'—',type:'select',options:['Sim','Não']},
 {key:'emb_amostragem_base',label:'Amostragem base para contagem',unit:'peças',type:'number',step:'1'},
 {key:'emb_codigo_balanca',label:'Código da balança de contagem',unit:'—',type:'text'},
 {key:'emb_dimensional_saco',label:'Dimensional do saco (L × C × espessura)',unit:'mm',type:'text'},
 {key:'emb_quantidade_pecas_saco',label:'Quantidade de peças por saco',unit:'un',type:'number',step:'1'},
 {key:'emb_peso_pacote_cheio_g',label:'Peso padrão do pacote cheio',unit:'g',type:'number',step:'0.1'},
 {key:'emb_sacos_caixa',label:'Quantidade de sacos por caixa',unit:'sacos',type:'number',step:'1'},
 {key:'emb_pecas_direto_caixa',label:'Quantidade de peças diretas por caixa',unit:'un',type:'number',step:'1'},
 {key:'emb_dimensional_caixa',label:'Dimensional da caixa (C × L × A)',unit:'mm',type:'text'},
 {key:'emb_caixa_modelo',label:'Modelo / referência de montagem da caixa',unit:'—',type:'text'},
 {key:'emb_disposicao_pecas',label:'Referência da disposição das peças',unit:'—',type:'text'},
 {key:'emb_instrucao_montagem',label:'Roteiro de montagem e acondicionamento',unit:'—',type:'text',multiline:true},
 {key:'emb_instrucao_etiqueta',label:'Instrução de identificação e etiqueta',unit:'—',type:'text',multiline:true},
 {key:'emb_instrucao_paletizacao',label:'Padrão de paletização e empilhamento',unit:'—',type:'text',multiline:true},
 {key:'emb_criterio_liberacao',label:'Critérios de conferência e liberação',unit:'—',type:'text',multiline:true},
]
const paramsFor = (category: Category) => category === 'ACABAMENTO' ? finishing : category === 'MONTAGEM_EMBALAGEM' ? packaging : [...common, ...(category === 'INJETADOS' ? injection : category === 'PRENSADOS' ? press : category === 'ESTAMPARIA' || category === 'MECANICA' ? stamping : category === 'TRATAMENTO_SUPERFICIAL' || category === 'PINTURA_QUIMICA' ? surface : cutting)]
const inputClass = 'h-[30px] w-full rounded-[3px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100'
const labelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-wider text-neutral-500/90'
const blankParameters = (category: Category) => Object.fromEntries(paramsFor(category).map(p => [p.key, ''])) as Record<string, string>
const auditChanges = (event: FichaAudit) => {
 const oldParams = (event.dados_antigos?.parametros_tecnicos ?? {}) as Record<string, unknown>
 const newParams = (event.dados_novos?.parametros_tecnicos ?? {}) as Record<string, unknown>
 const changed = [...new Set([...Object.keys(oldParams), ...Object.keys(newParams)])]
  .filter(key => JSON.stringify(oldParams[key]) !== JSON.stringify(newParams[key]))
  .slice(0, 4)
 return changed.length ? changed.map(key => key.replaceAll('_', ' ')).join(' · ') : 'Dados cadastrais / estado da ficha'
}

export default function PCPFichasProcesso() {
 const [searchParams, setSearchParams] = useSearchParams()
 const initialCategory = (categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value ?? 'INJETADOS') as Category
 const [category, setCategory] = useState<Category>(initialCategory)
 const [company, setCompany] = useState('')
 const [canApprove, setCanApprove] = useState(false)
 const [products, setProducts] = useState<Product[]>([])
 const [tools, setTools] = useState<Tool[]>([])
 const [machines, setMachines] = useState<Machine[]>([])
 const [rows, setRows] = useState<Saved[]>([])
 const [history, setHistory] = useState<FichaAudit[]>([])
 const [historyFichaId, setHistoryFichaId] = useState('')
 const [historyLoading, setHistoryLoading] = useState(false)
 const [historyError, setHistoryError] = useState('')
 const [query, setQuery] = useState('')
 const [productId, setProductId] = useState(searchParams.get('produto') ?? '')
 const [toolId, setToolId] = useState('')
 const [machineId, setMachineId] = useState('')
 const [code, setCode] = useState('')
 const [version, setVersion] = useState('1')
 const [approvedAt, setApprovedAt] = useState('')
 const [signature, setSignature] = useState('')
 const [status, setStatus] = useState('RASCUNHO')
 const [params, setParams] = useState<Record<string, string>>(() => blankParameters(initialCategory))
 const [instructions, setInstructions] = useState('')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')

 useEffect(() => {
  const next = categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value
  if (next && next !== category) { setCategory(next); setParams(blankParameters(next)) }
  const product = searchParams.get('produto')
  if (product && product !== productId) setProductId(product)
 }, [searchParams, category, productId])

 async function load() {
  setBusy(true); setError('')
  try {
   const tenant = await supabase.rpc('erp_current_empresa_id')
   if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
   setCompany(tenant.data)
   const approvalPermission = await supabase.rpc('erp_has_permission', { p_code: 'producao.fichas.aprovar' })
   setCanApprove(!approvalPermission.error && approvalPermission.data === true)
   const [productRows, toolRows, machineRows, fichaRows] = await Promise.all([
    fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').range(from, to)),
    fetchAllPages<Tool>((from, to) => supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo', { count: 'exact' }).eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').range(from, to)),
    fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,tipo', { count: 'exact' }).eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').range(from, to)),
    fetchAllPages<Saved>((from, to) => supabase.from('erp_fichas_processo').select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao', { count: 'exact' }).eq('empresa_id', tenant.data).order('codigo_ficha').range(from, to)),
   ])
   setProducts(productRows); setTools(toolRows); setMachines(machineRows); setRows(fichaRows)
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar os cadastros da ficha.') }
  finally { setBusy(false) }
 }
 useEffect(() => { void load() }, [])

 const visibleRows = useMemo(() => rows.filter(r => {
  const product = products.find(p => p.id === r.produto_id)
  return !query || [r.codigo_ficha, product?.codigo, product?.nome, r.categoria_processo, r.status].join(' ').toLowerCase().includes(query.toLowerCase())
 }), [rows, products, query])
 const updateParam = (key: string, value: string) => setParams(current => ({ ...current, [key]: value }))

 async function loadHistory(rowId: string) {
  setHistoryLoading(true); setHistoryError('')
  try {
   if (!company) throw new Error('Empresa da sessão não identificada.')
   const read = () => supabase.from('erp_auditoria_logs').select('id,acao,dados_antigos,dados_novos,executado_por,executado_em').eq('empresa_id', company).eq('tabela_afetada', 'public.erp_fichas_processo')
   const [oldResult, newResult] = await Promise.all([
    read().contains('dados_antigos', { id: rowId }).order('executado_em', { ascending: false }).limit(100),
    read().contains('dados_novos', { id: rowId }).order('executado_em', { ascending: false }).limit(100),
   ])
   if (oldResult.error) throw oldResult.error
   if (newResult.error) throw newResult.error
   const byId = new Map<string, FichaAudit>()
   for (const item of [...(oldResult.data ?? []), ...(newResult.data ?? [])] as FichaAudit[]) byId.set(item.id, item)
   setHistory([...byId.values()].sort((a, b) => b.executado_em.localeCompare(a.executado_em)))
  } catch (e) { setHistory([]); setHistoryError(e instanceof Error ? e.message : 'Falha ao consultar o histórico da ficha.') }
  finally { setHistoryLoading(false) }
 }

 function openRow(row: Saved) {
  setCode(row.codigo_ficha); setProductId(row.produto_id); setCategory(row.categoria_processo)
  setVersion(String(row.versao_ficha ?? row.revisao ?? 1)); setStatus(row.status); setToolId(row.ferramenta_id ?? ''); setMachineId(row.maquina_id ?? '')
  setParams({ ...blankParameters(row.categoria_processo), ...Object.fromEntries(Object.entries(row.parametros_tecnicos ?? {}).map(([k,v]) => [k, String(v ?? '')])) })
  setApprovedAt(row.data_homologacao ?? ''); setSignature(row.assinatura_tecnica ?? ''); setInstructions(String(row.parametros_tecnicos?.instrucoes_setup ?? ''))
  setSearchParams({ tipo: row.categoria_processo, produto: row.produto_id })
  setHistoryFichaId(row.id)
  setError(''); setNotice('')
  void loadHistory(row.id)
 }

 async function save() {
  setBusy(true); setError(''); setNotice('')
  try {
   if (!company) throw new Error('Empresa não identificada.')
   if (!code.trim() || !productId) throw new Error('Código da ficha e produto são obrigatórios.')
   if (['APROVADA', 'LIBERADA', 'OBSOLETA'].includes(status) && !canApprove && status !== rows.find(row => row.codigo_ficha === code.trim())?.status) {
    throw new Error('Seu perfil não pode homologar, liberar ou obsoletar fichas de processo. Solicite a permissão ao administrador da empresa.')
   }
   const versionNumber = Number(version)
   if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new Error('Versão deve ser um inteiro maior que zero.')
   const missing = paramsFor(category).filter(p => p.required && !String(params[p.key] ?? '').trim())
   if (missing.length) throw new Error('Preencha os parâmetros obrigatórios: ' + missing.map(p => p.label).join(', ') + '.')
   const numericInvalid = paramsFor(category).filter(p => p.type === 'number' && params[p.key] !== '' && !Number.isFinite(Number(params[p.key])))
   if (numericInvalid.length) throw new Error('Parâmetros numéricos inválidos: ' + numericInvalid.map(p => p.label).join(', ') + '.')
   if (approvedAt && !signature.trim()) throw new Error('A homologação requer assinatura técnica identificada.')
   const numericParams = Object.fromEntries(Object.entries(params).map(([key, value]) => {
    const definition = paramsFor(category).find(p => p.key === key)
    return [key, definition?.type === 'number' && value !== '' ? Number(value) : value]
   }))
   const payload = {
    empresa_id: company, codigo_ficha: code.trim(), produto_id: productId, ferramenta_id: toolId || null, maquina_id: machineId || null,
    cavidades_ativas: Number(params.cavidades_ativas) || 1, revisao: versionNumber, versao_ficha: versionNumber,
    categoria_processo: category, data_homologacao: approvedAt || null, assinatura_tecnica: signature.trim() || null,
    status, parametros_tecnicos: { ...numericParams, instrucoes_setup: instructions.trim() || null },
    ativo: status !== 'OBSOLETA', atualizado_em: new Date().toISOString(),
   }
   const result = await supabase.from('erp_fichas_processo').upsert(payload, { onConflict: 'empresa_id,codigo_ficha' }).select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao').single()
   if (result.error) throw result.error
   const saved = result.data as Saved
   setRows(current => [saved, ...current.filter(r => r.id !== saved.id)])
   setHistoryFichaId(saved.id)
   void loadHistory(saved.id)
   setNotice('Ficha técnica gravada no cadastro de engenharia da empresa.')
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao gravar a ficha técnica.') }
  finally { setBusy(false) }
 }

 const fields = paramsFor(category)
  const fieldGroups: { title: string; fields: Param[] }[] = category === 'ACABAMENTO'
   ? [
      { title: '1. Inspeção visual e separação', fields: fields.filter(field => field.key.startsWith('acabamento_inspecao_')) },
      { title: '2. Rebarbação manual', fields: fields.filter(field => field.key.startsWith('acabamento_rebarba_')) },
      { title: '3. Limpeza e lubrificação', fields: fields.filter(field => field.key.startsWith('acabamento_limpeza_')) },
      { title: '4. Embalagem e etiquetagem', fields: fields.filter(field => field.key.startsWith('acabamento_embalagem_')) },
     ]
   : category === 'MONTAGEM_EMBALAGEM'
    ? [
       { title: '1. Embalagem em saco plástico e contagem', fields: fields.filter(field => field.key.startsWith('aplica_') || field.key.startsWith('emb_amostragem') || field.key.startsWith('emb_codigo') || field.key.startsWith('emb_dimensional_saco') || field.key.startsWith('emb_quantidade') || field.key.startsWith('emb_peso')) },
       { title: '2. Embalagem em caixa de papelão', fields: fields.filter(field => field.key.startsWith('emb_sacos') || field.key.startsWith('emb_pecas_direto') || field.key.startsWith('emb_dimensional_caixa') || field.key.startsWith('emb_caixa')) },
       { title: '3. Roteiro, identificação e paletização', fields: fields.filter(field => field.key.startsWith('emb_disposicao') || field.key.startsWith('emb_instrucao') || field.key.startsWith('emb_criterio')) },
      ]
    : (() => {
       const grouped = new Map<string, Param[]>()
       for (const field of fields) {
        const title = field.group ?? 'Parâmetros técnicos do processo'
        grouped.set(title, [...(grouped.get(title) ?? []), field])
       }
       return [...grouped.entries()].map(([title, groupedFields]) => ({ title, fields: groupedFields }))
      })()
 const selectedProduct = products.find(p => p.id === productId)
 const selectedTool = tools.find(t => t.id === toolId)
 const selectedMachine = machines.find(m => m.id === machineId)
 const expectedPph = Number(params.tempo_ciclo_seg) > 0 ? (3600 / Number(params.tempo_ciclo_seg)) * Math.max(1, Number(params.cavidades_ativas) || 1) : 0

 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4">
  <div className="mx-auto max-w-[1800px]">
   <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
    <span className="flex h-8 w-8 items-center justify-center bg-[#123B50] text-white"><FileSliders size={16}/></span>
    <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">MANUFATURA / PCP / ENGENHARIA</p><h1 className="text-[16px] font-semibold leading-5">Fichas de processo e parâmetros técnicos</h1><p className="text-[10px] text-slate-500">Roteiro, setup, parâmetros críticos, homologação e rastreabilidade de revisão.</p></div>
    <div className="ml-auto flex gap-1"><button className="erp-premium-button erp-premium-button-secondary print:hidden" type="button" onClick={()=>window.print()}><Printer size={12}/> Imprimir ficha</button><button className="erp-premium-button erp-premium-button-secondary print:hidden" onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button><button className="erp-premium-button" onClick={()=>{setCode('');setProductId('');setToolId('');setMachineId('');setVersion('1');setApprovedAt('');setSignature('');setStatus('RASCUNHO');setParams(blankParameters(category));setInstructions('');setHistoryFichaId('');setHistory([])}}>Nova ficha</button></div>
   </header>
   {error && <div role="alert" className="mb-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</div>}
   {notice && <div role="status" className="mb-2 flex items-center gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800"><CheckCircle2 size={13}/>{notice}</div>}
   <section className="mb-3 border border-slate-200 bg-white p-2 print:hidden">
    <div className="mb-2 flex flex-wrap items-center gap-2"><label className="min-w-[220px] flex-1"><span className={labelClass}>Pesquisar ficha / produto</span><span className="relative block"><Search size={12} className="absolute left-2 top-2.5 text-slate-400"/><input className={inputClass+' pl-7'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, produto, categoria ou estado"/></span></label><div className="min-w-[220px] flex-1"><span className={labelClass}>Categoria de processo</span><select className={inputClass} value={category} onChange={e=>{const next=e.target.value as Category;setCategory(next);setParams(blankParameters(next));setSearchParams({tipo:next})}}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div></div>
    <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">{visibleRows.map(row=><button key={row.id} type="button" onClick={()=>openRow(row)} className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-slate-200 px-2 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-[10px] font-bold">{row.codigo_ficha} · {products.find(p=>p.id===row.produto_id)?.codigo ?? 'Produto'}</span><span className="block truncate text-[9px] text-slate-500">{categories.find(c=>c.value===row.categoria_processo)?.label ?? row.categoria_processo} · v{row.versao_ficha ?? row.revisao} · {row.status}</span></span><span className="text-[9px] text-sky-700">Abrir</span></button>)}</div>
   </section>
   <section className="pcp-ficha-print-sheet border border-slate-200 bg-white p-3 print:border-0 print:p-0"><div className="mb-3 hidden border-b border-slate-400 pb-2 print:block"><h1 className="text-base font-bold">FICHA TÉCNICA DE PROCESSO INDUSTRIAL</h1><p className="text-[10px]">Documento operacional para consulta e assinatura no posto de trabalho.</p></div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 print:hidden"><h2 className="text-[11px] font-bold uppercase tracking-wider print:hidden">Identificação e homologação</h2><div className="text-right"><span className="block text-[9px] text-slate-600">{selectedProduct ? selectedProduct.codigo+' · '+selectedProduct.nome : 'Selecione um produto'}</span><span className="block text-[9px] text-slate-500">Ferramenta: {selectedTool?.codigo ?? '—'} · Máquina: {selectedMachine?.codigo ?? '—'}</span></div></div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
     <label><span className={labelClass}>ID / código da ficha</span><input className={inputClass} value={code} onChange={e=>setCode(e.target.value)} required/></label>
     <label><span className={labelClass}>Código do produto (FK)</span><select className={inputClass} value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
     <label><span className={labelClass}>Código do molde / ferramental (FK)</span><select className={inputClass} value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">Não aplicável</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} · {t.nome}</option>)}</select></label>
     <label><span className={labelClass}>Máquina / recurso</span><select className={inputClass} value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
     <label><span className={labelClass}>Versão da ficha</span><input className={inputClass} type="number" min="1" step="1" value={version} onChange={e=>setVersion(e.target.value)} required/></label>
     <label><span className={labelClass}>Data de homologação</span><input className={inputClass} type="date" value={approvedAt} onChange={e=>setApprovedAt(e.target.value)}/></label>
     <label className="xl:col-span-2"><span className={labelClass}>Assinatura técnica do engenheiro</span><input className={inputClass} value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Nome completo / registro profissional"/></label>
     <label><span className={labelClass}>Estado da ficha</span><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option>RASCUNHO</option><option>EM_ANALISE</option><option disabled={!canApprove}>APROVADA</option><option disabled={!canApprove}>LIBERADA</option><option disabled={!canApprove}>OBSOLETA</option></select></label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 border-y border-slate-100 py-2 text-[9px]"><span className="font-bold uppercase text-slate-500">Capacidade nominal calculada</span><strong className="text-[12px] tabular-nums">{expectedPph > 0 ? expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})+' peças/h' : 'Informe ciclo e cavidades'}</strong><span className="text-slate-500">Cálculo = 3.600 ÷ ciclo (s) × cavidades ativas</span></div>
    <div className="mt-3 space-y-3">{fieldGroups.map(group=><fieldset key={group.title} className="min-w-0 border border-slate-200 bg-white p-2"><legend className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">{group.title}</legend><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{group.fields.map(field=><label key={field.key} className={field.multiline?'md:col-span-2':''}><span className={labelClass}>{field.label} {field.required && <span className="text-rose-600">*</span>}</span><span className="flex">{field.type==='select'?<select className={inputClass+' rounded-r-none'} value={params[field.key]??''} onChange={e=>updateParam(field.key,e.target.value)}><option value="">Selecione</option>{(field.options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>:field.multiline?<textarea className={inputClass+' min-h-[72px] rounded-r-none py-2'} value={params[field.key]??''} onChange={e=>updateParam(field.key,e.target.value)} placeholder="Registrar instrução aprovada"/>:<input className={inputClass+' rounded-r-none'} type={field.type==='number'?'number':'text'} step={field.step} value={params[field.key]??''} onChange={e=>updateParam(field.key,e.target.value)} placeholder={field.unit==='—'?'Informar':field.unit}/>}<span className="flex h-[30px] min-w-[46px] items-center justify-center border border-l-0 border-slate-300 bg-slate-50 px-1 text-[9px] text-slate-500">{field.unit}</span></span></label>)}</div></fieldset>)}</div>
    {historyFichaId && <section className="mt-3 border border-slate-200 bg-slate-50 p-2 print:hidden"><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-700">Histórico de revisões e alterações</h3>{historyLoading ? <p className="text-[10px] text-slate-500">Carregando eventos registrados…</p> : historyError ? <p role="alert" className="text-[10px] text-rose-700">Histórico indisponível: {historyError}</p> : history.length ? <div className="overflow-x-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="border-b border-slate-300 text-left text-[9px] uppercase text-slate-500"><th className="p-1">Data/hora</th><th className="p-1">Evento</th><th className="p-1">Revisão</th><th className="p-1">Estado</th><th className="p-1">Alterações</th><th className="p-1">Usuário ID</th></tr></thead><tbody>{history.map(event=>{const before=event.dados_antigos??{};const after=event.dados_novos??before;const statusChange=before.status!==after.status;return <tr key={event.id} className="border-b border-slate-200"><td className="whitespace-nowrap p-1">{new Date(event.executado_em).toLocaleString('pt-BR')}</td><td className="p-1">{event.acao}</td><td className="p-1">v{String(after.versao_ficha??after.revisao??'—')}</td><td className="p-1">{String(before.status??'—')}{statusChange?' → '+String(after.status??'—'):''}</td><td className="p-1">{auditChanges(event)}</td><td className="p-1 font-mono">{event.executado_por??'—'}</td></tr>})}</tbody></table></div> : <p className="text-[10px] text-slate-500">Não há eventos de auditoria desta ficha disponíveis para a empresa.</p>}</section>}
    <label className="mt-3 block"><span className={labelClass}>Instruções de setup / processo / segurança</span><textarea className="min-h-[72px] w-full rounded-[3px] border border-slate-300 p-2 text-[10px] outline-none focus:border-[#2D8DB8]" value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Sequência operacional, parâmetros de controle, inspeção inicial, reação a desvio, EPI e cuidados ambientais…"/></label>
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2"><span className="text-[9px] text-slate-500">Dados separados por empresa · revisão técnica · sem valores fictícios</span><button className="erp-premium-button print:hidden" onClick={()=>void save()} disabled={busy}><Save size={12}/> Gravar ficha</button></div>
   </section>
   <div className="print:hidden"><PCPMoldPhotoPanel productId={productId} /></div>
   <footer className="mt-2 flex items-center gap-2 text-[9px] text-slate-500 print:hidden"><CalendarRange size={12}/> Calendário de recursos e parâmetros de processo devem usar capacidade, ciclo e setup homologados.</footer>
  </div>
 <style>{'@media print{body{background:#fff!important;color:#111!important}.pcp-ficha-print-sheet{break-inside:avoid;border:0!important;padding:0!important}.pcp-ficha-print-sheet input,.pcp-ficha-print-sheet select,.pcp-ficha-print-sheet textarea{color:#111!important;background:#fff!important;border-color:#777!important;box-shadow:none!important;print-color-adjust:exact}.pcp-ficha-print-sheet label{break-inside:avoid}.pcp-ficha-print-sheet button{display:none!important}}'}</style>
  </main>
}
