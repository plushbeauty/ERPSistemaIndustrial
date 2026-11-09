/**
 * @REVISAO: REV-TELAS-CONSISTENTES-20261108-01 — ordem do proprietário em 2026-11-08 ("vc ficou de arrumar a page controle de documentos"): o cabeçalho branco duplicado saiu e a abertura passa a ser o card navy padrão do shell; contadores e Atualizar ficam na barra de seleção; as três tabelas entram na régua clara global. Consultas, RPCs e as 7 abas não mudaram.
 * @REVISAO: REV-LIMITE-DE-LISTAGEM-VISIVEL-20261104-03 — distribuições (2000) e leituras (5000) eram cortadas no topo da lista e o percentual de conformidade de leitura era calculado sobre o trecho carregado, parecendo maior que o real. As duas tabelas de crescimento contínuo agora são lidas por paginação completa.
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-SGQ-DOCUMENTOS-7ABAS-20261102-01 — ordem do proprietário: Controle de Documentos da Qualidade em página única com 7 abas
 * @STATUS_APROVACAO: ESTRUTURA DE 7 ABAS AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-02
 */
/**
 * SYSNQRA SGQ — Controle de Documentos da Qualidade (ISO 9001:2015 item 7.5).
 * Backend real: erp_documentos_qualidade (+ _revisoes, _anexos, _solicitacoes, _aprovacoes,
 * _distribuicoes, _leituras), RPCs erp_qms_* (security definer, tenant pela sessão) e o bucket
 * privado erp-qualidade-anexos. Nenhuma aba usa dado simulado: se a consulta falhar, a tela mostra
 * a falha do Supabase em vez de inventar registro.
 */
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertTriangle, Archive, CheckCircle2, FileText, Paperclip, Printer, RefreshCw, Save, Search, Send, Upload, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Aba = 'cadastro' | 'anexos' | 'obsoletos' | 'revisoes' | 'visualizacao' | 'distribuicao' | 'impressao'

type Documento = {
  id: string
  codigo: string
  titulo: string
  area: string | null
  setor: string | null
  tipo: string | null
  revisao: number | null
  status: string | null
  conteudo: string | null
  motivo_alteracao: string | null
  distribuicao_controlada: boolean | null
  revisao_atual_id: string | null
  preparado_por: string | null
  revisado_por: string | null
  data_revisao: string | null
  data_emissao: string | null
  data_criacao: string | null
  validade_ate: string | null
  pdf_storage_path: string | null
}

type Revisao = {
  id: string
  documento_id: string
  revisao: number
  status: string
  titulo: string
  conteudo: string | null
  motivo_alteracao: string | null
  area: string | null
  setor: string | null
  tipo: string | null
  validade_ate: string | null
  criado_por: string | null
  revisado_por: string | null
  aprovado_por: string | null
  liberado_por: string | null
  criado_em: string
  revisado_em: string | null
  aprovado_em: string | null
  liberado_em: string | null
  data_efetiva: string | null
}

type Anexo = {
  id: string
  documento_id: string
  nome_arquivo: string
  storage_path: string
  tipo_mime: string | null
  tamanho_bytes: number | null
  revisao: number | null
  status: string
  data_vigencia: string | null
  motivo_obsolescencia: string | null
  substituido_por: string | null
  criado_por: string | null
  criado_em: string
}

type Solicitacao = { id: string; documento_id: string; solicitante_id: string; motivo: string; prioridade: string; status: string; criada_em: string }
type Aprovacao = { id: string; documento_id: string; revisao_id: string; aprovador_id: string; etapa: string; decisao: string; decidido_em: string }
type Distribuicao = { id: string; documento_id: string; revisao_id: string; setor_id: string; distribuido_em: string }
type Leitura = { id: string; documento_id: string; revisao_id: string; distribuicao_id: string; usuario_id: string; leitura_obrigatoria: boolean; lido_em: string | null }
type Setor = { id: string; nome: string }
type Usuario = { id: string; nome: string }
type Permissao = {
  usuario_id: string | null
  setor_id: string | null
  visualizar: boolean
  criar: boolean
  editar: boolean
  excluir: boolean
  solicitar_alteracao: boolean
  revisar: boolean
  aprovar: boolean
  liberar: boolean
  bloquear: boolean
}

const ABAS: Array<{ value: Aba; label: string }> = [
  { value: 'cadastro', label: '1 · Cadastro de Documentos' },
  { value: 'anexos', label: '2 · Anexos' },
  { value: 'obsoletos', label: '3 · Documentos Obsoletos' },
  { value: 'revisoes', label: '4 · Revisões e Aprovações' },
  { value: 'visualizacao', label: '5 · Visualização' },
  { value: 'distribuicao', label: '6 · Distribuição e Consulta' },
  { value: 'impressao', label: '7 · Impressão e Relatórios' },
]

const TIPOS = ['Procedimento', 'Instrução de Trabalho', 'Formulário', 'Manual', 'Planilha', 'Registro', 'Especificação', 'Política']
const ESTADOS_DOCUMENTO = ['rascunho', 'em_revisao', 'aprovada', 'vigente', 'substituida', 'obsoleta', 'bloqueada']

