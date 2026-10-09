import { useState } from 'react'
import { Search, Printer } from 'lucide-react'
import IndustrialPageShell, { SectionCard, Field, Table, ToolbarButton } from '../components/industrial/IndustrialPageShell'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Item = { id: string; codigo: string; descricao: string; quantidade: number }
type InvoiceHeader = { id: string; numero: number; serie: string | number | null; status: string; modelo: string }
type InvoiceItem = { id: string; produto_id: string | null; codigo_produto: string; descricao_produto: string; quantidade: number }
type OrderItem = { id: string; produto_id: string | null; descricao: string; quantidade: number }
type Product = { id: string; codigo: string }

export default function EstoqueEtiquetas() {
  const [ref, setRef] = useState('')
  const [serie, setSerie] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [qty, setQty] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function fetchData() {
    if (!ref.trim()) { setMsg('Informe o número do pedido ou da NF-e.'); return }
    const digits = ref.trim().replace(/\\D/g, '')
    const number = Number(digits)
    if (!digits || !Number.isSafeInteger(number) || number <= 0) { setMsg('Informe um número válido de pedido ou NF-e.'); return }
    setBusy(true)
    setMsg('')
    setItems([])
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada na sessão atual.')
      const empresaId = String(company.data)
      let mapped: Item[] = []
      let source = ''

      const invoiceRows = await fetchAllPages<InvoiceHeader>((from, to) => supabase.from('erp_documentos_fiscais')
        .select('id,numero,serie,status,modelo', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('numero', number)
        .eq('modelo', '55')
        .eq('status', 'Autorizada')
        .order('created_at', { ascending: false })
        .range(from, to))
      const matchingInvoices = serie.trim() ? invoiceRows.filter(row => String(row.serie ?? '') === serie.trim()) : invoiceRows
      if (!serie.trim() && matchingInvoices.length > 1) {
        setSourceLabel('')
        setMsg('Há mais de uma NF-e autorizada com esse número. Informe a série para evitar imprimir etiquetas do documento errado.')
        return
      }
      const invoiceData = matchingInvoices[0]
      if (invoiceData) {
        const invoiceItems = await fetchAllPages<InvoiceItem>((from, to) => supabase.from('erp_documentos_fiscais_itens')
          .select('id,produto_id,codigo_produto,descricao_produto,quantidade', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .eq('documento_id', invoiceData.id)
          .range(from, to))
        if (!invoiceItems.length) {
          setSourceLabel('')
          setMsg('A NF-e autorizada foi localizada, mas não possui itens cadastrados. Nenhum pedido substituto foi usado.')
          return
        }
        mapped = invoiceItems.map(row => ({ id: 'nfe-' + row.id, codigo: row.codigo_produto, descricao: row.descricao_produto, quantidade: Number(row.quantidade || 0) }))
        source = 'NF-e ' + String(invoiceData.numero) + ' / série ' + String(invoiceData.serie)
      }

      if (!mapped.length && !serie.trim()) {
        const order = await supabase.from('erp_pedidos_venda')
          .select('id,numero')
          .eq('empresa_id', empresaId)
          .eq('numero', number)
          .maybeSingle()
        if (order.error) throw order.error
        if (order.data) {
          const orderData = order.data
          const orderItems = await fetchAllPages<OrderItem>((from, to) => supabase.from('erp_pedidos_venda_itens')
            .select('id,produto_id,descricao,quantidade', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('pedido_id', orderData.id)
            .range(from, to))
          const productIds = [...new Set(orderItems.map(row => row.produto_id).filter((id): id is string => Boolean(id)))]
          const products = productIds.length ? await fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
            .select('id,codigo', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .in('id', productIds)
            .range(from, to)) : []
          mapped = orderItems.map(row => {
            const product = products.find(candidate => candidate.id === row.produto_id)
            return { id: 'pv-' + row.id, codigo: product?.codigo ?? '', descricao: row.descricao || 'Produto sem descrição no item', quantidade: Number(row.quantidade || 0) }
          })
          source = 'Pedido PV-' + String(orderData.numero)
        }
      }

      if (!mapped.length) {
        setSourceLabel('')
        setMsg(serie.trim() ? 'NF-e ' + number + ' / série ' + serie.trim() + ' não encontrada nesta empresa.' : 'Nenhum item encontrado para uma NF-e autorizada ou pedido desta empresa.')
        return
      }
      setItems(mapped)
      setSourceLabel(source)
      setQty(Object.fromEntries(mapped.map(row => [row.id, Math.max(0, Math.floor(row.quantidade))])))
      setSelected(Object.fromEntries(mapped.map(row => [row.id, true])))
      setMsg(mapped.length + ' linha(s) de item localizada(s). Confira as quantidades antes de imprimir.')
    } catch (cause) {
      setItems([])
      setSourceLabel('')
      setMsg(cause instanceof Error ? cause.message : 'Não foi possível consultar os itens desta empresa.')
    } finally {
      setBusy(false)
    }
  }

  const printItems = items.flatMap(item => {
    const count = selected[item.id] ? Math.max(0, Math.min(Math.floor(item.quantidade), Math.floor(qty[item.id] ?? 0))) : 0
    return Array.from({ length: count }, (_, index) => ({ ...item, labelIndex: index + 1, totalLabels: count }))
  })

  function print() {
    if (!printItems.length) { setMsg('Selecione ao menos um item e informe uma quantidade de etiquetas maior que zero.'); return }
    window.print()
  }

  return <>
    <style>{'@media screen {.label-print-area{display:none}} @media print {@page{size:A4;margin:8mm} body *{visibility:hidden!important}.label-print-area,.label-print-area *{visibility:visible!important}.label-screen{display:none!important}.label-print-area{display:block!important;position:absolute;left:0;top:0;width:100%}.label-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3mm}.label-card{border:1px solid #111;min-height:32mm;padding:4mm;break-inside:avoid;page-break-inside:avoid;font-family:Arial,sans-serif;color:#111}.label-card__code{font-size:14pt;font-weight:700}.label-card__desc{font-size:10pt;overflow-wrap:anywhere}.label-card__ref{font-size:8pt;margin-top:3mm}}'}</style>
    <div className="label-screen">
      <IndustrialPageShell module="Estoque / Expedição / Etiquetas" title="Impressão de Etiquetas Mestre" actions={[
        { label: 'BUSCAR PEDIDO / NF-e', type: 'primary', icon: <Search size={18} />, onClick: () => void fetchData() },
        { label: 'IMPRIMIR ETIQUETAS', type: 'success', icon: <Printer size={18} />, onClick: print }
      ]}>
        <SectionCard title="1. Referência do documento">
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(100px,180px)_auto]">
            <Field label="Número da NF-e ou do pedido" required>
              <input value={ref} onChange={event => setRef(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void fetchData() }} placeholder="Número exato" inputMode="numeric" />
            </Field>
            <Field label="Série NF-e (se aplicável)">
              <input value={serie} onChange={event => setSerie(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void fetchData() }} placeholder="Ex.: 1" inputMode="numeric" />
            </Field>
            <div className="flex items-end"><ToolbarButton tone="primary" disabled={busy} onClick={() => void fetchData()}><Search size={16} /> {busy ? 'CONSULTANDO…' : 'BUSCAR'}</ToolbarButton></div>
          </div>
          {sourceLabel && <p className="mt-2 text-[11px] font-semibold text-slate-700">Origem carregada: {sourceLabel}</p>}
        </SectionCard>
        <SectionCard title="2. Itens localizados e quantidade de etiquetas">
          <Table>
            <thead><tr><th>Imprimir</th><th>Código</th><th>Descrição</th><th>Qtd. origem</th><th>Qtd. etiquetas</th></tr></thead>
            <tbody>{items.length ? items.map(item => <tr key={item.id}>
              <td><input aria-label={'Imprimir ' + item.codigo} className="h-5 w-5" type="checkbox" checked={!!selected[item.id]} onChange={event => setSelected(current => ({ ...current, [item.id]: event.target.checked }))} /></td>
              <td>{item.codigo || '—'}</td><td>{item.descricao}</td><td>{item.quantidade}</td>
              <td><input aria-label={'Quantidade de etiquetas para ' + item.codigo} className="h-[30px] w-24 rounded-[2px] border border-slate-300 px-2" type="number" min="0" max={Math.floor(item.quantidade)} step="1" value={qty[item.id] ?? 0} onChange={event => setQty(current => ({ ...current, [item.id]: Math.max(0, Math.min(Math.floor(item.quantidade), Math.floor(Number(event.target.value) || 0))) }))} /></td>
            </tr>) : <tr><td colSpan={5}>Nenhum item carregado.</td></tr>}</tbody>
          </Table>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-slate-600">{msg}</p>
            <p className="text-[10px] font-semibold text-slate-800">Etiquetas a imprimir: {printItems.length}</p>
          </div>
        </SectionCard>
        <SectionCard title="3. Saída de impressão">
          <p className="text-[11px] text-slate-700">A impressão usa o diálogo do navegador. Somente as etiquetas selecionadas, na quantidade informada, serão enviadas para impressão.</p>
          <div className="ips-bottom-actions"><ToolbarButton tone="success" onClick={print}><Printer size={16} /> IMPRIMIR ETIQUETAS</ToolbarButton></div>
        </SectionCard>
      </IndustrialPageShell>
    </div>
    <div className="label-print-area" aria-hidden={printItems.length === 0}>
      <div className="label-grid">{printItems.map(label => <article key={label.id + '-' + label.labelIndex} className="label-card">
        <div className="label-card__code">{label.codigo || 'SEM CÓDIGO'}</div>
        <div className="label-card__desc">{label.descricao}</div>
        <div className="label-card__ref">{sourceLabel} • Etiqueta {label.labelIndex} de {label.totalLabels}</div>
      </article>)}</div>
    </div>
  </>
}