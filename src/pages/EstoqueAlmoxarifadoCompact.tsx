import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Boxes, CheckCircle2, ClipboardCheck, PackagePlus, PackageMinus, RefreshCw, Search, Warehouse, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ERPHeader from '../components/layout/ERPHeader'

type Tab = 'saldo' | 'entrada' | 'saida' | 'transferencia' | 'almox' | 'producao' | 'historico' | 'inventario'
type Product = { id:string; codigo:string; nome:string; estoque_atual:number; estoque_maximo:number; ponto_reposicao:number; categoria:string|null }
type Location = { id:string; codigo:string; nome:string; almoxarifado_id:string; tipo:string; ativo:boolean }
type Warehouse = { id:string; codigo:string; nome:string; tipo:string; ativo:boolean }
type Movement = { id:string; produto_id:string|null; tipo:string; quantidade:number; origem:string|null; documento:string|null; ordem_producao_id:string|null; observacao:string|null; created_at:string }
type OP = { id:string; numero_op:string; produto_id:string|null; quantidade:number; status:string }
type InventoryItem = { id:string; produto_id:string; quantidade_sistema_congelada:number; quantidade_venda_concorrente:number; quantidade_contada:number|null; divergencia:number|null; ajustado:boolean }

export default function EstoqueAlmoxarifadoCompact() {
  const [tab,setTab] = useState<Tab>('saldo')
  const [companyId,setCompanyId] = useState('')
  const [inventoryId,setInventoryId] = useState('')
  const [inventoryItems,setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryPage,setInventoryPage] = useState(0)
  const [countDraft,setCountDraft] = useState<Record<string,string>>({})
  const [products,setProducts] = useState<Product[]>([])
  const [productSearch,setProductSearch] = useState('')
  const [category,setCategory] = useState('todos')
  const [documento,setDocumento] = useState('')
  const [origem,setOrigem] = useState('Manual')
  const [observacao,setObservacao] = useState('')
  const [locations,setLocations] = useState<Location[]>([])
  const [warehouses,setWarehouses] = useState<Warehouse[]>([])
  const [movements,setMovements] = useState<Movement[]>([])
  const [ops,setOps] = useState<OP[]>([])
  const [query,setQuery] = useState('')
  const [productId,setProductId] = useState('')
  const [locationId,setLocationId] = useState('')
  const [quantity,setQuantity] = useState('')
  const [targetLocation,setTargetLocation] = useState('')
  const [found,setFound] = useState('')
  const [bad,setBad] = useState('')
  const [defectText,setDefectText] = useState('')
  const [selectedOp,setSelectedOp] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [p,l,w,m,o] = await Promise.all([
        fetchAllPages<Product>((from,to) => supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,estoque_maximo,ponto_reposicao,categoria',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
        fetchAllPages<Location>((from,to) => supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,almoxarifado_id,tipo,ativo',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
        fetchAllPages<Warehouse>((from,to) => supabase.from('erp_almoxarifados').select('id,codigo,nome,tipo,ativo',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
        fetchAllPages<Movement>((from,to) => supabase.from('erp_estoque_movimentos').select('id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,observacao,created_at',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(from,to)),
        fetchAllPages<OP>((from,to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status',{count:'exact'}).eq('empresa_id',id).order('criado_em',{ascending:false}).range(from,to))
      ])
      setCompanyId(id); setProducts(p); setLocations(l); setWarehouses(w); setMovements(m); setOps(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar estoque.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { void load() }, [])
