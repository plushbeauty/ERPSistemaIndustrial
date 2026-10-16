/**
 * ERP INDUSTRIAL — FORMULÁRIO DE PEDIDO DE COMPRA
 * Data de criação: 16/10/2026
 * Revisão: 1.0
 * Escopo: 12 campos travados em grids industriais, controles h-8/rounded-[2px],
 * sessão Supabase validada, isolamento por empresa e gravação via RPC existente.
 * Nota de integração: a forma de pagamento é persistida em observações identificadas,
 * pois não foi confirmada uma coluna própria em erp_pedidos_compra no schema versionado.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import {
  cardClass,
  DesignField,
  fieldClass,
  gridLayout,
  readOnlyFieldClass,
  sectionTitleClass,
} from '../layout/DesignSystemStyleGuide'

type Supplier = {
  id: string
  razao_social: string
}

type Product = {
  id: string
  codigo: string
  nome: string
  unidade: string | null
  unidade_compra?: string | null
  custo_ultimo: number | null
}

type OrderResult = {
  id: unknown
  numero: unknown
}

const todayLocal = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PedidoCompraForm() {
  const [companyId, setCompanyId] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderNumber, setOrderNumber] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [issueDate, setIssueDate] = useState(todayLocal)
  const [paymentCondition, setPaymentCondition] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [carrier, setCarrier] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('0')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [observations, setObservations] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId],
  )

  const grossTotal = useMemo(
    () => Math.max(0, Number(quantity) || 0) * Math.max(0, Number(unitPrice) || 0),
    [quantity, unitPrice],
  )

  const discountValue = useMemo(
    () => grossTotal * (Math.min(100, Math.max(0, Number(discountPercent) || 0)) / 100),
    [grossTotal, discountPercent],
  )

  const netTotal = Math.max(0, grossTotal - discountValue)

  useEffect(() => {
    let active = true

    async function loadLookups() {
      setError('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error || !auth.data.user) {
          throw auth.error ?? new Error('Sessão autenticada não localizada. Entre novamente no ERP.')
        }

        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) {
          throw company.error ?? new Error('Empresa da sessão não identificada.')
        }
        const currentCompanyId = String(company.data)

        const profile = await supabase
          .from('erp_usuarios')
          .select('empresa_id,ativo,deleted_at')
          .eq('auth_user_id', auth.data.user.id)
          .maybeSingle()

        if (profile.error) throw profile.error
        if (
          !profile.data?.ativo ||
          profile.data.deleted_at ||
          profile.data.empresa_id !== currentCompanyId
        ) {
          throw new Error('Perfil ERP ativo não corresponde à empresa da sessão.')
        }

        const [supplierRows, productRows] = await Promise.all([
          fetchAllPages<Supplier>((from, to) =>
            supabase
              .from('erp_fornecedores')
              .select('id,razao_social', { count: 'exact' })
              .eq('empresa_id', currentCompanyId)
              .eq('ativo', true)
              .order('razao_social')
              .range(from, to),
          ),
          fetchAllPages<Product>((from, to) =>
            supabase
              .from('erp_produtos')
              .select('id,codigo,nome,unidade,unidade_compra,custo_ultimo', { count: 'exact' })
              .eq('empresa_id', currentCompanyId)
              .eq('ativo', true)
              .order('codigo')
              .range(from, to),
          ),
        ])

        if (!active) return
        setCompanyId(currentCompanyId)
        setSuppliers(supplierRows)
        setProducts(productRows)
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Falha ao carregar fornecedores e produtos.')
        }
      }
    }

    void loadLookups()
    return () => {
      active = false
    }
  }, [])

  function changeProduct(nextProductId: string) {
    setProductId(nextProductId)
    const product = products.find((entry) => entry.id === nextProductId)
    if (product) setUnitPrice(String(Math.max(0, Number(product.custo_ultimo) || 0)))
  }

  async function saveOrder() {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (!companyId) throw new Error('Empresa da sessão não foi validada.')
      if (!supplierId) throw new Error('Selecione um fornecedor ativo da empresa.')
      if (!selectedProduct) throw new Error('Selecione um produto ativo do cadastro ERP.')

      const parsedQuantity = Number(quantity)
      const parsedPrice = Number(unitPrice)
      const parsedDiscount = Number(discountPercent)

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error('A quantidade deve ser maior que zero.')
      }
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error('O preço unitário não pode ser negativo.')
      }
      if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        throw new Error('O desconto deve ficar entre 0 e 100%.')
      }
      if (!issueDate) throw new Error('Informe a data de emissão.')

      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) {
        throw auth.error ?? new Error('Sessão expirada. Entre novamente no ERP.')
      }

      const profile = await supabase
        .from('erp_usuarios')
        .select('nome,empresa_id,ativo,deleted_at')
        .eq('auth_user_id', auth.data.user.id)
        .maybeSingle()

      if (profile.error) throw profile.error
      if (
        !profile.data?.ativo ||
        profile.data.deleted_at ||
        profile.data.empresa_id !== companyId ||
        !profile.data.nome
      ) {
        throw new Error('Perfil ERP ativo não localizado para a empresa atual.')
      }

      const notes = [
        observations.trim(),
        paymentMethod ? `Forma de pagamento: ${paymentMethod}` : '',
      ].filter(Boolean).join('\n')

      const result = await supabase.rpc('erp_compras_salvar_pedido', {
        p_pedido_id: null,
        p_fornecedor_id: supplierId,
        p_comprador_nome: profile.data.nome,
        p_condicao_pagamento: paymentCondition.trim() || null,
        p_prazo_entrega: null,
        p_observacoes: notes || null,
        p_status: 'RASCUNHO',
        p_itens: [{
          produto_id: selectedProduct.id,
          quantidade: parsedQuantity,
          preco_unitario: parsedPrice,
          unidade: selectedProduct.unidade_compra || selectedProduct.unidade || 'UN',
        }],
      })

      if (result.error) throw result.error
      const rawCreated = Array.isArray(result.data) ? result.data[0] : result.data
      if (
        !rawCreated ||
        typeof rawCreated !== 'object' ||
        !('id' in rawCreated) ||
        !('numero' in rawCreated)
      ) {
        throw new Error('O banco não retornou o identificador do pedido criado.')
      }

      const created = rawCreated as OrderResult
      const createdId = String(created.id)
      const createdNumber = String(created.numero)
      setOrderNumber(createdNumber)

      const metadata = await supabase
        .from('erp_pedidos_compra')
        .update({
          data_pedido: new Date(`${issueDate}T12:00:00`).toISOString(),
          transportadora: carrier.trim() || null,
          valor_desconto: Number(discountValue.toFixed(2)),
          total: Number(netTotal.toFixed(2)),
        })
        .eq('id', createdId)
        .eq('empresa_id', companyId)
        .select('id')
        .single()

      if (metadata.error) {
        throw new Error(
          `Pedido ${createdNumber} criado, mas os campos complementares não foram gravados: ${metadata.error.message}`,
        )
      }

      setMessage(`Pedido PC-${createdNumber.padStart(4, '0')} salvo como rascunho. Total: ${money(netTotal)}.`)
      setPaymentCondition('')
      setPaymentMethod('')
      setCarrier('')
      setProductId('')
      setQuantity('1')
      setUnitPrice('0')
      setDiscountPercent('0')
      setObservations('')
      setIssueDate(todayLocal())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o pedido de compra.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-full bg-[#F4F6F9] p-3 text-slate-800 md:p-5">
      <section className={`mx-auto max-w-7xl ${cardClass}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wide text-[#123B50]">Pedido de Compra</h1>
            <p className="mt-1 text-xs text-slate-500">Compras · Cadastro operacional · Dados isolados por empresa</p>
          </div>
          <span className="inline-flex h-7 items-center gap-1 rounded-[2px] border border-slate-300 bg-slate-50 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {busy ? 'Processando' : 'Supabase'}
          </span>
        </header>

        {(error || message) && (
          <div
            className={`flex min-h-8 items-center gap-2 rounded-[2px] border px-3 py-1.5 text-xs font-semibold ${error ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
            role={error ? 'alert' : 'status'}
          >
            {error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>{error || message}</span>
          </div>
        )}

        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Cabeçalho do pedido</h2>
          <div className={gridLayout}>
            <DesignField label="Nº Pedido">
              <input className={readOnlyFieldClass} value={orderNumber ? `PC-${orderNumber.padStart(4, '0')}` : 'Gerado ao salvar'} readOnly aria-readonly="true" />
            </DesignField>
            <DesignField label="Fornecedor" className="md:col-span-2" required>
              <select className={fieldClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
                <option value="">Selecione o fornecedor...</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.razao_social}</option>)}
              </select>
            </DesignField>
            <DesignField label="Data Emissão" required>
              <input className={fieldClass} type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
            </DesignField>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Condições comerciais</h2>
          <div className={gridLayout}>
            <DesignField label="Condição Pgto">
              <input className={fieldClass} value={paymentCondition} onChange={(event) => setPaymentCondition(event.target.value)} maxLength={120} placeholder="Ex.: 30/60 dias" />
            </DesignField>
            <DesignField label="Forma Pgto">
              <select className={fieldClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="">Selecione...</option>
                <option value="PIX">PIX</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARTAO">Cartão</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="OUTRO">Outro</option>
              </select>
            </DesignField>
            <DesignField label="Transportadora" className="md:col-span-2">
              <input className={fieldClass} value={carrier} onChange={(event) => setCarrier(event.target.value)} maxLength={160} placeholder="Nome da transportadora" />
            </DesignField>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Item do pedido</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <DesignField label="Produto SKU" className="md:col-span-2" required>
              <select className={fieldClass} value={productId} onChange={(event) => changeProduct(event.target.value)} required>
                <option value="">Selecione SKU / produto...</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}
              </select>
            </DesignField>
            <DesignField label="Qtd" required>
              <input className={fieldClass} type="number" min="0.001" step="0.001" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </DesignField>
            <DesignField label="Preço Unitário" required>
              <input className={fieldClass} type="number" min="0" step="0.0001" inputMode="decimal" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
            </DesignField>
            <DesignField label="Desconto %">
              <input className={fieldClass} type="number" min="0" max="100" step="0.01" inputMode="decimal" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} />
            </DesignField>
          </div>
          <div className="flex flex-wrap justify-end gap-5 border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">Subtotal: <strong className="text-slate-700">{money(grossTotal)}</strong></span>
            <span className="text-slate-500">Desconto: <strong className="text-slate-700">{money(discountValue)}</strong></span>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Totais e observações</h2>
          <div className="grid grid-cols-2 gap-4">
            <DesignField label="Valor Total">
              <input className={readOnlyFieldClass} value={money(netTotal)} readOnly aria-readonly="true" />
            </DesignField>
            <DesignField label="Observações" className="col-span-2">
              <input className={fieldClass} value={observations} onChange={(event) => setObservations(event.target.value)} maxLength={1000} placeholder="Informações complementares do pedido" />
            </DesignField>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <p className="text-[10px] text-slate-500">12 campos · Controles h-8 · Cantos de 2 px · Gravação por RPC autenticada</p>
          <button
            className="inline-flex h-8 items-center justify-center gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-4 text-xs font-semibold text-white transition hover:bg-[#24799f] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => void saveOrder()}
            disabled={busy || !companyId}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {busy ? 'Salvando...' : 'Salvar Pedido'}
          </button>
        </footer>
      </section>
    </main>
  )
}
