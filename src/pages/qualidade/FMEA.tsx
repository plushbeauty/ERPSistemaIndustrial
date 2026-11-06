/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-FMEA-PLANO-CONTROLE-20261106-01 — FMEA AIAG completo: cabeçalho controlado
 * (erp_fmea_cabecalho), grade de linhas inline-editável (qualidade_fmea), prevenção e detecção
 * separadas, ação com responsável/prazo/resultado, releitura S-O-D após a ação e impressão A4 com
 * QR Code. A tela deixa de ser o formulário de seis campos que gravava uma linha solta.
 * @STATUS_APROVACAO: ORDEM MASTER DE EXECUÇÃO EM 2026-11-06 — "FMEA conectado ao Plano de Controle,
 * Inspeção e RPNC" e "CPP digital e impresso com QR Code"; e ordem de 2026-11-06: "SÓ PARA QUANDO
 * TODAS AS TELAS ESTIVEREM PRONTO E APLICADAS NO SISTEMA".
 * Modelo de dados: migration supabase/migrations/20261106120000_erp_fmea_plano_controle_aiag_v1.sql,
 * que reproduz campo a campo a pasta "FMEA-TAMPA VRLA AGM NOBREAK.xlsm" enviada pelo proprietário.
 */
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Plus, Printer, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'
import { abrirRelatorio } from '../../lib/report/abrirRelatorio'
import type { Documento } from '../../lib/report/documento'

type Tipo = 'processo' | 'produto' | 'projeto'
type Situacao = 'rascunho' | 'ativo' | 'revisado' | 'obsoleto'
type Caracteristica = 'nenhuma' | 'critica' | 'significativa' | 'seguranca' | 'regulatoria'

type Cabecalho = {
  id: string
  numero: string
  tipo: Tipo
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

type ChaveTexto = keyof Pick<
  Cabecalho,
  | 'numero' | 'codigo_peca' | 'codigo_peca_cliente' | 'nome_peca' | 'cliente_projeto' | 'fornecedor'
  | 'codigo_fornecedor' | 'areas_envolvidas' | 'equipe_principal' | 'contato_principal' | 'telefone'
  | 'data_primeira_emissao' | 'data_revisao' | 'aprovacao_engenharia_cliente'
  | 'aprovacao_qualidade_cliente' | 'aprovacao_fornecedor_planta' | 'outra_aprovacao'
>

type Linha = {
  id: string | null
  ordem: number
  codigo_item_processo: string
  funcao_requisito: string
  caracteristica_especial: Caracteristica
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

const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'processo', rotulo: 'Processo (PFMEA)' },
  { valor: 'produto', rotulo: 'Produto (DFMEA de peça)' },
  { valor: 'projeto', rotulo: 'Projeto / sistema' },
]
const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'revisado', rotulo: 'Revisado' },
  { valor: 'obsoleto', rotulo: 'Obsoleto' },
]
const CARACTERISTICAS: { valor: Caracteristica; rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'critica', rotulo: 'Crítica' },
  { valor: 'significativa', rotulo: 'Significativa' },
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'regulatoria', rotulo: 'Regulatória' },
]

const campo = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const rotulo = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const acao = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50'
const acaoLateral = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-50'
const celula = 'h-[28px] w-full rounded-[2px] border border-slate-200 bg-white px-1 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'

const cabecalhoVazio: Cabecalho = {
  id: '',
  numero: '',
  tipo: 'processo',
  pagina: 1,
  total_paginas: 1,
  codigo_peca: '',
  codigo_peca_cliente: '',
  nome_peca: '',
  cliente_projeto: '',
  fornecedor: '',
  codigo_fornecedor: '',
  areas_envolvidas: '',
  equipe_principal: '',
  contato_principal: '',
  telefone: '',
  data_primeira_emissao: '',
  data_revisao: '',
  aprovacao_engenharia_cliente: '',
  aprovacao_qualidade_cliente: '',
  aprovacao_fornecedor_planta: '',
  outra_aprovacao: '',
  status: 'rascunho',
  versao: 1,
}

const linhaVazia = (ordem: number): Linha => ({
  id: null,
  ordem,
  codigo_item_processo: '',
  funcao_requisito: '',
  caracteristica_especial: 'nenhuma',
  modo_falha: '',
  efeito: '',
  severidade: 1,
  causa: '',
  mecanismo_falha: '',
  ocorrencia: 1,
  controle_prevencao: '',
  controle_deteccao: '',
  deteccao: 1,
  acao_recomendada: '',
  acao_responsavel: '',
  acao_prazo: '',
  acao_tomada: '',
  acao_resultado: '',
  severidade_apos: '',
  ocorrencia_apos: '',
  deteccao_apos: '',
})

