/**
 * @DATA_REVISAO_APROVACAO 2026-10-26
 * @STATUS_APROVACAO REV-COMPRAS-PO-PREMIUM-001 — substituição integral autorizada pelo usuário.
 * A gravação usa sessão Supabase e empresa da sessão; campos fiscais são enviados no payload dos itens.
 */
import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Supplier = { id: string; razao_social: string }
type Product = { id: string; codigo: string; nome: string; unidade_compra: string | null }
type Item = {
  produto_id: string
  codigo: string
  descricao: string
  quantidade: string
  valor_unitario: string
  unidade: string
  ipi: string
  icms: string
  centro_custo: string
}
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComprasPedidoCompra() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplier, setSupplier] = useState('')
  const [delivery, setDelivery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('0')
  const [itemIpi, setItemIpi] = useState('0')
  const [itemIcms, setItemIcms] = useState('0')
  const [costCenter, setCostCenter] = useState('PRODUCAO')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
        const companyId = String(company.data)
        const [supplierRows, productRows] = await Promise.all([
          fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores')
            .select('id,razao_social', { count: 'exact' })
            .eq('empresa_id', companyId).eq('ativo', true).order('razao_social').range(from, to)),
          fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
            .select('id,codigo,nome,unidade_compra', { count: 'exact' })
            .eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        ])
        if (active) { setSuppliers(supplierRows); setProducts(productRows) }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Falha no carregamento inicial.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const total = useMemo(() => items.reduce((sum, item) => {
    const base = Number(item.quantidade) * Number(item.valor_unitario)
    return sum + base + base * Number(item.ipi) / 100
  }, 0), [items])

  const addItem = () => {
    const selectedProduct = products.find(entry => entry.id === product)
    const quantity = Number(qty)
    const unitPrice = Number(price)
    const ipi = Number(itemIpi)
    const icms = Number(itemIcms)
    if (!selectedProduct) { setError('Selecione um produto cadastrado.'); return }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0
      || !Number.isFinite(ipi) || ipi < 0 || !Number.isFinite(icms) || icms < 0) {
      setError('Informe quantidade, preço, IPI e ICMS válidos e não negativos.')
      return
    }
    setError('')
    setItems(current => [...current, {
      produto_id: selectedProduct.id,
      codigo: selectedProduct.codigo,
      descricao: selectedProduct.nome,
      quantidade: String(quantity),
      valor_unitario: String(unitPrice),
      unidade: selectedProduct.unidade_compra || 'UN',
      ipi: String(ipi),
      icms: String(icms),
      centro_custo: costCenter,
    }])
    setProduct('')
    setQty('1')
    setPrice('0')
    setItemIpi('0')
    setItemIcms('0')
  }

  const save = async () => {
    if (!supplier || !items.length) { setError('Fornecedor e ao menos um item são obrigatórios.'); return }
    if (items.some(item => !Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0
      || !Number.isFinite(Number(item.valor_unitario)) || Number(item.valor_unitario) < 0)) {
      setError('Revise quantidades e preços antes de gravar.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão não localizada.')
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const companyId = String(company.data)
      const profile = await supabase.from('erp_usuarios').select('id,nome,empresa_id,ativo,deleted_at')
        .eq('auth_user_id', auth.data.user.id).eq('empresa_id', companyId)
        .eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error || !profile.data) throw profile.error ?? new Error('Perfil ERP ativo não localizado na empresa atual.')
      if (!suppliers.some(entry => entry.id === supplier)) throw new Error('O fornecedor selecionado não pertence à carteira carregada desta empresa.')
      const result = await supabase.rpc('erp_compras_salvar_pedido', {
        p_pedido_id: null,
        p_fornecedor_id: supplier,
        p_comprador_nome: profile.data.nome || null,
        p_condicao_pagamento: condition.trim() || null,
        p_prazo_entrega: delivery || null,
        p_observacoes: notes.trim() || null,
        p_status: 'PENDENTE_APROVACAO',
        p_itens: items.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.valor_unitario),
          unidade: item.unidade || 'UN',
          aliquota_ipi: Number(item.ipi),
          aliquota_icms: Number(item.icms),
          centro_custo: item.centro_custo,
        })),
      })
      if (result.error) throw result.error
      const saved = Array.isArray(result.data) ? result.data[0] : result.data
      if (!saved || typeof saved !== 'object' || !('id' in saved)) throw new Error('O banco não retornou o pedido criado.')
      setMessage(`Pedido de compra #${'numero' in saved ? String(saved.numero) : String(saved.id)} enviado para aprovação. Confirme os campos fiscais na rotina de aprovação.`)
      setItems([])
      setNotes('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao enviar pedido para aprovação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="synqra-po-page">
      <ERPHeader />
      <main className="synqra-po-main">
        <header className="synqra-po-heading">
          <div><span>SUPRIMENTOS INDUSTRIAIS</span><h1>Ordem de Compra Direta (PO)</h1><p>Pedido, custos, centro de custo e dados fiscais por item.</p></div>
          <span className="synqra-po-date">26/10/2026</span>
        </header>
        {(error || message) && <div role={error ? 'alert' : 'status'} className={`synqra-po-feedback ${error ? 'is-error' : 'is-success'}`}>{error || message}</div>}
        <section className="synqra-po-panel">
          <h2>01 · Alinhamento de fornecimento</h2>
          <div className="synqra-po-grid synqra-po-grid-head">
            <label>Fornecedor*<select required value={supplier} onChange={event => setSupplier(event.target.value)}><option value="">Selecionar fornecedor...</option>{suppliers.map(entry => <option key={entry.id} value={entry.id}>{entry.razao_social}</option>)}</select></label>
            <label>Prazo de entrega<input type="date" value={delivery} onChange={event => setDelivery(event.target.value)} /></label>
            <label>Condição comercial de pagamento<input value={condition} onChange={event => setCondition(event.target.value)} placeholder="Ex.: 28/56 dias" maxLength={120} /></label>
            <label>Observações<input value={notes} onChange={event => setNotes(event.target.value)} maxLength={500} /></label>
          </div>
        </section>
        <section className="synqra-po-panel">
          <h2>02 · Inclusão de insumos e regras fiscais</h2>
          <div className="synqra-po-grid synqra-po-grid-items">
            <label className="synqra-po-product">Material / part number*<select value={product} onChange={event => setProduct(event.target.value)}><option value="">Selecionar produto...</option>{products.map(entry => <option key={entry.id} value={entry.id}>{entry.codigo} — {entry.nome}</option>)}</select></label>
            <label>Quantidade*<input type="number" min="0.001" step="0.001" value={qty} onChange={event => setQty(event.target.value)} /></label>
            <label>Preço unitário (R$)*<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} /></label>
            <label>IPI (%)<input type="number" min="0" step="0.01" value={itemIpi} onChange={event => setItemIpi(event.target.value)} /></label>
            <label>ICMS (%)<input type="number" min="0" step="0.01" value={itemIcms} onChange={event => setItemIcms(event.target.value)} /></label>
            <label>Centro de custo<select value={costCenter} onChange={event => setCostCenter(event.target.value)}><option value="PRODUCAO">Manufatura / Fábrica</option><option value="MANUTENCAO">Manutenção e reparo</option><option value="ADMINISTRATIVO">Administrativo</option></select></label>
            <button type="button" onClick={addItem} className="synqra-po-add"><Plus size={14} /> Incluir item</button>
          </div>
          <div className="synqra-po-table-wrap"><table className="synqra-po-table"><thead><tr><th>Código</th><th>Descrição / part number</th><th>Qtd.</th><th>Preço un.</th><th>IPI</th><th>ICMS</th><th>Centro de custo</th><th>Subtotal + IPI</th><th>Ações</th></tr></thead>
            <tbody>{items.map((item, index) => {
              const base = Number(item.quantidade) * Number(item.valor_unitario)
              return <tr key={`${item.produto_id}-${index}`}><td>{item.codigo}</td><td>{item.descricao}</td><td>{item.quantidade} {item.unidade}</td><td>{money(Number(item.valor_unitario))}</td><td>{item.ipi}%</td><td>{item.icms}%</td><td>{item.centro_custo}</td><td>{money(base + base * Number(item.ipi) / 100)}</td><td><button type="button" aria-label={`Remover ${item.codigo}`} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></td></tr>
            })}{!items.length && <tr><td colSpan={9} className="synqra-po-empty">{loading ? 'Carregando dados...' : 'Nenhum item adicionado.'}</td></tr>}</tbody>
          </table></div>
          <div className="synqra-po-total"><span>{items.length} item(ns) · total calculado com IPI</span><strong>{money(total)}</strong></div>
        </section>
        <footer className="synqra-po-footer"><button type="button" disabled={busy || loading} onClick={() => void save()} className="synqra-po-save"><Save size={14} />{busy ? 'SALVANDO…' : 'GRAVAR ORDEM DE COMPRA'}</button></footer>
      </main>
      <style>{`
        .synqra-po-page{min-height:100vh;background:#0b1220;color:#e2e8f0;font:12px Inter,Segoe UI,sans-serif}
        .synqra-po-main{max-width:1600px;margin:0 auto;padding:12px;display:grid;gap:12px}
        .synqra-po-heading,.synqra-po-panel{border:1px solid #263449;background:#111c2e;padding:12px;border-radius:3px}
        .synqra-po-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}
        .synqra-po-heading span{font-size:10px;font-weight:800;letter-spacing:.12em;color:#38bdf8}
        .synqra-po-heading h1{font-size:16px;font-weight:800;margin:4px 0}
        .synqra-po-heading p{font-size:11px;color:#94a3b8;margin:0}
        .synqra-po-date{border:1px solid #334155;padding:6px 8px;border-radius:2px;white-space:nowrap}
        .synqra-po-panel h2{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#cbd5e1;font-weight:800;padding-bottom:8px;border-bottom:1px solid #263449;margin:0 0 12px}
        .synqra-po-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;align-items:end}
        .synqra-po-grid label{grid-column:span 2;display:grid;gap:4px;font-size:10px;font-weight:700;color:#94a3b8}
        .synqra-po-grid-head label:nth-child(1){grid-column:span 3}.synqra-po-grid-head label:nth-child(2){grid-column:span 2}.synqra-po-grid-head label:nth-child(3){grid-column:span 3}.synqra-po-grid-head label:nth-child(4){grid-column:span 4}
        .synqra-po-grid-items .synqra-po-product{grid-column:span 4}.synqra-po-grid-items label:nth-child(2),.synqra-po-grid-items label:nth-child(3){grid-column:span 2}.synqra-po-grid-items label:nth-child(4),.synqra-po-grid-items label:nth-child(5){grid-column:span 1}.synqra-po-grid-items label:nth-child(6){grid-column:span 2}
        .synqra-po-grid input,.synqra-po-grid select{height:32px;width:100%;min-width:0;box-sizing:border-box;background:#080e18;color:#e2e8f0;border:1px solid #334155;border-radius:2px;padding:0 8px;font:12px Inter,Segoe UI,sans-serif;outline:none}
        .synqra-po-grid input:focus,.synqra-po-grid select:focus{border-color:#38bdf8}
        .synqra-po-add,.synqra-po-save{height:32px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#1769d2;color:#fff;border:1px solid #277ee8;border-radius:2px;padding:0 12px;font-size:11px;font-weight:800;cursor:pointer}
        .synqra-po-add{grid-column:span 2}
        .synqra-po-table-wrap{overflow-x:auto;margin-top:12px;border:1px solid #263449}
        .synqra-po-table{width:100%;border-collapse:collapse;min-width:980px;font-size:11px}
        .synqra-po-table th{height:30px;text-align:left;padding:0 8px;background:#0b1423;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-size:9px}
        .synqra-po-table td{height:34px;padding:4px 8px;border-top:1px solid #263449;color:#dbe4f0}
        .synqra-po-table td button{display:inline-flex;align-items:center;justify-content:center;color:#94a3b8;padding:5px}.synqra-po-table td button:hover{color:#f87171}
        .synqra-po-empty{text-align:center;color:#64748b!important;height:54px!important}
        .synqra-po-total{display:flex;align-items:center;justify-content:space-between;padding:12px 0 0;color:#94a3b8;font-size:11px}
        .synqra-po-total strong{font-size:18px;color:#f8fafc}
        .synqra-po-footer{display:flex;justify-content:flex-end}.synqra-po-save{height:36px;padding:0 18px}
        .synqra-po-feedback{padding:9px 12px;border:1px solid;border-radius:2px}.synqra-po-feedback.is-error{color:#fca5a5;background:#450a0a;border-color:#7f1d1d}.synqra-po-feedback.is-success{color:#86efac;background:#052e16;border-color:#166534}
        @media(max-width:900px){.synqra-po-grid label,.synqra-po-grid-head label:nth-child(n),.synqra-po-grid-items .synqra-po-product,.synqra-po-grid-items label:nth-child(n),.synqra-po-add{grid-column:span 6}.synqra-po-heading{align-items:flex-start}.synqra-po-grid-head label:nth-child(4){grid-column:span 12}}
        @media(max-width:560px){.synqra-po-grid label,.synqra-po-grid-head label:nth-child(n),.synqra-po-grid-items .synqra-po-product,.synqra-po-grid-items label:nth-child(n),.synqra-po-add{grid-column:span 12}.synqra-po-heading h1{font-size:14px}}
      `}</style>
    </div>
  )
}
