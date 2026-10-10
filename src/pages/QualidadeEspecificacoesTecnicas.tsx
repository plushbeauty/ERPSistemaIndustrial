import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleHelp, FilePlus2, Plus, RefreshCw, Save, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import QualitySidebar from '../components/quality/QualitySidebar'

type Product = { id: string; codigo: string; descricao_tecnica: string; tipo_item: string | null }
type SpecRow = {
  id: string
  produto_id: string
  revisao: string
  status: 'rascunho' | 'ativa' | 'obsoleta'
  aprovada_em: string | null
  aprovador_id: string | null
  vigente_desde: string
  vigente_ate: string | null
  parametros: unknown
  created_at: string
}
type SpecParameter = {
  codigo: string
  caracteristica: string
  tipo: 'numerico' | 'visual' | 'texto' | 'certificado'
  unidade: string
  nominal: number | null
  tolerancia_inferior: number | null
  tolerancia_superior: number | null
  criterio_aceitacao: string
  metodo_verificacao: string
  obrigatorio: boolean
}
type SpecForm = { produto_id: string; revisao: string; vigente_desde: string; vigente_ate: string; parametros: SpecParameter[] }

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const emptyParameter = (): SpecParameter => ({
  codigo: '', caracteristica: '', tipo: 'numerico', unidade: '',
  nominal: null, tolerancia_inferior: null, tolerancia_superior: null,
  criterio_aceitacao: '', metodo_verificacao: '', obrigatorio: true,
})
const emptyForm = (): SpecForm => ({ produto_id: '', revisao: '', vigente_desde: today(), vigente_ate: '', parametros: [emptyParameter()] })
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function parseParameters(value: unknown): SpecParameter[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((item) => ({
    codigo: typeof item.codigo === 'string' ? item.codigo : '',
    caracteristica: typeof item.caracteristica === 'string' ? item.caracteristica : '',
    tipo: item.tipo === 'visual' || item.tipo === 'texto' || item.tipo === 'certificado' ? item.tipo : 'numerico',
    unidade: typeof item.unidade === 'string' ? item.unidade : '',
    nominal: typeof item.nominal === 'number' ? item.nominal : null,
    tolerancia_inferior: typeof item.tolerancia_inferior === 'number' ? item.tolerancia_inferior : null,
    tolerancia_superior: typeof item.tolerancia_superior === 'number' ? item.tolerancia_superior : null,
    criterio_aceitacao: typeof item.criterio_aceitacao === 'string' ? item.criterio_aceitacao : '',
    metodo_verificacao: typeof item.metodo_verificacao === 'string' ? item.metodo_verificacao : '',
    obrigatorio: item.obrigatorio !== false,
  }))
}

const statusLabel: Record<SpecRow['status'], string> = { rascunho: 'Rascunho', ativa: 'Vigente / aprovada', obsoleta: 'Obsoleta' }

