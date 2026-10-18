import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Factory, Lock, Package, RefreshCw, Ruler, Search, Truck, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Cliente = { nome: string }
type Row = {
  id: string
  numero: number
  pedido_cliente: string | null
  status: string
  total: number
  data_entrega_prometida: string | null
  cliente: Cliente | null
}
type RowFromDb = Omit<Row, 'cliente'> & { cliente: Cliente | Cliente[] | null }
type Item = {
  id: string
  produto_id: string | null
  descricao: string
  quantidade: number
  data_fabricacao: string | null
  produto?: { codigo: string; unidade: string } | null
}
type Anexo = { id: string; url_arquivo: string; nome_arquivo: string; criado_em: string }
type Stage = 'comercial' | 'engenharia' | 'pcp' | 'producao' | 'almoxarifado' | 'faturamento'
type FilterKey = 'todos' | 'atrasados' | 'eng' | 'pcp' | 'producao' | 'almoxarifado' | 'faturamento'

const PAGE_SIZE = 50
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0)
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const formatDate = (v: string | null) => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(v + 'T00:00:00')) : '—'
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const stageOrder: Stage[] = ['comercial', 'engenharia', 'pcp', 'producao', 'almoxarifado', 'faturamento']

const isDelayed = (row: Row) =>
  !!row.data_entrega_prometida &&
  new Date(row.data_entrega_prometida + 'T00:00:00') < today() &&
  !norm(row.status).includes('fatur')

const matchesFilter = (row: Row, filter: FilterKey) => {
  const s = norm(row.status)
  if (filter === 'todos') return true
  if (filter === 'atrasados') return isDelayed(row)
  if (filter === 'eng') return s.includes('engen') || s.includes('projeto')
  if (filter === 'pcp') return s.includes('pcp')
  if (filter === 'producao') return s.includes('produc') || s.includes('fabric')
  if (filter === 'almoxarifado') return s.includes('almox') || s.includes('mater')
  return s.includes('fatur')
}

