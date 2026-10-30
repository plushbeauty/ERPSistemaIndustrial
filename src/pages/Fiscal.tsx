/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:06 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-011
 * Alterações: Reconstrução integral da Central Fiscal após JSX corrompido;
 *            fechamento de tags, tipagem estrita, modo claro clínico,
 *            grade responsiva e transmissão NF-e por Edge Function real.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

// Atualizado · Padrão Premium · 26/10/2026 — Central Fiscal em cinco abas.
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileCheck2, FileText, Landmark, RefreshCw, Receipt, Search, ShieldCheck, Send } from 'lucide-react'
import { supabase, invokeSecureEdgeFunction } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'

type Tab = 'liberacao' | 'notas' | 'receber' | 'pagar' | 'relatorios'
type Order = { id: string; numero: number; cliente_id: string; status: string; total: number }
type Item = { id: string; pedido_id: string; produto_id: string | null; descricao: string; quantidade: number; valor_unitario: number; total: number }
type Doc = { id: string; numero: number | null; serie: number; status: string; valor_total: number; data_emissao: string | null; destinatario_nome: string | null }
type Conta = { id: string; descricao: string; documento: string | null; valor: number; vencimento: string; status: string }
type NfeEmissionResponse = { ok?: boolean; status?: string; invoiceId?: string; error?: string; chave_acesso?: string; protocolo_autorizacao?: string }
type ReportTab = 'faturamento' | 'receber' | 'pagar'
type TabDefinition = { id: Tab; label: string; icon: typeof ShieldCheck }

const money = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))

function fiscalStatusClass(value: string): string {
  const status = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/(autoriz|conclu|recebid|liquid|pago|ativa|ativo)/.test(status)) return 'fiscal-status fiscal-status-success'
  if (/(cancel|rejeit|erro|bloque|denegad)/.test(status)) return 'fiscal-status fiscal-status-danger'
  if (/(rascunho|process|penden|aguard|abert|analise)/.test(status)) return 'fiscal-status fiscal-status-pending'
  return 'fiscal-status fiscal-status-neutral'
}

const tabs: TabDefinition[] = [
  { id: 'liberacao', label: 'Liberação para NF', icon: ShieldCheck },
  { id: 'notas', label: 'Notas Fiscais', icon: FileCheck2 },
  { id: 'receber', label: 'Contas a Receber', icon: Receipt },
  { id: 'pagar', label: 'Contas a Pagar', icon: Landmark },
  { id: 'relatorios', label: 'Relatórios Fiscais', icon: FileText }
]

