import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, Plus, RefreshCw, Save, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { parseFiscalNumber } from '../lib/fiscal/nfe-number'
import { allocateReleaseDiscounts } from '../lib/fiscal/nfe-release-pricing'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import CompactInput from '../components/ui/CompactInput'
import CompactSelect from '../components/ui/CompactSelect'
import RequiredField from '../components/ui/RequiredField'
import '../styles/synqra-workspace.css'

type TextMap = Record<string, string>
type Item = {
  id: string
  produto_id: string
  codigo: string
  descricao: string
  lote: string
  ncm: string
  cst: string
  cfop: string
  unidade: string
  quantidade: string
  valorUnitario: string
  desconto: string
  icms: string
  ipi: string
  pis: string
  cofins: string
  origem: string
}
type Product = TextMap
type Transporter = TextMap

const newItem = (): Item => ({
  id: crypto.randomUUID(), produto_id: '', codigo: '', descricao: '', lote: '', ncm: '', cst: '',
  cfop: '', unidade: '', quantidade: '1', valorUnitario: '0', desconto: '0',
  icms: '0', ipi: '0', pis: '0', cofins: '0', origem: '0',
})

const initialForm: TextMap = {
  natureza: '', modelo: '55', serie: '', numero: '', tipoEmissao: '1', finalidade: '1',
  operacao: '1', emissao: new Date().toISOString().slice(0, 16), saida: '', cfop: '',
  ambiente: 'homologacao', pagamentoTipo: '', valorPagamento: '', frete: '0', seguro: '0', outras: '0', baseIcms: '0',
  valorIcms: '0', baseIcmsSt: '0', valorIcmsSt: '0', modalidadeFrete: '9',
  transportadora: '', transportadoraCnpj: '', placa: '', ufPlaca: '', rntrc: '',
  volumes: '0', especie: '', marca: '', pesoLiquido: '0', pesoBruto: '0',
  informacoes: '',
}

const numberValue = (value: string): number => parseFiscalNumber(value)
const onlyDigits = (value: string, max: number): string => value.replace(/\D/g, '').slice(0, max)
const money = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const field = (map: TextMap, key: string): string => map[key] ?? ''

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="synqra-nfe-block"><h2>{title}</h2>{children}</section>
}

