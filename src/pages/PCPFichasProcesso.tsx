/**
 * REV-2026-10-22 — REV-FICHA-007: layout de alta densidade com 3 painéis de parâmetros e fotos lado a lado.
 * CSS escopado com prioridade para neutralizar conflitos do tema global; persistência e dados reais preservados.
 * REV-2026-10-22 — REV-FICHA-006: anexos fotográficos independentes para molde e máquina, vinculados aos cadastros reais.
 * Preserva dados reais, isolamento por empresa, persistência Supabase e impressão A4.
 * Revisão visual restrita a esta tela; sem dados fictícios ou alteração do contrato de banco.
 * REV-2026-10-21 — REV-FICHA-004: campos editáveis sobre a imagem do equipamento; card de perfil removido e foto do molde mantida ao lado.
 * Preserva dados reais, isolamento por empresa, persistência Supabase e impressão A4.
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, ExternalLink, Factory, FileSliders, Printer, RefreshCw, Save, Search } from 'lucide-react'
import PCPMoldPhotoPanel from '../components/PCPMoldPhotoPanel'
import PCPMachinePhotoPanel from '../components/PCPMachinePhotoPanel'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Tool = { id: string; codigo: string; nome: string; tipo: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
export type Category = 'INJETADOS' | 'PRENSADOS' | 'ESTAMPARIA' | 'MECANICA' | 'TRATAMENTO_SUPERFICIAL' | 'PINTURA_QUIMICA' | 'CORTE_VINCO' | 'ACABAMENTO' | 'MONTAGEM_EMBALAGEM'
export type Param = { key: string; label: string; unit: string; type?: 'number' | 'text' | 'select'; required?: boolean; step?: string; multiline?: boolean; options?: string[] }
type Saved = { id: string; codigo_ficha: string; produto_id: string; ferramenta_id?: string | null; maquina_id?: string | null; categoria_processo: Category; versao_ficha: number; status: string; data_homologacao?: string | null; assinatura_tecnica?: string | null; parametros_tecnicos: Record<string, unknown>; revisao?: number }
export const categories: { value: Category; label: string; badge?: string }[] = [
 { value: 'INJETADOS', label: 'Injetados (Termoplásticos)', badge: 'Canhão & Molde' }, { value: 'PRENSADOS', label: 'Prensados (Vulcanização / Borracha)', badge: 'Platôs & Cura' },
 { value: 'ESTAMPARIA', label: 'Estampos / Estamparia' }, { value: 'MECANICA', label: 'Usinagem & Mecânica' },
 { value: 'TRATAMENTO_SUPERFICIAL', label: 'Tratamento Superficial' },
 { value: 'PINTURA_QUIMICA', label: 'Pintura & Química' }, { value: 'CORTE_VINCO', label: 'Corte e Vinco' },
 { value: 'ACABAMENTO', label: 'Acabamento Unificado' }, { value: 'MONTAGEM_EMBALAGEM', label: 'Montagem & Embalagem' },
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
 {key:'zona4_c',label:'Temperatura zona 4 (frontal)',unit:'°C',type:'number',step:'0.1'},
 {key:'temp_bico_c',label:'Temperatura do bico',unit:'°C',type:'number',step:'0.1'},
 {key:'temp_molde_fixo_c',label:'Temperatura do molde fixo',unit:'°C',type:'number',step:'0.1'},
 {key:'temp_molde_movel_c',label:'Temperatura do molde móvel',unit:'°C',type:'number',step:'0.1'},
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
const setupCommon = common.filter(p => ['tempo_ciclo_seg','altura_molde_mm','tipo_fixacao','tempo_setup_min','tempo_limpeza_min','seguranca_ppe'].includes(p.key))
export const paramsFor = (category: Category) => category === 'INJETADOS' ? [...common, ...injection] : category === 'PRENSADOS' ? [...setupCommon, ...press] : category === 'ESTAMPARIA' || category === 'MECANICA' ? [...setupCommon.filter(p => p.key !== 'altura_molde_mm' && p.key !== 'tipo_fixacao'), ...stamping] : category === 'TRATAMENTO_SUPERFICIAL' || category === 'PINTURA_QUIMICA' ? surface : category === 'CORTE_VINCO' ? cutting : category === 'ACABAMENTO' ? finishing : packaging
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
  {title:'1. Dados gerais, saco plástico e contagem',keys:['material_base','tempo_ciclo_seg','aplica_embalagem_plastica','emb_amostragem_base','emb_codigo_balanca','emb_dimensional_saco','emb_quantidade_pecas_saco','emb_peso_pacote_cheio_g']},
  {title:'2. Embalagem em caixa de papelão',keys:['emb_sacos_caixa','emb_pecas_direto_caixa','emb_dimensional_caixa','emb_caixa_modelo']},
  {title:'3. Roteiro de montagem, etiqueta e paletização',keys:['emb_disposicao_pecas','emb_instrucao_montagem','emb_instrucao_etiqueta','emb_instrucao_paletizacao','emb_criterio_liberacao']},
 ],
}
const inputClass = 'h-[30px] w-full min-w-0 max-w-[200px] rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-semibold text-[#123B50] outline-none transition-colors placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-600'
const blankParameters = (category: Category) => Object.fromEntries(paramsFor(category).map(p => [p.key, ''])) as Record<string, string>


/**
 * REV-2026-10-19 — correção visual isolada: diagramas técnicos de processo
 * com controles editáveis sobre o equipamento. Persistência e campos existentes preservados.
 */
