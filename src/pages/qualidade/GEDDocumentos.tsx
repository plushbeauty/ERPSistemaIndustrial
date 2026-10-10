import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
      const saved = result.data as { codigo_documento?: string; revisao?: number; status?: string } | null
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

  return <VendasLayout title="Controle Documental GED" subtitle="Procedimentos, revisões controladas e rastreabilidade ISO" onRefresh={() => void load()}>
    <div className="grid min-h-0 gap-3 bg-[#F4FBFD] p-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 border border-slate-200 bg-white">
        <header className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <div className="flex items-center gap-2"><FileText size={16} className="text-[#2D8DB8]"/><h2 className="text-[11px] font-bold uppercase tracking-wide text-[#123B50]">Editor de procedimento / POP</h2></div>
          <button type="button" onClick={startNew} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] px-2 text-[10px] font-bold text-[#2D8DB8]"><FilePlus2 size={14}/> NOVO DOCUMENTO</button>
        </header>
        <form onSubmit={save} className="grid gap-3 p-3">
          <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)_180px]">
            <label><span className={label}>Código do documento *</span><input className={field} value={codigo} onChange={e => setCodigo(e.target.value)} required maxLength={50} placeholder="POP-QUAL-001"/></label>
            <label><span className={label}>Título do procedimento *</span><input className={field} value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={255} placeholder="Inspeção de recebimento"/></label>
            <label><span className={label}>Departamento</span><input className={field} value={departamento} onChange={e => setDepartamento(e.target.value)} maxLength={100}/></label>
          </div>
          {selected && <div className="flex flex-wrap items-center gap-2 border border-sky-100 bg-sky-50 px-2 py-1 text-[9px] text-sky-900"><ShieldCheck size={14}/> Visualizando Rev. {String(selected.revisao).padStart(2, '0')} · {selected.status} · {selected.responsavel} · {dateTime(selected.criado_em)}<span className="ml-auto">Ao salvar, uma nova revisão será criada.</span>{selected.status === 'EM_REVISAO' && <button type="button" disabled={busy} onClick={() => void activateSelected()} className="inline-flex h-[26px] items-center gap-1 bg-emerald-700 px-2 font-bold text-white disabled:opacity-50"><ShieldCheck size={13}/> APROVAR E ATIVAR</button>}</div>}
          <label><span className={label}>Conteúdo do procedimento *</span><textarea className="min-h-[360px] w-full resize-y rounded-[2px] border border-slate-300 bg-white p-3 text-[11px] leading-5 text-slate-800 outline-none focus:border-[#2D8DB8]" value={conteudo} onChange={e => setConteudo(e.target.value)} required placeholder={'1. OBJETIVO\nDescreva o objetivo do procedimento.\n\n2. RESPONSABILIDADES\nDefina os responsáveis.\n\n3. MÉTODO\nDescreva a sequência operacional e os critérios de aceitação.'}/></label>
          <label><span className={label}>Motivo da alteração / revisão</span><input className={field} value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={1000} placeholder="Descreva o motivo para rastreabilidade da alteração"/></label>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><p className="text-[9px] text-slate-500">Salvar gera uma revisão imutável com numeração automática e status EM REVISÃO.</p><button disabled={busy} className="inline-flex h-[30px] items-center gap-2 bg-[#2D8DB8] px-4 text-[10px] font-bold text-white disabled:opacity-50"><Save size={14}/>{busy ? 'SALVANDO…' : 'SALVAR NOVA REVISÃO'}</button></div>
        </form>
        {error && <p role="alert" className="mx-3 mb-3 border border-red-200 bg-red-50 p-2 text-[10px] text-red-700">{error}</p>}
        {notice && <p role="status" className="mx-3 mb-3 border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</p>}
      </section>

      <aside className="min-w-0 border border-slate-200 bg-white">
        <header className="flex h-10 items-center gap-2 border-b border-slate-200 px-3"><History size={15} className="text-[#2D8DB8]"/><h2 className="text-[10px] font-bold uppercase tracking-wide text-[#123B50]">Árvore de revisões</h2><button type="button" onClick={() => void load()} className="ml-auto p-1 text-slate-500" title="Atualizar"><RefreshCw size={14}/></button></header>
        <div className="border-b border-slate-100 p-2"><div className="relative"><Search size={13} className="absolute left-2 top-2 text-slate-400"/><input aria-label="Pesquisar documento" className={field + ' pl-7'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Código ou título"/></div></div>
        <div className="max-h-[280px] overflow-auto border-b border-slate-100">
          {loading ? <p className="p-3 text-[10px] text-slate-500">Carregando revisões…</p> : documents.length ? documents.map(doc => <button key={doc.id} type="button" onClick={() => editRevision(doc)} className={'block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-sky-50 ' + (selectedId === doc.id ? 'bg-sky-50' : '')}><span className="block text-[10px] font-bold text-slate-800">{doc.codigo_documento} · Rev. {String(doc.revisao).padStart(2, '0')}</span><span className="mt-1 block truncate text-[9px] text-slate-500">{doc.titulo_documento}</span><span className="mt-1 block text-[9px] text-slate-500">{doc.status} · {dateTime(doc.criado_em)}</span></button>) : <p className="p-3 text-[10px] text-slate-500">Nenhum documento cadastrado para esta empresa.</p>}
        </div>
        <div className="p-3"><h3 className="mb-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500"><History size={13}/> Histórico do documento</h3>
          {history.length ? <ol className="space-y-2">{history.map((row, index) => <li key={row.id} className="relative border-l border-slate-200 pl-3"><span className={'absolute -left-[4px] top-1 size-2 rounded-full ' + (index === 0 && row.status !== 'OBSOLETO' ? 'bg-emerald-500' : 'bg-slate-300')}/><button type="button" onClick={() => editRevision(row)} className="text-left"><span className="block text-[10px] font-bold text-slate-800">Rev. {String(row.revisao).padStart(2, '0')} · {row.status}</span><span className="block text-[9px] text-slate-500">{row.responsavel} · {dateTime(row.criado_em)}</span>{row.motivo_alteracao && <span className="mt-1 block text-[9px] text-slate-600">{row.motivo_alteracao}</span>}</button></li>)}</ol> : <p className="text-[9px] text-slate-500">Selecione um documento para visualizar seu histórico.</p>}
        </div>
      </aside>

      {activeDoc && <footer className="col-span-full grid h-8 grid-cols-2 items-center divide-x divide-neutral-300 border border-neutral-300 bg-neutral-50 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-600 md:grid-cols-4"><div className="truncate px-1">CÓD. DOC: <span className="font-normal text-neutral-800">{activeDoc.codigo_documento}</span></div><div>REVISÃO: <span className="font-normal text-neutral-800">{String(activeDoc.revisao).padStart(2, '0')}</span></div><div>DATA VIGÊNCIA: <span className="font-normal text-neutral-800">{activeDoc.data_vigencia ?? 'PENDENTE'}</span></div><div>STATUS: <span className="font-extrabold text-emerald-600">{activeDoc.status}</span></div></footer>}
    </div>
  </VendasLayout>
}
