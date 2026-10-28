/**
 * SYSNQRA ERP INDUSTRIAL — Cadastro de Produtos Industrial
 * @REVISAO 28/10/2026
 * Padrão visual alinhado à Central de Compras; dados reais em erp_produtos.
 * Escrita restrita à empresa da sessão autenticada e protegida também por RLS.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Edit3, Package, Plus, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao_resumida: string | null
  ncm: string | null
  unidade: string | null
  ponto_reposicao: number | null
  estoque_maximo: number | null
  fabricado: boolean | null
  comprado: boolean | null
  prazo_compra_dias: number | null
  prazo_producao_dias: number | null
  custo_medio: number | null
  custo_fabricacao: number | null
  preco_venda: number | null
  aliquota_icms: number | null
  aliquota_ipi: number | null
  aliquota_pis: number | null
  aliquota_cofins: number | null
  ativo: boolean | null
}
type Tab = 'gerais' | 'manufatura' | 'custos'
type ProductForm = {
  codigo: string; nome: string; descricao_resumida: string; ncm: string; unidade: string
  ponto_reposicao: string; estoque_maximo: string; fabricado: boolean; comprado: boolean
  prazo_compra_dias: string; prazo_producao_dias: string; custo_medio: string
  custo_fabricacao: string; preco_venda: string; aliquota_icms: string
  aliquota_ipi: string; aliquota_pis: string; aliquota_cofins: string; ativo: boolean
}
const blankForm = (): ProductForm => ({
  codigo: '', nome: '', descricao_resumida: '', ncm: '', unidade: 'UN',
  ponto_reposicao: '0', estoque_maximo: '0', fabricado: true, comprado: false,
  prazo_compra_dias: '0', prazo_producao_dias: '0', custo_medio: '0',
  custo_fabricacao: '0', preco_venda: '0', aliquota_icms: '0',
  aliquota_ipi: '0', aliquota_pis: '0', aliquota_cofins: '0', ativo: true,
})
const numberText = (value: number | null | undefined) => String(value ?? 0)
const money = (value: number | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const asForm = (p: Product): ProductForm => ({
  codigo: p.codigo ?? '', nome: p.nome ?? '', descricao_resumida: p.descricao_resumida ?? '',
  ncm: p.ncm ?? '', unidade: p.unidade ?? 'UN', ponto_reposicao: numberText(p.ponto_reposicao),
  estoque_maximo: numberText(p.estoque_maximo), fabricado: Boolean(p.fabricado), comprado: Boolean(p.comprado),
  prazo_compra_dias: numberText(p.prazo_compra_dias), prazo_producao_dias: numberText(p.prazo_producao_dias),
  custo_medio: numberText(p.custo_medio), custo_fabricacao: numberText(p.custo_fabricacao),
  preco_venda: numberText(p.preco_venda), aliquota_icms: numberText(p.aliquota_icms),
  aliquota_ipi: numberText(p.aliquota_ipi), aliquota_pis: numberText(p.aliquota_pis),
  aliquota_cofins: numberText(p.aliquota_cofins), ativo: p.ativo !== false,
})
const fieldClass = 'compras-field'
const inputClass = 'w-full'

export default function CadastroProdutosIndustrial() {
  const [rows, setRows] = useState<Product[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('gerais')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(blankForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: tenant, error: tenantError } = await supabase.rpc('erp_current_empresa_id')
    if (tenantError || typeof tenant !== 'string' || !tenant) {
      setRows([])
      setEmpresaId('')
      setError(tenantError?.message || 'Não foi possível identificar a empresa da sessão autenticada.')
      setLoading(false)
      return
    }
    setEmpresaId(tenant)
    const { data, error: queryError } = await supabase
      .from('erp_produtos')
      .select('id,codigo,nome,descricao_resumida,ncm,unidade,ponto_reposicao,estoque_maximo,fabricado,comprado,prazo_compra_dias,prazo_producao_dias,custo_medio,custo_fabricacao,preco_venda,aliquota_icms,aliquota_ipi,aliquota_pis,aliquota_cofins,ativo')
      .eq('empresa_id', tenant)
      .order('codigo', { ascending: true })
      .limit(1000)
    if (queryError) setError(queryError.message)
    else setRows((data ?? []) as Product[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    if (!query) return rows
    return rows.filter(p => [p.codigo, p.nome, p.descricao_resumida, p.ncm].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query)))
  }, [rows, search])

  const setValue = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm(current => ({ ...current, [key]: value }))
  const startNew = () => { setEditingId(null); setForm(blankForm()); setActiveTab('gerais'); setError(null); setNotice(null) }
  const startEdit = (product: Product) => { setEditingId(product.id); setForm(asForm(product)); setActiveTab('gerais'); setError(null); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const cancelEdit = () => { startNew() }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!empresaId) { setError('Empresa da sessão autenticada não identificada.'); return }
    if (!form.fabricado && !form.comprado) { setError('Selecione ao menos uma origem: fabricado ou comprado.'); setActiveTab('manufatura'); return }
    setSaving(true); setError(null); setNotice(null)
    const payload = {
      empresa_id: empresaId,
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      descricao_resumida: form.descricao_resumida.trim() || null,
      ncm: form.ncm.trim() || null,
      unidade: form.unidade.trim().toUpperCase(),
      ponto_reposicao: Math.max(0, Number(form.ponto_reposicao) || 0),
      estoque_maximo: Math.max(0, Number(form.estoque_maximo) || 0),
      fabricado: form.fabricado,
      comprado: form.comprado,
      prazo_compra_dias: Math.max(0, Math.trunc(Number(form.prazo_compra_dias) || 0)),
      prazo_producao_dias: Math.max(0, Math.trunc(Number(form.prazo_producao_dias) || 0)),
      custo_medio: Math.max(0, Number(form.custo_medio) || 0),
      custo_fabricacao: Math.max(0, Number(form.custo_fabricacao) || 0),
      preco_venda: Math.max(0, Number(form.preco_venda) || 0),
      aliquota_icms: Math.max(0, Number(form.aliquota_icms) || 0),
      aliquota_ipi: Math.max(0, Number(form.aliquota_ipi) || 0),
      aliquota_pis: Math.max(0, Number(form.aliquota_pis) || 0),
      aliquota_cofins: Math.max(0, Number(form.aliquota_cofins) || 0),
      ativo: form.ativo,
    }
    try {
      const result = editingId
        ? await supabase.from('erp_produtos').update(payload).eq('id', editingId).eq('empresa_id', empresaId).select('id').single()
        : await supabase.from('erp_produtos').insert(payload).select('id').single()
      if (result.error) throw result.error
      if (!result.data?.id) throw new Error('O banco não confirmou a gravação do produto.')
      setNotice(editingId ? 'Cadastro de produto atualizado.' : 'Produto cadastrado com sucesso.')
      setEditingId(null); setForm(blankForm())
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o produto.')
    } finally { setSaving(false) }
  }

  const labelInput = (label: string, key: keyof ProductForm, options: { required?: boolean; type?: string; maxLength?: number; placeholder?: string; min?: string; step?: string } = {}) => (
    <label className={fieldClass} key={key}>
      <span>{label}{options.required ? ' *' : ''}</span>
      <input className={inputClass} type={options.type ?? 'text'} required={options.required} maxLength={options.maxLength} placeholder={options.placeholder} min={options.min} step={options.step} value={String(form[key])} onChange={event => setValue(key, (options.type === 'number' ? event.target.value : event.target.value) as ProductForm[typeof key])} />
    </label>
  )

  return <main className="compras-page" aria-label="Cadastro de Produtos Industrial">
    <header className="compras-header">
      <div><h1>Cadastro de Produtos Industrial</h1><p>Dados gerais, manufatura, custos e parâmetros fiscais em um único cadastro.</p></div>
    </header>
    {notice && <div className="compras-notice compras-notice--success" role="status">{notice}</div>}
    {error && <div className="compras-notice compras-notice--error" role="alert">{error}</div>}
    <section className="compras-panel compras-form-panel">
      <div className="compras-panel-heading">
        <div><h2>{editingId ? 'Editar produto' : 'Novo produto'}</h2><p>Os dados são gravados no cadastro mestre da empresa autenticada.</p></div>
        <div className="compras-header-actions">
          {editingId && <button type="button" className="compras-button compras-button--light" onClick={cancelEdit}><X size={14}/> Cancelar edição</button>}
          {!editingId && <button type="button" className="compras-button compras-button--light" onClick={startNew}><Plus size={14}/> Limpar</button>}
        </div>
      </div>
      <nav className="compras-tabs" aria-label="Abas do cadastro de produto">
        <button type="button" className={activeTab === 'gerais' ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab('gerais')}><Package size={14}/> Dados Gerais</button>
        <button type="button" className={activeTab === 'manufatura' ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab('manufatura')}>Manufatura (PCP)</button>
        <button type="button" className={activeTab === 'custos' ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab('custos')}>Custos e Finanças</button>
      </nav>
      <form className="compras-form-grid" onSubmit={save}>
        {activeTab === 'gerais' && <>
          {labelInput('Código do produto', 'codigo', { required: true, maxLength: 80, placeholder: 'Código único da empresa' })}
          {labelInput('Unidade de medida', 'unidade', { required: true, maxLength: 8, placeholder: 'UN' })}
          {labelInput('NCM', 'ncm', { maxLength: 8, placeholder: 'Classificação fiscal' })}
          {labelInput('Ponto de reposição / estoque mínimo', 'ponto_reposicao', { type: 'number', min: '0', step: '0.001' })}
          {labelInput('Estoque máximo', 'estoque_maximo', { type: 'number', min: '0', step: '0.001' })}
          <label className={fieldClass + ' compras-field--full'}><span>Descrição do produto *</span><input required maxLength={240} value={form.nome} onChange={event => setValue('nome', event.target.value)} placeholder="Descrição completa usada em estoque, compras e PCP"/></label>
          <label className={fieldClass + ' compras-field--full'}><span>Descrição resumida</span><input maxLength={160} value={form.descricao_resumida} onChange={event => setValue('descricao_resumida', event.target.value)} placeholder="Descrição curta para listagens e documentos"/></label>
        </>}
        {activeTab === 'manufatura' && <>
          <div className="compras-field compras-field--full"><span>Origem do suprimento *</span><div className="flex flex-wrap gap-4 pt-2">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.fabricado} onChange={event => setValue('fabricado', event.target.checked)}/> Fabricado internamente</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.comprado} onChange={event => setValue('comprado', event.target.checked)}/> Comprado de fornecedor</label>
          </div></div>
          {labelInput('Prazo de compra (dias)', 'prazo_compra_dias', { type: 'number', min: '0', step: '1' })}
          {labelInput('Prazo de produção (dias)', 'prazo_producao_dias', { type: 'number', min: '0', step: '1' })}
          <div className="compras-field compras-field--full"><span>Engenharia / estrutura de materiais</span><p className="m-0 text-[11px] text-slate-600">A estrutura BOM e a ficha de processo permanecem nos módulos de Engenharia e PCP vinculados ao produto cadastrado; não são duplicadas neste formulário.</p></div>
        </>}
        {activeTab === 'custos' && <>
          {labelInput('Custo médio (R$)', 'custo_medio', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('Custo de fabricação (R$)', 'custo_fabricacao', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('Preço de venda (R$)', 'preco_venda', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('ICMS (%)', 'aliquota_icms', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('IPI (%)', 'aliquota_ipi', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('PIS (%)', 'aliquota_pis', { type: 'number', min: '0', step: '0.0001' })}
          {labelInput('COFINS (%)', 'aliquota_cofins', { type: 'number', min: '0', step: '0.0001' })}
          <label className={fieldClass}><span>Status do cadastro</span><select value={form.ativo ? 'true' : 'false'} onChange={event => setValue('ativo', event.target.value === 'true')}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
          <div className="compras-field"><span>Preço / custo</span><strong className="text-[13px] text-slate-800">{money(Number(form.preco_venda) - Number(form.custo_medio))} de diferença</strong></div>
        </>}
        <div className="compras-form-footer">
          <span>Campos obrigatórios marcados com *. A gravação respeita a sessão e o RLS do Supabase.</span>
          <div className="flex gap-2"><button type="button" className="compras-button compras-button--light" onClick={cancelEdit}><X size={14}/> Cancelar</button><button type="submit" className="compras-button compras-button--primary" disabled={saving || loading || !empresaId}>{saving ? 'Salvando…' : <><Check size={14}/>{editingId ? 'Salvar alterações' : 'Cadastrar produto'}</>}</button></div>
        </div>
      </form>
    </section>
    <section className="compras-panel">
      <div className="compras-panel-heading"><div><h2>Produtos cadastrados</h2><p>{filtered.length} registro(s) encontrados nesta empresa.</p></div><div className="compras-header-actions"><label className="relative"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-7" aria-label="Pesquisar produtos" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar código, descrição ou NCM"/></label><button type="button" className="compras-button compras-button--light" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Atualizar</button></div></div>
      {loading ? <div className="compras-loading">Carregando produtos reais do Supabase…</div> : filtered.length === 0 ? <div className="compras-empty"><Package size={22}/><strong>Nenhum produto encontrado</strong><span>Cadastre um produto ou ajuste a pesquisa. Não são exibidos dados de demonstração.</span></div> : <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th>Un.</th><th>Origem</th><th>Estoque mín./máx.</th><th>Custo médio</th><th>Preço venda</th><th>Status</th><th>Ação</th></tr></thead><tbody>{filtered.map(product => <tr key={product.id}><td>{product.codigo}</td><td>{product.nome}</td><td>{product.ncm || '—'}</td><td>{product.unidade || 'UN'}</td><td>{product.fabricado && product.comprado ? 'Fabricado / comprado' : product.fabricado ? 'Fabricado' : product.comprado ? 'Comprado' : 'Não definido'}</td><td>{numberText(product.ponto_reposicao)} / {numberText(product.estoque_maximo)}</td><td>{money(product.custo_medio)}</td><td>{money(product.preco_venda)}</td><td><span className={product.ativo ? 'compras-status compras-status--success' : 'compras-status compras-status--danger'}>{product.ativo ? 'Ativo' : 'Inativo'}</span></td><td><button type="button" className="compras-button compras-button--light" onClick={() => startEdit(product)}><Edit3 size={13}/> Editar</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>
}
