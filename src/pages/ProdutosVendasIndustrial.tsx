/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 13:00 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-059
 * Data da revisão de aprovação: 2026-10-16
 * Status da tela: APROVADO-IMUTAVEL (não alterar sem autorização explícita do usuário).
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
  cliente:string|null;desenho:string|null;dimensional:string|null;catalogo_disponivel:boolean;material:string|null;cliente_principal:string|null;codigo_cliente:string|null;centro_custo_produto:string|null
  tipo_processo:string;tipo_maquina:string|null;tipo_injetora:string|null;tonelagem_minima:number;tonelagem_maxima:number;numero_cavidades:number;molde_codigo:string|null;numero_desenho:string|null
  especificacao_interna:string|null;material_especificado:string|null;dureza_especificada:string|null;fluidez_especificada:string|null;numero_ficha_processo:string|null;numero_riai:string|null
  cliente_principal_id:string|null;centro_custo_produto_id:string|null;maquina_preferencial_id:string|null
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
  tolerancia_percentual:0,cliente:null,desenho:null,dimensional:null,catalogo_disponivel:false,material:null,cliente_principal:null,codigo_cliente:null,centro_custo_produto:null,
  tipo_processo:'NAO_APLICA',tipo_maquina:null,tipo_injetora:null,tonelagem_minima:0,tonelagem_maxima:0,numero_cavidades:1,molde_codigo:null,numero_desenho:null,
  especificacao_interna:null,material_especificado:null,dureza_especificada:null,fluidez_especificada:null,numero_ficha_processo:null,numero_riai:null,
  cliente_principal_id:null,centro_custo_produto_id:null,maquina_preferencial_id:null,
  custo_medio:0,custo_ultimo:0,custo_fabricacao:0,preco_venda:0,ativo:true
})
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const n=(v:unknown)=>Number(v??0)||0
const fmt=(v:unknown)=>n(v).toLocaleString('pt-BR',{maximumFractionDigits:3})
const panel:CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:2}
const input:CSSProperties={width:'100%',height:30,border:'1px solid #c4ced9',borderRadius:2,padding:'0 8px',fontSize:11,background:'#fff',boxSizing:'border-box'}
const label:CSSProperties={display:'grid',gap:3,minWidth:0,fontSize:9,lineHeight:'11px',fontWeight:500,color:'#344054',textTransform:'uppercase',overflowWrap:'anywhere'}
const btn=(kind:'primary'|'normal'|'danger'):CSSProperties=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,height:30,padding:'0 10px',borderRadius:2,border:'1px solid '+(kind==='danger'?'#D65B61':kind==='primary'?'#2D8DB8':'#B8CDD5'),background:kind==='danger'?'#D65B61':kind==='primary'?'#2D8DB8':'#F4FBFD',color:kind==='primary'||kind==='danger'?'#fff':'#123B50',fontSize:11,fontWeight:600,textTransform:'uppercase',cursor:'pointer',whiteSpace:'nowrap'})
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
  const [subgroupCatalog,setSubgroupCatalog]=useState<string[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [form,setForm]=useState<FormData>(empty())
  const [editing,setEditing]=useState(false)
  const [tab,setTab]=useState<Tab>('gerais')
  const [query,setQuery]=useState(''),[groupFilter,setGroupFilter]=useState('TODAS')
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
      const loadedProducts=(p.data??[]) as Product[]
      setProducts(loadedProducts);setSuppliers((s.data??[]) as Supplier[]);setGroups((g.data??[]) as Group[]);setLocations((l.data??[]) as Location[])
      setSubgroupCatalog([...new Set(loadedProducts.map(x=>String(x.subgrupo||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')))
      if(printMode&&printId){const printProduct=(p.data??[]).find((x:Product)=>x.id===printId);if(printProduct){setSelectedId(printProduct.id);setForm({...empty(),...printProduct})}}
      if(selectedId){const fresh=(p.data??[]).find((x:Product)=>x.id===selectedId);if(fresh)setForm({...empty(),...fresh})}
    }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar cadastro de produtos.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[])
  useEffect(()=>{void supabase.auth.getUser().then(async ({data})=>{if(!data.user)return;const {data:profile}=await supabase.from('erp_usuarios').select('nome').eq('auth_user_id',data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();setOperatorName(String(profile?.nome||data.user.email||'Usuário ERP'))})},[])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return products.filter(p=>(!q||(p.codigo+' '+p.nome+' '+(p.codigo_barras||'')+' '+(p.grupo||'')+' '+(p.subgrupo||'')+' '+(p.marca||'')+' '+(p.categoria||'')).toLowerCase().includes(q))&&(groupFilter==='TODAS'||String(p.grupo||'')===groupFilter))
  },[products,query,groupFilter])

  const selectProduct=(p:Product)=>{setSelectedId(p.id);setForm({...empty(),...p});setEditing(false);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const newProduct=()=>{setSelectedId(null);setForm(empty());setEditing(true);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false)}
  const update=(key:keyof FormData,value:unknown)=>setForm(prev=>({...prev,[key]:value}))
  const addGroup=async()=>{
    const name=String(form.grupo||'').trim()
    if(!companyId){setError('Empresa da sessão não identificada.');return}
    if(!name){setError('Digite o nome do novo grupo no campo Grupo e clique em +.');return}
    const existing=groups.find(g=>g.nome.trim().toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))
    if(existing){update('grupo',existing.nome);setMessage('O grupo já existe e foi selecionado.');return}
    const base='GRP-'+name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,16)
    const prefix=base==='GRP-'?'GRP-NOVO':base
    let code=prefix,sequence=2
    while(groups.some(g=>g.codigo.toUpperCase()===code)){code=prefix+'-'+sequence;sequence+=1}
    setBusy(true);setError('');setMessage('')
    try{
      const {data,error:e}=await supabase.from('erp_grupos').insert({empresa_id:companyId,codigo:code,nome:name,ativo:true}).select('id,codigo,nome').single()
      if(e)throw e
      const created=data as Group
      setGroups(prev=>[...prev,created].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')))
      update('grupo',created.nome)
      setMessage('Grupo cadastrado no banco da empresa e selecionado no produto. Código gerado: '+created.codigo)
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar o grupo.')}
    finally{setBusy(false)}
  }
  const addSubgroupOption=()=>{
    const value=String(form.subgrupo||'').trim()
    if(!value){setError('Digite o nome do novo subgrupo antes de clicar em +.');return}
    setSubgroupCatalog(prev=>[...new Set([...prev,value])].sort((a,b)=>a.localeCompare(b,'pt-BR')))
    update('subgrupo',value);setMessage('Subgrupo adicionado às opções desta sessão. Para gravá-lo no catálogo da empresa, salve o produto com esse subgrupo.')
  }
  const openTechnicalPrint=()=>{if(!selectedId){setError('Selecione um produto antes de imprimir a ficha técnica.');return}window.open('/produtos-vendas/imprimir?id='+encodeURIComponent(selectedId),'_blank','noopener,noreferrer')}
  const save=async()=>{
    setBusy(true);setError('');setMessage('')
    try{
      if(!companyId)throw new Error('Empresa da sessão não identificada.')
      if(!String(form.nome||'').trim())throw new Error('Descrição é obrigatória.')
      const fiscalCodeChecks:Array<[string,string,RegExp]>=[['NCM',String(form.ncm||''),/^\d{8}$/],['CEST',String(form.cest||''),/^\d{7}$/],['CFOP de entrada',String(form.cfop_entrada||''),/^\d{4}$/],['CFOP de saída',String(form.cfop_saida||''),/^\d{4}$/],['CST ICMS',String(form.cst_icms||''),/^\d{2}$/],['CSOSN',String(form.csosn||''),/^\d{3}$/]]
      for(const [fieldName,code,pattern] of fiscalCodeChecks)if(code&&!pattern.test(code))throw new Error(fieldName+' inválido: informe somente dígitos e o tamanho exigido pelo campo.');
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
      // Saldos e custos são derivados dos movimentos/engenharia; não podem ser sobrescritos pelo formulário mestre.
      const editableForm={...form}
      const {estoque_atual: _estoqueAtual,custo_medio: _custoMedio,custo_ultimo: _custoUltimo,custo_fabricacao: _custoFabricacao,...payloadForm}=editableForm
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
        supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId).order('created_at',{ascending:false}).limit(200),        supabase.from('erp_fichas_tecnicas').select('id,versao,rendimento,unidade_rendimento,status,revisao').eq('empresa_id',companyId).eq('produto_id',selectedId).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
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

  const choosePhoto=(e:ChangeEvent<HTMLInputElement>,slot=1)=>{const target=e.currentTarget;slot=Number(target.dataset.slot||slot)
    const file=target.files?.[0];target.value=''
    if(!file||!selectedId||!companyId)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Use JPG, PNG ou WEBP.');return}
    if(file.size>5*1024*1024){setError('A foto deve ter no máximo 5 MB.');return}
    setBusy(true);setError('')
    const path=companyId+'/'+selectedId+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    void supabase.storage.from('erp-produtos').upload(path,file,{upsert:true,contentType:file.type})
      .then(({error:e2})=>{if(e2)throw e2;return {error:null}})
      .then(async({error:e3})=>{if(e3)throw e3;const url=supabase.storage.from('erp-produtos').getPublicUrl(path).data.publicUrl;if(slot===1){const {error:e4}=await supabase.from('erp_produtos').update({foto_url:url}).eq('id',selectedId).eq('empresa_id',companyId);if(e4)throw e4}const {error:e5}=await supabase.from('erp_documentos_anexos').insert({empresa_id:companyId,entidade_tipo:'produto',entidade_id:selectedId,nome_arquivo:'FOTO_'+slot+'_'+file.name,storage_path:path,mime_type:file.type,tamanho_bytes:file.size});if(e5)throw e5;setForm(prev=>({...prev,foto_url:slot===1?url:prev.foto_url}));const {data:updatedAttachments,error:attachmentsError}=await supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId).order('created_at',{ascending:false}).limit(200);if(attachmentsError)throw attachmentsError;setAttachments((updatedAttachments??[]) as Attachment[]);setDetailsLoaded(true);setMessage('Foto '+slot+' do produto atualizada.');void load()})
      .catch(e=>setError(e instanceof Error?e.message:'Não foi possível enviar a foto.')).finally(()=>setBusy(false))
  }

  const helpFor=(title:string)=>({
    'Descrição resumida':'Texto curto para identificação rápida do produto.',
    'Grupo':'Grupo mestre existente; determina a classificação principal do produto.',
    'Subgrupo':'Subdivisão do grupo usada para pesquisa e organização.',
    'Marca':'Marca comercial do produto, quando aplicável.',
    'Origem':'Código de origem da mercadoria conforme regra fiscal.',
    'CST ICMS':'Código da situação tributária do ICMS.',
    'CSOSN':'Código de situação da operação no Simples Nacional, quando aplicável.',
    'CFOP entrada':'CFOP padrão das entradas deste produto.',
    'CFOP saída':'CFOP padrão das saídas deste produto.',
    'Origem fiscal':'Informação fiscal complementar usada pela regra tributária.',
    'Ponto de reposição':'Quantidade de referência que dispara a necessidade de reposição.',
    'Validade lote [dias]':'Quantidade de dias de validade atribuída ao lote, quando o produto controla lote.',
    'Localização padrão':'Localização existente na aba Estoque. O saldo e o endereço físico são controlados pelos movimentos e pelo cadastro de localizações.',
    'Custo médio (calculado)':'Calculado automaticamente pelas entradas com custo unitário: (saldo anterior × custo médio anterior + quantidade recebida × custo de entrada) ÷ saldo após a entrada. Não é digitado manualmente.',
    'Último custo (calculado)':'Último custo unitário positivo recebido em movimento de entrada/recebimento fiscal. É atualizado pelo processo de estoque, não por este formulário.',
    'Custo fabricação (valor gravado)':'Valor armazenado em erp_produtos.custo_fabricacao. A rotina de formação de preço consulta BOM/MRP e máquina, mas atualmente grava preço e margem; não foi comprovado que atualize este campo automaticamente.',
    'NCM':'Nomenclatura Comum do Mercosul: código fiscal de 8 dígitos. Escolha um código já usado no catálogo ou confirme a classificação fiscal do produto com a área fiscal/contábil; não deve ser adivinhado apenas pelo nome.',
    'CEST':'Código de 7 dígitos quando houver enquadramento em substituição tributária. Só preencher quando aplicável à mercadoria e à regra estadual.',
    'Observações':'Informações complementares do cadastro; não substituem a ficha de processo.'
  } as Record<string,string>)[title.replace(' [?]','')]||('Ajuda do campo '+title.replace(' [?]','')+'.');
  const HelpTip=({text}:{text:string})=>{const [open,setOpen]=useState(false);return <span style={{position:'relative',display:'inline-flex',verticalAlign:'baseline',marginLeft:3}}><span role="button" tabIndex={0} aria-label="Ajuda" onClick={e=>{e.preventDefault();e.stopPropagation();setOpen(v=>!v)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(v=>!v)}}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:10,height:12,color:'#2D8DB8',fontSize:11,fontWeight:800,lineHeight:1,cursor:'pointer',userSelect:'none'}}>?</span>{open&&<span role="tooltip" style={{position:'absolute',zIndex:1200,left:12,top:14,width:250,padding:'7px 8px',border:'1px solid #b9cbd3',borderRadius:2,background:'#fff',boxShadow:'0 4px 12px rgba(18,59,80,.16)',fontSize:9,fontWeight:400,lineHeight:1.35,color:'#173b4a',textTransform:'none'}}>{text}</span>}</span>}
  const fieldTitle=(title:string)=><span style={{display:'inline-flex',alignItems:'center',whiteSpace:'nowrap',minWidth:0}}>{title.replace(' [?]','')}{title.includes('[?]')&&<HelpTip text={helpFor(title)}/>}</span>;
  const editClass=(key:keyof FormData)=>{const lengths:Partial<Record<keyof FormData,number>>={codigo:20,codigo_barras:20,unidade:3,unidade_compra:3,unidade_venda:3,ncm:8,cest:8,cfop_entrada:4,cfop_saida:4,cst_icms:2,csosn:3,referencia_interna:20,referencia_cliente:20,codigo_cliente:20,peso_liquido:14,peso_bruto:14,comprimento_mm:12,largura_mm:12,altura_mm:12,estoque_atual:14,ponto_reposicao:14,estoque_maximo:14,lote_validade_dias:4,aliquota_icms:8,aliquota_ipi:8,aliquota_pis:8,aliquota_cofins:8,preco_venda:14,custo_medio:14,custo_ultimo:14,custo_fabricacao:14,prazo_compra_dias:4,prazo_producao_dias:4,tolerancia_percentual:8,tonelagem_minima:8,tonelagem_maxima:8,numero_cavidades:4};if(['estoque_atual','ponto_reposicao','estoque_maximo','lote_validade_dias','prazo_compra_dias','prazo_producao_dias','numero_cavidades'].includes(String(key)))return 'edit-qty';if(['preco_venda','custo_medio','custo_ultimo','custo_fabricacao'].includes(String(key)))return 'edit-money';const size=lengths[key]??(typeIsLong(key)?50:50);return 'edit-'+size};
  const typeIsLong=(key:keyof FormData)=>['nome','descricao','observacoes','especificacao_interna','dimensional','material_especificado'].includes(String(key));
  const maxLengthFor=(key:keyof FormData)=>{const lengths:Partial<Record<keyof FormData,number>>={codigo:20,codigo_barras:20,unidade:3,unidade_compra:3,unidade_venda:3,ncm:8,cest:7,cfop_entrada:4,cfop_saida:4,cst_icms:2,csosn:3,referencia_interna:20,referencia_cliente:20,codigo_cliente:20};return lengths[key]??50};
  const field=(title:string,key:keyof FormData,type='text',span=1,locked=false)=><label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<input className={editClass(key)} maxLength={type==='number'?undefined:maxLengthFor(key)} type={type} value={String(form[key]??'')} readOnly={locked} disabled={!editing} onChange={e=>{const value=e.target.value;if(type==='number'&&value.length>14)return;update(key,type==='number'?n(value):value)}} style={{...input,background:locked?'#eaf3f8':editing?'#fff':'#f5f7fa',color:locked?'#17445A':'#172033',fontWeight:locked?700:400,cursor:locked?'not-allowed':'text',textAlign:type==='number'?'right':(['unidade','unidade_compra','unidade_venda','cst_icms','csosn'].includes(String(key))?'center':'left')}}/></label>
  const combo=(title:string,key:keyof FormData,options:Array<{value:string;label:string}>,span=1,maxLength?:number)=><label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<input role="combobox" aria-autocomplete="list" inputMode={maxLength?'numeric':undefined} maxLength={maxLength} list={'combo-'+String(key)} value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,e.target.value)} placeholder="Digite o código confirmado na fonte oficial..." autoComplete="off" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><datalist id={'combo-'+String(key)}>{options.map(o=><option key={o.value} value={o.value} label={o.label}/>)}</datalist></label>
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
  return <><main className="product-master-screen" style={{maxWidth:1600,margin:'0 auto',color:'#172033',fontFamily:'Arial,sans-serif',background:'#fff'}}>
    <style>{`
      .product-master-screen label{min-width:0}
      /* Travas físicas de largura para os campos do cadastro mestre. */
      .product-master-screen input.edit-2,.product-master-screen select.edit-2{display:inline-block!important;width:4ch!important;max-width:4ch!important;box-sizing:border-box}
      .product-master-screen input.edit-3,.product-master-screen select.edit-3{display:inline-block!important;width:5ch!important;max-width:5ch!important;box-sizing:border-box;text-align:center}
      .product-master-screen input.edit-4,.product-master-screen select.edit-4{display:inline-block!important;width:6ch!important;max-width:6ch!important;box-sizing:border-box;text-align:right}
      .product-master-screen input.edit-8,.product-master-screen select.edit-8{display:inline-block!important;width:10ch!important;max-width:10ch!important;box-sizing:border-box}
      .product-master-screen input.edit-10,.product-master-screen select.edit-10{display:inline-block!important;width:12ch!important;max-width:12ch!important;box-sizing:border-box}
      .product-master-screen input.edit-12,.product-master-screen select.edit-12{display:inline-block!important;width:14ch!important;max-width:14ch!important;box-sizing:border-box;text-align:right}
      .product-master-screen input.edit-14,.product-master-screen select.edit-14{display:inline-block!important;width:12ch!important;max-width:12ch!important;box-sizing:border-box;text-align:right}
      .product-master-screen input.edit-qty,.product-master-screen select.edit-qty{display:inline-block!important;width:9ch!important;max-width:9ch!important;box-sizing:border-box;text-align:right}
      .product-master-screen input.edit-money,.product-master-screen select.edit-money{display:inline-block!important;width:12ch!important;max-width:12ch!important;box-sizing:border-box;text-align:right}
      .product-master-screen input.edit-20,.product-master-screen select.edit-20{display:inline-block!important;width:22ch!important;max-width:22ch!important;box-sizing:border-box}
      .product-master-screen input.edit-50,.product-master-screen textarea.edit-50{display:inline-block!important;width:100%!important;max-width:320px!important;box-sizing:border-box}
      .product-master-screen input[type="number"]{text-align:right}
      .product-master-screen input:not([type="checkbox"]):not([type="file"]),.product-master-screen select,.product-master-screen textarea{box-sizing:border-box}
      .product-master-screen button:disabled{opacity:.48;cursor:not-allowed}
      @media print{body *{visibility:hidden!important}.product-master-screen,.product-master-screen *{visibility:visible!important}.product-master-screen{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;background:#fff!important}.product-master-screen .product-workspace{display:block!important;margin:0!important}.product-master-screen .product-list-panel,.product-master-screen header button,.product-master-screen input[type=file],.product-master-screen .product-screen-footer button{display:none!important}.product-master-screen .product-editor-panel{border:0!important}.product-master-screen .product-form-section{break-inside:avoid}.product-master-screen .product-tabs{display:none!important}}
      .product-master-screen button:focus-visible{outline:2px solid #2D8DB8;outline-offset:1px}
      .product-master-screen input:not([type="checkbox"]):not([type="file"]),.product-master-screen select,.product-master-screen textarea{max-width:100%;box-sizing:border-box}
      .product-master-screen .product-form-section{margin:0 0 12px;padding:0 0 10px;border-bottom:1px solid #dbe4ea}
      .product-master-screen .product-form-section:last-child{border-bottom:0;margin-bottom:0}
      .product-master-screen .product-form-section-title{margin:0 0 8px;padding:6px 8px;background:#eaf4f8;border-left:3px solid #2D8DB8;color:#123B50;font-size:10px;line-height:14px;font-weight:700;letter-spacing:.04em}
      .product-master-screen .product-form-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:start}
      .product-master-screen .product-form-grid>*{min-width:0}
      .product-master-screen .product-form-grid label{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(12px,auto) 30px;align-content:start;gap:2px;min-width:0}
      .product-master-screen .product-form-grid label>input,.product-master-screen .product-form-grid label>select,.product-master-screen .product-form-grid label>textarea{min-width:0;width:100%;height:30px;box-sizing:border-box}
      .product-master-screen .product-form-grid label>span{display:flex;align-items:center;max-width:100%;min-height:12px;line-height:11px;white-space:normal;overflow-wrap:anywhere;word-break:normal}
      .product-master-screen .product-cost-stack{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;min-width:0}
      .product-master-screen .product-cost-stack label{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(12px,auto) 30px;gap:2px;align-content:start;min-width:0}
      .product-master-screen .product-status-field{display:flex;align-items:center;align-self:end;gap:8px;min-height:30px;flex-wrap:wrap;border:1px solid #d5dde7;padding:5px 6px;background:#f8fbfd;box-sizing:border-box;min-width:0}
      .product-master-screen .product-status-field>span{font-size:9px;font-weight:600;color:#344054;text-transform:uppercase}
      .product-master-screen .product-status-field label{display:flex;align-items:center;gap:4px;white-space:normal;font-size:9px;min-width:0}
      .product-master-screen .product-workspace{display:grid;grid-template-columns:minmax(320px,.78fr) minmax(0,1.72fr);grid-template-areas:"list editor";gap:10px;margin:10px;align-items:start}
      .product-master-screen .product-editor-panel{grid-area:editor;margin:0!important;min-width:0}
      .product-master-screen .product-list-panel{grid-area:list;margin:0!important;min-width:0;position:sticky;top:8px}
      .product-master-screen .product-list-panel table{min-width:0!important;table-layout:fixed}
      .product-master-screen .product-list-panel th,.product-master-screen .product-list-panel td{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .product-master-screen .product-list-panel tbody tr:hover{background:#edf7fb!important}
      .product-master-screen .product-tabs{display:flex;align-items:stretch;gap:2px;overflow-x:auto;overscroll-behavior-x:contain}
      .product-master-screen .product-tabs button{flex:0 0 auto;min-height:34px}
      .product-master-screen .product-responsive-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;align-items:start}
      .product-master-screen .product-responsive-grid>*{min-width:0}
      .product-master-screen .product-responsive-grid label{align-content:start;grid-template-rows:minmax(12px,auto) 30px;gap:2px}
      .product-master-screen .product-responsive-grid label>input,.product-master-screen .product-responsive-grid label>select{width:100%;min-width:0}      @media(max-width:1250px){.product-master-screen .product-workspace{grid-template-columns:minmax(280px,.72fr) minmax(0,1.5fr);gap:8px;margin:8px}}
      @media(max-width:1050px){.product-master-screen .product-workspace{grid-template-columns:minmax(0,1fr);grid-template-areas:"list" "editor"}.product-master-screen .product-list-panel{position:static}}
      @media(min-width:1051px){.product-master-screen .product-list-panel>div:last-child{max-height:calc(100vh - 245px);overflow:auto}}
      @media(max-width:1150px){.product-master-screen .product-form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.product-master-screen .product-responsive-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      .product-master-screen .product-unit-row{grid-column:span 3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;align-items:center;min-width:0}.product-master-screen .product-unit-row label{display:grid;grid-template-columns:82px minmax(0,1fr);grid-template-rows:30px;align-items:center;gap:5px}.product-master-screen .product-unit-row label>span{min-height:0;line-height:11px}.product-master-screen .product-unit-row label>select{width:100%;min-width:0}.product-master-screen .product-photo-card{cursor:pointer;transition:border-color .12s,background .12s}.product-master-screen .product-photo-card:hover{border-color:#2D8DB8!important;background:#edf7fb!important}.product-master-screen .product-combo-wrap{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:4px;align-items:end;min-width:0}
      .product-master-screen .product-plus-button{height:30px;width:30px;border:1px solid #2D8DB8;background:#eaf4f8;color:#123B50;display:inline-flex;align-items:center;justify-content:center;border-radius:2px;cursor:pointer}
      .product-master-screen .product-inline-create{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto;gap:5px;padding:7px;margin-top:5px;background:#f4fbfd;border:1px solid #c8dfe8;align-items:end}
      @media(max-width:700px){.product-master-screen .product-form-grid,.product-master-screen .product-responsive-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-unit-row{grid-column:span 2;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.product-master-screen .product-unit-row label{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(12px,auto) 30px;gap:2px}.product-master-screen .product-general-row>*{grid-column:span 1!important}.product-master-screen .product-general-row>*:nth-child(3),.product-master-screen .product-general-row>*:nth-child(4){grid-column:span 2!important}.product-master-screen .product-commercial-row .product-observations-field{grid-column:span 2!important}.product-master-screen .product-responsive-grid{row-gap:9px}.product-master-screen .product-tabs button{padding:7px 8px!important;font-size:9px!important}.product-master-screen .product-responsive-grid>*{grid-column:span 1!important}.product-master-screen .product-inline-create{grid-template-columns:1fr}.product-master-screen .product-commercial-row .product-observations-field{grid-column:span 1!important}}
    `}</style>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'6px 8px',borderBottom:'1px solid #d6dde6',background:'#fff',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:800,color:'#2D8DB8'}}>CADASTROS • PRODUTOS</div><h1 style={{margin:'2px 0 0',fontSize:15,color:'#123B50'}}>Cadastro de Produtos</h1></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <button type="button" onClick={newProduct} style={btn('primary')}><Plus size={16}/>Novo</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} style={{display:'none'}} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choosePhoto(e)} style={{display:'none'}} />
        <button type="button" onClick={()=>importRef.current?.click()} disabled={busy} style={btn('normal')}><FileSpreadsheet size={13}/>Importar Excel</button>

        <button type="button" className="erp-edit-button" onClick={()=>setEditing(true)} disabled={!selectedId} style={btn('normal')}><Edit3 size={16}/>Editar</button>
        <button type="button" onClick={()=>void save()} disabled={!editing||busy} style={btn('primary')}><Save size={16}/>Salvar</button>
        <button type="button" onClick={cancelEdit} style={btn('normal')}><RotateCcw size={16}/>Cancelar</button>
        {!editing&&selectedId&&<button type="button" onClick={openTechnicalPrint} disabled={busy} style={btn('normal')}><Printer size={16}/>Imprimir</button>}
        <button type="button" onClick={()=>void deactivate()} disabled={!selectedId||busy} style={btn('danger')}><Trash2 size={16}/>Inativar</button>
        <button type="button" onClick={()=>{setSelectedId(null);setEditing(false);setForm(empty())}} style={btn('normal')}><X size={16}/>Fechar</button>
      </div>
    </header>

    {(message||error)&&<div role="alert" style={{margin:10,padding:'9px 12px',borderRadius:6,border:'1px solid '+(error?'#fecaca':'#bbf7d0'),background:error?'#fff1f2':'#f0fdf4',color:error?'#b91c1c':'#166534',fontWeight:800,fontSize:12}}>{error||message}</div>}

    {selectedId&&<section style={{...panel,margin:'10px 10px 0',padding:7}}>
      <div style={{fontSize:9,fontWeight:700,color:'#123B50',marginBottom:5,textTransform:'uppercase'}}>Fotos do produto • catálogo digital</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:6}}>
        {[1,2,3,4].map(slot=>{
          const photo=attachments.find(a=>a.mime_type?.startsWith('image/')&&a.nome_arquivo.startsWith('FOTO_'+slot+'_'));
          const url=photo?supabase.storage.from('erp-produtos').getPublicUrl(photo.storage_path).data.publicUrl:(slot===1?form.foto_url:null);
          return <div key={slot} className="product-photo-card" role={editing?'button':undefined} tabIndex={editing?0:undefined} aria-label={editing?'Selecionar imagem '+slot:'Imagem '+slot} onClick={()=>{if(editing){const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}}} onKeyDown={e=>{if(editing&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}}} style={{height:120,minWidth:0,border:'1px solid #cbd5e1',background:'#f8fafc',position:'relative',display:'grid',placeItems:'center',overflow:'hidden',outline:'none'}}>
            {url?<img src={url} alt={'Foto '+slot+' do produto'} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',padding:4,boxSizing:'border-box'}}/>:<div style={{fontSize:9,color:'#667085',textAlign:'center',padding:8}}><ImageIcon size={20}/><div>CLIQUE PARA ANEXAR</div><div>IMAGEM {slot}{slot===1?' • PRINCIPAL':''}</div></div>}
            {editing&&<button type="button" onClick={e=>{e.stopPropagation();const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}} style={{...btn('normal'),position:'absolute',right:4,bottom:4,height:24,padding:'0 7px',fontSize:9}}><Upload size={11}/> {url?'TROCAR':'ANEXAR'}</button>}
          </div>
        })}
      </div>
      <div style={{fontSize:8,color:'#667085',marginTop:4}}>A imagem 1 é a principal do cadastro; as quatro imagens podem ser usadas na apresentação do produto no catálogo digital.</div>
    </section>}
    {selectedId&&<><section style={{...panel,margin:'10px 10px 0',padding:7,display:'grid',gridTemplateColumns:'72px minmax(0,1fr) auto',gap:9,alignItems:'center',background:'#fff'}}>
      <div style={{width:72,height:60,border:'1px solid #cbd5e1',background:'#f8fafc',display:'grid',placeItems:'center',overflow:'hidden'}}>{form.foto_url?<img src={form.foto_url} alt="Foto do produto" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<ImageIcon size={22} color="#98a2b3"/>}</div>
      <div style={{minWidth:0}}><div style={{fontSize:9,fontWeight:700,color:'#667085',textTransform:'uppercase'}}>Produto selecionado</div><div style={{fontSize:13,fontWeight:700,color:'#123B50',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.codigo||'AUTOMÁTICO'} • {form.nome||'Sem descrição'}</div><div style={{fontSize:9,color:'#667085',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.descricao_resumida||'Sem descrição resumida'} · {form.grupo||'Sem grupo'} · {form.marca||'Sem marca'}</div></div>
      <div style={{display:'flex',gap:12,alignItems:'center',fontSize:9}}><span><b>ESTOQUE</b> {fmt(form.estoque_atual)} {form.unidade}</span><span><b>STATUS</b> {form.ativo?'ATIVO':'INATIVO'}</span></div>
    </section></>}

    <div className="product-workspace" aria-label="Área de trabalho do cadastro mestre de produtos">
    <section className="product-editor-panel" style={{...panel,overflow:'hidden'}}>
      <div className="product-tabs" role="tablist" aria-label="Abas do cadastro do produto" style={{borderBottom:'1px solid #d6dde6',background:'#f7f9fc'}}>
        {tabItems.map(([id,title,Icon])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>{setTab(id);if(selectedId)void loadDetails()}} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 10px',border:0,borderBottom:tab===id?'3px solid #2D8DB8':'3px solid transparent',background:tab===id?'#fff':'transparent',color:tab===id?'#123B50':'#475467',fontWeight:700,fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}><Icon size={14}/>{title}</button>)}
      </div>

      {tab==='gerais'&&<form onSubmit={save} style={{padding:8}}>
        <section className="product-form-section" aria-label="Identificação do produto">
          <h3 className="product-form-section-title">IDENTIFICAÇÃO DO PRODUTO</h3>
          <div className="product-form-grid product-general-row">
            {field('Código *','codigo','text',1,true)}
            {field('Código de barras','codigo_barras','text')}
            {field('Descrição *','nome','text',2)}
            {field('Descrição resumida [?]','descricao_resumida','text',2)}
            <div><label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>GRUPO <HelpTip text={helpFor('Grupo')}/></span><div className="product-combo-wrap"><input role="combobox" aria-autocomplete="list" list="product-group-options" value={String(form.grupo||'')} disabled={!editing} onChange={e=>update('grupo',e.target.value||null)} placeholder="Selecione ou digite um grupo..." autoComplete="off" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><datalist id="product-group-options">{groups.map(g=><option key={g.id} value={g.nome} label={g.codigo+' • '+g.nome}/>)}</datalist><button type="button" className="product-plus-button" title="Adicionar o nome digitado como novo grupo" aria-label="Adicionar o nome digitado como novo grupo" disabled={!editing||busy} onClick={()=>void addGroup()}><Plus size={15}/></button></div></label></div>
            <div><label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>SUBGRUPO <HelpTip text={helpFor('Subgrupo')}/></span><div className="product-combo-wrap"><input list="product-subgroup-options" value={String(form.subgrupo||'')} disabled={!editing} onChange={e=>update('subgrupo',e.target.value||null)} placeholder="Selecione ou digite..." autoComplete="off" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><datalist id="product-subgroup-options">{subgroupCatalog.map(s=><option key={s} value={s}/>)}</datalist><button type="button" className="product-plus-button" title="Adicionar subgrupo às opções" aria-label="Adicionar subgrupo às opções" disabled={!editing} onClick={addSubgroupOption}><Plus size={15}/></button></div></label><div style={{fontSize:8,color:'#667085',marginTop:3}}>Digite um novo nome e clique +; ele entra no catálogo ao salvar o produto.</div></div>
            {field('Marca [?]','marca')}
          </div>
        </section>

        <section className="product-form-section" aria-label="Unidades e características físicas">
          <h3 className="product-form-section-title">UNIDADES E CARACTERÍSTICAS FÍSICAS</h3>
          <div className="product-form-grid product-measure-row">
            <div className="product-unit-row">
            {select('Und. estoque','unidade',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
            {select('Und. compra','unidade_compra',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
            {select('Und. venda','unidade_venda',[['UN','UN'],['PC','PC'],['KG','KG'],['M','M'],['L','L']])}
            </div>
            {select('Tipo de produto','categoria',[['Produto acabado','Produto acabado'],['MATÉRIA-PRIMA','MATÉRIA-PRIMA'],['PRENSADOS','PRENSADOS'],['INJETADOS','INJETADOS'],['ALMOXARIFADO','ALMOXARIFADO'],['MATERIAL DE ESCRITÓRIO','MATERIAL DE ESCRITÓRIO'],['PRODUTOS DE LIMPEZA','PRODUTOS DE LIMPEZA'],['Componente','Componente'],['Insumo','Insumo']])}
            <label style={label}>Fornecedor padrão<select value={form.fornecedor_padrao_id||''} disabled={!editing} onChange={e=>update('fornecedor_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{suppliers.map(s=><option value={s.id} key={s.id}>{s.nome_fantasia||s.razao_social}</option>)}</select></label>
            {field('Peso líquido (kg)','peso_liquido','number')}
            {field('Peso bruto (kg)','peso_bruto','number')}
            {field('Comprimento (mm)','comprimento_mm','number')}
            {field('Largura (mm)','largura_mm','number')}
            {field('Altura (mm)','altura_mm','number')}
          </div>
        </section>

        <section className="product-form-section" aria-label="Identificação técnica industrial">
          <h3 className="product-form-section-title">IDENTIFICAÇÃO TÉCNICA INDUSTRIAL</h3>
          <div className="product-form-grid">
            {field('Material / composição','material')}
            {field('Cliente / aplicação','cliente')}
            {field('Cliente principal (descrição)','cliente_principal')}
            {field('Código do cliente','codigo_cliente')}
            {field('Desenho / arquivo técnico','desenho')}
            {field('Nº do desenho','numero_desenho')}
            {field('Dimensional / tolerâncias','dimensional')}
            {field('Especificação interna','especificacao_interna')}
            {field('Material especificado','material_especificado')}
            {field('Dureza especificada','dureza_especificada')}
            {field('Fluidez especificada','fluidez_especificada')}
            {field('Nº ficha de processo','numero_ficha_processo')}
            {field('Nº RIAI','numero_riai')}
            {field('Código do molde','molde_codigo')}
            {field('Centro de custo (descrição)','centro_custo_produto')}
            {check('Disponível no catálogo técnico','catalogo_disponivel')}
          </div>
        </section>

        <section className="product-form-section" aria-label="Custos e comercialização">
          <h3 className="product-form-section-title">CUSTOS E COMERCIALIZAÇÃO</h3>
          <div className="product-form-grid product-commercial-row">
            <div className="product-cost-stack">
              {field('Custo médio (calculado)','custo_medio','number',1,true)}
              {field('Último custo (calculado)','custo_ultimo','number',1,true)}
              <div style={{fontSize:8,lineHeight:1.35,color:'#526a75',padding:'3px 1px'}}>Automático: entradas de estoque/recebimento de NF-e com custo unitário. Não digitar.</div>
            </div>
            <label className="product-observations-field" style={{...label,gridColumn:'span 2'}}><span style={{display:'inline-flex',alignItems:'center'}}>OBSERVAÇÕES <HelpTip text={helpFor('Observações')}/></span><textarea value={form.observacoes||''} disabled={!editing} onChange={e=>update('observacoes',e.target.value)} title="Informações complementares do produto; não substitui a ficha de processo." style={{...input,height:58,padding:'5px 7px',resize:'vertical',fontSize:11}}/></label>
            {field('Preço venda','preco_venda','number')}
            {field('Ref. interna','referencia_interna')}
            {field('Ref. cliente','referencia_cliente')}
            <div className="product-status-field"><span>SITUAÇÃO</span>{check('Fabricado','fabricado')}{check('Comprado','comprado')}{check('Revenda','revenda')}</div>
          </div>
        </section>

      </form>}

            {tab==='fiscal'&&<section style={{padding:10}}>
        <div className="product-form-section" aria-label="Classificação fiscal">
          <h3 className="product-form-section-title">CLASSIFICAÇÃO DA MERCADORIA</h3>
          <div className="product-responsive-grid" style={{gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)'}}>
            {select('ORIGEM DA MERCADORIA [?]','origem',[['0 - Nacional','0 • Nacional, exceto códigos 3–5'],['1 - Estrangeira - Importação direta','1 • Estrangeira — importação direta'],['2 - Estrangeira - mercado interno','2 • Estrangeira — adquirida no mercado interno'],['3 - Nacional, conteúdo importação >40% e <70%','3 • Nacional, conteúdo de importação acima de 40%'],['4 - Nacional, processo produtivo básico','4 • Nacional, processo produtivo básico'],['5 - Nacional, conteúdo importação <40%','5 • Nacional, conteúdo de importação até 40%'],['6 - Estrangeira - importação direta, sem similar nacional','6 • Estrangeira — importação direta, sem similar nacional'],['7 - Estrangeira - mercado interno, sem similar nacional','7 • Estrangeira — mercado interno, sem similar nacional'],['8 - Nacional, conteúdo importação >70%','8 • Nacional, conteúdo de importação acima de 70%']])}
            {combo('NCM • 8 dígitos [?]','ncm',[],1,8)}
            {combo('CEST • 7 dígitos [?]','cest',[],1,7)}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
            <a href="https://portalunico.siscomex.gov.br/classif/#/nomenclatura/avancada?perfil=publico" target="_blank" rel="noreferrer" style={{...btn('normal'),textDecoration:'none'}}>CONSULTAR NCM NO CLASSIF</a>
            <a href="https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json" target="_blank" rel="noreferrer" style={{...btn('normal'),textDecoration:'none'}}>DOWNLOAD OFICIAL NCM (JSON)</a>
            <a href="https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=%2FNJarYc9nus%3D" target="_blank" rel="noreferrer" style={{...btn('normal'),textDecoration:'none'}}>TABELAS OFICIAIS NF-e</a>
          </div>
          <p style={{margin:'7px 0 0',fontSize:9,color:'#667085',lineHeight:1.45}}>Integridade fiscal: não sugerimos NCM/CEST com base em outros produtos. O catálogo oficial ainda precisa ser importado e versionado; até lá, informe somente códigos confirmados na fonte oficial. NCM vigente, histórico e futuras vigências devem ser conferidos no Sistema Classif.</p>
        </div>
        <div className="product-form-section" aria-label="Regras tributárias">
          <h3 className="product-form-section-title">CÓDIGOS TRIBUTÁRIOS E OPERAÇÃO</h3>
          <div className="product-responsive-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
            {combo('CST ICMS • 2 dígitos [?]','cst_icms',[],1,2)}
            {combo('CSOSN • 3 dígitos, Simples Nacional [?]','csosn',[],1,3)}
            {combo('CFOP ENTRADA • 4 dígitos [?]','cfop_entrada',[],1,4)}
            {combo('CFOP SAÍDA • 4 dígitos [?]','cfop_saida',[],1,4)}
            {combo('ORIGEM FISCAL / COMPLEMENTO [?]','origem_fiscal',[],1)}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
            <a href="https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=%2FNJarYc9nus%3D" target="_blank" rel="noreferrer" style={{...btn('normal'),textDecoration:'none'}}>CONSULTAR TABELA CFOP / NF-e</a>
            <a href="https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18" target="_blank" rel="noreferrer" style={{...btn('normal'),textDecoration:'none'}}>CONSULTAR CONVÊNIO CEST / CONFAZ</a>
          </div>
          <p style={{margin:'7px 0 0',fontSize:9,color:'#667085',lineHeight:1.45}}>Os códigos acima ficam sem sugestões demonstrativas até a integração de tabelas oficiais versionadas. CST e CSOSN não são intercambiáveis; a seleção depende do regime tributário. CFOP depende da operação, origem/destino e finalidade. Este cadastro não calcula sozinho o imposto devido.</p>
        </div>
        <div className="product-form-section" aria-label="Alíquotas tributárias"><h3 className="product-form-section-title">ALÍQUOTAS CADASTRADAS (%)</h3>
          <p style={{margin:'0 0 7px',fontSize:9,color:'#667085'}}>Valores informativos do cadastro atual; não representam um motor de cálculo tributário. IBS/CBS, FCP, DIFAL e demais regras condicionais não devem ser presumidos sem integração fiscal validada.</p>
          <div className="product-responsive-grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}>
            {field('ICMS %','aliquota_icms','number')}{field('IPI %','aliquota_ipi','number')}{field('PIS %','aliquota_pis','number')}{field('COFINS %','aliquota_cofins','number')}
          </div>
        </div>
        <div role="note" style={{marginTop:7,padding:'7px 8px',border:'1px solid #d5dde7',borderLeft:'3px solid #E6A34A',background:'#fffaf0',fontSize:9,color:'#52606d',lineHeight:1.45}}>ATENÇÃO FISCAL: esta tela não consulta nem sugere códigos automaticamente. NCM, CEST, CST/CSOSN e CFOP precisam ser confirmados nas fontes oficiais e conforme o produto, regime tributário e operação. A validação atual verifica somente o formato dos códigos preenchidos; não confirma vigência, enquadramento nem imposto devido. As alíquotas são informativas e não substituem o motor fiscal.</div>
      </section>}

            {tab==='estoque'&&<section style={{padding:10}}>
        <div className="product-responsive-grid" style={{gridTemplateColumns:'82px 82px 120px 1fr'}}>
          <label style={label}>ESTOQUE ATUAL <span style={{fontSize:8,color:'#667085'}}>calculado</span><input value={fmt(form.estoque_atual)+' '+form.unidade} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>PONTO DE REPOSIÇÃO <HelpTip text={helpFor('Ponto de reposição')}/></span><input type="number" value={String(form.ponto_reposicao??0)} disabled={!editing} onChange={e=>update('ponto_reposicao',n(e.target.value))} title="Quantidade que dispara a necessidade de reposição; não é estoque atual." style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}>ESTOQUE MÁXIMO<input type="number" value={String(form.estoque_maximo??0)} disabled={!editing} onChange={e=>update('estoque_maximo',n(e.target.value))} style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>LOCALIZAÇÃO PADRÃO <HelpTip text={helpFor('Localização padrão')}/></span><select value={form.localizacao_padrao_id||''} disabled={!editing} onChange={e=>update('localizacao_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione a localização</option>{locations.map(l=><option value={l.id} key={l.id}>{l.codigo} • {l.nome}{l.tipo?' • '+l.tipo:''}</option>)}</select></label>
        </div>
        <div className="product-responsive-grid" style={{gridTemplateColumns:'82px 105px 105px 170px',marginTop:7}}>
          {field('VALIDADE LOTE [dias] [?]','lote_validade_dias','number')}{check('Controla lote','controla_lote')}{check('Controla série','controla_serie')}{check('Permite estoque negativo','permite_estoque_negativo')}
        </div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>MOVIMENTAÇÕES RECENTES</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','Tipo','Quantidade','Origem','Documento','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{movements.map(m=><tr key={m.id}><td style={{padding:8,fontSize:11}}>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td style={{padding:8,fontSize:11}}>{m.tipo}</td><td style={{padding:8,fontSize:11,fontWeight:900}}>{fmt(m.quantidade)}</td><td style={{padding:8,fontSize:11}}>{m.origem||'—'}</td><td style={{padding:8,fontSize:11}}>{m.documento||'—'}</td><td style={{padding:8,fontSize:11}}>{m.observacao||'—'}</td></tr>)}{!movements.length&&emptyRow('Nenhuma movimentação registrada para este produto.',6)}</tbody></table></div>
      </section>}

      {tab==='producao'&&<section style={{padding:10}}>
        <div className="product-responsive-grid" style={{gridTemplateColumns:'82px 82px 82px 82px 120px 120px max-content'}}>
          {field('PRAZO COMPRA (dias)','prazo_compra_dias','number')}{field('PRAZO PRODUÇÃO (dias)','prazo_producao_dias','number')}{field('Custo fabricação (valor gravado) [?]','custo_fabricacao','number',1,true)}{field('TOLERÂNCIA (%)','tolerancia_percentual','number')}
          <label style={label}>FICHA ATIVA<input value={productionFicha?('REV. '+(productionFicha.revisao||productionFicha.versao)):'Não cadastrada'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}>RENDIMENTO<input value={productionFicha?fmt(productionFicha.rendimento)+' '+productionFicha.unidade_rendimento:'—'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A'}}/></label>
          <button type="button" onClick={()=>{window.location.href='/ficha-engenharia?produto='+encodeURIComponent(selectedId||'')}} style={{...btn('normal'),width:'max-content',maxWidth:'100%',whiteSpace:'nowrap',padding:'0 8px',fontSize:10}}>ABRIR FICHA DE PROCESSO</button>
        </div>
        <div className="product-responsive-grid" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))',marginTop:8}}>
          {select('TIPO DE PROCESSO','tipo_processo',[['NAO_APLICA','Não aplicável'],['PRENSADOS','Prensados'],['INJETADOS','Injetados'],['CORTE_VINCO','Corte e vinco'],['ESTAMPOS','Estampos'],['USINAGEM','Usinagem'],['MONTAGEM','Montagem'],['OUTRO','Outro']])}
          {field('Tipo de máquina','tipo_maquina')}
          {field('Tipo de injetora','tipo_injetora')}
          {field('Cavidades do molde','numero_cavidades','number')}
          {field('Tonelagem mínima','tonelagem_minima','number')}
          {field('Tonelagem máxima','tonelagem_maxima','number')}
        </div>
        <div style={{marginTop:8,border:'1px solid #d5dde7',overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Seq.','Operação','Máquina','Setup min','Ciclo s','Qtde/h','Qtde/dia'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{productionOps.map(o=><tr key={o.id} style={{borderBottom:'1px solid #e5e7eb'}}><td style={{padding:'5px 6px'}}>{o.sequencia}</td><td style={{padding:'5px 6px'}}>{o.operacao}</td><td style={{padding:'5px 6px'}}>{o.maquina_codigo?o.maquina_codigo+' • '+(o.maquina_nome||''):'Não definida'}</td><td style={{padding:'5px 6px'}}>{fmt(o.setup_min)}</td><td style={{padding:'5px 6px'}}>{fmt(o.ciclo_seg)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_hora==null?'—':fmt(o.capacidade_hora)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_dia==null?'—':fmt(o.capacidade_dia)}</td></tr>)}{!productionOps.length&&<tr><td colSpan={7} style={{padding:12,textAlign:'center',color:'#667085'}}>Nenhuma operação cadastrada. Abra a ficha de processo para cadastrar máquina/posto, setup, ciclo e instruções.</td></tr>}</tbody></table></div>
        <div style={{marginTop:7,fontSize:9,color:'#667085'}}>Máquina, setup, ciclo e capacidade vêm da ficha técnica/roteiro real; a ficha completa alimenta o PCP e a Ordem de Produção.</div>
      </section>}

      {tab==='qualidade'&&<section style={{padding:10}}>
        <div className="product-responsive-grid" style={{gridTemplateColumns:'120px 120px 1fr'}}>{select('INSPEÇÃO OBRIGATÓRIA','inspecao_qualidade_obrigatoria',[['true','Sim'],['false','Não']])}{field('NÍVEL DE QUALIDADE','nivel_qualidade')}<div style={{fontSize:9,color:'#667085',paddingBottom:6}}>Desenhos aprovados, critérios de inspeção e documentos controlados ficam vinculados ao produto.</div></div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DEFEITOS REGISTRADOS</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr>{['Data','OP','Defeito','Quantidade','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:5,borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{defects.map(d=><tr key={d.id}><td style={{padding:5}}>{new Date(d.created_at).toLocaleString('pt-BR')}</td><td style={{padding:5}}>{d.ordem_producao_id}</td><td style={{padding:5}}>{d.defeito}</td><td style={{padding:5}}>{fmt(d.quantidade)}</td><td style={{padding:5}}>{d.observacao||'—'}</td></tr>)}{!defects.length&&emptyRow('Nenhum defeito registrado para este produto.',5)}</tbody></table></div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DOCUMENTOS / DESENHOS VINCULADOS</h2>
        <div style={{display:'grid',gap:4}}>{attachments.map(a=><div key={a.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 120px 150px',gap:7,padding:'5px 6px',border:'1px solid #e4e7ec',fontSize:9}}><b>{a.nome_arquivo}</b><span>{a.mime_type||'arquivo'}</span><span>{a.tamanho_bytes?Math.round(a.tamanho_bytes/1024)+' KB':'—'} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>)}{!attachments.length&&<div style={{padding:10,textAlign:'center',color:'#667085',border:'1px dashed #cbd5e1',fontSize:9}}>Nenhum desenho/documento vinculado.</div>}</div>
      </section>}
    </section>

    <section className="product-list-panel" style={{...panel,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'end',gap:6,padding:7,background:'#f7f9fc',borderBottom:'1px solid #d6dde6',flexWrap:'wrap'}}>
        <Search size={14} color="#2D8DB8"/><label style={{...label,width:'calc(100% - 24px)'}}>PESQUISAR PRODUTO<input aria-label="Pesquisar produto por código, descrição ou grupo" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, descrição, grupo ou marca..." style={{...input,height:30}}/></label>
        <label style={{...label,width:'100%'}}>FILTRAR POR GRUPO<select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...input,height:30}}><option value="TODAS">Todos os grupos</option>{groups.map(g=><option key={g.id} value={g.nome}>{g.nome}</option>)}</select></label>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,width:'100%'}}><span style={{fontSize:10,color:'#667085'}}><b style={{color:'#123B50'}}>{filtered.length}</b> produto(s) encontrado(s)</span><button type="button" onClick={()=>void load()} disabled={busy} style={{...btn('normal'),height:28}}><RefreshCw size={13}/>Atualizar</button></div>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:0,tableLayout:'fixed'}}><colgroup><col style={{width:'24%'}}/><col style={{width:'42%'}}/><col style={{width:'18%'}}/><col style={{width:'16%'}}/></colgroup><thead><tr>{['Código','Descrição do produto','Grupo','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'7px 6px',borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:700,background:'#f7f9fc',color:'#344054'}}>{h}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.id} onClick={()=>selectProduct(p)} onDoubleClick={()=>selectProduct(p)} aria-selected={selectedId===p.id} style={{background:selectedId===p.id?'#dff1f8':'#fff',cursor:'pointer',borderLeft:selectedId===p.id?'3px solid #2D8DB8':'3px solid transparent'}}><td title={p.codigo} style={{padding:'7px 6px',fontSize:10,fontWeight:700,color:'#123B50'}}>{p.codigo}</td><td title={p.nome} style={{padding:'7px 6px',fontSize:10}}>{p.nome}</td><td title={p.grupo||'—'} style={{padding:'7px 6px',fontSize:9}}>{p.grupo||'—'}</td><td style={{padding:'7px 6px',fontSize:9,color:p.ativo?'#25815f':'#b42318',fontWeight:700}}>{p.ativo?'ATIVO':'INATIVO'}</td></tr>)}{!filtered.length&&emptyRow('Nenhum produto encontrado.',4)}</tbody></table></div>
    </section>
    </div>
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
    ) : null}    <footer className="product-screen-footer" style={{padding:'7px 12px 16px',fontSize:10,color:'#667085',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}><span>SYSNQRA ERP & SGQ INDUSTRIAL • Cadastro Mestre de Produtos</span><span>© FernandoSch_System — Todos os direitos reservados</span><button type="button" onClick={()=>window.print()} style={btn('normal')}><Printer size={13}/>IMPRIMIR TELA</button></footer>
  </main></>
}