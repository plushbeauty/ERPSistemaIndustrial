/**
 * SYSNQRA ERP INDUSTRIAL — Central de Parceiros.
 * REVISÃO: APROV-PARCEIROS-2026-10-24-R1 | DATA/HORA: 2026-10-24 18:52:12 -03:00.
 * ESCOPO: unificar o acesso a Clientes e Fornecedores sem remover os formulários CRUD existentes.
 */
import { useSearchParams } from 'react-router-dom'
import { Truck, Users } from 'lucide-react'
import VendasClientes from './ParceirosClientesForm'
import FornecedoresIndustrial from './ParceirosFornecedoresForm'

type PartnerRole = 'cliente' | 'fornecedor'

export default function ParceirosIndustrial({ onlyRole }: { onlyRole?: PartnerRole }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const role: PartnerRole = onlyRole ?? (
    searchParams.get('tipo') === 'fornecedor' ? 'fornecedor' : 'cliente'
  )

  const selectRole = (nextRole: PartnerRole) => {
    setSearchParams({ tipo: nextRole }, { replace: false })
  }

  return (
    <div className="partners-unified">
      <header className="partners-hero">
        <div>
          <span className="partners-eyebrow">SYSNQRA ERP • CADASTRO MESTRE</span>
          <h1>Central de Parceiros</h1>
          <p>
            Clientes e fornecedores em uma única tela, com seus dados comerciais
            e de suprimentos preservados.
          </p>
        </div>
        <div className="partners-hero-mark" aria-hidden="true">
          SYSNQRA<span>GESTÃO INTEGRADA</span>
        </div>
      </header>

      <nav className="partners-tabs" role="tablist" aria-label="Tipo de cadastro">
        {(!onlyRole || onlyRole === 'cliente') && (
          <button
            type="button"
            role="tab"
            id="partners-tab-cliente"
            aria-controls="partners-panel"
            aria-selected={role === 'cliente'}
            onClick={() => selectRole('cliente')}
          >
            <Users size={16} /> Clientes
          </button>
        )}
        {(!onlyRole || onlyRole === 'fornecedor') && (
          <button
            type="button"
            role="tab"
            id="partners-tab-fornecedor"
            aria-controls="partners-panel"
            aria-selected={role === 'fornecedor'}
            onClick={() => selectRole('fornecedor')}
          >
            <Truck size={16} /> Fornecedores
          </button>
        )}
      </nav>

      <section
        className={'partners-panel partners-panel-' + role}
        id="partners-panel"
        role="tabpanel"
        aria-labelledby={
          role === 'cliente'
            ? 'partners-tab-cliente'
            : 'partners-tab-fornecedor'
        }
      >
        {role === 'cliente'
          ? <VendasClientes />
          : <FornecedoresIndustrial embedded />}
      </section>

      <style>{`
        .partners-unified{display:grid;gap:14px;max-width:1600px;margin:0 auto;padding:16px;color:#0f172a;background:#f1f5f9;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
        .partners-hero{display:flex;min-height:116px;align-items:center;justify-content:space-between;gap:20px;padding:20px 24px;overflow:hidden;border-radius:16px;background:linear-gradient(112deg,#0f172a 0%,#163b68 68%,#1d4ed8 100%);box-shadow:0 12px 26px rgba(15,23,42,.16);color:#fff}
        .partners-eyebrow{color:#bfdbfe;font-size:10px;font-weight:800;letter-spacing:.12em}
        .partners-hero h1{margin:5px 0 4px;color:#fff;font-size:24px;font-weight:800;letter-spacing:-.03em}
        .partners-hero p{max-width:72ch;margin:0;color:#dbeafe;font-size:12px;line-height:1.5}
        .partners-hero-mark{display:grid;gap:4px;text-align:right;font-size:13px;font-weight:800;letter-spacing:.08em}
        .partners-hero-mark span{color:#bfdbfe;font-size:9px;letter-spacing:.16em}
        .partners-tabs{display:flex;gap:6px;align-items:center;padding:8px;border:1px solid #dbe3ee;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.04)}
        .partners-tabs button{display:inline-flex;min-height:36px;align-items:center;gap:8px;padding:0 16px;border:1px solid transparent;border-radius:999px;background:transparent;color:#475569;font-size:12px;font-weight:700;cursor:pointer}
        .partners-tabs button:hover{background:#f1f5f9}
        .partners-tabs button[aria-selected=true]{border-color:#0f172a;background:#0f172a;color:#fff}
        .partners-tabs button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
        .partners-panel{min-width:0}
        .partners-panel .synqra-workspace-title{display:none!important}
        .partners-panel .synqra-workspace-main{min-width:0;padding:0!important;background:transparent!important}
        .partners-panel .sales-workspace{max-width:none!important}
        .partners-panel .sales-workspace.sales-detail>.mx-auto{max-width:none!important}
        .partners-panel .sales-workspace.sales-detail>.mx-auto>header{min-height:54px;align-items:center;padding:8px 12px;border:1px solid #dbe3ee;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.04)}
        .partners-panel .supplier-page{display:grid!important;gap:12px!important;min-height:0!important;padding:0!important;background:transparent!important;color:#0f172a!important}
        .partners-panel .supplier-page>section:first-child{margin:0!important;padding:0!important;border:1px solid #dbe3ee!important;border-radius:12px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.04)!important}
        .partners-panel .supplier-page>section:first-child>div:first-child{min-height:54px;padding:8px 12px!important;border-radius:12px!important;border-bottom:1px solid #e2e8f0;background:#fff!important;box-shadow:none!important;color:#0f172a!important}
        .partners-panel .supplier-page>section:first-child>div:first-child>div:first-child{display:none!important}
        .partners-panel .supplier-page>section,.partners-panel .supplier-page>form{margin:0!important;padding:14px!important;border:1px solid #dbe3ee!important;border-radius:12px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.04)!important}
        .partners-panel input:not([type=file]):not([type=checkbox]),.partners-panel select,.partners-panel textarea{box-sizing:border-box!important;min-width:0!important;border:1px solid #cbd5e1!important;border-radius:9px!important;background:#f8fafc!important;color:#0f172a!important;font-size:12px!important;font-weight:500!important}
        .partners-panel input:not([type=file]):not([type=checkbox]),.partners-panel select{height:36px!important;padding:0 12px!important}
        .partners-panel textarea{padding:8px 12px!important}
        .partners-panel label{min-width:0!important;color:#475569!important;font-size:10px!important;font-weight:700!important;letter-spacing:.06em!important;line-height:1.35!important}
        .partners-panel button:not(.partners-tabs button){min-height:36px;border-radius:9px!important;font-size:11px!important;font-weight:700!important}
        .partners-panel table{border-collapse:collapse!important}
        .partners-panel th{padding:10px 12px!important;background:#f8fafc!important;color:#475569!important;font-size:10px!important;font-weight:800!important;text-align:left;text-transform:uppercase}
        .partners-panel td{padding:10px 12px!important;border-bottom:1px solid #f1f5f9!important;color:#334155!important;font-size:12px!important}
        .partners-panel tbody tr:hover{background:#f8fafc!important}
        .partners-panel .partner-status-badge{display:inline-flex;min-height:22px;align-items:center;justify-content:center;padding:2px 9px;border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;color:#475569;font-size:10px;font-weight:800;white-space:nowrap}
        .partners-panel .partner-status-ok{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}
        .partners-panel .partner-status-off,.partners-panel .partner-status-alert{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
        .partners-panel .partner-status-warning{border-color:#fde68a;background:#fffbeb;color:#a16207}
        .partners-panel input:focus-visible,.partners-panel select:focus-visible,.partners-panel textarea:focus-visible,.partners-panel button:focus-visible{outline:2px solid #2563eb!important;outline-offset:2px!important}
        @media(max-width:700px){
          .partners-unified{gap:10px;padding:10px}
          .partners-hero{min-height:0;padding:16px}
          .partners-hero h1{font-size:20px}
          .partners-hero-mark{display:none}
          .partners-tabs{width:100%;box-sizing:border-box}
          .partners-tabs button{flex:1;justify-content:center;padding:0 10px}
          .partners-panel .supplier-page>section,.partners-panel .supplier-page>form{padding:10px!important}
          .partners-panel table{min-width:720px!important}
        }
        @media print{
          .partners-unified{padding:0;background:#fff}
          .partners-hero,.partners-tabs{display:none!important}
        }
      `}</style>
    </div>
  )
}
