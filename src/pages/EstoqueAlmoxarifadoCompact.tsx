// Atualizado · Padrão Premium · 27/10/2026 — Estoque e Almoxarifado.
/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 27/10/2026
 * ID da Revisão: REV-009
 * Alterações: padronização visual no mesmo modelo da tela de Produtos
 * (grade de 12 colunas, campos de 36px com rótulo acima, barra de ações
 * fixa no topo, chips de status unificados). Removidos estilos inline
 * duplicados, paginação triplicada e blocos repetidos. Nenhuma regra de
 * negócio foi alterada: entradas, saídas, transferências, inventário
 * cíclico via RPC e conferência de produção seguem idênticos.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout, { type SalesNavSection } from './VendasLayout'

/* ------------------------------------------------------------------ */
/* Estilo padrão do módulo (mesmo bloco-base da tela de Produtos)      */
/* Copie este bloco para manter o padrão nas demais telas do sistema.  */
/* ------------------------------------------------------------------ */
const STOCK_CSS = `
.stock-page{--sf-bg:#f4f7f8;--sf-card:#ffffff;--sf-border:#d8e4e9;--sf-border-strong:#b8ccd3;
--sf-ink:#17333f;--sf-ink-soft:#54717b;--sf-accent:#0e6e8c;--sf-accent-dark:#0a5468;
--sf-ok-bg:#ecfdf3;--sf-ok-fg:#067647;--sf-ok-bd:#a7e3c2;
--sf-warn-bg:#fff7e6;--sf-warn-fg:#9a6700;--sf-warn-bd:#f2d28f;
--sf-err-bg:#fff1f0;--sf-err-fg:#b42318;--sf-err-bd:#f3b4ad;
--sf-radius:8px;--sf-field-h:36px;
background:var(--sf-bg);color:var(--sf-ink);padding:12px;max-width:1750px;margin:0 auto;
font-size:13px}
.stock-page *,.stock-page *::before,.stock-page *::after{box-sizing:border-box}

/* Barra de ações fixa no topo */
.stock-toolbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:8px;
flex-wrap:wrap;background:var(--sf-card);border:1px solid var(--sf-border);
border-radius:var(--sf-radius);padding:8px 12px;margin-bottom:12px;
box-shadow:0 4px 14px rgba(23,51,63,.06)}
.stock-toolbar .stock-toolbar-title{font-weight:800;font-size:14px;margin-right:auto}

/* Cartões e seções */
.stock-card{background:var(--sf-card);border:1px solid var(--sf-border);
border-radius:var(--sf-radius);padding:16px;margin-bottom:12px}
.stock-card-head{display:flex;justify-content:space-between;align-items:flex-start;
gap:12px;flex-wrap:wrap;margin-bottom:14px}
.stock-card-head h2{margin:2px 0 2px;font-size:16px;font-weight:800}
.stock-card-head small{color:var(--sf-ink-soft)}
.stock-eyebrow{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;
color:var(--sf-accent);text-transform:uppercase}

/* Grade de formulário: 12 colunas, campos alinhados */
.stock-form-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
.stock-field{display:flex;flex-direction:column;gap:4px;grid-column:span 3;min-width:0}
.stock-field.span-2{grid-column:span 2}.stock-field.span-4{grid-column:span 4}
.stock-field.span-6{grid-column:span 6}.stock-field.span-8{grid-column:span 8}
.stock-field.span-12{grid-column:span 12}
.stock-field>span{font-size:11px;font-weight:700;color:var(--sf-ink-soft)}
.stock-field input,.stock-field select,.stock-field textarea{width:100%;height:var(--sf-field-h);
border:1px solid var(--sf-border-strong);border-radius:6px;padding:0 10px;font-size:13px;
background:#fff;color:var(--sf-ink);outline:none;transition:border-color .15s,box-shadow .15s}
.stock-field textarea{height:auto;min-height:72px;padding:8px 10px;resize:vertical}
.stock-field input:focus,.stock-field select:focus,.stock-field textarea:focus{
border-color:var(--sf-accent);box-shadow:0 0 0 3px rgba(14,110,140,.15)}
@media(max-width:1100px){.stock-field{grid-column:span 6}.stock-field.span-2,.stock-field.span-4{grid-column:span 6}}
@media(max-width:640px){.stock-field,.stock-field.span-2,.stock-field.span-4,.stock-field.span-6,.stock-field.span-8{grid-column:span 12}}

/* Botões */
.stock-btn{display:inline-flex;align-items:center;gap:6px;height:var(--sf-field-h);
padding:0 14px;border-radius:6px;border:1px solid transparent;font-size:13px;font-weight:700;
cursor:pointer;white-space:nowrap;transition:background .15s,opacity .15s}
.stock-btn:disabled{opacity:.45;cursor:not-allowed}
.stock-btn-primary{background:var(--sf-accent);color:#fff}
.stock-btn-primary:hover:not(:disabled){background:var(--sf-accent-dark)}
.stock-btn-ghost{background:#fff;border-color:var(--sf-border-strong);color:var(--sf-ink)}
.stock-btn-ghost:hover:not(:disabled){background:#eef4f6}

/* Chips de status (padrão único, sem cores inline) */
.stock-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:999px;
border:1px solid;font-size:11px;font-weight:800;white-space:nowrap}
.stock-chip-ok{background:var(--sf-ok-bg);color:var(--sf-ok-fg);border-color:var(--sf-ok-bd)}
.stock-chip-warn{background:var(--sf-warn-bg);color:var(--sf-warn-fg);border-color:var(--sf-warn-bd)}
.stock-chip-err{background:var(--sf-err-bg);color:var(--sf-err-fg);border-color:var(--sf-err-bd)}
.stock-chip-neutral{background:#f3f6f7;color:#64777d;border-color:#dbe5e9}

/* KPIs */
.stock-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px}
.stock-kpis article{display:flex;flex-direction:column;gap:2px;background:var(--sf-card);
border:1px solid var(--sf-border);border-radius:var(--sf-radius);padding:12px 14px}
.stock-kpis article svg{color:var(--sf-accent)}
.stock-kpis article span{font-size:11px;font-weight:700;color:var(--sf-ink-soft)}
.stock-kpis article strong{font-size:20px;font-weight:800}
.stock-kpis article small{color:var(--sf-ink-soft)}

/* Abas */
.stock-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.stock-tabs button{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;
border-radius:6px;border:1px solid var(--sf-border);background:var(--sf-card);
font-size:12px;font-weight:700;color:var(--sf-ink-soft);cursor:pointer}
.stock-tabs button.active{background:var(--sf-accent);border-color:var(--sf-accent);color:#fff}

/* Tabelas */
.stock-table-wrap{overflow-x:auto;border:1px solid var(--sf-border);border-radius:var(--sf-radius)}
.stock-table-wrap table{width:100%;border-collapse:collapse;font-size:12px}
.stock-table-wrap th{background:#eef4f6;text-align:left;padding:8px 10px;font-size:11px;
font-weight:800;color:var(--sf-ink-soft);text-transform:uppercase;letter-spacing:.04em;
border-bottom:1px solid var(--sf-border);white-space:nowrap}
.stock-table-wrap td{padding:8px 10px;border-bottom:1px solid #edf2f4;vertical-align:middle}
.stock-table-wrap tbody tr:nth-child(even){background:#f8fafc}
.stock-table-wrap tbody tr:hover{background:#f1f7f9}
.stock-empty{text-align:center;color:var(--sf-ink-soft);padding:24px !important}

/* Paginação (componente único) */
.stock-pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:10px}
.stock-pager span{font-size:12px;color:var(--sf-ink-soft)}

/* Busca com ícone */
.stock-search{display:flex;align-items:center;gap:8px;border:1px solid var(--sf-border-strong);
border-radius:6px;padding:0 10px;background:#fff;height:var(--sf-field-h);min-width:260px}
.stock-search input{border:0;outline:0;width:100%;font-size:13px;background:transparent}

/* Avisos */
.stock-notice{border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;font-weight:600}
.stock-notice-ok{background:var(--sf-ok-bg);color:var(--sf-ok-fg);border:1px solid var(--sf-ok-bd)}
.stock-notice-err{background:var(--sf-err-bg);color:var(--sf-err-fg);border:1px solid var(--sf-err-bd)}

/* Painel de conferência do movimento */
.stock-check{display:grid;gap:10px}
.stock-check-row{display:flex;justify-content:space-between;font-size:13px}
.stock-check-hint{display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:6px;font-size:12px;font-weight:700}
.stock-check-hint-ok{background:var(--sf-ok-bg);color:var(--sf-ok-fg)}
.stock-check-hint-err{background:var(--sf-err-bg);color:var(--sf-err-fg)}

/* Estado vazio */
.stock-empty-state{display:flex;flex-direction:column;align-items:center;gap:8px;
padding:48px 16px;color:var(--sf-ink-soft);text-align:center}
.stock-empty-state h2{margin:0;font-size:16px;color:var(--sf-ink)}

/* Autocomplete de produto */
.stock-autocomplete{position:relative}
.stock-autocomplete-list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);
background:#fff;border:1px solid var(--sf-border);border-radius:6px;
box-shadow:0 15px 35px rgba(23,51,63,.16);max-height:320px;overflow-y:auto}
.stock-autocomplete-list button{display:block;width:100%;text-align:left;border:0;
border-bottom:1px solid #edf2f4;background:#fff;padding:8px 10px;cursor:pointer;font-size:13px}
.stock-autocomplete-list button:hover{background:#f1f7f9}
.stock-autocomplete-list small{display:block;color:var(--sf-ink-soft);margin-top:2px}

@media print{.no-print{display:none !important}}
`

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */
const stockNav: SalesNavSection[] = [
  {
    label: 'Estoque',
    items: [
      { label: 'Saldos', href: '/estoque/saldos', icon: Boxes },
      { label: 'Ajustes', href: '/estoque/ajustes', icon: PackagePlus },
      { label: 'Separação', href: '/estoque/separacao', icon: ClipboardCheck },
      { label: 'Recebimento', href: '/estoque/recebimento-lotes', icon: PackageMinus },
      { label: 'Etiquetas', href: '/estoque/etiquetas', icon: Boxes },
      { label: 'Validade / FIFO', href: '/estoque/validade', icon: CalendarClock },
      { label: 'Curva ABC', href: '/estoque/curva-abc', icon: Warehouse },
    ],
  },
  {
    label: 'Integrações',
    items: [
      { label: 'Compras', href: '/compras', icon: PackagePlus },
      { label: 'PCP', href: '/pcp', icon: Boxes },
      { label: 'Qualidade', href: '/qualidade', icon: ClipboardCheck },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
type Tab = 'saldo' | 'entrada' | 'saida' | 'transferencia' | 'almox' | 'producao' | 'historico' | 'inventario'
type Product = { id: string; codigo: string; nome: string; estoque_atual: number; estoque_maximo: number; ponto_reposicao: number; categoria: string | null }
type Location = { id: string; codigo: string; nome: string; almoxarifado_id: string; tipo: string; ativo: boolean }
type Warehouse = { id: string; codigo: string; nome: string; tipo: string; ativo: boolean }
type Movement = { id: string; produto_id: string | null; tipo: string; quantidade: number; origem: string | null; documento: string | null; ordem_producao_id: string | null; observacao: string | null; created_at: string }
type OP = { id: string; numero_op: string; produto_id: string | null; quantidade: number; status: string }
type InventoryItem = { id: string; produto_id: string; quantidade_sistema_congelada: number; quantidade_venda_concorrente: number; quantidade_contada: number | null; divergencia: number | null; ajustado: boolean }

const PAGE_SIZE = 25

/* ------------------------------------------------------------------ */
/* Componentes de apoio (eliminam duplicações)                          */
/* ------------------------------------------------------------------ */
type ChipTone = 'ok' | 'warn' | 'err' | 'neutral'
function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return <span className={`stock-chip stock-chip-${tone}`}>{children}</span>
}

function Field({ label, span, children }: { label: string; span?: 2 | 3 | 4 | 6 | 8 | 12; children: React.ReactNode }) {
  return (
    <label className={`stock-field${span && span !== 3 ? ` span-${span}` : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function SelectField({ label, span, value, onChange, options, placeholder = 'Selecione' }: {
  label: string; span?: 2 | 3 | 4 | 6 | 8 | 12; value: string; onChange: (v: string) => void;
  options: [string, string][]; placeholder?: string
}) {
  return (
    <Field label={label} span={span}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Field>
  )
}

function Pager({ page, pageCount, onChange, ariaLabel }: { page: number; pageCount: number; onChange: (p: number) => void; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="stock-pager">
      <button type="button" className="stock-btn stock-btn-ghost" disabled={page === 0} onClick={() => onChange(Math.max(0, page - 1))}>Anterior</button>
      <span aria-live="polite">Página {page + 1} de {pageCount}</span>
      <button type="button" className="stock-btn stock-btn-ghost" disabled={page + 1 >= pageCount} onClick={() => onChange(Math.min(pageCount - 1, page + 1))}>Próxima</button>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Tela principal                                                      */
/* ------------------------------------------------------------------ */
export default function EstoqueAlmoxarifadoCompact() {
  const [tab, setTab] = useState<Tab>('saldo')
  const [companyId, setCompanyId] = useState('')
  const [inventoryId, setInventoryId] = useState('')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryPage, setInventoryPage] = useState(0)
  const [countDraft, setCountDraft] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState('todos')
  const [productSearch, setProductSearch] = useState('')
  const [documento, setDocumento] = useState('')
  const [origem, setOrigem] = useState('Manual')
  const [observacao, setObservacao] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [found, setFound] = useState('')
  const [bad, setBad] = useState('')
  const [defectText, setDefectText] = useState('')
  const [selectedOp, setSelectedOp] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [stockPage, setStockPage] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)

  async function load() {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [p, l, w, m, o] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,estoque_maximo,ponto_reposicao,categoria', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Location>((from, to) => supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,almoxarifado_id,tipo,ativo', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Warehouse>((from, to) => supabase.from('erp_almoxarifados').select('id,codigo,nome,tipo,ativo', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Movement>((from, to) => supabase.from('erp_estoque_movimentos').select('id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,observacao,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<OP>((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status', { count: 'exact' }).eq('empresa_id', id).order('criado_em', { ascending: false }).range(from, to)),
      ])
      setCompanyId(id); setProducts(p); setLocations(l); setWarehouses(w); setMovements(m); setOps(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar estoque.')
    } finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])

  async function loadInventory() {
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const { data, error } = await supabase.from('erp_estoque_inventarios').select('id,status,iniciado_em').eq('empresa_id', companyId).eq('status', 'aberto').maybeSingle()
      if (error) throw error
      if (!data) { setInventoryId(''); setInventoryItems([]); return }
      setInventoryId(data.id)
      const items = await fetchAllPages<InventoryItem>((from, to) => supabase.from('erp_estoque_inventario_itens').select('id,produto_id,quantidade_sistema_congelada,quantidade_venda_concorrente,quantidade_contada,divergencia,ajustado', { count: 'exact' }).eq('empresa_id', companyId).eq('inventario_id', data.id).order('produto_id').range(from, to))
      setInventoryItems(items)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar inventário.') }
  }

  async function startInventory() {
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('erp_estoque_inventario_iniciar', { p_observacao: 'Inventário cíclico iniciado pelo operador.' })
      if (error) throw error
      setInventoryId(String(data))
      setMessage('Inventário iniciado sem bloquear vendas, faturamento ou expedição.')
      await loadInventory()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar o inventário.') } finally { setBusy(false) }
  }

  async function countInventory(item: InventoryItem) {
    if (!inventoryId) return
    const q = Number(countDraft[item.id])
    if (!Number.isFinite(q) || q < 0) { setError('Informe uma quantidade contada válida.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('erp_estoque_inventario_contar', { p_inventario_id: inventoryId, p_produto_id: item.produto_id, p_quantidade_contada: q })
      if (error) throw error
      setCountDraft((v) => ({ ...v, [item.id]: '' }))
      await loadInventory()
      setMessage('Contagem registrada.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar contagem.') } finally { setBusy(false) }
  }

  async function adjustInventory(item: InventoryItem) {
    if (!inventoryId) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('erp_estoque_inventario_ajustar', { p_inventario_id: inventoryId, p_produto_id: item.produto_id })
      if (error) throw error
      await loadInventory(); await load()
      setMessage('Ajuste de estoque aplicado.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha no ajuste.') } finally { setBusy(false) }
  }

  async function closeInventory() {
    if (!inventoryId) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('erp_estoque_inventario_encerrar', { p_inventario_id: inventoryId })
      if (error) throw error
      setInventoryId(''); setInventoryItems([])
      setMessage('Inventário encerrado.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível encerrar o inventário.') } finally { setBusy(false) }
  }
  useEffect(() => { if (tab === 'inventario' && companyId) void loadInventory() }, [tab, companyId])

  const categoryKey = (p: Product) => {
    const x = (p.categoria || '').toLowerCase()
    if (x.includes('matéria') || x.includes('materia')) return 'materia-prima'
    if (x.includes('acabado')) return 'produto-acabado'
    if (x.includes('acabamento') || x.includes('wip') || x.includes('semi')) return 'acabamento'
    if (x.includes('escrit')) return 'material-escritorio'
    if (x.includes('limpez')) return 'limpeza'
    return x || 'outros'
  }

  const filtered = useMemo(
    () => products.filter((p) => (category === 'todos' || categoryKey(p) === category) && (!query || p.codigo.toLowerCase().includes(query.toLowerCase()) || p.nome.toLowerCase().includes(query.toLowerCase()) || String(p.categoria || '').toLowerCase().includes(query.toLowerCase()))),
    [products, query, category],
  )
  const stockPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleProducts = filtered.slice(stockPage * PAGE_SIZE, (stockPage + 1) * PAGE_SIZE)

  const filteredMovements = useMemo(
    () => movements.filter((m) => {
      const p = products.find((x) => x.id === m.produto_id)
      const s = JSON.stringify([p?.codigo, p?.nome, m.tipo, m.origem, m.documento, m.observacao]).toLowerCase()
      return !query || s.includes(query.toLowerCase())
    }),
    [movements, products, query],
  )
  const historyPageCount = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE))
  const visibleMovements = filteredMovements.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE)

  const inventoryPageCount = Math.max(1, Math.ceil(inventoryItems.length / PAGE_SIZE))
  const visibleInventoryItems = inventoryItems.slice(inventoryPage * PAGE_SIZE, (inventoryPage + 1) * PAGE_SIZE)

  useEffect(() => { setStockPage((c) => Math.min(c, stockPageCount - 1)) }, [stockPageCount])
  useEffect(() => { setHistoryPage((c) => Math.min(c, historyPageCount - 1)) }, [historyPageCount])
  useEffect(() => { setInventoryPage((c) => Math.min(c, inventoryPageCount - 1)) }, [inventoryPageCount])

  const printReport = () => { window.print() }

  const stockStatus = (p: Product): { label: string; tone: ChipTone } => {
    const q = Number(p.estoque_atual || 0), minimum = Number(p.ponto_reposicao || 0)
    if (q <= 0) return { label: 'SEM ESTOQUE', tone: 'err' }
    if (minimum > 0 && q <= minimum) return { label: 'REPOR ESTOQUE', tone: 'warn' }
    return { label: 'DISPONÍVEL', tone: 'ok' }
  }

  async function movement(tipo: 'entrada' | 'saida') {
    const qty = Number(quantity)
    if (!productId) { setError('Selecione um produto.'); return }
    if (!Number.isFinite(qty) || qty <= 0) { setError('Informe uma quantidade maior que zero.'); return }
    const p = products.find((x) => x.id === productId)
    const saldo = Number(p?.estoque_atual || 0)
    if (tipo === 'saida' && qty > saldo) { setError('Saída bloqueada: saldo disponível ' + saldo.toLocaleString('pt-BR') + '. Não é permitido estoque negativo.'); return }
    if (!locationId) { setError('Informe o endereço de ' + (tipo === 'entrada' ? 'destino' : 'origem') + '.'); return }
    setBusy(true); setError('')
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const { error } = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: companyId, p_produto_id: productId, p_tipo: tipo, p_quantidade: qty,
        p_origem: origem || 'Manual', p_documento: documento || null,
        p_observacao: observacao || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
        p_localizacao_origem_id: tipo === 'saida' ? locationId : null,
        p_localizacao_destino_id: tipo === 'entrada' ? locationId : null,
      })
      if (error) throw error
      setMessage((tipo === 'entrada' ? 'Entrada' : 'Saída') + ' registrada para ' + (p?.codigo || 'produto') + '. O saldo foi atualizado pelo razão de movimentos.')
      setQuantity(''); setDocumento(''); setObservacao(''); setProductSearch(''); setProductId(''); setLocationId('')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha no movimento.') } finally { setBusy(false) }
  }

  async function transfer() {
    const qty = Number(quantity)
    if (!productId || !locationId || !targetLocation || !Number.isFinite(qty) || qty <= 0) { setError('Informe produto, origem, destino e quantidade válida.'); return }
    if (locationId === targetLocation) { setError('A origem e o destino devem ser diferentes.'); return }
    setBusy(true); setError('')
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const { error } = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: companyId, p_produto_id: productId, p_tipo: 'transferencia', p_quantidade: qty,
        p_origem: 'almoxarifado', p_documento: null, p_observacao: 'Transferência de localização',
        p_localizacao_origem_id: locationId, p_localizacao_destino_id: targetLocation,
      })
      if (error) throw error
      setMessage('Transferência registrada entre localizações.')
      setQuantity('')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha na transferência.') } finally { setBusy(false) }
  }

  async function confirmProduction() {
    if (!selectedOp) { setError('Selecione a OP.'); return }
    const f = Number(found), b = Number(bad)
    if (!Number.isFinite(f) || !Number.isFinite(b) || f < 0 || b < 0 || b > f) { setError('Quantidade encontrada/defeituosa inválida.'); return }
    const defs = defectText.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => {
      const a = x.split(':')
      return { defeito: a[0].trim(), quantidade: Number(a[1] || 0), observacao: a.slice(2).join(':').trim() || null }
    }).filter((x) => x.defeito && x.quantidade > 0)
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('erp_registrar_conferencia_producao', {
        p_ordem_producao_id: selectedOp, p_quantidade_encontrada: f, p_quantidade_defeituosa: b,
        p_defeitos: defs, p_localizacao_destino_id: locationId || null, p_acabamento: true,
        p_observacao: 'Conferência do Almoxarifado após acabamento',
      })
      if (error) throw error
      const r = data as { quantidade_boa?: number; saldo_producao?: number }
      setMessage('Conferido: ' + Number(r.quantidade_boa || 0) + ' boas no estoque, ' + b + ' no refugo. Saldo OP: ' + Number(r.saldo_producao || 0) + '.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha na conferência.') } finally { setBusy(false) }
  }

  const tabs: [Tab, string, LucideIcon][] = [
    ['saldo', 'Saldo / Endereços', Boxes],
    ['inventario', 'Inventário cíclico', ClipboardCheck],
    ['entrada', 'Entrada', PackagePlus],
    ['saida', 'Saída', PackageMinus],
    ['transferencia', 'Transferência', ArrowRightLeft],
    ['almox', 'Almoxarifado', Warehouse],
    ['producao', 'Conferir produção', ClipboardCheck],
    ['historico', 'Histórico', RefreshCw],
  ]

  const locationOptions: [string, string][] = locations.map((l) => [l.id, l.codigo + ' • ' + l.nome])
  const productOptions: [string, string][] = products.map((p) => [p.id, p.codigo + ' • ' + p.nome])

  return (
    <VendasLayout title="Estoque e Almoxarifado" subtitle="Saldos • movimentos • endereços • lotes • inventário" onRefresh={() => void load()} navSections={stockNav}>
      <main className="stock-page">
        <style>{STOCK_CSS}</style>

        {/* Barra de ações fixa */}
        <div className="stock-toolbar no-print">
          <span className="stock-toolbar-title">Estoque e Almoxarifado</span>
          <button type="button" className="stock-btn stock-btn-ghost" onClick={() => void load()} disabled={busy}>
            <RefreshCw size={15} /> Atualizar
          </button>
          <button type="button" className="stock-btn stock-btn-ghost" onClick={printReport}>
            Imprimir página
          </button>
          <button type="button" className="stock-btn stock-btn-primary" onClick={() => setTab('entrada')}>
            <PackagePlus size={15} /> Dar entrada
          </button>
          <button type="button" className="stock-btn stock-btn-ghost" onClick={() => setTab('saida')}>
            <PackageMinus size={15} /> Dar saída
          </button>
        </div>

        {(message || error) && (
          <div role={error ? 'alert' : 'status'} className={`stock-notice ${error ? 'stock-notice-err' : 'stock-notice-ok'}`}>
            {error || message}
          </div>
        )}

        <section className="stock-kpis" aria-label="Resumo do estoque">
          <article><Boxes size={18} /><span>Produtos ativos</span><strong>{products.length}</strong></article>
          <article><AlertTriangle size={18} /><span>Abaixo do ponto de reposição</span><strong>{products.filter((p) => Number(p.estoque_atual) <= Number(p.ponto_reposicao)).length}</strong></article>
          <article><Warehouse size={18} /><span>Almoxarifados ativos</span><strong>{warehouses.length}</strong></article>
          <article><ArrowRightLeft size={18} /><span>Movimentos consultados</span><strong>{movements.length}</strong></article>
        </section>

        <nav className="stock-tabs">
          {tabs.map(([id, label, I]) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <I size={15} /> {label}
            </button>
          ))}
        </nav>

        {/* ---------------- SALDO ---------------- */}
        {tab === 'saldo' && (
          <section className="stock-card print-area">
            <div className="stock-card-head">
              <div>
                <span className="stock-eyebrow">Consulta</span>
                <h2>Saldo de produtos / estoque</h2>
                <small>Pesquise, filtre, pagine e imprima os resultados da página atual.</small>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="stock-search">
                  <Search size={15} />
                  <input placeholder="Pesquisar código, produto ou categoria" value={query} onChange={(e) => { setQuery(e.target.value); setStockPage(0); setHistoryPage(0) }} />
                </div>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setStockPage(0) }} style={{ height: 36, border: '1px solid var(--sf-border-strong)', borderRadius: 6, padding: '0 10px', fontSize: 13, background: '#fff' }}>
                  <option value="todos">Todas as categorias</option>
                  <option value="materia-prima">Matéria-prima</option>
                  <option value="produto-acabado">Produto acabado</option>
                  <option value="acabamento">Em acabamento / semiacabado</option>
                  <option value="material-escritorio">Material de escritório</option>
                  <option value="limpeza">Limpeza</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
            <div className="stock-table-wrap">
              <table>
                <thead>
                  <tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Saldo ERP</th><th>Ponto de reposição</th><th>Reposição</th></tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => {
                    const st = stockStatus(p)
                    const falta = Number(p.ponto_reposicao || 0) - Number(p.estoque_atual || 0)
                    return (
                      <tr key={p.id}>
                        <td>{p.codigo}</td>
                        <td>{p.nome}</td>
                        <td>{p.categoria || '—'}</td>
                        <td><Chip tone={st.tone}>{Number(p.estoque_atual || 0).toLocaleString('pt-BR')}</Chip></td>
                        <td>{Number(p.ponto_reposicao || 0).toLocaleString('pt-BR')}</td>
                        <td><Chip tone={st.tone}>{falta > 0 ? falta.toLocaleString('pt-BR') + ' para repor' : st.label}</Chip></td>
                      </tr>
                    )
                  })}
                  {!visibleProducts.length && <tr><td colSpan={6} className="stock-empty">Nenhum produto encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={stockPage} pageCount={stockPageCount} onChange={setStockPage} ariaLabel="Paginação do saldo de estoque" />
          </section>
        )}

        {/* ---------------- INVENTÁRIO ---------------- */}
        {tab === 'inventario' && (
          <section className="stock-card">
            <div className="stock-card-head">
              <div>
                <span className="stock-eyebrow">Contagem</span>
                <h2>Inventário cíclico em segundo plano</h2>
                <small>Snapshot congelado no início. Vendas concorrentes são contabilizadas sem travar faturamento.</small>
              </div>
              {!inventoryId ? (
                <button type="button" className="stock-btn stock-btn-primary" disabled={busy} onClick={() => void startInventory()}>
                  <ClipboardCheck size={15} /> Iniciar Novo Inventário Cíclico
                </button>
              ) : (
                <button type="button" className="stock-btn stock-btn-ghost" disabled={busy} onClick={() => void closeInventory()}>
                  Encerrar inventário
                </button>
              )}
            </div>
            {inventoryId ? (
              <>
                <div className="stock-kpis">
                  <article><span>Saldo congelado</span><strong>{inventoryItems.reduce((s, i) => s + Number(i.quantidade_sistema_congelada || 0), 0).toLocaleString('pt-BR')}</strong></article>
                  <article><span>Vendas concorrentes</span><strong>{inventoryItems.reduce((s, i) => s + Number(i.quantidade_venda_concorrente || 0), 0).toLocaleString('pt-BR')}</strong></article>
                  <article><span>Itens contados</span><strong>{inventoryItems.filter((i) => i.quantidade_contada !== null).length} / {inventoryItems.length}</strong></article>
                </div>
                <div className="stock-table-wrap">
                  <table>
                    <thead>
                      <tr><th>Código</th><th>Produto</th><th>Saldo congelado</th><th>Vendas concorrentes</th><th>Saldo esperado</th><th>Contado</th><th>Divergência</th><th>Ação</th></tr>
                    </thead>
                    <tbody>
                      {visibleInventoryItems.map((item) => {
                        const p = products.find((x) => x.id === item.produto_id)
                        const esperado = Number(item.quantidade_sistema_congelada || 0) - Number(item.quantidade_venda_concorrente || 0)
                        const divTone: ChipTone = item.divergencia === null ? 'neutral' : Number(item.divergencia) === 0 ? 'ok' : 'err'
                        return (
                          <tr key={item.id}>
                            <td>{p?.codigo || '—'}</td>
                            <td>{p?.nome || 'Produto'}</td>
                            <td>{item.quantidade_sistema_congelada}</td>
                            <td>{item.quantidade_venda_concorrente}</td>
                            <td>{esperado}</td>
                            <td>
                              <input
                                type="number" min="0" step="any"
                                value={countDraft[item.id] ?? (item.quantidade_contada ?? '')}
                                onChange={(e) => setCountDraft((v) => ({ ...v, [item.id]: e.target.value }))}
                                style={{ width: 110, height: 32, border: '1px solid var(--sf-border-strong)', borderRadius: 6, padding: '0 8px', fontSize: 12 }}
                              />
                            </td>
                            <td>
                              <Chip tone={divTone}>
                                {item.divergencia === null ? 'PENDENTE' : Number(item.divergencia) === 0 ? 'OK' : Number(item.divergencia).toLocaleString('pt-BR')}
                              </Chip>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" className="stock-btn stock-btn-primary" disabled={busy} onClick={() => void countInventory(item)}>Gravar contagem</button>
                                <button type="button" className="stock-btn stock-btn-ghost" disabled={busy || item.quantidade_contada === null || item.ajustado || Number(item.divergencia || 0) === 0} onClick={() => void adjustInventory(item)}>Ajustar Estoque</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pager page={inventoryPage} pageCount={inventoryPageCount} onChange={setInventoryPage} ariaLabel="Paginação do inventário" />
              </>
            ) : (
              <div className="stock-empty-state">
                <ClipboardCheck size={44} />
                <h2>Nenhum inventário aberto</h2>
                <p>O snapshot captura o saldo imediatamente e a operação continua livre durante a contagem.</p>
              </div>
            )}
          </section>
        )}

        {/* ---------------- ENTRADA / SAÍDA ---------------- */}
        {tab === 'entrada' && (
          <MovementForm title="Dar entrada no estoque" productId={productId} setProductId={setProductId} productSearch={productSearch} setProductSearch={setProductSearch} documento={documento} setDocumento={setDocumento} origem={origem} setOrigem={setOrigem} observacao={observacao} setObservacao={setObservacao} locationId={locationId} setLocationId={setLocationId} quantity={quantity} setQuantity={setQuantity} products={products} locations={locations} action={() => void movement('entrada')} busy={busy} />
        )}
        {tab === 'saida' && (
          <MovementForm title="Dar saída no estoque" productId={productId} setProductId={setProductId} productSearch={productSearch} setProductSearch={setProductSearch} documento={documento} setDocumento={setDocumento} origem={origem} setOrigem={setOrigem} observacao={observacao} setObservacao={setObservacao} locationId={locationId} setLocationId={setLocationId} quantity={quantity} setQuantity={setQuantity} products={products} locations={locations} action={() => void movement('saida')} busy={busy} />
        )}

        {/* ---------------- TRANSFERÊNCIA ---------------- */}
        {tab === 'transferencia' && (
          <section className="stock-card" style={{ maxWidth: 900 }}>
            <div className="stock-card-head">
              <div>
                <span className="stock-eyebrow">Movimentação interna</span>
                <h2>Transferir entre endereços</h2>
                <small>Mova saldo de um endereço físico para outro.</small>
              </div>
            </div>
            <div className="stock-form-grid">
              <SelectField label="Produto" span={6} value={productId} onChange={setProductId} options={productOptions} />
              <Field label="Quantidade" span={6}>
                <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0,00" />
              </Field>
              <SelectField label="Origem" span={6} value={locationId} onChange={setLocationId} options={locationOptions} />
              <SelectField label="Destino" span={6} value={targetLocation} onChange={setTargetLocation} options={locationOptions} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="stock-btn stock-btn-primary" disabled={busy} onClick={transfer}>
                <ArrowRightLeft size={15} /> Transferir
              </button>
            </div>
          </section>
        )}

        {/* ---------------- ALMOXARIFADO ---------------- */}
        {tab === 'almox' && (
          <section>
            <div className="stock-kpis">
              {warehouses.map((w) => (
                <article key={w.id}>
                  <Warehouse size={18} />
                  <span>{w.codigo}</span>
                  <strong>{w.nome}</strong>
                  <small>{locations.filter((l) => l.almoxarifado_id === w.id).length} endereços</small>
                </article>
              ))}
            </div>
            <section className="stock-card">
              <div className="stock-card-head">
                <div>
                  <span className="stock-eyebrow">Endereçamento</span>
                  <h2>Endereços físicos</h2>
                  <small>{locations.length} registros</small>
                </div>
              </div>
              <div className="stock-table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Almoxarifado</th></tr></thead>
                  <tbody>
                    {locations.map((l) => (
                      <tr key={l.id}>
                        <td>{l.codigo}</td>
                        <td>{l.nome}</td>
                        <td>{l.tipo}</td>
                        <td>{warehouses.find((w) => w.id === l.almoxarifado_id)?.codigo || '—'}</td>
                      </tr>
                    ))}
                    {!locations.length && <tr><td colSpan={4} className="stock-empty">Nenhum endereço cadastrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {/* ---------------- HISTÓRICO ---------------- */}
        {tab === 'historico' && (
          <section className="stock-card print-area">
            <div className="stock-card-head">
              <div>
                <span className="stock-eyebrow">Rastreabilidade</span>
                <h2>Histórico de movimentações</h2>
                <small>Todas as movimentações do tenant, com paginação de 25 registros.</small>
              </div>
              <div className="stock-search">
                <Search size={15} />
                <input placeholder="Pesquisar histórico" value={query} onChange={(e) => { setQuery(e.target.value); setHistoryPage(0); setStockPage(0) }} />
              </div>
            </div>
            <div className="stock-table-wrap">
              <table>
                <thead>
                  <tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Origem</th><th>Documento</th><th>Observação</th></tr>
                </thead>
                <tbody>
                  {visibleMovements.map((m) => {
                    const p = products.find((x) => x.id === m.produto_id)
                    const tone: ChipTone = m.tipo === 'entrada' ? 'ok' : m.tipo === 'saida' ? 'err' : 'warn'
                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td>{p?.codigo || '—'} • {p?.nome || 'Produto'}</td>
                        <td><Chip tone={tone}>{m.tipo}</Chip></td>
                        <td style={{ fontWeight: 800 }}>{Number(m.quantidade || 0).toLocaleString('pt-BR')}</td>
                        <td>{m.origem || '—'}</td>
                        <td>{m.documento || '—'}</td>
                        <td>{m.observacao || '—'}</td>
                      </tr>
                    )
                  })}
                  {!visibleMovements.length && <tr><td colSpan={7} className="stock-empty">Nenhuma movimentação encontrada.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={historyPage} pageCount={historyPageCount} onChange={setHistoryPage} ariaLabel="Paginação do histórico de estoque" />
          </section>
        )}

        {/* ---------------- CONFERIR PRODUÇÃO ---------------- */}
        {tab === 'producao' && (
          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))' }}>
            <section className="stock-card">
              <div className="stock-card-head">
                <div>
                  <span className="stock-eyebrow">Grid de conferência</span>
                  <h2>Lançar produção no estoque</h2>
                  <small>Confira a OP após o acabamento e lance as peças boas.</small>
                </div>
              </div>
              <div className="stock-form-grid">
                <SelectField label="Ordem de produção" span={12} value={selectedOp} onChange={setSelectedOp} options={ops.map((o) => [o.id, o.numero_op + ' • planejado ' + o.quantidade + ' • ' + o.status])} />
                <Field label="Quantidade encontrada" span={6}>
                  <input type="number" min="0" step="any" value={found} onChange={(e) => setFound(e.target.value)} />
                </Field>
                <Field label="Quantidade defeituosa" span={6}>
                  <input type="number" min="0" step="any" value={bad} onChange={(e) => setBad(e.target.value)} />
                </Field>
                <SelectField label="Endereço das peças boas" span={12} value={locationId} onChange={setLocationId} options={locationOptions} />
                <Field label="Defeitos para Qualidade" span={12}>
                  <textarea rows={3} value={defectText} onChange={(e) => setDefectText(e.target.value)} placeholder={'Rebarba:200\nMancha:150\nDimensão fora:150:observação'} />
                </Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" className="stock-btn stock-btn-primary" disabled={busy} onClick={confirmProduction}>
                  <ClipboardCheck size={15} /> Conferir e lançar
                </button>
              </div>
            </section>
            <section className="stock-card">
              <div className="stock-card-head">
                <div>
                  <span className="stock-eyebrow">Regra física</span>
                  <h2>Conferência da OP</h2>
                  <small>Exemplo: OP 5.000 → encontrados 4.500 → defeitos 500 → boas 4.000.</small>
                </div>
              </div>
              <div className="stock-kpis">
                <article><span>Planejada</span><strong>{ops.find((o) => o.id === selectedOp)?.quantidade || '—'}</strong></article>
                <article><span>Encontrada</span><strong>{found || '—'}</strong></article>
                <article><span>Defeito</span><strong>{bad || '—'}</strong></article>
                <article><span>Boa</span><strong>{found ? Math.max(0, Number(found) - Number(bad || 0)) : '—'}</strong></article>
              </div>
              <p style={{ color: 'var(--sf-ink-soft)', fontSize: 13 }}>
                As boas geram entrada no estoque e o refugo gera movimento separado; os defeitos são enviados para análise da Qualidade.
              </p>
            </section>
          </section>
        )}
      </main>
    </VendasLayout>
  )
}

/* ------------------------------------------------------------------ */
/* Formulário de movimento (entrada / saída)                            */
/* ------------------------------------------------------------------ */
function MovementForm({ title, productId, setProductId, productSearch, setProductSearch, locationId, setLocationId, quantity, setQuantity, documento, setDocumento, origem, setOrigem, observacao, setObservacao, products, locations, action, busy }: {
  title: string; productId: string; setProductId: (v: string) => void; productSearch: string; setProductSearch: (v: string) => void;
  locationId: string; setLocationId: (v: string) => void; quantity: string; setQuantity: (v: string) => void;
  documento: string; setDocumento: (v: string) => void; origem: string; setOrigem: (v: string) => void;
  observacao: string; setObservacao: (v: string) => void; products: Product[]; locations: Location[]; action: () => void; busy: boolean
}) {
  const selected = products.find((p) => p.id === productId)
  const matches = products.filter((p) => {
    const q = productSearch.trim().toLowerCase()
    return !q || p.codigo.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q)
  }).slice(0, 12)
  const qty = Number(quantity || 0)
  const saldo = Number(selected?.estoque_atual || 0)
  const isSaida = title.includes('saída')

  return (
    <section className="stock-card">
      <div className="stock-card-head">
        <div>
          <span className="stock-eyebrow">Movimento de estoque • {title}</span>
          <h2>{title}</h2>
          <small>Registre a movimentação física com produto, endereço, quantidade e documento de origem.</small>
        </div>
        <Chip tone="neutral">Conferência operacional</Chip>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', alignItems: 'start' }}>
        <div>
          {/* Autocomplete de produto */}
          <div className="stock-field span-12" style={{ marginBottom: 12 }}>
            <span>Pesquisar produto</span>
            <div className="stock-autocomplete">
              <div className="stock-search" style={{ width: '100%' }}>
                <Search size={15} />
                <input
                  aria-label="Pesquisar produto"
                  placeholder="Digite código ou descrição para localizar..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); if (!e.target.value) setProductId('') }}
                />
                <button type="button" className="stock-btn stock-btn-ghost" style={{ height: 26, padding: '0 8px' }} onClick={() => { setProductSearch(''); setProductId('') }} title="Limpar">
                  <X size={14} />
                </button>
              </div>
              {productSearch && !selected && (
                <div className="stock-autocomplete-list">
                  {matches.map((p) => (
                    <button type="button" key={p.id} onClick={() => { setProductId(p.id); setProductSearch(p.codigo + ' • ' + p.nome) }}>
                      <strong>{p.codigo}</strong> • {p.nome}
                      <small style={{ color: Number(p.estoque_atual) <= 0 ? 'var(--sf-err-fg)' : 'var(--sf-ink-soft)' }}>
                        Saldo atual: {Number(p.estoque_atual || 0).toLocaleString('pt-BR')}
                      </small>
                    </button>
                  ))}
                  {!matches.length && <div style={{ padding: 10, color: 'var(--sf-ink-soft)' }}>Nenhum produto encontrado.</div>}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', padding: 12, border: '1px solid var(--sf-border)', borderRadius: 8, background: '#f7fbfc', marginBottom: 12 }}>
              <div>
                <small style={{ color: 'var(--sf-ink-soft)', fontWeight: 700 }}>PRODUTO SELECIONADO</small>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.codigo} • {selected.nome}</div>
                <small style={{ color: 'var(--sf-ink-soft)' }}>Categoria: {selected.categoria || 'Não classificada'}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small style={{ color: 'var(--sf-ink-soft)' }}>Saldo atual</small>
                <strong style={{ display: 'block', fontSize: 20 }}>{saldo.toLocaleString('pt-BR')}</strong>
              </div>
            </div>
          )}

          <div className="stock-form-grid">
            <Field label={isSaida ? 'Endereço de origem' : 'Endereço de destino'} span={6}>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Selecione o endereço</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.codigo} • {l.nome}</option>)}
              </select>
            </Field>
            <Field label="Quantidade" span={6}>
              <input type="number" min="0.0001" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0,00" />
            </Field>
            <Field label="Documento / NF / Pedido" span={6}>
              <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="NF, pedido de compra, requisição..." />
            </Field>
            <Field label="Origem" span={6}>
              <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
                <option>Manual</option>
                <option>Compra</option>
                <option>Produção</option>
                <option>Devolução</option>
                <option>Inventário</option>
                <option>Transferência</option>
                <option>Venda</option>
              </select>
            </Field>
            <Field label="Observação / rastreabilidade" span={12}>
              <textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Lote, fornecedor, conferência, motivo, responsável ou informação complementar..." />
            </Field>
          </div>
        </div>

        {/* Painel de conferência */}
        <aside style={{ border: '1px solid var(--sf-border)', borderRadius: 8, padding: 14, background: '#f9fbfc' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Conferência antes de gravar</div>
          <div className="stock-check">
            <div className="stock-check-row"><span>Produto</span><strong>{selected ? 'OK' : 'Pendente'}</strong></div>
            <div className="stock-check-row"><span>Endereço</span><strong>{locationId ? 'OK' : 'Pendente'}</strong></div>
            <div className="stock-check-row"><span>Quantidade</span><strong>{qty > 0 ? qty.toLocaleString('pt-BR') : 'Pendente'}</strong></div>
            {selected && isSaida && (
              <div className={`stock-check-hint ${qty > saldo ? 'stock-check-hint-err' : 'stock-check-hint-ok'}`}>
                {qty > saldo
                  ? <><AlertTriangle size={14} /> Saída superior ao saldo.</>
                  : <><CheckCircle2 size={14} /> Saldo suficiente. Após a saída: {(saldo - qty).toLocaleString('pt-BR')}.</>}
              </div>
            )}
            {selected && !isSaida && qty > 0 && (
              <div className="stock-check-hint stock-check-hint-ok">
                <CheckCircle2 size={14} /> Novo saldo estimado: {(saldo + qty).toLocaleString('pt-BR')}.
              </div>
            )}
          </div>
        </aside>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--sf-border)' }}>
        <button type="button" className="stock-btn stock-btn-ghost" onClick={() => { setProductSearch(''); setProductId(''); setLocationId(''); setQuantity(''); setDocumento(''); setObservacao('') }}>
          <X size={15} /> Limpar formulário
        </button>
        <button type="button" className="stock-btn stock-btn-primary" disabled={busy || !selected || !locationId || qty <= 0 || (isSaida && qty > saldo)} onClick={action}>
          {busy ? 'Gravando…' : <><PackagePlus size={15} /> {title}</>}
        </button>
      </div>
    </section>
  )
}
