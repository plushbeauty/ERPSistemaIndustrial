/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-RPNC-FORMULARIO-20261101-03 — formulário RPNC modelo MGF3657 (SoftExpert), pasta virtual de evidências, CAPA dinâmica, Ishikawa editável no desenho, 5 Porquês de 5 a 12 níveis e relatório A4
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DAS MIGRATIONS 20261031100000_...SQL E 20261101220000_...SQL PELO PROPRIETÁRIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — Qualidade · Formulário RPNC (QualityRpncForm).
 * Origem tipificada (sgq_tipo_registro), abertura atômica com pasta virtual privada
 * {empresa_id}/rpnc_{numero_rpnc} no bucket qualidade-evidencias, Ishikawa 6M editável
 * dentro do diagrama + 5 Porquês, varredura de recorrência com gaveta de espelhamento,
 * plano CAPA dinâmico e impressão A4.
 * Nenhum dado é simulado: toda leitura e gravação passa pela sessão autenticada, RBAC e RLS.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle, CheckCircle2, ClipboardList, FileText, History, Image as ImageIcon,
  Paperclip, Plus, Printer, RefreshCw, Save, Search, Trash2, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import IshikawaDiagrama from '../components/qualidade/IshikawaDiagrama'
import type { Ishikawa6MData, IshikawaBruto } from '../types/qualidade'
import { cadeiaDoBanco, cadeiaParaGravar, cadeiaVazia, ishikawaVazio, MAXIMO_PORQUES, MINIMO_PORQUES, normalizarIshikawa, serializarIshikawa, totalDeCausas } from '../types/qualidade'
import '../styles/quality-rpnc-form.css'

type Severidade = 'Critica' | 'Maior' | 'Menor'
type TipoRegistro = 'INTERNO' | 'EXTERNO' | 'RPNC_CLIENTE' | 'AUDITORIA_INTERNA' | 'AUDITORIA_EXTERNA'
type CauseKey = keyof Ishikawa6MData
type Setor = { id: string; nome: string; codigo: string | null }
type Usuario = { id: string; nome: string }
type Cliente = { id: string; nome: string }
type Produto = { id: string; codigo: string; nome: string }
type AuditoriaOpcao = { id: string; codigo_auditoria: string; escopo: string; status: string }

type TratamentoForm = {
  numero_controle: string
  hora_ocorrencia: string
  hora_restauracao: string
  duracao: string
  tipo_ocorrencia: 'inicial' | 'reincidencia'
  quantidade_afetada: string
  requisito_violado: string
  investigacao: string
  causa_imediata: string
  equipe: Array<{ nome: string; funcao: string; setor: string }>
  cadeas: Array<{ causa: string; porques: string[] }>
  barreira_falhou: Record<string, string>
  padronizacao: {
    poka_yoke: 'sim' | 'nao'
    justificativa: string
    documentos: Array<{ documento: string; responsavel: string; prazo: string; situacao: string }>
  }
  eficacia_relato: string
}

type RegistroRPNC = {
  id: string
  numero_rpnc: string
  descricao_nao_conformidade: string
  status: string
  sgq_tipo_registro: TipoRegistro | null
  sgq_severidade: Severidade | null
  sgq_produto_id: string | null
  sgq_lote: string | null
  sgq_data_ocorrencia: string | null
  sgq_auditoria_id: string | null
  sgq_pasta_evidencias: string | null
  sgq_tratamento_anomalia: Partial<TratamentoForm> | null
  ishikawa_data: IshikawaBruto
  cinco_porques: string[] | null
  setor_id: string | null
  criado_em: string
}

type AberturaRPNC = { id: string; numero_rpnc: string; status: string; pasta_evidencias: string; bucket: string }
type Evidencia = { id: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number; finalidade: string | null; acao_id: string | null }
type AcaoForm = { id?: string; tipo: 'Contencao' | 'Corretiva' | 'Preventiva'; descricao: string; causa_raiz: string; responsavel_id: string; prazo: string; status?: string }
type AcaoSalva = AcaoForm & { id: string; responsavel: string | null }
type Recorrencia = {
  id: string
  numero_rpnc: string
  status: string | null
  descricao: string | null
  criado_em: string | null
  data_ocorrencia: string | null
  lote: string | null
  produto_codigo: string | null
  setor: string | null
  ishikawa_data: IshikawaBruto
  cinco_porques: string[] | null
  acoes: Array<{ id: string; tipo: string; descricao: string; causa_raiz: string | null; responsavel: string | null; prazo: string | null; status: string; resultado_eficacia: string | null }>
}

const BUCKET = 'qualidade-evidencias'
const MAX_ANEXO = 15 * 1024 * 1024
const SELECT_RPNC = 'id,numero_rpnc,descricao_nao_conformidade,status,sgq_tipo_registro,sgq_severidade,sgq_produto_id,sgq_lote,sgq_data_ocorrencia,sgq_auditoria_id,sgq_pasta_evidencias,sgq_tratamento_anomalia,ishikawa_data,cinco_porques,setor_id,criado_em'

const ORIGENS: Array<{ value: TipoRegistro; label: string }> = [
  { value: 'INTERNO', label: 'Interno' },
  { value: 'EXTERNO', label: 'Externo' },
  { value: 'RPNC_CLIENTE', label: 'Reclamação de Cliente' },
  { value: 'AUDITORIA_INTERNA', label: 'Auditoria Interna' },
  { value: 'AUDITORIA_EXTERNA', label: 'Auditoria Externa' },
]
const SEVERIDADES: Array<{ value: Severidade; label: string }> = [
  { value: 'Critica', label: 'Crítica' },
  { value: 'Maior', label: 'Maior' },
  { value: 'Menor', label: 'Menor' },
]
const GRUPOS_6M: Array<{ key: CauseKey; label: string }> = [
  { key: 'Maquina', label: 'Máquina' },
  { key: 'Metodo', label: 'Método' },
  { key: 'Medida', label: 'Medição / Gestão' },
  { key: 'MeioAmbiente', label: 'Ambiente' },
  { key: 'MaoDeObra', label: 'Mão de obra' },
  { key: 'Material', label: 'Matéria-prima' },
]
const TIPOS_ACAO: Array<AcaoForm['tipo']> = ['Contencao', 'Corretiva', 'Preventiva']

const tratamentoVazio = (): TratamentoForm => ({
  numero_controle: '', hora_ocorrencia: '', hora_restauracao: '', duracao: '',
  tipo_ocorrencia: 'inicial', quantidade_afetada: '', requisito_violado: '', investigacao: '', causa_imediata: '',
  equipe: [{ nome: '', funcao: '', setor: '' }, { nome: '', funcao: '', setor: '' }],
  cadeas: [], barreira_falhou: {},
  padronizacao: { poka_yoke: 'nao', justificativa: '', documentos: [] },
  eficacia_relato: '',
})
const texto = (valor: unknown, fallback: string): string => (typeof valor === 'string' ? valor : fallback)
type PadronizacaoForm = TratamentoForm['padronizacao']
const normalizarTratamento = (bruto: Partial<TratamentoForm> | null): TratamentoForm => {
  const base = tratamentoVazio()
  if (!bruto || typeof bruto !== 'object') return base
  const padronizacao: Partial<PadronizacaoForm> = bruto.padronizacao ?? {}
  return {
    numero_controle: texto(bruto.numero_controle, base.numero_controle),
    hora_ocorrencia: texto(bruto.hora_ocorrencia, base.hora_ocorrencia),
    hora_restauracao: texto(bruto.hora_restauracao, base.hora_restauracao),
    duracao: texto(bruto.duracao, base.duracao),
    tipo_ocorrencia: bruto.tipo_ocorrencia === 'reincidencia' ? 'reincidencia' : 'inicial',
    quantidade_afetada: texto(bruto.quantidade_afetada, base.quantidade_afetada),
    requisito_violado: texto(bruto.requisito_violado, base.requisito_violado),
    investigacao: texto(bruto.investigacao, base.investigacao),
    causa_imediata: texto(bruto.causa_imediata, base.causa_imediata),
    equipe: Array.isArray(bruto.equipe) && bruto.equipe.length
      ? bruto.equipe.map((m) => ({ nome: texto(m?.nome, ''), funcao: texto(m?.funcao, ''), setor: texto(m?.setor, '') }))
      : base.equipe,
    cadeas: Array.isArray(bruto.cadeas)
      ? bruto.cadeas.map((c) => ({
        causa: texto(c?.causa, ''),
        porques: cadeiaDoBanco(c?.porques),
      }))
      : [],
    barreira_falhou: bruto.barreira_falhou && typeof bruto.barreira_falhou === 'object'
      ? Object.fromEntries(Object.entries(bruto.barreira_falhou).map(([chave, valor]) => [chave, texto(valor, '')]))
      : {},
    padronizacao: {
      poka_yoke: padronizacao.poka_yoke === 'sim' ? 'sim' : 'nao',
      justificativa: texto(padronizacao.justificativa, ''),
      documentos: Array.isArray(padronizacao.documentos)
        ? padronizacao.documentos.map((d) => ({
          documento: texto(d?.documento, ''), responsavel: texto(d?.responsavel, ''),
          prazo: texto(d?.prazo, ''), situacao: texto(d?.situacao, 'Aguardando'),
        }))
        : [],
    },
    eficacia_relato: texto(bruto.eficacia_relato, base.eficacia_relato),
  }
}

