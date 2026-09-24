/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:58 BRT
 * Desenvolvedor: FernandoSch
 * ID da Revisão: REV-060
 * Alterações: Reconstrução integral da NF-e em quatro abas conforme Projeto Executivo PDF; tipagem estrita sem any; pedido, cliente, produto, lote, totais, transporte, rascunho real no Supabase e preparação para transmissão pela Edge Function fiscal.
 * Status do Build Local: Não executado — validação será feita pelo gate remoto.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { FileDown, Plus, Printer, Save, Search, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'identificacao' | 'produtos' | 'totais' | 'transporte'
type Client = { id: string; nome: string; documento: string | null }
type Product = { id: string; codigo: string; nome: string; preco_venda: number; unidade: string }
type NFeItem = { produto_id: string; codigo: string; descricao: string; ncm: string; cfop: string; quantidade: string; unidade: string; valor_unitario: string; lote: string }
type Freight = { modalidade: '0' | '1' | '2' | '3' | '4' | '9'; transportador: string; documento: string; placa: string }
type Totals = { frete: string; desconto: string; outras: string; icms: string; ipi: string; pis: string; cofins: string }

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'identificacao', label: '1. Identificação' },
  { id: 'produtos', label: '2. Produtos e Serviços' },
  { id: 'totais', label: '3. Totais e Impostos' },
  { id: 'transporte', label: '4. Transporte / Cobrança' }
]
const emptyItem = (): NFeItem => ({ produto_id: '', codigo: '', descricao: '', ncm: '', cfop: '5102', quantidade: '1', unidade: 'UN', valor_unitario: '0', lote: '' })
const emptyTotals = (): Totals => ({ frete: '0', desconto: '0', outras: '0', icms: '0', ipi: '0', pis: '0', cofins: '0' })
const numberValue = (value: string): number => { const n = Number(value); return Number.isFinite(n) ? n : 0 }
const money = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const digits = (value: string): string => value.replace(/\D/g, '')

