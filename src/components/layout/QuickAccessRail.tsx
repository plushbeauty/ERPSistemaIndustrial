/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-ACESSO-RAPIDO-20261105-01 — barra fixa de acesso rápido no canto inferior esquerdo,
 * abaixo do botão Menu, no lugar da antiga barra Windows 11 (ordem do proprietário em 2026-11-05).
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-05 — "barra de acesso rápido no canto inferior
 * esquerdo, ícones grandes, texto curto, área de toque, destaque do módulo atual, atalhos filtrados
 * por permissão do usuário, fixa e recolhível no tablet sem cobrir formulários".
 */
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleTabletKey } from './ModuleTabletMenuModal'

export type QuickAccessItem = {
  label: string
  route: string
  icon: LucideIcon
  action?: 'pcpTablet' | 'sgqTablet' | 'moduleTablet'
  tabletKey?: ModuleTabletKey
}

const CHAVE_RECOLHIDA = 'synqra.acesso-rapido.recolhida'
/** Rótulos curtos: o nome completo do menu não cabe na régua de 176px. */
const ROTULOS_CURTOS: Record<string, string> = {
  'Principal': 'Início',
  'Financeiro': 'Financeiro',
  'Comissões': 'Comissões',
  'Controladoria': 'Controladoria',
  'Cadastros Mestres': 'Cadastros',
  'RH / Departamento Pessoal': 'RH',
  'Engenharia e PCP': 'Engenharia/PCP',
  'Chão de Fábrica': 'Chão de Fábrica',
  'Sistema SGQ': 'Qualidade (SGQ)',
  'Compras': 'Compras',
  'Configurações': 'Configurações',
  'Configurações de Usuário': 'Usuários',
  'Fiscal': 'Fiscal',
  'Central de Ajuda': 'Ajuda',
  'Vendas': 'Vendas',
  'Estoque': 'Estoque',
  'Almoxarifado': 'Almoxarifado',
  'Logística': 'Logística',
  'Manutenção': 'Manutenção',
  'Engenharia de Produto (BOM)': 'BOM',
}

function rotuloCurto(label: string) {
  return ROTULOS_CURTOS[label] ?? (label.length > 18 ? label.split(/[ /—-]/)[0] : label)
}

function lerRecolhida() {
  try {
    const gravado = window.localStorage.getItem(CHAVE_RECOLHIDA)
    if (gravado === '1') return true
    if (gravado === '0') return false
    // Sem decisão do usuário: no tablet (≤1024px) começa recolhida para não cobrir formulário.
    return window.matchMedia('(max-width: 1024px)').matches
  } catch {
    return false
  }
}

export default function QuickAccessRail({ items, activeLabel, hidden = false, onOpen }: {
  items: QuickAccessItem[]
  activeLabel: string | null
  hidden?: boolean
  onOpen: (item: QuickAccessItem) => void
}) {
  const [recolhida, setRecolhida] = useState(lerRecolhida)

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_RECOLHIDA, recolhida ? '1' : '0')
    } catch {
      // Armazenamento bloqueado: a barra continua funcional, apenas sem lembrar a preferência.
    }
  }, [recolhida])

  // O menu principal abre no mesmo canto inferior-esquerdo em telas baixas: com ele aberto a barra
  // sai de cena, senão os dois painéis se empilham e o atalho some atrás do menu.
  if (items.length === 0 || hidden) return null

  return (
    <nav className={`synqra-quick-rail${recolhida ? ' is-collapsed' : ''}`} aria-label="Acesso rápido aos módulos">
      <button
        type="button"
        className="synqra-quick-toggle"
        onClick={() => setRecolhida(value => !value)}
        aria-expanded={!recolhida}
        title={recolhida ? 'Expandir acesso rápido' : 'Recolher acesso rápido'}
        aria-label={recolhida ? 'Expandir acesso rápido' : 'Recolher acesso rápido'}
      >
        {recolhida ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </button>

      <div className="synqra-quick-list">
        {items.map(item => {
          const Icon = item.icon
          const ativo = activeLabel === item.label
          return <button
            type="button"
            key={item.label}
            className={`synqra-quick-item${ativo ? ' is-active' : ''}`}
            title={item.label}
            aria-current={ativo ? 'page' : undefined}
            onClick={() => onOpen(item)}
          >
            <Icon size={22} strokeWidth={ativo ? 2.4 : 2} />
            <span className="synqra-quick-label">{rotuloCurto(item.label)}</span>
          </button>
        })}
      </div>

      <style>{`
        .synqra-quick-rail{position:fixed;left:8px;bottom:8px;z-index:1500;display:flex;align-items:flex-start;gap:4px;
          padding:6px;border:1px solid #cbd5e1;border-radius:2px;background:rgba(255,255,255,.97);
          box-shadow:0 10px 26px rgba(15,23,42,.18);backdrop-filter:blur(3px);box-sizing:border-box;
          max-width:calc(100vw - 16px);max-height:calc(100vh - 120px)}
        .synqra-quick-toggle{flex:0 0 26px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;
          border:1px solid #e2e8f0;background:#fff;color:#123b50;border-radius:2px;cursor:pointer;margin-top:2px}
        .synqra-quick-toggle:hover{background:#eaf5f8;border-color:#2d8db8}
        .synqra-quick-list{display:flex;flex-direction:column;gap:3px;overflow-y:auto;overscroll-behavior:contain;
          max-height:calc(100vh - 132px);padding-right:2px;scrollbar-width:thin}
        .synqra-quick-item{position:relative;display:flex;align-items:center;gap:9px;min-height:44px;padding:0 10px 0 8px;
          border:1px solid transparent;border-radius:2px;background:transparent;color:#123b50;cursor:pointer;
          font:inherit;text-align:left;box-sizing:border-box;width:100%}
        .synqra-quick-item:hover{background:#eaf5f8;border-color:#b9d4df}
        .synqra-quick-item.is-active{background:var(--erp-active-gold,#C9961C);border-color:var(--erp-active-gold-deep,#A87B12);color:var(--erp-active-ink,#123B50);font-weight:800}
        .synqra-quick-label{font-size:11.5px;font-weight:700;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:132px}
        .synqra-quick-rail.is-collapsed{padding:5px}
        .synqra-quick-rail.is-collapsed .synqra-quick-item{width:48px;min-width:48px;padding:0;justify-content:center}
        .synqra-quick-rail.is-collapsed .synqra-quick-label{display:none}
        .synqra-quick-rail.is-collapsed .synqra-quick-list{max-height:calc(100vh - 132px)}
        @media (max-width:1024px){
          .synqra-quick-rail{bottom:10px;left:10px;max-height:calc(100vh - 150px)}
          .synqra-quick-item{min-height:48px}
        }
      `}</style>
    </nav>
  )
}
