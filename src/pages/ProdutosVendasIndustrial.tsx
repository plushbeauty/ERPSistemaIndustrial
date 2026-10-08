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

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import type { CSSProperties, ChangeEvent } from 'react'
import {
  Boxes, Check, CheckCircle2, Edit3, Factory, FileText, Image as ImageIcon,
  Plus, Printer, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Trash2, Upload, X, FileSpreadsheet
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ERPHorizontalShell from '../components/layout/ERPHorizontalShell'
interface XlsxModule { read(buffer:ArrayBuffer,options:{type:'array'}):{SheetNames:string[];Sheets:Record<string,unknown>}; utils:{sheet_to_json<T>(sheet:unknown,options:{defval:string}):T[]} }
declare global { interface Window { XLSX?: XlsxModule } }

type Product={
  id:string;empresa_id:string|null;codigo:string;nome:string;descricao:string|null;descricao_resumida:string|null;codigo_barras:string|null
  grupo:string|null;subgrupo:string|null;marca:string|null;categoria:string|null;unidade:string;unidade_compra:string;unidade_venda:string;fornecedor_padrao_id:string|null
  referencia_interna:string|null;referencia_cliente:string|null;origem:string|null;ncm:string|null;cest:string|null;peso_liquido:number;peso_bruto:number
  comprimento_mm:number;largura_mm:number;altura_mm:number;observacoes:string|null;foto_url:string|null;fabricado:boolean;comprado:boolean;revenda:boolean
  estoque_atual:number;ponto_reposicao:number;estoque_maximo:number;localizacao_padrao_id:string|null;controla_lote:boolean
  controla_serie:boolean;permite_estoque_negativo:boolean;lote_validade_dias:number;inspecao_qualidade_obrigatoria:boolean;nivel_qualidade:string|null
  origem_fiscal:string|null;cst_icms:string|null;csosn:string|null;cfop_entrada:string|null;cfop_saida:string|null;aliquota_icms:number;aliquota_ipi:number
  aliquota_pis:number;aliquota_cofins:number;prazo_compra_dias:number;prazo_producao_dias:number;tolerancia_percentual:number
  custo_medio:number;custo_ultimo:number;custo_fabricacao:number;preco_venda:number;ativo:boolean
}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type Group={id:string;codigo:string;nome:string}
type Location={id:string;codigo:string;nome:string;tipo:string}
type Movement={id:string;tipo:string;quantidade:number;origem:string|null;documento:string|null;observacao:string|null;created_at:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number;observacao:string|null;created_at:string}
type Audit={id:string;action:string;module:string;old_data:Record<string,unknown>|null;new_data:Record<string,unknown>|null;created_at:string}
type Attachment={id:string;nome_arquivo:string;storage_path:string;mime_type:string|null;tamanho_bytes:number|null;created_at:string}
type Tab='gerais'|'fiscal'|'estoque'|'producao'|'qualidade'
type FormData=Omit<Product,'id'|'empresa_id'>

const tabItems:Array<[Tab,string,typeof Boxes]>=[
  ['gerais','DADOS GERAIS',Boxes],['fiscal','FISCAL',FileText],['estoque','ESTOQUE',Boxes],
  ['producao','PRODUÇÃO',Factory],['qualidade','QUALIDADE + DOCUMENTOS',ShieldCheck]
]
const empty=():FormData=>({
  codigo:'',nome:'',descricao:null,descricao_resumida:null,codigo_barras:null,grupo:null,subgrupo:null,marca:null,categoria:'Produto acabado',unidade:'UN',unidade_compra:'UN',unidade_venda:'UN',
  fornecedor_padrao_id:null,referencia_interna:null,referencia_cliente:null,origem:'0 - Nacional',ncm:null,cest:null,peso_liquido:0,peso_bruto:0,comprimento_mm:0,largura_mm:0,altura_mm:0,
  observacoes:null,foto_url:null,fabricado:false,comprado:false,revenda:false,estoque_atual:0,ponto_reposicao:0,estoque_maximo:0,localizacao_padrao_id:null,
  controla_lote:false,controla_serie:false,permite_estoque_negativo:false,lote_validade_dias:0,inspecao_qualidade_obrigatoria:false,nivel_qualidade:null,origem_fiscal:null,
  cst_icms:null,csosn:null,cfop_entrada:null,cfop_saida:null,aliquota_icms:0,aliquota_ipi:0,aliquota_pis:0,aliquota_cofins:0,prazo_compra_dias:0,prazo_producao_dias:0,
  tolerancia_percentual:0,custo_medio:0,custo_ultimo:0,custo_fabricacao:0,preco_venda:0,ativo:true
})
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const n=(v:unknown)=>Number(v??0)||0
const fmt=(v:unknown)=>n(v).toLocaleString('pt-BR',{maximumFractionDigits:3})
const panel:CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:2}
const input:CSSProperties={width:'100%',height:30,border:'1px solid #c4ced9',borderRadius:2,padding:'0 8px',fontSize:11,background:'#fff',boxSizing:'border-box'}
const label:CSSProperties={display:'grid',gap:2,fontSize:9,fontWeight:500,color:'#344054',textTransform:'uppercase'}
const btn=(_kind:'primary'|'normal'|'danger'):CSSProperties=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,height:30,padding:'0 10px',borderRadius:2,border:'1px solid #2D8DB8',background:'#2D8DB8',color:'#fff',fontSize:11,fontWeight:500,textTransform:'uppercase',cursor:'pointer'})
const emptyRow=(text:string,col=7)=><tr><td colSpan={col} style={{padding:22,textAlign:'center',color:'#667085'}}>{text}</td></tr>

