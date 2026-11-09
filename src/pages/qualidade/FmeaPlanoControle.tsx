/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-FMEA-CPP-MAPA-20261108-01 — página única do trio APQP: FMEA (cabeçalho + matriz AIAG), Plano de Controle (CPP) e Mapa de Processo, com geração de um documento a partir do outro e impressão A4 com QR Code
 * @STATUS_APROVACAO: ORDEM EXPLICITA DO PROPRIETARIO EM 2026-11-08 — "veja o FMEA para vc fazer FMEA E Plano de Controle juntos ok e Mapa de Processo ... ai vc junta e elemina os outros"
 * Modelo de dados: FMEA e CPP em 20261106120000_erp_fmea_plano_controle_aiag_v1.sql (que reproduz a pasta
 * FMEA.xlsm enviada pelo proprietário); o mapa do processo em 20261108230000_erp_mapa_processo_v1.sql.
 * Esta tela substitui src/pages/qualidade/FMEA.tsx e PlanoControle.tsx — as três rotas continuam válidas e
 * abrem a aba correspondente, para não quebrar os QR Codes já impressos.
 */
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  AlertTriangle, ArrowRight, CheckSquare, ClipboardList, Factory, GitBranch, Layers, Link2, Plus, Printer,
  RefreshCw, Save, ShieldCheck, Trash2,
} from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { supabase } from '../../lib/supabaseClient'
import { abrirRelatorio } from '../../lib/report/abrirRelatorio'
import type { Documento } from '../../lib/report/documento'

/* ------------------------------------------------------------------ tipos */

type Aba = 'fmea' | 'plano' | 'mapa'
type Situacao = 'rascunho' | 'ativo' | 'revisado' | 'obsoleto'
type TipoFmea = 'processo' | 'produto' | 'projeto'
type TipoPlano = 'prototipo' | 'pre_lancamento' | 'producao'
type CaracteristicaFmea = 'nenhuma' | 'critica' | 'significativa' | 'seguranca' | 'regulatoria'
type CaracteristicaPlano = '' | 'critica' | 'significativa' | 'nenhuma'
type TipoEtapa = 'operacao' | 'transporte' | 'armazenagem' | 'inspecao' | 'espera' | 'decisao'
type Criticidade = 'normal' | 'importante' | 'critica'

type FmeaCabecalho = {
  id: string
  numero: string
  tipo: TipoFmea
  pagina: number
  total_paginas: number
  codigo_peca: string
  codigo_peca_cliente: string
  nome_peca: string
  cliente_projeto: string
  fornecedor: string
  codigo_fornecedor: string
  areas_envolvidas: string
  equipe_principal: string
  contato_principal: string
  telefone: string
  data_primeira_emissao: string
  data_revisao: string
  aprovacao_engenharia_cliente: string
  aprovacao_qualidade_cliente: string
  aprovacao_fornecedor_planta: string
  outra_aprovacao: string
  status: Situacao
  versao: number
}

type FmeaLinha = {
  id: string | null
  ordem: number
  codigo_item_processo: string
  funcao_requisito: string
  caracteristica_especial: CaracteristicaFmea
  modo_falha: string
  efeito: string
  severidade: number
  causa: string
  mecanismo_falha: string
  ocorrencia: number
  controle_prevencao: string
  controle_deteccao: string
  deteccao: number
  acao_recomendada: string
  acao_responsavel: string
  acao_prazo: string
  acao_tomada: string
  acao_resultado: string
  severidade_apos: number | ''
  ocorrencia_apos: number | ''
  deteccao_apos: number | ''
}

type Plano = {
  id: string
  numero: string
  tipo: TipoPlano
  pagina: number
  total_paginas: number
  codigo_peca: string
  nome_peca: string
  fornecedor_planta: string
  codigo_fornecedor: string
  contato_principal: string
  telefone: string
  data_original: string
  data_revisao: string
  equipe_principal: string
  aprovacao_engenharia_cliente: string
  aprovacao_qualidade_cliente: string
  aprovacao_fornecedor_planta: string
  outra_aprovacao: string
  status: Situacao
  versao: number
}

type PlanoLinha = {
  id: string | null
  ordem: number
  item_numero: string
  processo_operacao_numero: string
  descricao_produto_processo: string
  caracteristica_especial: CaracteristicaPlano
  maquina_dispositivo_ferramenta: string
  numero_controle: string
  metodo_manufatura: string
  padrao_avaliacao: string
  tecnica_medicao: string
  tamanho_amostra: string
  frequencia_amostra: string
  metodo_controle: string
  plano_reacao: string
  fmea_linha_id: string
}

type Mapa = {
  id: string
  numero: string
  produto_id: string
  codigo_peca: string
  nome_peca: string
  cliente_projeto: string
  processo: string
  responsavel: string
  data_emissao: string
  data_revisao: string
  revisao: number
  aprovado_por: string
  status: Situacao
  versao: number
  observacoes: string
  plano_controle_id: string
}

type MapaEtapa = {
  id: string | null
  ordem: number
  tipo_etapa: TipoEtapa
  etapa: string
  descricao: string
  setor: string
  maquina_id: string
  caracteristica_produto: string
  caracteristica_processo: string
  controle: string
  registro: string
  tempo_min: string
  criticidade: Criticidade
  plano_linha_id: string
}

type Maquina = { id: string; codigo: string; nome: string }

/* ---------------------------------------------------------------- rótulos */

const TIPOS_FMEA: { valor: TipoFmea; rotulo: string }[] = [
  { valor: 'processo', rotulo: 'Processo (PFMEA)' },
  { valor: 'produto', rotulo: 'Produto (DFMEA de peça)' },
  { valor: 'projeto', rotulo: 'Projeto / sistema' },
]
const TIPOS_PLANO: { valor: TipoPlano; rotulo: string }[] = [
  { valor: 'prototipo', rotulo: 'Protótipo' },
  { valor: 'pre_lancamento', rotulo: 'Pré-lançamento' },
  { valor: 'producao', rotulo: 'Produção' },
]
const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'revisado', rotulo: 'Revisado' },
  { valor: 'obsoleto', rotulo: 'Obsoleto' },
]
const CARACTERISTICAS_FMEA: { valor: CaracteristicaFmea; rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'critica', rotulo: 'Crítica' },
  { valor: 'significativa', rotulo: 'Significativa' },
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'regulatoria', rotulo: 'Regulatória' },
]
const CARACTERISTICAS_PLANO: { valor: CaracteristicaPlano; rotulo: string }[] = [
  { valor: '', rotulo: '—' },
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'critica', rotulo: 'Crítica' },
  { valor: 'significativa', rotulo: 'Significativa' },
]
const ETAPAS: { valor: TipoEtapa; rotulo: string; sigla: string }[] = [
  { valor: 'operacao', rotulo: 'Operação', sigla: 'OP' },
  { valor: 'inspecao', rotulo: 'Inspeção', sigla: 'IN' },
  { valor: 'transporte', rotulo: 'Transporte', sigla: 'TR' },
  { valor: 'armazenagem', rotulo: 'Armazenagem', sigla: 'AR' },
  { valor: 'espera', rotulo: 'Espera', sigla: 'EP' },
  { valor: 'decisao', rotulo: 'Decisão', sigla: 'DC' },
]
const CRITICIDADES: { valor: Criticidade; rotulo: string }[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'importante', rotulo: 'Importante' },
  { valor: 'critica', rotulo: 'Crítica' },
]

/* ------------------------------------------------------------- formatação */

const campo = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const rotulo = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const acao = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50'
const acaoLateral = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-50'
const celula = 'h-[28px] w-full rounded-[2px] border border-slate-200 bg-white px-1 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'

const cascaFmea: FmeaCabecalho = {
  id: '', numero: '', tipo: 'processo', pagina: 1, total_paginas: 1, codigo_peca: '', codigo_peca_cliente: '',
  nome_peca: '', cliente_projeto: '', fornecedor: '', codigo_fornecedor: '', areas_envolvidas: '',
  equipe_principal: '', contato_principal: '', telefone: '', data_primeira_emissao: '', data_revisao: '',
  aprovacao_engenharia_cliente: '', aprovacao_qualidade_cliente: '', aprovacao_fornecedor_planta: '',
  outra_aprovacao: '', status: 'rascunho', versao: 1,
}
const cascaPlano: Plano = {
  id: '', numero: '', tipo: 'producao', pagina: 1, total_paginas: 1, codigo_peca: '', nome_peca: '',
  fornecedor_planta: '', codigo_fornecedor: '', contato_principal: '', telefone: '', data_original: '',
  data_revisao: '', equipe_principal: '', aprovacao_engenharia_cliente: '', aprovacao_qualidade_cliente: '',
  aprovacao_fornecedor_planta: '', outra_aprovacao: '', status: 'rascunho', versao: 1,
}
const cascaMapa: Mapa = {
  id: '', numero: '', produto_id: '', codigo_peca: '', nome_peca: '', cliente_projeto: '', processo: '',
  responsavel: '', data_emissao: '', data_revisao: '', revisao: 1, aprovado_por: '', status: 'rascunho',
  versao: 1, observacoes: '', plano_controle_id: '',
}

const fmeaLinhaVazia = (ordem: number): FmeaLinha => ({
  id: null, ordem, codigo_item_processo: '', funcao_requisito: '', caracteristica_especial: 'nenhuma',
  modo_falha: '', efeito: '', severidade: 1, causa: '', mecanismo_falha: '', ocorrencia: 1,
  controle_prevencao: '', controle_deteccao: '', deteccao: 1, acao_recomendada: '', acao_responsavel: '',
  acao_prazo: '', acao_tomada: '', acao_resultado: '', severidade_apos: '', ocorrencia_apos: '', deteccao_apos: '',
})
const planoLinhaVazia = (ordem: number): PlanoLinha => ({
  id: null, ordem, item_numero: '', processo_operacao_numero: '', descricao_produto_processo: '',
  caracteristica_especial: '', maquina_dispositivo_ferramenta: '', numero_controle: '', metodo_manufatura: '',
  padrao_avaliacao: '', tecnica_medicao: '', tamanho_amostra: '', frequencia_amostra: '', metodo_controle: '',
  plano_reacao: '', fmea_linha_id: '',
})
const mapaEtapaVazia = (ordem: number): MapaEtapa => ({
  id: null, ordem, tipo_etapa: 'operacao', etapa: '', descricao: '', setor: '', maquina_id: '',
  caracteristica_produto: '', caracteristica_processo: '', controle: '', registro: '', tempo_min: '',
  criticidade: 'normal', plano_linha_id: '',
})

const nprDa = (linha: FmeaLinha) => linha.severidade * linha.ocorrencia * linha.deteccao
const nprAposDa = (linha: FmeaLinha) =>
  (linha.severidade_apos || linha.severidade) * (linha.ocorrencia_apos || linha.ocorrencia) * (linha.deteccao_apos || linha.deteccao)
const corNpr = (npr: number) => (npr >= 200 ? 'text-rose-700' : npr >= 100 ? 'text-amber-700' : 'text-emerald-700')

const dataTexto = (valor: string) => {
  if (!valor) return '—'
  const partes = valor.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor
}

const simboloDa = (tipo: TipoEtapa) => ETAPAS.find((e) => e.valor === tipo) ?? ETAPAS[0]
const rotuloCaracteristica = (valor: CaracteristicaPlano) => CARACTERISTICAS_PLANO.find((c) => c.valor === valor)?.rotulo ?? '—'

function corEtapa(tipo: TipoEtapa): string {
  if (tipo === 'inspecao') return 'border-emerald-300 bg-emerald-50 text-emerald-900'
  if (tipo === 'transporte') return 'border-amber-300 bg-amber-50 text-amber-900'
  if (tipo === 'armazenagem') return 'border-violet-300 bg-violet-50 text-violet-900'
  if (tipo === 'espera') return 'border-slate-300 bg-slate-100 text-slate-700'
  if (tipo === 'decisao') return 'border-rose-300 bg-rose-50 text-rose-900'
  return 'border-[#9CC9DA] bg-[#EAF6FA] text-[#123B50]'
}

/**
 * A migration pode não estar aplicada no banco da empresa. O aviso diz isso por extenso: a regra
 * permanente é não inventar dados nem apresentar como funcional o que o banco ainda não tem.
 */
