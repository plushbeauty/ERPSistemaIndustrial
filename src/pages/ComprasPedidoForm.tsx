import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Row = Record<string, unknown>
type Item = { key: string; produtoId: string; quantidade: string; unidade: string; preco: string; ncm: string; entrega: string; ordemProducaoId: string; centroCusto: string; ipi: string; icms: string }
type Header = { fornecedorId: string; requisicaoId: string; comprador: string; condicao: string; entrega: string; centroCusto: string; localEntrega: string; cotacao: string; freteTipo: string; transportadora: string; frete: string; desconto: string; contrato: string; observacoes: string; recebimento: string; status: 'RASCUNHO' | 'PENDENTE_APROVACAO' }

const initialItem = (): Item => ({ key: crypto.randomUUID(), produtoId: '', quantidade: '1', unidade: 'UN', preco: '0', ncm: '', entrega: '', ordemProducaoId: '', centroCusto: '', ipi: '0', icms: '0' })
const initialHeader = (): Header => ({ fornecedorId: '', requisicaoId: '', comprador: '', condicao: '', entrega: '', centroCusto: '', localEntrega: '', cotacao: '', freteTipo: 'CIF', transportadora: '', frete: '0', desconto: '0', contrato: '', observacoes: '', recebimento: '', status: 'RASCUNHO' })
const asText = (row: Row, key: string) => { const value = row[key]; return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComprasPedidoForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (message: string) => void }) {
  const [header, setHeader] = useState<Header>(initialHeader)
  const [items, setItems] = useState<Item[]>([initialItem()])
  const [suppliers, setSuppliers] = useState<Row[]>([])
  const [products, setProducts] = useState<Row[]>([])
  const [requisitions, setRequisitions] = useState<Row[]>([])
  const [productionOrders, setProductionOrders] = useState<Row[]>([])
  const [productionOrders, setProductionOrders] = useState<Row[]>([])
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingRefs(true)
      const { data: empresaId, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError || typeof empresaId !== 'string' || !empresaId) {
        if (active) { setError(tenantError?.message || 'Empresa da sessão autenticada não identificada.'); setLoadingRefs(false) }
        return
      }
      const [supplierResult, productResult, requisitionResult, productionOrderResult] = await Promise.all([
        supabase.from('erp_fornecedores').select('id,razao_social,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('razao_social'),
        supabase.from('erp_produtos').select('id,codigo,nome,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('codigo'),
        supabase.from('erp_requisicoes_compra').select('id,codigo,status').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(200),
        supabase.from('erp_ordens_producao').select('id,numero_op,status').eq('empresa_id', empresaId).order('numero_op', { ascending: false }).limit(300),
        supabase.from('erp_ordens_producao').select('id,numero_op,status').eq('empresa_id', empresaId).order('numero_op', { ascending: false }).limit(300),
      ])
      if (!active) return
      const refErrors = [supplierResult.error, productResult.error, requisitionResult.error, productionOrderResult.error].filter(Boolean)
      if (refErrors.length) setError('Falha ao carregar referências do pedido: ' + refErrors.map(item => item?.message).join(' | '))
      setSuppliers((supplierResult.data ?? []) as Row[])
      setProducts((productResult.data ?? []) as Row[])
      setRequisitions((requisitionResult.data ?? []) as Row[])
      setProductionOrders((productionOrderResult.data ?? []) as Row[])
      setProductionOrders((productionOrderResult.data ?? []) as Row[])
      setLoadingRefs(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0), 0), [items])
  const ipiTotal = useMemo(() => items.reduce((sum, item) => sum + (Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0) * Math.min(100, Math.max(0, Number(item.ipi) || 0) / 100), 0), [items])
  const icmsTotal = useMemo(() => items.reduce((sum, item) => sum + (Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0) * Math.min(100, Math.max(0, Number(item.icms) || 0) / 100), 0), [items])
  const total = Math.max(0, subtotal + ipiTotal + icmsTotal + (Number(header.frete) || 0) - (Number(header.desconto) || 0))

  const updateItem = (key: string, field: keyof Item, value: string) => setItems(current => current.map(item => item.key === key ? { ...item, [field]: value } : item))
  const field = (label: string, name: keyof Header, options?: { type?: string; required?: boolean; placeholder?: string }) => <label className="compras-field" key={name}><span>{label}{options?.required ? ' *' : ''}</span><input type={options?.type || 'text'} required={options?.required} value={header[name]} placeholder={options?.placeholder} onChange={event => setHeader(current => ({ ...current, [name]: event.target.value }))} /></label>

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const validItems = items.filter(item => item.produtoId && Number(item.quantidade) > 0 && Number(item.preco) >= 0)
      if (!header.fornecedorId) throw new Error('Selecione um fornecedor ativo.')
      if (!validItems.length) throw new Error('Inclua ao menos um produto com quantidade maior que zero.')
      for (const item of validItems) {
        if (item.ordemProducaoId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.ordemProducaoId)) throw new Error('O vínculo da OP deve ser o UUID válido da ordem de produção.')
      }
      const { data: empresaId, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (typeof empresaId !== 'string' || !empresaId) throw new Error('Empresa da sessão autenticada não identificada.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const payload = validItems.map(item => ({ produto_id: item.produtoId, quantidade: Number(item.quantidade), unidade: item.unidade.trim() || 'UN', preco_unitario: Number(item.preco), aliquota_ipi: Number(item.ipi) || 0, aliquota_icms: Number(item.icms) || 0, centro_custo: item.centroCusto.trim() || header.centroCusto.trim() || null, ncm: item.ncm.trim() || null, data_entrega_prometida: item.entrega || null, ordem_producao_id: item.ordemProducaoId.trim() || null }))
      const { data, error: saveError } = await supabase.rpc('erp_compras_salvar_pedido_completo', {
        p_pedido_id: null,
        p_fornecedor_id: header.fornecedorId,
        p_comprador_nome: header.comprador.trim() || auth.user.email || '',
        p_condicao_pagamento: header.condicao.trim(),
        p_prazo_entrega: header.entrega || null,
        p_observacoes: header.observacoes.trim(),
        p_status: header.status,
        p_itens: payload,
        p_dados_comerciais: {
          requisicao_id: header.requisicaoId || null,
          centro_custo: header.centroCusto.trim() || null,
          local_entrega: header.localEntrega.trim() || null,
          referencia_cotacao: header.cotacao.trim() || null,
          modalidade_frete: header.freteTipo,
          transportadora: header.transportadora.trim() || null,
          valor_frete: Math.max(0, Number(header.frete) || 0),
          valor_desconto: Math.max(0, Number(header.desconto) || 0),
          numero_contrato: header.contrato.trim() || null,
          observacoes_recebimento: header.recebimento.trim() || null,
        },
      })
      if (saveError) throw saveError
      const record = Array.isArray(data) ? data[0] as Row | undefined : data as Row | null
      if (!record || typeof record.id !== 'string') throw new Error('O banco não retornou o pedido criado.')
      onSaved('Pedido PC-' + String(record.numero ?? '').padStart(4, '0') + ' salvo com ' + validItems.length + ' item(ns). Status: ' + (header.status === 'RASCUNHO' ? 'Rascunho' : 'Aguardando aprovação') + '.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o pedido de compra.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="compras-panel compras-form-panel compras-order-editor">
    <div className="compras-panel-heading"><div><h2>Novo pedido de compra</h2><p>Cabeçalho, itens industriais e condições comerciais no mesmo formulário.</p></div><button type="button" className="compras-button compras-button--light" onClick={onCancel}><X size={14}/> Cancelar</button></div>
    {error && <div className="compras-error" role="alert"><strong>Não foi possível concluir.</strong><span>{error}</span></div>}
    {loadingRefs && <div className="compras-loading">Carregando fornecedores, produtos e requisições da empresa autenticada…</div>}
    <form className="compras-form-grid" onSubmit={submit}>
      <label className="compras-field compras-field--wide"><span>Fornecedor ativo *</span><select required value={header.fornecedorId} onChange={event => setHeader(current => ({...current,fornecedorId:event.target.value}))}><option value="">Selecione o fornecedor</option>{suppliers.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'razao_social')}</option>)}</select></label>
      <label className="compras-field"><span>Solicitação de compra / MRP</span><select value={header.requisicaoId} onChange={event => setHeader(current => ({...current,requisicaoId:event.target.value}))}><option value="">Pedido manual</option>{requisitions.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'codigo')} · {asText(row,'status')}</option>)}</select></label>
      {field('Comprador responsável', 'comprador', { placeholder: 'Preenchido com o usuário se ficar vazio' })}
      <label className="compras-field"><span>Data de emissão</span><input value={new Date().toLocaleDateString('pt-BR')} readOnly/></label>
      {field('Entrega prevista', 'entrega', {type:'date'})}
      {field('Condição de pagamento', 'condicao', {placeholder:'Ex.: 30/60 dias, boleto, PIX'})}
      <label className="compras-field"><span>Status inicial</span><select value={header.status} onChange={event => setHeader(current => ({...current,status:event.target.value as Header['status']}))}><option value="RASCUNHO">Rascunho</option><option value="PENDENTE_APROVACAO">Enviar para aprovação</option></select></label>
      {field('Centro de custo', 'centroCusto', {placeholder:'Setor / linha de produção'})}
      {field('Local de entrega', 'localEntrega', {placeholder:'Unidade / doca'})}
      {field('Referência da cotação', 'cotacao', {placeholder:'Número da cotação'})}
      <label className="compras-field"><span>Frete</span><select value={header.freteTipo} onChange={event => setHeader(current => ({...current,freteTipo:event.target.value}))}><option value="CIF">CIF — fornecedor</option><option value="FOB">FOB — comprador</option></select></label>
      {field('Transportadora', 'transportadora')}
      {field('Valor frete (R$)', 'frete', {type:'number'})}
      {field('Desconto (R$)', 'desconto', {type:'number'})}
      {field('Nº contrato', 'contrato')}
      <div className="compras-items-editor">
        <div className="compras-panel-heading"><div><h2>Itens do pedido</h2><p>Produto cadastrado, NCM, unidade, quantidade, preço, entrega e alocação industrial.</p></div><button type="button" className="compras-button compras-button--light" onClick={() => setItems(current => [...current,initialItem()])}><Plus size={14}/> Adicionar item</button></div>
        <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Produto / código</th><th>NCM</th><th>Qtd.</th><th>UM</th><th>Preço unit. (R$)</th><th>Entrega prometida</th><th>ID OP</th><th>Centro de custo</th><th>IPI %</th><th>ICMS %</th><th>Total item</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item.key}><td><select required className="compras-grid-input compras-product-select" value={item.produtoId} onChange={event => updateItem(item.key,'produtoId',event.target.value)}><option value="">Produto</option>{products.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'codigo')} · {asText(row,'nome')}</option>)}</select></td><td><input required className="compras-grid-input compras-grid-text" value={item.ncm} maxLength={16} placeholder="NCM" onChange={event => updateItem(item.key,'ncm',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={event => updateItem(item.key,'quantidade',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-unit" value={item.unidade} maxLength={8} onChange={event => updateItem(item.key,'unidade',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0" step="0.0001" value={item.preco} onChange={event => updateItem(item.key,'preco',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-date" type="date" value={item.entrega} onChange={event => updateItem(item.key,'entrega',event.target.value)}/></td><td><select className="compras-grid-input compras-grid-text" value={item.ordemProducaoId} onChange={event => updateItem(item.key,'ordemProducaoId',event.target.value)}><option value="">Sem OP</option>{productionOrders.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>OP-{asText(row,'numero_op')} · {asText(row,'status')}</option>)}</select></td><td><input className="compras-grid-input compras-grid-text" value={item.centroCusto} placeholder="Centro" onChange={event => updateItem(item.key,'centroCusto',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-number" type="number" min="0" max="100" step="0.01" value={item.ipi} onChange={event => updateItem(item.key,'ipi',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-number" type="number" min="0" max="100" step="0.01" value={item.icms} onChange={event => updateItem(item.key,'icms',event.target.value)}/></td><td>{brl((Number(item.quantidade)||0)*(Number(item.preco)||0))}</td><td><button type="button" className="compras-remove-item" aria-label="Remover item" disabled={items.length===1} onClick={() => setItems(current => current.filter(candidate => candidate.key!==item.key))}><Trash2 size={13}/></button></td></tr>)}</tbody></table></div>
      </div>
      <div className="compras-order-totals"><span>Subtotal <strong>{brl(subtotal)}</strong></span><span>IPI estimado <strong>{brl(ipiTotal)}</strong></span><span>ICMS estimado <strong>{brl(icmsTotal)}</strong></span><span>Total líquido estimado <strong>{brl(total)}</strong></span></div>
      <label className="compras-field compras-field--full"><span>Observações gerais</span><textarea rows={2} maxLength={3000} value={header.observacoes} onChange={event => setHeader(current => ({...current,observacoes:event.target.value}))} placeholder="Especificações, laudos de qualidade e instruções de entrega"/></label>
      <label className="compras-field compras-field--full"><span>Orientações para recebimento</span><textarea rows={2} maxLength={2000} value={header.recebimento} onChange={event => setHeader(current => ({...current,recebimento:event.target.value}))} placeholder="Conferência de lote, quantidade, nota fiscal e inspeção"/></label>
      <div className="compras-form-footer"><span>O pedido e os itens são gravados por RPC autenticada, com validação de empresa, fornecedor, produtos e permissão. Impostos são estimativas informadas pelo comprador.</span><button className="compras-button compras-button--primary" type="submit" disabled={saving||loadingRefs||!suppliers.length||!products.length}>{saving?'Salvando…':'Salvar pedido de compra'}</button></div>
    </form>
  </section>
}
