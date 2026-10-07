import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SALES_SECTIONS } from '../data/salesMenu'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

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

  return (
    <section className="erp-vendas-menu">
      <div className="erp-vendas-menu-toolbar">
        <div>
          <span className="erp-vendas-menu-eyebrow">CENTRO DE COMANDO / VENDAS</span>
          <h1>MENU VENDAS</h1>
        </div>
        <div className="erp-vendas-menu-actions">
          <label>
            <Search size={14} aria-hidden="true" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar módulo de vendas" aria-label="Pesquisar módulo de vendas" />
          </label>
          <button type="button" onClick={() => window.location.reload()} title="Atualizar menu"><RefreshCw size={14} /></button>
        </div>
      </div>
      <div className="erp-vendas-menu-sections">
        {sections.map(section => (
          <section key={section.label}>
            <div className="erp-vendas-menu-section-title">{section.label}</div>
            <div className="erp-vendas-menu-grid">
              {section.items.map(({ key, label, route, Icon }) => (
                <button key={key} type="button" onClick={() => navigate(route)} title={label}>
                  <Icon size={32} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <style>{`
        .erp-vendas-menu{min-width:0;background:#fff;border:1px solid #cbd5e1}
        .erp-vendas-menu-toolbar{height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 10px;border-bottom:1px solid #cbd5e1}
        .erp-vendas-menu-eyebrow{display:block;color:#2d8db8;font-size:9px;font-weight:900;letter-spacing:.12em}
        .erp-vendas-menu h1{margin:2px 0 0;color:#123b50;font-size:16px;font-weight:800;letter-spacing:.04em}
        .erp-vendas-menu-actions{display:flex;gap:6px}
        .erp-vendas-menu-actions label{height:30px;width:260px;display:flex;align-items:center;gap:5px;border:1px solid #cbd5e1;border-radius:2px;padding:0 7px;color:#64748b}
        .erp-vendas-menu-actions input{width:100%;border:0;outline:0;font-size:10px;color:#123b50}
        .erp-vendas-menu-actions button{width:30px;height:30px;display:grid;place-items:center;border:1px solid #2d8db8;border-radius:2px;background:#2d8db8;color:#fff;cursor:pointer}
        .erp-vendas-menu-sections{padding:8px;display:grid;gap:10px}
        .erp-vendas-menu-section-title{height:24px;display:flex;align-items:center;color:#164b91;font-size:9px;font-weight:900;letter-spacing:.12em;border-bottom:1px solid #dbe5eb}
        .erp-vendas-menu-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding-top:6px}
        .erp-vendas-menu-grid button{height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;color:#176487;cursor:pointer}
        .erp-vendas-menu-grid button:hover{border-color:#2d8db8;background:#f4fbfd}
        .erp-vendas-menu-grid span{font-size:9px;line-height:1.1;text-transform:uppercase;text-align:center}
        @media(max-width:1100px){.erp-vendas-menu-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:700px){.erp-vendas-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.erp-vendas-menu-actions label{width:180px}}
      `}</style>
    </section>
  )
}