function nprDa(linha: Linha): number {
  return linha.severidade * linha.ocorrencia * linha.deteccao
}

function nprAposDa(linha: Linha): number {
  const s = linha.severidade_apos || linha.severidade
  const o = linha.ocorrencia_apos || linha.ocorrencia
  const d = linha.deteccao_apos || linha.deteccao
  return s * o * d
}

function corNpr(npr: number): string {
  return npr >= 200 ? 'text-rose-700' : npr >= 100 ? 'text-amber-700' : 'text-emerald-700'
}

function dataTexto(valor: string): string {
  if (!valor) return '—'
  const partes = valor.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor
}

/**
 * A consulta falha com "relation does not exist" enquanto a migration não estiver aplicada. O aviso
 * diz isso por extenso: a ordem permanente é não inventar dados nem apresentar como funcional o que
 * o banco ainda não tem.
 */
function explicarFalha(cause: unknown): string {
  const erro = cause as { code?: string; message?: string; details?: string; hint?: string } | null
  const texto = `${erro?.code ?? ''} ${erro?.message ?? ''} ${erro?.details ?? ''}`.toLowerCase()
  if (texto.includes('pgrst205') || texto.includes('does not exist') || texto.includes('42p01') || texto.includes('could not find the table'))
    return 'A migration 20261106120000_erp_fmea_plano_controle_aiag_v1 ainda não foi aplicada no banco desta empresa. Abra a tela depois de aplicar o pacote de migrations; nada aqui foi preenchido com dados fictícios.'
  return erro?.message ?? 'Falha ao consultar o banco da empresa.'
}

