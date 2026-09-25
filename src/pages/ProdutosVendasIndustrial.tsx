/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 13:00 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-059
 * Alterações: Remoção de cast Event→FormEvent artificial no salvamento de produtos; ação agora chama save() diretamente.
 * Status do Build Local: Não executado — validação será feita pelo gate remoto.
 * =========================================================================
 */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import {
  Boxes, Check, CheckCircle2, ClipboardList, Edit3, Factory, FileText, History, Image as ImageIcon,
  Plus, Printer, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Tag, Trash2, Upload, X, FileSpreadsheet
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
interface XlsxModule { read(buffer:ArrayBuffer,options:{type:'array'}):{SheetNames:string[];Sheets:Record<string,unknown>}; utils:{sheet_to_json<T>(sheet:unknown,options:{defval:string}):T[]} }
declare global { interface Window { XLSX?: XlsxModule } }

type Product={
  id:string;empresa_id:string|null;codigo:string;nome:string;descricao:string|null;descricao_resumida:string|null;codigo_barras:string|null
  grupo:string|null;subgrupo:string|null;marca:string|null;categoria:string|null;unidade:string;unidade_compra:string;unidade_venda:string;fornecedor_padrao_id:string|null
  referencia_interna:string|null;referencia_cliente:string|null;origem:string|null;ncm:string|null;cest:string|null;peso_liquido:number;peso_bruto:number
  comprimento_mm:number;largura_mm:number;altura_mm:number;observacoes:string|null;foto_url:string|null;fabricado:boolean;comprado:boolean;revenda:boolean
  estoque_atual:number;estoque_minimo:number;estoque_maximo:number;ponto_reposicao:number;localizacao_padrao_id:string|null;controla_lote:boolean
  controla_serie:boolean;permite_estoque_negativo:boolean;lote_validade_dias:number;inspecao_qualidade_obrigatoria:boolean;nivel_qualidade:string|null
  origem_fiscal:string|null;cst_icms:string|null;csosn:string|null;cfop_entrada:string|null;cfop_saida:string|null;aliquota_icms:number;aliquota_ipi:number
  aliquota_pis:number;aliquota_cofins:number;prazo_compra_dias:number;prazo_producao_dias:number;tolerancia_percentual:number
  custo_medio:number;custo_ultimo:number;custo_fabricacao:number;preco_venda:number;ativo:boolean
}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type Location={id:string;codigo:string;nome:string;tipo:string}
type Movement={id:string;tipo:string;quantidade:number;origem:string|null;documento:string|null;observacao:string|null;created_at:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number;observacao:string|null;created_at:string}
type Audit={id:string;action:string;module:string;old_data:Record<string,unknown>|null;new_data:Record<string,unknown>|null;created_at:string}
type Attachment={id:string;nome_arquivo:string;storage_path:string;mime_type:string|null;tamanho_bytes:number|null;created_at:string}
type Tab='gerais'|'fiscal'|'estoque'|'producao'|'qualidade'|'documentos'|'historico'
type FormData=Omit<Product,'id'|'empresa_id'>

const tabItems:Array<[Tab,string,typeof Boxes]>=[
  ['gerais','DADOS GERAIS',Boxes],['fiscal','FISCAL',FileText],['estoque','ESTOQUE',Boxes],
  ['producao','PRODUÇÃO',Factory],['qualidade','QUALIDADE',ShieldCheck],['documentos','DOCUMENTOS',ClipboardList],['historico','HISTÓRICO',History]
]
const empty=():FormData=>({
  codigo:'',nome:'',descricao:null,descricao_resumida:null,codigo_barras:null,grupo:null,subgrupo:null,marca:null,categoria:'Produto acabado',unidade:'UN',unidade_compra:'UN',unidade_venda:'UN',
  fornecedor_padrao_id:null,referencia_interna:null,referencia_cliente:null,origem:'0 - Nacional',ncm:null,cest:null,peso_liquido:0,peso_bruto:0,comprimento_mm:0,largura_mm:0,altura_mm:0,
  observacoes:null,foto_url:null,fabricado:false,comprado:false,revenda:false,estoque_atual:0,estoque_minimo:0,estoque_maximo:0,ponto_reposicao:0,localizacao_padrao_id:null,
  controla_lote:false,controla_serie:false,permite_estoque_negativo:false,lote_validade_dias:0,inspecao_qualidade_obrigatoria:false,nivel_qualidade:null,origem_fiscal:null,
  cst_icms:null,csosn:null,cfop_entrada:null,cfop_saida:null,aliquota_icms:0,aliquota_ipi:0,aliquota_pis:0,aliquota_cofins:0,prazo_compra_dias:0,prazo_producao_dias:0,
  tolerancia_percentual:0,custo_medio:0,custo_ultimo:0,custo_fabricacao:0,preco_venda:0,ativo:true
})
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const n=(v:unknown)=>Number(v??0)||0
const fmt=(v:unknown)=>n(v).toLocaleString('pt-BR',{maximumFractionDigits:3})
const panel:CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:8}
const input:CSSProperties={width:'100%',height:38,border:'1px solid #c4ced9',borderRadius:5,padding:'0 9px',fontSize:13,background:'#fff',boxSizing:'border-box'}
const label:CSSProperties={display:'grid',gap:5,fontSize:11,fontWeight:800,color:'#344054'}
const btn=(kind:'primary'|'normal'|'danger'):CSSProperties=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,height:38,padding:'0 14px',borderRadius:6,border:'1px solid '+(kind==='primary'?'#174ea6':kind==='danger'?'#dc2626':'#c4ced9'),background:kind==='primary'?'#1857b6':'#fff',color:kind==='danger'?'#b91c1c':'#172033',fontWeight:800,cursor:'pointer'})
const emptyRow=(text:string,col=7)=><tr><td colSpan={col} style={{padding:22,textAlign:'center',color:'#667085'}}>{text}</td></tr>

