import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FilePlus2, FileText, History, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import VendasLayout from '../VendasLayout'

type Revision = {
  id: string
  empresa_id: string
  codigo_documento: string
  titulo_documento: string
  departamento: string
  revisao: number
  responsavel: string
  status: string
  conteudo_texto: string
  motivo_alteracao: string | null
  criado_em: string
  data_vigencia: string | null
}

const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'

function dateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GEDDocumentos() {
  const { id: routeRevisionId } = useParams<{ id: string }>()
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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      setCompanyId(company.data)
      const result = await supabase.from('erp_qualidade_documentos_revisoes')
        .select('id,empresa_id,codigo_documento,titulo_documento,departamento,revisao,responsavel,status,conteudo_texto,motivo_alteracao,criado_em,data_vigencia')
        .eq('empresa_id', company.data)
        .order('criado_em', { ascending: false })
      if (result.error) throw result.error
      const rows = (result.data ?? []) as Revision[]
      setRevisions(rows)
      if (selectedId && !rows.some(row => row.id === selectedId)) setSelectedId('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o GED.')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { void load() }, [load])

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

  const activeDoc = selected ?? (codigo ? revisions.find(row => row.codigo_documento === codigo) ?? null : null)
  const history = revisions.filter(row => row.codigo_documento === (selected?.codigo_documento ?? codigo)).sort((a, b) => b.revisao - a.revisao)

  return <VendasLayout title="GED · Gestão Eletrônica de Documentos" subtitle="Documentos controlados, revisão automática e rastreabilidade do SGQ" onRefresh={() => void load()}>
    <div className="min-h-[calc(100vh-96px)] bg-[#F7F9FC] text-neutral-800">
      <div className="flex h-[42px] items-center justify-between border-b border-neutral-200 bg-white px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid size-6 place-items-center rounded-[5px] bg-[#E9F4FC] text-[#2D8DB8]"><FileText size={14}/></div>
          <span className="truncate text-[11px] font-semibold text-[#123B50]">ESPAÇO DE TRABALHO / GED</span>
          {selected && <><span className="text-neutral-300">/</span><span className="max-w-[260px] truncate text-[10px] text-neutral-500">{selected.titulo_documento}</span></>}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => void load()} title="Atualizar documentos" className="inline-flex h-[30px] items-center gap-1 rounded-[4px] border border-neutral-200 px-2 text-[10px] text-neutral-600 hover:bg-neutral-50"><RefreshCw size={12}/> ATUALIZAR</button>
          <button type="button" onClick={startNew} className="inline-flex h-[30px] items-center gap-1 rounded-[4px] border border-[#C6DFEF] bg-[#F2F8FC] px-2 text-[10px] font-semibold text-[#246F98] hover:bg-[#E6F3FB]"><FilePlus2 size={13}/> NOVO DOC</button>
          <button type="button" onClick={() => window.print()} className="hidden h-[30px] items-center gap-1 rounded-[4px] border border-neutral-200 px-2 text-[10px] text-neutral-600 hover:bg-neutral-50 sm:inline-flex"><ShieldCheck size={12}/> IMPRIMIR</button>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-138px)] grid-cols-1 xl:grid-cols-[260px_minmax(420px,1fr)_280px]">
        <aside className="flex min-h-0 flex-col border-b border-neutral-200 bg-neutral-50/80 xl:border-b-0 xl:border-r xl:border-neutral-200/70">
          <div className="flex h-[44px] items-center justify-between px-3">
            <span className="text-[9px] font-bold uppercase tracking-[.13em] text-neutral-500">ÁRVORE DE DOCUMENTOS</span>
            <span className="rounded-[4px] bg-neutral-200/70 px-1.5 py-0.5 text-[9px] tabular-nums text-neutral-600">{documents.length}</span>
          </div>
          <div className="px-2 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-[9px] text-neutral-400"/>
              <input aria-label="Pesquisar documento" className={field + ' pl-7 bg-white'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código ou título"/>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            <div className="flex h-[29px] items-center gap-2 rounded-[4px] px-2 text-[10px] font-semibold text-neutral-600">
              <span className="text-[#2D8DB8]"><History size={14}/></span><span>Documentos controlados</span>
            </div>
            {loading ? <p className="px-7 py-3 text-[10px] text-neutral-500">Carregando documentos…</p> : documents.length ? documents.map(doc => {
              const isSelected = selectedId === doc.id
              const stateColor = doc.status === 'VIGENTE' || doc.status === 'ATIVA' ? 'bg-emerald-50 text-emerald-700' : doc.status === 'EM_REVISAO' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
              return <button key={doc.id} type="button" onClick={() => editRevision(doc)} className={'group mb-0.5 flex w-full items-start gap-2 rounded-[5px] px-2 py-2 text-left transition-colors ' + (isSelected ? 'bg-[#E8F3FA] text-[#123B50]' : 'text-neutral-600 hover:bg-white')}>
                <span className={'mt-0.5 shrink-0 ' + (isSelected ? 'text-[#2D8DB8]' : 'text-neutral-400')}><FileText size={14}/></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1"><span className="truncate text-[10px] font-semibold">{doc.codigo_documento}</span><span className={'shrink-0 rounded-[3px] px-1 py-[2px] text-[8px] font-semibold ' + stateColor}>{doc.status.replaceAll('_',' ')}</span></span>
                  <span className="mt-0.5 block truncate text-[10px] leading-4 text-neutral-500">{doc.titulo_documento}</span>
                  <span className="mt-0.5 block text-[9px] text-neutral-400">REV. {String(doc.revisao).padStart(2,'0')} · {doc.departamento || 'QUALIDADE'}</span>
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
                {selected && <span className="rounded-[4px] border border-neutral-200 px-2 py-1 text-[9px] text-neutral-500">REV. {String(selected.revisao).padStart(2,'0')}</span>}
                <button disabled={busy} className="inline-flex h-[30px] items-center gap-1.5 rounded-[4px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white hover:bg-[#247BA3] disabled:opacity-50"><Save size={13}/>{busy ? 'SALVANDO…' : 'SALVAR NOVA REVISÃO'}</button>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-5 py-5 sm:px-8 lg:px-12">
              {selected && <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-3 text-[9px] text-neutral-500">
                <span className={'rounded-[4px] px-2 py-1 font-semibold ' + (selected.status === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700' : selected.status === 'EM_REVISAO' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600')}>{selected.status.replaceAll('_',' ')}</span>
                <span>Responsável: <strong className="font-medium text-neutral-700">{selected.responsavel}</strong></span>
                <span>·</span><span>{dateTime(selected.criado_em)}</span>
                {selected.status === 'EM_REVISAO' && <button type="button" disabled={busy} onClick={() => void activateSelected()} className="ml-auto inline-flex h-[30px] items-center gap-1 rounded-[4px] border border-emerald-200 bg-emerald-50 px-2 text-[9px] font-semibold text-emerald-700 disabled:opacity-50"><ShieldCheck size={12}/> APROVAR E ATIVAR</button>}
              </div>}

              <div className="grid gap-x-3 gap-y-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                <label><span className={label}>CÓDIGO DO DOCUMENTO *</span><input className={field} value={codigo} onChange={e => setCodigo(e.target.value)} required maxLength={50} placeholder="POP-QUAL-001"/></label>
                <label><span className={label}>TÍTULO DO PROCEDIMENTO *</span><input className={field} value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={255} placeholder="Inspeção de recebimento"/></label>
                <label><span className={label}>DEPARTAMENTO</span><input className={field} value={departamento} onChange={e => setDepartamento(e.target.value)} maxLength={100} placeholder="QUALIDADE"/></label>
                <div className="flex items-end pb-1 text-[9px] text-neutral-400">Identificação e controle de revisão conforme SGQ.</div>
              </div>

              <div className="mt-6 flex items-center justify-between border-b border-neutral-100 pb-2">
                <div><h2 className="text-[11px] font-semibold text-neutral-800">Conteúdo do procedimento</h2><p className="mt-0.5 text-[9px] text-neutral-400">Estruture objetivo, responsabilidades, método e critérios de aceitação.</p></div>
                <span className="text-[9px] tabular-nums text-neutral-400">{conteudo.length.toLocaleString('pt-BR')} caracteres</span>
              </div>
              <label className="mt-3 flex flex-1 flex-col"><span className={label}>CORPO DO DOCUMENTO *</span><textarea className="min-h-[320px] w-full flex-1 resize-y rounded-[4px] border border-neutral-200 bg-white p-4 text-[12px] leading-[1.85] text-neutral-700 outline-none transition-colors placeholder:text-neutral-300 focus:border-[#82BBD8] focus:ring-2 focus:ring-[#E8F4FA]" value={conteudo} onChange={e => setConteudo(e.target.value)} required placeholder={'1. OBJETIVO\nDescreva o objetivo do procedimento.\n\n2. RESPONSABILIDADES\nDefina os responsáveis.\n\n3. MÉTODO\nDescreva a sequência operacional e os critérios de aceitação.'}/></label>
              <label className="mt-4"><span className={label}>MOTIVO DA ALTERAÇÃO / REVISÃO *</span><input className={field} value={motivo} onChange={e => setMotivo(e.target.value)} required maxLength={1000} placeholder="Registre o motivo para rastreabilidade da alteração"/></label>

              <div className="mt-5 rounded-[4px] border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#2D8DB8]"/><div><p className="text-[10px] font-semibold text-neutral-700">Controle de revisão</p><p className="mt-1 text-[9px] leading-4 text-neutral-500">Ao salvar, o banco incrementa a revisão, arquiva a versão anterior como obsoleta e grava o motivo com o usuário autenticado. A nova revisão inicia em “Em revisão”.</p></div></div>
              </div>

              <footer className="mt-6 grid h-[32px] grid-cols-2 items-center divide-x divide-neutral-200/60 rounded-[4px] border border-neutral-200/80 bg-neutral-50/50 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-500 md:grid-cols-4">
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
              <button type="button" onClick={() => editRevision(row)} className="w-full rounded-[4px] text-left hover:bg-neutral-50">
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
  </VendasLayout>
}
