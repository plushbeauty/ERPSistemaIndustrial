/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * ERPSis — QUALIDADE / GED DOCUMENTAL
 * Data: 2026-10-22 | Revisão: SGQ-DOC-2026-10-22-R1
 * Escopo: cabeçalho normativo com logotipo, título/código bloqueados em revisão e separação das rotas de nova emissão e atualização.
 * Escopo: responsividade da árvore, formulário e trilha de auditoria; persistência e controle de revisão preservados.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CircleHelp, ExternalLink, FilePlus2, FileText, History, Paperclip, RefreshCw, Save, Search, ShieldCheck, Upload, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Revision = {
  id: string
  empresa_id: string
  codigo_documento: string
  titulo_documento: string
  departamento: string
  revisao: number
  responsavel: string | null
  status: string
  conteudo_texto: string
  motivo_alteracao: string | null
  criado_em: string
  data_vigencia: string | null
  nome_arquivo: string | null
  url_anexo: string | null
}

const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'

function dateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GEDDocumentos() {
  const { id: routeRevisionId } = useParams<{ id: string }>()
  const location = useLocation()
  const [companyId, setCompanyId] = useState('')
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [departamento, setDepartamento] = useState('QUALIDADE')
  const [conteudo, setConteudo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      setCompanyId(company.data)
      const rows = await fetchAllPages<Revision>((from, to) =>
        supabase.from('erp_qualidade_documentos_revisoes')
          .select('id,empresa_id,codigo_documento,titulo_documento,departamento,revisao,responsavel,status,conteudo_texto,motivo_alteracao,criado_em,data_vigencia,nome_arquivo,url_anexo', { count: 'exact' })
          .eq('empresa_id', company.data)
          .order('criado_em', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      )
      setRevisions(rows)
      if (selectedId && !rows.some(row => row.id === selectedId)) setSelectedId('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o GED.')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { void load() }, [load])

  // A rota dedicada de emissão sempre inicia um documento novo, sem reaproveitar a seleção anterior.
  useEffect(() => {
    if (!location.pathname.endsWith('/nova')) return
    setSelectedId('')
    setCodigo('')
    setTitulo('')
    setDepartamento('QUALIDADE')
    setConteudo('')
    setMotivo('')
    setNotice('')
    setError('')
  }, [location.pathname])

  useEffect(() => {
    if (!routeRevisionId || loading || !revisions.length) return
    const routeRevision = revisions.find(row => row.id === routeRevisionId)
    if (routeRevision && selectedId !== routeRevision.id) {
      setSelectedId(routeRevision.id)
      setCodigo(routeRevision.codigo_documento)
      setTitulo(routeRevision.titulo_documento)
      setDepartamento(routeRevision.departamento || 'QUALIDADE')
      setConteudo(routeRevision.conteudo_texto)
      setMotivo('')
      setNotice('')
      setError('')
    }
  }, [routeRevisionId, loading, revisions, selectedId])

  const documents = useMemo(() => {
    const latest = new Map<string, Revision>()
    for (const revision of revisions) {
      if (!latest.has(revision.codigo_documento)) latest.set(revision.codigo_documento, revision)
    }
    return [...latest.values()].filter(doc => (doc.codigo_documento + ' ' + doc.titulo_documento).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  }, [revisions, query])

  const selected = revisions.find(row => row.id === selectedId) ?? null

  function startNew() {
    setSelectedId('')
    setCodigo('')
    setTitulo('')
    setDepartamento('QUALIDADE')
    setConteudo('')
    setMotivo('')
    setNotice('')
    setError('')
  }

  function editRevision(row: Revision) {
    setSelectedId(row.id)
    setCodigo(row.codigo_documento)
    setTitulo(row.titulo_documento)
    setDepartamento(row.departamento || 'QUALIDADE')
    setConteudo(row.conteudo_texto)
    setMotivo('')
    setNotice('')
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!companyId) throw new Error('Empresa não identificada.')
      const result = await supabase.rpc('erp_salvar_revisao_documento', {
        p_codigo: codigo.trim().toUpperCase(),
        p_titulo: titulo.trim(),
        p_departamento: departamento.trim() || 'QUALIDADE',
        p_conteudo: conteudo,
        p_motivo: motivo.trim() || null,
      })
      if (result.error) throw result.error
      const saved = result.data as { id?: string; codigo_documento?: string; revisao?: number; status?: string } | null
      setNotice('Revisão ' + String(saved?.revisao ?? '') + ' criada com status ' + String(saved?.status ?? 'EM_REVISAO') + '.')
      if (typeof saved?.id === 'string') setSelectedId(saved.id)
      await load()
      setCodigo(saved?.codigo_documento ?? codigo.trim().toUpperCase())
      setMotivo('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a nova revisão.')
    } finally {
      setBusy(false)
    }
  }

  async function activateSelected() {
    if (!selected) return
    if (!selected.url_anexo) {
      setError('Aprovação bloqueada: o arquivo original ainda não está anexado ao GED. Anexe e valide o documento antes de torná-lo vigente.')
      setNotice('')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_ativar_revisao_documento', { p_revisao_id: selected.id })
      if (result.error) throw result.error
      setNotice('Documento ' + selected.codigo_documento + ' Rev. ' + String(selected.revisao).padStart(2, '0') + ' ativado como vigente.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ativar a revisão.')
    } finally {
      setBusy(false)
    }
  }


  async function attachSelectedFile() {
    if (!selected) { setError('Salve primeiro o documento para depois anexar o arquivo original.'); return }
    if (selected.status !== 'EM_REVISAO') { setError('O anexo só pode ser vinculado enquanto a revisão estiver em análise. Crie uma nova revisão para substituir um arquivo vigente.'); return }
    if (!attachmentFile) { setError('Selecione o arquivo original para anexar.'); return }
    if (attachmentFile.size <= 0 || attachmentFile.size > 50 * 1024 * 1024) { setError('O arquivo precisa ter até 50 MB e não pode estar vazio.'); return }
    const extension = attachmentFile.name.split('.').pop()?.toLowerCase() ?? ''
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    }
    const mime = mimeByExtension[extension]
    if (!mime) { setError('Formato não permitido. Use PDF, DOC, DOCX, XLS, XLSX ou XLSM.'); return }
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    setBusy(true); setError(''); setNotice('')
    let storagePath = ''
    try {
      const safeName = attachmentFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-180)
      storagePath = companyId + '/ged/' + selected.id + '/' + crypto.randomUUID() + '-' + safeName
      const uploaded = await supabase.storage.from('erp-qualidade-anexos').upload(storagePath, attachmentFile, { contentType: mime, upsert: false })
      if (uploaded.error) throw uploaded.error
      const linked = await supabase.rpc('erp_qualidade_revisao_anexo_vincular', {
        p_revisao_id: selected.id, p_nome_arquivo: attachmentFile.name, p_storage_path: storagePath,
        p_tipo_mime: mime, p_tamanho_bytes: attachmentFile.size,
      })
      if (linked.error) throw linked.error
      setAttachmentFile(null)
      setNotice('Arquivo original anexado à revisão ' + selected.codigo_documento + ' Rev. ' + String(selected.revisao).padStart(2, '0') + '.')
      await load()
    } catch (cause) {
      if (storagePath) { try { await supabase.storage.from('erp-qualidade-anexos').remove([storagePath]) } catch { /* preserve the original error */ } }
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar o arquivo original.')
    } finally { setBusy(false) }
  }


  async function attachBulkFiles() {
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    if (!bulkFiles.length) { setError('Selecione os arquivos originais extraídos do arquivo compactado.'); return }
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    }
    const normalizeName = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    let linkedCount = 0
    let unmatchedCount = 0
    let failedCount = 0
    setBusy(true); setError(''); setNotice('')
    setBulkProgress({ done: 0, total: bulkFiles.length })
    try {
      for (let index = 0; index < bulkFiles.length; index += 1) {
        const file = bulkFiles[index]
        const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
        const mime = mimeByExtension[extension]
        const normalizedFile = normalizeName(file.name)
        const matches = revisions.filter(row =>
          row.status === 'EM_REVISAO' && !row.url_anexo && row.nome_arquivo
          && normalizeName(row.nome_arquivo) === normalizedFile
        )
        const matchingCodes = [...new Set(matches.map(row => row.codigo_documento))]
        if (!mime || file.size <= 0 || file.size > 50 * 1024 * 1024 || matchingCodes.length !== 1) {
          if (!mime || file.size <= 0 || file.size > 50 * 1024 * 1024) failedCount += 1
          else unmatchedCount += 1
          setBulkProgress({ done: index + 1, total: bulkFiles.length })
          continue
        }
        const target = matches.filter(row => row.codigo_documento === matchingCodes[0]).sort((a, b) => b.revisao - a.revisao)[0]
        if (!target) { unmatchedCount += 1; setBulkProgress({ done: index + 1, total: bulkFiles.length }); continue }
        const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-180)
        const storagePath = companyId + '/ged/' + target.id + '/' + crypto.randomUUID() + '-' + safeName
        try {
          const uploaded = await supabase.storage.from('erp-qualidade-anexos').upload(storagePath, file, { contentType: mime, upsert: false })
          if (uploaded.error) throw uploaded.error
          const result = await supabase.rpc('erp_qualidade_revisao_anexo_vincular', {
            p_revisao_id: target.id, p_nome_arquivo: file.name, p_storage_path: storagePath,
            p_tipo_mime: mime, p_tamanho_bytes: file.size,
          })
          if (result.error) throw result.error
          linkedCount += 1
        } catch {
          failedCount += 1
          try { await supabase.storage.from('erp-qualidade-anexos').remove([storagePath]) } catch { /* continue with remaining files */ }
        }
        setBulkProgress({ done: index + 1, total: bulkFiles.length })
      }
      setNotice('Importação de originais concluída: ' + linkedCount + ' anexado(s), ' + unmatchedCount + ' sem correspondência única pelo nome e ' + failedCount + ' falha(s). Revise os itens não vinculados e repita apenas esses arquivos.')
      setBulkFiles([])
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function openSelectedAttachment() {
    if (!selected?.url_anexo) return
    setError('')
    try {
      if (/^https?:\/\//i.test(selected.url_anexo)) { window.location.assign(selected.url_anexo); return }
      const result = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(selected.url_anexo, 60)
      if (result.error) throw result.error
      window.location.assign(result.data.signedUrl)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o anexo.') }
  }

  const activeDoc = selected ?? (codigo ? revisions.find(row => row.codigo_documento === codigo) ?? null : null)
  const history = revisions.filter(row => row.codigo_documento === (selected?.codigo_documento ?? codigo)).sort((a, b) => b.revisao - a.revisao)

  return <main className="min-h-screen bg-[#F4FBFD] text-neutral-800"><div className="mx-auto max-w-[1800px] space-y-3 p-3"><QualitySidebar active="/qualidade/ged-documentos" />
    <div className="min-h-[calc(100vh-96px)] bg-[#F7F9FC] text-neutral-800">
      <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid size-6 place-items-center rounded-[5px] bg-[#E9F4FC] text-[#2D8DB8]"><FileText size={14}/></div>
          <span className="truncate text-[11px] font-semibold text-[#123B50]">ESPAÇO DE TRABALHO / GED</span>
          {selected && <><span className="text-neutral-300">/</span><span className="max-w-[260px] truncate text-[10px] text-neutral-500">{selected.titulo_documento}</span></>}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <button type="button" onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-sky-200 bg-sky-50 px-2 text-[10px] font-semibold text-[#246F98] hover:bg-sky-100"><CircleHelp size={12}/> AJUDA</button>
          <button type="button" onClick={() => void load()} title="Atualizar documentos" className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-neutral-200 px-2 text-[10px] text-neutral-600 hover:bg-neutral-50"><RefreshCw size={12}/> ATUALIZAR</button>
          <button type="button" onClick={startNew} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#C6DFEF] bg-[#F2F8FC] px-2 text-[10px] font-semibold text-[#246F98] hover:bg-[#E6F3FB]"><FilePlus2 size={13}/> NOVO DOC</button>
          <label className="inline-flex h-[30px] cursor-pointer items-center gap-1 rounded-[2px] border border-neutral-200 bg-white px-2 text-[9px] font-semibold text-neutral-700 hover:bg-neutral-50"><Paperclip size={12}/> SELECIONAR ORIGINAIS<input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm" className="hidden" onChange={event => setBulkFiles(Array.from(event.target.files ?? []))}/></label>
          {bulkFiles.length > 0 && <button type="button" disabled={busy} onClick={() => void attachBulkFiles()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-2 text-[9px] font-semibold text-white disabled:opacity-50"><Upload size={12}/>{busy ? 'IMPORTANDO ' + bulkProgress.done + '/' + bulkProgress.total : 'IMPORTAR ' + bulkFiles.length}</button>}
          <button type="button" onClick={() => window.print()} className="hidden h-[30px] items-center gap-1 rounded-[2px] border border-neutral-200 px-2 text-[10px] text-neutral-600 hover:bg-neutral-50 sm:inline-flex"><ShieldCheck size={12}/> IMPRIMIR</button>
        </div>
      </div>

      {helpOpen && <section aria-label="Ajuda do controle documental" className="mx-3 mt-3 border border-sky-200 bg-sky-50 px-3 py-3 text-[10px] leading-5 text-slate-700">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#123B50]">Como usar o GED</h2><p>1. Pesquise e selecione um documento na árvore. 2. Confira código, título e departamento. 3. Para alterar um documento controlado, informe o motivo e salve uma nova revisão. 4. A revisão precisa ser aprovada antes de entrar em vigor. Use imprimir para gerar uma cópia da tela; a distribuição controlada de cópias deve ser registrada no controle documental.</p><p className="mt-1 text-slate-600">Não substitua uma especificação aprovada apenas alterando o texto: registre a mudança e valide a revisão antes de liberar para uso.</p></div><button type="button" aria-label="Fechar ajuda" onClick={() => setHelpOpen(false)} className="shrink-0 p-1 text-slate-500 hover:bg-white"><X size={14}/></button></div>
      </section>}
      <div className="grid min-h-[calc(100vh-138px)] grid-cols-1 xl:grid-cols-[minmax(250px,280px)_minmax(0,1fr)_minmax(220px,240px)] 2xl:grid-cols-[300px_minmax(0,1fr)_260px]">
        <aside className="flex min-h-0 flex-col border-b border-neutral-200 bg-neutral-50/80 xl:border-b-0 xl:border-r xl:border-neutral-200/70">
          <div className="flex h-[44px] items-center justify-between px-3">
            <span className="text-[9px] font-bold uppercase tracking-[.13em] text-neutral-500">ÁRVORE DE DOCUMENTOS</span>
            <span className="rounded-[2px] bg-neutral-200/70 px-1.5 py-0.5 text-[9px] tabular-nums text-neutral-600">{documents.length}</span>
          </div>
          <div className="px-2 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-[9px] text-neutral-400"/>
              <input aria-label="Pesquisar documento" className={field + ' pl-7 bg-white'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código ou título"/>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            <div className="flex h-[29px] items-center gap-2 rounded-[2px] px-2 text-[10px] font-semibold text-neutral-600">
              <span className="text-[#2D8DB8]"><History size={14}/></span><span>Documentos controlados</span>
            </div>
            {loading ? <p className="px-7 py-3 text-[10px] text-neutral-500">Carregando documentos…</p> : documents.length ? documents.map(doc => {
              const isSelected = selectedId === doc.id
              const stateColor = doc.status === 'VIGENTE' || doc.status === 'ATIVA' ? 'bg-emerald-50 text-emerald-700' : doc.status === 'EM_REVISAO' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
              return <button key={doc.id} type="button" onClick={() => editRevision(doc)} aria-current={isSelected ? 'true' : undefined} className={'mb-1 grid w-full grid-cols-[14px_minmax(0,1fr)] items-start gap-1.5 rounded-[2px] border px-2 py-1.5 text-left transition-colors ' + (isSelected ? 'border-[#8CC5E0] bg-[#E8F3FA] text-[#123B50]' : 'border-slate-200 bg-white text-neutral-700 hover:border-slate-300 hover:bg-slate-50')}>
                <span className={'mt-0.5 block ' + (isSelected ? 'text-[#2D8DB8]' : 'text-neutral-400')}><FileText size={14}/></span>
                <span className="block min-w-0 w-full">
                  <span className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-1">
                    <span className="block min-w-0 break-words text-[10px] font-bold leading-4">{doc.codigo_documento}</span>
                    <span className={'inline-flex max-w-full shrink-0 items-center rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold leading-3 ' + stateColor}>{doc.status.replaceAll('_',' ')}</span>
                  </span>
                  <span className="mt-0.5 block max-h-[28px] w-full overflow-hidden break-words text-[10px] font-medium leading-[1.35] text-neutral-700" title={doc.titulo_documento}>{doc.titulo_documento}</span>
                  <span className="mt-0.5 block w-full truncate border-t border-slate-100 pt-0.5 text-[8px] leading-3 text-neutral-500" title={doc.departamento || 'QUALIDADE'}>REV. {String(doc.revisao).padStart(2,'0')} <span aria-hidden="true">·</span> {doc.departamento || 'QUALIDADE'}</span>{doc.nome_arquivo && <span className="mt-0.5 block w-full truncate text-[8px] leading-3 text-amber-700" title={doc.nome_arquivo}>FONTE: {doc.nome_arquivo} · {doc.url_anexo ? 'anexado' : 'anexo pendente'}</span>}
                </span>
              </button>
            }) : <div className="px-7 py-4 text-[10px] leading-5 text-neutral-500">Nenhum documento encontrado. Use “Novo doc” para cadastrar o primeiro procedimento.</div>}
          </div>
          <div className="border-t border-neutral-200/80 px-3 py-2 text-[9px] leading-4 text-neutral-400">Acesso por empresa autenticada · permissões e RLS mantidas no Supabase</div>
        </aside>

        <section className="min-w-0 bg-white">
          {error && <div role="alert" className="mx-4 mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</div>}
          {notice && <div role="status" className="mx-4 mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800">{notice}</div>}
          <form onSubmit={save} className="flex min-h-full flex-col">
            <div className="flex min-h-[46px] flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#2D8DB8]">{selected ? 'DOCUMENTO CONTROLADO' : 'NOVO DOCUMENTO'}</p>
                <h1 className="mt-0.5 truncate text-[16px] font-semibold tracking-[-.02em] text-[#182B3A]">{titulo || (selected ? selected.titulo_documento : 'Documento sem título')}</h1>
              </div>
              <div className="flex items-center gap-1.5">
                {selected && <span className="rounded-[2px] border border-neutral-200 px-2 py-1 text-[9px] text-neutral-500">REV. {String(selected.revisao).padStart(2,'0')}</span>}
                <button disabled={busy} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white hover:bg-[#247BA3] disabled:opacity-50"><Save size={13}/>{busy ? 'SALVANDO…' : 'SALVAR NOVA REVISÃO'}</button>
              </div>
            </div>

            {selected?.nome_arquivo && !selected.url_anexo && <div role="status" className="mx-4 mt-3 border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">Registro de índice importado: o arquivo original ainda não está anexado ao GED. Confirme o conteúdo, a revisão de origem e a vigência antes de homologar. A aprovação fica bloqueada enquanto o anexo estiver pendente.</div>}
              <div className="mx-auto flex w-full max-w-[960px] min-w-0 flex-1 flex-col px-3 py-4 sm:px-6 lg:px-8">
              {selected && <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-3 text-[9px] text-neutral-500">
                <span className={'rounded-[2px] px-2 py-1 font-semibold ' + (selected.status === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700' : selected.status === 'EM_REVISAO' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600')}>{selected.status.replaceAll('_',' ')}</span>
                <span>Responsável: <strong className="font-medium text-neutral-700">{selected.responsavel}</strong></span>
                <span>·</span><span>{dateTime(selected.criado_em)}</span>
                {selected.status === 'EM_REVISAO' && !(selected.nome_arquivo && !selected.url_anexo) && <button type="button" disabled={busy} onClick={() => void activateSelected()} className="ml-auto inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-emerald-200 bg-emerald-50 px-2 text-[9px] font-semibold text-emerald-700 disabled:opacity-50"><ShieldCheck size={12}/> APROVAR E ATIVAR</button>}
              </div>}

              {selected && <section aria-label="Anexo original do documento" className="mb-4 rounded-[3px] border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2"><Paperclip size={14} className="mt-0.5 shrink-0 text-[#2D8DB8]"/><div className="min-w-0">
                    <h2 className="text-[10px] font-semibold text-slate-800">Arquivo original controlado</h2>
                    {selected.url_anexo ? <p className="mt-0.5 max-w-[480px] truncate text-[9px] text-emerald-700" title={selected.nome_arquivo ?? ''}>{selected.nome_arquivo ?? 'Anexo vinculado ao GED'}</p> : <p className="mt-0.5 text-[9px] text-amber-700">Anexo pendente — a revisão não pode ser aprovada sem o original.</p>}
                  </div></div>
                  {selected.url_anexo && <button type="button" onClick={() => void openSelectedAttachment()} className="inline-flex h-[28px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-semibold text-slate-700"><ExternalLink size={11}/> ABRIR ANEXO</button>}
                </div>
                {selected.status === 'EM_REVISAO' && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                  <input aria-label="Selecionar arquivo original do documento" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm" onChange={event => setAttachmentFile(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-[9px] file:mr-2 file:h-[28px] file:rounded-[2px] file:border file:border-slate-300 file:bg-white file:px-2 file:text-[9px]"/>
                  <button type="button" disabled={busy || !attachmentFile} onClick={() => void attachSelectedFile()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[9px] font-semibold text-white disabled:opacity-50"><Upload size={12}/>{busy ? 'ENVIANDO…' : 'ANEXAR ORIGINAL'}</button>
                </div>}
              </section>}
              <section aria-label="Cabeçalho normativo do documento" className="mb-4 overflow-hidden rounded-[2px] border border-[#AFC8D5] bg-white shadow-[0_3px_0_rgba(18,59,80,0.08)]">
                <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="flex min-h-[104px] flex-col items-center justify-center gap-2 border-b border-[#D7E4EA] bg-[#F4FBFD] p-3 sm:border-b-0 sm:border-r">
                    <img src="/logo/logo.png" alt="Logotipo da empresa" className="max-h-[54px] max-w-[126px] object-contain" />
                    <span className="text-center text-[8px] font-bold uppercase tracking-[.12em] text-[#123B50]">Sistema de Gestão da Qualidade</span>
                  </div>
                  <div className="min-w-0">
                    <div className="border-b border-[#D7E4EA] px-3 py-2">
                      <p className="text-[8px] font-bold uppercase tracking-[.14em] text-[#2D8DB8]">{selected ? 'DOCUMENTO CONTROLADO · CABEÇALHO BLOQUEADO' : 'EMISSÃO DE NOVO DOCUMENTO'}</p>
                      <label className="mt-1 block">
                        <span className={label}>NOME DO DOCUMENTO / PROCEDIMENTO *</span>
                        <input className="h-[32px] w-full border-b border-slate-300 bg-transparent text-[13px] font-extrabold uppercase text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:border-transparent disabled:text-slate-600" value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={255} placeholder="Digite o nome oficial do documento" disabled={Boolean(selected)} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
                      <label className="border-b border-r border-[#D7E4EA] p-2 sm:border-b-0"><span className={label}>CÓDIGO *</span><input className={field + ' font-mono font-bold'} value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} required maxLength={50} placeholder="DSG-GQ-001" disabled={Boolean(selected)} /></label>
                      <div className="border-b border-[#D7E4EA] p-2 sm:border-b-0 sm:border-r"><span className={label}>REVISÃO</span><p className="pt-2 text-[12px] font-black text-[#123B50]">Rev. {String(selected?.revisao ?? ((history[0]?.revisao ?? 0) + (codigo.trim() ? 1 : 0))).padStart(2, '0')}</p></div>
                      <div className="border-r border-[#D7E4EA] p-2"><span className={label}>DATA DE EMISSÃO</span><p className="pt-2 text-[11px] font-semibold text-slate-700">{selected ? new Date(selected.criado_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p></div>
                      <div className="p-2"><span className={label}>STATUS</span><p className="pt-2 text-[10px] font-extrabold text-amber-700">{selected?.status?.replaceAll('_', ' ') ?? 'RASCUNHO / NOVA EMISSÃO'}</p></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 border-t border-[#D7E4EA] bg-[#F8FBFC] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <label className="border-b border-[#D7E4EA] p-2 sm:border-b-0 sm:border-r"><span className={label}>DEPARTAMENTO / SETOR</span><input className={field} value={departamento} onChange={e => setDepartamento(e.target.value.toUpperCase())} maxLength={100} placeholder="QUALIDADE" disabled={Boolean(selected)} /></label>
                  <div className="flex items-center px-3 py-2 text-[9px] leading-4 text-slate-500">O cabeçalho fica bloqueado durante a atualização. Ao salvar, o Supabase registra a nova revisão e atualiza automaticamente a identificação do documento.</div>
                </div>
              </section>

              <div className="mt-6 flex items-center justify-between border-b border-neutral-100 pb-2">
                <div><h2 className="text-[11px] font-semibold text-neutral-800">Conteúdo do procedimento</h2><p className="mt-0.5 text-[9px] text-neutral-400">Estruture objetivo, responsabilidades, método e critérios de aceitação.</p></div>
                <span className="text-[9px] tabular-nums text-neutral-400">{conteudo.length.toLocaleString('pt-BR')} caracteres</span>
              </div>
              <label className="mt-3 flex flex-1 flex-col"><span className={label}>CORPO DO DOCUMENTO *</span><textarea className="min-h-[320px] w-full flex-1 resize-y rounded-[2px] border border-neutral-200 bg-white p-4 text-[12px] leading-[1.85] text-neutral-700 outline-none transition-colors placeholder:text-neutral-300 focus:border-[#82BBD8] focus:ring-2 focus:ring-[#E8F4FA]" value={conteudo} onChange={e => setConteudo(e.target.value)} required placeholder={'1. OBJETIVO\nDescreva o objetivo do procedimento.\n\n2. RESPONSABILIDADES\nDefina os responsáveis.\n\n3. MÉTODO\nDescreva a sequência operacional e os critérios de aceitação.'}/></label>
              <label className="mt-4"><span className={label}>MOTIVO DA ALTERAÇÃO / REVISÃO *</span><input className={field} value={motivo} onChange={e => setMotivo(e.target.value)} required maxLength={1000} placeholder="Registre o motivo para rastreabilidade da alteração"/></label>

              <div className="mt-5 rounded-[2px] border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#2D8DB8]"/><div><p className="text-[10px] font-semibold text-neutral-700">Controle de revisão</p><p className="mt-1 text-[9px] leading-4 text-neutral-500">Ao salvar, o banco incrementa a revisão, arquiva a versão anterior como obsoleta e grava o motivo com o usuário autenticado. A nova revisão inicia em “Em revisão”.</p></div></div>
              </div>

              <footer className="mt-6 grid h-[32px] grid-cols-2 items-center divide-x divide-neutral-200/60 rounded-[2px] border border-neutral-200/80 bg-neutral-50/50 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-500 md:grid-cols-4">
                <div className="truncate px-1">CÓD: <span className="font-semibold text-neutral-700">{activeDoc?.codigo_documento ?? (codigo || '—')}</span></div>
                <div>REVISÃO: <span className="font-semibold text-neutral-700">{String(activeDoc?.revisao ?? (history[0]?.revisao ?? 0)).padStart(2,'0')}</span></div>
                <div className="truncate">VIGÊNCIA: <span className="font-semibold text-neutral-700">{activeDoc?.data_vigencia ?? 'PENDENTE'}</span></div>
                <div>STATUS: <span className={'font-extrabold ' + (activeDoc?.status === 'VIGENTE' ? 'text-emerald-600' : 'text-amber-600')}>{activeDoc?.status ?? 'RASCUNHO'}</span></div>
              </footer>
            </div>
          </form>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-white xl:border-l xl:border-t-0">
          <div className="flex h-[44px] items-center justify-between border-b border-neutral-100 px-3">
            <div className="flex items-center gap-2"><History size={14} className="text-[#2D8DB8]"/><h2 className="text-[9px] font-bold uppercase tracking-[.12em] text-neutral-600">Histórico e auditoria</h2></div>
            <span className="text-[9px] text-neutral-400">{history.length} versões</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-4 rounded-[5px] border border-neutral-100 bg-neutral-50/70 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">DOCUMENTO SELECIONADO</p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-800">{selected?.codigo_documento ?? (codigo || 'Nenhum documento')}</p>
              <p className="mt-1 text-[10px] leading-4 text-neutral-500">{selected?.titulo_documento ?? (titulo || 'Selecione um documento na árvore.')}</p>
            </div>
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[.12em] text-neutral-500">Trilha de versões</h3>
            {history.length ? <ol className="space-y-0">{history.map((row, index) => <li key={row.id} className="relative border-l border-neutral-200 pb-4 pl-4 last:pb-1">
              <span className={'absolute -left-[4px] top-1 size-[7px] rounded-full ring-2 ring-white ' + (row.status === 'VIGENTE' ? 'bg-emerald-500' : row.status === 'EM_REVISAO' ? 'bg-amber-500' : 'bg-neutral-300')}/>
              <button type="button" onClick={() => editRevision(row)} className="w-full rounded-[2px] text-left hover:bg-neutral-50">
                <span className="flex items-center justify-between gap-1"><span className="text-[10px] font-semibold text-neutral-800">Revisão {String(row.revisao).padStart(2,'0')}</span><span className={'rounded-[3px] px-1 py-0.5 text-[8px] ' + (row.status === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700' : row.status === 'EM_REVISAO' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500')}>{row.status.replaceAll('_',' ')}</span></span>
                <span className="mt-1 block text-[9px] text-neutral-500">{row.responsavel} · {dateTime(row.criado_em)}</span>
                {row.motivo_alteracao && <span className="mt-1 block text-[9px] leading-4 text-neutral-600">{row.motivo_alteracao}</span>}
              </button>
            </li>)}</ol> : <p className="text-[10px] leading-5 text-neutral-400">O histórico de versões aparece aqui após selecionar um documento.</p>}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-neutral-500">Registro de controle</h3>
              <div className="flex gap-2 text-[9px] leading-4 text-neutral-500"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600"/><p>As versões são gravadas no Supabase pelo fluxo de revisão. A trilha é somente leitura nesta tela; alterações dependem das funções e políticas do SGQ.</p></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div></main>
}
