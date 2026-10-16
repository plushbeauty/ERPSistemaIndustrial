/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data da revisão original: 24/09/2026 - 13:00 BRT
 * Revisão original: REV-059
 * Última revisão: REV-061 — 16/10/2026
 * O que foi revisto: painel de Produção e aba Qualidade do cadastro mestre; histórico precisa usar inspeções reais, e dependências de schema devem ser confirmadas.
 * O que foi alterado: integração do painel de documentos de processo; consulta tenant-scoped a erp_inspecoes; remoção de dependência de tabela PCP não confirmada no componente de Produção.
 * Evidência: contratos de erp_inspecoes comparados com QualidadeInspecaoProcesso.tsx; tabela de roteiro não confirmada removida do componente.
 * Validação executada: inspeção estática do código e comparação das referências de schema.
 * Validação pendente: type-check, lint, build, schema remoto, RLS, testes integrados e deploy.
 * Estado: implementado no código; não homologado.
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
import AbaProducaoIndustrial from '../components/industrial/AbaProducaoIndustrial'
interface XlsxModule { read(buffer:ArrayBuffer,options:{type:'array'}):{SheetNames:string[];Sheets:Record<string,unknown>}; utils:{sheet_to_json<T>(sheet:unknown,options:{defval:string}):T[]} }
declare global { interface Window { XLSX?: XlsxModule } }

type Product={
  id:string;empresa_id:string|null;codigo:string;nome:string;descricao:string|null;descricao_resumida:string|null;codigo_barras:string|null
  grupo:string|null;subgrupo:string|null;marca:string|null;categoria:string|null;unidade:string;unidade_compra:string;unidade_venda:string;fornecedor_padrao_id:string|null
  referencia_interna:string|null;referencia_cliente:string|null;origem:string|null;ncm:string|null;cest:string|null;peso_liquido:number;peso_bruto:number
  comprimento_mm:number;largura_mm:number;altura_mm:number;observacoes:string|null;foto_url:string|null;fabricado:boolean;comprado:boolean;revenda:boolean
  estoque_atual:number;ponto_reposicao:number;estoque_maximo:number;localizacao_padrao_id:string|null;controla_lote:boolean
  controla_serie:boolean;permite_estoque_negativo:boolean;lote_validade_dias:number;inspecao_qualidade_obrigatoria:boolean;nivel_qualidade:string|null;inspecao_entrada:boolean;inspecao_producao:boolean;inspecao_entrega:boolean;requer_quarentena:boolean;modelo_inspecao_codigo:string|null;amostragem_aql:string|null;tipo_medicao_qualidade:string|null;valor_minimo_qualidade:number|null;valor_maximo_qualidade:number|null;unidade_medida_qualidade:string|null
  roteiro_padrao_codigo:string|null;estrutura_bom_codigo:string|null;permite_subcontrato:boolean;requer_rastreabilidade:boolean;tipo_abastecimento:string|null;almoxarifado_wip_codigo:string|null;centro_trabalho_codigo:string|null;tempo_setup_min:number;capacidade_ciclo:number;alerta_maquina:boolean
  origem_fiscal:string|null;cst_icms:string|null;csosn:string|null;cfop_entrada:string|null;cfop_saida:string|null;aliquota_icms:number;aliquota_ipi:number
  aliquota_pis:number;aliquota_cofins:number;prazo_compra_dias:number;prazo_producao_dias:number;tolerancia_percentual:number
  custo_medio:number;custo_ultimo:number;custo_fabricacao:number;preco_venda:number;ativo:boolean
}
type Group={id:string;codigo:string;nome:string}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type Location={id:string;codigo:string;nome:string;tipo:string}
type Movement={id:string;tipo:string;quantidade:number;origem:string|null;documento:string|null;observacao:string|null;created_at:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number;observacao:string|null;created_at:string}
type QualityInspection={id:string;tipo:string;resultado:string;quantidade_inspecionada:number;quantidade_aprovada:number;quantidade_reprovada:number;ordem_producao_id:string|null;inspetor_nome:string|null;acao_bloqueio:string|null;created_at:string}
type Audit={id:string;action:string;module:string;old_data:Record<string,unknown>|null;new_data:Record<string,unknown>|null;created_at:string}
type Attachment={id:string;nome_arquivo:string;storage_path:string;mime_type:string|null;tamanho_bytes:number|null;created_at:string}
type Tab='gerais'|'fiscal'|'estoque'|'producao'|'qualidade'|'fotos'
type FormData=Omit<Product,'id'|'empresa_id'>

const tabItems:Array<[Tab,string,typeof Boxes]>=[
  ['gerais','DADOS GERAIS',Boxes],['fiscal','FISCAL',FileText],['estoque','ESTOQUE',Boxes],
  ['producao','PRODUÇÃO',Factory],['qualidade','QUALIDADE + DOCUMENTOS',ShieldCheck],['fotos','ANEXAR FOTO',ImageIcon]
]
const empty=():FormData=>({
  codigo:'',nome:'',descricao:null,descricao_resumida:null,codigo_barras:null,grupo:null,subgrupo:null,marca:null,categoria:'Produto acabado',unidade:'UN',unidade_compra:'UN',unidade_venda:'UN',
  fornecedor_padrao_id:null,referencia_interna:null,referencia_cliente:null,origem:'0 - Nacional',ncm:null,cest:null,peso_liquido:0,peso_bruto:0,comprimento_mm:0,largura_mm:0,altura_mm:0,
  observacoes:null,foto_url:null,fabricado:false,comprado:false,revenda:false,estoque_atual:0,ponto_reposicao:0,estoque_maximo:0,localizacao_padrao_id:null,
  controla_lote:false,controla_serie:false,permite_estoque_negativo:false,lote_validade_dias:0,inspecao_qualidade_obrigatoria:false,nivel_qualidade:null,inspecao_entrada:false,inspecao_producao:false,inspecao_entrega:false,requer_quarentena:false,modelo_inspecao_codigo:null,amostragem_aql:null,tipo_medicao_qualidade:null,valor_minimo_qualidade:null,valor_maximo_qualidade:null,unidade_medida_qualidade:null,roteiro_padrao_codigo:null,estrutura_bom_codigo:null,permite_subcontrato:false,requer_rastreabilidade:false,tipo_abastecimento:'PULL',almoxarifado_wip_codigo:null,centro_trabalho_codigo:null,tempo_setup_min:0,capacidade_ciclo:1,alerta_maquina:false,origem_fiscal:null,
  cst_icms:null,csosn:null,cfop_entrada:null,cfop_saida:null,aliquota_icms:0,aliquota_ipi:0,aliquota_pis:0,aliquota_cofins:0,prazo_compra_dias:0,prazo_producao_dias:0,
  tolerancia_percentual:0,custo_medio:0,custo_ultimo:0,custo_fabricacao:0,preco_venda:0,ativo:true
})
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const n=(v:unknown)=>Number(v??0)||0
const fmt=(v:unknown)=>n(v).toLocaleString('pt-BR',{maximumFractionDigits:3})
const normalizePhotoUrl=(url:string|null|undefined)=>url?url.replace('/storage/v1/object/erp-produtos/','/storage/v1/object/public/erp-produtos/'):url
const panel:CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:2}
const input:CSSProperties={width:'100%',height:30,border:'1px solid #c4ced9',borderRadius:2,padding:'0 8px',fontSize:11,background:'#fff',boxSizing:'border-box'}
const label:CSSProperties={display:'grid',gap:3,minWidth:0,fontSize:9,lineHeight:'11px',fontWeight:500,color:'#344054',textTransform:'uppercase',overflowWrap:'anywhere'}
const btn=(kind:'primary'|'normal'|'danger'):CSSProperties=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,height:30,padding:'0 10px',borderRadius:2,border:'1px solid '+(kind==='primary'?'#2b6cb0':kind==='danger'?'#b42318':'#c7d2df'),background:kind==='primary'?'#2b6cb0':kind==='danger'?'#b42318':'#fff',color:kind==='normal'?'#1a365d':'#fff',fontSize:11,fontWeight:600,textTransform:'uppercase',cursor:'pointer'})
const emptyRow=(text:string,col=7)=><tr><td colSpan={col} style={{padding:22,textAlign:'center',color:'#667085'}}>{text}</td></tr>

