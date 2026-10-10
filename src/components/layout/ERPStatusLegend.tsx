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
 return <details className="fixed right-3 top-[84px] z-[1500] text-[10px] text-[#173b4a] print:hidden">
  <summary className="inline-flex min-h-[28px] cursor-pointer list-none items-center gap-1 border border-slate-300 bg-white px-2 font-semibold shadow-sm hover:bg-slate-50"><CircleHelp size={12}/> Legenda de status</summary>
  <div className="absolute right-0 top-8 grid w-[min(360px,90vw)] grid-cols-2 gap-2 border border-slate-300 bg-white p-2 shadow-xl" role="group" aria-label="Significado das cores de status">
   {items.map(item=><div className="flex min-w-0 items-start gap-1.5" key={item.title}>
    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:item.color}} aria-hidden="true"/>
    <span><strong className="block text-[10px]">{item.title}</strong><small className="block text-[9px] leading-tight text-slate-500">{item.detail}</small></span>
   </div>)}
   <p className="col-span-2 border-t border-slate-200 pt-1 text-[9px] text-slate-500">A cor nunca é o único indicador: cada status também deve exibir texto.</p>
  </div>
 </details>
}
