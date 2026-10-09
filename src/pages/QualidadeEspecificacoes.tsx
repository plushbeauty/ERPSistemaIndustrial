import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import QualitySidebar from '../components/quality/QualitySidebar'

type Product = LookupRecord
type Specification = {
  id: string
  produto_id: string
  codigo: string
  caracteristica: string
  unidade: string | null
  limite_inferior: number | null
  limite_superior: number | null
  frequencia: string | null
  status: string | null
}
type FormState = {
  id: string
  produto_id: string
  codigo: string
  caracteristica: string
  unidade: string
  limite_inferior: string
  limite_superior: string
  frequencia: string
  status: 'ativo' | 'inativo'
}
const emptyForm: FormState = {
  id: '', produto_id: '', codigo: '', caracteristica: '', unidade: '',
  limite_inferior: '', limite_superior: '', frequencia: '100%', status: 'ativo',
}
const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'

export default function QualidadeEspecificacoes() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<Specification[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [productResult, specResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_planos_inspecao').select('id,produto_id,codigo,caracteristica,unidade,limite_inferior,limite_superior,frequencia,status').eq('empresa_id', id).order('codigo').limit(2000),
      ])
      if (productResult.error) throw productResult.error
      if (specResult.error) throw specResult.error
      setEmpresaId(id)
      setProducts((productResult.data ?? []) as Product[])
      setRows((specResult.data ?? []) as Specification[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar especificações técnicas.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(row => {
      if (!showInactive && (row.status ?? '').toLowerCase() !== 'ativo') return false
      const product = products.find(item => item.id === row.produto_id)
      return !term || [row.codigo, row.caracteristica, row.unidade, row.frequencia, product?.codigo, product?.nome]
        .some(value => String(value ?? '').toLowerCase().includes(term))
    })
  }, [rows, products, query, showInactive])

  function edit(row: Specification) {
    setForm({
      id: row.id, produto_id: row.produto_id, codigo: row.codigo,
      caracteristica: row.caracteristica, unidade: row.unidade ?? '',
      limite_inferior: row.limite_inferior == null ? '' : String(row.limite_inferior),
      limite_superior: row.limite_superior == null ? '' : String(row.limite_superior),
      frequencia: row.frequencia ?? '100%',
      status: (row.status ?? 'ativo').toLowerCase() === 'inativo' ? 'inativo' : 'ativo',
    })
    setError('')
    setNotice('')
  }

  async function save() {
    setError('')
    setNotice('')
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!form.produto_id || !products.some(product => product.id === form.produto_id)) {
      setError('Selecione um produto real da empresa atual pela busca de código.')
      return
    }
    if (!form.codigo.trim() || !form.caracteristica.trim()) {
      setError('Código da especificação e característica são obrigatórios.')
      return
    }
    const lower = form.limite_inferior.trim() === '' ? null : Number(form.limite_inferior)
    const upper = form.limite_superior.trim() === '' ? null : Number(form.limite_superior)
    if ((lower !== null && !Number.isFinite(lower)) || (upper !== null && !Number.isFinite(upper))) {
      setError('Os limites técnicos precisam ser números válidos.')
      return
    }
    if (lower !== null && upper !== null && lower > upper) {
      setError('O limite mínimo não pode ser maior que o limite máximo.')
      return
    }
    if (lower === null && upper === null && form.status === 'ativo') {
      setError('Uma especificação ativa precisa de pelo menos um limite técnico.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        empresa_id: empresaId,
        produto_id: form.produto_id,
        codigo: form.codigo.trim(),
        caracteristica: form.caracteristica.trim(),
        unidade: form.unidade.trim() || null,
        limite_inferior: lower,
        limite_superior: upper,
        frequencia: form.frequencia.trim() || '100%',
        status: form.status,
      }
      const result = form.id
        ? await supabase.from('erp_planos_inspecao').update(payload).eq('id', form.id).eq('empresa_id', empresaId)
        : await supabase.from('erp_planos_inspecao').insert(payload)
      if (result.error) throw result.error
      setNotice(form.id ? 'Especificação atualizada no banco real.' : 'Especificação cadastrada no banco real.')
      setForm(emptyForm)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar especificação técnica.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(row: Specification) {
    setError('')
    setNotice('')
    if (!empresaId) return setError('Empresa da sessão não identificada.')
    setBusy(true)
    try {
      const next = (row.status ?? '').toLowerCase() === 'ativo' ? 'inativo' : 'ativo'
      if (next === 'ativo' && row.limite_inferior == null && row.limite_superior == null) {
        throw new Error('Não é possível ativar uma especificação sem limite técnico.')
      }
      const result = await supabase.from('erp_planos_inspecao').update({ status: next }).eq('id', row.id).eq('empresa_id', empresaId)
      if (result.error) throw result.error
      setNotice(next === 'ativo' ? 'Especificação reativada.' : 'Especificação inativada sem apagar o histórico.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao alterar o status.')
    } finally {
      setBusy(false)
    }
  }

  return <main data-quality-workspace className="erp-global-surface erp-compact min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3">
        <div><p className="text-[9px] font-medium uppercase tracking-widest text-sky-300">SGQ • CADASTRO MESTRE</p><h1 className="text-[15px] font-semibold">Especificações Técnicas</h1><p className="mt-1 text-[10px] text-slate-300">Critérios controlados pela Qualidade e consumidos pelas inspeções e pelo recebimento.</p></div>
        <div className="flex gap-2"><button type="button" className="border border-slate-500 px-3 text-[10px]" disabled={busy} onClick={() => void load()}><RefreshCw size={13} className="mr-1 inline"/> Atualizar</button><button type="button" className="bg-sky-600 px-3 text-[10px] text-white" onClick={() => { setForm(emptyForm); setError(''); setNotice('') }}><Plus size={13} className="mr-1 inline"/> Nova especificação</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-[1700px] space-y-3 p-3">
      <QualitySidebar active="/qualidade/especificacoes"/>
      {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-200 bg-red-50 p-2 text-[11px] text-red-800' : 'border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800'}>{error || notice}</div>}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[12px] font-semibold">{form.id ? 'Editar especificação' : 'Cadastro da especificação'}</h2>{form.id && <button type="button" className="border border-slate-300 px-2" onClick={() => setForm(emptyForm)} aria-label="Cancelar edição"><X size={13}/></button>}</div>
          <div className="grid gap-2">
            <EntityCodeLookup label="Produto / código" value={form.produto_id} records={products} onChange={value => setForm(current => ({ ...current, produto_id: value }))} onSelect={product => setForm(current => ({ ...current, produto_id: product.id }))} required helper="Selecione o produto da empresa atual." compact/>
            <label className={label}>Código da especificação<input className={input} value={form.codigo} onChange={event => setForm(current => ({ ...current, codigo: event.target.value }))} placeholder="Ex.: DIV-001" required/></label>
            <label className={label}>Característica técnica<input className={input} value={form.caracteristica} onChange={event => setForm(current => ({ ...current, caracteristica: event.target.value }))} placeholder="Comprimento, diâmetro, aparência..." required/></label>
            <label className={label}>Unidade de medida<input className={input} value={form.unidade} onChange={event => setForm(current => ({ ...current, unidade: event.target.value }))} placeholder="mm, g, N, visual"/></label>
            <div className="grid grid-cols-2 gap-2"><label className={label}>Limite mínimo<input className={input} type="number" step="any" value={form.limite_inferior} onChange={event => setForm(current => ({ ...current, limite_inferior: event.target.value }))}/></label><label className={label}>Limite máximo<input className={input} type="number" step="any" value={form.limite_superior} onChange={event => setForm(current => ({ ...current, limite_superior: event.target.value }))}/></label></div>
            <label className={label}>Frequência de inspeção<input className={input} value={form.frequencia} onChange={event => setForm(current => ({ ...current, frequencia: event.target.value }))} placeholder="100%, por hora, por lote..."/></label>
            <label className={label}>Status<select className={input} value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as FormState['status'] }))}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
            <button type="button" disabled={busy} className="bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50" onClick={() => void save()}><Save size={13} className="mr-1 inline"/>{busy ? 'Gravando…' : 'Gravar especificação'}</button>
          </div>
        </section>
        <section className="min-w-0 border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-[12px] font-semibold">Especificações cadastradas</h2><p className="text-[10px] text-slate-500">{visibleRows.length} registros visíveis • dados reais por empresa</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1"><Search size={13}/><input className="h-[30px] w-[220px] rounded-[2px] border border-slate-300 px-2 text-[11px]" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código, produto ou característica"/></div><label className="flex items-center gap-1 text-[10px] normal-case"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)}/> Incluir inativas</label></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-slate-100"><tr><th>Código</th><th>Produto</th><th>Característica</th><th>Limites</th><th>Frequência</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {visibleRows.map(row => { const product = products.find(item => item.id === row.produto_id); return <tr key={row.id} className="border-t border-slate-100"><td className="font-semibold">{row.codigo}</td><td>{product ? `${product.codigo} — ${product.nome}` : 'Produto não localizado'}</td><td>{row.caracteristica}{row.unidade ? ` (${row.unidade})` : ''}</td><td>{row.limite_inferior ?? '−∞'} a {row.limite_superior ?? '+∞'}</td><td>{row.frequencia || '—'}</td><td>{row.status || '—'}</td><td><div className="flex gap-1"><button type="button" className="border border-slate-300 px-2" onClick={() => edit(row)}><Check size={12} className="mr-1 inline"/> Editar</button><button type="button" className="border border-slate-300 px-2" disabled={busy} onClick={() => void toggleStatus(row)}>{(row.status ?? '').toLowerCase() === 'ativo' ? 'Inativar' : 'Ativar'}</button></div></td></tr> }) }
            {!visibleRows.length && <tr><td colSpan={7} className="p-6 text-center text-[11px] text-slate-500">{busy ? 'Carregando dados...' : 'Nenhuma especificação para os filtros atuais.'}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500"><ShieldCheck size={13}/> Os critérios são armazenados em erp_planos_inspecao; inativação preserva o histórico e a consulta do produto é limitada à empresa autenticada.</div>
    </div>
  </main>
}
