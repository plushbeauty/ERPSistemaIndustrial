import { CircleHelp } from 'lucide-react'

const items=[
 {color:'#16A34A',title:'OK / Liberado',detail:'Conferido, aprovado ou concluído'},
 {color:'#DC2626',title:'NOK / Bloqueado',detail:'Falha, reprovação ou impedimento'},
 {color:'#E6A34A',title:'Atenção / Pendente',detail:'Exige ação ou possui prazo pendente'},
 {color:'#9CA3AF',title:'Não iniciado',detail:'Sem análise ou ainda não tratado'},
 {color:'#2D8DB8',title:'Em processamento',detail:'Em execução ou em andamento'},
 {color:'#8B5CF6',title:'Aguardando aprovação',detail:'Depende de validação/autorização'},
]
export default function ERPStatusLegend(){
 return <details className="erp-status-legend">
  <summary><CircleHelp size={12}/> Legenda de status</summary>
  <div className="erp-status-legend-panel" role="group" aria-label="Significado das cores de status">
   {items.map(item=><div className="erp-status-legend-item" key={item.title}>
    <span className="erp-status-legend-dot" style={{backgroundColor:item.color}} aria-hidden="true"/>
    <span><strong>{item.title}</strong><small>{item.detail}</small></span>
   </div>)}
   <p>A cor nunca é o único indicador: cada status também deve exibir texto.</p>
  </div>
 </details>
}
