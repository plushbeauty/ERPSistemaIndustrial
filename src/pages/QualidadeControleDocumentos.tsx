/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-GED-OITO-ABAS-20261101-01 — Controle de Documentos da Qualidade em página única de 8 abas
 * @STATUS_APROVACAO: LEITURA FUNCIONA HOJE; GRAVAÇÃO AGUARDA A MIGRATION 20261101233000 APLICADA PELO PROPRIETÁRIO
 *
 * Ordem de serviço de 2026-11-01: Controle de Documentos da Qualidade em página
 * única com 8 abas (cadastro, revisões/histórico, aprovação/distribuição,
 * obsoletos, anexos, versões de anexos, pesquisa/relatórios e auditoria), com
 * anexos no Supabase Storage versionados e políticas recortadas por empresa.
 *
 * Nada aqui é maquete. As leituras vêm de erp_qualidade_documentos_editor e
 * erp_qualidade_documentos_revisoes, que já existem (20260927240000), e de
 * erp_sgq_documento_anexos / _distribuicoes / _trilha, criadas por
 * 20261101233000. Toda gravação passa por RPC security definer — a tela nunca
 * escreve nas tabelas de trilha, anexos ou distribuição. Se a migration ainda
 * não foi aplicada, as abas abrem em leitura, mostram traço no que não existe e
 * declaram a pendência em vez de fingir que gravaram.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Download,
  FilePlus2,
  FileWarning,
  History,
  Layers,
  Paperclip,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ModuleWorkspace from '../components/layout/ModuleRail'
import { moduleNavs } from '../config/moduleNav'

/* ------------------------------------------------------------------ contrato */

type Documento = {
  id: string
  codigo_documento: string
  titulo_documento: string
  revisao: number | null
  conteudo_texto: string
  data_homologacao: string | null
  criado_em: string | null
  atualizado_em: string | null
  status?: string | null
  tipo_documento?: string | null
  setor_responsavel?: string | null
  elaborador?: string | null
  revisor?: string | null
  aprovador?: string | null
  proxima_revisao?: string | null
  validade_ate?: string | null
  observacao?: string | null
  motivo_alteracao?: string | null
}

type Revisao = {
  id: string
  codigo_documento: string
  titulo_documento: string
  departamento: string | null
  revisao: number | null
  status: string | null
  responsavel: string | null
  url_anexo: string | null
  nome_arquivo: string | null
  criado_em: string | null
  motivo_alteracao?: string | null
  data_vigencia?: string | null
  atualizado_em?: string | null
  aprovado_por_nome?: string | null
  aprovado_em?: string | null
  comentario_aprovacao?: string | null
  devolvido_motivo?: string | null
  observacao?: string | null
}

type Anexo = {
  id: string
  documento_id: string
  codigo_documento: string
  revisao_id: string | null
  revisao_numero: number | null
  nome_arquivo: string
  nome_logico: string
  storage_path: string
  mime_type: string | null
  tamanho_bytes: number
  versao: number
  status: string
  motivo: string | null
  motivo_obsolescencia: string | null
  substituido_por: string | null
  criado_por_nome: string | null
  criado_em: string | null
}

type Distribuicao = {
  id: string
  documento_id: string
  codigo_documento: string
  revisao_numero: number | null
  setor: string
  motivo: string | null
  distribuido_por_nome: string | null
  distribuido_em: string | null
  ciencia_em: string | null
  ciencia_por_nome: string | null
}

type EventoTrilha = {
  id: string
  documento_id: string | null
  codigo_documento: string | null
  revisao_numero: number | null
  evento: string
  ator_nome: string | null
  detalhe: Record<string, unknown> | null
  criado_em: string | null
}

type RetornoRpc = {
  documento_id?: string
  revisao_id?: string
  codigo_documento?: string
  revisao?: number
  status?: string
  status_revisao?: string
  status_documento?: string
  evento?: string
  responsavel?: string
  data_vigencia?: string
  aprovado_por?: string
  anexo_id?: string
  nome_arquivo?: string
  nome_logico?: string
  storage_path?: string
  versao?: number
  distribuicoes_novas?: number
  distribuicoes_total?: number
  distribuicao_id?: string
  setor?: string
  ciencia_em?: string
  ciencia_por?: string
}

type Feedback = { tom: 'ok' | 'erro'; texto: string }

/* ---------------------------------------------------------------- constantes */

const COLUNAS_DOCUMENTO_COMPLETA = 'id,codigo_documento,titulo_documento,revisao,status,tipo_documento,setor_responsavel,elaborador,revisor,aprovador,proxima_revisao,validade_ate,data_homologacao,observacao,motivo_alteracao,conteudo_texto,criado_em,atualizado_em'
const COLUNAS_DOCUMENTO_MINIMA = 'id,codigo_documento,titulo_documento,revisao,data_homologacao,conteudo_texto,criado_em,atualizado_em'
const COLUNAS_REVISAO_COMPLETA = 'id,codigo_documento,titulo_documento,departamento,revisao,status,responsavel,url_anexo,nome_arquivo,motivo_alteracao,data_vigencia,criado_em,atualizado_em,aprovado_por_nome,aprovado_em,comentario_aprovacao,devolvido_motivo,observacao'
const COLUNAS_REVISAO_MINIMA = 'id,codigo_documento,titulo_documento,departamento,revisao,status,responsavel,url_anexo,nome_arquivo,criado_em'
const COLUNAS_ANEXO = 'id,documento_id,codigo_documento,revisao_id,revisao_numero,nome_arquivo,nome_logico,storage_path,mime_type,tamanho_bytes,versao,status,motivo,motivo_obsolescencia,substituido_por,criado_por_nome,criado_em'
const COLUNAS_DISTRIBUICAO = 'id,documento_id,codigo_documento,revisao_numero,setor,motivo,distribuido_por_nome,distribuido_em,ciencia_em,ciencia_por_nome'
const COLUNAS_TRILHA = 'id,documento_id,codigo_documento,revisao_numero,evento,ator_nome,detalhe,criado_em'

const BUCKET_ANEXOS = 'erp-qualidade-anexos'
const MAX_ANEXO_BYTES = 52_428_800
const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'image/png',
  'image/jpeg',
])

const TIPOS_DOCUMENTO = [
  'Procedimento Operacional',
  'Instrução de Trabalho',
  'Política da Qualidade',
  'Manual da Qualidade',
  'Formulário',
  'Especificação de Produto',
  'Plano de Controle',
  'Registro de Qualidade',
  'Relatório Técnico',
  'Certificado',
]

const SETOR_CATALOGO = [
  'QUALIDADE', 'PRODUÇÃO', 'PCP', 'ENGENHARIA', 'INJEÇÃO', 'ACABAMENTO', 'MONTAGEM',
  'EMBALAGEM', 'ESTOQUE', 'ALMOXARIFADO', 'COMPRAS', 'MANUTENÇÃO', 'LOGÍSTICA',
  'EXPEDIÇÃO', 'RH', 'SEGURANÇA DO TRABALHO', 'FINANCEIRO', 'FISCAL', 'COMERCIAL', 'T.I.',
]

const MIGRATION_GED = '20261101233000_erp_sgq_controle_documentos_ged_v1.sql'

const ABAS = [
  { id: 'cadastro', label: 'Cadastro', icon: FilePlus2 },
  { id: 'revisoes', label: 'Revisões e histórico', icon: History },
  { id: 'aprovacao', label: 'Aprovação e distribuição', icon: ShieldCheck },
  { id: 'obsoletos', label: 'Obsoletos', icon: Archive },
  { id: 'anexos', label: 'Anexos', icon: Paperclip },
  { id: 'versoes', label: 'Versões de anexos', icon: Layers },
  { id: 'pesquisa', label: 'Pesquisa e relatórios', icon: Search },
  { id: 'auditoria', label: 'Auditoria', icon: ScrollText },
] as const

type AbaId = (typeof ABAS)[number]['id']

const ROTULO_STATUS: Record<string, string> = {
  EM_REVISAO: 'Em revisão',
  REPROVADO: 'Devolvido',
  VIGENTE: 'Vigente',
  ATIVA: 'Ativa',
  OBSOLETO: 'Obsoleto',
}

const TOM_STATUS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  EM_REVISAO: 'info',
  REPROVADO: 'danger',
  VIGENTE: 'success',
  ATIVA: 'success',
  OBSOLETO: 'neutral',
}

const ROTULO_EVENTO: Record<string, string> = {
  cadastro: 'Cadastro do documento',
  salvo: 'Rascunho salvo',
  nova_revisao: 'Nova revisão aberta',
  anexo_vinculado: 'Anexo vinculado',
  anexo_substituido: 'Anexo substituído',
  aprovado: 'Revisão aprovada',
  devolvido: 'Revisão devolvida',
  obsoleto: 'Documento tornado obsoleto',
  distribuido: 'Distribuição registrada',
  ciencia: 'Ciência do setor',
}

const rotuloStatus = (status: string | null | undefined) => {
  const chave = String(status ?? '').toUpperCase()
  return ROTULO_STATUS[chave] ?? (chave ? chave : '—')
}

const tomStatus = (status: string | null | undefined): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  const chave = String(status ?? '').toUpperCase()
  return TOM_STATUS[chave] ?? 'neutral'
}

