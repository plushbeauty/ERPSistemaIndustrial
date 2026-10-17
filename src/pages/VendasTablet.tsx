import { useMemo, useState } from 'react'
import { ArrowLeft, LayoutGrid, RefreshCw, Search, ShoppingCart, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sections as SALES_SECTIONS } from './VendasLayout'

const normalize = (value: string) => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR')

export default function VendasTablet() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const term = normalize(search.trim())
  const sections = useMemo(
    () => SALES_SECTIONS
      .map(section => ({ ...section, items: term ? section.items.filter(item => normalize(item.label).includes(term)) : section.items }))
      .filter(section => section.items.length > 0),
    [term],
  )
  const count = sections.reduce((total, section) => total + section.items.length, 0)

  return (
    <main className="sales-launcher">
      <style>{`
        .sales-launcher{--navy:#123b50;--blue:#2d8db8;--cyan:#48b7c7;--line:#cbdde5;min-height:calc(100vh - 84px);padding:12px;background:#edf4f7;color:var(--navy);font-family:Inter,system-ui,sans-serif;box-sizing:border-box}
        .sl-wrap{max-width:1440px;margin:0 auto}
        .sl-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;background:linear-gradient(105deg,#123b50 0%,#174f69 68%,#1d6a82 100%);color:#fff;border:1px solid #0c3041}
        .sl-brand{display:flex;align-items:center;gap:12px;min-width:0}
        .sl-back{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 10px;border:1px solid #6e9aab;background:#194c62;color:#fff;font-size:10px;font-weight:800;white-space:nowrap;cursor:pointer}
        .sl-kicker{font-size:9px;font-weight:800;letter-spacing:.16em;color:#9fdae8}
        .sl-header h1{margin:3px 0 0;font-size:18px;line-height:1.15;font-weight:800;letter-spacing:.01em}
        .sl-header p{margin:4px 0 0;color:#d4e7ee;font-size:10px}
        .sl-meta{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .sl-counter{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #47798b;background:#16445a}
        .sl-counter strong{font-size:17px;line-height:1;color:#fff}
        .sl-counter span{font-size:9px;font-weight:800;letter-spacing:.08em;color:#c5e6ee}
        .sl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:8px 10px;border:1px solid var(--line);background:#fff}
        .sl-toolbar-label{font-size:9px;font-weight:900;letter-spacing:.12em;color:#315466}
        .sl-search{display:flex;align-items:center;gap:7px;width:min(360px,100%);height:32px;padding:0 9px;border:1px solid #b8cbd5;background:#f9fcfd;color:#5b7885}
        .sl-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--navy);font-size:11px}
        .sl-clear{display:grid;place-items:center;width:24px;height:24px;border:0;background:transparent;color:#5b7885;cursor:pointer}
        .sl-sections{display:grid;gap:10px;margin-top:10px}
        .sl-section{min-width:0;border:1px solid var(--line);background:#fff}
        .sl-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;background:#e4f0f5;border-bottom:1px solid var(--line)}
        .sl-section-title{font-size:10px;font-weight:900;letter-spacing:.1em;color:#17465c}
        .sl-section-count{display:grid;place-items:center;min-width:28px;height:25px;padding:0 7px;border:1px solid #c1dce6;background:#f8fcfd;color:#267c9f;font-size:10px;font-weight:900}
        .sl-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}
        .sl-card{display:flex;align-items:center;gap:10px;min-width:0;min-height:66px;padding:9px 10px;border:1px solid #d5e1e7;border-left:3px solid #48b7c7;background:#fff;text-align:left;color:var(--navy);cursor:pointer;transition:border-color .12s,background .12s}
        .sl-card:hover,.sl-card:focus-visible{border-color:var(--blue);border-left-color:var(--blue);background:#f1f9fc;outline:2px solid #c3e5f0;outline-offset:0}
        .sl-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #c8e1e9;background:#eaf5f8;color:#247da0}
        .sl-copy{display:block;min-width:0}
        .sl-name{display:block;font-size:10px;font-weight:850;line-height:1.25;color:#123b50}
        .sl-href{display:block;margin-top:4px;font-size:9px;line-height:1.3;color:#607986;overflow-wrap:anywhere}
        .sl-empty{padding:28px 12px;border:1px solid var(--line);background:#fff;text-align:center;font-size:11px;color:#607986}
        .sl-footer{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:8px 2px;border-top:1px solid #cbdde5;font-size:9px;color:#617985}
        @media(max-width:1100px){.sl-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:760px){.sales-launcher{padding:7px}.sl-header{align-items:flex-start;flex-direction:column;padding:12px}.sl-meta{width:100%;justify-content:space-between}.sl-toolbar{align-items:stretch;flex-direction:column}.sl-search{width:100%}.sl-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:7px}.sl-footer{flex-direction:column;gap:4px}}
        @media(max-width:460px){.sl-brand{align-items:flex-start;flex-direction:column;gap:8px}.sl-header h1{font-size:16px}.sl-grid{grid-template-columns:1fr}.sl-card{min-height:60px}}
      `}</style>
      <div className="sl-wrap">
        <header className="sl-header">
          <div className="sl-brand">
            <button type="button" className="sl-back" onClick={() => navigate('/tablet/dashboard')}><ArrowLeft size={13} /> VOLTAR AO TABLET</button>
            <div>
              <div className="sl-kicker">ERP INDUSTRIAL / GESTÃO COMERCIAL</div>
              <h1>Central de Vendas</h1>
              <p>Pedidos, clientes, operação comercial e ferramentas em um único painel.</p>
            </div>
          </div>
          <div className="sl-meta">
            <div className="sl-counter"><ShoppingCart size={17} color="#9fdae8" /><div><strong>{count}</strong><span> MÓDULOS</span></div></div>
            <div className="sl-counter"><LayoutGrid size={17} color="#9fdae8" /><div><strong>{sections.length}</strong><span> GRUPOS</span></div></div>
          </div>
        </header>
        <div className="sl-toolbar">
          <div className="sl-toolbar-label">CATÁLOGO COMERCIAL</div>
          <label className="sl-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo de vendas..." aria-label="Pesquisar módulos de vendas" />{search && <button type="button" className="sl-clear" onClick={() => setSearch('')} aria-label="Limpar pesquisa"><X size={14} /></button>}<button type="button" className="sl-clear" onClick={() => setSearch('')} aria-label="Limpar pesquisa" title="Limpar pesquisa"><RefreshCw size={13} /></button></label>
        </div>
        {sections.length === 0 ? <div className="sl-empty" role="status">Nenhum módulo encontrado para “{search.trim()}”. Limpe a pesquisa e tente novamente.</div> : <div className="sl-sections">
          {sections.map(section => <section className="sl-section" key={section.label}>
            <header className="sl-section-head"><div className="sl-section-title">{section.label}</div><span className="sl-section-count">{section.items.length.toString().padStart(2, '0')}</span></header>
            <div className="sl-grid">{section.items.map(({ label, href, icon: Icon }) => <button key={href} type="button" className="sl-card" onClick={() => navigate(href)} title={label}><span className="sl-icon"><Icon size={18} strokeWidth={1.8} /></span><span className="sl-copy"><span className="sl-name">{label}</span><span className="sl-href">{href}</span></span></button>)}</div>
          </section>)}
        </div>}
        <footer className="sl-footer"><span>ERP INDUSTRIAL · CENTRAL DE VENDAS</span><span>Operações continuam vinculadas à sessão, empresa ativa e permissões do ERP.</span></footer>
      </div>
    </main>
  )
}