export default function VendasStatusPedidos() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [canRectify, setCanRectify] = useState(false)

  const empresa = async () => {
    const result = await supabase.rpc('erp_current_empresa_id')
    if (result.error || !result.data) throw result.error ?? new Error('Empresa não identificada.')
    return String(result.data)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const empresaId = await empresa()
      const fetchedRows = await fetchAllPages<RowFromDb>((from, to) =>
        supabase
          .from('erp_pedidos_venda')
          .select('id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .order('numero', { ascending: false })
          .range(from, to)
      )
      setRows(fetchedRows.map(row => ({
        ...row,
        cliente: Array.isArray(row.cliente) ? row.cliente[0] ?? null : row.cliente,
      })))
      setPage(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos do servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        const profile = await supabase
          .from('erp_usuarios')
          .select('perfil,is_master,ativo,deleted_at')
          .eq('auth_user_id', data.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profile.error) return
        const role = String(profile.data?.perfil ?? '').trim().toUpperCase()
        setCanRectify(Boolean(profile.data?.is_master) || role === 'ADMINISTRADOR' || role === 'CONTROLADORIA')
      } catch {
        setCanRectify(false)
      }
    })()
    // Carregamento inicial intencional; a atualização manual usa load().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadItems = async (row: Row) => {
    setSelected(row)
    setItems([])
    setAnexos([])
    setError('')
    try {
      const empresaId = await empresa()
      const result = await supabase
        .from('erp_pedidos_venda_itens')
        .select('id,produto_id,descricao,quantidade,data_fabricacao,produto:erp_produtos(codigo,unidade)')
        .eq('empresa_id', empresaId)
        .eq('pedido_id', row.id)
        .order('id')
      if (result.error) throw result.error
      setItems((result.data ?? []) as unknown as Item[])

      const attachments = await supabase
        .from('erp_pedidos_anexos')
        .select('id,url_arquivo,nome_arquivo,criado_em')
        .eq('empresa_id', empresaId)
        .eq('pedido_id', row.id)
        .order('criado_em', { ascending: false })
      if (attachments.error) throw attachments.error
      setAnexos((attachments.data ?? []) as Anexo[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens e anexos do pedido.')
    }
  }

  const stateFor = (row: Row, stage: Stage) => {
    const s = norm(row.status)
    if (isDelayed(row)) return { label: 'ATRASADO', tone: 'red' as const }
    if (stage === 'comercial') return s.includes('rascun') || s.includes('aberto')
      ? { label: 'DIGITAÇÃO', tone: 'yellow' as const }
      : { label: 'CONCLUÍDO', tone: 'green' as const }
    if (stage === 'engenharia') return s.includes('engen') || s.includes('projeto')
      ? { label: 'ANÁLISE DE PROJETO', tone: 'yellow' as const }
      : { label: 'LIBERADO', tone: 'green' as const }
    if (stage === 'pcp' || stage === 'almoxarifado') return s.includes('mater') || s.includes('almox')
      ? { label: 'FALTA MATÉRIA-PRIMA', tone: 'red' as const }
      : { label: 'RESERVADO', tone: 'green' as const }
    if (stage === 'producao') return s.includes('produc') || s.includes('fabric')
      ? { label: s.includes('final') ? 'EM ESTOQUE' : 'EM FABRICAÇÃO', tone: s.includes('final') ? 'green' as const : 'yellow' as const }
      : { label: 'AGUARDANDO', tone: 'gray' as const }
    return s.includes('fatur')
      ? { label: 'FATURADO', tone: 'green' as const }
      : { label: 'AGUARDANDO', tone: 'gray' as const }
  }

  const blockerIndex = (row: Row) => {
    const s = norm(row.status)
    if (s.includes('fatur')) return -1
    if (s.includes('produc')) return 3
    if (s.includes('almox') || s.includes('mater')) return 2
    if (s.includes('pcp')) return 2
    if (s.includes('engen') || s.includes('projeto')) return 1
    if (s.includes('rascun') || s.includes('aberto')) return 0
    return 0
  }

  const cell = (row: Row, stage: Stage) => {
    if (stageOrder.indexOf(stage) > blockerIndex(row)) return <span title="Etapa bloqueada"><Lock size={10} style={{ opacity: 0.45 }} /></span>
    const status = stateFor(row, stage)
    const tone = status.tone === 'red'
      ? 'bg-red-100 text-red-700'
      : status.tone === 'yellow'
        ? 'bg-amber-100 text-amber-700'
        : status.tone === 'green'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
    return <span className={`inline-flex rounded-none px-1.5 py-0.5 text-[8px] font-medium ${tone}`}>{status.label}</span>
  }

  const searchedRows = useMemo(() => {
    const query = norm(q.trim())
    return rows.filter(row => {
      if (!matchesFilter(row, filter)) return false
      if (!query) return true
      return String(row.numero).includes(query) ||
        norm(row.pedido_cliente ?? '').includes(query) ||
        norm(row.cliente?.nome ?? '').includes(query)
    })
  }, [rows, q, filter])

  const pageCount = Math.max(1, Math.ceil(searchedRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = searchedRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const filters = [
    { key: 'todos', label: 'TODOS', Icon: Package },
    { key: 'atrasados', label: 'ATRASADOS', Icon: AlertTriangle },
    { key: 'eng', label: 'ENG', Icon: Ruler },
    { key: 'pcp', label: 'PCP', Icon: Factory },
    { key: 'producao', label: 'PRODUÇÃO', Icon: Factory },
    { key: 'almoxarifado', label: 'ALMOXARIFADO', Icon: Boxes },
    { key: 'faturamento', label: 'FATURAMENTO', Icon: Truck },
  ] as const

  const filterCounts = useMemo(() => ({
    todos: rows.length,
    atrasados: rows.filter(row => matchesFilter(row, 'atrasados')).length,
    eng: rows.filter(row => matchesFilter(row, 'eng')).length,
    pcp: rows.filter(row => matchesFilter(row, 'pcp')).length,
    producao: rows.filter(row => matchesFilter(row, 'producao')).length,
    almoxarifado: rows.filter(row => matchesFilter(row, 'almoxarifado')).length,
    faturamento: rows.filter(row => matchesFilter(row, 'faturamento')).length,
  }), [rows])

  return (
    <VendasLayout title="Pedidos Pendentes / Workflow Geral" subtitle="Rastreabilidade do pedido" onRefresh={() => void load()}>
      <div className="relative space-y-1.5 text-[11px]">
        {error && (
          <div role="alert" className="flex items-start justify-between gap-2 border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-medium text-red-800">
            <span className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span><strong>Erro ao processar solicitação:</strong> {error}</span></span>
            <button type="button" aria-label="Fechar aviso de erro" onClick={() => setError('')} className="shrink-0"><X size={13} /></button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {filters.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFilter(key); setPage(0) }}
              aria-pressed={filter === key}
              className={`flex h-7 items-center gap-1 border px-2 text-[9px] font-semibold ${filter === key ? 'border-[#286C58] bg-[#3A9D78] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              <Icon size={11} />{label} <span className="tabular-nums">({filterCounts[key]})</span>
            </button>
          ))}
          <div className="ml-auto flex h-7 w-full items-center gap-1 border border-slate-300 bg-white px-2 md:w-80">
            <Search size={12} className="shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={event => { setQ(event.target.value); setPage(0) }}
              placeholder="Buscar nº, pedido do cliente ou nome..."
              aria-label="Buscar por número do pedido, referência do cliente ou nome do cliente"
              className="h-6 min-w-0 w-full border-0 bg-transparent px-1 text-[10px] outline-none"
            />
            {q && <button type="button" aria-label="Limpar busca" onClick={() => { setQ(''); setPage(0) }}><X size={11} /></button>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] text-slate-600">
          <span className="font-semibold uppercase tracking-wide">Legenda do workflow</span>
          <span className="inline-flex items-center gap-1"><span className="block h-2 w-2 border border-emerald-400 bg-emerald-100" />Concluído / liberado</span>
          <span className="inline-flex items-center gap-1"><span className="block h-2 w-2 border border-amber-400 bg-amber-100" />Em processamento</span>
          <span className="inline-flex items-center gap-1"><span className="block h-2 w-2 border border-red-400 bg-red-100" />Bloqueio / atraso</span>
          <span className="inline-flex items-center gap-1"><Lock size={10} />Etapa trancada</span>
          <span className="ml-auto">Exibindo {searchedRows.length ? safePage * PAGE_SIZE + 1 : 0}–{Math.min((safePage + 1) * PAGE_SIZE, searchedRows.length)} de {searchedRows.length}</span>
        </div>

        <section className="overflow-x-auto border border-slate-300 bg-white">
          <table className="w-full min-w-[1250px] border-collapse text-[9px]">
            <thead><tr className="bg-[#DEE2E6] text-left uppercase">
              <th className="p-1.5">Pedido</th><th>Cliente</th><th>Entrega</th><th>Valor</th><th>Comercial</th><th>Engenharia</th><th>PCP</th><th>Produção</th><th>Almoxarifado</th><th>Faturamento</th>
            </tr></thead>
            <tbody>
              {pageRows.map(row => {
                const delayed = isDelayed(row)
                return (
                  <tr key={row.id} onClick={() => void loadItems(row)} className={`cursor-pointer border-t hover:bg-slate-50 ${delayed ? 'border-l-2 border-l-red-500 bg-red-50/20' : ''}`}>
                    <td className="p-1.5 font-semibold">{String(row.numero).padStart(6, '0')}</td>
                    <td>{row.cliente?.nome ?? '—'}</td><td>{formatDate(row.data_entrega_prometida)}</td><td>{brl(Number(row.total))}</td>
                    <td>{cell(row, 'comercial')}</td><td>{cell(row, 'engenharia')}</td><td>{cell(row, 'pcp')}</td><td>{cell(row, 'producao')}</td><td>{cell(row, 'almoxarifado')}</td><td>{cell(row, 'faturamento')}</td>
                  </tr>
                )
              })}
              {!pageRows.length && <tr><td colSpan={10} className="p-6 text-center text-slate-500">{loading ? 'Carregando pedidos...' : 'Nenhum pedido encontrado para os filtros selecionados.'}</td></tr>}
            </tbody>
          </table>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-2 py-1.5">
          <span className="text-[9px] text-slate-500">Página {safePage + 1} de {pageCount} · limite de {PAGE_SIZE} linhas por página</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="flex h-7 items-center gap-1 border border-slate-300 px-2 text-[9px] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={12} />Anterior</button>
            <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="flex h-7 items-center gap-1 border border-slate-300 px-2 text-[9px] disabled:cursor-not-allowed disabled:opacity-40">Próxima<ChevronRight size={12} /></button>
          </div>
        </div>

        {selected && (
          <>
            <button aria-label="Fechar painel" type="button" onClick={() => setSelected(null)} className="fixed inset-0 z-40 cursor-default bg-black/10" />
            <aside className="fixed inset-y-0 right-0 z-50 w-[35vw] min-w-[420px] max-w-[900px] overflow-y-auto border-l border-slate-300 bg-white shadow-xl">
              <header className="flex h-10 items-center justify-between border-b bg-[#212529] px-2 text-white">
                <div className="min-w-0 text-[11px]"><b>Pedido {String(selected.numero).padStart(6, '0')}</b><span className="ml-2 text-slate-300">{selected.cliente?.nome ?? '—'}</span></div>
                <button type="button" aria-label="Fechar detalhes" onClick={() => setSelected(null)} className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center border border-slate-500"><X size={12} /></button>
              </header>
              <div className="p-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[9px] text-slate-500">ITENS DO PEDIDO • ENTREGA {formatDate(selected.data_entrega_prometida)}</div>
                  {canRectify && !['rascunho', 'aberto', 'cotacao'].includes(norm(selected.status)) && (
                    <button id="btnAtualizarPedido" type="button" onClick={() => window.location.assign('/controladoria/retificacao-pedido/' + selected.id)} className="flex h-7 items-center gap-1 bg-blue-600 px-2 text-[10px] font-medium text-white"><RefreshCw size={12} />Ajustar Campos</button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[9px]">
                    <thead><tr className="bg-[#DEE2E6] text-left"><th className="p-1">SKU</th><th>Descrição</th><th>Qtd</th><th>UN</th><th>Entrega</th></tr></thead>
                    <tbody>
                      {items.map(item => <tr key={item.id} className="border-t"><td className="p-1">{item.produto?.codigo ?? ''}</td><td>{item.descricao}</td><td>{item.quantidade}</td><td>{item.produto?.unidade ?? ''}</td><td>{formatDate(selected.data_entrega_prometida)}</td></tr>)}
                      {!items.length && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Pedido sem itens ou itens ainda não carregados.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {anexos.length > 0 && <div className="mt-2 border-t pt-2"><div className="mb-1 text-[9px] font-medium text-slate-500">ANEXOS DE ORIGEM / AUDITORIA</div>{anexos.map(attachment => <button key={attachment.id} type="button" className="mr-1 mb-1 inline-flex border px-1.5 py-1 text-[9px] text-[#17445A] hover:bg-slate-100" onClick={() => { void supabase.storage.from('pedidos-origem').createSignedUrl(attachment.url_arquivo, 600).then(result => { if (result.data?.signedUrl) window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer'); else setError(result.error?.message ?? 'Não foi possível abrir o anexo.') }).catch(err => setError(err instanceof Error ? err.message : 'Não foi possível abrir o anexo.')) }}>{attachment.nome_arquivo}</button>)}</div>}
              </div>
            </aside>
          </>
        )}
      </div>
    </VendasLayout>
  )
}
