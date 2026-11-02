/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP & ENGENHARIA DE MANUFATURA
 * Módulo: Fichas de Processo Industrial (Injetados & Prensados)
 * Arquivo: src/pages/PCPFichasProcesso.tsx
 * 
 * Melhorias implementadas:
 * 1. Identidade e marca oficial: SYSNQRA SISTEMAS INDUSTRIAIS (SGQ / IT-PCP-001).
 * 2. Integração direta com Ficha de Engenharia (/ficha-engenharia?produto={id}).
 * 3. Diagramas técnicos interativos com setpoints de temperatura editáveis diretamente na imagem do equipamento.
 * 4. Foco prioritário em INJETADOS (Injeção Termoplástica) e PRENSADOS (Prensas & Vulcanização).
 * 5. Remoção total de campos duplicados entre diagrama interativo e cartões técnicos.
 * 6. Painel visual do molde a ser produzido (PCPMoldPhotoPanel) com suporte a foto técnica sem repetições.
 * 7. Padrão visual industrial compacto (inputs 30px, labels 9px uppercase, paleta Steel/Navy #0E1E2F/#123B50/#48B7C7).
 * 8. Impressão A4 técnica formatada para prancheta de chão de fábrica.
 * =========================================================================
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-FICHA-PROCESSO-20261101-01 — código da ficha de processo enviado pelo proprietário
 * instalado como versão oficial da rota /pcp/fichas-processo, convertido para o padrão claro do ERP
 * (contrato de ação 30px, dourado no estado ativo, sem fundo navy), com o link morto de engenharia
 * corrigido e as DUAS FOTOS DA MATÉRIA-PRIMA da ficha modelo FPT-JJ-034/1 (TATTO PLASTIC).
 * @STATUS_APROVACAO: Para gravar ACABAMENTO e MONTAGEM_EMBALAGEM o banco precisa ter a migração
 * 20261017140000_pcp_fichas_acabamento_embalagem.sql aplicada (libera o CHECK de categoria).
 * As fotos da matéria-prima não exigem migração: são caminhos guardados em parametros_tecnicos.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarRange,
  Camera,
  CheckCircle2,
  ExternalLink,
  Factory,
  Flame,
  ImagePlus,
  Layers,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import PCPMoldPhotoPanel from '../../components/PCPMoldPhotoPanel'

type Product = { id: string; codigo: string; nome: string }
type Tool = { id: string; codigo: string; nome: string; tipo: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
export type Category =
  | 'INJETADOS'
  | 'PRENSADOS'
  | 'ESTAMPARIA'
  | 'MECANICA'
  | 'TRATAMENTO_SUPERFICIAL'
  | 'PINTURA_QUIMICA'
  | 'CORTE_VINCO'
  | 'ACABAMENTO'
  | 'MONTAGEM_EMBALAGEM'

export type Param = {
  key: string
  label: string
  unit: string
  type?: 'number' | 'text' | 'select'
  required?: boolean
  step?: string
  multiline?: boolean
  options?: string[]
}

type Saved = {
  id: string
  codigo_ficha: string
  produto_id: string
  ferramenta_id?: string | null
  maquina_id?: string | null
  categoria_processo: Category
  versao_ficha: number
  status: string
  data_homologacao?: string | null
  assinatura_tecnica?: string | null
  parametros_tecnicos: Record<string, unknown>
  revisao?: number
}

export const categories: { value: Category; label: string; badge?: string }[] = [
  { value: 'INJETADOS', label: 'Injetados (Termoplásticos)', badge: 'Canhão & Molde' },
  { value: 'PRENSADOS', label: 'Prensados (Vulcanização / Borracha)', badge: 'Platôs & Cura' },
  { value: 'ESTAMPARIA', label: 'Estampos / Estamparia' },
  { value: 'MECANICA', label: 'Usinagem & Mecânica' },
  { value: 'TRATAMENTO_SUPERFICIAL', label: 'Tratamento Superficial' },
  { value: 'PINTURA_QUIMICA', label: 'Pintura & Química' },
  { value: 'CORTE_VINCO', label: 'Corte e Vinco' },
  { value: 'ACABAMENTO', label: 'Acabamento Unificado' },
  { value: 'MONTAGEM_EMBALAGEM', label: 'Montagem & Embalagem' },
]

const common: Param[] = [
  { key: 'tempo_ciclo_seg', label: 'Tempo de ciclo padrão', unit: 's', type: 'number', step: '0.01', required: true },
  { key: 'velocidade_dosagem_curso', label: 'Velocidade de dosagem / curso', unit: 'mm/s', type: 'number', step: '0.01' },
  { key: 'altura_molde_mm', label: 'Altura do molde fechado', unit: 'mm', type: 'number', step: '0.01' },
  { key: 'tipo_fixacao', label: 'Tipo de fixação do molde', unit: '—', type: 'text' },
  { key: 'torque_aperto_nm', label: 'Torque de aperto dos grampos', unit: 'N·m', type: 'number', step: '0.1' },
  { key: 'tipo_refrigeracao', label: 'Circuito de refrigeração', unit: '—', type: 'text' },
  { key: 'vazao_refrigeracao_l_min', label: 'Vazão de refrigeração', unit: 'L/min', type: 'number', step: '0.1' },
  { key: 'tempo_setup_min', label: 'Tempo padrão de setup', unit: 'min', type: 'number', step: '0.1' },
  { key: 'tempo_limpeza_min', label: 'Tempo de purga / limpeza', unit: 'min', type: 'number', step: '0.1' },
  { key: 'seguranca_ppe', label: 'EPI e segurança obrigatórios', unit: '—', type: 'text' },
]

const injection: Param[] = [
  { key: 'forca_fechamento_ton', label: 'Força de fechamento', unit: 'ton', type: 'number', step: '0.1', required: true },
  { key: 'pressao_injecao_bar', label: 'Pressão de injeção', unit: 'bar', type: 'number', step: '0.1' },
  { key: 'pressao_recalque_bar', label: 'Pressão de recalque', unit: 'bar', type: 'number', step: '0.1' },
  { key: 'velocidade_injecao_mm_s', label: 'Velocidade de injeção', unit: 'mm/s', type: 'number', step: '0.1' },
  { key: 'tempo_injecao_seg', label: 'Tempo de injeção', unit: 's', type: 'number', step: '0.01' },
  { key: 'tempo_recalque_seg', label: 'Tempo de recalque', unit: 's', type: 'number', step: '0.01' },
  { key: 'pressao_contrapressao_bar', label: 'Contrapressão de dosagem', unit: 'bar', type: 'number', step: '0.1' },
  { key: 'rpm_rosca', label: 'Rotação da rosca', unit: 'rpm', type: 'number', step: '1' },
  { key: 'posicao_dosagem_mm', label: 'Posição de dosagem (curso)', unit: 'mm', type: 'number', step: '0.1' },
  { key: 'posicao_comutacao_mm', label: 'Posição de comutação / almofada', unit: 'mm', type: 'number', step: '0.1' },
  // Zonas de temperatura vinculadas ao diagrama interativo
  { key: 'temp_bico_c', label: 'Temperatura do bico', unit: '°C', type: 'number', step: '0.1' },
  { key: 'zona1_c', label: 'Temperatura zona 1 (Alimentação)', unit: '°C', type: 'number', step: '0.1' },
  { key: 'zona2_c', label: 'Temperatura zona 2 (Compressão)', unit: '°C', type: 'number', step: '0.1' },
  { key: 'zona3_c', label: 'Temperatura zona 3 (Dosagem)', unit: '°C', type: 'number', step: '0.1' },
  { key: 'zona4_c', label: 'Temperatura zona 4 (Frontal)', unit: '°C', type: 'number', step: '0.1' },
  { key: 'temp_molde_fixo_c', label: 'Temperatura molde fixo', unit: '°C', type: 'number', step: '0.1' },
  { key: 'temp_molde_movel_c', label: 'Temperatura molde móvel', unit: '°C', type: 'number', step: '0.1' },
  { key: 'tempo_resfriamento_seg', label: 'Tempo de resfriamento', unit: 's', type: 'number', step: '0.01' },
  { key: 'material_polimero', label: 'Material / polímero cadastrado', unit: '—', type: 'text', required: true },
  { key: 'temperatura_secagem_c', label: 'Temperatura de secagem / estufa', unit: '°C', type: 'number', step: '0.1' },
  { key: 'tempo_secagem_h', label: 'Tempo de secagem', unit: 'h', type: 'number', step: '0.1' },
  { key: 'cavidades_ativas', label: 'Cavidades ativas', unit: 'un', type: 'number', step: '1', required: true },
  { key: 'peso_peca_g', label: 'Peso líquido da peça', unit: 'g', type: 'number', step: '0.001' },
  { key: 'peso_canal_g', label: 'Peso de canal / galho', unit: 'g', type: 'number', step: '0.001' },
]

const press: Param[] = [
  { key: 'tonelagem_prensa', label: 'Tonelagem requerida', unit: 'ton', type: 'number', step: '0.1', required: true },
  { key: 'pressao_prensagem_bar', label: 'Pressão de prensagem', unit: 'bar', type: 'number', step: '0.1' },
  { key: 'temp_plato_superior_c', label: 'Temperatura platô superior', unit: '°C', type: 'number', step: '0.1' },
  { key: 'temp_plato_inferior_c', label: 'Temperatura platô inferior', unit: '°C', type: 'number', step: '0.1' },
  { key: 'tolerancia_temp_platos_c', label: 'Tolerância dos platôs', unit: '±°C', type: 'number', step: '0.1' },
  { key: 'temperatura_molde_c', label: 'Temperatura do molde', unit: '°C', type: 'number', step: '0.1' },
  { key: 'tempo_cura_seg', label: 'Tempo de cura / vulcanização', unit: 's', type: 'number', step: '0.1' },
  { key: 'tempo_pos_cura_min', label: 'Tempo de pós-cura em estufa', unit: 'min', type: 'number', step: '0.1' },
  { key: 'composto_material', label: 'Composto / elastômero', unit: '—', type: 'text', required: true },
  { key: 'dureza_shore_a', label: 'Dureza especificada', unit: 'Shore A', type: 'number', step: '1' },
  { key: 'peso_carga_cavidade_g', label: 'Peso da carga por cavidade', unit: 'g', type: 'number', step: '0.001' },
  { key: 'peso_total_carga_g', label: 'Peso total da carga', unit: 'g', type: 'number', step: '0.001' },
  { key: 'dimensional_molde_mm', label: 'Dimensional do molde (C × L × A)', unit: 'mm', type: 'text' },
  { key: 'peso_molde_kg', label: 'Peso do molde', unit: 'kg', type: 'number', step: '0.1' },
  { key: 'tempo_pre_aquecimento_seg', label: 'Pré-aquecimento da matéria-prima', unit: 's', type: 'number', step: '0.1' },
  { key: 'forca_fechamento_recomendada_ton', label: 'Força de fechamento recomendada', unit: 'ton', type: 'number', step: '0.1' },
  { key: 'numero_respiros', label: 'Número de respiros (ciclos)', unit: 'un', type: 'number', step: '1' },
  { key: 'tempo_primeiro_respiro_seg', label: 'Tempo para o 1º respiro', unit: 's', type: 'number', step: '0.1' },
  { key: 'tempo_alivio_prensa_aberta_seg', label: 'Tempo de alívio (prensa aberta)', unit: 's', type: 'number', step: '0.1' },
]

const stamping: Param[] = [
  { key: 'material_chapa', label: 'Material da chapa', unit: '—', type: 'text', required: true },
  { key: 'espessura_chapa_mm', label: 'Espessura da chapa', unit: 'mm', type: 'number', step: '0.001', required: true },
  { key: 'forca_prensa_ton', label: 'Força da prensa', unit: 'ton', type: 'number', step: '0.1', required: true },
  { key: 'curso_prensa_mm', label: 'Curso da prensa', unit: 'mm', type: 'number', step: '0.1' },
  { key: 'passo_alimentacao_mm', label: 'Passo de alimentação', unit: 'mm', type: 'number', step: '0.01' },
  { key: 'lubrificante', label: 'Lubrificante', unit: '—', type: 'text' },
  { key: 'folga_matriz_mm', label: 'Folga de matriz', unit: 'mm', type: 'number', step: '0.001' },
]

const surface: Param[] = [
  { key: 'tempo_imersao_min', label: 'Tempo de imersão / exposição', unit: 'min', type: 'number', step: '0.1', required: true },
  { key: 'temperatura_banho_estufa_c', label: 'Temperatura do banho / estufa', unit: '°C', type: 'number', step: '0.1', required: true },
  { key: 'ph_tanque', label: 'pH do tanque', unit: 'pH', type: 'number', step: '0.01' },
  { key: 'concentracao_quimica_pct', label: 'Concentração química', unit: '%', type: 'number', step: '0.01' },
  { key: 'camada_requerida_um', label: 'Camada requerida', unit: 'µm', type: 'number', step: '0.1', required: true },
  { key: 'pressao_pistola_psi', label: 'Pressão de aplicação', unit: 'psi', type: 'number', step: '0.1' },
  { key: 'tempo_cura_secagem_min', label: 'Tempo de secagem / cura', unit: 'min', type: 'number', step: '0.1', required: true },
  { key: 'produto_quimico', label: 'Ficha de produto químico', unit: '—', type: 'text', required: true },
]

const cutting: Param[] = [
  { key: 'material_base', label: 'Material base', unit: '—', type: 'text', required: true },
  { key: 'espessura_material_mm', label: 'Espessura do material', unit: 'mm', type: 'number', step: '0.001', required: true },
  { key: 'ferramenta_corte', label: 'Faca / ferramenta de corte', unit: '—', type: 'text', required: true },
  { key: 'pressao_corte', label: 'Pressão de corte', unit: 'bar', type: 'number', step: '0.1' },
  { key: 'registro_corte_mm', label: 'Tolerância de registro', unit: 'mm', type: 'number', step: '0.01' },
  { key: 'sequencia_operacao', label: 'Sequência operacional', unit: '—', type: 'text', required: true },
  { key: 'criterio_rebarba', label: 'Critério de rebarba / descarte', unit: '—', type: 'text' },
]

const finishing: Param[] = [
  { key: 'material_base', label: 'Material base definido na OP', unit: '—', type: 'text' },
  { key: 'dureza_shore_a', label: 'Dureza especificada', unit: 'Shore A', type: 'number', step: '1' },
  { key: 'cavidades_ativas', label: 'Quantidade de cavidades', unit: 'un', type: 'number', step: '1' },
  { key: 'dimensional_molde_mm', label: 'Dimensional do molde', unit: 'mm', type: 'text' },
  { key: 'tempo_ciclo_seg', label: 'Tempo de processo padrão', unit: 's', type: 'number', step: '0.01' },
  { key: 'acabamento_inspecao_posto', label: 'Máquina / posto de inspeção', unit: '—', type: 'text' },
  { key: 'acabamento_inspecao_setor', label: 'Setor de inspeção', unit: '—', type: 'text' },
  { key: 'acabamento_inspecao_ambiente', label: 'Condição / temperatura ambiente', unit: '—', type: 'text' },
  { key: 'acabamento_inspecao_tempo', label: 'Tempo de preparação', unit: 's/pc', type: 'number', step: '0.01' },
  { key: 'acabamento_inspecao_checklist', label: 'Checklist de inspeção visual', unit: '—', type: 'text', multiline: true },
  { key: 'acabamento_inspecao_referencia', label: 'Referência visual de defeitos', unit: '—', type: 'text' },
  { key: 'acabamento_rebarba_posto', label: 'Máquina / posto de rebarbação', unit: '—', type: 'text' },
  { key: 'acabamento_rebarba_setor', label: 'Setor de rebarbação', unit: '—', type: 'text' },
  { key: 'acabamento_rebarba_tempo', label: 'Tempo de preparação', unit: 's/pc', type: 'number', step: '0.01' },
  { key: 'acabamento_rebarba_checklist', label: 'Checklist de rebarbação', unit: '—', type: 'text', multiline: true },
  { key: 'acabamento_rebarba_referencia', label: 'Referência de rebarbação', unit: '—', type: 'text' },
  { key: 'acabamento_limpeza_posto', label: 'Máquina / posto de limpeza', unit: '—', type: 'text' },
  { key: 'acabamento_limpeza_setor', label: 'Setor de limpeza', unit: '—', type: 'text' },
  { key: 'acabamento_limpeza_tempo', label: 'Tempo de preparação', unit: 's/lote', type: 'number', step: '0.01' },
  { key: 'acabamento_limpeza_checklist', label: 'Checklist de limpeza e lubrificação', unit: '—', type: 'text', multiline: true },
  { key: 'acabamento_limpeza_referencia', label: 'Procedimento de limpeza', unit: '—', type: 'text' },
  { key: 'acabamento_embalagem_posto', label: 'Máquina / posto de embalagem', unit: '—', type: 'text' },
  { key: 'acabamento_embalagem_setor', label: 'Setor de embalagem', unit: '—', type: 'text' },
  { key: 'acabamento_embalagem_tempo', label: 'Tempo de preparação', unit: 's/pc', type: 'number', step: '0.01' },
  { key: 'acabamento_embalagem_checklist', label: 'Checklist de embalagem e etiqueta', unit: '—', type: 'text', multiline: true },
  { key: 'acabamento_embalagem_referencia', label: 'Modelo de etiqueta / embalagem', unit: '—', type: 'text' },
]

const packaging: Param[] = [
  { key: 'material_base', label: 'Material base definido na OP', unit: '—', type: 'text' },
  { key: 'tempo_ciclo_seg', label: 'Tempo de processo padrão', unit: 's', type: 'number', step: '0.01' },
  { key: 'aplica_embalagem_plastica', label: 'Aplicar embalagem plástica?', unit: '—', type: 'select', options: ['Sim', 'Não'] },
  { key: 'emb_amostragem_base', label: 'Amostragem base para contagem', unit: 'peças', type: 'number', step: '1' },
  { key: 'emb_codigo_balanca', label: 'Código da balança de contagem', unit: '—', type: 'text' },
  { key: 'emb_dimensional_saco', label: 'Dimensional do saco (L × C × espessura)', unit: 'mm', type: 'text' },
  { key: 'emb_quantidade_pecas_saco', label: 'Quantidade de peças por saco', unit: 'un', type: 'number', step: '1' },
  { key: 'emb_peso_pacote_cheio_g', label: 'Peso padrão do pacote cheio', unit: 'g', type: 'number', step: '0.1' },
  { key: 'emb_sacos_caixa', label: 'Quantidade de sacos por caixa', unit: 'sacos', type: 'number', step: '1' },
  { key: 'emb_pecas_direto_caixa', label: 'Quantidade de peças diretas por caixa', unit: 'un', type: 'number', step: '1' },
  { key: 'emb_dimensional_caixa', label: 'Dimensional da caixa (C × L × A)', unit: 'mm', type: 'text' },
  { key: 'emb_caixa_modelo', label: 'Modelo / referência de montagem da caixa', unit: '—', type: 'text' },
  { key: 'emb_disposicao_pecas', label: 'Referência da disposição das peças', unit: '—', type: 'text' },
  { key: 'emb_instrucao_montagem', label: 'Roteiro de montagem e acondicionamento', unit: '—', type: 'text', multiline: true },
  { key: 'emb_instrucao_etiqueta', label: 'Instrução de identificação e etiqueta', unit: '—', type: 'text', multiline: true },
  { key: 'emb_instrucao_paletizacao', label: 'Padrão de paletização e empilhamento', unit: '—', type: 'text', multiline: true },
  { key: 'emb_criterio_liberacao', label: 'Critérios de conferência e liberação', unit: '—', type: 'text', multiline: true },
]

const setupCommon = common.filter(p =>
  ['tempo_ciclo_seg', 'altura_molde_mm', 'tipo_fixacao', 'tempo_setup_min', 'tempo_limpeza_min', 'seguranca_ppe'].includes(p.key)
)

export const paramsFor = (category: Category): Param[] => {
  switch (category) {
    case 'INJETADOS':
      return [...common, ...injection]
    case 'PRENSADOS':
      return [...setupCommon, ...press]
    case 'ESTAMPARIA':
    case 'MECANICA':
      return [...setupCommon.filter(p => p.key !== 'altura_molde_mm' && p.key !== 'tipo_fixacao'), ...stamping]
    case 'TRATAMENTO_SUPERFICIAL':
    case 'PINTURA_QUIMICA':
      return surface
    case 'CORTE_VINCO':
      return cutting
    case 'ACABAMENTO':
      return finishing
    case 'MONTAGEM_EMBALAGEM':
      return packaging
    default:
      return common
  }
}

/**
 * Agrupamentos de parâmetros técnicos industriais organizados por subsistemas
 * Os campos pertencentes ao diagrama interativo são isolados para evitar repetições.
 */
const processParamGroups: Partial<Record<Category, { title: string; keys: string[] }[]>> = {
  INJETADOS: [
    {
      title: '1. Matéria-prima & Preparação',
      keys: ['material_polimero', 'temperatura_secagem_c', 'tempo_secagem_h', 'peso_peca_g', 'peso_canal_g'],
    },
    {
      title: '2. Injeção, Recalque & Plastificação',
      keys: [
        'forca_fechamento_ton',
        'pressao_injecao_bar',
        'velocidade_injecao_mm_s',
        'tempo_injecao_seg',
        'pressao_recalque_bar',
        'tempo_recalque_seg',
        'pressao_contrapressao_bar',
        'rpm_rosca',
        'posicao_dosagem_mm',
        'posicao_comutacao_mm',
      ],
    },
    {
      title: '3. Molde, Ciclo & Refrigeração',
      keys: [
        'cavidades_ativas',
        'tempo_ciclo_seg',
        'tempo_resfriamento_seg',
        'altura_molde_mm',
        'tipo_fixacao',
        'tipo_refrigeracao',
        'vazao_refrigeracao_l_min',
        'tempo_setup_min',
        'tempo_limpeza_min',
        'torque_aperto_nm',
        'velocidade_dosagem_curso',
        'seguranca_ppe',
      ],
    },
  ],
  PRENSADOS: [
    {
      title: '1. Dados do Molde & Ferramental',
      keys: ['cavidades_ativas', 'dimensional_molde_mm', 'peso_molde_kg', 'altura_molde_mm', 'tipo_fixacao', 'tempo_setup_min', 'seguranca_ppe'],
    },
    {
      title: '2. Matéria-prima & Carga',
      keys: ['composto_material', 'dureza_shore_a', 'peso_carga_cavidade_g', 'peso_total_carga_g'],
    },
    {
      title: '3. Parâmetros de Prensagem & Vulcanização',
      keys: ['tonelagem_prensa', 'forca_fechamento_recomendada_ton', 'tolerancia_temp_platos_c', 'tempo_pre_aquecimento_seg', 'tempo_pos_cura_min'],
    },
    {
      title: '4. Ciclo de Desgaseificação (Respiros)',
      keys: ['numero_respiros', 'tempo_primeiro_respiro_seg', 'tempo_alivio_prensa_aberta_seg', 'tempo_ciclo_seg', 'tempo_limpeza_min'],
    },
  ],
  ACABAMENTO: [
    {
      title: '1. Inspeção visual e separação de canais',
      keys: ['acabamento_inspecao_posto', 'acabamento_inspecao_setor', 'acabamento_inspecao_ambiente', 'acabamento_inspecao_tempo', 'acabamento_inspecao_checklist', 'acabamento_inspecao_referencia'],
    },
    {
      title: '2. Rebarbação manual',
      keys: ['acabamento_rebarba_posto', 'acabamento_rebarba_setor', 'acabamento_rebarba_tempo', 'acabamento_rebarba_checklist', 'acabamento_rebarba_referencia'],
    },
    {
      title: '3. Limpeza e lubrificação',
      keys: ['acabamento_limpeza_posto', 'acabamento_limpeza_setor', 'acabamento_limpeza_tempo', 'acabamento_limpeza_checklist', 'acabamento_limpeza_referencia'],
    },
    {
      title: '4. Embalagem e etiquetagem',
      keys: ['acabamento_embalagem_posto', 'acabamento_embalagem_setor', 'acabamento_embalagem_tempo', 'acabamento_embalagem_checklist', 'acabamento_embalagem_referencia'],
    },
  ],
  MONTAGEM_EMBALAGEM: [
    {
      title: '1. Dados gerais, saco plástico e contagem',
      keys: ['material_base', 'tempo_ciclo_seg', 'aplica_embalagem_plastica', 'emb_amostragem_base', 'emb_codigo_balanca', 'emb_dimensional_saco', 'emb_quantidade_pecas_saco', 'emb_peso_pacote_cheio_g'],
    },
    {
      title: '2. Embalagem em caixa de papelão',
      keys: ['emb_sacos_caixa', 'emb_pecas_direto_caixa', 'emb_dimensional_caixa', 'emb_caixa_modelo'],
    },
    {
      title: '3. Roteiro de montagem, etiqueta e paletização',
      keys: ['emb_disposicao_pecas', 'emb_instrucao_montagem', 'emb_instrucao_etiqueta', 'emb_instrucao_paletizacao', 'emb_criterio_liberacao'],
    },
  ],
}

const inputClass =
  'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-200 bg-white px-2 text-xs font-mono font-bold text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-[#48B7C7] focus:ring-1 focus:ring-[#48B7C7]/20'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500'
const blankParameters = (category: Category) =>
  Object.fromEntries(paramsFor(category).map(p => [p.key, ''])) as Record<string, string>

/**
 * DIAGRAMA TÉCNICO INTERATIVO DE EQUIPAMENTO INDUSTRIAL
 * Permite que o operador e o preparador visualizem e alterem as temperaturas e setpoints
 * diretamente sobre a representação gráfica do equipamento (canhão/cilindro da injetora ou prensa hidráulica).
 */
function ProcessEquipmentDiagram({
  category,
  params,
  onParamChange,
}: {
  category: Category
  params: Record<string, string>
  onParamChange: (key: string, value: string) => void
}) {
  const fieldClass =
    'h-7 w-[76px] rounded-[2px] border border-[#48B7C7] bg-slate-50/95 px-1 text-center font-mono text-[11px] font-black text-slate-800 shadow-md outline-none transition-all focus:border-amber-300 focus:ring-1 focus:ring-amber-400'
  const tagClass =
    'absolute z-10 flex flex-col items-center gap-0.5 rounded-[2px] border border-slate-300 bg-slate-50/95 p-1 text-[9px] font-black uppercase tracking-wide text-white shadow-lg'

  if (category !== 'INJETADOS' && category !== 'PRENSADOS') return null
  const isPress = category === 'PRENSADOS'

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#123B50] px-3 py-2">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-amber-700" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9DD9E8]">
              SYSNQRA SGQ • CONTROLE TÉRMICO OPERACIONAL
            </p>
            <h3 className="text-sm font-black text-white">
              {isPress ? 'Prensa Hidráulica — Perfil Térmico dos Platôs & Pressão' : 'Injetora — Perfil Térmico do Canhão, Bico & Molde'}
            </h3>
          </div>
        </div>
        <span className="rounded-[2px] border border-slate-300 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#9DD9E8]">
          Edição Direta no Diagrama
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        {/* Gráfico SVG Técnico com caixas de temperatura posicionadas sobre a geometria */}
        <div className="relative min-h-[300px] overflow-hidden rounded-md border border-slate-200 bg-[radial-gradient(ellipse_at_center,_#123B50_0%,_#071522_85%)]">
          <svg
            viewBox="0 0 780 340"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={isPress ? 'Diagrama da prensa hidráulica' : 'Diagrama do canhão da injetora'}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="sys-steel-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#D9E7ED" />
                <stop offset="35%" stopColor="#66899B" />
                <stop offset="65%" stopColor="#294456" />
                <stop offset="100%" stopColor="#8DAFBE" />
              </linearGradient>
              <linearGradient id="sys-heat-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2D8DB8" />
                <stop offset="50%" stopColor="#E6A34A" />
                <stop offset="100%" stopColor="#D65B61" />
              </linearGradient>
              <pattern id="sys-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#48B7C7" strokeOpacity=".08" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width="780" height="340" fill="url(#sys-grid)" />

            {isPress ? (
              <g>
                {/* Geometria da prensa hidráulica vertical */}
                <g stroke="#7FA5B6" strokeWidth="2" fill="url(#sys-steel-grad)">
                  {/* Cabeçote superior */}
                  <rect x="150" y="32" width="460" height="30" rx="3" />
                  {/* Colunas guias */}
                  <rect x="175" y="60" width="24" height="236" rx="2" />
                  <rect x="560" y="60" width="24" height="236" rx="2" />
                  {/* Cilindro hidráulico */}
                  <rect x="345" y="16" width="70" height="56" rx="6" />
                  <rect x="250" y="68" width="260" height="46" rx="3" />
                  {/* Platô Superior (Aquecido) */}
                  <rect x="230" y="124" width="300" height="26" rx="2" fill="#E6A34A" fillOpacity="0.3" stroke="#E6A34A" strokeWidth="2" />
                  {/* Molde / Pacote de Placas */}
                  <rect x="270" y="154" width="220" height="38" rx="2" fill="#2D8DB8" />
                  {/* Platô Inferior (Aquecido) */}
                  <rect x="230" y="196" width="300" height="26" rx="2" fill="#E6A34A" fillOpacity="0.3" stroke="#E6A34A" strokeWidth="2" />
                  {/* Base inferior da prensa */}
                  <rect x="150" y="278" width="460" height="22" rx="3" />
                  <rect x="110" y="298" width="540" height="18" rx="3" />
                </g>

                {/* Manômetro hidráulico com linha de conexão */}
                <g stroke="#48B7C7" strokeWidth="3" fill="none">
                  <path d="M605 258h34v-68h24" />
                  <circle cx="685" cy="190" r="25" fill="#0D2638" />
                  <path d="M685 190l12 -12" stroke="#E6A34A" />
                </g>

                <g fill="#A8BBC8" fontSize="11" fontWeight="800">
                  <text x="25" y="48">CILINDRO</text>
                  <text x="25" y="63">HIDRÁULICO</text>
                  <path d="M110 52H340" stroke="#48B7C7" strokeDasharray="3 3" />
                  <text x="25" y="138">PLATÔ SUPERIOR</text>
                  <path d="M125 137H226" stroke="#E6A34A" strokeDasharray="3 3" />
                  <text x="25" y="174">MOLDE / CAVIDADES</text>
                  <path d="M145 173H266" stroke="#2D8DB8" strokeDasharray="3 3" />
                  <text x="25" y="210">PLATÔ INFERIOR</text>
                  <path d="M125 209H226" stroke="#E6A34A" strokeDasharray="3 3" />
                  <text x="645" y="235">MANÔMETRO</text>
                  <text x="590" y="330">SYSNQRA • PRENSA HIDRÁULICA</text>
                </g>
              </g>
            ) : (
              <g>
                {/* Geometria do canhão de injeção e cilindro de plastificação */}
                <g stroke="#7FA5B6" strokeWidth="2" fill="url(#sys-steel-grad)">
                  {/* Corpo do canhão */}
                  <path d="M60 95h74v-22h44v22h44v-22h44v22h44v-22h44v22h44v-22h44v22h54l28 26-28 26H60z" />
                  <rect x="65" y="105" width="375" height="37" rx="3" fill="#294456" />
                  <rect x="80" y="112" width="335" height="22" rx="2" fill="url(#sys-heat-grad)" stroke="#E6A34A" />
                  {/* Bico de injeção */}
                  <path d="M440 105h46l42 18-42 18h-46z" fill="#E6A34A" fillOpacity="0.3" stroke="#E6A34A" strokeWidth="2" />
                  {/* Molde (Fixo e Móvel) */}
                  <rect x="532" y="80" width="48" height="96" rx="2" fill="#2D8DB8" stroke="#48B7C7" />
                  <rect x="584" y="80" width="48" height="96" rx="2" fill="#123B50" stroke="#48B7C7" />
                  {/* Funil de alimentação */}
                  <path d="M106 70V38h66v32" fill="#294456" />
                  <path d="M122 38V20h34v18" fill="#66899B" />
                  {/* Suporte da injetora */}
                  <rect x="70" y="158" width="365" height="17" rx="3" />
                  <rect x="78" y="185" width="350" height="18" rx="3" />
                </g>

                <g fill="#A8BBC8" fontSize="11" fontWeight="800">
                  <text x="65" y="222">CANHÃO DE PLASTIFICAÇÃO (ROSCA & RESISTÊNCIAS)</text>
                  <text x="65" y="240">FLUXO: FUNIL → ZONA 1 → ZONA 2 → ZONA 3 → ZONA 4 → BICO → MOLDE</text>
                  <text x="530" y="68">M. FIXO / M. MÓVEL</text>
                  <text x="65" y="324">SYSNQRA • ESQUEMA TÉCNICO DE INJEÇÃO</text>
                </g>

                <g stroke="#48B7C7" strokeWidth="1.5" strokeDasharray="3 3">
                  <path d="M140 83V55" />
                  <path d="M220 83V55" />
                  <path d="M300 83V55" />
                  <path d="M380 83V55" />
                  <path d="M465 95V55" />
                  <path d="M555 75V55" />
                </g>
              </g>
            )}
          </svg>

          {/* Caixas de edição de temperatura diretamente sobre o diagrama */}
          {isPress ? (
            <div>
              <label className={tagClass} style={{ left: '33%', top: '32%' }}>
                <span>Platô Sup.</span>
                <input
                  aria-label="Temperatura do platô superior sobre o diagrama"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.temp_plato_superior_c ?? ''}
                  onChange={e => onParamChange('temp_plato_superior_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '42%', top: '48%' }}>
                <span>Molde</span>
                <input
                  aria-label="Temperatura do molde sobre o diagrama"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.temperatura_molde_c ?? ''}
                  onChange={e => onParamChange('temperatura_molde_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '33%', top: '64%' }}>
                <span>Platô Inf.</span>
                <input
                  aria-label="Temperatura do platô inferior sobre o diagrama"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.temp_plato_inferior_c ?? ''}
                  onChange={e => onParamChange('temp_plato_inferior_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '76%', top: '48%' }}>
                <span>Pressão</span>
                <input
                  aria-label="Pressão de prensagem sobre o diagrama"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.pressao_prensagem_bar ?? ''}
                  onChange={e => onParamChange('pressao_prensagem_bar', e.target.value)}
                  placeholder="bar"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className={tagClass} style={{ left: '13%', top: '23%' }}>
                <span>Zona 1</span>
                <input
                  aria-label="Temperatura zona 1 sobre o canhão"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.zona1_c ?? ''}
                  onChange={e => onParamChange('zona1_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '23.5%', top: '23%' }}>
                <span>Zona 2</span>
                <input
                  aria-label="Temperatura zona 2 sobre o canhão"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.zona2_c ?? ''}
                  onChange={e => onParamChange('zona2_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '34%', top: '23%' }}>
                <span>Zona 3</span>
                <input
                  aria-label="Temperatura zona 3 sobre o canhão"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.zona3_c ?? ''}
                  onChange={e => onParamChange('zona3_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '44.5%', top: '23%' }}>
                <span>Zona 4</span>
                <input
                  aria-label="Temperatura zona 4 sobre o canhão"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.zona4_c ?? ''}
                  onChange={e => onParamChange('zona4_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '55.5%', top: '23%' }}>
                <span>Bico</span>
                <input
                  aria-label="Temperatura do bico sobre o canhão"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.temp_bico_c ?? ''}
                  onChange={e => onParamChange('temp_bico_c', e.target.value)}
                  placeholder="°C"
                />
              </label>

              <label className={tagClass} style={{ left: '67%', top: '23%' }}>
                <span>Molde Fixo</span>
                <input
                  aria-label="Temperatura do molde fixo sobre o diagrama"
                  className={fieldClass}
                  inputMode="decimal"
                  value={params.temp_molde_fixo_c ?? ''}
                  onChange={e => onParamChange('temp_molde_fixo_c', e.target.value)}
                  placeholder="°C"
                />
              </label>
            </div>
          )}
        </div>

        {/* Resumo lateral sincronizado */}
        <div className="flex flex-col gap-2">
          <div className="rounded-[2px] border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">
              {isPress ? 'Controle Térmico da Prensa' : 'Perfil Térmico do Canhão'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {isPress
                ? 'Os valores editados nos platôs e no manômetro são gravados na ficha técnica e sincronizados no SGQ.'
                : 'Os setpoints digitados no diagrama do canhão são persistidos automaticamente no banco de dados da SYSNQRA.'}
            </p>
          </div>

          <div className="grid gap-1.5">
            {(isPress
              ? [
                  { key: 'temp_plato_superior_c', label: 'Platô Superior', unit: '°C' },
                  { key: 'temperatura_molde_c', label: 'Temperatura Molde', unit: '°C' },
                  { key: 'temp_plato_inferior_c', label: 'Platô Inferior', unit: '°C' },
                  { key: 'pressao_prensagem_bar', label: 'Pressão de Prensagem', unit: 'bar' },
                ]
              : [
                  { key: 'zona1_c', label: 'Zona 1 (Alimentação)', unit: '°C' },
                  { key: 'zona2_c', label: 'Zona 2 (Compressão)', unit: '°C' },
                  { key: 'zona3_c', label: 'Zona 3 (Dosagem)', unit: '°C' },
                  { key: 'zona4_c', label: 'Zona 4 (Frontal)', unit: '°C' },
                  { key: 'temp_bico_c', label: 'Bico de Injeção', unit: '°C' },
                  { key: 'temp_molde_fixo_c', label: 'Molde Fixo', unit: '°C' },
                ]
            ).map(f => (
              <label
                key={f.key}
                className="grid grid-cols-[minmax(0,1fr)_94px] items-center gap-2 rounded-[2px] border border-slate-200 bg-white px-2.5 py-1.5"
              >
                <span className="text-[10px] font-bold text-slate-700">{f.label}</span>
                <span className="flex items-center gap-1">
                  <input
                    aria-label={f.label}
                    className="h-7 w-full min-w-0 rounded-[2px] border border-slate-200 bg-slate-50 px-1.5 text-right font-mono text-xs font-black text-slate-800 outline-none focus:border-[#48B7C7]"
                    value={params[f.key] ?? ''}
                    onChange={e => onParamChange(f.key, e.target.value)}
                    inputMode="decimal"
                  />
                  <small className="w-6 text-[9px] font-bold text-slate-500">{f.unit}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * DUAS FOTOS DA MATERIA PRIMA — referência física do insumo homologado (modelo da ficha
 * TATTO PLASTIC FPT-JJ-034/1). Os caminhos são gravados em parametros_tecnicos.foto_materia_prima_1/2,
 * então não exigem tabela nem migração nova: viajam no mesmo upsert da ficha.
 * "Remover" desvincula o arquivo da ficha e NÃO apaga o objeto do storage (regra do projeto:
 * não apagar documentos da empresa automaticamente).
 */
const MP_PHOTO_KEYS = ['foto_materia_prima_1', 'foto_materia_prima_2'] as const
const MAX_MP_PHOTO_BYTES = 8 * 1024 * 1024

function FotosMateriaPrima({
  empresaId,
  codigoFicha,
  valores,
  onChange,
}: {
  empresaId: string
  codigoFicha: string
  valores: Record<string, string>
  onChange: (chave: string, caminho: string | null) => void
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState('')
  const caminho1 = valores.foto_materia_prima_1 ?? ''
  const caminho2 = valores.foto_materia_prima_2 ?? ''

  useEffect(() => {
    let vivo = true
    const alvos: { chave: string; caminho: string }[] = [
      { chave: MP_PHOTO_KEYS[0], caminho: caminho1 },
      { chave: MP_PHOTO_KEYS[1], caminho: caminho2 },
    ]
    void (async () => {
      const assinados = await Promise.all(
        alvos.map(async ({ chave, caminho }) => {
          if (!caminho) return [chave, ''] as const
          const assinado = await supabase.storage.from('documentos-erp').createSignedUrl(caminho, 600)
          return [chave, assinado.data?.signedUrl ?? ''] as const
        })
      )
      if (vivo) setPreviews(Object.fromEntries(assinados))
    })()
    return () => {
      vivo = false
    }
  }, [caminho1, caminho2])

  async function enviar(chave: string, arquivo: File) {
    const codigo = codigoFicha.trim()
    if (!empresaId) {
      setErro('Selecione uma empresa ativa antes de anexar a matéria-prima.')
      return
    }
    if (!codigo) {
      setErro('Informe o código da ficha antes de anexar a foto da matéria-prima.')
      return
    }
    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie uma imagem (JPG, PNG ou WebP).')
      return
    }
    if (arquivo.size > MAX_MP_PHOTO_BYTES) {
      setErro('Imagem acima do limite de 8 MB.')
      return
    }
    setErro('')
    setEnviando(chave)
    try {
      const extensao = (arquivo.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const caminho = `${empresaId}/fichas-processo/${codigo}/${chave}.${extensao}`
      const upload = await supabase.storage
        .from('documentos-erp')
        .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
      if (upload.error) throw upload.error
      onChange(chave, caminho)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar a imagem da matéria-prima.')
    } finally {
      setEnviando('')
    }
  }

  return (
    <section className="pcp-mp-photos mt-4 rounded-[3px] border border-slate-200 bg-white p-3 shadow-sm">
      <header className="mb-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[22px] items-center rounded-[2px] bg-[#123B50] px-2 text-[9px] font-black uppercase tracking-wider text-white">
            Matéria-prima
          </span>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Fotos da matéria-prima
          </h3>
        </div>
        <p className="mt-1 text-[10px] font-semibold text-slate-500">
          Referência visual do insumo homologado (grão, bobina, peça ou embalagem). As duas imagens
          acompanham a ficha na impressão A4 da prancheta.
        </p>
      </header>
      {erro && (
        <p
          role="alert"
          className="mb-2 rounded-[2px] border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"
        >
          {erro}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {MP_PHOTO_KEYS.map((chave, indice) => {
          const caminho = valores[chave] ?? ''
          return (
            <div key={chave} className="rounded-[2px] border border-slate-200 bg-slate-50 p-2">
              <span className={labelClass}>Foto {indice + 1} da matéria-prima</span>
              <div className="flex h-28 items-center justify-center overflow-hidden rounded-[2px] border border-dashed border-slate-300 bg-white">
                {previews[chave] ? (
                  <img
                    src={previews[chave]}
                    alt={`Matéria-prima ${indice + 1} da ficha ${codigoFicha || 'sem código'}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <ImagePlus size={18} />
                    {caminho ? 'Recuperando imagem…' : 'Nenhuma imagem anexada'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 print:hidden">
                <span className="relative inline-flex h-[30px] items-center gap-1.5 overflow-hidden rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wider text-white">
                  <Camera size={12} />
                  {enviando === chave ? 'Enviando…' : caminho ? 'Trocar foto' : 'Enviar foto'}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Enviar foto ${indice + 1} da matéria-prima`}
                    className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
                    disabled={enviando !== ''}
                    onChange={event => {
                      const arquivo = event.target.files?.[0]
                      if (arquivo) void enviar(chave, arquivo)
                      event.target.value = ''
                    }}
                  />
                </span>
                {caminho && (
                  <button
                    type="button"
                    onClick={() => onChange(chave, null)}
                    className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100"
                  >
                    <Trash2 size={12} />
                    Remover
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function PCPFichasProcesso() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = (categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value ??
    'INJETADOS') as Category
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
    if (next && next !== category) {
      setCategory(next)
      setParams(blankParameters(next))
    }
    const product = searchParams.get('produto')
    if (product && product !== productId) setProductId(product)
  }, [searchParams, category, productId])

  async function load() {
    setBusy(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
        throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      }
      setCompany(tenant.data)
      const [p, t, m, f] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').limit(2000),
        supabase.from('erp_fichas_processo').select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao').eq('empresa_id', tenant.data).order('codigo_ficha').limit(1000),
      ])
      for (const result of [p, t, m, f]) if (result.error) throw result.error
      setProducts((p.data ?? []) as Product[])
      setTools((t.data ?? []) as Tool[])
      setMachines((m.data ?? []) as Machine[])
      setRows((f.data ?? []) as Saved[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar os cadastros da ficha.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const visibleRows = useMemo(() => {
    return rows.filter(r => {
      const matchCat = r.categoria_processo === category
      if (!matchCat) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      const prod = products.find(p => p.id === r.produto_id)
      return (
        r.codigo_ficha.toLowerCase().includes(q) ||
        (prod?.codigo ?? '').toLowerCase().includes(q) ||
        (prod?.nome ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, category, query, products])

  function openRow(row: Saved) {
    setCode(row.codigo_ficha)
    setProductId(row.produto_id)
    setToolId(row.ferramenta_id ?? '')
    setMachineId(row.maquina_id ?? '')
    setCategory(row.categoria_processo)
    setVersion(String(row.versao_ficha ?? row.revisao ?? 1))
    setStatus(row.status || 'RASCUNHO')
    setApprovedAt(row.data_homologacao ? row.data_homologacao.slice(0, 10) : '')
    setSignature(row.assinatura_tecnica ?? '')
    setInstructions(typeof row.parametros_tecnicos?.instrucoes_setup === 'string' ? row.parametros_tecnicos.instrucoes_setup : '')
    setParams({
      ...blankParameters(row.categoria_processo),
      ...Object.fromEntries(
        Object.entries(row.parametros_tecnicos ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)])
      ),
    })
    setNotice(`Ficha ${row.codigo_ficha} carregada.`)
    setError('')
  }

  function updateParam(key: string, value: string) {
    setParams(current => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!company) {
      setError('Empresa não identificada.')
      return
    }
    if (!code.trim()) {
      setError('Informe o código da ficha de processo.')
      return
    }
    if (!productId) {
      setError('Selecione o produto vinculado à ficha.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const numericParams = Object.fromEntries(
        Object.entries(params).map(([key, value]) => {
          const num = Number(value)
          return [key, value === '' ? null : Number.isFinite(num) && value.trim() !== '' ? num : value]
        })
      )
      if (instructions) {
        numericParams.instrucoes_setup = instructions
      }
      const payload = {
        empresa_id: company,
        codigo_ficha: code.trim(),
        produto_id: productId,
        ferramenta_id: toolId || null,
        maquina_id: machineId || null,
        categoria_processo: category,
        versao_ficha: parseInt(version, 10) || 1,
        status,
        data_homologacao: approvedAt || null,
        assinatura_tecnica: signature || null,
        parametros_tecnicos: numericParams,
      }
      const result = await supabase.from('erp_fichas_processo').upsert(payload, { onConflict: 'empresa_id,codigo_ficha' })
      if (result.error) throw result.error
      await load()
      setNotice('Ficha técnica de processo homologada e gravada na SYSNQRA com sucesso.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gravar a ficha técnica.')
    } finally {
      setBusy(false)
    }
  }

  const fields = paramsFor(category)
  const isEditing = rows.some(row => row.codigo_ficha === code)
  const selectedProduct = products.find(p => p.id === productId)
  const selectedTool = tools.find(t => t.id === toolId)
  const selectedMachine = machines.find(m => m.id === machineId)
  const singleResourceProcess = category !== 'ACABAMENTO' && category !== 'MONTAGEM_EMBALAGEM'
  const expectedPph =
    singleResourceProcess && Number(params.tempo_ciclo_seg) > 0
      ? (3600 / Number(params.tempo_ciclo_seg)) * Math.max(1, Number(params.cavidades_ativas) || 1)
      : 0

  const fieldGroups = processParamGroups[category] ?? [
    { title: 'Parâmetros técnicos do processo', keys: fields.map(field => field.key) },
  ]
  const assignedKeys = new Set(fieldGroups.flatMap(group => group.keys))

  // Chaves gerenciadas diretamente no diagrama interativo (não repetidas nos cartões)
  const diagramOwnedKeys =
    category === 'INJETADOS'
      ? new Set(['zona1_c', 'zona2_c', 'zona3_c', 'zona4_c', 'temp_bico_c', 'temp_molde_fixo_c', 'temp_molde_movel_c'])
      : category === 'PRENSADOS'
      ? new Set(['temp_plato_superior_c', 'temperatura_molde_c', 'temp_plato_inferior_c', 'pressao_prensagem_bar'])
      : new Set<string>()

  const parameterCards = [
    ...fieldGroups
      .map(group => ({
        ...group,
        fields: fields.filter(field => group.keys.includes(field.key) && !diagramOwnedKeys.has(field.key)),
      }))
      .filter(group => group.fields.length > 0),
    ...(fields.some(field => !assignedKeys.has(field.key) && !diagramOwnedKeys.has(field.key))
      ? [
          {
            title: 'Parâmetros Complementares',
            keys: [],
            fields: fields.filter(field => !assignedKeys.has(field.key) && !diagramOwnedKeys.has(field.key)),
          },
        ]
      : []),
  ]

  const valueLabel = (key: string, unit = '') =>
    params[key] ? `${params[key]}${unit ? ` ${unit}` : ''}` : 'Não informado'

  const pressCharge =
    Number(params.peso_carga_cavidade_g) > 0 && Number(params.cavidades_ativas) > 0
      ? Number(params.peso_carga_cavidade_g) * Number(params.cavidades_ativas)
      : null

  return (
    <main className="pcp-process-page min-h-screen bg-white p-3 text-slate-800 antialiased md:p-5">
      <div className="mx-auto max-w-[1800px]">
        {/* CABEÇALHO PRINCIPAL SYSNQRA */}
        <header className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-slate-300 bg-[#123B50] text-[#48B7C7]">
            <Factory size={22} />
          </span>
          <div className="min-w-[240px]">
            <div className="flex items-center gap-2">
              <span className="rounded-[2px] bg-[#2D8DB8]/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#2D8DB8]">
                SYSNQRA SISTEMAS INDUSTRIAIS
              </span>
              <span className="text-[10px] font-bold text-slate-500">• SGQ / IT-PCP-001</span>
            </div>
            <h1 className="mt-0.5 text-lg font-black leading-6 text-slate-800 md:text-xl">
              {category === 'INJETADOS'
                ? 'Ficha Técnica de Processo — Injetados (Termoplásticos)'
                : category === 'PRENSADOS'
                ? 'Ficha Técnica de Processo — Prensados & Vulcanização'
                : `Ficha de Processo — ${categories.find(item => item.value === category)?.label ?? category}`}
            </h1>
            <p className="text-xs text-slate-600">
              Controle paramétrico homologado, setup de ferramentas, diagrama térmico e SGQ.
            </p>
          </div>

          <div className="ml-auto grid min-w-[260px] flex-1 grid-cols-3 gap-2 md:max-w-[440px]">
            {[
              { label: 'Documento', value: code || 'Novo Doc' },
              { label: 'Revisão', value: version.padStart(2, '0') },
              { label: 'Status', value: status },
            ].map(item => (
              <div key={item.label} className="rounded-[2px] border border-slate-200 bg-white px-3 py-2">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
                <strong
                  className={`mt-0.5 block truncate text-sm font-black ${
                    item.label === 'Status' && ['APROVADA', 'LIBERADA'].includes(status)
                      ? 'text-emerald-700'
                      : 'text-slate-800'
                  }`}
                >
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          <div className="flex w-full flex-wrap justify-end gap-2 print:hidden">
            {productId && (
              <a
                href={`/pageprincipal/cadastros/produtos/ficha-tecnica?produto=${encodeURIComponent(productId)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#123B50] px-3 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-[#2D8DB8] hover:text-white"
                title="Abrir a ficha técnica do produto (identificação, dimensional e produção)"
              >
                <Wrench size={13} />
                <span>Ver Ficha Técnica do Produto</span>
                <ExternalLink size={11} className="opacity-70" />
              </a>
            )}

            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-800 transition-colors hover:bg-slate-100"
              type="button"
              onClick={() => window.print()}
            >
              <Printer size={13} /> Imprimir A4
            </button>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-800 transition-colors hover:bg-slate-100"
              type="button"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw size={13} /> Atualizar
            </button>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#236f91]"
              type="button"
              onClick={() => {
                setCode('')
                setProductId('')
                setToolId('')
                setMachineId('')
                setVersion('1')
                setApprovedAt('')
                setSignature('')
                setStatus('RASCUNHO')
                setParams(blankParameters(category))
                setInstructions('')
                setNotice('Nova ficha técnica pronta para edição.')
                setError('')
              }}
            >
              Nova Ficha
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-3 rounded-[2px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-3 flex items-center gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 size={16} />
            {notice}
          </div>
        )}

        {/* SELETOR RÁPIDO DE MODALIDADE (FOCO INJETADOS & PRENSADOS) */}
        <section className="mb-4 rounded-md border border-slate-200 bg-white p-3 print:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#2D8DB8]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Selecione o Tipo de Manufatura:
              </span>
            </div>

            <div role="group" aria-label="Tipo de manufatura" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={category === 'INJETADOS'}
                onClick={() => {
                  setCategory('INJETADOS')
                  setParams(blankParameters('INJETADOS'))
                  setSearchParams({ tipo: 'INJETADOS' })
                }}
                className={`inline-flex h-7 items-center gap-1.5 rounded-[2px] px-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                  category === 'INJETADOS'
                    ? 'border border-[#48B7C7] bg-[#2D8DB8] text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Injetados (Termoplásticos)
              </button>

              <button
                type="button"
                aria-pressed={category === 'PRENSADOS'}
                onClick={() => {
                  setCategory('PRENSADOS')
                  setParams(blankParameters('PRENSADOS'))
                  setSearchParams({ tipo: 'PRENSADOS' })
                }}
                className={`inline-flex h-7 items-center gap-1.5 rounded-[2px] px-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                  category === 'PRENSADOS'
                    ? 'border border-[#48B7C7] bg-[#2D8DB8] text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Prensados (Vulcanização)
              </button>
            </div>
          </div>

          <div className="mb-3 grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="min-w-0">
              <span className={labelClass}>Pesquisar Ficha / Produto</span>
              <span className="relative block">
                <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  className={`${inputClass} pl-8`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Código, OP ou produto"
                />
              </span>
            </label>

            <label className="min-w-0">
              <span className={labelClass}>Todas as Categorias do ERP</span>
              <select
                className={inputClass}
                value={category}
                onChange={e => {
                  const next = e.target.value as Category
                  setCategory(next)
                  setParams(blankParameters(next))
                  setSearchParams({ tipo: next })
                }}
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {visibleRows.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={() => openRow(row)}
                className="grid min-h-[48px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[2px] border border-slate-200 bg-white px-3 text-left transition hover:border-[#48B7C7] hover:bg-slate-100"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-slate-800">
                    {row.codigo_ficha} • {products.find(p => p.id === row.produto_id)?.codigo ?? 'Produto'}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {categories.find(c => c.value === row.categoria_processo)?.label ?? row.categoria_processo} • Rev.{' '}
                    {row.versao_ficha ?? row.revisao} • {row.status}
                  </span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">Abrir Ficha →</span>
              </button>
            ))}
          </div>
        </section>

        {/* PRANCHETA TÉCNICA PRINCIPAL (TELA & IMPRESSÃO A4) */}
        <section className="pcp-ficha-print-sheet rounded-md border border-slate-200 bg-white p-4 shadow-xl print:border-0 print:p-0">
          <div className="mb-3 hidden border-b-2 border-slate-200 pb-2 print:block">
            <h1 className="text-base font-black uppercase">
              SYSNQRA SISTEMAS INDUSTRIAIS — FICHA TÉCNICA DE PROCESSO
            </h1>
            <p className="text-[9px]">
              Documento Operacional Controlado • SGQ • IT-PCP-001 • Homologação de Engenharia
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 print:hidden">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#2D8DB8]">
                {category === 'INJETADOS'
                  ? 'PROCESSO • INJEÇÃO TERMOPLÁSTICA'
                  : category === 'PRENSADOS'
                  ? 'PROCESSO • PRENSAGEM HIDRÁULICA E VULCANIZAÇÃO'
                  : 'PROCESSO • ' + (categories.find(item => item.value === category)?.label || category)}
              </p>
              <h2 className="mt-0.5 text-lg font-black text-slate-800">
                {selectedProduct ? `${selectedProduct.codigo} — ${selectedProduct.nome}` : 'Selecione o Produto'}
              </h2>
              <p className="text-xs text-slate-600">
                {selectedProduct
                  ? `Ferramental: ${selectedTool?.codigo ?? 'Não vinculado'} • Máquina Tag: ${selectedMachine?.codigo ?? 'Não vinculada'}`
                  : 'Selecione o item para carregar parâmetros de engenharia e histórico.'}
              </p>
            </div>
            <span className="rounded-[2px] border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-black text-[#2D8DB8]">
              {status}
            </span>
          </div>

          {/* CAMPOS MESTRES DE IDENTIFICAÇÃO */}
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className={labelClass}>Código da Ficha (ID Único) *</span>
              <input className={inputClass} value={code} onChange={e => setCode(e.target.value)} required />
            </label>

            <label>
              <span className={labelClass}>Produto Cadastrado *</span>
              <select className={inputClass} value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="">Selecione o produto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Molde / Ferramental</span>
              <select className={inputClass} value={toolId} onChange={e => setToolId(e.target.value)}>
                <option value="">Não aplicável</option>
                {tools.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Máquina / Equipamento</span>
              <select className={inputClass} value={machineId} onChange={e => setMachineId(e.target.value)}>
                <option value="">Selecione a máquina</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} — {m.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Revisão da Ficha</span>
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={version}
                onChange={e => setVersion(e.target.value)}
                required
              />
            </label>

            <label>
              <span className={labelClass}>Data de Homologação</span>
              <input className={inputClass} type="date" value={approvedAt} onChange={e => setApprovedAt(e.target.value)} />
            </label>

            <label className="xl:col-span-2">
              <span className={labelClass}>Engenheiro Responsável / Registro</span>
              <input
                className={inputClass}
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="Nome completo e CREA/registro"
              />
            </label>
          </div>

          {/* DIAGRAMA TÉCNICO INTERATIVO COM SETPOINTS DIRETOS NA IMAGEM */}
          <ProcessEquipmentDiagram
            category={category}
            params={params}
            onParamChange={(key, value) => setParams(current => ({ ...current, [key]: value }))}
          />

          {/* CARTÕES DE PARÂMETROS TÉCNICOS INDUSTRIAIS (SEM REPETIÇÕES) */}
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {parameterCards.map(group => (
              <article key={group.title} className="rounded-[2px] border border-slate-200 bg-white p-3">
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {group.fields.map(field => (
                    <label key={field.key} className={'min-w-0 ' + (field.multiline ? 'sm:col-span-2' : '')}>
                      <span className={labelClass}>
                        {field.label} {field.required && <span className="text-rose-700">*</span>}
                      </span>
                      <span className="flex min-w-0 items-start">
                        {field.type === 'select' ? (
                          <select
                            className={`${inputClass} rounded-r-none`}
                            value={params[field.key] ?? ''}
                            onChange={event => updateParam(field.key, event.target.value)}
                          >
                            <option value="">Selecione</option>
                            {(field.options ?? []).map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : field.multiline ? (
                          <textarea
                            className={`${inputClass} min-h-[64px] resize-y rounded-r-none py-1.5`}
                            value={params[field.key] ?? ''}
                            onChange={event => updateParam(field.key, event.target.value)}
                            placeholder="Instruções técnicas"
                          />
                        ) : (
                          <input
                            className={`${inputClass} rounded-r-none`}
                            type={field.type === 'number' ? 'number' : 'text'}
                            step={field.step}
                            value={params[field.key] ?? ''}
                            onChange={event => updateParam(field.key, event.target.value)}
                            placeholder={field.unit === '—' ? 'Informar' : field.unit}
                          />
                        )}
                        <span className="flex h-[30px] min-w-[44px] shrink-0 items-center justify-center rounded-r-[2px] border border-l-0 border-[#123B50] bg-[#123B50] px-1 text-[9px] font-bold text-white">
                          {field.unit}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* RESUMO TÉCNICO E CÁLCULO DE CAPACIDADE DE SAÍDA */}
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            <article className="rounded-[2px] border border-slate-200 bg-white p-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">Identificação & Molde</h3>
              <dl className="mt-2 divide-y divide-slate-200 text-xs">
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Documento</dt>
                  <dd className="font-bold">{code || '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Produto</dt>
                  <dd className="text-right font-bold">{selectedProduct?.codigo ?? '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Ferramental</dt>
                  <dd className="font-bold">{selectedTool?.codigo ?? '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Cavidades Ativas</dt>
                  <dd className="font-bold">{valueLabel('cavidades_ativas', 'cav.')}</dd>
                </div>
              </dl>
            </article>

            {category === 'PRENSADOS' ? (
              <article className="rounded-[2px] border border-slate-200 bg-white p-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">Matéria-Prima & Carga</h3>
                <dl className="mt-2 divide-y divide-slate-200 text-xs">
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Composto</dt>
                    <dd className="font-bold">{valueLabel('composto_material')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Dureza</dt>
                    <dd className="font-bold">{valueLabel('dureza_shore_a', 'Shore A')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Carga / Cavidade</dt>
                    <dd className="font-bold">{valueLabel('peso_carga_cavidade_g', 'g')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Carga Total Calculada</dt>
                    <dd className="font-bold">{pressCharge ? `${pressCharge.toFixed(2)} g` : '—'}</dd>
                  </div>
                </dl>
              </article>
            ) : (
              <article className="rounded-[2px] border border-slate-200 bg-white p-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">Ciclo & Ritmo Nominal</h3>
                <dl className="mt-2 divide-y divide-slate-200 text-xs">
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Tempo de Ciclo</dt>
                    <dd className="font-bold">{valueLabel('tempo_ciclo_seg', 's')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Tempo de Resfriamento</dt>
                    <dd className="font-bold">{valueLabel('tempo_resfriamento_seg', 's')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Setup Padrão</dt>
                    <dd className="font-bold">{valueLabel('tempo_setup_min', 'min')}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Capacidade Nominal</dt>
                    <dd className="font-bold text-[#2D8DB8]">
                      {expectedPph > 0 ? `${expectedPph.toFixed(0)} peças/h` : '—'}
                    </dd>
                  </div>
                </dl>
              </article>
            )}

            <article className="rounded-[2px] border border-slate-200 bg-white p-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">Homologação Técnica</h3>
              <dl className="mt-2 divide-y divide-slate-200 text-xs">
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Status SGQ</dt>
                  <dd className="font-bold text-emerald-700">{status}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Homologado em</dt>
                  <dd className="font-bold">{approvedAt || 'Em análise'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Responsável</dt>
                  <dd className="truncate font-bold">{signature || 'Não assinado'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500">Empresa</dt>
                  <dd className="font-bold text-[#2D8DB8]">SYSNQRA</dd>
                </div>
              </dl>
            </article>
          </div>

          {/* INSTRUÇÕES OPERACIONAIS */}
          <label className="mt-4 block">
            <span className={labelClass}>Instruções de Setup, Segurança e Critérios de Liberação</span>
            <textarea
              className="min-h-[90px] w-full rounded-[2px] border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 outline-none focus:border-[#48B7C7]"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Sequência de fixação do molde, purga inicial, verificação de refrigeração, reação a desvios, inspeção visual de rebarbas/bolhas e EPIs obrigatórios."
            />
          </label>

          {/* DUAS FOTOS DA MATERIA PRIMA (referencia fisica gravada na propria ficha) */}
          <FotosMateriaPrima
            empresaId={company}
            codigoFicha={code}
            valores={params}
            onChange={(chave, caminho) => updateParam(chave, caminho ?? '')}
          />

          {/* BOTÃO DE SALVAR */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="text-xs text-slate-500">
              SYSNQRA SISTEMAS INDUSTRIAIS • Dados integrados ao SGQ e Supabase
            </span>
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-4 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#236f91] disabled:opacity-50 print:hidden"
              type="button"
              onClick={() => void save()}
              disabled={busy}
            >
              <Save size={14} />
              {busy ? 'Gravando…' : isEditing ? 'Atualizar Ficha Técnica' : 'Gravar Ficha Técnica'}
            </button>
          </div>
        </section>

        {/* PAINEL DE FOTO DO MOLDE A SER FEITO (COM PREVIEW E SEM DUPLICIDADE) */}
        {category !== 'MONTAGEM_EMBALAGEM' && (
          <div className="mt-4 print:hidden">
            <PCPMoldPhotoPanel productId={productId} />
          </div>
        )}

        <footer className="mt-4 flex items-center gap-2 text-xs text-slate-500 print:hidden">
          <CalendarRange size={14} />
          {singleResourceProcess
            ? 'O PCP da SYSNQRA estima o tempo de execução e setup com base no ciclo padrão e cavidades ativas da ficha homologada.'
            : 'Ficha multiposto com roteiro integrado no módulo de Engenharia e PCP.'}
        </footer>
      </div>

      {/* ESTILOS DE IMPRESSÃO A4 INDUSTRIAL */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          html, body, #root {
            background: #fff !important;
            color: #111 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pcp-process-page {
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .pcp-ficha-print-sheet {
            width: 100% !important;
            background: #fff !important;
            color: #111 !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .pcp-ficha-print-sheet article,
          .pcp-ficha-print-sheet div,
          .pcp-ficha-print-sheet section {
            background: #fff !important;
            color: #111 !important;
            border-color: #94a3b8 !important;
            box-shadow: none !important;
          }
          .pcp-ficha-print-sheet input,
          .pcp-ficha-print-sheet select,
          .pcp-ficha-print-sheet textarea {
            color: #111 !important;
            background: #fff !important;
            border: 1px solid #94a3b8 !important;
          }
          .pcp-ficha-print-sheet svg {
            filter: contrast(150%) brightness(80%);
          }
          .pcp-mp-photos,
          .pcp-mp-photos div {
            background: #fff !important;
            color: #111 !important;
            border-color: #94a3b8 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  )
}
