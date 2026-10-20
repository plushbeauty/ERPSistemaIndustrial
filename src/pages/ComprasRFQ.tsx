import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Supplier = { id: string; razao_social: string; email: string | null }
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
  const [items, setItems] = useState<Item[]>([])
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [needDate, setNeedDate] = useState('')
  const [responseDate, setResponseDate] = useState('')
  const [paymentCondition, setPaymentCondition] = useState('')
  const [buyerResponsible, setBuyerResponsible] = useState('')
  const [generalTerms, setGeneralTerms] = useState('')
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
          data_necessidade: items.map(item => item.data_necessidade).filter(Boolean).sort()[0] || null,
          prazo_resposta: responseDate || null,
          condicao_pagamento: paymentCondition.trim() || null,
          comprador_responsavel: buyerResponsible.trim() || null,
          termo_condicao_geral: generalTerms.trim() || null,
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
        .insert(selectedSuppliers.map(fornecedorId => ({
          empresa_id: empresaId,
          rfq_id: rfqId,
          fornecedor_id: fornecedorId,
        })))
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
    <div className="compras-rfq-compact min-h-screen bg-[#F4F7FE] text-slate-900">
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
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs">
                Prazo para resposta
                <input type="date" value={responseDate} onChange={event => setResponseDate(event.target.value)} className="mt-1 h-10 w-full rounded border p-2" />
              </label>
              <label className="text-xs md:col-span-2">
                Condição de pagamento
                <input value={paymentCondition} onChange={event => setPaymentCondition(event.target.value)} className="mt-1 h-10 w-full rounded border p-2" />
              </label>
              <label className="text-xs">
                Necessidade / entrega na fábrica
                <input type="date" value={needDate} onChange={event => setNeedDate(event.target.value)} className="mt-1 h-9 w-full rounded border p-2" />
              </label>
              <label className="text-xs md:col-span-2">
                Comprador responsável
                <input value={buyerResponsible} onChange={event => setBuyerResponsible(event.target.value)} maxLength={100} className="mt-1 h-9 w-full rounded border p-2" placeholder="Nome do comprador responsável" />
              </label>
            </div>
            <label className="mt-4 block text-xs">
              Termos e condições gerais de fornecimento
              <textarea value={generalTerms} onChange={event => setGeneralTerms(event.target.value)} rows={3} className="mt-1 min-h-20 w-full rounded border p-3 text-sm" maxLength={10000} placeholder="Condições gerais, requisitos de embalagem, documentação e qualidade..." />
            </label>

            <div className="mt-5 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_100px]">
              <div className="relative min-w-0">
                <input value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductId('') }} onKeyDown={event => { if (event.key === 'Enter' && visibleProducts[0]) { event.preventDefault(); setProductId(visibleProducts[0].id); setProductQuery(visibleProducts[0].codigo + ' — ' + visibleProducts[0].nome) } }} placeholder="Digite código ou descrição do produto..." className="h-10 w-full rounded border px-3" aria-label="Pesquisar produto por código ou descrição" />
                {productQuery && !productId && <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-auto rounded border bg-white shadow-lg">{visibleProducts.map(product => <button key={product.id} type="button" className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setProductId(product.id); setProductQuery(product.codigo + ' — ' + product.nome) }}><strong>{product.codigo}</strong> — {product.nome} <span className="text-slate-500">({product.unidade})</span></button>)}{!visibleProducts.length && <p className="px-3 py-3 text-xs text-slate-500">Nenhum produto ativo encontrado.</p>}</div>}
              </div>
              <input aria-label="Quantidade" type="number" min="0.0001" step="0.0001" value={quantity} onChange={event => setQuantity(event.target.value)} className="h-10 rounded border px-3" />
              <button type="button" onClick={addItem} className="flex min-h-10 items-center justify-center gap-1 rounded bg-[#123B50] text-xs text-white">
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
      <style>{`
/* Revisão visual RFQ — 20/10/2026 — Light Premium Azul; lógica e integração Supabase preservadas. */
.compras-rfq-compact{min-height:100%;background:#f8fafc;color:#334155;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.compras-rfq-compact>header{background:#f8fafc;border-color:#e2e8f0}
.compras-rfq-compact>header>div{min-height:64px!important;padding:12px 20px!important;max-width:1600px;margin:auto}
.compras-rfq-compact header h1{font-size:22px;font-weight:750;letter-spacing:-.025em;color:#0f172a}
.compras-rfq-compact header p{font-size:10px;font-weight:800;letter-spacing:.14em;color:#2563eb}
.compras-rfq-compact main{max-width:1600px!important;padding:18px!important}
.compras-rfq-compact main>.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px}
.compras-rfq-compact main>.grid>section:first-child{grid-column:span 4}
.compras-rfq-compact main>.grid>section:nth-child(2){grid-column:span 8}
.compras-rfq-compact section{min-width:0;padding:18px!important;background:#fff;border:1px solid #e2e8f0;border-radius:12px!important;box-shadow:0 4px 12px rgba(15,23,42,.05),0 1px 2px rgba(15,23,42,.03)}
.compras-rfq-compact section h2{font-size:13px;font-weight:800;letter-spacing:.035em;color:#1e293b}
.compras-rfq-compact label{color:#475569;font-size:11px;font-weight:700}
.compras-rfq-compact input:not([type=checkbox]),.compras-rfq-compact select{box-sizing:border-box;width:100%;height:36px!important;min-height:36px!important;padding:0 10px;border:1px solid #cbd5e1;border-radius:7px!important;background:#fff;color:#334155;font-size:12px!important;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.compras-rfq-compact input::placeholder{color:#94a3b8}
.compras-rfq-compact input:focus,.compras-rfq-compact select:focus,.compras-rfq-compact textarea:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12);outline:none}
.compras-rfq-compact textarea{box-sizing:border-box;width:100%;min-height:88px;padding:10px;border:1px solid #cbd5e1;border-radius:7px!important;background:#fff;color:#334155;font-size:12px!important;resize:vertical}
.compras-rfq-compact input[type=checkbox]{width:16px;height:16px;flex:0 0 auto;accent-color:#2563eb;margin-top:2px}
.compras-rfq-compact section:first-child label:has(input[type=checkbox]){align-items:flex-start;padding:11px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;transition:border-color .15s,background .15s}
.compras-rfq-compact section:first-child label:has(input[type=checkbox]):hover{border-color:#bfdbfe;background:#eff6ff}
.compras-rfq-compact section:first-child label strong{font-size:11px;line-height:1.4;color:#334155}
.compras-rfq-compact section:first-child label span span{font-size:10px}
.compras-rfq-compact section:first-child label:has(svg){height:36px;background:#f8fafc;border-color:#cbd5e1}
.compras-rfq-compact section:first-child label:has(svg) input{border:0!important;box-shadow:none!important;background:transparent}
.compras-rfq-compact button{min-height:36px;border-radius:7px!important;font-size:11px!important;font-weight:700;transition:background .15s,border-color .15s,box-shadow .15s}
.compras-rfq-compact button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.compras-rfq-compact main>div.grid>section:nth-child(2)>div:first-child{grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
.compras-rfq-compact main>div.grid>section:nth-child(2)>div:first-child label{grid-column:span 4;display:flex;flex-direction:column;gap:6px}
.compras-rfq-compact main>div.grid>section:nth-child(2)>div:nth-child(2){grid-template-columns:minmax(0,1fr) 100px 120px;gap:10px}
.compras-rfq-compact table{width:100%;border-collapse:separate;border-spacing:0;font-size:11px}
.compras-rfq-compact thead{background:#eff6ff;color:#1e40af}
.compras-rfq-compact th{padding:11px 12px!important;border-bottom:1px solid #dbeafe;text-align:left;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.compras-rfq-compact td{padding:10px 12px!important;border-bottom:1px solid #edf2f7;color:#334155;vertical-align:middle}
.compras-rfq-compact tbody tr:nth-child(even){background:#f8fafc}
.compras-rfq-compact tbody tr:hover{background:#eff6ff}
.compras-rfq-compact td button{display:inline-grid;place-items:center;width:30px;height:30px;min-height:30px;border:1px solid #fecaca;background:#fff;color:#b91c1c}
.compras-rfq-compact td button:hover{background:#fef2f2}
.compras-rfq-compact .bg-red-50,.compras-rfq-compact .bg-emerald-50{border-radius:8px}
.compras-rfq-compact button.bg-\\[\\#123B50\\]{background:#1e3a8a;box-shadow:0 2px 4px rgba(30,58,138,.16)}
.compras-rfq-compact button.bg-\\[\\#123B50\\]:hover{background:#1d4ed8}
.compras-rfq-compact button.bg-\\[\\#2D8DB8\\]{background:#2563eb;box-shadow:0 3px 8px rgba(37,99,235,.18)}
.compras-rfq-compact button.bg-\\[\\#2D8DB8\\]:hover{background:#1d4ed8}
.compras-rfq-compact button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:900px){.compras-rfq-compact main>.grid{gap:12px}.compras-rfq-compact main>.grid>section:first-child,.compras-rfq-compact main>.grid>section:nth-child(2){grid-column:span 12}.compras-rfq-compact main>div.grid>section:nth-child(2)>div:first-child label{grid-column:span 12}.compras-rfq-compact main>div.grid>section:nth-child(2)>div:nth-child(2){grid-template-columns:minmax(0,1fr) 84px 110px}}
@media(max-width:520px){.compras-rfq-compact>header>div{align-items:flex-start!important;flex-direction:column;padding:12px!important}.compras-rfq-compact header h1{font-size:18px}.compras-rfq-compact main{padding:10px!important}.compras-rfq-compact section{padding:12px!important}.compras-rfq-compact main>div.grid>section:nth-child(2)>div:nth-child(2){grid-template-columns:minmax(0,1fr) 80px}.compras-rfq-compact main>div.grid>section:nth-child(2)>div:nth-child(2)>button{grid-column:span 2}}
@media(prefers-reduced-motion:reduce){.compras-rfq-compact *{transition:none!important}}
`}</style>
    </div>
    </VendasLayout>
  )
}
