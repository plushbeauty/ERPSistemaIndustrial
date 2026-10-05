import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Package, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Cliente = { nome: string }
type Row = {
  id: string
  numero: number
  pedido_cliente: string | null
  status: string
  total: number | null
  data_entrega_prometida: string | null
  cliente: Cliente | null
}
type Item = {
  id: string
  produto_id: string | null
  descricao: string
  quantidade: number
  produto?: { codigo: string; unidade: string } | null
}
type Anexo = { id: string; url_arquivo: string; nome_arquivo: string; criado_em: string }
type Production = {
  numero_op: string
  status: string
  quantidade: number | null
  quantidade_planejada: number | null
  quantidade_produzida: number | null
}

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`))
  : '—'
const quantity = (value: number | null) => value == null || !Number.isFinite(Number(value))
  ? '—'
  : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value))
const money = (value: number | null) => value == null || !Number.isFinite(Number(value))
  ? '—'
  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
const PAGE_SIZE = 25

export default function VendasStatusPedidos() {
  const [rows, setRows] = useState<Row[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Row | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState('')
  const [attachmentsError, setAttachmentsError] = useState('')
  const [production, setProduction] = useState<Production[]>([])
  const [productionError, setProductionError] = useState('')
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [canRectify, setCanRectify] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    setRows([])
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const result = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)', { count: 'exact' })
        .eq('empresa_id', String(company.data))
        .order('numero', { ascending: false })
        .range(from, to))
      setRows(result as unknown as Row[])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar pedidos.')
    } finally {
      setLoading(false)
    }
  }

  const empresa = async () => {
    const result = await supabase.rpc('erp_current_empresa_id')
    if (result.error || !result.data) throw result.error ?? new Error('Empresa não identificada.')
    return String(result.data)
  }

  const loadItems = async (row: Row) => {
    setSelected(row)
    setSelectedItem(null)
    setItems([])
    setAnexos([])
    setProduction([])
    setItemsError('')
    setAttachmentsError('')
    setProductionError('')
    setItemsLoading(true)
    try {
      const companyId = await empresa()
      const loadedItems: Item[] = []
      for (let offset = 0; ; offset += 1000) {
        const result = await supabase
          .from('erp_pedidos_venda_itens')
          .select('id,produto_id,descricao,quantidade,produto:erp_produtos(codigo,unidade)')
          .eq('empresa_id', companyId)
          .eq('pedido_id', row.id)
          .order('id')
          .range(offset, offset + 999)
        if (result.error) throw result.error
        const page = (result.data ?? []) as unknown as Item[]
        loadedItems.push(...page)
        if (page.length < 1000) break
      }
      setItems(loadedItems)
      const [opResult, attachmentResult] = await Promise.all([
        (async () => {
          const loaded: Production[] = []
          for (let offset = 0; ; offset += 1000) {
            const result = await supabase
              .from('erp_ordens_producao')
              .select('numero_op,status,quantidade,quantidade_planejada,quantidade_produzida')
              .eq('empresa_id', companyId)
              .eq('pedido_venda_id', row.id)
              .order('numero_op')
              .range(offset, offset + 999)
            if (result.error) return { data: null, error: result.error }
            const page = (result.data ?? []) as Production[]
            loaded.push(...page)
            if (page.length < 1000) break
          }
          return { data: loaded, error: null }
        })(),
        supabase
          .from('erp_pedidos_anexos')
          .select('id,url_arquivo,nome_arquivo,criado_em')
          .eq('empresa_id', companyId)
          .eq('pedido_id', row.id)
          .order('criado_em', { ascending: false }),
      ])
      if (opResult.error) setProductionError(`Progresso de produção indisponível: ${opResult.error.message}`)
      else setProduction(opResult.data ?? [])
      if (attachmentResult.error) setAttachmentsError(`Anexos indisponíveis: ${attachmentResult.error.message}`)
      else setAnexos((attachmentResult.data ?? []) as Anexo[])
    } catch (reason) {
      setItemsError(reason instanceof Error ? reason.message : 'Falha ao carregar os itens do pedido.')
    } finally {
      setItemsLoading(false)
    }
  }

  const openAttachment = async (attachment: Anexo) => {
    setAttachmentsError('')
    try {
      const result = await supabase.storage.from('pedidos-origem').createSignedUrl(attachment.url_arquivo, 600)
      if (result.error) throw result.error
      if (!result.data?.signedUrl) throw new Error('O Storage não retornou um link temporário.')
      if (!window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')) {
        throw new Error('O navegador bloqueou a abertura do anexo. Permita pop-ups e tente novamente.')
      }
    } catch (reason) {
      setAttachmentsError(reason instanceof Error ? reason.message : 'Falha ao abrir o anexo.')
    }
  }

  useEffect(() => {
    void load()
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const profile = await supabase
        .from('erp_usuarios')
        .select('perfil,is_master,ativo,deleted_at')
        .eq('auth_user_id', data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (!profile.error) {
        const role = String(profile.data?.perfil ?? '').trim().toUpperCase()
        setCanRectify(Boolean(profile.data?.is_master) || role === 'ADMINISTRADOR' || role === 'CONTROLADORIA')
      }
    })()
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    if (!needle) return rows
    return rows.filter((row) => [
      String(row.numero),
      row.pedido_cliente ?? '',
      row.cliente?.nome ?? '',
      row.status,
    ].some((value) => value.toLocaleLowerCase('pt-BR').includes(needle)))
  }, [rows, query])
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const closePanel = () => {
    setSelected(null)
    setSelectedItem(null)
  }

  return (
    <VendasLayout title="Pedidos de venda" subtitle="Handoff operacional: vendas → PCP · status original do pedido" onRefresh={() => void load()}>
      <main className="space-y-3 text-xs">
        {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-red-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}</div>}

        <section className="flex flex-wrap items-center gap-2 border border-slate-200 bg-white p-2">
          <div className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-slate-700">
            <Package size={13} /> <span>Pedidos carregados</span><strong>{rows.length}</strong>
          </div>
          <p className="min-w-0 flex-1 text-[11px] text-slate-500">Status exibido conforme gravado no pedido. Prazo, estoque, acabamento e entrega não são inferidos.</p>
          <label className="flex h-8 w-full items-center gap-2 border border-slate-300 px-2 sm:ml-auto sm:w-64">
            <Search size={13} className="shrink-0 text-slate-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Pedido, cliente ou status" className="min-w-0 flex-1 border-0 text-xs outline-none" />
          </label>
        </section>

        <section className="overflow-x-auto border border-slate-300 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-[11px]">
            <thead><tr className="bg-slate-100 text-left text-slate-700">
              <th className="p-2">Pedido</th><th className="p-2">Cliente</th><th className="p-2">Entrega prometida</th><th className="p-2">Status persistido</th><th className="p-2 text-right">Total</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-2 font-semibold">{String(row.numero).padStart(6, '0')}{row.pedido_cliente && <span className="ml-1 font-normal text-slate-500">· {row.pedido_cliente}</span>}</td>
                  <td className="p-2">{row.cliente?.nome ?? '—'}</td>
                  <td className="p-2">{formatDate(row.data_entrega_prometida)}</td>
                  <td className="p-2"><span className="inline-block max-w-56 truncate rounded border border-slate-200 px-1.5 py-0.5" title={row.status}>{row.status || '—'}</span></td>
                  <td className="p-2 text-right">{money(row.total)}</td>
                  <td className="p-2 text-right"><button type="button" onClick={() => void loadItems(row)} className="rounded border border-slate-300 px-2 py-1 font-medium text-[#17445A] hover:bg-slate-100">Ver itens</button></td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum pedido retornado para a empresa atual.</td></tr>}
              {!loading && !error && rows.length > 0 && visible.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum pedido corresponde à busca.</td></tr>}
              {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando pedidos…</td></tr>}
            </tbody>
          </table>
        </section>
        <nav className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2" aria-label="Paginação do acompanhamento de pedidos">
          <span className="text-[11px] text-slate-500">
            {visible.length === 0 ? '0 pedidos' : `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, visible.length)} de ${visible.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="sales-button sales-button--secondary" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0 || loading}>Anterior</button>
            <span className="min-w-20 text-center text-[11px] text-slate-600">Página {currentPage + 1} de {pageCount}</span>
            <button type="button" className="sales-button sales-button--secondary" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1 || loading}>Próxima</button>
          </div>
        </nav>

        {selected && (
          <>
            <button aria-label="Fechar painel do pedido" type="button" onClick={closePanel} className="fixed inset-0 z-40 cursor-default bg-black/20" />
            <aside aria-label={`Itens do pedido ${String(selected.numero).padStart(6, '0')}`} className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-300 bg-white shadow-xl sm:w-[min(760px,90vw)]">
              <header className="flex min-h-12 items-center justify-between gap-2 border-b bg-[#212529] px-3 text-white">
                <div className="min-w-0"><b>Pedido {String(selected.numero).padStart(6, '0')}</b><span className="ml-2 truncate text-slate-300">{selected.cliente?.nome ?? '—'}</span></div>
                <button type="button" aria-label="Fechar" onClick={closePanel} className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-500"><X size={14} /></button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600">ENTREGA PROMETIDA: <strong>{formatDate(selected.data_entrega_prometida)}</strong> · STATUS: <strong>{selected.status || '—'}</strong></div>
                  {canRectify && !['rascunho', 'aberto', 'cotação', 'cotacao'].includes(selected.status.trim().toLocaleLowerCase('pt-BR')) && (
                    <button id="btnAtualizarPedido" type="button" onClick={() => window.location.assign(`/controladoria/retificacao-pedido/${selected.id}`)} className="flex h-8 items-center gap-1 rounded bg-blue-600 px-2 text-[11px] font-bold text-white"><RefreshCw size={12} />Ajustar Campos</button>
                  )}
                </div>

                {itemsError && <div role="alert" className="mb-3 border border-red-200 bg-red-50 p-2 text-red-800">Falha ao consultar itens: {itemsError}</div>}
                <section className="overflow-x-auto border border-slate-300">
                  <table className="w-full min-w-[620px] border-collapse text-[11px]">
                    <thead><tr className="bg-slate-100 text-left"><th className="p-2">SKU</th><th className="p-2">Descrição</th><th className="p-2 text-right">Qtd. pedida</th><th className="p-2">Un.</th><th className="p-2">Produção</th></tr></thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className={`border-t border-slate-200 ${selectedItem?.id === item.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-2">{item.produto?.codigo ?? '—'}</td>
                          <td className="p-2"><button type="button" onClick={() => setSelectedItem(item)} className="text-left text-[#17445A] underline-offset-2 hover:underline">{item.descricao}</button></td>
                          <td className="p-2 text-right">{quantity(item.quantidade)}</td>
                          <td className="p-2">{item.produto?.unidade ?? '—'}</td>
                          <td className="p-2"><button type="button" onClick={() => setSelectedItem(item)} className="rounded border border-slate-300 px-2 py-1 text-[10px] hover:bg-slate-100">Ver progresso</button></td>
                        </tr>
                      ))}
                      {!itemsLoading && !itemsError && items.length === 0 && <tr><td colSpan={5} className="p-5 text-center text-slate-500">Nenhum item retornado para este pedido.</td></tr>}
                      {itemsLoading && <tr><td colSpan={5} className="p-5 text-center text-slate-500">Carregando itens…</td></tr>}
                    </tbody>
                  </table>
                </section>

                {selectedItem && (
                  <section className="mt-3 border border-slate-300 p-3">
                    <h2 className="font-semibold text-slate-800">Progresso de produção · {selectedItem.produto?.codigo ?? selectedItem.descricao}</h2>
                    <p className="mt-1 text-[11px] text-slate-600">Vínculo de OP disponível apenas no nível do pedido; a quantidade produzida abaixo não está alocada a este item e não representa quantidade atendida ou entregue.</p>
                    {productionError && <p role="alert" className="mt-2 border border-amber-300 bg-amber-50 p-2 text-amber-900">{productionError}</p>}
                    {!productionError && production.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[480px] border-collapse text-[11px]">
                          <thead><tr className="bg-slate-100 text-left"><th className="p-2">OP do pedido</th><th className="p-2">Status persistido</th><th className="p-2 text-right">Produzida</th><th className="p-2 text-right">Planejada / OP</th></tr></thead>
                          <tbody>{production.map((op, index) => <tr key={`${op.numero_op}-${index}`} className="border-t"><td className="p-2">{op.numero_op || '—'}</td><td className="p-2">{op.status || '—'}</td><td className="p-2 text-right">{quantity(op.quantidade_produzida)}</td><td className="p-2 text-right">{quantity(op.quantidade_planejada ?? op.quantidade)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                    {!productionError && production.length === 0 && <p className="mt-2 text-[11px] text-slate-600">Nenhuma OP vinculada foi retornada na sessão atual; ausência de resultado não confirma ausência de produção.</p>}
                  </section>
                )}

                {(attachmentsError || anexos.length > 0) && (
                  <section className="mt-3 border-t pt-3">
                    <h2 className="mb-2 text-[11px] font-bold text-slate-500">ANEXOS DE ORIGEM / AUDITORIA</h2>
                    {attachmentsError && <p role="alert" className="mb-2 border border-red-200 bg-red-50 p-2 text-red-800">{attachmentsError}</p>}
                    {anexos.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        className="mb-1 mr-1 inline-flex border px-2 py-1 text-[11px] text-[#17445A]"
                        onClick={() => void openAttachment(attachment)}
                      >
                        {attachment.nome_arquivo}
                      </button>
                    ))}
                  </section>
                )}
              </div>
            </aside>
          </>
        )}
      </main>
    </VendasLayout>
  )
}
