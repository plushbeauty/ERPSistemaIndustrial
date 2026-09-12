import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Database, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'op' | 'matriz' | 'fmea' | 'ncr' | 'estoque'
type Product = { id: string; codigo: string; nome: string; unidade?: string }
type User = { id: string; nome: string; matricula?: string | null }
type Competencia = { id: string; codigo: string; nome: string }
type OP = { id: string; numero: number; produto_id: string; quantidade_planejada: number; quantidade_produzida: number; status: string; data_prevista: string | null; observacoes: string | null }
type FMEA = { id: string; codigo: string; tipo: string; modo_falha: string; efeito: string | null; causa: string | null; severidade: number; ocorrencia: number; deteccao: number; rpn: number | null; status: string; acao_recomendada: string | null }
type NCR = { id: string; numero: number; origem: string; severidade: string; produto_id: string | null; descricao: string; contencao: string | null; causa_raiz: string | null; status: string; prazo: string | null; rpn: number | null }
type Matriz = { id: string; usuario_id: string; competencia_id: string; nivel_atual: number; status: string; ultima_avaliacao: string | null; proxima_avaliacao: string | null; observacoes: string | null }
type Movimento = { id: string; produto_id: string; tipo: string; quantidade: number; custo_unitario: number; origem: string | null; observacao: string | null; created_at: string }

const tabs: Array<[Tab, string]> = [['op','Ordens de Produção'],['matriz','Matriz de Competências'],['fmea','FMEA'],['ncr','Não Conformidades'],['estoque','Almoxarifado / Estoque']]
const today = () => new Date().toISOString().slice(0,10)

