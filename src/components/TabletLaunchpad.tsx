import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { Activity, Boxes, CheckCircle, ClipboardList, Cpu, Factory, Layers, Receipt, Settings, ShoppingCart, Tablet, Truck, Users, X } from 'lucide-react'

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
}

const tabletIconAssets = import.meta.glob('../assets/icones-tablet/*.{png,svg,webp,jpg,jpeg}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

function normalizeIconKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resolveTabletIcon(number: string, label: string) {
  const numberKey = number.padStart(2, '0')
  const labelKey = normalizeIconKey(label)
  const entries = Object.entries(tabletIconAssets)

  const exactNumber = entries.find(([path]) => {
    const file = normalizeIconKey(path.split('/').pop()?.replace(/\\.[^.]+$/, '') ?? '')
    return file.startsWith(`${numberKey}-`) || file.startsWith(`${number}-`)
  })
  if (exactNumber) return exactNumber[1]

  const exactLabel = entries.find(([path]) => {
    const file = normalizeIconKey(path.split('/').pop()?.replace(/\\.[^.]+$/, '') ?? '')
    return file === labelKey || file.includes(labelKey)
  })
  return exactLabel?.[1] ?? null
}

const modules: Module[] = [
  { number:'1', label:'CONFIGURAÇÕES', route:'/configuracoes-adm', icon:Settings, accent:'#F97316' },
  { number:'2', label:'VENDAS', route:'/vendas', icon:ShoppingCart, accent:'#2D8DB8' },
  { number:'3', label:'COMPRAS', route:'/compras-solicitacao', icon:ClipboardList, accent:'#7A4E00' },
  { number:'4', label:'ESTOQUE', route:'/estoque', icon:Boxes, accent:'#087A58' },
  { number:'5', label:'EXPEDIÇÃO', route:'/expedicao/roteirizacao', icon:Truck, accent:'#A64B00' },
  { number:'6', label:'FISCAL', route:'/fiscal', icon:Receipt, accent:'#6B3FA0' },
  { number:'7', label:'RH', route:'/rh', icon:Users, accent:'#9A3B67' },
  { number:'8', label:'ENGENHARIA', route:'/engenharia', icon:Cpu, accent:'#17445A' },
  { number:'9', label:'MATERIAIS', route:'/pcp/materiais', icon:Layers, accent:'#B85C00' },
  { number:'10', label:'MRP', route:'/pcp/materiais', icon:Layers, accent:'#8A4A00' },
  { number:'11', label:'PCP', route:'/pcp', icon:Factory, accent:'#0B7654' },
  { number:'12', label:'CHÃO DE FÁBRICA', route:'/operacao-industrial', icon:Activity, accent:'#8A6200' },
  { number:'13', label:'QUALIDADE', route:'/qualidade', icon:CheckCircle, accent:'#16788A' },
  { number:'14', label:'SGQ', route:'/qualidade', icon:CheckCircle, accent:'#0F6170' },
]

const moduleItems: Record<string, string> = {
  "VENDAS": "Pedidos • Clientes • Carteira • Catálogo Digital • Análise de Custos • Metas • Configurações",
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
  "CONFIGURAÇÕES": "Empresa • Usuários • Permissões • Parâmetros • Identidade Visual"
}

export default function TabletLaunchpad({ onNavigate, isOpen, onClose }: TabletLaunchpadProps) {
  const resolvedIcons = useMemo(() => Object.fromEntries(modules.map((module) => [module.label, resolveTabletIcon(module.number, module.label)])), [])
  if (!isOpen) return null

  return (
    <div className="tablet-modal-backdrop" role="dialog" aria-modal="true" aria-label="Central de módulos">
      <section className="tablet-modal">
        <header className="tablet-modal-header">
          <div className="tablet-modal-heading">
            <div className="tablet-heading-icon"><Tablet size={25} /></div>
            <div>
              <strong>CENTRAL DE MÓDULOS — MODO TABLET</strong>
              <p>Acesse as etapas do processo produtivo diretamente por aqui.</p>
            </div>
          </div>
          <button className="tablet-close" type="button" onClick={onClose} aria-label="Fechar central de módulos"><X size={22} /></button>
        </header>

        <div className="tablet-module-grid">
          {modules.map(({ number, label, route, icon: Icon, accent }) => (
            <button
              key={`${number}-${route}`}
              type="button"
              className="tablet-module-card"
              onClick={() => { onClose(); window.location.assign(route) }}
              style={{ '--module-accent': accent } as CSSProperties}
            >
              <span className="tablet-3d-icon" aria-hidden="true">{resolvedIcons[label] ? <img src={resolvedIcons[label]} alt="" className="h-[34px] w-[34px] object-contain" /> : <Icon size={31} strokeWidth={2.4} />}</span>
              <span className="tablet-module-copy">
                <small>{number}.</small>
                <strong>{label}</strong><span className="tablet-module-items">{moduleItems[label] ?? ''}</span>
              </span>
            </button>
          ))}
        </div>

        <footer className="tablet-modal-footer">ERPSistema INDUSTRIAL • Central operacional integrada</footer>
      </section>
      <style>{'.tablet-modal-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.68);backdrop-filter:blur(5px)}.tablet-modal{width:min(980px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 30px 90px rgba(2,6,23,.48);padding:22px;color:#1e293b}.tablet-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #f1f5f9;padding-bottom:18px}.tablet-modal-heading{display:flex;align-items:center;gap:13px;min-width:0}.tablet-heading-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border-radius:12px;background:linear-gradient(145deg,#f97316,#c2410c);color:#fff;box-shadow:0 8px 18px rgba(249,115,22,.25),inset 0 1px 0 rgba(255,255,255,.25)}.tablet-modal-heading strong{display:block;font-size:16px;font-weight:950;letter-spacing:.02em;color:#1e293b}.tablet-modal-heading p{margin:4px 0 0;color:#64748b;font-size:12px;font-weight:650}.tablet-close{width:40px;height:40px;display:grid;place-items:center;flex:none;border:1px solid #475569;border-radius:9px;background:#f8fafc;color:#475569;cursor:pointer}.tablet-close:hover{background:#f1f5f9;color:#1e293b}.tablet-module-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:18px}.tablet-module-card{min-height:108px;display:flex;align-items:center;gap:13px;text-align:left;padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#ffffff;color:#1e293b;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease;box-shadow:0 7px 16px rgba(2,6,23,.18)}.tablet-module-card:hover{transform:translateY(-2px);border-color:#059669;background:rgba(236,253,245,.3)}.tablet-module-card:active{transform:translateY(0)}.tablet-3d-icon{width:58px;height:58px;display:grid;place-items:center;flex:none;border-radius:15px;color:#fff;background:linear-gradient(145deg,var(--module-accent),#0f172a);box-shadow:0 9px 16px rgba(2,6,23,.35),inset 0 2px 0 rgba(255,255,255,.28),inset 0 -4px 8px rgba(0,0,0,.22);text-shadow:0 2px 2px rgba(0,0,0,.2)}.tablet-module-copy{display:flex;flex-direction:column;gap:5px;min-width:0}.tablet-module-copy small{color:var(--module-accent);font-size:11px;font-weight:950;letter-spacing:.08em}.tablet-module-copy strong{color:#123B50;font-size:16px;font-weight:950;line-height:1.1;letter-spacing:.01em}.tablet-module-items{display:block;color:#475569;font-size:10px;font-weight:750;line-height:1.45;white-space:normal}.tablet-modal-card{}border-top:1px solid #f1f5f9;margin-top:18px;padding-top:13px;text-align:center;color:#94a3b8;font-size:10px;font-weight:750;letter-spacing:.04em}@media(max-width:620px){.tablet-modal{padding:16px;border-radius:14px}.tablet-module-grid{grid-template-columns:1fr}.tablet-modal-heading strong{font-size:14px}.tablet-modal-heading p{font-size:11px}.tablet-module-card{min-height:108px}.tablet-module-copy strong{font-size:16px}.tablet-module-items{font-size:10px}}'}</style>
    </div>
  )
}
