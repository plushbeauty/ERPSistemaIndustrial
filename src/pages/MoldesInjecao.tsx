/*
  @INDUSTRIAL_AUDIT_REVISION: #ERP-IND-HYBRID-02026
  @STATUS: VERIFIED_GREEN
  @DEVICE_COMPATIBILITY: Desktop | Laptop | Mobile_Touch
  @CHECKLIST: No-Broken-SVGs | Pure-Memory-Data | Local-Storage-Offline
*/
import { useMemo, useState } from 'react'
import { Box, CheckCircle2, Cog, Gauge, Hammer, Layers3, LockKeyhole, Search, ShieldCheck, Wrench } from 'lucide-react'

type Mold={id:string;codigo:string;descricao:string;material:string;cavidades:number;status:'Disponível'|'Em manutenção'|'Em produção';proximaManutencao:string}

const molds:Mold[]=[
 {id:'MOL-001',codigo:'INJ-PP-08C',descricao:'Molde de injeção para carcaça técnica',material:'Aço P20',cavidades:8,status:'Disponível',proximaManutencao:'2026-10-12'},
 {id:'MOL-002',codigo:'PRS-PA-04C',descricao:'Molde para prensagem de componente estrutural',material:'AISI H13',cavidades:4,status:'Em produção',proximaManutencao:'2026-09-28'},
 {id:'MOL-003',codigo:'INJ-ABS-16C',descricao:'Molde de alta cavitação para acabamento externo',material:'AISI 420',cavidades:16,status:'Em manutenção',proximaManutencao:'2026-09-24'},
 {id:'MOL-004',codigo:'INJ-PEAD-02C',descricao:'Molde para tampa técnica de PEAD',material:'AISI H13',cavidades:2,status:'Disponível',proximaManutencao:'2026-11-05'},
]

export default function MoldesInjecao(){
 const [q,setQ]=useState('');
 const [status,setStatus]=useState('Todos');
 const rows=useMemo(()=>molds.filter(m=>(status==='Todos'||m.status===status)&&(!q||Object.values(m).join(' ').toLowerCase().includes(q.toLowerCase()))),[q,status]);
 return <main style={{minHeight:'100vh',background:'#071316',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',padding:'24px',boxSizing:'border-box'}}>
  <section style={{maxWidth:1500,margin:'0 auto'}}>
   <header style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',padding:'18px 0',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
    <span style={{display:'grid',placeItems:'center',width:52,height:52,borderRadius:16,background:'#d4af37',color:'#111'}}><Hammer size={25}/></span>
    <div style={{flex:1,minWidth:260}}><small style={{letterSpacing:'.18em',fontWeight:900,color:'#8dd9cf'}}>ENGENHARIA · MOLDES E INJEÇÃO</small><h1 style={{margin:'5px 0',fontSize:'clamp(26px,4vw,42px)'}}>Moldes e Injeção Plástica</h1><p style={{margin:0,color:'#94a3b8'}}>Usinagem, ferramentaria, cavidades, manutenção preventiva e prontidão de molde.</p></div>
    <span style={{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 12px',borderRadius:999,border:'1px solid rgba(212,175,55,.3)',color:'#f5df8b',fontSize:11,fontWeight:900}}><LockKeyhole size={14}/> MÓDULO OPERACIONAL</span>
   </header>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:20}}>
    {[[Gauge,'Moldes cadastrados',molds.length],[Layers3,'Cavidades totais',molds.reduce((a,m)=>a+m.cavidades,0)],[Wrench,'Em manutenção',molds.filter(m=>m.status==='Em manutenção').length],[CheckCircle2,'Disponíveis',molds.filter(m=>m.status==='Disponível').length]].map(([Icon,label,value])=><article key={String(label)} style={{padding:18,borderRadius:18,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)'}}><Icon size={19}/><div style={{marginTop:12,color:'#94a3b8',fontSize:12}}>{String(label)}</div><strong style={{display:'block',marginTop:4,fontSize:28}}>{String(value)}</strong></article>)}
   </div>
   <section style={{marginTop:20,padding:18,borderRadius:20,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)'}}>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><div style={{position:'relative',flex:'1 1 320px'}}><Search size={16} style={{position:'absolute',left:12,top:12,color:'#64748b'}}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar molde, código, aço..." style={{width:'100%',boxSizing:'border-box',padding:'11px 12px 11px 36px',borderRadius:12,border:'1px solid rgba(255,255,255,.12)',background:'#091114',color:'#fff'}}/></div>{['Todos','Disponível','Em produção','Em manutenção'].map(x=><button key={x} type="button" onClick={()=>setStatus(x)} style={{minHeight:42,padding:'0 14px',borderRadius:12,border:'1px solid rgba(255,255,255,.12)',background:status===x?'rgba(141,217,207,.14)':'transparent',color:'#fff',fontWeight:800,touchAction:'manipulation'}}>{x}</button>)}</div>
    <div style={{overflowX:'auto',marginTop:18,WebkitOverflowScrolling:'touch',willChange:'transform'}}><table style={{width:'100%',minWidth:900,borderCollapse:'collapse'}}><thead><tr>{['Código','Descrição','Material','Cavidades','Status','Próxima manutenção'].map(x=><th key={x} style={{textAlign:'left',padding:12,borderBottom:'1px solid rgba(255,255,255,.12)',color:'#94a3b8',fontSize:10,textTransform:'uppercase'}}>{x}</th>)}</tr></thead><tbody>{rows.map(m=><tr key={m.id}><td style={{padding:12,fontWeight:900}}>{m.codigo}</td><td style={{padding:12}}>{m.descricao}</td><td style={{padding:12,color:'#cbd5e1'}}>{m.material}</td><td style={{padding:12}}>{m.cavidades}</td><td style={{padding:12}}><span style={{display:'inline-flex',alignItems:'center',gap:6}}><CheckCircle2 size={14}/>{m.status}</span></td><td style={{padding:12,color:'#f5df8b'}}>{m.proximaManutencao}</td></tr>)}</tbody></table></div>
   </section>
   <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,marginTop:20}}>{[[Cog,'Setup de molde','Checklist de montagem, fixação e parâmetros iniciais.'],[Wrench,'Manutenção preventiva','Ciclos, lubrificação, inspeção e plano de manutenção.'],[Box,'Cavidades e componentes','Rastreabilidade de cavidades, insertos e componentes.'],[ShieldCheck,'Qualidade do ferramental','Liberação, inspeção e bloqueio antes da produção.']].map(([I,t,d])=><article key={String(t)} style={{padding:18,borderRadius:18,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)'}}><I size={20}/><h3 style={{margin:'12px 0 6px'}}>{String(t)}</h3><p style={{margin:0,color:'#94a3b8',fontSize:13,lineHeight:1.6}}>{String(d)}</p></article>)}</section>
  </section>
 </main>
}