export default function ProdutosVendasIndustrial(){
  const [companyId,setCompanyId]=useState('')
  const [products,setProducts]=useState<Product[]>([])
  const [suppliers,setSuppliers]=useState<Supplier[]>([])
  const [locations,setLocations]=useState<Location[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [form,setForm]=useState<FormData>(empty())
  const [editing,setEditing]=useState(false)
  const [tab,setTab]=useState<Tab>('gerais')
  const [query,setQuery]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [movements,setMovements]=useState<Movement[]>([])
  const [defects,setDefects]=useState<Defect[]>([])
  const [audits,setAudits]=useState<Audit[]>([])
  const [attachments,setAttachments]=useState<Attachment[]>([])
  const [detailsLoaded,setDetailsLoaded]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  const importRef=useRef<HTMLInputElement>(null)

  const load=async()=>{
    setBusy(true);setError('')
    try{
      const {data:cid,error:ce}=await supabase.rpc('erp_current_empresa_id')
      if(ce||!cid)throw ce??new Error('Empresa da sessão não identificada.')
      const id=String(cid);setCompanyId(id)
      const [p,s,l]=await Promise.all([
        supabase.from('erp_produtos').select('*').eq('empresa_id',id).order('codigo').limit(2000),
        supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia').eq('empresa_id',id).eq('ativo',true).order('razao_social').limit(1000),
        supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,tipo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(1000)
      ])
      for(const r of [p,s,l])if(r.error)throw r.error
      setProducts((p.data??[]) as Product[]);setSuppliers((s.data??[]) as Supplier[]);setLocations((l.data??[]) as Location[])
      if(selectedId){const fresh=(p.data??[]).find((x:Product)=>x.id===selectedId);if(fresh)setForm({...empty(),...fresh})}
    }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar cadastro de produtos.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return q?products.filter(p=>(p.codigo+' '+p.nome+' '+(p.codigo_barras||'')+' '+(p.grupo||'')+' '+(p.marca||'')).toLowerCase().includes(q)):products
  },[products,query])

  const selectProduct=(p:Product)=>{setSelectedId(p.id);setForm({...empty(),...p});setEditing(false);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const newProduct=()=>{setSelectedId(null);setForm(empty());setEditing(true);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const update=(key:keyof FormData,value:unknown)=>setForm(prev=>({...prev,[key]:value}))
  const save=async()=>{
    setBusy(true);setError('');setMessage('')
    try{
      if(!companyId)throw new Error('Empresa da sessão não identificada.')
      if(!String(form.codigo||'').trim()||!String(form.nome||'').trim())throw new Error('Código e descrição são obrigatórios.')
      const payload={...form,empresa_id:companyId,codigo:String(form.codigo).trim(),nome:String(form.nome).trim(),unidade:String(form.unidade||'UN').toUpperCase(),unidade_compra:String(form.unidade_compra||'UN').toUpperCase(),unidade_venda:String(form.unidade_venda||'UN').toUpperCase()}
      const result=selectedId
        ? await supabase.from('erp_produtos').update(payload).eq('id',selectedId).eq('empresa_id',companyId).select('*').single()
        : await supabase.from('erp_produtos').insert(payload).select('*').single()
      if(result.error)throw result.error
      const saved=result.data as Product;setSelectedId(saved.id);setForm({...empty(),...saved});setEditing(false);setMessage('Produto salvo no banco com sucesso.');await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o produto.')}
    finally{setBusy(false)}
  }
  const cancelEdit=()=>{setEditing(false);if(selectedId){const p=products.find(x=>x.id===selectedId);if(p)setForm({...empty(),...p})}else setForm(empty())}
  const deactivate=async()=>{
    if(!selectedId)return
    const p=products.find(x=>x.id===selectedId);if(!p)return
    if(!window.confirm('Inativar o produto '+p.nome+'? O histórico será preservado.'))return
    setBusy(true);setError('')
    try{const {error:e}=await supabase.from('erp_produtos').update({ativo:false}).eq('id',selectedId).eq('empresa_id',companyId);if(e)throw e;setMessage('Produto inativado.');await load()}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível inativar o produto.')}
    finally{setBusy(false)}
  }
  const loadDetails=async()=>{
    if(!selectedId||detailsLoaded)return
    setBusy(true)
    try{
      const [m,d,a,an]=await Promise.all([
        supabase.from('erp_estoque_movimentos').select('id,tipo,quantidade,origem,documento,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_audit_logs').select('id,action,module,old_data,new_data,created_at').eq('company_id',companyId).eq('entity','erp_produtos').eq('entity_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId).order('created_at',{ascending:false}).limit(200)
      ])
      setMovements((m.data??[]) as Movement[]);setDefects((d.data??[]) as Defect[]);setAudits((a.data??[]) as Audit[]);setAttachments((an.data??[]) as Attachment[]);setDetailsLoaded(true)
      const firstError=[m,d,a,an].find(x=>x.error);if(firstError?.error)setError(firstError.error.message)
    }finally{setBusy(false)}
  }
  useEffect(()=>{if(selectedId)void loadDetails()},[selectedId])

  const importExcel=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]
    if(!file)return
    setBusy(true);setError('');setMessage('')
    try{
      const XLSX=window.XLSX
      if(!XLSX)throw new Error('Leitor Excel ainda não foi carregado. Atualize a página e tente novamente.')
      const buffer=await file.arrayBuffer()
      const wb=XLSX.read(buffer,{type:'array'})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:''})
      if(!rows.length)throw new Error('A planilha está vazia.')
      const norm=(v:unknown)=>String(v??'').trim()
      const key=(row:Record<string,unknown>,names:string[])=>{
        const k=Object.keys(row).find(x=>names.includes(x.trim().toLowerCase()))
        return k?norm(row[k]):''
      }
      let created=0,updated=0,failed=0
      const failures:string[]=[]
      for(let i=0;i<rows.length;i++){
        const row=rows[i]
        const codigo=key(row,['codigointerno','codigo interno','codigo'])
        const nome=key(row,['descrição','descricao','nome','descrição do produto'])
        if(!codigo||!nome){failed++;failures.push('Linha '+(i+2)+': código interno e descrição são obrigatórios.');continue}
        const grupo=key(row,['grupo'])||null
        const cliente=key(row,['cliente'])||null
        const desenho=key(row,['desenho'])||null
        const dimensional=key(row,['dimensional'])||null
        const refCliente=key(row,['codigocliente','codigo cliente','referencia cliente'])||null
        const payload={empresa_id:companyId,codigo,nome,descricao:nome,grupo,referencia_interna:codigo,referencia_cliente:refCliente,cliente,desenho,dimensional,unidade:'UN',unidade_compra:'UN',unidade_venda:'UN',categoria:'Produto acabado',ativo:true,fabricado:true}
        const existing=products.find(p=>p.codigo.trim().toLowerCase()===codigo.toLowerCase())
        const result=existing
          ?await supabase.from('erp_produtos').update(payload).eq('id',existing.id).eq('empresa_id',companyId)
          :await supabase.from('erp_produtos').insert(payload)
        if(result.error){failed++;failures.push('Linha '+(i+2)+' / '+codigo+': '+result.error.message)} else { if(existing){updated++} else {created++} }
      }
      await load()
      setMessage('Importação concluída: '+created+' novos, '+updated+' atualizados, '+failed+' com erro.'+(failures.length?' '+failures.slice(0,3).join(' | '):''))
    }catch(err){
      setError(err instanceof Error?err.message:'Falha ao importar Excel.')
    }finally{
      setBusy(false);e.target.value=''
    }
  }

  const choosePhoto=(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]
    if(!file||!selectedId||!companyId)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Use JPG, PNG ou WEBP.');return}
    if(file.size>5*1024*1024){setError('A foto deve ter no máximo 5 MB.');return}
    setBusy(true);setError('')
    const path=companyId+'/'+selectedId+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    void supabase.storage.from('erp-produtos').upload(path,file,{upsert:true,contentType:file.type})
      .then(({error:e2})=>{if(e2)throw e2;return supabase.from('erp_produtos').update({foto_url:supabase.storage.from('erp-produtos').getPublicUrl(path).data.publicUrl}).eq('id',selectedId).eq('empresa_id',companyId)})
      .then(({error:e3})=>{if(e3)throw e3;const url=supabase.storage.from('erp-produtos').getPublicUrl(path).data.publicUrl;setForm(prev=>({...prev,foto_url:url}));setMessage('Foto do produto atualizada.');void load()})
      .catch(e=>setError(e instanceof Error?e.message:'Não foi possível enviar a foto.')).finally(()=>setBusy(false))
  }

  const field=(title:string,key:keyof FormData,type='text',span=1)=><label style={{...label,gridColumn:'span '+span}}>{title}<input type={type} value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,type==='number'?n(e.target.value):e.target.value)} style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
  const select=(title:string,key:keyof FormData,options:Array<[string,string]>,span=1)=><label style={{...label,gridColumn:'span '+span}}>{title}<select value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,e.target.value)} style={{...input,background:editing?'#fff':'#f5f7fa'}}>{options.map(o=><option value={o[0]} key={o[0]}>{o[1]}</option>)}</select></label>
  const check=(title:string,key:keyof FormData)=><label style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:800,color:'#344054'}}><input type="checkbox" checked={Boolean(form[key])} disabled={!editing} onChange={e=>update(key,e.target.checked)}/>{title}</label>

  return <main style={{maxWidth:1600,margin:'0 auto',color:'#172033',fontFamily:'Arial,sans-serif'}}>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,padding:'14px 16px 10px',borderBottom:'1px solid #d6dde6',background:'#fff',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:900,color:'#1c4bb5'}}>SGQ ERP • CADASTRO MESTRE</div><h1 style={{margin:'2px 0 0',fontSize:25,color:'#173fae'}}>CADASTRO DE PRODUTOS</h1></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <button type="button" onClick={newProduct} style={btn('primary')}><Plus size={16}/>Novo</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} style={{display:'none'}} />
        <button type="button" onClick={()=>importRef.current?.click()} disabled={busy} style={btn('normal')}><FileSpreadsheet size={16}/>Importar Excel (temporário)</button>

        <button type="button" onClick={()=>setEditing(true)} disabled={!selectedId} style={btn('normal')}><Edit3 size={16}/>Editar</button>
        <button type="button" onClick={()=>void save()} disabled={!editing||busy} style={btn('normal')}><Save size={16}/>Salvar</button>
        <button type="button" onClick={cancelEdit} style={btn('normal')}><RotateCcw size={16}/>Cancelar</button>
        <button type="button" onClick={()=>window.print()} style={btn('normal')}><Printer size={16}/>Imprimir</button>
        <button type="button" onClick={()=>setMessage('Etiqueta preparada para impressão do produto selecionado.')} disabled={!selectedId} style={btn('normal')}><Tag size={16}/>Etiqueta</button>
        <button type="button" onClick={()=>void deactivate()} disabled={!selectedId||busy} style={btn('danger')}><Trash2 size={16}/>Inativar</button>
        <button type="button" onClick={()=>{setSelectedId(null);setEditing(false);setForm(empty())}} style={btn('normal')}><X size={16}/>Fechar</button>
      </div>
    </header>

    {(message||error)&&<div role="alert" style={{margin:10,padding:'9px 12px',borderRadius:6,border:'1px solid '+(error?'#fecaca':'#bbf7d0'),background:error?'#fff1f2':'#f0fdf4',color:error?'#b91c1c':'#166534',fontWeight:800,fontSize:12}}>{error||message}</div>}

    <section style={{...panel,margin:10,overflow:'hidden'}}>
      <div style={{display:'flex',borderBottom:'1px solid #d6dde6',background:'#f7f9fc',overflowX:'auto'}}>
        {tabItems.map(([id,title,Icon])=><button key={id} type="button" onClick={()=>{setTab(id);if(selectedId)void loadDetails()}} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 15px',border:0,borderBottom:tab===id?'3px solid #184bb4':'3px solid transparent',background:tab===id?'#fff':'transparent',color:tab===id?'#184bb4':'#344054',fontWeight:900,fontSize:11,cursor:'pointer',whiteSpace:'nowrap'}}><Icon size={14}/>{title}</button>)}
      </div>

      {tab==='gerais'&&<form onSubmit={save} style={{padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr 2.8fr 1.4fr',gap:11}}>
          {field('Código *','codigo')} {field('Código de barras','codigo_barras')} {field('Descrição *','nome','text',2)}
          {field('Descrição resumida','descricao_resumida','text',2)}
          {select('Tipo de produto','categoria',[['Produto acabado','Produto acabado'],['Matéria-prima','Matéria-prima'],['Componente','Componente'],['Insumo','Insumo']])}
          {field('Grupo','grupo')} {field('Subgrupo','subgrupo')} {field('Marca','marca')}
          {select('Unidade estoque','unidade',[['UN','UN - Unidade'],['PC','PC - Peça'],['KG','KG - Quilograma'],['M','M - Metro'],['L','L - Litro']])}
          {select('Unidade compra','unidade_compra',[['UN','UN - Unidade'],['PC','PC - Peça'],['KG','KG - Quilograma'],['M','M - Metro'],['L','L - Litro']])}
          {select('Unidade venda','unidade_venda',[['UN','UN - Unidade'],['PC','PC - Peça'],['KG','KG - Quilograma'],['M','M - Metro'],['L','L - Litro']])}
          <label style={{...label,gridColumn:'span 2'}}>Fornecedor padrão<select value={form.fornecedor_padrao_id||''} disabled={!editing} onChange={e=>update('fornecedor_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{suppliers.map(s=><option value={s.id} key={s.id}>{s.nome_fantasia||s.razao_social}</option>)}</select></label>
          {field('Referência interna','referencia_interna')} {field('Referência cliente','referencia_cliente')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:11,marginTop:12}}>
          {select('Situação','ativo',[['true','Ativo'],['false','Inativo']])}
          {select('Origem','origem',[['0 - Nacional','0 - Nacional'],['1 - Estrangeira - Importação direta','1 - Estrangeira - Importação direta'],['2 - Estrangeira - mercado interno','2 - Estrangeira - mercado interno']])}
          {field('NCM','ncm')} {field('CEST','cest')}
          {field('Peso líquido (kg)','peso_liquido','number')} {field('Peso bruto (kg)','peso_bruto','number')} {field('Comprimento (mm)','comprimento_mm','number')} {field('Largura (mm)','largura_mm','number')}
          {field('Altura (mm)','altura_mm','number')} {field('Custo médio','custo_medio','number')} {field('Último custo','custo_ultimo','number')} {field('Custo fabricação','custo_fabricacao','number')}
          {field('Preço venda','preco_venda','number')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 310px',gap:14,marginTop:12}}>
          <label style={label}>Observações<textarea value={form.observacoes||''} disabled={!editing} onChange={e=>update('observacoes',e.target.value)} style={{...input,height:78,padding:8,resize:'vertical'}}/></label>
          <div style={{...panel,padding:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><b style={{fontSize:13}}>Situação do Produto</b><b style={{color:form.ativo?'#16a34a':'#b91c1c'}}>{form.ativo?'SIM':'NÃO'}</b></div><div style={{display:'grid',gap:8}}>{check('Fabricado','fabricado')}{check('Comprado','comprado')}{check('Revenda','revenda')}</div></div>
        </div>
        <div style={{...panel,padding:12,marginTop:12,display:'grid',gridTemplateColumns:'170px 1fr',gap:13,alignItems:'center'}}>
          <div style={{width:165,height:135,border:'1px solid #cbd5e1',borderRadius:6,background:'#f8fafc',display:'grid',placeItems:'center',overflow:'hidden'}}>{form.foto_url?<img src={form.foto_url} alt="Foto do produto" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<div style={{textAlign:'center',color:'#98a2b3'}}><ImageIcon size={34}/><div style={{fontSize:10}}>Sem foto</div></div>}</div>
          <div><b style={{fontSize:13}}>Foto do produto</b><p style={{fontSize:11,color:'#667085',margin:'5px 0 9px'}}>JPG, PNG ou WEBP até 5 MB. O arquivo é armazenado por empresa no Supabase Storage.</p><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} style={{display:'none'}}/><button type="button" onClick={()=>{if(!selectedId){setError('Salve o produto antes de selecionar uma foto.');return}fileRef.current?.click()}} style={btn('normal')}><Upload size={14}/>Selecionar Foto</button></div>
        </div>
      </form>}

      {tab==='fiscal'&&<section style={{padding:14}}>
        <h2 style={{fontSize:15,margin:'0 0 12px'}}>Dados fiscais do produto</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:11}}>
          {field('Origem fiscal','origem_fiscal')} {field('NCM','ncm')} {field('CEST','cest')} {field('CST ICMS','cst_icms')}
          {field('CSOSN','csosn')} {field('CFOP entrada','cfop_entrada')} {field('CFOP saída','cfop_saida')} {field('Tolerância (%)','tolerancia_percentual','number')}
          {field('ICMS (%)','aliquota_icms','number')} {field('IPI (%)','aliquota_ipi','number')} {field('PIS (%)','aliquota_pis','number')} {field('COFINS (%)','aliquota_cofins','number')}
        </div>
        <div style={{marginTop:14,padding:11,background:'#f8fafc',border:'1px solid #e4e7ec',borderRadius:6,fontSize:11,color:'#667085'}}>Os dados ficam persistidos no cadastro. A autorização SEFAZ depende do integrador fiscal configurado no backend.</div>
      </section>}

      {tab==='estoque'&&<section style={{padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:11}}>
          {field('Estoque atual','estoque_atual','number')} {field('Estoque mínimo','estoque_minimo','number')} {field('Estoque máximo','estoque_maximo','number')} {field('Ponto de reposição','ponto_reposicao','number')}
          <label style={{...label,gridColumn:'span 2'}}>Localização padrão<select value={form.localizacao_padrao_id||''} disabled={!editing} onChange={e=>update('localizacao_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Sem localização</option>{locations.map(l=><option value={l.id} key={l.id}>{l.codigo} • {l.nome}</option>)}</select></label>
          {field('Validade do lote (dias)','lote_validade_dias','number')}
        </div>
        <div style={{display:'flex',gap:20,flexWrap:'wrap',margin:'13px 0'}}>{check('Controla lote','controla_lote')}{check('Controla série','controla_serie')}{check('Permite estoque negativo','permite_estoque_negativo')}</div>
        <h2 style={{fontSize:14,margin:'15px 0 9px'}}>Movimentações recentes</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','Tipo','Quantidade','Origem','Documento','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{movements.map(m=><tr key={m.id}><td style={{padding:8,fontSize:11}}>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td style={{padding:8,fontSize:11}}>{m.tipo}</td><td style={{padding:8,fontSize:11,fontWeight:900}}>{fmt(m.quantidade)}</td><td style={{padding:8,fontSize:11}}>{m.origem||'—'}</td><td style={{padding:8,fontSize:11}}>{m.documento||'—'}</td><td style={{padding:8,fontSize:11}}>{m.observacao||'—'}</td></tr>)}{!movements.length&&emptyRow('Nenhuma movimentação registrada para este produto.',6)}</tbody></table></div>
      </section>}

      {tab==='producao'&&<section style={{padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:11}}>
          {field('Prazo de compra (dias)','prazo_compra_dias','number')} {field('Prazo de produção (dias)','prazo_producao_dias','number')} {field('Custo fabricação','custo_fabricacao','number')} {field('Tolerância (%)','tolerancia_percentual','number')}
        </div>
        <div style={{display:'flex',gap:20,margin:'13px 0'}}>{check('Fabricado','fabricado')}{check('Comprado','comprado')}{check('Revenda','revenda')}</div>
        <div style={{...panel,padding:13,background:'#f8fafc'}}><b style={{fontSize:13}}>Engenharia / BOM</b><p style={{fontSize:11,color:'#667085',margin:'5px 0 9px'}}>A ficha técnica, componentes e operações são mantidos no módulo de Engenharia e vinculados pelo produto.</p><button type="button" onClick={()=>{location.href='/ficha-engenharia'}} style={btn('normal')}>Abrir ficha de engenharia</button></div>
      </section>}

      {tab==='qualidade'&&<section style={{padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>{select('Inspeção obrigatória','inspecao_qualidade_obrigatoria',[['true','Sim'],['false','Não']])}{field('Nível de qualidade','nivel_qualidade')}</div>
        <h2 style={{fontSize:14,margin:'16px 0 9px'}}>Defeitos registrados</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','OP','Defeito','Quantidade','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{defects.map(d=><tr key={d.id}><td style={{padding:8,fontSize:11}}>{new Date(d.created_at).toLocaleString('pt-BR')}</td><td style={{padding:8,fontSize:11}}>{d.ordem_producao_id}</td><td style={{padding:8,fontSize:11,fontWeight:800}}>{d.defeito}</td><td style={{padding:8,fontSize:11}}>{fmt(d.quantidade)}</td><td style={{padding:8,fontSize:11}}>{d.observacao||'—'}</td></tr>)}{!defects.length&&emptyRow('Nenhum defeito registrado para este produto.',5)}</tbody></table></div>
      </section>}

      {tab==='documentos'&&<section style={{padding:14}}>
        <h2 style={{fontSize:14,margin:'0 0 10px'}}>Documentos vinculados</h2>
        <div style={{display:'grid',gap:7}}>{attachments.map(a=><div key={a.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 170px',gap:8,padding:10,border:'1px solid #e4e7ec',borderRadius:6}}><b style={{fontSize:12}}>{a.nome_arquivo}</b><span style={{fontSize:11}}>{a.mime_type||'arquivo'}</span><span style={{fontSize:11}}>{a.tamanho_bytes?Math.round(a.tamanho_bytes/1024)+' KB':'—'} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>)}{!attachments.length&&<div style={{padding:20,textAlign:'center',color:'#667085',border:'1px dashed #cbd5e1',borderRadius:6}}>Nenhum documento vinculado ainda.</div>}</div>
      </section>}

      {tab==='historico'&&<section style={{padding:14}}>
        <h2 style={{fontSize:14,margin:'0 0 10px'}}>Histórico de alterações</h2>
        <div style={{display:'grid',gap:7}}>{audits.map(a=><article key={a.id} style={{padding:10,border:'1px solid #e4e7ec',borderRadius:6,background:'#fafbfc'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><b style={{fontSize:12}}>{a.action}</b><span style={{fontSize:10,color:'#667085'}}>{new Date(a.created_at).toLocaleString('pt-BR')}</span></div><details style={{marginTop:6}}><summary style={{cursor:'pointer',fontSize:11}}>Ver dados</summary><pre style={{fontSize:9,whiteSpace:'pre-wrap',maxHeight:220,overflow:'auto'}}>{JSON.stringify({antes:a.old_data,depois:a.new_data},null,2)}</pre></details></article>)}{!audits.length&&<div style={{padding:20,textAlign:'center',color:'#667085',border:'1px dashed #cbd5e1',borderRadius:6}}>Nenhum evento de histórico encontrado.</div>}</div>
      </section>}
    </section>

    <section style={{...panel,margin:'0 10px 10px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:9,padding:9,background:'#f7f9fc',borderBottom:'1px solid #d6dde6'}}>
        <Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar..." style={{...input,maxWidth:360}}/><span style={{fontSize:11,color:'#667085'}}>{filtered.length} produto(s)</span><button type="button" onClick={()=>void load()} disabled={busy} style={{...btn('normal'),marginLeft:'auto'}}><RefreshCw size={14}/>Atualizar</button>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1050}}><thead><tr>{['Código','Descrição','Grupo','Marca','Unidade','Estoque Atual','Situação','Ações'].map(h=><th key={h} style={{textAlign:'left',padding:9,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.id} onDoubleClick={()=>selectProduct(p)} style={{background:selectedId===p.id?'#e7eefb':'#fff',cursor:'pointer'}}><td style={{padding:9,fontSize:11,fontWeight:900}}>{p.codigo}</td><td style={{padding:9,fontSize:11}}>{p.nome}</td><td style={{padding:9,fontSize:11}}>{p.grupo||'—'}</td><td style={{padding:9,fontSize:11}}>{p.marca||'—'}</td><td style={{padding:9,fontSize:11}}>{p.unidade}</td><td style={{padding:9,fontSize:11,fontWeight:900}}>{fmt(p.estoque_atual)}</td><td style={{padding:9,fontSize:11}}><span style={{display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={12} color={p.ativo?'#16a34a':'#b42318'}/>{p.ativo?'Ativo':'Inativo'}</span></td><td style={{padding:9}}><button type="button" onClick={()=>selectProduct(p)} style={{...btn('normal'),height:30,padding:'0 9px'}}><Edit3 size={13}/>Abrir</button></td></tr>)}{!filtered.length&&emptyRow('Nenhum produto encontrado.',8)}</tbody></table></div>
    </section>
    <footer style={{padding:'7px 12px 16px',fontSize:10,color:'#667085',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><span>SGQ ERP Industrial • Cadastro Mestre de Produtos</span><span>© FernandoSch_System — Todos os direitos reservados</span></footer>
  </main>
}