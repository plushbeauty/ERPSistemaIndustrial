import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardCheck, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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
type LotRow = { id: string; produto_id: string; numero_lote: string; status: 'liberado' | 'bloqueado' | 'quarentena' }

const fieldClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const labelClass = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-slate-600'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export default function QualidadeInspecoesIndustrial() {
  const [companyId, setCompanyId] = useState('')
  const [rows, setRows] = useState<InspectionRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [lots, setLots] = useState<LotRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<InspectionRow['tipo']>('recebimento')
  const [produtoId, setProdutoId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [amostra, setAmostra] = useState('1')
  const [resultado, setResultado] = useState<InspectionRow['resultado']>('aprovado')
  const [observacoes, setObservacoes] = useState('')
  const [parametro, setParametro] = useState('')
  const [nominal, setNominal] = useState('')
  const [tolMais, setTolMais] = useState('')
  const [tolMenos, setTolMenos] = useState('')
  const [medido, setMedido] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
      setError(tenant.error?.message ?? 'Empresa ativa não identificada.')
      setLoading(false)
      return
    }
    setCompanyId(tenant.data)
    const [inspectionResult, productResult, lotResult] = await Promise.all([
      supabase.from('qualidade_inspecoes').select('id,tipo,produto_id,lote_id,quantidade_total,tamanho_amostra,resultado,observacoes,created_at').eq('empresa_id', tenant.data).order('created_at', { ascending: false }).limit(500),
      supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(1000),
      supabase.from('estoque_lotes').select('id,produto_id,numero_lote,status').eq('empresa_id', tenant.data).order('numero_lote').limit(1000),
    ])
    const failure = inspectionResult.error ?? productResult.error ?? lotResult.error
    if (failure) setError(failure.message)
    else {
      setRows((inspectionResult.data ?? []) as InspectionRow[])
      setProducts((productResult.data ?? []) as ProductRow[])
      setLots((lotResult.data ?? []) as LotRow[])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

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
    if (!produtoId || !loteId || Number(quantidade) < 0 || Number(amostra) < 0 || !parametro.trim() || nominal === '' || tolMais === '' || tolMenos === '' || medido === '') {
      setError('Informe item, lote, quantidade e tamanho de amostra válidos.')
      return
    }
    const n = Number(nominal), plus = Number(tolMais), minus = Number(tolMenos), value = Number(medido)
    if (![n, plus, minus, value].every(Number.isFinite) || plus < 0 || minus < 0) { setError('Informe medição e tolerâncias válidas.'); return }
    const measurement = { numero_peca: 1, parametro: parametro.trim(), valor_nominal: n, tolerancia_superior: plus, tolerancia_inferior: minus, valor_medido: value, limite_superior: n + plus, limite_inferior: n - minus, status: value >= n - minus && value <= n + plus ? 'pass' : 'fail' }
    setSaving(true)
    const inspectionResult = measurement.status === 'fail' ? 'reprovado' : resultado
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
    setObservacoes(''); setParametro(''); setNominal(''); setTolMais(''); setTolMenos(''); setMedido('')
    await load()
  }

  const counts = useMemo(() => ({
    total: rows.length,
    rejected: rows.filter(row => row.resultado === 'reprovado').length,
    approved: rows.filter(row => row.resultado === 'aprovado').length,
  }), [rows])

  return (
    <main className="min-h-full bg-slate-50 p-3 text-slate-900">
      <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-sky-700" />
          <div>
            <h1 className="text-sm font-semibold">Qualidade industrial · Inspeções</h1>
            <p className="text-[10px] text-slate-500">Rastreabilidade de lotes e registro dimensional</p>
          </div>
        </div>
        <button className={buttonClass} onClick={() => void load()} disabled={loading}><RefreshCw size={13} /> Atualizar</button>
      </header>

      <section className="mb-3 grid grid-cols-3 gap-2">
        {[['INSPEÇÕES', counts.total], ['APROVADAS', counts.approved], ['REPROVADAS', counts.rejected]].map(([label, value]) => (
          <div key={String(label)} className="border border-slate-200 bg-white p-2">
            <div className={labelClass}>{label}</div><div className="text-base font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      <section className="mb-3 border border-slate-200 bg-white p-3">
        <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold"><ClipboardCheck size={14} /> Registrar inspeção</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label title="Selecione a etapa de inspeção: recebimento, processo produtivo ou produto final."><span className={labelClass}>TIPO</span><select className={fieldClass} value={tipo} onChange={event => setTipo(event.target.value as InspectionRow['tipo'])}><option value="recebimento">Recebimento</option><option value="processo">Processo</option><option value="produto_final">Produto final</option></select></label>
          <label title="Selecione o produto ativo cadastrado na empresa."><span className={labelClass}>ITEM</span><select className={fieldClass} value={produtoId} onChange={event => { setProdutoId(event.target.value); setLoteId('') }}><option value="">Selecionar item…</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} — {product.descricao_tecnica}</option>)}</select></label>
          <label title="Selecione um lote do produto escolhido. Lotes bloqueados não podem ser selecionados."><span className={labelClass}>LOTE</span><select className={fieldClass} value={loteId} onChange={event => setLoteId(event.target.value)}><option value="">Selecionar lote…</option>{lots.filter(lot => (!produtoId || lot.produto_id === produtoId) && lot.status !== 'bloqueado').map(lot => <option key={lot.id} value={lot.id}>{lot.numero_lote} · {lot.status}</option>)}</select></label>
          <label title="Resultado global da amostragem. Uma medição fora da tolerância força reprovação e quarentena."><span className={labelClass}>RESULTADO</span><select className={fieldClass} value={resultado} onChange={event => setResultado(event.target.value as InspectionRow['resultado'])}><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option><option value="aprovado_com_restricao">Com restrição</option></select></label>
          <label title="Quantidade total de unidades do lote, em unidade de estoque."><span className={labelClass}>QUANTIDADE TOTAL</span><input className={fieldClass} type="number" min="0" step="0.001" value={quantidade} onChange={event => setQuantidade(event.target.value)} /></label>
          <label title="Número inteiro de unidades inspecionadas do lote."><span className={labelClass}>TAMANHO DA AMOSTRA</span><input className={fieldClass} type="number" min="0" step="1" value={amostra} onChange={event => setAmostra(event.target.value)} /></label>
          <label title="Registre evidências, condição observada e informação necessária para rastreabilidade."><span className={labelClass}>OBSERVAÇÕES TÉCNICAS</span><input className={fieldClass} value={observacoes} onChange={event => setObservacoes(event.target.value)} maxLength={2000} /></label><label title="Nome da característica medida, por exemplo diâmetro ou comprimento."><span className={labelClass}>PARÂMETRO / COTA</span><input className={fieldClass} value={parametro} onChange={event => setParametro(event.target.value)} placeholder="Ex.: diâmetro" /></label><label title="Valor de referência da especificação, na unidade da característica medida."><span className={labelClass}>VALOR NOMINAL</span><input className={fieldClass} type="number" step="any" value={nominal} onChange={event => setNominal(event.target.value)} /></label><label title="Desvio positivo permitido acima do valor nominal, na mesma unidade da cota."><span className={labelClass}>TOLERÂNCIA +</span><input className={fieldClass} type="number" min="0" step="any" value={tolMais} onChange={event => setTolMais(event.target.value)} /></label><label title="Desvio absoluto permitido abaixo do valor nominal, na mesma unidade da cota."><span className={labelClass}>TOLERÂNCIA −</span><input className={fieldClass} type="number" min="0" step="any" value={tolMenos} onChange={event => setTolMenos(event.target.value)} /></label><label title="Valor lido no instrumento calibrado, na mesma unidade do nominal e das tolerâncias."><span className={labelClass}>VALOR MEDIDO</span><input className={fieldClass} type="number" step="any" value={medido} onChange={event => setMedido(event.target.value)} /></label>
          <div className="flex items-end"><button className="h-[30px] w-full rounded-[2px] bg-sky-700 px-3 text-[10px] font-semibold text-white hover:bg-sky-800 disabled:opacity-50" onClick={() => void saveInspection()} disabled={saving || loading}>{saving ? 'Salvando…' : 'Salvar inspeção'}</button></div>
        </div>
        {error && <p role="alert" className="mt-2 flex items-center gap-1 text-[10px] text-red-700"><AlertTriangle size={13} /> {error}</p>}
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-2">
          <h2 className="text-xs font-semibold">Histórico de inspeções</h2>
          <div className="relative w-64 max-w-full"><Search size={13} className="absolute left-2 top-2 text-slate-400" /><input className={fieldClass + ' pl-7'} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar item, lote ou resultado…" /></div>
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left text-[10px]">
            <thead className="sticky top-0 bg-slate-100 text-[9px] uppercase text-slate-600"><tr>{['Data/hora','Tipo','Item','Lote','Qtd.','Amostra','Resultado','Observações'].map(title => <th key={title} className="h-[32px] whitespace-nowrap border-b border-slate-200 px-2 font-semibold">{title}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="h-16 px-3 text-center text-slate-500">Carregando inspeções do Supabase…</td></tr>
                : visibleRows.length === 0 ? <tr><td colSpan={8} className="h-16 px-3 text-center text-slate-500">Nenhuma inspeção encontrada.</td></tr>
                : visibleRows.map(row => {
                  const product = products.find(item => item.id === row.produto_id)
                  const lot = lots.find(item => item.id === row.lote_id)
                  return <tr key={row.id} className="h-[32px] border-b border-slate-100 hover:bg-neutral-50/80">
                    <td className="whitespace-nowrap px-2 tabular-nums">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-2">{row.tipo}</td><td className="px-2">{product?.codigo ?? row.produto_id}</td>
                    <td className="px-2">{lot?.numero_lote ?? row.lote_id}</td><td className="px-2 text-right tabular-nums">{row.quantidade_total}</td>
                    <td className="px-2 text-right tabular-nums">{row.tamanho_amostra}</td>
                    <td className={'px-2 font-semibold ' + (row.resultado === 'reprovado' ? 'text-red-700' : row.resultado === 'aprovado' ? 'text-emerald-700' : 'text-amber-700')}>{row.resultado.replaceAll('_', ' ')}</td>
                    <td className="max-w-64 truncate px-2">{row.observacoes ?? '—'}</td>
                  </tr>
                })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-2 text-[9px] text-slate-500">A reprovação aciona a transação SQL de quarentena e a abertura automática de RNC configuradas na migração do SGQ.</p>
    </main>
  )
}
