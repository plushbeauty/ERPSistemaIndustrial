import { useEffect, useMemo, useState } from 'react'
import { FileCheck, Plus, RefreshCw, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../../components/industrial/EntityCodeLookup'

type Supplier = LookupRecord & { iso_9001_certificado?: boolean; documento?: string | null }
type Product = LookupRecord & { unidade?: string | null; unidade_compra?: string | null }

type Item = {
  key: string
  produto_id: string
  quantidade: string
  valor_unitario: string
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComprasPedido() {
  const [empresaId, setEmpresaId] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<Item[]>([{ key: 'linha-1', produto_id: '', quantidade: '', valor_unitario: '' }])
  const [showSupplierLookup, setShowSupplierLookup] = useState(false)
  const [status, setStatus] = useState<'rascunho' | 'aprovacao'>('rascunho')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(empresa.data)
      setEmpresaId(id)

      const [supplierResult, productResult] = await Promise.all([
        supabase.from('erp_fornecedores')
          .select('id,codigo,razao_social,nome_fantasia,documento,iso_9001_certificado')
          .eq('empresa_id', id).eq('ativo', true).order('razao_social').limit(2000),
        supabase.from('erp_produtos')
          .select('id,codigo,nome,unidade,unidade_compra,estoque_atual')
          .eq('empresa_id', id).eq('ativo', true).order('codigo').limit(3000),
      ])
      if (supplierResult.error) throw supplierResult.error
      if (productResult.error) throw productResult.error
      setSuppliers((supplierResult.data ?? []) as Supplier[])
      setProducts((productResult.data ?? []) as Product[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados de Compras.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0), 0),
    [items],
  )

  const reset = () => {
    setSupplierId('')
    setSupplierName('')
    setSupplier(null)
    setItems([{ key: 'linha-1', produto_id: '', quantidade: '', valor_unitario: '' }])
    setStatus('rascunho')
    setMessage('')
    setError('')
  }

  const addItem = () => {
    setItems(current => [...current, {
      key: `linha-${current.length + 1}-${Date.now()}`,
      produto_id: '',
      quantidade: '',
      valor_unitario: '',
    }])
  }

  const updateItem = (key: string, patch: Partial<Item>) => {
    setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      if (!supplierId) throw new Error('Selecione um fornecedor homologado.')
      if (!items.length) throw new Error('Inclua pelo menos um item.')
      const validItems = items.filter(item => item.produto_id && Number(item.quantidade) > 0)
      if (validItems.length !== items.length) throw new Error('Todos os itens precisam de produto e quantidade maior que zero.')
      if (validItems.some(item => Number(item.valor_unitario) < 0)) throw new Error('Preço unitário não pode ser negativo.')

      const rows = validItems.map(item => {
        const quantidade = Number(item.quantidade)
        const valorUnitario = Number(item.valor_unitario || 0)
        return {
          empresa_id: empresaId,
          fornecedor_id: supplierId,
          produto_id: item.produto_id,
          quantidade,
          valor_unitario: valorUnitario,
          total: quantidade * valorUnitario,
          status,
          data_prevista: null,
          observacoes: 'Pedido criado pela Central de Pedido de Compra.',
          origem_solicitacao: 'PEDIDO_COMPRA_MESTRE',
        }
      })

      const result = await supabase.from('erp_pedidos_compra').insert(rows).select('id,numero')
      if (result.error) throw result.error
      const numeros = (result.data ?? []).map(row => String(row.numero)).filter(Boolean)
      setMessage(numeros.length > 0
        ? `Pedido registrado no banco. Número(s): ${numeros.join(', ')}.`
        : 'Pedido registrado no banco.')
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar o pedido de compra.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-sky-700">MÓDULO: COMPRAS &gt; EMISSÃO DE PEDIDO</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Pedido de Compra</h1>
            <p className="text-sm text-slate-600">Emissão operacional com fornecedor, matérias-primas, preços e workflow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-bold"><RefreshCw size={17}/> Atualizar</button>
            <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-bold"><Plus size={17}/> Novo Pedido</button>
            <button type="button" onClick={() => setStatus('aprovacao')} className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-900 px-4 font-bold text-white"><FileCheck size={17}/> Enviar para Aprovação</button>
            <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-5 font-black text-white disabled:opacity-50"><ShoppingCart size={17}/> {busy ? 'SALVANDO...' : 'SALVAR RASCUNHO'}</button>
          </div>
        </header>

        {(message || error) && (
          <div className={`mt-4 rounded-md border p-4 font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {error || message}
          </div>
        )}

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black tracking-[.12em] text-sky-700">1. CABEÇALHO CONTRATUAL</p>
            <h2 className="mt-1 text-lg font-black">Fornecedor e qualificação</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <label className="text-sm font-bold">
              Nº Pedido
              <input readOnly value="Gerado pelo banco ao gravar" className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-slate-100 px-3 font-bold text-slate-700" />
            </label>
            <div>
              <label className="text-sm font-bold">Fornecedor homologado</label>
              <div className="mt-1 flex">
                <input readOnly value={supplierName} placeholder="Pesquisar fornecedor..." className="h-11 min-w-0 flex-1 rounded-l-md border border-slate-300 bg-slate-50 px-3" />
                <button type="button" onClick={() => setShowSupplierLookup(true)} className="flex h-11 items-center gap-2 rounded-r-md bg-slate-900 px-4 font-bold text-white"><Search size={16}/> Lupa</button>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-500">QUALIFICAÇÃO DO FORNECEDOR</p>
              <p className="mt-1 font-black text-slate-900">
                {supplier ? (supplier.iso_9001_certificado ? '★ ISO 9001 — homologação cadastrada' : 'Homologação cadastrada sem ISO 9001') : 'IQF não informado no cadastro'}
              </p>
              <p className="mt-1 text-xs text-slate-500">O cadastro atual não possui campo IQF; nenhum valor é inventado nesta tela.</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <p className="text-xs font-black tracking-[.12em] text-sky-700">2. ITENS E PREÇOS</p>
              <h2 className="mt-1 text-lg font-black">Matérias-primas do pedido</h2>
            </div>
            <button type="button" onClick={addItem} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-bold"><Plus size={16}/> Adicionar item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-slate-900 text-left text-sm font-black text-white">
                <tr className="h-[54px]">
                  <th className="px-4">Código / Insumo</th><th className="px-4">Quantidade</th><th className="px-4">Unidade</th><th className="px-4">Preço unitário</th><th className="px-4">Subtotal</th><th className="px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const product = products.find(p => p.id === item.produto_id)
                  return (
                    <tr key={item.key} className="h-[54px] border-b border-slate-200 even:bg-slate-50">
                      <td className="px-4">
                        <select value={item.produto_id} onChange={e => updateItem(item.key, { produto_id: e.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 font-bold">
                          <option value="">Selecionar insumo</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
                        </select>
                      </td>
                      <td className="px-4"><input type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e => updateItem(item.key, { quantidade: e.target.value })} className="h-10 w-32 rounded-md border border-slate-300 px-2"/></td>
                      <td className="px-4 font-bold">{product?.unidade_compra || product?.unidade || '—'}</td>
                      <td className="px-4"><input type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e => updateItem(item.key, { valor_unitario: e.target.value })} className="h-10 w-36 rounded-md border border-slate-300 px-2"/></td>
                      <td className="px-4 font-black">{money(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}</td>
                      <td className="px-4 text-right"><button type="button" disabled={items.length === 1} onClick={() => setItems(current => current.filter(row => row.key !== item.key))} className="rounded-md border border-rose-200 p-2 text-rose-700 disabled:opacity-40" title="Remover item"><Trash2 size={16}/></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black tracking-[.12em] text-slate-500">WORKFLOW</p>
            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-black ${status === 'aprovacao' ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'}`}>
              ● {status === 'aprovacao' ? 'AGUARDANDO APROVAÇÃO' : 'RASCUNHO'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs font-black tracking-[.12em] text-slate-500">VALOR TOTAL</p>
            <p className="text-3xl font-black text-slate-950">{money(total)}</p>
          </div>
        </section>
      </div>

      {showSupplierLookup && (
        <EntityCodeLookup
          label="COMPRAS: FORNECEDORES HOMOLOGADOS"
          value={supplierId}
          records={suppliers}
          onChange={setSupplierId}
          onSelect={record => {
            const selected = suppliers.find(row => row.id === record.id) ?? null
            setSupplierId(record.id)
            setSupplierName(selected?.razao_social || selected?.nome || record.codigo || '')
            setSupplier(selected)
            setShowSupplierLookup(false)
          }}
        />
      )}
    </main>
  )
}
