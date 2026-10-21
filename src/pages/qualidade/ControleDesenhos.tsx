/**
 * SYSNQRA ERP & SGQ INDUSTRIAL — Controle de Desenhos Técnicos e Moldes
 * REVISAO: REV-DESENHOS-CAD-001 | DATA: 2026-10-20
 * ESCOPO: cadastro de revisões por empresa, consulta e homologação com RPC protegida.
 * GED documental geral e telas aprovadas permanecem intactos.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ExternalLink, FilePlus2, FileText, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Drawing = {
  id: string
  empresa_id: string
  codigo_desenho: string
  produto_vinculado: string
  molde_referencia: string | null
  numero_revisao: number
  responsavel_nome: string
  status_revisao: 'EM_REVISAO' | 'HOMOLOGADO' | 'OBSOLETO'
  url_arquivo_cad: string | null
  motivo_alteracao: string | null
  criado_em: string
  data_homologacao: string | null
}
const field = 'h-9 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-600'
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function ControleDesenhos() {
  const [rows, setRows] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [codigo, setCodigo] = useState('')
  const [produto, setProduto] = useState('')
  const [molde, setMolde] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão autenticada não identificada.')
      const data = await fetchAllPages<Drawing>((from, to) => supabase
        .from('erp_qualidade_desenhos')
        .select('id,empresa_id,codigo_desenho,produto_vinculado,molde_referencia,numero_revisao,responsavel_nome,status_revisao,url_arquivo_cad,motivo_alteracao,criado_em,data_homologacao', { count: 'exact' })
        .eq('empresa_id', tenant.data)
        .order('codigo_desenho')
        .order('numero_revisao', { ascending: false })
        .range(from, to))
      setRows(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os desenhos técnicos.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = normalize(query.trim())
    return rows.filter(row => {
      const matches = !term || normalize([row.codigo_desenho,row.produto_vinculado,row.molde_referencia ?? ''].join(' ')).includes(term)
      return matches && (statusFilter === 'TODOS' || row.status_revisao === statusFilter)
    })
  }, [rows, query, statusFilter])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!codigo.trim() || !produto.trim()) { setError('Informe o código do desenho e o produto vinculado.'); return }
    if (arquivo.trim() && !/^https:\/\/[^\s]+$/i.test(arquivo.trim())) { setError('O link do arquivo técnico precisa começar com HTTPS.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.rpc('erp_qualidade_desenho_nova_revisao', {
        p_codigo_desenho: codigo.trim().toUpperCase(),
        p_produto_vinculado: produto.trim(),
        p_molde_referencia: molde.trim() || null,
        p_responsavel_nome: responsavel.trim() || null,
        p_url_arquivo_cad: arquivo.trim() || null,
        p_motivo_alteracao: motivo.trim() || null,
      })
      if (result.error) throw result.error
      setCodigo(''); setProduto(''); setMolde(''); setArquivo(''); setMotivo('')
      setNotice('Nova revisão registrada como EM REVISÃO. A revisão homologada anterior continua vigente até a aprovação da nova revisão.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar revisão do desenho.')
    } finally { setBusy(false) }
  }

  const approve = async (row: Drawing) => {
    if (!row.url_arquivo_cad) { setError('Não é possível homologar sem um link HTTPS para o arquivo técnico.'); return }
    if (!window.confirm('Homologar ' + row.codigo_desenho + ' Rev. ' + row.numero_revisao + '? A revisão homologada anterior será marcada como obsoleta.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.rpc('erp_qualidade_desenho_homologar', { p_desenho_id: row.id })
      if (result.error) throw result.error
      setNotice('Revisão ' + row.numero_revisao + ' de ' + row.codigo_desenho + ' homologada. A revisão anterior foi obsoletada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao homologar o desenho.')
    } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900">
    <QualitySidebar active="/qualidade/controle-desenhos" />
    <div className="mx-auto max-w-[1600px] space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9DDE6] bg-white px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#C5E2EC] bg-[#EAF6FA] text-[#2D8DB8]"><FileText size={18}/></span>
          <div><h1 className="text-[14px] font-bold text-[#123B50]">Controle de Desenhos Técnicos e Moldes</h1><p className="mt-0.5 text-[10px] text-slate-500">Revisões, arquivos CAD e homologação para uso no chão de fábrica.</p></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-9 items-center gap-1.5 border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:border-[#2D8DB8] disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> ATUALIZAR</button>
      </header>

      {(error || notice) && <div role={error ? 'alert' : 'status'} className={'border px-3 py-2 text-[10px] ' + (error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || notice}</div>}

      <section className="border border-[#D4E3E9] bg-white shadow-sm">
        <header className="flex h-10 items-center gap-2 border-b border-[#D4E3E9] bg-[#EAF4F8] px-3"><FilePlus2 size={14} className="text-[#2D8DB8]"/><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Registrar nova revisão</h2><span className="ml-auto text-[9px] text-slate-500">Controles h-9 · grid 12 colunas</span></header>
        <form onSubmit={submit} className="grid grid-cols-12 items-end gap-3 p-3">
          <div className="col-span-12 sm:col-span-4"><label className={label} htmlFor="drawing-code">Código do desenho</label><input id="drawing-code" className={field} maxLength={50} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="DWG-M-2026-089" required/></div>
          <div className="col-span-12 sm:col-span-5"><label className={label} htmlFor="drawing-product">Produto vinculado</label><input id="drawing-product" className={field} maxLength={255} value={produto} onChange={e => setProduto(e.target.value)} placeholder="Código ou nome do produto" required/></div>
          <div className="col-span-12 sm:col-span-3"><label className={label} htmlFor="drawing-mold">Molde / ferramenta</label><input id="drawing-mold" className={field} maxLength={120} value={molde} onChange={e => setMolde(e.target.value)} placeholder="Identificação do molde"/></div>
          <div className="col-span-12 sm:col-span-4"><label className={label} htmlFor="drawing-owner">Projetista responsável</label><input id="drawing-owner" className={field} maxLength={255} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Responsável técnico"/></div>
          <div className="col-span-12 sm:col-span-8"><label className={label} htmlFor="drawing-url">Link HTTPS do arquivo PDF/CAD</label><input id="drawing-url" type="url" className={field} value={arquivo} onChange={e => setArquivo(e.target.value)} placeholder="https://... (obrigatório para homologar)"/></div>
          <div className="col-span-12"><label className={label} htmlFor="drawing-reason">Motivo da alteração</label><input id="drawing-reason" className={field} maxLength={2000} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o motivo desta revisão"/></div>
          <div className="col-span-12 flex justify-end border-t border-slate-100 pt-3"><button type="submit" disabled={busy} className="inline-flex h-9 items-center gap-2 bg-[#2D8DB8] px-4 text-[10px] font-bold text-white hover:bg-[#247BA3] disabled:opacity-50">{busy ? 'PROCESSANDO…' : 'REGISTRAR REVISÃO'}</button></div>
        </form>
      </section>

      <section className="border border-[#D4E3E9] bg-white">
        <header className="grid grid-cols-1 gap-2 border-b border-[#D4E3E9] p-3 md:grid-cols-[minmax(0,1fr)_190px] md:items-end">
          <div><label className={label} htmlFor="drawing-search">Pesquisar desenhos, produtos ou moldes</label><div className="relative"><Search size={13} className="absolute left-2.5 top-3 text-slate-400"/><input id="drawing-search" className={field + ' pl-8'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código, produto ou molde"/></div></div>
          <div><label className={label} htmlFor="drawing-status">Status da revisão</label><select id="drawing-status" className={field} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="TODOS">Todos os status</option><option value="HOMOLOGADO">Homologados</option><option value="EM_REVISAO">Em revisão</option><option value="OBSOLETO">Obsoletos</option></select></div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#123B50] text-[9px] font-bold uppercase tracking-wider text-white"><tr><th className="px-3 py-2.5">Código / revisão</th><th className="px-3 py-2.5">Produto / molde</th><th className="px-3 py-2.5">Responsável</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Arquivo</th><th className="px-3 py-2.5 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-[10px] text-slate-700">
              {loading ? <tr><td colSpan={6} className="px-3 py-7 text-center text-slate-500">Carregando revisões da empresa…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-7 text-center text-slate-500">Nenhuma revisão encontrada. Os registros serão exibidos após a migração e o primeiro cadastro.</td></tr> : filtered.map(row => {
                const badge = row.status_revisao === 'HOMOLOGADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status_revisao === 'EM_REVISAO' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-100 text-slate-600'
                return <tr key={row.id} className={row.status_revisao === 'OBSOLETO' ? 'bg-slate-50 text-slate-400' : 'hover:bg-[#F4FBFD]'}>
                  <td className="px-3 py-2.5"><strong className="block text-[#123B50]">{row.codigo_desenho}</strong><span className="text-[9px] text-slate-500">Rev. {String(row.numero_revisao).padStart(2,'0')} · {new Date(row.criado_em).toLocaleDateString('pt-BR')}</span></td>
                  <td className="px-3 py-2.5"><span className="block font-semibold">{row.produto_vinculado}</span>{row.molde_referencia && <span className="text-[9px] text-slate-500">Molde: {row.molde_referencia}</span>}</td>
                  <td className="px-3 py-2.5">{row.responsavel_nome}</td>
                  <td className="px-3 py-2.5"><span className={'inline-flex border px-2 py-1 text-[8px] font-bold ' + badge}>{row.status_revisao.replaceAll('_',' ')}</span></td>
                  <td className="px-3 py-2.5">{row.url_arquivo_cad ? <a href={row.url_arquivo_cad} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#247BA3] underline"><ExternalLink size={12}/> ABRIR ARQUIVO</a> : <span className="text-amber-700">Arquivo pendente</span>}</td>
                  <td className="px-3 py-2.5 text-right">{row.status_revisao === 'EM_REVISAO' && <button type="button" onClick={() => void approve(row)} disabled={busy || !row.url_arquivo_cad} className="inline-flex h-7 items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 text-[9px] font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck size={12}/> HOMOLOGAR</button>}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D4E3E9] bg-slate-50 px-3 py-2 text-[9px] text-slate-500"><span>SYSNQRA ERP & SGQ INDUSTRIAL · Controle de revisão técnica</span><span>Uma revisão obsoleta nunca pode ser homologada diretamente.</span></footer>
      </section>
    </div>
  </main>
}
