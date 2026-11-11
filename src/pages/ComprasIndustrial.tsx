/**
 * @AUTOR: SYSNQRA
 * @REVISAO: REV-COMPRAS-ALIAS-CENTRAL-20261110-01
 * @STATUS: ALIAS COMPATÍVEL; remove shell duplicado e encaminha para a Central de Compras oficial.
 */
import ComprasWorkspace from './ComprasWorkspace'

type LegacyTab = 'dashboard' | 'solicitacoes' | 'pedidos' | 'fornecedores' | 'recebimentos'

const tabMap: Record<LegacyTab, 'visao-geral' | 'requisicoes' | 'pedidos' | 'fornecedores' | 'recebimentos'> = {
  dashboard: 'visao-geral',
  solicitacoes: 'requisicoes',
  pedidos: 'pedidos',
  fornecedores: 'fornecedores',
  recebimentos: 'recebimentos',
}

export default function ComprasIndustrial({ initialTab = 'dashboard' }: { initialTab?: LegacyTab }) {
  return <div className="min-h-full bg-[#F4FBFD]">
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:'#FFFFFF',borderBottom:'1px solid #D3E3EA'}}>
      <div className="buy-brand"><img src="/logo/logo-marca.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" style={{width:32,height:32,objectFit:'contain'}} /></div>
      <div><strong className="block text-[11px] font-bold text-[#123B50]">SYSNQRA ERP &amp; SGQ INDUSTRIAL</strong><small className="text-[9px] font-bold tracking-[.12em] text-[#2D8DB8]">COMPRAS INDUSTRIAIS</small></div>
    </div>
    <ComprasWorkspace initialTab={tabMap[initialTab]} />
  </div>
}
