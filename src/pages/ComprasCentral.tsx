/**
 * SYSNQRA ERP INDUSTRIAL — Central de Compras aprovada.
 * REVISÃO: APROV-COMPRAS-2026-10-24-R1 | DATA/HORA: 2026-10-24 18:36:28 -03:00.
 * BASE: deployment Vercel EjPo9mBaQ / commit 16060aad0fce987250586f6c7fb7bb2f20b003c7.
 * ESCOPO desta revisão: corrigir somente geometria dos cards de acesso rápido e congelar esta versão.
 * Preservar cabeçalho, abas, rotas, paleta e fluxos de dados reais do Supabase.
 */
import { ArrowRight, AlertTriangle, BarChart3, ClipboardList, FileText, PackageCheck, ShoppingCart, Truck, ShieldCheck, Boxes, FilePlus2, RefreshCw, LayoutGrid } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabaseClient'
import ComprasAbaNativa from './ComprasAbaNativa'

const mainCards = [
  { title: 'Requisições', description: 'Registre necessidades de materiais, acompanhe urgências e encaminhe itens para cotação.', detail: 'NECESSIDADES E APROVAÇÕES', route: '/compras/requisicoes', Icon: ClipboardList, tone: 'blue' },
  { title: 'Cotações e mapa comparativo', description: 'Consulte cotações, compare propostas de fornecedores e registre a decisão comercial.', detail: 'RFQ • COMPARAÇÃO DE PREÇOS', route: '/compras/rfq', Icon: FileText, tone: 'orange' },
  { title: 'Pedidos de compra', description: 'Acompanhe pedidos, condições comerciais, aprovações e prazos de entrega.', detail: 'ORDENS E APROVAÇÕES', route: '/compras/pedido', Icon: ShoppingCart, tone: 'green' },
  { title: 'Fornecedores', description: 'Acesse os fornecedores cadastrados e seus dados de qualificação comercial.', detail: 'CADASTRO E QUALIFICAÇÃO', route: '/compras/fornecedores', Icon: Truck, tone: 'purple' },
]

const shortcuts = [
  { title: 'Recebimentos', description: 'Entrada e conferência de materiais', route: '/compras/recebimentos', Icon: PackageCheck, tone: 'teal' },
  { title: 'Análise de preços', description: 'Revisão e decisão de propostas', route: '/compras/analise-precos', Icon: BarChart3, tone: 'blue' },
  { title: 'Validação fiscal', description: 'Conferência fiscal dos pedidos', route: '/fiscal/compras', Icon: ShieldCheck, tone: 'orange' },
  { title: 'Relatórios', description: 'Consultas e acompanhamento', route: '/compras/relatorios', Icon: Boxes, tone: 'green' },
]

type PurchaseIndicators = { alerts: number | null; approvals: number | null; approved: number | null; quotes: number | null; openOrders: number | null; received: number | null; openValue: number | null; error: string }
type MaterialNeed = { id: string; code: string; name: string; level: number; gross: number; stock: number; reserved: number; available: number; net: number; suggestion: string }
type PurchaseTab = { label: string; route: string; Icon: typeof LayoutGrid; countKey?: 'approvals' | 'alerts' | 'quotes' | 'openOrders' }