export default function ProdutosVendasIndustrial(){
  const routerLocation=useRouterLocation()
  const printMode=routerLocation.pathname==='/produtos-vendas/imprimir'
  const printId=new URLSearchParams(routerLocation.search).get('id')
  const [companyId,setCompanyId]=useState('')
  const [products,setProducts]=useState<Product[]>([])
  const [groups,setGroups]=useState<Group[]>([])
  const [suppliers,setSuppliers]=useState<Supplier[]>([])
  const [locations,setLocations]=useState<Location[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [form,setForm]=useState<FormData>(empty())
  const [editing,setEditing]=useState(false)
  const [tab,setTab]=useState<Tab>('gerais')
  const [query,setQuery]=useState(''),[groupFilter,setGroupFilter]=useState('TODAS')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [ncmOptions,setNcmOptions]=useState<Array<{codigo:string;descricao:string;data_inicio?:string;data_fim?:string}>>([])
  const [ncmDescription,setNcmDescription]=useState('')
  const [ncmBusy,setNcmBusy]=useState(false)
  const [ncmSearchMessage,setNcmSearchMessage]=useState('')
  const [fiscalCodeModalOpen,setFiscalCodeModalOpen]=useState(false)
  const [fiscalCodeLookup,setFiscalCodeLookup]=useState<'ncm'|'cest'>('cest')
  const [fiscalCodeQuery,setFiscalCodeQuery]=useState('')
  type ProductionLookupKind='roteiro'|'bom'|'wip'|'centro'|'template_inspec'|'tipo_medicao'|'grupo'|'fornecedor'|'localizacao'
  type ProductionLookupRow={id:string;codigo:string;descricao:string;versao?:string;status?:string}
  const [productionLookup,setProductionLookup]=useState<{kind:ProductionLookupKind;title:string;rows:ProductionLookupRow[];loading:boolean;error:string}|null>(null)
  const [productionLookupQuery,setProductionLookupQuery]=useState('')
  const [movements,setMovements]=useState<Movement[]>([])
  const [defects,setDefects]=useState<Defect[]>([])
  const [qualityInspections,setQualityInspections]=useState<QualityInspection[]>([])
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
      const [p,g,l,s]=await Promise.all([
        supabase.from('erp_produtos').select('*').eq('empresa_id',id).order('codigo').limit(2000),
        supabase.from('erp_grupos').select('id,codigo,nome').eq('empresa_id',id).eq('ativo',true).order('nome').limit(1000),
        supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,tipo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(1000),
        supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia').eq('empresa_id',id).eq('ativo',true).order('razao_social').limit(1000)
      ])
      for(const r of [p,g,l,s])if(r.error)throw r.error
      setProducts((p.data??[]) as Product[]);setGroups((g.data??[]) as Group[]);setLocations((l.data??[]) as Location[]);setSuppliers((s.data??[]) as Supplier[])
      if(printMode&&printId){const printProduct=(p.data??[]).find((x:Product)=>x.id===printId);if(printProduct){setSelectedId(printProduct.id);setForm({...empty(),...printProduct})}}
      if(selectedId){const fresh=(p.data??[]).find((x:Product)=>x.id===selectedId);if(fresh)setForm({...empty(),...fresh})}
    }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar cadastro de produtos.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return products.filter(p=>(!q||(p.codigo+' '+p.nome+' '+(p.codigo_barras||'')+' '+(p.grupo||'')+' '+(p.subgrupo||'')+' '+(p.marca||'')+' '+(p.categoria||'')).toLowerCase().includes(q))&&(groupFilter==='TODAS'||String(p.grupo||'')===groupFilter))
  },[products,query,groupFilter])

  const openProductionLookup=async(kind:ProductionLookupKind)=>{
    const titles:Record<ProductionLookupKind,string>={roteiro:'Consulta de roteiros de fabricação',bom:'Consulta de estruturas BOM',wip:'Consulta de almoxarifados WIP',centro:'Consulta de centros de trabalho',template_inspec:'Consulta de modelos/planos de inspeção',tipo_medicao:'Consulta de tipos de medição da qualidade',grupo:'Consulta de grupos de produtos',fornecedor:'Consulta de fornecedores ativos',localizacao:'Consulta de localizações de estoque'}
    setProductionLookup({kind,title:titles[kind],rows:[],loading:true,error:''});setProductionLookupQuery('')
    try{
      if(!companyId)throw new Error('Empresa da sessão não identificada.')
      let rows:ProductionLookupRow[]=[]
      if(kind==='grupo'){
        rows=groups.map(x=>({id:x.id,codigo:x.codigo,descricao:x.nome}))
      }else if(kind==='fornecedor'){
        rows=suppliers.map(x=>({id:x.id,codigo:x.id.slice(0,8).toUpperCase(),descricao:[x.razao_social,x.nome_fantasia].filter(Boolean).join(' · ')}))
      }else if(kind==='localizacao'){
        rows=locations.map(x=>({id:x.id,codigo:x.codigo,descricao:[x.nome,x.tipo].filter(Boolean).join(' · ')}))
      }else if(kind==='roteiro'){
        const r=await supabase.from('pcp_roteiros').select('id,codigo,versao').eq('empresa_id',companyId).eq('ativo',true).order('codigo').limit(500)
        if(r.error)throw r.error
        rows=(r.data??[]).map((x:{id:string;codigo:string;versao:string})=>({id:x.id,codigo:x.codigo,descricao:'Roteiro de fabricação',versao:x.versao}))
      }else if(kind==='bom'){
        const r=await supabase.from('engenharia_bom').select('id,codigo_bom,versao,status').eq('empresa_id',companyId).eq('status','ativo').order('codigo_bom').limit(500)
        if(r.error)throw r.error
        rows=(r.data??[]).map((x:{id:string;codigo_bom:string;versao:string;status:string})=>({id:x.id,codigo:x.codigo_bom,descricao:'Estrutura de produto',versao:x.versao,status:x.status}))
      }else if(kind==='wip'){
        const r=await supabase.from('erp_almoxarifados').select('id,codigo,nome').eq('empresa_id',companyId).eq('ativo',true).order('codigo').limit(1000)
        if(r.error)throw r.error
        rows=(r.data??[]).map((x:{id:string;codigo:string;nome:string})=>({id:x.id,codigo:x.codigo,descricao:x.nome}))
      }else if(kind==='centro'){
        const r=await supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto').eq('empresa_id',companyId).eq('ativo',true).order('codigo_posto').limit(500)
        if(r.error)throw r.error
        rows=(r.data??[]).map((x:{id:string;codigo_posto:string;nome_posto:string})=>({id:x.id,codigo:x.codigo_posto,descricao:x.nome_posto}))
      }else if(kind==='template_inspec'){
        const r=await supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,frequencia,status').eq('empresa_id',companyId).order('codigo').limit(1000)
        if(r.error)throw r.error
        rows=(r.data??[]).map((x:{id:string;codigo:string;caracteristica:string;unidade:string|null;frequencia:string|null;status:string})=>({id:x.id,codigo:x.codigo,descricao:[x.caracteristica,x.unidade?'Unidade: '+x.unidade:null,x.frequencia?'Frequência: '+x.frequencia:null].filter(Boolean).join(' · '),status:x.status}))
      }else{
        const r=await supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,status').eq('empresa_id',companyId).order('caracteristica').limit(1000)
        if(r.error)throw r.error
        const unique=new Map<string,ProductionLookupRow>()
        for(const x of (r.data??[]) as Array<{id:string;codigo:string;caracteristica:string;unidade:string|null;status:string}>){
          const key=(x.caracteristica||'').trim().toLocaleLowerCase('pt-BR')+'|'+(x.unidade||'').trim().toLocaleLowerCase('pt-BR')
          if(!x.caracteristica?.trim()||unique.has(key))continue
          unique.set(key,{id:x.id,codigo:x.caracteristica,descricao:[x.caracteristica,x.unidade?'Unidade: '+x.unidade:null].filter(Boolean).join(' · '),status:x.status})
        }
        rows=Array.from(unique.values()).sort((a,b)=>a.descricao.localeCompare(b.descricao,'pt-BR'))
      }
      setProductionLookup({kind,title:titles[kind],rows,loading:false,error:rows.length?'':'Nenhum cadastro ativo encontrado para esta consulta.'})
    }catch(e){setProductionLookup({kind,title:titles[kind],rows:[],loading:false,error:e instanceof Error?e.message:'Falha ao consultar os cadastros.'})}
  }
  const chooseProductionLookup=(row:ProductionLookupRow)=>{
    if(!productionLookup)return
    if(productionLookup.kind==='grupo')update('grupo',row.descricao)
    else if(productionLookup.kind==='fornecedor')update('fornecedor_padrao_id',row.id)
    else if(productionLookup.kind==='localizacao')update('localizacao_padrao_id',row.id)
    else {
      const key:Record<Exclude<ProductionLookupKind,'grupo'|'fornecedor'|'localizacao'>,keyof FormData>={roteiro:'roteiro_padrao_codigo',bom:'estrutura_bom_codigo',wip:'almoxarifado_wip_codigo',centro:'centro_trabalho_codigo',template_inspec:'modelo_inspecao_codigo',tipo_medicao:'tipo_medicao_qualidade'}
      update(key[productionLookup.kind],row.codigo)
    }
    setProductionLookup(null)
  }
  const selectProduct=(p:Product)=>{setSelectedId(p.id);setForm({...empty(),...p});setEditing(false);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false);setNcmDescription('');setNcmOptions([]);setNcmSearchMessage('')}
  const newProduct=()=>{setSelectedId(null);setForm(empty());setEditing(true);setTab('gerais');setMessage('');setError('');setDetailsLoaded(false);setNcmDescription('');setNcmOptions([]);setNcmSearchMessage('')}
  const update=(key:keyof FormData,value:unknown)=>setForm(prev=>({...prev,[key]:value}))
  const openTechnicalPrint=()=>{if(!selectedId){setError('Selecione um produto antes de imprimir a ficha técnica.');return}window.open('/produtos-vendas/imprimir?id='+encodeURIComponent(selectedId),'_blank','noopener,noreferrer')}
  const save=async()=>{
    setBusy(true);setError('');setMessage('')
    try{
      if(!companyId)throw new Error('Empresa da sessão não identificada.')
      if(!String(form.nome||'').trim())throw new Error('Descrição é obrigatória.')
      if(form.valor_minimo_qualidade!=null&&form.valor_maximo_qualidade!=null&&Number(form.valor_minimo_qualidade)>Number(form.valor_maximo_qualidade))throw new Error('O valor mínimo da qualidade não pode superar o valor máximo.')
      if(Number(form.peso_liquido)<0||Number(form.peso_bruto)<0)throw new Error('Os pesos não podem ser negativos.')
      if(Number(form.tempo_setup_min)<0||Number(form.capacidade_ciclo)<=0)throw new Error('O setup deve ser zero ou positivo e a capacidade por ciclo deve ser maior que zero.')
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
      const [m,d,q,a,an,ft]=await Promise.all([
        supabase.from('erp_estoque_movimentos').select('id,tipo,quantidade,origem,documento,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade,observacao,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_inspecoes').select('id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,ordem_producao_id,inspetor_nome,acao_bloqueio,created_at').eq('empresa_id',companyId).eq('produto_id',selectedId).order('created_at',{ascending:false}).limit(100),
        supabase.from('erp_audit_logs').select('id,action,module,old_data,new_data,created_at').eq('company_id',companyId).eq('entity','erp_produtos').eq('entity_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId).order('created_at',{ascending:false}).limit(200),
        supabase.from('erp_fichas_tecnicas').select('id,versao,rendimento,unidade_rendimento,status,revisao').eq('empresa_id',companyId).eq('produto_id',selectedId).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
      ])
      setMovements((m.data??[]) as Movement[]);setDefects((d.data??[]) as Defect[]);setQualityInspections((q.data??[]) as QualityInspection[]);setAudits((a.data??[]) as Audit[]);setAttachments((an.data??[]) as Attachment[])
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
      const firstError=[m,d,q,a,an,ft].find(x=>x.error);if(firstError?.error)setError(firstError.error.message)
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
        const refCliente=key(row,['codigocliente','codigo cliente','referencia cliente'])||null
        const payload={empresa_id:companyId,codigo,nome,descricao:nome,grupo,referencia_interna:codigo,referencia_cliente:refCliente,unidade:'UN',unidade_compra:'UN',unidade_venda:'UN',categoria:'Produto acabado',ativo:true,fabricado:true}
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

  const choosePhoto=async(e:ChangeEvent<HTMLInputElement>,slot=1)=>{
    const target=e.currentTarget
    slot=Number(target.dataset.slot||slot)
    const selectedFile=target.files?.[0]
    target.value=''
    if(!selectedFile)return
    if(!selectedId){setError('Selecione e salve um produto antes de anexar fotos.');return}
    if(!companyId){setError('A empresa da sessão ainda não foi identificada. Atualize o cadastro e tente novamente.');return}
    if(selectedFile.size>5*1024*1024){setError('A imagem original deve ter no máximo 5 MB.');return}
    let file=selectedFile
    const fileExtension=file.name.split('.').pop()?.toLowerCase()
    if(file.type==='image/bmp'||file.type==='image/x-ms-bmp'||fileExtension==='bmp'){
      try{
        const bitmap=await createImageBitmap(file)
        const canvas=document.createElement('canvas')
        canvas.width=bitmap.width
        canvas.height=bitmap.height
        const context=canvas.getContext('2d')
        if(!context){bitmap.close();throw new Error('Não foi possível preparar a imagem BMP.')}
        context.drawImage(bitmap,0,0)
        bitmap.close()
        const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao converter BMP para PNG.')),'image/png'))
        file=new File([png],file.name.replace(/\.[^.]+$/,'')+'.png',{type:'image/png',lastModified:Date.now()})
      }catch(err){setError(err instanceof Error?err.message:'Não foi possível converter a imagem BMP.');return}
    }
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      setError('Formato não suportado. Use JPG, PNG, WEBP ou BMP (convertido automaticamente para PNG).')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    const path=companyId+'/'+selectedId+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    try{
      const {error:uploadError}=await supabase.storage.from('erp-produtos').upload(path,file,{upsert:true,contentType:file.type})
      if(uploadError)throw uploadError
      const url=supabase.storage.from('erp-produtos').getPublicUrl(path).data.publicUrl
      if(slot===1){
        const {error:productError}=await supabase.from('erp_produtos').update({foto_url:url}).eq('id',selectedId).eq('empresa_id',companyId)
        if(productError)throw productError
      }
      const {error:attachmentError}=await supabase.from('erp_documentos_anexos').insert({
        empresa_id:companyId,
        entidade_tipo:'produto',
        entidade_id:selectedId,
        nome_arquivo:'FOTO_'+slot+'_'+file.name,
        storage_path:path,
        mime_type:file.type,
        tamanho_bytes:file.size
      })
      if(attachmentError)throw attachmentError
      setForm(prev=>({...prev,foto_url:slot===1?url:prev.foto_url}))
      const {data:updatedAttachments,error:attachmentsError}=await supabase.from('erp_documentos_anexos')
        .select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at')
        .eq('empresa_id',companyId).eq('entidade_tipo','produto').eq('entidade_id',selectedId)
        .order('created_at',{ascending:false}).limit(200)
      if(attachmentsError)throw attachmentsError
      setAttachments((updatedAttachments??[]) as Attachment[])
      setDetailsLoaded(true)
      setMessage('Foto '+slot+' do produto atualizada.')
      void load()
    }catch(err){
      setError(err instanceof Error?err.message:'Não foi possível enviar a foto.')
    }finally{
      setBusy(false)
    }
  }

  const searchNcm=async(searchTerm?:string)=>{
    const term=String(searchTerm||'').trim()||String(form.ncm||'').trim()||String(form.nome||'').trim()
    if(!term){setNcmSearchMessage('Informe o NCM ou a descrição do produto para pesquisar.');return}
    setNcmBusy(true);setNcmSearchMessage('Consultando tabela pública de NCM...');setNcmOptions([])
    try{
      const response=await fetch('https://brasilapi.com.br/api/ncm/v1?search='+encodeURIComponent(term))
      if(!response.ok)throw new Error(response.status===404?'NCM não encontrado.':'Serviço público de NCM indisponível no momento.')
      const rows=await response.json() as Array<{codigo?:unknown;descricao?:unknown;data_inicio?:unknown;data_fim?:unknown}>
      const options=Array.isArray(rows)?rows.filter(x=>typeof x.codigo==='string'&&typeof x.descricao==='string').map(x=>({codigo:String(x.codigo),descricao:String(x.descricao),data_inicio:typeof x.data_inicio==='string'?x.data_inicio:undefined,data_fim:typeof x.data_fim==='string'?x.data_fim:undefined})):[]
      setNcmOptions(options)
      setNcmSearchMessage(options.length?options.length+' classificação(ões) encontrada(s). Selecione a correspondente ao produto.':'Nenhum NCM encontrado. Revise a descrição ou o código.')
    }catch(e){setNcmSearchMessage(e instanceof Error?e.message:'Não foi possível consultar a tabela pública de NCM.')}
    finally{setNcmBusy(false)}
  }
  const lookupNcmCode=async()=>{
    const code=String(form.ncm||'').replace(/\D/g,'')
    if(code.length!==8)return
    try{
      const response=await fetch('https://brasilapi.com.br/api/ncm/v1/'+encodeURIComponent(code))
      if(!response.ok)return
      const item=await response.json() as {codigo?:unknown;descricao?:unknown}
      if(typeof item.codigo==='string'&&typeof item.descricao==='string'){setNcmDescription(item.descricao);update('ncm',item.codigo)}
    }catch{/* A consulta é auxiliar; não impede o cadastro manual do código fiscal. */}
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
    'Observações':'Informações complementares do cadastro; não substituem a ficha de processo.',
    'Custo médio':'Custo médio ponderado calculado a partir das entradas e movimentações valorizadas do estoque. Não editar manualmente.',
    'Último custo':'Valor da última entrada de compra registrada para o produto. Deve ser atualizado pelo recebimento/fiscal, não manualmente.',
    'Custo fabricação':'Custo calculado pela ficha de processo, materiais e operações reais de fabricação. Não editar manualmente.'
  } as Record<string,string>)[title.replace(' [?]','')]||('Ajuda do campo '+title.replace(' [?]','')+'.');
  const HelpTip=({text}:{text:string})=>{const [open,setOpen]=useState(false);return <span style={{position:'relative',display:'inline-flex',verticalAlign:'baseline',marginLeft:3}}><span role="button" tabIndex={0} aria-label="Ajuda" onClick={e=>{e.preventDefault();e.stopPropagation();setOpen(v=>!v)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(v=>!v)}}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:10,height:12,color:'#2D8DB8',fontSize:11,fontWeight:800,lineHeight:1,cursor:'pointer',userSelect:'none'}}>?</span>{open&&<span role="tooltip" style={{position:'absolute',zIndex:1200,left:12,top:14,width:250,padding:'7px 8px',border:'1px solid #b9cbd3',borderRadius:2,background:'#fff',boxShadow:'0 4px 12px rgba(18,59,80,.16)',fontSize:9,fontWeight:400,lineHeight:1.35,color:'#173b4a',textTransform:'none'}}>{text}</span>}</span>}
  const fieldTitle=(title:string)=><span style={{display:'inline-flex',alignItems:'center',flexWrap:'wrap',whiteSpace:'normal',overflowWrap:'anywhere',lineHeight:'11px',minHeight:12,minWidth:0}}>{title.replace(' [?]','')}{(title.includes('[?]')||title.startsWith('Custo médio')||title.startsWith('Último custo')||title.startsWith('Custo fabricação'))&&<HelpTip text={helpFor(title)}/>}</span>;
  const editSpec=(key:keyof FormData)=>{const specs:Partial<Record<keyof FormData,{length:number;className:string}>>={codigo:{length:20,className:'edit-20'},codigo_barras:{length:14,className:'edit-14'},nome:{length:120,className:'edit-120'},descricao_resumida:{length:60,className:'edit-60'},grupo:{length:6,className:'edit-6'},subgrupo:{length:6,className:'edit-6'},marca:{length:60,className:'edit-60'},referencia_interna:{length:20,className:'edit-20'},referencia_cliente:{length:20,className:'edit-20'},unidade:{length:3,className:'edit-3'},unidade_compra:{length:3,className:'edit-3'},unidade_venda:{length:3,className:'edit-3'},ncm:{length:8,className:'edit-8'},cest:{length:7,className:'edit-7'},cst_icms:{length:3,className:'edit-3'},csosn:{length:3,className:'edit-3'},cfop_entrada:{length:4,className:'edit-4'},cfop_saida:{length:4,className:'edit-4'},modelo_inspecao_codigo:{length:10,className:'edit-10'},amostragem_aql:{length:6,className:'edit-6'},tipo_medicao_qualidade:{length:15,className:'edit-15'},unidade_medida_qualidade:{length:3,className:'edit-3'},roteiro_padrao_codigo:{length:10,className:'edit-10'},estrutura_bom_codigo:{length:15,className:'edit-15'},almoxarifado_wip_codigo:{length:6,className:'edit-6'},centro_trabalho_codigo:{length:8,className:'edit-8'}};return specs[key]}
  const field=(title:string,key:keyof FormData,type='text',span=1,locked=false)=>{const spec=editSpec(key);const numeric=type==='number';return <label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<input type={type} className={spec?.className||(numeric?'edit-14':'edit-60')} maxLength={numeric?undefined:spec?.length??60} required={key==='nome'} step={numeric?'any':undefined} value={String(form[key]??'')} readOnly={locked} disabled={!editing} onChange={e=>update(key,numeric?n(e.target.value):e.target.value)} style={{...input,background:locked?'#e8eef5':editing?'#fff':'#f1f4f8',color:locked?'#1a365d':'#172033',fontWeight:locked?700:400,cursor:locked?'not-allowed':'text'}}/></label>}
  const select=(title:string,key:keyof FormData,options:Array<[string,string]>,span=1)=>{const sizeClass:Partial<Record<keyof FormData,string>>={ativo:'edit-8',unidade:'edit-3',unidade_compra:'edit-3',unidade_venda:'edit-3',categoria:'edit-20',origem:'edit-60',tipo_abastecimento:'edit-6',inspecao_qualidade_obrigatoria:'edit-2'};return <label style={{...label,gridColumn:'span '+span}}>{fieldTitle(title)}<select className={sizeClass[key]||'edit-60'} value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,key==='ativo'||key==='inspecao_qualidade_obrigatoria'?e.target.value==='true':e.target.value)} style={{...input,background:editing?'#fff':'#f1f4f8'}}>{options.map(o=><option value={o[0]} key={o[0]}>{o[1]}</option>)}</select></label>}
  const knownFiscalValues=(key:'cest'|'cst_icms'|'csosn'|'cfop_entrada'|'cfop_saida'|'origem_fiscal')=>Array.from(new Set(products.map(p=>p[key]).filter((value):value is string=>typeof value==='string'&&Boolean(value.trim())))).sort((a,b)=>a.localeCompare(b))
  const fiscalCombo=(title:string,key:'cest'|'cst_icms'|'csosn'|'cfop_entrada'|'cfop_saida'|'origem_fiscal')=><label style={label}>{fieldTitle(title)}<input className={key==='cest'?'edit-7':key==='cst_icms'||key==='csosn'?'edit-3':key==='cfop_entrada'||key==='cfop_saida'?'edit-4':'edit-60'} maxLength={key==='cest'?7:key==='cst_icms'||key==='csosn'?3:key==='cfop_entrada'||key==='cfop_saida'?4:60} list={'erp-fiscal-'+key} value={String(form[key]??'')} disabled={!editing} onChange={e=>update(key,e.target.value)} style={{...input,background:editing?'#fff':'#f5f7fa'}}/><datalist id={'erp-fiscal-'+key}>{knownFiscalValues(key).map(value=><option key={value} value={value}/>)}</datalist></label>
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
  return <main className="product-master-screen w-full bg-[#f4f6f9] text-[#1a365d]" style={{maxWidth:1600,margin:'0 auto',color:'#172033',fontFamily:'Arial,sans-serif',background:'#f4f6f9'}}>
    <style>{`
 
      .product-master-screen{max-width:1600px!important;background:#f4f8fb!important;color:#123B50!important}
      .product-master-screen>header{background:#123B50!important;border-bottom:3px solid #48B7C7!important;color:#fff!important;padding:10px 14px!important}
      .product-master-screen>header h1,.product-master-screen>header div{color:#fff!important}
      .product-master-screen>header>div:first-child>div{color:#83e0e8!important;letter-spacing:.12em}
      .product-master-screen>section{border-radius:2px!important;border-color:#cbdbe4!important;box-shadow:0 2px 7px rgba(18,59,80,.04)}
      .product-master-screen .product-general-form{padding:14px;background:#fff}
      .product-master-screen .product-section-heading{display:flex;align-items:end;justify-content:space-between;gap:14px;padding:8px 0 10px;margin:0 0 12px;border-bottom:1px solid #d8e6ec}
      .product-master-screen .product-section-heading:not(:first-child){margin-top:22px}
      .product-master-screen .product-section-heading span{font-size:9px;font-weight:900;letter-spacing:.13em;color:#2D8DB8}
      .product-master-screen .product-section-heading h2{margin:3px 0 0;font-size:14px;font-weight:800;color:#123B50}
      .product-master-screen .product-section-heading p{margin:0;max-width:460px;font-size:10px;line-height:1.45;color:#617987;text-align:right}
      .product-master-screen .product-field-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px 8px;align-items:end}
      .product-master-screen .product-general-fields>div{min-width:0}
      .product-master-screen .product-general-fields .product-code-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-barcode-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-description-field{grid-column:span 2}
      .product-master-screen .product-general-fields .product-summary-field{grid-column:span 2}
      .product-master-screen .product-general-fields .product-group-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-subgroup-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-brand-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-category-field{grid-column:span 1}
      .product-master-screen .product-general-fields .product-supplier-field{grid-column:span 2}
      .product-master-screen .product-general-fields .product-customer-name-field{grid-column:span 3}
      .product-master-screen .product-general-fields .product-customer-code-field{grid-column:span 3}
      .product-master-screen .product-unit-row{grid-column:1/-1;display:grid;grid-template-columns:100px 100px 100px minmax(260px,1fr);gap:7px;align-items:end;padding:8px;background:#f1f8fb;border:1px solid #cbdbe4;border-radius:2px}
      .product-master-screen .product-unit-row>label{min-width:0;display:grid;grid-template-rows:minmax(12px,auto) 30px;gap:2px}
      .product-master-screen .product-unit-row>label>select{width:100%;min-width:0}
      .product-master-screen .product-unit-row .weight-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0}
      .product-master-screen .product-unit-row .weight-row label{display:grid;grid-template-columns:minmax(0,1fr) 88px;grid-template-rows:30px;align-items:center;gap:5px}
      .product-master-screen .product-unit-row .weight-row label>input{width:88px;height:30px}
      .product-master-screen .product-unit-row .product-dimension-row{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(100px,160px));gap:8px}
      .product-master-screen .product-unit-row .product-dimension-row label{display:grid;grid-template-rows:minmax(12px,auto) 30px;gap:2px}
      .product-master-screen .product-field-grid label{display:grid;grid-template-rows:minmax(13px,auto) minmax(30px,auto);gap:4px;min-width:0;color:#294a5b;font-size:9px;font-weight:800}
      .product-master-screen .product-field-grid label>input,.product-master-screen .product-field-grid label>select{height:32px!important;min-width:0;width:100%;border:1px solid #b9ced9!important;border-radius:2px!important;padding:0 8px!important;font-size:11px!important;color:#123B50}
      .product-master-screen .product-field-grid textarea{font:11px/1.45 Arial,sans-serif!important;border:1px solid #b9ced9!important;border-radius:2px!important}
      .product-master-screen .product-field-grid label>span{line-height:12px}
      .product-master-screen .product-flag-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .product-master-screen .product-flag-grid>label{padding:10px;border:1px solid #d5e4ea;background:#f4fafc;min-height:36px}
      .product-master-screen .product-flag-grid input[type=checkbox]{accent-color:#2D8DB8}
      .product-master-screen>section:nth-of-type(2){background:#fff}
      .product-master-screen>section:nth-of-type(2) table thead th{background:#123B50!important;color:#fff!important;border-bottom:1px solid #48B7C7!important}
      .product-master-screen button{transition:background .12s,border-color .12s}
      .product-master-screen button:focus-visible,.product-master-screen input:focus-visible,.product-master-screen select:focus-visible,.product-master-screen textarea:focus-visible{outline:2px solid #48B7C7;outline-offset:1px}
      @media(max-width:1000px){.product-master-screen .product-field-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.product-master-screen .product-unit-row{grid-template-columns:repeat(3,minmax(80px,1fr))}.product-master-screen .product-unit-row .weight-row{grid-column:1/-1}.product-master-screen .product-unit-row .product-dimension-row{grid-column:1/-1}.product-master-screen .product-section-heading{align-items:start;flex-direction:column}.product-master-screen .product-section-heading p{text-align:left}.product-master-screen .product-flag-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.product-master-screen .product-field-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.product-master-screen .product-general-fields>div{grid-column:span 1!important}.product-master-screen .product-general-fields .product-description-field,.product-master-screen .product-general-fields .product-summary-field,.product-master-screen .product-general-fields .product-supplier-field,.product-master-screen .product-general-fields .product-customer-name-field,.product-master-screen .product-general-fields .product-customer-code-field{grid-column:1/-1!important}.product-master-screen .product-unit-row{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.product-master-screen .product-unit-row .weight-row{grid-column:1/-1}.product-master-screen .product-unit-row .product-dimension-row{grid-template-columns:repeat(3,minmax(0,1fr))}.product-master-screen .product-field-grid label[style*="span 2"]{grid-column:1/-1!important}.product-master-screen .product-flag-grid{grid-template-columns:1fr}.product-master-screen .product-general-form{padding:10px}.product-master-screen>header{align-items:flex-start!important}.product-master-screen>header>div:last-child{width:100%;gap:5px!important}.product-master-screen>header>div:last-child button{flex:1;min-width:90px}}

      .product-master-screen label{min-width:0;gap:2px;align-content:end}.product-master-screen .product-form-grid label{grid-template-rows:minmax(12px,auto) 30px;gap:2px}.product-master-screen .product-form-grid label>span{min-height:12px;line-height:11px;white-space:normal;overflow-wrap:anywhere}.product-master-screen .product-unit-row{grid-column:1/-1;display:grid;grid-template-columns:100px 100px 100px minmax(260px,1fr);gap:7px;min-width:0;padding:8px;background:#f1f8fb;border:1px solid #cbdbe4;border-radius:2px}.product-master-screen .product-unit-row label{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto 30px;align-items:end;gap:3px;color:#123B50;font-size:8px}.product-master-screen .product-unit-row label>span{min-height:10px;line-height:10px;color:#123B50}.product-master-screen .product-unit-row label>select,.product-master-screen .product-unit-row label>input{width:100%;min-width:0}.product-master-screen .product-unit-row .weight-row{grid-column:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0;border:0;padding:0}.product-master-screen .product-unit-row .weight-row label{grid-template-columns:minmax(0,1fr) 88px;grid-template-rows:30px;align-items:center}.product-master-screen .product-unit-row .weight-row label>span{font-size:9px;font-weight:700;color:#123B50}.product-master-screen .product-unit-row .weight-row label>input{width:88px;height:30px;background:#fff;color:#123B50;border:1px solid #a9d8e8;border-radius:2px;padding:0 6px;box-sizing:border-box}
      .product-master-screen .product-unit-row .product-dimension-row{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(100px,160px));gap:8px}.product-master-screen .product-photo-card{cursor:pointer;transition:border-color .12s,background .12s}.product-master-screen .product-photo-card:hover{border-color:#2D8DB8!important;background:#edf7fb!important}
      .product-master-screen input:not([type="checkbox"]):not([type="file"]),.product-master-screen select,.product-master-screen textarea{max-width:100%;box-sizing:border-box}
      .product-master-screen .product-form-grid>*{min-width:0}
      .product-master-screen .product-form-grid label>input,.product-master-screen .product-form-grid label>select,.product-master-screen .product-form-grid label>textarea{min-width:0;width:100%}
      .product-master-screen .product-form-grid label>span{max-width:100%;line-height:11px}
      .product-master-screen .product-stock-primary-grid{grid-template-columns:minmax(135px,.8fr) minmax(160px,1fr) minmax(150px,.9fr) minmax(230px,1.6fr)!important}
      .product-master-screen .product-stock-secondary-grid{grid-template-columns:minmax(160px,1fr) repeat(3,minmax(150px,1fr))!important}
      .product-master-screen .product-production-grid{grid-template-columns:repeat(4,minmax(125px,1fr)) minmax(150px,1.15fr) minmax(150px,1.15fr) max-content!important}
      @media(max-width:1150px){.product-master-screen .product-fiscal-primary-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.product-master-screen .product-fiscal-secondary-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.product-master-screen .product-general-row{grid-template-columns:repeat(4,minmax(0,1fr))!important}.product-master-screen .product-measure-row{grid-template-columns:repeat(5,minmax(0,1fr))!important}.product-master-screen .product-unit-row{grid-column:span 3}.product-master-screen .product-commercial-row{grid-template-columns:repeat(4,minmax(0,1fr))!important}.product-master-screen .product-stock-primary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-stock-primary-grid>*:last-child{grid-column:span 2}.product-master-screen .product-stock-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-production-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.product-master-screen .product-production-grid>button{grid-column:span 2;justify-self:start}}
      @media(max-width:700px){.product-master-screen .product-fiscal-primary-grid,.product-master-screen .product-fiscal-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-general-row,.product-master-screen .product-measure-row,.product-master-screen .product-commercial-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-unit-row{grid-column:span 2;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.product-master-screen .product-unit-row label{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(12px,auto) 30px;gap:2px}.product-master-screen .product-general-row>*{grid-column:span 1!important}.product-master-screen .product-general-row>*:nth-child(3){grid-column:span 2!important}.product-master-screen .product-commercial-row>*{grid-column:span 1!important}.product-master-screen .product-stock-primary-grid,.product-master-screen .product-stock-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-stock-primary-grid>*:last-child{grid-column:span 2}.product-master-screen .product-production-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-production-grid>button{grid-column:span 2}}

      .product-master-screen .product-general-form{padding:8px;background:#f4f8fb}
      .product-master-screen .product-general-card-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr);gap:8px;align-items:start}
      .product-master-screen .product-layout-card{min-width:0;border:1px solid #cbdbe4;background:#fff;border-radius:2px;padding:8px;box-shadow:0 1px 3px rgba(18,59,80,.04)}
      .product-master-screen .product-layout-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 0 6px;margin-bottom:7px;border-bottom:1px solid #d8e6ec}
      .product-master-screen .product-layout-card-header span{font-size:9px;font-weight:800;letter-spacing:.04em;color:#2D8DB8}
      .product-master-screen .product-layout-card-header h2{font-size:12px;line-height:1.25;margin:2px 0 0;color:#123B50}
      .product-master-screen .product-layout-card-header small{font-size:9px;color:#617987;text-align:right}
      .product-master-screen .product-inline-fields{display:grid;gap:5px}
.product-master-screen .product-identification-flags{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:8px;padding-top:7px;border-top:1px solid #D8E6EC}
      .product-master-screen .product-identification-flags>label{display:flex;align-items:center;gap:5px;font-size:9px!important;color:#1A365D!important}
      .product-master-screen .product-identification-flags input{width:14px!important;height:14px!important;accent-color:#2B6CB0}
            .product-master-screen .product-identification-fields>.product-inline-field,.product-master-screen .product-identification-reference-row,.product-master-screen .product-operational-fields>.product-inline-field,.product-master-screen .product-attribute-grid>.product-inline-field,.product-master-screen .product-fiscal-code-lookup{flex:0 0 auto!important;min-width:0;box-sizing:border-box!important}
      .product-master-screen .product-identification-fields input,.product-master-screen .product-identification-fields select,.product-master-screen .product-operational-fields input,.product-master-screen .product-operational-fields select,.product-master-screen .product-fiscal-code-lookup input,.product-master-screen .product-fiscal-rates-grid input,.product-master-screen .product-stock-primary-grid input,.product-master-screen .product-stock-secondary-grid input,.product-master-screen .product-stock-primary-grid select,.product-master-screen .product-stock-secondary-grid select{height:30px!important;padding:4px 8px!important;display:inline-block!important;box-sizing:border-box!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important}
      .product-master-screen .product-identification-fields .product-code-field input{width:26ch!important;max-width:26ch!important}.product-master-screen .product-identification-fields .product-barcode-field input{width:16ch!important;max-width:16ch!important}.product-master-screen .product-identification-fields .product-description-field input{width:100%!important;max-width:450px!important}
      .product-master-screen .product-identification-reference-row{display:grid;grid-template-columns:minmax(0,23ch) minmax(0,280px);gap:8px;align-items:start;min-width:0}.product-master-screen .product-identification-fields .product-customer-code-field input{width:26ch!important;max-width:26ch!important}.product-master-screen .product-identification-fields .product-customer-name-field input{width:100%!important;max-width:280px!important}.product-master-screen .product-identification-fields .product-inline-field{flex:0 0 auto!important;min-width:0}
      .product-master-screen .product-layout-card-header span{display:inline-block;background:#E8F2FC;color:#2B6CB0!important;padding:3px 6px;border-left:3px solid #2B6CB0;letter-spacing:.06em}.product-master-screen .product-layout-card-header h2{color:#1A365D!important;font-size:14px!important;font-weight:800!important}.product-master-screen .product-layout-card-header small{color:#486581!important;font-size:10px!important}
      .product-master-screen .product-fiscal-code-lookup{display:flex;flex-direction:column;gap:4px;min-width:0}.product-master-screen .product-fiscal-code-lookup .product-inline-action-field{display:grid;grid-template-columns:minmax(0,11ch) 30px;gap:4px;align-items:center}.product-master-screen .product-fiscal-code-lookup input{width:14ch!important;max-width:14ch!important}.product-master-screen .product-fiscal-description,.product-master-screen .product-fiscal-search-message{font-size:9px;line-height:1.35;color:#486581;overflow-wrap:anywhere}
      .product-master-screen .product-fiscal-results{max-height:150px;overflow:auto;border:1px solid #C4CED9;background:#fff}.product-master-screen .product-fiscal-results button{display:block;width:100%;text-align:left;padding:6px 8px;border:0;border-bottom:1px solid #E5E7EB;background:#fff;color:#123B50;font-size:10px;cursor:pointer}
      .product-master-screen .product-fiscal-rates-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px;align-items:end}.product-master-screen .product-fiscal-rates-grid>*{min-width:0;flex:0 0 auto!important}.product-master-screen .product-fiscal-rates-grid input{width:100%!important;max-width:100%!important;height:30px!important}
      .product-master-screen .product-fiscal-primary-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;align-items:start!important}.product-master-screen .product-fiscal-secondary-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.product-master-screen .product-stock-primary-grid{grid-template-columns:minmax(0,16ch) minmax(0,16ch) minmax(0,16ch) minmax(180px,1fr)!important}.product-master-screen .product-stock-secondary-grid{grid-template-columns:minmax(0,16ch) repeat(3,minmax(0,1fr))!important}
      @media(max-width:760px){.product-master-screen .product-identification-reference-row{grid-template-columns:minmax(0,1fr)!important}.product-master-screen .product-fiscal-rates-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.product-master-screen .product-fiscal-primary-grid,.product-master-screen .product-fiscal-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.product-master-screen .product-stock-primary-grid,.product-master-screen .product-stock-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      .product-master-screen .product-inline-field{min-width:0}
      .product-master-screen .product-inline-field>label{display:grid!important;grid-template-columns:90px minmax(0,1fr)!important;grid-template-rows:30px!important;gap:5px!important;align-items:center!important;font-size:9px!important;font-weight:700!important}
      .product-master-screen .product-inline-field>label>span{min-width:0;line-height:11px!important;overflow-wrap:anywhere}
      .product-master-screen .product-inline-field input,.product-master-screen .product-inline-field select{height:30px!important;min-width:0;width:100%;padding:0 6px!important;font-size:11px!important;border-radius:2px!important}
      .product-master-screen .product-identification-card .product-code-field{max-width:255px}
      .product-master-screen .product-identification-card .product-code-field input{max-width:150px}
      .product-master-screen .product-identification-card .product-barcode-field{max-width:270px}
      .product-master-screen .product-identification-card .product-barcode-field input{max-width:155px}
      .product-master-screen .product-identification-card .product-description-field input{max-width:100%}
      .product-master-screen .product-identification-card .product-customer-name-field{max-width:390px}
      .product-master-screen .product-identification-card .product-customer-name-field input{max-width:245px}
      .product-master-screen .product-identification-card .product-customer-code-field{max-width:330px}
      .product-master-screen .product-identification-card .product-customer-code-field input{max-width:175px}
      .product-master-screen .product-operational-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 8px}
      .product-master-screen .product-operational-fields .product-inline-field>label{grid-template-columns:105px minmax(0,1fr)!important}
      .product-master-screen .product-inline-action-field{display:grid;grid-template-columns:minmax(0,1fr) 28px;gap:3px;min-width:0}
      .product-master-screen .product-mini-action{height:30px;width:28px;padding:0;border:1px solid #2D8DB8;background:#eaf6fa;color:#123B50;border-radius:2px;font-size:17px;line-height:1;cursor:pointer}
      .product-master-screen .product-mini-action:disabled{opacity:.5;cursor:not-allowed}
      .product-master-screen .product-operational-flags{display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid #e2edf1;margin-top:7px;padding-top:7px}
      .product-master-screen .product-operational-flags>label{display:flex;align-items:center;gap:5px;font-size:9px!important;color:#294a5b}
      .product-master-screen .product-operational-flags input{accent-color:#2D8DB8}
      .product-master-screen .product-attribute-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 8px}
      .product-master-screen .product-technical-note{display:grid;grid-template-columns:1fr!important;grid-template-rows:auto 48px!important;gap:4px!important}
      .product-master-screen .product-technical-note textarea{width:100%;min-width:0;box-sizing:border-box;font:11px Arial,sans-serif}

      .product-master-screen .product-quality-card-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}
      .product-master-screen .product-quality-card{min-width:0;border:1px solid #cbdbe4;border-radius:2px;background:#fff;padding:8px}
      .product-master-screen .product-quality-card-header{padding-bottom:6px;margin-bottom:7px;border-bottom:1px solid #d8e6ec}
      .product-master-screen .product-quality-card-header span{display:block;font-size:9px;font-weight:800;letter-spacing:.03em;color:#2D8DB8}
      .product-master-screen .product-quality-card-header small{display:block;margin-top:3px;font-size:9px;color:#617987}
      .product-master-screen .product-quality-trigger-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 8px;margin:4px 0 10px}
      .product-master-screen .product-quality-trigger-grid>label{display:flex;align-items:center;gap:5px;min-width:0;font-size:9px!important;color:#344054}
      .product-master-screen .product-quality-trigger-grid input{accent-color:#2D8DB8}
      .product-master-screen .product-quality-lookup{display:grid;grid-template-columns:minmax(0,1fr) 28px;gap:4px;margin-top:3px}
      .product-master-screen .product-quality-lookup-btn{height:30px;width:28px;display:grid;place-items:center;border:1px solid #2D8DB8;background:#eaf6fa;color:#123B50;border-radius:2px;padding:0}
      .product-master-screen .product-quality-parameter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 9px;align-items:end}
      .product-master-screen .product-quality-parameter-grid input{min-width:0}
      .product-master-screen .product-quality-existing-settings{display:grid;grid-template-columns:150px 180px;gap:8px;margin-top:8px;padding:7px;border:1px solid #d8e6ec;background:#f8fbfd}
      .product-master-screen .product-quality-existing-settings input,.product-master-screen .product-quality-existing-settings select{height:30px!important}
      @media(max-width:850px){.product-master-screen .product-quality-card-grid{grid-template-columns:1fr}}
      @media(max-width:520px){.product-master-screen .product-quality-trigger-grid,.product-master-screen .product-quality-parameter-grid{grid-template-columns:1fr}.product-master-screen .product-quality-existing-settings{grid-template-columns:1fr}}
      .product-master-screen .product-quality-note{margin:6px 0 0;font-size:9px;color:#617987}
      @media(max-width:1000px){.product-master-screen .product-general-card-grid{grid-template-columns:1fr}.product-master-screen .product-operational-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.product-master-screen .product-inline-field>label,.product-master-screen .product-operational-fields .product-inline-field>label{grid-template-columns:86px minmax(0,1fr)!important}.product-master-screen .product-operational-fields,.product-master-screen .product-attribute-grid{grid-template-columns:1fr}.product-master-screen .product-layout-card-header{align-items:flex-start;flex-direction:column}.product-master-screen .product-layout-card-header small{text-align:left}}

      /* Padrão visual industrial contratado: azul marinho, azul operacional e foco marfim. */
      .product-master-screen{background:#f4f6f9!important;color:#1a365d!important}
      .product-master-screen>header{background:#1a365d!important;border-bottom:2px solid #2b6cb0!important}
      .product-master-screen .product-layout-card,.product-master-screen .product-quality-card{border-color:#d2dbe6!important;border-radius:2px!important}
      .product-master-screen .product-layout-card-header span,.product-master-screen .product-section-heading span{color:#2b6cb0!important}
      .product-master-screen .product-layout-card-header h2,.product-master-screen h2{color:#1a365d!important}
      .product-master-screen .product-general-form{background:#f4f6f9!important}
      .product-master-screen .product-general-card-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important}
      .product-master-screen .product-layout-card{padding:10px!important}
      .product-master-screen label{font-family:"Segoe UI",Inter,Arial,sans-serif!important}
      .product-master-screen input:not([type=checkbox]):not([type=file]),.product-master-screen select,.product-master-screen textarea{font-family:Consolas,"Courier New",monospace!important;font-size:13px!important;border-radius:4px!important;border-color:#c6d0dc!important}
      .product-master-screen input:focus,.product-master-screen select:focus,.product-master-screen textarea:focus{background:#fffdf0!important;border:1px solid #2b6cb0!important;outline:1px solid #2b6cb0!important;outline-offset:0!important;box-shadow:0 0 0 1px rgba(43,108,176,.12)!important}
      /* Contrato industrial: largura física dos edits, com especificidade acima dos grids legados. */
      .product-master-screen input:not([type="checkbox"]):not([type="file"]),.product-master-screen select,.product-master-screen textarea{display:inline-block!important;box-sizing:border-box!important;max-width:450px!important}
      .product-master-screen input.edit-2,.product-master-screen select.edit-2{width:6ch!important;max-width:6ch!important;text-align:center!important}
      .product-master-screen input.edit-3,.product-master-screen select.edit-3{width:7ch!important;max-width:7ch!important;text-transform:uppercase}
      .product-master-screen input.edit-4,.product-master-screen select.edit-4{width:8ch!important;max-width:8ch!important;text-align:right!important}
      .product-master-screen input.edit-6,.product-master-screen select.edit-6{width:11ch!important;max-width:11ch!important;text-transform:uppercase}
      .product-master-screen input.edit-7,.product-master-screen select.edit-7{width:11ch!important;max-width:11ch!important}
      .product-master-screen input.edit-8,.product-master-screen select.edit-8{width:14ch!important;max-width:14ch!important}
      .product-master-screen input.edit-10,.product-master-screen select.edit-10{width:14ch!important;max-width:14ch!important}
      .product-master-screen input.edit-12,.product-master-screen select.edit-12{width:18ch!important;max-width:18ch!important;text-align:right!important}
      .product-master-screen input.edit-14,.product-master-screen select.edit-14{width:18ch!important;max-width:18ch!important;text-align:right!important}
      .product-master-screen input.edit-15,.product-master-screen select.edit-15{width:17ch!important;max-width:17ch!important}
      .product-master-screen input.edit-20,.product-master-screen select.edit-20{width:26ch!important;max-width:26ch!important}
      .product-master-screen input.edit-60,.product-master-screen select.edit-60,.product-master-screen textarea.edit-60{width:100%!important;max-width:280px!important}
      .product-master-screen input.edit-120,.product-master-screen select.edit-120,.product-master-screen textarea.edit-120{width:100%!important;max-width:450px!important}
      .product-master-screen input[type="number"]{text-align:right!important}
      .product-master-screen .product-quality-lookup-btn,.product-master-screen .product-mini-action{border-color:#2b6cb0!important;color:#1a365d!important;background:#edf4fc!important;border-radius:2px!important}
      .product-master-screen .product-quality-lookup-btn:hover,.product-master-screen .product-mini-action:hover{background:#dceafe!important}
      .product-master-screen .product-screen-tabs button[style*="border-bottom: 3px solid"]{border-bottom-color:#2b6cb0!important}
      .product-master-screen .product-screen-tabs button{font-family:monospace!important}
      .product-master-screen .product-list-panel thead th{background:#1a365d!important;color:#fff!important}
      @media(max-width:1000px){.product-master-screen .product-general-card-grid{grid-template-columns:1fr!important}}
      @media print{
        body{background:#fff!important}
        .product-master-screen{max-width:none!important;background:#fff!important;color:#111827!important}
        .product-master-screen>header>div:last-child,.product-master-screen .product-selected-summary,.product-master-screen .product-screen-tabs,.product-master-screen .product-list-panel,.product-master-screen .product-audit-panel,.product-master-screen>footer,.product-master-screen [role=dialog]{display:none!important}
        .product-master-screen>header{background:#fff!important;color:#111827!important;border-bottom:2px solid #1a365d!important;padding:0 0 8px!important}
        .product-master-screen>header h1,.product-master-screen>header div{color:#111827!important}
        .product-master-screen>section{margin:0!important;border:0!important;box-shadow:none!important}
        .product-master-screen .product-general-form{padding:0!important;background:#fff!important}
        .product-master-screen .product-layout-card,.product-master-screen .product-quality-card{break-inside:avoid;box-shadow:none!important}
      }

      .product-master-screen{background:#f4f6f9!important;color:#1a365d!important;font-family:"Segoe UI",Inter,Arial,sans-serif!important}
      .product-master-screen .product-general-form{background:#f4f6f9!important;padding:12px!important}
      .product-master-screen .product-general-card-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;align-items:start!important}
      .product-master-screen .product-layout-card{background:#fff!important;border:1px solid #cbd5e1!important;border-radius:6px!important;padding:12px!important;min-width:0!important;box-shadow:0 1px 2px rgba(15,23,42,.04)!important}
      .product-master-screen .product-layout-card-header{border-bottom:1px solid #e2e8f0!important;padding-bottom:8px!important;margin-bottom:10px!important}
      .product-master-screen .product-layout-card-header h2{font-family:"Segoe UI",Inter,Arial,sans-serif!important;color:#1a365d!important;font-size:14px!important;font-weight:700!important}
      .product-master-screen .product-inline-fields{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
      .product-master-screen .product-inline-field{display:flex!important;align-items:center!important;flex:0 0 auto!important;min-width:0!important;height:auto!important;width:100%!important}
      .product-master-screen .product-inline-field>label{display:flex!important;flex-direction:row!important;align-items:center!important;gap:10px!important;width:100%!important;min-width:0!important;white-space:nowrap!important}
      .product-master-screen .product-inline-field>label>span{flex:0 0 160px!important;min-width:160px!important;font-family:"Segoe UI",Inter,Arial,sans-serif!important;font-size:11px!important;font-weight:600!important;color:#475569!important;white-space:nowrap!important;line-height:1.2!important;overflow-wrap:normal!important}
      .product-master-screen .product-inline-field input,.product-master-screen .product-inline-field select,.product-master-screen .product-inline-action-field input,.product-master-screen .product-inline-action-field select,.product-master-screen .product-inline-action-field button{height:32px!important;min-height:32px!important;box-sizing:border-box!important;border-radius:4px!important}
      .product-master-screen input.edit-2,.product-master-screen select.edit-2{display:inline-block!important;flex:0 0 auto!important;width:6ch!important;max-width:6ch!important;text-align:center!important}
      .product-master-screen input.edit-3,.product-master-screen select.edit-3{display:inline-block!important;flex:0 0 auto!important;width:7ch!important;max-width:7ch!important;text-transform:uppercase!important}
      .product-master-screen input.edit-4,.product-master-screen select.edit-4{display:inline-block!important;flex:0 0 auto!important;width:8ch!important;max-width:8ch!important;text-align:right!important}
      .product-master-screen input.edit-6,.product-master-screen select.edit-6{display:inline-block!important;flex:0 0 auto!important;width:11ch!important;max-width:11ch!important}
      .product-master-screen input.edit-8,.product-master-screen select.edit-8{display:inline-block!important;flex:0 0 auto!important;width:14ch!important;max-width:14ch!important}
      .product-master-screen input.edit-12,.product-master-screen select.edit-12{display:inline-block!important;flex:0 0 auto!important;width:18ch!important;max-width:18ch!important;text-align:right!important}
      .product-master-screen input.edit-14,.product-master-screen select.edit-14{display:inline-block!important;flex:0 0 auto!important;width:18ch!important;max-width:18ch!important}
      .product-master-screen input.edit-20,.product-master-screen select.edit-20{display:inline-block!important;flex:0 0 auto!important;width:26ch!important;max-width:26ch!important}
      .product-master-screen input.edit-60,.product-master-screen select.edit-60{display:inline-block!important;flex:0 0 auto!important;width:60ch!important;max-width:min(100%,280px)!important}
      .product-master-screen input.edit-120,.product-master-screen select.edit-120{display:inline-block!important;flex:0 1 450px!important;width:100%!important;max-width:450px!important}
      .product-master-screen .product-identification-reference-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:12px!important;align-items:center!important;width:100%!important}
      .product-master-screen .product-identification-reference-row>.product-inline-field{width:100%!important;min-width:0!important}
      .product-master-screen .product-identification-reference-row>.product-inline-field>label{gap:8px!important}
      .product-master-screen .product-identification-reference-row>.product-inline-field>label>span{flex:0 0 120px!important;min-width:120px!important}
      .product-master-screen .product-identification-reference-row input.edit-20{width:26ch!important;max-width:26ch!important}
      .product-master-screen .product-identification-flags{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:20px!important;flex-wrap:wrap!important;margin-top:12px!important;padding:10px 0 0 160px!important;border-top:1px solid #e2e8f0!important}
      .product-master-screen .product-identification-flags>label{display:inline-flex!important;align-items:center!important;gap:6px!important;white-space:nowrap!important;font-family:"Segoe UI",Inter,Arial,sans-serif!important;font-size:11px!important;font-weight:600!important;color:#475569!important}
      .product-master-screen .product-identification-flags input[type="checkbox"]{width:14px!important;height:14px!important;flex:0 0 14px!important;accent-color:#2b6cb0!important}
      .product-master-screen .product-fiscal-code-lookup{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:4px!important;min-width:0!important}
      .product-master-screen .product-fiscal-code-lookup .product-inline-action-field{display:flex!important;align-items:center!important;flex:0 0 auto!important;gap:0!important}
      .product-master-screen .product-fiscal-code-lookup input.edit-8{width:14ch!important;max-width:14ch!important;flex:0 0 auto!important}
      .product-master-screen .product-inline-action-field button{flex:0 0 32px!important;width:32px!important;min-width:32px!important;padding:0!important}
      .product-master-screen .product-form-grid label{font-family:"Segoe UI",Inter,Arial,sans-serif!important;font-size:11px!important;font-weight:600!important;color:#475569!important}
      .product-master-screen .product-form-grid label>span{white-space:nowrap!important;overflow-wrap:normal!important}
      @media(max-width:1100px){.product-master-screen .product-general-card-grid{grid-template-columns:minmax(0,1fr)!important}}
      @media(max-width:900px){.product-master-screen .product-inline-field>label>span{flex-basis:130px!important;min-width:130px!important}.product-master-screen .product-identification-reference-row{grid-template-columns:minmax(0,1fr)!important}.product-master-screen .product-identification-flags{padding-left:0!important}}
      @media(max-width:560px){.product-master-screen .product-inline-field>label{align-items:flex-start!important;flex-direction:column!important;gap:3px!important}.product-master-screen .product-inline-field>label>span{flex-basis:auto!important;min-width:0!important}.product-master-screen .product-identification-reference-row>.product-inline-field>label>span{flex-basis:auto!important;min-width:0!important}.product-master-screen input.edit-120{max-width:100%!important}}

    `}
