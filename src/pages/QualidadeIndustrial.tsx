import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCheck, RefreshCw, Search, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'
import ColetaDimensionalCEP from '../components/ColetaDimensionalCEP'

type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; fornecedor_id: string | null; nf_numero: string | null; quantidade_recebida: number; status_inspecao: string | null }
type Supplier = { id: string; razao_social: string }
type Sector = { id: string; nome: string; ativo: boolean }
type Product = { id: string; codigo: string; nome: string }
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Specification = { id: string; produto_id: string; codigo: string; caracteristica: string; unidade: string | null; nominal: number | null; tipo_inspecao: string; metodo_inspecao: string; instrumento_id: string | null; limite_inferior: number | null; limite_superior: number | null; frequencia: string | null; grupo_material: string | null; condicao_armazenamento: string | null; status: string | null; vigencia_inicio: string | null; vigencia_fim: string | null; aprovador_id: string | null; aprovado_em: string | null; revisao: number }
type Receiving = { id: string; lote_id: string; fornecedor_id: string | null; tamanho_lote: number; nivel_inspecao: 'G-II' | 'G-III'; aql: number; tamanho_amostra: number; defeitos_encontrados: number; criterio_ac: number; criterio_re: number; status: 'PENDENTE' | 'APROVADO' | 'BLOQUEADO'; created_at: string }
type Dimensional = { id: string; inspecao_recebimento_id: string | null; plano_inspecao_id: string | null; numero_peca_amostrada: number; cavidade_molde: string | null; cota_nominal_mm: number; tolerancia_superior_mm: number; tolerancia_inferior_mm: number; valor_medido_mm: number | null; desvio_mm: number | null; status: 'PENDENTE' | 'OK' | 'NOK'; instrumento: string | null }
type Genealogy = { id: string; lote_interno: string; lote_fornecedor: string | null; produto: string; fornecedor: string; operador: string; maquina: string; apontado_em: string | null; pedido: string | null }

const levels = [
  { min: 2, max: 8, II: 2, III: 3 },
  { min: 9, max: 15, II: 3, III: 5 },
  { min: 16, max: 25, II: 5, III: 8 },
  { min: 26, max: 50, II: 8, III: 13 },
  { min: 51, max: 90, II: 13, III: 20 },
  { min: 91, max: 150, II: 20, III: 32 },
  { min: 151, max: 280, II: 32, III: 50 },
  { min: 281, max: 500, II: 50, III: 80 },
  { min: 501, max: 1200, II: 80, III: 125 },
  { min: 1201, max: 3200, II: 125, III: 200 },
  { min: 3201, max: 10000, II: 200, III: 315 },
  { min: 10001, max: 35000, II: 315, III: 500 },
  { min: 35001, max: 150000, II: 500, III: 800 },
  { min: 150001, max: 500000, II: 800, III: 1250 },
  { min: 500001, max: Number.POSITIVE_INFINITY, II: 1250, III: 2000 },
] as const

function sampleSize(lot: number, level: 'G-II' | 'G-III'): number {
  const row = levels.find((item) => lot >= item.min && lot <= item.max)
  if (!row) return 1
  return Math.min(Math.max(1, Math.floor(lot)), row[level === 'G-II' ? 'II' : 'III'])
}

function fieldClass(invalid: boolean): string {
  return `h-[30px] w-full rounded-[2px] border px-2 text-[12px] outline-none ${invalid ? 'border-red-500 bg-red-50/50 placeholder:text-red-400' : 'border-slate-300 bg-white focus:border-[#2D8DB8]'}`
}

function labelClass(): string {
  return 'grid gap-[2px] text-[9px] font-medium uppercase text-slate-600'
}

