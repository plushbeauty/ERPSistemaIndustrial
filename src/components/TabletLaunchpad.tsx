import type { CSSProperties } from 'react'

import { Activity, Award, Boxes, TrendingUp, CalendarDays, CheckCircle, ClipboardList, Cpu, DollarSign, Factory, Landmark, Layers, Receipt, Settings, ShoppingCart, Tablet, Truck, Upload, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type TabletLaunchpadProps = {
  onNavigate: (route: string) => void
  isOpen: boolean
  onClose: () => void
}

type Module = {
  number: string
  label: string
  route: string
  icon: typeof ShoppingCart
  accent: string
  permission?: string
}

const modules: Module[] = [
  { number:'1', label:'CONFIGURAÇÕES', route:'/configuracoes-adm', icon:Settings, accent:'#F97316' },
  { number:'2', label:'VENDAS', route:'/vendas', icon:ShoppingCart, accent:'#2D8DB8' },
  { number:'19', label:'COMISSÕES & METAS', route:'/comissoes', icon:Award, accent:'#2563EB' },
  { number:'20', label:'VALORAÇÃO ESTOQUE', route:'/inventario/balanco', icon:TrendingUp, accent:'#EA580C' },
  { number:'21', label:'AUDITORIA MARGENS', route:'/controladoria/lucratividade', icon:TrendingUp, accent:'#B45309' },
  { number:'22', label:'CLASSIFICAÇÃO FISCAL', route:'/fiscal/classificacao', icon:Receipt, accent:'#6B3FA0' },
  { number:'23', label:'RAZÃO GERAL', route:'/controladoria/razao-geral', icon:Landmark, accent:'#17445A' },
  { number:'3', label:'COMPRAS', route:'/compras-solicitacao', icon:ClipboardList, accent:'#7A4E00' },
  { number:'4', label:'ESTOQUE', route:'/estoque', icon:Boxes, accent:'#087A58' },
  { number:'5', label:'EXPEDIÇÃO', route:'/expedicao/roteirizacao', icon:Truck, accent:'#A64B00' },
  { number:'6', label:'FISCAL', route:'/fiscal', icon:Receipt, accent:'#6B3FA0' },
  { number:'7', label:'RH', route:'/rh', icon:Users, accent:'#9A3B67' },
  { number:'8', label:'ENGENHARIA', route:'/engenharia', icon:Cpu, accent:'#17445A' },
  { number:'9', label:'MATERIAIS', route:'/pcp/materiais', icon:Layers, accent:'#B85C00' },
  { number:'10', label:'MRP', route:'/mrp', icon:Layers, accent:'#8A4A00' },
  { number:'11', label:'PCP', route:'/pcp', icon:Factory, accent:'#0B7654' },
  { number:'12', label:'CHÃO DE FÁBRICA', route:'/operacao-industrial', icon:Activity, accent:'#8A6200' },
  { number:'13', label:'QUALIDADE', route:'/qualidade', icon:CheckCircle, accent:'#16788A' },
  { number:'14', label:'SGQ', route:'/qualidade', icon:CheckCircle, accent:'#0F6170' },
  { number:'15', label:'CONCILIAÇÃO BANCÁRIA', route:'/financeiro/reconciliacao', icon:Landmark, accent:'#17445A', permission:'financeiro.ver' },
  { number:'16', label:'IMPORTADOR DE EXTRATOS', route:'/financeiro/importar-extratos', icon:Upload, accent:'#087A58', permission:'financeiro.ver' },
  { number:'17', label:'ANO FISCAL', route:'/financeiro/ano-fiscal', icon:CalendarDays, accent:'#7A4E00', permission:'financeiro.ver' },
  { number:'18', label:'FLUXO DE CAIXA', route:'/financeiro/fluxo-caixa', icon:DollarSign, accent:'#0B7654', permission:'financeiro.ver' },
]

const moduleItems: Record<string, string> = {
  "VENDAS": "Pedidos • Clientes • Carteira • Catálogo Digital • Análise de Custos • Metas • Configurações",
  "COMISSÕES & METAS": "Regras de comissão • Metas por SKU • Processamento mensal • Extrato",
  "COMPRAS": "Solicitações • Pedidos de Compra • Fornecedores • Recebimento • Aprovações",
  "ESTOQUE": "Saldos • Movimentações • Ajustes • Recebimento de Lotes • Inventário • Curva ABC",
  "EXPEDIÇÃO": "Roteirização • Portaria • Separação • Conferência • Entrega",
  "FISCAL": "Emissão NF-e • Carteira NF-e • Impostos • Previsão de Caixa",
  "RH": "Colaboradores • Perfis • Rotinas Administrativas • Gestão de Pessoas",
  "ENGENHARIA": "Projetos • Pedidos • Entradas • Fichas de Processo • Códigos de Produtos • Configurações",
  "MATERIAIS": "Matéria-prima • Reservas • Lotes • Saldos • Necessidades de Materiais",
  "MRP": "Necessidades • Planejamento • Compras Planejadas • Disponibilidade",
  "PCP": "Central de OPs • Ordens • OEE • Programação • Planejamento",
  "CHÃO DE FÁBRICA": "Apontamentos • Produção • Paradas • Máquinas • Operação",
  "QUALIDADE": "Inspeção • Liberação de Lotes • Instrumentos • RPNC • PFMEA • Quarentena",
  "SGQ": "Documentos • Procedimentos • ITs • Assinaturas • Genealogia de Lotes",
  "CONFIGURAÇÕES": "Empresa • Usuários • Permissões • Parâmetros • Identidade Visual",
  "CONCILIAÇÃO BANCÁRIA": "Match • Reconciliação • Transações • Fechamento • Divergências",
  "IMPORTADOR DE EXTRATOS": "CSV • XLS • XLSX • PDF • Histórico de importações",
  "ANO FISCAL": "Período ativo • Travamento contábil • Exercício da empresa",
  "FLUXO DE CAIXA": "Rateios • Abatimentos • Liquidação • Saldo líquido"
}

export default function TabletLaunchpad({ onNavigate, isOpen, onClose }: TabletLaunchpadProps) {
  const [financeAllowed, setFinanceAllowed] = useState(false)
  useEffect(() => {
    if (!isOpen) return
    let alive = true
    void (async () => {
      const auth = await supabase.auth.getUser()
      if (!auth.data.user) { if (alive) setFinanceAllowed(false); return }
      const permission = await supabase.rpc('erp_has_permission', { p_modulo: 'financeiro', p_acao: 'ver' })
      if (alive) setFinanceAllowed(permission.error ? false : Boolean(permission.data))
    })()
    return () => { alive = false }
  }, [isOpen])
  if (!isOpen) return null

  return (
    <div className="tablet-modal-backdrop" role="dialog" aria-modal="true" aria-label="Central de módulos">
      <section className="tablet-modal">
        <header className="tablet-modal-header">
          <div className="tablet-modal-heading">
            <img src="/logo-industrial.svg" alt="ERP Industrial" className="tablet-brand-logo" />
            <div className="tablet-heading-icon"><Tablet size={25} /></div>
            <div>
              <strong>CENTRAL DE MÓDULOS — MODO TABLET</strong>
              <p>Acesse as etapas do processo produtivo diretamente por aqui.</p>
            </div>
          </div>
          <button className="tablet-close" type="button" onClick={onClose} aria-label="Fechar central de módulos"><X size={22} /></button>
        </header>

        <div className="tablet-module-grid">
          {modules.map(({ number, label, route, icon: Icon, accent, permission }) => {
            const allowed = !permission || financeAllowed
            return (
            <button
              key={`${number}-${route}`}
              type="button"
              className={`tablet-module-card ${label === 'COMISSÕES & METAS' ? 'tablet-commission-card' : ''} ${label === 'VALORAÇÃO ESTOQUE' ? 'tablet-valuation-card' : ''}`}
              disabled={!allowed}
              aria-disabled={!allowed}
              onClick={() => { if (!allowed) return; onClose(); onNavigate(route) }}
              style={{ '--module-accent': accent } as CSSProperties}
            >
              <span className="tablet-3d-icon" aria-hidden="true"><Icon size={28} strokeWidth={2.2} /></span>
              <span className="tablet-module-copy">
                <small>{number}.</small>
                <strong>{label}</strong><span className="tablet-module-items">{moduleItems[label] ?? ''}</span>
              </span>
            </button>
            )
          })}
        </div>

        <footer className="tablet-modal-footer">ERPSistema INDUSTRIAL • Central operacional integrada</footer>
      </section>
      <style>{'.tablet-modal-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.68);backdrop-filter:blur(5px)}.tablet-modal{width:min(980px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 30px 90px rgba(2,6,23,.48);padding:16px;color:#1e293b}.tablet-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #f1f5f9;padding-bottom:18px}.tablet-modal-heading{display:flex;align-items:center;gap:13px;min-width:0}.tablet-brand-logo{width:150px;height:40px;flex:none;object-fit:contain}.tablet-heading-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border-radius:12px;background:linear-gradient(145deg,#f97316,#c2410c);color:#fff;box-shadow:0 8px 18px rgba(249,115,22,.25),inset 0 1px 0 rgba(255,255,255,.25)}.tablet-modal-heading strong{display:block;font-size:11px;font-weight:950;letter-spacing:.02em;color:#1e293b}.tablet-modal-heading p{margin:4px 0 0;color:#64748b;font-size:12px;font-weight:650}.tablet-close{width:40px;height:40px;display:grid;place-items:center;flex:none;border:1px solid #475569;border-radius:9px;background:#f8fafc;color:#475569;cursor:pointer}.tablet-close:hover{background:#f1f5f9;color:#1e293b}.tablet-module-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,92px));gap:8px;margin-top:16px}.tablet-module-card{width:92px;height:92px;min-height:92px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;text-align:center;padding:9px;border:1px solid color-mix(in srgb,var(--module-accent) 24%,#e2e8f0);border-radius:7px;background:linear-gradient(180deg,#ffffff 0%,color-mix(in srgb,var(--module-accent) 7%,#ffffff) 100%);color:#1e293b;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease;box-shadow:0 7px 16px rgba(2,6,23,.18)}.tablet-module-card:hover{transform:translateY(-2px);border-color:#059669;background:rgba(236,253,245,.3)}.tablet-module-card:active{transform:translateY(0)}.tablet-module-card:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}.tablet-module-card:disabled:hover{border-color:#e2e8f0;background:#fff}.tablet-commission-card{width:92px!important;height:92px!important;min-height:92px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;padding:10px!important;border-radius:12px!important;background:#fff!important}.tablet-commission-card .tablet-3d-icon{width:auto!important;height:auto!important;border:0!important;box-shadow:none!important;background:transparent!important;color:#2563eb!important}.tablet-commission-card .tablet-module-copy{align-items:center;gap:2px}.tablet-commission-card .tablet-module-copy small{display:none}.tablet-commission-card .tablet-module-copy strong{font-size:11px!important;color:#374151!important}.tablet-commission-card .tablet-module-items{display:none}.tablet-valuation-card{width:110px!important;height:110px!important;min-height:110px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;padding:10px!important}.tablet-valuation-card .tablet-3d-icon{border:0!important;box-shadow:none!important;background:transparent!important;color:#ea580c!important}.tablet-valuation-card .tablet-module-items{display:none}.tablet-valuation-card .tablet-module-copy{align-items:center}.tablet-3d-icon{width:42px;height:42px;display:grid;place-items:center;flex:none;border-radius:10px;color:#123B50;background:#ffffff;border:1px solid #dbe3ea;box-shadow:0 4px 10px rgba(15,23,42,.08)}.tablet-3d-icon-config{background:linear-gradient(145deg,#f97316,#c2410c);border-color:#ea580c;color:#ffffff;box-shadow:0 8px 18px rgba(249,115,22,.25),inset 0 1px 0 rgba(255,255,255,.25)}.tablet-3d-icon-config img{filter:brightness(0) invert(1)}.tablet-module-copy{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}.tablet-module-copy small{color:var(--module-accent);font-size:8px;font-weight:950;letter-spacing:.08em}.tablet-module-copy strong{color:#123B50;font-size:9px;font-weight:950;line-height:1.1;letter-spacing:.01em}.tablet-module-items{display:none;color:#475569;font-size:10px;font-weight:750;line-height:1.45;white-space:normal}.tablet-modal-footer{border-top:1px solid #f1f5f9;margin-top:18px;padding-top:13px;text-align:center;color:#94a3b8;font-size:10px;font-weight:750;letter-spacing:.04em}}@media(max-width:620px){.tablet-modal{padding:16px;border-radius:14px}.tablet-module-grid{grid-template-columns:1fr}.tablet-modal-heading strong{font-size:14px}.tablet-modal-heading p{font-size:11px}.tablet-module-card{min-height:108px}.tablet-module-copy strong{font-size:16px}.tablet-module-items{font-size:10px}}'}</style>
    </div>
  )
}
