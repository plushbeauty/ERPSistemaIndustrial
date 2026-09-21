import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Eye, FilePlus2, MoreHorizontal, Plus, Search, Tablet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Field={key:string;label:string;type?:'text'|'number'|'date'|'email';required?:boolean}
type Module={name:string;title:string;description:string;icon:LucideIcon;table?:string;fields?:Field[]}
type Profile={nome:string;empresa_id:string;nivel_admin:number}
type Row=Record<string,unknown>&{id:string}

const specialRoutes:Record<string,string>={
  Qualidade:'/qualidade',
  Fiscal:'/fiscal',
  PCP:'/pcp',
  Produtos:'/produtos-vendas',
  'Moldes e Ferramentas':'/moldes-injecao',
  'Apontamentos':'/operacao-industrial',
  'Recebimento de Materiais':'/recebimento-materiais',
  'Solicitações de Compra':'/compras-solicitacao',
  Usuários:'/usuarios'
}

const submenus:Record<string,string[]>={
  Clientes:['Cadastro de clientes','Contatos e responsáveis','Documentos do cliente','Histórico comercial','Pedidos e faturamento'],
  Produtos:['Cadastro de produtos','Materiais e matérias-primas','Unidades e grupos','Preços e custos','Estoque mínimo'],
  Engenharia:['Produtos e BOM','Fichas técnicas','Roteiros de fabricação','Versões e engenharia de mudança','Custos de engenharia'],
  Máquinas:['Cadastro de máquinas','Centros de trabalho','Disponibilidade','Manutenção preventiva','Indicadores de máquina'],
  Processos:['Operações','Tempos padrão','Recursos','Sequenciamento','Parâmetros de processo'],
  MRP:['Necessidades de materiais','Sugestões de compra','Sugestões de produção','Disponibilidade','Explosão de BOM'],
  Setup:['Ordens de setup','Troca de molde','Checklist de preparação','Tempo real x padrão','Perdas de setup'],
  Refugo:['Registro de refugo','Causas','Retrabalho','Perdas por OP','Indicadores de perdas'],
  OEE:['Disponibilidade','Performance','Qualidade','OEE por máquina','Paradas'],
  'Matéria-prima':['Lotes','Consumo','Reservas','Validade','Rastreabilidade'],
  Estoque:['Saldo por depósito','Movimentações','Inventário','Transferências','Lotes e séries'],
  Compras:['Solicitações','Cotações','Pedidos de compra','Recebimento','Fornecedores'],
  RPNC:['RPNC abertas','Análise de causa','Plano de ação','Eficácia','Histórico'],
  Rastreabilidade:['Lotes de entrada','Consumo em OP','Produto acabado','Expedição','Rastreio reverso'],
  Manutenção:['Ordens de manutenção','Preventiva','Corretiva','Peças e custos','Histórico de máquina'],
  Custos:['Custo padrão','Custo real','Composição','Margem','Custo por OP'],
  Expedição:['Pedidos para expedir','Separação','Conferência','Romaneio','Entregas'],
  Financeiro:['Contas a pagar','Contas a receber','Caixa','Conciliação','Fluxo de caixa'],
  Relatórios:['Produção','Estoque','Qualidade','Financeiro','Gerenciais'],
  FMEA:['FMEA de processo','FMEA de produto','Risco','Ações','Revisões'],
  CAPA:['Ações corretivas','Ações preventivas','Responsáveis','Prazos','Eficácia'],
  Auditorias:['Plano anual','Auditorias abertas','Checklists','Constatações','Ações'],
  Treinamentos:['Plano de treinamento','Cursos','Turmas','Presenças','Certificados'],
  'Matriz de Competências':['Cargos','Competências','Matriz','Gap de competência','Plano de desenvolvimento'],
  Calibração:['Equipamentos de medição','Plano de calibração','Certificados','Vencimentos','Histórico'],
  Documentos:['Controle de documentos','Revisões','Aprovações','Distribuição','Histórico']
}

const tableLabels:Record<string,string[]>={
  Clientes:['Nome / Razão social','CPF / CNPJ','E-mail','Telefone'],
  Produtos:['Código','Nome','Unidade','Tipo','Estoque mínimo','Custo médio','Preço de venda'],
  Engenharia:['Produto ID','Versão','Rendimento','Unidade','Observações'],
  Máquinas:['Código','Nome','Tipo','Fabricante','Modelo','Status'],
  Processos:['Processo ID','Grupo','Código','Nome','Tipo','Unidade','Valor padrão'],
  PCP:['OP ID','Processo ID','Sequência','Máquina ID','Status'],
  'Ordens de Produção':['Produto ID','Quantidade','Status','Data prevista','Observações'],
  Apontamentos:['OP ID','Turno','Quantidade boa','Refugo','Parada (min)'],
  'Matéria-prima':['Produto ID','Lote','Quantidade','Unidade','Validade'],
  Estoque:['Produto ID','Tipo','Quantidade','Documento','Observações'],
  Compras:['Fornecedor ID','Status','Data prevista','Observações'],
  RPNC:['Origem','Severidade','Descrição','Status','Prazo','RPN'],
  Manutenção:['Máquina ID','Tipo','Status','Prioridade','Data prevista','Descrição']
}