const purchaseTabs: PurchaseTab[] = [
  { label: 'Painel', route: '/compras', Icon: LayoutGrid },
  { label: 'Pedido do PCP', route: '/compras/solicitacao', Icon: FilePlus2 },
  { label: 'Requisições', route: '/compras/requisicoes', Icon: ClipboardList, countKey: 'approvals' },
  { label: 'Alertas MRP', route: '/pcp/mrp-ii', Icon: AlertTriangle, countKey: 'alerts' },
  { label: 'Cotações', route: '/compras/rfq', Icon: BarChart3, countKey: 'quotes' },
  { label: 'Pedidos', route: '/compras/pedido', Icon: ShoppingCart, countKey: 'openOrders' },
  { label: 'Fornecedores', route: '/compras/fornecedores', Icon: Truck },
]

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComprasCentral() {
  const navigate = useNavigate()
  const [indicators, setIndicators] = useState<PurchaseIndicators>({ alerts: null, approvals: null, approved: null, quotes: null, openOrders: null, received: null, openValue: null, error: '' })
  const [materialNeeds, setMaterialNeeds] = useState<MaterialNeed[]>([])
  const [loadingIndicators, setLoadingIndicators] = useState(false)
  const [activeTab, setActiveTab] = useState('Painel')

  const loadIndicators = useCallback(async () => {
    setLoadingIndicators(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [requests, orders, quotes, run] = await Promise.all([
        supabase.from('erp_requisicoes_compra').select('id,status').eq('empresa_id', empresaId),
        supabase.from('erp_pedidos_compra').select('id,total,status').eq('empresa_id', empresaId),
        supabase.from('erp_rfq').select('id,status').eq('empresa_id', empresaId),
        supabase.from('erp_mrp_runs').select('id,created_at').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const openOrders = (orders.data ?? []).filter((row) => !['CONCLUIDO', 'CONCLUÍDO', 'CANCELADO', 'CANCELADA', 'RECEBIDO', 'RECEBIDA', 'CONCLUIDA', 'CONCLUÍDA'].includes(String(row.status ?? '').toUpperCase()))
      const pendingStatuses = new Set(['PENDENTE', 'PENDENTE_APROVACAO', 'AGUARDANDO_APROVACAO', 'EM_ANALISE', 'AGUARDANDO'])
      const approvedStatuses = new Set(['APROVADA', 'APROVADO', 'AUTORIZADA', 'AUTORIZADO'])
      const receivedStatuses = new Set(['RECEBIDO', 'RECEBIDA', 'CONCLUIDO', 'CONCLUÍDO', 'CONCLUIDA', 'CONCLUÍDA'])
      const quoteStatuses = new Set(['ABERTA', 'EM_COTACAO', 'EM COTAÇÃO', 'EM ANÁLISE', 'EM_ANALISE', 'PENDENTE', 'AGUARDANDO_COTACAO'])
      let alerts: number | null = null
      let loadedNeeds: MaterialNeed[] = []
      let mrpError: string | null = run.error?.message ?? null

      if (run.data?.id) {
        const needs = await supabase.from('erp_mrp_necessidades')
          .select('id,componente_id,nivel,quantidade_bruta,estoque_atual,reservado,quantidade_disponivel,necessidade_liquida,sugestao')
          .eq('empresa_id', empresaId).eq('run_id', run.data.id).gt('necessidade_liquida', 0)
          .order('nivel').order('componente_id')
        if (needs.error) {
          mrpError = needs.error.message
        } else {
          const rows = needs.data ?? []
          alerts = rows.length
          const ids = [...new Set(rows.map((row) => String(row.componente_id)))]
          const products = ids.length
            ? await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', empresaId).in('id', ids)
            : { data: [], error: null }
          if (products.error) {
            mrpError = products.error.message
          } else {
            const productMap = new Map((products.data ?? []).map((product) => [String(product.id), product]))
            loadedNeeds = rows.map((row) => {
              const product = productMap.get(String(row.componente_id))
              return {
                id: String(row.id),
                code: product?.codigo ?? '—',
                name: product?.nome ?? 'Material sem nome cadastrado',
                level: Number(row.nivel ?? 0),
                gross: Number(row.quantidade_bruta ?? 0),
                stock: Number(row.estoque_atual ?? 0),
                reserved: Number(row.reservado ?? 0),
                available: Number(row.quantidade_disponivel ?? 0),
                net: Number(row.necessidade_liquida ?? 0),
                suggestion: String(row.sugestao ?? '—'),
              }
            })
          }
        }
      } else if (!run.error) {
        alerts = 0
      }
      setMaterialNeeds(loadedNeeds)
      const errorMessages = [requests.error?.message, orders.error?.message, quotes.error?.message, mrpError].filter(Boolean)
      setIndicators({
        alerts,
        approvals: requests.error ? null : (requests.data ?? []).filter((row) => pendingStatuses.has(String(row.status ?? '').toUpperCase())).length,
        approved: requests.error ? null : (requests.data ?? []).filter((row) => approvedStatuses.has(String(row.status ?? '').toUpperCase())).length,
        quotes: quotes.error ? null : (quotes.data ?? []).filter((row) => quoteStatuses.has(String(row.status ?? '').toUpperCase())).length,
        openOrders: orders.error ? null : openOrders.length,
        received: orders.error ? null : (orders.data ?? []).filter((row) => receivedStatuses.has(String(row.status ?? '').toUpperCase())).length,
        openValue: orders.error ? null : openOrders.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
        error: errorMessages.join(' • '),
      })
    } catch (error) {
      setIndicators((current) => ({ ...current, error: error instanceof Error ? error.message : 'Não foi possível consultar os indicadores.' }))
    } finally {
      setLoadingIndicators(false)
    }
  }, [])
  useEffect(() => { void loadIndicators() }, [loadIndicators])
  const flowStages: Array<{ step: string; label: string; value: number | null }> = [
    { step: '1', label: 'Aprovação', value: indicators.approvals },
    { step: '2', label: 'Aprovadas', value: indicators.approved },
    { step: '3', label: 'Cotação', value: indicators.quotes },
    { step: '4', label: 'Pedido', value: indicators.openOrders },
    { step: '5', label: 'Recebido', value: indicators.received },
  ]

  return (
    <main className="synqra-purchase-hub">
        <style>{`
          .synqra-purchase-hub{--sq-navy:#0b2545;--sq-blue:#1d5fd1;--sq-cyan:#22b8cf;min-height:calc(100vh - 70px);padding:12px;color:#172b43;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif}
          .sq-purchase-wrap{max-width:1600px;margin:0 auto}
          .sq-purchase-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 26px;border-radius:18px;background:linear-gradient(115deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 12px 28px rgba(11,37,69,.16)}
          .sq-purchase-hero:after{content:"";position:absolute;width:250px;height:250px;right:5%;top:-145px;border:1px solid rgba(255,255,255,.13);border-radius:50%;box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 58px rgba(255,255,255,.025);pointer-events:none}
          .sq-purchase-eyebrow{display:flex;align-items:center;gap:8px;color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
          .sq-purchase-hero h1{margin:8px 0 6px;font-size:clamp(22px,2.4vw,32px);font-weight:750;line-height:1.15;letter-spacing:-.025em;color:#fff}
          .sq-purchase-hero p{max-width:740px;margin:0;color:#e1edf9;font-size:13px;line-height:1.6}
          .sq-purchase-hero-actions{position:relative;z-index:1;display:flex;align-items:flex-end;flex-direction:column;gap:14px;flex:0 0 auto}.sq-purchase-hero-actions>button{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:linear-gradient(180deg,#fff 0%,#e8f0fa 100%);color:#0b2545;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer;border-radius:12px;box-shadow:0 5px 0 rgba(4,18,38,.24),0 9px 16px rgba(0,0,0,.16);transition:transform .16s ease,box-shadow .16s ease,background .16s ease}.sq-purchase-hero-actions>button:hover{background:linear-gradient(180deg,#fff 0%,#dceaff 100%);transform:translateY(-1px);box-shadow:0 6px 0 rgba(4,18,38,.2),0 12px 20px rgba(0,0,0,.18)}.sq-purchase-hero-actions>button:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(4,18,38,.2),0 4px 8px rgba(0,0,0,.12)}
          .sq-purchase-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.sq-purchase-kpis article{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:16px;border:1px solid #e0e7f0;border-radius:13px;background:#fff;box-shadow:0 3px 10px rgba(15,35,65,.035);min-width:0}.sq-purchase-kpis article span{display:block;color:#64748b;font-size:11px;font-weight:650}.sq-purchase-kpis article strong{display:block;margin-top:7px;color:#102c4e;font-size:27px;line-height:1.1;font-weight:800}.sq-purchase-kpis article small{display:block;margin-top:5px;color:#7b8a9d;font-size:10px}.sq-purchase-kpis article i{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:10px;background:#edf4ff;color:#1d5fd1;font-style:normal}.sq-purchase-kpis article i.alert{background:#fff0f0;color:#d12c36}.sq-purchase-kpi-error{grid-column:1/-1;margin:0;padding:8px 10px;border-radius:7px;background:#fff7ed;color:#9a3412;font-size:11px;overflow-wrap:anywhere}
          .sq-purchase-tabs{display:flex;align-items:center;gap:5px;margin:16px 0 4px;padding:7px;border:1px solid #e0e7f0;border-radius:12px;background:#fff;overflow-x:auto}.sq-purchase-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;min-height:36px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#52677f;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.sq-purchase-tabs button:hover{background:#f1f5f9}.sq-purchase-tabs button.active{background:#0b2545;color:#fff}.sq-purchase-tabs button b{display:grid;place-items:center;min-width:19px;height:19px;padding:0 5px;border-radius:99px;background:#dbeafe;color:#1d4ed8;font-size:10px}.sq-purchase-tabs button.active b{background:#fff;color:#0b2545}.sq-purchase-tabs .sq-purchase-refresh{margin-left:auto;min-width:34px;padding:0;color:#1d5fd1}
          .sq-purchase-flow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:14px 0}.sq-purchase-flow article{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #e0e7f0;border-radius:11px;background:#fff}.sq-purchase-flow article>span{display:grid;place-items:center;flex:0 0 29px;height:29px;border-radius:9px;background:#eaf2ff;color:#1d5fd1;font-size:12px;font-weight:800}.sq-purchase-flow small{display:block;color:#64748b;font-size:10px}.sq-purchase-flow strong{display:block;margin-top:3px;color:#102c4e;font-size:18px}
          .sq-purchase-mrp{margin:14px 0 20px;border:1px solid #e0e7f0;border-radius:14px;background:#fff;overflow:hidden}.sq-purchase-mrp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #e8edf4}.sq-purchase-mrp-head h2{margin:0;color:#102c4e;font-size:16px;font-weight:750}.sq-purchase-mrp-head p{margin:5px 0 0;color:#687b90;font-size:11px}.sq-purchase-mrp-head button{display:flex;align-items:center;gap:5px;padding:8px 10px;border:1px solid #cbd9e8;border-radius:7px;background:#fff;color:#1d5fd1;font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer}.sq-purchase-mrp-scroll{overflow-x:auto}.sq-purchase-mrp table{width:100%;border-collapse:collapse;min-width:760px}.sq-purchase-mrp th,.sq-purchase-mrp td{padding:10px 12px;border-bottom:1px solid #edf1f6;text-align:left;color:#334b63;font-size:11px}.sq-purchase-mrp th{background:#f8fafc;color:#64748b;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.sq-purchase-mrp td strong,.sq-purchase-mrp td small{display:block}.sq-purchase-mrp td small{margin-top:3px;color:#718198;font-size:10px}.sq-purchase-mrp-badge{display:inline-block;padding:4px 7px;border:1px solid #dbeafe;border-radius:6px;background:#eff6ff;color:#1d4ed8}.sq-purchase-mrp-badge.critical{border-color:#fecaca;background:#fef2f2;color:#b91c1c}.sq-purchase-mrp-status{display:inline-block;padding:4px 7px;border-radius:6px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:750}.sq-purchase-mrp-status.buy{background:#fff7ed;color:#c2410c}.sq-purchase-empty{text-align:center!important;padding:22px!important;color:#718198!important}
          .sq-purchase-brand{position:relative;z-index:1;flex:0 0 auto;text-align:right}
          .sq-purchase-brand strong{display:block;font-size:13px;letter-spacing:.08em;color:#fff}
          .sq-purchase-brand span{display:block;margin-top:5px;color:#bfeef6;font-size:9px;font-weight:700;letter-spacing:.16em}
          .sq-purchase-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:22px 2px 12px}
          .sq-purchase-section-head h2{margin:0;color:#102c4e;font-size:18px;font-weight:750}
          .sq-purchase-section-head p{margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.5}
          .sq-purchase-section-head small{color:#64748b;font-size:10px;white-space:nowrap}
          .sq-purchase-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
          .sq-purchase-card{position:relative;display:flex;flex-direction:column;min-width:0;min-height:218px;padding:18px;border:1px solid transparent;border-radius:16px;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;box-shadow:0 5px 16px rgba(15,35,65,.045)}
          .sq-purchase-card:hover{transform:translateY(-3px);box-shadow:0 12px 25px rgba(15,35,65,.11)}
          .sq-purchase-card:focus-visible,.sq-purchase-shortcut:focus-visible{outline:3px solid #22b8cf;outline-offset:3px}
          .sq-purchase-card.blue{background:#eaf2ff;border-color:#d7e5ff}.sq-purchase-card.orange{background:#fff1e6;border-color:#ffe1ca}.sq-purchase-card.green{background:#e8f7ef;border-color:#ccebd9}.sq-purchase-card.purple{background:#f1edff;border-color:#e1d9ff}
          .sq-purchase-icon{display:grid;place-items:center;width:46px;height:46px;margin-bottom:15px;border-radius:13px;background:#fff;box-shadow:0 3px 9px rgba(15,35,65,.06)}
          .sq-purchase-card.blue .sq-purchase-icon{color:#1d5fd1}.sq-purchase-card.orange .sq-purchase-icon{color:#c56a1a}.sq-purchase-card.green .sq-purchase-icon{color:#168653}.sq-purchase-card.purple .sq-purchase-icon{color:#7650c9}
          .sq-purchase-card h3{margin:0 0 8px;color:#102c4e;font-size:16px;font-weight:750;line-height:1.35}
          .sq-purchase-card p{flex:1;margin:0;color:#4d6178;font-size:12px;line-height:1.6}
          .sq-purchase-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:17px;padding-top:12px;border-top:1px solid rgba(40,65,95,.12)}
          .sq-purchase-card-foot span{font-size:9px;font-weight:800;letter-spacing:.06em;color:#52677f}
          .sq-purchase-card-foot svg{color:#1d5fd1;transition:transform .18s}.sq-purchase-card:hover .sq-purchase-card-foot svg{transform:translateX(3px)}
          .sq-purchase-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
          .sq-purchase-shortcut{display:flex;align-items:center;gap:16px;min-width:0;min-height:78px;padding:18px 20px;border:1px solid #e0e7f0;border-radius:13px;background:#fff;text-align:left;cursor:pointer;transition:border-color .18s,transform .18s,box-shadow .18s}
          .sq-purchase-shortcut:hover{transform:translateY(-2px);border-color:#b9d5f5;box-shadow:0 7px 18px rgba(15,35,65,.06)}
          .sq-purchase-shortcut-icon{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:12px;background:#eff6ff;color:#1d5fd1}
          .sq-purchase-shortcut.orange .sq-purchase-shortcut-icon{background:#fff4e8;color:#c56a1a}.sq-purchase-shortcut.green .sq-purchase-shortcut-icon{background:#eaf8f0;color:#168653}.sq-purchase-shortcut.teal .sq-purchase-shortcut-icon{background:#e6f9fb;color:#12889b}
          .sq-purchase-shortcut strong{display:block;color:#173452;font-size:13px;font-weight:750;line-height:1.45;overflow-wrap:anywhere}.sq-purchase-shortcut small{display:block;margin-top:5px;color:#687b90;font-size:11px;line-height:1.5;overflow-wrap:anywhere}
          /* APROV-COMPRAS-2026-10-24-R1: neutraliza o reset global de botões de 30px apenas nos cards da Central. */
          .synqra-purchase-hub .sq-purchase-grid,.synqra-purchase-hub .sq-purchase-shortcuts{align-items:stretch;min-width:0}
          .synqra-purchase-hub .sq-purchase-card{box-sizing:border-box;width:100%;height:auto!important;min-height:218px!important;padding:18px!important;white-space:normal!important;overflow-wrap:anywhere;border-radius:16px!important;align-items:stretch}
          .synqra-purchase-hub .sq-purchase-shortcut{box-sizing:border-box;display:flex;width:100%;height:auto!important;min-height:78px!important;padding:18px 20px!important;white-space:normal!important;overflow-wrap:anywhere;border-radius:13px!important;align-items:center}
          .synqra-purchase-hub .sq-purchase-shortcut>span:nth-child(2){flex:1;min-width:0}
          .synqra-purchase-hub .sq-purchase-card h3,.synqra-purchase-hub .sq-purchase-card p,.synqra-purchase-hub .sq-purchase-card-foot,.synqra-purchase-hub .sq-purchase-shortcut strong,.synqra-purchase-hub .sq-purchase-shortcut small{min-width:0;overflow-wrap:anywhere}
          .sq-purchase-description{display:flex;align-items:flex-start;gap:13px;margin-top:18px;padding:17px 19px;border:1px solid #e0e7f0;border-radius:15px;background:linear-gradient(110deg,#fff,#f9fbff)}
          .sq-purchase-description-icon{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:12px;background:#edf4ff;color:#1d5fd1}
          .sq-purchase-description h3{margin:1px 0 5px;color:#102c4e;font-size:13px;font-weight:750}.sq-purchase-description p{margin:0;color:#5b6f85;font-size:12px;line-height:1.65}
          .sq-purchase-footer{display:flex;justify-content:space-between;gap:12px;margin:12px 2px 0;color:#8190a3;font-size:10px}
          @media(max-width:1100px){.sq-purchase-grid,.sq-purchase-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}.sq-purchase-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.sq-purchase-flow{grid-template-columns:repeat(3,minmax(0,1fr))}.sq-purchase-card{min-height:200px}}
          @media(max-width:650px){.synqra-purchase-hub{padding:8px}.sq-purchase-hero{align-items:flex-start;flex-direction:column;padding:20px;border-radius:15px}.sq-purchase-hero-actions{align-items:flex-start;flex-direction:column-reverse}.sq-purchase-brand{text-align:left}.sq-purchase-section-head{align-items:flex-start;flex-direction:column;margin-top:18px}.sq-purchase-kpis{grid-template-columns:1fr 1fr;gap:7px}.sq-purchase-kpis article{padding:11px}.sq-purchase-kpis article strong{font-size:23px}.sq-purchase-tabs{margin-top:10px}.sq-purchase-tabs button{padding:0 9px}.sq-purchase-flow{grid-template-columns:1fr 1fr}.sq-purchase-mrp-head{align-items:flex-start;flex-direction:column}.sq-purchase-grid,.sq-purchase-shortcuts{grid-template-columns:1fr}.sq-purchase-card{min-height:175px}.sq-purchase-footer{flex-direction:column}}
          @media(prefers-reduced-motion:reduce){.sq-purchase-card,.sq-purchase-shortcut,.sq-purchase-card-foot svg{transition:none}}
        `}</style>
        <div className="sq-purchase-wrap">
          <header className="sq-purchase-hero">
            <div>
              <div className="sq-purchase-eyebrow"><ShoppingCart size={15} /> SUPRIMENTOS • SYSNQRA ERP INDUSTRIAL</div>
              <h1>Central de Compras</h1>
              <p>Requisição → aprovação por alçada → cotação → pedido → recebimento, integrado ao PCP e ao estoque.</p>
            </div>
            <div className="sq-purchase-hero-actions"><button type="button" onClick={() => setActiveTab('Pedido do PCP')}><FilePlus2 size={16}/> Novo pedido do PCP</button><div className="sq-purchase-brand"><strong>SYSNQRA</strong><span>GESTÃO INTEGRADA</span></div></div>
          </header>
          <section className="sq-purchase-kpis" aria-label="Indicadores de Compras">
            <article><div><span>Necessidades MRP</span><strong>{indicators.alerts === null ? '—' : indicators.alerts}</strong><small>{indicators.alerts === null ? 'MRP não disponível' : 'necessidades líquidas no último MRP'}</small></div><i className="alert"><AlertTriangle size={20}/></i></article>
            <article><div><span>Aguardando aprovação</span><strong>{indicators.approvals === null ? '—' : indicators.approvals}</strong><small>requisições pendentes</small></div><i><ClipboardList size={20}/></i></article>
            <article><div><span>Em cotação</span><strong>{indicators.quotes === null ? '—' : indicators.quotes}</strong><small>mapas em andamento</small></div><i><BarChart3 size={20}/></i></article>
            <article><div><span>Pedidos em aberto</span><strong>{indicators.openOrders === null ? '—' : indicators.openOrders}</strong><small>{indicators.openValue === null ? 'valor indisponível' : brl(indicators.openValue)}</small></div><i><Truck size={20}/></i></article>
            {indicators.error && <p className="sq-purchase-kpi-error" role="status">Alguns indicadores não puderam ser atualizados: {indicators.error}</p>}
          </section>
          <nav className="sq-purchase-tabs" aria-label="Navegação da Central de Compras">
            {purchaseTabs.map(({ label, Icon, countKey }) => <button key={label} type="button" className={activeTab === label ? 'active' : ''} aria-current={activeTab === label ? 'page' : undefined} onClick={() => setActiveTab(label)}><Icon size={15}/><span>{label}</span>{countKey && indicators[countKey] !== null && <b>{indicators[countKey]}</b>}</button>)}
            <button type="button" className="sq-purchase-refresh" onClick={() => void loadIndicators()} disabled={loadingIndicators} aria-label="Atualizar indicadores"><RefreshCw size={15}/></button>
          </nav>
          {activeTab === 'Painel' ? <>
            <section className="sq-purchase-flow" aria-label="Fluxo de compras">
              {flowStages.map(({ step, label, value }) => <article key={step}><span>{step}</span><div><small>{label}</small><strong>{value === null ? '—' : value}</strong></div></article>)}
            </section>
            <section className="sq-purchase-mrp" aria-labelledby="sq-purchase-mrp-title">
              <div className="sq-purchase-mrp-head">
                <div><h2 id="sq-purchase-mrp-title">Alertas de material — MRP</h2><p>Saldo, reservas e necessidades da última execução MRP da empresa ativa. Os dados vêm do cálculo registrado no ERP.</p></div>
                <button type="button" onClick={() => setActiveTab('Alertas MRP')}>Ver Alertas MRP <ArrowRight size={14}/></button>
              </div>
              <div className="sq-purchase-mrp-scroll"><table><thead><tr><th>Material</th><th>Nível</th><th>Estoque</th><th>Reservado PCP</th><th>Disponível</th><th>Necessidade líquida</th><th>Sugestão</th></tr></thead><tbody>
                {materialNeeds.map((row) => <tr key={row.id}><td><strong>{row.code}</strong><small>{row.name}</small></td><td>{row.level}</td><td>{row.stock.toLocaleString('pt-BR')}</td><td>{row.reserved.toLocaleString('pt-BR')}</td><td>{row.available.toLocaleString('pt-BR')}</td><td><b className={row.net > row.stock ? 'sq-purchase-mrp-badge critical' : 'sq-purchase-mrp-badge'}>{row.net.toLocaleString('pt-BR')}</b></td><td><span className={row.suggestion === 'COMPRAR' ? 'sq-purchase-mrp-status buy' : 'sq-purchase-mrp-status'}>{row.suggestion}</span></td></tr>)}
                {!materialNeeds.length && <tr><td colSpan={7} className="sq-purchase-empty">{indicators.alerts === null ? 'Não foi possível consultar o MRP ou ainda não existe execução disponível.' : 'Nenhuma necessidade líquida positiva na última execução MRP.'}</td></tr>}
              </tbody></table></div>
            </section>
          </> : <ComprasAbaNativa tab={activeTab} onRefresh={() => void loadIndicators()} />}
          {activeTab === 'Painel' && <>
          <section aria-labelledby="sq-purchase-main-title">
            <div className="sq-purchase-section-head"><div><h2 id="sq-purchase-main-title">Acesso rápido às rotinas</h2><p>Atalhos para abrir os módulos operacionais de compras já integrados ao ERP.</p></div><small>4 áreas principais</small></div>
            <div className="sq-purchase-grid">
              {mainCards.map(({title,description,detail,Icon,tone}) => <button key={title} type="button" className={`sq-purchase-card ${tone}`} onClick={() => setActiveTab(({ 'Requisições': 'Requisições', 'Cotações e mapa comparativo': 'Cotações', 'Pedidos de compra': 'Pedidos', 'Fornecedores': 'Fornecedores' } as Record<string, string>)[title] ?? 'Painel')} aria-label={`Abrir ${title}`}>
                <span className="sq-purchase-icon"><Icon size={23} strokeWidth={1.9}/></span>
                <h3>{title}</h3><p>{description}</p>
                <span className="sq-purchase-card-foot"><span>{detail}</span><ArrowRight size={17}/></span>
              </button>)}
            </div>
          </section>
          <section aria-labelledby="sq-purchase-shortcuts-title">
            <div className="sq-purchase-section-head"><div><h2 id="sq-purchase-shortcuts-title">Outras rotinas</h2><p>Atalhos para conferência, análise e acompanhamento.</p></div></div>
            <div className="sq-purchase-shortcuts">
              {shortcuts.map(({title,description,route,Icon,tone}) => <button key={title} type="button" className={`sq-purchase-shortcut ${tone}`} onClick={() => navigate(route)}>
                <span className="sq-purchase-shortcut-icon"><Icon size={20}/></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={15}/>
              </button>)}
            </div>
          </section>
          </>}
          <footer className="sq-purchase-footer"><span>SYSNQRA ERP INDUSTRIAL • Compras e Suprimentos</span><span>As rotinas usam os cadastros, permissões e registros reais já existentes no sistema.</span></footer>
        </div>
    </main>
  )
}
