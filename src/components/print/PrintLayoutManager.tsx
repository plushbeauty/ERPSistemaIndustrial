import { useState, type ReactNode } from 'react'
type Orientation='portrait'|'landscape'
export default function PrintLayoutManager({children,title='SYSNQRA ERP INDUSTRIAL',defaultOrientation='portrait'}:{children:ReactNode;title?:string;defaultOrientation?:Orientation}){
 const [orientation,setOrientation]=useState<Orientation>(defaultOrientation)
 return <section className="print-layout-manager">
  <div className="no-print mb-2 flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-white p-2 text-xs">
   <strong>{title}</strong><div className="flex gap-2">
    <button type="button" className={orientation==='portrait'?'erp-btn-primary':'erp-btn'} onClick={()=>setOrientation('portrait')}>Retrato</button>
    <button type="button" className={orientation==='landscape'?'erp-btn-primary':'erp-btn'} onClick={()=>setOrientation('landscape')}>Paisagem</button>
    <button type="button" className="erp-btn-primary" onClick={()=>window.print()}>Imprimir</button>
   </div>
  </div>
  <style>{`@page{size:A4 ${orientation};margin:0mm}@media print{.no-print,.erp-windows-topbar,.erp-windows-taskbar,.erp-help-assistant{display:none!important}.erp-horizontal-shell,.erp-horizontal-workspace{background:#fff!important;padding:0!important;min-height:0!important}}`}</style>
  <div className="print-layout-content">{children}</div>
 </section>
}