</style>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'6px 8px',borderBottom:'1px solid #d6dde6',background:'#fff',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:900,color:'#1c4bb5'}}>CADASTROS • PRODUTOS</div><h1 style={{margin:'2px 0 0',fontSize:15,color:'#123B50'}}>Cadastro de Produtos</h1></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <button type="button" onClick={newProduct} style={btn('primary')}><Plus size={16}/>Novo</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} style={{display:'none'}} />
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>choosePhoto(e)} style={{display:'none'}} />
        <button type="button" onClick={()=>importRef.current?.click()} disabled={busy} style={btn('normal')}><FileSpreadsheet size={13}/>Importar Excel</button>
        <button type="button" onClick={()=>window.print()} style={btn('normal')}><Printer size={13}/>Imprimir tela</button>

        <button type="button" className="erp-edit-button" onClick={()=>setEditing(true)} disabled={!selectedId} style={btn('normal')}><Edit3 size={16}/>Editar</button>
        <button type="button" onClick={()=>void save()} disabled={!editing||busy} style={btn('normal')}><Save size={16}/>Salvar</button>
        <button type="button" onClick={cancelEdit} style={btn('normal')}><RotateCcw size={16}/>Cancelar</button>
        {!editing&&selectedId&&<button type="button" onClick={openTechnicalPrint} disabled={busy} style={btn('normal')}><Printer size={16}/>Imprimir</button>}
        <button type="button" onClick={()=>void deactivate()} disabled={!selectedId||busy} style={btn('danger')}><Trash2 size={16}/>Inativar</button>
        <button type="button" onClick={()=>{setSelectedId(null);setEditing(false);setForm(empty())}} style={btn('normal')}><X size={16}/>Fechar</button>
      </div>
    </header>

    {(message||error)&&<div role="alert" style={{margin:10,padding:'9px 12px',borderRadius:6,border:'1px solid '+(error?'#fecaca':'#bbf7d0'),background:error?'#fff1f2':'#f0fdf4',color:error?'#b91c1c':'#166534',fontWeight:800,fontSize:12}}>{error||message}</div>}

    {selectedId&&<><section className="product-selected-summary" style={{...panel,margin:'10px 10px 0',padding:7,display:'grid',gridTemplateColumns:'72px minmax(0,1fr) auto',gap:9,alignItems:'center',background:'#fff'}}>
      <div style={{width:72,height:60,border:'1px solid #cbd5e1',background:'#f8fafc',display:'grid',placeItems:'center',overflow:'hidden'}}>{form.foto_url?<img src={normalizePhotoUrl(form.foto_url)||undefined} alt="Foto do produto" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<ImageIcon size={22} color="#98a2b3"/>}</div>
      <div style={{minWidth:0}}><div style={{fontSize:9,fontWeight:700,color:'#667085',textTransform:'uppercase'}}>Produto selecionado</div><div style={{fontSize:13,fontWeight:700,color:'#123B50',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.codigo||'AUTOMÁTICO'} • {form.nome||'Sem descrição'}</div><div style={{fontSize:9,color:'#667085',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{form.descricao_resumida||'Sem descrição resumida'} · {form.grupo||'Sem grupo'} · {form.marca||'Sem marca'}</div></div>
      <div style={{display:'flex',gap:12,alignItems:'center',fontSize:9}}><span><b>ESTOQUE</b> {fmt(form.estoque_atual)} {form.unidade}</span><span><b>STATUS</b> {form.ativo?'ATIVO':'INATIVO'}</span></div>
    </section></>}

    <section style={{...panel,margin:10,overflow:'hidden'}}>
      <div className="product-screen-tabs" style={{display:'flex',borderBottom:'1px solid #d6dde6',background:'#f7f9fc',overflowX:'auto'}}>
        {tabItems.map(([id,title,Icon])=><button key={id} type="button" onClick={()=>{setTab(id);if(selectedId)void loadDetails()}} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 10px',border:0,borderBottom:tab===id?'3px solid #184bb4':'3px solid transparent',background:tab===id?'#fff':'transparent',color:tab===id?'#184bb4':'#344054',fontWeight:900,fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}><Icon size={14}/>{title}</button>)}
      </div>

      {tab==='gerais'&&<form onSubmit={save} className="product-general-form">
        <div className="product-general-card-grid">
          <section className="product-layout-card product-identification-card">
            <header className="product-layout-card-header"><div><span>🏢 01 / IDENTIFICAÇÃO</span><h2>Identificação do produto</h2></div><small>Dados básicos e comerciais</small></header>
            <div className="product-inline-fields product-identification-fields">
              <div className="product-inline-field product-code-field">{field('Código','codigo','text',1,true)}</div>
              <div className="product-inline-field product-barcode-field">{field('Cód. barras','codigo_barras')}</div>
              <div className="product-inline-field product-description-field">{field('Descrição','nome')}</div>
              <div className="product-identification-reference-row">
                <div className="product-inline-field product-customer-code-field">{field('Referência Cliente','referencia_cliente')}</div>
                <div className="product-inline-field product-customer-name-field">{field('Referência Interna','referencia_interna')}</div>
              </div>
            </div>
            <div className="product-operational-flags product-identification-flags">
              {check('Fabricado','fabricado')}{check('Comprado','comprado')}{check('Revenda','revenda')}
            </div>
          </section>

          <section className="product-layout-card product-operational-card">
            <header className="product-layout-card-header"><div><span>📦 03 / CLASSIFICAÇÃO OPERACIONAL</span><h2>Uso do item no ERP</h2></div><small>Classificação, unidades e planejamento</small></header>
            <div className="product-operational-fields">
              <div className="product-inline-field product-item-type-field">{select('Tipo item','categoria',[['Produto acabado','Produto acabado'],['MATÉRIA-PRIMA','Matéria-prima'],['PRENSADOS','Prensados'],['INJETADOS','Injetados'],['Componente','Componente'],['Insumo','Insumo'],['ALMOXARIFADO','Almoxarifado'],['MATERIAL DE ESCRITÓRIO','Material de escritório'],['PRODUTOS DE LIMPEZA','Produtos de limpeza']])}</div>
              <div className="product-inline-field product-group-field"><label style={label}>Família / Grupo
                <div className="product-inline-action-field"><select value={form.grupo||''} disabled={!editing} onChange={e=>update('grupo',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}><option value="">Selecione</option>{groups.map(g=><option key={g.id} value={g.nome}>{g.nome}</option>)}</select><button type="button" title="Pesquisar grupo" aria-label="🔍 LUPA grupo" disabled={!editing} onClick={()=>void openProductionLookup('grupo')} className="product-mini-action">🔍</button></div>
              </label></div>
              <div className="product-inline-field product-subgroup-field"><label style={label}>Subgrupo
                <div className="product-inline-action-field"><input className="edit-6" list="erp-product-subgroups" value={form.subgrupo||''} maxLength={6} disabled={!editing} onChange={e=>update('subgrupo',e.target.value||null)} placeholder="Selecionar" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><button type="button" title="Adicionar subgrupo" aria-label="Adicionar subgrupo" disabled={!editing} onClick={()=>{const value=window.prompt('Nome do subgrupo (até 6 caracteres):')?.trim();if(value)update('subgrupo',value.slice(0,6))}} className="product-mini-action">＋</button></div>
                <datalist id="erp-product-subgroups">{Array.from(new Set(products.map(p=>p.subgrupo).filter((v):v is string=>Boolean(v?.trim())))).sort((a,b)=>a.localeCompare(b)).map(v=><option key={v} value={v}/>)}</datalist>
              </label></div>
              <div className="product-inline-field">{select('Unid. estoque','unidade',[['UN','UN'],['PC','PC'],['KG','KG'],['G','G'],['M','M'],['CM','CM'],['MM','MM'],['L','L'],['ML','ML'],['CX','CX'],['PAR','PAR']])}</div>
              <div className="product-inline-field">{select('Unid. comercial','unidade_venda',[['UN','UN'],['PC','PC'],['KG','KG'],['G','G'],['M','M'],['CM','CM'],['L','L'],['ML','ML'],['CX','CX'],['PAR','PAR']])}</div>
              <div className="product-inline-field">{select('Unid. compras','unidade_compra',[['UN','UN'],['PC','PC'],['KG','KG'],['G','G'],['M','M'],['CM','CM'],['L','L'],['ML','ML'],['CX','CX'],['PAR','PAR']])}</div>
              <div className="product-inline-field product-supplier-field"><label style={label}>FORNECEDOR PADRÃO<div className="product-inline-action-field"><select value={form.fornecedor_padrao_id||''} disabled={!editing} onChange={e=>update('fornecedor_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f1f4f8'}}><option value="">Selecione</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.razao_social}{s.nome_fantasia?' · '+s.nome_fantasia:''}</option>)}</select><button type="button" className="product-mini-action" disabled={!editing} title="🔍 LUPA fornecedor" onClick={()=>void openProductionLookup('fornecedor')}>🔍</button></div></label></div>
              <div className="product-inline-field">{field('Lead time (dias)','prazo_producao_dias','number')}</div>
              <div className="product-inline-field">{field('Estoque mínimo / reposição','ponto_reposicao','number')}</div>
              <div className="product-inline-field">{field('Estoque máximo','estoque_maximo','number')}</div>
            </div>

          </section>

          <section className="product-layout-card product-fiscal-card">
            <header className="product-layout-card-header"><div><span>🔬 04 / ATRIBUTOS & FISCAL</span><h2>Pesos e classificação fiscal</h2></div></header>
            <div className="product-attribute-grid">
              <div className="product-inline-field">{field('Peso líquido (kg)','peso_liquido','number')}</div>
              <div className="product-inline-field">{field('NCM','ncm')}</div>
              <div className="product-inline-field">{field('Peso bruto (kg)','peso_bruto','number')}</div>
              <div className="product-inline-field">{field('CEST','cest')}</div>
            </div>
          </section>

          <section className="product-layout-card product-technical-card">
            <header className="product-layout-card-header"><div><span>📝 05 / OBSERVAÇÃO TÉCNICA</span><h2>Notas do produto</h2></div></header>
            <label className="product-technical-note" style={label}>Observação técnica resumida
              <textarea className="edit-120" value={String(form.observacoes??'')} maxLength={250} disabled={!editing} onChange={e=>update('observacoes',e.target.value||null)} rows={2} style={{width:'100%',height:48,resize:'vertical',padding:'5px 7px',border:'1px solid #b9ced9',borderRadius:2,font:'11px Arial,sans-serif',background:editing?'#fff':'#f5f7fa',color:'#123B50',boxSizing:'border-box'}}/>
            </label>
            <p className="product-quality-note">💡 Especificação técnica completa: aba QUALIDADE.</p>
          </section>
        </div>
      </form>}

            {tab==='fiscal'&&<section style={{padding:8}}>
        <div className="product-form-grid product-fiscal-primary-grid" style={{display:'grid',gridTemplateColumns:'minmax(95px,.55fr) minmax(170px,1.25fr) minmax(120px,.8fr) minmax(125px,.85fr) minmax(125px,.85fr)',gap:8,alignItems:'end'}}>
          {select('Situação','ativo',[['true','Ativo'],['false','Inativo']])}
          {select('Origem [?]','origem',[['0 - Nacional','0 - Nacional'],['1 - Estrangeira - Importação direta','1 - Estrangeira - Importação direta'],['2 - Estrangeira - mercado interno','2 - Estrangeira - mercado interno'],['3 - Nacional, conteúdo importação >40% e <70%','3 - Nacional, conteúdo importação >40% e <70%'],['4 - Nacional, processo produtivo básico','4 - Nacional, processo produtivo básico'],['5 - Nacional, conteúdo importação <40%','5 - Nacional, conteúdo importação <40%'],['6 - Estrangeira - importação direta, sem similar nacional','6 - Estrangeira - importação direta, sem similar nacional'],['7 - Estrangeira - mercado interno, sem similar nacional','7 - Estrangeira - mercado interno, sem similar nacional'],['8 - Nacional, conteúdo importação >70%','8 - Nacional, conteúdo importação >70%']])}
          <div className="product-fiscal-code-lookup">
            <label style={label}>NCM <HelpTip text={helpFor('NCM')}/></label>
            <div className="product-inline-action-field"><input className="edit-8" maxLength={8} value={String(form.ncm||'')} disabled={!editing} onChange={e=>{update('ncm',e.target.value.replace(/\D/g,'').slice(0,8));setNcmDescription('');setNcmSearchMessage('');setNcmOptions([])}} onBlur={()=>void lookupNcmCode()} placeholder="NCM (8 dígitos)" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><button type="button" className="product-mini-action" disabled={!editing||ncmBusy} title="Consultar NCM por código ou descrição" aria-label="Consultar NCM" onClick={()=>{setFiscalCodeLookup('ncm');setFiscalCodeQuery(String(form.ncm||form.nome||''));setFiscalCodeModalOpen(true);if(String(form.ncm||form.nome||'').trim())void searchNcm()}}>⌕</button></div>
            {ncmDescription&&<small className="product-fiscal-description">{ncmDescription}</small>}{ncmSearchMessage&&<small className="product-fiscal-search-message">{ncmSearchMessage}</small>}
            {ncmOptions.length>0&&<div className="product-fiscal-results">{ncmOptions.slice(0,20).map(item=><button key={item.codigo} type="button" onClick={()=>{update('ncm',item.codigo);setNcmDescription(item.descricao);setNcmOptions([]);setNcmSearchMessage('NCM selecionado. Confirme antes de salvar.')}}><strong>{item.codigo}</strong> — {item.descricao}</button>)}</div>}
          </div>
          <div className="product-fiscal-code-lookup"><label style={label}>CEST <HelpTip text={helpFor('CEST')}/></label><div className="product-inline-action-field"><input className="edit-8" maxLength={7} value={String(form.cest||'')} disabled={!editing} onChange={e=>update('cest',e.target.value.replace(/\D/g,'').slice(0,7))} placeholder="CEST" style={{...input,background:editing?'#fff':'#f5f7fa'}}/><button type="button" className="product-mini-action" disabled={!editing} title="Consultar CEST cadastrado" aria-label="Consultar CEST" onClick={()=>{setFiscalCodeLookup('cest');setFiscalCodeQuery('');setFiscalCodeModalOpen(true)}}>⌕</button></div></div>
          {fiscalCombo('CST ICMS [?]','cst_icms')}
        </div>
        <div className="product-form-grid product-fiscal-secondary-grid" style={{display:'grid',gridTemplateColumns:'minmax(110px,.8fr) minmax(105px,.8fr) minmax(105px,.8fr) minmax(125px,1fr) repeat(4,minmax(58px,.38fr))',gap:8,marginTop:8,alignItems:'end'}}>
          {fiscalCombo('CSOSN [?]','csosn')}{fiscalCombo('CFOP entrada [?]','cfop_entrada')}{fiscalCombo('CFOP saída [?]','cfop_saida')}{fiscalCombo('Origem fiscal [?]','origem_fiscal')}{field('ICMS %','aliquota_icms','number')}{field('IPI %','aliquota_ipi','number')}{field('PIS %','aliquota_pis','number')}{field('COFINS %','aliquota_cofins','number')}
        </div>
        <div className="product-fiscal-rates-grid"></div><div style={{marginTop:7,fontSize:9,color:'#486581'}}>Use o ? para consultar o significado da sigla/código antes de preencher. NCM e CEST permanecem exclusivamente nesta aba Fiscal.</div>
      </section>}

            {tab==='estoque'&&<section style={{padding:10}}>
        <div className="product-stock-primary-grid" style={{display:'grid',gridTemplateColumns:'82px 82px 120px 1fr',gap:7,alignItems:'end'}}>
          <label style={label}>ESTOQUE ATUAL <span style={{fontSize:8,color:'#667085'}}>calculado</span><input value={fmt(form.estoque_atual)+' '+form.unidade} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>PONTO DE REPOSIÇÃO <HelpTip text={helpFor('Ponto de reposição')}/></span><input type="number" value={String(form.ponto_reposicao??0)} disabled={!editing} onChange={e=>update('ponto_reposicao',n(e.target.value))} title="Quantidade que dispara a necessidade de reposição; não é estoque atual." style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}>ESTOQUE MÁXIMO<input type="number" value={String(form.estoque_maximo??0)} disabled={!editing} onChange={e=>update('estoque_maximo',n(e.target.value))} style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
          <label style={label}><span style={{display:'inline-flex',alignItems:'center'}}>LOCALIZAÇÃO PADRÃO <HelpTip text={helpFor('Localização padrão')}/></span><div className="product-inline-action-field"><select value={form.localizacao_padrao_id||''} disabled={!editing} onChange={e=>update('localizacao_padrao_id',e.target.value||null)} style={{...input,background:editing?'#fff':'#f1f4f8'}}><option value="">Selecione</option>{locations.map(l=><option value={l.id} key={l.id}>{l.codigo} • {l.nome}{l.tipo?' • '+l.tipo:''}</option>)}</select><button type="button" className="product-mini-action" disabled={!editing} title="🔍 LUPA localização" onClick={()=>void openProductionLookup('localizacao')}>🔍</button></div></label>
        </div>
        <div className="product-stock-secondary-grid" style={{display:'grid',gridTemplateColumns:'82px 105px 105px 170px',gap:7,marginTop:7,alignItems:'end'}}>
          {field('VALIDADE LOTE [dias] [?]','lote_validade_dias','number')}{check('Controla lote','controla_lote')}{check('Controla série','controla_serie')}{check('Permite estoque negativo','permite_estoque_negativo')}
        </div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>MOVIMENTAÇÕES RECENTES</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Data','Tipo','Quantidade','Origem','Documento','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #d9e1ea',fontSize:10}}>{h}</th>)}</tr></thead><tbody>{movements.map(m=><tr key={m.id}><td style={{padding:8,fontSize:11}}>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td style={{padding:8,fontSize:11}}>{m.tipo}</td><td style={{padding:8,fontSize:11,fontWeight:900}}>{fmt(m.quantidade)}</td><td style={{padding:8,fontSize:11}}>{m.origem||'—'}</td><td style={{padding:8,fontSize:11}}>{m.documento||'—'}</td><td style={{padding:8,fontSize:11}}>{m.observacao||'—'}</td></tr>)}{!movements.length&&emptyRow('Nenhuma movimentação registrada para este produto.',6)}</tbody></table></div>
      </section>}

      {tab==='producao'&&<section style={{padding:10}}>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8,alignItems:'stretch'}}>
          <section className="product-quality-card">
            <header className="product-quality-card-header"><div><span>⚙️ 05.A / ROTEIRO E ENGENHARIA</span><small>Vínculos técnicos com a estrutura do item</small></div></header>
            <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:7}}>
              {([['CÓD. ROTEIRO PADRÃO','roteiro_padrao_codigo','roteiro',10],['CÓD. ESTRUTURA (BOM)','estrutura_bom_codigo','bom',15]] as const).map(([title,key,kind,max])=><label key={key} style={label}>{title}<div className="product-quality-lookup"><input className={max===10?'edit-10':'edit-15'} value={String(form[key]??'')} maxLength={max} disabled={!editing} onChange={e=>update(key,e.target.value||null)} style={{...input,maxWidth:(max+2)+'ch',background:editing?'#fff':'#f1f4f8'}}/><button type="button" className="product-quality-lookup-btn" disabled={!editing} title={'Consultar '+title.toLowerCase()} onClick={()=>void openProductionLookup(kind)}><Search size={13}/></button></div></label>)}
              <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8}}>{check('Permite subcontrato','permite_subcontrato')}{check('Requer rastreabilidade','requer_rastreabilidade')}</div>
              {select('TIPO DE ABASTECIMENTO','tipo_abastecimento',[['PULL','PULL'],['PUSH','PUSH']])}
            </div>
          </section>
          <section className="product-quality-card">
            <header className="product-quality-card-header"><div><span>🏭 05.B / CHÃO DE FÁBRICA & WIP</span><small>Regras operacionais e capacidade do processo</small></div></header>
            <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:7}}>
              {([['ALMOXARIFADO WIP','almoxarifado_wip_codigo','wip',6],['CENTRO DE TRABALHO','centro_trabalho_codigo','centro',8]] as const).map(([title,key,kind,max])=><label key={key} style={label}>{title}<div className="product-quality-lookup"><input value={String(form[key]??'')} maxLength={max} disabled={!editing} onChange={e=>update(key,e.target.value||null)} style={{...input,maxWidth:(max+2)+'ch',background:editing?'#fff':'#f5f7fa'}}/><button type="button" className="product-quality-lookup-btn" disabled={!editing} title={'Consultar '+title.toLowerCase()} onClick={()=>void openProductionLookup(kind)}><Search size={13}/></button></div></label>)}
              <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8}}>{field('TEMPO SETUP (MIN)','tempo_setup_min','number')}{field('CAPACIDADE POR CICLO','capacidade_ciclo','number')}</div>
              {check('Enviar alerta de máquina','alerta_maquina')}
            </div>
          </section>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'82px 82px 82px 82px 120px 120px max-content',gap:7,alignItems:'end',marginTop:9,padding:'8px 0',borderTop:'1px solid #d5dde7'}}>
          {field('PRAZO COMPRA (dias)','prazo_compra_dias','number')}{field('PRAZO PRODUÇÃO (dias)','prazo_producao_dias','number')}{field('CUSTO FABRICAÇÃO','custo_fabricacao','number',1,true)}{field('TOLERÂNCIA (%)','tolerancia_percentual','number')}
          <label style={label}>FICHA ATIVA<input value={productionFicha?('REV. '+(productionFicha.revisao||productionFicha.versao)):'Não cadastrada'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}}/></label>
          <label style={label}>RENDIMENTO<input value={productionFicha?fmt(productionFicha.rendimento)+' '+productionFicha.unidade_rendimento:'—'} readOnly style={{...input,background:'#eaf3f8',color:'#17445A'}}/></label>
          <button type="button" onClick={()=>{window.location.href='/ficha-engenharia?produto='+encodeURIComponent(selectedId||'')}} style={{...btn('normal'),width:'max-content',maxWidth:'100%',whiteSpace:'nowrap',padding:'0 8px',fontSize:10}}>ABRIR FICHA DE PROCESSO</button>
        </div>
        <div style={{marginTop:8,border:'1px solid #d5dde7',overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Seq.','Operação','Máquina','Setup min','Ciclo s','Qtde/h','Qtde/dia'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{productionOps.map(o=><tr key={o.id} style={{borderBottom:'1px solid #e5e7eb'}}><td style={{padding:'5px 6px'}}>{o.sequencia}</td><td style={{padding:'5px 6px'}}>{o.operacao}</td><td style={{padding:'5px 6px'}}>{o.maquina_codigo?o.maquina_codigo+' • '+(o.maquina_nome||''):'Não definida'}</td><td style={{padding:'5px 6px'}}>{fmt(o.setup_min)}</td><td style={{padding:'5px 6px'}}>{fmt(o.ciclo_seg)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_hora==null?'—':fmt(o.capacidade_hora)}</td><td style={{padding:'5px 6px'}}>{o.capacidade_dia==null?'—':fmt(o.capacidade_dia)}</td></tr>)}{!productionOps.length&&<tr><td colSpan={7} style={{padding:12,textAlign:'center',color:'#667085'}}>Nenhuma operação cadastrada. Abra a ficha de processo para cadastrar máquina/posto, setup, ciclo e instruções.</td></tr>}</tbody></table></div>
        <div style={{marginTop:7,fontSize:9,color:'#667085'}}>Roteiros, BOM, almoxarifados e centros de trabalho consultam os cadastros do tenant ativo; os parâmetros deste formulário são gravados no produto.</div>
      </section>}

      {tab==='producao'&&<AbaProducaoIndustrial productId={selectedId} empresaId={companyId} />}

      {tab==='qualidade'&&<section style={{padding:10}}>
        <div className="product-quality-card-grid">
          <section className="product-quality-card">
            <header className="product-quality-card-header"><div><span>🛡️ 04.A / GATILHOS DE INSPEÇÃO</span><small>Critérios de retenção e verificação do produto</small></div></header>
            <div className="product-quality-trigger-grid">
              {check('Inspeção na entrada','inspecao_entrada')}
              {check('Inspeção na produção','inspecao_producao')}
              {check('Inspeção na entrega','inspecao_entrega')}
              {check('Requer quarentena','requer_quarentena')}
            </div>
            <label style={label}>CÓD. MODELO DE INSPEÇÃO
              <div className="product-quality-lookup"><input className="edit-10" value={String(form.modelo_inspecao_codigo??'')} maxLength={10} disabled={!editing} onChange={e=>update('modelo_inspecao_codigo',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}/><button type="button" className="product-quality-lookup-btn" disabled={!editing} title="Pesquisar modelo de inspeção" onClick={()=>void openProductionLookup('template_inspec')}><Search size={13}/></button></div>
            </label>
          </section>
          <section className="product-quality-card">
            <header className="product-quality-card-header"><div><span>🔬 04.B / PARÂMETROS E CRITÉRIOS DE TESTE</span><small>Limites técnicos de aceitação</small></div></header>
            <div className="product-quality-parameter-grid">
              <label style={label}>AMOSTRAGEM AQL<input className="edit-6" value={String(form.amostragem_aql??'')} maxLength={6} disabled={!editing} onChange={e=>update('amostragem_aql',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}/></label>
              <label style={label}>TIPO DE MEDIÇÃO<div className="product-quality-lookup"><input className="edit-15" value={String(form.tipo_medicao_qualidade??'')} maxLength={15} disabled={!editing} onChange={e=>update('tipo_medicao_qualidade',e.target.value||null)} style={{...input,background:editing?'#fff':'#f5f7fa'}}/><button type="button" className="product-quality-lookup-btn" disabled={!editing} title="Pesquisar tipo de medição" onClick={()=>void openProductionLookup('tipo_medicao')}><Search size={13}/></button></div></label>
              {field('Valor mínimo','valor_minimo_qualidade','number')}
              {field('Valor máximo','valor_maximo_qualidade','number')}
              <label style={label}>UNIDADE DE MEDIDA QC<input className="edit-3" value={String(form.unidade_medida_qualidade??'')} maxLength={3} disabled={!editing} onChange={e=>update('unidade_medida_qualidade',e.target.value.toUpperCase().slice(0,3)||null)} style={{...input,background:editing?'#fff':'#f5f7fa',textTransform:'uppercase'}}/></label>
            </div>
          </section>
        </div>
        <div className="product-quality-existing-settings">
          {select('INSPEÇÃO OBRIGATÓRIA (REGRA ATUAL)','inspecao_qualidade_obrigatoria',[['true','Sim'],['false','Não']])}
          {field('NÍVEL DE QUALIDADE','nivel_qualidade')}
        </div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>04.C / HISTÓRICO REAL DE INSPEÇÕES E LAUDOS</h2>
        <div style={{overflowX:'auto',border:'1px solid #d5dde7'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}>
            <thead><tr style={{background:'#123B50',color:'#fff'}}>{['Data do ensaio','Tipo','Ordem de produção','Inspecionada','Aprovada','Reprovada','Resultado','Responsável técnico','Ação de bloqueio'].map(h=><th key={h} style={{padding:'6px',textAlign:'left',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>{qualityInspections.map(item=><tr key={item.id} style={{borderBottom:'1px solid #e5e7eb'}}>
              <td style={{padding:'6px',whiteSpace:'nowrap'}}>{new Date(item.created_at).toLocaleString('pt-BR')}</td><td style={{padding:'6px'}}>{item.tipo}</td><td style={{padding:'6px'}}>{item.ordem_producao_id||'—'}</td>
              <td style={{padding:'6px',textAlign:'right'}}>{fmt(item.quantidade_inspecionada)}</td><td style={{padding:'6px',textAlign:'right'}}>{fmt(item.quantidade_aprovada)}</td><td style={{padding:'6px',textAlign:'right'}}>{fmt(item.quantidade_reprovada)}</td>
              <td style={{padding:'6px',fontWeight:700,color:item.resultado==='APROVADO'?'#16794b':item.resultado==='REPROVADO'?'#b42318':'#9a6700'}}>{item.resultado}</td><td style={{padding:'6px'}}>{item.inspetor_nome||'—'}</td><td style={{padding:'6px'}}>{item.acao_bloqueio||'—'}</td>
            </tr>)}{!qualityInspections.length&&<tr><td colSpan={9} style={{padding:12,textAlign:'center',color:'#667085'}}>Nenhuma inspeção ou laudo registrado para este produto no banco.</td></tr>}</tbody>
          </table>
        </div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DEFEITOS REGISTRADOS</h2>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}><thead><tr>{['Data','OP','Defeito','Quantidade','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:5,borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{defects.map(d=><tr key={d.id}><td style={{padding:5}}>{new Date(d.created_at).toLocaleString('pt-BR')}</td><td style={{padding:5}}>{d.ordem_producao_id}</td><td style={{padding:5}}>{d.defeito}</td><td style={{padding:5}}>{fmt(d.quantidade)}</td><td style={{padding:5}}>{d.observacao||'—'}</td></tr>)}{!defects.length&&emptyRow('Nenhum defeito registrado para este produto.',5)}</tbody></table></div>
        <h2 style={{fontSize:11,margin:'12px 0 6px',color:'#123B50'}}>DOCUMENTOS / DESENHOS VINCULADOS</h2>
        <div style={{display:'grid',gap:4}}>{attachments.map(a=><div key={a.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 120px 150px',gap:7,padding:'5px 6px',border:'1px solid #e4e7ec',fontSize:9}}><b>{a.nome_arquivo}</b><span>{a.mime_type||'arquivo'}</span><span>{a.tamanho_bytes?Math.round(a.tamanho_bytes/1024)+' KB':'—'} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span></div>)}{!attachments.length&&<div style={{padding:10,textAlign:'center',color:'#667085',border:'1px dashed #cbd5e1',fontSize:9}}>Nenhum desenho/documento vinculado.</div>}</div>
      </section>}
      {tab==='fotos'&&<section style={{padding:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <div><h2 style={{fontSize:12,margin:0,color:'#123B50'}}>FOTOS DO PRODUTO</h2><p style={{fontSize:9,margin:'3px 0 0',color:'#667085'}}>Selecione uma imagem para anexar ou trocar. A primeira imagem será usada como foto principal do cadastro.</p></div>
          <button type="button" onClick={()=>{if(!selectedId){setError('Salve o produto antes de anexar fotos.');return}const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot='1';inputEl.click()}}} disabled={busy} style={btn('primary')}><Upload size={13}/>Anexar foto</button>
        </div>
        {!selectedId&&<div style={{padding:14,border:'1px dashed #cbd5e1',background:'#f8fafc',fontSize:10,color:'#667085',textAlign:'center'}}>Salve o produto primeiro para habilitar o envio de fotos.</div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8}}>
          {[1,2,3,4].map(slot=>{
            const photo=attachments.find(a=>a.mime_type?.startsWith('image/')&&a.nome_arquivo.startsWith('FOTO_'+slot+'_'));
            const url=photo?supabase.storage.from('erp-produtos').getPublicUrl(photo.storage_path).data.publicUrl:(slot===1?normalizePhotoUrl(form.foto_url):null);
            return <div key={slot} className="product-photo-card" role="button" tabIndex={0} aria-label={'Selecionar imagem '+slot} onClick={()=>{if(!selectedId){setError('Salve o produto antes de anexar fotos.');return}const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!selectedId){setError('Salve o produto antes de anexar fotos.');return}const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}}} style={{minHeight:160,minWidth:0,border:'1px solid #cbd5e1',background:'#f8fafc',position:'relative',display:'grid',placeItems:'center',overflow:'hidden',outline:'none'}}>
              {url?<img src={url} alt={'Foto '+slot+' do produto'} style={{position:'absolute',inset:0,width:'100%',height:'100%',maxHeight:160,objectFit:'contain',padding:8,boxSizing:'border-box'}}/>:<div style={{fontSize:9,color:'#667085',textAlign:'center',padding:8}}><ImageIcon size={24}/><div>IMAGEM {slot}{slot===1?' • PRINCIPAL':''}</div><div>JPG · PNG · WEBP · BMP</div></div>}
              <button type="button" disabled={!selectedId||busy} onClick={e=>{e.stopPropagation();if(!selectedId){setError('Salve o produto antes de anexar fotos.');return}const inputEl=fileRef.current;if(inputEl){inputEl.dataset.slot=String(slot);inputEl.click()}}} style={{...btn('normal'),position:'absolute',right:5,bottom:5,height:25,padding:'0 8px',fontSize:9}}><Upload size={11}/> {url?'TROCAR':'ANEXAR'}</button>
            </div>
          })}
        </div>
        <div style={{fontSize:9,color:'#667085',marginTop:7}}>Até 5 MB por imagem. Formatos aceitos: JPG, PNG e WEBP. Imagens BMP são convertidas automaticamente para PNG.</div>
      </section>}
    </section>

    {fiscalCodeModalOpen&&<div role="dialog" aria-modal="true" aria-label={fiscalCodeLookup==='ncm'?'Consulta de NCM':'Consulta de CEST'} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,35,52,.55)',display:'grid',placeItems:'center',padding:16}}><section style={{width:'min(680px,100%)',maxHeight:'80vh',overflow:'auto',background:'#fff',border:'1px solid #B8D0DE',borderRadius:3,boxShadow:'0 12px 40px rgba(0,0,0,.25)',padding:14}}><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,borderBottom:'1px solid #D8E6EC',paddingBottom:8,marginBottom:10}}><div><strong style={{display:'block',color:'#1A365D',fontSize:14}}>{fiscalCodeLookup==='ncm'?'Consulta de classificação NCM':'Consulta de CEST cadastrados'}</strong><small style={{color:'#486581'}}>{fiscalCodeLookup==='ncm'?'Pesquisa externa por código ou descrição.':'Pesquisa em valores de produtos desta empresa.'}</small></div><button type="button" onClick={()=>setFiscalCodeModalOpen(false)} style={btn('normal')}>FECHAR</button></header><label style={{...label,display:'block'}}>Pesquisar por código ou descrição<input autoFocus value={fiscalCodeQuery} onChange={e=>setFiscalCodeQuery(e.target.value)} placeholder="Digite código ou descrição" style={{...input,width:'100%',height:30,marginTop:4}}/></label>{fiscalCodeLookup==='ncm'&&<div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button type="button" disabled={ncmBusy} onClick={()=>{update('ncm',fiscalCodeQuery.replace(/\D/g,'').slice(0,8));void searchNcm(fiscalCodeQuery)}} style={btn('primary')}>{ncmBusy?'CONSULTANDO...':'PESQUISAR NCM'}</button></div>}{fiscalCodeLookup==='cest'&&<p style={{fontSize:10,color:'#486581'}}>Somente códigos CEST já presentes nos produtos da empresa. Confirme sempre a tabela oficial vigente; esta lista não representa regulamento fiscal.</p>}{fiscalCodeLookup==='ncm'&&<div className="product-fiscal-results" style={{marginTop:10}}>{ncmOptions.filter(item=>!fiscalCodeQuery||item.codigo.includes(fiscalCodeQuery)||item.descricao.toLowerCase().includes(fiscalCodeQuery.toLowerCase())).map(item=><button key={item.codigo} type="button" onClick={()=>{update('ncm',item.codigo);setNcmDescription(item.descricao);setNcmOptions([]);setFiscalCodeModalOpen(false);setNcmSearchMessage('NCM selecionado. Confirme a classificação antes de salvar.')}}><strong>{item.codigo}</strong> — {item.descricao}</button>)}</div>}{fiscalCodeLookup==='cest'&&<div className="product-fiscal-results" style={{marginTop:10}}>{Array.from(new Set(products.map(p=>String(p.cest||'').trim()).filter(Boolean))).filter(code=>code.includes(fiscalCodeQuery.trim())).sort().map(code=><button key={code} type="button" onClick={()=>{update('cest',code);setFiscalCodeModalOpen(false)}}><strong>{code}</strong> — CEST já usado em cadastro existente</button>)}</div>}<div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}><button type="button" onClick={()=>setFiscalCodeModalOpen(false)} style={btn('normal')}>FECHAR</button></div></section></div>}
    {productionLookup&&<div role="dialog" aria-modal="true" aria-label={productionLookup.title} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.48)',display:'grid',placeItems:'center',padding:16}} onMouseDown={e=>{if(e.target===e.currentTarget)setProductionLookup(null)}}><section style={{width:'min(620px,96vw)',maxHeight:'80vh',overflow:'hidden',background:'#fff',border:'1px solid #123B50',borderRadius:2,boxShadow:'0 12px 36px #0003',display:'flex',flexDirection:'column'}}><header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'10px 12px',background:'#123B50',color:'#fff'}}><b style={{fontSize:12}}>{productionLookup.title.toUpperCase()}</b><button type="button" onClick={()=>setProductionLookup(null)} aria-label="Fechar consulta" style={{border:0,background:'transparent',color:'#fff',cursor:'pointer'}}><X size={16}/></button></header><div style={{padding:10,display:'grid',gap:8}}><input autoFocus value={productionLookupQuery} onChange={e=>setProductionLookupQuery(e.target.value)} placeholder="Filtrar por código ou descrição..." style={{...input,height:30}}/>{productionLookup.loading?<div style={{padding:20,textAlign:'center',fontSize:11}}>Consultando cadastros do ERP...</div>:productionLookup.error?<div style={{padding:12,color:'#b42318',fontSize:11}}>{productionLookup.error}</div>:<div style={{overflow:'auto',maxHeight:'55vh'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}><thead><tr style={{background:'#eaf3f8',color:'#123B50'}}>{['Código','Descrição','Versão',''].map(h=><th key={h} style={{padding:7,textAlign:'left',borderBottom:'1px solid #d5dde7'}}>{h}</th>)}</tr></thead><tbody>{productionLookup.rows.filter(x=>(x.codigo+' '+x.descricao+' '+(x.versao||'')).toLowerCase().includes(productionLookupQuery.toLowerCase())).map(row=><tr key={row.id} style={{borderBottom:'1px solid #edf1f5'}}><td style={{padding:7,fontWeight:700}}>{row.codigo}</td><td style={{padding:7}}>{row.descricao}</td><td style={{padding:7}}>{row.versao||'—'}</td><td style={{padding:4}}><button type="button" onClick={()=>chooseProductionLookup(row)} style={{...btn('primary'),height:25,fontSize:9}}>Selecionar</button></td></tr>)}</tbody></table></div>}</div><footer style={{padding:'7px 10px',background:'#f7f9fc',borderTop:'1px solid #d5dde7',display:'flex',justifyContent:'flex-end'}}><button type="button" onClick={()=>setProductionLookup(null)} style={{...btn('normal'),height:27}}>Cancelar</button></footer></section></div>}

    <section className="product-list-panel" style={{...panel,margin:'0 10px 10px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'end',gap:6,padding:7,background:'#f7f9fc',borderBottom:'1px solid #d6dde6',flexWrap:'wrap'}}>
        <Search size={14}/><label style={{...label,width:250}}>Pesquisar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, descrição, grupo..." style={{...input,height:28}}/></label>
        <label style={{...label,width:130}}>Grupo<select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} style={{...input,height:28}}><option value="TODAS">Todos</option>{groups.map(g=><option key={g.id} value={g.nome}>{g.nome}</option>)}</select></label>
        <span style={{fontSize:10,color:'#667085',paddingBottom:7}}>{filtered.length} produto(s)</span><button type="button" onClick={()=>void load()} disabled={busy} style={{...btn('normal'),height:28,marginLeft:'auto'}}><RefreshCw size={13}/>Atualizar</button>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1040}}><thead><tr>{['Foto','Código','Descrição','Grupo','Subgrupo','Marca','Unidade','Estoque Atual','Situação'].map(h=><th key={h} style={{textAlign:'left',padding:'5px 6px',borderBottom:'1px solid #d9e1ea',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.id} onClick={()=>selectProduct(p)} onDoubleClick={()=>selectProduct(p)} style={{background:selectedId===p.id?'#e7eefb':'#fff',cursor:'pointer'}}><td style={{padding:4,width:42}}>{p.foto_url?<img src={normalizePhotoUrl(p.foto_url)||undefined} alt="" style={{width:32,height:28,objectFit:'contain',border:'1px solid #e2e8f0'}}/>:<ImageIcon size={18} color="#98a2b3"/>}</td><td style={{padding:6,fontSize:10,fontWeight:900}}>{p.codigo}</td><td style={{padding:6,fontSize:10}}>{p.nome}</td><td style={{padding:6,fontSize:10}}>{p.grupo||'—'}</td><td style={{padding:6,fontSize:10}}>{p.subgrupo||'—'}</td><td style={{padding:6,fontSize:10}}>{p.marca||'—'}</td><td style={{padding:6,fontSize:10}}>{p.unidade}</td><td style={{padding:6,fontSize:10,fontWeight:900}}>{fmt(p.estoque_atual)}</td><td style={{padding:5,fontSize:9}}><span style={{display:'inline-flex',alignItems:'center',gap:4}}><CheckCircle2 size={11} color={p.ativo?'#16a34a':'#b42318'}/>{p.ativo?'Ativo':'Inativo'}</span></td></tr>)}{!filtered.length&&emptyRow('Nenhum produto encontrado.',8)}</tbody></table></div>
    </section>
    {selectedId ? (
      <section className="product-audit-panel" style={{...panel,margin:'0 10px 10px',padding:8}}>
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
  </main>
}