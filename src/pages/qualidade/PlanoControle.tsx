/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-FMEA-PLANO-CONTROLE-20261106-01 — Plano de Controle (CPP) digital e impresso com QR
 * Code: cabeçalho erp_plano_controle, grade de linhas erp_plano_controle_linha com as colunas da aba
 * "Plano de Controle" da pasta do proprietário e vínculo explícito com a linha do FMEA.
 * @STATUS_APROVACAO: ORDEM MASTER DE EXECUÇÃO EM 2026-11-06 — "CPP digital e impresso com QR Code" e
 * "FMEA conectado ao Plano de Controle, Inspeção e RPNC"; e ordem de 2026-11-06: "SÓ PARA QUANDO TODAS
 * AS TELAS ESTIVEREM PRONTO E APLICADAS NO SISTEMA".
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Link2, Plus, Printer, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'
import { abrirRelatorio } from '../../lib/report/abrirRelatorio'
import type { Documento } from '../../lib/report/documento'

type Tipo = 'prototipo' | 'pre_lancamento' | 'producao'
type Situacao = 'rascunho' | 'ativo' | 'revisado' | 'obsoleto'
type Caracteristica = '' | 'critica' | 'significativa' | 'nenhuma'

type Plano = {
  id: string
  numero: string
  tipo: Tipo
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

type ChaveTexto = keyof Pick<
  Plano,
  | 'numero' | 'codigo_peca' | 'nome_peca' | 'fornecedor_planta' | 'codigo_fornecedor'
  | 'contato_principal' | 'telefone' | 'data_original' | 'data_revisao' | 'equipe_principal'
  | 'aprovacao_engenharia_cliente' | 'aprovacao_qualidade_cliente' | 'aprovacao_fornecedor_planta' | 'outra_aprovacao'
>

type Linha = {
  id: string | null
  ordem: number
  item_numero: string
  processo_operacao_numero: string
  descricao_produto_processo: string
  caracteristica_especial: Caracteristica
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

type ReferenciaFmea = { id: string; descricao: string }

const TIPOS: { valor: Tipo; rotulo: string }[] = [
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
const CARACTERISTICAS: { valor: Caracteristica; rotulo: string }[] = [
  { valor: '', rotulo: '—' },
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'critica', rotulo: 'Crítica' },
  { valor: 'significativa', rotulo: 'Significativa' },
]

const campo = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const rotulo = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const acao = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50'
const acaoLateral = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-50'
const celula = 'h-[28px] w-full rounded-[2px] border border-slate-200 bg-white px-1 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'

const planoVazio: Plano = {
  id: '',
  numero: '',
  tipo: 'producao',
  pagina: 1,
  total_paginas: 1,
  codigo_peca: '',
  nome_peca: '',
  fornecedor_planta: '',
  codigo_fornecedor: '',
  contato_principal: '',
  telefone: '',
  data_original: '',
  data_revisao: '',
  equipe_principal: '',
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
  item_numero: '',
  processo_operacao_numero: '',
  descricao_produto_processo: '',
  caracteristica_especial: '',
  maquina_dispositivo_ferramenta: '',
  numero_controle: '',
  metodo_manufatura: '',
  padrao_avaliacao: '',
  tecnica_medicao: '',
  tamanho_amostra: '',
  frequencia_amostra: '',
  metodo_controle: '',
  plano_reacao: '',
  fmea_linha_id: '',
})

function dataTexto(valor: string): string {
  if (!valor) return '—'
  const partes = valor.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor
}

function explicarFalha(cause: unknown): string {
  const erro = cause as { code?: string; message?: string; details?: string } | null
  const texto = `${erro?.code ?? ''} ${erro?.message ?? ''} ${erro?.details ?? ''}`.toLowerCase()
  if (texto.includes('pgrst205') || texto.includes('does not exist') || texto.includes('42p01') || texto.includes('could not find the table'))
    return 'A migration 20261106120000_erp_fmea_plano_controle_aiag_v1 ainda não foi aplicada no banco desta empresa. Abra a tela depois de aplicar o pacote de migrations; nada aqui foi preenchido com dados fictícios.'
  return erro?.message ?? 'Falha ao consultar o banco da empresa.'
}

export default function QualidadePlanoControle() {
  const [companyId, setCompanyId] = useState('')
  const [lista, setLista] = useState<Plano[]>([])
  const [plano, setPlano] = useState<Plano>(planoVazio)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [marcas, setMarcas] = useState<Record<string, string>>({})
  const [referencias, setReferencias] = useState<ReferenciaFmea[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [avisos, setAvisos] = useState<string[]>([])

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
      setLista((resultado.data ?? []).map((registro) => ({
        ...registro,
        data_original: String(registro.data_original ?? ''),
        data_revisao: String(registro.data_revisao ?? ''),
      })) as Plano[])
    } catch (cause) {
      setErros((atual) => [...new Set([...atual, explicarFalha(cause)])])
    }
  }, [companyId])

  const carregarReferencias = useCallback(async () => {
    try {
      const resultado = await supabase
        .from('qualidade_fmea')
        .select('id,codigo_item_processo,modo_falha,npr')
        .eq('empresa_id', companyId)
        .order('npr', { ascending: false })
        .limit(300)
      if (resultado.error) throw resultado.error
      setReferencias((resultado.data ?? []).map((registro) => ({
        id: String(registro.id),
        descricao: `${registro.codigo_item_processo} · ${registro.modo_falha} · NPR ${registro.npr ?? '—'}`,
      })))
    } catch (cause) {
      setErros((atual) => [...new Set([...atual, explicarFalha(cause)])])
    }
  }, [companyId])

  const carregarLinhas = useCallback(async (planoId: string) => {
    try {
      const resultado = await supabase
        .from('erp_plano_controle_linha')
        .select('id,ordem,item_numero,processo_operacao_numero,descricao_produto_processo,caracteristica_especial,maquina_dispositivo_ferramenta,numero_controle,metodo_manufatura,padrao_avaliacao,tecnica_medicao,tamanho_amostra,frequencia_amostra,metodo_controle,plano_reacao,fmea_linha_id')
        .eq('empresa_id', companyId)
        .eq('plano_id', planoId)
        .order('ordem', { ascending: true })
        .limit(500)
      if (resultado.error) throw resultado.error
      const carregadas: Linha[] = (resultado.data ?? []).map((registro) => ({
        id: String(registro.id),
        ordem: Number(registro.ordem ?? 1),
        item_numero: String(registro.item_numero ?? ''),
        processo_operacao_numero: String(registro.processo_operacao_numero ?? ''),
        descricao_produto_processo: String(registro.descricao_produto_processo ?? ''),
        caracteristica_especial: (CARACTERISTICAS.some((c) => c.valor === registro.caracteristica_especial)
          ? String(registro.caracteristica_especial) : '') as Caracteristica,
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
      setLinhas(carregadas)
      setMarcas(Object.fromEntries(carregadas.map((linha) => [linha.id as string, JSON.stringify(linha)])))
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
  useEffect(() => {
    if (!companyId) return
    void carregarPlanos()
    void carregarReferencias()
  }, [companyId, carregarPlanos, carregarReferencias])

  const setCampo = (chave: ChaveTexto, valor: string) => setPlano((atual) => ({ ...atual, [chave]: valor }))

  const editarLinha = (index: number, chave: keyof Linha, valor: string | number) =>
    setLinhas((atual) => atual.map((linha, i) => (i === index ? { ...linha, [chave]: valor } : linha)))

  function marcarSelecionado(id: string) {
    const selecionado = lista.find((registro) => registro.id === id)
    if (!selecionado) return
    setErros([])
    setPlano(selecionado)
    void carregarLinhas(id)
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
      setErros([explicarFalha(cause)])
    } finally {
      setSalvando(false)
    }
  }

  async function salvarLinhas() {
    if (!companyId) { setErros(['Empresa ativa não identificada.']); return }
    if (!plano.id) { setErros(['Salve o cabeçalho do Plano de Controle antes de gravar as linhas.']); return }
    const completas = linhas.filter((linha) => linha.descricao_produto_processo.trim() || linha.processo_operacao_numero.trim())
    if (completas.length !== linhas.length)
      setErros(['Cada linha precisa de nº da operação ou da descrição do produto/processo.'])
    else setErros([])
    const alteradas = completas.filter((linha) => !linha.id || marcas[linha.id] !== JSON.stringify(linha))
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
      await carregarLinhas(plano.id)
      setAvisos([`${alteradas.length} linha(s) do plano gravada(s) em erp_plano_controle_linha.`])
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
      const removida = await supabase.from('erp_plano_controle_linha').delete().eq('id', linha.id)
      if (removida.error) throw removida.error
      if (plano.id) await carregarLinhas(plano.id)
      setAvisos(['Linha removida do banco da empresa.'])
    } catch (cause) {
      setErros([explicarFalha(cause)])
    }
  }

  const ligadas = useMemo(() => linhas.filter((linha) => linha.fmea_linha_id).length, [linhas])

  function montarDocumento(): Documento {
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
    const registros = linhas.map((linha, index) => [
      linha.ordem || index + 1,
      linha.item_numero,
      linha.processo_operacao_numero,
      linha.descricao_produto_processo,
      CARACTERISTICAS.find((c) => c.valor === linha.caracteristica_especial)?.rotulo ?? '—',
      linha.maquina_dispositivo_ferramenta,
      linha.numero_controle,
      linha.metodo_manufatura,
      linha.padrao_avaliacao,
      linha.tecnica_medicao,
      [linha.tamanho_amostra, linha.frequencia_amostra].filter(Boolean).join(' · '),
      linha.metodo_controle,
      linha.plano_reacao,
    ])
    const codigo = `CPP ${plano.numero || '—'} · rev ${plano.versao}`
    return {
      modulo: 'Qualidade · SGQ',
      tipo: 'Plano de Controle',
      titulo: `Plano de Controle ${TIPOS.find((t) => t.valor === plano.tipo)?.rotulo ?? ''}`.trim(),
      codigo,
      subtitulo: plano.nome_peca || undefined,
      blocos: [
        {
          tipo: 'campos',
          titulo: 'Identificação do plano',
          colunas: 3,
          itens: [
            { rotulo: 'Nº do plano', valor: plano.numero },
            { rotulo: 'Tipo', valor: TIPOS.find((t) => t.valor === plano.tipo)?.rotulo },
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
            { rotulo: 'Linhas do plano', valor: linhas.length },
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
        ? {
            valor: `${window.location.origin}/pageprincipal/qualidade/plano-controle?doc=${plano.id}`,
            legenda: `Verificação no sistema · ${codigo}`,
          }
        : undefined,
      observacoes:
        'Documento gerado pelo SYSNQRA ERP Industrial a partir do banco da empresa. O QR Code dá acesso à revisão digital deste plano.',
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900" data-synqra-density="30px">
      <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <ShieldCheck size={17} className="text-[#2D8DB8]" />
        <div>
          <h1 className="text-[13px] font-semibold text-[#123B50]">Plano de Controle (CPP) · AIAG</h1>
          <p className="text-[9px] text-slate-500">Cabeçalho controlado · linhas por operação · vínculo com a linha do FMEA · impressão A4 com QR Code</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]"
            aria-label="Plano de Controle cadastrado"
            value={plano.id}
            onChange={(evento) => (evento.target.value ? marcarSelecionado(evento.target.value) : setPlano(planoVazio))}
          >
            <option value="">— Novo plano —</option>
            {lista.map((registro) => (
              <option key={registro.id} value={registro.id}>
                {registro.numero} · rev {registro.versao} · {registro.nome_peca || 'sem peça'}
              </option>
            ))}
          </select>
          <button className={acaoLateral} onClick={() => { setPlano(planoVazio); setLinhas([]); setMarcas({}); setAvisos(['Novo plano de controle em edição.']) }} disabled={carregando}>
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
        <h2 className="mb-2 text-[11px] font-semibold text-[#123B50]">Cabeçalho do plano</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          {(
            [
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
            ] as [ChaveTexto, string][]
          ).map(([chave, rotuloCampo]) => (
            <label key={chave}>
              <span className={rotulo}>{rotuloCampo}</span>
              <input
                className={campo}
                type={chave.startsWith('data_') ? 'date' : 'text'}
                value={plano[chave]}
                maxLength={chave === 'numero' ? 40 : 300}
                onChange={(evento) => setCampo(chave, evento.target.value)}
              />
            </label>
          ))}
          <label>
            <span className={rotulo}>Tipo</span>
            <select className={campo} value={plano.tipo} onChange={(evento) => setPlano((a) => ({ ...a, tipo: evento.target.value as Tipo }))}>
              {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>)}
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
              <input className={campo} value={plano[chave]} maxLength={200} onChange={(evento) => setCampo(chave, evento.target.value)} />
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={acao} onClick={() => void salvarPlano()} disabled={salvando || carregando}>
            <Save size={12} /> {salvando ? 'Gravando…' : 'Salvar cabeçalho'}
          </button>
          <button className={acaoLateral} onClick={() => void abrirRelatorio(montarDocumento())} disabled={!plano.id}>
            <Printer size={12} /> Imprimir A4 com QR
          </button>
        </div>
      </section>

      <section className="mb-3 border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold text-[#123B50]">Linhas do plano</h2>
          <span className="text-[9px] uppercase tracking-wider text-slate-500">
            {linhas.length} linha(s) · <Link2 size={10} className="inline align-[-1px]" /> {ligadas} ligada(s) ao FMEA
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className={acaoLateral} onClick={() => setLinhas((atual) => [...atual, linhaVazia(atual.length + 1)])} disabled={!plano.id || carregando}
              title={plano.id ? 'Incluir linha no plano' : 'Salve o cabeçalho antes de incluir linhas'}>
              <Plus size={12} /> Nova linha
            </button>
            <button className={acao} onClick={() => void salvarLinhas()} disabled={salvando || !plano.id || linhas.length === 0}>
              <Save size={12} /> Salvar linhas
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[2400px] border-collapse text-left text-[10px]">
          <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
            <tr>
              {['Nº', 'Item', 'Op. processo', 'Descrição do produto / processo *', 'Car. especial', 'Máquina / dispositivo / ferramenta', 'Nº de controle', 'Método de manufatura', 'Padrão de avaliação', 'Técnica de medição', 'Tam. amostra', 'Freq. amostra', 'Método de controle', 'Plano de reação', 'Linha do FMEA', ''].map((titulo) => (
                <th key={titulo} className="h-[30px] whitespace-nowrap border-b border-slate-200 px-1">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={16} className="h-[40px] text-center text-slate-500">Carregando o plano de controle da empresa…</td></tr>
            ) : linhas.length === 0 ? (
              <tr><td colSpan={16} className="h-[40px] text-center text-slate-500">{plano.id ? 'Plano salvo ainda sem linhas. Use “Nova linha”.' : 'Selecione um plano cadastrado ou salve um novo cabeçalho.'}</td></tr>
            ) : (
              linhas.map((linha, index) => (
                <tr key={linha.id ?? `nova-${index}`} className="border-b border-slate-100 align-top hover:bg-neutral-50/80">
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 44 }} type="number" min={1} max={999} value={linha.ordem} onChange={(e) => editarLinha(index, 'ordem', Number(e.target.value))} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 60 }} value={linha.item_numero} maxLength={20} onChange={(e) => editarLinha(index, 'item_numero', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 90 }} value={linha.processo_operacao_numero} maxLength={60} onChange={(e) => editarLinha(index, 'processo_operacao_numero', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 220 }} value={linha.descricao_produto_processo} maxLength={1000} onChange={(e) => editarLinha(index, 'descricao_produto_processo', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 104 }} value={linha.caracteristica_especial} onChange={(e) => editarLinha(index, 'caracteristica_especial', e.target.value as Caracteristica)}>
                      {CARACTERISTICAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.maquina_dispositivo_ferramenta} maxLength={300} onChange={(e) => editarLinha(index, 'maquina_dispositivo_ferramenta', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 110 }} value={linha.numero_controle} maxLength={80} onChange={(e) => editarLinha(index, 'numero_controle', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.metodo_manufatura} maxLength={500} onChange={(e) => editarLinha(index, 'metodo_manufatura', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 190 }} value={linha.padrao_avaliacao} maxLength={1000} onChange={(e) => editarLinha(index, 'padrao_avaliacao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 160 }} value={linha.tecnica_medicao} maxLength={500} onChange={(e) => editarLinha(index, 'tecnica_medicao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 90 }} value={linha.tamanho_amostra} maxLength={60} onChange={(e) => editarLinha(index, 'tamanho_amostra', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 110 }} value={linha.frequencia_amostra} maxLength={80} onChange={(e) => editarLinha(index, 'frequencia_amostra', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 170 }} value={linha.metodo_controle} maxLength={1000} onChange={(e) => editarLinha(index, 'metodo_controle', e.target.value)} /></td>
                  <td className="px-1 py-[3px]"><input className={celula} style={{ width: 220 }} value={linha.plano_reacao} maxLength={1500} onChange={(e) => editarLinha(index, 'plano_reacao', e.target.value)} /></td>
                  <td className="px-1 py-[3px]">
                    <select className={celula} style={{ width: 220 }} value={linha.fmea_linha_id} onChange={(e) => editarLinha(index, 'fmea_linha_id', e.target.value)}>
                      <option value="">— sem vínculo —</option>
                      {referencias.map((referencia) => <option key={referencia.id} value={referencia.id}>{referencia.descricao}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-[3px]">
                    <button className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-rose-700" onClick={() => void excluirLinha(index)}>
                      <Trash2 size={11} /> Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="mt-2 text-[9px] text-slate-500">
        A coluna "Linha do FMEA" grava a FK <code>fmea_linha_id</code> em <code>erp_plano_controle_linha</code>: o controle impresso passa a apontar para o risco que o originou.
      </p>
    </main>
  )
}