const fmtData = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear())}`
}

const fmtDataHora = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${fmtData(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const fmtBytes = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/** Dias até a data (negativo = já passou). Contagem da tela para filtrar vigência, não prazo legal. */
const diasAte = (iso: string | null | undefined) => {
  if (!iso) return null
  const alvo = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(alvo.getTime())) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function traduzFalha(falha: unknown): string {
  if (falha && typeof falha === 'object') {
    const erro = falha as { code?: string; message?: string }
    const msg = typeof erro.message === 'string' ? erro.message : ''
    if (erro.code === 'PGRST202' || /could not find the function|does not exist/i.test(msg)) {
      return `Esta rotina ainda não existe no banco: aplique ${MIGRATION_GED} no projeto Supabase para liberar a gravação do Controle de Documentos.`
    }
    if (erro.code === '42501' || /perm/i.test(msg)) {
      return msg || 'Seu perfil não tem permissão de gravar documentos controlados nesta empresa.'
    }
    if (msg) return msg
  }
  return falha instanceof Error ? falha.message : 'Não foi possível concluir a operação no banco do ERP.'
}

function baixarCsv(nomeArquivo: string, linhas: string[][]) {
  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`
  const csv = `${''}${linhas.map(linha => linha.map(escapar).join(';')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}

/* --------------------------------------------------------------------- tela */

type FormDocumento = {
  documentoId: string | null
  codigo: string
  titulo: string
  tipo: string
  setor: string
  elaborador: string
  revisor: string
  aprovador: string
  proximaRevisao: string
  validadeAte: string
  motivo: string
  conteudo: string
  observacao: string
}

const formVazio: FormDocumento = {
  documentoId: null, codigo: '', titulo: '', tipo: TIPOS_DOCUMENTO[0], setor: SETOR_CATALOGO[0],
  elaborador: '', revisor: '', aprovador: '', proximaRevisao: '', validadeAte: '',
  motivo: '', conteudo: '', observacao: '',
}

/** O builder do Supabase devolve PromiseLike, que não tem .catch — isto converte em Promise real. */
function consulta<T>(promessa: PromiseLike<T>): Promise<T> {
  return Promise.resolve(promessa)
}

export default function QualidadeControleDocumentos() {
  const nav = useMemo(() => moduleNavs.find(item => item.key === 'qualidade') ?? null, [])

  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'sem_empresa' | 'erro'>('carregando')
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [empresaNome, setEmpresaNome] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [podeGravar, setPodeGravar] = useState(false)
  const [gateLido, setGateLido] = useState(false)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [revisoes, setRevisoes] = useState<Revisao[]>([])
  const [anexos, setAnexos] = useState<Anexo[] | null>(null)
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[] | null>(null)
  const [trilha, setTrilha] = useState<EventoTrilha[] | null>(null)

  const [aba, setAba] = useState<AbaId>('cadastro')
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormDocumento>(formVazio)
  const [gravando, setGravando] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [comentario, setComentario] = useState('')
  const [motivoAcao, setMotivoAcao] = useState('')
  const [motivoDistribuicao, setMotivoDistribuicao] = useState('')
  const [setoresMarcados, setSetoresMarcados] = useState<string[]>([])
  const [setorLivre, setSetorLivre] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [motivoAnexo, setMotivoAnexo] = useState('')
  const [filtro, setFiltro] = useState<{ busca: string; status: string; tipo: string; setor: string; vigencia: string }>({ busca: '', status: 'todos', tipo: 'todos', setor: 'todos', vigencia: 'todas' })
  const [trilhaSomenteDocumento, setTrilhaSomenteDocumento] = useState(true)
  const inputArquivo = useRef<HTMLInputElement | null>(null)

  const carregar = useCallback(async (): Promise<Documento[]> => {
    setEstado('carregando')
    setErro('')
    try {
      const { data: tenantData, error: tenantErro } = await supabase.rpc('erp_current_empresa_id')
      if (tenantErro) throw tenantErro
      const tenant = typeof tenantData === 'string' ? tenantData : null
      if (!tenant) {
        setEstado('sem_empresa')
        return []
      }

      const leituraDocumentos = async (): Promise<{ dados: Documento[] | null; completa: boolean }> => {
        try {
          const dados = await fetchAllPages<Documento>((de, ate) =>
            supabase.from('erp_qualidade_documentos_editor').select(COLUNAS_DOCUMENTO_COMPLETA).eq('empresa_id', tenant).order('codigo_documento').range(de, ate))
          return { dados, completa: true }
        } catch {
          try {
            const dados = await fetchAllPages<Documento>((de, ate) =>
              supabase.from('erp_qualidade_documentos_editor').select(COLUNAS_DOCUMENTO_MINIMA).eq('empresa_id', tenant).order('codigo_documento').range(de, ate))
            return { dados, completa: false }
          } catch {
            return { dados: null, completa: false }
          }
        }
      }

      const leituraRevisoes = async (): Promise<{ dados: Revisao[] | null; completa: boolean }> => {
        try {
          const dados = await fetchAllPages<Revisao>((de, ate) =>
            supabase.from('erp_qualidade_documentos_revisoes').select(COLUNAS_REVISAO_COMPLETA).eq('empresa_id', tenant).order('revisao', { ascending: false }).range(de, ate))
          return { dados, completa: true }
        } catch {
          try {
            const dados = await fetchAllPages<Revisao>((de, ate) =>
              supabase.from('erp_qualidade_documentos_revisoes').select(COLUNAS_REVISAO_MINIMA).eq('empresa_id', tenant).order('revisao', { ascending: false }).range(de, ate))
            return { dados, completa: false }
          } catch {
            return { dados: null, completa: false }
          }
        }
      }

      const [docRes, revRes, anexoRes, distRes, trilhaRes, empresaRes, gateRes] = await Promise.all([
        leituraDocumentos(),
        leituraRevisoes(),
        consulta(supabase.from('erp_sgq_documento_anexos').select(COLUNAS_ANEXO).eq('empresa_id', tenant).order('criado_em', { ascending: false }).limit(3000)
          .then(r => (r.error ? null : (r.data ?? []) as unknown as Anexo[]))).catch(() => null),
        consulta(supabase.from('erp_sgq_documento_distribuicoes').select(COLUNAS_DISTRIBUICAO).eq('empresa_id', tenant).order('distribuido_em', { ascending: false }).limit(3000)
          .then(r => (r.error ? null : (r.data ?? []) as unknown as Distribuicao[]))).catch(() => null),
        consulta(supabase.from('erp_sgq_documento_trilha').select(COLUNAS_TRILHA).eq('empresa_id', tenant).order('criado_em', { ascending: false }).limit(1500)
          .then(r => (r.error ? null : (r.data ?? []) as unknown as EventoTrilha[]))).catch(() => null),
        consulta(supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', tenant).maybeSingle()
          .then(r => r.data as { nome_fantasia: string | null; razao_social: string | null } | null)).catch(() => null),
        consulta(supabase.rpc('erp_sgq_documento_pode_gravar')
          .then(r => (r.error ? null : r.data === true))).catch(() => null),
      ])

      const documentosLidos = docRes.dados
      if (documentosLidos === null) {
        setEstado('erro')
        setErro('Não foi possível ler erp_qualidade_documentos_editor desta empresa. Verifique o acesso RLS do perfil e se a empresa está ativa.')
        return []
      }

      const pendencias: string[] = []
      if (!docRes.completa) {
        pendencias.push(`A base ainda não tem as colunas de status, tipo, setor responsável, elaborador/revisor/aprovador e vigência: elas são criadas por ${MIGRATION_GED}. O que não existe aparece como traço.`)
      }
      if (revRes.dados === null) pendencias.push('A leitura de erp_qualidade_documentos_revisoes falhou: o histórico de revisões aparece vazio.')
      else if (!revRes.completa) pendencias.push('As colunas de aprovação, devolução e motivo da revisão dependem da migration; a aba 2 mostra só o que o banco já tem.')
      if (anexoRes === null) pendencias.push(`A tabela erp_sgq_documento_anexos não é legível nesta base: as abas 5 e 6 ficam sem arquivos até ${MIGRATION_GED} ser aplicada.`)
      if (distRes === null) pendencias.push(`A tabela erp_sgq_documento_distribuicoes não é legível: a distribuição controlada com ciência do setor (aba 3) depende da migration.`)
      if (trilhaRes === null) pendencias.push(`A trilha erp_sgq_documento_trilha não é legível: a aba 8 (auditoria) fica vazia até a migration ser aplicada.`)
      if (gateRes === null) pendencias.push(`A função de gate erp_sgq_documento_pode_gravar não existe neste banco: a tela abre somente leitura e nenhum botão de gravação é liberado.`)

      setDocumentos(documentosLidos)
      setRevisoes(revRes.dados ?? [])
      setAnexos(anexoRes)
      setDistribuicoes(distRes)
      setTrilha(trilhaRes)
      setEmpresaId(tenant)
      setEmpresaNome(empresaRes?.nome_fantasia?.trim() || empresaRes?.razao_social?.trim() || 'Empresa vinculada')
      setGateLido(gateRes !== null)
      setPodeGravar(gateRes === true)
      setAvisos(pendencias)
      setEstado('pronto')
      return documentosLidos
    } catch (falha) {
      setEstado('erro')
      setErro(falha instanceof Error ? falha.message : traduzFalha(falha))
      return []
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const selecionado = useMemo(() => documentos.find(doc => doc.id === selecionadoId) ?? null, [documentos, selecionadoId])
  const revisoesDoDocumento = useMemo(
    () => (selecionado ? revisoes.filter(rev => rev.codigo_documento === selecionado.codigo_documento) : []),
    [revisoes, selecionado],
  )
  const rascunhoAberto = useMemo(
    () => revisoesDoDocumento.find(rev => ['EM_REVISAO', 'REPROVADO'].includes(String(rev.status ?? '').toUpperCase())) ?? null,
    [revisoesDoDocumento],
  )
  const anexosDoDocumento = useMemo(
    () => (anexos && selecionado ? anexos.filter(item => item.documento_id === selecionado.id) : []),
    [anexos, selecionado],
  )
  const distribuicoesDoDocumento = useMemo(
    () => (distribuicoes && selecionado ? distribuicoes.filter(item => item.documento_id === selecionado.id) : []),
    [distribuicoes, selecionado],
  )
  const trilhaVisivel = useMemo(() => {
    const base = trilha ?? []
    if (!trilhaSomenteDocumento || !selecionado) return base
    return base.filter(ev => ev.documento_id === selecionado.id || ev.codigo_documento === selecionado.codigo_documento)
  }, [trilha, trilhaSomenteDocumento, selecionado])

  const contadores = useMemo(() => {
    const porStatus = (doc: Documento) => String(doc.status ?? '').toUpperCase()
    let vigentes = 0
    let emRevisao = 0
    let obsoletos = 0
    let aVencer = 0
    for (const doc of documentos) {
      const st = porStatus(doc)
      if (st === 'VIGENTE' || st === 'ATIVA') vigentes += 1
      else if (st === 'EM_REVISAO' || st === 'REPROVADO') emRevisao += 1
      else if (st === 'OBSOLETO') obsoletos += 1
      const dias = diasAte(doc.validade_ate)
      if (dias !== null && dias >= 0 && dias <= 30) aVencer += 1
    }
    return { total: documentos.length, vigentes, emRevisao, obsoletos, aVencer }
  }, [documentos])

  function preencherFormulario(doc: Documento) {
    setSelecionadoId(doc.id)
    setForm({
      documentoId: doc.id,
      codigo: doc.codigo_documento,
      titulo: doc.titulo_documento,
      tipo: doc.tipo_documento?.trim() || TIPOS_DOCUMENTO[0],
      setor: doc.setor_responsavel?.trim() || SETOR_CATALOGO[0],
      elaborador: doc.elaborador ?? '',
      revisor: doc.revisor ?? '',
      aprovador: doc.aprovador ?? '',
      proximaRevisao: doc.proxima_revisao ? String(doc.proxima_revisao).slice(0, 10) : '',
      validadeAte: doc.validade_ate ? String(doc.validade_ate).slice(0, 10) : '',
      motivo: '',
      conteudo: doc.conteudo_texto ?? '',
      observacao: doc.observacao ?? '',
    })
    setComentario('')
    setMotivoAcao('')
    setMotivoAnexo('')
    setArquivo(null)
    if (inputArquivo.current) inputArquivo.current.value = ''
    setFeedback(null)
  }

  /** O select precisa listar o valor guardado no banco mesmo quando ele foge do catálogo. */
  const opcoesTipo = useMemo(() => (TIPOS_DOCUMENTO.includes(form.tipo) ? TIPOS_DOCUMENTO : [form.tipo, ...TIPOS_DOCUMENTO]), [form.tipo])
  const opcoesSetor = useMemo(() => (SETOR_CATALOGO.includes(form.setor) ? SETOR_CATALOGO : [form.setor, ...SETOR_CATALOGO]), [form.setor])

  function novoDocumento() {
    setSelecionadoId(null)
    setForm(formVazio)
    setAba('cadastro')
    setFeedback(null)
  }

  async function salvarDocumento() {
    const codigo = form.codigo.trim()
    const titulo = form.titulo.trim()
    if (!codigo || !titulo) {
      setFeedback({ tom: 'erro', texto: 'Código e título do documento são obrigatórios — o servidor recusa sem eles.' })
      return
    }
    if (!form.documentoId && !form.conteudo.trim()) {
      setFeedback({ tom: 'erro', texto: 'Documento novo precisa de conteúdo: a RPC erp_sgq_documento_salvar recusa rascunho sem texto.' })
      return
    }
    if (!podeGravar) {
      setFeedback({ tom: 'erro', texto: gateLido ? 'Seu perfil não é QUALIDADE/ADMIN e não tem a permissão qualidade.editar, então a gravação fica bloqueada.' : `Sem o gate ${MIGRATION_GED} a tela não libera gravação.` })
      return
    }
    setGravando(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('erp_sgq_documento_salvar', {
        p_documento_id: form.documentoId,
        p_codigo: codigo,
        p_titulo: titulo,
        p_tipo: form.tipo.trim() || null,
        p_departamento: form.setor.trim() || null,
        p_elaborador: form.elaborador.trim() || null,
        p_revisor: form.revisor.trim() || null,
        p_aprovador: form.aprovador.trim() || null,
        p_proxima_revisao: form.proximaRevisao || null,
        p_validade_ate: form.validadeAte || null,
        p_conteudo: form.conteudo || null,
        p_motivo: form.motivo.trim() || null,
        p_observacao: form.observacao.trim() || null,
      })
      if (error) throw error
      const retorno = (data ?? {}) as RetornoRpc
      const novoId = typeof retorno.documento_id === 'string' ? retorno.documento_id : form.documentoId
      const lidos = await carregar()
      const recarregado = novoId ? lidos.find(item => item.id === novoId) ?? null : null
      if (recarregado) preencherFormulario(recarregado)
      else setForm(f => ({ ...f, documentoId: novoId, motivo: '' }))
      setFeedback({
        tom: 'ok',
        texto: `${codigo} gravado pelo servidor como revisão ${retorno.revisao ?? '—'} — ${rotuloStatus(retorno.status)} (${retorno.evento === 'nova_revisao' ? 'revisão nova aberta' : retorno.evento === 'cadastro' ? 'documento criado' : 'rascunho ajustado'}).`,
      })
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function aprovarRevisao() {
    if (!selecionado) return
    setGravando(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('erp_sgq_documento_aprovar', {
        p_documento_id: selecionado.id,
        p_comentario: comentario.trim() || null,
      })
      if (error) throw error
      const retorno = (data ?? {}) as RetornoRpc
      setFeedback({ tom: 'ok', texto: `Revisão ${retorno.revisao ?? '—'} de ${selecionado.codigo_documento} aprovada e publicada como ${rotuloStatus(retorno.status)} pelo servidor. As revisões anteriores foram para obsoleto.` })
      setComentario('')
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function devolverRevisao() {
    if (!selecionado) return
    if (!motivoAcao.trim()) {
      setFeedback({ tom: 'erro', texto: 'Devolução exige o motivo: a RPC recusa devolução sem justificativa.' })
      return
    }
    setGravando(true)
    setFeedback(null)
    try {
      const { error } = await supabase.rpc('erp_sgq_documento_devolver', {
        p_documento_id: selecionado.id,
        p_motivo: motivoAcao.trim(),
      })
      if (error) throw error
      setFeedback({ tom: 'ok', texto: `${selecionado.codigo_documento} devolvido para ajuste com o motivo registrado na trilha.` })
      setMotivoAcao('')
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function obsoletarDocumento() {
    if (!selecionado) return
    if (!motivoAcao.trim()) {
      setFeedback({ tom: 'erro', texto: 'A baixa de documento controlado exige motivo — nada é apagado, a revisão vai para obsoleto com a justificativa.' })
      return
    }
    setGravando(true)
    setFeedback(null)
    try {
      const { error } = await supabase.rpc('erp_sgq_documento_obsoletar', {
        p_documento_id: selecionado.id,
        p_motivo: motivoAcao.trim(),
      })
      if (error) throw error
      setFeedback({ tom: 'ok', texto: `${selecionado.codigo_documento} marcado como obsoleto. Registros, anexos e trilha continuam preservados.` })
      setMotivoAcao('')
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function anexarArquivo() {
    if (!selecionado || !arquivo) {
      setFeedback({ tom: 'erro', texto: 'Selecione o documento e o arquivo antes de anexar.' })
      return
    }
    if (arquivo.size > MAX_ANEXO_BYTES) {
      setFeedback({ tom: 'erro', texto: `Arquivo acima de ${fmtBytes(MAX_ANEXO_BYTES)}: o bucket aceita no máximo 50 MB.` })
      return
    }
    if (!MIME_PERMITIDOS.has(arquivo.type)) {
      setFeedback({ tom: 'erro', texto: 'Formato fora da lista do bucket: use PDF, DOC, DOCX, XLS, XLSX, XLSM, PNG ou JPG.' })
      return
    }
    setGravando(true)
    setFeedback(null)
    let caminhoEnviado: string | null = null
    try {
      const nomeSeguro = arquivo.name.normalize('NFKD').replace(/[^A-Za-z0-9._-]/g, '_').slice(-120)
      const caminho = `${empresaId}/ged/${selecionado.id}/${crypto.randomUUID()}-${nomeSeguro}`
      const enviado = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
      if (enviado.error) throw enviado.error
      caminhoEnviado = caminho
      const { data, error } = await supabase.rpc('erp_sgq_documento_anexar', {
        p_documento_id: selecionado.id,
        p_nome_arquivo: arquivo.name,
        p_storage_path: caminho,
        p_mime_type: arquivo.type || null,
        p_tamanho_bytes: arquivo.size,
        p_motivo: motivoAnexo.trim() || null,
      })
      if (error) throw error
      const retorno = (data ?? {}) as RetornoRpc
      setFeedback({
        tom: 'ok',
        texto: `${arquivo.name} anexado como versão ${retorno.versao ?? '—'} da revisão ${retorno.revisao ?? '—'} do rascunho${retorno.evento === 'anexo_substituido' ? '; a versão anterior foi marcada como obsoleta, o arquivo não foi apagado' : ''}.`,
      })
      setArquivo(null)
      setMotivoAnexo('')
      if (inputArquivo.current) inputArquivo.current.value = ''
      await carregar()
    } catch (falha) {
      if (caminhoEnviado) {
        await supabase.storage.from(BUCKET_ANEXOS).remove([caminhoEnviado]).catch(() => null)
      }
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function abrirAnexo(item: Anexo) {
    setFeedback(null)
    try {
      const { data, error } = await supabase.storage.from(BUCKET_ANEXOS).createSignedUrl(item.storage_path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    }
  }

  async function distribuirRevisao() {
    if (!selecionado) return
    const setores = [...setoresMarcados, setorLivre.trim().toUpperCase()].filter(Boolean)
    if (setores.length === 0) {
      setFeedback({ tom: 'erro', texto: 'Marque pelo menos um setor para distribuir a revisão aprovada.' })
      return
    }
    setGravando(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase.rpc('erp_sgq_documento_distribuir', {
        p_documento_id: selecionado.id,
        p_setores: setores,
        p_motivo: motivoDistribuicao.trim() || motivoAcao.trim() || null,
      })
      if (error) throw error
      const retorno = (data ?? {}) as RetornoRpc
      setFeedback({ tom: 'ok', texto: `Distribuição registrada na revisão ${retorno.revisao ?? '—'}: ${retorno.distribuicoes_novas ?? 0} nova(s) ciência(s) pedida(s) para ${setores.join(', ')} (${retorno.distribuicoes_total ?? 0} distribuição(s) no total). Setores que já tinham a mesma revisão não duplicam.` })
      setSetoresMarcados([])
      setSetorLivre('')
      setMotivoDistribuicao('')
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  async function confirmarCiencia(item: Distribuicao) {
    setGravando(true)
    setFeedback(null)
    try {
      const { error } = await supabase.rpc('erp_sgq_documento_confirmar_ciencia', { p_distribuicao_id: item.id })
      if (error) throw error
      setFeedback({ tom: 'ok', texto: `Ciência do setor ${item.setor} registrada na trilha do documento.` })
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: traduzFalha(falha) })
    } finally {
      setGravando(false)
    }
  }

  function alternarSetor(setor: string) {
    setSetoresMarcados(atuais => (atuais.includes(setor) ? atuais.filter(item => item !== setor) : [...atuais, setor]))
  }

  function aoTrocarAbas(event: React.KeyboardEvent<HTMLDivElement>) {
    const indice = ABAS.findIndex(item => item.id === aba)
    let proximo = indice
    if (event.key === 'ArrowRight') proximo = (indice + 1) % ABAS.length
    else if (event.key === 'ArrowLeft') proximo = (indice - 1 + ABAS.length) % ABAS.length
    else if (event.key === 'Home') proximo = 0
    else if (event.key === 'End') proximo = ABAS.length - 1
    else return
    event.preventDefault()
    setAba(ABAS[proximo].id)
    const alvo = document.getElementById(`ged-tab-${ABAS[proximo].id}`)
    alvo?.focus()
  }

  const listaPesquisada = useMemo(() => {
    const termo = filtro.busca.trim().toLocaleLowerCase('pt-BR')
    return documentos.filter(doc => {
      if (filtro.status !== 'todos' && String(doc.status ?? '').toUpperCase() !== filtro.status) return false
      if (filtro.tipo !== 'todos' && (doc.tipo_documento ?? '') !== filtro.tipo) return false
      if (filtro.setor !== 'todos' && (doc.setor_responsavel ?? '') !== filtro.setor) return false
      if (filtro.vigencia !== 'todas') {
        const dias = diasAte(doc.validade_ate)
        if (filtro.vigencia === 'vencido' && !(dias !== null && dias < 0)) return false
        if (filtro.vigencia === '30' && !(dias !== null && dias >= 0 && dias <= 30)) return false
        if (filtro.vigencia === '90' && !(dias !== null && dias >= 0 && dias <= 90)) return false
        if (filtro.vigencia === 'sem_data' && dias !== null) return false
      }
      if (!termo) return true
      return [doc.codigo_documento, doc.titulo_documento, doc.tipo_documento ?? '', doc.setor_responsavel ?? '', doc.elaborador ?? '', doc.revisor ?? '', doc.aprovador ?? '', doc.conteudo_texto]
        .some(valor => valor.toLocaleLowerCase('pt-BR').includes(termo))
    })
  }, [documentos, filtro])

  const cadeiasDeAnexo = useMemo(() => {
    const base = anexos ?? []
    const escopo = selecionado && trilhaSomenteDocumento === false ? base : selecionado ? base.filter(item => item.documento_id === selecionado.id) : base
    const grupos = new Map<string, Anexo[]>()
    for (const item of escopo) {
      const chave = `${item.codigo_documento} · ${item.nome_logico}`
      const atual = grupos.get(chave) ?? []
      atual.push(item)
      grupos.set(chave, atual)
    }
    return [...grupos.entries()]
      .map(([chave, itens]) => ({ chave, itens: [...itens].sort((a, b) => b.versao - a.versao) }))
      .sort((a, b) => a.chave.localeCompare(b.chave, 'pt-BR'))
  }, [anexos, selecionado])

  const obsoletos = useMemo(() => ({
    documentos: documentos.filter(doc => String(doc.status ?? '').toUpperCase() === 'OBSOLETO'),
    revisoes: revisoes.filter(rev => String(rev.status ?? '').toUpperCase() === 'OBSOLETO'),
    anexos: (anexos ?? []).filter(item => item.status === 'obsoleto'),
  }), [documentos, revisoes, anexos])

  const semDocumento = (
    <div className="smp-state">
      <FileWarning size={22} aria-hidden />
      <strong>Nenhum documento selecionado</strong>
      <p>Escolha um documento na lista de Cadastro, ou comece um novo. As abas de revisões, aprovação, anexos e trilha operam sobre o documento selecionado.</p>
    </div>
  )

  return (
    <ModuleWorkspace nav={nav ?? moduleNavs[0]}>
      <section className="smp-topbar">
        <div className="smp-topbar-meta"><CalendarClock size={15} aria-hidden />Vigências conferidas por <strong>validade_ate</strong></div>
        <div className="smp-topbar-meta"><BadgeCheck size={15} aria-hidden /><strong>{contadores.vigentes}</strong> vigentes · <strong>{contadores.emRevisao}</strong> em revisão</div>
        <div className="smp-topbar-spacer" />
        <div className="smp-unit"><ShieldCheck size={15} aria-hidden />{podeGravar ? 'Gravação liberada ao perfil' : 'Somente leitura'}</div>
        <div className="smp-unit"><Archive size={15} aria-hidden />{empresaNome}</div>
        <button type="button" className="smp-btn" onClick={() => void carregar()} disabled={estado === 'carregando'}>
          <RefreshCw size={15} aria-hidden />{estado === 'carregando' ? 'Lendo…' : 'Atualizar'}
        </button>
        <button type="button" className="smp-btn smp-btn--primary" onClick={novoDocumento} disabled={!podeGravar}>
          <FilePlus2 size={15} aria-hidden />Novo documento
        </button>
      </section>

      {estado === 'erro' && (
        <div className="smp-note smp-note--error" role="alert">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      {estado === 'sem_empresa' && (
        <div className="smp-state smp-state--error">
          <AlertTriangle size={22} aria-hidden />
          <strong>Nenhuma empresa identificada para a sessão</strong>
          <p>A RPC erp_current_empresa_id não devolveu tenant. Entre com o usuário de uma empresa ativa para carregar o acervo documental.</p>
        </div>
      )}

      {estado === 'carregando' && (
        <div className="smp-skeleton" aria-hidden><i /><i /><i /><i /></div>
      )}

      {estado === 'pronto' && avisos.length > 0 && (
        <div className="smp-note">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <div>
            <strong>O que ainda não está disponível nesta base:</strong>
            <ul style={{ margin: '5px 0 0', paddingLeft: 16, lineHeight: 1.6 }}>
              {avisos.map(texto => <li key={texto}>{texto}</li>)}
            </ul>
          </div>
        </div>
      )}

      {estado === 'pronto' && (
        <>
          <div className="smp-kpis">
            <div className="smp-kpi"><div className="smp-kpi-main"><span className="smp-kpi-label">Documentos controlados</span><span className="smp-kpi-value">{contadores.total}</span><div className="smp-kpi-foot"><span className="smp-kpi-hint">linhas de erp_qualidade_documentos_editor desta empresa</span></div></div></div>
            <div className="smp-kpi" data-tone="success"><div className="smp-kpi-main"><span className="smp-kpi-label">Vigentes</span><span className="smp-kpi-value">{contadores.vigentes}</span><div className="smp-kpi-foot"><span className="smp-kpi-hint">status VIGENTE ou ATIVA homologados</span></div></div></div>
            <div className="smp-kpi" data-tone="warning"><div className="smp-kpi-main"><span className="smp-kpi-label">Em revisão</span><span className="smp-kpi-value">{contadores.emRevisao}</span><div className="smp-kpi-foot"><span className="smp-kpi-hint">rascunhos e revisões devolvidas aguardando aprovação</span></div></div></div>
            <div className="smp-kpi" data-tone="danger"><div className="smp-kpi-main"><span className="smp-kpi-label">A vencer em 30 dias</span><span className="smp-kpi-value">{contadores.aVencer}</span><div className="smp-kpi-foot"><span className="smp-kpi-hint">contagem da tela sobre validade_ate; a homologação é data do servidor</span></div></div></div>
          </div>

          <div className="smp-tabs" role="tablist" aria-label="Abas do Controle de Documentos da Qualidade" onKeyDown={aoTrocarAbas}>
            {ABAS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`ged-tab-${item.id}`}
                aria-selected={aba === item.id}
                aria-controls={`ged-panel-${item.id}`}
                tabIndex={aba === item.id ? 0 : -1}
                className="smp-tab"
                onClick={() => setAba(item.id)}
              >
                <item.icon size={15} aria-hidden />
                {item.label}
              </button>
            ))}
          </div>

          {feedback && (
            <div className={`smp-note${feedback.tom === 'ok' ? ' smp-note--info' : ' smp-note--error'}`} role="status">
              <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
              <span>{feedback.texto}</span>
            </div>
          )}

          {/* ------------------------------------------------ 1 · CADASTRO */}
          {aba === 'cadastro' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-cadastro" aria-labelledby="ged-tab-cadastro" tabIndex={-1}>
              <div className="smp-grid">
                <div className="smp-col">
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <FilePlus2 size={18} aria-hidden />
                      <div>
                        <h2 className="smp-panel-title">{form.documentoId ? `Editando ${form.codigo}` : 'Documento novo'}</h2>
                        <p className="smp-panel-sub">A gravação chama erp_sgq_documento_salvar: documento aprovado abre a revisão seguinte no servidor; rascunho existente é ajustado no lugar.</p>
                      </div>
                      {form.documentoId && (
                        <div className="smp-panel-actions">
                          <button type="button" className="smp-btn" onClick={novoDocumento} disabled={gravando}><X size={15} aria-hidden />Limpar</button>
                        </div>
                      )}
                    </div>
                    <div className="smp-panel-body">
                      <div className="smp-form-grid">
                        <label className="smp-field"><span>Código do documento</span>
                          <input className="smp-input" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="TATTO-QA-POP-001" disabled={Boolean(form.documentoId) || !podeGravar} maxLength={50} />
                        </label>
                        <label className="smp-field"><span>Título</span>
                          <input className="smp-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Injeção plástica — setup de máquina" disabled={!podeGravar} maxLength={255} />
                        </label>
                        <label className="smp-field"><span>Tipo</span>
                          <select className="smp-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} disabled={!podeGravar}>
                            {opcoesTipo.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                          </select>
                        </label>
                        <label className="smp-field"><span>Setor responsável</span>
                          <select className="smp-select" value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))} disabled={!podeGravar}>
                            {opcoesSetor.map(setor => <option key={setor} value={setor}>{setor}</option>)}
                          </select>
                        </label>
                        <label className="smp-field"><span>Elaborador</span>
                          <input className="smp-input" value={form.elaborador} onChange={e => setForm(f => ({ ...f, elaborador: e.target.value }))} placeholder="Nome de quem escreveu" disabled={!podeGravar} />
                        </label>
                        <label className="smp-field"><span>Revisor</span>
                          <input className="smp-input" value={form.revisor} onChange={e => setForm(f => ({ ...f, revisor: e.target.value }))} placeholder="Nome de quem revisa" disabled={!podeGravar} />
                        </label>
                        <label className="smp-field"><span>Aprovador</span>
                          <input className="smp-input" value={form.aprovador} onChange={e => setForm(f => ({ ...f, aprovador: e.target.value }))} placeholder="Nome de quem aprova" disabled={!podeGravar} />
                        </label>
                        <label className="smp-field"><span>Motivo da alteração</span>
                          <input className="smp-input" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="O que mudou e por quê" disabled={!podeGravar} />
                        </label>
                        <label className="smp-field"><span>Próxima revisão</span>
                          <input className="smp-input" type="date" value={form.proximaRevisao} onChange={e => setForm(f => ({ ...f, proximaRevisao: e.target.value }))} disabled={!podeGravar} />
                        </label>
                        <label className="smp-field"><span>Validade até</span>
                          <input className="smp-input" type="date" value={form.validadeAte} onChange={e => setForm(f => ({ ...f, validadeAte: e.target.value }))} disabled={!podeGravar} />
                        </label>
                        <label className="smp-field is-wide"><span>Conteúdo do documento</span>
                          <textarea className="smp-textarea" value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Texto integral do procedimento, com etapas, responsáveis e critérios de aceitação." disabled={!podeGravar} />
                        </label>
                        <label className="smp-field is-wide"><span>Observações</span>
                          <input className="smp-input" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observação interna do controlador do documento" disabled={!podeGravar} />
                        </label>
                      </div>
                      <p style={{ margin: '0 0 12px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                        Campos compactos, dois por linha, no padrão do sistema. O conteúdo pode ficar em branco ao editar: a RPC mantém o texto anterior por coalescência.
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="smp-btn smp-btn--primary" onClick={() => void salvarDocumento()} disabled={gravando || !podeGravar}>
                          <BadgeCheck size={15} aria-hidden />{gravando ? 'Gravando…' : 'Salvar documento'}
                        </button>
                        <button type="button" className="smp-btn" onClick={() => setAba('revisoes')} disabled={!selecionado}><History size={15} aria-hidden />Ver revisões</button>
                        <button type="button" className="smp-btn" onClick={() => setAba('anexos')} disabled={!selecionado}><Paperclip size={15} aria-hidden />Anexar arquivo</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="smp-col">
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <Archive size={18} aria-hidden />
                      <div>
                        <h2 className="smp-panel-title">Acervo</h2>
                        <p className="smp-panel-sub">{documentos.length} documento(s) desta empresa</p>
                      </div>
                    </div>
                    <div className="smp-panel-body smp-panel-body--flush" style={{ maxHeight: 520, overflow: 'auto' }}>
                      {documentos.length === 0 ? (
                        <div className="smp-state">
                          <FileWarning size={22} aria-hidden />
                          <strong>Acervo vazio nesta base</strong>
                          <p>Nenhuma linha em erp_qualidade_documentos_editor para a empresa da sessão. Comece pelo botão Novo documento, se o seu perfil gravar.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 2, padding: '8px 10px' }}>
                          {documentos.map(doc => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => preencherFormulario(doc)}
                              className={`smp-tile${doc.id === selecionadoId ? ' is-on' : ''}`}
                              aria-pressed={doc.id === selecionadoId}
                            >
                              <span className="smp-tile-icon"><FileWarning size={16} aria-hidden /></span>
                              <span className="smp-tile-main">
                                <strong>{doc.codigo_documento}</strong>
                                <span>{doc.titulo_documento}</span>
                              </span>
                              <span className="smp-chip" data-tone={tomStatus(doc.status)}>{rotuloStatus(doc.status)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ------------------------------------ 2 · REVISÕES E HISTÓRICO */}
          {aba === 'revisoes' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-revisoes" aria-labelledby="ged-tab-revisoes" tabIndex={-1}>
              {!selecionado ? semDocumento : (
                <>
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <History size={18} aria-hidden />
                      <div>
                        <h2 className="smp-panel-title">{selecionado.codigo_documento} · {selecionado.titulo_documento}</h2>
                        <p className="smp-panel-sub">Revisão atual {selecionado.revisao ?? '—'} · homologação {fmtData(selecionado.data_homologacao)} · última leitura {fmtDataHora(selecionado.atualizado_em)}</p>
                      </div>
                      <div className="smp-panel-actions"><span className="smp-chip" data-tone={tomStatus(selecionado.status)}>{rotuloStatus(selecionado.status)}</span></div>
                    </div>
                    <div className="smp-panel-body smp-panel-body--flush">
                      {revisoesDoDocumento.length === 0 ? (
                        <div className="smp-state">
                          <History size={22} aria-hidden />
                          <strong>Nenhuma revisão lida</strong>
                          <p>erp_qualidade_documentos_revisoes não devolve linhas para este código nesta base. Um documento aprovado sempre tem ao menos a revisão 1.</p>
                        </div>
                      ) : (
                        <div className="smp-tablewrap">
                          <table className="smp-table">
                            <thead>
                              <tr>
                                <th className="is-nowrap">Revisão</th>
                                <th className="is-nowrap">Status</th>
                                <th>Motivo da alteração</th>
                                <th>Responsável</th>
                                <th className="is-nowrap">Criada em</th>
                                <th className="is-nowrap">Vigência</th>
                                <th className="is-nowrap">Aprovada em</th>
                                <th>Aprovador</th>
                                <th>Comentário</th>
                                <th>Arquivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...revisoesDoDocumento].sort((a, b) => (b.revisao ?? 0) - (a.revisao ?? 0)).map(rev => (
                                <tr key={rev.id}>
                                  <td className="is-strong">{rev.revisao ?? '—'}</td>
                                  <td><span className="smp-chip" data-tone={tomStatus(rev.status)}>{rotuloStatus(rev.status)}</span></td>
                                  <td className={rev.devolvido_motivo ? 'is-muted' : undefined}>{rev.motivo_alteracao ?? (rev.devolvido_motivo ? `Devolvido: ${rev.devolvido_motivo}` : '—')}</td>
                                  <td>{rev.responsavel ?? '—'}</td>
                                  <td className="is-nowrap is-muted">{fmtDataHora(rev.criado_em)}</td>
                                  <td className="is-nowrap">{fmtData(rev.data_vigencia)}</td>
                                  <td className="is-nowrap">{fmtDataHora(rev.aprovado_em)}</td>
                                  <td>{rev.aprovado_por_nome ?? '—'}</td>
                                  <td className="is-muted">{rev.comentario_aprovacao ?? '—'}</td>
                                  <td className="is-muted">{rev.nome_arquivo ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <ClipboardCheck size={18} aria-hidden />
                      <div>
                        <h2 className="smp-panel-title">Conteúdo da revisão em trabalho</h2>
                        <p className="smp-panel-sub">{rascunhoAberto ? `Rascunho ${rascunhoAberto.revisao ?? '—'} (${rotuloStatus(rascunhoAberto.status)}) de ${rascunhoAberto.responsavel ?? '—'}` : 'Nenhuma revisão em aberto: salvar um ajuste abre a revisão seguinte.'}</p>
                      </div>
                    </div>
                    <div className="smp-panel-body">
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, color: 'var(--smp-ink)' }}>{selecionado.conteudo_texto || 'Sem texto gravado nesta revisão até agora.'}</pre>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ------------------------ 3 · APROVAÇÃO, DEVOLUÇÃO E DISTRIBUIÇÃO */}
          {aba === 'aprovacao' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-aprovacao" aria-labelledby="ged-tab-aprovacao" tabIndex={-1}>
              {!selecionado ? semDocumento : (
                <div className="smp-grid">
                  <div className="smp-col">
                    <div className="smp-panel">
                      <div className="smp-panel-head">
                        <ShieldCheck size={18} aria-hidden />
                        <div>
                          <h2 className="smp-panel-title">Ciclo de aprovação</h2>
                          <p className="smp-panel-sub">
                            {rascunhoAberto
                              ? `Aguardando decisão na revisão ${rascunhoAberto.revisao ?? '—'} (${rotuloStatus(rascunhoAberto.status)}).`
                              : `Sem rascunho em aberto — a última homologação é de ${fmtData(selecionado.data_homologacao)}.`}
                          </p>
                        </div>
                      </div>
                      <div className="smp-panel-body">
                        <div className="smp-dl" style={{ marginBottom: 14 }}>
                          <div><dt>Elaborador</dt><dd>{selecionado.elaborador ?? '—'}</dd></div>
                          <div><dt>Revisor</dt><dd>{selecionado.revisor ?? '—'}</dd></div>
                          <div><dt>Aprovador cadastrado</dt><dd>{selecionado.aprovador ?? '—'}</dd></div>
                          <div><dt>Anexo vigente da revisão</dt><dd>{anexosDoDocumento.some(item => item.status === 'vigente') ? anexosDoDocumento.find(item => item.status === 'vigente')?.nome_arquivo ?? 'sim' : 'nenhum'}</dd></div>
                        </div>
                        <p style={{ margin: '0 0 12px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                          A aprovação é recusada pelo servidor enquanto a revisão não tiver o arquivo original anexado — a régua de 20261011153000 vale para as duas origens de anexo.
                        </p>
                        <label className="smp-field"><span>Comentário da aprovação</span>
                          <input className="smp-input" value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Liberado para distribuição / apontamento do revisor" disabled={!podeGravar || !rascunhoAberto} />
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                          <button type="button" className="smp-btn smp-btn--primary" onClick={() => void aprovarRevisao()} disabled={gravando || !podeGravar || !rascunhoAberto}>
                            <BadgeCheck size={15} aria-hidden />Aprovar e publicar
                          </button>
                          <button type="button" className="smp-btn" onClick={() => void devolverRevisao()} disabled={gravando || !podeGravar || !rascunhoAberto}>
                            <RotateCcw size={15} aria-hidden />Devolver para ajuste
                          </button>
                        </div>
                        <label className="smp-field"><span>Motivo (obrigatório para devolver)</span>
                          <input className="smp-input" value={motivoAcao} onChange={e => setMotivoAcao(e.target.value)} placeholder="Ex.: item 4 sem critério de aceitação dimensional" disabled={!podeGravar} />
                        </label>
                        <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                          O mesmo campo de motivo é usado pela baixa do documento na aba Obsoletos. Nada é apagado: a RPC marca obsoleto e preserva texto, anexos e trilha.
                        </p>
                      </div>
                    </div>

                    <div className="smp-panel">
                      <div className="smp-panel-head">
                        <Send size={18} aria-hidden />
                        <div>
                          <h2 className="smp-panel-title">Distribuição controlada</h2>
                          <p className="smp-panel-sub">Só a revisão VIGENTE/ATIVA é distribuída; cada setor marca ciência e a duplicidade é ignorada pelo servidor.</p>
                        </div>
                      </div>
                      <div className="smp-panel-body">
                        {distribuicoes === null ? (
                          <div className="smp-state">
                            <FileWarning size={22} aria-hidden />
                            <strong>Tabela de distribuição indisponível</strong>
                            <p>erp_sgq_documento_distribuicoes só existe depois de aplicar {MIGRATION_GED}. Sem ela, distribuição e ciência não podem ser registradas.</p>
                          </div>
                        ) : (
                          <>
                            <div className="smp-checks" style={{ marginBottom: 12 }}>
                              {SETOR_CATALOGO.map(setor => (
                                <label key={setor} className={`smp-check${setoresMarcados.includes(setor) ? ' is-on' : ''}`}>
                                  <input type="checkbox" checked={setoresMarcados.includes(setor)} onChange={() => alternarSetor(setor)} disabled={!podeGravar} />
                                  {setor}
                                </label>
                              ))}
                            </div>
                            <div className="smp-form-grid">
                              <label className="smp-field"><span>Outro setor</span>
                                <input className="smp-input" value={setorLivre} onChange={e => setSetorLivre(e.target.value)} placeholder="Ex.: FERRAMENTARIA" disabled={!podeGravar} />
                              </label>
                              <label className="smp-field"><span>Motivo da distribuição</span>
                                <input className="smp-input" value={motivoDistribuicao} onChange={e => setMotivoDistribuicao(e.target.value)} placeholder="Ex.: revisão aprovada em auditoria interna" disabled={!podeGravar} />
                              </label>
                            </div>
                            <button type="button" className="smp-btn smp-btn--primary" onClick={() => void distribuirRevisao()} disabled={gravando || !podeGravar}>
                              <Send size={15} aria-hidden />Distribuir revisão aprovada
                            </button>
                            <div className="smp-tablewrap" style={{ marginTop: 14 }}>
                              <table className="smp-table">
                                <thead>
                                  <tr><th>Setor</th><th className="is-nowrap">Revisão</th><th>Distribuído por</th><th className="is-nowrap">Em</th><th className="is-nowrap">Ciência</th><th>Por</th><th>Motivo</th><th /></tr>
                                </thead>
                                <tbody>
                                  {distribuicoesDoDocumento.length === 0 ? (
                                    <tr><td colSpan={8} className="is-muted">Nenhuma distribuição registrada para este documento.</td></tr>
                                  ) : distribuicoesDoDocumento.map(item => (
                                    <tr key={item.id}>
                                      <td className="is-strong">{item.setor}</td>
                                      <td>{item.revisao_numero ?? '—'}</td>
                                      <td className="is-muted">{item.distribuido_por_nome ?? '—'}</td>
                                      <td className="is-nowrap is-muted">{fmtDataHora(item.distribuido_em)}</td>
                                      <td className="is-nowrap">{item.ciencia_em ? <span className="smp-chip" data-tone="success"><ClipboardCheck size={11} aria-hidden />{fmtDataHora(item.ciencia_em)}</span> : <span className="smp-chip" data-tone="warning">aguardando</span>}</td>
                                      <td className="is-muted">{item.ciencia_por_nome ?? '—'}</td>
                                      <td className="is-muted">{item.motivo ?? '—'}</td>
                                      <td>{!item.ciencia_em && (
                                        <button type="button" className="smp-btn smp-btn--ghost" onClick={() => void confirmarCiencia(item)} disabled={gravando || !podeGravar}>Dar ciência</button>
                                      )}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="smp-col">
                    <div className="smp-panel">
                      <div className="smp-panel-head">
                        <ScrollText size={18} aria-hidden />
                        <div><h2 className="smp-panel-title">Andamento</h2><p className="smp-panel-sub">Os últimos eventos desta linha, na ordem do banco.</p></div>
                      </div>
                      <div className="smp-panel-body">
                        {trilha === null ? (
                          <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Sem leitura da trilha de auditoria: aplique {MIGRATION_GED} para ver o andamento histórico do documento.</p>
                        ) : trilhaVisivel.length === 0 ? (
                          <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum evento gravado ainda. Cadastro, salvamento, anexo, aprovação, devolução, distribuição e ciência aparecem aqui.</p>
                        ) : (
                          <div className="smp-events">
                            {trilhaVisivel.slice(0, 12).map(evento => (
                              <div key={evento.id} className="smp-event">
                                <time>{fmtData(evento.criado_em)}</time>
                                <i aria-hidden />
                                <span>{ROTULO_EVENTO[evento.evento] ?? evento.evento}</span>
                                <b>{evento.ator_nome ?? '—'}</b>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ------------------------------------------------- 4 · OBSOLETOS */}
          {aba === 'obsoletos' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-obsoletos" aria-labelledby="ged-tab-obsoletos" tabIndex={-1}>
              <div className="smp-panel">
                <div className="smp-panel-head">
                  <Archive size={18} aria-hidden />
                  <div>
                    <h2 className="smp-panel-title">Baixa de documento controlado</h2>
                    <p className="smp-panel-sub">Obsoletar nunca apaga: o servidor move a linha para OBSOLETO com o motivo e preserva texto, anexos e trilha.</p>
                  </div>
                </div>
                <div className="smp-panel-body">
                  {!selecionado ? (
                    <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Selecione o documento na aba Cadastro para dar baixa nele.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <label className="smp-field" style={{ flex: '1 1 320px', marginBottom: 0 }}><span>Motivo da baixa de {selecionado.codigo_documento}</span>
                        <input className="smp-input" value={motivoAcao} onChange={e => setMotivoAcao(e.target.value)} placeholder="Ex.: substituído pela revisão 4 do POP de injeção" disabled={!podeGravar} />
                      </label>
                      <button type="button" className="smp-btn smp-btn--primary" onClick={() => void obsoletarDocumento()} disabled={gravando || !podeGravar}>
                        <Archive size={15} aria-hidden />Tornar obsoleto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="smp-grid">
                <div className="smp-col">
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <FileWarning size={18} aria-hidden />
                      <div><h2 className="smp-panel-title">Documentos obsoletos</h2><p className="smp-panel-sub">{obsoletos.documentos.length} linha(s) com status OBSOLETO nesta empresa.</p></div>
                    </div>
                    <div className="smp-panel-body smp-panel-body--flush">
                      {obsoletos.documentos.length === 0 ? (
                        <p style={{ margin: 0, padding: '14px 16px', color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum documento obsoleto. Documentos baixados continuam listados aqui como evidência do SGQ.</p>
                      ) : (
                        <div className="smp-tablewrap">
                          <table className="smp-table">
                            <thead><tr><th className="is-nowrap">Código</th><th>Título</th><th className="is-nowrap">Última revisão</th><th className="is-nowrap">Baixa</th><th>Motivo</th><th>Setor</th></tr></thead>
                            <tbody>
                              {obsoletos.documentos.map(doc => (
                                <tr key={doc.id}>
                                  <td className="is-strong is-nowrap">{doc.codigo_documento}</td>
                                  <td>{doc.titulo_documento}</td>
                                  <td className="is-nowrap">{doc.revisao ?? '—'}</td>
                                  <td className="is-nowrap is-muted">{fmtData(doc.data_homologacao)}</td>
                                  <td className="is-muted">{doc.motivo_alteracao ?? '—'}</td>
                                  <td className="is-muted">{doc.setor_responsavel ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="smp-col">
                  <div className="smp-panel">
                    <div className="smp-panel-head">
                      <Layers size={18} aria-hidden />
                      <div><h2 className="smp-panel-title">Revisões e arquivos baixados</h2><p className="smp-panel-sub">{obsoletos.revisoes.length} revisão(ões) · {obsoletos.anexos.length} anexo(s) obsoletos.</p></div>
                    </div>
                    <div className="smp-panel-body">
                      {obsoletos.revisoes.length === 0 && obsoletos.anexos.length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhuma revisão ou arquivo marcado como obsoleto nesta base.</p>
                      ) : (
                        <div className="smp-events">
                          {obsoletos.revisoes.slice(0, 20).map(rev => (
                            <div key={`rev-${rev.id}`} className="smp-event">
                              <time>{fmtData(rev.criado_em)}</time>
                              <i aria-hidden />
                              <span>Rev. {rev.revisao ?? '—'} · {rev.codigo_documento}</span>
                              <b>{rev.motivo_alteracao ?? rev.responsavel ?? '—'}</b>
                            </div>
                          ))}
                          {obsoletos.anexos.slice(0, 20).map(item => (
                            <div key={`anx-${item.id}`} className="smp-event">
                              <time>{fmtData(item.criado_em)}</time>
                              <i aria-hidden />
                              <span>v{item.versao} · {item.nome_arquivo}</span>
                              <b>{item.motivo_obsolescencia ?? item.codigo_documento}</b>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- 5 · ANEXOS */}
          {aba === 'anexos' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-anexos" aria-labelledby="ged-tab-anexos" tabIndex={-1}>
              {!selecionado ? semDocumento : anexos === null ? (
                <div className="smp-state smp-state--error">
                  <FileWarning size={22} aria-hidden />
                  <strong>Tabela de anexos indisponível</strong>
                  <p>erp_sgq_documento_anexos e o bucket {BUCKET_ANEXOS} são criados por {MIGRATION_GED}. Sem aplicar o arquivo, a tela não anexa nem lista arquivos — e não simula o vínculo.</p>
                </div>
              ) : (
                <div className="smp-grid">
                  <div className="smp-col">
                    <div className="smp-panel">
                      <div className="smp-panel-head">
                        <Paperclip size={18} aria-hidden />
                        <div>
                          <h2 className="smp-panel-title">Arquivos vigentes de {selecionado.codigo_documento}</h2>
                          <p className="smp-panel-sub">Cada nome lógico tem sua própria cadeia de versões; o arquivo anterior nunca é apagado.</p>
                        </div>
                      </div>
                      <div className="smp-panel-body smp-panel-body--flush">
                        {anexosDoDocumento.filter(item => item.status === 'vigente').length === 0 ? (
                          <p style={{ margin: 0, padding: '14px 16px', color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum arquivo vigente neste documento. A revisão em trabalho precisa de pelo menos um anexo para ser aprovada.</p>
                        ) : (
                          <div className="smp-tablewrap">
                            <table className="smp-table">
                              <thead><tr><th>Arquivo</th><th className="is-num">Versão</th><th className="is-nowrap">Revisão</th><th className="is-nowrap">Tamanho</th><th>Tipo</th><th className="is-nowrap">Anexado em</th><th>Por</th><th /></tr></thead>
                              <tbody>
                                {anexosDoDocumento.filter(item => item.status === 'vigente').map(item => (
                                  <tr key={item.id}>
                                    <td className="is-strong">{item.nome_arquivo}</td>
                                    <td className="is-num">{item.versao}</td>
                                    <td className="is-nowrap">{item.revisao_numero ?? '—'}</td>
                                    <td className="is-nowrap">{fmtBytes(item.tamanho_bytes)}</td>
                                    <td className="is-muted">{item.mime_type ?? '—'}</td>
                                    <td className="is-nowrap is-muted">{fmtDataHora(item.criado_em)}</td>
                                    <td className="is-muted">{item.criado_por_nome ?? '—'}</td>
                                    <td><button type="button" className="smp-btn smp-btn--ghost" onClick={() => void abrirAnexo(item)}>Abrir</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="smp-col">
                    <div className="smp-panel">
                      <div className="smp-panel-head">
                        <FilePlus2 size={18} aria-hidden />
                        <div><h2 className="smp-panel-title">Anexar ao rascunho</h2><p className="smp-panel-sub">{rascunhoAberto ? `Revisão ${rascunhoAberto.revisao ?? '—'} em aberto aceita arquivo.` : `Sem rascunho em aberto: salve uma alteração antes de anexar.`}</p></div>
                      </div>
                      <div className="smp-panel-body">
                        <label className="smp-field"><span>Arquivo</span>
                          <input ref={inputArquivo} type="file" className="smp-input" onChange={e => setArquivo(e.target.files?.[0] ?? null)} disabled={!podeGravar || !rascunhoAberto} />
                        </label>
                        <label className="smp-field"><span>Motivo do arquivo</span>
                          <input className="smp-input" value={motivoAnexo} onChange={e => setMotivoAnexo(e.target.value)} placeholder="Ex.: POP assinado digitalmente em PDF" disabled={!podeGravar || !rascunhoAberto} />
                        </label>
                        <p style={{ margin: '0 0 12px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                          Upload no bucket privado {BUCKET_ANEXOS} dentro da pasta da empresa ({empresaId ? `${empresaId.slice(0, 8)}…` : '—'}), limitado a 50 MB e a PDF, DOC, DOCX, XLS, XLSX, XLSM, PNG ou JPG. A RPC erp_sgq_documento_anexar confere o objeto em storage.objects antes de gravar a linha.
                        </p>
                        <button type="button" className="smp-btn smp-btn--primary" onClick={() => void anexarArquivo()} disabled={gravando || !podeGravar || !rascunhoAberto || !arquivo}>
                          <Paperclip size={15} aria-hidden />{gravando ? 'Enviando…' : 'Anexar arquivo'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* -------------------------------------------- 6 · VERSÕES DE ANEXO */}
          {aba === 'versoes' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-versoes" aria-labelledby="ged-tab-versoes" tabIndex={-1}>
              {anexos === null ? (
                <div className="smp-state smp-state--error">
                  <FileWarning size={22} aria-hidden />
                  <strong>Sem histórico de versões nesta base</strong>
                  <p>A versionagem de anexo vive em erp_sgq_documento_anexos e só existe depois de aplicar {MIGRATION_GED}.</p>
                </div>
              ) : (
                <>
                  <section className="smp-topbar">
                    <div className="smp-topbar-meta"><Layers size={15} aria-hidden /><strong>{anexos.length}</strong> arquivo(s) versionado(s) · <strong>{cadeiasDeAnexo.length}</strong> cadeia(s)</div>
                    <div className="smp-topbar-spacer" />
                    <div className="smp-unit">{selecionado ? `${selecionado.codigo_documento} filtrado` : 'Todas as cadeias da empresa'}</div>
                    <button type="button" className="smp-btn" onClick={() => setTrilhaSomenteDocumento(valor => !valor)} aria-pressed={trilhaSomenteDocumento}>
                      {trilhaSomenteDocumento ? 'Mostrar todas as cadeias' : 'Mostrar só o documento'}
                    </button>
                  </section>
                  <div className="smp-col">
                    {cadeiasDeAnexo.length === 0 ? (
                      <div className="smp-panel"><div className="smp-panel-body"><p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhuma cadeia de anexo para o recorte atual.</p></div></div>
                    ) : cadeiasDeAnexo.map(cadeia => (
                      <div key={cadeia.chave} className="smp-panel">
                        <div className="smp-panel-head">
                          <Layers size={18} aria-hidden />
                          <div>
                            <h2 className="smp-panel-title">{cadeia.chave}</h2>
                            <p className="smp-panel-sub">{cadeia.itens.length} versão(ões) · vigente: {cadeia.itens.find(item => item.status === 'vigente')?.versao ?? 'nenhuma'}</p>
                          </div>
                        </div>
                        <div className="smp-panel-body smp-panel-body--flush">
                          <div className="smp-tablewrap">
                            <table className="smp-table">
                              <thead><tr><th className="is-num">Versão</th><th className="is-nowrap">Status</th><th>Arquivo</th><th className="is-nowrap">Revisão</th><th className="is-nowrap">Tamanho</th><th className="is-nowrap">Anexado em</th><th>Por</th><th>Substituído por</th><th>Motivo da obsolescência</th><th /></tr></thead>
                              <tbody>
                                {cadeia.itens.map(item => (
                                  <tr key={item.id}>
                                    <td className="is-num is-strong">{item.versao}</td>
                                    <td><span className="smp-chip" data-tone={item.status === 'vigente' ? 'success' : 'neutral'}>{item.status}</span></td>
                                    <td>{item.nome_arquivo}</td>
                                    <td className="is-nowrap">{item.revisao_numero ?? '—'}</td>
                                    <td className="is-nowrap">{fmtBytes(item.tamanho_bytes)}</td>
                                    <td className="is-nowrap is-muted">{fmtDataHora(item.criado_em)}</td>
                                    <td className="is-muted">{item.criado_por_nome ?? '—'}</td>
                                    <td className="is-muted">{item.substituido_por ? `v${cadeia.itens.find(v => v.id === item.substituido_por)?.versao ?? '—'}` : '—'}</td>
                                    <td className="is-muted">{item.motivo_obsolescencia ?? '—'}</td>
                                    <td><button type="button" className="smp-btn smp-btn--ghost" onClick={() => void abrirAnexo(item)}>Abrir</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ------------------------------------- 7 · PESQUISA E RELATÓRIOS */}
          {aba === 'pesquisa' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-pesquisa" aria-labelledby="ged-tab-pesquisa" tabIndex={-1}>
              <div className="smp-panel">
                <div className="smp-panel-head">
                  <Search size={18} aria-hidden />
                  <div><h2 className="smp-panel-title">Pesquisa no acervo</h2><p className="smp-panel-sub">Filtro aplicado sobre as linhas desta empresa já lidas pela tela; o texto integral também é pesquisado.</p></div>
                  <div className="smp-panel-actions">
                    <button type="button" className="smp-btn" onClick={() => baixarCsv(`documentos-qualidade-${new Date().toISOString().slice(0, 10)}.csv`, [
                      ['Código', 'Título', 'Tipo', 'Setor', 'Revisão', 'Status', 'Elaborador', 'Revisor', 'Aprovador', 'Homologação', 'Validade até', 'Próxima revisão', 'Motivo'],
                      ...listaPesquisada.map(doc => [
                        doc.codigo_documento, doc.titulo_documento, doc.tipo_documento ?? '', doc.setor_responsavel ?? '',
                        String(doc.revisao ?? ''), rotuloStatus(doc.status), doc.elaborador ?? '', doc.revisor ?? '', doc.aprovador ?? '',
                        fmtData(doc.data_homologacao), fmtData(doc.validade_ate), fmtData(doc.proxima_revisao), doc.motivo_alteracao ?? '',
                      ]),
                    ])} disabled={listaPesquisada.length === 0}>
                      <Download size={15} aria-hidden />Exportar CSV
                    </button>
                  </div>
                </div>
                <div className="smp-panel-body">
                  <div className="smp-form-grid">
                    <label className="smp-field"><span>Texto</span>
                      <input className="smp-input" value={filtro.busca} onChange={e => setFiltro(f => ({ ...f, busca: e.target.value }))} placeholder="código, título, responsável ou trecho do conteúdo" />
                    </label>
                    <label className="smp-field"><span>Status</span>
                      <select className="smp-select" value={filtro.status} onChange={e => setFiltro(f => ({ ...f, status: e.target.value }))}>
                        <option value="todos">Todos</option>
                        <option value="VIGENTE">Vigente</option>
                        <option value="ATIVA">Ativa</option>
                        <option value="EM_REVISAO">Em revisão</option>
                        <option value="REPROVADO">Devolvido</option>
                        <option value="OBSOLETO">Obsoleto</option>
                      </select>
                    </label>
                    <label className="smp-field"><span>Tipo de documento</span>
                      <select className="smp-select" value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
                        <option value="todos">Todos</option>
                        {TIPOS_DOCUMENTO.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                      </select>
                    </label>
                    <label className="smp-field"><span>Setor responsável</span>
                      <select className="smp-select" value={filtro.setor} onChange={e => setFiltro(f => ({ ...f, setor: e.target.value }))}>
                        <option value="todos">Todos</option>
                        {SETOR_CATALOGO.map(setor => <option key={setor} value={setor}>{setor}</option>)}
                      </select>
                    </label>
                    <label className="smp-field"><span>Vigência</span>
                      <select className="smp-select" value={filtro.vigencia} onChange={e => setFiltro(f => ({ ...f, vigencia: e.target.value }))}>
                        <option value="todas">Qualquer data</option>
                        <option value="vencido">Validade vencida</option>
                        <option value="30">Vence em até 30 dias</option>
                        <option value="90">Vence em até 90 dias</option>
                        <option value="sem_data">Sem validade cadastrada</option>
                      </select>
                    </label>
                    <label className="smp-field"><span>Resultado</span>
                      <input className="smp-input" value={`${listaPesquisada.length} de ${documentos.length} documento(s)`} readOnly aria-label="Quantidade de documentos filtrados" />
                    </label>
                  </div>
                  <div className="smp-tablewrap">
                    <table className="smp-table">
                      <thead><tr><th className="is-nowrap">Código</th><th>Título</th><th>Tipo</th><th>Setor</th><th className="is-num">Rev.</th><th className="is-nowrap">Status</th><th className="is-nowrap">Homologação</th><th className="is-nowrap">Validade</th><th>Revisores</th></tr></thead>
                      <tbody>
                        {listaPesquisada.length === 0 ? (
                          <tr><td colSpan={9} className="is-muted">Nenhum documento corresponde ao filtro. O recorte usa só as colunas que existem nesta base.</td></tr>
                        ) : listaPesquisada.map(doc => {
                          const dias = diasAte(doc.validade_ate)
                          return (
                            <tr key={doc.id}>
                              <td className="is-strong is-nowrap"><button type="button" className="smp-btn smp-btn--ghost" style={{ padding: 0, minHeight: 0 }} onClick={() => { preencherFormulario(doc); setAba('cadastro') }}>{doc.codigo_documento}</button></td>
                              <td>{doc.titulo_documento}</td>
                              <td className="is-muted">{doc.tipo_documento ?? '—'}</td>
                              <td className="is-muted">{doc.setor_responsavel ?? '—'}</td>
                              <td className="is-num">{doc.revisao ?? '—'}</td>
                              <td className="is-nowrap"><span className="smp-chip" data-tone={tomStatus(doc.status)}>{rotuloStatus(doc.status)}</span></td>
                              <td className="is-nowrap is-muted">{fmtData(doc.data_homologacao)}</td>
                              <td className="is-nowrap">{doc.validade_ate ? `${fmtData(doc.validade_ate)}${dias !== null && dias < 0 ? ' (vencido)' : dias !== null && dias <= 30 ? ` (${dias} d)` : ''}` : '—'}</td>
                              <td className="is-muted">{[doc.revisor, doc.aprovador].filter(Boolean).join(' · ') || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* -------------------------------------------------- 8 · AUDITORIA */}
          {aba === 'auditoria' && (
            <section className="smp-tabpanel" role="tabpanel" id="ged-panel-auditoria" aria-labelledby="ged-tab-auditoria" tabIndex={-1}>
              {trilha === null ? (
                <div className="smp-state smp-state--error">
                  <FileWarning size={22} aria-hidden />
                  <strong>Trilha de auditoria indisponível</strong>
                  <p>erp_sgq_documento_trilha é criada por {MIGRATION_GED} e só recebe linhas pelas RPCs do próprio arquivo. Sem ela não há como evidenciar quem fez o quê em cada revisão.</p>
                </div>
              ) : (
                <div className="smp-panel">
                  <div className="smp-panel-head">
                    <ScrollText size={18} aria-hidden />
                    <div><h2 className="smp-panel-title">Trilha do documento</h2><p className="smp-panel-sub">Somente leitura: nem mesmo o administrador edita ou apaga evento gravado.</p></div>
                    <div className="smp-panel-actions">
                      <button type="button" className="smp-btn" onClick={() => setTrilhaSomenteDocumento(valor => !valor)} aria-pressed={trilhaSomenteDocumento}>
                        {trilhaSomenteDocumento ? (selecionado ? `Filtrando ${selecionado.codigo_documento}` : 'Filtro ativo sem documento selecionado') : 'Todos os eventos da empresa'}
                      </button>
                      <button type="button" className="smp-btn" onClick={() => baixarCsv(`trilha-documentos-${new Date().toISOString().slice(0, 10)}.csv`, [
                        ['Data', 'Documento', 'Revisão', 'Evento', 'Autor', 'Detalhe'],
                        ...trilhaVisivel.map(evento => [
                          fmtDataHora(evento.criado_em), evento.codigo_documento ?? '—', String(evento.revisao_numero ?? '—'),
                          ROTULO_EVENTO[evento.evento] ?? evento.evento, evento.ator_nome ?? '—',
                          evento.detalhe ? JSON.stringify(evento.detalhe) : '',
                        ]),
                      ])} disabled={trilhaVisivel.length === 0}>
                        <Download size={15} aria-hidden />Exportar CSV
                      </button>
                    </div>
                  </div>
                  <div className="smp-panel-body smp-panel-body--flush">
                    {trilhaVisivel.length === 0 ? (
                      <p style={{ margin: 0, padding: '14px 16px', color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum evento para o recorte atual. Assim que a migration estiver aplicada, cada cadastro, salvamento, anexo, aprovação, devolução, obsolescência, distribuição e ciência gera uma linha aqui.</p>
                    ) : (
                      <div className="smp-tablewrap">
                        <table className="smp-table">
                          <thead><tr><th className="is-nowrap">Quando</th><th className="is-nowrap">Documento</th><th className="is-num">Rev.</th><th>Evento</th><th>Autor</th><th>Detalhe registrado</th></tr></thead>
                          <tbody>
                            {trilhaVisivel.map(evento => (
                              <tr key={evento.id}>
                                <td className="is-nowrap is-muted">{fmtDataHora(evento.criado_em)}</td>
                                <td className="is-strong is-nowrap">{evento.codigo_documento ?? '—'}</td>
                                <td className="is-num">{evento.revisao_numero ?? '—'}</td>
                                <td><span className="smp-chip" data-tone="info">{ROTULO_EVENTO[evento.evento] ?? evento.evento}</span></td>
                                <td>{evento.ator_nome ?? '—'}</td>
                                <td className="is-muted">{evento.detalhe ? Object.entries(evento.detalhe).filter(([, valor]) => valor !== null && valor !== '').map(([chave, valor]) => `${chave}: ${String(valor)}`).join(' · ') || '—' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </ModuleWorkspace>
  )
}
