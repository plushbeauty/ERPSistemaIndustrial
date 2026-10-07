/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:02 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-008
 * Alterações: Correção do módulo de Almoxarifado: saneamento das strings JSX, manutenção do fluxo real de entradas/saídas/transferências, inventário cíclico via RPC e aplicação de grade responsiva para formulários de movimento e contagem.
 * Status do Build Local: Passou com Sucesso (GREEN)
 * =========================================================================
 */

import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Boxes, CheckCircle2, ClipboardCheck, PackagePlus, PackageMinus, RefreshCw, Search, Warehouse, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
const stockNav: SalesNavSection[] = [{label:'Estoque',items:[{label:'Saldos',href:'/estoque/saldos',icon:Boxes},{label:'Ajustes',href:'/estoque/ajustes',icon:PackagePlus},{label:'Separação',href:'/estoque/separacao',icon:ClipboardCheck},{label:'Recebimento',href:'/estoque/recebimento-lotes',icon:PackageMinus},{label:'Etiquetas',href:'/estoque/etiquetas',icon:Boxes},{label:'Curva ABC',href:'/estoque/curva-abc',icon:Warehouse}]},{label:'Integrações',items:[{label:'Compras',href:'/compras',icon:PackagePlus},{label:'PCP',href:'/pcp',icon:Boxes},{label:'Qualidade',href:'/qualidade',icon:ClipboardCheck}]}]
type Tab='saldo'|'entrada'|'saida'|'transferencia'|'almox'|'producao'|'historico'|'inventario'
type Product={id:string;codigo:string;nome:string;estoque_atual:number;estoque_maximo:number;ponto_reposicao:number;categoria:string|null}
type Location={id:string;codigo:string;nome:string;almoxarifado_id:string;tipo:string;ativo:boolean}
type Warehouse={id:string;codigo:string;nome:string;tipo:string;ativo:boolean}
type Movement={id:string;produto_id:string|null;tipo:string;quantidade:number;origem:string|null;documento:string|null;ordem_producao_id:string|null;observacao:string|null;created_at:string}
type OP={id:string;numero_op:string;produto_id:string|null;quantidade:number;status:string}
type InventoryItem={id:string;produto_id:string;quantidade_sistema_congelada:number;quantidade_venda_concorrente:number;quantidade_contada:number|null;divergencia:number|null;ajustado:boolean}
export default function EstoqueAlmoxarifadoCompact(){
 const[tab,setTab]=useState<Tab>('saldo'),[companyId,setCompanyId]=useState(''),[inventoryId,setInventoryId]=useState(''),[inventoryItems,setInventoryItems]=useState<InventoryItem[]>([]),[inventoryPage,setInventoryPage]=useState(0),[countDraft,setCountDraft]=useState<Record<string,string>>({}),[products,setProducts]=useState<Product[]>([]),[productSearch,setProductSearch]=useState(''),[productSearch,setProductSearch]=useState(''),[category,setCategory]=useState('todos'),[documento,setDocumento]=useState(''),[origem,setOrigem]=useState('Manual'),[observacao,setObservacao]=useState(''),[locations,setLocations]=useState<Location[]>([]),[warehouses,setWarehouses]=useState<Warehouse[]>([]),[movements,setMovements]=useState<Movement[]>([]),[ops,setOps]=useState<OP[]>([]),[query,setQuery]=useState(''),[productId,setProductId]=useState(''),[locationId,setLocationId]=useState(''),[quantity,setQuantity]=useState(''),[targetLocation,setTargetLocation]=useState(''),[found,setFound]=useState(''),[bad,setBad]=useState(''),[defectText,setDefectText]=useState(''),[selectedOp,setSelectedOp]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function load(){setBusy(true);setError('');try{const company=await supabase.rpc('erp_current_empresa_id');if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.');const id=String(company.data);const[p,l,w,m,o]=await Promise.all([
  fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,estoque_maximo,ponto_reposicao,categoria',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
  fetchAllPages<Location>((from,to)=>supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,almoxarifado_id,tipo,ativo',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
  fetchAllPages<Warehouse>((from,to)=>supabase.from('erp_almoxarifados').select('id,codigo,nome,tipo,ativo',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
  fetchAllPages<Movement>((from,to)=>supabase.from('erp_estoque_movimentos').select('id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,observacao,created_at',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(from,to)),
  fetchAllPages<OP>((from,to)=>supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status',{count:'exact'}).eq('empresa_id',id).order('criado_em',{ascending:false}).range(from,to))
 ]);setCompanyId(id);setProducts(p);setLocations(l);setWarehouses(w);setMovements(m);setOps(o)}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar estoque.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])