function ProcessEquipmentDiagram({ category, params, onParamChange, productId }: {
 category: Category
 params: Record<string, string>
 onParamChange: (key: string, value: string) => void
 productId?: string
}) {
 if (category !== 'INJETADOS' && category !== 'PRENSADOS') return null
 const press = category === 'PRENSADOS'
 const fields = press
  ? [{key:'temp_plato_superior_c',label:'Platô superior',unit:'°C'},{key:'temperatura_molde_c',label:'Molde',unit:'°C'},{key:'temp_plato_inferior_c',label:'Platô inferior',unit:'°C'},{key:'pressao_prensagem_bar',label:'Pressão de prensagem',unit:'bar'},{key:'tempo_cura_seg',label:'Tempo de cura',unit:'s'}]
  : [{key:'zona1_c',label:'Zona 1 · alimentação',unit:'°C'},{key:'zona2_c',label:'Zona 2 · compressão',unit:'°C'},{key:'zona3_c',label:'Zona 3 · dosagem',unit:'°C'},{key:'zona4_c',label:'Zona 4 · frontal',unit:'°C'},{key:'temp_bico_c',label:'Bico de injeção',unit:'°C'},{key:'temp_molde_fixo_c',label:'Molde fixo',unit:'°C'},{key:'temp_molde_movel_c',label:'Molde móvel',unit:'°C'}]
 return <section className="pcp-process-diagram mt-3 overflow-hidden rounded-[2px] border border-[#CBD5E1] bg-white print:break-inside-avoid">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#123B50] px-3 py-2">
   <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white">FICHA VISUAL DE PROCESSO</p><h3 className="text-sm font-bold text-[#F4FBFD]">{press?'Prensa hidráulica · platôs, molde e pressão':'Injetora · canhão e perfil térmico'}</h3></div>
   <span className="rounded border border-[#48B7C7]/40 bg-[#071522]/70 px-2 py-1 text-[9px] font-semibold text-white">VALORES EDITÁVEIS SOBRE O DIAGRAMA</span>
  </div>
  <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(220px,1fr)]">
   <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-[#294456] bg-[radial-gradient(ellipse_at_center,_#123B50_0%,_#071522_75%)]">
    <svg viewBox="0 0 760 340" className="absolute inset-0 h-full w-full" role="img" aria-label={press?'Diagrama técnico da prensa hidráulica com platôs e manômetro':'Diagrama técnico do canhão da injetora com quatro zonas térmicas, bico e moldes'} preserveAspectRatio="xMidYMid meet">
     <defs>
      <linearGradient id="pcp-steel-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D9E7ED"/><stop offset="35%" stopColor="#66899B"/><stop offset="65%" stopColor="#294456"/><stop offset="100%" stopColor="#8DAFBE"/></linearGradient>
      <linearGradient id="pcp-heat-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2D8DB8"/><stop offset="50%" stopColor="#E6A34A"/><stop offset="100%" stopColor="#D65B61"/></linearGradient>
      <pattern id="pcp-technical-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#48B7C7" strokeOpacity=".08" strokeWidth="1"/></pattern>
     </defs>
     <rect width="760" height="340" fill="url(#pcp-technical-grid)"/>
     {press ? <g>
      <g stroke="#7FA5B6" strokeWidth="2" fill="url(#pcp-steel-grad)">
       <rect x="155" y="36" width="450" height="28" rx="3"/><rect x="178" y="60" width="22" height="236" rx="3"/><rect x="560" y="60" width="22" height="236" rx="3"/>
       <rect x="252" y="68" width="256" height="44" rx="4"/><rect x="348" y="18" width="64" height="53" rx="7"/>
       <rect x="238" y="126" width="284" height="24" rx="2"/><rect x="278" y="154" width="204" height="34" rx="2" fill="#2D8DB8"/>
       <rect x="258" y="193" width="244" height="30" rx="2"/><rect x="238" y="230" width="284" height="24" rx="2"/>
       <rect x="155" y="278" width="450" height="20" rx="3"/><rect x="112" y="298" width="536" height="17" rx="3"/>
      </g>
      <g fill="none" stroke="#E6A34A" strokeWidth="3"><path d="M290 171H470"/><path d="M290 206H470"/></g>
      <g stroke="#48B7C7" strokeWidth="3" fill="none"><path d="M605 258h32v-68h25"/><circle cx="684" cy="190" r="24"/><path d="M684 190l11 -11"/></g>
      <g fill="#A8BBC8" fontSize="12" fontWeight="700"><text x="30" y="45">CILINDRO</text><text x="30" y="60">HIDRÁULICO</text><path d="M120 52H340" stroke="#48B7C7" strokeDasharray="4 4"/><text x="28" y="150">PLATÔ</text><text x="28" y="165">SUPERIOR</text><path d="M125 158H236" stroke="#48B7C7" strokeDasharray="4 4"/><text x="30" y="211">MOLDE /</text><text x="30" y="226">CAVIDADE</text><path d="M130 218H255" stroke="#48B7C7" strokeDasharray="4 4"/><text x="30" y="266">PLATÔ</text><text x="30" y="281">INFERIOR</text><path d="M130 273H236" stroke="#48B7C7" strokeDasharray="4 4"/><text x="650" y="235">MANÔMETRO</text><text x="625" y="332">PRENSA · ESQUEMA TÉCNICO</text></g>
     </g> : <g>
      <g stroke="#7FA5B6" strokeWidth="2" fill="url(#pcp-steel-grad)">
       <path d="M72 95h72v-22h44v22h42v-22h44v22h42v-22h44v22h42v-22h44v22h52l28 26-28 26H72z"/>
       <rect x="75" y="105" width="365" height="37" rx="3" fill="#294456"/><rect x="90" y="112" width="325" height="22" rx="2" fill="url(#pcp-heat-grad)" stroke="#E6A34A"/>
       <path d="M440 105h44l40 18-40 18h-44z" fill="#66899B"/><path d="M524 123h50l30 12-30 12h-50z" fill="#D9E7ED"/>
       <path d="M116 70V40h65v30" fill="#294456"/><path d="M132 40V23h32v17" fill="#66899B"/>
       <rect x="84" y="158" width="355" height="17" rx="3"/><rect x="92" y="185" width="342" height="18" rx="3"/>
      </g>
      <g fill="#A8BBC8" fontSize="12" fontWeight="700"><text x="82" y="219">CANHÃO DE PLASTIFICAÇÃO</text><text x="82" y="238">ZONAS TÉRMICAS → BICO → MOLDE</text><text x="82" y="320">INJETORA · ESQUEMA TÉCNICO</text></g>
      <g stroke="#48B7C7" strokeWidth="1.5" strokeDasharray="4 4"><path d="M150 83V55"/><path d="M230 83V55"/><path d="M310 83V55"/><path d="M390 83V55"/></g>
     </g>}
    </svg>
    <div className="absolute inset-x-2 bottom-2 z-10 rounded-[2px] border border-white/20 bg-[#071522]/95 p-2 shadow-lg">
     <div className="mb-2 flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-wide text-white">{press?'Parâmetros da prensa':'Temperaturas editáveis · injetora'}</p><span className="text-[9px] font-semibold text-[#48B7C7]">EDITAR NA IMAGEM</span></div>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {fields.map(field=><label key={field.key} className="min-w-0">
       <span className="mb-1 block truncate text-[9px] font-bold text-[#D9E7ED]" title={field.label}>{field.label} ({field.unit})</span>
       <input type="number" step="0.1" inputMode="decimal" aria-label={field.label} className="h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-bold text-[#123B50] outline-none focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/30" value={params[field.key]??''} onChange={e=>onParamChange(field.key,e.target.value)} placeholder={field.unit==='°C'?'°C':field.unit}/>
      </label>)}
     </div>
    </div>
   </div>
  </div>
 </section>
}

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
 const [photoPreview, setPhotoPreview] = useState<string | null>(null)

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
  setError(''); setNotice('Ficha carregada para edição. Altere os campos e clique em “Atualizar ficha”.')
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
 const isEditing = rows.some(row => row.codigo_ficha === code)
 const selectedProduct = products.find(p => p.id === productId)
 const selectedTool = tools.find(t => t.id === toolId)
 const selectedMachine = machines.find(m => m.id === machineId)
 const singleResourceProcess = category !== 'ACABAMENTO' && category !== 'MONTAGEM_EMBALAGEM'
 const expectedPph = singleResourceProcess && Number(params.tempo_ciclo_seg) > 0 ? (3600 / Number(params.tempo_ciclo_seg)) * Math.max(1, Number(params.cavidades_ativas) || 1) : 0
 const fieldGroups = processParamGroups[category] ?? [{title:'Parâmetros técnicos do processo',keys:fields.map(field=>field.key)}]
 const assignedKeys = new Set(fieldGroups.flatMap(group=>group.keys))
 const diagramOwnedKeys = category === 'INJETADOS' ? new Set(['zona1_c','zona2_c','zona3_c','zona4_c','temp_bico_c','temp_molde_fixo_c','temp_molde_movel_c']) : category === 'PRENSADOS' ? new Set(['temp_plato_superior_c','temperatura_molde_c','temp_plato_inferior_c','pressao_prensagem_bar','tempo_cura_seg']) : new Set<string>()
 const parameterCards = [...fieldGroups.map(group=>({...group,fields:fields.filter(field=>group.keys.includes(field.key) && !diagramOwnedKeys.has(field.key))})).filter(group=>group.fields.length>0),...(fields.some(field=>!assignedKeys.has(field.key) && !diagramOwnedKeys.has(field.key))?[{title:'Parâmetros complementares',keys:[],fields:fields.filter(field=>!assignedKeys.has(field.key) && !diagramOwnedKeys.has(field.key))}]:[])]
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
 const pressCharge = Number(params.peso_carga_cavidade_g)>0&&Number(params.cavidades_ativas)>0?Number(params.peso_carga_cavidade_g)*Number(params.cavidades_ativas):null

 return <main className="pcp-process-page min-h-screen bg-[#F8FAFC] p-2 text-[#123B50] md:p-3">
  <div className="mx-auto max-w-[1650px]">
   <header className="mb-3 flex flex-wrap items-center gap-3 rounded-[2px] border border-slate-200 bg-white p-2.5 shadow-[0_3px_12px_rgba(18,59,80,0.07)]">
    <span className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#48B7C7]/50 bg-[#123B50] text-[#48B7C7]"><Factory size={20}/></span>
    <div className="min-w-[240px]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#48B7C7]">SYSNQRA SISTEMAS INDUSTRIAIS · SGQ / IT-PCP-001</p><h1 className="text-base font-black leading-5 md:text-lg">{category==='INJETADOS'?'Ficha técnica de processo — Injetados':category==='PRENSADOS'?'Ficha hidráulica de processo — Prensados':`Ficha de processo — ${categories.find(item=>item.value===category)?.label??category}`}</h1><p className="text-xs text-white">Parâmetros homologados, preparação, capacidade e rastreabilidade de revisão.</p></div>
    <div className="ml-auto grid min-w-[260px] flex-1 grid-cols-3 gap-2 md:max-w-[430px]">{[{label:'Documento',value:code||'Novo documento'},{label:'Revisão',value:version.padStart(2,'0')},{label:'Status',value:status}].map(item=><div key={item.label} className="rounded-lg border border-[#294456] bg-[#071522] px-3 py-2"><span className="block text-[10px] text-white">{item.label}</span><strong className={`mt-0.5 block truncate text-sm ${item.label==='Status'&&['APROVADA','LIBERADA'].includes(status)?'text-[#3A9D78]':'text-[#F4FBFD]'}`}>{item.value}</strong></div>)}</div>
    <div className="flex w-full flex-wrap justify-end gap-2 print:hidden">{productId&&<a href={`/engenharia/bom?produto=${encodeURIComponent(productId)}`} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#123B50] px-3 text-[10px] font-black uppercase tracking-wider text-[#48B7C7] transition-colors hover:bg-[#2D8DB8] hover:text-white"><ExternalLink size={13}/> Ficha de Engenharia</a>}<button className="erp-premium-button erp-premium-button-secondary" type="button" onClick={()=>{if(!rows.some(row=>row.codigo_ficha===code)){setError('Abra uma ficha existente na lista para editar.');return}setNotice('Ficha pronta para edição. Altere os campos e clique em Atualizar ficha.')}}><FileSliders size={14}/> Editar ficha</button><button className="erp-premium-button erp-premium-button-secondary" type="button" onClick={()=>window.print()}><Printer size={14}/> Imprimir ficha</button><button className="erp-premium-button erp-premium-button-secondary" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Recarregar lista</button><button className="erp-premium-button" type="button" onClick={()=>{setCode('');setProductId('');setToolId('');setMachineId('');setVersion('1');setApprovedAt('');setSignature('');setStatus('RASCUNHO');setParams(blankParameters(category));setInstructions('');setSearchParams({tipo:category});setNotice('Nova ficha pronta para preencher. Preencha os campos agrupados e grave a ficha.');setError('')}}>Nova ficha</button></div>
   </header>
   {error && <div role="alert" className="mb-3 rounded-lg border border-[#D65B61]/50 bg-[#D65B61]/10 p-3 text-sm text-[#F4B8BB]">{error}</div>}
   {notice && <div role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-[#3A9D78]/40 bg-[#3A9D78]/10 p-3 text-sm text-[#8ED0B4]"><CheckCircle2 size={16}/>{notice}</div>}
   <section className="mb-3 rounded-[2px] border border-slate-200 bg-white p-2.5 shadow-sm print:hidden">
    <div className="mb-3 grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="min-w-0"><span className={labelClass}>Pesquisar ficha / produto</span><span className="relative block max-w-[240px]"><Search size={15} className="absolute left-2.5 top-2 text-white"/><input className={inputClass+' max-w-[240px] pl-8'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código ou produto"/></span></label><label className="min-w-0"><span className={labelClass}>Modelo da ficha</span><select className={inputClass+' max-w-[210px]'} value={category} onChange={e=>{const next=e.target.value as Category;setCategory(next);setParams(blankParameters(next));setSearchParams({tipo:next})}}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label></div>
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">{visibleRows.map(row=><button key={row.id} type="button" onClick={()=>openRow(row)} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#294456] bg-[#071522] px-3 text-left transition hover:border-[#48B7C7] hover:bg-[#123B50]"><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#F4FBFD]">{row.codigo_ficha} · {products.find(p=>p.id===row.produto_id)?.codigo ?? 'Produto'}</span><span className="block truncate text-[11px] text-white">{categories.find(c=>c.value===row.categoria_processo)?.label ?? row.categoria_processo} · revisão {row.versao_ficha ?? row.revisao} · {row.status}</span></span><span className="text-xs font-semibold text-white">Abrir ficha →</span></button>)}</div>
   </section>
   <section className="pcp-ficha-print-sheet rounded-[2px] border border-[#2E4A62] bg-[#0D2638] p-3 shadow-lg shadow-black/10 print:border-0 print:p-0"><div className="mb-3 hidden border-b border-slate-400 pb-2 print:block"><h1 className="text-base font-bold">FICHA TÉCNICA DE PROCESSO INDUSTRIAL</h1><p className="text-[10px]">Documento operacional para consulta e assinatura no posto de trabalho.</p></div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#2E4A62] pb-3 print:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#48B7C7]">{category==='INJETADOS'?'PROCESSO · INJEÇÃO TERMOPLÁSTICA':category==='PRENSADOS'?'PROCESSO · PRENSAGEM HIDRÁULICA E VULCANIZAÇÃO':'PROCESSO · '+(categories.find(item=>item.value===category)?.label||category)}</p><h2 className="mt-1 text-lg font-semibold text-[#F4FBFD]">{selectedProduct?selectedProduct.nome:'Selecione o produto da ficha'}</h2><p className="text-xs text-white">{selectedProduct?`${selectedProduct.codigo} · ${selectedTool?.codigo??'sem ferramental'} · ${selectedMachine?.codigo??'sem máquina vinculada'}`:'A ficha salva usará os cadastros reais da empresa.'}</p></div><span className="rounded-[2px] border border-[#48B7C7]/50 bg-[#123B50] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#48B7C7]">{status}</span></div>
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
     <label><span className={labelClass}>ID / código da ficha</span><input className={inputClass} value={code} onChange={e=>setCode(e.target.value)} required/></label>
     <label className="min-w-0"><span className={labelClass}>Produto vinculado</span><select className={inputClass} value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
     <label className="min-w-0"><span className={labelClass}>Molde / ferramental</span><select className={inputClass} value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">Não aplicável</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} · {t.nome}</option>)}</select></label>
     <label className="min-w-0"><span className={labelClass}>Máquina / recurso industrial</span><select className={inputClass} value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
     <label className="min-w-0"><span className={labelClass}>Versão da ficha</span><input className={inputClass+' max-w-[76px]'} style={{width:76,maxWidth:76}} type="number" min="1" step="1" value={version} onChange={e=>setVersion(e.target.value)} required/></label>
     <label className="min-w-0"><span className={labelClass}>Data de homologação</span><input className={inputClass+' max-w-[140px]'} style={{width:140,maxWidth:140}} type="date" value={approvedAt} onChange={e=>setApprovedAt(e.target.value)}/></label>
     <label className="xl:col-span-2"><span className={labelClass}>Assinatura técnica do engenheiro</span><input className={inputClass} value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Nome completo / registro profissional"/></label>
     <label><span className={labelClass}>Estado da ficha</span><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option>RASCUNHO</option><option>EM_ANALISE</option><option>APROVADA</option><option>LIBERADA</option><option>OBSOLETA</option></select></label>
    </div>
    <div className="pcp-equipment-top grid min-w-0 grid-cols-1 items-stretch gap-3 xl:grid-cols-12">
     <div className="min-w-0 xl:col-span-7"><ProcessEquipmentDiagram category={category} params={params} productId={productId} onParamChange={(key,value)=>setParams(current=>({...current,[key]:value}))}/></div>
     <div className="pcp-photo-pair grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:col-span-5">
      <PCPMoldPhotoPanel productId={productId}/>
      <PCPMachinePhotoPanel machineId={machineId}/>
     </div>
    </div>
    <div className="pcp-parameter-cards mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
     {parameterCards.map(group=><article key={group.title} className="rounded-[2px] border border-[#2E4A62] bg-[#0E1E2F] p-2.5">
      <h3 className="mb-2 border-b border-[#2E4A62] pb-2 text-[10px] font-black uppercase tracking-wide text-[#48B7C7]">{group.title}</h3>
      <div className="pcp-parameter-fields flex min-w-0 flex-col gap-2">
       {group.fields.map(field=><label key={field.key} className={'min-w-0 '+(field.multiline?'sm:col-span-2':'')}>
        <span className={labelClass}>{field.label} {field.required&&<span className="text-[#D65B61]">*</span>}</span>
        <span className="flex min-w-0 items-start">
         {field.type==='select'
          ? <select className={inputClass+' w-full min-w-0 max-w-none rounded-r-none'} style={{width:'100%',maxWidth:'none',flex:'1 1 auto'}} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)}><option value="">Selecione</option>{(field.options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>
          : field.multiline
           ? <textarea className={inputClass+' min-h-[76px] w-full min-w-0 max-w-none resize-y rounded-r-none py-2'} style={{width:'100%',maxWidth:'none',flex:'1 1 auto'}} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)} placeholder="Registrar instruções aprovadas"/>
           : <input className={inputClass+' w-full min-w-0 max-w-none rounded-r-none'} style={{width:'100%',maxWidth:'none',flex:'1 1 auto'}} type={field.type==='number'?'number':'text'} step={field.step} value={params[field.key]??''} onChange={event=>updateParam(field.key,event.target.value)} placeholder={field.unit==='—'?'Informar':field.unit}/>}
         <span className="flex min-h-[30px] min-w-[46px] shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[#294456] bg-[#123B50] px-1.5 text-[10px] text-white">{field.unit}</span>
        </span>
       </label>)}
      </div>
     </article>)}
    </div>

     {category==='MONTAGEM_EMBALAGEM'&&<section className="mt-4 rounded-lg border border-[#294456] bg-[#071522] p-3 print:break-inside-avoid"><div className="mb-3 border-b border-[#294456] pb-2"><p className="text-[10px] font-bold uppercase tracking-wide text-white">REGISTRO VISUAL DA EMBALAGEM</p><h3 className="text-sm font-bold text-white">Fotos de montagem da caixa</h3><p className="mt-1 text-xs text-white">Quatro registros: montagem da caixa, acondicionamento, etiqueta e paletização. Clique na foto para ampliar; em celulares, você pode usar a câmera.</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(n=>{const key='foto_montagem_'+n;const src=params[key]||'';return <div key={key} className="flex min-h-[150px] flex-col rounded border border-dashed border-[#48B7C7]/70 bg-[#0D2638] p-2 text-center">{src?<button type="button" className="h-[112px] w-full overflow-hidden rounded bg-white" onClick={()=>setPhotoPreview(src)}><img src={src} alt={'Foto de montagem da embalagem '+n} className="h-full w-full object-contain"/></button>:<label className="flex h-[112px] cursor-pointer items-center justify-center rounded bg-[#123B50] text-xs text-white">Adicionar foto {n}<input className="hidden" type="file" accept="image/*" capture="environment" onChange={event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1280/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);updateParam(key,canvas.toDataURL('image/jpeg',0.72))};image.src=String(reader.result||'')};reader.readAsDataURL(file)}}/></label>}<span className="mt-2 text-[10px] font-bold text-white">{['Montagem da caixa','Acondicionamento','Etiqueta / identificação','Paletização'][n-1]}</span>{src&&<><button type="button" className="mt-1 text-[10px] text-white underline" onClick={()=>setPhotoPreview(src)}>Ampliar foto</button><label className="mt-1 cursor-pointer text-[10px] text-white underline">Trocar foto<input className="hidden" type="file" accept="image/*" capture="environment" onChange={event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1280/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);updateParam(key,canvas.toDataURL('image/jpeg',0.72))};image.src=String(reader.result||'')};reader.readAsDataURL(file)}}/></label></>}</div>})}</div></section>}
     {photoPreview&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 print:hidden" role="dialog" aria-modal="true" aria-label="Foto ampliada" onClick={()=>setPhotoPreview(null)}><div className="relative max-h-[90vh] max-w-[92vw] rounded-lg border border-[#48B7C7] bg-white p-3" onClick={e=>e.stopPropagation()}><button className="mb-2 rounded bg-[#123B50] px-3 py-1 text-xs font-bold text-white" type="button" onClick={()=>setPhotoPreview(null)}>Fechar</button><img src={photoPreview} alt="Foto de montagem ampliada" className="max-h-[78vh] max-w-[88vw] object-contain"/></div></div>}
    {summaryPanels.length>0&&<div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">{summaryPanels.map((panel,index)=><article key={panel.title} className="overflow-hidden rounded-lg border border-[#294456] bg-[#071522]"><h3 className={`border-b border-[#294456] px-3 py-2 text-xs font-bold ${index===0?'bg-[#123B50] text-[#F4FBFD]':'text-white'}`}>{panel.title}</h3><dl className="divide-y divide-[#294456] px-3">{panel.items.map(([label,value])=><div key={label} className="flex min-h-9 items-center justify-between gap-3 py-1.5 text-xs"><dt className="text-white">{label}</dt><dd className="text-right font-semibold text-[#F4FBFD]">{value}</dd></div>)}</dl></article>)}</div>}
    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
     <article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Identificação e componentes</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-white">Documento</dt><dd className="font-semibold">{code||'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Produto</dt><dd className="text-right font-semibold">{selectedProduct?`${selectedProduct.codigo} · ${selectedProduct.nome}`:'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Ferramental / máquina</dt><dd className="text-right font-semibold">{selectedTool?.codigo??'—'} / {selectedMachine?.codigo??'—'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Cavidades ativas</dt><dd className="font-semibold">{valueLabel('cavidades_ativas','cav.')}</dd></div></dl></article>
     {category==='PRENSADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Matéria-prima e carga</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-white">Composto</dt><dd className="text-right font-semibold">{valueLabel('composto_material')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Dureza</dt><dd className="font-semibold">{valueLabel('dureza_shore_a','Shore A')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Carga / cavidade</dt><dd className="font-semibold">{valueLabel('peso_carga_cavidade_g','g')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Carga total calculada</dt><dd className="font-semibold">{pressCharge===null?'—':`${pressCharge.toLocaleString('pt-BR',{maximumFractionDigits:3})} g`}</dd></div></dl></article>:<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Material e preparação</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-white">Ciclo padrão</dt><dd className="font-semibold">{valueLabel('tempo_ciclo_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Setup</dt><dd className="font-semibold">{valueLabel('tempo_setup_min','min')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Capacidade nominal</dt><dd className="font-semibold">{expectedPph>0?`${expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})} peças/h`:'—'}</dd></div></dl></article>}
     {category==='INJETADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Tempos do ciclo</h3>{[{label:'Injeção',key:'tempo_injecao_seg'},{label:'Recalque',key:'tempo_recalque_seg'},{label:'Resfriamento',key:'tempo_resfriamento_seg'},{label:'Ciclo total',key:'tempo_ciclo_seg'}].map(item=><div key={item.key} className="mt-2"><div className="flex justify-between gap-2 text-xs"><span className="text-white">{item.label}</span><strong>{valueLabel(item.key,'s')}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-[#294456]"><i className="block h-full rounded bg-[#3A9D78]" style={{width:Number(params[item.key])>0&&Number(params.tempo_ciclo_seg)>0?`${Math.max(4,Math.min(100,Number(params[item.key])/Number(params.tempo_ciclo_seg)*100))}%`:'0%'}}/></div></div>)}</article>:category==='PRENSADOS'?<article className="rounded-lg border border-[#294456] bg-[#071522] p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#F4FBFD]">Cura e parâmetros da prensa</h3><dl className="mt-2 divide-y divide-[#294456] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-white">Pré-aquecimento</dt><dd className="font-semibold">{valueLabel('tempo_pre_aquecimento_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Cura / vulcanização</dt><dd className="font-semibold">{valueLabel('tempo_cura_seg','s')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Pressão de trabalho</dt><dd className="font-semibold">{valueLabel('pressao_prensagem_bar','bar')}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-white">Força recomendada</dt><dd className="font-semibold">{valueLabel('forca_fechamento_recomendada_ton','ton')}</dd></div></dl></article>:null}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#294456] bg-[#071522] px-3 py-3"><span className="text-[10px] font-bold uppercase tracking-wide text-white">{singleResourceProcess?'Capacidade nominal de saída':'Planejamento do roteiro'}</span><strong className="text-lg tabular-nums text-white">{singleResourceProcess?(expectedPph>0?expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})+' peças/h':'Informe ciclo e cavidades'):'Fluxo multiposto — definir operações e recursos no PCP'}</strong><span className="text-xs text-white">{singleResourceProcess?'Cálculo: 3.600 ÷ ciclo (s) × cavidades ativas; sem aplicar eficiência ou paradas.':'Esta ficha não é usada como ciclo único de máquina, evitando estimativa incorreta para etapas distintas.'}</span></div>
    {(category==='ACABAMENTO'||category==='MONTAGEM_EMBALAGEM')&&<section className="mt-4 rounded-lg border border-[#294456] bg-[#071522] p-3"><div className="mb-3 border-b border-[#294456] pb-2"><p className="text-[10px] font-bold uppercase tracking-wide text-white">VISUALIZAÇÃO OPERACIONAL</p><h3 className="text-sm font-bold text-[#F4FBFD]">{category==='ACABAMENTO'?'Roteiro de acabamento por posto':'Fluxo de embalagem e paletização'}</h3><p className="mt-1 text-xs text-white">A prévia reflete os dados preenchidos abaixo; campos sem definição aparecem como “Não informado”.</p></div>{category==='ACABAMENTO'?<div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{[{title:'1. Inspeção visual e separação de canais',post:'acabamento_inspecao_posto',sector:'acabamento_inspecao_setor',time:'acabamento_inspecao_tempo',timeUnit:'s/pc',checklist:'acabamento_inspecao_checklist',reference:'acabamento_inspecao_referencia'},{title:'2. Rebarbação manual',post:'acabamento_rebarba_posto',sector:'acabamento_rebarba_setor',time:'acabamento_rebarba_tempo',timeUnit:'s/pc',checklist:'acabamento_rebarba_checklist',reference:'acabamento_rebarba_referencia'},{title:'3. Limpeza e lubrificação',post:'acabamento_limpeza_posto',sector:'acabamento_limpeza_setor',time:'acabamento_limpeza_tempo',timeUnit:'s/lote',checklist:'acabamento_limpeza_checklist',reference:'acabamento_limpeza_referencia'},{title:'4. Embalagem e etiquetagem',post:'acabamento_embalagem_posto',sector:'acabamento_embalagem_setor',time:'acabamento_embalagem_tempo',timeUnit:'s/pc',checklist:'acabamento_embalagem_checklist',reference:'acabamento_embalagem_referencia'}].map((stage,index)=><article key={stage.title} className="flex min-h-[230px] flex-col rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className={`min-h-10 border-b border-[#294456] pb-2 text-xs font-bold ${index===0?'bg-gradient-to-r from-[#2D8DB8]/20 to-transparent text-white':'text-[#F4FBFD]'}`}>{stage.title}</h4><dl className="mt-2 space-y-2 text-xs"><div><dt className="text-white">Máquina / posto</dt><dd className="font-medium">{valueLabel(stage.post)}</dd></div><div><dt className="text-white">Setor</dt><dd className="font-medium">{valueLabel(stage.sector)}</dd></div><div><dt className="text-white">Tempo de preparação</dt><dd className="font-medium">{valueLabel(stage.time,stage.timeUnit)}</dd></div><div><dt className="text-white">Checklist</dt><dd className="whitespace-pre-line font-medium">{valueLabel(stage.checklist)}</dd></div><div className="mt-auto border-t border-[#294456] pt-2"><dt className="text-white">Documento de referência</dt><dd className="font-medium">{valueLabel(stage.reference)}</dd></div></dl></article>)}</div>:<div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">1. Embalagem em saco plástico / contagem</h4><dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{[['Embalagem plástica','aplica_embalagem_plastica'],['Amostragem base','emb_amostragem_base'],['Código da balança','emb_codigo_balanca'],['Dimensional do saco','emb_dimensional_saco'],['Peças por saco','emb_quantidade_pecas_saco'],['Peso pacote cheio','emb_peso_pacote_cheio_g']].map(([label,key])=><div key={key}><dt className="text-white">{label}</dt><dd className="font-medium">{valueLabel(key)}</dd></div>)}</dl></article><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">2. Embalagem em caixa de papelão</h4><dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{[['Sacos por caixa','emb_sacos_caixa'],['Peças diretas por caixa','emb_pecas_direto_caixa'],['Dimensional da caixa','emb_dimensional_caixa'],['Referência de montagem','emb_caixa_modelo']].map(([label,key])=><div key={key}><dt className="text-white">{label}</dt><dd className="font-medium">{valueLabel(key)}</dd></div>)}</dl></article><article className="rounded-lg border border-[#294456] bg-[#0D2638] p-3 xl:col-span-2"><h4 className="border-b border-[#294456] pb-2 text-xs font-bold text-[#F4FBFD]">3. Roteiro de montagem, etiqueta e paletização</h4><dl className="mt-2 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">{[['Disposição das peças','emb_disposicao_pecas'],['Instruções de montagem','emb_instrucao_montagem'],['Etiqueta e identificação','emb_instrucao_etiqueta'],['Padrão de paletização','emb_instrucao_paletizacao'],['Critérios de liberação','emb_criterio_liberacao']].map(([label,key])=><div key={key}><dt className="text-white">{label}</dt><dd className="whitespace-pre-line font-medium">{valueLabel(key)}</dd></div>)}</dl></article></div>}</section>}
    <label className="mt-4 block"><span className={labelClass}>Instruções de setup / processo / segurança</span><textarea className="min-h-[100px] w-full rounded-md border border-[#294456] bg-[#071522] p-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Sequência operacional, parâmetros de controle, inspeção inicial, reação a desvio, EPI e cuidados ambientais…"/></label>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#2E4A62] pt-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[#A8BBC8]">Dados por empresa · revisão técnica · sem valores fictícios</span><button className="erp-premium-button print:hidden" type="button" onClick={()=>void save()} disabled={busy}><Save size={14}/>{busy?'Salvando…':isEditing?'Atualizar ficha':'Gravar ficha'}</button></div>
   </section>
   <footer className="mt-3 flex items-center gap-2 border-t border-[#2E4A62] pt-3 text-[10px] text-[#A8BBC8] print:hidden"><CalendarRange size={14}/>{singleResourceProcess?'O PCP estima a duração a partir da ficha liberada, capacidade, ciclo e setup; datas continuam sujeitas ao calendário de recursos.':'Para programar este roteiro multiposto, cadastre as operações e recursos correspondentes no roteiro do PCP; ele não será aplicado como ciclo de uma única máquina.'}</footer>
  </div>
 <style>{`@media screen{.pcp-process-page{background:#F8FAFC!important;color:#123B50!important}.pcp-process-page [class*="bg-[#071522]"],.pcp-process-page [class*="bg-[#0D2638]"],.pcp-process-page [class*="bg-[#0E1E2F]"]{background:#FFFFFF!important}.pcp-process-page [class*="bg-[#123B50]"]{background:#EAF4F8!important}.pcp-process-page [class*="border-[#2E4A62]"],.pcp-process-page [class*="border-[#294456]"]{border-color:#CBD5E1!important}.pcp-process-page .text-white{color:#123B50!important}.pcp-process-page [class*="text-[#F4FBFD]"]{color:#123B50!important}.pcp-process-page [class*="text-[#A8BBC8]"]{color:#475569!important}.pcp-process-page input:not([type="file"]),.pcp-process-page select,.pcp-process-page textarea{background:#FFFFFF!important;color:#123B50!important;border-color:#CBD5E1!important;caret-color:#123B50!important}.pcp-process-page input::placeholder,.pcp-process-page textarea::placeholder{color:#64748B!important}.pcp-process-diagram .text-white{color:#FFFFFF!important}.pcp-process-diagram [class*="bg-[#071522]"]{background:#071522!important}.pcp-process-diagram [class*="bg-[#0D2638]"]{background:#0D2638!important}.pcp-process-diagram [class*="bg-[#123B50]"]{background:#123B50!important}}@page{size:A4 portrait;margin:10mm}@media print{html,body,#root{background:#fff!important;color:#111!important;margin:0!important;padding:0!important}.pcp-process-page{background:#fff!important;color:#111!important;padding:0!important}.pcp-process-page .print\\:hidden{display:none!important}.pcp-ficha-print-sheet{width:100%!important;max-width:none!important;background:#fff!important;color:#111!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important;overflow:visible!important}.pcp-ficha-print-sheet,.pcp-ficha-print-sheet article,.pcp-ficha-print-sheet div,.pcp-ficha-print-sheet section{background:#fff!important;color:#111!important;border-color:#777!important;box-shadow:none!important}.pcp-ficha-print-sheet input,.pcp-ficha-print-sheet select,.pcp-ficha-print-sheet textarea{color:#111!important;background:#fff!important;border:1px solid #777!important;box-shadow:none!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.pcp-ficha-print-sheet label,.pcp-ficha-print-sheet article{break-inside:avoid}.pcp-ficha-print-sheet button{display:none!important}.pcp-ficha-print-sheet span,.pcp-ficha-print-sheet dt,.pcp-ficha-print-sheet p,.pcp-ficha-print-sheet h1,.pcp-ficha-print-sheet h2,.pcp-ficha-print-sheet h3{color:#111!important}.pcp-ficha-print-sheet img{max-width:100%!important;max-height:65mm!important;object-fit:contain!important}
      .pcp-process-page .pcp-equipment-top{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}
      .pcp-process-page .pcp-photo-pair{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
      .pcp-process-page .pcp-parameter-cards{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
      .pcp-process-page .pcp-parameter-fields{display:flex!important;flex-direction:column!important;gap:8px!important}
      .pcp-process-page .pcp-parameter-fields input,.pcp-process-page .pcp-parameter-fields select,.pcp-process-page .pcp-parameter-fields textarea{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important}
      .pcp-process-page .pcp-parameter-cards article{min-width:0!important;box-shadow:0 4px 20px rgba(0,0,0,.04)!important;border-radius:2px!important}
      @media(min-width:1024px){.pcp-process-page .pcp-equipment-top{grid-template-columns:minmax(0,7fr) minmax(0,5fr)!important}.pcp-process-page .pcp-photo-pair{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pcp-process-page .pcp-parameter-cards{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(max-width:1023px){.pcp-process-page .pcp-parameter-cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:639px){.pcp-process-page .pcp-parameter-cards,.pcp-process-page .pcp-photo-pair{grid-template-columns:minmax(0,1fr)!important}}}'`}</style>
  </main>
}