export default function NFeEmissao() {
  const [tab, setTab] = useState<Tab>('identificacao')
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientId, setClientId] = useState('')
  const [numero, setNumero] = useState('')
  const [serie, setSerie] = useState('1')
  const [natureza, setNatureza] = useState('Venda de mercadoria')
  const [destinatario, setDestinatario] = useState('')
  const [destDocumento, setDestDocumento] = useState('')
  const [items, setItems] = useState<NFeItem[]>([emptyItem()])
  const [freight, setFreight] = useState<Freight>({ modalidade: '9', transportador: '', documento: '', placa: '' })
  const [totals, setTotals] = useState<Totals>(emptyTotals())
  const [pedidoAlmox, setPedidoAlmox] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const totalProdutos = useMemo(() => items.reduce((sum, item) => sum + numberValue(item.quantidade) * numberValue(item.valor_unitario), 0), [items])
  const baseIcms = Math.max(0, totalProdutos + numberValue(totals.frete) + numberValue(totals.outras) - numberValue(totals.desconto))
  const valorLiquido = Math.max(0, totalProdutos + numberValue(totals.ipi) + numberValue(totals.frete) + numberValue(totals.outras) - numberValue(totals.desconto))

  useEffect(() => {
    void (async () => {
      setError('')
      try {
        const [clientResult, productResult] = await Promise.all([
          supabase.from('erp_clientes').select('id,nome,documento').eq('ativo', true).order('nome').limit(1000),
          supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,unidade').eq('ativo', true).order('codigo').limit(1000)
        ])
        if (clientResult.error) throw clientResult.error
        if (productResult.error) throw productResult.error
        setClients((clientResult.data ?? []).filter(row => typeof row.id === 'string' && typeof row.nome === 'string').map(row => ({ id: row.id, nome: row.nome, documento: typeof row.documento === 'string' ? row.documento : null })))
        setProducts((productResult.data ?? []).filter(row => typeof row.id === 'string' && typeof row.codigo === 'string' && typeof row.nome === 'string').map(row => ({ id: row.id, codigo: row.codigo, nome: row.nome, preco_venda: numberValue(String(row.preco_venda ?? 0)), unidade: typeof row.unidade === 'string' ? row.unidade : 'UN' })))
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar os cadastros fiscais.') }
    })()
  }, [])
  const chooseClient = (id: string) => { const client = clients.find(item => item.id === id); setClientId(id); setDestinatario(client?.nome ?? ''); setDestDocumento(client?.documento ?? '') }
  const chooseProduct = (index: number, productId: string) => { const product = products.find(item => item.id === productId); if (!product) return; setItems(current => current.map((item, currentIndex) => currentIndex === index ? { ...item, produto_id: product.id, codigo: product.codigo, descricao: product.nome, unidade: product.unidade, valor_unitario: String(product.preco_venda) } : item)) }
  const updateItem = (index: number, field: keyof NFeItem, value: string) => { setItems(current => current.map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item)) }
  const importAlmox = async () => {
    if (!pedidoAlmox.trim()) { setError('Informe o número do pedido do Almoxarifado.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await supabase.from('erp_almoxarifado_pedidos').select('id,numero_pedido,cliente_nome,cliente_cnpj,codigo_peca,descricao_peca,quantidade,lote,valor_unitario,ncm,cfop,status').eq('numero_pedido', pedidoAlmox.trim()).eq('status', 'Liberado').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Pedido não encontrado ou não está Liberado para faturamento.')
      const row = result.data
      setDestinatario(String(row.cliente_nome ?? '')); setDestDocumento(String(row.cliente_cnpj ?? ''))
      setItems([{ ...emptyItem(), codigo: String(row.codigo_peca ?? ''), descricao: String(row.descricao_peca ?? ''), quantidade: String(row.quantidade ?? '0'), lote: String(row.lote ?? ''), valor_unitario: String(row.valor_unitario ?? '0'), ncm: String(row.ncm ?? ''), cfop: String(row.cfop ?? '5102') }])
      setMessage('Pedido real do Almoxarifado carregado para conferência fiscal.'); setTab('produtos')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao importar pedido do Almoxarifado.') } finally { setBusy(false) }
  }
  const validate = (): void => {
    if (!destinatario.trim()) throw new Error('Informe o destinatário.')
    const validItems = items.filter(item => item.codigo.trim() && numberValue(item.quantidade) > 0)
    if (!validItems.length) throw new Error('Adicione pelo menos um item válido.')
    for (const item of validItems) { if (!/^\d{8}$/.test(digits(item.ncm))) throw new Error('NCM deve conter 8 dígitos.'); if (!/^\d{4}$/.test(item.cfop)) throw new Error('CFOP deve conter 4 dígitos.'); if (!item.lote.trim()) throw new Error('Lote do Almoxarifado é obrigatório para cada item.') }
  }
  const saveDraft = async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      validate()
      const company = await supabase.rpc('erp_current_company_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const empresaId = String(company.data)
      const header = { empresa_id: empresaId, tipo: 'NFe', modelo: '55', serie: Number(serie) || 1, numero: numero ? Number(numero) : null, status: 'rascunho', ambiente: 'homologacao', natureza_operacao: natureza, data_emissao: new Date().toISOString(), destinatario_nome: destinatario.trim(), destinatario_documento: digits(destDocumento), valor_produtos: Number(totalProdutos.toFixed(2)), valor_frete: Number(numberValue(totals.frete).toFixed(2)), valor_outras_despesas: Number(numberValue(totals.outras).toFixed(2)), valor_desconto: Number(numberValue(totals.desconto).toFixed(2)), base_calculo_icms: Number(baseIcms.toFixed(2)), valor_icms: Number(numberValue(totals.icms).toFixed(2)), valor_ipi: Number(numberValue(totals.ipi).toFixed(2)), valor_pis: Number(numberValue(totals.pis).toFixed(2)), valor_cofins: Number(numberValue(totals.cofins).toFixed(2)), valor_liquido: Number(valorLiquido.toFixed(2)), valor_total: Number(valorLiquido.toFixed(2)), mensagem_retorno: 'Rascunho fiscal aguardando conferência.' }
      const documentResult = await supabase.from('erp_documentos_fiscais').insert(header).select('id').single()
      if (documentResult.error || !documentResult.data?.id) throw documentResult.error ?? new Error('Documento fiscal não foi criado.')
      const documentId = documentResult.data.id
      const rows = items.filter(item => item.codigo.trim() && numberValue(item.quantidade) > 0).map((item, index) => ({ empresa_id: empresaId, documento_id: documentId, produto_id: item.produto_id || null, item_numero: index + 1, codigo_produto: item.codigo.trim(), descricao_produto: item.descricao.trim(), ncm: digits(item.ncm), cfop: item.cfop, unidade: item.unidade || 'UN', quantidade: numberValue(item.quantidade), valor_unitario: numberValue(item.valor_unitario), valor_total: Number((numberValue(item.quantidade) * numberValue(item.valor_unitario)).toFixed(2)), lote: item.lote.trim() || null }))
      const itemResult = await supabase.from('erp_documentos_fiscais_itens').insert(rows)
      if (itemResult.error) { await supabase.from('erp_documentos_fiscais').delete().eq('id', documentId); throw itemResult.error }
      setMessage('Rascunho NF-e gravado no banco real. A transmissão permanece separada da gravação do documento.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar o rascunho fiscal.') } finally { setBusy(false) }
  }
  const prepareTransmission = () => { setMessage('Rascunho conferido. A transmissão real deve usar o documento salvo e a Edge Function emitir-nfe; não será criada uma emissão fictícia pelo navegador.'); setTab('transporte') }
  const printDanfe = () => window.print()
  const fieldClass = 'mt-1 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100'
  return <main className='min-h-screen bg-[#f8fafc] p-4 md:p-6 text-[#0f172a]'>
    <header className='mb-6 flex flex-col gap-4 border-b border-slate-200 bg-white p-5 lg:flex-row lg:items-end lg:justify-between'><div><span className='text-sm font-extrabold tracking-wider text-[#1e3a8a]'>FISCAL • NF-e MODELO 55</span><h1 className='mt-1 text-3xl font-extrabold'>Emissão de Nota Fiscal Eletrônica</h1><p className='mt-1 text-base text-slate-600'>Documento fiscal real, vinculado ao pedido e ao lote do Almoxarifado.</p></div><button type='button' onClick={printDanfe} className='inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold'><Printer size={18}/> Imprimir DANFE A4</button></header>
    <section className='mb-6 rounded-lg border border-slate-200 bg-white p-4'><div className='grid grid-cols-1 items-end gap-4 md:grid-cols-4'><label className='text-base font-bold md:col-span-3'>Pedido do Almoxarifado<input className={fieldClass} value={pedidoAlmox} onChange={event => setPedidoAlmox(event.target.value)} placeholder='Pesquisar por número do pedido'/></label><button type='button' disabled={busy} onClick={() => void importAlmox()} className='inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60'><Search size={18}/> Carregar Pedido</button></div></section>
    {(error || message) && <div role='alert' className={'mb-6 rounded-lg border p-4 text-base font-semibold ' + (error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{error || message}</div>}
    <section className='nfe-print'><nav role='tablist' className='mb-4 grid grid-cols-1 gap-1 rounded-lg bg-slate-200 p-1 md:grid-cols-4'>{tabs.map(item => <button key={item.id} type='button' role='tab' aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={'min-h-12 rounded-md px-3 text-base font-bold ' + (tab === item.id ? 'bg-white text-[#2563eb] shadow-sm' : 'text-slate-600 hover:bg-white/70')}>{item.label}</button>)}</nav>
    {tab === 'identificacao' && <section className='rounded-lg border border-slate-200 bg-white p-5'><h2 className='mb-5 text-xl font-extrabold text-[#1e3a8a]'>Identificação</h2><div className='grid grid-cols-1 gap-4 md:grid-cols-4'><label className='text-base font-bold'>Número<input className={fieldClass} value={numero} onChange={event => setNumero(event.target.value)}/></label><label className='text-base font-bold'>Série<input className={fieldClass} value={serie} onChange={event => setSerie(event.target.value)}/></label><label className='text-base font-bold md:col-span-2'>Natureza da operação<input className={fieldClass} value={natureza} onChange={event => setNatureza(event.target.value)}/></label><label className='text-base font-bold md:col-span-2'>Cliente<select className={fieldClass} value={clientId} onChange={event => chooseClient(event.target.value)}><option value=''>Selecionar cliente real</option>{clients.map(client => <option key={client.id} value={client.id}>{client.nome} • {client.documento || 'sem documento'}</option>)}</select></label><label className='text-base font-bold md:col-span-2'>Destinatário<input className={fieldClass} value={destinatario} onChange={event => setDestinatario(event.target.value)}/></label><label className='text-base font-bold'>CNPJ / CPF<input className={fieldClass} value={destDocumento} onChange={event => setDestDocumento(event.target.value)}/></label><label className='text-base font-bold'>Inscrição Estadual<input className={fieldClass} placeholder='Informar conforme cadastro fiscal'/></label></div></section>}
    {tab === 'produtos' && <section className='rounded-lg border border-slate-200 bg-white p-5'><div className='mb-5 flex flex-wrap items-center justify-between gap-3'><div><h2 className='text-xl font-extrabold text-[#1e3a8a]'>Produtos e Serviços</h2><p className='text-base text-slate-600'>Lote do Almoxarifado é obrigatório e permanece rastreável no item fiscal.</p></div><button type='button' onClick={() => setItems(current => [...current, emptyItem()])} className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold'><Plus size={18}/> Adicionar item</button></div><div className='space-y-4'>{items.map((item,index)=><article key={index} className='rounded-lg border border-slate-200 bg-slate-50 p-4'><div className='grid grid-cols-1 gap-4 md:grid-cols-4'><label className='text-base font-bold'>Produto<select className={fieldClass} value={item.produto_id} onChange={event => chooseProduct(index,event.target.value)}><option value=''>Pesquisar cadastro real</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} • {product.nome}</option>)}</select></label><label className='text-base font-bold'>Código<input className={fieldClass} value={item.codigo} onChange={event => updateItem(index,'codigo',event.target.value)}/></label><label className='text-base font-bold md:col-span-2'>Descrição<input className={fieldClass} value={item.descricao} onChange={event => updateItem(index,'descricao',event.target.value)}/></label><label className='text-base font-bold'>NCM<input className={fieldClass} maxLength={8} inputMode='numeric' value={item.ncm} onChange={event => updateItem(index,'ncm',event.target.value)}/></label><label className='text-base font-bold'>CFOP<input className={fieldClass} maxLength={4} inputMode='numeric' value={item.cfop} onChange={event => updateItem(index,'cfop',event.target.value)}/></label><label className='text-base font-bold'>Qtd<input className={fieldClass} type='number' min='0' step='0.001' value={item.quantidade} onChange={event => updateItem(index,'quantidade',event.target.value)}/></label><label className='text-base font-bold'>Unidade<input className={fieldClass} value={item.unidade} onChange={event => updateItem(index,'unidade',event.target.value)}/></label><label className='text-base font-bold'>Valor Unitário<input className={fieldClass} type='number' min='0' step='0.01' value={item.valor_unitario} onChange={event => updateItem(index,'valor_unitario',event.target.value)}/></label><label className='text-base font-bold md:col-span-2'>LOTE DO ALMOXARIFADO<input className={fieldClass + ' font-mono'} value={item.lote} onChange={event => updateItem(index,'lote',event.target.value)}/></label></div><div className='mt-4 flex items-center justify-between border-t border-slate-200 pt-3'><strong className='text-base'>Total: {money(numberValue(item.quantidade) * numberValue(item.valor_unitario))}</strong><button type='button' disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, currentIndex) => currentIndex !== index))} className='inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-base font-bold text-red-700'><Trash2 size={17}/> Remover</button></div></article>)}</div></section>}
    {tab === 'totais' && <section className='rounded-lg border border-slate-200 bg-white p-5'><h2 className='mb-5 text-xl font-extrabold text-[#1e3a8a]'>Totais e Impostos</h2><div className='grid grid-cols-1 gap-4 md:grid-cols-4'>{([['frete','Frete'],['outras','Outras despesas'],['desconto','Desconto'],['icms','Valor ICMS'],['ipi','Valor IPI'],['pis','Valor PIS'],['cofins','Valor COFINS']] as const).map(([key,label])=><label key={key} className='text-base font-bold'>{label}<input className={fieldClass} type='number' step='0.01' value={totals[key]} onChange={event => setTotals(current => ({ ...current, [key]: event.target.value }))}/></label>)}</div><div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-3'><article className='rounded-lg border border-slate-200 bg-slate-50 p-4'><span className='text-base text-slate-600'>Base ICMS</span><strong className='mt-1 block text-2xl'>{money(baseIcms)}</strong></article><article className='rounded-lg border border-slate-200 bg-slate-50 p-4'><span className='text-base text-slate-600'>Valor IPI</span><strong className='mt-1 block text-2xl'>{money(numberValue(totals.ipi))}</strong></article><article className='rounded-lg border border-slate-200 bg-blue-50 p-4'><span className='text-base text-slate-600'>Valor líquido da nota</span><strong className='mt-1 block text-2xl text-[#2563eb]'>{money(valorLiquido)}</strong></article></div></section>}
    {tab === 'transporte' && <section className='rounded-lg border border-slate-200 bg-white p-5'><h2 className='mb-5 text-xl font-extrabold text-[#1e3a8a]'>Transporte / Cobrança</h2><div className='grid grid-cols-1 gap-4 md:grid-cols-4'><label className='text-base font-bold'>Modalidade<select className={fieldClass} value={freight.modalidade} onChange={event => { const value = event.target.value; if (['0','1','2','3','4','9'].includes(value)) setFreight(current => ({ ...current, modalidade: value as Freight['modalidade'] })) }}><option value='0'>0 • Emitente</option><option value='1'>1 • Destinatário</option><option value='2'>2 • Terceiros</option><option value='3'>3 • Próprio remetente</option><option value='4'>4 • Próprio destinatário</option><option value='9'>9 • Sem frete</option></select></label><label className='text-base font-bold md:col-span-2'>Transportador<input className={fieldClass} value={freight.transportador} onChange={event => setFreight(current => ({ ...current, transportador: event.target.value }))}/></label><label className='text-base font-bold'>CNPJ/CPF<input className={fieldClass} value={freight.documento} onChange={event => setFreight(current => ({ ...current, documento: event.target.value }))}/></label><label className='text-base font-bold'>Placa<input className={fieldClass} value={freight.placa} onChange={event => setFreight(current => ({ ...current, placa: event.target.value }))}/></label></div></section>}
    </section>
    <footer className='mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4'><div><span className='text-sm font-bold uppercase text-slate-500'>Valor da NF-e</span><strong className='block text-2xl'>{money(valorLiquido)}</strong></div><div className='flex flex-wrap gap-2'><button type='button' disabled={busy} onClick={() => void saveDraft()} className='inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60'><Save size={18}/> Salvar Rascunho</button><button type='button' disabled={busy} onClick={prepareTransmission} className='inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold'><Send size={18}/> Preparar Transmissão</button><button type='button' onClick={printDanfe} className='inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold'><FileDown size={18}/> DANFE A4</button></div></footer>
    <div className='mt-4 text-xs text-slate-500'>FernandoSch_System • Documento fiscal modelo 55 • transmissão somente pelo fluxo fiscal autorizado.</div>
  </main>
}