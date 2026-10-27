/**
 * ERPSis — CONTROLE DE REVISÃO VISUAL
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: SYSNQRA ERP INDUSTRIAL
 * @STATUS_APROVACAO: INSPECOES-LOTES-STEEL-BLUE-OK
 * Split-screen, tabela densa, grid de 12 colunas, controles h-8 e cantos retos.
 * Contrato de dados preservado: tabelas existentes, tenant ativo, RLS e RPC transacional.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardCheck, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import QualitySidebar from '../components/quality/QualitySidebar'

type InspectionRow = {
  id: string
  tipo: 'recebimento' | 'processo' | 'produto_final'
  produto_id: string
  lote_id: string
  quantidade_total: number
  tamanho_amostra: number
  resultado: 'aprovado' | 'reprovado' | 'aprovado_com_restricao'
  observacoes: string | null
  created_at: string
}

type ProductRow = { id: string; codigo: string; descricao_tecnica: string }
type LotRow = { id: string; produto_id: string; numero_lote: string; status: 'liberado' | 'bloqueado' | 'quarentena'; certificado_qualidade: string | null }
type SpecParameter = { codigo: string; caracteristica: string; tipo: string; unidade: string; nominal: number | null; tolerancia_inferior: number | null; tolerancia_superior: number | null; criterio_aceitacao: string; metodo_verificacao: string; obrigatorio: boolean }
type SpecRow = { id: string; produto_id: string; revisao: string; status: string; vigente_desde: string; vigente_ate: string | null; parametros: unknown }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
function parseSpecParameters(value: unknown): SpecParameter[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map(item => ({
    codigo: typeof item.codigo === 'string' ? item.codigo : '',
    caracteristica: typeof item.caracteristica === 'string' ? item.caracteristica : '',
    tipo: typeof item.tipo === 'string' ? item.tipo : 'numerico',
    unidade: typeof item.unidade === 'string' ? item.unidade : '',
    nominal: typeof item.nominal === 'number' ? item.nominal : null,
    tolerancia_inferior: typeof item.tolerancia_inferior === 'number' ? item.tolerancia_inferior : null,
    tolerancia_superior: typeof item.tolerancia_superior === 'number' ? item.tolerancia_superior : null,
    criterio_aceitacao: typeof item.criterio_aceitacao === 'string' ? item.criterio_aceitacao : '',
    metodo_verificacao: typeof item.metodo_verificacao === 'string' ? item.metodo_verificacao : '',
    obrigatorio: item.obrigatorio !== false,
  }))
}

const buttonClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#1D5FD1] bg-[#1D5FD1] px-3 text-[10px] font-bold uppercase text-white shadow-sm hover:bg-[#174DB0] disabled:opacity-50'
const steelInput = 'h-9 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70'
const steelLabel = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600'
const gridTitleClass = 'mb-2.5 block border-b border-slate-200 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#2D8DB8]'

export default function QualidadeInspecoesIndustrial() {
  const [companyId, setCompanyId] = useState('')
  const [rows, setRows] = useState<InspectionRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [lots, setLots] = useState<LotRow[]>([])
  const [specifications, setSpecifications] = useState<SpecRow[]>([])
  const [specParameterCode, setSpecParameterCode] = useState('')
  const [certificadoNumero, setCertificadoNumero] = useState('')
  const [certificadoConclusao, setCertificadoConclusao] = useState<'conforme' | 'nao_conforme' | ''>('')
  const [evidenciaTexto, setEvidenciaTexto] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<InspectionRow['tipo']>('recebimento')
  const [produtoId, setProdutoId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [amostra, setAmostra] = useState('1')
  const [resultado, setResultado] = useState<InspectionRow['resultado'] | ''>('')
  const [observacoes, setObservacoes] = useState('')
  const [parametro, setParametro] = useState('')
  const [nominal, setNominal] = useState('')
  const [tolMais, setTolMais] = useState('')
  const [tolMenos, setTolMenos] = useState('')
  const [medido, setMedido] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) {
        throw new Error('Empresa ativa não identificada.')
      }
      const tenantId = tenant.data
      setCompanyId(tenantId)
      const [inspectionRows, productRows, lotRows, specificationRows] = await Promise.all([
        fetchAllPages<InspectionRow>((from, to) =>
          supabase.from('qualidade_inspecoes')
            .select('id,tipo,produto_id,lote_id,quantidade_total,tamanho_amostra,resultado,observacoes,created_at', { count: 'exact' })
            .eq('empresa_id', tenantId)
            .order('created_at', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to),
        ),
        fetchAllPages<ProductRow>((from, to) =>
          supabase.from('engenharia_produtos')
            .select('id,codigo,descricao_tecnica', { count: 'exact' })
            .eq('empresa_id', tenantId)
            .eq('ativo', true)
            .order('codigo', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to),
        ),
        fetchAllPages<LotRow>((from, to) =>
          supabase.from('estoque_lotes')
            .select('id,produto_id,numero_lote,status,certificado_qualidade', { count: 'exact' })
            .eq('empresa_id', tenantId)
            .order('numero_lote', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to),
        ),
        fetchAllPages<SpecRow>((from, to) =>
          supabase.from('qualidade_especificacoes')
            .select('id,produto_id,revisao,status,vigente_desde,vigente_ate,parametros', { count: 'exact' })
            .eq('empresa_id', tenantId)
            .eq('status', 'ativa')
            .order('vigente_desde', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to),
        ),
      ])
      setRows(inspectionRows)
      setProducts(productRows)
      setLots(lotRows)
      setSpecifications(specificationRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados da inspeção.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selectedSpecification = useMemo(() => {
    if (!produtoId) return null
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    return specifications.filter(spec => spec.produto_id === produtoId && spec.status === 'ativa' && spec.vigente_desde <= today && (!spec.vigente_ate || spec.vigente_ate >= today)).sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0] ?? null
  }, [specifications, produtoId])
  const specificationParameters = useMemo(() => parseSpecParameters(selectedSpecification?.parametros), [selectedSpecification])
  const selectedSpecificationParameter = specificationParameters.find(parameter => parameter.codigo === specParameterCode) ?? null
  const isNonNumericReview = Boolean(selectedSpecificationParameter && selectedSpecificationParameter.tipo !== 'numerico')
  const isCertificateReview = selectedSpecificationParameter?.tipo === 'certificado'

  useEffect(() => {
    if (!selectedSpecification) {
      setSpecParameterCode('')
      return
    }
    const firstParameter = parseSpecParameters(selectedSpecification.parametros)[0]
    if (firstParameter) {
      setSpecParameterCode(firstParameter.codigo)
      setParametro(firstParameter.caracteristica)
      setNominal(firstParameter.tipo === 'numerico' && firstParameter.nominal !== null ? String(firstParameter.nominal) : '')
      setTolMais(firstParameter.tipo === 'numerico' && firstParameter.tolerancia_superior !== null ? String(firstParameter.tolerancia_superior) : '')
      setTolMenos(firstParameter.tipo === 'numerico' && firstParameter.tolerancia_inferior !== null ? String(firstParameter.tolerancia_inferior) : '')
      setMedido('')
      setCertificadoNumero(lots.find(lot => lot.produto_id === selectedSpecification.produto_id && lot.id === loteId)?.certificado_qualidade ?? '')
      setCertificadoConclusao('')
      setEvidenciaTexto('')
    } else {
      setSpecParameterCode('')
    }
  }, [selectedSpecification])

  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row => {
      const product = products.find(item => item.id === row.produto_id)
      const lot = lots.find(item => item.id === row.lote_id)
      return [product?.codigo, product?.descricao_tecnica, lot?.numero_lote, row.resultado, row.tipo]
        .some(value => value?.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [rows, products, lots, search])

  async function saveInspection() {
    setError(null)
    if (!produtoId || !loteId || !resultado || !Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0 || !Number.isInteger(Number(amostra)) || Number(amostra) <= 0) {
      setError('Informe item, lote, decisão explícita, quantidade positiva e tamanho de amostra inteiro maior que zero.')
      return
    }
    if (resultado === 'aprovado' && (!selectedSpecification || !selectedSpecificationParameter)) {
      setError('Para aprovar, selecione uma especificação técnica ativa e vigente e um critério aprovado. Sem esse vínculo, não libere o lote.')
      return
    }
    if (!selectedSpecification && !observacoes.trim()) {
      setError('Sem especificação ativa, registre a justificativa técnica nas observações antes de salvar a decisão.')
      return
    }
    if (isCertificateReview && (!certificadoNumero.trim() || !certificadoConclusao)) {
      setError('Para conferir certificado, informe o número do certificado do fornecedor e a conclusão da conferência.')
      return
    }
    if (isCertificateReview && resultado === 'aprovado' && certificadoConclusao !== 'conforme') {
      setError('O certificado precisa estar conforme a especificação aprovada para permitir a liberação.')
      return
    }
    if (isNonNumericReview && !isCertificateReview && !evidenciaTexto.trim()) {
      setError('Registre a evidência observada para este critério visual ou textual.')
      return
    }
    let measurementStatus: 'pass' | 'fail' = 'pass'
    let measurement: Record<string, string | number | boolean | null>
    if (isNonNumericReview && selectedSpecificationParameter) {
      measurementStatus = isCertificateReview && certificadoConclusao === 'nao_conforme' ? 'fail' : resultado === 'reprovado' ? 'fail' : 'pass'
      measurement = {
        numero_peca: 1,
        tipo_evidencia: isCertificateReview ? 'certificado_fornecedor' : selectedSpecificationParameter.tipo,
        parametro: selectedSpecificationParameter.caracteristica,
        especificacao_id: selectedSpecification?.id ?? null,
        especificacao_revisao: selectedSpecification?.revisao ?? null,
        criterio_codigo: selectedSpecificationParameter.codigo,
        criterio_caracteristica: selectedSpecificationParameter.caracteristica,
        criterio_aceitacao: selectedSpecificationParameter.criterio_aceitacao,
        metodo_verificacao: selectedSpecificationParameter.metodo_verificacao,
        unidade: selectedSpecificationParameter.unidade || null,
        numero_certificado: isCertificateReview ? certificadoNumero.trim() : null,
        conclusao_certificado: isCertificateReview ? certificadoConclusao : null,
        evidencia_observada: evidenciaTexto.trim() || null,
        status: measurementStatus,
      }
    } else {
      if (!parametro.trim() || nominal === '' || tolMais === '' || tolMenos === '' || medido === '') {
        setError('Para inspeção dimensional, informe característica, nominal, tolerâncias e valor medido.')
        return
      }
      const n = Number(nominal), plus = Number(tolMais), minus = Number(tolMenos), value = Number(medido)
      if (![n, plus, minus, value].every(Number.isFinite) || plus < 0 || minus < 0) { setError('Informe medição e tolerâncias válidas.'); return }
      if (resultado === 'aprovado' && selectedSpecificationParameter && (Number(nominal) !== selectedSpecificationParameter.nominal || Number(tolMais) !== selectedSpecificationParameter.tolerancia_superior || Number(tolMenos) !== selectedSpecificationParameter.tolerancia_inferior)) {
        setError('Os limites informados diferem da especificação aprovada. Recarregue o critério oficial antes de aprovar.')
        return
      }
      measurementStatus = value >= n - minus && value <= n + plus ? 'pass' : 'fail'
      measurement = { numero_peca: 1, parametro: parametro.trim(), valor_nominal: n, tolerancia_superior: plus, tolerancia_inferior: minus, valor_medido: value, limite_superior: n + plus, limite_inferior: n - minus, status: measurementStatus, especificacao_id: selectedSpecification?.id ?? null, especificacao_revisao: selectedSpecification?.revisao ?? null, criterio_codigo: selectedSpecificationParameter?.codigo ?? null, criterio_caracteristica: selectedSpecificationParameter?.caracteristica ?? parametro.trim(), unidade: selectedSpecificationParameter?.unidade ?? null, metodo_verificacao: selectedSpecificationParameter?.metodo_verificacao ?? null }
    }
    setSaving(true)
    const inspectionResult: InspectionRow['resultado'] = measurementStatus === 'fail' ? 'reprovado' : resultado
    const resultInsert = await supabase.rpc('erp_salvar_inspecao_lote', {
      p_tipo: tipo,
      p_produto_id: produtoId,
      p_lote_id: loteId,
      p_quantidade_total: Number(quantidade),
      p_tamanho_amostra: Number(amostra),
      p_medicoes: [measurement],
      p_resultado: inspectionResult,
      p_observacoes: observacoes.trim() || null,
    })
    setSaving(false)
    if (resultInsert.error) {
      setError(resultInsert.error.message)
      return
    }
    setObservacoes(''); setParametro(''); setNominal(''); setTolMais(''); setTolMenos(''); setMedido(''); setResultado(''); setSpecParameterCode(''); setCertificadoNumero(''); setCertificadoConclusao(''); setEvidenciaTexto('')
    await load()
  }

  const counts = useMemo(() => ({
    total: rows.length,
    rejected: rows.filter(row => row.resultado === 'reprovado').length,
    approved: rows.filter(row => row.resultado === 'aprovado').length,
  }), [rows])

  return (
    <main data-quality-workspace className="min-h-screen bg-[#F4FBFD] p-3 font-sans text-[#123B50] antialiased sm:p-4"><QualitySidebar active="/qualidade/inspecoes" />
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#48B7C7]" />
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-[#2D8DB8]">SYSNQRA ERP INDUSTRIAL / SGQ</p><h1 className="text-xl font-extrabold text-slate-900">Controle de inspeção de lotes</h1>
            <p className="text-xs text-slate-600">Amostragem, critérios técnicos aprovados, laudos e rastreabilidade</p>
          </div>
        </div>
        <button className={buttonClass} onClick={() => void load()} disabled={loading}><RefreshCw size={13} /> Atualizar</button>
      </header>

      <section className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[['INSPEÇÕES', counts.total], ['APROVADAS', counts.approved], ['REPROVADAS', counts.rejected]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2">
            <div className={steelLabel}>{label}</div><div className="text-base font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12"><section className="mb-3 min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm p-3 xl:col-span-6">
        <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold"><ClipboardCheck size={14} /> Registrar inspeção</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <label className="lg:col-span-3" title="Selecione a etapa de inspeção: recebimento, processo produtivo ou produto final."><span className={steelLabel}>TIPO</span><select className={steelInput} value={tipo} onChange={event => setTipo(event.target.value as InspectionRow['tipo'])}><option value="recebimento">Recebimento</option><option value="processo">Processo</option><option value="produto_final">Produto final</option></select></label>
          <label className="lg:col-span-3" title="Critério obtido da especificação técnica aprovada e vigente do produto."><span className={steelLabel}>CRITÉRIO APROVADO</span><select className={steelInput} value={specParameterCode} onChange={event => { const code = event.target.value; setSpecParameterCode(code); const selected = specificationParameters.find(parameter => parameter.codigo === code); if (selected) { setParametro(selected.caracteristica); setNominal(selected.nominal === null ? '' : String(selected.nominal)); setTolMais(selected.tolerancia_superior === null ? '' : String(selected.tolerancia_superior)); setTolMenos(selected.tolerancia_inferior === null ? '' : String(selected.tolerancia_inferior)); setMedido('') } }} disabled={!selectedSpecification}><option value="">{selectedSpecification ? 'Selecione a característica…' : 'Sem especificação ativa'}</option>{specificationParameters.map(parameter => <option key={parameter.codigo} value={parameter.codigo}>{parameter.codigo} — {parameter.caracteristica}{parameter.tipo !== 'numerico' ? ' · ' + parameter.tipo : ''}</option>)}</select></label>
          <label className="lg:col-span-6" title="Selecione o produto ativo cadastrado na empresa."><span className={steelLabel}>ITEM</span><select className={steelInput} value={produtoId} onChange={event => { setProdutoId(event.target.value); setLoteId(''); setSpecParameterCode(''); setParametro(''); setNominal(''); setTolMais(''); setTolMenos(''); setMedido('') }}><option value="">Selecionar item…</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} — {product.descricao_tecnica}</option>)}</select></label>
          <label className="lg:col-span-6" title="Selecione um lote do produto escolhido. Lotes bloqueados não podem ser selecionados."><span className={steelLabel}>LOTE</span><select className={steelInput} value={loteId} onChange={event => { const id = event.target.value; setLoteId(id); setCertificadoNumero(lots.find(lot => lot.id === id)?.certificado_qualidade ?? '') }}><option value="">Selecionar lote…</option>{lots.filter(lot => (!produtoId || lot.produto_id === produtoId) && lot.status !== 'bloqueado').map(lot => <option key={lot.id} value={lot.id}>{lot.numero_lote} · {lot.status}</option>)}</select></label>
          <label className="lg:col-span-3" title="Resultado global da amostragem. Uma medição fora da tolerância força reprovação e quarentena."><span className={steelLabel}>RESULTADO</span><select className={steelInput} value={resultado} onChange={event => { const value = event.target.value; if (value === 'aprovado' || value === 'reprovado' || value === 'aprovado_com_restricao') setResultado(value) }}><option value="">Selecionar decisão…</option><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option><option value="aprovado_com_restricao">Com restrição</option></select></label>
          <label className="lg:col-span-3" title="Quantidade total de unidades do lote, em unidade de estoque."><span className={steelLabel}>QUANTIDADE TOTAL</span><input className={steelInput} type="number" min="0.001" step="0.001" value={quantidade} onChange={event => setQuantidade(event.target.value)} /></label>
          <label className="lg:col-span-3" title="Número inteiro de unidades inspecionadas do lote."><span className={steelLabel}>TAMANHO DA AMOSTRA</span><input className={steelInput} type="number" min="1" step="1" value={amostra} onChange={event => setAmostra(event.target.value)} /></label>
          <label className="lg:col-span-6" title="Registre evidências, condição observada e informação necessária para rastreabilidade."><span className={steelLabel}>OBSERVAÇÕES TÉCNICAS</span><input className={steelInput} value={observacoes} onChange={event => setObservacoes(event.target.value)} maxLength={2000} /></label><label className="lg:col-span-3" title="Característica técnica selecionada na especificação ou informada para registrar a não conformidade."><span className={steelLabel}>PARÂMETRO / COTA</span><input className={steelInput} value={parametro} onChange={event => setParametro(event.target.value)} placeholder="Ex.: índice de fluidez, diâmetro" readOnly={Boolean(selectedSpecificationParameter)} /></label>{isNonNumericReview ? <>{isCertificateReview && <><label className="lg:col-span-3" title="Identificação do certificado emitido pelo fornecedor."><span className={steelLabel}>Nº CERTIFICADO</span><input className={steelInput} value={certificadoNumero} onChange={event => setCertificadoNumero(event.target.value)} placeholder="Nº do certificado" /></label><label className="lg:col-span-3" title="Conclusão da conferência do certificado contra a especificação aprovada."><span className={steelLabel}>CONFERÊNCIA DO CERTIFICADO</span><select className={steelInput} value={certificadoConclusao} onChange={event => setCertificadoConclusao(event.target.value === 'conforme' || event.target.value === 'nao_conforme' ? event.target.value : '')}><option value="">Selecionar conclusão…</option><option value="conforme">Conforme</option><option value="nao_conforme">Não conforme</option></select></label></>}<label className="lg:col-span-3" title="Evidência observada na conferência documental ou visual."><span className={steelLabel}>EVIDÊNCIA / OBSERVAÇÃO</span><input className={steelInput} value={evidenciaTexto} onChange={event => setEvidenciaTexto(event.target.value)} placeholder={isCertificateReview ? 'Conferência contra critério aprovado' : 'Descreva o observado'} /></label></> : <><label className="lg:col-span-3" title="Valor de referência da especificação, na unidade da característica medida."><span className={steelLabel}>VALOR NOMINAL</span><input className={steelInput} type="number" step="any" value={nominal} onChange={event => setNominal(event.target.value)} /></label><label className="lg:col-span-3" title="Desvio positivo permitido acima do valor nominal, na mesma unidade da cota."><span className={steelLabel}>TOLERÂNCIA +</span><input className={steelInput} type="number" min="0" step="any" value={tolMais} onChange={event => setTolMais(event.target.value)} /></label><label className="lg:col-span-3" title="Desvio absoluto permitido abaixo do valor nominal, na mesma unidade da cota."><span className={steelLabel}>TOLERÂNCIA −</span><input className={steelInput} type="number" min="0" step="any" value={tolMenos} onChange={event => setTolMenos(event.target.value)} /></label><label className="lg:col-span-3" title="Valor lido no instrumento calibrado, na mesma unidade do nominal e das tolerâncias."><span className={steelLabel}>VALOR MEDIDO</span><input className={steelInput} type="number" step="any" value={medido} onChange={event => setMedido(event.target.value)} /></label></>}
          <div className="flex items-end lg:col-span-12"><button className="h-9 w-full rounded-lg border border-[#1D5FD1] bg-[#1D5FD1] px-3 text-[10px] font-bold uppercase text-white shadow-sm hover:bg-[#174DB0] disabled:opacity-50" onClick={() => void saveInspection()} disabled={saving || loading}>{saving ? 'Salvando…' : 'Salvar inspeção'}</button></div>
        </div>
        {error && <p role="alert" className="mt-2 flex items-center gap-1 text-[10px] text-red-700"><AlertTriangle size={13} /> {error}</p>}
        {produtoId && <div className={`mt-3 border p-2 text-[10px] ${selectedSpecification ? 'border-sky-200 bg-sky-50 text-slate-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {selectedSpecification ? <><strong>Especificação ativa: Rev. {selectedSpecification.revisao}</strong> · vigente desde {selectedSpecification.vigente_desde}{selectedSpecification.vigente_ate ? ' até ' + selectedSpecification.vigente_ate : ''}. Para aprovar, use o critério aprovado desta revisão e mantenha os limites originais.</> : <><strong>Sem especificação técnica ativa e vigente para este produto.</strong> Não aprove o lote sem uma fonte técnica aprovada. Cadastre a revisão em Especificações Técnicas.</>}
          {selectedSpecificationParameter && selectedSpecificationParameter.tipo !== 'numerico' && <p className="mt-1">Este critério é do tipo {selectedSpecificationParameter.tipo}. Registre a evidência observada ou a conferência do certificado neste formulário; não trate este critério como medição dimensional.</p>}
        </div>}
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 p-2">
          <h2 className="text-sm font-extrabold text-slate-900">Histórico de inspeções</h2>
          <div className="relative w-64 max-w-full"><Search size={13} className="absolute left-2 top-2 text-slate-500" /><input className={steelInput + ' pl-7'} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar item, lote ou resultado…" /></div>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left text-[10px] text-slate-700 [&_td]:h-8 [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle [&_td]:font-semibold">
            <thead className="sticky top-0 bg-slate-900 text-white [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-2 [&_th]:text-[9px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-wider [&_th]:align-middle"><tr className="h-8">{['Data/hora','Tipo','Item','Lote','Qtd.','Amostra','Resultado','Observações'].map(title => <th key={title} className="h-8 whitespace-nowrap border-b border-slate-200 px-2 text-[10px] font-black uppercase tracking-wider">{title}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="h-16 px-3 text-center text-slate-500">Carregando inspeções do Supabase…</td></tr>
                : visibleRows.length === 0 ? <tr><td colSpan={8} className="h-16 px-3 text-center text-slate-500">Nenhuma inspeção encontrada.</td></tr>
                : visibleRows.map(row => {
                  const product = products.find(item => item.id === row.produto_id)
                  const lot = lots.find(item => item.id === row.lote_id)
                  return <tr key={row.id} className="h-[32px] border-b border-slate-200 hover:bg-[#123B50]">
                    <td className="whitespace-nowrap px-2 tabular-nums">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-2">{row.tipo}</td><td className="px-2">{product?.codigo ?? row.produto_id}</td>
                    <td className="px-2">{lot?.numero_lote ?? row.lote_id}</td><td className="px-2 text-right tabular-nums">{row.quantidade_total}</td>
                    <td className="px-2 text-right tabular-nums">{row.tamanho_amostra}</td>
                    <td className={'px-2 font-semibold ' + (row.resultado === 'reprovado' ? 'text-red-300' : row.resultado === 'aprovado' ? 'text-emerald-300' : 'text-amber-200')}>{row.resultado.replaceAll('_', ' ')}</td>
                    <td className="max-w-64 truncate px-2">{row.observacoes ?? '—'}</td>
                  </tr>
                })}
            </tbody>
          </table>
        </div>
      </section>
      </div><p className="mt-2 text-[10px] text-slate-600">A reprovação aciona a transação SQL de quarentena e a abertura automática de RNC configuradas na migração do SGQ.</p>
    </main>
  )
}