export default function QualidadeFMEA() {
  const [companyId, setCompanyId] = useState('')
  const [lista, setLista] = useState<Cabecalho[]>([])
  const [cabecalho, setCabecalho] = useState<Cabecalho>(cabecalhoVazio)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [marcas, setMarcas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [avisos, setAvisos] = useState<string[]>([])

  const carregarCabecalhos = useCallback(async () => {
    try {
      const resultado = await supabase
        .from('erp_fmea_cabecalho')
        .select('id,numero,tipo,pagina,total_paginas,codigo_peca,codigo_peca_cliente,nome_peca,cliente_projeto,fornecedor,codigo_fornecedor,areas_envolvidas,equipe_principal,contato_principal,telefone,data_primeira_emissao,data_revisao,aprovacao_engenharia_cliente,aprovacao_qualidade_cliente,aprovacao_fornecedor_planta,outra_aprovacao,status,versao')
        .eq('empresa_id', companyId)
        .order('numero', { ascending: true })
        .order('versao', { ascending: false })
        .limit(200)
      if (resultado.error) throw resultado.error
      setLista((resultado.data ?? []).map((registro) => ({
        ...registro,
        data_primeira_emissao: String(registro.data_primeira_emissao ?? ''),
        data_revisao: String(registro.data_revisao ?? ''),
      })) as Cabecalho[])
      return resultado.data ?? []
    } catch (cause) {
      setErros((atual) => [...new Set([...atual, explicarFalha(cause)])])
      return []
    }
  }, [companyId])

  const carregarLinhas = useCallback(async (cabecalhoId: string) => {
    try {
      const resultado = await supabase
        .from('qualidade_fmea')
        .select('id,ordem,codigo_item_processo,funcao,funcao_requisito,caracteristica_especial,modo_falha,efeito,severidade,causa,mecanismo_falha,ocorrencia,controles,controle_prevencao,controle_deteccao,deteccao,acao_recomendada,acao_responsavel,acao_prazo,acao_tomada,acao_resultado,severidade_apos,ocorrencia_apos,deteccao_apos')
        .eq('empresa_id', companyId)
        .eq('cabecalho_id', cabecalhoId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(500)
      if (resultado.error) throw resultado.error
      const linhasCarregadas: Linha[] = (resultado.data ?? []).map((registro) => ({
        id: registro.id,
        ordem: Number(registro.ordem ?? 1),
        codigo_item_processo: String(registro.codigo_item_processo ?? ''),
        funcao_requisito: String(registro.funcao_requisito ?? registro.codigo_item_processo ?? ''),
        caracteristica_especial: (CARACTERISTICAS.some((c) => c.valor === registro.caracteristica_especial)
          ? String(registro.caracteristica_especial) : 'nenhuma') as Caracteristica,
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
      setLinhas(linhasCarregadas)
      setMarcas(Object.fromEntries(linhasCarregadas.map((linha) => [linha.id as string, JSON.stringify(linha)])))
    } catch (cause) {
      setErros((atual) => [...new Set([...atual, explicarFalha(cause)])])
      setLinhas([])
      setMarcas({})
    }
  }, [companyId])

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
      setErros((atual) => [...new Set([...atual, explicarFalha(cause)])])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void iniciar() }, [iniciar])
  useEffect(() => { if (companyId) void carregarCabecalhos() }, [companyId, carregarCabecalhos])

  const setCampo = (chave: ChaveTexto, valor: string) => setCabecalho((atual) => ({ ...atual, [chave]: valor }))

  const editarLinha = (index: number, chave: keyof Linha, valor: string | number) =>
    setLinhas((atual) => atual.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha)))

  function marcarSelecionado(id: string) {
    const selecionado = lista.find((registro) => registro.id === id)
    if (!selecionado) return
    setErros([])
    setCabecalho(selecionado)
    void carregarLinhas(id)
  }

  async function salvarCabecalho() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!cabecalho.numero.trim()) { setErros(['Informe o número do FMEA (campo obrigatório da planilha do proprietário).']); return }
    setErros([])
    setSalvando(true)
    try {
      const corpo = {
        empresa_id: companyId,
        numero: cabecalho.numero.trim(),
        tipo: cabecalho.tipo,
        pagina: cabecalho.pagina,
        total_paginas: cabecalho.total_paginas,
        codigo_peca: cabecalho.codigo_peca.trim(),
        codigo_peca_cliente: cabecalho.codigo_peca_cliente.trim(),
        nome_peca: cabecalho.nome_peca.trim(),
        cliente_projeto: cabecalho.cliente_projeto.trim(),
        fornecedor: cabecalho.fornecedor.trim(),
        codigo_fornecedor: cabecalho.codigo_fornecedor.trim(),
        areas_envolvidas: cabecalho.areas_envolvidas.trim(),
        equipe_principal: cabecalho.equipe_principal.trim(),
        contato_principal: cabecalho.contato_principal.trim(),
        telefone: cabecalho.telefone.trim(),
        data_primeira_emissao: cabecalho.data_primeira_emissao || null,
        data_revisao: cabecalho.data_revisao || null,
        aprovacao_engenharia_cliente: cabecalho.aprovacao_engenharia_cliente.trim(),
        aprovacao_qualidade_cliente: cabecalho.aprovacao_qualidade_cliente.trim(),
        aprovacao_fornecedor_planta: cabecalho.aprovacao_fornecedor_planta.trim(),
        outra_aprovacao: cabecalho.outra_aprovacao.trim(),
        status: cabecalho.status,
        versao: cabecalho.versao,
      }
      if (cabecalho.id) {
        const atualizado = await supabase.from('erp_fmea_cabecalho').update(corpo).eq('id', cabecalho.id).select('id').maybeSingle()
        if (atualizado.error) throw atualizado.error
      } else {
        const inserido = await supabase.from('erp_fmea_cabecalho').insert({ ...corpo, criado_por: null }).select('id').single()
        if (inserido.error) throw inserido.error
        setCabecalho((atual) => ({ ...atual, id: String(inserido.data.id) }))
      }
      const recarregados = await carregarCabecalhos()
      const idSalvo = cabecalho.id || (recarregados as Cabecalho[]).find((registro) => registro.numero === cabecalho.numero.trim())?.id
      if (idSalvo) setCabecalho((atual) => ({ ...atual, id: idSalvo }))
      setAvisos([`FMEA ${cabecalho.numero.trim()} rev ${cabecalho.versao} gravado no banco da empresa.`])
    } catch (cause) {
      setErros([explicarFalha(cause)])
    } finally {
      setSalvando(false)
    }
  }

  async function salvarLinhas() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!cabecalho.id) { setErros(['Salve o cabeçalho do FMEA antes de gravar as linhas de risco.']); return }
    const completas = linhas.filter((linha) => linha.codigo_item_processo.trim() && linha.modo_falha.trim() && linha.causa.trim())
    if (completas.length !== linhas.length)
      setErros(['Toda linha precisa de item/processo, modo de falha e causa. A planilha do proprietário não aceita linha em branco.'])
    else setErros([])
    const alteradas = completas.filter((linha) => !linha.id || marcas[linha.id] !== JSON.stringify(linha))
    if (alteradas.length === 0) {
      setAvisos(completas.length === 0 ? [] : ['Nenhuma linha alterada desde a última gravação.'])
      return
    }
    setSalvando(true)
    try {
      for (let i = 0; i < alteradas.length; i++) {
        const linha = alteradas[i]
        const npr = nprDa(linha)
        // As colunas legadas (funcao, controles, acoes_recomendadas, status_acao) continuam
        // alimentadas: outras telas do SGQ ainda leem esses campos do banco.
        const corpo = {
          empresa_id: companyId,
          cabecalho_id: cabecalho.id,
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
      await carregarLinhas(cabecalho.id)
      setAvisos([`${alteradas.length} linha(s) de risco gravada(s) em qualidade_fmea.`])
    } catch (cause) {
      setErros([explicarFalha(cause)])
    } finally {
      setSalvando(false)
    }
  }

  async function excluirLinha(index: number) {
    const linha = linhas[index]
    if (!linha) return
    if (!linha.id) {
      setLinhas((atual) => atual.filter((_, i) => i !== index))
      return
    }
    setErros([])
    try {
      const removida = await supabase.from('qualidade_fmea').delete().eq('id', linha.id)
      if (removida.error) throw removida.error
      if (cabecalho.id) await carregarLinhas(cabecalho.id)
      setAvisos(['Linha removida do banco da empresa.'])
    } catch (cause) {
      setErros([explicarFalha(cause)])
    }
  }

  const resumo = useMemo(() => {
    if (linhas.length === 0) return null
    const valores = linhas.map(nprDa)
    const apos = linhas.map(nprAposDa)
    return {
      total: linhas.length,
      maximo: Math.max(...valores),
      medio: Math.round((valores.reduce((a, b) => a + b, 0) / linhas.length) * 10) / 10,
      maximoApos: Math.max(...apos),
      criticas: linhas.filter((linha) => linha.caracteristica_especial !== 'nenhuma').length,
      acoes: linhas.filter((linha) => linha.acao_recomendada.trim() && !linha.acao_tomada.trim()).length,
    }
  }, [linhas])

  function montarDocumento(): Documento {
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
    const registros = linhas.map((linha, index) => [
      linha.ordem || index + 1,
      linha.codigo_item_processo,
      linha.funcao_requisito,
      CARACTERISTICAS.find((c) => c.valor === linha.caracteristica_especial)?.rotulo ?? 'Nenhuma',
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
    const codigo = `FMEA ${cabecalho.numero || '—'} · rev ${cabecalho.versao}`
    return {
      modulo: 'Qualidade · SGQ',
      tipo: 'FMEA',
      titulo: TIPOS.find((t) => t.valor === cabecalho.tipo)?.rotulo ?? 'FMEA',
      codigo,
      subtitulo: cabecalho.nome_peca || undefined,
      blocos: [
        {
          tipo: 'campos',
          titulo: 'Identificação do documento',
          colunas: 3,
          itens: [
            { rotulo: 'FMEA nº', valor: cabecalho.numero },
            { rotulo: 'Página', valor: `${cabecalho.pagina} de ${cabecalho.total_paginas}` },
            { rotulo: 'Situação', valor: SITUACOES.find((s) => s.valor === cabecalho.status)?.rotulo ?? cabecalho.status },
            { rotulo: 'Nº da peça', valor: cabecalho.codigo_peca },
            { rotulo: 'Nº da peça do cliente', valor: cabecalho.codigo_peca_cliente },
            { rotulo: 'Nome da peça', valor: cabecalho.nome_peca },
            { rotulo: 'Cliente / projeto', valor: cabecalho.cliente_projeto },
            { rotulo: 'Fornecedor / planta', valor: cabecalho.fornecedor },
            { rotulo: 'Código do fornecedor', valor: cabecalho.codigo_fornecedor },
            { rotulo: 'Data do 1º emissão', valor: dataTexto(cabecalho.data_primeira_emissao) },
            { rotulo: 'Data da revisão', valor: dataTexto(cabecalho.data_revisao) },
            { rotulo: 'Revisão', valor: cabecalho.versao },
            { rotulo: 'Áreas envolvidas', valor: cabecalho.areas_envolvidas },
            { rotulo: 'Equipe principal', valor: cabecalho.equipe_principal },
            { rotulo: 'Contato principal / telefone', valor: [cabecalho.contato_principal, cabecalho.telefone].filter(Boolean).join(' · ') },
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
          itens: resumo
            ? [
                { rotulo: 'Linhas analisadas', valor: resumo.total },
                { rotulo: 'NPR máximo', valor: resumo.maximo },
                { rotulo: 'NPR médio', valor: resumo.medio },
                { rotulo: 'NPR máximo após ações', valor: resumo.maximoApos },
                { rotulo: 'Características especiais', valor: resumo.criticas },
                { rotulo: 'Ações em aberto', valor: resumo.acoes },
              ]
            : [{ rotulo: 'Linhas analisadas', valor: 0 }],
        },
        {
          tipo: 'assinaturas',
          titulo: 'Aprovações',
          assinantes: [
            { papel: 'Aprovação — Engenharia do cliente', nome: cabecalho.aprovacao_engenharia_cliente || undefined },
            { papel: 'Aprovação — Qualidade do cliente', nome: cabecalho.aprovacao_qualidade_cliente || undefined },
            { papel: 'Aprovação — Fornecedor / Planta', nome: cabecalho.aprovacao_fornecedor_planta || undefined },
            { papel: 'Outras aprovações', nome: cabecalho.outra_aprovacao || undefined },
          ],
        },
      ],
      qrcode: cabecalho.id
        ? {
            valor: `${window.location.origin}/pageprincipal/qualidade/fmea?doc=${cabecalho.id}`,
            legenda: `Verificação no sistema · ${codigo}`,
          }
        : undefined,
      observacoes:
        'Documento gerado pelo SYSNQRA ERP Industrial a partir do banco da empresa. O QR Code do cabeçalho aponta para o registro digital desta mesma revisão.',
    }
  }

  const semCabecalho = !cabecalho.id

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900" data-synqra-density="30px">
      <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <ShieldCheck size={17} className="text-[#2D8DB8]" />
        <div>
          <h1 className="text-[13px] font-semibold text-[#123B50]">FMEA · Análise de Modo e Efeitos de Falha (AIAG)</h1>
          <p className="text-[9px] text-slate-500">Cabeçalho controlado · matriz editável · NPR S×O×D em tempo real · impressão A4 com QR Code</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]"
            aria-label="FMEA cadastrado"
            value={cabecalho.id}
            onChange={(evento) => (evento.target.value ? marcarSelecionado(evento.target.value) : setCabecalho(cabecalhoVazio))}
          >
            <option value="">— Novo FMEA —</option>
            {lista.map((registro) => (
              <option key={registro.id} value={registro.id}>
                {registro.numero} · rev {registro.versao} · {registro.nome_peca || registro.cliente_projeto || 'sem peça'}
              </option>
            ))}
          </select>
          <button className={acaoLateral} onClick={() => { setCabecalho(cabecalhoVazio); setLinhas([]); setMarcas({}); setAvisos(['Novo FMEA em edição.']) }} disabled={carregando}>
            <Plus size={12} /> Novo
          </button>
          <button className={acaoLateral} onClick={() => void iniciar()} disabled={carregando}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
      </header>

      {erros.length > 0 && (
        <p role="alert" className="mb-3 flex items-start gap-1 border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
          <AlertTriangle size={12} className="mt-[2px] shrink-0" />
          <span>{erros.join(' ')}</span>
        </p>
      )}
      {avisos.length > 0 && <p role="status" className="mb-3 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">{avisos.join(' ')}</p>}

      <section className="mb-3 border border-slate-200 bg-white p-3">
        <h2 className="mb-2 text-[11px] font-semibold text-[#123B50]">Cabeçalho do documento</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          {(
            [
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
            ] as [ChaveTexto, string][]
          ).map(([chave, rotuloCampo]) => (
            <label key={chave}>
              <span className={rotulo}>{rotuloCampo}</span>
              <input
                className={campo}
                type={chave.startsWith('data_') ? 'date' : 'text'}
                value={cabecalho[chave]}
                maxLength={chave === 'numero' ? 40 : 300}
                onChange={(evento: ChangeEvent<HTMLInputElement>) => setCampo(chave, evento.target.value)}
              />
            </label>
          ))}
          <label>
            <span className={rotulo}>Tipo</span>
            <select className={campo} value={cabecalho.tipo} onChange={(evento) => setCabecalho((a) => ({ ...a, tipo: evento.target.value as Tipo }))}>
              {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
            </select>
          </label>
          <label>
            <span className={rotulo}>Situação</span>
            <select className={campo} value={cabecalho.status} onChange={(evento) => setCabecalho((a) => ({ ...a, status: evento.target.value as Situacao }))}>
              {SITUACOES.map((situacao) => <option key={situacao.valor} value={situacao.valor}>{situacao.rotulo}</option>)}
            </select>
          </label>
          <label>
            <span className={rotulo}>Revisão</span>
            <input className={campo} type="number" min={1} max={99} value={cabecalho.versao} onChange={(evento) => setCabecalho((a) => ({ ...a, versao: Number(evento.target.value) }))} />
          </label>
          <label>
            <span className={rotulo}>Página</span>
            <input className={campo} type="number" min={1} max={99} value={cabecalho.pagina} onChange={(evento) => setCabecalho((a) => ({ ...a, pagina: Number(evento.target.value) }))} />
          </label>
          <label>
            <span className={rotulo}>Total de páginas</span>
            <input className={campo} type="number" min={1} max={99} value={cabecalho.total_paginas} onChange={(evento) => setCabecalho((a) => ({ ...a, total_paginas: Number(evento.target.value) }))} />
          </label>
          {(
            [
              ['aprovacao_engenharia_cliente', 'Aprovação engenharia cliente'],
              ['aprovacao_qualidade_cliente', 'Aprovação qualidade cliente'],
              ['aprovacao_fornecedor_planta', 'Aprovação fornecedor / planta'],
              ['outra_aprovacao', 'Outras aprovações'],
            ] as [ChaveTexto, string][]
          ).map(([chave, rotuloCampo]) => (
            <label key={chave}>
              <span className={rotulo}>{rotuloCampo}</span>
              <input className={campo} value={cabecalho[chave]} maxLength={200} onChange={(evento) => setCampo(chave, evento.target.value)} />
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className={acao} onClick={() => void salvarCabecalho()} disabled={salvando || carregando}>
            <Save size={12} /> {salvando ? 'Gravando…' : 'Salvar cabeçalho'}
          </button>
          <button className={acaoLateral} onClick={() => void abrirRelatorio(montarDocumento())} disabled={semCabecalho}>
            <Printer size={12} /> Imprimir A4 com QR
          </button>
        </div>
      </section>

      <section className="mb-3 border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold text-[#123B50]">Matriz de risco</h2>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-wider text-slate-500">
            {resumo && (
              <>
                <span>Linhas <strong className="text-[11px] text-slate-800">{resumo.total}</strong></span>
                <span>NPR máx <strong className={`text-[11px] ${corNpr(resumo.maximo)}`}>{resumo.maximo}</strong></span>
                <span>NPR médio <strong className="text-[11px] text-slate-800">{resumo.medio}</strong></span>
                <span>NPR máx após <strong className={`text-[11px] ${corNpr(resumo.maximoApos)}`}>{resumo.maximoApos}</strong></span>
                <span>Car. especiais <strong className="text-[11px] text-slate-800">{resumo.criticas}</strong></span>
                <span>Ações abertas <strong className="text-[11px] text-slate-800">{resumo.acoes}</strong></span>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className={acaoLateral}
            onClick={() => setLinhas((atual) => [...atual, linhaVazia(atual.length + 1)])}
            disabled={!cabecalho.id || carregando}
            title={cabecalho.id ? 'Incluir linha de risco na matriz' : 'Salve o cabeçalho antes de incluir linhas'}
          >
            <Plus size={12} /> Nova linha de risco
          </button>
          <button className={acao} onClick={() => void salvarLinhas()} disabled={salvando || !cabecalho.id || linhas.length === 0}>
            <Save size={12} /> Salvar linhas
          </button>
        </div>
      </section>

      <section className="overflow-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[2400px] border-collapse text-left text-[10px]">
          <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
            <tr>
              {['Nº', 'Item / processo *', 'Função / requisito', 'Car. especial', 'Modo de falha *', 'Causa *', 'Mecanismo de falha', 'Efeito', 'S', 'Controles prevenção', 'Controles detecção', 'O', 'D', 'NPR', 'Ação recomendada', 'Responsável', 'Prazo', 'Ação tomada', 'Resultado', 'S após', 'O após', 'D após', 'NPR após', ''].map((titulo) => (
                <th key={titulo} className="h-[30px] whitespace-nowrap border-b border-slate-200 px-1">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={24} className="h-[40px] text-center text-slate-500">Carregando o FMEA da empresa…</td></tr>
            ) : linhas.length === 0 ? (
              <tr><td colSpan={24} className="h-[40px] text-center text-slate-500">{cabecalho.id ? 'Cabeçalho salvo sem linhas de risco. Use “Nova linha de risco”.' : 'Selecione um FMEA cadastrado ou salve um novo cabeçalho.'}</td></tr>
            ) : (
              linhas.map((linha, index) => {
                const npr = nprDa(linha)
                const nprApos = nprAposDa(linha)
                return (
                  <tr key={linha.id ?? `nova-${index}`} className="border-b border-slate-100 align-top hover:bg-neutral-50/80">
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 42 }} type="number" min={1} max={999} value={linha.ordem} onChange={(e) => editarLinha(index, 'ordem', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.codigo_item_processo} maxLength={120} onChange={(e) => editarLinha(index, 'codigo_item_processo', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.funcao_requisito} maxLength={500} onChange={(e) => editarLinha(index, 'funcao_requisito', e.target.value)} /></td>
                    <td className="px-1 py-[3px]">
                      <select className={celula} style={{ width: 104 }} value={linha.caracteristica_especial} onChange={(e) => editarLinha(index, 'caracteristica_especial', e.target.value as Caracteristica)}>
                        {CARACTERISTICAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.modo_falha} maxLength={1000} onChange={(e) => editarLinha(index, 'modo_falha', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.causa} maxLength={1000} onChange={(e) => editarLinha(index, 'causa', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.mecanismo_falha} maxLength={1000} onChange={(e) => editarLinha(index, 'mecanismo_falha', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 150 }} value={linha.efeito} maxLength={1000} onChange={(e) => editarLinha(index, 'efeito', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.severidade} onChange={(e) => editarLinha(index, 'severidade', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.controle_prevencao} maxLength={1000} onChange={(e) => editarLinha(index, 'controle_prevencao', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.controle_deteccao} maxLength={1000} onChange={(e) => editarLinha(index, 'controle_deteccao', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.ocorrencia} onChange={(e) => editarLinha(index, 'ocorrencia', Number(e.target.value))} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={10} value={linha.deteccao} onChange={(e) => editarLinha(index, 'deteccao', Number(e.target.value))} /></td>
                    <td className={`px-2 py-[3px] text-right font-bold tabular-nums ${corNpr(npr)}`}>{npr}</td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 180 }} value={linha.acao_recomendada} maxLength={1500} onChange={(e) => editarLinha(index, 'acao_recomendada', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 120 }} value={linha.acao_responsavel} maxLength={200} onChange={(e) => editarLinha(index, 'acao_responsavel', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 128 }} type="date" value={linha.acao_prazo} onChange={(e) => editarLinha(index, 'acao_prazo', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.acao_tomada} maxLength={1500} onChange={(e) => editarLinha(index, 'acao_tomada', e.target.value)} /></td>
                    <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.acao_resultado} maxLength={1500} onChange={(e) => editarLinha(index, 'acao_resultado', e.target.value)} /></td>
                    {(['severidade_apos', 'ocorrencia_apos', 'deteccao_apos'] as const).map((chave) => (
                      <td key={chave} className="px-1 py-[3px]">
                        <input className={celula} style={{ width: 52 }} type="number" min={1} max={10} value={linha[chave]}
                          onChange={(e) => editarLinha(index, chave, e.target.value === '' ? '' : Number(e.target.value))} />
                      </td>
                    ))}
                    <td className={`px-2 py-[3px] text-right font-bold tabular-nums ${corNpr(nprApos)}`}>{nprApos}</td>
                    <td className="px-1 py-[3px]">
                      <button className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-rose-700" onClick={() => void excluirLinha(index)}>
                        <Trash2 size={11} /> Remover
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      <p className="mt-2 text-[9px] text-slate-500">
        Escala AIAG de 1 a 10 · NPR ≥ 100 exige ação registrada · a coluna legada <code>controles</code> continua gravada para as telas do SGQ que ainda a leem.
      </p>
    </main>
  )
}