const statusFor=(module:string,index:number)=>module==='Ordens de Produção'?['Planejada','Em produção','Em atraso','Concluída'][index%4]:['Ativo','Em análise','Pendente','Concluído'][index%4]

export default function IndustrialModuleWorkspace({module,profile,onBack}:{module:Module;profile:Profile;onBack:()=>void}){
 const fields=module.fields??[]
 const [rows,setRows]=useState<Row[]>([])
 const [query,setQuery]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [selected,setSelected]=useState<Row|null>(null)
 const [showForm,setShowForm]=useState(false)
 const [form,setForm]=useState<Record<string,string>>({})
 const [editing,setEditing]=useState<string|null>(null)
 const [counts,setCounts]=useState({total:'—',open:'—',today:'—',alerts:'—'})

 const route=specialRoutes[module.name]
 const subs=submenus[module.name]??['Visão geral','Cadastro','Movimentações','Consultas','Relatórios']

 const load=async()=>{
   if(!module.table)return
   setBusy(true);setMessage('')
   try{
     let req=supabase.from(module.table).select('*').eq('empresa_id',profile.empresa_id).order('created_at',{ascending:false}).limit(200)
     if(query.trim()&&fields.length){
       const text=query.trim().replace(/[%_]/g,'')
       const keys=fields.filter(f=>f.type==='text'||f.type==='email').slice(0,6).map(f=>`${f.key}.ilike.%${text}%`)
       if(keys.length)req=req.or(keys.join(','))
     }
     const {data,error}=await req
     if(error)throw error
     const next=(data??[]) as Row[]
     setRows(next)
     const open=next.filter(r=>!['concluido','concluída','concluida','cancelado','cancelada','encerrada','fechado','fechada'].includes(String(r.status??'').toLowerCase())).length
     setCounts({total:String(next.length),open:String(open),today:String(next.filter(r=>String(r.created_at??'').slice(0,10)===new Date().toISOString().slice(0,10)).length),alerts:String(next.filter(r=>['atrasado','crítico','critica','critico','pendente'].includes(String(r.status??'').toLowerCase())).length)})
   }catch(e){setRows([]);setMessage(e instanceof Error?e.message:'Não foi possível carregar os registros.')}
   finally{setBusy(false)}
 }

 useEffect(()=>{void load()},[module.table,profile.empresa_id])

 const openNew=()=>{setEditing(null);setForm({});setShowForm(true);setMessage('')}
 const edit=(row:Row)=>{setEditing(row.id);setForm(Object.fromEntries(fields.map(f=>[f.key,row[f.key]==null?'':String(row[f.key])])));setShowForm(true)}
 const save=async(e:FormEvent)=>{
   e.preventDefault();if(!module.table)return
   setBusy(true);setMessage('')
   try{
     const payload:Record<string,unknown>={empresa_id:profile.empresa_id}
     for(const f of fields){const v=(form[f.key]??'').trim();if(f.required&&!v)throw new Error(`Informe ${f.label}.`);payload[f.key]=f.type==='number'&&v!==''?Number(v):v||null}
     const result=editing?await supabase.from(module.table).update(payload).eq('id',editing).eq('empresa_id',profile.empresa_id):await supabase.from(module.table).insert(payload)
     if(result.error)throw result.error
     setShowForm(false);setMessage(editing?'Registro atualizado no banco.':'Registro cadastrado no banco.');await load()
   }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.')}
   finally{setBusy(false)}
 }

 const moduleKey=module.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const goDemo=()=>{location.href=`/demo/erp-industrial?module=${encodeURIComponent(moduleKey)}`}
 const openSub=(sub:string)=>{if(route){location.href=route;return}location.href=`/modulos/${moduleKey}`}
 const goSpecial=()=>{if(route)location.href=route}

 return <div className="module-workspace">
   <div className="module-workspace-head">
     <div className="module-breadcrumb"><button onClick={onBack}><ArrowLeft size={16}/> ERP</button><span>/</span><b>{module.title}</b></div>
     <div className="module-head-actions">
       <button className="secondary-v2" onClick={goDemo}><Tablet size={16}/> Ver Demonstração</button>
       {route&&<button className="secondary-v2" onClick={goSpecial}><ArrowUpRight size={16}/> Abrir centro</button>}
       {module.table&&<button className="menu-green" onClick={openNew}><Plus size={16}/> Novo {module.name==='Clientes'?'cliente':module.name==='Produtos'?'produto':'registro'}</button>}
     </div>
   </div>
   <section className="module-title-row">
     <div><span className="v2-eyebrow">SGQ ERP • {module.name.toUpperCase()}</span><h1>{module.title}</h1><p>{module.description}</p></div>
     <div className="module-status">TENANT ATIVO<strong>{profile.empresa_id.slice(0,8)}…</strong></div>
   </section>
   <div className="module-kpis">
     <article><span>Registros</span><strong>{counts.total}</strong><small>base atual</small></article>
     <article><span>Em aberto</span><strong>{counts.open}</strong><small>status operacionais</small></article>
     <article><span>Hoje</span><strong>{counts.today}</strong><small>criados hoje</small></article>
     <article><span>Alertas</span><strong>{counts.alerts}</strong><small>pendentes / críticos</small></article>
   </div>
   <div className="module-layout">
     <aside className="module-subnav">
       <div className="module-subnav-title">Neste setor</div>
       {subs.map((s,i)=><button key={s} className={i===0?'active':''} onClick={()=>openSub(s)}>{s}<ArrowUpRight size={14}/></button>)}
       <button onClick={goDemo}><Tablet size={14}/> Abrir demonstração</button>
     </aside>
     <main className="module-main">
       <div className="module-toolbar">
         <div><h2>{module.table?'Cadastro e operação':'Painel operacional'}</h2><p>{module.table?'Dados reais da empresa atual. Clique em uma linha para abrir o cadastro completo.':'Centro de trabalho do setor com indicadores, atalhos e processos.'}</p></div>
         {module.table&&<div className="module-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load()}} placeholder={module.name==='Clientes'?'Pesquisar cliente…':'Pesquisar…'}/><button onClick={()=>void load()} disabled={busy}>Pesquisar</button></div>}
       </div>
       {message&&<div className="notice" style={{marginBottom:14}}>{message}</div>}
       {!module.table&&<div className="module-action-grid">{subs.slice(0,5).map((s,i)=><button key={s} onClick={()=>openSub(s)}><span>{i+1}</span><div><b>{s}</b><small>Entrar nesta rotina e acompanhar os registros do setor.</small></div><ArrowUpRight size={17}/></button>)}</div>}
       {module.table&&<section className="crud-list"><div className="crud-list-head"><div><strong>{module.title}</strong><small>{rows.length} registros carregados</small></div><button className="menu-green" onClick={openNew}><FilePlus2 size={16}/> Novo</button></div><div className="crud-table-wrap"><table><thead><tr>{fields.map(f=><th key={f.key}>{f.label}</th>)}<th></th></tr></thead><tbody>{rows.map(row=><tr key={row.id} onClick={()=>setSelected(row)} style={{cursor:'pointer'}}>{fields.map(f=><td key={f.key}>{row[f.key]==null||row[f.key]===''?'—':String(row[f.key])}</td>)}<td><button onClick={e=>{e.stopPropagation();edit(row)}} title="Editar"><MoreHorizontal size={17}/></button></td></tr>)}{!rows.length&&<tr><td colSpan={fields.length+1} className="crud-empty">{busy?'Carregando dados reais…':'Nenhum registro encontrado para esta empresa.'}</td></tr>}</tbody></table></div></section>}
       {!module.table&&<section className="module-empty-data"><h3>O setor não pode ser um quadro vazio</h3><p>Esta área já possui sua estrutura operacional e seus atalhos. Quando houver uma tabela transacional vinculada, os registros aparecerão aqui sem dados fictícios.</p><button className="secondary-v2" onClick={goDemo}><Tablet size={16}/> Ver demonstração preenchida</button></section>}
     </main>
   </div>
   <button className="floating-tablet" onClick={()=>{setShowForm(false);location.href='/demo/erp-industrial'}}><Tablet size={19}/><span>TABLET</span></button>
   {selected&&<div className="modal" onMouseDown={()=>setSelected(null)}><div className="modal-card module-detail" onMouseDown={e=>e.stopPropagation()}><header><div><span className="v2-eyebrow">CADASTRO • DETALHES</span><h2>{module.title}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></header><div className="module-detail-grid">{fields.map(f=><div key={f.key}><span>{f.label}</span><b>{selected[f.key]==null||selected[f.key]===''?'—':String(selected[f.key])}</b></div>)}</div><div className="module-detail-actions"><button className="secondary-v2" onClick={()=>{edit(selected);setSelected(null)}}>Editar cadastro</button><button className="secondary-v2" onClick={()=>setSelected(null)}>Fechar</button></div></div></div>}
   {showForm&&<div className="modal" onMouseDown={()=>setShowForm(false)}><form className="modal-card module-form" onSubmit={save} onMouseDown={e=>e.stopPropagation()}><header><div><span className="v2-eyebrow">{editing?'EDITAR':'NOVO'} • {module.title.toUpperCase()}</span><h2>{editing?'Editar cadastro':`Novo ${module.name==='Clientes'?'cliente':module.name==='Produtos'?'produto':'registro'}`}</h2></div><button type="button" onClick={()=>setShowForm(false)}><X size={18}/></button></header><div className="form-grid">{fields.map(f=><label key={f.key}>{f.label}{f.required?' *':''}<input type={f.type??'text'} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.key.endsWith('_id')?'UUID relacionado':f.label}/></label>)}</div><footer><button type="button" className="secondary-v2" onClick={()=>setShowForm(false)}>Cancelar</button><button className="menu-green" disabled={busy} type="submit">{busy?'Salvando…':editing?'Salvar alterações':'Cadastrar'}</button></footer></form></div>}
 </div>
}