export default function QualidadeIndustrial() {
  const [tab, setTab] = useState<'recebimento' | 'dimensional' | 'rastreabilidade'>('recebimento')
  const [companyId, setCompanyId] = useState('')
  const [lots, setLots] = useState<Lot[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [rpncSectorId, setRpncSectorId] = useState('')
  const [rpncSeverity, setRpncSeverity] = useState<'Critica' | 'Maior' | 'Menor' | ''>('')
  const [rpncDescription, setRpncDescription] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [receivings, setReceivings] = useState<Receiving[]>([])
  const [dimensionals, setDimensionals] = useState<Dimensional[]>([])
  const [selectedReceiving, setSelectedReceiving] = useState('')
  const [selectedSpecId, setSelectedSpecId] = useState('')
  const [selectedLot, setSelectedLot] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [level, setLevel] = useState<'G-II' | 'G-III'>('G-II')
  const [aql, setAql] = useState('1.0')
  const [defects, setDefects] = useState('0')
  const [ac, setAc] = useState('1')
  const [re, setRe] = useState('2')
  
  const [piece, setPiece] = useState('1')
  const [cavity, setCavity] = useState('')
  const [measured, setMeasured] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [genealogy, setGenealogy] = useState<Genealogy[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const current = await supabase.rpc('erp_current_empresa_id')
      if (current.error) throw current.error
      if (!current.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(current.data)
      setCompanyId(id)
      const [lotResult, supplierResult, productResult, specificationResult, instrumentResult, receivingResult, dimensionalResult, sectorResult] = await Promise.all([
        fetchAllPages<Lot>((from, to) => supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,produto_id,fornecedor_id,nf_numero,quantidade_recebida,status_inspecao', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores').select('id,razao_social', { count: 'exact' }).eq('empresa_id', id).order('razao_social').order('id').range(from, to)),
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').order('id').range(from, to)),
        fetchAllPages<Specification>((from, to) => supabase.from('erp_planos_inspecao').select('id,produto_id,codigo,caracteristica,unidade,nominal,tipo_inspecao,metodo_inspecao,instrumento_id,limite_inferior,limite_superior,frequencia,grupo_material,condicao_armazenamento,status,vigencia_inicio,vigencia_fim,aprovador_id,aprovado_em,revisao', { count: 'exact' }).eq('empresa_id', id).order('codigo').order('id').range(from, to)),
        fetchAllPages<Instrument>((from, to) => supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao', { count: 'exact' }).eq('empresa_id', id).order('codigo').order('id').range(from, to)),
        fetchAllPages<Receiving>((from, to) => supabase.from('erp_qualidade_inspecoes_recebimento').select('id,lote_id,fornecedor_id,tamanho_lote,nivel_inspecao,aql,tamanho_amostra,defeitos_encontrados,criterio_ac,criterio_re,status,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Dimensional>((from, to) => supabase.from('erp_qualidade_inspecoes_dimensionais').select('id,inspecao_recebimento_id,plano_inspecao_id,numero_peca_amostrada,cavidade_molde,cota_nominal_mm,tolerancia_superior_mm,tolerancia_inferior_mm,valor_medido_mm,desvio_mm,status,instrumento', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).order('id').range(from, to)),
        fetchAllPages<Sector>((from, to) => supabase.from('erp_setores').select('id,nome,ativo', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('nome').order('id').range(from, to)),
      ])
      setLots(lotResult)
      setSuppliers(supplierResult)
      setSectors(sectorResult)
      setProducts(productResult)
      setSpecifications(specificationResult)
      setInstruments(instrumentResult)
      setReceivings(receivingResult)
      setDimensionals(dimensionalResult)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar Qualidade.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selectedLotData = lots.find((lot) => lot.id === selectedLot) ?? null
  const calculatedSample = lotSize ? sampleSize(Number(lotSize), level) : 0
  const currentReceiving = receivings.find((row) => row.id === selectedReceiving) ?? null
  const currentReceivingLot = lots.find((lot) => lot.id === currentReceiving?.lote_id) ?? null
  const currentProduct = products.find((product) => product.id === currentReceivingLot?.produto_id) ?? null
  const today = new Date().toISOString().slice(0, 10)
  const validInstruments = instruments.filter(item => item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today))
  const isCurrentSpec = (item: Specification) => (item.status ?? '').toUpperCase() === 'ATIVO' && (!item.vigencia_inicio || item.vigencia_inicio <= today) && (!item.vigencia_fim || item.vigencia_fim >= today)
  const isEffectiveSpec = (item: Specification) => isCurrentSpec(item) && Boolean(item.aprovador_id) && Boolean(item.aprovado_em) && (!['DIMENSIONAL','FUNCIONAL'].includes(item.metodo_inspecao) || validInstruments.some(instrumentItem => instrumentItem.id === item.instrumento_id))
  const activeSpecsForReceiving = specifications.filter(item => item.produto_id === currentReceivingLot?.produto_id && item.tipo_inspecao === 'RECEBIMENTO' && isEffectiveSpec(item))
  const storageSpecsForReceiving = specifications.filter(item => item.produto_id === selectedLotData?.produto_id && item.tipo_inspecao === 'RECEBIMENTO' && isCurrentSpec(item))
  const activeDimensionalSpecsForReceiving = activeSpecsForReceiving.filter(item => item.metodo_inspecao === 'DIMENSIONAL' && item.nominal !== null && item.limite_inferior !== null && item.limite_superior !== null)
  const selectedSpec = activeDimensionalSpecsForReceiving.find(item => item.id === selectedSpecId) ?? null
  const selectedInstrument = selectedSpec ? validInstruments.find(item => item.id === selectedSpec.instrumento_id) ?? null : null
  const dimensionalPreview = measured !== '' && selectedSpec?.nominal != null ? Number(measured) - Number(selectedSpec.nominal) : null
  const dimensionalStatus = dimensionalPreview === null || !selectedSpec || selectedSpec.limite_inferior === null || selectedSpec.limite_superior === null ? 'PENDENTE' : Number(measured) >= selectedSpec.limite_inferior && Number(measured) <= selectedSpec.limite_superior ? 'OK' : 'NOK'

  const saveReceiving = async () => {
    setInvalid(null); setError(''); setNotice('')
    if (!selectedLot) return setInvalid('lote')
    if (!lotSize || Number(lotSize) <= 0) return setInvalid('loteSize')
    if (!aql || Number(aql) <= 0) return setInvalid('aql')
    if (!ac || !re || Number(re) <= Number(ac)) return setInvalid('criteria')
    setBusy(true)
    try {
      const rastreio = selectedLotData?.lote_fornecedor
        ? await supabase.from('erp_estoque_lotes_rastreabilidade').select('id').eq('empresa_id', companyId).eq('lote_fornecedor', selectedLotData.lote_fornecedor).maybeSingle()
        : { data: null, error: null }
      if (rastreio.error) throw rastreio.error
      const result = await supabase.from('erp_qualidade_inspecoes_recebimento').insert({
        empresa_id: companyId,
        lote_id: selectedLot,
        lote_rastreabilidade_id: rastreio.data?.id ?? null,
        fornecedor_id: selectedLotData?.fornecedor_id ?? null,
        tamanho_lote: Number(lotSize),
        nivel_inspecao: level,
        aql: Number(aql),
        tamanho_amostra: calculatedSample,
        defeitos_encontrados: Number(defects || 0),
        criterio_ac: Number(ac),
        criterio_re: Number(re),
      }).select('id').single()
      if (result.error) throw result.error
      setNotice('Inspeção de recebimento registrada no banco real.')
      setSelectedReceiving(result.data.id)
      setSelectedSpecId('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar inspeção.')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (decision: 'APROVAR' | 'BLOQUEAR', receivingId = selectedReceiving) => {
    const receiving = receivings.find(row => row.id === receivingId)
    if (!receiving) { setError('Selecione uma inspeção de recebimento válida.'); return }
    if (decision === 'BLOQUEAR') {
      if (!rpncSectorId || !sectors.some(sector => sector.id === rpncSectorId)) { setError('Selecione um setor ativo responsável pela RPNC antes de bloquear o lote.'); return }
      if (!rpncSeverity) { setError('Selecione a gravidade da não conformidade antes de bloquear o lote.'); return }
      if (rpncDescription.trim().length < 5) { setError('Descreva a não conformidade com pelo menos 5 caracteres antes de bloquear o lote.'); return }
    }
    setBusy(true); setError(''); setNotice('')
    try {
      if (decision === 'APROVAR') {
        const lot = lots.find(item => item.id === receiving.lote_id)
        if (!lot) throw new Error('O lote da inspeção não está disponível na empresa atual.')
        const currentSpecs = specifications.filter(item => item.produto_id === lot.produto_id && item.tipo_inspecao === 'RECEBIMENTO' && isCurrentSpec(item))
        if (!currentSpecs.length) throw new Error('SEM ESPECIFICAÇÃO: o lote não pode ser aprovado automaticamente. Cadastre critérios técnicos vigentes para este produto na Qualidade > Especificações Técnicas.')
        if (currentSpecs.some(item => !isEffectiveSpec(item))) throw new Error('Liberação bloqueada: há especificação vigente sem aprovador válido ou com instrumento não aprovado/calibração vencida.')
        if (currentSpecs.some(item => !['DIMENSIONAL','VISUAL'].includes(item.metodo_inspecao))) throw new Error('Liberação bloqueada: critérios FUNCIONAL/DOCUMENTAL exigem checklist de evidência dedicado; inspeção visual é controlada pela amostragem e critérios Ac/Re.')
        const activeSpecs = currentSpecs
        if (receiving.defeitos_encontrados > receiving.criterio_ac) throw new Error('A quantidade de defeitos excede o critério Ac; o lote não pode ser aprovado.')
        const dimensionalSpecs = activeSpecs.filter(item => item.metodo_inspecao === 'DIMENSIONAL')
        if (dimensionalSpecs.some(item => item.nominal === null || item.limite_inferior === null || item.limite_superior === null)) {
          throw new Error('Há especificações dimensionais incompletas: informe nominal e limites inferior/superior antes da liberação.')
        }
        const measurements = dimensionals.filter(item => item.inspecao_recebimento_id === receiving.id)
        for (const spec of dimensionalSpecs) {
          const specMeasurements = measurements.filter(item => item.plano_inspecao_id === spec.id)
          if (!specMeasurements.length) throw new Error(`Falta medir a especificação ${spec.codigo} — ${spec.caracteristica}.`)
          if (specMeasurements.some(item => item.status !== 'OK')) throw new Error(`A especificação ${spec.codigo} possui amostra NOK/pendente; o lote não pode ser aprovado.`)
        }
      }
      if (decision === 'BLOQUEAR') {
        const result = await supabase.rpc('erp_qms_reprovar_recebimento_com_rpnc', { p_inspecao_id: receiving.id, p_setor_id: rpncSectorId, p_severidade: rpncSeverity, p_descricao: rpncDescription.trim() })
        if (result.error) throw result.error
        const rpncNumber = result.data && typeof result.data === 'object' ? (result.data as { numero_rpnc?: string }).numero_rpnc : null
        setNotice(`Lote bloqueado e enviado para quarentena. RPNC ${rpncNumber || 'vinculada'} registrada.`)
        setRpncDescription('')
      } else {
        const result = await supabase.rpc('erp_qms_decidir_inspecao_recebimento', { p_inspecao_id: receiving.id, p_decisao: decision })
        if (result.error) throw result.error
        setNotice('Lote aprovado e liberado no status de inspeção.')
      }
      setSelectedReceiving(receiving.id)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na decisão do lote.')
    } finally {
      setBusy(false)
    }
  }

  const saveDimensional = async () => {
    setError(''); setNotice('')
    if (!selectedReceiving) return setInvalid('receiving')
    if (!selectedSpec || selectedSpec.nominal === null || selectedSpec.limite_inferior === null || selectedSpec.limite_superior === null) {
      setError('Selecione uma especificação dimensional ativa com nominal e os dois limites técnicos.')
      return
    }
    if (!piece || measured.trim() === '' || !Number.isFinite(Number(measured))) return setInvalid('dimensional')
    setBusy(true)
    try {
      const nominalValue = Number(selectedSpec.nominal)
      const upperTolerance = Number(selectedSpec.limite_superior) - nominalValue
      const lowerTolerance = nominalValue - Number(selectedSpec.limite_inferior)
      if (upperTolerance < 0 || lowerTolerance < 0) throw new Error('O nominal cadastrado está fora dos limites da especificação.')
      if (!selectedInstrument) throw new Error('O instrumento da especificação não está aprovado ou está com calibração vencida.')
      const result = await supabase.from('erp_qualidade_inspecoes_dimensionais').insert({
        empresa_id: companyId,
        inspecao_recebimento_id: selectedReceiving,
        plano_inspecao_id: selectedSpec.id,
        numero_peca_amostrada: Number(piece),
        cavidade_molde: cavity || null,
        cota_nominal_mm: nominalValue,
        tolerancia_superior_mm: upperTolerance,
        tolerancia_inferior_mm: lowerTolerance,
        valor_medido_mm: Number(measured),
        instrumento: selectedInstrument.codigo,
      }).select('id,inspecao_recebimento_id,plano_inspecao_id,numero_peca_amostrada,cavidade_molde,cota_nominal_mm,tolerancia_superior_mm,tolerancia_inferior_mm,valor_medido_mm,desvio_mm,status,instrumento').single()
      if (result.error) throw result.error
      setNotice(`Medição registrada para ${selectedSpec.codigo}: ${result.data.status} · desvio ${Number(result.data.desvio_mm ?? 0).toFixed(3)} mm.`)
      setMeasured('')
      setPiece(String(Number(piece) + 1))
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar medição.')
    } finally {
      setBusy(false)
    }
  }

  const saveCepMeasurements = async (data: { valores: number[]; media: number; desvioPadrao: number; totalControlado: number; numeroDefeituosos: number }) => {
    setError(''); setNotice('')
    if (!selectedReceiving || !selectedSpec || selectedSpec.nominal === null || selectedSpec.limite_inferior === null || selectedSpec.limite_superior === null) {
      setError('Selecione uma inspeção e uma especificação dimensional completa antes da coleta CEP.')
      return
    }
    if (!selectedInstrument) { setError('A especificação precisa de instrumento aprovado e com calibração vigente.'); return }
    if (data.valores.length !== 18 || data.totalControlado !== 18) {
      setError('A coleta CEP precisa conter exatamente 18 medições válidas.')
      return
    }
    setBusy(true)
    try {
      const startPiece = Math.max(0, ...dimensionals.filter(row => row.inspecao_recebimento_id === selectedReceiving).map(row => row.numero_peca_amostrada)) + 1
      const nominalValue = Number(selectedSpec.nominal)
      const upperTolerance = Number(selectedSpec.limite_superior) - nominalValue
      const lowerTolerance = nominalValue - Number(selectedSpec.limite_inferior)
      const payload = data.valores.map((value, index) => ({
        empresa_id: companyId,
        inspecao_recebimento_id: selectedReceiving,
        plano_inspecao_id: selectedSpec.id,
        numero_peca_amostrada: startPiece + index,
        cavidade_molde: cavity || null,
        cota_nominal_mm: nominalValue,
        tolerancia_superior_mm: upperTolerance,
        tolerancia_inferior_mm: lowerTolerance,
        valor_medido_mm: value,
        instrumento: selectedInstrument.codigo,
      }))
      const result = await supabase.from('erp_qualidade_inspecoes_dimensionais').insert(payload)
      if (result.error) throw result.error
      setNotice(`CEP registrado no banco: 18 amostras, média ${data.media.toFixed(5)} mm, desvio padrão ${data.desvioPadrao.toFixed(5)} mm, ${data.numeroDefeituosos} NOK.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar coleta CEP.')
    } finally {
      setBusy(false)
    }
  }

  const searchGenealogy = async () => {
    const term = query.trim()
    if (!term) return
    setBusy(true); setError(''); setNotice(''); setGenealogy([])
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const lotResult = await supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,produto_id,fornecedor_id').eq('empresa_id', companyId).or(`lote_interno.eq.${term},lote_fornecedor.eq.${term}`).maybeSingle()
      if (lotResult.error) throw lotResult.error
      if (!lotResult.data) throw new Error('Lote não encontrado na empresa atual.')
      const lot = lotResult.data
      const [productResult, genealogyResult, productionResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,nome').eq('id', lot.produto_id).eq('empresa_id', companyId).maybeSingle(),
        supabase.from('erp_genealogia_lote_componentes').select('id,lote_insumo_id,quantidade_consumida').eq('empresa_id', companyId).eq('lote_acabado_id', lot.id),
        supabase.from('erp_apontamentos_processo').select('ordem_producao_id,operador_id,maquina_id,criado_em').eq('empresa_id', companyId).eq('lote', lot.lote_interno).order('criado_em', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (productResult.error) throw productResult.error
      if (genealogyResult.error) throw genealogyResult.error
      if (productionResult.error) throw productionResult.error
      const supplierResult = lot.fornecedor_id ? await supabase.from('erp_fornecedores').select('razao_social').eq('id', lot.fornecedor_id).eq('empresa_id', companyId).maybeSingle() : { data: null, error: null }
      if (supplierResult.error) throw supplierResult.error
      const productName = productResult.data?.nome ?? 'Produto não identificado'
      const supplierName = supplierResult.data?.razao_social ?? 'Fornecedor não vinculado'
      const operatorId = productionResult.data?.operador_id ?? null
      const machineId = productionResult.data?.maquina_id ?? null
      const [operatorResult, machineResult, opResult] = await Promise.all([
        operatorId ? supabase.from('erp_usuarios').select('nome,email').eq('id', operatorId).eq('empresa_id', companyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        machineId ? supabase.from('erp_maquinas').select('codigo,nome').eq('id', machineId).eq('empresa_id', companyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        productionResult.data?.ordem_producao_id ? supabase.from('erp_ordens_producao').select('numero_op,pedido_venda_id').eq('id', productionResult.data.ordem_producao_id).eq('empresa_id', companyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ])
      if (operatorResult.error || machineResult.error || opResult.error) throw operatorResult.error ?? machineResult.error ?? opResult.error
      let pedido: string | null = null
      if (opResult.data?.pedido_venda_id) {
        const orderResult = await supabase.from('erp_pedidos_venda').select('numero').eq('id', opResult.data.pedido_venda_id).eq('empresa_id', companyId).maybeSingle()
        if (orderResult.error) throw orderResult.error
        pedido = orderResult.data?.numero != null ? String(orderResult.data.numero) : null
      }
      const rows: Genealogy[] = []
      for (const item of genealogyResult.data ?? []) {
        const inputLot = await supabase.from('erp_estoque_lotes_rastreabilidade').select('lote_fornecedor,produto_id').eq('id', item.lote_insumo_id).eq('empresa_id', companyId).maybeSingle()
        if (inputLot.error) throw inputLot.error
        if (!inputLot.data) continue
        const inputProduct = await supabase.from('erp_produtos').select('nome').eq('id', inputLot.data.produto_id).eq('empresa_id', companyId).maybeSingle()
        if (inputProduct.error) throw inputProduct.error
        rows.push({ id: item.id, lote_interno: lot.lote_interno, lote_fornecedor: inputLot.data.lote_fornecedor, produto: inputProduct.data?.nome ?? 'Produto não identificado', fornecedor: supplierName, operador: operatorResult.data?.nome ?? operatorResult.data?.email ?? 'Operador não vinculado', maquina: machineResult.data ? `${machineResult.data.codigo} · ${machineResult.data.nome}` : 'Máquina não vinculada', apontado_em: productionResult.data?.criado_em ?? null, pedido })
      }
      if (!rows.length) rows.push({ id: lot.id, lote_interno: lot.lote_interno, lote_fornecedor: lot.lote_fornecedor, produto: productName, fornecedor: supplierName, operador: operatorResult.data?.nome ?? operatorResult.data?.email ?? 'Operador não vinculado', maquina: machineResult.data ? `${machineResult.data.codigo} · ${machineResult.data.nome}` : 'Máquina não vinculada', apontado_em: productionResult.data?.criado_em ?? null, pedido })
      setGenealogy(rows)
      setNotice('Rastreabilidade carregada a partir dos registros reais do ERP.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na rastreabilidade.')
    } finally {
      setBusy(false)
    }
  }

  const supplierMap = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier.razao_social])), [suppliers])

  return (
    <VendasLayout title="Qualidade" subtitle="Recebimento AQL/MIL-STD-105E • Metrologia dimensional • Rastreabilidade reversa">
      <div className="qms-compact">
        <div className="qms-tabs">
          {[
            ['recebimento', '01 · INSPEÇÃO DE RECEBIMENTO'],
            ['dimensional', '02 · INSPEÇÃO DIMENSIONAL'],
            ['rastreabilidade', '03 · RASTREABILIDADE REVERSA'],
          ].map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id as 'recebimento' | 'dimensional' | 'rastreabilidade')}>{label}</button>)}
          <button type="button" className="refresh" onClick={() => void load()} disabled={busy}><RefreshCw size={13}/> ATUALIZAR</button>
        </div>

        {(error || notice) && <div className={error ? 'qms-message error' : 'qms-message'}>{error || notice}</div>}

        {tab === 'recebimento' && <section className="qms-panel">
          {selectedLotData && !specifications.some(item => item.produto_id === selectedLotData.produto_id && item.tipo_inspecao === 'RECEBIMENTO' && (item.status ?? '').toUpperCase() === 'ATIVO') && <div role="alert" className="qms-message error">SEM ESPECIFICAÇÃO — este lote não pode ser aprovado até existir critério técnico ativo para o produto.</div>}
          {selectedLotData && <div className="qms-mt border border-sky-200 bg-sky-50 p-2 text-[10px] text-sky-950"><p className="mb-1 font-semibold">ESPECIFICAÇÃO MESTRE / ARMAZENAMENTO</p>{storageSpecsForReceiving.length ? storageSpecsForReceiving.map(spec => <p key={spec.id} className="border-t border-sky-100 py-1"><strong>{spec.codigo} · {spec.grupo_material || 'Grupo não informado'}</strong> — {spec.caracteristica}. Armazenamento: {spec.condicao_armazenamento || 'Condição não definida; consultar Qualidade antes de liberar.'}</p>) : <p>SEM ESPECIFICAÇÃO ATIVA — não aprovar automaticamente este lote.</p>}</div>}
          <div className="qms-grid qms-grid-6">
            <label className={labelClass()}>Lote / NF XML<select className={fieldClass(invalid === 'lote')} value={selectedLot} onChange={(e) => { setSelectedLot(e.target.value); setInvalid(null) }}><option value="">Preencher...</option>{lots.filter(lot => ['AGUARDANDO', 'PENDENTE'].includes((lot.status_inspecao || '').toUpperCase())).map((lot) => <option key={lot.id} value={lot.id}>{lot.lote_interno} · NF {lot.nf_numero || '—'} · {supplierMap.get(lot.fornecedor_id || '') || 'Fornecedor não vinculado'}</option>)}</select></label>
            <label className={labelClass()}>Fornecedor<input className={fieldClass(false)} readOnly value={selectedLotData ? supplierMap.get(selectedLotData.fornecedor_id || '') || 'Fornecedor não vinculado' : ''} placeholder="Preencher..." /></label>
            <label className={labelClass()}>Tamanho do lote<input className={fieldClass(invalid === 'loteSize')} type="number" min="1" value={lotSize} onChange={(e) => { setLotSize(e.target.value); setInvalid(null) }} onBlur={() => { if (!lotSize) setInvalid('loteSize') }} placeholder="Preencher..." /></label>
            <label className={labelClass()}>Nível de inspeção<select className={fieldClass(false)} value={level} onChange={(e) => setLevel(e.target.value as 'G-II' | 'G-III')}><option>G-II</option><option>G-III</option></select></label>
            <label className={labelClass()}>NQA / AQL<input className={fieldClass(invalid === 'aql')} type="number" min="0.001" step="0.001" value={aql} onChange={(e) => { setAql(e.target.value); setInvalid(null) }} placeholder="Preencher..." /></label>
            <label className={labelClass()}>Amostra calculada<input className={fieldClass(false)} readOnly value={calculatedSample || ''} placeholder="Preencher..." /></label>
          </div>
          <div className="qms-grid qms-grid-4 qms-mt">
            <label className={labelClass()}>Defeitos encontrados<input className={fieldClass(false)} type="number" min="0" value={defects} onChange={(e) => setDefects(e.target.value)} /></label>
            <label className={labelClass()}>Critério Ac<input className={fieldClass(invalid === 'criteria')} type="number" min="0" value={ac} onChange={(e) => { setAc(e.target.value); setInvalid(null) }} /></label>
            <label className={labelClass()}>Critério Re<input className={fieldClass(invalid === 'criteria')} type="number" min="1" value={re} onChange={(e) => { setRe(e.target.value); setInvalid(null) }} /></label>
            <div className="qms-actions"><button className="qms-btn" type="button" disabled={busy} onClick={() => void saveReceiving()}><ClipboardCheck size={13}/> REGISTRAR INSPEÇÃO</button></div>
          </div>
          <div className="qms-grid qms-grid-4 qms-mt border border-rose-200 bg-rose-50/60 p-2">
            <label className={labelClass()}>Setor responsável pela RPNC<select className={fieldClass(!rpncSectorId)} value={rpncSectorId} onChange={event => setRpncSectorId(event.target.value)}><option value="">Selecione setor ativo...</option>{sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></label>
            <label className={labelClass()}>Gravidade da não conformidade<select className={fieldClass(!rpncSeverity)} value={rpncSeverity} onChange={event => setRpncSeverity(event.target.value as 'Critica' | 'Maior' | 'Menor' | '')}><option value="">Selecione gravidade...</option><option value="Critica">Crítica</option><option value="Maior">Maior</option><option value="Menor">Menor</option></select></label>
            <label className={labelClass()}>Descrição da não conformidade<input className={fieldClass(rpncDescription.trim().length < 5)} value={rpncDescription} onChange={event => setRpncDescription(event.target.value)} placeholder="Descreva o defeito observado..." /></label>
            <p className="self-end text-[10px] leading-4 text-rose-900">A ação BLOQUEAR registra quarentena e RPNC na mesma transação. Informe setor, gravidade e causa observada.</p>
          </div>
          <div className="qms-table-wrap qms-mt"><table><thead><tr><th>Lote</th><th>NF</th><th>Fornecedor</th><th>Grau</th><th>AQL</th><th>Amostra</th><th>Def.</th><th>Ac</th><th>Re</th><th>Status</th><th>Ação</th></tr></thead><tbody>{receivings.map((row) => { const lot = lots.find((item) => item.id === row.lote_id); return <tr key={row.id}><td>{lot?.lote_interno || row.lote_id}</td><td>{lot?.nf_numero || '—'}</td><td>{supplierMap.get(row.fornecedor_id || '') || '—'}</td><td>{row.nivel_inspecao}</td><td className="num">{row.aql}</td><td className="num">{row.tamanho_amostra}</td><td className="num">{row.defeitos_encontrados}</td><td className="num">{row.criterio_ac}</td><td className="num">{row.criterio_re}</td><td><span className={row.status === 'APROVADO' ? 'status-ok' : row.status === 'BLOQUEADO' ? 'status-nok' : 'status-pending'}>{row.status}</span></td><td><button className="qms-mini" type="button" onClick={() => setSelectedReceiving(row.id)}>USAR</button>{row.status === 'PENDENTE' && <><button className="qms-mini approve" type="button" disabled={busy} onClick={() => void decide('APROVAR', row.id)}><Check size={12}/> APROVAR</button><button className="qms-mini block" type="button" disabled={busy} onClick={() => void decide('BLOQUEAR', row.id)}><X size={12}/> BLOQUEAR + RPNC</button></>}</td></tr>})}</tbody></table></div>
        </section>}

        {tab === 'dimensional' && <section className="qms-panel">
          <div className="qms-grid qms-grid-9">
            <label className={labelClass()}>Inspeção<select className={fieldClass(invalid === 'receiving')} value={selectedReceiving} onChange={(e) => { setSelectedReceiving(e.target.value); setSelectedSpecId(''); setMeasured(''); setInvalid(null) }}><option value="">Preencher...</option>{receivings.map((row) => <option key={row.id} value={row.id}>{row.id.slice(0, 8)} · {row.status}</option>)}</select></label>
            <label className={labelClass()}>Especificação mestre<select className={fieldClass(!selectedSpecId)} value={selectedSpecId} onChange={(e) => { setSelectedSpecId(e.target.value); setMeasured(''); setInvalid(null) }}><option value="">Selecione especificação</option>{activeDimensionalSpecsForReceiving.map(spec => <option key={spec.id} value={spec.id}>{spec.codigo} · {spec.caracteristica}</option>)}</select></label>
            <label className={labelClass()}>Nº peça<input className={fieldClass(false)} type="number" min="1" value={piece} onChange={(e) => setPiece(e.target.value)} /></label>
            <label className={labelClass()}>Cavidade<input className={fieldClass(false)} value={cavity} onChange={(e) => setCavity(e.target.value)} placeholder="Preencher..." /></label>
            <label className={labelClass()}>Cota nominal<input className={fieldClass(false)} type="number" value={selectedSpec?.nominal ?? ''} readOnly /></label>
            <label className={labelClass()}>Tol. superior +<input className={fieldClass(false)} type="number" value={selectedSpec?.nominal != null && selectedSpec.limite_superior != null ? Number(selectedSpec.limite_superior) - Number(selectedSpec.nominal) : ''} readOnly /></label>
            <label className={labelClass()}>Tol. inferior -<input className={fieldClass(false)} type="number" value={selectedSpec?.nominal != null && selectedSpec.limite_inferior != null ? Number(selectedSpec.nominal) - Number(selectedSpec.limite_inferior) : ''} readOnly /></label>
            <label className={labelClass()}>Valor medido<input className={fieldClass(invalid === 'dimensional' && !measured)} type="number" step="0.00001" value={measured} onChange={(e) => { setMeasured(e.target.value); setInvalid(null) }} onBlur={() => { if (!measured) setInvalid('dimensional') }} placeholder="Preencher..." /></label>
            <label className={labelClass()}>Instrumento vinculado<input className={fieldClass(false)} value={selectedInstrument ? `${selectedInstrument.codigo} · ${selectedInstrument.descricao}` : 'Sem instrumento calibrado'} readOnly /></label>
          </div>
          <div className="qms-measure-status">DESVIO: <strong>{dimensionalPreview === null ? '—' : dimensionalPreview.toFixed(5)} mm</strong> · STATUS: <strong className={dimensionalStatus === 'OK' ? 'blue-status' : dimensionalStatus === 'NOK' ? 'red-status' : ''}>{dimensionalStatus}</strong><button className="qms-btn" type="button" disabled={busy} onClick={() => void saveDimensional()}>REGISTRAR MEDIÇÃO</button></div>
          <div className="qms-table-wrap qms-mt"><table><thead><tr><th>Especificação</th><th>Nº Peça</th><th>Cavidade</th><th>Nominal mm</th><th>Sup. +</th><th>Inf. -</th><th>Medido</th><th>Desvio</th><th>Status</th><th>Instrumento</th></tr></thead><tbody>{dimensionals.filter((row) => !selectedReceiving || row.inspecao_recebimento_id === selectedReceiving).map((row) => <tr key={row.id}><td>{specifications.find(spec=>spec.id===row.plano_inspecao_id)?.codigo || '—'}</td><td className="num">{row.numero_peca_amostrada}</td><td>{row.cavidade_molde || '—'}</td><td className="num">{row.cota_nominal_mm}</td><td className="num">{row.tolerancia_superior_mm}</td><td className="num">{row.tolerancia_inferior_mm}</td><td className="num">{row.valor_medido_mm ?? '—'}</td><td className="num">{row.desvio_mm ?? '—'}</td><td><span className={row.status === 'OK' ? 'status-ok' : row.status === 'NOK' ? 'status-nok' : 'status-pending'}>{row.status}</span></td><td>{row.instrumento || '—'}</td></tr>)}</tbody></table></div>
          {selectedSpec && selectedSpec.nominal !== null && selectedSpec.limite_inferior !== null && selectedSpec.limite_superior !== null
            ? <div className="qms-mt"><ColetaDimensionalCEP limiteInferior={Number(selectedSpec.limite_inferior)} limiteSuperior={Number(selectedSpec.limite_superior)} lote={currentReceivingLot?.lote_interno} codigoProduto={currentProduct?.codigo} descricaoProduto={selectedSpec.caracteristica + (selectedSpec.unidade ? ` (${selectedSpec.unidade})` : '')} onRegistrar={data => { void saveCepMeasurements(data) }}/></div>
            : <div className="qms-message qms-mt">Selecione uma especificação técnica ativa com nominal e limites completos para habilitar a coleta CEP de 18 amostras.</div>}
        </section>}

        {tab === 'rastreabilidade' && <section className="qms-panel">
          <div className="qms-search"><label className={labelClass()}>Número de lote / corrida<input className={fieldClass(false)} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void searchGenealogy() }} placeholder="Preencher..." /></label><button className="qms-btn" type="button" disabled={busy} onClick={() => void searchGenealogy()}><Search size={13}/> BUSCAR GENEALOGIA</button></div>
          <div className="qms-tree"><div className="tree-node">MATÉRIA-PRIMA / LOTE FORNECEDOR</div><div className="tree-arrow">↓</div><div className="tree-node">OPERADOR → MÁQUINA → DATA/HORA</div><div className="tree-arrow">↓</div><div className="tree-node">PEDIDO DE VENDA</div></div>
          <div className="qms-table-wrap qms-mt"><table><thead><tr><th>Lote final</th><th>Lote fornecedor</th><th>Produto</th><th>Fornecedor</th><th>Operador</th><th>Máquina</th><th>Apontamento</th><th>Pedido</th></tr></thead><tbody>{genealogy.map((row) => <tr key={row.id}><td>{row.lote_interno}</td><td>{row.lote_fornecedor || '—'}</td><td>{row.produto}</td><td>{row.fornecedor}</td><td>{row.operador}</td><td>{row.maquina}</td><td>{row.apontado_em ? new Date(row.apontado_em).toLocaleString('pt-BR') : '—'}</td><td>{row.pedido || '—'}</td></tr>)}{!genealogy.length && <tr><td colSpan={8} className="empty">Nenhum vínculo encontrado para a busca atual.</td></tr>}</tbody></table></div>
        </section>}
      </div>
      <style>{`
        .qms-compact{padding:8px;background:#f4f7fe}.qms-tabs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.qms-tabs button{height:30px;padding:0 9px;border:1px solid #cbd5e1;border-radius:2px;background:#fff;color:#123b50;font-size:10px;font-weight:500}.qms-tabs button.active,.qms-tabs button.refresh{background:#2d8db8;border-color:#2d8db8;color:#fff}.qms-tabs .refresh{margin-left:auto;display:inline-flex;align-items:center;gap:4px}.qms-panel{border:1px solid #cbd5e1;background:#fff;border-radius:2px;padding:8px}.qms-grid{display:grid;gap:6px}.qms-grid-6{grid-template-columns:1.6fr 1.2fr .9fr .8fr .9fr .9fr}.qms-grid-4{grid-template-columns:1fr 1fr 1fr 1.6fr}.qms-grid-8{grid-template-columns:1.3fr .7fr .9fr 1fr 1fr 1fr 1fr 1fr}.qms-grid-9{grid-template-columns:1.2fr 1.5fr .6fr .8fr .8fr .8fr .8fr .9fr .9fr}.qms-mt{margin-top:6px}.qms-actions{display:flex;align-items:end}.qms-btn{height:30px;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 10px;border:1px solid #2d8db8;border-radius:2px;background:#2d8db8;color:#fff;font-size:10px;font-weight:500}.qms-btn:disabled,.qms-mini:disabled{opacity:.5}.qms-mini{height:26px;padding:0 6px;border:1px solid #2d8db8;border-radius:2px;background:#fff;color:#2d8db8;font-size:9px;font-weight:500}.qms-mini.approve{background:#2d8db8;color:#fff}.qms-mini.block{border-color:#d65b61;background:#d65b61;color:#fff}.qms-table-wrap{overflow:auto;border:1px solid #dbe3e8}.qms-table-wrap table{width:100%;border-collapse:collapse;font-size:10px}.qms-table-wrap th,.qms-table-wrap td{height:28px;padding:3px 6px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.qms-table-wrap th{background:#f1f5f9;color:#475569;font-size:9px;font-weight:500;text-transform:uppercase;text-align:left}.qms-table-wrap td.num{text-align:right;font-variant-numeric:tabular-nums}.status-ok{color:#2d8db8;font-weight:500}.status-nok,.red-status{color:#d65b61;font-weight:500}.status-pending{color:#a16207;font-weight:500}.blue-status{color:#2d8db8}.qms-measure-status{display:flex;align-items:center;gap:10px;margin-top:6px;min-height:30px;padding:4px 6px;background:#f8fafc;border:1px solid #dbe3e8;font-size:10px}.qms-measure-status .qms-btn{margin-left:auto}.qms-search{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:6px;align-items:end}.qms-tree{display:grid;grid-template-columns:1fr 40px 1fr 40px 1fr;align-items:center;margin-top:8px}.tree-node{height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #2d8db8;background:#f4fbfd;color:#123b50;font-size:10px;font-weight:500;text-align:center}.tree-arrow{text-align:center;color:#2d8db8;font-weight:500}.qms-message{margin-bottom:6px;padding:6px 8px;border:1px solid #b7d8e5;background:#f4fbfd;color:#17445a;font-size:10px}.qms-message.error{border-color:#fca5a5;background:#fff1f2;color:#991b1b}.empty{text-align:center;color:#64748b;padding:14px!important}@media(max-width:1050px){.qms-grid-6,.qms-grid-8,.qms-grid-9{grid-template-columns:repeat(3,minmax(0,1fr))}.qms-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.qms-grid-6,.qms-grid-8,.qms-grid-9,.qms-grid-4,.qms-search,.qms-tree{grid-template-columns:1fr}.qms-tree{gap:4px}.tree-arrow{transform:rotate(90deg)}.qms-measure-status{flex-wrap:wrap}.qms-measure-status .qms-btn{margin-left:0}}
      `}</style>
    </VendasLayout>
  )
}