function explicarFalha(cause: unknown, migration: string): string {
  const erro = cause as { code?: string; message?: string; details?: string } | null
  const texto = `${erro?.code ?? ''} ${erro?.message ?? ''} ${erro?.details ?? ''}`.toLowerCase()
  if (texto.includes('pgrst205') || texto.includes('does not exist') || texto.includes('42p01') || texto.includes('could not find the table'))
    return `A migration ${migration} ainda não foi aplicada no banco desta empresa. Nada foi preenchido com dados fictícios: aplique o pacote de migrations e volte à tela.`
  return erro?.message ?? 'Falha ao consultar o banco da empresa.'
}

const MIGRATION_FMEA = '20261106120000_erp_fmea_plano_controle_aiag_v1'
const MIGRATION_MAPA = '20261108230000_erp_mapa_processo_v1'

/* ------------------------------------------------------------- componente */

export default function FmeaPlanoControle() {
  const local = useLocation()
  const [searchParams] = useSearchParams()
  const [aba, setAba] = useState<Aba>('fmea')
  const [companyId, setCompanyId] = useState('')

  const [fmeaLista, setFmeaLista] = useState<FmeaCabecalho[]>([])
  const [fmea, setFmea] = useState<FmeaCabecalho>(cascaFmea)
  const [fmeaLinhas, setFmeaLinhas] = useState<FmeaLinha[]>([])
  const [fmeaMarcas, setFmeaMarcas] = useState<Record<string, string>>({})

  const [planoLista, setPlanoLista] = useState<Plano[]>([])
  const [plano, setPlano] = useState<Plano>(cascaPlano)
  const [planoLinhas, setPlanoLinhas] = useState<PlanoLinha[]>([])
  const [planoMarcas, setPlanoMarcas] = useState<Record<string, string>>({})

  const [mapaLista, setMapaLista] = useState<Mapa[]>([])
  const [mapa, setMapa] = useState<Mapa>(cascaMapa)
  const [mapaEtapas, setMapaEtapas] = useState<MapaEtapa[]>([])
  const [mapaMarcas, setMapaMarcas] = useState<Record<string, string>>({})
  const [maquinas, setMaquinas] = useState<Maquina[]>([])

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [avisos, setAvisos] = useState<string[]>([])

  const falhou = useCallback((cause: unknown, migration = MIGRATION_FMEA) => {
    setErros((atual) => [...new Set([...atual, explicarFalha(cause, migration)])])
  }, [])

  /* ---------------------------------------------------------- carregamento */

  const carregarFmeas = useCallback(async () => {
    try {
      const resultado = await supabase
        .from('erp_fmea_cabecalho')
        .select('id,numero,tipo,pagina,total_paginas,codigo_peca,codigo_peca_cliente,nome_peca,cliente_projeto,fornecedor,codigo_fornecedor,areas_envolvidas,equipe_principal,contato_principal,telefone,data_primeira_emissao,data_revisao,aprovacao_engenharia_cliente,aprovacao_qualidade_cliente,aprovacao_fornecedor_planta,outra_aprovacao,status,versao')
        .eq('empresa_id', companyId)
        .order('numero', { ascending: true })
        .order('versao', { ascending: false })
        .limit(200)
      if (resultado.error) throw resultado.error
      const lista = (resultado.data ?? []).map((registro) => ({
        ...registro,
        data_primeira_emissao: String(registro.data_primeira_emissao ?? ''),
        data_revisao: String(registro.data_revisao ?? ''),
      })) as FmeaCabecalho[]
      setFmeaLista(lista)
      return lista
    } catch (cause) {
      falhou(cause)
      return []
    }
  }, [companyId, falhou])

  const carregarFmeaLinhas = useCallback(async (cabecalhoId: string) => {
    try {
      const resultado = await supabase
        .from('qualidade_fmea')
        .select('id,ordem,codigo_item_processo,funcao_requisito,caracteristica_especial,modo_falha,efeito,severidade,causa,mecanismo_falha,ocorrencia,controle_prevencao,controle_deteccao,deteccao,acao_recomendada,acao_responsavel,acao_prazo,acao_tomada,acao_resultado,severidade_apos,ocorrencia_apos,deteccao_apos,funcao,controles')
        .eq('empresa_id', companyId)
        .eq('cabecalho_id', cabecalhoId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(500)
      if (resultado.error) throw resultado.error
      const linhas: FmeaLinha[] = (resultado.data ?? []).map((registro) => ({
        id: registro.id,
        ordem: Number(registro.ordem ?? 1),
        codigo_item_processo: String(registro.codigo_item_processo ?? ''),
        funcao_requisito: String(registro.funcao_requisito ?? registro.codigo_item_processo ?? ''),
        caracteristica_especial: (CARACTERISTICAS_FMEA.some((c) => c.valor === registro.caracteristica_especial)
          ? String(registro.caracteristica_especial) : 'nenhuma') as CaracteristicaFmea,
        modo_falha: String(registro.modo_falha ?? ''),
        efeito: String(registro.efeito ?? ''),
        severidade: Number(registro.severidade ?? 1),
        causa: String(registro.causa ?? ''),
        mecanismo_falha: String(registro.mecanismo_falha ?? ''),
        ocorrencia: Number(registro.ocorrencia ?? 1),
        controle_prevencao: String(registro.controle_prevencao ?? registro.controles ?? ''),
        controle_deteccao: String(registro.controle_deteccao ?? ''),
        deteccao: Number(registro.deteccao ?? 1),
        acao_recomendada: String(registro.acao_recomendada ?? ''),
        acao_responsavel: String(registro.acao_responsavel ?? ''),
        acao_prazo: String(registro.acao_prazo ?? ''),
        acao_tomada: String(registro.acao_tomada ?? ''),
        acao_resultado: String(registro.acao_resultado ?? ''),
        severidade_apos: registro.severidade_apos === null || registro.severidade_apos === undefined ? '' : Number(registro.severidade_apos),
        ocorrencia_apos: registro.ocorrencia_apos === null || registro.ocorrencia_apos === undefined ? '' : Number(registro.ocorrencia_apos),
        deteccao_apos: registro.deteccao_apos === null || registro.deteccao_apos === undefined ? '' : Number(registro.deteccao_apos),
      }))
      setFmeaLinhas(linhas)
      setFmeaMarcas(Object.fromEntries(linhas.map((linha) => [linha.id as string, JSON.stringify(linha)])))
    } catch (cause) {
      falhou(cause)
      setFmeaLinhas([])
      setFmeaMarcas({})
    }
  }, [companyId, falhou])

  const carregarPlanos = useCallback(async () => {
    try {
      const resultado = await supabase
        .from('erp_plano_controle')
        .select('id,numero,tipo,pagina,total_paginas,codigo_peca,nome_peca,fornecedor_planta,codigo_fornecedor,contato_principal,telefone,data_original,data_revisao,equipe_principal,aprovacao_engenharia_cliente,aprovacao_qualidade_cliente,aprovacao_fornecedor_planta,outra_aprovacao,status,versao')
        .eq('empresa_id', companyId)
        .order('numero', { ascending: true })
        .order('versao', { ascending: false })
        .limit(200)
      if (resultado.error) throw resultado.error
      const lista = (resultado.data ?? []).map((registro) => ({
        ...registro,
        data_original: String(registro.data_original ?? ''),
        data_revisao: String(registro.data_revisao ?? ''),
      })) as Plano[]
      setPlanoLista(lista)
      return lista
    } catch (cause) {
      falhou(cause)
      return []
    }
  }, [companyId, falhou])

  const carregarPlanoLinhas = useCallback(async (planoId: string) => {
    try {
      const resultado = await supabase
        .from('erp_plano_controle_linha')
        .select('id,ordem,item_numero,processo_operacao_numero,descricao_produto_processo,caracteristica_especial,maquina_dispositivo_ferramenta,numero_controle,metodo_manufatura,padrao_avaliacao,tecnica_medicao,tamanho_amostra,frequencia_amostra,metodo_controle,plano_reacao,fmea_linha_id')
        .eq('empresa_id', companyId)
        .eq('plano_id', planoId)
        .order('ordem', { ascending: true })
        .limit(500)
      if (resultado.error) throw resultado.error
      const linhas: PlanoLinha[] = (resultado.data ?? []).map((registro) => ({
        id: String(registro.id),
        ordem: Number(registro.ordem ?? 1),
        item_numero: String(registro.item_numero ?? ''),
        processo_operacao_numero: String(registro.processo_operacao_numero ?? ''),
        descricao_produto_processo: String(registro.descricao_produto_processo ?? ''),
        caracteristica_especial: (CARACTERISTICAS_PLANO.some((c) => c.valor === registro.caracteristica_especial)
          ? String(registro.caracteristica_especial) : '') as CaracteristicaPlano,
        maquina_dispositivo_ferramenta: String(registro.maquina_dispositivo_ferramenta ?? ''),
        numero_controle: String(registro.numero_controle ?? ''),
        metodo_manufatura: String(registro.metodo_manufatura ?? ''),
        padrao_avaliacao: String(registro.padrao_avaliacao ?? ''),
        tecnica_medicao: String(registro.tecnica_medicao ?? ''),
        tamanho_amostra: String(registro.tamanho_amostra ?? ''),
        frequencia_amostra: String(registro.frequencia_amostra ?? ''),
        metodo_controle: String(registro.metodo_controle ?? ''),
        plano_reacao: String(registro.plano_reacao ?? ''),
        fmea_linha_id: String(registro.fmea_linha_id ?? ''),
      }))
      setPlanoLinhas(linhas)
      setPlanoMarcas(Object.fromEntries(linhas.map((linha) => [linha.id as string, JSON.stringify(linha)])))
    } catch (cause) {
      falhou(cause)
      setPlanoLinhas([])
      setPlanoMarcas({})
    }
  }, [companyId, falhou])

  const carregarMapas = useCallback(async () => {
    try {
      const resultado = await supabase
        .from('erp_mapa_processo')
        .select('id,numero,produto_id,codigo_peca,nome_peca,cliente_projeto,processo,responsavel,data_emissao,data_revisao,revisao,aprovado_por,status,versao,observacoes,plano_controle_id')
        .eq('empresa_id', companyId)
        .order('numero', { ascending: true })
        .order('versao', { ascending: false })
        .limit(200)
      if (resultado.error) throw resultado.error
      const lista = (resultado.data ?? []).map((registro) => ({
        ...registro,
        data_emissao: String(registro.data_emissao ?? ''),
        data_revisao: String(registro.data_revisao ?? ''),
        observacoes: String(registro.observacoes ?? ''),
        produto_id: String(registro.produto_id ?? ''),
        plano_controle_id: String(registro.plano_controle_id ?? ''),
      })) as Mapa[]
      setMapaLista(lista)
      return lista
    } catch (cause) {
      falhou(cause, MIGRATION_MAPA)
      return []
    }
  }, [companyId, falhou])

  const carregarMapaEtapas = useCallback(async (mapaId: string) => {
    try {
      const resultado = await supabase
        .from('erp_mapa_processo_etapa')
        .select('id,ordem,tipo_etapa,etapa,descricao,setor,maquina_id,caracteristica_produto,caracteristica_processo,controle,registro,tempo_min,criticidade,plano_linha_id')
        .eq('empresa_id', companyId)
        .eq('mapa_id', mapaId)
        .order('ordem', { ascending: true })
        .limit(500)
      if (resultado.error) throw resultado.error
      const etapas: MapaEtapa[] = (resultado.data ?? []).map((registro) => ({
        id: String(registro.id),
        ordem: Number(registro.ordem ?? 1),
        tipo_etapa: (ETAPAS.some((e) => e.valor === registro.tipo_etapa) ? String(registro.tipo_etapa) : 'operacao') as TipoEtapa,
        etapa: String(registro.etapa ?? ''),
        descricao: String(registro.descricao ?? ''),
        setor: String(registro.setor ?? ''),
        maquina_id: String(registro.maquina_id ?? ''),
        caracteristica_produto: String(registro.caracteristica_produto ?? ''),
        caracteristica_processo: String(registro.caracteristica_processo ?? ''),
        controle: String(registro.controle ?? ''),
        registro: String(registro.registro ?? ''),
        tempo_min: registro.tempo_min === null || registro.tempo_min === undefined ? '' : String(registro.tempo_min),
        criticidade: (CRITICIDADES.some((c) => c.valor === registro.criticidade) ? String(registro.criticidade) : 'normal') as Criticidade,
        plano_linha_id: String(registro.plano_linha_id ?? ''),
      }))
      setMapaEtapas(etapas)
      setMapaMarcas(Object.fromEntries(etapas.map((etapa) => [etapa.id as string, JSON.stringify(etapa)])))
    } catch (cause) {
      falhou(cause, MIGRATION_MAPA)
      setMapaEtapas([])
      setMapaMarcas({})
    }
  }, [companyId, falhou])

  const iniciar = useCallback(async () => {
    setCarregando(true)
    setErros([])
    setAvisos([])
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa ativa não identificada.')
      setCompanyId(tenant.data)
    } catch (cause) {
      falhou(cause, 'de identificação da empresa (erp_current_empresa_id)')
    } finally {
      setCarregando(false)
    }
  }, [falhou])

  useEffect(() => { void iniciar() }, [iniciar])

  useEffect(() => {
    if (!companyId) return
    void (async () => {
      await Promise.all([carregarFmeas(), carregarPlanos(), carregarMapas()])
    })()
  }, [companyId, carregarFmeas, carregarPlanos, carregarMapas])

  useEffect(() => {
    if (!companyId) return
    void supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(1000)
      .then(({ data }) => setMaquinas((data ?? []) as Maquina[]))
  }, [companyId])

  /* --------------------------------------------------- aba a partir da rota */

  useEffect(() => {
    if (local.pathname.includes('plano-controle')) setAba('plano')
    else if (local.pathname.includes('mapa-processo')) setAba('mapa')
    else setAba('fmea')
  }, [local.pathname])

  /* ------------------------------------------------ seleção por ?doc= (QR) */

  const docDaUrl = searchParams.get('doc')
  useEffect(() => {
    if (!docDaUrl) return
    if (local.pathname.includes('plano-controle')) {
      const selecionado = planoLista.find((registro) => registro.id === docDaUrl)
      if (selecionado) { setPlano(selecionado); void carregarPlanoLinhas(selecionado.id) }
    } else if (local.pathname.includes('mapa-processo')) {
      const selecionado = mapaLista.find((registro) => registro.id === docDaUrl)
      if (selecionado) { setMapa(selecionado); void carregarMapaEtapas(selecionado.id) }
    } else {
      const selecionado = fmeaLista.find((registro) => registro.id === docDaUrl)
      if (selecionado) { setFmea(selecionado); void carregarFmeaLinhas(selecionado.id) }
    }
    // As listas chegam depois do primeiro render; o efeito roda novamente quando elas existem.
  }, [docDaUrl, local.pathname, fmeaLista, planoLista, mapaLista, carregarFmeaLinhas, carregarPlanoLinhas, carregarMapaEtapas])

  /* ------------------------------------------------------------- FMEA */

  const atualizarFmea = (chave: keyof FmeaCabecalho, valor: string | number) =>
    setFmea((atual) => ({ ...atual, [chave]: valor }))
  const editarFmeaLinha = (index: number, chave: keyof FmeaLinha, valor: string | number) =>
    setFmeaLinhas((atual) => atual.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha)))

  function selecionarFmea(id: string) {
    const selecionado = fmeaLista.find((registro) => registro.id === id)
    if (!selecionado) return
    setErros([])
    setFmea(selecionado)
    void carregarFmeaLinhas(id)
  }

  async function salvarFmeaCabecalho() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!fmea.numero.trim()) { setErros(['Informe o número do FMEA (campo do cabeçalho da planilha do proprietário).']); return }
    setErros([])
    setSalvando(true)
    try {
      const corpo = {
        empresa_id: companyId,
        numero: fmea.numero.trim(),
        tipo: fmea.tipo,
        pagina: fmea.pagina,
        total_paginas: fmea.total_paginas,
        codigo_peca: fmea.codigo_peca.trim(),
        codigo_peca_cliente: fmea.codigo_peca_cliente.trim(),
        nome_peca: fmea.nome_peca.trim(),
        cliente_projeto: fmea.cliente_projeto.trim(),
        fornecedor: fmea.fornecedor.trim(),
        codigo_fornecedor: fmea.codigo_fornecedor.trim(),
        areas_envolvidas: fmea.areas_envolvidas.trim(),
        equipe_principal: fmea.equipe_principal.trim(),
        contato_principal: fmea.contato_principal.trim(),
        telefone: fmea.telefone.trim(),
        data_primeira_emissao: fmea.data_primeira_emissao || null,
        data_revisao: fmea.data_revisao || null,
        aprovacao_engenharia_cliente: fmea.aprovacao_engenharia_cliente.trim(),
        aprovacao_qualidade_cliente: fmea.aprovacao_qualidade_cliente.trim(),
        aprovacao_fornecedor_planta: fmea.aprovacao_fornecedor_planta.trim(),
        outra_aprovacao: fmea.outra_aprovacao.trim(),
        status: fmea.status,
        versao: fmea.versao,
      }
      let idSalvo = fmea.id
      if (fmea.id) {
        const atualizado = await supabase.from('erp_fmea_cabecalho').update(corpo).eq('id', fmea.id).select('id').maybeSingle()
        if (atualizado.error) throw atualizado.error
      } else {
        const inserido = await supabase.from('erp_fmea_cabecalho').insert({ ...corpo, criado_por: null }).select('id').single()
        if (inserido.error) throw inserido.error
        idSalvo = String(inserido.data.id)
      }
      setFmea((atual) => ({ ...atual, id: idSalvo }))
      await carregarFmeas()
      setAvisos([`FMEA ${fmea.numero.trim()} rev ${fmea.versao} gravado no banco da empresa.`])
    } catch (cause) {
      falhou(cause)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarFmeaLinhas() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!fmea.id) { setErros(['Salve o cabeçalho do FMEA antes de gravar as linhas de risco.']); return }
    const completas = fmeaLinhas.filter((linha) => linha.codigo_item_processo.trim() && linha.modo_falha.trim() && linha.causa.trim())
    if (completas.length !== fmeaLinhas.length) {
      setErros(['Toda linha precisa de item/processo, modo de falha e causa. A planilha do proprietário não aceita linha em branco.'])
      return
    }
    setErros([])
    const alteradas = completas.filter((linha) => !linha.id || fmeaMarcas[linha.id] !== JSON.stringify(linha))
    if (alteradas.length === 0) {
      if (completas.length > 0) setAvisos(['Nenhuma linha alterada desde a última gravação.'])
      return
    }
    setSalvando(true)
    try {
      for (const linha of alteradas) {
        const npr = nprDa(linha)
        // As colunas legadas (funcao, controles, acoes_recomendadas, status_acao) continuam alimentadas:
        // outras telas do SGQ ainda leem esses campos do banco.
        const corpo = {
          empresa_id: companyId,
          cabecalho_id: fmea.id,
          ordem: linha.ordem,
          codigo_item_processo: linha.codigo_item_processo.trim(),
          funcao: linha.funcao_requisito.trim(),
          funcao_requisito: linha.funcao_requisito.trim(),
          modo_falha: linha.modo_falha.trim(),
          efeito: linha.efeito.trim(),
          severidade: linha.severidade,
          causa: linha.causa.trim(),
          mecanismo_falha: linha.mecanismo_falha.trim(),
          ocorrencia: linha.ocorrencia,
          controles: [linha.controle_prevencao.trim(), linha.controle_deteccao.trim()].filter(Boolean).join(' | '),
          controle_prevencao: linha.controle_prevencao.trim(),
          controle_deteccao: linha.controle_deteccao.trim(),
          deteccao: linha.deteccao,
          npr,
          acao_recomendada: linha.acao_recomendada.trim(),
          acao_responsavel: linha.acao_responsavel.trim(),
          acao_prazo: linha.acao_prazo || null,
          acao_tomada: linha.acao_tomada.trim(),
          acao_resultado: linha.acao_resultado.trim(),
          acoes_recomendadas: linha.acao_recomendada.trim()
            ? [{ acao: linha.acao_recomendada.trim(), responsavel: linha.acao_responsavel.trim() || null, prazo: linha.acao_prazo || null }]
            : [],
          status_acao: linha.acao_tomada.trim() ? 'concluida' : linha.acao_recomendada.trim() ? 'aberta' : 'na_parcialidade',
          caracteristica_especial: linha.caracteristica_especial,
          severidade_apos: linha.severidade_apos === '' ? null : linha.severidade_apos,
          ocorrencia_apos: linha.ocorrencia_apos === '' ? null : linha.ocorrencia_apos,
          deteccao_apos: linha.deteccao_apos === '' ? null : linha.deteccao_apos,
        }
        if (linha.id) {
          const atualizado = await supabase.from('qualidade_fmea').update(corpo).eq('id', linha.id)
          if (atualizado.error) throw atualizado.error
        } else {
          const inserido = await supabase.from('qualidade_fmea').insert(corpo)
          if (inserido.error) throw inserido.error
        }
      }
      await carregarFmeaLinhas(fmea.id)
      setAvisos([`${alteradas.length} linha(s) de risco gravada(s) em qualidade_fmea.`])
    } catch (cause) {
      falhou(cause)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirFmeaLinha(index: number) {
    const linha = fmeaLinhas[index]
    if (!linha) return
    if (!linha.id) {
      setFmeaLinhas((atual) => atual.filter((_, i) => i !== index))
      return
    }
    setErros([])
    try {
      const removida = await supabase.from('qualidade_fmea').delete().eq('id', linha.id)
      if (removida.error) throw removida.error
      if (fmea.id) await carregarFmeaLinhas(fmea.id)
      setAvisos(['Linha removida do banco da empresa.'])
    } catch (cause) {
      falhou(cause)
    }
  }

  const resumoFmea = useMemo(() => {
    if (fmeaLinhas.length === 0) return null
    const valores = fmeaLinhas.map(nprDa)
    const apos = fmeaLinhas.map(nprAposDa)
    return {
      total: fmeaLinhas.length,
      maximo: Math.max(...valores),
      medio: Math.round((valores.reduce((a, b) => a + b, 0) / fmeaLinhas.length) * 10) / 10,
      maximoApos: Math.max(...apos),
      criticas: fmeaLinhas.filter((linha) => linha.caracteristica_especial !== 'nenhuma').length,
      acoes: fmeaLinhas.filter((linha) => linha.acao_recomendada.trim() && !linha.acao_tomada.trim()).length,
    }
  }, [fmeaLinhas])

  /* --------------------------------------------------- PLANO DE CONTROLE */

  const atualizarPlano = (chave: keyof Plano, valor: string | number) =>
    setPlano((atual) => ({ ...atual, [chave]: valor }))
  const editarPlanoLinha = (index: number, chave: keyof PlanoLinha, valor: string | number) =>
    setPlanoLinhas((atual) => atual.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha)))

  function selecionarPlano(id: string) {
    const selecionado = planoLista.find((registro) => registro.id === id)
    if (!selecionado) return
    setErros([])
    setPlano(selecionado)
    void carregarPlanoLinhas(id)
  }

  async function salvarPlano() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!plano.numero.trim()) { setErros(['Informe o número do Plano de Controle.']); return }
    setErros([])
    setSalvando(true)
    try {
      const corpo = {
        empresa_id: companyId,
        numero: plano.numero.trim(),
        tipo: plano.tipo,
        pagina: plano.pagina,
        total_paginas: plano.total_paginas,
        codigo_peca: plano.codigo_peca.trim(),
        nome_peca: plano.nome_peca.trim(),
        fornecedor_planta: plano.fornecedor_planta.trim(),
        codigo_fornecedor: plano.codigo_fornecedor.trim(),
        contato_principal: plano.contato_principal.trim(),
        telefone: plano.telefone.trim(),
        data_original: plano.data_original || null,
        data_revisao: plano.data_revisao || null,
        equipe_principal: plano.equipe_principal.trim(),
        aprovacao_engenharia_cliente: plano.aprovacao_engenharia_cliente.trim(),
        aprovacao_qualidade_cliente: plano.aprovacao_qualidade_cliente.trim(),
        aprovacao_fornecedor_planta: plano.aprovacao_fornecedor_planta.trim(),
        outra_aprovacao: plano.outra_aprovacao.trim(),
        status: plano.status,
        versao: plano.versao,
      }
      let idSalvo = plano.id
      if (plano.id) {
        const atualizado = await supabase.from('erp_plano_controle').update(corpo).eq('id', plano.id).select('id').maybeSingle()
        if (atualizado.error) throw atualizado.error
      } else {
        const inserido = await supabase.from('erp_plano_controle').insert(corpo).select('id').single()
        if (inserido.error) throw inserido.error
        idSalvo = String(inserido.data.id)
      }
      setPlano((atual) => ({ ...atual, id: idSalvo }))
      await carregarPlanos()
      setAvisos([`Plano de Controle ${plano.numero.trim()} rev ${plano.versao} gravado no banco da empresa.`])
    } catch (cause) {
      falhou(cause)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarPlanoLinhas() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!plano.id) { setErros(['Salve o cabeçalho do Plano de Controle antes de gravar as linhas.']); return }
    const completas = planoLinhas.filter((linha) => linha.descricao_produto_processo.trim() || linha.processo_operacao_numero.trim())
    if (completas.length !== planoLinhas.length) {
      setErros(['Cada linha precisa de nº da operação ou da descrição do produto/processo.'])
      return
    }
    setErros([])
    const alteradas = completas.filter((linha) => !linha.id || planoMarcas[linha.id] !== JSON.stringify(linha))
    if (alteradas.length === 0) {
      if (completas.length > 0) setAvisos(['Nenhuma linha alterada desde a última gravação.'])
      return
    }
    setSalvando(true)
    try {
      for (const linha of alteradas) {
        const corpo = {
          empresa_id: companyId,
          plano_id: plano.id,
          ordem: linha.ordem,
          item_numero: linha.item_numero.trim(),
          processo_operacao_numero: linha.processo_operacao_numero.trim(),
          descricao_produto_processo: linha.descricao_produto_processo.trim(),
          caracteristica_especial: linha.caracteristica_especial,
          maquina_dispositivo_ferramenta: linha.maquina_dispositivo_ferramenta.trim(),
          numero_controle: linha.numero_controle.trim(),
          metodo_manufatura: linha.metodo_manufatura.trim(),
          padrao_avaliacao: linha.padrao_avaliacao.trim(),
          tecnica_medicao: linha.tecnica_medicao.trim(),
          tamanho_amostra: linha.tamanho_amostra.trim(),
          frequencia_amostra: linha.frequencia_amostra.trim(),
          metodo_controle: linha.metodo_controle.trim(),
          plano_reacao: linha.plano_reacao.trim(),
          fmea_linha_id: linha.fmea_linha_id || null,
        }
        if (linha.id) {
          const atualizado = await supabase.from('erp_plano_controle_linha').update(corpo).eq('id', linha.id)
          if (atualizado.error) throw atualizado.error
        } else {
          const inserido = await supabase.from('erp_plano_controle_linha').insert(corpo)
          if (inserido.error) throw inserido.error
        }
      }
      await carregarPlanoLinhas(plano.id)
      setAvisos([`${alteradas.length} linha(s) do plano gravada(s) em erp_plano_controle_linha.`])
    } catch (cause) {
      falhou(cause)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirPlanoLinha(index: number) {
    const linha = planoLinhas[index]
    if (!linha) return
    if (!linha.id) {
      setPlanoLinhas((atual) => atual.filter((_, i) => i !== index))
      return
    }
    setErros([])
    try {
      const removida = await supabase.from('erp_plano_controle_linha').delete().eq('id', linha.id)
      if (removida.error) throw removida.error
      if (plano.id) await carregarPlanoLinhas(plano.id)
      setAvisos(['Linha removida do banco da empresa.'])
    } catch (cause) {
      falhou(cause)
    }
  }

  /**
   * Liga o plano ao FMEA: cada risco do cabeçalho em edição vira uma linha de controle ainda não
   * gravada, com a FK fmea_linha_id preenchida. A gravação continua sendo um ato explícito.
   */
  function gerarPlanoAPartirDoFmea() {
    setErros([])
    if (!fmea.id) { setErros(['Selecione e salve um FMEA na aba FMEA antes de gerar o plano a partir dele.']); return }
    if (!plano.id) { setErros(['Salve o cabeçalho do Plano de Controle antes de gerar as linhas.']); return }
    const ligadas = new Set(planoLinhas.map((linha) => linha.fmea_linha_id).filter(Boolean))
    const novas = fmeaLinhas
      .filter((linha) => linha.id && !ligadas.has(linha.id))
      .map((linha, indice): PlanoLinha => ({
        ...planoLinhaVazia(planoLinhas.length + indice + 1),
        descricao_produto_processo: [linha.codigo_item_processo, linha.funcao_requisito].filter(Boolean).join(' — '),
        caracteristica_especial: linha.caracteristica_especial === 'critica' || linha.caracteristica_especial === 'seguranca'
          ? 'critica' : linha.caracteristica_especial === 'significativa' ? 'significativa' : 'nenhuma',
        metodo_controle: linha.controle_deteccao,
        padrao_avaliacao: linha.controle_prevencao,
        plano_reacao: linha.acao_recomendada ? `Ação recomendada: ${linha.acao_recomendada}` : '',
        fmea_linha_id: linha.id as string,
      }))
    if (novas.length === 0) { setAvisos(['Todas as linhas do FMEA selecionado já estão ligadas a este plano.']); return }
    setPlanoLinhas((atual) => [...atual, ...novas])
    setAvisos([`${novas.length} linha(s) criada(s) a partir do FMEA ${fmea.numero}. Revise e clique em "Salvar linhas".`])
  }

  /* ---------------------------------------------------- MAPA DE PROCESSO */

  const atualizarMapa = (chave: keyof Mapa, valor: string | number) =>
    setMapa((atual) => ({ ...atual, [chave]: valor }))
  const editarEtapa = (index: number, chave: keyof MapaEtapa, valor: string | number) =>
    setMapaEtapas((atual) => atual.map((etapa, i) => (i === index ? { ...etapa, [chave]: valor } : etapa)))

  function selecionarMapa(id: string) {
    const selecionado = mapaLista.find((registro) => registro.id === id)
    if (!selecionado) return
    setErros([])
    setMapa(selecionado)
    void carregarMapaEtapas(id)
  }

  async function salvarMapa() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!mapa.numero.trim()) { setErros(['Informe o número do Mapa de Processo.']); return }
    setErros([])
    setSalvando(true)
    try {
      const corpo = {
        empresa_id: companyId,
        numero: mapa.numero.trim(),
        produto_id: mapa.produto_id || null,
        codigo_peca: mapa.codigo_peca.trim(),
        nome_peca: mapa.nome_peca.trim(),
        cliente_projeto: mapa.cliente_projeto.trim(),
        processo: mapa.processo.trim(),
        responsavel: mapa.responsavel.trim(),
        data_emissao: mapa.data_emissao || null,
        data_revisao: mapa.data_revisao || null,
        revisao: mapa.revisao,
        aprovado_por: mapa.aprovado_por.trim(),
        status: mapa.status,
        versao: mapa.versao,
        observacoes: mapa.observacoes.trim() || null,
        plano_controle_id: mapa.plano_controle_id || null,
      }
      let idSalvo = mapa.id
      if (mapa.id) {
        const atualizado = await supabase.from('erp_mapa_processo').update(corpo).eq('id', mapa.id).select('id').maybeSingle()
        if (atualizado.error) throw atualizado.error
      } else {
        const inserido = await supabase.from('erp_mapa_processo').insert(corpo).select('id').single()
        if (inserido.error) throw inserido.error
        idSalvo = String(inserido.data.id)
      }
      setMapa((atual) => ({ ...atual, id: idSalvo }))
      await carregarMapas()
      setAvisos([`Mapa de Processo ${mapa.numero.trim()} rev ${mapa.revisao} gravado no banco da empresa.`])
    } catch (cause) {
      falhou(cause, MIGRATION_MAPA)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEtapas() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!mapa.id) { setErros(['Salve o cabeçalho do Mapa de Processo antes de gravar as etapas.']); return }
    const completas = mapaEtapas.filter((etapa) => etapa.etapa.trim())
    if (completas.length !== mapaEtapas.length) {
      setErros(['Toda etapa do fluxo precisa de um nome de etapa.'])
      return
    }
    setErros([])
    const alteradas = completas.filter((etapa) => !etapa.id || mapaMarcas[etapa.id] !== JSON.stringify(etapa))
    if (alteradas.length === 0) {
      if (completas.length > 0) setAvisos(['Nenhuma etapa alterada desde a última gravação.'])
      return
    }
    setSalvando(true)
    try {
      for (const etapa of alteradas) {
        const tempo = etapa.tempo_min.trim() === '' ? null : Number(etapa.tempo_min)
        if (tempo !== null && (!Number.isFinite(tempo) || tempo < 0)) throw new Error(`Tempo inválido na etapa ${etapa.ordem}.`)
        const corpo = {
          empresa_id: companyId,
          mapa_id: mapa.id,
          ordem: etapa.ordem,
          tipo_etapa: etapa.tipo_etapa,
          etapa: etapa.etapa.trim(),
          descricao: etapa.descricao.trim(),
          setor: etapa.setor.trim(),
          maquina_id: etapa.maquina_id || null,
          caracteristica_produto: etapa.caracteristica_produto.trim(),
          caracteristica_processo: etapa.caracteristica_processo.trim(),
          controle: etapa.controle.trim(),
          registro: etapa.registro.trim(),
          tempo_min: tempo,
          criticidade: etapa.criticidade,
          plano_linha_id: etapa.plano_linha_id || null,
        }
        if (etapa.id) {
          const atualizado = await supabase.from('erp_mapa_processo_etapa').update(corpo).eq('id', etapa.id)
          if (atualizado.error) throw atualizado.error
        } else {
          const inserido = await supabase.from('erp_mapa_processo_etapa').insert(corpo)
          if (inserido.error) throw inserido.error
        }
      }
      await carregarMapaEtapas(mapa.id)
      setAvisos([`${alteradas.length} etapa(s) gravada(s) em erp_mapa_processo_etapa.`])
    } catch (cause) {
      falhou(cause, MIGRATION_MAPA)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirEtapa(index: number) {
    const etapa = mapaEtapas[index]
    if (!etapa) return
    if (!etapa.id) {
      setMapaEtapas((atual) => atual.filter((_, i) => i !== index))
      return
    }
    setErros([])
    try {
      const removida = await supabase.from('erp_mapa_processo_etapa').delete().eq('id', etapa.id)
      if (removida.error) throw removida.error
      if (mapa.id) await carregarMapaEtapas(mapa.id)
      setAvisos(['Etapa removida do banco da empresa.'])
    } catch (cause) {
      falhou(cause, MIGRATION_MAPA)
    }
  }

  /** Gera as etapas do fluxo a partir das linhas do Plano de Controle vinculado. */
  function gerarEtapasDoPlano() {
    setErros([])
    if (!mapa.id) { setErros(['Salve o cabeçalho do Mapa de Processo antes de gerar as etapas.']); return }
    if (!mapa.plano_controle_id) { setErros(['Vincule um Plano de Controle no cabeçalho do mapa antes de gerar as etapas.']); return }
    const ligadas = new Set(mapaEtapas.map((etapa) => etapa.plano_linha_id).filter(Boolean))
    const novas = planoLinhas
      .filter((linha) => linha.id && !ligadas.has(linha.id))
      .map((linha, indice): MapaEtapa => ({
        ...mapaEtapaVazia(mapaEtapas.length + indice + 1),
        tipo_etapa: 'operacao',
        etapa: linha.processo_operacao_numero || `Etapa ${mapaEtapas.length + indice + 1}`,
        descricao: linha.descricao_produto_processo,
        setor: '',
        caracteristica_produto: linha.padrao_avaliacao,
        caracteristica_processo: [linha.caracteristica_especial && rotuloCaracteristica(linha.caracteristica_especial), linha.metodo_manufatura].filter((valor) => valor && valor !== '—').join(' · '),
        controle: linha.metodo_controle,
        registro: linha.tecnica_medicao,
        tempo_min: '',
        criticidade: linha.caracteristica_especial === 'critica' ? 'critica' : linha.caracteristica_especial === 'significativa' ? 'importante' : 'normal',
        plano_linha_id: linha.id as string,
      }))
    if (novas.length === 0) { setAvisos(['Nenhuma linha nova no plano vinculado para gerar etapas.']); return }
    setMapaEtapas((atual) => [...atual, ...novas])
    setAvisos([`${novas.length} etapa(s) criada(s) a partir do Plano de Controle. Ajuste o setor, a máquina e o tipo de símbolo antes de gravar.`])
  }

  /* -------------------------------------------------------------- impressão */

  function documentoFmea(): Documento {
    const colunas = [
      { titulo: 'Nº', larguraMm: 7, alinhar: 'centro' as const },
      { titulo: 'Item / processo', larguraMm: 18 },
      { titulo: 'Função / requisito', larguraMm: 20 },
      { titulo: 'Car. especial', larguraMm: 10 },
      { titulo: 'Modo de falha', larguraMm: 20 },
      { titulo: 'Causa / mecanismo', larguraMm: 20 },
      { titulo: 'Efeito', larguraMm: 16 },
      { titulo: 'S', larguraMm: 5, alinhar: 'centro' as const },
      { titulo: 'O', larguraMm: 5, alinhar: 'centro' as const },
      { titulo: 'D', larguraMm: 5, alinhar: 'centro' as const },
      { titulo: 'NPR', larguraMm: 8, alinhar: 'centro' as const },
      { titulo: 'Ação recomendada · responsável · prazo', larguraMm: 24 },
      { titulo: 'Ação tomada · resultado', larguraMm: 16 },
      { titulo: 'NPR após', larguraMm: 10, alinhar: 'centro' as const },
    ]
    const registros = fmeaLinhas.map((linha, index) => [
      linha.ordem || index + 1,
      linha.codigo_item_processo,
      linha.funcao_requisito,
      CARACTERISTICAS_FMEA.find((c) => c.valor === linha.caracteristica_especial)?.rotulo ?? 'Nenhuma',
      linha.modo_falha,
      [linha.causa, linha.mecanismo_falha].filter(Boolean).join(' — '),
      linha.efeito,
      linha.severidade,
      linha.ocorrencia,
      linha.deteccao,
      nprDa(linha),
      [linha.acao_recomendada, linha.acao_responsavel, linha.acao_prazo ? dataTexto(linha.acao_prazo) : ''].filter(Boolean).join(' · '),
      [linha.acao_tomada, linha.acao_resultado].filter(Boolean).join(' · '),
      nprAposDa(linha),
    ])
    const codigo = `FMEA ${fmea.numero || '—'} · rev ${fmea.versao}`
    return {
      modulo: 'Qualidade · SGQ',
      tipo: 'FMEA',
      titulo: TIPOS_FMEA.find((t) => t.valor === fmea.tipo)?.rotulo ?? 'FMEA',
      codigo,
      subtitulo: fmea.nome_peca || undefined,
      blocos: [
        {
          tipo: 'campos',
          titulo: 'Identificação do documento',
          colunas: 3,
          itens: [
            { rotulo: 'FMEA nº', valor: fmea.numero },
            { rotulo: 'Página', valor: `${fmea.pagina} de ${fmea.total_paginas}` },
            { rotulo: 'Situação', valor: SITUACOES.find((s) => s.valor === fmea.status)?.rotulo ?? fmea.status },
            { rotulo: 'Nº da peça', valor: fmea.codigo_peca },
            { rotulo: 'Nº da peça do cliente', valor: fmea.codigo_peca_cliente },
            { rotulo: 'Nome da peça', valor: fmea.nome_peca },
            { rotulo: 'Cliente / projeto', valor: fmea.cliente_projeto },
            { rotulo: 'Fornecedor / planta', valor: fmea.fornecedor },
            { rotulo: 'Código do fornecedor', valor: fmea.codigo_fornecedor },
            { rotulo: 'Data do 1º emissão', valor: dataTexto(fmea.data_primeira_emissao) },
            { rotulo: 'Data da revisão', valor: dataTexto(fmea.data_revisao) },
            { rotulo: 'Revisão', valor: fmea.versao },
            { rotulo: 'Áreas envolvidas', valor: fmea.areas_envolvidas },
            { rotulo: 'Equipe principal', valor: fmea.equipe_principal },
            { rotulo: 'Contato principal / telefone', valor: [fmea.contato_principal, fmea.telefone].filter(Boolean).join(' · ') },
          ],
        },
        {
          tipo: 'tabela',
          titulo: 'Matriz de análise de risco',
          colunas,
          linhas: registros,
          nota: 'NPR = Severidade × Ocorrência × Detecção (escala 1 a 10). "NPR após" usa a releitura S-O-D depois da ação; quando a releitura não foi registrada, repete o NPR original.',
        },
        {
          tipo: 'campos',
          titulo: 'Consolidação do risco',
          colunas: 3,
          itens: resumoFmea
            ? [
                { rotulo: 'Linhas analisadas', valor: resumoFmea.total },
                { rotulo: 'NPR máximo', valor: resumoFmea.maximo },
                { rotulo: 'NPR médio', valor: resumoFmea.medio },
                { rotulo: 'NPR máximo após ações', valor: resumoFmea.maximoApos },
                { rotulo: 'Características especiais', valor: resumoFmea.criticas },
                { rotulo: 'Ações em aberto', valor: resumoFmea.acoes },
              ]
            : [{ rotulo: 'Linhas analisadas', valor: 0 }],
        },
        {
          tipo: 'assinaturas',
          titulo: 'Aprovações',
          assinantes: [
            { papel: 'Aprovação — Engenharia do cliente', nome: fmea.aprovacao_engenharia_cliente || undefined },
            { papel: 'Aprovação — Qualidade do cliente', nome: fmea.aprovacao_qualidade_cliente || undefined },
            { papel: 'Aprovação — Fornecedor / Planta', nome: fmea.aprovacao_fornecedor_planta || undefined },
            { papel: 'Outras aprovações', nome: fmea.outra_aprovacao || undefined },
          ],
        },
      ],
      qrcode: fmea.id
        ? { valor: `${window.location.origin}/pageprincipal/qualidade/fmea?doc=${fmea.id}`, legenda: `Verificação no sistema · ${codigo}` }
        : undefined,
      observacoes:
        'Documento gerado pelo SYSNQRA ERP Industrial a partir do banco da empresa. O QR Code do cabeçalho aponta para o registro digital desta mesma revisão.',
    }
  }

  function documentoPlano(): Documento {
    const colunas = [
      { titulo: 'Nº', larguraMm: 6, alinhar: 'centro' as const },
      { titulo: 'Item', larguraMm: 8 },
      { titulo: 'Op. processo', larguraMm: 10 },
      { titulo: 'Descrição do produto / processo', larguraMm: 22 },
      { titulo: 'Car. especial', larguraMm: 10 },
      { titulo: 'Máquina / dispositivo / ferramenta', larguraMm: 16 },
      { titulo: 'Nº de controle', larguraMm: 10 },
      { titulo: 'Método de manufatura', larguraMm: 14 },
      { titulo: 'Padrão de avaliação', larguraMm: 18 },
      { titulo: 'Técnica de medição', larguraMm: 16 },
      { titulo: 'Amostra (tam. · freq.)', larguraMm: 14 },
      { titulo: 'Método de controle', larguraMm: 16 },
      { titulo: 'Plano de reação', larguraMm: 26 },
    ]
    const registros = planoLinhas.map((linha, index) => [
      linha.ordem || index + 1,
      linha.item_numero,
      linha.processo_operacao_numero,
      linha.descricao_produto_processo,
      rotuloCaracteristica(linha.caracteristica_especial),
      linha.maquina_dispositivo_ferramenta,
      linha.numero_controle,
      linha.metodo_manufatura,
      linha.padrao_avaliacao,
      linha.tecnica_medicao,
      [linha.tamanho_amostra, linha.frequencia_amostra].filter(Boolean).join(' · '),
      linha.metodo_controle,
      linha.plano_reacao,
    ])
    const ligadas = planoLinhas.filter((linha) => linha.fmea_linha_id).length
    const codigo = `CPP ${plano.numero || '—'} · rev ${plano.versao}`
    return {
      modulo: 'Qualidade · SGQ',
      tipo: 'Plano de Controle',
      titulo: `Plano de Controle ${TIPOS_PLANO.find((t) => t.valor === plano.tipo)?.rotulo ?? ''}`.trim(),
      codigo,
      subtitulo: plano.nome_peca || undefined,
      blocos: [
        {
          tipo: 'campos',
          titulo: 'Identificação do plano',
          colunas: 3,
          itens: [
            { rotulo: 'Nº do plano', valor: plano.numero },
            { rotulo: 'Tipo', valor: TIPOS_PLANO.find((t) => t.valor === plano.tipo)?.rotulo },
            { rotulo: 'Página', valor: `${plano.pagina} de ${plano.total_paginas}` },
            { rotulo: 'Nº da peça', valor: plano.codigo_peca },
            { rotulo: 'Nome da peça', valor: plano.nome_peca },
            { rotulo: 'Fornecedor / planta', valor: plano.fornecedor_planta },
            { rotulo: 'Código do fornecedor', valor: plano.codigo_fornecedor },
            { rotulo: 'Contato / telefone', valor: [plano.contato_principal, plano.telefone].filter(Boolean).join(' · ') },
            { rotulo: 'Data original', valor: dataTexto(plano.data_original) },
            { rotulo: 'Data da revisão', valor: dataTexto(plano.data_revisao) },
            { rotulo: 'Revisão', valor: plano.versao },
            { rotulo: 'Situação', valor: SITUACOES.find((s) => s.valor === plano.status)?.rotulo },
            { rotulo: 'Equipe principal', valor: plano.equipe_principal },
            { rotulo: 'Linhas do plano', valor: planoLinhas.length },
            { rotulo: 'Linhas ligadas ao FMEA', valor: ligadas },
          ],
        },
        {
          tipo: 'tabela',
          titulo: 'Controles por operação',
          colunas,
          linhas: registros,
          nota: 'Colunas conforme a aba "Plano de Controle" da planilha de referência. Característica crítica ou significativa exige plano de reação preenchido.',
        },
        {
          tipo: 'assinaturas',
          titulo: 'Aprovações',
          assinantes: [
            { papel: 'Aprovação — Engenharia do cliente', nome: plano.aprovacao_engenharia_cliente || undefined },
            { papel: 'Aprovação — Qualidade do cliente', nome: plano.aprovacao_qualidade_cliente || undefined },
            { papel: 'Aprovação — Fornecedor / Planta', nome: plano.aprovacao_fornecedor_planta || undefined },
            { papel: 'Outras aprovações', nome: plano.outra_aprovacao || undefined },
          ],
        },
      ],
      qrcode: plano.id
        ? { valor: `${window.location.origin}/pageprincipal/qualidade/plano-controle?doc=${plano.id}`, legenda: `Verificação no sistema · ${codigo}` }
        : undefined,
      observacoes:
        'Documento gerado pelo SYSNQRA ERP Industrial a partir do banco da empresa. O QR Code dá acesso à revisão digital deste plano.',
    }
  }

  function documentoMapa(): Documento {
    const colunas = [
      { titulo: 'Nº', larguraMm: 7, alinhar: 'centro' as const },
      { titulo: 'Símbolo', larguraMm: 11, alinhar: 'centro' as const },
      { titulo: 'Etapa', larguraMm: 24 },
      { titulo: 'Descrição', larguraMm: 32 },
      { titulo: 'Setor', larguraMm: 16 },
      { titulo: 'Máquina', larguraMm: 20 },
      { titulo: 'Car. produto', larguraMm: 22 },
      { titulo: 'Car. processo', larguraMm: 22 },
      { titulo: 'Controle', larguraMm: 22 },
      { titulo: 'Registro', larguraMm: 18 },
      { titulo: 'Tempo (min)', larguraMm: 10, alinhar: 'direita' as const },
      { titulo: 'Criticidade', larguraMm: 12, alinhar: 'centro' as const },
    ]
    const registros = mapaEtapas.map((etapa, index) => [
      etapa.ordem || index + 1,
      simboloDa(etapa.tipo_etapa).rotulo,
      etapa.etapa,
      etapa.descricao,
      etapa.setor,
      maquinas.find((maquina) => maquina.id === etapa.maquina_id)?.codigo ?? '',
      etapa.caracteristica_produto,
      etapa.caracteristica_processo,
      etapa.controle,
      etapa.registro,
      etapa.tempo_min || '',
      CRITICIDADES.find((c) => c.valor === etapa.criticidade)?.rotulo ?? '',
    ])
    const codigo = `MAPA ${mapa.numero || '—'} · rev ${mapa.revisao}`
    const planoVinculado = planoLista.find((registro) => registro.id === mapa.plano_controle_id)
    return {
      modulo: 'Qualidade · SGQ',
      tipo: 'Mapa de Processo',
      titulo: mapa.processo ? `Mapa de Processo · ${mapa.processo}` : 'Mapa de Processo',
      codigo,
      subtitulo: mapa.nome_peca || undefined,
      blocos: [
        {
          tipo: 'campos',
          titulo: 'Identificação do processo',
          colunas: 3,
          itens: [
            { rotulo: 'Mapa nº', valor: mapa.numero },
            { rotulo: 'Revisão', valor: mapa.revisao },
            { rotulo: 'Situação', valor: SITUACOES.find((s) => s.valor === mapa.status)?.rotulo ?? mapa.status },
            { rotulo: 'Nº da peça', valor: mapa.codigo_peca },
            { rotulo: 'Nome da peça', valor: mapa.nome_peca },
            { rotulo: 'Cliente / projeto', valor: mapa.cliente_projeto },
            { rotulo: 'Processo', valor: mapa.processo },
            { rotulo: 'Responsável', valor: mapa.responsavel },
            { rotulo: 'Aprovado por', valor: mapa.aprovado_por },
            { rotulo: 'Emissão', valor: dataTexto(mapa.data_emissao) },
            { rotulo: 'Revisão em', valor: dataTexto(mapa.data_revisao) },
            { rotulo: 'Plano de Controle vinculado', valor: planoVinculado ? `${planoVinculado.numero} rev ${planoVinculado.versao}` : '—' },
          ],
        },
        {
          tipo: 'tabela',
          titulo: 'Fluxo do processo',
          colunas,
          linhas: registros,
          nota: 'Símbolos: Operação, Inspeção, Transporte, Armazenagem, Espera e Decisão. Cada etapa aponta para a linha do Plano de Controle que a controla.',
        },
        mapa.observacoes ? { tipo: 'texto', titulo: 'Observações', texto: mapa.observacoes } : { tipo: 'texto', titulo: 'Observações', texto: '—' },
        {
          tipo: 'assinaturas',
          titulo: 'Elaboração e aprovação',
          assinantes: [
            { papel: 'Elaborado por', nome: mapa.responsavel || undefined },
            { papel: 'Aprovado por', nome: mapa.aprovado_por || undefined },
          ],
        },
      ],
      qrcode: mapa.id
        ? { valor: `${window.location.origin}/pageprincipal/qualidade/mapa-processo?doc=${mapa.id}`, legenda: `Verificação no sistema · ${codigo}` }
        : undefined,
      observacoes: 'Documento gerado pelo SYSNQRA ERP Industrial a partir do banco da empresa. Nenhuma etapa é criada fora do cadastro desta empresa.',
    }
  }

  /* ------------------------------------------------------------------ view */

  const titulo = aba === 'fmea' ? 'FMEA · Análise de Modo e Efeitos de Falha'
    : aba === 'plano' ? 'Plano de Controle (CPP) · AIAG'
      : 'Mapa de Processo · fluxo APQP'

  const abas: { valor: Aba; rotulo: string; icone: ReactNode }[] = [
    { valor: 'fmea', rotulo: 'FMEA', icone: <AlertTriangle size={13} /> },
    { valor: 'plano', rotulo: 'Plano de Controle', icone: <ClipboardList size={13} /> },
    { valor: 'mapa', rotulo: 'Mapa de Processo', icone: <GitBranch size={13} /> },
  ]

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900" data-synqra-density="30px">
      <header className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <ShieldCheck size={17} className="text-[#2D8DB8]" />
        <div>
          <h1 className="text-[13px] font-semibold text-[#123B50]">{titulo}</h1>
          <p className="text-[9px] text-slate-500">
            FMEA, Plano de Controle e Mapa de Processo no mesmo registro · NPR S×O×D em tempo real · impressão A4 com QR Code
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {aba === 'fmea' && (
            <select className="h-[30px] max-w-[320px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]"
              aria-label="FMEA cadastrado" value={fmea.id} disabled={carregando}
              onChange={(evento) => (evento.target.value ? selecionarFmea(evento.target.value) : setFmea(cascaFmea))}>
              <option value="">— Novo FMEA —</option>
              {fmeaLista.map((registro) => (
                <option key={registro.id} value={registro.id}>{registro.numero} · rev {registro.versao} · {registro.nome_peca || registro.cliente_projeto || 'sem peça'}</option>
              ))}
            </select>
          )}
          {aba === 'plano' && (
            <select className="h-[30px] max-w-[320px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]"
              aria-label="Plano de Controle cadastrado" value={plano.id} disabled={carregando}
              onChange={(evento) => (evento.target.value ? selecionarPlano(evento.target.value) : setPlano(cascaPlano))}>
              <option value="">— Novo plano —</option>
              {planoLista.map((registro) => (
                <option key={registro.id} value={registro.id}>{registro.numero} · rev {registro.versao} · {registro.nome_peca || 'sem peça'}</option>
              ))}
            </select>
          )}
          {aba === 'mapa' && (
            <select className="h-[30px] max-w-[320px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]"
              aria-label="Mapa de Processo cadastrado" value={mapa.id} disabled={carregando}
              onChange={(evento) => (evento.target.value ? selecionarMapa(evento.target.value) : setMapa(cascaMapa))}>
              <option value="">— Novo mapa —</option>
              {mapaLista.map((registro) => (
                <option key={registro.id} value={registro.id}>{registro.numero} · rev {registro.revisao} · {registro.nome_peca || registro.processo || 'sem peça'}</option>
              ))}
            </select>
          )}
          <button className={acaoLateral} disabled={carregando} onClick={() => {
            if (aba === 'fmea') { setFmea(cascaFmea); setFmeaLinhas([]); setFmeaMarcas({}); setAvisos(['Novo FMEA em edição.']) }
            else if (aba === 'plano') { setPlano(cascaPlano); setPlanoLinhas([]); setPlanoMarcas({}); setAvisos(['Novo plano de controle em edição.']) }
            else { setMapa(cascaMapa); setMapaEtapas([]); setMapaMarcas({}); setAvisos(['Novo mapa de processo em edição.']) }
          }}>
            <Plus size={12} /> Novo
          </button>
          <button className={acaoLateral} onClick={() => void iniciar()} disabled={carregando}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
      </header>

      <nav aria-label="Documentos do APQP" className="mb-2 flex flex-wrap gap-1">
        {abas.map((item) => (
          <button key={item.valor} type="button" aria-pressed={aba === item.valor}
            className={`inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-semibold ${aba === item.valor ? 'border-[#C9961C] bg-[#FDF6E3] text-[#8A6512]' : 'border-slate-300 bg-white text-slate-600 hover:border-[#2D8DB8]'}`}
            onClick={() => setAba(item.valor)}>
            {item.icone} {item.rotulo}
          </button>
        ))}
        <span className="ml-auto self-center text-[9px] uppercase tracking-wider text-slate-500">
          {aba === 'fmea' ? `${fmeaLinhas.length} linha(s) de risco` : aba === 'plano' ? `${planoLinhas.length} linha(s) de controle` : `${mapaEtapas.length} etapa(s) no fluxo`}
        </span>
      </nav>

      {erros.length > 0 && (
        <p role="alert" className="mb-2 flex items-start gap-1 border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
          <AlertTriangle size={12} className="mt-[2px] shrink-0" /><span>{erros.join(' ')}</span>
        </p>
      )}
      {avisos.length > 0 && <p role="status" className="mb-2 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">{avisos.join(' ')}</p>}

      {/* ---------------------------------------------------------- FMEA */}
      {aba === 'fmea' && <>
        <section className="mb-2 border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[11px] font-semibold text-[#123B50]">Cabeçalho do documento</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {([
              ['numero', 'FMEA Nº *'],
              ['codigo_peca', 'Nº da peça'],
              ['codigo_peca_cliente', 'Nº da peça do cliente'],
              ['nome_peca', 'Nome da peça'],
              ['cliente_projeto', 'Cliente / projeto'],
              ['fornecedor', 'Fornecedor / planta'],
              ['codigo_fornecedor', 'Cód. fornecedor'],
              ['contato_principal', 'Contato principal'],
              ['telefone', 'Telefone'],
              ['equipe_principal', 'Equipe principal'],
              ['areas_envolvidas', 'Áreas envolvidas'],
              ['data_primeira_emissao', 'Data do 1º emissão'],
              ['data_revisao', 'Data da revisão'],
            ] as [keyof FmeaCabecalho, string][]).map(([chave, texto]) => (
              <label key={chave}>
                <span className={rotulo}>{texto}</span>
                <input className={campo} type={chave.startsWith('data_') ? 'date' : 'text'} value={String(fmea[chave])}
                  maxLength={chave === 'numero' ? 40 : 300}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) => atualizarFmea(chave, evento.target.value)} />
              </label>
            ))}
            <label>
              <span className={rotulo}>Tipo</span>
              <select className={campo} value={fmea.tipo} onChange={(evento) => setFmea((a) => ({ ...a, tipo: evento.target.value as TipoFmea }))}>
                {TIPOS_FMEA.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
              </select>
            </label>
            <label>
              <span className={rotulo}>Situação</span>
              <select className={campo} value={fmea.status} onChange={(evento) => setFmea((a) => ({ ...a, status: evento.target.value as Situacao }))}>
                {SITUACOES.map((situacao) => <option key={situacao.valor} value={situacao.valor}>{situacao.rotulo}</option>)}
              </select>
            </label>
            <label>
              <span className={rotulo}>Revisão</span>
              <input className={campo} type="number" min={1} max={99} value={fmea.versao} onChange={(evento) => setFmea((a) => ({ ...a, versao: Number(evento.target.value) }))} />
            </label>
            <label>
              <span className={rotulo}>Página</span>
              <input className={campo} type="number" min={1} max={99} value={fmea.pagina} onChange={(evento) => setFmea((a) => ({ ...a, pagina: Number(evento.target.value) }))} />
            </label>
            <label>
              <span className={rotulo}>Total de páginas</span>
              <input className={campo} type="number" min={1} max={99} value={fmea.total_paginas} onChange={(evento) => setFmea((a) => ({ ...a, total_paginas: Number(evento.target.value) }))} />
            </label>
            {([
              ['aprovacao_engenharia_cliente', 'Aprovação engenharia cliente'],
              ['aprovacao_qualidade_cliente', 'Aprovação qualidade cliente'],
              ['aprovacao_fornecedor_planta', 'Aprovação fornecedor / planta'],
              ['outra_aprovacao', 'Outras aprovações'],
            ] as [keyof FmeaCabecalho, string][]).map(([chave, texto]) => (
              <label key={chave}>
                <span className={rotulo}>{texto}</span>
                <input className={campo} value={String(fmea[chave])} maxLength={200} onChange={(evento) => atualizarFmea(chave, evento.target.value)} />
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className={acao} onClick={() => void salvarFmeaCabecalho()} disabled={salvando || carregando}>
              <Save size={12} /> {salvando ? 'Gravando…' : 'Salvar cabeçalho'}
            </button>
            <button className={acaoLateral} onClick={() => void abrirRelatorio(documentoFmea())} disabled={!fmea.id}>
              <Printer size={12} /> Imprimir A4 com QR
            </button>
          </div>
        </section>

        <section className="mb-2 border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[11px] font-semibold text-[#123B50]">Matriz de risco</h2>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-wider text-slate-500">
              {resumoFmea && <>
                <span>Linhas <strong className="text-[11px] text-slate-800">{resumoFmea.total}</strong></span>
                <span>NPR máx <strong className={`text-[11px] ${corNpr(resumoFmea.maximo)}`}>{resumoFmea.maximo}</strong></span>
                <span>NPR médio <strong className="text-[11px] text-slate-800">{resumoFmea.medio}</strong></span>
                <span>NPR máx após <strong className={`text-[11px] ${corNpr(resumoFmea.maximoApos)}`}>{resumoFmea.maximoApos}</strong></span>
                <span>Car. especiais <strong className="text-[11px] text-slate-800">{resumoFmea.criticas}</strong></span>
                <span>Ações abertas <strong className="text-[11px] text-slate-800">{resumoFmea.acoes}</strong></span>
              </>}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={acaoLateral} onClick={() => setFmeaLinhas((atual) => [...atual, fmeaLinhaVazia(atual.length + 1)])}
              disabled={!fmea.id || carregando} title={fmea.id ? 'Incluir linha de risco na matriz' : 'Salve o cabeçalho antes de incluir linhas'}>
              <Plus size={12} /> Nova linha de risco
            </button>
            <button className={acao} onClick={() => void salvarFmeaLinhas()} disabled={salvando || !fmea.id || fmeaLinhas.length === 0}>
              <Save size={12} /> Salvar linhas
            </button>
            <button className={acaoLateral} onClick={gerarPlanoAPartirDoFmea} disabled={!fmea.id || !plano.id}>
              <ArrowRight size={12} /> Gerar Plano de Controle deste FMEA
            </button>
          </div>
        </section>

        <section className="overflow-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[2400px] border-collapse text-left text-[10px]">
            <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
              <tr>
                {['Nº', 'Item / processo *', 'Função / requisito', 'Car. especial', 'Modo de falha *', 'Causa *', 'Mecanismo de falha', 'Efeito', 'S', 'Controles prevenção', 'Controles detecção', 'O', 'D', 'NPR', 'Ação recomendada', 'Responsável', 'Prazo', 'Ação tomada', 'Resultado', 'S após', 'O após', 'D após', 'NPR após', ''].map((texto) => (
                  <th key={texto} className="h-[30px] whitespace-nowrap border-b border-slate-200 px-1">{texto}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={24} className="h-[40px] text-center text-slate-500">Carregando o FMEA da empresa…</td></tr>
              ) : fmeaLinhas.length === 0 ? (
                <tr><td colSpan={24} className="h-[40px] text-center text-slate-500">{fmea.id ? 'Cabeçalho salvo sem linhas de risco. Use “Nova linha de risco”.' : 'Selecione um FMEA cadastrado ou salve um novo cabeçalho.'}</td></tr>
              ) : fmeaLinhas.map((linha, index) => {
                const npr = nprDa(linha)
                const nprApos = nprAposDa(linha)
                return (
                  <tr key={linha.id ?? `nova-${index}`} className="border-b border-slate-100 align-top hover:bg-neutral-50/80">
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 42 }} type="number" min={1} max={999} value={linha.ordem} onChange={(e) => editarFmeaLinha(index, 'ordem', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.codigo_item_processo} maxLength={120} onChange={(e) => editarFmeaLinha(index, 'codigo_item_processo', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.funcao_requisito} maxLength={500} onChange={(e) => editarFmeaLinha(index, 'funcao_requisito', e.target.value)} /></td>
                    <td className="px-1 py-[3px]">
                      <select className={celula} style={{ width: 104 }} value={linha.caracteristica_especial} onChange={(e) => editarFmeaLinha(index, 'caracteristica_especial', e.target.value as CaracteristicaFmea)}>
                        {CARACTERISTICAS_FMEA.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.modo_falha} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'modo_falha', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.causa} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'causa', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.mecanismo_falha} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'mecanismo_falha', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.efeito} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'efeito', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.severidade} onChange={(e) => editarFmeaLinha(index, 'severidade', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.controle_prevencao} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'controle_prevencao', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.controle_deteccao} maxLength={1000} onChange={(e) => editarFmeaLinha(index, 'controle_deteccao', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.ocorrencia} onChange={(e) => editarFmeaLinha(index, 'ocorrencia', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.deteccao} onChange={(e) => editarFmeaLinha(index, 'deteccao', Number(e.target.value))} /></td>
                    <td className={`px-2 py-[3px] text-right font-bold tabular-nums ${corNpr(npr)}`}>{npr}</td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 180 }} value={linha.acao_recomendada} maxLength={1500} onChange={(e) => editarFmeaLinha(index, 'acao_recomendada', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 120 }} value={linha.acao_responsavel} maxLength={200} onChange={(e) => editarFmeaLinha(index, 'acao_responsavel', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 128 }} type="date" value={linha.acao_prazo} onChange={(e) => editarFmeaLinha(index, 'acao_prazo', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.acao_tomada} maxLength={1500} onChange={(e) => editarFmeaLinha(index, 'acao_tomada', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.acao_resultado} maxLength={1500} onChange={(e) => editarFmeaLinha(index, 'acao_resultado', e.target.value)} /></td>
                    {(['severidade_apos', 'ocorrencia_apos', 'deteccao_apos'] as const).map((chave) => (
                      <td key={chave} className="px-1 py-[3px]">
                        <input className={celula} style={{ width: 52 }} type="number" min={1} max={10} value={linha[chave]}
                          onChange={(e) => editarFmeaLinha(index, chave, e.target.value === '' ? '' : Number(e.target.value))} />
                      </td>
                    ))}
                    <td className={`px-2 py-[3px] text-right font-bold tabular-nums ${corNpr(nprApos)}`}>{nprApos}</td>
                    <td className="px-1 py-[3px]">
                      <button className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-rose-700" onClick={() => void excluirFmeaLinha(index)}>
                        <Trash2 size={11} /> Remover
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-2 text-[9px] text-slate-500">
          Escala AIAG de 1 a 10 · NPR ≥ 100 exige ação registrada · a coluna legada <code>controles</code> continua gravada para as telas do SGQ que ainda a leem.
        </p>
      </>}

      {/* ------------------------------------------------ PLANO DE CONTROLE */}
      {aba === 'plano' && <>
        <section className="mb-2 border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[11px] font-semibold text-[#123B50]">Cabeçalho do plano</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {([
              ['numero', 'Nº do plano *'],
              ['codigo_peca', 'Nº da peça'],
              ['nome_peca', 'Nome da peça'],
              ['fornecedor_planta', 'Fornecedor / planta'],
              ['codigo_fornecedor', 'Cód. fornecedor'],
              ['contato_principal', 'Contato principal'],
              ['telefone', 'Telefone'],
              ['equipe_principal', 'Equipe principal'],
              ['data_original', 'Data original'],
              ['data_revisao', 'Data da revisão'],
            ] as [keyof Plano, string][]).map(([chave, texto]) => (
              <label key={chave}>
                <span className={rotulo}>{texto}</span>
                <input className={campo} type={chave.startsWith('data_') ? 'date' : 'text'} value={String(plano[chave])}
                  maxLength={chave === 'numero' ? 40 : 300}
                  onChange={(evento) => atualizarPlano(chave, evento.target.value)} />
              </label>
            ))}
            <label>
              <span className={rotulo}>Tipo</span>
              <select className={campo} value={plano.tipo} onChange={(evento) => setPlano((a) => ({ ...a, tipo: evento.target.value as TipoPlano }))}>
                {TIPOS_PLANO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
              </select>
            </label>
            <label>
              <span className={rotulo}>Situação</span>
              <select className={campo} value={plano.status} onChange={(evento) => setPlano((a) => ({ ...a, status: evento.target.value as Situacao }))}>
                {SITUACOES.map((situacao) => <option key={situacao.valor} value={situacao.valor}>{situacao.rotulo}</option>)}
              </select>
            </label>
            <label>
              <span className={rotulo}>Revisão</span>
              <input className={campo} type="number" min={1} max={99} value={plano.versao} onChange={(evento) => setPlano((a) => ({ ...a, versao: Number(evento.target.value) }))} />
            </label>
            <label>
              <span className={rotulo}>Página</span>
              <input className={campo} type="number" min={1} max={99} value={plano.pagina} onChange={(evento) => setPlano((a) => ({ ...a, pagina: Number(evento.target.value) }))} />
            </label>
            <label>
              <span className={rotulo}>Total de páginas</span>
              <input className={campo} type="number" min={1} max={99} value={plano.total_paginas} onChange={(evento) => setPlano((a) => ({ ...a, total_paginas: Number(evento.target.value) }))} />
            </label>
            {([
              ['aprovacao_engenharia_cliente', 'Aprovação engenharia cliente'],
              ['aprovacao_qualidade_cliente', 'Aprovação qualidade cliente'],
              ['aprovacao_fornecedor_planta', 'Aprovação fornecedor / planta'],
              ['outra_aprovacao', 'Outras aprovações'],
            ] as [keyof Plano, string][]).map(([chave, texto]) => (
              <label key={chave}>
                <span className={rotulo}>{texto}</span>
                <input className={campo} value={String(plano[chave])} maxLength={200} onChange={(evento) => atualizarPlano(chave, evento.target.value)} />
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={acao} onClick={() => void salvarPlano()} disabled={salvando || carregando}>
              <Save size={12} /> {salvando ? 'Gravando…' : 'Salvar cabeçalho'}
            </button>
            <button className={acaoLateral} onClick={() => void abrirRelatorio(documentoPlano())} disabled={!plano.id}>
              <Printer size={12} /> Imprimir A4 com QR
            </button>
          </div>
        </section>

        <section className="mb-2 border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[11px] font-semibold text-[#123B50]">Linhas do plano</h2>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              {planoLinhas.length} linha(s) · <Link2 size={10} className="inline align-[-1px]" /> {planoLinhas.filter((linha) => linha.fmea_linha_id).length} ligada(s) ao FMEA
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button className={acaoLateral} onClick={() => setPlanoLinhas((atual) => [...atual, planoLinhaVazia(atual.length + 1)])}
                disabled={!plano.id || carregando} title={plano.id ? 'Incluir linha no plano' : 'Salve o cabeçalho antes de incluir linhas'}>
                <Plus size={12} /> Nova linha
              </button>
              <button className={acao} onClick={() => void salvarPlanoLinhas()} disabled={salvando || !plano.id || planoLinhas.length === 0}>
                <Save size={12} /> Salvar linhas
              </button>
              <button className={acaoLateral} onClick={gerarPlanoAPartirDoFmea} disabled={!fmea.id || !plano.id} title="Cria uma linha de controle para cada risco do FMEA selecionado ainda não ligado">
                <CheckSquare size={12} /> Gerar linhas do FMEA
              </button>
            </div>
          </div>
          {fmea.id && (
            <p className="mt-1 text-[9px] text-slate-500">
              FMEA de origem: <strong className="text-slate-700">{fmea.numero}</strong> rev {fmea.versao} · {fmeaLinhas.length} riscos carregados.
            </p>
          )}
        </section>

        <section className="overflow-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[2400px] border-collapse text-left text-[10px]">
            <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
              <tr>
                {['Nº', 'Item', 'Op. processo', 'Descrição do produto / processo *', 'Car. especial', 'Máquina / dispositivo / ferramenta', 'Nº de controle', 'Método de manufatura', 'Padrão de avaliação', 'Técnica de medição', 'Tam. amostra', 'Freq. amostra', 'Método de controle', 'Plano de reação', 'Linha do FMEA', ''].map((texto) => (
                  <th key={texto} className="h-[30px] whitespace-nowrap border-b border-slate-200 px-1">{texto}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={16} className="h-[40px] text-center text-slate-500">Carregando o plano de controle da empresa…</td></tr>
              ) : planoLinhas.length === 0 ? (
                <tr><td colSpan={16} className="h-[40px] text-center text-slate-500">{plano.id ? 'Plano salvo ainda sem linhas. Use “Nova linha” ou “Gerar linhas do FMEA”.' : 'Selecione um plano cadastrado ou salve um novo cabeçalho.'}</td></tr>
              ) : planoLinhas.map((linha, index) => (
                <tr key={linha.id ?? `nova-${index}`} className="border-b border-slate-100 align-top hover:bg-neutral-50/80">
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={999} value={linha.ordem} onChange={(e) => editarPlanoLinha(index, 'ordem', Number(e.target.value))} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 60 }} value={linha.item_numero} maxLength={20} onChange={(e) => editarPlanoLinha(index, 'item_numero', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 90 }} value={linha.processo_operacao_numero} maxLength={60} onChange={(e) => editarPlanoLinha(index, 'processo_operacao_numero', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 220 }} value={linha.descricao_produto_processo} maxLength={1000} onChange={(e) => editarPlanoLinha(index, 'descricao_produto_processo', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 104 }} value={linha.caracteristica_especial} onChange={(e) => editarPlanoLinha(index, 'caracteristica_especial', e.target.value as CaracteristicaPlano)}>
                      {CARACTERISTICAS_PLANO.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.maquina_dispositivo_ferramenta} maxLength={300} onChange={(e) => editarPlanoLinha(index, 'maquina_dispositivo_ferramenta', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 110 }} value={linha.numero_controle} maxLength={80} onChange={(e) => editarPlanoLinha(index, 'numero_controle', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.metodo_manufatura} maxLength={500} onChange={(e) => editarPlanoLinha(index, 'metodo_manufatura', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 190 }} value={linha.padrao_avaliacao} maxLength={1000} onChange={(e) => editarPlanoLinha(index, 'padrao_avaliacao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.tecnica_medicao} maxLength={500} onChange={(e) => editarPlanoLinha(index, 'tecnica_medicao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 90 }} value={linha.tamanho_amostra} maxLength={60} onChange={(e) => editarPlanoLinha(index, 'tamanho_amostra', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 110 }} value={linha.frequencia_amostra} maxLength={80} onChange={(e) => editarPlanoLinha(index, 'frequencia_amostra', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.metodo_controle} maxLength={1000} onChange={(e) => editarPlanoLinha(index, 'metodo_controle', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 220 }} value={linha.plano_reacao} maxLength={1500} onChange={(e) => editarPlanoLinha(index, 'plano_reacao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 220 }} value={linha.fmea_linha_id} onChange={(e) => editarPlanoLinha(index, 'fmea_linha_id', e.target.value)}>
                      <option value="">— sem vínculo —</option>
                      {fmeaLinhas.filter((risco) => risco.id).map((risco) => (
                        <option key={risco.id} value={risco.id as string}>
                          {risco.codigo_item_processo} · {risco.modo_falha} · NPR {nprDa(risco)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]">
                    <button className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-rose-700" onClick={() => void excluirPlanoLinha(index)}>
                      <Trash2 size={11} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mt-2 text-[9px] text-slate-500">
          A coluna "Linha do FMEA" grava a FK <code>fmea_linha_id</code> em <code>erp_plano_controle_linha</code>: o controle impresso passa a apontar para o risco que o originou.
        </p>
      </>}

      {/* ------------------------------------------------- MAPA DE PROCESSO */}
      {aba === 'mapa' && <>
        <section className="mb-2 border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[11px] font-semibold text-[#123B50]">Cabeçalho do mapa</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {([
              ['numero', 'Mapa nº *'],
              ['codigo_peca', 'Nº da peça'],
              ['nome_peca', 'Nome da peça'],
              ['cliente_projeto', 'Cliente / projeto'],
              ['processo', 'Processo'],
              ['responsavel', 'Responsável'],
              ['aprovado_por', 'Aprovado por'],
              ['data_emissao', 'Data de emissão'],
              ['data_revisao', 'Data da revisão'],
            ] as [keyof Mapa, string][]).map(([chave, texto]) => (
              <label key={chave}>
                <span className={rotulo}>{texto}</span>
                <input className={campo} type={chave.startsWith('data_') ? 'date' : 'text'} value={String(mapa[chave])} maxLength={300}
                  onChange={(evento) => atualizarMapa(chave, evento.target.value)} />
              </label>
            ))}
            <label>
              <span className={rotulo}>Revisão</span>
              <input className={campo} type="number" min={1} max={99} value={mapa.revisao} onChange={(evento) => setMapa((a) => ({ ...a, revisao: Number(evento.target.value) }))} />
            </label>
            <label>
              <span className={rotulo}>Situação</span>
              <select className={campo} value={mapa.status} onChange={(evento) => setMapa((a) => ({ ...a, status: evento.target.value as Situacao }))}>
                {SITUACOES.map((situacao) => <option key={situacao.valor} value={situacao.valor}>{situacao.rotulo}</option>)}
              </select>
            </label>
            <label className="col-span-2">
              <span className={rotulo}>Plano de Controle vinculado</span>
              <select className={campo} value={mapa.plano_controle_id}
                onChange={(evento) => {
                  const id = evento.target.value
                  setMapa((a) => ({ ...a, plano_controle_id: id }))
                  if (id) { setPlano(planoLista.find((registro) => registro.id === id) ?? cascaPlano); void carregarPlanoLinhas(id) }
                }}>
                <option value="">— sem plano vinculado —</option>
                {planoLista.map((registro) => (
                  <option key={registro.id} value={registro.id}>{registro.numero} · rev {registro.versao} · {registro.nome_peca || 'sem peça'}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 xl:col-span-3">
              <span className={rotulo}>Observações</span>
              <input className={campo} value={mapa.observacoes} maxLength={1000} onChange={(evento) => atualizarMapa('observacoes', evento.target.value)} />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={acao} onClick={() => void salvarMapa()} disabled={salvando || carregando}>
              <Save size={12} /> {salvando ? 'Gravando…' : 'Salvar cabeçalho'}
            </button>
            <button className={acaoLateral} onClick={() => void abrirRelatorio(documentoMapa())} disabled={!mapa.id}>
              <Printer size={12} /> Imprimir A4 com QR
            </button>
          </div>
        </section>

        <section className="mb-2 border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[11px] font-semibold text-[#123B50]">Fluxo do processo</h2>
            <div className="ml-auto flex flex-wrap gap-2">
              <button className={acaoLateral} onClick={() => setMapaEtapas((atual) => [...atual, mapaEtapaVazia(atual.length + 1)])}
                disabled={!mapa.id || carregando}>
                <Plus size={12} /> Nova etapa
              </button>
              <button className={acao} onClick={() => void salvarEtapas()} disabled={salvando || !mapa.id || mapaEtapas.length === 0}>
                <Save size={12} /> Salvar etapas
              </button>
              <button className={acaoLateral} onClick={gerarEtapasDoPlano} disabled={!mapa.id || !mapa.plano_controle_id}
                title="Cria uma etapa para cada linha do plano vinculado ainda não usada no fluxo">
                <Layers size={12} /> Gerar etapas do Plano de Controle
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 border border-slate-200 bg-[#F8FCFD] px-2 py-1.5 text-[9px] text-slate-600">
            <span className="font-bold uppercase tracking-wider text-slate-500">Legenda dos símbolos</span>
            {ETAPAS.map((etapa) => (
              <span key={etapa.valor} className="inline-flex items-center gap-1">
                <span className={`inline-flex min-w-[24px] justify-center border px-1 py-[1px] font-bold ${corEtapa(etapa.valor)}`}>{etapa.sigla}</span>
                {etapa.rotulo}
              </span>
            ))}
            <span className="inline-flex items-center gap-1"><span className="inline-flex min-w-[24px] justify-center border-2 border-rose-400 bg-white px-1 py-[1px] font-bold text-rose-700">!</span>Criticidade crítica</span>
          </div>

          {mapaEtapas.length > 0 && (
            <div className="mt-2 flex items-stretch gap-1 overflow-x-auto pb-1">
              {mapaEtapas.map((etapa, index) => (
                <div key={etapa.id ?? `nova-${index}`} className="flex items-center gap-1">
                  <div className={`min-w-[132px] max-w-[180px] border px-2 py-1.5 ${corEtapa(etapa.tipo_etapa)} ${etapa.criticidade === 'critica' ? 'border-2 border-rose-400' : ''}`}>
                    <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">{etapa.ordem || index + 1} · {simboloDa(etapa.tipo_etapa).rotulo}</p>
                    <p className="truncate text-[10px] font-semibold" title={etapa.etapa}>{etapa.etapa || 'etapa sem nome'}</p>
                    <p className="truncate text-[8px] opacity-80" title={etapa.descricao}>{etapa.descricao || '—'}</p>
                    {(etapa.setor || etapa.maquina_id) && (
                      <p className="truncate text-[8px] opacity-80">
                        {[etapa.setor, maquinas.find((maquina) => maquina.id === etapa.maquina_id)?.codigo].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {index < mapaEtapas.length - 1 && <ArrowRight size={14} className="shrink-0 text-slate-400" />}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[2200px] border-collapse text-left text-[10px]">
            <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
              <tr>
                {['Nº', 'Símbolo', 'Etapa *', 'Descrição', 'Setor', 'Máquina', 'Car. do produto', 'Car. do processo', 'Controle', 'Registro', 'Tempo (min)', 'Criticidade', 'Linha do plano', ''].map((texto) => (
                  <th key={texto} className="h-[30px] whitespace-nowrap border-b border-slate-200 px-1">{texto}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={14} className="h-[40px] text-center text-slate-500">Carregando o mapa de processo da empresa…</td></tr>
              ) : mapaEtapas.length === 0 ? (
                <tr><td colSpan={14} className="h-[40px] text-center text-slate-500">{mapa.id ? 'Mapa salvo ainda sem etapas. Use “Nova etapa” ou “Gerar etapas do Plano de Controle”.' : 'Selecione um mapa cadastrado ou salve um novo cabeçalho.'}</td></tr>
              ) : mapaEtapas.map((etapa, index) => (
                <tr key={etapa.id ?? `nova-${index}`} className="border-b border-slate-100 align-top hover:bg-neutral-50/80">
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={999} value={etapa.ordem} onChange={(e) => editarEtapa(index, 'ordem', Number(e.target.value))} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 104 }} value={etapa.tipo_etapa} onChange={(e) => editarEtapa(index, 'tipo_etapa', e.target.value as TipoEtapa)}>
                      {ETAPAS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={etapa.etapa} maxLength={200} onChange={(e) => editarEtapa(index, 'etapa', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 220 }} value={etapa.descricao} maxLength={1000} onChange={(e) => editarEtapa(index, 'descricao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 110 }} value={etapa.setor} maxLength={120} onChange={(e) => editarEtapa(index, 'setor', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 170 }} value={etapa.maquina_id} onChange={(e) => editarEtapa(index, 'maquina_id', e.target.value)}>
                      <option value="">— sem máquina —</option>
                      {maquinas.map((maquina) => <option key={maquina.id} value={maquina.id}>{maquina.codigo} — {maquina.nome}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={etapa.caracteristica_produto} maxLength={500} onChange={(e) => editarEtapa(index, 'caracteristica_produto', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={etapa.caracteristica_processo} maxLength={500} onChange={(e) => editarEtapa(index, 'caracteristica_processo', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={etapa.controle} maxLength={1000} onChange={(e) => editarEtapa(index, 'controle', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 140 }} value={etapa.registro} maxLength={300} onChange={(e) => editarEtapa(index, 'registro', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 80 }} type="number" min={0} step="any" value={etapa.tempo_min} onChange={(e) => editarEtapa(index, 'tempo_min', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 104 }} value={etapa.criticidade} onChange={(e) => editarEtapa(index, 'criticidade', e.target.value as Criticidade)}>
                      {CRITICIDADES.map((criticidade) => <option key={criticidade.valor} value={criticidade.valor}>{criticidade.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 200 }} value={etapa.plano_linha_id} onChange={(e) => editarEtapa(index, 'plano_linha_id', e.target.value)}>
                      <option value="">— sem vínculo —</option>
                      {planoLinhas.filter((linha) => linha.id).map((linha) => (
                        <option key={linha.id} value={linha.id as string}>
                          {linha.processo_operacao_numero || linha.ordem} · {linha.descricao_produto_processo.slice(0, 42)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]">
                    <button className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-rose-700" onClick={() => void excluirEtapa(index)}>
                      <Trash2 size={11} /> Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
          <Factory size={11} /> As máquinas da etapa vêm do cadastro real (<code>erp_maquinas</code>), o mesmo usado pela manutenção.
          O vínculo com o Plano de Controle é gravado em <code>plano_linha_id</code>, então o fluxo impresso cita o controle que o originou.
        </p>
      </>}
    </main>
  )
}
