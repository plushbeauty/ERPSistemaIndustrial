/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:58 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-058
 * Alterações: Reconstrução integral da emissão NF-e; remoção de any; abas horizontais; grids de tablet; produtos, lotes, totais, transporte e impressão A4.
 * Status do Build Local: Não executado — validação será feita pelo gate remoto.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { FileText, Package, Landmark, Truck, Save, Printer, Plus, Trash2, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'identificacao' | 'produtos' | 'impostos' | 'transporte'

interface Destinatario {
  cnpjCpf: string
  razaoSocial: string
  inscricaoEstadual: string
  endereco: string
  email: string
}

interface NFItem {
  id: string
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  quantidade: string
  unidade: string
  valorUnitario: string
  lote: string
}

interface Totais {
  frete: string
  desconto: string
  icms: string
  ipi: string
  pis: string
  cofins: string
}

interface PedidoFiscal {
  numero: string
  clienteNome: string
  clienteDocumento: string
  itens: NFItem[]
}

const emptyItem = (): NFItem => ({
  id: crypto.randomUUID(),
  codigo: '',
  descricao: '',
  ncm: '',
  cfop: '5102',
  quantidade: '1',
  unidade: 'UN',
  valorUnitario: '0',
  lote: ''
})

const numberOf = (value: string): number => {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function NFeEmissao() {
  const [tab, setTab] = useState<Tab>('identificacao')
  const [pedido, setPedido] = useState('')
  const [destinatario, setDestinatario] = useState<Destinatario>({
    cnpjCpf: '', razaoSocial: '', inscricaoEstadual: '', endereco: '', email: ''
  })
  const [itens, setItens] = useState<NFItem[]>([emptyItem()])
  const [totais, setTotais] = useState<Totais>({
    frete: '0', desconto: '0', icms: '0', ipi: '0', pis: '0', cofins: '0'
  })
  const [freteModalidade, setFreteModalidade] = useState('9')
  const [transportador, setTransportador] = useState('')
  const [documentoTransportador, setDocumentoTransportador] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [serie, setSerie] = useState('1')
  const [natureza, setNatureza] = useState('Venda de mercadoria')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const totalProdutos = useMemo(
    () => itens.reduce((sum, item) => sum + numberOf(item.quantidade) * numberOf(item.valorUnitario), 0),
    [itens]
  )
  const baseIcms = Math.max(0, totalProdutos + numberOf(totais.frete) - numberOf(totais.desconto))
  const valorLiquido = Math.max(
    0,
    totalProdutos + numberOf(totais.frete) + numberOf(totais.ipi) - numberOf(totais.desconto)
  )

  useEffect(() => {
    if (!pedido.trim()) return
    setError('')
  }, [pedido])

  async function carregarPedido() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase
        .from('erp_pedidos_venda')
        .select('id,numero,cliente_id')
        .eq('numero', Number(pedido))
        .maybeSingle()

      if (result.error) throw result.error
      if (!result.data) throw new Error('Pedido não localizado no ERP.')

      const client = await supabase
        .from('erp_clientes')
        .select('id,nome,documento')
        .eq('id', result.data.cliente_id)
        .maybeSingle()

      if (client.error) throw client.error

      setDestinatario({
        cnpjCpf: typeof client.data?.documento === 'string' ? client.data.documento : '',
        razaoSocial: typeof client.data?.nome === 'string' ? client.data.nome : '',
        inscricaoEstadual: '',
        endereco: '',
        email: ''
      })

      setMessage(`Pedido ${String(result.data.numero)} localizado. Confira os itens e os dados fiscais antes da transmissão.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao localizar o pedido.')
    } finally {
      setLoading(false)
    }
  }

  function updateItem(id: string, field: keyof NFItem, value: string) {
    setItens(current => current.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function updateTotal(field: keyof Totais, value: string) {
    setTotais(current => ({ ...current, [field]: value }))
  }

  function removeItem(id: string) {
    setItens(current => current.length === 1 ? current : current.filter(item => item.id !== id))
  }

  async function salvarRascunho() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (!destinatario.razaoSocial.trim()) throw new Error('Informe o destinatário antes de salvar.')
      if (!itens.some(item => item.codigo.trim() && numberOf(item.quantidade) > 0)) {
        throw new Error('Adicione pelo menos um produto válido.')
      }

      const company = await supabase.rpc('erp_current_company_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ERP não identificada.')

      const header = {
        empresa_id: String(company.data),
        tipo: 'NFe',
        modelo: '55',
        serie: Number(serie) || 1,
        numero: numeroNota ? Number(numeroNota) : null,
        status: 'rascunho',
        ambiente: 'homologacao',
        natureza_operacao: natureza,
        destinatario_nome: destinatario.razaoSocial.trim(),
        destinatario_documento: destinatario.cnpjCpf.trim(),
        valor_produtos: Number(totalProdutos.toFixed(2)),
        valor_frete: Number(numberOf(totais.frete).toFixed(2)),
        valor_desconto: Number(numberOf(totais.desconto).toFixed(2)),
        base_calculo_icms: Number(baseIcms.toFixed(2)),
        valor_icms: Number(numberOf(totais.icms).toFixed(2)),
        valor_ipi: Number(numberOf(totais.ipi).toFixed(2)),
        valor_total: Number(valorLiquido.toFixed(2)),
        valor_liquido: Number(valorLiquido.toFixed(2))
      }

      const document = await supabase
        .from('erp_documentos_fiscais')
        .insert(header)
        .select('id')
        .single()

      if (document.error) throw document.error
      if (!document.data?.id) throw new Error('Documento fiscal não retornou identificador.')

      const rows = itens
        .filter(item => item.codigo.trim() && numberOf(item.quantidade) > 0)
        .map((item, index) => ({
          documento_id: document.data.id,
          empresa_id: String(company.data),
          item_numero: index + 1,
          codigo_produto: item.codigo.trim(),
          descricao_produto: item.descricao.trim(),
          ncm: item.ncm || null,
          cfop: item.cfop || null,
          lote: item.lote || null,
          unidade: item.unidade || 'UN',
          quantidade: numberOf(item.quantidade),
          valor_unitario: numberOf(item.valorUnitario),
          valor_total: Number((numberOf(item.quantidade) * numberOf(item.valorUnitario)).toFixed(2))
        }))

      const itemInsert = await supabase.from('erp_documentos_fiscais_itens').insert(rows)
      if (itemInsert.error) {
        await supabase.from('erp_documentos_fiscais').delete().eq('id', document.data.id)
        throw itemInsert.error
      }

      setMessage('Rascunho da NF-e salvo no banco com os itens e lotes vinculados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a NF-e.')
    } finally {
      setLoading(false)
    }
  }

  function imprimirDanfe() {
    window.print()
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof FileText }> = [
    { id: 'identificacao', label: '1. Identificação', icon: FileText },
    { id: 'produtos', label: '2. Produtos e Serviços', icon: Package },
    { id: 'impostos', label: '3. Totais e Impostos', icon: Landmark },
    { id: 'transporte', label: '4. Transporte / Cobrança', icon: Truck }
  ]

  const fieldClass = 'mt-1 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100'

  return (
    <main className="min-h-screen bg-[#f4fbfd] p-4 text-[#0f172a] md:p-6 print:bg-white">
      <style>{`@media print { body * { visibility: hidden } .nfe-print, .nfe-print * { visibility: visible } .nfe-print { position: absolute; inset: 0; width: 100%; background: white } .no-print { display: none !important } }`}</style>

      <header className="nfe-print mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-sm font-extrabold tracking-wider text-[#2563eb]">FISCAL • NF-e MODELO 55</span>
          <h1 className="mt-1 text-3xl font-extrabold">Emissão de Nota Fiscal Eletrônica</h1>
          <p className="mt-1 text-base text-slate-600">Fluxo fiscal integrado ao pedido, Almoxarifado e rastreabilidade por lote.</p>
        </div>
        <button type="button" onClick={imprimirDanfe} className="no-print inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold">
          <Printer size={18} /> Imprimir DANFE A4
        </button>
      </header>

      <section className="no-print mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="text-base font-bold md:col-span-3">
          Pedido de origem
          <input className={fieldClass} value={pedido} onChange={event => setPedido(event.target.value)} placeholder="Número do pedido de venda" inputMode="numeric" />
        </label>
        <button type="button" disabled={loading} onClick={() => void carregarPedido()} className="min-h-12 self-end rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60">
          <Search className="mr-2 inline-block" size={18} /> Puxar pedido
        </button>
      </section>

      {(message || error) && (
        <div className={`no-print mb-5 rounded-lg border p-4 text-base font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <section className="nfe-print rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav className="grid grid-cols-1 gap-1 border-b border-slate-200 bg-slate-50 p-2 md:grid-cols-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`min-h-12 rounded-lg px-3 text-base font-bold ${tab === id ? 'bg-white text-[#2563eb] shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white'}`}>
              <Icon className="mr-2 inline-block" size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="p-5 md:p-6">
          {tab === 'identificacao' && (
            <section>
              <h2 className="mb-5 text-xl font-extrabold">Identificação</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-base font-bold">Número<input className={fieldClass} value={numeroNota} onChange={event => setNumeroNota(event.target.value)} /></label>
                <label className="text-base font-bold">Série<input className={fieldClass} value={serie} onChange={event => setSerie(event.target.value)} /></label>
                <label className="text-base font-bold md:col-span-2">Natureza da operação<input className={fieldClass} value={natureza} onChange={event => setNatureza(event.target.value)} /></label>
                <label className="text-base font-bold md:col-span-2">CNPJ / CPF<input className={fieldClass} value={destinatario.cnpjCpf} onChange={event => setDestinatario(current => ({ ...current, cnpjCpf: event.target.value }))} /></label>
                <label className="text-base font-bold md:col-span-2">Razão Social<input className={fieldClass} value={destinatario.razaoSocial} onChange={event => setDestinatario(current => ({ ...current, razaoSocial: event.target.value }))} /></label>
                <label className="text-base font-bold">Inscrição Estadual<input className={fieldClass} value={destinatario.inscricaoEstadual} onChange={event => setDestinatario(current => ({ ...current, inscricaoEstadual: event.target.value }))} /></label>
                <label className="text-base font-bold md:col-span-3">Endereço<input className={fieldClass} value={destinatario.endereco} onChange={event => setDestinatario(current => ({ ...current, endereco: event.target.value }))} /></label>
                <label className="text-base font-bold md:col-span-2">E-mail<input className={fieldClass} type="email" value={destinatario.email} onChange={event => setDestinatario(current => ({ ...current, email: event.target.value }))} /></label>
              </div>
            </section>
          )}

          {tab === 'produtos' && (
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-extrabold">Produtos e Serviços</h2><p className="text-base text-slate-600">Código, descrição, NCM, CFOP, quantidade, valor unitário e lote do Almoxarifado.</p></div>
                <button type="button" onClick={() => setItens(current => [...current, emptyItem()])} className="no-print min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold"><Plus className="mr-2 inline-block" size={18} /> Adicionar item</button>
              </div>
              <div className="space-y-4">
                {itens.map(item => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <label className="text-base font-bold">Código<input className={fieldClass} value={item.codigo} onChange={event => updateItem(item.id, 'codigo', event.target.value)} /></label>
                      <label className="text-base font-bold md:col-span-3">Descrição<input className={fieldClass} value={item.descricao} onChange={event => updateItem(item.id, 'descricao', event.target.value)} /></label>
                      <label className="text-base font-bold">NCM<input className={fieldClass} maxLength={8} value={item.ncm} onChange={event => updateItem(item.id, 'ncm', event.target.value)} /></label>
                      <label className="text-base font-bold">CFOP<input className={fieldClass} maxLength={4} value={item.cfop} onChange={event => updateItem(item.id, 'cfop', event.target.value)} /></label>
                      <label className="text-base font-bold">Quantidade<input className={fieldClass} type="number" step="0.001" value={item.quantidade} onChange={event => updateItem(item.id, 'quantidade', event.target.value)} /></label>
                      <label className="text-base font-bold">Unidade<input className={fieldClass} value={item.unidade} onChange={event => updateItem(item.id, 'unidade', event.target.value)} /></label>
                      <label className="text-base font-bold">Valor Unitário<input className={fieldClass} type="number" step="0.01" value={item.valorUnitario} onChange={event => updateItem(item.id, 'valorUnitario', event.target.value)} /></label>
                      <label className="text-base font-bold md:col-span-2">LOTE DO ALMOXARIFADO<input className={`${fieldClass} font-mono`} value={item.lote} onChange={event => updateItem(item.id, 'lote', event.target.value)} /></label>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                      <strong className="text-base">{money(numberOf(item.quantidade) * numberOf(item.valorUnitario))}</strong>
                      <button type="button" className="no-print rounded-lg border border-red-200 bg-white px-3 py-2 text-base font-bold text-red-700" onClick={() => removeItem(item.id)}>
                        <Trash2 className="mr-1 inline-block" size={17} /> Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === 'impostos' && (
            <section>
              <h2 className="mb-5 text-xl font-extrabold">Totais e Impostos</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {([
                  ['frete', 'Frete'], ['desconto', 'Desconto'], ['icms', 'Valor ICMS'],
                  ['ipi', 'Valor IPI'], ['pis', 'Valor PIS'], ['cofins', 'Valor COFINS']
                ] as Array<[keyof Totais, string]>).map(([field, label]) => (
                  <label key={field} className="text-base font-bold">{label}<input className={fieldClass} type="number" step="0.01" value={totais[field]} onChange={event => updateTotal(field, event.target.value)} /></label>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><span className="text-base text-slate-600">Base de Cálculo ICMS</span><strong className="mt-1 block text-2xl">{money(baseIcms)}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><span className="text-base text-slate-600">Produtos</span><strong className="mt-1 block text-2xl">{money(totalProdutos)}</strong></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5"><span className="text-base text-slate-600">Valor Líquido da Nota</span><strong className="mt-1 block text-2xl text-[#2563eb]">{money(valorLiquido)}</strong></div>
              </div>
            </section>
          )}

          {tab === 'transporte' && (
            <section>
              <h2 className="mb-5 text-xl font-extrabold">Transporte / Cobrança</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-base font-bold">Modalidade do Frete<select className={fieldClass} value={freteModalidade} onChange={event => setFreteModalidade(event.target.value)}><option value="0">0 • Emitente</option><option value="1">1 • Destinatário</option><option value="9">9 • Sem frete</option></select></label>
                <label className="text-base font-bold md:col-span-2">Transportador<input className={fieldClass} value={transportador} onChange={event => setTransportador(event.target.value)} /></label>
                <label className="text-base font-bold">CNPJ / CPF<input className={fieldClass} value={documentoTransportador} onChange={event => setDocumentoTransportador(event.target.value)} /></label>
              </div>
            </section>
          )}
        </div>
      </section>

      <footer className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><span className="text-sm font-bold uppercase text-slate-500">Valor da nota</span><strong className="block text-2xl">{money(valorLiquido)}</strong></div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={loading} onClick={() => void salvarRascunho()} className="min-h-12 rounded-lg bg-[#2563eb] px-5 text-base font-bold text-white disabled:opacity-60"><Save className="mr-2 inline-block" size={18} /> Salvar Rascunho</button>
          <button type="button" onClick={imprimirDanfe} className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 text-base font-bold"><Printer className="mr-2 inline-block" size={18} /> DANFE A4</button>
        </div>
      </footer>
    </main>
  )
}