export default function Fiscal() {
  const [tab, setTab] = useState<Tab>('liberacao')
  const [reportTab, setReportTab] = useState<ReportTab>('faturamento')
  const [orders, setOrders] = useState<Order[]>([])
  const [companyId, setCompanyId] = useState('')
  const [ordersPage, setOrdersPage] = useState(1)
  const [documentsPage, setDocumentsPage] = useState(1)
  const [accountsPage, setAccountsPage] = useState(1)
  const [items, setItems] = useState<Item[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [receber, setReceber] = useState<Conta[]>([])
  const [pagar, setPagar] = useState<Conta[]>([])
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const currentCompanyId = String(company.data)
      const [orderRows, documentRows, receivableRows, payableRows] = await Promise.all([
        fetchAllPages<Order>((from, to) => supabase.from('erp_pedidos_venda')
          .select('id,numero,cliente_id,status,total', { count: 'exact' })
          .eq('empresa_id', currentCompanyId).order('numero', { ascending: false }).range(from, to)),
        fetchAllPages<Doc>((from, to) => supabase.from('erp_documentos_fiscais')
          .select('id,numero,serie,status,valor_total,data_emissao,destinatario_nome', { count: 'exact' })
          .eq('empresa_id', currentCompanyId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Conta>((from, to) => supabase.from('erp_contas_receber')
          .select('id,descricao,documento,valor,vencimento,status', { count: 'exact' })
          .eq('empresa_id', currentCompanyId).order('vencimento').range(from, to)),
        fetchAllPages<Conta>((from, to) => supabase.from('erp_contas_pagar')
          .select('id,descricao,documento,valor,vencimento,status', { count: 'exact' })
          .eq('empresa_id', currentCompanyId).order('vencimento').range(from, to))
      ])

      setCompanyId(currentCompanyId)
      setOrders(orderRows)
      setDocs(documentRows)
      setReceber(receivableRows)
      setPagar(payableRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os módulos fiscais.')
    } finally {
      setBusy(false)
    }
  }

  async function openOrder(id: string): Promise<void> {
    setSelected(id)
    setMessage('')
    setError('')
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const rows = await fetchAllPages<Item>((from, to) => supabase
        .from('erp_pedidos_venda_itens')
        .select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total', { count: 'exact' })
        .eq('empresa_id', companyId).eq('pedido_id', id).order('id').range(from, to))
      setItems(rows)
    } catch (cause) {
      setItems([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os itens do pedido.')
    }
  }

  async function release(item: Item): Promise<void> {
    const value = Number(qty[item.id] ?? 0)
    if (!Number.isFinite(value) || value <= 0 || value > item.quantidade) {
      setError('Informe uma quantidade válida, maior que zero e não superior ao saldo do item.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_liberar_item_fiscal', {
        p_pedido_item_id: item.id,
        p_quantidade: value,
        p_tipo: value === item.quantidade ? 'total' : 'parcial',
        p_observacao: 'Liberação homologada pelo setor Fiscal'
      })
      if (rpcError) throw rpcError

      const result = data as { saldo_restante?: number } | null
      const saldo = Number(result?.saldo_restante ?? 0)
      setMessage('Item liberado: ' + value.toLocaleString('pt-BR') + '. Saldo pendente: ' + saldo.toLocaleString('pt-BR') + '.')
      setQty(previous => ({ ...previous, [item.id]: '' }))
      await load()
      if (selected) await openOrder(selected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a liberação fiscal.')
    } finally {
      setBusy(false)
    }
  }

  async function emitNfe(doc: Doc): Promise<void> {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: invokeError } = await invokeSecureEdgeFunction<NfeEmissionResponse>('emitir-nfe', { documento_id: doc.id })
      if (invokeError) throw invokeError
      if (!data) throw new Error('O integrador não retornou um resultado legível.')
      if (data.status === 'Processando') {
        setMessage(data.error || 'Solicitação aceita pelo integrador e ainda em processamento. Não há confirmação de autorização.')
      } else {
        if (data.ok !== true) throw new Error(data.error || 'O integrador não confirmou a solicitação fiscal.')
        if (data.status !== 'Autorizada') throw new Error('O integrador retornou um estado fiscal não reconhecido; a autorização não foi confirmada.')
        const protocol = data.protocolo_autorizacao?.trim()
        if (!protocol) throw new Error('O retorno não contém protocolo de autorização; confira o estado e os documentos na carteira fiscal.')
        setMessage(`NF-e autorizada com protocolo ${protocol}.`)
      }
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao transmitir a NF-e.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredOrders = useMemo(
    () => orders.filter(order => String(order.numero).includes(query) || order.status.toLowerCase().includes(query.toLowerCase())),
    [orders, query]
  )
  const orderPageSize = 25
  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
  const visibleOrders = filteredOrders.slice((ordersPage - 1) * orderPageSize, ordersPage * orderPageSize)
  useEffect(() => { setOrdersPage(current => Math.min(current, orderPageCount)) }, [orderPageCount])
  const documentsPageCount = Math.max(1, Math.ceil(docs.length / orderPageSize))
  const visibleDocuments = docs.slice((documentsPage - 1) * orderPageSize, documentsPage * orderPageSize)
  const currentAccounts = tab === 'receber' ? receber : pagar
  const accountsPageCount = Math.max(1, Math.ceil(currentAccounts.length / orderPageSize))
  const visibleAccounts = currentAccounts.slice((accountsPage - 1) * orderPageSize, accountsPage * orderPageSize)
  useEffect(() => { setDocumentsPage(current => Math.min(current, documentsPageCount)) }, [documentsPageCount])
  useEffect(() => { setAccountsPage(current => Math.min(current, accountsPageCount)) }, [accountsPageCount, tab])

  const report = useMemo(() => ({
    nfTotal: docs.reduce((sum, doc) => sum + Number(doc.valor_total || 0), 0),
    nfCount: docs.length,
    receber: receber.reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    pagar: pagar.reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    abertos: orders.filter(order => !['concluido', 'cancelado'].includes(order.status.toLowerCase())).length
  }), [docs, receber, pagar, orders])

  return (
    <div className="fiscal-shell"><FiscalSidebar/><main className="erp-dense fiscal-workspace">
      <header className="fiscal-hero">
        <div className="fiscal-hero-copy">
          <span>ERP INDUSTRIAL · CONTROLE FISCAL</span>
          <h1>Central Fiscal Integrada</h1>
          <p>Liberação para faturamento, monitoramento de notas fiscais, contas a pagar, receber e relatórios consolidados.</p>
          <small>Atualizado · Padrão Premium · 26/10/2026</small>
        </div>
        <Receipt className="fiscal-hero-icon" size={40} aria-hidden="true" />
      </header>

      <div className="fiscal-actionbar" aria-label="Ações da Central Fiscal">
        <button className="fiscal-button fiscal-button-secondary" type="button" onClick={() => { window.location.href = '/erp-industrial' }}>
          <ArrowLeft size={15} /> Voltar ao Painel
        </button>
        <button className="fiscal-button fiscal-button-primary" type="button" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {busy ? 'Sincronizando...' : 'Atualizar dados'}
        </button>
      </div>

      {(message || error) && (
        <div role={error ? 'alert' : 'status'} className={error ? 'fiscal-message fiscal-message-error' : 'fiscal-message fiscal-message-success'}>
          {error || message}
        </div>
      )}

      <nav className="fiscal-tabs" role="tablist" aria-label="Seções da Central Fiscal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button" role="tab" aria-selected={tab === id}
            className={'fiscal-tab' + (tab === id ? ' active' : '')}
            onClick={() => setTab(id)}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'liberacao' && (
        <section className="fiscal-release-section" role="tabpanel" aria-label="Liberação para faturamento">
          <div className="fiscal-stats">
            {[
              ['Carteira de Pedidos', String(filteredOrders.length)],
              ['Itens Carregados', String(items.length)],
              ['Critério Liberação', 'Total / Parcial'],
              ['Rastreabilidade', 'Saldo por Item']
            ].map(([title, value]) => (
              <article key={title} className="fiscal-stat-card">
                <span>{title}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>

          <div className="fiscal-release-grid">
            <div className="fiscal-panel fiscal-release-panel">
              <div className="fiscal-panel-heading">
                <div>
                  <h2>Carteira de Pedidos de Venda</h2>
                  <p>Selecione um pedido para conferir os saldos que podem ser liberados.</p>
                </div>
                <label className="fiscal-search">
                  <Search size={17} className="text-slate-400" />
                  <input aria-label="Filtrar pedidos fiscais por número ou status" className="fiscal-input" placeholder="Pedido ou status..." value={query} onChange={event => { setQuery(event.target.value); setOrdersPage(1) }} />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="fiscal-table">
                  <thead>
                    <tr>
                      <th>Número Pedido</th>
                      <th>Status Comercial</th>
                      <th className="numeric">Valor Líquido</th>
                      <th className="center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map(order => (
                      <tr key={order.id} className={selected === order.id ? 'selected' : ''}>
                        <td className="link-value">#{order.numero}</td>
                        <td><span className={fiscalStatusClass(order.status)}>{order.status}</span></td>
                        <td className="numeric">{money(order.total)}</td>
                        <td className="center">
                          <button type="button" className="fiscal-button fiscal-button-secondary fiscal-button-small" onClick={() => void openOrder(order.id)}>
                            Conferir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredOrders.length && <p className="fiscal-empty">Nenhum pedido real encontrado para o filtro informado.</p>}
                {filteredOrders.length > orderPageSize && (
                  <nav aria-label="Paginação da carteira fiscal de pedidos" className="fiscal-pagination">
                    <span aria-live="polite">Exibindo {(ordersPage - 1) * orderPageSize + 1}–{Math.min(ordersPage * orderPageSize, filteredOrders.length)} de {filteredOrders.length}</span>
                    <div className="flex gap-2">
                      <button type="button" className="fiscal-button fiscal-button-secondary fiscal-button-small" disabled={ordersPage === 1} onClick={() => setOrdersPage(page => Math.max(1, page - 1))}>Anterior</button>
                      <span className="self-center">Página {ordersPage} de {orderPageCount}</span>
                      <button type="button" className="fiscal-button fiscal-button-secondary fiscal-button-small" disabled={ordersPage === orderPageCount} onClick={() => setOrdersPage(page => Math.min(orderPageCount, page + 1))}>Próxima</button>
                    </div>
                  </nav>
                )}
              </div>
            </div>

            <aside className="fiscal-panel fiscal-items-panel">
              <div className="fiscal-panel-heading"><h2>Itens do Pedido</h2>
              <p>Pedido selecionado: {selected ? '#' + (orders.find(order => order.id === selected)?.numero ?? '') : '—'}</p></div>
              <div className="fiscal-item-list">
                {items.map(item => (
                  <article key={item.id} className="fiscal-item-card">
                    <strong>{item.descricao}</strong>
                    <span>Quantidade: {item.quantidade} • Total: {money(item.total)}</span>
                    <div className="fiscal-release-form">
                      <label>Qtd. a liberar
                        <input
                          type="number"
                          min="0"
                          max={item.quantidade}
                          step="any"
                          className="fiscal-input"
                          value={qty[item.id] ?? ''}
                          onChange={event => setQty(previous => ({ ...previous, [item.id]: event.target.value }))}
                          placeholder="0"
                        />
                      </label>
                      <button type="button" className="fiscal-button fiscal-button-success" disabled={busy} onClick={() => void release(item)}>
                        <CheckCircle2 size={17} /> Liberar
                      </button>
                    </div>
                  </article>
                ))}
                {!items.length && <p className="fiscal-empty">Selecione um pedido na tabela para detalhar os itens.</p>}
              </div>
            </aside>
          </div>
        </section>
      )}

      {tab === 'notas' && (
        <section className="fiscal-panel" role="tabpanel" aria-label="Notas fiscais">
          <div className="fiscal-panel-heading">
            <div>
              <h2>Notas Fiscais</h2>
              <p>Documentos fiscais reais da empresa e transmissão pela Edge Function protegida.</p>
            </div>
            <span className="fiscal-result-count">{docs.length} documentos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="fiscal-table">
              <thead><tr><th>Número</th><th>Destinatário</th><th>Emissão</th><th>Status</th><th className="numeric">Valor</th><th className="center">Ação</th></tr></thead>
              <tbody>
                {visibleDocuments.map(doc => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="link-value">{doc.numero ?? '—'} / {doc.serie}</td>
                    <td>{doc.destinatario_nome ?? '—'}</td>
                    <td>{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td><span className={fiscalStatusClass(doc.status)}>{doc.status}</span></td>
                    <td className="numeric">{money(doc.valor_total)}</td>
                    <td className="center">
                      <button type="button" className="fiscal-button fiscal-button-primary fiscal-button-small" disabled={busy || doc.status !== 'Rascunho'} onClick={() => void emitNfe(doc)}>
                        <Send size={16} /> {doc.status === 'Rascunho' ? 'Transmitir NF-e' : 'Indisponível neste status'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!docs.length && <p className="fiscal-empty">Nenhum documento fiscal real encontrado.</p>}
            <FiscalPagination page={documentsPage} pageCount={documentsPageCount} total={docs.length} pageSize={orderPageSize} label="notas fiscais" onChange={setDocumentsPage}/>
          </div>
        </section>
      )}

      {(tab === 'receber' || tab === 'pagar') && (
        <section className="fiscal-panel" role="tabpanel" aria-label={tab === 'receber' ? 'Contas a receber' : 'Contas a pagar'}>
          <div className="fiscal-panel-heading"><h2>{tab === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}</h2><span className="fiscal-result-count">{currentAccounts.length} títulos</span></div>
          <div className="mt-5 overflow-x-auto">
            <table className="fiscal-table">
              <thead><tr><th>Descrição</th><th>Documento</th><th>Vencimento</th><th>Status</th><th className="numeric">Valor</th></tr></thead>
              <tbody>
                {visibleAccounts.map(conta => (
                  <tr key={conta.id} className="border-b border-slate-100">
                    <td>{conta.descricao}</td>
                    <td>{conta.documento ?? '—'}</td>
                    <td>{new Date(conta.vencimento).toLocaleDateString('pt-BR')}</td>
                    <td><span className={fiscalStatusClass(conta.status)}>{conta.status}</span></td>
                    <td className="numeric">{money(conta.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <FiscalPagination page={accountsPage} pageCount={accountsPageCount} total={currentAccounts.length} pageSize={orderPageSize} label={tab === 'receber' ? 'contas a receber' : 'contas a pagar'} onChange={setAccountsPage}/>
          </div>
        </section>
      )}

      {tab === 'relatorios' && (
        <section className="fiscal-section-space" role="tabpanel" aria-label="Relatórios fiscais">
          <nav className="fiscal-report-tabs" role="tablist" aria-label="Tipo de relatório">
            {([
              ['faturamento', 'Faturamento'],
              ['receber', 'Recebimentos'],
              ['pagar', 'Pagamentos']
            ] as Array<[ReportTab, string]>).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={reportTab === id} className={'fiscal-report-tab' + (reportTab === id ? ' active' : '')} onClick={() => setReportTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="fiscal-stats">
            <article className="fiscal-stat-card"><span>NF-e monitoradas</span><strong>{report.nfCount}</strong></article>
            <article className="fiscal-stat-card"><span>Valor NF-e</span><strong>{money(report.nfTotal)}</strong></article>
            <article className="fiscal-stat-card"><span>A receber</span><strong>{money(report.receber)}</strong></article>
            <article className="fiscal-stat-card"><span>A pagar</span><strong>{money(report.pagar)}</strong></article>
          </div>
          <div className="fiscal-panel">
            <h2>{reportTab === 'faturamento' ? 'Faturamento fiscal' : reportTab === 'receber' ? 'Recebimentos' : 'Pagamentos'}</h2>
            <p>Dados consolidados diretamente das tabelas fiscais reais. Pedidos ainda abertos: <strong>{report.abertos}</strong>.</p>
          </div>
        </section>
      )}
    <style>{`
      .fiscal-shell{min-height:100vh;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}
      .fiscal-workspace{width:min(100%,1640px);min-height:calc(100vh - 36px);margin:0 auto;padding:18px 22px 32px;font-size:12px;color:#0f172a}
      .fiscal-hero{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:132px;overflow:hidden;padding:20px 26px;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}
      .fiscal-hero:after{position:absolute;right:8%;top:-105px;width:260px;height:260px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 28px rgba(255,255,255,.04),0 0 0 58px rgba(255,255,255,.025);content:"";pointer-events:none}
      .fiscal-hero-copy{position:relative;z-index:1;max-width:860px}.fiscal-hero-copy>span{color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em}.fiscal-hero h1{margin:7px 0 5px;color:#fff;font-size:25px;font-weight:800;line-height:1.2;letter-spacing:-.02em}.fiscal-hero p{margin:0;color:#e1edf9;font-size:12px;line-height:1.55}.fiscal-hero small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#f8fafc;font-size:10px;font-weight:700}.fiscal-hero-icon{position:relative;z-index:1;flex:none;margin:0 22px;color:#dbeafe}
      .fiscal-actionbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.045)}
      .fiscal-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 13px;border:1px solid transparent;border-radius:8px;font-size:11px;font-weight:750;line-height:1;white-space:nowrap;cursor:pointer;transition:transform .14s,box-shadow .14s,background .14s}
      .fiscal-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 3px 8px rgba(15,23,42,.13)}.fiscal-button:active:not(:disabled){transform:translateY(1px);box-shadow:none}.fiscal-button:disabled{cursor:not-allowed;opacity:.48}.fiscal-button-primary{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 0 #173f91,0 5px 9px rgba(29,78,216,.18)}.fiscal-button-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.fiscal-button-success{background:linear-gradient(180deg,#16a36a,#128253);color:#fff;box-shadow:0 3px 0 #0d6240}.fiscal-button-small{height:32px;min-height:32px;padding:0 10px;font-size:10px}
      .fiscal-message{margin:10px 0;padding:10px 13px;border:1px solid;border-radius:9px;font-size:12px;font-weight:650;line-height:1.45}.fiscal-message-error{border-color:#fecaca;background:#fff1f2;color:#b42318}.fiscal-message-success{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
      .fiscal-tabs{display:flex;align-items:center;gap:6px;overflow-x:auto;margin:12px 0;padding:7px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.04)}.fiscal-tab{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;height:36px;min-height:36px;padding:0 13px;border:0;border-radius:8px;background:transparent;color:#52677f;font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer}.fiscal-tab:hover{background:#f1f5f9}.fiscal-tab.active{background:#0b2545;color:#fff;box-shadow:0 2px 5px rgba(11,37,69,.2)}
      .fiscal-release-section,.fiscal-section-space{display:grid;gap:14px}.fiscal-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.fiscal-stat-card{display:flex;min-width:0;min-height:90px;flex-direction:column;justify-content:center;padding:14px 16px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.fiscal-stat-card span{color:#64748b;font-size:10px;font-weight:750;letter-spacing:.035em;text-transform:uppercase}.fiscal-stat-card strong{margin-top:7px;color:#102c4e;font-size:22px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
      .fiscal-release-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(310px,1fr);align-items:start;gap:14px}.fiscal-panel{min-width:0;padding:16px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.fiscal-panel h2{margin:0;color:#173452;font-size:14px;font-weight:800;line-height:1.3}.fiscal-panel>p{margin:7px 0 0;color:#64748b;font-size:11px;line-height:1.5}.fiscal-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding-bottom:11px;border-bottom:1px solid #e7edf5}.fiscal-panel-heading p{margin:4px 0 0;color:#64748b;font-size:11px;line-height:1.45}.fiscal-result-count{flex:none;padding:5px 9px;border:1px solid #dbeafe;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:750}
      .fiscal-search{display:flex;align-items:center;gap:8px;width:min(100%,340px);height:36px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#64748b}.fiscal-input{width:100%;min-width:0;height:36px;min-height:36px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font:500 12px Inter,Segoe UI,Arial,sans-serif;outline:none;box-sizing:border-box}.fiscal-search .fiscal-input{height:32px;min-height:32px;padding:0;border:0;background:transparent}.fiscal-input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.12);outline:none}.fiscal-input::placeholder{color:#94a3b8}
      .fiscal-table{width:100%;min-width:720px;border-collapse:separate;border-spacing:0;text-align:left;font-size:11px}.fiscal-table th{position:sticky;top:0;padding:9px 10px;border-bottom:1px solid #dfe7f1;background:#f1f5f9;color:#475569;font-size:9px;font-weight:800;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.fiscal-table td{padding:9px 10px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.fiscal-table tbody tr:nth-child(even){background:#f8fafc}.fiscal-table tbody tr:hover,.fiscal-table tbody tr.selected{background:#eff6ff}.fiscal-table .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.fiscal-table .center{text-align:center}.fiscal-table .link-value{color:#1d4ed8;font-weight:800}.fiscal-status{display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border:1px solid transparent;border-radius:6px;font-size:9px;font-weight:800;line-height:1.2;white-space:nowrap}.fiscal-status-success{border-color:#bbf7d0;background:#dcfce7;color:#166534}.fiscal-status-pending{border-color:#fde68a;background:#fef3c7;color:#92400e}.fiscal-status-danger{border-color:#fecaca;background:#fee2e2;color:#b91c1c}.fiscal-status-neutral{border-color:#cbd5e1;background:#f1f5f9;color:#475569}
      .fiscal-pagination{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:10px}.fiscal-pagination>div{display:flex;align-items:center;gap:7px}.fiscal-empty{margin:10px 0 0;padding:20px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;font-size:11px;text-align:center}.fiscal-item-list{display:grid;gap:9px}.fiscal-item-card{padding:12px;border:1px solid #dfe7f1;border-radius:10px;background:#f8fafc}.fiscal-item-card>strong,.fiscal-item-card>span{display:block}.fiscal-item-card>strong{color:#173452;font-size:12px;font-weight:750;line-height:1.4;overflow-wrap:anywhere}.fiscal-item-card>span{margin-top:4px;color:#64748b;font-size:10px}.fiscal-release-form{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:9px;margin-top:10px}.fiscal-release-form label{display:grid;gap:4px;color:#475569;font-size:10px;font-weight:750}.fiscal-release-form .fiscal-button{min-width:108px}
      .fiscal-report-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:7px;border:1px solid #dfe7f1;border-radius:10px;background:#fff}.fiscal-report-tab{height:36px;min-height:36px;padding:0 14px;border:1px solid #dfe7f1;border-radius:8px;background:#fff;color:#52677f;font-size:11px;font-weight:750;cursor:pointer}.fiscal-report-tab.active{border-color:#0b2545;background:#0b2545;color:#fff}.fiscal-workspace :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}
      @media(max-width:1000px){.fiscal-release-grid{grid-template-columns:minmax(0,1fr)}.fiscal-items-panel{grid-row:2}.fiscal-hero-icon{margin-right:4px}}
      @media(max-width:680px){.fiscal-workspace{padding:10px 10px 24px}.fiscal-hero{min-height:0;padding:17px;border-radius:13px}.fiscal-hero h1{font-size:21px}.fiscal-hero-icon{width:30px;height:30px}.fiscal-actionbar{padding:7px}.fiscal-actionbar .fiscal-button{flex:1}.fiscal-tabs{margin:10px -1px;padding:5px}.fiscal-tab{height:34px;min-height:34px;padding:0 9px;font-size:10px}.fiscal-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fiscal-stat-card{min-height:76px;padding:11px}.fiscal-stat-card strong{font-size:19px}.fiscal-panel{padding:11px}.fiscal-panel-heading{align-items:flex-start;flex-direction:column}.fiscal-search{width:100%}.fiscal-release-form{grid-template-columns:minmax(0,1fr) auto}.fiscal-release-form .fiscal-button{min-width:92px;padding:0 9px}.fiscal-pagination{align-items:flex-start;flex-direction:column}}
    `}</style>
    </main>
    </div>
  )
}

function FiscalPagination({
  page,
  pageCount,
  total,
  pageSize,
  label,
  onChange
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  label: string
  onChange: (page: number) => void
}) {
  if (total <= pageSize) return null
  return (
    <nav aria-label={`Paginação: ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <span aria-live="polite">Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
      <div className="flex gap-2">
        <button type="button" className="fiscal-button fiscal-button-secondary fiscal-button-small" disabled={page === 1} onClick={() => onChange(Math.max(1, page - 1))}>Anterior</button>
        <span className="self-center">Página {page} de {pageCount}</span>
        <button type="button" className="fiscal-button fiscal-button-secondary fiscal-button-small" disabled={page === pageCount} onClick={() => onChange(Math.min(pageCount, page + 1))}>Próxima</button>
      </div>
    </nav>
  )
}
