/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-COMPRAS-VALIDACAO-PEDIDO-20261108-01 — valida todas as linhas sem descarte silencioso, tenant e referências carregadas, NCM de 8 dígitos, valores não negativos e tributos apresentados sem somar ICMS em duplicidade
 * @STATUS_APROVACAO: REVISAO TECNICA AUTORIZADA PELO PROPRIETARIO EM 2026-11-08 PARA REFORCAR A VALIDACAO DO PEDIDO, MANTENDO A RPC TRANSACIONAL E O PADRAO VISUAL
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_PEDIDO_COMPRA_COMPLETO } from '../lib/supabaseRpcStatus'

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
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingRefs(true)
      setReferenceError(null)
      try {
        const { data: empresaId, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
        if (tenantError || typeof empresaId !== 'string' || !empresaId) throw tenantError ?? new Error('Empresa da sessão autenticada não identificada.')
        const [supplierResult, productResult, requisitionResult, productionOrderResult] = await Promise.all([
        supabase.from('erp_fornecedores').select('id,razao_social,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('razao_social'),
        supabase.from('erp_produtos').select('id,codigo,nome,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('codigo'),
        supabase.from('erp_requisicoes_compra').select('id,codigo,status').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(200),
        supabase.from('erp_ordens_producao').select('id,numero_op,status').eq('empresa_id', empresaId).order('numero_op', { ascending: false }).limit(300),
      ])
        if (!active) return
        const refErrors = [supplierResult.error, productResult.error, requisitionResult.error, productionOrderResult.error].filter(Boolean)
        if (refErrors.length) throw new Error('Falha ao carregar referências do pedido: ' + refErrors.map(item => item?.message).join(' | '))
        setSuppliers((supplierResult.data ?? []) as Row[])
        setProducts((productResult.data ?? []) as Row[])
        setRequisitions((requisitionResult.data ?? []) as Row[])
        setProductionOrders((productionOrderResult.data ?? []) as Row[])
      } catch (cause) {
        if (active) setReferenceError(cause instanceof Error ? cause.message : 'Falha ao carregar as referências do pedido.')
      } finally {
        if (active) setLoadingRefs(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0), 0), [items])
  const ipiTotal = useMemo(() => items.reduce((sum, item) => sum + (Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0) * Math.min(100, Math.max(0, Number(item.ipi) || 0)) / 100), 0), [items])
  const icmsTotal = useMemo(() => items.reduce((sum, item) => sum + (Math.max(0, Number(item.quantidade) || 0) * Math.max(0, Number(item.preco) || 0) * Math.min(100, Math.max(0, Number(item.icms) || 0)) / 100), 0), [items])
  const total = Math.max(0, subtotal + ipiTotal + (Number(header.frete) || 0) - (Number(header.desconto) || 0))

  const updateItem = (key: string, field: keyof Item, value: string) => setItems(current => current.map(item => item.key === key ? { ...item, [field]: value } : item))
  const field = (label: string, name: keyof Header, options?: { type?: string; required?: boolean; placeholder?: string }) => <label className="compras-field" key={name}><span>{label}{options?.required ? ' *' : ''}</span><input type={options?.type || 'text'} required={options?.required} value={header[name]} placeholder={options?.placeholder} onChange={event => setHeader(current => ({ ...current, [name]: event.target.value }))} /></label>

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (referenceError) throw new Error('As referências do pedido não foram carregadas: ' + referenceError)
      if (!suppliers.some(row => asText(row, 'id') === header.fornecedorId)) throw new Error('Selecione um fornecedor ativo válido para esta empresa.')
      if (header.requisicaoId && !requisitions.some(row => asText(row, 'id') === header.requisicaoId)) throw new Error('A requisição selecionada não pertence às referências carregadas desta empresa.')
      if (!header.condicao.trim()) throw new Error('Informe a condição de pagamento.')
      const validItems = items
      if (!validItems.length) throw new Error('Inclua ao menos um item no pedido.')
      for (const [index, item] of validItems.entries()) {
        const quantity = Number(item.quantidade)
        const price = Number(item.preco)
        const ipi = Number(item.ipi)
        const icms = Number(item.icms)
        const line = index + 1
        if (!item.produtoId || !products.some(row => asText(row, 'id') === item.produtoId)) throw new Error('Selecione um produto válido no item ' + line + '.')
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade maior que zero no item ' + line + '.')
        if (!Number.isFinite(price) || price < 0) throw new Error('Informe um preço unitário válido no item ' + line + '.')
        if (!Number.isFinite(ipi) || ipi < 0 || ipi > 100 || !Number.isFinite(icms) || icms < 0 || icms > 100) throw new Error('As alíquotas de IPI e ICMS devem ficar entre 0 e 100 no item ' + line + '.')
        const ncmDigits = item.ncm.replace(/\D/g, '')
        if (ncmDigits.length !== 8) throw new Error('Informe o NCM com 8 dígitos no item ' + line + '.')
        if (!item.entrega) throw new Error('Informe a data de entrega prometida no item ' + line + '.')
        if (item.ordemProducaoId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.ordemProducaoId) || !productionOrders.some(row => asText(row, 'id') === item.ordemProducaoId))) throw new Error('A OP selecionada no item ' + line + ' não é válida para esta empresa.')
      }
      const freight = Number(header.frete)
      const discount = Number(header.desconto)
      if (!Number.isFinite(freight) || freight < 0 || !Number.isFinite(discount) || discount < 0) throw new Error('Frete e desconto devem ser valores válidos e não negativos.')
      if (discount > subtotal + ipiTotal + icmsTotal + freight) throw new Error('O desconto não pode superar o valor estimado do pedido.')
      const { data: empresaId, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
      if (tenantError) throw tenantError
      if (typeof empresaId !== 'string' || !empresaId) throw new Error('Empresa da sessão autenticada não identificada.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.')
      const payload = validItems.map(item => ({ produto_id: item.produtoId, quantidade: Number(item.quantidade), unidade: item.unidade.trim() || 'UN', preco_unitario: Number(item.preco), aliquota_ipi: Number(item.ipi) || 0, aliquota_icms: Number(item.icms) || 0, centro_custo: item.centroCusto.trim() || header.centroCusto.trim() || null, ncm: item.ncm.replace(/\D/g, '') || null, data_entrega_prometida: item.entrega || null, ordem_producao_id: item.ordemProducaoId.trim() || null }))
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
          valor_frete: freight,
          valor_desconto: discount,
          numero_contrato: header.contrato.trim() || null,
          observacoes_recebimento: header.recebimento.trim() || null,
        },
      })
      if (saveError) {
        throw new Error(erroBancoNaoInstalado(saveError, 'erp_compras_salvar_pedido_completo', MIGRACAO_PEDIDO_COMPRA_COMPLETO)
          ?? `Não foi possível gravar o pedido de compra: ${saveError.message}`)
      }
      const record = Array.isArray(data) ? data[0] as Row | undefined : data as Row | null
      if (!record || typeof record.id !== 'string') throw new Error('O banco não retornou o pedido criado.')
      const pedidoLabel = record.numero != null ? 'Pedido PC-' + String(record.numero).padStart(4, '0') : 'Pedido de compra'
      onSaved(pedidoLabel + ' salvo com ' + validItems.length + ' item(ns). Status: ' + (header.status === 'RASCUNHO' ? 'Rascunho' : 'Aguardando aprovação') + '.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o pedido de compra.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="compras-panel compras-form-panel compras-order-editor">
    <div className="compras-panel-heading"><div><h2>Novo pedido de compra</h2><p>Cabeçalho, itens industriais e condições comerciais no mesmo formulário.</p></div><button type="button" className="compras-button compras-button--light" onClick={onCancel}><X size={14}/> Cancelar</button></div>
    {referenceError && <div className="compras-error" role="alert"><strong>Referências indisponíveis.</strong><span>{referenceError}</span></div>}
    {error && <div className="compras-error" role="alert"><strong>Não foi possível concluir.</strong><span>{error}</span></div>}
    {loadingRefs && <div className="compras-loading">Carregando fornecedores, produtos e requisições da empresa autenticada…</div>}
    <form className="compras-form-grid" onSubmit={submit}>
      <label className="compras-field compras-field--wide"><span>Fornecedor ativo *</span><select required value={header.fornecedorId} onChange={event => setHeader(current => ({...current,fornecedorId:event.target.value}))}><option value="">Selecione o fornecedor</option>{suppliers.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'razao_social')}</option>)}</select></label>
      <label className="compras-field"><span>Solicitação de compra / MRP</span><select value={header.requisicaoId} onChange={event => setHeader(current => ({...current,requisicaoId:event.target.value}))}><option value="">Pedido manual</option>{requisitions.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'codigo')} · {asText(row,'status')}</option>)}</select></label>
      {field('Comprador responsável', 'comprador', { placeholder: 'Preenchido com o usuário se ficar vazio' })}
      <label className="compras-field"><span>Data de emissão</span><input value={new Date().toLocaleDateString('pt-BR')} readOnly/></label>
      {field('Entrega prevista', 'entrega', {type:'date'})}
      {field('Condição de pagamento', 'condicao', {required:true, placeholder:'Ex.: 30/60 dias, boleto, PIX'})}
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
        <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Produto / código</th><th>NCM</th><th>Qtd.</th><th>UM</th><th>Preço unit. (R$)</th><th>Entrega prometida</th><th>Ordem de produção</th><th>Centro de custo</th><th>IPI %</th><th>ICMS %</th><th>Total item</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item.key}><td><select required className="compras-grid-input compras-product-select" value={item.produtoId} onChange={event => updateItem(item.key,'produtoId',event.target.value)}><option value="">Produto</option>{products.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>{asText(row,'codigo')} · {asText(row,'nome')}</option>)}</select></td><td><input required className="compras-grid-input compras-grid-text" value={item.ncm} maxLength={16} placeholder="NCM" onChange={event => updateItem(item.key,'ncm',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={event => updateItem(item.key,'quantidade',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-unit" value={item.unidade} maxLength={8} onChange={event => updateItem(item.key,'unidade',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-number" type="number" min="0" step="0.0001" value={item.preco} onChange={event => updateItem(item.key,'preco',event.target.value)}/></td><td><input required className="compras-grid-input compras-grid-date" type="date" value={item.entrega} onChange={event => updateItem(item.key,'entrega',event.target.value)}/></td><td><select className="compras-grid-input compras-grid-text" value={item.ordemProducaoId} onChange={event => updateItem(item.key,'ordemProducaoId',event.target.value)}><option value="">Sem OP</option>{productionOrders.map(row => <option key={asText(row,'id')} value={asText(row,'id')}>OP-{asText(row,'numero_op')} · {asText(row,'status')}</option>)}</select></td><td><input className="compras-grid-input compras-grid-text" value={item.centroCusto} placeholder="Centro" onChange={event => updateItem(item.key,'centroCusto',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-number" type="number" min="0" max="100" step="0.01" value={item.ipi} onChange={event => updateItem(item.key,'ipi',event.target.value)}/></td><td><input className="compras-grid-input compras-grid-number" type="number" min="0" max="100" step="0.01" value={item.icms} onChange={event => updateItem(item.key,'icms',event.target.value)}/></td><td>{brl((Number(item.quantidade)||0)*(Number(item.preco)||0))}</td><td><button type="button" className="compras-remove-item" aria-label="Remover item" disabled={items.length===1} onClick={() => setItems(current => current.filter(candidate => candidate.key!==item.key))}><Trash2 size={13}/></button></td></tr>)}</tbody></table></div>
      </div>
      <div className="compras-order-totals"><span>Subtotal <strong>{brl(subtotal)}</strong></span><span>IPI estimado <strong>{brl(ipiTotal)}</strong></span><span>ICMS informativo <strong>{brl(icmsTotal)}</strong></span><span>Total estimado (ICMS não somado novamente) <strong>{brl(total)}</strong></span></div>
      <label className="compras-field compras-field--full"><span>Observações gerais</span><textarea rows={2} maxLength={3000} value={header.observacoes} onChange={event => setHeader(current => ({...current,observacoes:event.target.value}))} placeholder="Especificações, laudos de qualidade e instruções de entrega"/></label>
      <label className="compras-field compras-field--full"><span>Orientações para recebimento</span><textarea rows={2} maxLength={2000} value={header.recebimento} onChange={event => setHeader(current => ({...current,recebimento:event.target.value}))} placeholder="Conferência de lote, quantidade, nota fiscal e inspeção"/></label>
      <div className="compras-form-footer"><span>O pedido e os itens são gravados em uma única RPC autenticada. O servidor deve validar tenant, fornecedor, produtos, requisição, OP e permissão. Impostos exibidos são estimativas; a apuração fiscal definitiva depende das regras tributárias aplicáveis.</span><button className="compras-button compras-button--primary" type="submit" disabled={saving||loadingRefs||Boolean(referenceError)||!suppliers.length||!products.length}>{saving?'Salvando…':'Salvar pedido de compra'}</button></div>
    </form>
  </section>
}