export default function NFeEmissaoCompact() {
  const [companyId, setCompanyId] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const releaseId = searchParams.get('liberacao_id')
  const importedReleaseRef = useRef('')
  const [company, setCompany] = useState<TextMap>({})
  const [customer, setCustomer] = useState<TextMap>({})
  const [products, setProducts] = useState<Product[]>([])
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [form, setForm] = useState<TextMap>(initialForm)
  const [items, setItems] = useState<Item[]>([newItem()])
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeItemId, setActiveItemId] = useState('')
  const [releasePickerOpen, setReleasePickerOpen] = useState(false)
  const [loadingReleases, setLoadingReleases] = useState(false)
  const [availableReleases, setAvailableReleases] = useState<Array<{ id: string; pedido: string; cliente: string; status: string; data: string; observacao: string }>>([])
  const [releaseSearch, setReleaseSearch] = useState('')

  const updateForm = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }
  const updateCustomer = (key: string, value: string) => {
    setCustomer(current => ({ ...current, [key]: value }))
    setError('')
  }
  const updateItem = (id: string, key: keyof Item, value: string) => {
    setItems(current => current.map(item => item.id === id ? { ...item, [key]: value } : item))
  }
  const activeItem = items.find(item => item.id === activeItemId) ?? items[0]
  const addItem = () => { const item = newItem(); setItems(current => [...current, item]); setActiveItemId(item.id) }
  const removeItem = (id: string) => { setItems(current => { const next = current.length === 1 ? [newItem()] : current.filter(item => item.id !== id); setActiveItemId(next[0]?.id ?? ''); return next }) }
  const loadAvailableReleases = async () => {
    setLoadingReleases(true); setError('')
    try {
      if (!companyId) throw new Error('A empresa ativa ainda não foi carregada.')
      const { data: releases, error: releasesError } = await supabase.from('erp_liberacoes_nf').select('id,pedido_venda_id,status,observacao,created_at').eq('empresa_id', companyId).eq('status', 'ENCAMINHADA').order('created_at', { ascending: false }).limit(100)
      if (releasesError) throw releasesError
      const rows = releases ?? []
      if (!rows.length) { setAvailableReleases([]); setReleasePickerOpen(true); return }
      const orderIds = [...new Set(rows.map(row => String(row.pedido_venda_id)).filter(Boolean))]
      const { data: orders, error: ordersError } = await supabase.from('erp_pedidos_venda').select('id,numero,cliente_id').eq('empresa_id', companyId).in('id', orderIds)
      if (ordersError) throw ordersError
      const orderById = new Map((orders ?? []).map(order => [String(order.id), order]))
      const customerIds = [...new Set((orders ?? []).map(order => String(order.cliente_id ?? '')).filter(Boolean))]
      const customerResult = customerIds.length ? await supabase.from('erp_clientes').select('id,nome').eq('empresa_id', companyId).in('id', customerIds) : { data: [], error: null }
      if (customerResult.error) throw customerResult.error
      const customerById = new Map((customerResult.data ?? []).map(row => [String(row.id), String(row.nome ?? 'Cliente não identificado')]))
      setAvailableReleases(rows.filter(row => orderById.has(String(row.pedido_venda_id))).map(row => { const order = orderById.get(String(row.pedido_venda_id)); return { id: String(row.id), pedido: String(order?.numero ?? 'Pedido sem número'), cliente: customerById.get(String(order?.cliente_id ?? '')) ?? 'Cliente não identificado', status: String(row.status ?? ''), data: String(row.created_at ?? ''), observacao: String(row.observacao ?? '') } }))
      setReleasePickerOpen(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível buscar as liberações do Almoxarifado.') } finally { setLoadingReleases(false) }
  }
  const chooseRelease = (id: string) => { importedReleaseRef.current = ''; setDocumentId(null); setItems([newItem()]); setActiveItemId(''); setCustomer({}); setMessage(''); setReleasePickerOpen(false); const next = new URLSearchParams(searchParams); next.set('liberacao_id', id); setSearchParams(next) }

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa da sessão não localizada.')
      const id = String(empresa.data)
      const [companyResult, productResult, transporterResult, fiscalResult] = await Promise.all([
        supabase.from('erp_empresas').select('razao_social,nome_fantasia,cnpj,endereco,cidade,uf,cep,telefone,email,inscricao_estadual').eq('id', id).single(),
        supabase.from('erp_produtos').select('id,codigo,nome,unidade,ncm,cfop_saida,cst_icms,csosn,origem_fiscal,preco_venda,aliquota_icms,aliquota_ipi,aliquota_pis,aliquota_cofins').eq('empresa_id', id).eq('ativo', true).order('nome').limit(1000),
        supabase.from('erp_transportadoras').select('id,codigo,razao_social,cnpj,ie,telefone,cidade,uf').eq('empresa_id', id).eq('ativo', true).order('razao_social').limit(500),
        supabase.from('erp_config_fiscal').select('serie_nfe,proximo_numero_nfe,ambiente').eq('empresa_id', id).maybeSingle(),
      ])
      if (companyResult.error) throw companyResult.error
      if (productResult.error) throw productResult.error
      if (transporterResult.error) throw transporterResult.error
      if (fiscalResult.error) throw fiscalResult.error
      setCompanyId(id)
      setCompany((companyResult.data ?? {}) as TextMap)
      setProducts((productResult.data ?? []) as Product[])
      setTransporters((transporterResult.data ?? []) as Transporter[])
      if (fiscalResult.data) {
        const cfg = fiscalResult.data as TextMap
        setForm(current => ({
          ...current,
          serie: String(cfg.serie_nfe ?? ''),
          numero: String(cfg.proximo_numero_nfe ?? ''),
          ambiente: String(cfg.ambiente ?? 'homologacao'),
        }))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o emissor fiscal.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!companyId || !releaseId || products.length === 0 || importedReleaseRef.current === releaseId) return
    void (async () => {
      setBusy(true)
      setError('')
      try {
        const { data: release, error: releaseError } = await supabase
          .from('erp_liberacoes_nf')
          .select('id,pedido_venda_id,status,observacao,documento_fiscal_id')
          .eq('empresa_id', companyId).eq('id', releaseId).maybeSingle()
        if (releaseError) throw releaseError
        if (!release) throw new Error('Liberação não encontrada para a empresa ativa.')
        if (!['ENCAMINHADA', 'VINCULADA_NFE'].includes(String(release.status))) {
          throw new Error('A liberação ainda não foi encaminhada pelo Almoxarifado.')
        }
        const { data: order, error: orderError } = await supabase
          .from('erp_pedidos_venda').select('id,numero,cliente_id')
          .eq('empresa_id', companyId).eq('id', release.pedido_venda_id).maybeSingle()
        if (orderError) throw orderError
        if (!order) throw new Error('Pedido de venda vinculado à liberação não foi encontrado.')
        if (!order.cliente_id) throw new Error('O pedido não possui cliente vinculado.')
        const [{ data: customerRow, error: customerError }, { data: releaseItems, error: releaseItemsError }] = await Promise.all([
          supabase.from('erp_clientes').select('id,documento,nome,inscricao_estadual,endereco,numero,bairro,cep,cidade,estado,email,codigo_municipio_ibge').eq('empresa_id', companyId).eq('id', order.cliente_id).maybeSingle(),
          supabase.from('erp_liberacoes_nf_itens').select('pedido_item_id,produto_id,lote_id,quantidade,caixas,peso_liquido,peso_bruto').eq('empresa_id', companyId).eq('liberacao_id', releaseId).order('created_at'),
        ])
        if (customerError) throw customerError
        if (releaseItemsError) throw releaseItemsError
        if (!customerRow) throw new Error('Cliente do pedido não encontrado na empresa ativa.')
        if (!releaseItems?.length) throw new Error('A liberação não contém itens persistidos.')
        const orderItemIds = [...new Set(releaseItems.map(row => String(row.pedido_item_id)))]
        const { data: orderItemRows, error: orderItemsError } = await supabase
          .from('erp_pedidos_venda_itens')
          .select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total')
          .eq('empresa_id', companyId).eq('pedido_id', order.id).in('id', orderItemIds)
        if (orderItemsError) throw orderItemsError
        const orderItemById = new Map((orderItemRows ?? []).map(row => [String(row.id), row]))
        const productById = new Map(products.map(product => [String(product.id), product]))
        const { data: lotRows, error: lotError } = await supabase
          .from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor')
          .eq('empresa_id', companyId).in('id', [...new Set(releaseItems.map(row => String(row.lote_id)))])
        if (lotError) throw lotError
        const lotById = new Map((lotRows ?? []).map(row => [String(row.id), row]))
        const releaseLinesByOrderItem = new Map<string, typeof releaseItems>()
        for (const line of releaseItems) {
          const key = String(line.pedido_item_id)
          releaseLinesByOrderItem.set(key, [...(releaseLinesByOrderItem.get(key) ?? []), line])
        }
        const discountByReleaseLine = new Map<(typeof releaseItems)[number], number>()
        for (const [orderItemId, lines] of releaseLinesByOrderItem) {
          const orderItem = orderItemById.get(orderItemId)
          if (!orderItem) throw new Error('Item do pedido não localizado para calcular o desconto fiscal.')
          const orderedQuantity = parseFiscalNumber(orderItem.quantidade)
          const lineDiscount = parseFiscalNumber(orderItem.desconto)
          const allocations = allocateReleaseDiscounts(
            lineDiscount,
            orderedQuantity,
            lines.map(line => parseFiscalNumber(line.quantidade)),
          )
          lines.forEach((line, index) => discountByReleaseLine.set(line, allocations[index] ?? 0))
        }
        const importedItems: Item[] = releaseItems.map(line => {
          const orderItem = orderItemById.get(String(line.pedido_item_id))
          const product = productById.get(String(line.produto_id))
          if (!orderItem || !product || String(orderItem.produto_id) !== String(line.produto_id)) {
            throw new Error('Um item da liberação não corresponde ao pedido/produto ativo.')
          }
          const lot = lotById.get(String(line.lote_id))
          return {
            id: crypto.randomUUID(), produto_id: String(line.produto_id),
            codigo: String(product.codigo ?? ''), descricao: String(orderItem.descricao ?? product.nome ?? ''),
            lote: String(lot?.lote_interno ?? '') + (lot?.lote_fornecedor ? ' / Fornecedor: ' + String(lot.lote_fornecedor) : ''),
            ncm: onlyDigits(String(product.ncm ?? ''), 8),
            cst: String(product.cst_icms ?? product.csosn ?? ''),
            cfop: onlyDigits(String(product.cfop_saida ?? ''), 4),
            unidade: String(product.unidade ?? ''),
            quantidade: String(line.quantidade ?? ''),
            valorUnitario: String(orderItem.valor_unitario ?? product.preco_venda ?? 0),
            desconto: String(discountByReleaseLine.get(line) ?? 0), icms: String(product.aliquota_icms ?? 0), ipi: String(product.aliquota_ipi ?? 0),
            pis: String(product.aliquota_pis ?? 0), cofins: String(product.aliquota_cofins ?? 0),
            origem: onlyDigits(String(product.origem_fiscal ?? '0'), 1),
          }
        })
        const boxTotal = releaseItems.reduce((sum, row) => sum + Number(row.caixas ?? 0), 0)
        const netWeight = releaseItems.reduce((sum, row) => sum + Number(row.peso_liquido ?? 0), 0)
        const grossWeight = releaseItems.reduce((sum, row) => sum + Number(row.peso_bruto ?? 0), 0)
        const trace = releaseItems.map(row => {
          const lot = lotById.get(String(row.lote_id))
          return 'Lote ' + String(lot?.lote_interno ?? '') + (lot?.lote_fornecedor ? ' (fornecedor ' + String(lot.lote_fornecedor) + ')' : '') + ': ' + String(row.quantidade)
        }).join('; ')
        setCustomer({
          documento: String(customerRow.documento ?? ''), nome: String(customerRow.nome ?? ''),
          ie: String(customerRow.inscricao_estadual ?? ''), endereco: [customerRow.endereco, customerRow.numero].filter(Boolean).join(', '),
          bairro: String(customerRow.bairro ?? ''), cep: String(customerRow.cep ?? ''),
          cidade: String(customerRow.cidade ?? ''), uf: String(customerRow.estado ?? ''), codigoMunicipio: String(customerRow.codigo_municipio_ibge ?? ''), email: String(customerRow.email ?? ''),
        })
        setItems(importedItems)
        setForm(current => ({
          ...current, volumes: String(boxTotal), pesoLiquido: String(netWeight), pesoBruto: String(grossWeight),
          informacoes: ['Origem: liberação de Almoxarifado ' + releaseId, 'Pedido de venda #' + String(order.numero), trace, release.observacao].filter(Boolean).join(' | '),
        }))
        if (release.documento_fiscal_id) setDocumentId(String(release.documento_fiscal_id))
        importedReleaseRef.current = releaseId
        setMessage('Itens, quantidades, cliente, caixas, pesos e rastreabilidade carregados da liberação. Revise natureza, CFOP e tributação antes de salvar a NF-e.')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Falha ao importar a liberação para a NF-e.')
      } finally {
        setBusy(false)
      }
    })()
  }, [companyId, releaseId, products])

  const totals = useMemo(() => {
    const result = items.reduce((acc, item) => {
      const gross = numberValue(item.quantidade) * numberValue(item.valorUnitario)
      const net = Math.max(0, gross - numberValue(item.desconto))
      return {
        produtos: acc.produtos + net,
        desconto: acc.desconto + numberValue(item.desconto),
        icms: acc.icms + net * numberValue(item.icms) / 100,
        ipi: acc.ipi + net * numberValue(item.ipi) / 100,
        pis: acc.pis + net * numberValue(item.pis) / 100,
        cofins: acc.cofins + net * numberValue(item.cofins) / 100,
      }
    }, { produtos: 0, desconto: 0, icms: 0, ipi: 0, pis: 0, cofins: 0 })
    return {
      ...result,
      frete: numberValue(field(form, 'frete')),
      seguro: numberValue(field(form, 'seguro')),
      outras: numberValue(field(form, 'outras')),
    }
  }, [items, form])

  const totalNota = totals.produtos + totals.frete + totals.seguro + totals.outras + totals.ipi + numberValue(field(form, 'valorIcmsSt'))

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find(candidate => String(candidate.id) === productId)
    if (!product) { setItems(current => current.map(item => item.id === itemId ? { ...item, produto_id: '' } : item)); return }
    setItems(current => current.map(item => item.id !== itemId ? item : ({
      ...item,
      produto_id: productId,
      codigo: String(product.codigo ?? ''),
      descricao: String(product.nome ?? ''),
      ncm: onlyDigits(String(product.ncm ?? ''), 8),
      cfop: onlyDigits(String(product.cfop_saida ?? field(form, 'cfop')), 4),
      unidade: String(product.unidade ?? ''),
      valorUnitario: String(product.preco_venda ?? 0),
      cst: String(product.cst_icms ?? product.csosn ?? ''),
      origem: onlyDigits(String(product.origem_fiscal ?? '0'), 1),
      icms: String(product.aliquota_icms ?? 0),
      ipi: String(product.aliquota_ipi ?? 0),
      pis: String(product.aliquota_pis ?? 0),
      cofins: String(product.aliquota_cofins ?? 0),
    })))
  }

  const validate = (): string | null => {
    if (!field(form, 'natureza').trim()) return 'Natureza da operação é obrigatória.'
    if (!onlyDigits(field(form, 'serie'), 3)) return 'Série é obrigatória.'
    if (!field(customer, 'documento').trim()) return 'CNPJ/CPF do destinatário é obrigatório.'
    if (!field(customer, 'nome').trim()) return 'Nome/Razão Social do destinatário é obrigatório.'
    if (onlyDigits(field(customer, 'codigoMunicipio'), 7).length !== 7) return 'Código IBGE do município do destinatário deve possuir 7 dígitos.'
    if (!field(form, 'pagamentoTipo')) return 'Informe o meio de pagamento da NF-e.'
    if (!Number.isFinite(numberValue(field(form, 'valorPagamento'))) || numberValue(field(form, 'valorPagamento')) < 0) return 'Informe um valor de pagamento válido.'
    if (field(form, 'pagamentoTipo') !== '90' && Math.abs(numberValue(field(form, 'valorPagamento')) - totalNota) > 0.01) return 'O valor de pagamento deve corresponder ao total da NF-e. Para sem pagamento, selecione a opção 90 e informe 0.'
    if (field(form, 'pagamentoTipo') === '90' && numberValue(field(form, 'valorPagamento')) !== 0) return 'Para a opção 90 • Sem pagamento, o valor deve ser 0.'
    if (onlyDigits(field(form, 'cfop'), 4).length !== 4) return 'CFOP principal deve possuir 4 dígitos.'
    if (items.some(item => !item.codigo.trim() || onlyDigits(item.ncm, 8).length !== 8 || onlyDigits(item.cfop, 4).length !== 4 || !item.unidade.trim() || numberValue(item.quantidade) <= 0)) {
      return 'Complete código, NCM, CFOP, unidade e quantidade dos itens.'
    }
    return null
  }

  const saveDraft = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const validation = validate()
      if (validation) throw new Error(validation)
      const payload = {
        empresa_id: companyId, tipo: field(form, 'operacao') === '1' ? 'NF-e' : 'NF-e Entrada', modelo: '55',
        serie: onlyDigits(field(form, 'serie'), 3), numero: field(form, 'numero') ? Number(field(form, 'numero')) : null,
        status: 'Rascunho', natureza_operacao: field(form, 'natureza'), cfop: onlyDigits(field(form, 'cfop'), 4),
        ambiente: field(form, 'ambiente') || 'homologacao', data_emissao: new Date(field(form, 'emissao')).toISOString(),
        data_saida: field(form, 'saida') ? new Date(field(form, 'saida')).toISOString() : null,
        destinatario_nome: field(customer, 'nome'), destinatario_documento: field(customer, 'documento'),
        destinatario_ie: field(customer, 'ie') || null, destinatario_email: field(customer, 'email') || null,
        destinatario_endereco: field(customer, 'endereco') || null, destinatario_bairro: field(customer, 'bairro') || null,
        destinatario_cep: field(customer, 'cep') || null, destinatario_cidade: field(customer, 'cidade') || null,
        destinatario_uf: field(customer, 'uf') || null, destinatario_codigo_municipio: onlyDigits(field(customer, 'codigoMunicipio'), 7) || null,
        pagamento_tipo: field(form, 'pagamentoTipo') || null, valor_pagamento: numberValue(field(form, 'valorPagamento')),
        modalidade_frete: field(form, 'modalidadeFrete'),
        transportadora: field(form, 'transportadora') || null, placa: field(form, 'placa') || null,
        uf_transportadora: field(form, 'ufPlaca') || null, peso_liquido: numberValue(field(form, 'pesoLiquido')),
        peso_bruto: numberValue(field(form, 'pesoBruto')), volumes: numberValue(field(form, 'volumes')),
        valor_produtos: totals.produtos, valor_frete: totals.frete, valor_seguro: totals.seguro, valor_outras_despesas: totals.outras,
        valor_desconto: 0, base_calculo_icms: numberValue(field(form, 'baseIcms')),
        valor_icms: numberValue(field(form, 'valorIcms')), base_icms_st: numberValue(field(form, 'baseIcmsSt')),
        valor_icms_st: numberValue(field(form, 'valorIcmsSt')), valor_ipi: totals.ipi, valor_pis: totals.pis,
        valor_cofins: totals.cofins, valor_total: totalNota, valor_liquido: totalNota,
      }
      const rows = items.map((item, index) => ({
        produto_id: item.produto_id || null, item_numero: index + 1, codigo_produto: item.codigo,
        descricao_produto: item.descricao, lote: item.lote || null, ncm: onlyDigits(item.ncm, 8), cfop: onlyDigits(item.cfop, 4),
        unidade: item.unidade, quantidade: numberValue(item.quantidade), valor_unitario: numberValue(item.valorUnitario),
        valor_total: Math.max(0, numberValue(item.quantidade) * numberValue(item.valorUnitario) - numberValue(item.desconto)),
        valor_desconto: numberValue(item.desconto), origem: onlyDigits(item.origem, 1), cst_csosn: item.cst || null,
        icms_aliquota: numberValue(item.icms), ipi_aliquota: numberValue(item.ipi),
        pis_aliquota: numberValue(item.pis), cofins_aliquota: numberValue(item.cofins),
      }))
      const result = await supabase.rpc('erp_salvar_rascunho_nfe', { p_documento_id: documentId, p_documento: payload, p_itens: rows })
      if (result.error || !result.data) throw new Error(result.error?.message || 'Não foi possível salvar o rascunho.')
      setDocumentId(String(result.data))
      if (releaseId) {
        const linkResult = await supabase.rpc('erp_vincular_liberacao_nfe', {
          p_liberacao_id: releaseId, p_documento_fiscal_id: String(result.data),
        })
        if (linkResult.error) throw new Error('Rascunho salvo, mas a liberação não foi vinculada: ' + linkResult.error.message)
      }
      setMessage('NF-e gravada como rascunho' + (releaseId ? ' e vinculada à liberação do Almoxarifado' : '') + '. A transmissão à SEFAZ não foi executada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar NF-e.')
    } finally {
      setBusy(false)
    }
  }


  const emitDocument = async () => {
    if (!documentId) {
      setError('Salve e valide a NF-e antes de solicitar a transmissão.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('emitir-nfe', {
        body: { documento_id: documentId },
      })
      if (invokeError) throw new Error(invokeError.message || 'Falha ao comunicar com o integrador fiscal.')
      const result = data as { ok?: boolean; status?: string; error?: string; chave_acesso?: string; protocolo_autorizacao?: string } | null
      if (!result) throw new Error('O integrador não retornou um resultado verificável.')
      if (result.status === 'Autorizada' && result.chave_acesso && result.protocolo_autorizacao) {
        setMessage('NF-e autorizada com protocolo confirmado. Chave: ' + result.chave_acesso + '. Atualize a tela para consultar os dados persistidos e baixar o DANFE.')
      } else if (result.status === 'Processando') {
        setMessage(result.error || 'Solicitação recebida e ainda em processamento. Não reenvie a mesma nota; atualize a situação antes de qualquer nova tentativa.')
      } else {
        throw new Error(result.error || 'A emissão não foi confirmada pelo integrador fiscal.')
      }
      const { data: saved, error: savedError } = await supabase
        .from('erp_documentos_fiscais')
        .select('status,chave_acesso,mensagem_retorno')
        .eq('id', documentId)
        .eq('empresa_id', companyId)
        .maybeSingle()
      if (savedError) throw savedError
      if (saved?.status === 'Autorizada' && saved.chave_acesso) {
        setMessage('NF-e autorizada. Chave: ' + String(saved.chave_acesso) + '. ' + String(saved.mensagem_retorno ?? 'Protocolo validado pelo integrador fiscal.'))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao solicitar emissão da NF-e.')
    } finally {
      setBusy(false)
    }
  }

  const downloadDanfe = async () => {
    if (!documentId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data: document, error: documentError } = await supabase
        .from('erp_documentos_fiscais')
        .select('status,pdf_storage_path,chave_acesso')
        .eq('id', documentId)
        .eq('empresa_id', companyId)
        .maybeSingle()
      if (documentError) throw documentError
      if (!document || document.status !== 'Autorizada' || !document.chave_acesso) {
        throw new Error('O DANFE só pode ser disponibilizado após a autorização fiscal confirmada.')
      }
      if (!document.pdf_storage_path) {
        throw new Error('A NF-e está autorizada, mas o provedor não disponibilizou o PDF do DANFE. Consulte o documento fiscal e reconcilie o arquivo com o integrador.')
      }
      const { data: signed, error: signedError } = await supabase.storage
        .from('documentos-erp')
        .createSignedUrl(String(document.pdf_storage_path), 60)
      if (signedError) throw signedError
      if (!signed?.signedUrl) throw new Error('Não foi possível gerar um link temporário autorizado para o DANFE.')
      window.location.assign(signed.signedUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao abrir o DANFE autorizado.')
    } finally {
      setBusy(false)
    }
  }

  const newDocument = () => {
    setDocumentId(null)
    setActiveItemId('')
    const next = new URLSearchParams(searchParams)
    next.delete('liberacao_id')
    setSearchParams(next)
    importedReleaseRef.current = ''
    setItems([newItem()])
    setCustomer({})
    setMessage('')
    setError('')
  }

  const setTransporter = (id: string) => {
    const transporter = transporters.find(candidate => String(candidate.id) === id)
    updateForm('transportadora', transporter ? String(transporter.razao_social ?? '') : '')
    updateForm('transportadoraCnpj', transporter ? String(transporter.cnpj ?? '') : '')
    updateForm('ufPlaca', transporter ? String(transporter.uf ?? '') : field(form, 'ufPlaca'))
  }

  return <main className="synqra-workspace synqra-nfe"><ERPHeader />    <section className="synqra-workspace-body">
      <div className="synqra-workspace-title">
        <div><h1>Emissor NF-e • Workspace Fiscal</h1><p>Modelo 55 • emissão compacta • dados reais do tenant</p></div>
        <CompactButton type="button" onClick={() => void load()} disabled={busy}><RefreshCw size={13} /> ATUALIZAR</CompactButton>
      </div>
      {(error || message) ? <div className={`synqra-nfe-alert ${error ? 'error' : 'ok'}`}>{error || message}</div> : null}
      {releasePickerOpen ? <section className="synqra-release-picker" aria-label="Liberações do Almoxarifado">
        <div className="synqra-release-picker-head"><div><strong>Pedidos liberados pelo Almoxarifado</strong><small>Somente liberações encaminhadas à emissão fiscal para a empresa ativa.</small></div><CompactButton type="button" onClick={() => setReleasePickerOpen(false)}><X size={13}/> FECHAR</CompactButton></div>
        <input className="synqra-release-search" value={releaseSearch} onChange={e => setReleaseSearch(e.currentTarget.value)} placeholder="Buscar por pedido, cliente ou observação"/>
        <div className="synqra-release-list">{availableReleases.filter(row => (row.pedido + " " + row.cliente + " " + row.observacao).toLowerCase().includes(releaseSearch.toLowerCase())).map(row => <div className="synqra-release-row" key={row.id}><div><strong>{row.pedido} · {row.cliente}</strong><span>{row.data ? new Date(row.data).toLocaleString("pt-BR") : "Data não informada"} · {row.status}</span><small>{row.observacao || "Sem observação adicional"}</small></div><CompactButton type="button" tone="primary" onClick={() => chooseRelease(row.id)}>ANEXAR ITENS</CompactButton></div>)}{!availableReleases.length ? <p>Nenhuma liberação pendente encontrada. Confira se o Almoxarifado encaminhou o pedido para emissão fiscal.</p> : null}</div>
      </section> : null}

      <div className="synqra-nfe-actions">
        <CompactButton type="button" onClick={() => void loadAvailableReleases()} disabled={busy || !companyId}><RefreshCw size={13} /> {loadingReleases ? "BUSCANDO…" : "BUSCAR LIBERAÇÕES DO ALMOXARIFADO"}</CompactButton>
        <CompactButton type="button" onClick={newDocument}><Plus size={13} /> NOVA</CompactButton>
        <CompactButton type="button" tone="primary" onClick={() => void saveDraft()} disabled={busy}><Save size={13} /> SALVAR / VALIDAR</CompactButton>
        <CompactButton type="button" tone="orange" onClick={() => void emitDocument()} disabled={!documentId || busy}><Send size={13} /> EMITIR</CompactButton>
        <CompactButton type="button" onClick={() => void downloadDanfe()} disabled={!documentId || busy}><FileDown size={13} /> DANFE PDF</CompactButton>
        <CompactButton type="button" tone="danger" disabled title="Cancelamento fiscal ainda não está implementado nesta interface."><X size={13} /> CANCELAMENTO INDISPONÍVEL</CompactButton>
      </div>

      <Section title="01 • IDE — IDENTIFICAÇÃO DO DOCUMENTO FISCAL">
        <div className="synqra-nfe-grid">
          <CompactInput label="Natureza da Operação" value={field(form, 'natureza')} onChange={v => updateForm('natureza', v)} required />
          <CompactInput label="Modelo" value="55" onChange={() => undefined} readOnly />
          <CompactInput label="Série" value={field(form, 'serie')} onChange={v => updateForm('serie', onlyDigits(v, 3))} required />
          <CompactInput label="Número" value={field(form, 'numero')} onChange={v => updateForm('numero', v)} readOnly />
          <CompactSelect label="Tipo de Emissão" value={field(form, 'tipoEmissao')} onChange={v => updateForm('tipoEmissao', v)} options={[{value:'1',label:'1 • Normal'},{value:'2',label:'2 • Contingência'}]} />
          <CompactSelect label="Finalidade" value={field(form, 'finalidade')} onChange={v => updateForm('finalidade', v)} options={[{value:'1',label:'1 • Normal'},{value:'2',label:'2 • Complementar'},{value:'4',label:'4 • Devolução'}]} />
          <CompactSelect label="Operação" value={field(form, 'operacao')} onChange={v => updateForm('operacao', v)} options={[{value:'1',label:'1 • Saída'},{value:'0',label:'0 • Entrada'}]} />
          <CompactInput label="Data/Hora Emissão" type="datetime-local" value={field(form, 'emissao')} onChange={v => updateForm('emissao', v)} />
          <CompactInput label="Data/Hora Saída/Entrada" type="datetime-local" value={field(form, 'saida')} onChange={v => updateForm('saida', v)} />
          <CompactInput label="CFOP Principal" value={field(form, 'cfop')} onChange={v => updateForm('cfop', onlyDigits(v, 4))} required />
          <CompactSelect label="Ambiente" value={field(form, 'ambiente')} onChange={v => updateForm('ambiente', v)} options={[{value:'homologacao',label:'Homologação'},{value:'producao',label:'Produção'}]} />
        </div>
      </Section>

      <Section title="02 • EMITENTE — DADOS OFICIAIS DO ESTABELECIMENTO">
        <div className="synqra-nfe-grid">
          <CompactInput label="CNPJ Emitente" value={String(company.cnpj ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Razão Social" value={String(company.razao_social ?? company.nome_fantasia ?? '')} onChange={() => undefined} readOnly wide />
          <CompactInput label="Inscrição Estadual" value={String(company.inscricao_estadual ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Endereço" value={String(company.endereco ?? '')} onChange={() => undefined} readOnly wide />
          <CompactInput label="Município" value={String(company.cidade ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="UF" value={String(company.uf ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="CEP" value={String(company.cep ?? '')} onChange={() => undefined} readOnly />
          <CompactInput label="Telefone" value={String(company.telefone ?? '')} onChange={() => undefined} readOnly />
        </div>
      </Section>

      <Section title="03 • DESTINATÁRIO / REMETENTE — IDENTIFICAÇÃO E ENDEREÇO">
        <div className="synqra-nfe-grid">
          <CompactInput label="CNPJ / CPF" value={field(customer, 'documento')} onChange={v => updateCustomer('documento', v)} required />
          <CompactInput label="IE" value={field(customer, 'ie')} onChange={v => updateCustomer('ie', v)} />
          <CompactInput label="Razão Social / Nome" value={field(customer, 'nome')} onChange={v => updateCustomer('nome', v)} required wide />
          <CompactInput label="Inscrição Municipal" value={field(customer, 'im')} onChange={v => updateCustomer('im', v)} />
          <CompactInput label="Endereço" value={field(customer, 'endereco')} onChange={v => updateCustomer('endereco', v)} wide />
          <CompactInput label="Bairro" value={field(customer, 'bairro')} onChange={v => updateCustomer('bairro', v)} />
          <CompactInput label="Município" value={field(customer, 'cidade')} onChange={v => updateCustomer('cidade', v)} />
          <CompactInput label="Código IBGE Município" value={field(customer, 'codigoMunicipio')} onChange={v => updateCustomer('codigoMunicipio', onlyDigits(v, 7))} required />
          <CompactInput label="UF" value={field(customer, 'uf')} onChange={v => updateCustomer('uf', v.toUpperCase().slice(0, 2))} />
          <CompactInput label="CEP" value={field(customer, 'cep')} onChange={v => updateCustomer('cep', v)} />
          <CompactInput label="Telefone" value={field(customer, 'telefone')} onChange={v => updateCustomer('telefone', v)} />
          <CompactInput label="E-mail" type="email" value={field(customer, 'email')} onChange={v => updateCustomer('email', v)} />
        </div>
      </Section>

      <Section title="04 • ITENS — PRODUTOS, SERVIÇOS E TRIBUTAÇÃO">
        <div className="synqra-nfe-block-head"><span><RequiredField>Cadastro do item fiscal</RequiredField><small className="synqra-nfe-helper">Edite o produto nesta área; os itens adicionados aparecem na lista abaixo.</small></span><CompactButton type="button" onClick={addItem}><Plus size={13} /> NOVO ITEM</CompactButton></div>
        {activeItem ? <div className="synqra-item-editor">
          <label className="synqra-item-product"><span>Produto cadastrado</span><select value={activeItem.produto_id} onChange={e => selectProduct(activeItem.id, e.currentTarget.value)}><option value="">MANUAL / INFORMAR DESCRIÇÃO</option>{products.map(product => <option key={String(product.id)} value={String(product.id)}>{String(product.codigo ?? '')} • {String(product.nome ?? '')}</option>)}</select></label>
          <label><span>Código</span><input value={activeItem.codigo} onChange={e => updateItem(activeItem.id, 'codigo', e.currentTarget.value)} placeholder="Código do produto"/></label>
          <label className="synqra-item-description"><span>Descrição completa</span><input value={activeItem.descricao} onChange={e => updateItem(activeItem.id, 'descricao', e.currentTarget.value)} placeholder="Descrição do produto ou serviço"/></label>
          <label className="synqra-item-lot"><span>Lote / rastreabilidade</span><input value={activeItem.lote} onChange={e => updateItem(activeItem.id, 'lote', e.currentTarget.value)} readOnly={Boolean(releaseId)} placeholder="Lote liberado pelo Almoxarifado"/></label>
          <label><span>NCM</span><input value={activeItem.ncm} maxLength={8} onChange={e => updateItem(activeItem.id, 'ncm', onlyDigits(e.currentTarget.value, 8))}/></label>
          <label><span>CST/CSOSN</span><input value={activeItem.cst} maxLength={4} onChange={e => updateItem(activeItem.id, 'cst', e.currentTarget.value.toUpperCase())}/></label>
          <label><span>CFOP</span><input value={activeItem.cfop} maxLength={4} onChange={e => updateItem(activeItem.id, 'cfop', onlyDigits(e.currentTarget.value, 4))}/></label>
          <label><span>Unidade</span><input value={activeItem.unidade} onChange={e => updateItem(activeItem.id, 'unidade', e.currentTarget.value.toUpperCase())}/></label>
          <label><span>Quantidade</span><input className="right" inputMode="decimal" value={activeItem.quantidade} onChange={e => updateItem(activeItem.id, 'quantidade', e.currentTarget.value)}/></label>
          <label><span>Valor unitário</span><input className="right" inputMode="decimal" value={activeItem.valorUnitario} onChange={e => updateItem(activeItem.id, 'valorUnitario', e.currentTarget.value)}/></label>
          <label><span>Desconto</span><input className="right" inputMode="decimal" value={activeItem.desconto} onChange={e => updateItem(activeItem.id, 'desconto', e.currentTarget.value)}/></label>
          <label><span>ICMS %</span><input className="right" inputMode="decimal" value={activeItem.icms} onChange={e => updateItem(activeItem.id, 'icms', e.currentTarget.value)}/></label>
          <label><span>IPI %</span><input className="right" inputMode="decimal" value={activeItem.ipi} onChange={e => updateItem(activeItem.id, 'ipi', e.currentTarget.value)}/></label>
          <label><span>PIS %</span><input className="right" inputMode="decimal" value={activeItem.pis} onChange={e => updateItem(activeItem.id, 'pis', e.currentTarget.value)}/></label>
          <label><span>COFINS %</span><input className="right" inputMode="decimal" value={activeItem.cofins} onChange={e => updateItem(activeItem.id, 'cofins', e.currentTarget.value)}/></label>
        </div> : null}
        <div className="synqra-nfe-list-head"><strong>Itens adicionados à NF-e</strong><span>{items.length} item(ns)</span></div>
        <div className="synqra-nfe-table-wrap"><table className="synqra-nfe-items-list"><colgroup><col style={{width:48}}/><col style={{width:150}}/><col style={{width:110}}/><col style={{width:360}}/><col style={{width:210}}/><col style={{width:85}}/><col style={{width:115}}/><col style={{width:100}}/><col style={{width:115}}/><col style={{width:42}}/></colgroup>
          <thead><tr><th>ITEM</th><th>PRODUTO</th><th>CÓDIGO</th><th>DESCRIÇÃO</th><th>LOTE / RASTREABILIDADE</th><th>QTD</th><th>VLR UNIT.</th><th>DESC.</th><th>TOTAL</th><th></th></tr></thead>
          <tbody>{items.map((item, index) => { const total = Math.max(0, numberValue(item.quantidade) * numberValue(item.valorUnitario) - numberValue(item.desconto)); return <tr key={item.id} className={item.id === activeItem?.id ? 'is-selected' : ''} onClick={() => setActiveItemId(item.id)}><td>{index + 1}</td><td>{products.find(product => String(product.id) === item.produto_id)?.nome ?? (item.produto_id ? item.descricao : 'MANUAL')}</td><td>{item.codigo || '—'}</td><td className="synqra-item-list-description" title={item.descricao}>{item.descricao || 'Descrição pendente'}</td><td title={item.lote}>{item.lote || '—'}</td><td className="right">{item.quantidade}</td><td className="right">{money(numberValue(item.valorUnitario))}</td><td className="right">{money(numberValue(item.desconto))}</td><td className="right">{money(total)}</td><td><button className="danger-icon" type="button" onClick={e => {e.stopPropagation(); removeItem(item.id)}} aria-label="Remover item">×</button></td></tr> })}</tbody>
        </table></div><p className="synqra-nfe-helper">Selecione uma linha para editar os campos acima. A tributação é salva individualmente em cada item.</p>
      </Section>
      <Section title="05 • TOTAIS DE IMPOSTOS E VALORES DA NF-e">
        <div className="synqra-nfe-grid">
          <CompactInput label="BC ICMS" value={field(form, 'baseIcms')} onChange={v => updateForm('baseIcms', v)} />
          <CompactInput label="Valor ICMS" value={field(form, 'valorIcms')} onChange={v => updateForm('valorIcms', v)} />
          <CompactInput label="BC ICMS ST" value={field(form, 'baseIcmsSt')} onChange={v => updateForm('baseIcmsSt', v)} />
          <CompactInput label="Valor ICMS ST" value={field(form, 'valorIcmsSt')} onChange={v => updateForm('valorIcmsSt', v)} />
          <CompactSelect label="Meio de Pagamento" value={field(form, 'pagamentoTipo')} onChange={v => updateForm('pagamentoTipo', v)} options={[{value:'01',label:'01 • Dinheiro'},{value:'03',label:'03 • Cartão de crédito'},{value:'04',label:'04 • Cartão de débito'},{value:'15',label:'15 • Boleto bancário'},{value:'16',label:'16 • Depósito bancário'},{value:'17',label:'17 • PIX'},{value:'18',label:'18 • Transferência bancária'},{value:'90',label:'90 • Sem pagamento'},{value:'99',label:'99 • Outros'}]} />
          <CompactInput label="Valor do Pagamento" value={field(form, 'valorPagamento')} onChange={v => updateForm('valorPagamento', v)} required />
          <CompactInput label="Produtos" value={money(totals.produtos)} onChange={() => undefined} readOnly />
          <CompactInput label="Frete" value={field(form, 'frete')} onChange={v => updateForm('frete', v)} />
          <CompactInput label="Seguro" value={field(form, 'seguro')} onChange={v => updateForm('seguro', v)} />
          <CompactInput label="Desconto" value={money(totals.desconto)} onChange={() => undefined} readOnly />
          <CompactInput label="Outras Despesas" value={field(form, 'outras')} onChange={v => updateForm('outras', v)} />
          <CompactInput label="IPI" value={money(totals.ipi)} onChange={() => undefined} readOnly />
          <CompactInput label="PIS" value={money(totals.pis)} onChange={() => undefined} readOnly />
          <CompactInput label="COFINS" value={money(totals.cofins)} onChange={() => undefined} readOnly />
          <CompactInput label="VALOR TOTAL DA NF-e" value={money(totalNota)} onChange={() => undefined} readOnly wide />
        </div>
      </Section>

      <Section title="06 • VOLUMES">
        <div className="synqra-nfe-grid">
          <CompactInput label="Quantidade de Volumes" value={field(form, 'volumes')} onChange={v => updateForm('volumes', v)} />
          <CompactInput label="Espécie" value={field(form, 'especie')} onChange={v => updateForm('especie', v)} />
          <CompactInput label="Marca" value={field(form, 'marca')} onChange={v => updateForm('marca', v)} />
          <CompactInput label="Peso Líquido KG" value={field(form, 'pesoLiquido')} onChange={v => updateForm('pesoLiquido', v)} />
          <CompactInput label="Peso Bruto KG" value={field(form, 'pesoBruto')} onChange={v => updateForm('pesoBruto', v)} />
        </div>
      </Section>

      <Section title="07 • TRANSPORTADORA">
        <div className="synqra-nfe-grid">
          <CompactSelect label="Modalidade do Frete" value={field(form, 'modalidadeFrete')} onChange={v => updateForm('modalidadeFrete', v)} options={[{value:'0',label:'0 • CIF'},{value:'1',label:'1 • FOB'},{value:'9',label:'9 • Sem frete'}]} />
          <label className="grid min-w-0 gap-[2px] col-span-2"><span className="text-[9px] font-medium uppercase leading-[10px] text-slate-600">Transportadora</span><select value={field(form, 'transportadora')} onChange={e => setTransporter(e.currentTarget.value)}><option value="">Selecionar transportadora</option>{transporters.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.razao_social ?? '')}</option>)}</select></label>
          <CompactInput label="CNPJ/CPF Transportadora" value={field(form, 'transportadoraCnpj')} onChange={v => updateForm('transportadoraCnpj', v)} />
          <CompactInput label="Placa" value={field(form, 'placa')} onChange={v => updateForm('placa', v.toUpperCase().slice(0, 8))} />
          <CompactInput label="UF Placa" value={field(form, 'ufPlaca')} onChange={v => updateForm('ufPlaca', v.toUpperCase().slice(0, 2))} />
          <CompactInput label="RNTRC" value={field(form, 'rntrc')} onChange={v => updateForm('rntrc', v)} />
        </div>
      </Section>

      <Section title="08 • INFORMAÇÕES ADICIONAIS">
        <textarea className="synqra-nfe-textarea" value={field(form, 'informacoes')} onChange={e => updateForm('informacoes', e.currentTarget.value)} placeholder="Informações complementares de interesse do contribuinte" />
      </Section>
    </section>

    <style>{`
      .synqra-nfe{background:#f4f7fe}.synqra-nfe-block{margin-bottom:7px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;padding:7px}.synqra-nfe-block h2{margin:0 0 6px;border-bottom:1px solid #dbe5e9;padding-bottom:4px;color:#123b50;font-size:10px;font-weight:600;letter-spacing:.05em}.synqra-nfe-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px}.synqra-nfe-grid>*{grid-column:span 2}.synqra-nfe-grid>.col-span-2{grid-column:span 4}.synqra-nfe-actions{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px}.synqra-nfe-alert{margin-bottom:7px;border:1px solid;border-radius:2px;padding:6px 8px;font-size:10px}.synqra-nfe-alert.error{border-color:#ef4444;background:#fff1f2;color:#991b1b}.synqra-nfe-alert.ok{border-color:#34d399;background:#ecfdf5;color:#065f46}.synqra-nfe-block-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}.synqra-nfe-table-wrap{overflow:auto}.synqra-nfe table{min-width:1850px;table-layout:fixed}.synqra-nfe th{height:28px;padding:2px 4px;font-size:8px;white-space:nowrap}.synqra-nfe td{height:30px;padding:2px 4px;font-size:10px}.synqra-nfe td input,.synqra-nfe td select{width:100%;height:28px;min-height:28px;border:1px solid #cbd5e1;border-radius:2px;padding:0 5px;font-size:10px;outline:none}.synqra-nfe td input:focus,.synqra-nfe td select:focus{border-color:#2d8db8}.synqra-nfe td.right{text-align:right}.synqra-nfe .danger-icon{height:26px;width:26px;border:1px solid #fecaca;border-radius:2px;background:#fff1f2;color:#b91c1c}.synqra-nfe-textarea{width:100%;min-height:80px;resize:vertical;border:1px solid #cbd5e1;border-radius:2px;padding:6px;font-size:11px;outline:none}.synqra-nfe-textarea:focus{border-color:#2d8db8}@media(max-width:1100px){.synqra-nfe-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.synqra-nfe-grid>*{grid-column:span 2}.synqra-nfe-grid>.col-span-2{grid-column:span 3}}@media(max-width:700px){.synqra-nfe-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.synqra-nfe-grid>*,.synqra-nfe-grid>.col-span-2{grid-column:span 2}}
    `}</style>
  </main>
}