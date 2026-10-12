import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ClipboardCheck, FileText, PackageCheck, Printer, RefreshCw, Save, Send, Split, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Order = { id: string; numero: number | string; cliente_id: string | null; status: string; total: number | string | null }
type Customer = { id: string; nome: string; documento: string | null }
type OrderItem = { id: string; pedido_id: string; produto_id: string | null; descricao: string; quantidade: number; valor_unitario: number | null; total: number | null }
type Product = { id: string; codigo: string | null; nome: string; unidade: string | null }
type Lot = { id: string; produto_id: string; lote_interno: string; lote_fornecedor: string | null; quantidade_disponivel: number | null; quantidade_reservada: number | null; status_inspecao: string; localizacao: string | null }
type Release = { id: string; pedido_venda_id: string; documento_fiscal_id: string | null; status: string; observacao: string | null; created_at: string; updated_at: string }
type Quarantine = { lote_id: string; status: string }
type ReleaseLine = { key: string; pedido_item_id: string; produto_id: string; descricao: string; unidade: string; quantidade: string; lote_id: string; caixas: string; unidades_por_caixa: string; peso_liquido: string; peso_bruto: string; localizacao: string; observacao: string }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const qty = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value)
const statusLabel: Record<string, string> = {
  RASCUNHO: 'Rascunho', ENCAMINHADA: 'Encaminhada ao Fiscal', DEVOLVIDA: 'Devolvida para correção',
  VINCULADA_NFE: 'Vinculada à NF-e', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
const emptyLine = (item: OrderItem, product: Product | undefined): ReleaseLine => ({
  key: crypto.randomUUID(), pedido_item_id: item.id, produto_id: item.produto_id ?? '',
  descricao: item.descricao || product?.nome || '', unidade: product?.unidade ?? 'UN',
  quantidade: String(item.quantidade), lote_id: '', caixas: '', unidades_por_caixa: '',
  peso_liquido: '', peso_bruto: '', localizacao: '', observacao: '',
})

export default function EstoqueLiberacaoNFe() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [blockedLotIds, setBlockedLotIds] = useState<string[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedReleaseId, setSelectedReleaseId] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [lines, setLines] = useState<ReleaseLine[]>([])
  const [observation, setObservation] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const customerById = useMemo(() => new Map(customers.map(row => [row.id, row])), [customers])
  const productById = useMemo(() => new Map(products.map(row => [row.id, row])), [products])
  const orderById = useMemo(() => new Map(orders.map(row => [row.id, row])), [orders])
  const selectedOrder = orderById.get(selectedOrderId)
  const availableLots = (productId: string) => lots.filter(lot => lot.produto_id === productId)
  const filteredOrders = orders.filter(order => {
    const customer = customerById.get(order.cliente_id ?? '')
    const haystack = [String(order.numero), order.status, customer?.nome ?? '', customer?.documento ?? ''].join(' ').toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(tenant.data)
      const [orderResult, customerResult, productResult, lotResult, releaseResult, quarantineResult] = await Promise.all([
        fetchAllPages<Order>((from, to) => supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total', { count: 'exact' }).eq('empresa_id', id).order('numero', { ascending: false }).range(from, to)),
        fetchAllPages<Customer>((from, to) => supabase.from('erp_clientes').select('id,nome,documento', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('nome').range(from, to)),
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,unidade', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Lot>((from, to) => supabase.from('erp_estoque_lotes').select('id,produto_id,lote_interno,lote_fornecedor,quantidade_disponivel,quantidade_reservada,status_inspecao,localizacao', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Release>((from, to) => supabase.from('erp_liberacoes_nf').select('id,pedido_venda_id,documento_fiscal_id,status,observacao,created_at,updated_at', { count: 'exact' }).eq('empresa_id', id).order('updated_at', { ascending: false }).range(from, to)),
        fetchAllPages<Quarantine>((from, to) => supabase.from('erp_quarentenas_lotes').select('lote_id,status', { count: 'exact' }).eq('empresa_id', id).in('status', ['RETIDO','SUCATA','RETRABALHO']).range(from, to)),
      ])
      setEmpresaId(id)
      setOrders(orderResult)
      setCustomers(customerResult)
      setProducts(productResult)
      setLots(lotResult)
      setReleases(releaseResult)
      setBlockedLotIds([...new Set(quarantineResult.map(row => row.lote_id))])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados do Almoxarifado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function selectOrder(orderId: string) {
    setSelectedOrderId(orderId)
    setSelectedReleaseId('')
    setObservation('')
    setMessage('')
    setError('')
    setLines([])
    if (!orderId) { setOrderItems([]); return }
    try {
      const rows = await fetchAllPages<OrderItem>((from, to) => supabase.from('erp_pedidos_venda_itens')
        .select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total', { count: 'exact' })
        .eq('empresa_id', empresaId).eq('pedido_id', orderId).order('id').range(from, to))
      setOrderItems(rows)
      setLines(rows.map(item => emptyLine(item, productById.get(item.produto_id ?? ''))))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os itens do pedido.')
    }
  }

  async function openRelease(release: Release) {
    setSelectedReleaseId(release.id)
    setSelectedOrderId(release.pedido_venda_id)
    setObservation(release.observacao ?? '')
    setError('')
    setMessage('')
    try {
      const [{ data: itemRows, error: itemError }, { data: orderRows, error: orderError }] = await Promise.all([
        supabase.from('erp_liberacoes_nf_itens').select('id,pedido_item_id,produto_id,lote_id,quantidade,caixas,unidades_por_caixa,peso_liquido,peso_bruto,localizacao,observacao').eq('empresa_id', empresaId).eq('liberacao_id', release.id).order('created_at'),
        supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total').eq('empresa_id', empresaId).eq('pedido_id', release.pedido_venda_id).order('id'),
      ])
      if (itemError) throw itemError
      if (orderError) throw orderError
      const sourceItems = (orderRows ?? []) as OrderItem[]
      setOrderItems(sourceItems)
      const itemById = new Map(sourceItems.map(item => [item.id, item]))
      setLines(((itemRows ?? []) as Array<Record<string, unknown>>).map(row => {
        const item = itemById.get(String(row.pedido_item_id))
        const product = productById.get(String(row.produto_id))
        return {
          key: String(row.id), pedido_item_id: String(row.pedido_item_id), produto_id: String(row.produto_id),
          descricao: item?.descricao ?? product?.nome ?? '', unidade: product?.unidade ?? 'UN',
          quantidade: String(row.quantidade ?? ''), lote_id: String(row.lote_id ?? ''), caixas: String(row.caixas ?? ''),
          unidades_por_caixa: String(row.unidades_por_caixa ?? ''), peso_liquido: String(row.peso_liquido ?? ''),
          peso_bruto: String(row.peso_bruto ?? ''), localizacao: String(row.localizacao ?? ''), observacao: String(row.observacao ?? ''),
        }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a liberação.')
    }
  }

  function updateLine(key: string, field: keyof ReleaseLine, value: string) {
    setLines(current => current.map(line => line.key === key ? { ...line, [field]: value } : line))
  }

  function splitLine(line: ReleaseLine) {
    setLines(current => [...current, { ...line, key: crypto.randomUUID(), quantidade: '', caixas: '', unidades_por_caixa: '', peso_liquido: '', peso_bruto: '', lote_id: '' }])
  }

  async function saveDraft() {
    setError('')
    setMessage('')
    if (!selectedOrderId) { setError('Selecione um pedido de venda.'); return }
    if (lines.length === 0) { setError('O pedido selecionado não possui itens para separar.'); return }
    if (lines.some(line => !line.pedido_item_id || !line.produto_id || !line.lote_id || !Number.isFinite(Number(line.quantidade)) || Number(line.quantidade) <= 0)) {
      setError('Cada linha precisa de item, lote aprovado e quantidade maior que zero.')
      return
    }
    if (lines.some(line => Number(line.caixas || 0) < 0 || Number(line.peso_liquido || 0) < 0 || Number(line.peso_bruto || 0) < 0 || (Number(line.caixas || 0) > 0 && Number(line.unidades_por_caixa || 0) > 0 && Number(line.quantidade) > Number(line.caixas) * Number(line.unidades_por_caixa)))) {
      setError('Confira caixas, unidades por caixa e pesos. A quantidade não pode exceder caixas × unidades por caixa.')
      return
    }
    setBusy(true)
    try {
      const payload = lines.map(line => ({
        pedido_item_id: line.pedido_item_id, produto_id: line.produto_id, lote_id: line.lote_id,
        quantidade: Number(line.quantidade), caixas: Number(line.caixas || 0),
        unidades_por_caixa: Number(line.unidades_por_caixa || 0), peso_liquido: Number(line.peso_liquido || 0),
        peso_bruto: Number(line.peso_bruto || 0), localizacao: line.localizacao.trim() || null,
        observacao: line.observacao.trim() || null,
      }))
      const result = await supabase.rpc('erp_salvar_liberacao_nf', {
        p_liberacao_id: selectedReleaseId || null, p_pedido_venda_id: selectedOrderId,
        p_observacao: observation.trim() || null, p_itens: payload,
      })
      if (result.error || !result.data) throw result.error ?? new Error('O banco não retornou o identificador da liberação.')
      setSelectedReleaseId(String(result.data))
      setMessage('Rascunho da separação salvo no banco. O estoque ainda não foi baixado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a separação.')
    } finally {
      setBusy(false)
    }
  }

  async function forwardRelease() {
    if (!selectedReleaseId) { setError('Salve o rascunho antes de encaminhar ao Fiscal.'); return }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_encaminhar_liberacao_nf', { p_liberacao_id: selectedReleaseId })
      if (result.error) throw result.error
      setMessage('Liberação encaminhada ao Fiscal. Os lotes foram reservados; a baixa física ocorrerá somente após a NF-e autorizada e a conclusão operacional.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível encaminhar a liberação.')
    } finally {
      setBusy(false)
    }
  }

  async function concludeRelease(release: Release) {
    if (!window.confirm('Confirma a baixa física? Esta ação exige NF-e autorizada e não deve ser repetida.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_concluir_liberacao_nf', { p_liberacao_id: release.id })
      if (result.error) throw result.error
      setMessage('Liberação concluída e saldo físico atualizado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a liberação.')
    } finally {
      setBusy(false)
    }
  }

  const canEdit = !selectedReleaseId || releases.find(release => release.id === selectedReleaseId)?.status === 'RASCUNHO' || releases.find(release => release.id === selectedReleaseId)?.status === 'DEVOLVIDA'
  const lineTotal = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantidade) || 0), 0)

  return (
    <main className="min-h-screen bg-[#f4fbfd] p-3 text-[#123b50] md:p-4">
      <div className="mx-auto max-w-[1700px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9e1e8] pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-[#2d8db8]" />
            <div><p className="text-[9px] font-bold uppercase tracking-wider text-[#2d8db8]">Almoxarifado · Expedição fiscal</p><h1 className="text-[16px] font-semibold">Liberação para Nota Fiscal</h1><p className="text-[11px] text-slate-600">Separação, lote, caixas, pesos e rastreabilidade antes do faturamento.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]"><Printer size={14}/> Imprimir separação</button>
            <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] disabled:opacity-50"><RefreshCw size={14}/> Atualizar</button>
          </div>
        </header>

        {(error || message) && <div role="status" className={'border px-3 py-2 text-[11px] ' + (error ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>{error || message}</div>}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="border border-[#c9e1e8] bg-white">
            <div className="border-b border-slate-200 p-2"><h2 className="text-[12px] font-semibold">Pedidos para separar</h2><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pedido, cliente ou status" className="mt-2 h-[30px] w-full border border-slate-300 px-2 text-[11px] outline-none focus:border-[#2d8db8]"/></div>
            <div className="max-h-[380px] overflow-auto">
              {loading ? <p className="p-3 text-[11px]">Carregando pedidos…</p> : filteredOrders.map(order => {
                const customer = customerById.get(order.cliente_id ?? '')
                return <button type="button" key={order.id} onClick={() => void selectOrder(order.id)} className={'block w-full border-b border-slate-100 p-2 text-left hover:bg-sky-50 ' + (selectedOrderId === order.id ? 'bg-sky-50' : '')}>
                  <span className="flex justify-between gap-2 text-[11px] font-semibold"><span>Pedido #{order.numero}</span><span className="text-slate-500">{String(order.status)}</span></span>
                  <span className="mt-1 block truncate text-[10px] text-slate-600">{customer?.nome ?? 'Cliente não localizado'} · {money(Number(order.total ?? 0))}</span>
                </button>
              })}
              {!loading && filteredOrders.length === 0 && <p className="p-3 text-[11px] text-slate-500">Nenhum pedido encontrado.</p>}
            </div>
            <div className="border-t border-slate-200 p-2"><h2 className="text-[12px] font-semibold">Fila de liberações</h2><div className="mt-2 space-y-1">
              {releases.map(release => <div key={release.id} className={'border p-2 text-[10px] ' + (release.id === selectedReleaseId ? 'border-[#2d8db8] bg-sky-50' : 'border-slate-200')}>
                <button type="button" onClick={() => void openRelease(release)} className="w-full text-left"><strong>Pedido #{orderById.get(release.pedido_venda_id)?.numero ?? '—'}</strong><span className="block text-slate-600">{statusLabel[release.status] ?? release.status}</span></button>
                {release.status === 'ENCAMINHADA' && <button type="button" onClick={() => navigate('/fiscal/emissao?liberacao_id=' + encodeURIComponent(release.id))} className="mt-1 inline-flex h-[28px] items-center gap-1 bg-[#2d8db8] px-2 text-white"><FileText size={13}/> Abrir NF-e <ArrowRight size={13}/></button>}
                {release.status === 'VINCULADA_NFE' && <button type="button" disabled={busy} onClick={() => void concludeRelease(release)} className="mt-1 inline-flex h-[28px] items-center gap-1 border border-emerald-600 px-2 text-emerald-700 disabled:opacity-50"><ClipboardCheck size={13}/> Confirmar baixa</button>}
              </div>)}
              {releases.length === 0 && <p className="text-slate-500">Ainda não há liberações.</p>}
            </div></div>
          </section>

          <section className="min-w-0 border border-[#c9e1e8] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2"><div><h2 className="text-[12px] font-semibold">Conferência física do pedido</h2><p className="text-[10px] text-slate-500">{selectedOrder ? 'Pedido #' + selectedOrder.numero + ' · ' + (customerById.get(selectedOrder.cliente_id ?? '')?.nome ?? 'Cliente não localizado') : 'Selecione um pedido à esquerda'}</p></div><div className="text-[10px] text-slate-500">Linhas: {lines.length} · Quantidade total: {qty(lineTotal)}</div></div>
            <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 p-2 md:grid-cols-2"><label className="text-[9px] font-bold uppercase tracking-wider">Observações da separação<textarea value={observation} onChange={event => setObservation(event.target.value)} disabled={!canEdit} rows={2} className="mt-1 w-full border border-slate-300 bg-white p-2 text-[11px] disabled:bg-slate-100"/></label><div className="flex items-end gap-2 text-[10px] text-slate-600"><Truck size={15}/> A separação reserva os lotes ao encaminhar. A baixa física fica condicionada à NF-e autorizada.</div></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] border-collapse text-left text-[10px]">
                <thead className="bg-[#eaf4f7] text-[9px] uppercase tracking-wider"><tr>{['Produto / item pedido','Quantidade','Lote aprovado','Caixas','Un./caixa','Peso líquido','Peso bruto','Localização',''].map(title => <th key={title} className="border-b border-slate-200 p-2 font-semibold">{title}</th>)}</tr></thead>
                <tbody>{lines.map(line => {
                  const productLots = availableLots(line.produto_id)
                  return <tr key={line.key} className="border-b border-slate-100 align-top">
                    <td className="p-2"><strong>{line.descricao}</strong><span className="mt-1 block text-slate-500">{productById.get(line.produto_id)?.codigo ?? '—'} · {line.unidade}</span></td>
                    <td className="p-2"><input aria-label="Quantidade separada" type="number" min="0.001" step="0.001" value={line.quantidade} disabled={!canEdit} onChange={event => updateLine(line.key,'quantidade',event.target.value)} className="h-[30px] w-[86px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><select aria-label="Lote aprovado" value={line.lote_id} disabled={!canEdit} onChange={event => {const lot=productLots.find(candidate=>candidate.id===event.target.value);updateLine(line.key,'lote_id',event.target.value);if(lot?.localizacao)updateLine(line.key,'localizacao',lot.localizacao)}} className="h-[30px] w-[190px] border border-slate-300 px-1 disabled:bg-slate-100"><option value="">Selecione lote aprovado</option>{productLots.map(lot => <option key={lot.id} value={lot.id} disabled={!(['APROVADO','LIBERADO'].includes(String(lot.status_inspecao).toUpperCase())) || blockedLotIds.includes(lot.id) || Number(lot.quantidade_disponivel ?? 0)-Number(lot.quantidade_reservada ?? 0)<=0}>{lot.lote_interno}{blockedLotIds.includes(lot.id) ? ' · QUARENTENA/BLOQUEADO' : ' · disp. ' + qty(Math.max(0,Number(lot.quantidade_disponivel ?? 0)-Number(lot.quantidade_reservada ?? 0)))} · {lot.status_inspecao}</option>)}</select></td>
                    <td className="p-2"><input aria-label="Número de caixas" type="number" min="0" step="1" value={line.caixas} disabled={!canEdit} onChange={event => updateLine(line.key,'caixas',event.target.value)} className="h-[30px] w-[64px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><input aria-label="Unidades por caixa" type="number" min="0" step="0.001" value={line.unidades_por_caixa} disabled={!canEdit} onChange={event => updateLine(line.key,'unidades_por_caixa',event.target.value)} className="h-[30px] w-[74px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><input aria-label="Peso líquido" type="number" min="0" step="0.001" value={line.peso_liquido} disabled={!canEdit} onChange={event => updateLine(line.key,'peso_liquido',event.target.value)} className="h-[30px] w-[78px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><input aria-label="Peso bruto" type="number" min="0" step="0.001" value={line.peso_bruto} disabled={!canEdit} onChange={event => updateLine(line.key,'peso_bruto',event.target.value)} className="h-[30px] w-[78px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><input aria-label="Localização" value={line.localizacao} disabled={!canEdit} onChange={event => updateLine(line.key,'localizacao',event.target.value)} className="h-[30px] w-[120px] border border-slate-300 px-1 disabled:bg-slate-100"/></td>
                    <td className="p-2"><button type="button" disabled={!canEdit} title="Dividir item entre lotes" onClick={() => splitLine(line)} className="inline-flex h-[30px] items-center gap-1 border border-slate-300 px-2 disabled:opacity-40"><Split size={13}/> Dividir</button></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            {selectedOrder && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-2"><p className="text-[10px] text-slate-600">Pedido original: {orderItems.length} item(ns). Conferir saldo do pedido, lote e caixas antes de encaminhar.</p><div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !canEdit} onClick={() => void saveDraft()} className="inline-flex h-[30px] items-center gap-1 border border-slate-300 bg-white px-3 text-[11px] disabled:opacity-50"><Save size={14}/> Salvar rascunho</button>
              <button type="button" disabled={busy || !selectedReleaseId || !canEdit} onClick={() => void forwardRelease()} className="inline-flex h-[30px] items-center gap-1 bg-[#2d8db8] px-3 text-[11px] text-white disabled:opacity-50"><Send size={14}/> Encaminhar para NF-e</button>
            </div></div>}
          </section>
        </div>
        <footer className="text-[10px] text-slate-500">Empresa ativa: {empresaId || '—'} · A reserva e a baixa são controladas no banco; não há baixa ao salvar o rascunho.</footer>
      </div>
    </main>
  )
}
