import { useEffect, useState } from 'react'
import { ArrowLeft, ClipboardCheck, FileText, Gauge, ShieldCheck, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const cards = [
  ['Planos de inspeção','Defina o que deve ser medido, frequência, limites e instrumento.','erp_planos_inspecao', ClipboardCheck],
  ['Inspeções','Registre inspeções de recebimento, processo e produto final.','erp_inspecoes', ShieldCheck],
  ['Não conformidades / RPNC','Abra ocorrências, classifique severidade, ocorrência e detecção e acompanhe o RPN.','erp_nao_conformidades', TriangleAlert],
  ['Ações corretivas','Transforme uma não conformidade em ação, responsável, prazo e evidência.','erp_acoes_corretivas', FileText],
  ['FMEA','Analise modos de falha, efeitos, causas, controles e prioridade de ação.','erp_fmea', Gauge],
  ['Documentos da qualidade','Controle procedimentos, revisões, aprovação e distribuição.','erp_documentos_qualidade', FileText],
] as const

export default function QualidadeIndustrial(){
 const [counts,setCounts]=useState<Record<string,number>>({})
 const [loading,setLoading]=useState(true)
 useEffect(()=>{let alive=true;(async()=>{const entries=await Promise.all(cards.map(async([, , table])=>{const r=await supabase.from(table).select('id',{count:'exact',head:true});return [table,r.count||0] as const}));if(alive)setCounts(Object.fromEntries(entries));setLoading(false)})();return()=>{alive=false}},[])
 return <div className="pcp-page" style={{padding:24,maxWidth:1500,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap',marginBottom:22}}>
   <div><button className="secondary-v2" onClick={()=>location.href='/erp-industrial'}><ArrowLeft size={17}/> Voltar à Tela Inicial</button><div style={{marginTop:14}}><span className="v2-eyebrow">QMS • QUALIDADE INDUSTRIAL</span><h1 style={{fontSize:34,margin:'5px 0'}}>Central da Qualidade</h1><p style={{margin:0,color:'#64748b',fontSize:17}}>Uma área aberta, didática e operacional para controlar qualidade do recebimento à liberação do produto.</p></div></div>
   <div style={{padding:'12px 16px',borderRadius:14,background:'#ecfdf5',border:'1px solid #bbf7d0',fontWeight:800,color:'#166534'}}>Qualidade ativa • {loading?'…':Object.values(counts).reduce((a,b)=>a+b,0)} registros</div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:15}}>{cards.map(([title,desc,table,Icon])=><section key={table} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:18,padding:20,boxShadow:'0 8px 24px rgba(15,23,42,.05)'}}><div style={{width:44,height:44,borderRadius:13,display:'grid',placeItems:'center',background:'#ecfdf5',color:'#0f766e'}}><Icon size={23}/></div><h3 style={{fontSize:21,margin:'14px 0 7px'}}>{title}</h3><p style={{color:'#64748b',lineHeight:1.55,minHeight:72}}>{desc}</p><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}><strong>{loading?'Carregando…':`${counts[table]||0} registro(s)`}</strong><button className="menu-green" onClick={()=>location.href=`/erp-industrial#qualidade`}>Abrir no ERP</button></div></section>)}</div>
  <section style={{marginTop:18,background:'white',border:'1px solid #e2e8f0',borderRadius:18,padding:22}}><h2 style={{marginTop:0}}>Como a Qualidade funciona</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}}>{['1. Definir padrão','2. Inspecionar','3. Registrar resultado','4. Abrir RPNC se houver desvio','5. Criar ação corretiva','6. Verificar eficácia','7. Liberar e manter evidências'].map(x=><div key={x} style={{padding:14,borderRadius:12,background:'#f8fafc',fontWeight:750}}>{x}</div>)}</div></section>
 </div>
}