export default function QualidadeEspecificacoesTecnicas() {
  const [tenantId, setTenantId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [specs, setSpecs] = useState<SpecRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<SpecForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const selectedSpec = specs.find((spec) => spec.id === selectedId) ?? null
  const canEdit = !selectedSpec || selectedSpec.status === 'rascunho'
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const visibleSpecs = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return specs.filter((spec) => {
      const product = productMap.get(spec.produto_id)
      const haystack = [product?.codigo, product?.descricao_tecnica, spec.revisao, spec.status].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
      return !term || haystack.includes(term)
    })
  }, [specs, productMap, search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada. Entre novamente no ERP.')
      const [productRows, specRows] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica,tipo_item', { count: 'exact' }).eq('empresa_id', company.data).order('codigo').range(from, to)),
        fetchAllPages<SpecRow>((from, to) => supabase.from('qualidade_especificacoes').select('id,produto_id,revisao,status,aprovada_em,aprovador_id,vigente_desde,vigente_ate,parametros,created_at', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
      ])
      setTenantId(company.data)
      setProducts(productRows)
      setSpecs(specRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o catálogo técnico e as especificações.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function startNew() {
    setSelectedId('')
    setForm(emptyForm())
    setError('')
    setNotice('')
  }

  function selectSpec(spec: SpecRow) {
    setSelectedId(spec.id)
    setForm({
      produto_id: spec.produto_id,
      revisao: spec.revisao,
      vigente_desde: spec.vigente_desde,
      vigente_ate: spec.vigente_ate ?? '',
      parametros: parseParameters(spec.parametros).length ? parseParameters(spec.parametros) : [emptyParameter()],
    })
    setError('')
    setNotice('')
  }

  function startRevision() {
    if (!selectedSpec) return
    setSelectedId('')
    setForm({ ...form, revisao: '', vigente_desde: today(), vigente_ate: '', parametros: parseParameters(selectedSpec.parametros).length ? parseParameters(selectedSpec.parametros) : [emptyParameter()] })
    setNotice('Nova revisão em rascunho. Informe o identificador de revisão aprovado no procedimento da empresa.')
    setError('')
  }

  function updateParameter(index: number, key: keyof SpecParameter, value: string | number | boolean | null) {
    setForm((current) => ({
      ...current,
      parametros: current.parametros.map((parameter, currentIndex) => currentIndex === index ? { ...parameter, [key]: value } : parameter),
    }))
  }

  function validateForm() {
    if (!form.produto_id) return 'Selecione o produto do catálogo técnico.'
    if (!form.revisao.trim()) return 'Informe o identificador da revisão.'
    if (!form.vigente_desde) return 'Informe a data inicial de vigência.'
    if (form.vigente_ate && form.vigente_ate < form.vigente_desde) return 'A data final de vigência não pode ser anterior à inicial.'
    if (!form.parametros.length) return 'Inclua pelo menos uma característica de aceitação.'
    for (const [index, parameter] of form.parametros.entries()) {
      if (!parameter.codigo.trim() || !parameter.caracteristica.trim()) return 'Preencha o código e a característica da linha ' + (index + 1) + '.'
      if (!parameter.metodo_verificacao.trim()) return 'Informe o método de verificação da linha ' + (index + 1) + '.'
      if (parameter.tipo === 'numerico') {
        if (parameter.nominal === null || parameter.tolerancia_inferior === null || parameter.tolerancia_superior === null) return 'Informe nominal e tolerâncias da característica numérica ' + parameter.codigo + '.'
        if (parameter.tolerancia_inferior < 0 || parameter.tolerancia_superior < 0) return 'As tolerâncias devem ser valores não negativos.'
      } else if (!parameter.criterio_aceitacao.trim()) {
        return 'Informe o critério de aceitação da característica ' + parameter.codigo + '.'
      }
    }
    return ''
  }

  async function saveDraft() {
    const validation = validateForm()
    if (validation) { setError(validation); setNotice(''); return }
    if (!tenantId) { setError('Empresa da sessão não identificada.'); return }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        produto_id: form.produto_id,
        revisao: form.revisao.trim(),
        status: 'rascunho' as const,
        vigente_desde: form.vigente_desde,
        vigente_ate: form.vigente_ate || null,
        parametros: form.parametros,
      }
      if (selectedSpec?.status === 'rascunho') {
        const result = await supabase.from('qualidade_especificacoes').update({
          produto_id: payload.produto_id,
          revisao: payload.revisao,
          vigente_desde: payload.vigente_desde,
          vigente_ate: payload.vigente_ate,
          parametros: payload.parametros,
        }).eq('id', selectedSpec.id).eq('empresa_id', tenantId).eq('status', 'rascunho').select('id').maybeSingle()
        if (result.error) throw result.error
        if (!result.data) throw new Error('O rascunho não foi atualizado. Recarregue e confira a revisão selecionada.')
      } else {
        const result = await supabase.from('qualidade_especificacoes').insert({ ...payload, empresa_id: tenantId }).select('id').single()
        if (result.error) throw result.error
        setSelectedId(result.data.id)
      }
      setNotice('Rascunho salvo. Ele não libera material até ser aprovado e ativado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar o rascunho.')
    } finally {
      setSaving(false)
    }
  }

  async function approveSpec() {
    if (!selectedSpec || selectedSpec.status !== 'rascunho') return
    const validation = validateForm()
    if (validation) { setError(validation); return }
    if (!tenantId) { setError('Empresa da sessão não identificada.'); return }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão autenticada não encontrada.')
      const approver = await supabase.from('erp_usuarios').select('id').eq('auth_user_id', auth.data.user.id).eq('empresa_id', tenantId).maybeSingle()
      if (approver.error) throw approver.error
      if (!approver.data?.id) throw new Error('Não foi encontrado um usuário ERP vinculado à sessão para registrar a aprovação.')
      const existing = await supabase.from('qualidade_especificacoes').select('id,revisao,vigente_desde,vigente_ate').eq('empresa_id', tenantId).eq('produto_id', form.produto_id).eq('status', 'ativa').neq('id', selectedSpec.id)
      if (existing.error) throw existing.error
      const overlapping = (existing.data ?? []).find((spec) => (!spec.vigente_ate || spec.vigente_ate >= form.vigente_desde) && (!form.vigente_ate || spec.vigente_desde <= form.vigente_ate))
      if (overlapping) throw new Error('Já existe a revisão ativa ' + overlapping.revisao + ' com vigência sobreposta para este produto. Encerre sua vigência ou torne-a obsoleta antes de ativar a nova.')
      const result = await supabase.from('qualidade_especificacoes').update({ status: 'ativa', aprovada_em: new Date().toISOString(), aprovador_id: approver.data.id }).eq('id', selectedSpec.id).eq('empresa_id', tenantId).eq('status', 'rascunho').select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A aprovação não foi registrada. Recarregue a especificação.')
      setNotice('Especificação aprovada e ativada. A revisão e os critérios ficaram registrados no catálogo técnico.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao aprovar a especificação.')
    } finally {
      setSaving(false)
    }
  }

  async function markObsolete() {
    if (!selectedSpec || selectedSpec.status !== 'ativa' || !tenantId) return
    const confirmed = window.confirm('Marcar a revisão ' + selectedSpec.revisao + ' como obsoleta? Ela deixará de ser uma especificação ativa para novas avaliações.')
    if (!confirmed) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.from('qualidade_especificacoes').update({ status: 'obsoleta', vigente_ate: form.vigente_ate || today() }).eq('id', selectedSpec.id).eq('empresa_id', tenantId).eq('status', 'ativa').select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A revisão não foi alterada. Recarregue e tente novamente.')
      setNotice('Revisão marcada como obsoleta; o histórico foi preservado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao obsoletar a revisão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(45,141,184,0.18),_transparent_38%),linear-gradient(135deg,#eaf4f8_0%,#f5f9fc_55%,#e7f1f6_100%)] p-3 text-[#123B50] md:p-4" data-quality-specifications>
      <div className="mx-auto grid max-w-[1800px] gap-3 grid-cols-1">
        <QualitySidebar active="/qualidade/especificacoes" />
        <section className="min-w-0 space-y-3">
          <header className="flex flex-wrap items-center gap-3 rounded-md border border-[#17445A] bg-gradient-to-r from-[#123B50] via-[#185c78] to-[#2D8DB8] p-4 text-white shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-cyan-100">SGQ INDUSTRIAL · ENGENHARIA DA QUALIDADE</p>
              <h1 className="text-xl font-semibold">Especificações técnicas</h1>
              <p className="mt-1 text-xs text-sky-50">Critérios aprovados por produto, revisão controlada e vigência por período.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex h-[30px] items-center gap-1.5 border border-white/40 bg-white/10 px-3 text-[10px] font-semibold text-white hover:bg-white/20"><RefreshCw size={14}/> Atualizar</button>
            <button type="button" onClick={() => setHelpOpen((value) => !value)} aria-expanded={helpOpen} className="inline-flex h-[30px] items-center gap-1.5 border border-white/40 bg-white/10 px-3 text-[10px] font-semibold text-white hover:bg-white/20"><CircleHelp size={14}/> Ajuda</button>
          </header>
          {helpOpen && <aside className="border border-sky-200 bg-sky-50 p-3 text-[11px]"><strong>Controle de especificações</strong><p className="mt-1">Cadastre somente limites e critérios aprovados pela engenharia, cliente ou norma aplicável. A especificação em rascunho não libera lotes. Para materiais verificados por certificado, informe o critério documental e o método de revisão; medições internas podem ser incluídas como características numéricas.</p></aside>}
          {error && <div role="alert" className="border border-rose-300 bg-rose-50 p-3 text-[11px] text-rose-900">{error}</div>}
          {notice && <div role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-[11px] text-emerald-900">{notice}</div>}
          <div className="grid gap-3 xl:grid-cols-[minmax(290px,.8fr)_minmax(0,1.5fr)]">
            <section className="min-w-0 rounded-md border border-sky-200 bg-[#F8FCFE] p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Especificações cadastradas</h2><p className="mt-1 text-[10px] text-slate-600">{specs.length} revisão(ões) · histórico preservado</p></div>
                <button type="button" onClick={startNew} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[10px] font-semibold text-white"><Plus size={13}/> Nova</button>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código, produto ou revisão..." aria-label="Buscar especificações" className="mt-3 h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-sky-600"/>
              {loading ? <p className="py-5 text-center text-[11px] text-slate-500">Carregando catálogo técnico…</p> : visibleSpecs.length ? <div className="mt-2 max-h-[650px] space-y-1 overflow-y-auto">
                {visibleSpecs.map((spec) => {
                  const product = productMap.get(spec.produto_id)
                  return <button type="button" key={spec.id} onClick={() => selectSpec(spec)} className={`block w-full border p-2 text-left transition-colors ${selectedId === spec.id ? 'border-[#2D8DB8] bg-[#DDF2F8]' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}`}>
                    <span className="flex items-center justify-between gap-2"><strong className="text-[11px]">{product?.codigo ?? 'Produto não localizado'} · Rev. {spec.revisao}</strong><span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold ${spec.status === 'ativa' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : spec.status === 'obsoleta' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{statusLabel[spec.status]}</span></span>
                    <span className="mt-1 block break-words text-[10px] text-slate-600">{product?.descricao_tecnica ?? spec.produto_id}</span>
                    <span className="mt-1 block text-[9px] text-slate-500">Vigência: {spec.vigente_desde}{spec.vigente_ate ? ' até ' + spec.vigente_ate : ' em aberto'} · {parseParameters(spec.parametros).length} critério(s)</span>
                  </button>
                })
                }
              </div> : <div className="mt-3 border border-dashed border-sky-200 bg-sky-50 p-4 text-center"><ShieldCheck className="mx-auto text-sky-700" size={22}/><p className="mt-2 text-[11px] font-semibold">Nenhuma especificação encontrada</p><p className="mt-1 text-[10px] text-slate-600">Crie uma especificação para um produto cadastrado no catálogo técnico.</p></div>}
            </section>

            <section className="min-w-0 rounded-md border border-sky-200 bg-[#F8FCFE] p-3 shadow-sm">
              <div className="flex flex-wrap items-start gap-2 border-b border-sky-100 pb-3">
                <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{selectedSpec ? 'Revisão ' + selectedSpec.revisao : 'Nova especificação / revisão'}</h2><p className="mt-1 text-[10px] text-slate-600">{selectedSpec ? 'Criada em ' + new Date(selectedSpec.created_at).toLocaleString('pt-BR') : 'Preencha os dados com base na fonte técnica aprovada.'}</p></div>
                {selectedSpec && selectedSpec.status !== 'rascunho' && <button type="button" onClick={startRevision} disabled={saving} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-sky-50 px-2 text-[10px] font-semibold text-[#123B50]"><FilePlus2 size={13}/> Nova revisão</button>}
              </div>
              <fieldset disabled={!canEdit || saving || loading} className="mt-3 space-y-3 disabled:opacity-90">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="min-w-0 space-y-1 sm:col-span-2"><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-600">Produto do catálogo *</span><select value={form.produto_id} onChange={(event) => setForm((current) => ({ ...current, produto_id: event.target.value }))} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]" required><option value="">Selecione o produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.descricao_tecnica}</option>)}</select></label>
                  <label className="space-y-1"><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-600">Revisão *</span><input value={form.revisao} onChange={(event) => setForm((current) => ({ ...current, revisao: event.target.value }))} placeholder="Ex.: 00, A, B" className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]" required/></label>
                  <label className="space-y-1"><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-600">Vigente desde *</span><input type="date" value={form.vigente_desde} onChange={(event) => setForm((current) => ({ ...current, vigente_desde: event.target.value }))} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]" required/></label>
                  <label className="space-y-1"><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-600">Vigente até</span><input type="date" value={form.vigente_ate} onChange={(event) => setForm((current) => ({ ...current, vigente_ate: event.target.value }))} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]"/></label>
                </div>
                <div className="overflow-x-auto border border-sky-100">
                  <table className="w-full min-w-[1100px] border-collapse text-[10px]">
                    <thead><tr className="bg-[#DCECF2] text-left text-[#17445A]"><th className="p-2">Código</th><th className="p-2">Característica</th><th className="p-2">Tipo</th><th className="p-2">Unid.</th><th className="p-2">Nominal</th><th className="p-2">Tol. −</th><th className="p-2">Tol. +</th><th className="p-2">Critério de aceitação</th><th className="p-2">Método</th><th className="p-2">Obrig.</th><th className="p-2">Ação</th></tr></thead>
                    <tbody>{form.parametros.map((parameter, index) => <tr key={index} className="border-t border-slate-200 align-top">
                      <td className="p-1"><input value={parameter.codigo} onChange={(event) => updateParameter(index, 'codigo', event.target.value)} aria-label={`Código do critério ${index + 1}`} className="h-[28px] w-[72px] border border-slate-300 bg-white px-1.5 text-[10px]"/></td>
                      <td className="p-1"><input value={parameter.caracteristica} onChange={(event) => updateParameter(index, 'caracteristica', event.target.value)} aria-label={`Característica ${index + 1}`} className="h-[28px] w-[135px] border border-slate-300 bg-white px-1.5 text-[10px]"/></td>
                      <td className="p-1"><select value={parameter.tipo} onChange={(event) => { const value = event.target.value; if (value === 'numerico' || value === 'visual' || value === 'texto' || value === 'certificado') updateParameter(index, 'tipo', value) }} aria-label={`Tipo ${index + 1}`} className="h-[28px] w-[105px] border border-slate-300 bg-white px-1 text-[10px]"><option value="numerico">Numérico</option><option value="visual">Visual</option><option value="texto">Texto</option><option value="certificado">Certificado</option></select></td>
                      <td className="p-1"><input value={parameter.unidade} onChange={(event) => updateParameter(index, 'unidade', event.target.value)} aria-label={`Unidade ${index + 1}`} className="h-[28px] w-[54px] border border-slate-300 bg-white px-1 text-[10px]"/></td>
                      <td className="p-1"><input type="number" step="any" value={parameter.nominal ?? ''} onChange={(event) => updateParameter(index, 'nominal', event.target.value === '' ? null : Number(event.target.value))} aria-label={`Nominal ${index + 1}`} className="h-[28px] w-[80px] border border-slate-300 bg-white px-1 text-[10px]" disabled={parameter.tipo !== 'numerico'}/></td>
                      <td className="p-1"><input type="number" min="0" step="any" value={parameter.tolerancia_inferior ?? ''} onChange={(event) => updateParameter(index, 'tolerancia_inferior', event.target.value === '' ? null : Number(event.target.value))} aria-label={`Tolerância inferior ${index + 1}`} className="h-[28px] w-[70px] border border-slate-300 bg-white px-1 text-[10px]" disabled={parameter.tipo !== 'numerico'}/></td>
                      <td className="p-1"><input type="number" min="0" step="any" value={parameter.tolerancia_superior ?? ''} onChange={(event) => updateParameter(index, 'tolerancia_superior', event.target.value === '' ? null : Number(event.target.value))} aria-label={`Tolerância superior ${index + 1}`} className="h-[28px] w-[70px] border border-slate-300 bg-white px-1 text-[10px]" disabled={parameter.tipo !== 'numerico'}/></td>
                      <td className="p-1"><input value={parameter.criterio_aceitacao} onChange={(event) => updateParameter(index, 'criterio_aceitacao', event.target.value)} aria-label={`Critério de aceitação ${index + 1}`} placeholder={parameter.tipo === 'certificado' ? 'Certificado conforme desenho/norma' : 'Descrever critério'} className="h-[28px] w-[180px] border border-slate-300 bg-white px-1.5 text-[10px]"/></td>
                      <td className="p-1"><input value={parameter.metodo_verificacao} onChange={(event) => updateParameter(index, 'metodo_verificacao', event.target.value)} aria-label={`Método de verificação ${index + 1}`} placeholder={parameter.tipo === 'certificado' ? 'Análise de certificado' : 'Instrumento / método'} className="h-[28px] w-[145px] border border-slate-300 bg-white px-1.5 text-[10px]"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={parameter.obrigatorio} onChange={(event) => updateParameter(index, 'obrigatorio', event.target.checked)} aria-label={`Critério obrigatório ${index + 1}`} className="accent-[#2D8DB8]"/></td>
                      <td className="p-1"><button type="button" disabled={form.parametros.length === 1} onClick={() => setForm((current) => ({ ...current, parametros: current.parametros.filter((_, currentIndex) => currentIndex !== index) }))} aria-label={`Remover critério ${index + 1}`} className="h-[28px] border border-rose-200 bg-rose-50 px-2 text-[10px] text-rose-800 disabled:opacity-30"><X size={12}/></button></td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => setForm((current) => ({ ...current, parametros: [...current.parametros, emptyParameter()] }))} className="inline-flex h-[30px] items-center gap-1 border border-sky-300 bg-sky-50 px-2 text-[10px] font-semibold text-[#123B50]"><Plus size={13}/> Adicionar característica</button>
                  <p className="text-[10px] text-slate-500">Critérios registrados: {form.parametros.length}</p>
                </div>
              </fieldset>
              {selectedSpec && <div className="mt-3 border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600">
                <p><strong>Estado:</strong> {statusLabel[selectedSpec.status]} · <strong>Revisão:</strong> {selectedSpec.revisao}</p>
                {selectedSpec.aprovada_em && <p><strong>Aprovada em:</strong> {new Date(selectedSpec.aprovada_em).toLocaleString('pt-BR')} · <strong>Responsável:</strong> {selectedSpec.aprovador_id ?? 'ID não informado'}</p>}
                {selectedSpec.status !== 'rascunho' && <p className="mt-1">Esta revisão é somente leitura. Use “Nova revisão” para registrar alterações sem sobrescrever o histórico aprovado.</p>}
              </div>}
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-sky-100 pt-3">
                {selectedSpec?.status === 'ativa' && <button type="button" onClick={() => void markObsolete()} disabled={saving} className="h-[30px] border border-amber-300 bg-amber-50 px-3 text-[10px] font-semibold text-amber-900">Marcar obsoleta</button>}
                {canEdit && <button type="button" onClick={() => void saveDraft()} disabled={saving || loading} className="inline-flex h-[30px] items-center gap-1.5 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={13}/>{saving ? 'Salvando…' : 'Salvar rascunho'}</button>}
                {selectedSpec?.status === 'rascunho' && <button type="button" onClick={() => void approveSpec()} disabled={saving || loading} className="inline-flex h-[30px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3 text-[10px] font-semibold text-white disabled:opacity-50"><CheckCircle2 size={13}/>{saving ? 'Processando…' : 'Aprovar e ativar'}</button>}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
