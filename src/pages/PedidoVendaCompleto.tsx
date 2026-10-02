import { useEffect, useMemo, useState } from 'react'
import { Factory, LogOut, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Save, Settings, ShoppingCart, Tablet, Trash2, Users, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'

type Client = {
  id: string
  nome: string
  documento: string | null
  codigo: string | null
  tabela_preco_id: string | null
}

type Product = {
  id: string
  codigo: string
  nome: string
  estoque_atual: number
  preco_venda: number
  unidade: string
}

type PriceItem = {
  tabela_preco_id: string
  produto_id: string
  preco: number
}

type Transportadora = {
  id: string
  codigo: string
  razao_social: string
  ativo: boolean
}

type OrderItem = {
  produto_id: string
  codigo: string
  codigoCliente: string
  descricao: string
  quantidade: string
  valor: string
  desconto: string
  unidade: string
  estoque: number
  reservadoQtd: number
}

type Order = {
  id: string
  numero: number
  status: string
  total: number
  data_entrega_prometida: string | null
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const today = () => new Date().toISOString().slice(0, 10)

export default function PedidoVendaCompleto() {
  const [empresa, setEmpresa] = useState('')
  const [sidebar, setSidebar] = useState(true)
  const [view, setView] = useState<'pedido' | 'clientes'>('pedido')

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [priceItems, setPriceItems] = useState<PriceItem[]>([])
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [client, setClient] = useState('')
  const [clientDoc, setClientDoc] = useState('')
  const [number, setNumber] = useState('')
  const [date, setDate] = useState(today())
  const [delivery, setDelivery] = useState('')
  const [pedidoCliente, setPedidoCliente] = useState('')
  const [condicaoPagamento, setCondicaoPagamento] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [viaEntrada, setViaEntrada] = useState('')
  const [cfop, setCfop] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [modalidadeFrete, setModalidadeFrete] = useState('')
  const [transportadoraId, setTransportadoraId] = useState('')
  const [transportadoraSearch, setTransportadoraSearch] = useState('')

  const [draft, setDraft] = useState({
    produto: '',
    codigoCliente: '',
    quantidade: '1',
    valor: '0',
    desconto: '0',
  })
  const [items, setItems] = useState<OrderItem[]>([])
  const [descontoPedido, setDescontoPedido] = useState('0')
  const [frete, setFrete] = useState('0')
  const [outrasDespesas, setOutrasDespesas] = useState('0')
  const [observacoes, setObservacoes] = useState('')

  const [busy, setBusy] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      throw company.error ?? new Error('Empresa não identificada.')
    }

    const empresaId = String(company.data)
    setEmpresa(empresaId)

    const [clientsResult, productsResult, pricesResult, transportResult, ordersResult] = await Promise.all([
      supabase
        .from('erp_clientes')
        .select('id,nome,documento,codigo,tabela_preco_id')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('erp_produtos')
        .select('id,codigo,nome,estoque_atual,preco_venda,unidade')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('codigo')
        .limit(2000),
      supabase
        .from('erp_tabelas_preco_itens')
        .select('tabela_preco_id,produto_id,preco')
        .eq('empresa_id', empresaId)
        .limit(10000),
      supabase
        .from('erp_transportadoras')
        .select('id,codigo,razao_social,ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('razao_social'),
      supabase
        .from('erp_pedidos_venda')
        .select('id,numero,status,total,data_entrega_prometida')
        .eq('empresa_id', empresaId)
        .order('numero', { ascending: false })
        .limit(100),
    ])

    for (const result of [clientsResult, productsResult, pricesResult, transportResult, ordersResult]) {
      if (result.error) throw result.error
    }

    const loadedClients = (clientsResult.data ?? []) as Client[]
    setClients(loadedClients)
    setProducts((productsResult.data ?? []) as Product[])
    setPriceItems((pricesResult.data ?? []) as PriceItem[])
    setTransportadoras((transportResult.data ?? []) as Transportadora[])
    setOrders((ordersResult.data ?? []) as Order[])
    setNumber(String(Number(ordersResult.data?.[0]?.numero ?? 0) + 1).padStart(6, '0'))

    const user = await supabase.auth.getUser()
    if (user.data.user) {
      const profile = await supabase
        .from('erp_usuarios')
        .select('nome')
        .eq('auth_user_id', user.data.user.id)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profile.data?.nome) setVendedor(profile.data.nome)
    }

    if (!client && loadedClients.length === 1) {
      setClient(loadedClients[0].id)
      setClientDoc(loadedClients[0].documento ?? '')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    if (requestedView === 'clientes') setView('clientes')
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar Vendas.')
    })
  }, [])

  const selectedClient = clients.find(item => item.id === client)
  const selectedProduct = products.find(item => item.id === draft.produto)

  const priceFor = (product: Product) => {
    if (!selectedClient?.tabela_preco_id) return product.preco_venda
    const tablePrice = priceItems.find(
      item => item.tabela_preco_id === selectedClient.tabela_preco_id && item.produto_id === product.id,
    )
    return tablePrice?.preco ?? product.preco_venda
  }

  const analyzed = useMemo(
    () =>
      items.map(item => {
        const disponivel = Math.max(item.estoque - item.reservadoQtd, 0)
        const reserva = Math.min(Number(item.quantidade), disponivel)
        return {
          ...item,
          disponivel,
          reserva,
          falta: Math.max(Number(item.quantidade) - disponivel, 0),
        }
      }),
    [items],
  )

  const totalItens = useMemo(
    () =>
      analyzed.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(item.quantidade) * Number(item.valor) - Number(item.desconto || 0),
            0,
          ),
        0,
      ),
    [analyzed],
  )

  const desconto = Math.min(Math.max(Number(descontoPedido) || 0, 0), totalItens)
  const valorFrete = Math.max(Number(frete) || 0, 0)
  const valorOutrasDespesas = Math.max(Number(outrasDespesas) || 0, 0)
  const total = Math.max(totalItens - desconto + valorFrete + valorOutrasDespesas, 0)
  const faltantes = analyzed.filter(item => item.falta > 0)
  const atendidos = analyzed.filter(item => item.falta === 0)

  const filteredTransportadoras = transportadoras.filter(item =>
    `${item.codigo} ${item.razao_social}`.toLowerCase().includes(transportadoraSearch.toLowerCase()),
  )

  const chooseClient = (selected: Client) => {
    setClient(selected.id)
    setClientDoc(selected.documento ?? '')
    setItems([])
    setDraft({ produto: '', codigoCliente: '', quantidade: '1', valor: '0', desconto: '0' })
  }

  const chooseProduct = (product: Product) => {
    setDraft(current => ({
      ...current,
      produto: product.id,
      valor: String(priceFor(product)),
    }))
  }

  const addItem = () => {
    if (!selectedProduct) return
    if (Number(draft.quantidade) <= 0) {
      setError('A quantidade deve ser maior que zero.')
      return
    }

    setError('')
    setItems(current => [
      ...current,
      {
        produto_id: selectedProduct.id,
        codigo: selectedProduct.codigo,
        codigoCliente: draft.codigoCliente.trim(),
        descricao: selectedProduct.nome,
        quantidade: draft.quantidade,
        valor: draft.valor || String(selectedProduct.preco_venda),
        desconto: draft.desconto || '0',
        unidade: selectedProduct.unidade || 'UN',
        estoque: Number(selectedProduct.estoque_atual || 0),
        reservadoQtd: 0,
      },
    ])

    setDraft({ produto: '', codigoCliente: '', quantidade: '1', valor: '0', desconto: '0' })
  }

  const removeItem = (index: number) => {
    setItems(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const cancel = () => {
    setItems([])
    setClient('')
    setClientDoc('')
    setDate(today())
    setDelivery('')
    setPedidoCliente('')
    setCondicaoPagamento('')
    setViaEntrada('')
    setCfop('')
    setFormaPagamento('')
    setModalidadeFrete('')
    setTransportadoraId('')
    setTransportadoraSearch('')
    setDescontoPedido('0')
    setFrete('0')
    setOutrasDespesas('0')
    setObservacoes('')
    setProcessed(false)
    setMessage('')
    setError('')
  }

  const finalize = async () => {
    if (!empresa || !client || !items.length) {
      setError('Cliente e pelo menos um item são obrigatórios.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase.rpc('erp_finalizar_pedido_venda', {
        p_cliente_id: client,
        p_desconto: desconto,
        p_itens: items.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor),
          desconto: Number(item.desconto) || 0,
          codigo_cliente: item.codigoCliente || null,
          codigo: item.codigo,
        })),
        p_data_entrada: date || null,
        p_data_entrega: delivery || null,
        p_pedido_cliente: pedidoCliente.trim() || null,
        p_observacoes: observacoes.trim() || null,
        p_condicao_pagamento: condicaoPagamento.trim() || null,
        p_vendedor_nome: vendedor.trim() || null,
        p_modalidade_frete: modalidadeFrete || null,
        p_transportadora_id: transportadoraId || null,
        p_valor_frete: valorFrete,
        p_valor_outras_despesas: valorOutrasDespesas,
        p_via_entrada: viaEntrada || null,
        p_cfop: cfop.trim() || null,
        p_forma_pagamento: formaPagamento || null,
      })

      if (result.error) throw result.error

      setProcessed(true)
      setMessage('Pedido finalizado com sucesso. O estoque disponível foi reservado e a necessidade líquida foi enviada ao fluxo do PCP.')
      await load()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Falha ao finalizar o pedido.')
    } finally {
      setBusy(false)
    }
  }

  const go = (path: string) => {
    window.location.href = path
  }

  return (
    <div className="pedido-page">
      <style>{`
        .pedido-page{min-height:100vh;background:#f4fbfd;color:#17333f;display:flex;font-family:inherit}
        .pedido-sidebar{width:228px;flex:0 0 228px;background:#fff;border-right:1px solid #c9dce3;display:flex;flex-direction:column;padding:12px;box-sizing:border-box}
        .pedido-brand{display:flex;align-items:center;gap:9px;padding:4px 6px 14px;border-bottom:1px solid #e1edf1;margin-bottom:10px}
        .pedido-brand img{width:36px;height:36px;object-fit:contain}.pedido-brand strong{display:block;font-size:14px;font-weight:600}.pedido-brand small{display:block;color:#68808b;font-size:9px;margin-top:2px}
        .pedido-label{font-size:9px;font-weight:600;letter-spacing:.1em;color:#2d7896;margin:7px 6px}
        .pedido-nav{width:100%;height:34px;border:0;background:transparent;border-radius:3px;color:#36525e;padding:0 8px;display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;font-size:12px;margin-bottom:2px}
        .pedido-nav:hover{background:#f2f8fa}.pedido-nav.active{background:#e7f5fa;color:#176487;font-weight:600;box-shadow:inset 3px 0 #2d8db8}.pedido-spacer{flex:1}
        .pedido-main{flex:1;min-width:0}.pedido-header{min-height:58px;background:#fff;border-bottom:1px solid #c9dce3;padding:7px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box}
        .pedido-heading{min-width:0}.pedido-heading span,.pedido-kicker{font-size:9px;font-weight:600;letter-spacing:.1em;color:#2d7896}.pedido-heading h1{font-size:17px;font-weight:600;line-height:1.15;margin:2px 0}.pedido-heading p{font-size:10px;color:#68808b;margin:0}
        .pedido-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.pedido-btn{height:30px;border:1px solid #bfd1d8;border-radius:3px;background:#fff;color:#17333f;padding:0 8px;display:inline-flex;align-items:center;gap:5px;font-size:11px;cursor:pointer}.pedido-btn.primary{background:#2d8db8;border-color:#2d8db8;color:#fff}.pedido-btn.danger{background:#fff5f5;border-color:#d8a8ad;color:#9b2525}.pedido-btn:disabled{opacity:.5;cursor:not-allowed}
        .pedido-content{max-width:1260px;margin:0 auto;padding:10px 14px 20px;width:100%;box-sizing:border-box}.pedido-card{background:#fff;border:1px solid #c9dce3;border-radius:3px;margin-top:7px;padding:10px 12px;box-shadow:0 1px 3px rgba(23,51,63,.03)}
        .pedido-card h2{font-size:14px;font-weight:600;margin:2px 0}.pedido-card p{font-size:10px;color:#5d717a;margin:0}.pedido-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;margin-top:8px;align-items:start}.pedido-field{grid-column:span 3;display:flex;flex-direction:column;gap:3px;min-width:0;font-size:10px;font-weight:500;color:#314a55}.pedido-field.span2{grid-column:span 6}.pedido-field.span4{grid-column:span 4}.pedido-field.span6{grid-column:span 6}.pedido-field.span12{grid-column:1/-1}
        .pedido-field input,.pedido-field select,.pedido-field textarea{width:100%;box-sizing:border-box;border:1px solid #bfd1d8;border-radius:3px;background:#fff;color:#17333f;font-size:11px;font-weight:400}.pedido-field input,.pedido-field select{height:32px;padding:0 7px}.pedido-field textarea{min-height:62px;padding:7px;resize:vertical}.pedido-field input[readonly]{background:#f5f8f9;color:#536b76}
        .pedido-item-entry{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:6px;align-items:end;margin-top:8px}.pedido-lookup{min-width:0}.pedido-mini{font-size:9px;color:#68808b;margin-top:2px}.pedido-table-wrap{overflow:auto;border:1px solid #d5e2e6;border-radius:3px;margin-top:9px}.pedido-table{width:100%;min-width:950px;border-collapse:collapse}.pedido-table th{background:#eaf2f5;border-bottom:1px solid #c9dce3;text-align:left;padding:6px;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}.pedido-table td{border-bottom:1px solid #edf3f5;padding:6px;font-size:10px;white-space:nowrap}.pedido-table td.wrap{white-space:normal}.pedido-actions{display:flex;gap:3px;align-items:center}.pedido-icon{width:27px;height:27px;border:1px solid #bfd1d8;background:#fff;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#35515d}.pedido-icon.danger{color:#9b2525;border-color:#dfb8bc}
        .pedido-status{display:inline-flex;padding:3px 6px;border-radius:3px;font-size:9px;font-weight:600}.pedido-status.ok{background:#e8f7f0;color:#287a5c}.pedido-status.warn{background:#fff2e5;color:#b45b12}
        .pedido-summary{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}.pedido-total{font-size:18px;font-weight:600;color:#17445a}.pedido-note{font-size:10px;color:#68808b}.pedido-alert{padding:8px 10px;border:1px solid #e2b9b9;background:#fff2f2;color:#9b2525;border-radius:3px;font-size:11px;margin-bottom:7px}.pedido-success{padding:8px 10px;border:1px solid #b9dfcd;background:#e8f7f0;color:#287a5c;border-radius:3px;font-size:11px;margin-bottom:7px}
        .pedido-result{border:1px solid #b9dfcd;background:#f2fbf6}.pedido-result h2{color:#287a5c}.pedido-filter{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        @media(max-width:1000px){.pedido-sidebar{width:210px;flex-basis:210px}.pedido-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.pedido-field,.pedido-field.span2,.pedido-field.span4{grid-column:span 3}.pedido-field.span6,.pedido-field.span12{grid-column:1/-1}.pedido-item-entry{grid-template-columns:1fr 1fr 1fr}.pedido-item-entry .full{grid-column:1/-1}}
        @media(max-width:720px){.pedido-sidebar{position:fixed;z-index:9999;top:0;bottom:0;left:0;transform:translateX(-100%);transition:.18s}.pedido-sidebar.open{transform:translateX(0)}.pedido-header{align-items:flex-start}.pedido-grid{grid-template-columns:1fr}.pedido-field,.pedido-field.span2,.pedido-field.span4,.pedido-field.span6,.pedido-field.span12{grid-column:1/-1}.pedido-item-entry{grid-template-columns:1fr}.pedido-content{padding:8px}.pedido-toolbar .pedido-btn{height:34px}}
      `}</style>

      {sidebar && (
        <aside className="pedido-sidebar open">
          <div className="pedido-brand">
            <img src="/logo/sgq-erp.png" alt="SGQ ERP" />
            <div><strong>ERP INDUSTRIAL</strong><small>MÓDULO DE VENDAS</small></div>
          </div>
          <div className="pedido-label">VENDAS</div>
          <button className={`pedido-nav ${view === 'pedido' ? 'active' : ''}`} onClick={() => setView('pedido')}><Plus size={16} /> Novo Pedido</button>
          <button className="pedido-nav" onClick={() => document.getElementById('carteira')?.scrollIntoView({ behavior: 'smooth' })}><ClipboardList size={16} /> Carteira de Pedidos</button>
          <button className={`pedido-nav ${view === 'clientes' ? 'active' : ''}`} onClick={() => setView('clientes')}><Users size={16} /> Cadastro de Clientes</button>
          <div className="pedido-spacer" />
          <button className="pedido-nav" onClick={() => go('/configuracoes-adm')}><Settings size={16} /> Configurações</button>
        </aside>
      )}

      <section className="pedido-main">
        <header className="pedido-header">
          <div className="pedido-heading">
            <div className="pedido-toolbar">
              <button className="pedido-icon" onClick={() => setSidebar(value => !value)} title="Menu">
                {sidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
              <span>ERP INDUSTRIAL • VENDAS</span>
            </div>
            <h1>{view === 'clientes' ? 'Cadastro de Clientes' : 'Novo Pedido de Venda'}</h1>
            <p>{view === 'clientes' ? 'Cadastro comercial sem alterar a estrutura de pedidos.' : 'Entrada → itens → estoque → condições → gravação'}</p>
          </div>
          <div className="pedido-toolbar">
            <button className="pedido-btn" onClick={() => go('/tablet/dashboard')}><Tablet size={14} /> TABLET</button>
            <button className="pedido-btn" onClick={() => void load()} disabled={busy}><RefreshCw size={14} /> Atualizar</button>
            <button className="pedido-btn danger" onClick={() => void supabase.auth.signOut().then(() => window.location.replace('/login'))}><LogOut size={14} /> Sair</button>
          </div>
        </header>

        <main className="pedido-content">
          {error && <div className="pedido-alert">{error}</div>}
          {message && <div className="pedido-success">{message}</div>}

          {view === 'clientes' ? (
            <section className="pedido-card">
              <div className="pedido-kicker">CADASTRO</div>
              <h2>Novo cliente</h2>
              <p>Cadastro real por empresa. Esta reconstrução mantém o formulário compacto e separado do fluxo de pedido.</p>
              <div className="pedido-grid">
                <label className="pedido-field span4">Código<input placeholder="Código do cliente" /></label>
                <label className="pedido-field span4">Razão Social<input placeholder="Razão Social" /></label>
                <label className="pedido-field span4">CNPJ / CPF<input placeholder="CNPJ / CPF" /></label>
              </div>
              <div className="pedido-summary">
                <span className="pedido-note">O CRUD de clientes existente permanece fora desta reconstrução visual do pedido.</span>
                <button className="pedido-btn" onClick={() => setView('pedido')}>Voltar ao Pedido</button>
              </div>
            </section>
          ) : (
            <>
              {!processed && (
                <section className="pedido-card">
                  <div className="pedido-kicker">1. IDENTIFICAÇÃO DO PEDIDO</div>
                  <h2>Entrada do pedido de venda</h2>
                  <p>Campos automáticos ficam somente para leitura. O número definitivo é gerado pelo banco.</p>

                  <div className="pedido-grid">
                    <label className="pedido-field">Nº Pedido<input value={number ? `Próximo: ${number}` : 'Gerado ao salvar'} readOnly /></label>
                    <label className="pedido-field">Data Entrada<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
                    <div className="pedido-field span2">
                      <EntityCodeLookup
                        label="Cliente"
                        value={client}
                        records={clients}
                        required
                        compact
                        onChange={setClient}
                        onSelect={record => chooseClient(record as Client)}
                      />
                    </div>
                    <label className="pedido-field">CNPJ / CPF<input value={clientDoc} readOnly /></label>
                    <label className="pedido-field">Data Entrega<input type="date" value={delivery} onChange={event => setDelivery(event.target.value)} /></label>
                    <label className="pedido-field span2">Pedido / Referência do Cliente<input value={pedidoCliente} onChange={event => setPedidoCliente(event.target.value)} maxLength={120} /></label>
                    <label className="pedido-field">Condição de Pagamento<input value={condicaoPagamento} onChange={event => setCondicaoPagamento(event.target.value)} placeholder="Ex.: 28/42/56" /></label>
                    <label className="pedido-field">Vendedor<input value={vendedor} onChange={event => setVendedor(event.target.value)} /></label>
                    <label className="pedido-field">Via de Entrada<select value={viaEntrada} onChange={event => setViaEntrada(event.target.value)}><option value="">Selecionar</option><option>E-mail</option><option>WhatsApp</option><option>Portal</option><option>Representante</option></select></label>
                    <label className="pedido-field">CFOP<input value={cfop} onChange={event => setCfop(event.target.value)} placeholder="5.101" /></label>
                    <label className="pedido-field">Forma de Pagamento<select value={formaPagamento} onChange={event => setFormaPagamento(event.target.value)}><option value="">Selecionar</option><option>Boleto</option><option>PIX</option><option>Depósito</option><option>Cartão</option></select></label>
                    <label className="pedido-field">Modalidade Frete<select value={modalidadeFrete} onChange={event => setModalidadeFrete(event.target.value)}><option value="">Selecionar</option><option>CIF</option><option>FOB</option><option>Retirada</option></select></label>
                    <div className="pedido-field span2">
                      <label>Transportadora</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 4 }}>
                        <input value={transportadoraSearch} onChange={event => setTransportadoraSearch(event.target.value)} placeholder="Pesquisar" />
                        <select value={transportadoraId} onChange={event => setTransportadoraId(event.target.value)}>
                          <option value="">Selecionar</option>
                          {filteredTransportadoras.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.razao_social}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {!processed && (
                <section className="pedido-card">
                  <div className="pedido-kicker">2. ITENS DO PEDIDO</div>
                  <h2>Itens comerciais</h2>
                  <p>Produto, código do cliente, quantidade e preço permanecem na mesma linha para reduzir altura e deslocamento.</p>

                  <div className="pedido-item-entry">
                    <div className="pedido-lookup">
                      <EntityCodeLookup
                        label="Código Interno / Produto"
                        value={draft.produto}
                        records={products}
                        required
                        compact
                        onChange={value => setDraft(current => ({ ...current, produto: value }))}
                        onSelect={record => chooseProduct(record as Product)}
                      />
                    </div>
                    <label className="pedido-field">Cód. Cliente<input value={draft.codigoCliente} onChange={event => setDraft(current => ({ ...current, codigoCliente: event.target.value }))} /></label>
                    <label className="pedido-field">Quantidade<input type="number" min="1" value={draft.quantidade} onChange={event => setDraft(current => ({ ...current, quantidade: event.target.value }))} /></label>
                    <label className="pedido-field">Valor Unitário<input type="number" min="0" step="0.01" value={draft.valor} onChange={event => setDraft(current => ({ ...current, valor: event.target.value }))} /></label>
                    <label className="pedido-field">Desconto<input type="number" min="0" step="0.01" value={draft.desconto} onChange={event => setDraft(current => ({ ...current, desconto: event.target.value }))} /></label>
                    <button type="button" className="pedido-btn primary" onClick={addItem} disabled={!selectedProduct} title="Adicionar item"><Plus size={14} /> Adicionar</button>
                  </div>

                  <div className="pedido-table-wrap">
                    <table className="pedido-table">
                      <thead><tr><th>Código</th><th>Cód. Cliente</th><th>Descrição</th><th>Qtd.</th><th>UN</th><th>Preço</th><th>Desc.</th><th>Total</th><th>Estoque</th><th>Disponível</th><th>Status</th><th>Destino</th><th /></tr></thead>
                      <tbody>
                        {analyzed.map((item, index) => (
                          <tr key={`${item.produto_id}-${index}`}>
                            <td><b>{item.codigo}</b></td>
                            <td>{item.codigoCliente || '—'}</td>
                            <td className="wrap">{item.descricao}</td>
                            <td>{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                            <td>{item.unidade}</td>
                            <td>{money(Number(item.valor))}</td>
                            <td>{money(Number(item.desconto) || 0)}</td>
                            <td>{money(Math.max(Number(item.quantidade) * Number(item.valor) - Number(item.desconto || 0), 0))}</td>
                            <td>{item.estoque.toLocaleString('pt-BR')}</td>
                            <td>{item.disponivel.toLocaleString('pt-BR')}</td>
                            <td><span className={`pedido-status ${item.falta ? 'warn' : 'ok'}`}>{item.falta ? 'FALTA' : 'OK'}</span></td>
                            <td><b>{item.falta ? `Produzir ${item.falta}` : 'Reservar'}</b></td>
                            <td><button className="pedido-icon danger" onClick={() => removeItem(index)} title="Excluir item"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                        {!items.length && <tr><td colSpan={13}>Nenhum item lançado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {!processed && (
                <section className="pedido-card">
                  <div className="pedido-kicker">3. CONDIÇÕES E FINALIZAÇÃO</div>
                  <div className="pedido-grid">
                    <label className="pedido-field">Desconto Pedido<input type="number" min="0" step="0.01" value={descontoPedido} onChange={event => setDescontoPedido(event.target.value)} /></label>
                    <label className="pedido-field">Frete<input type="number" min="0" step="0.01" value={frete} onChange={event => setFrete(event.target.value)} /></label>
                    <label className="pedido-field">Outras Despesas<input type="number" min="0" step="0.01" value={outrasDespesas} onChange={event => setOutrasDespesas(event.target.value)} /></label>
                    <label className="pedido-field span6">Observações<textarea value={observacoes} onChange={event => setObservacoes(event.target.value)} maxLength={2000} /></label>
                    <div className="pedido-field"><span>Total do Pedido</span><strong className="pedido-total">{money(total)}</strong><span className="pedido-note">Itens {items.length} • Subtotal {money(totalItens)} • Desconto {money(desconto)} • Frete {money(valorFrete)}</span></div>
                  </div>
                  <div className="pedido-summary">
                    <div><span className="pedido-note">{atendidos.length} item(ns) atendido(s) por estoque • {faltantes.length} item(ns) com necessidade líquida para PCP</span></div>
                    <div className="pedido-toolbar">
                      <button className="pedido-btn danger" onClick={cancel}>Cancelar</button>
                      <button className="pedido-btn primary" disabled={busy || !items.length} onClick={() => void finalize()}><Save size={14} /> Finalizar Pedido</button>
                    </div>
                  </div>
                </section>
              )}

              {processed && (
                <section className="pedido-card pedido-result">
                  <div className="pedido-kicker">PEDIDO GRAVADO</div>
                  <h2>Pedido salvo com sucesso</h2>
                  <p>{message}</p>
                  <div className="pedido-table-wrap">
                    <table className="pedido-table">
                      <thead><tr><th>Item</th><th>Qtd.</th><th>Reserva</th><th>Produção</th><th>Status</th></tr></thead>
                      <tbody>{analyzed.map(item => <tr key={item.produto_id}><td>{item.codigo} — {item.descricao}</td><td>{Number(item.quantidade).toLocaleString('pt-BR')}</td><td>{item.reserva.toLocaleString('pt-BR')}</td><td>{item.falta.toLocaleString('pt-BR')}</td><td><span className={`pedido-status ${item.falta ? 'warn' : 'ok'}`}>{item.falta ? 'PCP PENDENTE' : 'RESERVADO'}</span></td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className="pedido-summary">
                    <button className="pedido-btn" onClick={cancel}>Novo Pedido</button>
                    {faltantes.length > 0 && <button className="pedido-btn primary" onClick={() => go('/pcp')}><Factory size={14} /> Abrir PCP</button>}
                  </div>
                </section>
              )}

              <section className="pedido-card" id="carteira">
                <div className="pedido-kicker">CARTEIRA DE PEDIDOS</div>
                <h2>Pedidos recentes</h2>
                <div className="pedido-table-wrap">
                  <table className="pedido-table">
                    <thead><tr><th>Pedido</th><th>Status</th><th>Total</th><th>Entrega</th></tr></thead>
                    <tbody>
                      {orders.map(order => <tr key={order.id}><td>PV-{order.numero}</td><td>{order.status}</td><td>{money(Number(order.total))}</td><td>{order.data_entrega_prometida || '—'}</td></tr>)}
                      {!orders.length && <tr><td colSpan={4}>Nenhum pedido cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </section>
    </div>
  )
}
