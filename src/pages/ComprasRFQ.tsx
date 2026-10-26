/**
 * @DATA_REVISAO_APROVACAO 2026-10-26
 * @STATUS_APROVACAO REV-RFQ-PREMIUM-001 — substituição integral do layout antigo autorizada pelo usuário.
 * Proteção: scripts/verify-compras-rfq-premium-lock.mjs valida este marcador e a estrutura premium.
 * Aprovação funcional/produção depende dos gates de TypeScript, lint, auditoria e build.
 */
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
          data_conclusao: ['APROVADO', 'REJEITADO'].includes(approvalStatus) ? new Date().toISOString().slice(0, 10) : null,
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
    <VendasLayout
      title="Cotação de compras (RFQ)"
      subtitle="Mapa comercial de fornecedores, materiais, prazos e adjudicação"
      onRefresh={() => window.location.reload()}
      titleActions={
        <>
          <button type="button" onClick={() => navigate('/compras/solicitacao-manual')} className="rfq-action-secondary">
            <ArrowLeft size={14} /> Solicitações
          </button>
          <button type="button" onClick={() => navigate('/compras/pedido')} className="rfq-action-primary">
            Pedido de compra
          </button>
        </>
      }
      showStatusCards={false}
    >
      <div className="synqra-rfq-page">
        <div className="rfq-page-heading">
          <div>
            <span className="rfq-eyebrow">COMPRAS · SUPRIMENTOS INDUSTRIAIS</span>
            <h2>Mapa de cotação e adjudicação</h2>
            <p>Compare propostas e registre a decisão com rastreabilidade por empresa.</p>
          </div>
          <div className="rfq-heading-metrics">
            <div><span>FORNECEDORES</span><strong>{selectedSuppliers.length}</strong></div>
            <div><span>ITENS</span><strong>{items.length}</strong></div>
            <div><span>QUANTIDADE</span><strong>{totalQuantity.toLocaleString('pt-BR')}</strong></div>
          </div>
        </div>

        {error && <div className="rfq-feedback rfq-feedback-error" role="alert">{error}</div>}
        {message && <div className="rfq-feedback rfq-feedback-success" role="status">{message}</div>}

        <div className="rfq-main-grid">
          <section className="rfq-panel rfq-supplier-panel">
            <div className="rfq-panel-heading">
              <div><span className="rfq-section-index">01</span><h3>Fornecedores habilitados</h3></div>
              <span className="rfq-count">{visibleSuppliers.length}</span>
            </div>
            <label className="rfq-search">
              <Search size={15} aria-hidden="true" />
              <input value={supplierQuery} onChange={event => setSupplierQuery(event.target.value)} placeholder="Filtrar por razão social ou e-mail..." aria-label="Pesquisar fornecedores da cotação" />
            </label>
            <div className="rfq-supplier-list">
              {loading ? <p className="rfq-empty" role="status">Carregando fornecedores...</p> : visibleSuppliers.map(supplier => (
                <label key={supplier.id} className={`rfq-supplier-row ${selectedSuppliers.includes(supplier.id) ? 'is-selected' : ''}`}>
                  <input type="checkbox" checked={selectedSuppliers.includes(supplier.id)} onChange={event => {
                    setSelectedSuppliers(current => event.target.checked ? [...current, supplier.id] : current.filter(id => id !== supplier.id))
                    if (!event.target.checked && winnerId === supplier.id) setWinnerId('')
                  }} />
                  <span className="rfq-supplier-copy"><strong>{supplier.razao_social}</strong><small>{supplier.email || 'Sem e-mail cadastrado'}</small></span>
                  <span className="rfq-supplier-check" aria-hidden="true">{selectedSuppliers.includes(supplier.id) ? '✓' : '+'}</span>
                </label>
              ))}
              {!loading && !visibleSuppliers.length && <p className="rfq-empty">Nenhum fornecedor ativo corresponde à pesquisa.</p>}
            </div>
            <p className="rfq-panel-footnote">Selecione os fornecedores que participarão desta cotação.</p>
          </section>

          <div className="rfq-workspace-column">
            <section className="rfq-panel">
              <div className="rfq-panel-heading">
                <div><span className="rfq-section-index">02</span><h3>Dados gerais da cotação</h3></div>
              </div>
              <div className="rfq-fields-grid">
                <label>Comprador responsável<input value={buyer} onChange={event => setBuyer(event.target.value)} maxLength={100} /></label>
                <label>Status da aprovação<select value={approvalStatus} onChange={event => setApprovalStatus(event.target.value)}><option value="EM_ANALISE">Em análise</option><option value="APROVADO">Aprovado</option><option value="REPROVADO">Reprovado</option></select></label>
                <label>Data limite<input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>
                <label>Previsão de entrega<input type="date" value={deliveryForecast} onChange={event => setDeliveryForecast(event.target.value)} /></label>
                <label>Prazo para resposta<input type="date" value={responseDate} onChange={event => setResponseDate(event.target.value)} /></label>
                <label>Condição de pagamento<input value={paymentCondition} onChange={event => setPaymentCondition(event.target.value)} placeholder="Ex.: 28/56 dias" /></label>
                <label>Data de necessidade<input type="date" value={needDate} onChange={event => setNeedDate(event.target.value)} /></label>
              </div>
            </section>

            <section className="rfq-panel">
              <div className="rfq-panel-heading">
                <div><span className="rfq-section-index">03</span><h3>Mapa comercial e adjudicação</h3></div>
                <span className="rfq-panel-hint">Valores líquidos · prazo em dias</span>
              </div>
              {!selectedSuppliers.length ? <p className="rfq-empty rfq-empty-inline">Marque os fornecedores no painel lateral para abrir o mapa de propostas.</p> : (
                <div className="rfq-table-wrap"><table className="rfq-table">
                  <thead><tr><th>Fornecedor</th><th>Custo líquido (R$)</th><th>Prazo (dias)</th><th>Condição de pagamento</th><th>Vencedor</th></tr></thead>
                  <tbody>{selectedSuppliers.map(id => {
                    const supplier = suppliers.find(entry => entry.id === id)
                    const quote = quotes[id] ?? { custo: '', prazo: '', condicao: '' }
                    return <tr key={id}>
                      <td className="rfq-vendor-name">{supplier?.razao_social ?? 'Fornecedor'}</td>
                      <td><input aria-label={`Custo líquido de ${supplier?.razao_social ?? 'fornecedor'}`} type="number" min="0" step="0.01" value={quote.custo} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, custo: event.target.value } }))} /></td>
                      <td><input aria-label={`Prazo de ${supplier?.razao_social ?? 'fornecedor'}`} type="number" min="0" step="1" value={quote.prazo} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, prazo: event.target.value } }))} /></td>
                      <td><input aria-label={`Condição de pagamento de ${supplier?.razao_social ?? 'fornecedor'}`} value={quote.condicao} onChange={event => setQuotes(current => ({ ...current, [id]: { ...quote, condicao: event.target.value } }))} /></td>
                      <td className="rfq-winner-cell"><input type="radio" name="rfq-winner" checked={winnerId === id} onChange={() => setWinnerId(id)} aria-label={`Selecionar ${supplier?.razao_social ?? 'fornecedor'} como vencedor`} /></td>
                    </tr>
                  })}</tbody>
                </table></div>
              )}
              {justificationRequired && <div className="rfq-cost-warning">A proposta escolhida supera o menor custo líquido de {lowestNetCost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Registre a justificativa para auditoria.</div>}
              <label className="rfq-textarea-label">Justificativa de escolha {justificationRequired ? '(obrigatória)' : '(opcional)'}
                <textarea value={justification} onChange={event => setJustification(event.target.value)} disabled={!justificationRequired} placeholder={justificationRequired ? 'Descreva os fatores técnicos, logísticos ou de qualidade que justificam a escolha.' : 'Ativada quando o vencedor não oferece o menor custo líquido.'} />
              </label>
            </section>

            <section className="rfq-panel">
              <div className="rfq-panel-heading">
                <div><span className="rfq-section-index">04</span><h3>Materiais e itens solicitados</h3></div>
              </div>
              <div className="rfq-add-item-grid">
                <div className="rfq-product-search">
                  <label>Produto / insumo industrial
                    <input value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductId('') }} onKeyDown={event => {
                      if (event.key === 'Enter' && visibleProducts[0]) { event.preventDefault(); setProductId(visibleProducts[0].id); setProductQuery(visibleProducts[0].codigo + ' — ' + visibleProducts[0].nome) }
                    }} placeholder="Buscar por código ou descrição..." aria-label="Pesquisar produto por código ou descrição" />
                  </label>
                  {productQuery && !productId && <div className="rfq-product-results">{visibleProducts.map(product => <button key={product.id} type="button" onClick={() => { setProductId(product.id); setProductQuery(product.codigo + ' — ' + product.nome) }}><strong>{product.codigo}</strong> — {product.nome}<small>{product.unidade}</small></button>)}{!visibleProducts.length && <p>Nenhum insumo localizado.</p>}</div>}
                </div>
                <label className="rfq-quantity-label">Quantidade<input aria-label="Quantidade" type="number" min="0.0001" step="0.0001" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
                <button type="button" onClick={addItem} className="rfq-add-button"><Plus size={15} /> Incluir item</button>
              </div>
              <div className="rfq-table-wrap">
                <table className="rfq-table rfq-items-table">
                  <thead><tr><th>Código</th><th>Especificação do item</th><th>Qtd. solicitada</th><th>Necessidade</th><th>Ações</th></tr></thead>
                  <tbody>{items.map((item, index) => <tr key={`${item.produto_id}-${index}`}>
                    <td>{item.codigo}</td><td>{item.descricao}</td><td>{item.quantidade} {item.unidade}</td><td>{item.data_necessidade || '—'}</td>
                    <td><button type="button" className="rfq-remove-button" aria-label={`Remover ${item.descricao}`} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></td>
                  </tr>)}
                  {!items.length && <tr><td colSpan={5} className="rfq-empty-cell">Nenhum item adicionado. Pesquise e inclua materiais acima.</td></tr>}</tbody>
                </table>
              </div>
              <label className="rfq-textarea-label rfq-notes-label">Observações gerais / cláusulas técnicas
                <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Observações internas ou termos enviados aos fornecedores..." />
              </label>
              <div className="rfq-save-bar">
                <span>{selectedSuppliers.length} fornecedor(es) · {items.length} item(ns) · {totalQuantity.toLocaleString('pt-BR')} unidade(s)</span>
                <button type="button" disabled={busy || loading} onClick={() => void save()} className="rfq-save-button"><Save size={15} /> {busy ? 'Processando...' : 'Liberar e salvar RFQ'}</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </VendasLayout>
  )
}
