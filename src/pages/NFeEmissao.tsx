/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:47 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-044
 * Alterações: Reconstrução da NF-e em quatro abas operacionais; grid Tailwind para tablet; lote do Almoxarifado; totais fiscais; impressão A4.
 * Status do Build Local: Não executado — ambiente desta sessão sem acesso de rede ao repositório.
 * =========================================================================
 */

import React, { useMemo, useState } from 'react'
import { FileDown, Plus, Printer, Save, Search, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

type Client = { id: string; nome: string; documento: string | null }
type Product = { id: string; codigo: string; nome: string; preco_venda: number }
type NFeItem = {
  produto_id: string
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  quantidade: string
  unidade: string
  valor_unitario: string
  lote: string
}
type Freight = { modalidade: string; transportador: string; documento: string; placa: string }
type Totals = { frete: string; desconto: string; outras: string; icms: string; ipi: string; pis: string; cofins: string }

const emptyItem = (): NFeItem => ({
  produto_id: '', codigo: '', descricao: '', ncm: '', cfop: '5102',
  quantidade: '1', unidade: 'UN', valor_unitario: '0', lote: ''
})
const emptyTotals = (): Totals => ({ frete: '0', desconto: '0', outras: '0', icms: '0', ipi: '0', pis: '0', cofins: '0' })

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}
function stringValue(value: unknown): string { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function numberValue(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? n : 0 }

export default function NFeEmissao() {
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
  const [codigoBusca, setCodigoBusca] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const totalProdutos = useMemo(() => items.reduce((sum, item) => sum + numberValue(item.quantidade) * numberValue(item.valor_unitario), 0), [items])
  const baseIcms = Math.max(0, totalProdutos + numberValue(totals.frete) + numberValue(totals.outras) - numberValue(totals.desconto))
  const valorLiquido = Math.max(0, totalProdutos + numberValue(totals.ipi) + numberValue(totals.frete) + numberValue(totals.outras) - numberValue(totals.desconto))

  async function loadCatalogs() {
    setError('')
    const [c, p] = await Promise.all([
      supabase.from('erp_clientes').select('id,nome,documento').eq('ativo', true).order('nome').limit(1000),
      supabase.from('erp_produtos').select('id,codigo,nome,preco_venda').eq('ativo', true).order('codigo').limit(1000)
    ])
    if (c.error) throw c.error
    if (p.error) throw p.error
    const nextClients: Client[] = []
    for (const row of c.data ?? []) {
      const r = record(row)
      if (r && typeof r.id === 'string' && typeof r.nome === 'string') nextClients.push({ id: r.id, nome: r.nome, documento: typeof r.documento === 'string' ? r.documento : null })
    }
    const nextProducts: Product[] = []
    for (const row of p.data ?? []) {
      const r = record(row)
      if (r && typeof r.id === 'string' && typeof r.codigo === 'string' && typeof r.nome === 'string') nextProducts.push({ id: r.id, codigo: r.codigo, nome: r.nome, preco_venda: numberValue(r.preco_venda) })
    }
    setClients(nextClients); setProducts(nextProducts)
  }

  React.useEffect(() => { void loadCatalogs().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar cadastros.')) }, [])

  function updateItem(index: number, field: keyof NFeItem, value: string) {
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function chooseProduct(index: number, productId: string) {
    const product = products.find(item => item.id === productId)
    if (!product) return
    setItems(current => current.map((item, i) => i === index ? { ...item, produto_id: product.id, codigo: product.codigo, descricao: product.nome, valor_unitario: String(product.preco_venda) } : item))
  }
  function chooseClient(id: string) {
    const client = clients.find(item => item.id === id)
    setClientId(id)
    setDestinatario(client?.nome ?? '')
    setDestDocumento(client?.documento ?? '')
  }
  async function importAlmox() {
    if (!pedidoAlmox.trim()) { setError('Informe o número do pedido do Almoxarifado.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await supabase.from('erp_almoxarifado_pedidos')
        .select('id,numero_pedido,cliente_nome,cliente_cnpj,codigo_peca,descricao_peca,quantidade,lote,valor_unitario,ncm,cfop,status')
        .eq('numero_pedido', pedidoAlmox.trim()).eq('status', 'Liberado').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Pedido não encontrado ou não está Liberado.')
      const row = record(result.data)
      if (!row) throw new Error('Retorno do Almoxarifado inválido.')
      setDestinatario(stringValue(row.cliente_nome)); setDestDocumento(stringValue(row.cliente_cnpj))
      setItems([{ ...emptyItem(), codigo: stringValue(row.codigo_peca), descricao: stringValue(row.descricao_peca), quantidade: stringValue(row.quantidade), lote: stringValue(row.lote), valor_unitario: stringValue(row.valor_unitario), ncm: stringValue(row.ncm), cfop: stringValue(row.cfop) || '5102' }])
      setMessage('Pedido do Almoxarifado importado para conferência fiscal.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao importar pedido.') }
    finally { setBusy(false) }
  }
  function validate() {
    if (!destinatario.trim()) throw new Error('Informe o destinatário.')
    if (!items.some(item => item.codigo.trim() && numberValue(item.quantidade) > 0)) throw new Error('Adicione pelo menos um item.')
    for (const item of items) {
      if (item.ncm && !/^\d{8}$/.test(item.ncm.replace(/\D/g, ''))) throw new Error('NCM deve conter 8 dígitos.')
      if (item.cfop && !/^\d{4}$/.test(item.cfop)) throw new Error('CFOP deve conter 4 dígitos.')
    }
  }
  async function saveDraft() {
    setBusy(true); setError(''); setMessage('')
    try {
      validate()
      const company = await supabase.rpc('erp_current_company_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const empresaId = String(company.data)
      const header = {
        empresa_id: empresaId, tipo: 'NFe', modelo: '55', serie: Number(serie) || 1,
        numero: numero ? Number(numero) : null, status: 'rascunho', ambiente: 'homologacao',
        natureza_operacao: natureza, data_emissao: new Date().toISOString(),
        destinatario_nome: destinatario.trim(), destinatario_documento: destDocumento.trim(),
        valor_produtos: Number(totalProdutos.toFixed(2)), valor_frete: Number(numberValue(totals.frete).toFixed(2)),
        valor_outras_despesas: Number(numberValue(totals.outras).toFixed(2)), valor_desconto: Number(numberValue(totals.desconto).toFixed(2)),
        base_calculo_icms: Number(baseIcms.toFixed(2)), valor_icms: Number(numberValue(totals.icms).toFixed(2)),
        valor_ipi: Number(numberValue(totals.ipi).toFixed(2)), valor_liquido: Number(valorLiquido.toFixed(2)), valor_total: Number(valorLiquido.toFixed(2)),
        mensagem_retorno: 'Rascunho fiscal aguardando transmissão.'
      }
      const doc = await supabase.from('erp_documentos_fiscais').insert(header).select('id').single()
      if (doc.error || !doc.data) throw doc.error ?? new Error('Documento fiscal não foi criado.')
      const docRow = record(doc.data)
      const documentId = docRow && typeof docRow.id === 'string' ? docRow.id : ''
      if (!documentId) throw new Error('ID do documento fiscal inválido.')
      const rows = items.filter(item => item.codigo.trim() && numberValue(item.quantidade) > 0).map((item, index) => ({
        empresa_id: empresaId, documento_id: documentId, produto_id: item.produto_id || null, item_numero: index + 1,
        codigo_produto: item.codigo.trim(), descricao_produto: item.descricao.trim(), ncm: item.ncm || null, cfop: item.cfop || null,
        lote: item.lote || null, unidade: item.unidade || 'UN', quantidade: numberValue(item.quantidade), valor_unitario: numberValue(item.valor_unitario),
        valor_total: Number((numberValue(item.quantidade) * numberValue(item.valor_unitario)).toFixed(2))
      }))
      const insertItems = await supabase.from('erp_documentos_fiscais_itens').insert(rows)
      if (insertItems.error) { await supabase.from('erp_documentos_fiscais').delete().eq('id', documentId); throw insertItems.error }
      setMessage('Rascunho fiscal salvo com sucesso.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar NF-e.') }
    finally { setBusy(false) }
  }
  function printDanfe() {
    window.print()
  }
  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-5 text-[#0f172a] md:px-8 print:bg-white">
      <style>{`@media print{body *{visibility:hidden}.nfe-print,.nfe-print *{visibility:visible}.nfe-print{position:absolute;left:0;top:0;width:100%}}`}</style>
      <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><span className="text-sm font-extrabold tracking-wider text-[#1e3a8a]">FISCAL • NF-e MODELO 55</span><h1 className="mt-1 text-3xl font-extrabold">Emissão de Nota Fiscal</h1><p className="mt-1 text-base text-slate-600">Conferência fiscal integrada ao pedido e ao lote do Almoxarifado.</p></div>
        <button type="button" onClick={printDanfe} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold"><Printer size={18}/> Imprimir DANFE</button>
      </header>
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto]">
          <label className="text-base font-bold">Pedido do Almoxarifado<input className="mt-1 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100" value={pedidoAlmox} onChange={e=>setPedidoAlmox(e.target.value)} placeholder="Número do pedido"/></label>
          <button type="button" disabled={busy} onClick={()=>void importAlmox()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60"><Search size={18}/> Puxar do Almoxarifado</button>
        </div>
      </section>
      {(error||message) && <div role="alert" className={`mb-5 rounded-lg border p-4 text-base font-semibold ${error?'border-red-200 bg-red-50 text-red-700':'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error||message}</div>}
      <section className="nfe-print">
        <Tabs defaultValue="identificacao">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1 md:grid-cols-4">
            <TabsTrigger className="min-h-12 text-base font-bold" value="identificacao">1 • Identificação</TabsTrigger>
            <TabsTrigger className="min-h-12 text-base font-bold" value="produtos">2 • Produtos e Serviços</TabsTrigger>
            <TabsTrigger className="min-h-12 text-base font-bold" value="totais">3 • Totais e Impostos</TabsTrigger>
            <TabsTrigger className="min-h-12 text-base font-bold" value="transporte">4 • Transporte / Cobrança</TabsTrigger>
          </TabsList>
          <TabsContent value="identificacao"><section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-extrabold text-[#1e3a8a]">Identificação da NF-e</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-base font-bold">Número<input className="field" value={numero} onChange={e=>setNumero(e.target.value)}/></label>
            <label className="text-base font-bold">Série<input className="field" value={serie} onChange={e=>setSerie(e.target.value)}/></label>
            <label className="text-base font-bold md:col-span-2">Natureza da operação<input className="field" value={natureza} onChange={e=>setNatureza(e.target.value)}/></label>
            <label className="text-base font-bold md:col-span-2">Destinatário<select className="field" value={clientId} onChange={e=>chooseClient(e.target.value)}><option value="">Selecionar cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome} • {c.documento||'sem documento'}</option>)}</select></label>
            <label className="text-base font-bold md:col-span-2">Razão Social / Nome<input className="field" value={destinatario} onChange={e=>setDestinatario(e.target.value)}/></label>
            <label className="text-base font-bold">CNPJ / CPF<input className="field" value={destDocumento} onChange={e=>setDestDocumento(e.target.value)}/></label>
            <label className="text-base font-bold">Inscrição Estadual<input className="field" placeholder="Não informado"/></label>
            <label className="text-base font-bold md:col-span-2">Endereço<input className="field" placeholder="Rua, número, bairro, município/UF"/></label>
          </div></section></TabsContent>
          <TabsContent value="produtos"><section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-[#1e3a8a]">Produtos e Serviços</h2><p className="text-base text-slate-600">Cada item mantém código, NCM, CFOP, quantidade, valor e lote do Almoxarifado.</p></div><button type="button" onClick={()=>setItems(current=>[...current,emptyItem()])} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold"><Plus size={18}/> Adicionar item</button></div>
            <div className="space-y-4">{items.map((item,index)=><article key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <label className="text-base font-bold">Produto<select className="field" value={item.produto_id} onChange={e=>chooseProduct(index,e.target.value)}><option value="">Selecionar</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label>
              <label className="text-base font-bold">Código<input className="field" value={item.codigo} onChange={e=>updateItem(index,'codigo',e.target.value)}/></label>
              <label className="text-base font-bold md:col-span-2">Descrição<input className="field" value={item.descricao} onChange={e=>updateItem(index,'descricao',e.target.value)}/></label>
              <label className="text-base font-bold">NCM<input className="field" maxLength={8} inputMode="numeric" value={item.ncm} onChange={e=>updateItem(index,'ncm',e.target.value)}/></label>
              <label className="text-base font-bold">CFOP<input className="field" maxLength={4} inputMode="numeric" value={item.cfop} onChange={e=>updateItem(index,'cfop',e.target.value)}/></label>
              <label className="text-base font-bold">Quantidade<input className="field" type="number" step="0.001" value={item.quantidade} onChange={e=>updateItem(index,'quantidade',e.target.value)}/></label>
              <label className="text-base font-bold">Unidade<input className="field" value={item.unidade} onChange={e=>updateItem(index,'unidade',e.target.value)}/></label>
              <label className="text-base font-bold">Valor Unitário<input className="field" type="number" step="0.01" value={item.valor_unitario} onChange={e=>updateItem(index,'valor_unitario',e.target.value)}/></label>
              <label className="text-base font-bold md:col-span-2">LOTE DO ALMOXARIFADO<input className="field font-mono" value={item.lote} onChange={e=>updateItem(index,'lote',e.target.value)}/></label>
            </div><div className="mt-4 flex justify-between border-t border-slate-200 pt-3"><strong className="text-base">Total do item: R$ {(numberValue(item.quantidade)*numberValue(item.valor_unitario)).toFixed(2)}</strong><button type="button" disabled={items.length===1} onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-base font-bold text-red-700"><Trash2 size={17}/> Remover</button></div></article>)}</div>
          </section></TabsContent>
          <TabsContent value="totais"><section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-extrabold text-[#1e3a8a]">Totais e Impostos</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {([['frete','Frete'],['outras','Outras despesas'],['desconto','Desconto'],['icms','Valor ICMS'],['ipi','Valor IPI'],['pis','Valor PIS'],['cofins','Valor COFINS']] as const).map(([key,label])=><label key={key} className="text-base font-bold">{label}<input className="field" type="number" step="0.01" value={totals[key]} onChange={e=>setTotals(current=>({...current,[key]:e.target.value}))}/></label>)}
          </div><div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"><div className="rounded-xl border bg-slate-50 p-5"><span className="text-base text-slate-600">Base de Cálculo ICMS</span><strong className="mt-1 block text-2xl">R$ {baseIcms.toFixed(2)}</strong></div><div className="rounded-xl border bg-slate-50 p-5"><span className="text-base text-slate-600">Produtos</span><strong className="mt-1 block text-2xl">R$ {totalProdutos.toFixed(2)}</strong></div><div className="rounded-xl border bg-blue-50 p-5"><span className="text-base text-slate-600">Valor Líquido da Nota</span><strong className="mt-1 block text-2xl text-[#2563eb]">R$ {valorLiquido.toFixed(2)}</strong></div></div></section></TabsContent>
          <TabsContent value="transporte"><section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-extrabold text-[#1e3a8a]">Transporte / Cobrança</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-base font-bold">Modalidade de Frete<select className="field" value={freight.modalidade} onChange={e=>setFreight(v=>({...v,modalidade:e.target.value}))}><option value="0">0 • Emitente</option><option value="1">1 • Destinatário</option><option value="9">9 • Sem frete</option></select></label>
            <label className="text-base font-bold md:col-span-2">Transportador<input className="field" value={freight.transportador} onChange={e=>setFreight(v=>({...v,transportador:e.target.value}))}/></label>
            <label className="text-base font-bold">CNPJ/CPF<input className="field" value={freight.documento} onChange={e=>setFreight(v=>({...v,documento:e.target.value}))}/></label>
            <label className="text-base font-bold">Placa<input className="field" value={freight.placa} onChange={e=>setFreight(v=>({...v,placa:e.target.value}))}/></label>
          </div></section></TabsContent>
        </Tabs>
      </section>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div><span className="text-sm font-bold uppercase text-slate-500">Valor da nota</span><strong className="block text-2xl">R$ {valorLiquido.toFixed(2)}</strong></div>
        <button type="button" disabled={busy} onClick={()=>void saveDraft()} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60"><Save size={18}/> Salvar Rascunho</button>
        <button type="button" disabled={busy} onClick={()=>setMessage('Transmissão fiscal deve ocorrer pela função autorizada após a conferência do rascunho.')} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold"><Send size={18}/> Preparar Transmissão</button>
        <button type="button" onClick={printDanfe} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold"><FileDown size={18}/> DANFE A4</button>
      </footer>
      <style>{`.field{margin-top:.25rem;min-height:3rem;width:100%;border:1px solid #e2e8f0;border-radius:.5rem;background:#fff;padding:0 .75rem;font-size:1rem;color:#0f172a;outline:none}.field:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}@media print{.field{border:0;padding:0}.nfe-print{font-size:12px}.nfe-print button,.nfe-print [role=tablist]{display:none}}`}</style>
    </main>
  )
}
