import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Supplier = { id: string; razao_social: string; email: string | null }
type SupplierQuote = { custo: string; prazo: string; condicao: string }
type Product = { id: string; codigo: string; nome: string; unidade: string }
type Item = {
  produto_id: string
  codigo: string
  descricao: string
  quantidade: string
  unidade: string
  data_necessidade: string
  observacoes: string
}

export default function ComprasRFQ() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [quotes, setQuotes] = useState<Record<string, SupplierQuote>>({})
  const [winnerId, setWinnerId] = useState('')
  const [buyer, setBuyer] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('EM_ANALISE')
  const [deadline, setDeadline] = useState('')
  const [deliveryForecast, setDeliveryForecast] = useState('')
  const [justification, setJustification] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [needDate, setNeedDate] = useState('')
  const [responseDate, setResponseDate] = useState('')
  const [paymentCondition, setPaymentCondition] = useState('')
  const [supplierQuery, setSupplierQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    void (async () => {
      setLoading(true)
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) {
          throw company.error ?? new Error('Empresa não identificada.')
        }
        const empresaId = String(company.data)
        const [supplierRows, productRows] = await Promise.all([
          fetchAllPages<Supplier>((from, to) => supabase
            .from('erp_fornecedores')
            .select('id,razao_social,email', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('razao_social')
            .range(from, to)),
          fetchAllPages<Product>((from, to) => supabase
            .from('erp_produtos')
            .select('id,codigo,nome,unidade', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)),
        ])
        if (alive) {
          setSuppliers(supplierRows)
          setProducts(productRows)
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da cotação.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [])

  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase('pt-BR')
    return suppliers.filter(supplier => !query
      || `${supplier.razao_social} ${supplier.email ?? ''}`.toLocaleLowerCase('pt-BR').includes(query))
  }, [supplierQuery, suppliers])
  const selectedQuotes = useMemo(() => selectedSuppliers.map(id => ({ id, quote: quotes[id] })).filter((entry): entry is { id: string; quote: SupplierQuote } => Boolean(entry.quote)), [selectedSuppliers, quotes])
  const lowestNetCost = useMemo(() => {
    const costs = selectedQuotes.map(({ quote }) => quote.custo.trim() === '' ? Number.NaN : Number(quote.custo)).filter(value => Number.isFinite(value) && value >= 0)
    return costs.length ? Math.min(...costs) : null
  }, [selectedQuotes])
  const winnerCost = winnerId ? Number(quotes[winnerId]?.custo) : NaN
  const justificationRequired = lowestNetCost !== null && winnerId !== '' && Number.isFinite(winnerCost) && winnerCost > lowestNetCost
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade), 0),
    [items],
  )
  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return products.slice(0, 30)
    return products.filter(product => (product.codigo + ' ' + product.nome).toLocaleLowerCase('pt-BR').includes(query)).slice(0, 30)
  }, [productQuery, products])

  const addItem = () => {
    const product = products.find(candidate => candidate.id === productId)
    const parsedQuantity = Number(quantity)
    if (!product) {
      setError('Selecione um produto ou matéria-prima.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('A quantidade deve ser maior que zero.')
      return
    }
    setError('')
    setItems(current => [...current, {
      produto_id: product.id,
      codigo: product.codigo,
      descricao: product.nome,
      quantidade: String(parsedQuantity),
      unidade: product.unidade,
      data_necessidade: needDate,
      observacoes: '',
    }])
    setProductId('')
    setProductQuery('')
    setQuantity('1')
  }

  const save = async () => {
    if (!selectedSuppliers.length || !items.length) {
      setError('Selecione ao menos um fornecedor e um item.')
      return
    }
    if (!winnerId || !selectedSuppliers.includes(winnerId)) {
      setError('Selecione o fornecedor vencedor entre os fornecedores cotados.')
      return
    }
    if (selectedQuotes.length !== selectedSuppliers.length || selectedQuotes.some(({ quote }) => quote.custo.trim() === '' || !Number.isFinite(Number(quote.custo)) || Number(quote.custo) < 0 || quote.prazo.trim() === '' || !Number.isFinite(Number(quote.prazo)) || Number(quote.prazo) < 0)) {
      setError('Informe custo líquido e prazo válidos para todos os fornecedores selecionados.')
      return
    }
    if (justificationRequired && !justification.trim()) {
      setError('A justificativa é obrigatória quando o fornecedor escolhido não oferece o menor custo líquido.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    let empresaId: string | null = null
    let rfqId: string | null = null

    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa não identificada.')
      }
      empresaId = String(company.data)

      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) {
        throw auth.error ?? new Error('Sessão não localizada para registrar a cotação.')
      }
      const profile = await supabase
        .from('erp_usuarios')
        .select('id')
        .eq('auth_user_id', auth.data.user.id)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profile.error || !profile.data) {
        throw profile.error ?? new Error('Perfil ERP ativo não localizado para registrar a cotação.')
      }

      const header = await supabase
        .from('erp_rfq')
        .insert({
          empresa_id: empresaId,
          status: 'ABERTA',
          comprador_responsavel: buyer.trim() || null,
          status_aprovacao: approvalStatus,
          data_limite: deadline || null,
          previsao_entrega: deliveryForecast || null,
          justificativa_escolha: justification.trim() || null,
          menor_custo_liquido_atendido: !justificationRequired,
          data_necessidade: items.map(item => item.data_necessidade).filter(Boolean).sort()[0] || null,
          prazo_resposta: responseDate || null,
          condicao_pagamento: paymentCondition.trim() || null,
          observacoes: notes.trim() || null,
          created_by: profile.data.id,
        })
        .select('id,numero')
        .single()
      if (header.error || !header.data) {
        throw header.error ?? new Error('A cotação não foi retornada pelo banco.')
      }
      rfqId = header.data.id

      const supplierInsert = await supabase
        .from('erp_rfq_fornecedores')
        .insert(selectedSuppliers.map(fornecedorId => {
          const quote = quotes[fornecedorId]
          const cost = Number(quote.custo)
          return {
            empresa_id: empresaId,
            rfq_id: rfqId,
            fornecedor_id: fornecedorId,
            valor_total: cost,
            valor_frete: 0,
            valor_desconto: 0,
            prazo_entrega_dias: Number(quote.prazo),
            condicao_pagamento: quote.condicao.trim() || paymentCondition.trim() || null,
            custo_liquido_total: cost,
            selecionado_para_pedido: fornecedorId === winnerId,
            status: fornecedorId === winnerId ? 'SELECIONADO' : 'COTADO',
          }
        }))
      if (supplierInsert.error) throw supplierInsert.error

      const itemInsert = await supabase
        .from('erp_rfq_itens')
        .insert(items.map(item => ({
          empresa_id: empresaId,
          rfq_id: rfqId,
          produto_id: item.produto_id,
          descricao: item.descricao,
          codigo: item.codigo,
          quantidade: Number(item.quantidade),
          unidade: item.unidade || 'UN',
          data_necessidade: item.data_necessidade || null,
          observacoes: item.observacoes || null,
        })))
      if (itemInsert.error) throw itemInsert.error

      setMessage(`RFQ #${header.data.numero} criada com ${selectedSuppliers.length} fornecedor(es) e ${totalQuantity} unidades.`)
      setItems([])
      setSelectedSuppliers([])
      setQuotes({})
      setWinnerId('')
      setJustification('')
    } catch (cause) {
      if (rfqId && empresaId) {
        const rollback = await supabase
          .from('erp_rfq')
          .delete()
          .eq('id', rfqId)
          .eq('empresa_id', empresaId)
        if (rollback.error) {
          const original = cause instanceof Error ? cause.message : String(cause)
          setError(`${original} A exclusão da cotação incompleta também falhou: ${rollback.error.message}`)
          return
        }
      }
      setError(cause instanceof Error ? cause.message : 'Falha ao criar a cotação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Cotação de compras" subtitle="Fornecedores • materiais • prazo • condição de pagamento" onRefresh={() => window.location.reload()}>
    <div className="compras-rfq-compact min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="flex min-h-[70px] items-center justify-between gap-3 px-5 lg:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-[#2D8DB8]">Compras • Suprimentos</p>
            <h1 className="text-xl font-medium text-[#123B50]">Pedido de Cotação — RFQ</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/compras/solicitacao-manual')}
              className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <ArrowLeft size={15} /> Solicitações
            </button>
            <button
              type="button"
              onClick={() => navigate('/compras/pedido')}
              className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              Pedido de compra
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-4 lg:p-8">
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
        {message && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</div>}
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-lg border bg-white p-5 lg:col-span-1">
            <h2 className="font-medium text-[#123B50]">Fornecedores selecionados</h2>
            <label className="mt-3 flex items-center gap-2 rounded border px-3">
              <Search size={16} aria-hidden="true" />
              <input
                className="min-w-0 flex-1 border-0 px-0"
                value={supplierQuery}
                onChange={event => setSupplierQuery(event.target.value)}
                placeholder="Pesquisar fornecedores..."
                aria-label="Pesquisar fornecedores da cotação"
              />
            </label>
            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {loading ? <p role="status">Carregando fornecedores...</p> : visibleSuppliers.map(supplier => (
                <label key={supplier.id} className="flex gap-3 rounded border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(supplier.id)}
                    onChange={event => setSelectedSuppliers(current => event.target.checked
                      ? [...current, supplier.id]
                      : current.filter(id => id !== supplier.id))}
                  />
                  <span>
                    <strong>{supplier.razao_social}</strong>
                    <br />
                    <span className="text-xs text-slate-500">{supplier.email || 'Sem e-mail cadastrado'}</span>
                  </span>
                </label>
              ))}
              {!loading && !visibleSuppliers.length && <p>Nenhum fornecedor ativo corresponde à pesquisa.</p>}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-5 lg:col-span-2">
            <div className="grid grid-cols-12 gap-3">
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Comprador responsável
                <input value={buyer} onChange={event => setBuyer(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" maxLength={100} />
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Status da aprovação
                <select value={approvalStatus} onChange={event => setApprovalStatus(event.target.value)} className="mt-1 h-9 w-full rounded border px-3">
                  <option value="EM_ANALISE">Em análise</option><option value="APROVADO">Aprovado</option><option value="REPROVADO">Reprovado</option>
                </select>
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Data limite
                <input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" />
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Previsão de entrega
                <input type="date" value={deliveryForecast} onChange={event => setDeliveryForecast(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" />
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Prazo para resposta
              <label className="text-xs">
                Prazo para resposta
                <input type="date" value={responseDate} onChange={event => setResponseDate(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" />
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Condição de pagamento
                <input value={paymentCondition} onChange={event => setPaymentCondition(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" />
              </label>
              <label className="col-span-12 text-xs sm:col-span-6 lg:col-span-4">
                Necessidade
                <input type="date" value={needDate} onChange={event => setNeedDate(event.target.value)} className="mt-1 h-9 w-full rounded border px-3" />
              </label>
            </div>

            <section className="mt-4 overflow-x-auto rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#123B50]">Mapa de custo líquido e seleção do fornecedor</h3>
              {!selectedSuppliers.length ? <p className="text-xs text-slate-500">Selecione fornecedores no painel à esquerda para registrar as propostas.</p> : <table className="w-full min-w-[680px] text-xs"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Fornecedor</th><th className="p-2">Custo líquido (R$)</th><th className="p-2">Prazo (dias)</th><th className="p-2">Condição de pagamento</th><th className="p-2">Vencedor</th></tr></thead><tbody>{selectedSuppliers.map(id => { const supplier = suppliers.find(entry => entry.id === id); const quote = quotes[id] ?? { custo: '', prazo: '', condicao: '' }; return <tr key={id} className="border-b"><td className="p-2 font-semibold">{supplier?.razao_social ?? 'Fornecedor'}</td><td className="p-2"><input aria-label={`Custo líquido de ${supplier?.razao_social ?? 'fornecedor'}`} type="number" min="0" step="0.01" value={quote.custo} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, custo: event.target.value } }))} className="h-9 w-32 rounded border px-2" /></td><td className="p-2"><input aria-label={`Prazo de ${supplier?.razao_social ?? 'fornecedor'}`} type="number" min="0" step="1" value={quote.prazo} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, prazo: event.target.value } }))} className="h-9 w-24 rounded border px-2" /></td><td className="p-2"><input aria-label={`Condição de pagamento de ${supplier?.razao_social ?? 'fornecedor'}`} value={quote.condicao} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, condicao: event.target.value } }))} className="h-9 w-40 rounded border px-2" /></td><td className="p-2 text-center"><input type="radio" name="rfq-winner" checked={winnerId === id} onChange={() => setWinnerId(id)} aria-label={`Selecionar ${supplier?.razao_social ?? 'fornecedor'} como vencedor`} /></td></tr> })}</tbody></table>}
              {justificationRequired && <p className="mt-2 text-xs font-semibold text-amber-700">O fornecedor escolhido tem custo acima do menor valor (R$ {lowestNetCost?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Justificativa obrigatória.</p>}
              <label className="mt-3 block text-xs font-semibold text-slate-700">Justificativa de escolha {justificationRequired ? '(obrigatória)' : '(opcional)'}
                <textarea value={justification} onChange={event => setJustification(event.target.value)} disabled={!justificationRequired} className="mt-1 min-h-20 w-full rounded border p-3 text-sm disabled:bg-slate-50 disabled:text-slate-400" placeholder={justificationRequired ? 'Explique o motivo comercial/técnico para escolher uma proposta mais cara.' : 'Não exigida quando o menor custo líquido é selecionado.'} />
              </label>
            </section>

            <div className="mt-5 grid grid-cols-12 gap-2">
              <div className="relative min-w-0">
                <input value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductId('') }} onKeyDown={event => { if (event.key === 'Enter' && visibleProducts[0]) { event.preventDefault(); setProductId(visibleProducts[0].id); setProductQuery(visibleProducts[0].codigo + ' — ' + visibleProducts[0].nome) } }} placeholder="Digite código ou descrição do produto..." className="h-9 w-full rounded border px-3" aria-label="Pesquisar produto por código ou descrição" />
                {productQuery && !productId && <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-auto rounded border bg-white shadow-lg">{visibleProducts.map(product => <button key={product.id} type="button" className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setProductId(product.id); setProductQuery(product.codigo + ' — ' + product.nome) }}><strong>{product.codigo}</strong> — {product.nome} <span className="text-slate-500">({product.unidade})</span></button>)}{!visibleProducts.length && <p className="px-3 py-3 text-xs text-slate-500">Nenhum produto ativo encontrado.</p>}</div>}
              </div>
              <input aria-label="Quantidade" type="number" min="0.0001" step="0.0001" value={quantity} onChange={event => setQuantity(event.target.value)} className="h-9 rounded border px-3" />
              <button type="button" onClick={addItem} className="col-span-12 flex h-9 items-center justify-center gap-1 rounded bg-[#123B50] text-xs text-white sm:col-span-3">
                <Plus size={15} /> Adicionar
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b bg-slate-100 text-left"><th className="p-3">Código</th><th className="p-3">Descrição</th><th className="p-3">Qtd.</th><th className="p-3">Necessidade</th><th className="p-3">Ações</th></tr></thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.produto_id}-${index}`} className="border-b">
                      <td className="p-3">{item.codigo}</td>
                      <td className="p-3">{item.descricao}</td>
                      <td className="p-3">{item.quantidade} {item.unidade}</td>
                      <td className="p-3">{item.data_necessidade || '—'}</td>
                      <td className="p-3">
                        <button type="button" aria-label={`Remover ${item.descricao}`} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && <tr><td className="p-4 text-center text-slate-500" colSpan={5}>Adicione ao menos um item à cotação.</td></tr>}
                </tbody>
              </table>
            </div>

            <label className="mt-4 block text-xs">
              Observações da cotação
              <textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded border p-3 text-sm" />
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-slate-600">{selectedSuppliers.length} fornecedor(es) · {totalQuantity} unidade(s)</span>
              <button type="button" disabled={busy || loading} onClick={() => void save()} className="flex min-h-11 items-center justify-center gap-2 rounded bg-[#2D8DB8] px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={16} /> {busy ? 'Salvando...' : 'Guardar RFQ'}
              </button>
            </div>
          </section>
        </div>
      </main>
      <style>{`.compras-rfq-compact header>div{min-height:44px!important;padding:6px 12px!important}.compras-rfq-compact main{max-width:none!important;padding:8px!important}.compras-rfq-compact .rounded,.compras-rfq-compact .rounded-md,.compras-rfq-compact .rounded-lg{border-radius:3px!important}.compras-rfq-compact section{padding:12px!important}.compras-rfq-compact input:not([type=checkbox]):not([type=radio]),.compras-rfq-compact select{height:36px!important;min-height:36px!important;border-radius:3px!important;font-size:12px!important}.compras-rfq-compact textarea{border-radius:3px!important;font-size:12px!important}.compras-rfq-compact table{font-size:11px!important}.compras-rfq-compact th,.compras-rfq-compact td{padding:6px 8px!important}.compras-rfq-compact button{border-radius:3px!important;font-size:11px!important}`}</style>
    </div>
    </VendasLayout>
  )
}