export default function OperacaoIndustrial() {
  const [tab,setTab] = useState<Tab>('op')
  const [products,setProducts] = useState<Product[]>([])
  const [users,setUsers] = useState<User[]>([])
  const [competencias,setCompetencias] = useState<Competencia[]>([])
  const [ops,setOps] = useState<OP[]>([])
  const [fmeas,setFmeas] = useState<FMEA[]>([])
  const [ncrs,setNcrs] = useState<NCR[]>([])
  const [matriz,setMatriz] = useState<Matriz[]>([])
  const [movs,setMovs] = useState<Movimento[]>([])
  const [empresaId,setEmpresaId] = useState('')
  const [editing,setEditing] = useState<string | null>(null)
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')

  const [opForm,setOpForm] = useState({produto_id:'',quantidade_planejada:'',quantidade_produzida:'0',status:'planejada',data_prevista:today(),observacoes:''})
  const [fmeaForm,setFmeaForm] = useState({codigo:'',tipo:'PFMEA',modo_falha:'',efeito:'',causa:'',severidade:'1',ocorrencia:'1',deteccao:'1',acao_recomendada:'',status:'aberta'})
  const [ncrForm,setNcrForm] = useState({origem:'processo',severidade:'media',produto_id:'',descricao:'',contencao:'',causa_raiz:'',status:'aberta',prazo:'',rpn:''})
  const [matForm,setMatForm] = useState({usuario_id:'',competencia_id:'',nivel_atual:'0',status:'gap',ultima_avaliacao:'',proxima_avaliacao:'',observacoes:''})
  const [movForm,setMovForm] = useState({produto_id:'',tipo:'entrada',quantidade:'',custo_unitario:'0',origem:'almoxarifado',observacao:''})

  async function load() {
    setBusy(true); setError('')
    const [{data:empresa,error:empresaError},{data:p},{data:u},{data:c},{data:o},{data:f},{data:n},{data:m},{data:e}] = await Promise.all([
      supabase.rpc('erp_current_empresa_id'),
      supabase.from('erp_produtos').select('id,codigo,nome,unidade').order('codigo').limit(500),
      supabase.from('erp_usuarios').select('id,nome,matricula').eq('ativo',true).order('nome').limit(500),
      supabase.from('erp_competencias').select('id,codigo,nome').eq('ativo',true).order('codigo').limit(500),
      supabase.from('erp_ordens_producao').select('id,numero,produto_id,quantidade_planejada,quantidade_produzida,status,data_prevista,observacoes').order('created_at',{ascending:false}).limit(300),
      supabase.from('erp_fmea').select('id,codigo,tipo,modo_falha,efeito,causa,severidade,ocorrencia,deteccao,rpn,status,acao_recomendada').order('updated_at',{ascending:false}).limit(300),
      supabase.from('erp_nao_conformidades').select('id,numero,origem,severidade,produto_id,descricao,contencao,causa_raiz,status,prazo,rpn').order('created_at',{ascending:false}).limit(300),
      supabase.from('erp_matriz_competencias').select('id,usuario_id,competencia_id,nivel_atual,status,ultima_avaliacao,proxima_avaliacao,observacoes').order('updated_at',{ascending:false}).limit(500),
      supabase.from('erp_estoque_movimentos').select('id,produto_id,tipo,quantidade,custo_unitario,origem,observacao,created_at').order('created_at',{ascending:false}).limit(500),
    ])
    if (empresaError) setError(empresaError.message)
    setEmpresaId(String(empresa || ''))
    setProducts((p||[]) as Product[]); setUsers((u||[]) as User[]); setCompetencias((c||[]) as Competencia[])
    setOps((o||[]) as OP[]); setFmeas((f||[]) as FMEA[]); setNcrs((n||[]) as NCR[]); setMatriz((m||[]) as Matriz[]); setMovs((e||[]) as Movimento[])
    const firstProduct=(p||[])[0]?.id || ''
    if (!opForm.produto_id) setOpForm(x=>({...x,produto_id:firstProduct}))
    if (!ncrForm.produto_id) setNcrForm(x=>({...x,produto_id:firstProduct}))
    if (!movForm.produto_id) setMovForm(x=>({...x,produto_id:firstProduct}))
    if (!matForm.usuario_id && (u||[])[0]) setMatForm(x=>({...x,usuario_id:(u||[])[0].id}))
    if (!matForm.competencia_id && (c||[])[0]) setMatForm(x=>({...x,competencia_id:(c||[])[0].id}))
    setBusy(false)
  }
  useEffect(()=>{void load()},[])

  function clear(){setEditing(null);setNotice('');setError('')}
  async function save(table:string,payload:Record<string,unknown>,id?:string){
    setBusy(true);setNotice('');setError('')
    const clean={...payload,empresa_id:empresaId}
    const response=id ? await supabase.from(table).update(clean).eq('id',id) : await supabase.from(table).insert(clean)
    if(response.error){setError(response.error.message);setBusy(false);return false}
    setNotice(id ? 'Registro atualizado com sucesso.' : 'Registro criado e persistido no Supabase.')
    setBusy(false); await load(); return true
  }
  async function remove(table:string,id:string){
    if(!confirm('Excluir este registro? Esta operação não pode ser desfeita.')) return
    setBusy(true);setError('')
    const {error:e}=await supabase.from(table).delete().eq('id',id)
    if(e)setError(e.message);else setNotice('Registro excluído.')
    setBusy(false);await load()
  }
  const productName=(id:string|null|undefined)=>products.find(x=>x.id===id)?.nome || products.find(x=>x.id===id)?.codigo || '—'
  const userName=(id:string)=>users.find(x=>x.id===id)?.nome || '—'
  const compName=(id:string)=>competencias.find(x=>x.id===id)?.nome || '—'
  const filtered=(items:Array<{id:string;[key:string]:unknown}>)=>items.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()))
  const rpn=(s:number,o:number,d:number)=>s*o*d

  async function submitOp(e:FormEvent){e.preventDefault();const q=Number(opForm.quantidade_planejada);if(!opForm.produto_id||q<=0){setError('Informe produto e quantidade planejada maior que zero.');return}const ok=await save('erp_ordens_producao',{produto_id:opForm.produto_id,quantidade_planejada:q,quantidade_produzida:Number(opForm.quantidade_produzida||0),status:opForm.status,data_prevista:opForm.data_prevista||null,observacoes:opForm.observacoes||null},editing||undefined);if(ok){setOpForm(x=>({...x,quantidade_planejada:'',quantidade_produzida:'0',observacoes:''}));clear()}}
  async function submitFmea(e:FormEvent){e.preventDefault();const s=Number(fmeaForm.severidade),o=Number(fmeaForm.ocorrencia),d=Number(fmeaForm.deteccao);if(!fmeaForm.codigo||!fmeaForm.modo_falha){setError('Informe código e modo de falha.');return}const ok=await save('erp_fmea',{codigo:fmeaForm.codigo,tipo:fmeaForm.tipo,modo_falha:fmeaForm.modo_falha,efeito:fmeaForm.efeito||null,causa:fmeaForm.causa||null,severidade:s,ocorrencia:o,deteccao:d,rpn:rpn(s,o,d),status:fmeaForm.status,acao_recomendada:fmeaForm.acao_recomendada||null},editing||undefined);if(ok){setFmeaForm(x=>({...x,codigo:'',modo_falha:'',efeito:'',causa:'',acao_recomendada:''}));clear()}}
  async function submitNcr(e:FormEvent){e.preventDefault();if(!ncrForm.descricao){setError('Informe a descrição da não conformidade.');return}const ok=await save('erp_nao_conformidades',{origem:ncrForm.origem,severidade:ncrForm.severidade,produto_id:ncrForm.produto_id||null,descricao:ncrForm.descricao,contencao:ncrForm.contencao||null,causa_raiz:ncrForm.causa_raiz||null,status:ncrForm.status,prazo:ncrForm.prazo||null,rpn:ncrForm.rpn?Number(ncrForm.rpn):null},editing||undefined);if(ok){setNcrForm(x=>({...x,descricao:'',contencao:'',causa_raiz:'',rpn:''}));clear()}}
  async function submitMat(e:FormEvent){e.preventDefault();if(!matForm.usuario_id||!matForm.competencia_id){setError('Selecione funcionário e competência.');return}const ok=await save('erp_matriz_competencias',{usuario_id:matForm.usuario_id,competencia_id:matForm.competencia_id,nivel_atual:Number(matForm.nivel_atual),status:matForm.status,ultima_avaliacao:matForm.ultima_avaliacao||null,proxima_avaliacao:matForm.proxima_avaliacao||null,observacoes:matForm.observacoes||null},editing||undefined);if(ok){setMatForm(x=>({...x,observacoes:''}));clear()}}
  async function submitMov(e:FormEvent){e.preventDefault();const q=Number(movForm.quantidade);if(!movForm.produto_id||q<=0){setError('Informe produto e quantidade maior que zero.');return}const ok=await save('erp_estoque_movimentos',{produto_id:movForm.produto_id,tipo:movForm.tipo,quantidade:q,custo_unitario:Number(movForm.custo_unitario||0),origem:movForm.origem||null,observacao:movForm.observacao||null});if(ok)setMovForm(x=>({...x,quantidade:'',observacao:''}))}

  function startEdit(type:Tab,row:any){setEditing(row.id);setNotice('');setError(''); if(type==='op')setOpForm({produto_id:row.produto_id,quantidade_planejada:String(row.quantidade_planejada),quantidade_produzida:String(row.quantidade_produzida),status:row.status,data_prevista:row.data_prevista||'',observacoes:row.observacoes||''}); if(type==='fmea')setFmeaForm({codigo:row.codigo,tipo:row.tipo,modo_falha:row.modo_falha,efeito:row.efeito||'',causa:row.causa||'',severidade:String(row.severidade),ocorrencia:String(row.ocorrencia),deteccao:String(row.deteccao),acao_recomendada:row.acao_recomendada||'',status:row.status}); if(type==='ncr')setNcrForm({origem:row.origem,severidade:row.severidade,produto_id:row.produto_id||'',descricao:row.descricao,contencao:row.contencao||'',causa_raiz:row.causa_raiz||'',status:row.status,prazo:row.prazo||'',rpn:row.rpn?String(row.rpn):''}); if(type==='matriz')setMatForm({usuario_id:row.usuario_id,competencia_id:row.competencia_id,nivel_atual:String(row.nivel_atual),status:row.status,ultima_avaliacao:row.ultima_avaliacao||'',proxima_avaliacao:row.proxima_avaliacao||'',observacoes:row.observacoes||''}) }

  const field=(label:string, value:string, onChange:(v:string)=>void, type='text')=><label style={{display:'grid',gap:5,fontSize:13,fontWeight:800,color:'#334155'}}>{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} style={input}/></label>
  const selectField=(label:string,value:string,onChange:(v:string)=>void,options:Array<[string,string]>)=><label style={{display:'grid',gap:5,fontSize:13,fontWeight:800,color:'#334155'}}>{label}<select value={value} onChange={e=>onChange(e.target.value)} style={input}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  const formButtons=(label:string)=><div style={{display:'flex',gap:8,marginTop:14}}><button className="menu-green" disabled={busy} type="submit"><Save size={16}/>{busy?'Salvando…':editing?'Atualizar':'Gravar'} {label}</button>{editing&&<button className="secondary-v2" type="button" onClick={clear}><X size={16}/>Cancelar</button>}</div>

  return <div style={{padding:24,maxWidth:1600,margin:'0 auto'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap',marginBottom:18}}><div><button className="secondary-v2" type="button" onClick={()=>location.href='/erp-industrial'}><ArrowLeft size={17}/> Voltar</button><span className="v2-eyebrow" style={{display:'block',marginTop:14}}>OPERAÇÃO • CRUD REAL • SUPABASE</span><h1 style={{fontSize:34,margin:'5px 0'}}>Cockpit Operacional Industrial</h1><p style={{margin:0,color:'#64748b'}}>Persistência real, edição, exclusão controlada, cálculo de RPN e trilha operacional.</p></div><button className="secondary-v2" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> Atualizar dados</button></header>
    <nav style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:14}}>{tabs.map(([key,label])=><button key={key} type="button" onClick={()=>{setTab(key);clear()}} style={{padding:'11px 15px',borderRadius:12,border:key===tab?'2px solid #0f766e':'1px solid #dbe3e8',background:key===tab?'#e9f7f3':'#fff',fontWeight:900,whiteSpace:'nowrap'}}>{label}</button>)}</nav>
    {(notice||error)&&<div style={{margin:'0 0 14px',padding:12,borderRadius:12,background:error?'#fff1f2':'#ecfdf5',border:`1px solid ${error?'#fecdd3':'#bbf7d0'}`,color:error?'#9f1239':'#166534',fontWeight:800}}>{error||notice}</div>}
    <div style={{display:'grid',gridTemplateColumns:'minmax(330px,420px) minmax(0,1fr)',gap:16,alignItems:'start'}}>
      <section style={card}>
        {tab==='op'&&<form onSubmit={submitOp}><h2 style={h2}>{editing?'Editar OP':'Nova Ordem de Produção'}</h2>{selectField('Produto',opForm.produto_id,setOpFormValue('produto_id',setOpForm),products.map(p=>[p.id,`${p.codigo} • ${p.nome}`]))}{field('Quantidade planejada',opForm.quantidade_planejada,v=>setOpForm(x=>({...x,quantidade_planejada:v})),'number')}{field('Quantidade produzida',opForm.quantidade_produzida,v=>setOpForm(x=>({...x,quantidade_produzida:v})),'number')}{selectField('Status',opForm.status,v=>setOpForm(x=>({...x,status:v})),[['planejada','Planejada'],['liberada','Liberada'],['em_producao','Em produção'],['pausada','Pausada'],['concluida','Concluída'],['cancelada','Cancelada']])}{field('Data prevista',opForm.data_prevista,v=>setOpForm(x=>({...x,data_prevista:v})),'date')}{field('Observações',opForm.observacoes,v=>setOpForm(x=>({...x,observacoes:v})))}{formButtons('OP')}</form>}
        {tab==='fmea'&&<form onSubmit={submitFmea}><h2 style={h2}>{editing?'Editar FMEA':'Novo FMEA'}</h2>{field('Código',fmeaForm.codigo,v=>setFmeaForm(x=>({...x,codigo:v})))}{selectField('Tipo',fmeaForm.tipo,v=>setFmeaForm(x=>({...x,tipo:v})),[['PFMEA','PFMEA'],['DFMEA','DFMEA']])}{field('Modo de falha',fmeaForm.modo_falha,v=>setFmeaForm(x=>({...x,modo_falha:v})))}{field('Efeito',fmeaForm.efeito,v=>setFmeaForm(x=>({...x,efeito:v})))}{field('Causa',fmeaForm.causa,v=>setFmeaForm(x=>({...x,causa:v}))}<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{field('S',fmeaForm.severidade,v=>setFmeaForm(x=>({...x,severidade:v})),'number')}{field('O',fmeaForm.ocorrencia,v=>setFmeaForm(x=>({...x,ocorrencia:v})),'number')}{field('D',fmeaForm.deteccao,v=>setFmeaForm(x=>({...x,deteccao:v})),'number')}</div><div style={{marginTop:8,padding:10,borderRadius:10,background:'#f8fafc'}}>RPN calculado: <b>{rpn(Number(fmeaForm.severidade)||0,Number(fmeaForm.ocorrencia)||0,Number(fmeaForm.deteccao)||0)}</b></div>{field('Ação recomendada',fmeaForm.acao_recomendada,v=>setFmeaForm(x=>({...x,acao_recomendada:v})))}{selectField('Status',fmeaForm.status,v=>setFmeaForm(x=>({...x,status:v})),[['aberta','Aberta'],['em_analise','Em análise'],['tratada','Tratada'],['encerrada','Encerrada']])}{formButtons('FMEA')}</form>}
        {tab==='ncr'&&<form onSubmit={submitNcr}><h2 style={h2}>{editing?'Editar RPNC':'Nova Não Conformidade'}</h2>{selectField('Origem',ncrForm.origem,v=>setNcrForm(x=>({...x,origem:v})),[['processo','Processo'],['produto','Produto'],['cliente','Cliente'],['fornecedor','Fornecedor'],['auditoria','Auditoria']])}{selectField('Severidade',ncrForm.severidade,v=>setNcrForm(x=>({...x,severidade:v})),[['baixa','Baixa'],['media','Média'],['alta','Alta'],['critica','Crítica']])}{selectField('Produto',ncrForm.produto_id,v=>setNcrForm(x=>({...x,produto_id:v})),[['','Não informado'],...products.map(p=>[p.id,`${p.codigo} • ${p.nome}`])])}{field('Descrição',ncrForm.descricao,v=>setNcrForm(x=>({...x,descricao:v})))}{field('Contenção',ncrForm.contencao,v=>setNcrForm(x=>({...x,contencao:v})))}{field('Causa raiz',ncrForm.causa_raiz,v=>setNcrForm(x=>({...x,causa_raiz:v})))}{field('Prazo',ncrForm.prazo,v=>setNcrForm(x=>({...x,prazo:v})),'date')}{field('RPN',ncrForm.rpn,v=>setNcrForm(x=>({...x,rpn:v})),'number')}{selectField('Status',ncrForm.status,v=>setNcrForm(x=>({...x,status:v})),[['aberta','Aberta'],['contenção','Contenção'],['investigacao','Investigação'],['capa','CAPA'],['encerrada','Encerrada']])}{formButtons('RPNC')}</form>}
        {tab==='matriz'&&<form onSubmit={submitMat}><h2 style={h2}>{editing?'Editar competência':'Vincular competência'}</h2>{selectField('Funcionário',matForm.usuario_id,v=>setMatForm(x=>({...x,usuario_id:v})),users.map(u=>[u.id,`${u.nome}${u.matricula?' • '+u.matricula:''}`]))}{selectField('Competência',matForm.competencia_id,v=>setMatForm(x=>({...x,competencia_id:v})),competencias.map(c=>[c.id,`${c.codigo} • ${c.nome}`]))}{field('Nível atual',matForm.nivel_atual,v=>setMatForm(x=>({...x,nivel_atual:v})),'number')}{selectField('Status',matForm.status,v=>setMatForm(x=>({...x,status:v})),[['gap','Gap'],['em_desenvolvimento','Em desenvolvimento'],['apto','Apto'],['certificado','Certificado']])}{field('Última avaliação',matForm.ultima_avaliacao,v=>setMatForm(x=>({...x,ultima_avaliacao:v})),'date')}{field('Próxima avaliação',matForm.proxima_avaliacao,v=>setMatForm(x=>({...x,proxima_avaliacao:v})),'date')}{field('Observações',matForm.observacoes,v=>setMatForm(x=>({...x,observacoes:v})))}{formButtons('competência')}</form>}
        {tab==='estoque'&&<form onSubmit={submitMov}><h2 style={h2}>Novo movimento de estoque</h2><p style={{fontSize:13,color:'#64748b'}}>O livro de movimentos é tratado como trilha: entrada/saída/consumo/produção não recebe exclusão pela interface.</p>{selectField('Produto',movForm.produto_id,v=>setMovForm(x=>({...x,produto_id:v})),products.map(p=>[p.id,`${p.codigo} • ${p.nome}`]))}{selectField('Tipo',movForm.tipo,v=>setMovForm(x=>({...x,tipo:v})),[['entrada','Entrada'],['saida','Saída'],['consumo','Consumo'],['producao','Produção'],['ajuste','Ajuste'],['transferencia','Transferência'],['devolucao','Devolução']])}{field('Quantidade',movForm.quantidade,v=>setMovForm(x=>({...x,quantidade:v})),'number')}{field('Custo unitário',movForm.custo_unitario,v=>setMovForm(x=>({...x,custo_unitario:v})),'number')}{field('Origem',movForm.origem,v=>setMovForm(x=>({...x,origem:v})))}{field('Observação',movForm.observacao,v=>setMovForm(x=>({...x,observacao:v})))}{formButtons('movimento')}</form>}
      </section>
      <section style={card}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:12}}><div><h2 style={{...h2,marginBottom:3}}>Registros persistidos</h2><small style={{color:'#64748b'}}>Tenant atual: {empresaId||'sessão não identificada'}</small></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar…" style={{...input,maxWidth:240}}/></div>
        {tab==='op'&&<Table headers={['OP','Produto','Planejada','Produzida','Status','Previsão','Ações']} rows={filtered(ops).map(x=>[x.numero,productName(x.produto_id),x.quantidade_planejada,x.quantidade_produzida,x.status,x.data_prevista||'—',actions(()=>startEdit('op',x),()=>remove('erp_ordens_producao',x.id))])}/>} 
        {tab==='fmea'&&<Table headers={['Código','Falha','S','O','D','RPN','Status','Ações']} rows={filtered(fmeas).map(x=>[x.codigo,x.modo_falha,x.severidade,x.ocorrencia,x.deteccao,x.rpn??rpn(x.severidade,x.ocorrencia,x.deteccao),x.status,actions(()=>startEdit('fmea',x),()=>remove('erp_fmea',x.id))])}/>
        {tab==='ncr'&&<Table headers={['RPNC','Origem','Severidade','Descrição','RPN','Status','Prazo','Ações']} rows={filtered(ncrs).map(x=>[x.numero||'—',x.origem,x.severidade,x.descricao,x.rpn??'—',x.status,x.prazo||'—',actions(()=>startEdit('ncr',x),()=>remove('erp_nao_conformidades',x.id))])}/>
        {tab==='matriz'&&<Table headers={['Funcionário','Competência','Nível','Status','Última','Próxima','Ações']} rows={filtered(matriz).map(x=>[userName(x.usuario_id),compName(x.competencia_id),x.nivel_atual,x.status,x.ultima_avaliacao||'—',x.proxima_avaliacao||'—',actions(()=>startEdit('matriz',x),()=>remove('erp_matriz_competencias',x.id))])}/>
        {tab==='estoque'&&<Table headers={['Data','Produto','Tipo','Qtd.','Custo','Origem','Observação']} rows={filtered(movs).map(x=>[new Date(x.created_at).toLocaleString('pt-BR'),productName(x.produto_id),x.tipo,x.quantidade,Number(x.custo_unitario||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),x.origem||'—',x.observacao||'—'])}/>
      </section>
    </div>
  </div>
}

function setOpFormValue(key:'produto_id',setter:(v:(x:any)=>any)=>void){return (v:string)=>setter((x:any)=>({...x,[key]:v}))}
function actions(edit:()=>void,del:()=>void){return <div style={{display:'flex',gap:6}}><button type="button" className="icon-button" title="Editar" onClick={edit}><Pencil size={15}/></button><button type="button" className="icon-button" title="Excluir" onClick={del}><Trash2 size={15}/></button></div>}
function Table({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){return <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{headers.map(h=><th key={h} style={{textAlign:'left',padding:10,background:'#f8fafc',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} style={{padding:10,borderBottom:'1px solid #eef2f7',verticalAlign:'top'}}>{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} style={{padding:36,textAlign:'center',color:'#64748b'}}>Nenhum registro encontrado.</td></tr>}</tbody></table></div>}

const input:React.CSSProperties={width:'100%',minHeight:42,border:'1px solid #cbd5e1',borderRadius:9,padding:'0 10px',fontSize:14,background:'#fff'}
const card:React.CSSProperties={background:'#fff',border:'1px solid #dfe7e4',borderRadius:18,padding:18,boxShadow:'0 8px 24px rgba(23,32,51,.05)'}
const h2:React.CSSProperties={fontSize:20,margin:'0 0 14px',color:'#172033'}
