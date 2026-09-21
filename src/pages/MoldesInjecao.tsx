/*
 * 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
 * - Arquivo: src/pages/MoldesInjecao.tsx
 * - Status Atual: Revisão 2 (Módulo Industrial Avançado)
 * - Total de Linhas Gerado: 155
 * - Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useMemo, useState } from 'react' | import { CheckCircle2, Gauge, Hammer, Layers3, Search, ShieldCheck, Wrench } from 'lucide-react' | import { supabase } from '../lib/supabaseClient'
 * - Regra de Negócio Senior/Nomus Incorporada: cadastro real de molde por tenant, vida útil calculada por ciclos, manutenção e ação Ver / Arrumar.
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Gauge, Hammer, Layers3, Search, ShieldCheck, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ModalDetalhesMolde from '../components/ModalDetalhesMolde'
import type { MoldDetails } from '../components/ModalDetalhesMolde'

type Mold=MoldDetails & {material?:string}
type Status='Todos'|'DISPONIVEL'|'EM_PRODUCAO'|'EM_MANUTENCAO'
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Falha ao consultar moldes.')

export default function MoldesInjecao(){
 const [molds,setMolds]=useState<Mold[]>([]),[q,setQ]=useState(''),[status,setStatus]=useState<Status>('Todos'),[selected,setSelected]=useState<string|null>(null),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{void load()},[])
 async function load(){setLoading(true);try{const r=await supabase.from('erp_moldes').select('id,codigo,nome,status,produto_id,data_fabricacao,numero_cavidades,cavidades_ativas,ciclos_atuais,limite_ciclos').eq('ativo',true).order('codigo');if(r.error)throw r.error;setMolds((r.data??[]) as Mold[])}catch(e){setNotice(errorText(e))}finally{setLoading(false)}}
 const rows=useMemo(()=>molds.filter(m=>(status==='Todos'||m.status===status)&&(!q||[m.codigo,m.nome,m.status].join(' ').toLowerCase().includes(q.toLowerCase()))),[molds,q,status])
 const totals=useMemo(()=>({cav:rows.reduce((s,m)=>s+m.numero_cavidades,0),maintenance:rows.filter(m=>m.status==='EM_MANUTENCAO').length,available:rows.filter(m=>m.status==='DISPONIVEL').length}),[rows])
 return <main className="industrial-form-page"><header className="industrial-page-head"><div><span className="industrial-eyebrow">ENGENHARIA • FERRAMENTARIA</span><h1>Moldes e Injeção Plástica</h1><p>Dados reais do cadastro de moldes, ciclos, cavidades e vida útil por empresa.</p></div><button className="industrial-secondary" onClick={()=>void load()}>Atualizar</button></header>
 <div className="industrial-info-grid"><article><Gauge/><b>Moldes encontrados</b><strong>{rows.length}</strong></article><article><Layers3/><b>Cavidades totais</b><strong>{totals.cav}</strong></article><article><Wrench/><b>Em manutenção</b><strong>{totals.maintenance}</strong></article></div>
 <section className="industrial-panel"><div className="industrial-section-head"><div><h2>Cadastro de ativos</h2><p>O botão Ver / Arrumar abre o cadastro operacional completo.</p></div><div className="industrial-context"><ShieldCheck size={16}/> RLS por tenant</div></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar código ou molde…" style={{flex:'1 1 280px'}}/>{(['Todos','DISPONIVEL','EM_PRODUCAO','EM_MANUTENCAO'] as const).map(x=><button key={x} className="industrial-secondary" onClick={()=>setStatus(x)}>{x==='Todos'?'Todos':x.replaceAll('_',' ')}</button>)}</div><div className="industrial-table-scroll" style={{marginTop:14}}><table className="industrial-table"><thead><tr><th>Código</th><th>Descrição</th><th>Cavidades</th><th>Ativas</th><th>Ciclos</th><th>Vida</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map(m=>{const pct=m.limite_ciclos>0?Math.min(100,m.ciclos_atuais/m.limite_ciclos*100):0;return <tr key={m.id}><td><b>{m.codigo}</b></td><td>{m.nome}</td><td>{m.numero_cavidades}</td><td>{m.cavidades_ativas}/{m.numero_cavidades}</td><td>{m.ciclos_atuais.toLocaleString('pt-BR')}</td><td>{m.limite_ciclos?pct.toFixed(1)+'%':'Sem limite cadastrado'}</td><td>{m.status}</td><td><button className="industrial-secondary" onClick={()=>setSelected(m.id)}>Ver / Arrumar</button></td></tr>})}{!rows.length&&<tr><td colSpan={8}>{loading?'Consultando Supabase…':'Nenhum molde cadastrado para os filtros atuais.'}</td></tr>}</tbody></table></div></section>
 {notice&&<div className="industrial-notice">{notice}</div>}
 <ModalDetalhesMolde moldId={selected} open={Boolean(selected)} onClose={()=>{setSelected(null);void load()}}/>
 </main>
}
