import { Boxes, Building2, Truck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import ProdutosVendasIndustrial from './ProdutosVendasIndustrial'
import ClientesIndustrial from './ClientesIndustrial'
import FornecedoresIndustrial from './FornecedoresIndustrial'

type Tab = 'produtos' | 'clientes' | 'fornecedores'

const tabs: Array<{ id: Tab; label: string; Icon: typeof Boxes }> = [
  { id: 'produtos', label: 'Produtos', Icon: Boxes },
  { id: 'clientes', label: 'Clientes', Icon: Building2 },
  { id: 'fornecedores', label: 'Fornecedores', Icon: Truck },
]

function tabFromSearch(value: string | null, fallback: Tab): Tab {
  if (value === 'clientes' || value === 'fornecedores') return value
  return fallback
}

export default function CadastroMestreIndustrial({ defaultTab = 'produtos' }: { defaultTab?: Tab }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabFromSearch(searchParams.get('aba'), defaultTab)

  const selectTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'produtos') next.delete('aba')
    else next.set('aba', tab)
    setSearchParams(next)
  }

  return <main className="cadastro-mestre-page min-h-screen bg-slate-50 p-3 text-slate-900 md:p-5">
    <div className="mx-auto max-w-[1600px] space-y-3">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 px-5 py-5 text-white shadow-lg md:px-6">
        <div className="pointer-events-none absolute -right-12 -top-28 size-80 rounded-full border-[24px] border-white/5" />
        <p className="relative text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">SYSNQRA · Cadastros mestres</p>
        <h1 className="relative mt-1 text-2xl font-extrabold">Central de Cadastros</h1>
        <p className="relative mt-1 text-xs text-blue-100">Produtos, clientes e fornecedores em uma única tela, com navegação por abas.</p>
        <span className="relative mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold text-blue-50">Atualizado · Padrão Premium · 26/10/2026</span>
      </header>

      <nav role="tablist" aria-label="Cadastros mestres" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => selectTab(id)} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${activeTab === id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={15}/>{label}</button>)}
      </nav>

      <section aria-label={`Cadastro de ${activeTab}`}>
        {activeTab === 'produtos' && <ProdutosVendasIndustrial/>}
        {activeTab === 'clientes' && <ClientesIndustrial/>}
        {activeTab === 'fornecedores' && <FornecedoresIndustrial embedded/>}
      </section>
    </div>
    <style>{`
      .cadastro-mestre-page .product-master-screen{max-width:none!important;background:transparent!important}
      .cadastro-mestre-page .product-master-screen input:not([type=checkbox]):not([type=file]),.cadastro-mestre-page .product-master-screen select,.cadastro-mestre-page .product-master-screen textarea,.cadastro-mestre-page .clients-page input:not([type=file]),.cadastro-mestre-page .clients-page select,.cadastro-mestre-page .supplier-page input:not([type=file]),.cadastro-mestre-page .supplier-page select{height:36px!important;border-radius:8px!important;font-size:12px!important}
      .cadastro-mestre-page .product-master-screen .product-form-grid label,.cadastro-mestre-page .product-master-screen .product-cost-stack label,.cadastro-mestre-page .product-master-screen .product-responsive-grid label{grid-template-rows:minmax(14px,auto) 36px!important;gap:4px!important;font-size:10px!important;font-weight:700!important;color:#475569!important}
      .cadastro-mestre-page .product-master-screen .product-form-section{border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}
      .cadastro-mestre-page .product-master-screen .product-form-section-title{border-radius:8px!important;background:#f1f5f9!important;color:#0f172a!important;border-left-color:#2563eb!important}
      .cadastro-mestre-page .product-master-screen .product-plus-button{height:36px!important;width:36px!important;border-radius:8px!important;background:#eff6ff!important;color:#1d4ed8!important;border-color:#bfdbfe!important}
      .cadastro-mestre-page .product-master-screen button:not(.product-plus-button),.cadastro-mestre-page .clients-page button,.cadastro-mestre-page .supplier-page button{min-height:36px!important;border-radius:8px!important;font-size:11px!important}
      .cadastro-mestre-page .product-master-screen>header{padding:10px 14px!important;border:1px solid #e2e8f0!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important}
      .cadastro-mestre-page .product-master-screen .product-workspace{padding:0!important}
      .cadastro-mestre-page .product-master-screen .product-tabs{gap:5px!important;padding:6px!important;border-radius:12px 12px 0 0!important}
      .cadastro-mestre-page .product-master-screen .product-tabs button{height:36px!important;border:0!important;border-radius:8px!important;padding:0 14px!important}
      .cadastro-mestre-page .product-master-screen .product-tabs button[aria-selected=true]{background:#0f172a!important;color:#fff!important}
      .cadastro-mestre-page .clients-page,.cadastro-mestre-page .supplier-page{min-height:0!important;background:transparent!important;padding:0!important}
      .cadastro-mestre-page .clients-page>div>section,.cadastro-mestre-page .supplier-page>section,.cadastro-mestre-page .supplier-page form{border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important;border-color:#e2e8f0!important}
      .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child{background:#fff!important;color:#0f172a!important;box-shadow:none!important;border-bottom:1px solid #e2e8f0!important}
      .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child h1,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child h1{color:#0f172a!important}
      .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child p,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child p,.cadastro-mestre-page .clients-page>div>section:first-child>div:first-child>div>div>div:first-child,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child>div>div>div:first-child{color:#64748b!important}
      .cadastro-mestre-page .supplier-page input:not([type=file]),.cadastro-mestre-page .supplier-page select,.cadastro-mestre-page .clients-page input:not([type=file]),.cadastro-mestre-page .clients-page select{font-size:12px!important}
      @media(max-width:700px){.cadastro-mestre-page .product-master-screen .product-unit-row label{grid-template-rows:minmax(14px,auto) 36px!important}.cadastro-mestre-page .product-master-screen .product-unit-row label>select{height:36px!important}}
    `}</style>
  </main>
}