const campo = 'h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-slate-100'
const rotulo = 'grid min-w-0 gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500'
const botao = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 hover:border-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-40'
const botaoPrimario = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] bg-[#123B50] px-3 text-[11px] font-extrabold text-white hover:bg-[#1D5F7A] disabled:cursor-not-allowed disabled:opacity-40'
const painel = 'rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm'
const grade = 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5'

const falha = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'Operação não concluída. Verifique o log do Supabase e as permissões RLS.'

const dataBr = (valor: string | null | undefined): string => {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
const dia = (valor: string | null | undefined): string => (valor ? valor.slice(0, 10) : '—')
const hoje = (): string => new Date().toISOString().slice(0, 10)

function corStatus(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase()
  if (['vigente', 'liberada', 'aprovada', 'concluida'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (['rascunho', 'aberta'].includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200'
  if (['em_revisao', 'solicitada_alteracao', 'em_analise'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (['substituida', 'obsoleta', 'rejeitada', 'cancelada'].includes(s)) return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-sky-50 text-sky-700 border-sky-200'
}

function Etiqueta({ children }: { children: ReactNode }) {
  const cls = String(children ?? '').toLowerCase()
  return <span className={`inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[10px] font-bold ${corStatus(cls)}`}>{children}</span>
}

function nomeDaLista(lista: Array<{ id: string; nome: string }>, id: string | null): string {
  if (!id) return '—'
  return lista.find((x) => x.id === id)?.nome ?? id.slice(0, 8)
}

const VIGA_FORM = { codigo: '', titulo: '', area: '', setor: '', tipo: 'Procedimento', conteudo: '', motivo: '', validade: '' }

export default function DocumentosQualidadeControle() {
  const [aba, setAba] = useState<Aba>('cadastro')
  const [empresaId, setEmpresaId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [setorProprio, setSetorProprio] = useState<string | null>(null)
  const [nivelAdmin, setNivelAdmin] = useState(0)
  const [permissoes, setPermissoes] = useState<Permissao | null>(null)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [revisoes, setRevisoes] = useState<Revisao[]>([])
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([])
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[]>([])
  const [leituras, setLeituras] = useState<Leitura[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const [selecionado, setSelecionado] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [formAberto, setFormAberto] = useState(false)
  const [form, setForm] = useState(VIGA_FORM)
  const [editandoRascunho, setEditandoRascunho] = useState(false)
  const [motivoRevisao, setMotivoRevisao] = useState('')
  const [motivoSolicitacao, setMotivoSolicitacao] = useState('')
  const [prioridade, setPrioridade] = useState('normal')
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([])

  const [carregando, setCarregando] = useState(true)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const pode = useCallback((acao: keyof Permissao): boolean => {
    if (nivelAdmin >= 9 && acao !== 'excluir') return true
    return Boolean(permissoes?.[acao])
  }, [nivelAdmin, permissoes])

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true)
    setErro('')
    try {
      const sessao = await supabase.rpc('erp_qms_current_user')
      if (sessao.error) throw sessao.error
      const linhaSessao = (sessao.data as Array<{ usuario_id: string; empresa_id: string; setor_id: string | null; nivel_admin: number }> | null)?.[0]
      if (!linhaSessao) throw new Error('Sessão ERP inválida: não foi possível identificar usuário e empresa pelo Supabase.')
      const empresa = linhaSessao.empresa_id
      setEmpresaId(empresa)
      setUsuarioId(linhaSessao.usuario_id)
      setSetorProprio(linhaSessao.setor_id)
      setNivelAdmin(Number(linhaSessao.nivel_admin ?? 0))

      const [doc, rev, anexo, req, apr, dist, read, set_, usr, perm] = await Promise.all([
        supabase.from('erp_documentos_qualidade').select('id,codigo,titulo,area,setor,tipo,revisao,status,conteudo,motivo_alteracao,distribuicao_controlada,revisao_atual_id,preparado_por,revisado_por,data_revisao,data_emissao,data_criacao,validade_ate,pdf_storage_path').eq('empresa_id', empresa).order('codigo'),
        supabase.from('erp_documentos_qualidade_revisoes').select('id,documento_id,revisao,status,titulo,conteudo,motivo_alteracao,area,setor,tipo,validade_ate,criado_por,revisado_por,aprovado_por,liberado_por,criado_em,revisado_em,aprovado_em,liberado_em,data_efetiva').eq('empresa_id', empresa).order('revisao', { ascending: false }),
        supabase.from('erp_documentos_qualidade_anexos').select('id,documento_id,nome_arquivo,storage_path,tipo_mime,tamanho_bytes,revisao,status,data_vigencia,motivo_obsolescencia,substituido_por,criado_por,criado_em').eq('empresa_id', empresa).order('revisao', { ascending: false }),
        supabase.from('erp_documentos_qualidade_solicitacoes').select('id,documento_id,solicitante_id,motivo,prioridade,status,criada_em').eq('empresa_id', empresa).order('criada_em', { ascending: false }).limit(500),
        supabase.from('erp_documentos_qualidade_aprovacoes').select('id,documento_id,revisao_id,aprovador_id,etapa,decisao,decidido_em').eq('empresa_id', empresa).order('decidido_em', { ascending: false }).limit(500),
        fetchAllPages<Distribuicao>((from, to) => supabase.from('erp_documentos_qualidade_distribuicoes').select('id,documento_id,revisao_id,setor_id,distribuido_em', { count: 'exact' }).eq('empresa_id', empresa).order('distribuido_em', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Leitura>((from, to) => supabase.from('erp_documentos_qualidade_leituras').select('id,documento_id,revisao_id,distribuicao_id,usuario_id,leitura_obrigatoria,lido_em', { count: 'exact' }).eq('empresa_id', empresa).order('id').range(from, to)),
        supabase.from('erp_setores').select('id,nome').eq('empresa_id', empresa).eq('ativo', true).order('nome'),
        supabase.from('erp_usuarios').select('id,nome').eq('empresa_id', empresa).eq('ativo', true).is('deleted_at', null).order('nome').limit(2000),
        supabase.from('erp_permissoes_modulos').select('usuario_id,setor_id,visualizar,criar,editar,excluir,solicitar_alteracao,revisar,aprovar,liberar,bloquear').eq('empresa_id', empresa).eq('modulo', 'qualidade_documentos'),
      ])
      const primeira = [doc, rev, anexo, req, apr, set_, usr, perm].find((r) => r.error)
      if (primeira?.error) throw primeira.error

      const listaDocs = (doc.data ?? []) as Documento[]
      setDocumentos(listaDocs)
      setRevisoes((rev.data ?? []) as Revisao[])
      setAnexos((anexo.data ?? []) as Anexo[])
      setSolicitacoes((req.data ?? []) as Solicitacao[])
      setAprovacoes((apr.data ?? []) as Aprovacao[])
      setDistribuicoes(dist)
      setLeituras(read)
      setSetores((set_.data ?? []) as Setor[])
      setUsuarios((usr.data ?? []) as Usuario[])

      const linhasPerm = (perm.data ?? []) as Permissao[]
      setPermissoes(linhasPerm.find((p) => p.usuario_id === linhaSessao.usuario_id)
        ?? linhasPerm.find((p) => p.usuario_id === null && linhaSessao.setor_id && p.setor_id === linhaSessao.setor_id)
        ?? null)
      setSelecionado((atual) => atual || listaDocs[0]?.id || '')
    } catch (cause) {
      setErro(falha(cause))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const documentosVisiveis = useMemo(() => documentos.filter((d) => {
    const termo = busca.trim().toLowerCase()
    const bate = !termo || [d.codigo, d.titulo, d.area, d.setor, d.tipo, d.conteudo].some((v) => String(v ?? '').toLowerCase().includes(termo))
    return bate && (filtroStatus === 'TODOS' || String(d.status ?? '').toLowerCase() === filtroStatus)
  }), [documentos, busca, filtroStatus])

  const doc = useMemo(() => documentos.find((d) => d.id === selecionado) ?? null, [documentos, selecionado])
  const revisoesDoDoc = useMemo(() => revisoes.filter((r) => r.documento_id === selecionado), [revisoes, selecionado])
  const rascunho = useMemo(() => revisoesDoDoc.find((r) => r.status === 'rascunho') ?? null, [revisoesDoDoc])
  const vigente = useMemo(() => revisoesDoDoc.find((r) => r.status === 'vigente') ?? null, [revisoesDoDoc])
  const anexosDoDoc = useMemo(() => anexos.filter((a) => a.documento_id === selecionado), [anexos, selecionado])

  const pendenciasPessoais = useMemo(() => leituras.filter((l) => l.usuario_id === usuarioId && !l.lido_em && l.leitura_obrigatoria), [leituras, usuarioId])

  const obsoletos = useMemo(() => {
    const hojeIso = hoje()
    const vencidos = documentos.filter((d) => d.validade_ate && d.validade_ate.slice(0, 10) < hojeIso && String(d.status) !== 'obsoleta')
    const declarados = documentos.filter((d) => ['obsoleta', 'substituida', 'bloqueada'].includes(String(d.status ?? '').toLowerCase()))
    const revisoesSubstituidas = revisoes.filter((r) => ['substituida', 'obsoleta'].includes(String(r.status).toLowerCase()))
    return { vencidos, declarados, revisoesSubstituidas }
  }, [documentos, revisoes])

  const referenciasPorObsoleto = useMemo(() => {
    const lista = [...obsoletos.declarados, ...obsoletos.vencidos]
    return lista.map((d) => {
      const alvo = d.codigo.trim().toUpperCase()
      const citantes = documentos.filter((x) => x.id !== d.id && String(x.status ?? '').toLowerCase() === 'vigente'
        && (`${x.conteudo ?? ''} ${x.motivo_alteracao ?? ''}`).toUpperCase().includes(alvo))
      return { documento: d, citantes }
    }).filter((r) => r.citantes.length > 0)
  }, [obsoletos, documentos])

  function abrirNovo(): void {
    setForm(VIGA_FORM)
    setEditandoRascunho(false)
    setErro('')
    setAviso('')
    setFormAberto(true)
  }

  function abrirRascunho(): void {
    if (!doc) return
    const base = rascunho ?? vigente ?? null
    setForm({
      codigo: doc.codigo,
      titulo: base?.titulo ?? doc.titulo,
      area: base?.area ?? doc.area ?? '',
      setor: base?.setor ?? doc.setor ?? '',
      tipo: base?.tipo ?? doc.tipo ?? 'Procedimento',
      conteudo: base?.conteudo ?? doc.conteudo ?? '',
      motivo: base?.motivo_alteracao ?? doc.motivo_alteracao ?? '',
      validade: base?.validade_ate ? String(base.validade_ate).slice(0, 10) : (doc.validade_ate ? String(doc.validade_ate).slice(0, 10) : ''),
    })
    setEditandoRascunho(Boolean(rascunho))
    setErro('')
    setAviso('')
    setFormAberto(true)
  }

  async function executar(rotulo: string, trabalho: () => Promise<string>): Promise<void> {
    setErro('')
    setAviso('')
    setGravando(true)
    try {
      setAviso(await trabalho())
    } catch (cause) {
      setErro(`${rotulo}: ${falha(cause)}`)
    } finally {
      setGravando(false)
    }
  }

  async function salvarDocumento(): Promise<void> {
    if (!form.codigo.trim() || !form.titulo.trim() || !form.motivo.trim()) {
      setErro('Código, título e motivo da alteração são obrigatórios pelo controle de documentos.')
      return
    }
    await executar('Não foi possível gravar o documento', async () => {
      if (doc && editandoRascunho) {
        const r = await supabase.rpc('erp_qms_salvar_revisao', {
          p_documento_id: doc.id,
          p_titulo: form.titulo.trim(),
          p_departamento: form.area.trim(),
          p_setor: form.setor.trim(),
          p_tipo: form.tipo,
          p_conteudo: form.conteudo,
          p_motivo: form.motivo.trim(),
          p_validade: form.validade || null,
        })
        if (r.error) throw r.error
        await carregar()
        return 'Rascunho da revisão salvo no Supabase. O conteúdo só muda enquanto a revisão estiver em rascunho.'
      }
      const r = await supabase.rpc('erp_qms_criar_documento', {
        p_codigo: form.codigo.trim(),
        p_titulo: form.titulo.trim(),
        p_departamento: form.area.trim(),
        p_tipo: form.tipo,
        p_conteudo: form.conteudo,
        p_motivo: form.motivo.trim(),
      })
      if (r.error) throw r.error
      const criado = r.data as { documento_id: string } | null
      if (criado?.documento_id) setSelecionado(criado.documento_id)
      await carregar()
      setFormAberto(false)
      return `Documento ${form.codigo.trim()} criado como revisão 1 em rascunho.`
    })
  }

  async function criarRevisao(): Promise<void> {
    if (!doc) return
    if (!motivoRevisao.trim()) {
      setErro('Informe o motivo da nova revisão (rastreabilidade exigida pelo SGQ).')
      return
    }
    await executar('Não foi possível abrir a revisão', async () => {
      const r = await supabase.rpc('erp_qms_criar_revisao', { p_documento_id: doc.id, p_motivo: motivoRevisao.trim() })
      if (r.error) throw r.error
      setMotivoRevisao('')
      await carregar()
      const numero = (r.data as { revisao: number } | null)?.revisao
      return `Nova revisão ${numero ?? ''} em rascunho. Edite o conteúdo na aba 1 antes de enviar para análise.`
    })
  }

  async function transicionar(revisaoId: string, acao: 'enviar_revisao' | 'aprovar' | 'liberar'): Promise<void> {
    const rotulo = acao === 'enviar_revisao' ? 'enviar para revisão' : acao === 'aprovar' ? 'aprovar' : 'liberar como vigente'
    await executar(`Falha ao ${rotulo}`, async () => {
      const r = await supabase.rpc('erp_qms_transicionar_revisao', { p_revision_id: revisaoId, p_acao: acao })
      if (r.error) throw r.error
      await carregar()
      return acao === 'liberar'
        ? 'Revisão liberada e vigente. As anteriores foram marcadas como substituídas pelo banco, com efeito no documento.'
        : `Revisão movida para o estado ${String((r.data as { status: string } | null)?.status ?? '')}.`
    })
  }

  async function solicitarAlteracao(): Promise<void> {
    if (!doc) return
    if (!motivoSolicitacao.trim()) {
      setErro('Descreva o motivo da solicitação de alteração.')
      return
    }
    await executar('Falha ao registrar a solicitação', async () => {
      const r = await supabase.from('erp_documentos_qualidade_solicitacoes').insert({
        empresa_id: empresaId,
        documento_id: doc.id,
        solicitante_id: usuarioId,
        setor_solicitante_id: setorProprio,
        motivo: motivoSolicitacao.trim(),
        prioridade,
      }).select('id,documento_id,solicitante_id,motivo,prioridade,status,criada_em').single()
      if (r.error) throw r.error
      setMotivoSolicitacao('')
      await carregar()
      return `Solicitação ${String(r.data.id).slice(0, 8)} aberta para o documento ${doc.codigo}.`
    })
  }

  function escolherSetor(id: string): void {
    setSetoresSelecionados((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id])
  }

  async function distribuir(): Promise<void> {
    if (!vigente) {
      setErro('Somente uma revisão vigente e com conteúdo pode ser distribuída.')
      return
    }
    if (setoresSelecionados.length === 0) {
      setErro('Selecione ao menos um setor destinatário.')
      return
    }
    await executar('Falha na distribuição', async () => {
      const r = await supabase.rpc('erp_qms_distribuir_revisao', { p_revision_id: vigente.id, p_setores: setoresSelecionados })
      if (r.error) throw r.error
      setSetoresSelecionados([])
      await carregar()
      return `Revisão ${vigente.revisao} distribuída para ${setoresSelecionados.length} setor(es); ${Number(r.data ?? 0)} leitura(s) obrigatória(s) atribuída(s).`
    })
  }

  async function confirmarLeitura(leituraId: string): Promise<void> {
    await executar('Falha ao registrar a ciência de leitura', async () => {
      const r = await supabase.rpc('erp_qms_confirmar_leitura', { p_leitura_id: leituraId })
      if (r.error) throw r.error
      await carregar()
      return `Leitura registrada em ${dataBr(String(r.data))}. A ciência ficou auditada no banco.`
    })
  }

  async function abrirAnexo(caminho: string): Promise<void> {
    await executar('Falha ao abrir o PDF', async () => {
      const r = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(caminho, 600)
      if (r.error) throw r.error
      window.open(r.data.signedUrl, '_blank', 'noopener')
      return 'Arquivo aberto por URL assinada de 10 minutos; o bucket permanece privado.'
    })
  }

  async function enviarAnexo(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file || !doc) {
      setErro('Selecione o documento e um arquivo PDF antes de enviar.')
      return
    }
    event.target.value = ''
    await executar('Falha ao anexar o PDF', async () => {
      const limpo = file.name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
      const caminho = `${empresaId}/${doc.id}/${crypto.randomUUID()}-${limpo}`
      const mime = file.type || 'application/pdf'
      const up = await supabase.storage.from('erp-qualidade-anexos').upload(caminho, file, { contentType: mime, upsert: false })
      if (up.error) throw up.error
      try {
        const r = await supabase.rpc('erp_documento_qualidade_anexo_substituir', {
          p_documento_id: doc.id,
          p_nome_arquivo: file.name,
          p_storage_path: caminho,
          p_tipo_mime: mime,
          p_tamanho_bytes: file.size,
        })
        if (r.error) throw r.error
        await carregar()
        const numero = (r.data as { revisao: number } | null)?.revisao
        return `PDF anexado como revisão ${numero ?? ''} do documento ${doc.codigo}; a versão anterior virou obsoleta e permaneceu auditável.`
      } catch (cause) {
        try { await supabase.storage.from('erp-qualidade-anexos').remove([caminho]) } catch { /* mantém o erro original do banco */ }
        throw cause
      }
    })
  }

  function janela(html: string): void {
    const w = window.open('', '_blank', 'width=900,height=1100')
    if (!w) {
      setErro('O navegador bloqueou a janela de impressão. Autorize pop-ups para gerar o PDF.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  function imprimirCopia(): void {
    if (!doc) return
    const rev = vigente ?? rascunho ?? revisoesDoDoc[0]
    const anexosAtivos = anexosDoDoc.filter((a) => a.status === 'vigente')
    const controlado = String(doc.status ?? '').toLowerCase() === 'vigente' && doc.distribuicao_controlada !== false
    const cabecalho = `
      <table><tr><td>Código</td><td>${doc.codigo}</td><td>Título</td><td>${doc.titulo}</td></tr>
      <tr><td>Tipo</td><td>${doc.tipo ?? '—'}</td><td>Área / Setor</td><td>${doc.area ?? '—'} / ${doc.setor ?? '—'}</td></tr>
      <tr><td>Revisão</td><td>${rev?.revisao ?? doc.revisao ?? '—'}</td><td>Status</td><td>${rev?.status ?? doc.status ?? '—'}</td></tr>
      <tr><td>Emissão</td><td>${dia(doc.data_emissao)}</td><td>Última revisão</td><td>${dataBr(doc.data_revisao)}</td></tr>
      <tr><td>Validade</td><td>${dia(doc.validade_ate)}</td><td>Preparado por</td><td>${nomeDaLista(usuarios, doc.preparado_por)}</td></tr>
      <tr><td>Revisado por</td><td>${nomeDaLista(usuarios, doc.revisado_por)}</td><td>Liberado por</td><td>${nomeDaLista(usuarios, rev?.liberado_por ?? null)}</td></tr>
      <tr><td>Conteúdo da revisão</td><td colspan="3">${rev?.motivo_alteracao ?? doc.motivo_alteracao ?? '—'}</td></tr>
      <tr><td>Anexos vigentes</td><td colspan="3">${anexosAtivos.map((a) => `${a.nome_arquivo} (rev. ${a.revisao ?? '—'})`).join('; ') || 'nenhum'}</td></tr></table>`
    const corpo = (rev?.conteudo ?? doc.conteudo ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const rodape = `<div class="carimbo">${controlado ? 'CÓPIA CONTROLADA — válida apenas conferida no SYSNQRA' : 'CÓPIA NÃO CONTROLADA — conferir revisão vigente no SYSNQRA'}</div>
      <div class="assin"><div>Elaborado / Revisado</div><div>Aprovado / Liberado</div><div>Leitura obrigatória registrada no sistema</div></div>
      <p class="nota">A impressão em PDF não constitui assinatura digital certificada. Documento impresso é cópia não controlada conforme ISO 9001:2015 item 7.5.3.</p>`
    janela(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${doc.codigo} · ${doc.titulo}</title>
      <style>@page{size:A4;margin:14mm}body{font:11px Arial;color:#203b49}h1{font-size:19px;color:#123B50;margin:0}
      header{border-bottom:3px solid #2D8DB8;padding-bottom:10px;margin-bottom:12px}.mk{font-size:9px;font-weight:900;letter-spacing:.12em;color:#2D8DB8}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}td{border:1px solid #cbd8de;padding:6px;vertical-align:top}
      td:nth-child(odd){width:16%;font-weight:bold;background:#f4f8fa}
      pre{white-space:pre-wrap;font:11px Arial;border:1px solid #cbd8de;padding:10px;background:#fff}
      .carimbo{margin-top:18px;border:2px dashed #b4443c;color:#b4443c;padding:8px;text-align:center;font-weight:900;font-size:12px}
      .assin{display:flex;gap:18px;margin-top:34px}.assin div{border-top:1px solid #72858e;padding-top:6px;width:33%;font-size:10px}
      .nota{font-size:9px;color:#647b86;margin-top:14px}</style>
      <body><header><div class="mk">SYSNQRA · SISTEMA DE GESTÃO DA QUALIDADE · DOCUMENTO CONTROLADO</div><h1>${doc.titulo}</h1></header>
      ${cabecalho}<h2>Conteúdo</h2><pre>${corpo || '(sem conteúdo-texto; consulte o anexo PDF vigente)'}</pre>${rodape}</body></html>`)
  }

  function imprimirMestre(): void {
    const linhas = documentosVisiveis.map((d) => `<tr><td>${d.codigo}</td><td>${d.titulo}</td><td>${d.tipo ?? '—'}</td><td>${d.area ?? '—'}</td>
      <td>${d.revisao ?? '—'}</td><td>${d.status ?? '—'}</td><td>${dia(d.data_emissao)}</td><td>${dia(d.validade_ate)}</td>
      <td>${anexos.filter((a) => a.documento_id === d.id && a.status === 'vigente').length}</td>
      <td>${distribuiçõesContagem(d.id)}</td></tr>`).join('')
    janela(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Lista mestre de documentos</title>
      <style>@page{size:A4 landscape;margin:10mm}body{font:10px Arial;color:#203b49}h1{font-size:17px;color:#123B50}
      table{width:100%;border-collapse:collapse}th{background:#123B50;color:#fff;padding:5px;text-align:left}
      td{border-bottom:1px solid #dbe3e8;padding:4px}tr:nth-child(even) td{background:#f7fafc}</style>
      <body><h1>Lista mestre de documentos da qualidade</h1><p>Emitido em ${new Date().toLocaleString('pt-BR')} · ${documentosVisiveis.length} documento(s) da empresa ativa.</p>
      <table><thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Área</th><th>Rev.</th><th>Status</th><th>Emissão</th><th>Validade</th><th>Anexos</th><th>Distribuições</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="10">Nenhum documento para o filtro aplicado.</td></tr>'}</tbody></table></body></html>`)
  }

  function imprimirDistribuicao(): void {
    const linhas = distribuicoes.map((x) => {
      const d = documentos.find((y) => y.id === x.documento_id)
      const rev = revisoes.find((y) => y.id === x.revisao_id)
      const doLeituras = leituras.filter((l) => l.distribuicao_id === x.id)
      const lidas = doLeituras.filter((l) => l.lido_em).length
      return `<tr><td>${d?.codigo ?? '—'}</td><td>${d?.titulo ?? '—'}</td><td>${rev?.revisao ?? '—'}</td>
        <td>${nomeDaLista(setores, x.setor_id)}</td><td>${dataBr(x.distribuido_em)}</td>
        <td>${doLeituras.length}</td><td>${lidas}</td><td>${doLeituras.length - lidas}</td>
        <td>${doLeituras.length === lidas ? 'CONFORME' : 'PENDENTE'}</td></tr>`
    }).join('')
    janela(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Controle de distribuição e leitura</title>
      <style>@page{size:A4 landscape;margin:10mm}body{font:10px Arial;color:#203b49}h1{font-size:17px;color:#123B50}
      table{width:100%;border-collapse:collapse}th{background:#123B50;color:#fff;padding:5px;text-align:left}
      td{border-bottom:1px solid #dbe3e8;padding:4px}</style>
      <body><h1>Distribuição controlada e ciência de leitura</h1>
      <p>Emitido em ${new Date().toLocaleString('pt-BR')} · ${distribuicoes.length} distribuição(ões) no período consultado.</p>
      <table><thead><tr><th>Código</th><th>Documento</th><th>Rev.</th><th>Setor</th><th>Distribuído em</th><th>Leituras</th><th>Lidas</th><th>Pendentes</th><th>Situação</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="9">Nenhuma distribuição registrada. Use a aba 6 para distribuir uma revisão vigente.</td></tr>'}</tbody></table></body></html>`)
  }

  function distribuiçõesContagem(documentoId: string): number {
    return distribuicoes.filter((x) => x.documento_id === documentoId).length
  }

  return (
    <main className="space-y-3 p-2 text-slate-800">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-[2px] border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">{documentos.length} documento(s)</span>
        <span className="rounded-[2px] border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">{revisoes.filter((r) => r.status === 'rascunho').length} rascunho(s)</span>
        <span className={`rounded-[2px] border px-2 py-1 text-[10px] font-bold ${pode('aprovar') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{pode('aprovar') ? 'pode aprovar' : 'sem permissão de aprovação'}</span>
        <button type="button" className={botao} onClick={() => void carregar()} disabled={carregando}><RefreshCw size={13} /> Atualizar</button>
      </div>

      {erro && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{erro}</span></div>}
      {aviso && <div role="status" className="flex items-start gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{aviso}</span></div>}

      <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Abas do controle de documentos">
        {ABAS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={aba === t.value} onClick={() => setAba(t.value)}
            className={`h-8 rounded-[2px] border px-3 text-[11px] font-extrabold ${aba === t.value ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-[#2D8DB8]'}`}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[10px] text-slate-500">{pendenciasPessoais.length} leitura(s) obrigatória(s) pendente(s) para você</span>
      </nav>

      <section className={`${painel} flex flex-wrap items-center gap-2`}>
        <label className="min-w-56 flex-1"><span className="sr-only">Documento selecionado</span>
          <select className={campo} value={selecionado} onChange={(e) => { setSelecionado(e.target.value); setSetoresSelecionados([]) }}>
            <option value="">— selecione um documento cadastrado —</option>
            {documentos.map((d) => <option key={d.id} value={d.id}>{d.codigo} · {d.titulo} · rev. {d.revisao ?? '—'} · {d.status ?? '—'}</option>)}
          </select>
        </label>
        <button type="button" className={botaoPrimario} onClick={abrirNovo} disabled={!pode('criar') || gravando}><FileText size={13} /> Novo documento</button>
        <button type="button" className={botao} onClick={abrirRascunho} disabled={!doc || gravando}><Save size={13} /> {rascunho ? 'Editar rascunho' : 'Editar conteúdo'}</button>
        <button type="button" className={botao} onClick={() => void criarRevisao()} disabled={!doc || !pode('editar') || gravando}><RefreshCw size={13} /> Abrir nova revisão</button>
      </section>

      {aba === 'cadastro' && (
        <div className="space-y-3">
          <section className={`${painel} flex flex-wrap gap-2`}>
            <label className="relative min-w-64 flex-1"><Search size={13} className="absolute left-2 top-2.5 text-slate-400" />
              <input className={campo} placeholder="buscar por código, título, área, conteúdo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            <select className={`${campo} w-52`} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="TODOS">Todos os status</option>
              {ESTADOS_DOCUMENTO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="self-center text-[10px] text-slate-500">{documentosVisiveis.length} de {documentos.length}</span>
          </section>

          {formAberto && (
            <section className={painel}>
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-extrabold">{editandoRascunho ? `Rascunho da revisão ${rascunho?.revisao ?? ''} · ${doc?.codigo ?? ''}` : 'Novo documento controlado'}</h2>
                <button type="button" className={botao} onClick={() => setFormAberto(false)}><X size={13} /> Fechar</button>
              </div>
              <div className={grade}>
                <label className={rotulo}>Código<input className={campo} value={form.codigo} disabled={editandoRascunho} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="PRO-001" /></label>
                <label className={rotulo}>Título<input className={campo} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
                <label className={rotulo}>Área / Departamento<input className={campo} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="QUALIDADE" /></label>
                <label className={rotulo}>Setor<input className={campo} value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="INJEÇÃO" /></label>
                <label className={rotulo}>Tipo<select className={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
                <label className={rotulo}>Validade até<input type="date" className={campo} value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></label>
                <label className={`${rotulo} xl:col-span-4`}>Motivo da alteração / revisão<input className={campo} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Emissão inicial conforme plano de documentação" /></label>
                <label className={`${rotulo} xl:col-span-5`}>Conteúdo do documento
                  <textarea className="min-h-40 w-full rounded-[2px] border border-slate-300 p-2 text-xs normal-case text-slate-800 outline-none focus:border-[#2D8DB8]" value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder="Procedimento em texto. O PDF do formulário entra na aba 2 · Anexos." />
                </label>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">A gravação usa as RPCs <b>erp_qms_criar_documento</b> / <b>erp_qms_salvar_revisao</b>: código único por empresa, rascunho obrigatório e autor pela sessão.</p>
                <button type="button" className={botaoPrimario} onClick={() => void salvarDocumento()} disabled={gravando}><Save size={13} /> {gravando ? 'Gravando…' : 'Gravar no Supabase'}</button>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white"><tr>{['Código', 'Título', 'Tipo', 'Área / Setor', 'Rev.', 'Status', 'Emissão', 'Validade', 'Anexos', 'Selecionar'].map((h) => <th key={h} className="p-2.5 font-bold">{h}</th>)}</tr></thead>
                <tbody>
                  {documentosVisiveis.map((d) => (
                    <tr key={d.id} className={`cursor-pointer border-t border-slate-100 even:bg-slate-50 ${d.id === selecionado ? 'bg-[#e8f5fb]' : ''}`} onClick={() => setSelecionado(d.id)}>
                      <td className="whitespace-nowrap p-2.5 font-mono font-bold">{d.codigo}</td>
                      <td className="max-w-96 p-2.5">{d.titulo}</td>
                      <td className="p-2.5">{d.tipo ?? '—'}</td>
                      <td className="p-2.5">{d.area ?? '—'} / {d.setor ?? '—'}</td>
                      <td className="p-2.5 text-right tabular-nums">{d.revisao ?? '—'}</td>
                      <td className="p-2.5"><Etiqueta>{d.status ?? 'sem status'}</Etiqueta></td>
                      <td className="whitespace-nowrap p-2.5">{dia(d.data_emissao)}</td>
                      <td className="whitespace-nowrap p-2.5">{dia(d.validade_ate)}</td>
                      <td className="p-2.5 text-right tabular-nums">{anexos.filter((a) => a.documento_id === d.id && a.status === 'vigente').length}</td>
                      <td className="whitespace-nowrap p-2.5"><button type="button" className={botao} onClick={(e) => { e.stopPropagation(); setSelecionado(d.id); setAba('visualizacao') }}><FileText size={12} /> Abrir</button></td>
                    </tr>
                  ))}
                  {!documentosVisiveis.length && <tr><td colSpan={10} className="p-4 text-xs text-slate-500">{carregando ? 'Consultando o Supabase…' : 'Nenhum documento no filtro atual ou o usuário não tem permissão de leitura do módulo.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {aba === 'anexos' && (
        <div className="space-y-3">
          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Anexos do documento {doc ? doc.codigo : '— não selecionado —'}</h2>
            {!doc ? <p className="text-xs text-slate-500">Selecione um documento na barra acima para trabalhar os anexos.</p> : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`${botao} cursor-pointer`}><Upload size={13} /> Enviar PDF novo
                    <input type="file" accept="application/pdf" className="hidden" disabled={gravando} onChange={(e) => void enviarAnexo(e)} />
                  </label>
                  <span className="text-[10px] text-slate-500">A RPC <b>erp_documento_qualidade_anexo_substituir</b> marca a versão anterior como obsoleta, grava a nova como vigente e mantém histórico auditável. Somente PDF, no bucket privado <b>erp-qualidade-anexos</b>.</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600"><tr>{['Rev.', 'Arquivo', 'Status', 'Vigência', 'Tamanho', 'Obsoleto por', 'Ações'].map((h) => <th key={h} className="p-2 text-[10px] font-bold uppercase">{h}</th>)}</tr></thead>
                  <tbody>
                    {anexosDoDoc.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="p-2 tabular-nums">{a.revisao ?? '—'}</td>
                        <td className="max-w-80 truncate p-2">{a.nome_arquivo}</td>
                        <td className="p-2"><Etiqueta>{a.status}</Etiqueta></td>
                        <td className="whitespace-nowrap p-2">{dia(a.data_vigencia)}</td>
                        <td className="p-2 tabular-nums">{a.tamanho_bytes ? `${(a.tamanho_bytes / 1024).toFixed(0)} KB` : '—'}</td>
                        <td className="max-w-72 p-2 text-[11px] text-slate-500">{a.motivo_obsolescencia ?? '—'}</td>
                        <td className="whitespace-nowrap p-2"><button type="button" className={botao} onClick={() => void abrirAnexo(a.storage_path)} disabled={gravando}><Paperclip size={12} /> Ver PDF</button></td>
                      </tr>
                    ))}
                    {!anexosDoDoc.length && <tr><td colSpan={7} className="p-3 text-xs text-slate-500">Nenhum anexo para este documento.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {aba === 'obsoletos' && (
        <div className="space-y-3">
          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Alerta de obsolescência para documentos que referenciam</h2>
            {referenciasPorObsoleto.length ? (
              <ul className="space-y-1 text-[11px] text-slate-700">
                {referenciasPorObsoleto.map((r) => (
                  <li key={r.documento.id} className="rounded-[2px] border border-amber-200 bg-amber-50 p-2">
                    <b>{r.documento.codigo}</b> ({r.documento.status === 'vigente' ? 'vencido' : r.documento.status}) é citado por{' '}
                    {r.citantes.map((c) => `${c.codigo}${c.id === r.citantes[r.citantes.length - 1].id ? '' : ', '}`).join('')} — abrir revisão nesses documentos.
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-500">Nenhum documento vigente cita código obsoleto ou vencido na base consultada.</p>}
          </section>

          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Documentos vencidos (validade expirada)</h2>
            <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{['Código', 'Título', 'Validade', 'Dias vencido', 'Ação'].map((h) => <th key={h} className="p-2 text-[10px] font-bold uppercase">{h}</th>)}</tr></thead>
              <tbody>{obsoletos.vencidos.map((d) => {
                const diasVencido = Math.max(0, Math.round((Date.now() - new Date(String(d.validade_ate)).getTime()) / 86400000))
                return <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono font-bold">{d.codigo}</td><td className="p-2">{d.titulo}</td>
                  <td className="p-2">{dia(d.validade_ate)}</td><td className="p-2 tabular-nums">{diasVencido}</td>
                  <td className="p-2"><button type="button" className={botao} onClick={() => { setSelecionado(d.id); setAba('revisoes') }}><Archive size={12} /> Revisar</button></td>
                </tr>
              })}{!obsoletos.vencidos.length && <tr><td colSpan={5} className="p-3 text-xs text-slate-500">Nenhum documento com validade vencida.</td></tr>}</tbody></table>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <div className={painel}>
              <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Documentos declarados obsoletos / substituídos / bloqueados</h2>
              <ul className="space-y-1 text-[11px]">{obsoletos.declarados.map((d) => <li key={d.id} className="flex items-center gap-2"><Etiqueta>{d.status}</Etiqueta><b>{d.codigo}</b><span>{d.titulo}</span></li>)}
                {!obsoletos.declarados.length && <li className="text-slate-500">Nada declarado obsoleto.</li>}</ul>
            </div>
            <div className={painel}>
              <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Revisões substituídas e anexos obsoletos</h2>
              <p className="text-[11px] text-slate-600">{obsoletos.revisoesSubstituidas.length} revisão(ões) substituída(s) e {anexos.filter((a) => a.status === 'obsoleto').length} anexo(s) obsoleto(s) mantidos no histórico. Nada é apagado automaticamente.</p>
              <table className="mt-2 w-full text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1.5">Documento</th><th className="p-1.5">Rev.</th><th className="p-1.5">Status</th><th className="p-1.5">Substituída em</th></tr></thead>
                <tbody>{obsoletos.revisoesSubstituidas.slice(0, 40).map((r) => {
                  const d = documentos.find((x) => x.id === r.documento_id)
                  return <tr key={r.id} className="border-t border-slate-100"><td className="p-1.5">{d?.codigo ?? '—'}</td><td className="p-1.5 tabular-nums">{r.revisao}</td><td className="p-1.5"><Etiqueta>{r.status}</Etiqueta></td><td className="p-1.5">{dia(r.data_efetiva)}</td></tr>
                })}</tbody></table>
            </div>
          </section>
        </div>
      )}

      {aba === 'revisoes' && (
        <div className="space-y-3">
          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Ciclo de revisão e aprovação · {doc ? `${doc.codigo} · ${doc.titulo}` : 'documento não selecionado'}</h2>
            {!doc ? <p className="text-xs text-slate-500">Selecione um documento para ver o workflow.</p> : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input className={`${campo} max-w-96`} placeholder="motivo da nova revisão (obrigatório)" value={motivoRevisao} onChange={(e) => setMotivoRevisao(e.target.value)} />
                  <button type="button" className={botaoPrimario} onClick={() => void criarRevisao()} disabled={gravando || !pode('editar')}><RefreshCw size={13} /> Nova revisão</button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-white"><tr>{['Rev.', 'Status', 'Título', 'Motivo', 'Criado', 'Revisado', 'Aprovado', 'Liberado', 'Efetivação', 'Workflow'].map((h) => <th key={h} className="p-2 font-bold">{h}</th>)}</tr></thead>
                  <tbody>
                    {revisoesDoDoc.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 even:bg-slate-50">
                        <td className="p-2 tabular-nums font-bold">{r.revisao}</td>
                        <td className="p-2"><Etiqueta>{r.status}</Etiqueta></td>
                        <td className="max-w-64 truncate p-2">{r.titulo}</td>
                        <td className="max-w-64 truncate p-2 text-slate-600">{r.motivo_alteracao ?? '—'}</td>
                        <td className="whitespace-nowrap p-2">{nomeDaLista(usuarios, r.criado_por)}</td>
                        <td className="whitespace-nowrap p-2">{r.revisado_em ? dataBr(r.revisado_em) : '—'}</td>
                        <td className="whitespace-nowrap p-2">{r.aprovado_em ? dataBr(r.aprovado_em) : '—'}</td>
                        <td className="whitespace-nowrap p-2">{r.liberado_em ? dataBr(r.liberado_em) : '—'}</td>
                        <td className="whitespace-nowrap p-2">{dia(r.data_efetiva)}</td>
                        <td className="whitespace-nowrap p-2">
                          {r.status === 'rascunho' && <button type="button" className={botao} onClick={() => void transicionar(r.id, 'enviar_revisao')} disabled={gravando || !pode('revisar')}><Send size={12} /> Enviar p/ revisão</button>}
                          {r.status === 'em_revisao' && <button type="button" className={botao} onClick={() => void transicionar(r.id, 'aprovar')} disabled={gravando || !pode('aprovar')}>Aprovar</button>}
                          {r.status === 'aprovada' && <button type="button" className={botaoPrimario} onClick={() => void transicionar(r.id, 'liberar')} disabled={gravando || !pode('liberar')}>Liberar (vigente)</button>}
                          {['vigente', 'substituida', 'obsoleta'].includes(String(r.status)) && <span className="text-[10px] text-slate-500">sem ação</span>}
                        </td>
                      </tr>
                    ))}
                    {!revisoesDoDoc.length && <tr><td colSpan={10} className="p-3 text-xs text-slate-500">Nenhuma revisão registrada para este documento.</td></tr>}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <div className={painel}>
              <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Solicitações de alteração</h2>
              <div className="mb-2 flex flex-wrap gap-2">
                <input className={`${campo} min-w-56 flex-1`} placeholder="motivo da solicitação" value={motivoSolicitacao} onChange={(e) => setMotivoSolicitacao(e.target.value)} disabled={!doc || !pode('solicitar_alteracao')} />
                <select className={`${campo} w-36`} value={prioridade} onChange={(e) => setPrioridade(e.target.value)} disabled={!doc || !pode('solicitar_alteracao')}>{['baixa', 'normal', 'alta', 'critica'].map((p) => <option key={p} value={p}>{p}</option>)}</select>
                <button type="button" className={botao} onClick={() => void solicitarAlteracao()} disabled={!doc || gravando || !pode('solicitar_alteracao')}><Send size={12} /> Solicitar</button>
              </div>
              <table className="w-full text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1.5">Documento</th><th className="p-1.5">Solicitante</th><th className="p-1.5">Prioridade</th><th className="p-1.5">Status</th><th className="p-1.5">Aberta em</th></tr></thead>
                <tbody>{solicitacoes.map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="p-1.5">{documentos.find((d) => d.id === s.documento_id)?.codigo ?? '—'}</td><td className="p-1.5">{nomeDaLista(usuarios, s.solicitante_id)}</td><td className="p-1.5">{s.prioridade}</td><td className="p-1.5"><Etiqueta>{s.status}</Etiqueta></td><td className="p-1.5">{dataBr(s.criada_em)}</td></tr>)}
                  {!solicitacoes.length && <tr><td colSpan={5} className="p-2 text-slate-500">Nenhuma solicitação aberta.</td></tr>}</tbody></table>
            </div>
            <div className={painel}>
              <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Trilha de aprovações</h2>
              <table className="w-full text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1.5">Documento</th><th className="p-1.5">Etapa</th><th className="p-1.5">Decisão</th><th className="p-1.5">Aprovador</th><th className="p-1.5">Quando</th></tr></thead>
                <tbody>{aprovacoes.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="p-1.5">{documentos.find((d) => d.id === a.documento_id)?.codigo ?? '—'}</td><td className="p-1.5">{a.etapa}</td><td className="p-1.5"><Etiqueta>{a.decisao}</Etiqueta></td><td className="p-1.5">{nomeDaLista(usuarios, a.aprovador_id)}</td><td className="p-1.5">{dataBr(a.decidido_em)}</td></tr>)}
                  {!aprovacoes.length && <tr><td colSpan={5} className="p-2 text-slate-500">Nenhuma decisão registrada nesta consulta.</td></tr>}</tbody></table>
              <p className="mt-2 text-[10px] text-slate-500">As transições são validadas no banco por <b>erp_qms_transicionar_revisao</b>: rascunho → em_revisao → aprovada → vigente, cada etapa checando a permissão do módulo.</p>
            </div>
          </section>
        </div>
      )}

      {aba === 'visualizacao' && (
        <div className="space-y-3">
          {!doc ? <p className={`${painel} text-xs text-slate-500`}>Selecione um documento na barra acima.</p> : (
            <section className={painel}>
              <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
                <h2 className="text-xs font-extrabold">{doc.codigo} · {doc.titulo}</h2>
                <Etiqueta>{vigente ? 'vigente' : doc.status ?? 'sem status'}</Etiqueta>
                <span className="ml-auto text-[10px] text-slate-500">rev. {(vigente ?? rascunho ?? revisoesDoDoc[0])?.revisao ?? doc.revisao ?? '—'} · efetiva em {dia((vigente ?? revisoesDoDoc[0])?.data_efetiva)} · validade {dia(doc.validade_ate)}</span>
              </div>
              <div className="mb-2 rounded-[2px] border border-dashed border-amber-300 bg-amber-50 p-2 text-[10px] font-black uppercase tracking-wide text-amber-800">
                {String(doc.status) === 'vigente' && doc.distribuicao_controlada !== false ? 'Cópia controlada — conferir revisão antes de usar' : 'Cópia não controlada — a versão válida é a vigente no SYSNQRA'}
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-[11px] font-extrabold uppercase text-slate-500">Conteúdo do texto controlado</h3>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-800">{(vigente ?? rascunho ?? revisoesDoDoc[0])?.conteudo || doc.conteudo || '(sem conteúdo em texto — consulte o anexo PDF abaixo)'}</pre>
                  <h3 className="mt-2 mb-1 text-[11px] font-extrabold uppercase text-slate-500">Motivo da última alteração</h3>
                  <p className="rounded-[2px] border border-slate-200 p-2 text-[11px]">{(vigente ?? rascunho ?? revisoesDoDoc[0])?.motivo_alteracao || doc.motivo_alteracao || '—'}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-[11px] font-extrabold uppercase text-slate-500">Anexo vigente (PDF)</h3>
                  {anexosDoDoc.filter((a) => a.status === 'vigente').map((a) => {
                    const caminhoCadastro = doc.pdf_storage_path && doc.pdf_storage_path !== a.storage_path ? doc.pdf_storage_path : ''
                    return (
                      <div key={a.id} className="mb-2 rounded-[2px] border border-slate-200 p-2">
                        <p className="text-[11px] font-bold">{a.nome_arquivo} · rev. {a.revisao ?? '—'}</p>
                        <div className="mt-1 flex gap-2">
                          <button type="button" className={botao} onClick={() => void abrirAnexo(a.storage_path)}><Paperclip size={12} /> Abrir PDF</button>
                          {caminhoCadastro && <button type="button" className={botao} onClick={() => void abrirAnexo(caminhoCadastro)}>Abrir PDF do cadastro</button>}
                        </div>
                      </div>
                    )
                  })}
                  {!anexosDoDoc.some((a) => a.status === 'vigente') && <p className="text-[11px] text-slate-500">Nenhum PDF vigente neste documento. Envie pela aba 2 · Anexos.</p>}
                  <h3 className="mt-2 mb-1 text-[11px] font-extrabold uppercase text-slate-500">Minhas ciências de leitura</h3>
                  <table className="w-full text-left text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1.5">Documento</th><th className="p-1.5">Rev.</th><th className="p-1.5">Situação</th><th className="p-1.5">Ação</th></tr></thead>
                    <tbody>{leituras.filter((l) => l.usuario_id === usuarioId).slice(0, 40).map((l) => (
                      <tr key={l.id} className="border-t border-slate-100"><td className="p-1.5">{documentos.find((d) => d.id === l.documento_id)?.codigo ?? '—'}</td>
                        <td className="p-1.5 tabular-nums">{revisoes.find((r) => r.id === l.revisao_id)?.revisao ?? '—'}</td>
                        <td className="p-1.5">{l.lido_em ? `lida em ${dataBr(l.lido_em)}` : 'pendente'}</td>
                        <td className="p-1.5">{!l.lido_em && <button type="button" className={botao} onClick={() => void confirmarLeitura(l.id)} disabled={gravando}>Confirmar leitura</button>}</td></tr>
                    ))}
                      {!leituras.some((l) => l.usuario_id === usuarioId) && <tr><td colSpan={4} className="p-2 text-slate-500">Nenhuma leitura atribuída a você.</td></tr>}
                    </tbody></table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {aba === 'distribuicao' && (
        <div className="space-y-3">
          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Distribuição controlada · {doc ? doc.codigo : 'documento não selecionado'}</h2>
            {!doc ? <p className="text-xs text-slate-500">Selecione o documento cuja revisão vigente será distribuída.</p> : !vigente ? (
              <p className="text-xs text-amber-700">Este documento não tem revisão vigente liberada. Use a aba 4 para liberar antes de distribuir.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-600">Revisão vigente <b>{vigente.revisao}</b> · efetiva em {dia(vigente.data_efetiva)}. Marque os setores destinatários; o banco cria as leituras obrigatórias dos usuários ativos de cada setor.</p>
                <div className="flex flex-wrap gap-2">
                  {setores.map((s) => (
                    <button key={s.id} type="button" onClick={() => escolherSetor(s.id)}
                      className={`h-7 rounded-[2px] border px-2 text-[11px] font-bold ${setoresSelecionados.includes(s.id) ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{s.nome}</button>
                  ))}
                  {!setores.length && <span className="text-[11px] text-slate-500">Nenhum setor ativo na empresa.</span>}
                </div>
                <button type="button" className={botaoPrimario} onClick={() => void distribuir()} disabled={gravando || !pode('liberar')}><Users size={13} /> Distribuir revisão e gerar leituras</button>
              </div>
            )}
          </section>

          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Consulta de distribuição e ciência</h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-white"><tr>{['Documento', 'Rev.', 'Setor', 'Distribuído em', 'Leituras', 'Lidas', 'Pendentes'].map((h) => <th key={h} className="p-2 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {distribuicoes.filter((x) => !selecionado || x.documento_id === selecionado).map((x) => {
                  const doDoc = leituras.filter((l) => l.distribuicao_id === x.id)
                  const lidas = doDoc.filter((l) => l.lido_em).length
                  return <tr key={x.id} className="border-t border-slate-100 even:bg-slate-50">
                    <td className="p-2 font-mono font-bold">{documentos.find((d) => d.id === x.documento_id)?.codigo ?? '—'}</td>
                    <td className="p-2 tabular-nums">{revisoes.find((r) => r.id === x.revisao_id)?.revisao ?? '—'}</td>
                    <td className="p-2">{nomeDaLista(setores, x.setor_id)}</td>
                    <td className="whitespace-nowrap p-2">{dataBr(x.distribuido_em)}</td>
                    <td className="p-2 tabular-nums">{doDoc.length}</td>
                    <td className="p-2 tabular-nums text-emerald-700">{lidas}</td>
                    <td className="p-2 tabular-nums text-rose-700">{doDoc.length - lidas}</td>
                  </tr>
                })}
                {!distribuicoes.filter((x) => !selecionado || x.documento_id === selecionado).length && <tr><td colSpan={7} className="p-3 text-xs text-slate-500">Nenhuma distribuição registrada. A distribuição exige liberação do módulo (nível de permissão) e revisão vigente com conteúdo.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {aba === 'impressao' && (
        <div className="space-y-3">
          <section className={painel}>
            <h2 className="mb-2 border-b border-slate-100 pb-2 text-xs font-extrabold">Impressão e relatórios</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={botaoPrimario} onClick={imprimirCopia} disabled={!doc}><Printer size={13} /> Imprimir cópia do documento</button>
              <button type="button" className={botao} onClick={imprimirMestre}><Printer size={13} /> Relatório mestre (filtro atual)</button>
              <button type="button" className={botao} onClick={imprimirDistribuicao}><Printer size={13} /> Relatório de distribuição e leitura</button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">A cópia impressa leva carimbo de controle, identificação de revisão, efetivação e trilha de liberação. PDF gerado pelo navegador não é assinatura digital certificada; nada é enviado a terceiros por esta tela.</p>
          </section>
          <section className={painel}>
            <h3 className="mb-1 text-[11px] font-extrabold uppercase text-slate-500">Resumo do acervo</h3>
            <ul className="grid gap-1 text-[11px] md:grid-cols-2 xl:grid-cols-5">
              <li>Documentos cadastrados: <b>{documentos.length}</b></li>
              <li>Vigentes: <b>{documentos.filter((d) => String(d.status) === 'vigente').length}</b></li>
              <li>Em rascunho ou revisão: <b>{revisoes.filter((r) => ['rascunho', 'em_revisao'].includes(String(r.status))).length}</b></li>
              <li>Anexos vigentes: <b>{anexos.filter((a) => a.status === 'vigente').length}</b></li>
              <li>Leituras pendentes na empresa: <b>{leituras.filter((l) => !l.lido_em).length}</b></li>
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}