export default function ProdutosVendasIndustrial(){
  const routerLocation=useRouterLocation()
  const printMode=routerLocation.pathname==='/produtos-vendas/imprimir'
  const printId=new URLSearchParams(routerLocation.search).get('id')
  const [companyId,setCompanyId]=useState('')
  const [operatorName,setOperatorName]=useState('Usuário ERP')
  const [products,setProducts]=useState<Product[]>([])
  const [suppliers,setSuppliers]=useState<Supplier[]>([])
  const [groups,setGroups]=useState<Group[]>([])
  const [locations,setLocations]=useState<Location[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [form,setForm]=useState<FormData>(empty())
  const [editing,setEditing]=useState(false)
  const [tab,setTab]=useState<Tab>('gerais')
  const [query,setQuery]=useState(''),[categoryFilter,setCategoryFilter]=useState('TODAS'),[groupFilter,setGroupFilter]=useState('TODAS'),[subgroupFilter,setSubgroupFilter]=useState('TODOS'),[brandFilter,setBrandFilter]=useState('TODAS')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [movements,setMovements]=useState<Movement[]>([])
  const [defects,setDefects]=useState<Defect[]>([])
  const [audits,setAudits]=useState<Audit[]>([])
  const [attachments,setAttachments]=useState<Attachment[]>([])
  const [detailsLoaded,setDetailsLoaded]=useState(false)
  const [productionFicha,setProductionFicha]=useState<{id:string;versao:number;rendimento:number;unidade_rendimento:string;status:string|null;revisao:string|null} | null>(null)
  const [productionOps,setProductionOps]=useState<Array<{id:string;sequencia:number;operacao:string;maquina_id:string|null;maquina_codigo:string|null;maquina_nome:string|null;setup_min:number;ciclo_seg:number;capacidade_hora:number|null;capacidade_dia:number|null}>>([])
  const fileRef=useRef<HTMLInputElement>(null)
  const importRef=useRef<HTMLInputElement>(null)

  const load=async()=>{
    setBusy(true);setError('')
    try{
      const {data:cid,error:ce}=await supabase.rpc('erp_current_empresa_id')
      if(ce||!cid)throw ce??new Error('Empresa da sessão não identificada.')
      const id=String(cid);setCompanyId(id)
      const [p,s,g,l]=await Promise.all([
        supabase.from('erp_produtos').select('*').eq('empresa_id',id).order('codigo').limit(2000),
        supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia').eq('empresa_id',id).eq('ativo',true).order('razao_social').limit(1000),
        supabase.from('erp_grupos').select('id,codigo,nome').eq('empresa_id',id).eq('ativo',true).order('nome').limit(1000),
        supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,tipo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(1000)
      ])
      for(const r of [p,s,g,l])if(r.error)throw r.error
      setProducts((p.data??[]) as Product[]);setSuppliers((s.data??[]) as Supplier[]);setGroups((g.data??[]) as Group[]);setLocations((l.data??[]) as Location[])
      if(printMode&&printId){const printProduct=(p.data??[]).find((x:Product)=>x.id===printId);if(printProduct){setSelectedId(printProduct.id);setForm({...empty(),...printProduct})}}
      if(selectedId){const fresh=(p.data??[]).find((x:Product)=>x.id===selectedId);if(fresh)setForm({...empty(),...fresh})}
    }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar cadastro de produtos.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[])
  useEffect(()=>{void supabase.auth.getUser().then(async ({data})=>{if(!data.user)return;const {data:profile}=await supabase.from('erp_usuarios').select('nome').eq('auth_user_id',data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();setOperatorName(String(profile?.nome||data.user.email||'Usuário ERP'))})},[])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return products.filter(p=>(!q||(p.codigo+' '+p.nome+' '+(p.codigo_barras||'')+' '+(p.grupo||'')+' '+(p.subgrupo||'')+' '+(p.marca||'')+' '+(p.categoria||'')).toLowerCase().includes(q))&&(categoryFilter==='TODAS'||String(p.categoria||'').toUpperCase()===categoryFilter)&&(groupFilter==='TODAS'||String(p.grupo||'')===groupFilter)&&(subgroupFilter==='TODOS'||String(p.subgrupo||'')===subgroupFilter)&&(brandFilter==='TODAS'||String(p.marca||'')===brandFilter))
  },[products,query,categoryFilter,groupFilter,subgroupFilter,brandFilter])

  const selectProduct=(p:Product)=>{setSelectedId(p.id);setForm({...empty(),...p});setEditing(false);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const newProduct=()=>{setSelectedId(null);setForm(empty());setEditing(true);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const update=(key:keyof FormData,value:unknown)=>setForm(prev=>({...prev,[key]:value}))
  const openTechnicalPrint=()=>{if(!selectedId){setError('Selecione um produto antes de imprimir a ficha técnica.');return}window.open('/produtos-vendas/imprimir?id='+encodeURIComponent(selectedId),'_blank','noopener,noreferrer')}
  const save=async()=>{
    setBusy(true);setError('');setMessage('')
    try{
      if(!companyId)throw new Error('Empresa da sessão não identificada.')
      if(!String(form.nome||'').trim())throw new Error('Descrição é obrigatória.')
      let codigo=String(form.codigo||'').trim()
      if(!selectedId){
        const config=await supabase.from('erp_codigos').select('id,modo_numeracao').eq('empresa_id',companyId).order('prefixo').limit(1).maybeSingle()
        if(config.error)throw config.error
        if(!config.data)throw new Error('Nenhuma regra de código de produto está configurada para esta empresa.')
        const grupoCodigo=groups.find(x=>x.nome===form.grupo)?.codigo??null
        const generated=await supabase.rpc('erp_gerar_codigo',{p_config_id:config.data.id,p_grupo_codigo:grupoCodigo})
        if(generated.error)throw generated.error
        codigo=String(generated.data||'').trim()
        if(!codigo)throw new Error('O gerador de código não retornou um código válido.')
      }
      const editableForm={...form}
      const {estoque_atual: _estoqueAtual, ...payloadForm}=editableForm
      const payload={...payloadForm,empresa_id:companyId,codigo,nome:String(form.nome).trim(),unidade:String(form.unidade||'UN').toUpperCase(),unidade_compra:String(form.unidade_compra||'UN').toUpperCase(),unidade_venda:String(form.unidade_venda||'UN').toUpperCase()}
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
      const [m,d,a,an,ft]=await Promise.all([
        supabase.from('erp_estoque_movimentos').select('id,tipo,quantidade,origem,documento,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_audit_logs').select('id,action,module,old_data,new_data,created_at').eq('company_id',companyId).eq('entity','erp_produtos').eq('entity_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_fichas_tecnicas').select('id,versao,rendimento,unidade_rendimento,status,revisao').eq('empresa_id',companyId).eq('produto_id',selectedId).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
      ])
      setMovements((m.data??[]) as Movement[]);setDefects((d.data??[]) as Defect[]);setAudits((a.data??[]) as Audit[]);setAttachments((an.data??[]) as Attachment[])
      setProductionFicha((ft.data??null) as {id:string;versao:number;rendimento:number;unidade_rendimento:string;status:string|null;revisao:string|null} | null)
      if(ft.data?.id){
        const fo=await supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,setup_min,ciclo_seg,capacidade_hora,capacidade_dia').eq('empresa_id',companyId).eq('ficha_id',ft.data.id).order('sequencia')
        if(fo.error)throw fo.error
        const machineIds=(fo.data??[]).map((x:{maquina_id:string|null})=>x.maquina_id).filter((x):x is string=>Boolean(x))
        const machines=machineIds.length?(await supabase.from('erp_maquinas').select('id,codigo,nome').in('id',machineIds).eq('empresa_id',companyId)).data??[]:[]
        const machineMap=new Map((machines as Array<{id:string;codigo:string;nome:string}>).map(x=>[x.id,x]))
        setProductionOps((fo.data??[]).map((x:{id:string;sequencia:number;operacao:string;maquina_id:string|null;setup_min:number;ciclo_seg:number;capacidade_hora:number|null;capacidade_dia:number|null})=>({...x,maquina_codigo:x.maquina_id?machineMap.get(x.maquina_id)?.codigo??null:null,maquina_nome:x.maquina_id?machineMap.get(x.maquina_id)?.nome??null:null})))
      }else setProductionOps([])
      setDetailsLoaded(true)
      const firstError=[m,d,a,an,ft].find(x=>x.error);if(firstError?.error)setError(firstError.error.message)
    }finally{setBusy(false)}
  }
  useEffect(()=>{if(selectedId)void loadDetails()},[selectedId])

  const loadXlsx=async():Promise<XlsxModule>=>{
    if(window.XLSX)return window.XLSX
    const existing=document.querySelector('script[data-erp-xlsx]') as HTMLScriptElement|null
    if(existing){await new Promise<void>((resolve,reject)=>{existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Não foi possível carregar o leitor Excel.')),{once:true})})
    }else{
      await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';script.async=true;script.dataset.erpXlsx='true';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Não foi possível carregar o leitor Excel.'));document.head.appendChild(script)})
    }
    if(!window.XLSX)throw new Error('Leitor Excel não disponível.')
    return window.XLSX
  }

  const importExcel=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]
    if(!file)return
    setBusy(true);setError('');setMessage('')
    try{
      const XLSX=await loadXlsx()
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

  const helpFor=(title:string)=>({
    'Descrição resumida':'Texto curto para identificação rápida do produto.',
    'Grupo':'Grupo mestre existente; determina a classificação principal do produto.',
    'Subgrupo':'Subdivisão do grupo usada para pesquisa e organização.',
    'Marca':'Marca comercial do produto, quando aplicável.',
    'Origem':'Código de origem da mercadoria conforme regra fiscal.',
    'NCM':'Código NCM utilizado na classificação fiscal do item.',
    'CEST':'Código CEST quando o produto estiver sujeito à substituição tributária.',
    'CST ICMS':'Código da situação tributária do ICMS.',
    'CSOSN':'Código de situação da operação no Simples Nacional, quando aplicável.',
    'CFOP entrada':'CFOP padrão das entradas deste produto.',
    'CFOP saída':'CFOP padrão das saídas deste produto.',
    'Origem fiscal':'Informação fiscal complementar usada pela regra tributária.',
    'Ponto de reposição':'Quantidade de referência que dispara a necessidade de reposição.',
    'Validade lote [dias]':'Quantidade de dias de validade atribuída ao lote, quando o produto controla lote.',
    'Localização padrão':'Localização existente no Estoque onde o item é armazenado normalmente.',
    'Observações':'Informações complementares do cadastro; não substituem a ficha de processo.'
  } as Record<string,string>)[title.replace(' [?]','')]||('Ajuda do campo '+title.replace(' [?]','')+'.');
  const HelpTip=({text}:{text:string})=>{const [open,setOpen]=useState(false);return <span style={{position:'relative',display:'inline-flex',verticalAlign:'middle'}}><button type="button" aria-label="Ajuda" onClick={e=>{e.preventDefault();e.stopPropagation();setOpen(v=>!v)}} style={{width:15,height:15,padding:0,marginLeft:3,border:'1px solid #2D8DB8',borderRadius:'50%',background:'#fff',color:'#2D8DB8',fontSize:9,fontWeight:800,lineHeight:'13px',cursor:'pointer'}}>?</button>{open&&<span role="tooltip" style={{position:'absolute',zIndex:1200,left:18,top:17,width:250,padding:'7px 8px',border:'1px solid #b9cbd3',borderRadius:2,background:'#fff',boxShadow:'0 4px 12px rgba(18,59,80,.16)',fontSize:9,fontWeight:400,lineHeight:1.35,color:'#173b4a',textTransform:'none'}}>{text}</span>}</span>}
  const fieldTitle=(title:string)=><>{title.replace(' [?]','')}{title.includes('[?]')&&<HelpTip text={helpFor(title)}/>}</>;
  const field=(title:string,key:keyof FormData,type='text',span=1,locked=false)=><label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<input type={type} value={String(form[key]??'')} readOnly={locked} disabled={!editing} onChange={e=>update(key,type==='number'?n(e.target.value):e.target.value)} style={{...input,background:locked?'#eaf3f8':editing?'#fff':'#f5f7fa',color:locked?'#17445A':'#172033',fontWeight:locked?700:400,cursor:locked?'not-allowed':'text'}}/></label>
  const select=(title:string,key:keyof FormData,options:Array<[string,string]>,span=1)=><label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<select value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,e.target.value)} style={{...input,background:editing?'#fff':'#f5f7fa'}}>{options.map(o=><option value={o[0]} key={o[0]}>{o[1]}</option>)}</select></label>
  const check=(title:string,key:keyof FormData)=><label style={{display:'flex',alignItems:'center',gap:7,fontSize:10,fontWeight:700,color:'#344054'}}><input type="checkbox" checked={Boolean(form[key])} disabled={!editing} onChange={e=>update(key,e.target.checked)}/>{title}</label>

  if(printMode&&selectedId){
    return (
      <main className="product-print-sheet" style={{maxWidth:1120,margin:'0 auto',padding:32,color:'#111827',fontFamily:'Arial,sans-serif',background:'#fff'}}>
        <style>{'@page{size:A4;margin:12mm}.product-print-sheet{min-height:260mm}.product-print-sheet table{width:100%;border-collapse:collapse;margin:12px 0 18px}.product-print-sheet th,.product-print-sheet td{border:1px solid #9ca3af;padding:6px 8px;text-align:left;font-size:10px}.product-print-sheet th{font-size:9px;text-transform:uppercase;background:#f3f4f6}.print-hide{display:flex;gap:8px;margin-bottom:18px}@media print{.print-hide{display:none!important}.product-print-sheet{padding:0;max-width:none}}'}</style>
        <div className="print-hide">
          <button type="button" onClick={()=>window.print()} style={btn('primary')}><Printer size={15}/>IMPRIMIR FICHA TÉCNICA</button>
          <button type="button" onClick={()=>window.close()} style={btn('normal')}>FECHAR</button>
        </div>
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'2px solid #2D8DB8',paddingBottom:10}}>
          <div><strong style={{fontSize:14}}>SYNQRA INDUSTRIAL</strong><h1 style={{margin:'8px 0 0',fontSize:20}}>FICHA TÉCNICA DO PRODUTO RESTRITA</h1></div>
          <span style={{fontSize:10}}>CÓDIGO: {form.codigo}</span>
        </header>
        <table><tbody>
          <tr><th>Produto</th><td>{form.nome}</td><th>Grupo</th><td>{form.grupo||'—'}</td></tr>
          <tr><th>Categoria</th><td>{form.categoria||'—'}</td><th>Unidade</th><td>{form.unidade}</td></tr>
          <tr><th>NCM</th><td>{form.ncm||'—'}</td><th>CEST</th><td>{form.cest||'—'}</td></tr>
          <tr><th>Origem</th><td>{form.origem||'—'}</td><th>CFOP Saída</th><td>{form.cfop_saida||'—'}</td></tr>
        </tbody></table>
        <table><thead><tr><th>Saldo ERP</th><th>Ponto de Reposição</th><th>Estoque Máximo</th><th>Localização</th><th>Lote</th><th>Série</th></tr></thead>
          <tbody><tr><td>{fmt(form.estoque_atual)}</td><td>{fmt(form.ponto_reposicao)}</td><td>{fmt(form.estoque_maximo)}</td><td>{form.localizacao_padrao_id||'—'}</td><td>{form.controla_lote?'SIM':'NÃO'}</td><td>{form.controla_serie?'SIM':'NÃO'}</td></tr></tbody>
        </table>
        <table><thead><tr><th>Custo Médio</th><th>Custo Último</th><th>Custo Fabricação</th><th>Preço Venda</th><th>Prazo Compra</th><th>Prazo Produção</th></tr></thead>
          <tbody><tr><td>{money(form.custo_medio)}</td><td>{money(form.custo_ultimo)}</td><td>{money(form.custo_fabricacao)}</td><td>{money(form.preco_venda)}</td><td>{form.prazo_compra_dias} dias</td><td>{form.prazo_producao_dias} dias</td></tr></tbody>
        </table>
        <table><thead><tr><th>Parâmetro</th><th>Valor</th><th>Parâmetro</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>ICMS</td><td>{fmt(form.aliquota_icms)}%</td><td>IPI</td><td>{fmt(form.aliquota_ipi)}%</td></tr>
            <tr><td>PIS</td><td>{fmt(form.aliquota_pis)}%</td><td>COFINS</td><td>{fmt(form.aliquota_cofins)}%</td></tr>
            <tr><td>Tolerância</td><td>{fmt(form.tolerancia_percentual)}%</td><td>Qualidade obrigatória</td><td>{form.inspecao_qualidade_obrigatoria?'SIM':'NÃO'}</td></tr>
          </tbody>
        </table>
        <p style={{fontSize:10,marginTop:18}}>Documento técnico gerado a partir do cadastro mestre do produto e dos dados persistidos na empresa autenticada.</p>
      </main>
    )
  }
  return <ERPHorizontalShell operatorName={operatorName}><main style={{maxWidth:1600,margin:'0 auto',color:'#172033',fontFamily:'Arial,sans-serif'}}>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'6px 8px',borderBottom:'1px solid #d6dde6',background:'#fff',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:900,color:'#1c4bb5'}}>CADASTROS • PRODUTOS</div><h1 style={{margin:'2px 0 0',fontSize:15,color:'#123B50'}}>Cadastro de Produtos</h1></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <button type="button" onClick={newProduct} style={btn('primary')}><Plus size={16}/>Novo</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} style={{display:'none'}} />
        <button type="button" onClick={()=>importRef.current?.click()} disabled={busy} style={btn('normal')}><FileSpreadsheet size={16}/>Importar Excel (temporário)</button>

        <button type="button" onClick={()=>setEditing(true)} disabled={!selectedId} style={btn('normal')}><Edit3 size={16}/>Editar</button>
        <button type="button" onClick={()=>void save()} disabled={!editing||busy} style={btn('normal')}><Save size={16}/>Salvar</button>
        <button type="button" onClick={cancelEdit} style={btn('normal')}><RotateCcw size={16}/>Cancelar</button>
        {!editing&&selectedId&&<button type="button" onClick={openTechnicalPrint} disabled={busy} style={btn('normal')}><Printer size={16}/>Imprimir</button>}
        <button type="button" onClick={()=>void deactivate()} disabled={!selectedId||busy} style={btn('danger')}><Trash2 size={16}/>Inativar</button>
        <button type="button" onClick={()=>{setSelectedId(null);setEditing(false);setForm(empty())}} style={btn('normal')}><X size={16}/>Fechar</button>
      </div>
    </header>

    {(message||error)&&<div role="alert" style={{margin:10,padding:'9px 12px',borderRadius:6,border:'1px solid '+(error?'#fecaca':'#bbf7d0'),background:error?'#fff1f2':'#f0fdf4',color:error?'#b91c1c':'#166534',fontWeight:800,fontSize:12}}>{error||message}</div>}

    {selectedId&&<><section style={{...panel,margin:'10px 10px 0',padding:7,display:'grid',gridTemplateColumns:'72px minmax(0,1fr) auto',gap:9,alignItems:'center',background:'#fff'}}>
      <div style={{width:72,height:60,border:'1px solid #cbd5e1',background:'#f8fafc',display:'grid',placeItems:'center',overflow:'hidden'}}>{form.foto_url?<img src={form.foto_url} alt="Foto do produto" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<ImageIcon size={22} color="#98a2b3"/>}</div>
      <div style={{minWidth:0}}><div style={{fontSize:9,fontWeight:700,color:'#667085',textTransform:'uppercase'}}>Produto selecionado</div><div style={{fontSize:13,fontWeight:700,color:'#123B50',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.codigo||'AUTOMÁTICO'} • {form.nome||'Sem descrição'}</div><div style={{fontSize:9,color:'#667085',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.descricao_resumida||'Sem descrição resumida'} · {form.grupo||'Sem grupo'} · {form.marca||'Sem marca'}</div></div>
      <div style={{display:'flex',gap:12,alignItems:'center',fontSize:9}}><span><b>ESTOQUE</b> {fmt(form.estoque_atual)} {form.unidade}</span><span><b>STATUS</b> {form.ativo?'ATIVO':'INATIVO'}</span></div>
    </section></>}

    <section style={{...panel,margin:10,overflow:'hidden'}}>
      <div style={{display:'flex',borderBottom:'1px solid #d6dde6',background:'#f7f9fc',overflowX:'auto'}}>
        {tabItems.map(([id,title,Icon])=><button key={id} type="button" onClick={()=>{setTab(id);if(selectedId)void loadDetails()}} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 10px',border:0,borderBottom:tab===id?'3px solid #184bb4':'3px solid transparent',background:tab===id?'#fff':'transparent',color:tab===id?'#184bb4':'#344054',fontWeight:900,fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}><Icon size={14}/>{title}</button>)}
      </div>

      {tab==='gerais'&&<form onSubmit={save} style={{padding:8}}>
        <div style={{display:'grid',gridTemplateColumns:'90px 128px minmax(250px,1fr) 180px',gap:7,alignItems:'end'}}>
          {field('Código *','codigo','text',1,true)}
          {field('Código de barras','codigo_barras','text',1,true)}
          {field('Descrição *','nome')}
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>Descrição resumida <HelpTip text={helpFor('Descrição resumida')}/></span><input type="text" value={String(form.descricao_resumida??'')} disabled={!editing} onChange={e=>update('descricao_resumida',e.target.value)} title="Descrição curta/dimensional usado para identificar rapidamente a peça." style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'150px 120px 120px 64px 64px 64px',gap:7,marginTop:7,alignItems:'end'}}>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>Grupo <HelpTip text={helpFor('Grupo')}/></span><select value={form.grupo||''} disabled={!editing} onChange={e=>update('grupo',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{groups.map(g=><option key={g.id} value={g.nome}>{g.nome}</option>)}</select></label>
          {field('Subgrupo [?]','subgrupo')}
          {field('Marca [?]','marca')}
          {select('Un. estoque','unidade',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
          {select('Un. compra','unidade_compra',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
          {select('Un. venda','unidade_venda',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'180px 1fr 150px 150px',gap:7,marginTop:7,alignItems:'end'}}>
          {select('Tipo de produto','categoria',[['Produto acabado','Produto acabado'],['MATÉRIA-PRIMA','MATÉRIA-PRIMA'],['PRENSADOS','PRENSADOS'],['INJETADOS','INJETADOS'],['ALMOXARIFADO','ALMOXARIFADO'],['MATERIAL DE ESCRITÓRIO','MATERIAL DE ESCRITÓRIO'],['PRODUTOS DE LIMPEZA','PRODUTOS DE LIMPEZA'],['Componente','Componente'],['Insumo','Insumo']])}
          <label style={label}>Fornecedor padrão<select value={form.fornecedor_padrao_id||''} disabled={!editing} onChange={e=>update('fornecedor_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{suppliers.map(s=><option value={s.id} key={s.id}>{s.nome_fantasia||s.razao_social}</option>)}</select></label>
          {field('Ref. interna','referencia_interna')}
          {field('Ref. cliente','referencia_cliente')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'82px 82px 82px 82px 82px',gap:7,marginTop:7,alignItems:'end'}}>
          {field('Peso líquido (kg)','peso_liquido','number')}{field('Peso bruto (kg)','peso_bruto','number')}{field('Comprimento (mm)','comprimento_mm','number')}{field('Largura (mm)','largura_mm','number')}{field('Altura (mm)','altura_mm','number')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginTop:7,alignItems:'end'}}>
          {field('Custo médio','custo_medio','number')}{field('Último custo','custo_ultimo','number')}{field('Custo fabricação','custo_fabricacao','number')}{field('Preço venda','preco_venda','number')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'minmax(280px,1fr) 245px 175px',gap:7,marginTop:7,alignItems:'end'}}>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>OBSERVAÇÕES <HelpTip text={helpFor('Observações')}/></span><textarea value={form.observacoes||''} disabled={!editing} onChange={e=>update('observacoes',e.target.value)} title="Informações complementares do produto; não substitui a ficha de processo." style={{...input,height:30,padding:'5px 7px',resize:'none',fontSize:11}}/></label>
          <div style={{display:'flex',alignItems:'center',gap:8,height:30,border:'1px solid #d5dde7',padding:'0 8px',background:'#fff'}}><span style={{fontSize:9,fontWeight:500,color:'#344054',textTransform:'uppercase'}}>Situação</span>{check('Fabricado','fabricado')}{check('Comprado','comprado')}{check('Revenda','revenda')}</div>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>LOCALIZAÇÃO PADRÃO <HelpTip text={helpFor('Localização padrão')}/></span><select value={form.localizacao_padrao_id||''} disabled={!editing} onChange={e=>update('localizacao_padrao_id',e.target.value||null)} title="Selecione uma localização existente do Estoque. A hierarquia depósito/rua/prateleira/caixa é mantida no cadastro de localizações." style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{locations.map(l=><option value={l.id} key={l.id}>{l.codigo} • {l.nome}{l.tipo?' • '+l.tipo:''}</option>)}</select></label>
        </div>
      </form>}

            {tab==='fiscal'&&<section style={{padding:8}}>
        <div style={{display:'grid',gridTemplateColumns:'80px 220px 180px 95px 95px',gap:7,alignItems:'end'}}>
          {select('Situação','ativo',[['true','Ativo'],['false','Inativo']])}
          {select('Origem [?]','origem',[['0 - Nacional','0 - Nacional'],['1 - Estrangeira - Importação direta','1 - Estrangeira - Importação direta'],['2 - Estrangeira - mercado interno','2 - Estrangeira - mercado interno'],['3 - Nacional, conteúdo importação >40% e <70%','3 - Nacional, conteúdo importação >40% e <70%'],['4 - Nacional, processo produtivo básico','4 - Nacional, processo produtivo básico'],['5 - Nacional, conteúdo importação <40%','5 - Nacional, conteúdo importação <40%'],['6 - Estrangeira - importação direta, sem similar nacional','6 - Estrangeira - importação direta, sem similar nacional'],['7 - Estrangeira - mercado interno, sem similar nacional','7 - Estrangeira - mercado interno, sem similar nacional'],['8 - Nacional, conteúdo importação >70%','8 - Nacional, conteúdo importação >70%']])}
          {field('NCM [?]','ncm')}{field('CEST [?]','cest')}{field('CST ICMS [?]','cst_icms')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'95px 95px 95px 95px 65px 65px 65px 65px',gap:7,marginTop:7,alignItems:'end'}}>
          {field('CSOSN [?]','csosn')}{field('CFOP entrada [?]','cfop_entrada')}{field('CFOP saída [?]','cfop_saida')}{field('Origem fiscal [?]','origem_fiscal')}{field('ICMS %','aliquota_icms','number')}{field('IPI %','aliquota_ipi','number')}{field('PIS %','aliquota_pis','number')}{field('COFINS %','aliquota_cofins','number')}
        </div>
        <div style={{marginTop:7,fontSize:9,color:'#667085'}}>Use o ? para consultar o significado da sigla/código antes de preencher. NCM e CEST permanecem exclusivamente nesta aba Fiscal.</div>
      </section>}

            {tab==='estoque'&&<section style={{padding:10}}>
        <div style={{display:'grid',gridTemplateColumns:'82px 82px 120px 1fr',gap:7,alignItems:'end'}}>
          <label style={label}>ESTOQUE ATUAL <span style={{fontSize:8,color:'#667085'}}>calculado</span><input value={fmt(form.estoque_atual)+' '+form.unidade} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>PONTO DE REPOSIÇÃO <HelpTip text={helpFor('Ponto de reposição')}/></span><input type="number" value={String(form.ponto_reposicao??0)} disabled={!editing} onChange={e=>update('ponto_reposicao',n(e.target.value))} title="Quantidade que dispara a necessidade de reposição; não é estoque atual." style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}>ESTOQUE MÁXIMO<input type="number" value={String(form.estoque_maximo??0)} disabled={!editing} onChange={e=>update('estoque_maximo',n(e.target.value))} style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}>LOCALIZAÇÃO PADRÃO [?]<select value={form.localizacao_padrao_id||''} disabled={!editing} onChange={e=>update('localizacao_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{locations.map(l=><option value={l.id} key={l.id}>{l.codigo} • {l.nome}{l.tipo?' • '+l.tipo:''}</option>)}</select></label>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'82px 105px 105px 170px',gap:7,marginTop:7,alignItems:'end'}}>
          {field('VALIDADE LOTE [dias] [?]','lote_validade_dias','number')}{check('Controla lote','controla_lote')}{check('Controla série','controla_serie')}{check('Permite estoque negativo','permite_estoque_negativo')}
        </div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>MOVIMENTAÇÕES RECENTES</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','Tipo','Quantidade','Origem','Documento','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{movements.map(m=><tr key={m.id}><td style={{padding:8,fontSize:11}}>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td style={{padding:8,fontSize:11}}>{m.tipo}</td><td style={{padding:8,fontSize:11,fontWeight:900}}>{fmt(m.quantidade)}</td><td style={{padding:8,fontSize:11}}>{m.origem||'—'}</td><td style={{padding:8,fontSize:11}}>{m.documento||'—'}</td><td style={{padding:8,fontSize:11}}>{m.observacao||'—'}</td></tr>)}{!movements.length&&emptyRow('Nenhuma movimentação registrada para este produto.',6)}</tbody></table></div>
      </section>}

      {tab==='producao'&&<section style={{padding:10}}>
        <div style={{display:'grid',gridTemplateColumns:'82px 82px 82px 82px 120px 120px auto',gap:7,alignItems:'end'}}>
          {field('PRAZO COMPRA (dias)','prazo_compra_dias','number')}{field('PRAZO PRODUÇÃO (dias)','prazo_producao_dias','number')}{field('CUSTO FABRICAÇÃO','custo_fabricacao','number')}{field('TOLERÂNCIA (%)','tolerancia_percentual','number')}
          <label style={label}>FICHA ATIVA<input value={productionFicha?('REV. '+(productionFicha.revisao||productionFicha.versao)):'Não cadastrada'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}>RENDIMENTO<input value={productionFicha?fmt(productionFicha.rendimento)+' '+productionFicha.unidade_rendimento:'—'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A'}}/></label>
          <button type="button" onClick={()=>{window.location.href='/ficha-engenharia?produto='+encodeURIComponent(selectedId||'')}} style={btn('normal')}>ABRIR FICHA DE PROCESSO</button>
        </div>
        <div style={{marginTop:8,border:'1px solid #d5dde7',overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Seq.','Operação','Máquina','Setup min','Ciclo s','Qtde/h','Qtde/dia'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{productionOps.map(o=><tr key={o.id} style={{borderBottom:'1px solid #e5e7eb'}}><td style={{padding:'5px 6px'}}>{o.sequencia}</td><td style={{padding:'5px 6px'}}>{o.operacao}</td><td style={{padding:'5px 6px'}}>{o.maquina_codigo?o.maquina_codigo+' • '+(o.maquina_nome||''):'Não definida'}</td><td style={{padding:'5px 6px'}}>{fmt(o.setup_min)}</td><td style={{padding:'5px 6px'}}>{fmt(o.ciclo_seg)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_hora==null?'—':fmt(o.capacidade_hora)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_dia==null?'—':fmt(o.capacidade_dia)}</td></tr>)}{!productionOps.length&&<tr><td colSpan={7} style={{padding:12,textAlign:'center',color:'#667085'}}>Nenhuma operação cadastrada. Abra a ficha de processo para cadastrar máquina/posto, setup, ciclo e instruções.</td></tr>}</tbody></table></div>
        <div style={{marginTop:7,fontSize:9,color:'#667085'}}>Máquina, setup, ciclo e capacidade vêm da ficha técnica/roteiro real; a ficha completa alimenta o PCP e a Ordem de Produção.</div>
      </section>}

      {tab==='qualidade'&&<section style={{padding:10}}>
        <div style={{display:'grid',gridTemplateColumns:'120px 120px 1fr',gap:7,alignItems:'end'}}>{select('INSPEÇÃO OBRIGATÓRIA','inspecao_qualidade_obrigatoria',[['true','Sim'],['false','Não']])}{field('NÍVEL DE QUALIDADE','nivel_qualidade')}<div style={{fontSize:9,color:'#667085',paddingBottom:6}}>Desenhos aprovados, critérios de inspeção e documentos controlados ficam vinculados ao produto.</div></div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DEFEITOS REGISTRADOS</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr>{['Data','OP','Defeito','Quantidade','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:5,borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{defects.map(d=><tr key={d.id}><td style={{padding:5}}>{new Date(d.created_at).toLocaleString('pt-BR')}</td><td style={{padding:5}}>{d.ordem_producao_id}</td><td style={{padding:5}}>{d.defeito}</td><td style={{padding:5}}>{fmt(d.quantidade)}</td><td style={{padding:5}}>{d.observacao||'—'}</td></tr>)}{!defects.length&&emptyRow('Nenhum defeito registrado para este produto.',5)}</tbody></table></div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DOCUMENTOS / DESENHOS VINCULADOS</h2>
        <div style={{display:'grid',gap:4}}>{attachments.map(a=><div key={a.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 120px 150px',gap:7,padding:'5px 6px',border:'1px solid #e4e7ec',fontSize:9}}><b>{a.nome_arquivo}</b><span>{a.mime_type||'arquivo'}</span><span>{a.tamanho_bytes?Math.round(a.tamanho_bytes/1024)+' KB':'—'} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>)}{!attachments.length&&<div style={{padding:10,textAlign:'center',color:'#667085',border:'1px dashed #cbd5e1',fontSize:9}}>Nenhum desenho/documento vinculado.</div>}</div>
      </section>}
    </section>

    <section style={{...panel,margin:'0 10px 10px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'end',gap:6,padding:7,background:'#f7f9fc',borderBottom:'1px solid #d6dde6',flexWrap:'wrap'}}>
        <Search size={14}/><label style={{...label,width:250}}>Pesquisar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, descrição, grupo..." style={{...input,height:28}}/></label>
        <label style={{...label,width:130}}>Grupo<select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...input,height:28}}><option value="TODAS">Todos</option>{groups.map(g=><option key={g.id} value={g.nome}>{g.nome}</option>)}</select></label>
        <label style={{...label,width:130}}>Subgrupo<select value={subgroupFilter} onChange={e=>setSubgroupFilter(e.target.value)} style={{...input,height:28}}><option value="TODOS">Todos</option>{Array.from(new Set(products.map(p=>p.subgrupo).filter(Boolean) as string[])).sort().map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label style={{...label,width:130}}>Marca<select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} style={{...input,height:28}}><option value="TODAS">Todas</option>{Array.from(new Set(products.map(p=>p.marca).filter(Boolean) as string[])).sort().map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label style={{...label,width:150}}>Tipo<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{...input,height:28}}><option value="TODAS">Todos</option><option value="MATÉRIA-PRIMA">MATÉRIA-PRIMA</option><option value="PRENSADOS">PRENSADOS</option><option value="INJETADOS">INJETADOS</option><option value="ALMOXARIFADO">ALMOXARIFADO</option><option value="MATERIAL DE ESCRITÓRIO">MATERIAL DE ESCRITÓRIO</option><option value="PRODUTOS DE LIMPEZA">PRODUTOS DE LIMPEZA</option></select></label>
        <span style={{fontSize:10,color:'#667085',paddingBottom:7}}>{filtered.length} produto(s)</span><button type="button" onClick={()=>void load()} disabled={busy} style={{...btn('normal'),height:28,marginLeft:'auto'}}><RefreshCw size={13}/>Atualizar</button>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1040}}><thead><tr>{['Foto','Código','Descrição','Grupo','Subgrupo','Marca','Unidade','Estoque Atual','Situação'].map(h=><th key={h} style={{textAlign:'left',padding:'5px 6px',borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.id} onClick={()=>selectProduct(p)} onDoubleClick={()=>selectProduct(p)} style={{background:selectedId===p.id?'#e7eefb':'#fff',cursor:'pointer'}}><td style={{padding:4,width:42}}>{p.foto_url?<img src={p.foto_url} alt="" style={{width:32,height:28,objectFit:'contain',border:'1px solid #e2e8f0'}}/>:<ImageIcon size={18} color="#98a2b3"/>}</td><td style={{padding:6,fontSize:10,fontWeight:900}}>{p.codigo}</td><td style={{padding:6,fontSize:10}}>{p.nome}</td><td style={{padding:6,fontSize:10}}>{p.grupo||'—'}</td><td style={{padding:6,fontSize:10}}>{p.subgrupo||'—'}</td><td style={{padding:6,fontSize:10}}>{p.marca||'—'}</td><td style={{padding:6,fontSize:10}}>{p.unidade}</td><td style={{padding:6,fontSize:10,fontWeight:900}}>{fmt(p.estoque_atual)}</td><td style={{padding:5,fontSize:9}}><span style={{display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={11} color={p.ativo?'#16a34a':'#b42318'}/>{p.ativo?'Ativo':'Inativo'}</span></td></tr>)}{!filtered.length&&emptyRow('Nenhum produto encontrado.',8)}</tbody></table></div>
    </section>
    {selectedId ? (
      <section style={{...panel,margin:'0 10px 10px',padding:8}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <h2 style={{margin:0,fontSize:11,color:'#123B50'}}>HISTÓRICO AUTOMÁTICO DO PRODUTO</h2>
          <span style={{fontSize:8,color:'#667085'}}>erp_audit_logs • somente consulta</span>
        </div>
        <div style={{maxHeight:180,overflow:'auto'}}>
          {audits.map(a=>(
            <div key={a.id} style={{display:'grid',gridTemplateColumns:'145px 130px 1fr',gap:7,padding:'4px 5px',borderBottom:'1px solid #edf1f5',fontSize:9}}>
              <span>{new Date(a.created_at).toLocaleString('pt-BR')}</span>
              <b>{a.action}</b>
              <details>
                <summary style={{cursor:'pointer'}}>Ver alteração</summary>
                <pre style={{fontSize:8,whiteSpace:'pre-wrap'}}>{JSON.stringify({antes:a.old_data,depois:a.new_data},null,2)}</pre>
              </details>
            </div>
          ))}
          {!audits.length&&<span style={{fontSize:9,color:'#667085'}}>Nenhum evento registrado.</span>}
        </div>
      </section>
    ) : null}
    <footer style={{padding:'7px 12px 16px',fontSize:10,color:'#667085',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><span>SYSNQRA ERP & SGQ INDUSTRIAL • Cadastro Mestre de Produtos</span><span>© FernandoSch_System — Todos os direitos reservados</span></footer>
  </main></ERPHorizontalShell>
}