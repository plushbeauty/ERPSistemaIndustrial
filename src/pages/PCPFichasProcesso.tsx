/**
 * APROVADO — ficha de processo restaurada do arquivo enviado em 2026-10-18.
 * Não alterar a estrutura, categorias, campos ou comportamento sem autorização expressa.
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, FileSliders, Printer, RefreshCw, Save, Search, Sparkles } from 'lucide-react'
import PCPMoldPhotoPanel from '../components/PCPMoldPhotoPanel'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Tool = { id: string; codigo: string; nome: string; tipo: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
export type Category = 'INJETADOS' | 'PRENSADOS' | 'ESTAMPARIA' | 'MECANICA' | 'TRATAMENTO_SUPERFICIAL' | 'PINTURA_QUIMICA' | 'CORTE_VINCO' | 'ACABAMENTO' | 'MONTAGEM_EMBALAGEM'
export type Param = { key: string; label: string; unit: string; type?: 'number' | 'text' | 'select'; required?: boolean; step?: string; multiline?: boolean; options?: string[] }
type Saved = { id: string; codigo_ficha: string; produto_id: string; ferramenta_id?: string | null; maquina_id?: string | null; categoria_processo: Category; versao_ficha: number; status: string; data_homologacao?: string | null; assinatura_tecnica?: string | null; parametros_tecnicos: Record<string, unknown>; revisao?: number }
export const categories: { value: Category; label: string }[] = [
 { value: 'INJETADOS', label: 'Injetados' }, { value: 'PRENSADOS', label: 'Prensados' },
 { value: 'ESTAMPARIA', label: 'Estampos / Estamparia' }, { value: 'MECANICA', label: 'Mecânica' },
 { value: 'TRATAMENTO_SUPERFICIAL', label: 'Tratamento superficial' },
 { value: 'PINTURA_QUIMICA', label: 'Pintura / Química' }, { value: 'CORTE_VINCO', label: 'Corte e vinco' },
 { value: 'ACABAMENTO', label: 'Acabamento unificado' }, { value: 'MONTAGEM_EMBALAGEM', label: 'Montagem, embalagem e paletização' },
]
const common: Param[] = [
 {key:'tempo_ciclo_seg',label:'Tempo de ciclo padrão',unit:'s',type:'number',step:'0.01',required:true},
 {key:'velocidade_dosagem_curso',label:'Velocidade de dosagem / curso',unit:'mm/s',type:'number',step:'0.01'},
 {key:'altura_molde_mm',label:'Altura do molde',unit:'mm',type:'number',step:'0.01'},
 {key:'tipo_fixacao',label:'Tipo de fixação',unit:'—',type:'text'},
 {key:'torque_aperto_nm',label:'Torque de aperto',unit:'N·m',type:'number',step:'0.1'},
 {key:'tipo_refrigeracao',label:'Refrigeração conectada',unit:'—',type:'text'},
 {key:'vazao_refrigeracao_l_min',label:'Vazão de refrigeração',unit:'L/min',type:'number',step:'0.1'},
 {key:'tempo_setup_min',label:'Tempo padrão de setup',unit:'min',type:'number',step:'0.1'},
 {key:'tempo_limpeza_min',label:'Tempo de limpeza / troca',unit:'min',type:'number',step:'0.1'},
 {key:'seguranca_ppe',label:'EPI e segurança obrigatórios',unit:'—',type:'text'},
]
const injection: Param[] = [
 {key:'forca_fechamento_ton',label:'Força de fechamento',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'pressao_injecao_bar',label:'Pressão de injeção',unit:'bar',type:'number',step:'0.1'},
 {key:'pressao_recalque_bar',label:'Pressão de recalque',unit:'bar',type:'number',step:'0.1'},
 {key:'velocidade_injecao_mm_s',label:'Velocidade de injeção',unit:'mm/s',type:'number',step:'0.1'},
 {key:'tempo_injecao_seg',label:'Tempo de injeção',unit:'s',type:'number',step:'0.01'},
 {key:'tempo_recalque_seg',label:'Tempo de recalque',unit:'s',type:'number',step:'0.01'},
 {key:'pressao_contrapressao_bar',label:'Contrapressão',unit:'bar',type:'number',step:'0.1'},
 {key:'rpm_rosca',label:'Rotação da rosca',unit:'rpm',type:'number',step:'1'},
 {key:'posicao_dosagem_mm',label:'Posição de dosagem',unit:'mm',type:'number',step:'0.1'},
 {key:'posicao_comutacao_mm',label:'Posição de comutação',unit:'mm',type:'number',step:'0.1'},
 {key:'zona1_c',label:'Temperatura zona 1',unit:'°C',type:'number',step:'0.1'},
 {key:'zona2_c',label:'Temperatura zona 2',unit:'°C',type:'number',step:'0.1'},
 {key:'zona3_c',label:'Temperatura zona 3',unit:'°C',type:'number',step:'0.1'},
 {key:'zona4_c',label:'Temperatura zona 4',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_resfriamento_seg',label:'Tempo de resfriamento',unit:'s',type:'number',step:'0.01'},
 {key:'material_polimero',label:'Material / polímero cadastrado',unit:'—',type:'text',required:true},
 {key:'temperatura_secagem_c',label:'Temperatura de secagem',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_secagem_h',label:'Tempo de secagem',unit:'h',type:'number',step:'0.1'},
 {key:'cavidades_ativas',label:'Cavidades ativas',unit:'un',type:'number',step:'1',required:true},
 {key:'peso_peca_g',label:'Peso líquido da peça',unit:'g',type:'number',step:'0.001'},
 {key:'peso_canal_g',label:'Peso de canal / refugo',unit:'g',type:'number',step:'0.001'},
]
const press: Param[] = [
 {key:'tonelagem_prensa',label:'Tonelagem requerida',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'pressao_prensagem_bar',label:'Pressão de prensagem',unit:'bar',type:'number',step:'0.1'},
 {key:'temperatura_molde_c',label:'Temperatura do molde',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_cura_seg',label:'Tempo de cura',unit:'s',type:'number',step:'0.1'},
 {key:'tempo_pos_cura_min',label:'Tempo de pós-cura',unit:'min',type:'number',step:'0.1'},
 {key:'composto_material',label:'Composto / material',unit:'—',type:'text',required:true},
 {key:'dureza_shore_a',label:'Dureza solicitada',unit:'Shore A',type:'number',step:'1'},
 {key:'peso_carga_cavidade_g',label:'Peso da carga por cavidade',unit:'g',type:'number',step:'0.001'},
 {key:'peso_total_carga_g',label:'Peso total da carga',unit:'g',type:'number',step:'0.001'},
 {key:'dimensional_molde_mm',label:'Dimensional do molde (C × L × A)',unit:'mm',type:'text'},
 {key:'peso_molde_kg',label:'Peso do molde',unit:'kg',type:'number',step:'0.1'},
 {key:'tempo_pre_aquecimento_seg',label:'Pré-aquecimento da matéria-prima',unit:'s',type:'number',step:'0.1'},
 {key:'temp_plato_superior_c',label:'Temperatura do platô superior',unit:'°C',type:'number',step:'0.1'},
 {key:'temp_plato_inferior_c',label:'Temperatura do platô inferior',unit:'°C',type:'number',step:'0.1'},
 {key:'tolerancia_temp_platos_c',label:'Tolerância dos platôs',unit:'°C',type:'number',step:'0.1'},
 {key:'forca_fechamento_recomendada_ton',label:'Força de fechamento recomendada',unit:'ton',type:'number',step:'0.1'},
 {key:'numero_respiros',label:'Número de respiros',unit:'ciclos',type:'number',step:'1'},
 {key:'tempo_primeiro_respiro_seg',label:'Tempo para o 1º respiro',unit:'s',type:'number',step:'0.1'},
 {key:'tempo_alivio_prensa_aberta_seg',label:'Tempo de alívio (prensa aberta)',unit:'s',type:'number',step:'0.1'},
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
 {key:'material_base',label:'Material base definido na OP',unit:'—',type:'text'},
 {key:'dureza_shore_a',label:'Dureza especificada',unit:'Shore A',type:'number',step:'1'},
 {key:'cavidades_ativas',label:'Quantidade de cavidades',unit:'un',type:'number',step:'1'},
 {key:'dimensional_molde_mm',label:'Dimensional do molde',unit:'mm',type:'text'},
 {key:'tempo_ciclo_seg',label:'Tempo de processo padrão',unit:'s',type:'number',step:'0.01'},
 {key:'acabamento_inspecao_posto',label:'Máquina / posto de inspeção',unit:'—',type:'text'},
 {key:'acabamento_inspecao_setor',label:'Setor de inspeção',unit:'—',type:'text'},
 {key:'acabamento_inspecao_ambiente',label:'Condição / temperatura ambiente',unit:'—',type:'text'},
 {key:'acabamento_inspecao_tempo',label:'Tempo de preparação',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_inspecao_checklist',label:'Checklist de inspeção visual e separação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_inspecao_referencia',label:'Referência visual de defeitos',unit:'—',type:'text'},
 {key:'acabamento_rebarba_posto',label:'Máquina / posto de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_rebarba_setor',label:'Setor de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_rebarba_tempo',label:'Tempo de preparação',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_rebarba_checklist',label:'Checklist de rebarbação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_rebarba_referencia',label:'Referência de rebarbação',unit:'—',type:'text'},
 {key:'acabamento_limpeza_posto',label:'Máquina / posto de limpeza',unit:'—',type:'text'},
 {key:'acabamento_limpeza_setor',label:'Setor de limpeza',unit:'—',type:'text'},
 {key:'acabamento_limpeza_tempo',label:'Tempo de preparação',unit:'s/lote',type:'number',step:'0.01'},
 {key:'acabamento_limpeza_checklist',label:'Checklist de limpeza e lubrificação',unit:'—',type:'text',multiline:true},
 {key:'acabamento_limpeza_referencia',label:'Procedimento de limpeza',unit:'—',type:'text'},
 {key:'acabamento_embalagem_posto',label:'Máquina / posto de embalagem',unit:'—',type:'text'},
 {key:'acabamento_embalagem_setor',label:'Setor de embalagem',unit:'—',type:'text'},
 {key:'acabamento_embalagem_tempo',label:'Tempo de preparação',unit:'s/pc',type:'number',step:'0.01'},
 {key:'acabamento_embalagem_checklist',label:'Checklist de embalagem e etiqueta',unit:'—',type:'text',multiline:true},
 {key:'acabamento_embalagem_referencia',label:'Modelo de etiqueta / embalagem',unit:'—',type:'text'},
]
const packaging: Param[] = [
 {key:'material_base',label:'Material base definido na OP',unit:'—',type:'text'},
 {key:'tempo_ciclo_seg',label:'Tempo de processo padrão',unit:'s',type:'number',step:'0.01'},
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
 {key:'emb_instrucao_montagem',label:'Roteiro de montagem da caixa e acondicionamento',unit:'—',type:'text',multiline:true},
 {key:'emb_instrucao_etiqueta',label:'Instrução de identificação e etiqueta',unit:'—',type:'text',multiline:true},
 {key:'emb_instrucao_paletizacao',label:'Padrão de paletização e empilhamento',unit:'—',type:'text',multiline:true},
 {key:'emb_criterio_liberacao',label:'Critérios de conferência e liberação',unit:'—',type:'text',multiline:true},
]
export const paramsFor = (category: Category) => category === 'ACABAMENTO' ? finishing : category === 'MONTAGEM_EMBALAGEM' ? packaging : [...common, ...(category === 'INJETADOS' ? injection : category === 'PRENSADOS' ? press : category === 'ESTAMPARIA' || category === 'MECANICA' ? stamping : category === 'TRATAMENTO_SUPERFICIAL' || category === 'PINTURA_QUIMICA' ? surface : cutting)]
const processParamGroups: Partial<Record<Category,{title:string;keys:string[]}[]>> = {
 INJETADOS:[
  {title:'Matéria-prima e preparação',keys:['material_polimero','temperatura_secagem_c','tempo_secagem_h','peso_peca_g','peso_canal_g']},
  {title:'Perfil térmico da injetora',keys:['zona1_c','zona2_c','zona3_c','zona4_c']},
  {title:'Injeção, recalque e plasticização',keys:['forca_fechamento_ton','pressao_injecao_bar','velocidade_injecao_mm_s','tempo_injecao_seg','pressao_recalque_bar','tempo_recalque_seg','pressao_contrapressao_bar','rpm_rosca','posicao_dosagem_mm','posicao_comutacao_mm']},
  {title:'Molde, ciclo e refrigeração',keys:['cavidades_ativas','tempo_ciclo_seg','tempo_resfriamento_seg','temperatura_molde_c','altura_molde_mm','tipo_fixacao','tipo_refrigeracao','vazao_refrigeracao_l_min','tempo_setup_min','tempo_limpeza_min','torque_aperto_nm','velocidade_dosagem_curso','seguranca_ppe']},
 ],
 PRENSADOS:[
  {title:'1. Dados do molde e setup',keys:['cavidades_ativas','dimensional_molde_mm','peso_molde_kg','tempo_setup_min','altura_molde_mm','tipo_fixacao','seguranca_ppe']},
  {title:'2. Matéria-prima e carga',keys:['composto_material','dureza_shore_a','peso_carga_cavidade_g','peso_total_carga_g']},
  {title:'3. Temperatura dos platôs e molde',keys:['temp_plato_superior_c','temp_plato_inferior_c','tolerancia_temp_platos_c','temperatura_molde_c','tipo_refrigeracao','vazao_refrigeracao_l_min']},
  {title:'4. Parâmetros de cura e vulcanização',keys:['tempo_pre_aquecimento_seg','tempo_cura_seg','pressao_prensagem_bar','tonelagem_prensa','forca_fechamento_recomendada_ton','tempo_pos_cura_min']},
  {title:'5. Ciclo de desgaseificação (respiro)',keys:['numero_respiros','tempo_primeiro_respiro_seg','tempo_alivio_prensa_aberta_seg','tempo_ciclo_seg','tempo_limpeza_min']},
 ],
 ACABAMENTO:[
  {title:'1. Inspeção visual e separação de canais',keys:['acabamento_inspecao_posto','acabamento_inspecao_setor','acabamento_inspecao_ambiente','acabamento_inspecao_tempo','acabamento_inspecao_checklist','acabamento_inspecao_referencia']},
  {title:'2. Rebarbação manual',keys:['acabamento_rebarba_posto','acabamento_rebarba_setor','acabamento_rebarba_tempo','acabamento_rebarba_checklist','acabamento_rebarba_referencia']},
  {title:'3. Limpeza e lubrificação',keys:['acabamento_limpeza_posto','acabamento_limpeza_setor','acabamento_limpeza_tempo','acabamento_limpeza_checklist','acabamento_limpeza_referencia']},
  {title:'4. Embalagem e etiquetagem',keys:['acabamento_embalagem_posto','acabamento_embalagem_setor','acabamento_embalagem_tempo','acabamento_embalagem_checklist','acabamento_embalagem_referencia']},
 ],
 MONTAGEM_EMBALAGEM:[
  {title:'1. Embalagem em saco plástico / contagem',keys:['aplica_embalagem_plastica','emb_amostragem_base','emb_codigo_balanca','emb_dimensional_saco','emb_quantidade_pecas_saco','emb_peso_pacote_cheio_g']},
  {title:'2. Embalagem em caixa de papelão',keys:['emb_sacos_caixa','emb_pecas_direto_caixa','emb_dimensional_caixa','emb_caixa_modelo']},
  {title:'3. Roteiro de montagem, etiqueta e paletização',keys:['emb_disposicao_pecas','emb_instrucao_montagem','emb_instrucao_etiqueta','emb_instrucao_paletizacao','emb_criterio_liberacao']},
 ],
}
const inputClass = 'h-8 w-full min-w-0 rounded-[3px] border border-[#294456] bg-[#071522] px-2 text-[11px] font-medium text-[#F4FBFD] outline-none focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/20'
const labelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#A8BBC8]'
const blankParameters = (category: Category) => Object.fromEntries(paramsFor(category).map(p => [p.key, ''])) as Record<string, string>

export default function PCPFichasProcesso() {
 const [searchParams, setSearchParams] = useSearchParams()
 const initialCategory = (categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value ?? 'INJETADOS') as Category
 const [category, setCategory] = useState<Category>(initialCategory)
 const [company, setCompany] = useState('')
 const [products, setProducts] = useState<Product[]>([])
 const [tools, setTools] = useState<Tool[]>([])
 const [machines, setMachines] = useState<Machine[]>([])
 const [rows, setRows] = useState<Saved[]>([])
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
   const [p, t, m, f] = await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000),
    supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').limit(2000),
    supabase.from('erp_fichas_processo').select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao').eq('empresa_id', tenant.data).order('codigo_ficha').limit(1000),
   ])
   for (const result of [p, t, m, f]) if (result.error) throw result.error
   setProducts((p.data ?? []) as Product[]); setTools((t.data ?? []) as Tool[]); setMachines((m.data ?? []) as Machine[]); setRows((f.data ?? []) as Saved[])
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar os cadastros da ficha.') }
  finally { setBusy(false) }
 }
 useEffect(() => { void load() }, [])

 const visibleRows = useMemo(() => rows.filter(r => {
  const product = products.find(p => p.id === r.produto_id)
  return !query || [r.codigo_ficha, product?.codigo, product?.nome, r.categoria_processo, r.status].join(' ').toLowerCase().includes(query.toLowerCase())
 }), [rows, products, query])
 const updateParam = (key: string, value: string) => setParams(current => ({ ...current, [key]: value }))

 function openRow(row: Saved) {
  setCode(row.codigo_ficha); setProductId(row.produto_id); setCategory(row.categoria_processo)
  setVersion(String(row.versao_ficha ?? row.revisao ?? 1)); setStatus(row.status); setToolId(row.ferramenta_id ?? ''); setMachineId(row.maquina_id ?? '')
  setParams({ ...blankParameters(row.categoria_processo), ...Object.fromEntries(Object.entries(row.parametros_tecnicos ?? {}).map(([k,v]) => [k, String(v ?? '')])) })
  setApprovedAt(row.data_homologacao ?? ''); setSignature(row.assinatura_tecnica ?? ''); setInstructions(String(row.parametros_tecnicos?.instrucoes_setup ?? ''))
  setSearchParams({ tipo: row.categoria_processo, produto: row.produto_id })
  setError(''); setNotice('')
 }

 async function save() {
  setBusy(true); setError(''); setNotice('')
  try {
   if (!company) throw new Error('Empresa não identificada.')
   if (!code.trim() || !productId) throw new Error('Código da ficha e produto são obrigatórios.')
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
   setNotice('Ficha técnica gravada no cadastro de engenharia da empresa.')
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao gravar a ficha técnica.') }
  finally { setBusy(false) }
 }

 const fields = paramsFor(category)
 const selectedProduct = products.find(p => p.id === productId)
 const selectedTool = tools.find(t => t.id === toolId)
 const selectedMachine = machines.find(m => m.id === machineId)
 const singleResourceProcess = category !== 'ACABAMENTO' && category !== 'MONTAGEM_EMBALAGEM'
 const expectedPph = singleResourceProcess && Number(params.tempo_ciclo_seg) > 0 ? (3600 / Number(params.tempo_ciclo_seg)) * Math.max(1, Number(params.cavidades_ativas) || 1) : 0
 const fieldGroups = processParamGroups[category] ?? [{title:'Parâmetros técnicos do processo',keys:fields.map(field=>field.key)}]
 const assignedKeys = new Set(fieldGroups.flatMap(group=>group.keys))
 const temperatureOverlayKeys = new Set(category === 'INJETADOS' ? ['zona1_c','zona2_c','zona3_c','zona4_c'] : category === 'PRENSADOS' ? ['temp_plato_superior_c','temp_plato_inferior_c','temperatura_molde_c'] : [])
 const parameterCards = [...fieldGroups.map(group=>({...group,fields:fields.filter(field=>group.keys.includes(field.key) && !temperatureOverlayKeys.has(field.key))})).filter(group=>group.fields.length>0),...(fields.some(field=>!assignedKeys.has(field.key) && !temperatureOverlayKeys.has(field.key))?[{title:'Parâmetros complementares',keys:[],fields:fields.filter(field=>!assignedKeys.has(field.key) && !temperatureOverlayKeys.has(field.key))}]:[])]
 const valueLabel = (key:string,unit='') => params[key] ? `${params[key]}${unit ? ` ${unit}` : ''}` : 'Não informado'
 const summaryPanels = category === 'ACABAMENTO'
  ? [
   {title:'Identificação do produto',items:[['Produto',selectedProduct?.nome||'—'],['SKU',selectedProduct?.codigo||'—'],['Dureza',valueLabel('dureza_shore_a','Shore A')],['Dimensional do molde',valueLabel('dimensional_molde_mm','mm')]]},
   {title:'Dados de processo',items:[['Cavidades',valueLabel('cavidades_ativas')],['Material base',valueLabel('material_base')],['Tempo padrão',valueLabel('tempo_ciclo_seg','s')],['Recurso principal',selectedMachine?.codigo||'Não definido']]},
   {title:'Roteiro e controle',items:[['Etapas', 'Inspeção · rebarbação · limpeza · embalagem'],['Revisão',version],['Estado',status],['Homologação',approvedAt||'Não homologada']]},
  ]
  : category === 'MONTAGEM_EMBALAGEM'
   ? [
    {title:'Identificação do produto',items:[['Produto',selectedProduct?.nome||'—'],['SKU',selectedProduct?.codigo||'—'],['Material base',valueLabel('material_base')]]},
    {title:'Contagem e acondicionamento',items:[['Embalagem plástica',valueLabel('aplica_embalagem_plastica')],['Amostragem',valueLabel('emb_amostragem_base','peças')],['Peças por saco',valueLabel('emb_quantidade_pecas_saco','un')],['Peso pacote',valueLabel('emb_peso_pacote_cheio_g','g')]]},
    {title:'Caixa e processo',items:[['Sacos por caixa',valueLabel('emb_sacos_caixa')],['Dimensional da caixa',valueLabel('emb_dimensional_caixa','mm')],['Tempo padrão',valueLabel('tempo_ciclo_seg','s')],['Recurso principal',selectedMachine?.codigo||'Não definido']]},
   ]
   : []
 const injectionZones = ['zona1_c','zona2_c','zona3_c','zona4_c'].map((key,index)=>({key,label:`Zona ${index+1}`,value:Number(params[key])})).filter(zone=>Number.isFinite(zone.value)&&zone.value>0)
 const maxZoneTemp = Math.max(1,...injectionZones.map(zone=>zone.value))
 const pressCharge = Number(params.peso_carga_cavidade_g)>0&&Number(params.cavidades_ativas)>0?Number(params.peso_carga_cavidade_g)*Number(params.cavidades_ativas):null

 return <main className="min-h-screen bg-[#071522] p-2 text-[#F4FBFD] md:p-3">
  <div className="mx-auto max-w-[1800px]">
   <header className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#294456] bg-[#0D2638] p-3 shadow-xl shadow-black/10">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#48B7C7]/30 bg-[#071522] text-[#48B7C7]"><FileSliders size={16}/></span>
    <div className="min-w-[240px]"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#48B7C7]">MANUFATURA / PCP / ENGENHARIA</p><h1 className="text-lg font-bold leading-6 md:text-xl">{category==='INJETADOS'?'Ficha técnica de processo — Injetados':category==='PRENSADOS'?'Ficha hidráulica de processo — Prensados':`Ficha de processo — ${categories.find(item=>item.value===category)?.label??category}`}</h1><p className="text-xs text-[#A8BBC8]">Parâmetros homologados, preparação, capacidade e rastreabilidade de revisão.</p></div>
    <div className="ml-auto grid min-w-[260px] flex-1 grid-cols-3 gap-2 md:max-w-[430px]">{[{label:'Documento',value:code||'Novo documento'},{label:'Revisão',value:version.padStart(2,'0')},{label:'Status',value:status}].map(item=><div key={item.label} className="rounded-lg border border-[#294456] bg-[#071522] px-3 py-2"><span className="block text-[10px] text-[#A8BBC8]">{item.label}</span><strong className={`mt-0.5 block truncate text-sm ${item.label==='Status'&&['APROVADA','LIBERADA'].includes(status)?'text-[#3A9D78]':'text-[#F4FBFD]'}`}>{item.value}</strong></div>)}</div>
    <div className="flex w-full flex-wrap justify-end gap-2 print:hidden"><Link className="erp-premium-button erp-premium-button-secondary" to="/pcp/fichas-processo/ia"><Sparkles size={14}/> Criar com IA</Link><button className="erp-premium-button erp-premium-button-secondary" type="button" onClick={()=>window.print()}><Printer size={14}/> Imprimir ficha</button><button className="erp-premium-button erp-premium-button-secondary" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Atualizar</button><button className="erp-premium-button" type="button" onClick={()=>{setCode('');setProductId('');setToolId('');setMachineId('');setVersion('1');setApprovedAt('');setSignature('');setStatus('RASCUNHO');setParams(blankParameters(category));setInstructions('')}}>Nova ficha</button></div>
   </header>
   {error && <div role="alert" className="mb-3 rounded-lg border border-[#D65B61]/50 bg-[#D65B61]/10 p-3 text-sm text-[#F4B8BB]">{error}</div>}
   {notice && <div role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-[#3A9D78]/40 bg-[#3A9D78]/10 p-3 text-sm text-[#8ED0B4]"><CheckCircle2 size={16}/>{notice}</div>}
   <section className="mb-3 rounded-xl border border-[#294456] bg-[#0D2638] p-2 print:hidden">
    <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-12 md:items-end"><label className="md:col-span-7"><span className={labelClass}>Pesquisar ficha / produto</span><span className="relative block"><Search size={15} className="absolute left-3 top-3 text-[#8297A5]"/><input className={inputClass+' pl-9'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, produto, categoria ou estado"/></span></label><label className="md:col-span-5"><span className={labelClass}>Modelo da ficha</span><select className={inputClass} value={category} onChange={e=>{const next=e.target.value as Category;setCategory(next);setParams(blankParameters(next));setSearchParams({tipo:next})}}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label></div>
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">{visibleRows.map(row=><button key={row.id} type="button" onClick={()=>openRow(row)} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#294456] bg-[#071522] px-3 text-left transition hover:border-[#48B7C7] hover:bg-[#123B50]"><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#F4FBFD]">{row.codigo_ficha} · {products.find(p=>p.id===row.produto_id)?.codigo ?? 'Produto'}</span><span className="block truncate text-[11px] text-[#A8BBC8]">{categories.find(c=>c.value===row.categoria_processo)?.label ?? row.categoria_processo} · revisão {row.versao_ficha ?? row.revisao} · {row.status}</span></span><span className="text-xs font-semibold text-[#48B7C7]">Abrir ficha →</span></button>)}</div>
   </section>
   <section className="pcp-ficha-print-sheet rounded-xl border border-[#294456] bg-[#0D2638] p-3 shadow-xl shadow-black/10 print:border-0 print:p-0"><div className="mb-3 hidden border-b border-slate-400 pb-2 print:block"><h1 className="text-base font-bold">FICHA TÉCNICA DE PROCESSO INDUSTRIAL</h1><p className="text-[10px]">Documento operacional para consulta e assinatura no posto de trabalho.</p></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#294456] pb-3 print:hidden"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#48B7C7]">{category==='INJETADOS'?'PROCESSO · INJEÇÃO':category==='PRENSADOS'?'PROCESSO · PRENSA E VULCANIZAÇÃO':'PROCESSO · '+(categories.find(item=>item.value===category)?.label||category)}</p><h2 className="mt-1 text-lg font-semibold text-[#F4FBFD]">{selectedProduct?selectedProduct.nome:'Selecione o produto da ficha'}</h2><p className="text-xs text-[#A8BBC8]">{selectedProduct?`${selectedProduct.codigo} · ${selectedTool?.codigo??'sem ferramental'} · ${selectedMachine?.codigo??'sem máquina vinculada'}`:'A ficha salva usará os cadastros reais da empresa.'}</p></div><span className="rounded-lg border border-[#48B7C7]/40 bg-[#48B7C7]/10 px-3 py-2 text-sm font-semibold text-[#48B7C7]">{status}</span></div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
     <label><span className={labelClass}>ID / código da ficha</span><input className={inputClass} value={code} onChange={e=>setCode(e.target.value)} required/></label>
     <label><span className={labelClass}>Código do produto (FK)</span><select className={inputClass} value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
     <label><span className={labelClass}>Código do molde / ferramental (FK)</span><select className={inputClass} value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">Não aplicável</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} · {t.nome}</option>)}</select></label>
     <label><span className={labelClass}>Máquina / recurso</span><select className={inputClass} value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
     <label><span className={labelClass}>Versão da ficha</span><input className={inputClass} type="number" min="1" step="1" value={version} onChange={e=>setVersion(e.target.value)} required/></label>
     <label><span className={labelClass}>Data de homologação</span><input className={inputClass} type="date" value={approvedAt} onChange={e=>setApprovedAt(e.target.value)}/></label>
     <label className="xl:col-span-2"><span className={labelClass}>Assinatura técnica do engenheiro</span><input className={inputClass} value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Nome completo / registro profissional"/></label>
     <label><span className={labelClass}>Estado da ficha</span><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option>RASCUNHO</option><option>EM_ANALISE</option><option>APROVADA</option><option>LIBERADA</option><option>OBSOLETA</option></select></label>
    </div>
    {summaryPanels.length>0&&<div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">{summaryPanels.map((panel,index)=><article key={panel.title} className="overflow-hidden rounded-lg border border-[#294456] bg-[#071522]"><h3 className={`border-b border-[#294456] px-3 py-2 text-xs font-bold ${index===0?'bg-[#123B50] text-[#F4FBFD]':'text-[#48B7C7]'}`}>{panel.title}</h3><dl className="divide-y divide-[#294456] px-3">{panel.items.map(([label,value])=><div key={label} className="flex min-h-9 items-center justify-between gap-3 py-1.5 text-xs"><dt className="text-[#A8BBC8]">{label}</dt><dd className="text-right font-semibold text-[#F4FBFD]">{value}</dd></div>)}</dl></article>)}</div>}
     {(category==='INJETADOS'||category==='PRENSADOS')&&<section className="mt-4 rounded-lg border border-slate-300 bg-[#F3F5F6] p-3 text-slate-900 print:bg-white">
      <div className="mb-3 border-b border-slate-300 pb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">REGULAGEM TÉRMICA VISUAL</p><h3 className="text-sm font-extrabold">{category==='INJETADOS'?'Injetora · canhão e zonas de aquecimento':'Prensa · platôs e molde aquecido'}</h3><p className="text-[11px] text-slate-600">Digite as temperaturas diretamente nos campos posicionados sobre o desenho.</p></div>
      {category==='INJETADOS'?<div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)]"><div className="relative mx-auto w-full max-w-[760px]">
       <svg viewBox="0 0 760 240" role="img" aria-label="Imagem técnica ilustrada de injetora com quatro zonas de temperatura no canhão" className="block h-auto w-full"><defs><linearGradient id="canhao-metal" x1="0" x2="1"><stop offset="0%" stopColor="#9CA3AF"/><stop offset="50%" stopColor="#E5E7EB"/><stop offset="100%" stopColor="#6B7280"/></linearGradient></defs><rect x="8" y="8" width="744" height="224" rx="7" fill="#E7EAED" stroke="#A7AFB8"/><rect x="35" y="50" width="125" height="132" rx="4" fill="#C7CDD3" stroke="#66717C" strokeWidth="2"/><rect x="50" y="64" width="95" height="104" fill="#9CA3AF" stroke="#4B5563"/><path d="M60 78h75M60 93h75M60 108h75M60 123h75M60 138h75M60 153h75" stroke="#6B7280" strokeWidth="3"/><rect x="160" y="100" width="68" height="38" fill="#9CA3AF" stroke="#4B5563" strokeWidth="2"/><rect x="224" y="86" width="392" height="64" rx="8" fill="url(#canhao-metal)" stroke="#4B5563" strokeWidth="2"/><rect x="242" y="80" width="84" height="76" rx="4" fill="#D97706" fillOpacity=".9" stroke="#92400E" strokeWidth="2"/><rect x="328" y="80" width="84" height="76" rx="4" fill="#EA580C" fillOpacity=".88" stroke="#9A3412" strokeWidth="2"/><rect x="414" y="80" width="84" height="76" rx="4" fill="#DC2626" fillOpacity=".85" stroke="#991B1B" strokeWidth="2"/><rect x="500" y="80" width="84" height="76" rx="4" fill="#B91C1C" fillOpacity=".85" stroke="#7F1D1D" strokeWidth="2"/><path d="M616 108h42l26 10-26 10h-42z" fill="#9CA3AF" stroke="#4B5563" strokeWidth="2"/><rect x="246" y="168" width="322" height="20" rx="3" fill="#4B5563"/><rect x="76" y="194" width="558" height="8" rx="4" fill="#6B7280"/><text x="380" y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">CANHÃO DE PLASTIFICAÇÃO · ZONAS TÉRMICAS</text><text x="380" y="220" textAnchor="middle" fontSize="9" fill="#4B5563">ALIMENTAÇÃO → COMPRESSÃO → DOSAGEM → BICO</text></svg>
       <div className="absolute left-[30%] top-[33%] w-[13%] min-w-[54px]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">ZONA 1</label><input aria-label="Temperatura zona 1 do canhão" className="h-8 w-full rounded border-2 border-amber-800 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.zona1_c??''} onChange={e=>updateParam('zona1_c',e.target.value)} placeholder="°C"/></div>
       <div className="absolute left-[42%] top-[33%] w-[13%] min-w-[54px]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">ZONA 2</label><input aria-label="Temperatura zona 2 do canhão" className="h-8 w-full rounded border-2 border-orange-800 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.zona2_c??''} onChange={e=>updateParam('zona2_c',e.target.value)} placeholder="°C"/></div>
       <div className="absolute left-[54%] top-[33%] w-[13%] min-w-[54px]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">ZONA 3</label><input aria-label="Temperatura zona 3 do canhão" className="h-8 w-full rounded border-2 border-red-800 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.zona3_c??''} onChange={e=>updateParam('zona3_c',e.target.value)} placeholder="°C"/></div>
       <div className="absolute left-[66%] top-[33%] w-[13%] min-w-[54px]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">ZONA 4</label><input aria-label="Temperatura zona 4 do canhão" className="h-8 w-full rounded border-2 border-red-900 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.zona4_c??''} onChange={e=>updateParam('zona4_c',e.target.value)} placeholder="°C"/></div>
      </div><div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{[['ZONA 1 · ALIMENTAÇÃO','zona1_c'],['ZONA 2 · COMPRESSÃO','zona2_c'],['ZONA 3 · DOSAGEM','zona3_c'],['ZONA 4 · BICO','zona4_c']].map(([label,key])=><div key={key} className="flex items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-[10px]"><span className="font-bold text-slate-600">{label}</span><strong>{params[key]?`${params[key]} °C`:'—'}</strong></div>)}</div></div>
      :<div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]"><div className="relative mx-auto w-full max-w-[680px]"><svg viewBox="0 0 680 300" role="img" aria-label="Imagem técnica ilustrada de prensa com platô superior, molde e platô inferior" className="block h-auto w-full"><rect x="10" y="10" width="660" height="280" rx="7" fill="#E7EAED" stroke="#A7AFB8"/><rect x="70" y="40" width="540" height="32" rx="3" fill="#6B7280" stroke="#374151" strokeWidth="2"/><rect x="96" y="72" width="18" height="158" fill="#9CA3AF" stroke="#4B5563"/><rect x="566" y="72" width="18" height="158" fill="#9CA3AF" stroke="#4B5563"/><rect x="158" y="84" width="364" height="46" rx="3" fill="#D97706" stroke="#92400E" strokeWidth="2"/><path d="M175 96h330M175 107h330M175 118h330" stroke="#FDE68A" strokeWidth="2"/><rect x="185" y="136" width="310" height="34" fill="#4B5563" stroke="#1F2937" strokeWidth="2"/><rect x="185" y="176" width="310" height="33" fill="#6B7280" stroke="#374151" strokeWidth="2"/><path d="M197 185h286M197 195h286" stroke="#D1D5DB" strokeWidth="2"/><rect x="158" y="214" width="364" height="44" rx="3" fill="#DC2626" stroke="#991B1B" strokeWidth="2"/><path d="M175 225h330M175 236h330M175 247h330" stroke="#FECACA" strokeWidth="2"/><text x="340" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">PRENSA · PLATÔS E MOLDE AQUECIDO</text></svg>
       <div className="absolute left-[33%] top-[27%] w-[34%]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">PLATÔ SUPERIOR</label><input aria-label="Temperatura do platô superior" className="h-8 w-full rounded border-2 border-amber-800 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.temp_plato_superior_c??''} onChange={e=>updateParam('temp_plato_superior_c',e.target.value)} placeholder="°C"/></div>
       <div className="absolute left-[33%] top-[52%] w-[34%]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">MOLDE</label><input aria-label="Temperatura do molde" className="h-8 w-full rounded border-2 border-slate-700 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.temperatura_molde_c??''} onChange={e=>updateParam('temperatura_molde_c',e.target.value)} placeholder="°C"/></div>
       <div className="absolute left-[33%] top-[72%] w-[34%]"><label className="block text-center text-[9px] font-extrabold text-white drop-shadow">PLATÔ INFERIOR</label><input aria-label="Temperatura do platô inferior" className="h-8 w-full rounded border-2 border-red-800 bg-white px-1 text-center text-xs font-extrabold text-slate-900 shadow" type="number" step="0.1" value={params.temp_plato_inferior_c??''} onChange={e=>updateParam('temp_plato_inferior_c',e.target.value)} placeholder="°C"/></div>
      </div><div className="grid grid-cols-1 gap-2">{[['PLATÔ SUPERIOR','temp_plato_superior_c'],['MOLDE','temperatura_molde_c'],['PLATÔ INFERIOR','temp_plato_inferior_c']].map(([label,key])=><div key={key} className="flex items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-[10px]"><span className="font-bold text-slate-600">{label}</span><strong>{params[key]?`${params[key]} °C`:'—'}</strong></div>)}</div></div>}
     </section>}
    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
     <article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Identificação e componentes</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Documento</dt><dd className="font-semibold">{code||'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Produto</dt><dd className="text-right font-semibold">{selectedProduct?`${selectedProduct.codigo} · ${selectedProduct.nome}`:'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Ferramental / máquina</dt><dd className="text-right font-semibold">{selectedTool?.codigo??'—'} / {selectedMachine?.codigo??'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Cavidades ativas</dt><dd className="font-semibold">{valueLabel('cavidades_ativas','cav.')}</dd></div></dl></article>
     {category==='INJETADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Perfil de temperatura por zona</h3><div className="mt-3 grid grid-cols-4 gap-2">{['zona1_c','zona2_c','zona3_c','zona4_c'].map((key,index)=>{const temperature=Number(params[key]);const hasValue=Number.isFinite(temperature)&&temperature>0;return <div key={key} className="flex min-w-0 flex-col items-center gap-2"><span className="text-[10px] text-[#A8BBC8]">Z{index+1}</span><div className="flex h-20 w-full items-end rounded bg-[#0D2638] p-1"><i className="w-full rounded-sm bg-gradient-to-t from-[#2D8DB8] to-[#48B7C7]" style={{height:hasValue?`${Math.max(8,temperature/maxZoneTemp*100)}%`:'3px'}}/></div><strong className="text-[11px] tabular-nums">{hasValue?`${temperature}°C`:'—'}</strong></div>})}</div><p className="mt-2 text-[10px] text-[#8297A5]">Escala relativa apenas entre zonas preenchidas; não substitui os limites homologados.</p></article>:category==='PRENSADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Matéria-prima e carga</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Composto</dt><dd className="text-right font-semibold">{valueLabel('composto_material')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Dureza</dt><dd className="font-semibold">{valueLabel('dureza_shore_a','Shore A')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Carga / cavidade</dt><dd className="font-semibold">{valueLabel('peso_carga_cavidade_g','g')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Carga total calculada</dt><dd className="font-semibold">{pressCharge===null?'—':`${pressCharge.toLocaleString('pt-BR',{maximumFractionDigits:3})} g`}</dd></div></dl></article>:<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Material e preparação</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Ciclo padrão</dt><dd className="font-semibold">{valueLabel('tempo_ciclo_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Setup</dt><dd className="font-semibold">{valueLabel('tempo_setup_min','min')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Capacidade nominal</dt><dd className="font-semibold">{expectedPph>0?`${expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})} peças/h`:'—'}</dd></div></dl></article>}
     {category==='INJETADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Tempos do ciclo</h3>{[{label:'Injeção',key:'tempo_injecao_seg'},{label:'Recalque',key:'tempo_recalque_seg'},{label:'Resfriamento',key:'tempo_resfriamento_seg'},{label:'Ciclo total',key:'tempo_ciclo_seg'}].map(item=><div key={item.key} className="mt-2"><div className="flex justify-between gap-2 text-xs"><span className="text-[#A8BBC8]">{item.label}</span><strong>{valueLabel(item.key,'s')}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-[#294456]"><i className="block h-full rounded bg-[#3A9D78]" style={{width:Number(params[item.key])>0&&Number(params.tempo_ciclo_seg)>0?`${Math.max(4,Math.min(100,Number(params[item.key])/Number(params.tempo_ciclo_seg)*100))}%`:'0%'}}/></div></div>)}</article>:category==='PRENSADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Cura e parâmetros da prensa</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Pré-aquecimento</dt><dd className="font-semibold">{valueLabel('tempo_pre_aquecimento_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Cura / vulcanização</dt><dd className="font-semibold">{valueLabel('tempo_cura_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Pressão de trabalho</dt><dd className="font-semibold">{valueLabel('pressao_prensagem_bar','bar')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[#A8BBC8]">Força recomendada</dt><dd className="font-semibold">{valueLabel('forca_fechamento_recomendada_ton','ton')}</dd></div></dl></article>:null}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#294456] bg-[#071522] px-3 py-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[#A8BBC8]">{singleResourceProcess?'Capacidade nominal de saída':'Planejamento do roteiro'}</span><strong className="text-lg tabular-nums text-[#48B7C7]">{singleResourceProcess?(expectedPph>0?expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})+' peças/h':'Informe ciclo e cavidades'):'Fluxo multiposto — definir operações e recursos no PCP'}</strong><span className="text-xs text-[#8297A5]">{singleResourceProcess?'Cálculo: 3.600 ÷ ciclo (s) × cavidades ativas; sem aplicar eficiência ou paradas.':'Esta ficha não é usada como ciclo único de máquina, evitando estimativa incorreta para etapas distintas.'}</span></div>
    {(category==='ACABAMENTO'||category==='MONTAGEM_EMBALAGEM')&&<section className="mt-4 rounded-lg border border-[#294456] bg-[#071522] p-3"><div className="mb-3 border-b border-[#294456] pb-2"><p className="text-[10px] font-bold uppercase tracking-wide text-[#48B7C7]">VISUALIZAÇÃO OPERACIONAL</p><h3 className="text-sm font-bold text-[#F4FBFD]">{category==='ACABAMENTO'?'Roteiro de acabamento por posto':'Fluxo de embalagem e paletização'}</h3><p className="mt-1 text-xs text-[#A8BBC8]">A prévia reflete os dados preenchidos abaixo; campos sem definição aparecem como “Não informado”.</p></div>{category==='ACABAMENTO'?<div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{[{title:'1. Inspeção visual e separação de canais',post:'acabamento_inspecao_posto',sector:'acabamento_inspecao_setor',time:'acabamento_inspecao_tempo',timeUnit:'s/pc',checklist:'acabamento_inspecao_checklist',reference:'acabamento_inspecao_referencia'},{title:'2. Rebarbação manual',post:'acabamento_rebarba_posto',sector:'acabamento_rebarba_setor',time:'acabamento_rebarba_tempo',timeUnit:'s/pc',checklist:'acabamento_rebarba_checklist',reference:'acabamento_rebarba_referencia'},{title:'3. Limpeza e lubrificação',post:'acabamento_limpeza_posto',sector:'acabamento_limpeza_setor',time:'acabamento_limpeza_tempo',timeUnit:'s/lote',checklist:'acabamento_limpeza_checklist',reference:'acabamento_limpeza_referencia'},{title:'4. Embalagem e etiquetagem',post:'acabamento_embalagem_posto',sector:'acabamento_embalagem_setor',time:'acabamento_embalagem_tempo',timeUnit:'s/pc',checklist:'acabamento_embalagem_checklist',reference:'acabamento_embalagem_referencia'}].map((stage,index)=><article key={stage.title} className="flex min-h-[230px] flex-col rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className={`min-h-10 border-b border-[#294456] pb-2 text-xs font-bold ${index===0?'bg-gradient-to-r from-[#2D8DB8]/20 to-transparent text-[#48B7C7]':'text-[#F4FBFD]'}`}>{stage.title}</h4><dl className="mt-2 space-y-2 text-xs"><div><dt className="text-[#A8BBC8]">Máquina / posto</dt><dd className="font-medium">{valueLabel(stage.post)}</dd></div><div><dt className="text-[#A8BBC8]">Setor</dt><dd className="font-medium">{valueLabel(stage.sector)}</dd></div><div><dt className="text-[#A8BBC8]">Tempo de preparação</dt><dd className="font-medium">{valueLabel(stage.time,stage.timeUnit)}</dd></div><div><dt className="text-[#A8BBC8]">Checklist</dt><dd className="whitespace-pre-line font-medium">{valueLabel(stage.checklist)}</dd></div><div className="mt-auto border-t border-[#294456] pt-2"><dt className="text-[#A8BBC8]">Documento de referência</dt><dd className="font-medium">{valueLabel(stage.reference)}</dd></div></dl></article>)}</div>:<div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">1. Embalagem em saco plástico / contagem</h4><dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{[['Embalagem plástica','aplica_embalagem_plastica'],['Amostragem base','emb_amostragem_base'],['Código da balança','emb_codigo_balanca'],['Dimensional do saco','emb_dimensional_saco'],['Peças por saco','emb_quantidade_pecas_saco'],['Peso pacote cheio','emb_peso_pacote_cheio_g']].map(([label,key])=><div key={key}><dt className="text-[#A8BBC8]">{label}</dt><dd className="font-medium">{valueLabel(key)}</dd></div>)}</dl></article><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">2. Embalagem em caixa de papelão</h4><dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{[['Sacos por caixa','emb_sacos_caixa'],['Peças diretas por caixa','emb_pecas_direto_caixa'],['Dimensional da caixa','emb_dimensional_caixa'],['Referência de montagem','emb_caixa_modelo']].map(([label,key])=><div key={key}><dt className="text-[#A8BBC8]">{label}</dt><dd className="font-medium">{valueLabel(key)}</dd></div>)}</dl></article><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3 xl:col-span-2"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">3. Roteiro de montagem, etiqueta e paletização</h4><dl className="mt-2 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">{[['Disposição das peças','emb_disposicao_pecas'],['Instruções de montagem','emb_instrucao_montagem'],['Etiqueta e identificação','emb_instrucao_etiqueta'],['Padrão de paletização','emb_instrucao_paletizacao'],['Critérios de liberação','emb_criterio_liberacao']].map(([label,key])=><div key={key}><dt className="text-[#A8BBC8]">{label}</dt><dd className="whitespace-pre-line font-medium">{valueLabel(key)}</dd></div>)}</dl></article></div>}</section>}
    <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
     {parameterCards.map(group=><article key={group.title} className="min-w-0 rounded-lg border border-[#294456] bg-[#071522] p-2">
      <h3 className="mb-2 border-b border-[#294456] pb-2 text-[11px] font-bold uppercase tracking-wide text-[#48B7C7]">{group.title}</h3>
      <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:grid-cols-2">
       {group.fields.map(field=><label key={field.key} className={field.multiline?'sm:col-span-2':''}>
        <span className={labelClass}>{field.label} {field.required&&<span className="text-[#D65B61]">*</span>}</span>
        <span className="flex">
         {field.type==='select'
          ? <select className={inputClass+' rounded-r-none'} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)}><option value="">Selecione</option>{(field.options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>
          : field.multiline
           ? <textarea className={inputClass+' min-h-[76px] resize-y rounded-r-none py-2'} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)} placeholder="Registrar instruções aprovadas"/>
           : <input className={inputClass+' rounded-r-none'} type={field.type==='number'?'number':'text'} step={field.step} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)} placeholder={field.unit==='—'?'Informar':field.unit}/>}
         <span className="flex min-h-8 min-w-[44px] shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[#294456] bg-[#123B50] px-1.5 text-[9px] text-[#A8BBC8]">{field.unit}</span>
        </span>
       </label>)}
      </div>
     </article>)}
    </div>
    <label className="mt-3 block"><span className={labelClass}>Instruções de setup / processo / segurança</span><textarea className="min-h-[72px] w-full rounded-[3px] border border-[#294456] bg-[#071522] p-2 text-[11px] text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Sequência operacional, parâmetros de controle, inspeção inicial, reação a desvio, EPI e cuidados ambientais…"/></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#294456] pt-3"><span className="text-xs text-[#A8BBC8]">Dados separados por empresa · revisão técnica · parâmetros sem valores fictícios</span><button className="erp-premium-button print:hidden" type="button" onClick={()=>void save()} disabled={busy}><Save size={14}/>{busy?'Gravando…':'Gravar ficha'}</button></div>
   </section>
   <div className="print:hidden"><PCPMoldPhotoPanel productId={productId} /></div>
   <footer className="mt-3 flex items-center gap-2 text-xs text-[#8297A5] print:hidden"><CalendarRange size={14}/>{singleResourceProcess?'O PCP estima a duração a partir da ficha liberada, capacidade, ciclo e setup; datas continuam sujeitas ao calendário de recursos.':'Para programar este roteiro multiposto, cadastre as operações e recursos correspondentes no roteiro do PCP; ele não será aplicado como ciclo de uma única máquina.'}</footer>
  </div>
 <style>{'@media print{body{background:#fff!important;color:#111!important}.pcp-ficha-print-sheet,.pcp-ficha-print-sheet article,.pcp-ficha-print-sheet div{background:#fff!important;color:#111!important;border-color:#777!important;box-shadow:none!important}.pcp-ficha-print-sheet{break-inside:avoid;border:0!important;padding:0!important}.pcp-ficha-print-sheet input,.pcp-ficha-print-sheet select,.pcp-ficha-print-sheet textarea{color:#111!important;background:#fff!important;border-color:#777!important;box-shadow:none!important;print-color-adjust:exact}.pcp-ficha-print-sheet label{break-inside:avoid}.pcp-ficha-print-sheet button{display:none!important}.pcp-ficha-print-sheet span,.pcp-ficha-print-sheet dt,.pcp-ficha-print-sheet p{color:#333!important}}'}</style>
  </main>
}