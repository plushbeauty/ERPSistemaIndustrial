/**
 * @AUTOR: SYSNQRA
 * @REVISAO: COMPRAS-PEDIDO-RPC-SCHEMA-REAL-20261110
 * Pedido de compra gravado por RPC transacional e campos limitados ao contrato PostgreSQL real.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileSpreadsheet, Plus, Printer, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Row = Record<string, unknown>
type Item = { key: string; produtoId: string; quantidade: string; unidade: string; valorUnitario: string; dataNecessidade: string; observacoes: string }
type Header = { fornecedorId: string; requisicaoId: string; condicao: string; entrega: string; centroCusto: string; localEntrega: string; referenciaCotacao: string; especificacaoTecnica: string; observacoes: string; status: 'RASCUNHO' | 'PENDENTE_APROVACAO' }
type Company = { razao_social: string; nome_fantasia: string | null; cnpj: string | null; telefone: string | null; email: string | null; endereco: string | null; cidade: string | null; uf: string | null; cep: string | null }
const initialItem = (): Item => ({ key: crypto.randomUUID(), produtoId: '', quantidade: '1', unidade: 'UN', valorUnitario: '0', dataNecessidade: '', observacoes: '' })
const initialHeader = (): Header => ({ fornecedorId: '', requisicaoId: '', condicao: '', entrega: '', centroCusto: '', localEntrega: '', referenciaCotacao: '', especificacaoTecnica: '', observacoes: '', status: 'RASCUNHO' })
const value = (row: Row, key: string) => { const v = row[key]; return typeof v === 'string' || typeof v === 'number' ? String(v) : '' }
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComprasPedidoForm({ onCancel, onSaved, pedidoId }: { onCancel: () => void; onSaved: (message: string) => void; pedidoId?: string }) {
  const [header, setHeader] = useState<Header>(initialHeader)
  const [items, setItems] = useState<Item[]>([initialItem()])
  const [suppliers, setSuppliers] = useState<Row[]>([])
  const [products, setProducts] = useState<Row[]>([])
  const [requisitions, setRequisitions] = useState<Row[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [savedPedidoId, setSavedPedidoId] = useState(pedidoId ?? '')
  const [savedOrderNumber, setSavedOrderNumber] = useState('')
  const [emissionDate, setEmissionDate] = useState('')
  const selectedSupplier = suppliers.find(row => value(row, 'id') === header.fornecedorId)
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.valorUnitario) || 0), 0), [items])
  const updateItem = (key: string, field: keyof Item, next: string) => setItems(current => current.map(item => item.key === key ? { ...item, [field]: next } : item))

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setReferenceError(null)
      try {
        const { data: empresaId, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
        if (tenantError || typeof empresaId !== 'string' || !empresaId) throw tenantError ?? new Error('Empresa da sessão não identificada.')
        const [supplierRows, productRows, requisitionRows, companyResult] = await Promise.all([
          fetchAllPages<Row>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia,documento,email,telefone,endereco,cidade,estado,contato,ativo',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('razao_social').range(from,to)),
          fetchAllPages<Row>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,unidade,ativo',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
          fetchAllPages<Row>((from,to)=>supabase.from('erp_requisicoes_compra').select('id,codigo,status',{count:'exact'}).eq('empresa_id',empresaId).order('created_at',{ascending:false}).range(from,to)),
          supabase.from('erp_empresas').select('razao_social,nome_fantasia,cnpj,telefone,email,endereco,cidade,uf,cep').eq('id', empresaId).maybeSingle(),
        ])
        if (!active) return
        if (companyResult.error) throw companyResult.error
        setSuppliers(supplierRows)
        setProducts(productRows)
        setRequisitions(requisitionRows)
        setCompany(companyResult.data as Company | null)
        if (pedidoId) {
          const [orderResult, itemRows] = await Promise.all([
            supabase.from('erp_pedidos_compra').select('id,numero,fornecedor_id,requisicao_id,condicao_pagamento,data_prevista,centro_custo,local_entrega,referencia_cotacao,especificacao_tecnica,observacoes,status,created_at').eq('id', pedidoId).eq('empresa_id', empresaId).maybeSingle(),
            fetchAllPages<Row>((from,to)=>supabase.from('erp_pedidos_compra_itens').select('id,produto_id,descricao,quantidade,valor_unitario,codigo_mp,unidade,data_necessidade,observacoes',{count:'exact'}).eq('pedido_id',pedidoId).eq('empresa_id',empresaId).order('created_at').range(from,to)),
          ])
          if (orderResult.error) throw orderResult.error
          if (!orderResult.data) throw new Error('Pedido não encontrado nesta empresa.')
          if (!['RASCUNHO', 'PENDENTE_APROVACAO'].includes(String(orderResult.data.status))) throw new Error('Somente pedidos em rascunho ou pendentes de aprovação podem ser editados.')
          const order = orderResult.data as Row
          setHeader({ fornecedorId: value(order, 'fornecedor_id'), requisicaoId: value(order, 'requisicao_id'), condicao: value(order, 'condicao_pagamento'), entrega: value(order, 'data_prevista'), centroCusto: value(order, 'centro_custo'), localEntrega: value(order, 'local_entrega'), referenciaCotacao: value(order, 'referencia_cotacao'), especificacaoTecnica: value(order, 'especificacao_tecnica'), observacoes: value(order, 'observacoes'), status: String(order.status) === 'PENDENTE_APROVACAO' ? 'PENDENTE_APROVACAO' : 'RASCUNHO' })
          setItems(itemRows.map(row => ({ key: value(row, 'id') || crypto.randomUUID(), produtoId: value(row, 'produto_id'), quantidade: value(row, 'quantidade') || '1', unidade: value(row, 'unidade') || 'UN', valorUnitario: value(row, 'valor_unitario') || '0', dataNecessidade: value(row, 'data_necessidade'), observacoes: value(row, 'observacoes') })))
          setSavedPedidoId(pedidoId)
          setSavedOrderNumber(value(order, 'numero'))
          setEmissionDate(value(order, 'created_at'))
        }
      } catch (cause) {
        if (active) setReferenceError(cause instanceof Error ? cause.message : 'Falha ao carregar referências.')
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [pedidoId])

  const printOrder = () => window.print()
  const exportItemsCsv = () => {
    const lines = [['Produto', 'Descrição', 'Unidade', 'Quantidade', 'Valor unitário', 'Subtotal', 'Data necessidade'], ...items.map(item => {
      const product = products.find(row => value(row, 'id') === item.produtoId)
      return [product ? value(product, 'codigo') : '', product ? value(product, 'nome') : '', item.unidade, item.quantidade, item.valorUnitario, String((Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0)), item.dataNecessidade]
    })]
    const csv = '\\ufeff' + lines.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\\r\\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'itens-pedido-compra.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (referenceError) throw new Error('Referências indisponíveis: ' + referenceError)
      if (!selectedSupplier) throw new Error('Selecione um fornecedor ativo desta empresa.')
      if (header.requisicaoId && !requisitions.some(row => value(row, 'id') === header.requisicaoId)) throw new Error('A requisição não pertence à empresa autenticada.')
      if (!header.condicao.trim()) throw new Error('Informe a condição de pagamento.')
      if (!items.length) throw new Error('Inclua ao menos um item.')
      const payloadItems = items.map((item, index) => {
        const quantity = Number(item.quantidade)
        const price = Number(item.valorUnitario)
        const product = products.find(row => value(row, 'id') === item.produtoId)
        if (!product) throw new Error('Selecione um produto válido no item ' + (index + 1) + '.')
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) throw new Error('Quantidade e valor unitário inválidos no item ' + (index + 1) + '.')
        return { produto_id: item.produtoId, codigo_mp: value(product, 'codigo'), descricao: value(product, 'nome'), quantidade: quantity, unidade: item.unidade.trim() || value(product, 'unidade') || 'UN', valor_unitario: price, data_necessidade: item.dataNecessidade || null, observacoes: item.observacoes.trim() || null }
      })
      const { data, error: saveError } = await supabase.rpc('erp_compras_salvar_pedido', {
        p_payload: {
          ...(savedPedidoId ? { pedido_id: savedPedidoId } : {}),
          fornecedor_id: header.fornecedorId,
          requisicao_id: header.requisicaoId || null,
          condicao_pagamento: header.condicao.trim(),
          data_prevista: header.entrega || null,
          centro_custo: header.centroCusto.trim() || null,
          local_entrega: header.localEntrega.trim() || null,
          referencia_cotacao: header.referenciaCotacao.trim() || null,
          especificacao_tecnica: header.especificacaoTecnica.trim() || null,
          observacoes: header.observacoes.trim() || null,
          status: header.status,
          itens: payloadItems,
        },
      })
      if (saveError) throw new Error('Não foi possível gravar o pedido: ' + saveError.message)
      const record = data as { pedido_id?: string; pedido_compra_id?: string; numero_pedido?: number | string } | null
      if (!record?.pedido_compra_id || record.numero_pedido === undefined || record.numero_pedido === null) throw new Error('A RPC não retornou os identificadores do pedido.')
      setSavedPedidoId(record.pedido_compra_id)
      setSavedOrderNumber(String(record.numero_pedido))
      const { data: savedHeader } = await supabase.from('erp_pedidos_compra').select('created_at').eq('id', record.pedido_compra_id).maybeSingle()
      setEmissionDate(typeof savedHeader?.created_at === 'string' ? savedHeader.created_at : '')
      onSaved('Pedido PC-' + String(record.numero_pedido).padStart(4, '0') + ' salvo com ' + payloadItems.length + ' item(ns).')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o pedido.')
    } finally { setSaving(false) }
  }

  return <section className="compras-panel compras-form-panel compras-order-editor">
    <style>{`
      .compras-order-print{display:none}
      @media print{
        @page{size:A4 portrait;margin:12mm}
        body *{visibility:hidden!important}
        .compras-order-print,.compras-order-print *{visibility:visible!important}
        .compras-order-print{display:block!important;position:absolute;inset:0;width:100%;font:11px Arial,sans-serif;color:#172b3a;background:#fff}
        .compras-order-print h1{font-size:20px;margin:4px 0}.compras-order-print h2{font-size:13px;margin:16px 0 6px}
        .compras-order-print .print-head{display:flex;justify-content:space-between;border-bottom:2px solid #123b50;padding-bottom:10px}
        .compras-order-print .print-brand{font-size:22px;font-weight:800;color:#123b50}
        .compras-order-print .print-meta{ text-align:right}
        .compras-order-print table{width:100%;border-collapse:collapse;margin-top:8px}
        .compras-order-print th,.compras-order-print td{border:1px solid #cbd5e1;padding:7px;text-align:left}
        .compras-order-print th{background:#eef4f7}
        .compras-order-print .print-total{text-align:right;margin-top:12px;font-size:14px;font-weight:700}
        .compras-order-print .print-sign{display:flex;justify-content:space-around;margin-top:60px;text-align:center}
        .compras-order-print .print-sign span{border-top:1px solid #334155;width:40%;padding-top:6px}
      }
    `}</style>
    <div className="compras-panel-heading no-print"><div><h2>{savedPedidoId ? 'Editar pedido de compra' : 'Novo pedido de compra'}</h2><p>Cabeçalho, itens e condições comerciais — somente campos persistidos no banco.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="compras-button compras-button--light h-10" onClick={exportItemsCsv} disabled={!items.length}><FileSpreadsheet size={14}/> Exportar itens CSV</button><button type="button" className="compras-button compras-button--light h-[38px] w-[115px] rounded-full" onClick={onCancel}><X size={14}/> Voltar</button><button type="button" className="compras-button compras-button--light h-10" onClick={printOrder} disabled={!savedOrderNumber}><Printer size={14}/> Imprimir / PDF</button></div></div>
    {referenceError && <div className="compras-error" role="alert"><strong>Referências indisponíveis.</strong><span>{referenceError}</span></div>}
    {error && <div className="compras-error" role="alert"><strong>Não foi possível concluir.</strong><span>{error}</span></div>}
    {loading && <div className="compras-loading">Carregando referências da empresa autenticada…</div>}
    <form className="compras-form-grid no-print" onSubmit={submit}>
      <label className="compras-field compras-field--wide"><span>Fornecedor ativo *</span><select required value={header.fornecedorId} onChange={e => setHeader(v => ({...v,fornecedorId:e.target.value}))}><option value="">Selecione o fornecedor</option>{suppliers.map(row => <option key={value(row,'id')} value={value(row,'id')}>{value(row,'razao_social')}</option>)}</select></label>
      <label className="compras-field"><span>Requisição vinculada</span><select value={header.requisicaoId} onChange={e => setHeader(v => ({...v,requisicaoId:e.target.value}))}><option value="">Pedido manual</option>{requisitions.map(row => <option key={value(row,'id')} value={value(row,'id')}>{value(row,'codigo')} · {value(row,'status')}</option>)}</select></label>
      <label className="compras-field"><span>Condição de pagamento *</span><input required value={header.condicao} onChange={e => setHeader(v => ({...v,condicao:e.target.value}))} placeholder="Ex.: 30/60 dias, boleto"/></label>
      <label className="compras-field"><span>Prazo / entrega prevista</span><input type="date" value={header.entrega} onChange={e => setHeader(v => ({...v,entrega:e.target.value}))}/></label>
      <label className="compras-field"><span>Status inicial</span><select value={header.status} onChange={e => setHeader(v => ({...v,status:e.target.value as Header['status']}))}><option value="RASCUNHO">Rascunho</option><option value="PENDENTE_APROVACAO">Enviar para aprovação</option></select></label>
      <label className="compras-field"><span>Centro de custo</span><input value={header.centroCusto} onChange={e => setHeader(v => ({...v,centroCusto:e.target.value}))}/></label>
      <label className="compras-field"><span>Local de entrega</span><input value={header.localEntrega} onChange={e => setHeader(v => ({...v,localEntrega:e.target.value}))}/></label>
      <label className="compras-field"><span>Referência da cotação</span><input value={header.referenciaCotacao} onChange={e => setHeader(v => ({...v,referenciaCotacao:e.target.value}))}/></label>
      <label className="compras-field compras-field--wide"><span>Especificação técnica</span><textarea rows={2} value={header.especificacaoTecnica} onChange={e => setHeader(v => ({...v,especificacaoTecnica:e.target.value}))}/></label>
      <div className="compras-items-editor">
        <div className="compras-panel-heading"><div><h2>Itens do pedido</h2><p>Produto, código, descrição, unidade, quantidade e valor unitário.</p></div><button type="button" className="compras-button compras-button--light" onClick={() => setItems(rows => [...rows,initialItem()])}><Plus size={14}/> Adicionar item</button></div>
        <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Produto / SKU</th><th>Descrição</th><th>Unidade</th><th>Quantidade</th><th>Valor unitário</th><th>Necessidade</th><th>Subtotal</th><th/></tr></thead><tbody>{items.map(item => {const product=products.find(row=>value(row,'id')===item.produtoId);return <tr key={item.key}><td><select required className="compras-grid-input compras-product-select" value={item.produtoId} onChange={e=>updateItem(item.key,'produtoId',e.target.value)}><option value="">Produto</option>{products.map(row=><option key={value(row,'id')} value={value(row,'id')}>{value(row,'codigo')} · {value(row,'nome')}</option>)}</select></td><td>{product?value(product,'nome'):'—'}</td><td><input className="compras-grid-input compras-grid-unit" value={item.unidade} onChange={e=>updateItem(item.key,'unidade',e.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e=>updateItem(item.key,'quantidade',e.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0" step="0.0001" value={item.valorUnitario} onChange={e=>updateItem(item.key,'valorUnitario',e.target.value)}/></td><td><input className="compras-grid-input compras-grid-date" type="date" value={item.dataNecessidade} onChange={e=>updateItem(item.key,'dataNecessidade',e.target.value)}/></td><td>{brl((Number(item.quantidade)||0)*(Number(item.valorUnitario)||0))}</td><td><button type="button" className="compras-remove-item" aria-label="Remover item" disabled={items.length===1} onClick={()=>setItems(rows=>rows.filter(row=>row.key!==item.key))}><Trash2 size={13}/></button></td></tr>})}</tbody></table></div>
      </div>
      <div className="compras-order-totals"><span>Total do pedido <strong>{brl(subtotal)}</strong></span></div>
      <label className="compras-field compras-field--wide"><span>Observações</span><textarea rows={2} value={header.observacoes} onChange={e=>setHeader(v=>({...v,observacoes:e.target.value}))}/></label>
      <div className="compras-form-footer"><span>{savedOrderNumber ? 'Pedido PC-' + savedOrderNumber.padStart(4, '0') + ' gravado. A impressão usa o número definitivo.' : 'Gravação atômica com validação de empresa e permissão no servidor.'}</span><button className="compras-button compras-button--primary" type="submit" disabled={saving||loading||Boolean(referenceError)||!suppliers.length||!products.length}>{saving?'Salvando…':savedPedidoId?'Salvar alterações':'Salvar pedido de compra'}</button></div>
    </form>
    <section className="compras-order-print" aria-hidden="true">
      <div className="print-head"><div><div className="print-brand">PLASTIBOR</div><strong>{company?.razao_social || company?.nome_fantasia || 'Dados cadastrais da empresa'}</strong><div>CNPJ: {company?.cnpj || 'Não informado no cadastro'}</div><div>{company?.endereco || 'Endereço não informado'} {company?.cidade || ''} {company?.uf || ''} CEP {company?.cep || ''}</div><div>{company?.telefone || ''} {company?.email || ''}</div></div><div className="print-meta"><h1>PEDIDO DE COMPRA</h1><div>Nº: {savedOrderNumber ? 'PC-' + savedOrderNumber.padStart(4, '0') : 'Aguardando gravação'}</div><div>Emissão: {emissionDate ? new Date(emissionDate).toLocaleDateString('pt-BR') : '—'}</div><div>Status: {header.status}</div></div></div>
      <h2>Fornecedor</h2><div><strong>{selectedSupplier?value(selectedSupplier,'razao_social'):'Não selecionado'}</strong></div><div>CNPJ/CPF: {selectedSupplier?value(selectedSupplier,'documento'):'—'} | Contato: {selectedSupplier?value(selectedSupplier,'contato'):'—'}</div><div>{selectedSupplier?value(selectedSupplier,'endereco'):''} {selectedSupplier?value(selectedSupplier,'cidade'):''} {selectedSupplier?value(selectedSupplier,'estado'):''}</div><div>{selectedSupplier?value(selectedSupplier,'telefone'):''} {selectedSupplier?value(selectedSupplier,'email'):''}</div>
      <h2>Condições comerciais</h2><div>Pagamento: {header.condicao || '—'} | Prazo: {header.entrega || '—'} | Local de entrega: {header.localEntrega || '—'}</div><div>Centro de custo: {header.centroCusto || '—'} | Cotação: {header.referenciaCotacao || '—'}</div>
      <h2>Itens</h2><table><thead><tr><th>Código/SKU</th><th>Descrição</th><th>Un.</th><th>Quantidade</th><th>Valor unitário</th><th>Subtotal</th></tr></thead><tbody>{items.map(item=>{const product=products.find(row=>value(row,'id')===item.produtoId);return <tr key={item.key}><td>{product?value(product,'codigo'):'—'}</td><td>{product?value(product,'nome'):'—'}</td><td>{item.unidade}</td><td>{item.quantidade}</td><td>{brl(Number(item.valorUnitario)||0)}</td><td>{brl((Number(item.quantidade)||0)*(Number(item.valorUnitario)||0))}</td></tr>})}</tbody></table>
      <div className="print-total">TOTAL: {brl(subtotal)}</div><div>Especificação técnica: {header.especificacaoTecnica || '—'}</div><div>Observações: {header.observacoes || '—'}</div>
      <div className="print-sign"><span>Solicitante / Compras</span><span>Aprovação / Diretoria</span></div>
      <div style={{marginTop:24,borderTop:'1px solid #cbd5e1',paddingTop:6}}>PLASTIBOR · Documento gerado pelo SYSNQRA ERP INDUSTRIAL</div>
    </section>
  </section>
}
