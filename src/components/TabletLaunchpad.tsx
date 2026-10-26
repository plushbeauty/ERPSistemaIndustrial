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
  { number:'1', label:'CONFIGURAÇÕES', route:'/configuracoes-adm', icon:Settings, accent:'#2D8DB8' },
  { number:'2', label:'CADASTRO DE PRODUTOS', route:'/produtos-vendas', icon:Boxes, accent:'#2D8DB8' },
  { number:'3', label:'VENDAS', route:'/vendas', icon:ShoppingCart, accent:'#2D8DB8' },
  { number:'4', label:'COMPRAS', route:'/compras-solicitacao', icon:ClipboardList, accent:'#7A4E00' },
  { number:'5', label:'ESTOQUE', route:'/estoque', icon:Boxes, accent:'#087A58' },
  { number:'6', label:'EXPEDIÇÃO', route:'/expedicao/roteirizacao', icon:Truck, accent:'#A64B00' },
  { number:'7', label:'FISCAL', route:'/fiscal', icon:Receipt, accent:'#6B3FA0' },
  { number:'8', label:'RH', route:'/rh', icon:Users, accent:'#9A3B67' },
  { number:'9', label:'ENGENHARIA', route:'/engenharia', icon:Cpu, accent:'#17445A' },
  { number:'10', label:'MATERIAIS', route:'/pcp/materiais', icon:Layers, accent:'#B85C00' },
  { number:'11', label:'MRP', route:'/mrp', icon:Layers, accent:'#8A4A00' },
  { number:'12', label:'PCP', route:'/pcp', icon:Factory, accent:'#0B7654' },
  { number:'13', label:'CHÃO DE FÁBRICA', route:'/operacao-industrial', icon:Activity, accent:'#8A6200' },
  { number:'14', label:'QUALIDADE', route:'/qualidade', icon:CheckCircle, accent:'#16788A' },
  { number:'15', label:'SGQ', route:'/qualidade', icon:CheckCircle, accent:'#0F6170' },
  { number:'16', label:'CONCILIAÇÃO BANCÁRIA', route:'/financeiro/reconciliacao', icon:Landmark, accent:'#17445A', permission:'financeiro.ver' },
  { number:'17', label:'IMPORTADOR DE EXTRATOS', route:'/financeiro/importar-extratos', icon:Upload, accent:'#087A58', permission:'financeiro.ver' },
  { number:'18', label:'ANO FISCAL', route:'/financeiro/ano-fiscal', icon:CalendarDays, accent:'#7A4E00', permission:'financeiro.ver' },
  { number:'19', label:'FLUXO DE CAIXA', route:'/financeiro/fluxo-caixa', icon:DollarSign, accent:'#0B7654', permission:'financeiro.ver' },
  { number:'20', label:'COMISSÕES & METAS', route:'/comissoes', icon:Award, accent:'#2563EB' },
  { number:'21', label:'BALANÇO DE ESTOQUE', route:'/inventario/balanco', icon:TrendingUp, accent:'#EA580C' },
  { number:'22', label:'AUDITORIA DE MARGENS', route:'/controladoria/lucratividade', icon:TrendingUp, accent:'#B45309' },
  { number:'23', label:'CLASSIFICAÇÃO FISCAL', route:'/fiscal/classificacao', icon:Receipt, accent:'#6B3FA0' },
  { number:'24', label:'RAZÃO GERAL', route:'/controladoria/razao-geral', icon:Landmark, accent:'#17445A' },
]

const moduleItems: Record<string, string> = {
  "CADASTRO DE PRODUTOS": "Produtos • SKUs • Unidades • Grupos • Estoque • Preços",
  "VENDAS": "Pedidos • Clientes • Carteira • Catálogo Digital • Análise de Custos • Metas",
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
            <img src="/logo/logo.png" alt="SGQERP Industrial" className="tablet-brand-logo" />
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
      <style>{'.tablet-modal-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.68);backdrop-filter:blur(5px)}.tablet-modal{width:min(1320px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#ffffff;border:1px solid #d7e5ea;border-radius:10px;box-shadow:0 30px 90px rgba(2,6,23,.38);padding:20px;color:#1e293b}.tablet-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #e4edf0;padding-bottom:16px}.tablet-modal-heading{display:flex;align-items:center;gap:13px;min-width:0}.tablet-brand-logo{width:150px;height:40px;flex:none;object-fit:contain}.tablet-heading-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border-radius:8px;background:#2D8DB8;color:#fff;box-shadow:0 5px 12px rgba(18,59,80,.18)}.tablet-modal-heading strong{display:block;font-size:13px;font-weight:850;letter-spacing:.03em;color:#123b50}.tablet-modal-heading p{margin:4px 0 0;color:#64748b;font-size:11px;font-weight:600}.tablet-close{width:38px;height:38px;display:grid;place-items:center;flex:none;border:1px solid #cbd8de;border-radius:8px;background:#f8fafc;color:#475569;cursor:pointer}.tablet-close:hover{background:#f1f5f9;color:#1e293b}.tablet-module-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:16px}.tablet-module-card{width:auto;min-height:128px;display:flex;flex-direction:row;justify-content:flex-start;align-items:flex-start;gap:10px;text-align:left;padding:12px;border:1px solid color-mix(in srgb,var(--module-accent) 22%,#dce7eb);border-radius:8px;background:#fff;color:#1e293b;cursor:pointer;transition:border-color .16s ease,background .16s ease,box-shadow .16s ease}.tablet-module-card:hover{border-color:#2d8db8;background:#f4fbfd;box-shadow:0 5px 14px rgba(18,59,80,.08)}.tablet-module-card:disabled{opacity:.4;cursor:not-allowed}.tablet-3d-icon{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:8px;color:#fff;background:var(--module-accent);border:1px solid color-mix(in srgb,var(--module-accent) 75%,#123b50)}.tablet-module-copy{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0;text-align:left}.tablet-module-copy small{color:var(--module-accent);font-size:9px;font-weight:800;letter-spacing:.08em}.tablet-module-copy strong{color:#123b50;font-size:10px;font-weight:850;line-height:1.25;letter-spacing:.01em;overflow-wrap:anywhere}.tablet-module-items{display:block;color:#607681;font-size:9px;font-weight:550;line-height:1.4;overflow-wrap:anywhere}.tablet-modal-footer{border-top:1px solid #dbe7ea;margin-top:16px;padding-top:11px;text-align:center;color:#64777d;font-size:9px;font-weight:650;letter-spacing:.04em}@media(max-width:1050px){.tablet-module-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){.tablet-modal-backdrop{padding:10px}.tablet-modal{padding:12px;border-radius:8px}.tablet-module-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tablet-modal-heading strong{font-size:11px}.tablet-modal-heading p{font-size:10px}.tablet-brand-logo{width:95px;height:34px}.tablet-module-card{min-height:118px;padding:9px;gap:8px}.tablet-module-copy strong{font-size:9px}.tablet-module-items{font-size:8px}}@media(max-width:420px){.tablet-module-grid{grid-template-columns:1fr}.tablet-modal-heading{gap:8px}.tablet-brand-logo{width:76px}.tablet-heading-icon{width:38px;height:38px}}'}</style>
    </div>
  )
}