const mensagem = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'Operação não concluída. Consulte os logs do Supabase.'
const mimeDe = (file: File): string => {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', png: 'image/png',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain',
  }
  return ext ? map[ext] ?? 'application/octet-stream' : 'application/octet-stream'
}
const nomeSeguro = (name: string): string =>
  name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'anexo'
const dataBR = (valor: string | null | undefined): string => {
  if (!valor) return '—'
  const d = new Date(valor.length === 10 ? `${valor}T12:00:00` : valor)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}
const tamanho = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`

export default function QualityRpncForm() {
  const [companyId, setCompanyId] = useState('')
  const [sectores, setSetores] = useState<Setor[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [auditorias, setAuditorias] = useState<AuditoriaOpcao[]>([])
  const [registros, setRegistros] = useState<RegistroRPNC[]>([])

  const [rpnc, setRpnc] = useState<RegistroRPNC | null>(null)
  const [pasta, setPasta] = useState('')
  const [acoes, setAcoes] = useState<AcaoSalva[]>([])
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])

  const [origem, setOrigem] = useState<TipoRegistro>('INTERNO')
  const [severidade, setSeveridade] = useState<Severidade>('Menor')
  const [setorId, setSetorId] = useState('')
  const [codigoProduto, setCodigoProduto] = useState('')
  const [lote, setLote] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [dataOcorrencia, setDataOcorrencia] = useState(() => new Date().toISOString().slice(0, 10))
  const [auditoriaId, setAuditoriaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tratamento, setTratamento] = useState<TratamentoForm>(tratamentoVazio)
  const [fishbone, setFishbone] = useState<Ishikawa6MData>(ishikawaVazio)
  const [porques, setPorques] = useState<string[]>(cadeiaVazia)
  const [novaAcao, setNovaAcao] = useState<AcaoForm>({ tipo: 'Corretiva', descricao: '', causa_raiz: '', responsavel_id: '', prazo: '' })
  const [files, setFiles] = useState<File[]>([])
  const [fileParaAcao, setFileParaAcao] = useState<{ acaoId: string; file: File } | null>(null)

  const [recorrencia, setRecorrencia] = useState<Recorrencia[]>([])
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const [varrendo, setVarrendo] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const varreduraTimer = useRef<number | null>(null)

  const carregarListas = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente para acessar o SGQ.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const tenantId = String(tenant.data)
      const [setorRes, usuarioRes, clienteRes, produtoRes, auditoriaRes, registroRes] = await Promise.all([
        supabase.from('erp_setores').select('id,nome,codigo').eq('empresa_id', tenantId).eq('ativo', true).order('nome'),
        supabase.from('erp_usuarios').select('id,nome').eq('empresa_id', tenantId).eq('ativo', true).is('deleted_at', null).order('nome'),
        supabase.from('erp_clientes').select('id,nome').eq('empresa_id', tenantId).eq('ativo', true).order('nome').limit(2000),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenantId).eq('ativo', true).order('codigo').limit(5000),
        supabase.from('erp_sgq_auditorias').select('id,codigo_auditoria,escopo,status').eq('empresa_id', tenantId).order('data_inicio', { ascending: false }).limit(200),
        supabase.from('erp_rpnc')
          .select(SELECT_RPNC)
          .eq('empresa_id', tenantId).not('sgq_origem', 'is', null)
          .order('criado_em', { ascending: false }).limit(30),
      ])
      const falha = setorRes.error ?? usuarioRes.error ?? clienteRes.error ?? produtoRes.error ?? auditoriaRes.error ?? registroRes.error
      if (falha) throw falha
      const proximosSetores = (setorRes.data ?? []) as Setor[]
      setCompanyId(tenantId)
      setSetores(proximosSetores)
      setUsuarios((usuarioRes.data ?? []) as Usuario[])
      setClientes((clienteRes.data ?? []) as Cliente[])
      setProdutos((produtoRes.data ?? []) as Produto[])
      setAuditorias((auditoriaRes.data ?? []) as AuditoriaOpcao[])
      setRegistros((registroRes.data ?? []) as RegistroRPNC[])
      setSetorId((atual) => atual && proximosSetores.some((s) => s.id === atual) ? atual : proximosSetores[0]?.id ?? '')
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregarListas() }, [carregarListas])

  const carregarRegistro = useCallback(async (registro: RegistroRPNC) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const tenantId = companyId || String((await supabase.rpc('erp_current_empresa_id')).data ?? '')
      if (!tenantId) throw new Error('Empresa da sessão não identificada.')
      const [evidenciaRes, acaoRes] = await Promise.all([
        supabase.from('erp_qualidade_rpnc_evidencias')
          .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,finalidade,acao_id')
          .eq('empresa_id', tenantId).eq('rpnc_id', registro.id).order('created_at'),
        supabase.from('erp_sgq_capa_acoes')
          .select('id,tipo,descricao,causa_raiz,responsavel_id,prazo,status,resultado_eficacia,responsavel:erp_usuarios(nome)')
          .eq('empresa_id', tenantId).eq('rpnc_id', registro.id).order('prazo'),
      ])
      const falha = evidenciaRes.error ?? acaoRes.error
      if (falha) throw falha
      type AcaoRow = { id: string; tipo: string; descricao: string; causa_raiz: string | null; responsavel_id: string; prazo: string; status: string; responsavel: { nome: string } | null }
      setRpnc(registro)
      setPasta(registro.sgq_pasta_evidencias ?? `${tenantId}/rpnc_${registro.numero_rpnc}`)
      setTratamento(normalizarTratamento(registro.sgq_tratamento_anomalia))
      setFishbone(normalizarIshikawa(registro.ishikawa_data))
      setPorques(cadeiaDoBanco(registro.cinco_porques))
      setDescricao(registro.descricao_nao_conformidade)
      setOrigem(registro.sgq_tipo_registro ?? 'INTERNO')
      setSeveridade(registro.sgq_severidade ?? 'Menor')
      setLote(registro.sgq_lote ?? '')
      setDataOcorrencia(registro.sgq_data_ocorrencia ?? new Date().toISOString().slice(0, 10))
      setAuditoriaId(registro.sgq_auditoria_id ?? '')
      setSetorId(registro.setor_id ?? setorId)
      setCodigoProduto(produtos.find((p) => p.id === registro.sgq_produto_id)?.codigo ?? '')
      setEvidencias((evidenciaRes.data ?? []) as Evidencia[])
      setAcoes(((acaoRes.data ?? []) as unknown as AcaoRow[]).map((a) => ({
        id: a.id, tipo: a.tipo as AcaoForm['tipo'], descricao: a.descricao ?? '', causa_raiz: a.causa_raiz ?? '',
        responsavel_id: a.responsavel_id, prazo: a.prazo ?? '', status: a.status, responsavel: a.responsavel?.nome ?? null,
      })))
      setFiles([])
      setNotice(`Formulário de ${registro.numero_rpnc} carregado do banco.`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }, [companyId, produtos, setorId])

  // Varredura de recorrência em tempo real por código de peça ou lote (RLS no banco).
  useEffect(() => {
    const codigo = codigoProduto.trim()
    const loteAtual = lote.trim()
    if (varreduraTimer.current) window.clearTimeout(varreduraTimer.current)
    if (codigo.length < 3 && loteAtual.length < 2) {
      setRecorrencia([])
      setVarrendo(false)
      return
    }
    setVarrendo(true)
    varreduraTimer.current = window.setTimeout(async () => {
      try {
        const result = await supabase.rpc('erp_sgq_buscar_recorrencia_rpnc', {
          p_codigo_produto: codigo || null,
          p_lote: loteAtual || null,
          p_excluir_rpnc_id: rpnc?.id ?? null,
        })
        if (result.error) throw result.error
        setRecorrencia(Array.isArray(result.data) ? (result.data as unknown as Recorrencia[]) : [])
      } catch (cause) {
        setError(mensagem(cause))
        setRecorrencia([])
      } finally {
        setVarrendo(false)
      }
    }, 420)
    return () => { if (varreduraTimer.current) window.clearTimeout(varreduraTimer.current) }
  }, [codigoProduto, lote, rpnc?.id])

  const novoFormulario = () => {
    setRpnc(null)
    setPasta('')
    setAcoes([])
    setEvidencias([])
    setFiles([])
    setDescricao('')
    setTratamento(tratamentoVazio())
    setFishbone(ishikawaVazio())
    setPorques(cadeiaVazia())
    setCodigoProduto('')
    setLote('')
    setClienteId('')
    setAuditoriaId('')
    setRecorrencia([])
    setGavetaAberta(false)
    setNotice('')
    setError('')
  }

  const abrir = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente antes de salvar.')
      if (!setorId) throw new Error('Não há setor ativo cadastrado na empresa para responder pela RPNC.')
      if (descricao.trim().length < 10) throw new Error('Descreva a não conformidade com pelo menos 10 caracteres.')
      const result = await supabase.rpc('erp_sgq_abrir_rpnc_formulario', {
        p_descricao: descricao.trim(),
        p_tipo_registro: origem,
        p_severidade: severidade,
        p_setor_id: setorId,
        p_codigo_produto: codigoProduto.trim() || null,
        p_lote: lote.trim() || null,
        p_cliente_id: clienteId || null,
        p_data_ocorrencia: dataOcorrencia || null,
        p_auditoria_id: auditoriaId || null,
      })
      if (result.error) throw result.error
      if (!result.data) throw new Error('A RPC de abertura não retornou o registro persistido.')
      const criado = result.data as unknown as AberturaRPNC
      if (!criado.id || !criado.numero_rpnc) throw new Error('A RPC retornou um registro sem protocolo.')
      setPasta(criado.pasta_evidencias)
      const recemAberta = await supabase.from('erp_rpnc')
        .select(SELECT_RPNC)
        .eq('id', criado.id).eq('empresa_id', companyId).maybeSingle<RegistroRPNC>()
      if (recemAberta.error) throw recemAberta.error
      if (!recemAberta.data) throw new Error('A RPNC aberta não retornou da consulta de confirmação.')
      const registro = recemAberta.data as RegistroRPNC
      setRpnc(registro)
      setRegistros((atual) => [registro, ...atual].slice(0, 30))
      let enviadas = 0
      const falhas: string[] = []
      for (const file of files) {
        const caminho = `${criado.pasta_evidencias}/${crypto.randomUUID()}-${nomeSeguro(file.name)}`
        const contentType = mimeDe(file)
        const upload = await supabase.storage.from(BUCKET).upload(caminho, file, { upsert: false, contentType })
        if (upload.error) { falhas.push(`${file.name}: ${upload.error.message}`); continue }
        const insercao = await supabase.from('erp_qualidade_rpnc_evidencias').insert({
          empresa_id: companyId, rpnc_id: criado.id, nome_arquivo: file.name, storage_path: caminho,
          mime_type: contentType, tamanho_bytes: file.size, uploaded_by: auth.data.user.id, finalidade: 'Ocorrencia',
        })
        if (insercao.error) {
          await supabase.storage.from(BUCKET).remove([caminho])
          falhas.push(`${file.name}: ${insercao.error.message}`)
          continue
        }
        enviadas += 1
      }
      setFiles([])
      const listaEvidencias = await supabase.from('erp_qualidade_rpnc_evidencias')
        .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,finalidade,acao_id')
        .eq('empresa_id', companyId).eq('rpnc_id', criado.id).order('created_at')
      if (listaEvidencias.error) throw listaEvidencias.error
      setEvidencias((listaEvidencias.data ?? []) as Evidencia[])
      setNotice(falhas.length
        ? `RPNC ${criado.numero_rpnc} aberta. Pasta ${criado.pasta_evidencias} criada; falha ao anexar: ${falhas.join(' | ')}.`
        : `RPNC ${criado.numero_rpnc} aberta com transação atômica. Pasta virtual privada: ${criado.pasta_evidencias}.${enviadas ? ` ${enviadas} evidência(s) anexada(s).` : ''}`)
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const salvarFormulario = async () => {
    if (!rpnc) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_sgq_salvar_formulario_rpnc', {
        p_rpnc_id: rpnc.id,
        p_tratamento: tratamento,
        p_ishikawa: serializarIshikawa(fishbone),
        p_cinco_porques: cadeiaParaGravar(porques),
        p_auditoria_id: auditoriaId || null,
        p_codigo_produto: codigoProduto.trim() || null,
        p_lote: lote.trim() || null,
        p_data_ocorrencia: dataOcorrencia || null,
      })
      if (result.error) throw result.error
      setNotice(`Formulário de ${rpnc.numero_rpnc} salvo no Supabase.`)
      const recarregado = await supabase.from('erp_rpnc')
        .select(SELECT_RPNC)
        .eq('id', rpnc.id).eq('empresa_id', companyId).maybeSingle<RegistroRPNC>()
      if (recarregado.data) setRpnc(recarregado.data as RegistroRPNC)
      setRegistros((atual) => atual.map((r) => (r.id === rpnc.id && recarregado.data ? (recarregado.data as RegistroRPNC) : r)))
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const salvarPlano = async (lista: AcaoForm[]) => {
    if (!rpnc) return
    const payload = lista.map((a) => ({
      id: a.id ?? null, tipo: a.tipo, descricao: a.descricao, causa_raiz: a.causa_raiz,
      responsavel_id: a.responsavel_id, prazo: a.prazo, status: a.status ?? 'Planejada',
    }))
    const result = await supabase.rpc('erp_sgq_salvar_acoes_rpnc', { p_rpnc_id: rpnc.id, p_acoes: payload })
    if (result.error) throw result.error
    const data = (result.data ?? { acoes: [] }) as unknown as { acoes: Array<Record<string, unknown>> }
    setAcoes(data.acoes.map((a) => ({
      id: String(a.id), tipo: String(a.tipo) as AcaoForm['tipo'], descricao: String(a.descricao ?? ''),
      causa_raiz: String(a.causa_raiz ?? ''), responsavel_id: String(a.responsavel_id ?? ''),
      prazo: String(a.prazo ?? ''), status: String(a.status ?? 'Planejada'),
      responsavel: a.responsavel ? String(a.responsavel) : null,
    })))
  }

  const adicionarAcao = async () => {
    setError('')
    setNotice('')
    try {
      if (!rpnc) throw new Error('Abra a RPNC antes de registrar o plano de ação.')
      if (novaAcao.descricao.trim().length < 5) throw new Error('Descreva a ação com pelo menos 5 caracteres.')
      if (!novaAcao.responsavel_id) throw new Error('Selecione o responsável pela ação.')
      if (!novaAcao.prazo) throw new Error('Informe o prazo da ação.')
      await salvarPlano([...acoes, novaAcao])
      setNovaAcao({ tipo: novaAcao.tipo, descricao: '', causa_raiz: '', responsavel_id: novaAcao.responsavel_id, prazo: novaAcao.prazo })
      setNotice('Plano de ação gravado na RPNC.')
    } catch (cause) {
      setError(mensagem(cause))
    }
  }

  const gravarPlano = async () => {
    setError('')
    setNotice('')
    try {
      if (!acoes.every((a) => a.descricao.trim().length >= 5 && a.responsavel_id && a.prazo)) {
        throw new Error('Toda linha do plano precisa ter descrição, responsável e prazo antes de gravar.')
      }
      await salvarPlano(acoes)
      setNotice('Plano de ação gravado no Supabase.')
    } catch (cause) {
      setError(mensagem(cause))
    }
  }

  const atualizarAcao = async (index: number, campo: keyof AcaoForm, valor: string) => {
    const lista = acoes.map((a, i) => (i === index ? { ...a, [campo]: valor } : a))
    setAcoes(lista as AcaoSalva[])
  }

  const removerAcao = async (index: number) => {
    setError('')
    try {
      const removida = acoes[index]
      const lista = acoes.filter((_, i) => i !== index).map(({ id, tipo, descricao: d, causa_raiz, responsavel_id, prazo, status }) => ({ id, tipo, descricao: d, causa_raiz, responsavel_id, prazo, status }))
      await salvarPlano(lista)
      setNotice(removida.id ? 'Ação removida do plano.' : 'Linha descartada.')
    } catch (cause) {
      setError(mensagem(cause))
    }
  }

  const anexarAcao = async () => {
    if (!fileParaAcao || !rpnc) return
    setSaving(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada.')
      const { acaoId, file } = fileParaAcao
      const caminho = `${pasta}/acoes/${acaoId}/${crypto.randomUUID()}-${nomeSeguro(file.name)}`
      const contentType = mimeDe(file)
      const upload = await supabase.storage.from(BUCKET).upload(caminho, file, { upsert: false, contentType })
      if (upload.error) throw upload.error
      const insercao = await supabase.from('erp_qualidade_rpnc_evidencias').insert({
        empresa_id: companyId, rpnc_id: rpnc.id, nome_arquivo: file.name, storage_path: caminho,
        mime_type: contentType, tamanho_bytes: file.size, uploaded_by: auth.data.user.id, acao_id: acaoId, finalidade: 'Acao',
      })
      if (insercao.error) {
        await supabase.storage.from(BUCKET).remove([caminho])
        throw insercao.error
      }
      const lista = await supabase.from('erp_qualidade_rpnc_evidencias')
        .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,finalidade,acao_id')
        .eq('empresa_id', companyId).eq('rpnc_id', rpnc.id).order('created_at')
      if (lista.error) throw lista.error
      setEvidencias((lista.data ?? []) as Evidencia[])
      setFileParaAcao(null)
      setNotice('Anexo da ação gravado na pasta da RPNC.')
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const baixar = async (path: string) => {
    setError('')
    try {
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 120)
      if (signed.error) throw signed.error
      if (!signed.data?.signedUrl) throw new Error('O bucket não retornou o endereço do arquivo.')
      window.open(signed.data.signedUrl, '_blank', 'noopener')
    } catch (cause) {
      setError(mensagem(cause))
    }
  }

  const excluirEvidencia = async (evidencia: Evidencia) => {
    setSaving(true)
    setError('')
    try {
      const remocao = await supabase.from('erp_qualidade_rpnc_evidencias').delete().eq('id', evidencia.id).eq('empresa_id', companyId)
      if (remocao.error) throw remocao.error
      const storage = await supabase.storage.from(BUCKET).remove([evidencia.storage_path])
      if (storage.error) setNotice(`Registro removido, mas o arquivo ficou no bucket: ${storage.error.message}`)
      setEvidencias((atual) => atual.filter((e) => e.id !== evidencia.id))
    } catch (cause) {
      setError(mensagem(cause))
    } finally {
      setSaving(false)
    }
  }

  const evidenciasDeAcao = useMemo(() => evidencias.filter((e) => e.finalidade === 'Acao' && e.acao_id), [evidencias])
  const bloqueado = !rpnc || saving

  return (
    <main className="qrf space-y-3 p-2 text-slate-800">
      <header className="qrf-screen-only flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-white"><ClipboardList size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">SGQ · Tratamento de anomalia</p>
          <h1 className="text-sm font-extrabold text-[#123B50]">Formulário RPNC · {rpnc ? rpnc.numero_rpnc : 'nova não conformidade'}</h1>
          <p className="text-[11px] text-slate-500">
            {pasta ? `Pasta privada: ${pasta}` : 'A pasta virtual {empresa}/rpnc_{protocolo} é criada pela transação de abertura.'}
          </p>
        </div>
        <button type="button" className="erp-btn" onClick={novoFormulario} disabled={saving}><Plus size={13} /> Novo formulário</button>
        <button type="button" className="erp-btn" onClick={() => void carregarListas()} disabled={loading || saving}><RefreshCw size={13} /> Atualizar</button>
        <button type="button" className="erp-btn" onClick={() => window.print()} disabled={!rpnc}><Printer size={13} /> Imprimir relatório</button>
      </header>

      {error && <div role="alert" className="qrf-screen-only flex gap-2 rounded-[2px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={14} />{error}</div>}
      {notice && <div role="status" className="qrf-screen-only flex gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={14} />{notice}</div>}

      <section className="qrf-block qrf-screen-only">
        <div className="qrf-block-title"><History size={14} /> Registros do banco</div>
        <div className="flex flex-wrap items-center gap-2 p-2.5">
          <label className="qrf-field min-w-64 flex-1">RPNC existente
            <select className="erp-input" disabled={loading || saving}
              value={rpnc?.id ?? ''}
              onChange={(event) => {
                const alvo = registros.find((r) => r.id === event.target.value)
                if (alvo) void carregarRegistro(alvo)
                else novoFormulario()
              }}>
              <option value="">— Novo formulário —</option>
              {registros.map((r) => <option key={r.id} value={r.id}>{r.numero_rpnc} · {dataBR(r.criado_em)} · {r.status}</option>)}
            </select>
          </label>
          {loading && <span className="text-[11px] text-slate-500">Consultando o Supabase…</span>}
        </div>
      </section>

      <form onSubmit={(event) => void abrir(event)} className="qrf-screen-only qrf-block">
        <div className="qrf-block-title">1 · Relato do problema — identificação da ocorrência</div>
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="qrf-field">Origem (obrigatória)
            <select className="erp-input" value={origem} onChange={(e) => setOrigem(e.target.value as TipoRegistro)} disabled={saving}>
              {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="qrf-field">Gravidade
            <select className="erp-input" value={severidade} onChange={(e) => setSeveridade(e.target.value as Severidade)} disabled={saving}>
              {SEVERIDADES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="qrf-field">Setor responsável
            <select className="erp-input" value={setorId} onChange={(e) => setSetorId(e.target.value)} disabled={saving || loading || !sectores.length}>
              <option value="">Selecionar setor</option>
              {sectores.map((s) => <option key={s.id} value={s.id}>{s.codigo ? `${s.codigo} · ` : ''}{s.nome}</option>)}
            </select>
          </label>
          <label className="qrf-field">Data da ocorrência
            <input type="date" className="erp-input" value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} disabled={saving} />
          </label>
          <label className="qrf-field">Código da peça / produto
            <input list="qrf-produtos" className="erp-input" placeholder="ex.: 18009721" value={codigoProduto}
              onChange={(e) => setCodigoProduto(e.target.value)} disabled={saving} />
            <datalist id="qrf-produtos">
              {produtos.map((p) => <option key={p.id} value={p.codigo}>{p.nome}</option>)}
            </datalist>
          </label>
          <label className="qrf-field">Lote
            <input className="erp-input" placeholder="lote retido / lote do refugo" value={lote} onChange={(e) => setLote(e.target.value)} disabled={saving} />
          </label>
          <label className="qrf-field">Cliente
            <select className="erp-input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} disabled={saving}>
              <option value="">Não aplicável</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className="qrf-field">Nº de controle (etiqueta)
            <input className="erp-input" value={tratamento.numero_controle} onChange={(e) => setTratamento({ ...tratamento, numero_controle: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field">Hora da ocorrência
            <input type="time" className="erp-input" value={tratamento.hora_ocorrencia} onChange={(e) => setTratamento({ ...tratamento, hora_ocorrencia: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field">Hora da restauração
            <input type="time" className="erp-input" value={tratamento.hora_restauracao} onChange={(e) => setTratamento({ ...tratamento, hora_restauracao: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field">Duração da anormalidade
            <input className="erp-input" placeholder="ex.: 4h30" value={tratamento.duracao} onChange={(e) => setTratamento({ ...tratamento, duracao: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field">Quantidade afetada
            <input className="erp-input" inputMode="decimal" value={tratamento.quantidade_afetada} onChange={(e) => setTratamento({ ...tratamento, quantidade_afetada: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field">Ocorrência
            <select className="erp-input" value={tratamento.tipo_ocorrencia} onChange={(e) => setTratamento({ ...tratamento, tipo_ocorrencia: e.target.value as TratamentoForm['tipo_ocorrencia'] })} disabled={saving}>
              <option value="inicial">Inicial</option>
              <option value="reincidencia">Reincidência</option>
            </select>
          </label>
          <label className="qrf-field">Requisito violado
            <input className="erp-input" placeholder="desenho, plano de controle, norma" value={tratamento.requisito_violado} onChange={(e) => setTratamento({ ...tratamento, requisito_violado: e.target.value })} disabled={saving} />
          </label>
          <label className="qrf-field md:col-span-2 xl:col-span-4">Descrição da não conformidade (produto / local / máquina / quantidades)
            <textarea required minLength={10} className="erp-input qrf-textarea" rows={3} value={descricao}
              onChange={(e) => setDescricao(e.target.value)} disabled={saving || Boolean(rpnc)}
              placeholder="Descreva o desvio observado, o requisito não atendido e o impacto identificado." />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3">
          <div className="min-w-64 flex-1">
            <p className="erp-label">Evidências da ocorrência</p>
            <input type="file" multiple accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.txt" disabled={saving || Boolean(rpnc)}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).filter((f) => f.size <= MAX_ANEXO))}
              className="text-xs" />
            <p className="mt-1 text-[10px] text-slate-500">{files.length ? `${files.length} arquivo(s) na fila · serão gravados em ${pasta || 'pasta criada na abertura'}` : 'PDF, DOCX, XLSX, PNG, JPEG, WEBP e TXT · 15 MB por arquivo.'}</p>
          </div>
          <button type="submit" className="erp-btn-primary" disabled={saving || loading || Boolean(rpnc) || descricao.trim().length < 10}>
            <Save size={14} /> {rpnc ? 'RPNC aberta' : 'Abrir RPNC e criar pasta'}
          </button>
        </div>
      </form>

      {recorrencia.length > 0 && (
        <div role="alert" className="qrf qrf-screen-only qrf-recorrencia flex flex-wrap items-center gap-2 rounded-[2px] border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <AlertCircle size={15} />
          <strong>Atenção:</strong>
          <span>
            este problema já ocorreu {recorrencia.length} vez(es) anterior(es)
            {recorrencia[0]?.lote ? ` — lote ${recorrencia[0].lote}` : ''} em {dataBR(recorrencia[0]?.data_ocorrencia ?? recorrencia[0]?.criado_em)}
            ({recorrencia[0]?.numero_rpnc}).
          </span>
          <button type="button" className="erp-btn ml-auto" onClick={() => setGavetaAberta(true)} disabled={varrendo}>
            <Search size={13} /> Abrir histórico e ações
          </button>
        </div>
      )}
      {varrendo && <p className="qrf-screen-only text-[11px] text-slate-500">Varrendo recorrência no banco…</p>}

      {rpnc && (
        <>
          <section className="qrf-screen-only qrf-block">
            <div className="qrf-block-title">2 · Investigação — resultados, Ishikawa 6M e 5 Porquês</div>
            <div className="grid grid-cols-1 gap-3 p-3">
              <label className="qrf-field">Descrição dos resultados da investigação (o que levou o problema a ocorrer, por que não foi detectado, por que não foi previsto)
                <textarea className="erp-input qrf-textarea" rows={3} value={tratamento.investigacao} disabled={bloqueado}
                  onChange={(e) => setTratamento({ ...tratamento, investigacao: e.target.value })} />
              </label>
              <div className="qrf-diagrama-camada">
                <IshikawaDiagrama
                  dados={fishbone}
                  efeito={descricao || rpnc?.descricao_nao_conformidade || 'Não conformidade descrita no relato'}
                  editavel={!bloqueado}
                  onChange={setFishbone}
                />
                <details className="qrf-diagrama-lista">
                  <summary className="erp-label">Ver o texto completo das {totalDeCausas(fishbone)} causas por espinha</summary>
                  <ul className="space-y-1 text-[11px]">
                    {GRUPOS_6M.map((grupo) => {
                      const causas = fishbone[grupo.key]
                      if (!causas.length) return null
                      return (
                        <li key={grupo.key}>
                          <strong>{grupo.label}: </strong>
                          {causas.map((causa, indice) => (
                            <span key={indice} className="inline-block">
                              {causa.texto}
                              {causa.subcausas.length ? ` (desdobrada em ${causa.subcausas.join(' · ')})` : ''}
                              {indice < causas.length - 1 ? '; ' : ''}
                            </span>
                          ))}
                        </li>
                      )
                    })}
                    {!totalDeCausas(fishbone) && <li className="text-slate-500">Nenhuma causa registrada ainda — clique em uma espinha para começar.</li>}
                  </ul>
                </details>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="erp-label">Desdobrar cada causa imediata até a causa raiz (5 Porquês)</p>
                <button type="button" className="erp-btn" disabled={bloqueado}
                  onClick={() => setTratamento({ ...tratamento, cadeas: [...tratamento.cadeas, { causa: '', porques: cadeiaVazia() }] })}>
                  <Plus size={13} /> Nova cadeia
                </button>
              </div>

              <CadeiaPorques rotulo="Causa 01 · principal (grava em cinco_porques)" causa={tratamento.causa_imediata} porques={porques} desabilitado={bloqueado}
                onCausa={(v) => setTratamento({ ...tratamento, causa_imediata: v })}
                onNiveis={(proximo) => setPorques(proximo)}
                onChange={(index, valor) => setPorques((old) => old.map((p, i) => (i === index ? valor : p)))} />

              {tratamento.cadeas.map((cadeia, index) => (
                <CadeiaPorques key={index} rotulo={`Causa ${String(index + 2).padStart(2, '0')}`} causa={cadeia.causa} porques={cadeia.porques} desabilitado={bloqueado}
                  onRemover={() => setTratamento({ ...tratamento, cadeas: tratamento.cadeas.filter((_, i) => i !== index) })}
                  onCausa={(v) => setTratamento({ ...tratamento, cadeas: tratamento.cadeas.map((c, i) => (i === index ? { ...c, causa: v } : c)) })}
                  onNiveis={(proximo) => setTratamento({ ...tratamento, cadeas: tratamento.cadeas.map((c, i) => (i === index ? { ...c, porques: proximo } : c)) })}
                  onChange={(pIndex, valor) => setTratamento({ ...tratamento, cadeas: tratamento.cadeas.map((c, i) => (i === index ? { ...c, porques: c.porques.map((p, j) => (j === pIndex ? valor : p)) } : c)) })} />
              ))}
            </div>
          </section>

          <section className="qrf-screen-only qrf-block">
            <div className="qrf-block-title">3 · Equipe de tratamento</div>
            <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
              {tratamento.equipe.map((membro, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 rounded-[2px] border border-slate-200 p-2 md:col-span-1">
                  <label className="qrf-field">Nome {index + 1}
                    <input className="erp-input" value={membro.nome} disabled={bloqueado}
                      onChange={(e) => setTratamento({ ...tratamento, equipe: tratamento.equipe.map((m, i) => (i === index ? { ...m, nome: e.target.value } : m)) })} />
                  </label>
                  <label className="qrf-field">Função
                    <input className="erp-input" value={membro.funcao} disabled={bloqueado}
                      onChange={(e) => setTratamento({ ...tratamento, equipe: tratamento.equipe.map((m, i) => (i === index ? { ...m, funcao: e.target.value } : m)) })} />
                  </label>
                  <label className="qrf-field">Setor
                    <input className="erp-input" value={membro.setor} disabled={bloqueado}
                      onChange={(e) => setTratamento({ ...tratamento, equipe: tratamento.equipe.map((m, i) => (i === index ? { ...m, setor: e.target.value } : m)) })} />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-3">
              <button type="button" className="erp-btn" disabled={bloqueado}
                onClick={() => setTratamento({ ...tratamento, equipe: [...tratamento.equipe, { nome: '', funcao: '', setor: '' }] })}>
                <Plus size={13} /> Adicionar membro
              </button>
              <button type="button" className="erp-btn" disabled={bloqueado || tratamento.equipe.length <= 1}
                onClick={() => setTratamento({ ...tratamento, equipe: tratamento.equipe.slice(0, -1) })}>
                <Trash2 size={13} /> Remover último
              </button>
            </div>
          </section>

          <section className="qrf-screen-only qrf-block">
            <div className="qrf-block-title">4 · Ações corretivas integradas (CAPA) · CONTENÇÃO / CORRETIVA / PREVENTIVA</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="erp-th">Tipo</th><th className="erp-th">Ação (o quê?)</th><th className="erp-th">Causa atacada</th>
                    <th className="erp-th">Responsável (quem?)</th><th className="erp-th">Prazo (quando?)</th><th className="erp-th">Status</th><th className="erp-th">Anexos</th><th className="erp-th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {acoes.map((acao, index) => (
                    <tr key={acao.id} className="erp-tr">
                      <td className="erp-td">
                        <select className="erp-input" value={acao.tipo} disabled={bloqueado}
                          onChange={(e) => void atualizarAcao(index, 'tipo', e.target.value)}>
                          {TIPOS_ACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="erp-td"><textarea className="erp-input qrf-textarea min-w-64" rows={2} value={acao.descricao} disabled={bloqueado}
                        onChange={(e) => void atualizarAcao(index, 'descricao', e.target.value)} /></td>
                      <td className="erp-td"><input className="erp-input min-w-40" value={acao.causa_raiz} disabled={bloqueado}
                        onChange={(e) => void atualizarAcao(index, 'causa_raiz', e.target.value)} /></td>
                      <td className="erp-td">
                        <select className="erp-input min-w-40" value={acao.responsavel_id} disabled={bloqueado}
                          onChange={(e) => void atualizarAcao(index, 'responsavel_id', e.target.value)}>
                          <option value="">Selecionar</option>
                          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      </td>
                      <td className="erp-td"><input type="date" className="erp-input" value={acao.prazo} disabled={bloqueado}
                        onChange={(e) => void atualizarAcao(index, 'prazo', e.target.value)} /></td>
                      <td className="erp-td"><span className="rounded-[2px] bg-slate-100 px-2 py-1 text-[10px] font-bold">{acao.status ?? 'Planejada'}</span></td>
                      <td className="erp-td">
                        <div className="flex flex-wrap items-center gap-1">
                          {evidenciasDeAcao.filter((e) => e.acao_id === acao.id).map((e) => (
                            <button key={e.id} type="button" className="erp-btn" title={e.storage_path} onClick={() => void baixar(e.storage_path)}>
                              {e.mime_type?.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />} {tamanho(e.tamanho_bytes)}
                            </button>
                          ))}
                          <label className="erp-btn cursor-pointer">
                            <Paperclip size={12} /> Anexar
                            <input type="file" className="hidden" disabled={bloqueado}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileParaAcao({ acaoId: acao.id, file: f }); e.target.value = '' }} />
                          </label>
                        </div>
                      </td>
                      <td className="erp-td"><button type="button" className="erp-btn" disabled={bloqueado} onClick={() => void removerAcao(index)} aria-label="Excluir plano de acao"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {!acoes.length && <tr><td className="erp-td italic text-slate-500" colSpan={8}>Nenhuma ação no banco. Adicione a primeira linha abaixo.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 md:grid-cols-6">
              <label className="qrf-field">Tipo
                <select className="erp-input" value={novaAcao.tipo} disabled={bloqueado} onChange={(e) => setNovaAcao({ ...novaAcao, tipo: e.target.value as AcaoForm['tipo'] })}>
                  {TIPOS_ACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="qrf-field md:col-span-2">Ação (o quê?)
                <input className="erp-input" value={novaAcao.descricao} disabled={bloqueado} onChange={(e) => setNovaAcao({ ...novaAcao, descricao: e.target.value })} />
              </label>
              <label className="qrf-field">Responsável
                <select className="erp-input" value={novaAcao.responsavel_id} disabled={bloqueado} onChange={(e) => setNovaAcao({ ...novaAcao, responsavel_id: e.target.value })}>
                  <option value="">Selecionar</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
              <label className="qrf-field">Prazo
                <input type="date" className="erp-input" value={novaAcao.prazo} disabled={bloqueado} onChange={(e) => setNovaAcao({ ...novaAcao, prazo: e.target.value })} />
              </label>
              <div className="flex items-end gap-2">
                <button type="button" className="erp-btn-primary w-full" disabled={bloqueado} onClick={() => void adicionarAcao()}><Plus size={14} /> Adicionar ação</button>
              </div>
              <div className="flex items-end gap-2 md:col-span-6">
                <button type="button" className="erp-btn" disabled={bloqueado || !acoes.length} onClick={() => void gravarPlano()}><Save size={13} /> Gravar alterações do plano</button>
                <p className="text-[10px] text-slate-500">Edições de tipo, descrição, causa, responsável e prazo são gravadas por <code>erp_sgq_salvar_acoes_rpnc</code>; ações Aprovada/Verificada permanecem imutáveis pela trigger de workflow do banco.</p>
              </div>
            </div>
            {fileParaAcao && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3 text-xs">
                <span className="font-bold">Anexar “{fileParaAcao.file.name}” ({tamanho(fileParaAcao.file.size)}) à ação?</span>
                <button type="button" className="erp-btn-primary" disabled={saving} onClick={() => void anexarAcao()}><CheckCircle2 size={13} /> Gravar na pasta da RPNC</button>
                <button type="button" className="erp-btn" onClick={() => setFileParaAcao(null)}><X size={13} /> Cancelar</button>
              </div>
            )}
          </section>

          <section className="qrf-screen-only qrf-block">
            <div className="qrf-block-title">5 · Padronização, eficácia e vínculo com auditoria</div>
            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="qrf-field">Foi estabelecido sistema à-prova-de-erro?
                <select className="erp-input" value={tratamento.padronizacao.poka_yoke} disabled={bloqueado}
                  onChange={(e) => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, poka_yoke: e.target.value as 'sim' | 'nao' } })}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </label>
              <label className="qrf-field">Auditoria de origem (constatação)
                <select className="erp-input" value={auditoriaId} disabled={bloqueado} onChange={(e) => setAuditoriaId(e.target.value)}>
                  <option value="">Sem auditoria vinculada</option>
                  {auditorias.map((a) => <option key={a.id} value={a.id}>{a.codigo_auditoria} · {a.escopo}</option>)}
                </select>
              </label>
              <label className="qrf-field">Vincular auditoria agora
                <button type="button" className="erp-btn" disabled={saving || !auditoriaId} onClick={() => void salvarFormulario()}>
                  <Save size={13} /> Gravar vínculo junto do formulário
                </button>
              </label>
              <label className="qrf-field md:col-span-2 xl:col-span-3">
                {tratamento.padronizacao.poka_yoke === 'sim' ? 'Qual sistema à-prova-de-erro?' : 'Motivo da não aplicação de poka-yoke'}
                <textarea className="erp-input qrf-textarea" rows={2} value={tratamento.padronizacao.justificativa} disabled={bloqueado}
                  onChange={(e) => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, justificativa: e.target.value } })} />
              </label>
              <label className="qrf-field md:col-span-2 xl:col-span-3">Documentos revisados (FMEA, plano de controle, instruções, lições aprendidas)
                <div className="grid gap-1">
                  {tratamento.padronizacao.documentos.map((doc, index) => (
                    <div key={index} className="flex flex-wrap gap-1">
                      <input className="erp-input flex-1" placeholder="documento" value={doc.documento} disabled={bloqueado}
                        onChange={(e) => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, documentos: tratamento.padronizacao.documentos.map((d, i) => (i === index ? { ...d, documento: e.target.value } : d)) } })} />
                      <input className="erp-input w-40" placeholder="responsável" value={doc.responsavel} disabled={bloqueado}
                        onChange={(e) => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, documentos: tratamento.padronizacao.documentos.map((d, i) => (i === index ? { ...d, responsavel: e.target.value } : d)) } })} />
                      <input type="date" className="erp-input w-40" value={doc.prazo} disabled={bloqueado}
                        onChange={(e) => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, documentos: tratamento.padronizacao.documentos.map((d, i) => (i === index ? { ...d, prazo: e.target.value } : d)) } })} />
                    </div>
                  ))}
                  <button type="button" className="erp-btn self-start" disabled={bloqueado}
                    onClick={() => setTratamento({ ...tratamento, padronizacao: { ...tratamento.padronizacao, documentos: [...tratamento.padronizacao.documentos, { documento: '', responsavel: '', prazo: '', situacao: 'Aguardando' }] } })}>
                    <Plus size={13} /> Documento
                  </button>
                </div>
              </label>
              <label className="qrf-field md:col-span-2 xl:col-span-3">Relato de confirmação de eficácia (o fluxo formal de carência 30/60 dias permanece na tela RPNC aprovada)
                <textarea className="erp-input qrf-textarea" rows={3} value={tratamento.eficacia_relato} disabled={bloqueado}
                  onChange={(e) => setTratamento({ ...tratamento, eficacia_relato: e.target.value })} />
              </label>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3">
              <p className="max-w-2xl text-[10px] text-slate-500">A gravação usa a RPC de segurança <code>erp_sgq_salvar_formulario_rpnc</code>: ela revalida empresa, permissão <code>qualidade:editar</code> e o contrato 6M no PostgreSQL. Campos de abertura (protocolo, descrição, gravidade, setor) permanecem imutáveis por trigger.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="erp-btn" onClick={() => window.print()}><Printer size={14} /> Imprimir relatório</button>
                <button type="button" className="erp-btn-primary" disabled={saving} onClick={() => void salvarFormulario()}><Save size={14} /> Salvar formulário</button>
              </div>
            </footer>
          </section>

          <section className="qrf-screen-only qrf-block">
            <div className="qrf-block-title">Evidências arquivadas em {pasta}</div>
            <ul className="divide-y divide-slate-100">
              {evidencias.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 p-2 text-xs">
                  <span className="rounded-[2px] bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{e.finalidade === 'Acao' ? 'Ação' : 'Ocorrência'}</span>
                  <span className="min-w-0 flex-1 truncate font-mono">{e.nome_arquivo}</span>
                  <span className="text-[10px] text-slate-500">{tamanho(e.tamanho_bytes)}</span>
                  <button type="button" className="erp-btn" onClick={() => void baixar(e.storage_path)}><FileText size={12} /> Abrir</button>
                  <button type="button" className="erp-btn" onClick={() => void excluirEvidencia(e)} aria-label="Excluir evidencia"><Trash2 size={12} /></button>
                </li>
              ))}
              {!evidencias.length && <li className="p-3 text-xs italic text-slate-500">Nenhum arquivo na pasta desta RPNC.</li>}
            </ul>
          </section>
        </>
      )}

      {gavetaAberta && (
        <>
          <div className="qrf-drawer-scrim qrf-screen-only" onClick={() => setGavetaAberta(false)} role="presentation" />
          <aside className="qrf-drawer qrf-screen-only" role="dialog" aria-modal="true" aria-label="Espelhamento de RPNCs anteriores">
            <header className="flex items-center gap-2 border-b border-slate-200 p-3">
              <History size={15} className="text-warning" />
              <h2 className="min-w-0 flex-1 text-xs font-extrabold">Espelhamento de tratativas anteriores</h2>
              <button type="button" className="erp-btn" onClick={() => setGavetaAberta(false)}><X size={13} /> Fechar</button>
            </header>
            <div className="qrf-drawer-body space-y-3">
              {recorrencia.map((registro) => (
                <article key={registro.id} className="space-y-2 rounded-[2px] border border-slate-200 p-2.5">
                  <header className="flex flex-wrap items-center gap-2">
                    <strong className="font-mono text-xs">{registro.numero_rpnc}</strong>
                    <span className="rounded-[2px] bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{registro.status}</span>
                    <span className="text-[11px] text-slate-500">{dataBR(registro.data_ocorrencia ?? registro.criado_em)} · {registro.setor ?? 'setor não informado'}{registro.lote ? ` · lote ${registro.lote}` : ''}</span>
                  </header>
                  <p className="text-xs">{registro.descricao}</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-[2px] bg-slate-50 p-2">
                      <p className="erp-label">Ishikawa 6M</p>
                      <ul className="space-y-1 text-[11px]">
                        {(() => {
                          const causas = normalizarIshikawa(registro.ishikawa_data)
                          return (
                            <>
                              {GRUPOS_6M.map((g) => {
                                const lista = causas[g.key]
                                return lista.length
                                  ? <li key={g.key}><strong>{g.label}:</strong> {lista.map((causa) => causa.subcausas.length ? `${causa.texto} (${causa.subcausas.join(' · ')})` : causa.texto).join('; ')}</li>
                                  : null
                              })}
                              {!GRUPOS_6M.some((g) => causas[g.key].length) && <li className="text-slate-500">Sem causas registradas.</li>}
                            </>
                          )
                        })()}
                      </ul>
                    </div>
                    <div className="rounded-[2px] bg-slate-50 p-2">
                      <p className="erp-label">5 Porquês</p>
                      <ol className="list-decimal space-y-1 pl-4 text-[11px]">
                        {(registro.cinco_porques ?? []).map((p, i) => <li key={i}>{p}</li>)}
                        {!(registro.cinco_porques ?? []).length && <li className="list-none text-slate-500">Sem cadeia registrada.</li>}
                      </ol>
                    </div>
                  </div>
                  <div>
                    <p className="erp-label">Ações executadas</p>
                    <table className="w-full text-left text-[11px]">
                      <thead><tr><th className="erp-th">Tipo</th><th className="erp-th">Ação</th><th className="erp-th">Responsável</th><th className="erp-th">Prazo</th><th className="erp-th">Status</th><th className="erp-th">Eficácia</th></tr></thead>
                      <tbody>
                        {registro.acoes.map((a) => (
                          <tr key={a.id} className="erp-tr">
                            <td className="erp-td">{a.tipo}</td><td className="erp-td">{a.descricao}</td><td className="erp-td">{a.responsavel ?? '—'}</td>
                            <td className="erp-td">{dataBR(a.prazo)}</td><td className="erp-td">{a.status}</td><td className="erp-td">{a.resultado_eficacia ?? '—'}</td>
                          </tr>
                        ))}
                        {!registro.acoes.length && <tr><td className="erp-td italic text-slate-500" colSpan={6}>Nenhuma ação CAPA gravada.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <label className="qrf-field">Por que a barreira falhou? (avaliação do analista)
                    <textarea className="erp-input qrf-textarea" rows={2} disabled={!rpnc || saving}
                      value={tratamento.barreira_falhou[registro.numero_rpnc] ?? ''}
                      onChange={(e) => setTratamento({ ...tratamento, barreira_falhou: { ...tratamento.barreira_falhou, [registro.numero_rpnc]: e.target.value } })} />
                  </label>
                </article>
              ))}
            </div>
          </aside>
        </>
      )}

      {rpnc && (
        <section className="qrf-report" aria-label="Relatório de tratamento de anomalia">
          <div className="qrf-report-head">
            <div>
              <h1>Tratamento de anomalia · RPNC</h1>
              <div className="qrf-report-meta">Item de controle/origem: {codigoProduto || rpnc.numero_rpnc}{rpnc.sgq_lote ? ` · lote ${rpnc.sgq_lote}` : ''}</div>
              <div className="qrf-report-meta">Protocolo: {rpnc.numero_rpnc} · Nº: {tratamento.numero_controle || '—'} · Data: {dataBR(rpnc.sgq_data_ocorrencia ?? rpnc.criado_em)}</div>
            </div>
            <div className="qrf-report-meta">
              Origem: {ORIGENS.find((o) => o.value === rpnc.sgq_tipo_registro)?.label ?? '—'}<br />
              Gravidade: {SEVERIDADES.find((s) => s.value === rpnc.sgq_severidade)?.label ?? '—'}<br />
              Status: {rpnc.status}
            </div>
          </div>

          <h2>Relato do problema</h2>
          <table>
            <tbody>
              <tr><th>Descrição</th><td>{rpnc.descricao_nao_conformidade}</td></tr>
              <tr><th>Hora ocorrência / restauração</th><td>{tratamento.hora_ocorrencia || '—'} / {tratamento.hora_restauracao || '—'} · duração {tratamento.duracao || '—'}</td></tr>
              <tr><th>Ocorrência</th><td>{tratamento.tipo_ocorrencia === 'reincidencia' ? 'Reincidência' : 'Inicial'} · quantidade afetada: {tratamento.quantidade_afetada || '—'}</td></tr>
              <tr><th>Requisito violado</th><td>{tratamento.requisito_violado || '—'}</td></tr>
              <tr><th>Setor responsável</th><td>{sectores.find((s) => s.id === rpnc.setor_id)?.nome ?? '—'}</td></tr>
            </tbody>
          </table>

          <h2>Investigação</h2>
          <p className="qrf-report-text">{tratamento.investigacao || '—'}</p>

          <h2>Análise das causas · Ishikawa 6M</h2>
          <IshikawaDiagrama
            dados={fishbone}
            efeito={rpnc.descricao_nao_conformidade || descricao || 'Não conformidade relatada'}
            editavel={false}
            onChange={() => undefined}
          />
          <div className="qrf-grid-3">
            {GRUPOS_6M.map((g) => (
              <div key={g.key} className="qrf-box">
                <h3>{g.label}</h3>
                <ul>
                  {fishbone[g.key].length
                    ? fishbone[g.key].map((causa, i) => (
                      <li key={i}>
                        {causa.texto}
                        {causa.subcausas.length ? <ul>{causa.subcausas.map((sub, j) => <li key={j}>{sub}</li>)}</ul> : null}
                      </li>
                    ))
                    : <li>Não aplicável / não identificado.</li>}
                </ul>
              </div>
            ))}
          </div>

          <h2>Desdobramento 5 Porquês</h2>
          <div className="qrf-grid-2">
            <div className="qrf-box">
              <h3>Causa 01</h3>
              {porques.map((p, i) => <p key={i}><strong>{`${i + 1}º porquê${i === porques.length - 1 ? ' (causa raiz)' : ''}`}</strong> {p || '—'}</p>)}
            </div>
            {tratamento.cadeas.map((c, index) => (
              <div key={index} className="qrf-box">
                <h3>Causa {String(index + 2).padStart(2, '0')}</h3>
                {c.porques.map((p, i) => <p key={i}><strong>{i + 1}º porquê:</strong> {p || '—'}</p>)}
              </div>
            ))}
          </div>

          <h2>Ações corretivas (contenção, corretivas e preventivas)</h2>
          <table>
            <thead><tr><th>Tipo</th><th>Ação (o quê?)</th><th>Responsável (quem?)</th><th>Prazo (quando?)</th><th>Status</th><th>Concluída em</th></tr></thead>
            <tbody>
              {acoes.map((a) => (
                <tr key={a.id}>
                  <td>{a.tipo}</td><td>{a.descricao}{a.causa_raiz ? ` · causa: ${a.causa_raiz}` : ''}</td>
                  <td>{usuarios.find((u) => u.id === a.responsavel_id)?.nome ?? a.responsavel ?? '—'}</td>
                  <td>{dataBR(a.prazo)}</td><td>{a.status ?? 'Planejada'}</td><td>{a.status === 'Concluida' || a.status === 'Verificada' ? 'Concluída' : '—'}</td>
                </tr>
              ))}
              {!acoes.length && <tr><td colSpan={6}>Nenhuma ação registrada.</td></tr>}
            </tbody>
          </table>

          <h2>Padronização e eficácia</h2>
          <table>
            <tbody>
              <tr><th>Sistema à-prova-de-erro</th><td>{tratamento.padronizacao.poka_yoke === 'sim' ? 'Sim' : 'Não'} — {tratamento.padronizacao.justificativa || '—'}</td></tr>
              <tr><th>Documentos revisados</th><td>{tratamento.padronizacao.documentos.length ? tratamento.padronizacao.documentos.map((d) => `${d.documento || 'documento'} (${d.responsavel || '—'} · ${dataBR(d.prazo)} · ${d.situacao})`).join(' | ') : '—'}</td></tr>
              <tr><th>Confirmação de eficácia</th><td>{tratamento.eficacia_relato || '—'}</td></tr>
              <tr><th>Auditoria de origem</th><td>{auditorias.find((a) => a.id === rpnc.sgq_auditoria_id)?.codigo_auditoria ?? '—'}</td></tr>
            </tbody>
          </table>

          <h2>Equipe de tratamento</h2>
          <table>
            <thead><tr><th>Nome</th><th>Função</th><th>Setor</th></tr></thead>
            <tbody>{tratamento.equipe.filter((m) => m.nome).map((m, i) => <tr key={i}><td>{m.nome}</td><td>{m.funcao}</td><td>{m.setor}</td></tr>)}
              {!tratamento.equipe.some((m) => m.nome) && <tr><td colSpan={3}>—</td></tr>}
            </tbody>
          </table>

          <h2>Anexo de evidências</h2>
          <table>
            <thead><tr><th>Arquivo</th><th>Finalidade</th><th>Tamanho</th></tr></thead>
            <tbody>{evidencias.map((e) => <tr key={e.id}><td>{e.nome_arquivo}</td><td>{e.finalidade === 'Acao' ? 'Ação CAPA' : 'Ocorrência'}</td><td>{tamanho(e.tamanho_bytes)}</td></tr>)}
              {!evidencias.length && <tr><td colSpan={3}>Nenhum arquivo arquivado.</td></tr>}
            </tbody>
          </table>

          <div className="qrf-sign">
            <span>Elaborado por</span><span>Chefe / Gerência</span><span>Representante da direção</span>
          </div>
        </section>
      )}
    </main>
  )
}

function CadeiaPorques({ rotulo, causa, porques, desabilitado, onCausa, onChange, onNiveis, onRemover }: {
  rotulo: string; causa?: string; porques: string[]; desabilitado: boolean;
  onCausa: (value: string) => void; onChange: (index: number, value: string) => void;
  onNiveis: (proximo: string[]) => void; onRemover?: () => void
}) {
  const ultimo = porques.length - 1
  return (
    <section className="space-y-2 rounded-[2px] border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-xs font-extrabold">{rotulo}</strong>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {`${porques.length} níveis · mínimo ${MINIMO_PORQUES}, máximo ${MAXIMO_PORQUES}`}
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" className="erp-btn" disabled={desabilitado || porques.length >= MAXIMO_PORQUES}
            onClick={() => onNiveis([...porques, ''])}><Plus size={13} /> Nível</button>
          <button type="button" className="erp-btn" disabled={desabilitado || porques.length <= MINIMO_PORQUES}
            onClick={() => onNiveis(porques.slice(0, -1))}>− Nível</button>
          {onRemover && <button type="button" className="erp-btn" disabled={desabilitado} onClick={onRemover}><Trash2 size={13} /> Remover cadeia</button>}
        </div>
      </div>
      <label className="qrf-field">Causa imediata
        <input className="erp-input" value={causa ?? ''} disabled={desabilitado} onChange={(e) => onCausa(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {porques.map((porque, index) => (
          <label key={index} className="qrf-field">
            {index + 1}º porquê{index === ultimo ? ' · causa raiz' : ''}
            <textarea className="erp-input qrf-textarea" value={porque} disabled={desabilitado}
              placeholder={index === 0 ? 'Por que o desvio ocorreu?' : 'Por que a resposta anterior aconteceu?'}
              onChange={(e) => onChange(index, e.target.value)} />
          </label>
        ))}
      </div>
    </section>
  )
}
