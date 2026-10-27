/**
 * SYSNQRA ERP INDUSTRIAL — CADASTRO MESTRE UNIFICADO
 * Revisão autorizada pelo usuário: 27/10/2026.
 * Uma única entrada de navegação para Produtos/Insumos, Clientes e Fornecedores.
 * Preserva CRUD, validações, anexos, tabelas reais e isolamento empresa_id nas telas existentes.
 * Não introduz registros de exemplo, tabelas paralelas nem colunas não confirmadas.
 */
import { useSearchParams } from 'react-router-dom'
import { Boxes, Building2, Truck, Layers, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import ProdutosVendasIndustrial from './ProdutosVendasIndustrial'
import ClientesIndustrial from './ClientesIndustrial'
import FornecedoresIndustrial from './FornecedoresIndustrial'

type Tab = 'produtos' | 'clientes' | 'fornecedores'
const tabs: Array<{ id: Tab; label: string; description: string; Icon: typeof Boxes }> = [
  { id: 'produtos', label: 'Produtos & Insumos', description: 'Engenharia, NCM, estoque, PCP e matérias-primas', Icon: Boxes },
  { id: 'clientes', label: 'Clientes', description: 'Vendas, carteira, faturamento e crédito', Icon: Building2 },
  { id: 'fornecedores', label: 'Fornecedores', description: 'Compras, suprimentos, homologação e insumos', Icon: Truck },
]
function tabFromSearch(value: string | null, fallback: Tab): Tab {
  return value === 'clientes' || value === 'fornecedores' ? value : fallback
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
  const current = tabs.find(tab => tab.id === activeTab) ?? tabs[0]
  return (
    <main className="cadastro-mestre-page min-h-screen bg-slate-50 p-3 text-slate-900 md:p-5">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="cadastro-master-header relative overflow-hidden rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm md:px-6">
          <div className="pointer-events-none absolute -right-12 -top-28 size-80 rounded-full border-[24px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">SYSNQRA · CADASTRO MESTRE</p>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight md:text-2xl"><Layers size={22} /> Cadastro Unificado de Ecossistema</h1>
              <p className="mt-1 max-w-3xl text-xs text-slate-300">Uma única central para Produtos/Insumos, Clientes e Fornecedores, preservando o cadastro real, as regras fiscais e o isolamento por empresa.</p>
              <span className="mt-3 inline-flex rounded-md border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">Atualizado · Padrão Premium · 27/10/2026</span>
            </div>
            <div className="relative flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-slate-200">
              <ShieldCheck size={16} className="text-emerald-300" />
              <span>Supabase autenticado · RLS · empresa_id</span>
            </div>
          </div>
        </header>

        <nav aria-label="Tipo de cadastro mestre" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {tabs.map(({ id, label, description, Icon }) => {
            const selected = activeTab === id
            return <button key={id} type="button" aria-pressed={selected} onClick={() => selectTab(id)} className={`cadastro-master-selector group flex min-h-[88px] items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? 'is-selected border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={20}/></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold uppercase tracking-wide">{label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span></span>
              {selected && <CheckCircle2 size={17} className="shrink-0 text-amber-600"/>}
            </button>
          })}
        </nav>

        <section className="cadastro-master-context flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2">
            <ArrowRightLeft size={16} className="mt-0.5 shrink-0 text-sky-700"/>
            <div><h2 className="text-xs font-extrabold text-slate-800">Cadastro relacional · {current.label}</h2><p className="mt-0.5 text-[11px] text-slate-500">Use as abas acima para alternar o tipo mestre. Os registros são carregados e gravados nas tabelas operacionais existentes da empresa autenticada.</p></div>
          </div>
        </section>

        <section aria-label={`Cadastro de ${activeTab}`} className="cadastro-master-body min-w-0">
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
        .cadastro-mestre-page .product-master-screen .product-form-section-title{border-radius:8px!important;background:#f1f5f9!important;color:#0f172a!important;border-left-color:#f59e0b!important}
        .cadastro-mestre-page .product-master-screen .product-plus-button{height:36px!important;width:36px!important;border-radius:8px!important;background:#fffbeb!important;color:#b45309!important;border-color:#fcd34d!important}
        .cadastro-mestre-page .product-master-screen button:not(.product-plus-button),.cadastro-mestre-page .clients-page button,.cadastro-mestre-page .supplier-page button{min-height:36px!important;border-radius:8px!important;font-size:11px!important}
        .cadastro-mestre-page .product-master-screen>header{padding:10px 14px!important;border:1px solid #e2e8f0!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important}
        .cadastro-mestre-page .product-master-screen .product-workspace{padding:0!important}
        .cadastro-mestre-page .product-master-screen .product-tabs{gap:5px!important;padding:6px!important;border-radius:12px 12px 0 0!important}
        .cadastro-mestre-page .product-master-screen .product-tabs button{height:36px!important;border:0!important;border-radius:8px!important;padding:0 14px!important}
        .cadastro-mestre-page .product-master-screen .product-tabs button[aria-selected=true]{background:#f59e0b!important;color:#fff!important}
        .cadastro-mestre-page .clients-page,.cadastro-mestre-page .supplier-page{min-height:0!important;background:transparent!important;padding:0!important}
        .cadastro-mestre-page .clients-page>div>section,.cadastro-mestre-page .supplier-page>section,.cadastro-mestre-page .supplier-page form{border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important;border-color:#e2e8f0!important}
        .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child{background:#fff!important;color:#0f172a!important;box-shadow:none!important;border-bottom:1px solid #e2e8f0!important}
        .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child h1,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child h1{color:#0f172a!important}
        .cadastro-mestre-page .clients-page>div>section:first-child>div:first-child p,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child p,.cadastro-mestre-page .clients-page>div>section:first-child>div:first-child>div>div>div:first-child,.cadastro-mestre-page .supplier-page>section:first-child>div:first-child>div>div>div:first-child{color:#64748b!important}
        .cadastro-mestre-page .supplier-page input:not([type=file]),.cadastro-mestre-page .supplier-page select,.cadastro-mestre-page .clients-page input:not([type=file]),.cadastro-mestre-page .clients-page select{font-size:12px!important}
        @media(max-width:700px){.cadastro-mestre-page .product-master-screen .product-unit-row label{grid-template-rows:minmax(14px,auto) 36px!important}.cadastro-mestre-page .product-master-screen .product-unit-row label>select{height:36px!important}}
      `}</style>
    </main>
  )
}
