import { supabase } from '../lib/supabaseClient'

type Row = Record<string, unknown>
type PizZipInstance = { file: (path: string) => unknown; generate: (options: Record<string, unknown>) => Blob }
type PizZipConstructor = new (data: ArrayBuffer | Uint8Array) => PizZipInstance
type DocxtemplaterInstance = { render: (data: Record<string, unknown>) => void; getZip: () => PizZipInstance }
type DocxtemplaterConstructor = new (zip: PizZipInstance, options?: Record<string, unknown>) => DocxtemplaterInstance

declare global {
  interface Window {
    PizZip?: PizZipConstructor
    docxtemplater?: DocxtemplaterConstructor
  }
}

const TEMPLATE_BUCKET = 'erp-documentos-qualidade'
const TEMPLATE_CODE = 'MODELO-DOSSIE-8D'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-docx-lib="${src}"]`)
    if (existing?.dataset.loaded === 'true') { resolve(); return }
    const script = existing ?? document.createElement('script')
    const done = () => { script.dataset.loaded = 'true'; resolve() }
    const failed = () => reject(new Error('Não foi possível carregar a biblioteca de documentos Word.'))
    script.addEventListener('load', done, { once: true })
    script.addEventListener('error', failed, { once: true })
    if (!existing) {
      script.src = src
      script.async = true
      script.dataset.docxLib = src
      document.head.appendChild(script)
    }
  })
}

function asRecord(value: unknown): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {}
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'dossie-8d'
}

export async function emitirDossieTecnico8D(id8D: string): Promise<void> {
  try {
    const recordId = id8D.trim()
    if (!recordId) throw new Error('Informe o identificador do registro 8D.')

    const companyResult = await supabase.rpc('erp_current_empresa_id')
    if (companyResult.error) throw companyResult.error
    const empresaId = text(companyResult.data)
    if (!empresaId) throw new Error('Empresa da sessão não identificada.')

    const d8Result = await supabase
      .from('erp_qualidade_8d')
      .select('id,empresa_id,codigo,rpnc_id,etapa_atual,d1_equipe,d2_problema,d3_contencao,d4_causa_raiz,d5_acoes,d6_validacao,d7_preventivas,d8_encerramento,status,updated_at,rpnc_snapshot,numero_rpnc_origem,origem_rpnc,cliente_referencia')
      .eq('empresa_id', empresaId)
      .eq('id', recordId)
      .maybeSingle()
    if (d8Result.error) throw d8Result.error
    if (!d8Result.data) throw new Error('Registro 8D não encontrado na empresa da sessão.')

    const d8 = d8Result.data as Row
    const rpncId = text(d8.rpnc_id)
    if (!rpncId) throw new Error('Este registro 8D não possui RPNC vinculada.')

    const [rpnResult, actionResult, causeResult, templateResult] = await Promise.all([
      supabase.from('erp_rpnc')
        .select('id,empresa_id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,lote_producao,quantidade_segregada,bloqueia_lote,setor_envolvido_id,status,criado_em')
        .eq('empresa_id', empresaId).eq('id', rpncId).maybeSingle(),
      supabase.from('qualidade_rnc_capa')
        .select('id,rpnc_id,codigo,origem,descricao,plano_5w2h,status,created_at')
        .eq('empresa_id', empresaId).eq('rpnc_id', rpncId).order('created_at', { ascending: false }),
      supabase.from('erp_qualidade_ishikawa')
        .select('id,rpnc_id,efeito,metodo,mao_de_obra,material,maquina,meio_ambiente,medicao')
        .eq('empresa_id', empresaId).eq('rpnc_id', rpncId).maybeSingle(),
      supabase.from('erp_qualidade_documentos_revisoes')
        .select('id,codigo_documento,titulo_documento,revisao,status,url_anexo,nome_arquivo')
        .eq('empresa_id', empresaId).eq('codigo_documento', TEMPLATE_CODE)
        .in('status', ['VIGENTE', 'ATIVA']).not('url_anexo', 'is', null)
        .order('revisao', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (rpnResult.error) throw rpnResult.error
    if (actionResult.error) throw actionResult.error
    if (causeResult.error) throw causeResult.error
    if (templateResult.error) throw templateResult.error
    if (!rpnResult.data) throw new Error('A RPNC vinculada não foi encontrada na empresa da sessão.')
    if (!templateResult.data?.url_anexo) throw new Error('Não existe modelo Word vigente. Cadastre o arquivo MODELO-DOSSIE-8D.docx em Procedimentos e aguarde sua aprovação.')

    const rpn = rpnResult.data as Row
    const snapshot = asRecord(d8.rpnc_snapshot)
    const assetId = text(snapshot.ativo_id ?? snapshot.maquina_id ?? snapshot.equipamento_id ?? snapshot.asset_id)
    let ativo: Row = {}
    if (assetId) {
      const assetResult = await supabase.from('erp_maquinas')
        .select('id,codigo,nome')
        .eq('empresa_id', empresaId).eq('id', assetId).maybeSingle()
      if (assetResult.error) throw assetResult.error
      ativo = asRecord(assetResult.data)
    }

    const causes = asRecord(causeResult.data)
    const actionRows = (actionResult.data ?? []).flatMap((row: Row) => {
      const values = row.plano_5w2h
      if (!Array.isArray(values)) return []
      return values.map((entry: unknown) => {
        const item = asRecord(entry)
        return {
          tipo: text(item.tipo) || 'Ação',
          nome: text(item.what ?? item.oQue ?? item.acao_o_que ?? item.descricao ?? row.descricao),
          quantidade: text(item.how_much ?? item.quanto ?? item.acao_quanto),
          por_que: text(item.why ?? item.porQue ?? item.acao_por_que),
          onde: text(item.where_to ?? item.onde ?? item.acao_onde),
          responsavel: text(item.quem ?? item.who ?? item.acao_quem),
          prazo: text(item.when_date ?? item.quando ?? item.prazo ?? item.acao_quando),
          como: text(item.how ?? item.como ?? item.acao_como),
          status: text(item.status ?? row.status),
        }
      })
    })

    await loadScript('https://unpkg.com/pizzip@3.2.0/dist/pizzip.js')
    await loadScript('https://unpkg.com/docxtemplater@3.71.0/build/docxtemplater.js')
    if (!window.PizZip || !window.docxtemplater) throw new Error('As bibliotecas de geração Word não foram inicializadas.')

    const template = await supabase.storage.from(TEMPLATE_BUCKET).download(text(templateResult.data.url_anexo))
    if (template.error) throw template.error
    const buffer = await template.data.arrayBuffer()
    if (buffer.byteLength < 4) throw new Error('O arquivo modelo está vazio ou inválido.')

    const zip = new window.PizZip(buffer)
    const document = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    const numberRpn = text(rpn.numero_rpnc)
    document.render({
      id_8d: text(d8.codigo),
      codigo_8d: text(d8.codigo),
      numero_rpnc: numberRpn,
      descricao_defeito: text(rpn.descricao_nao_conformidade),
      origem_rpnc: text(rpn.origem),
      gravidade: text(rpn.gravidade),
      lote_producao: text(rpn.lote_producao),
      quantidade_segregada: text(rpn.quantidade_segregada),
      bloqueia_lote: text(rpn.bloqueia_lote),
      status_rpnc: text(rpn.status),
      criado_em: text(rpn.criado_em),
      maquina_tag: text(ativo.codigo ?? snapshot.maquina_tag ?? snapshot.ativo_codigo),
      ativo_nome: text(ativo.nome ?? snapshot.ativo_nome ?? snapshot.maquina_nome),
      ativo_id: text(ativo.id ?? assetId),
      equipe_d1: text(d8.d1_equipe),
      problema_d2: text(d8.d2_problema),
      contencao_d3: text(d8.d3_contencao),
      causa_raiz: text(d8.d4_causa_raiz || causes.efeito),
      causa_metodo: text(causes.metodo),
      causa_mao_de_obra: text(causes.mao_de_obra),
      causa_material: text(causes.material),
      causa_maquina: text(causes.maquina),
      causa_meio_ambiente: text(causes.meio_ambiente),
      causa_medicao: text(causes.medicao),
      acoes_d5: text(d8.d5_acoes),
      validacao_d6: text(d8.d6_validacao),
      preventivas_d7: text(d8.d7_preventivas),
      encerramento_d8: text(d8.d8_encerramento),
      status_8d: text(d8.status),
      atualizado_em: text(d8.updated_at),
      plano_5w2h: actionRows,
      insumos: actionRows,
    })
    const blob = document.getZip().generate({
      type: 'blob',
      mimeType: DOCX_MIME,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = safeFilePart(text(d8.codigo) || 'dossie-tecnico-8d') + '.docx'
    link.style.display = 'none'
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao gerar o dossiê técnico 8D.'
    console.error('[SGQ] emissão do dossiê técnico 8D falhou', cause)
    throw new Error(message)
  }
}

export type ProcedimentoITExport = {
  codigo: string
  titulo: string
  departamento: string
  revisao: number
  objetivo: string
  escopo: string
  responsabilidades: string
  metodo: string
  etapas: Array<{ tipo: string; descricao: string; responsavel: string }>
}

export async function emitirProcedimentoIT(input: ProcedimentoITExport): Promise<void> {
  try {
    const codigo = input.codigo.trim()
    const titulo = input.titulo.trim()
    if (!codigo || !titulo) throw new Error('Informe o código e o título do procedimento.')
    const companyResult = await supabase.rpc('erp_current_empresa_id')
    if (companyResult.error) throw companyResult.error
    const empresaId = text(companyResult.data)
    if (!empresaId) throw new Error('Empresa da sessão não identificada.')

    const templateResult = await supabase
      .from('erp_qualidade_documentos_revisoes')
      .select('id,codigo_documento,titulo_documento,revisao,status,url_anexo,nome_arquivo')
      .eq('empresa_id', empresaId)
      .eq('codigo_documento', 'MODELO-PROCEDIMENTO-IT')
      .in('status', ['VIGENTE', 'ATIVA'])
      .not('url_anexo', 'is', null)
      .order('revisao', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (templateResult.error) throw templateResult.error
    if (!templateResult.data?.url_anexo) {
      throw new Error('Não existe modelo Word de procedimento vigente. Envie MODELO-PROCEDIMENTO-IT.docx e aprove a revisão no GED.')
    }

    await loadScript('https://unpkg.com/pizzip@3.2.0/dist/pizzip.js')
    await loadScript('https://unpkg.com/docxtemplater@3.71.0/build/docxtemplater.js')
    if (!window.PizZip || !window.docxtemplater) throw new Error('As bibliotecas de geração Word não foram inicializadas.')

    const downloaded = await supabase.storage.from(TEMPLATE_BUCKET).download(text(templateResult.data.url_anexo))
    if (downloaded.error) throw downloaded.error
    const buffer = await downloaded.data.arrayBuffer()
    if (buffer.byteLength < 4) throw new Error('O arquivo modelo está vazio ou inválido.')

    const zip = new window.PizZip(buffer)
    const document = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    const steps = input.etapas.map((step, index) => ({
      numero: index + 1,
      tipo: step.tipo,
      descricao: step.descricao,
      responsavel: step.responsavel,
    }))
    document.render({
      codigo_documento: codigo,
      titulo_documento: titulo,
      departamento: input.departamento,
      revisao: input.revisao,
      status_documento: 'RASCUNHO — NÃO CONTROLADO ATÉ APROVAÇÃO NO GED',
      objetivo: input.objetivo,
      escopo: input.escopo,
      responsabilidades: input.responsabilidades,
      metodo_criterios_registros: input.metodo,
      quantidade_etapas: steps.length,
      etapas: steps,
      fluxo_processo: steps.map(step => step.numero + '. [' + step.tipo + '] ' + step.descricao + (step.responsavel ? ' — Responsável: ' + step.responsavel : '')).join('\n'),
    })
    const blob = document.getZip().generate({
      type: 'blob',
      mimeType: DOCX_MIME,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = safeFilePart(codigo + '-' + titulo) + '-rascunho.docx'
    link.style.display = 'none'
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha ao gerar o procedimento Word.'
    console.error('[SGQ] emissão de procedimento Word falhou', cause)
    throw new Error(message)
  }
}
