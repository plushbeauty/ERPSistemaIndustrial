/**
 * SYNQRA ERP — FICHA MESTRE DE PRODUTOS
 * Revisão: 2026-10-19 | Estado: reconstrução a partir do novo padrão de tela.
 * Persistência: Supabase real, SKU pela RPC transacional e escopo por empresa/RLS.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Save, ShieldCheck, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type CodeRule = { id: string; prefixo: string; digitos_produto: number }
type Supplier = { id: string; razao_social: string; nome_fantasia: string | null }
type StockLocation = { id: string; codigo: string; nome: string; tipo: string | null }
type ProductForm = {
  codigo: string
  nome: string
  categoria: string
  descricao_resumida: string
  codigo_barras: string
  grupo: string
  subgrupo: string
  marca: string
  unidade: string
  unidade_compra: string
  unidade_venda: string
  cliente: string
  fornecedor_padrao_id: string
  referencia_interna: string
  referencia_cliente: string
  origem: string
  ncm: string
  cest: string
  peso_liquido: number
  peso_bruto: number
  comprimento_mm: number
  largura_mm: number
  altura_mm: number
  observacoes: string
  foto_url: string
  fabricado: boolean
  comprado: boolean
  revenda: boolean
  estoque_maximo: number
  ponto_reposicao: number
  localizacao_padrao_id: string
  controla_lote: boolean
  controla_serie: boolean
  permite_estoque_negativo: boolean
  lote_validade_dias: number
  inspecao_qualidade_obrigatoria: boolean
  nivel_qualidade: string
  origem_fiscal: string
  cst_icms: string
  csosn: string
  cfop_entrada: string
  cfop_saida: string
  aliquota_icms: number
  aliquota_ipi: number
  aliquota_pis: number
  aliquota_cofins: number
  prazo_compra_dias: number
  prazo_producao_dias: number
  tolerancia_percentual: number
  ativo: boolean
}
type Tab = 'gerais' | 'fiscal' | 'estoque' | 'qualidade'
const initial = (): ProductForm => ({
  codigo: '', nome: '', categoria: '', descricao_resumida: '', codigo_barras: '', grupo: '', subgrupo: '', marca: '',
  unidade: 'UN', unidade_compra: 'UN', unidade_venda: 'UN', cliente: '', fornecedor_padrao_id: '',
  referencia_interna: '', referencia_cliente: '', origem: '0 - Nacional', ncm: '', cest: '',
  peso_liquido: 0, peso_bruto: 0, comprimento_mm: 0, largura_mm: 0, altura_mm: 0,
  observacoes: '', foto_url: '', fabricado: false, comprado: false, revenda: false,
  estoque_maximo: 0, ponto_reposicao: 0, localizacao_padrao_id: '', controla_lote: false, controla_serie: false,
  permite_estoque_negativo: false, lote_validade_dias: 0, inspecao_qualidade_obrigatoria: false, nivel_qualidade: '',
  origem_fiscal: '', cst_icms: '', csosn: '', cfop_entrada: '', cfop_saida: '', aliquota_icms: 0, aliquota_ipi: 0,
  aliquota_pis: 0, aliquota_cofins: 0, prazo_compra_dias: 0, prazo_producao_dias: 0, tolerancia_percentual: 0, ativo: true
})
const input = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-100'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-600'
const section = 'grid grid-cols-1 gap-2 rounded-[2px] border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-4'
const textFields: Array<{ key: keyof ProductForm; label: string; max?: number }> = [
  { key: 'nome', label: 'Nome / descrição do produto *', max: 120 },
  { key: 'categoria', label: 'Categoria / família', max: 60 },
  { key: 'descricao_resumida', label: 'Descrição resumida', max: 180 },
  { key: 'codigo_barras', label: 'Código de barras', max: 80 },
  { key: 'grupo', label: 'Grupo', max: 80 },
  { key: 'subgrupo', label: 'Subgrupo', max: 80 },
  { key: 'marca', label: 'Marca', max: 80 },
  { key: 'cliente', label: 'Cliente / mercado', max: 120 },
  { key: 'referencia_interna', label: 'Referência interna', max: 80 },
  { key: 'referencia_cliente', label: 'Referência do cliente', max: 80 },
]
const numericFields: Array<{ key: keyof ProductForm; label: string; step?: string }> = [
  { key: 'peso_liquido', label: 'Peso líquido (kg)', step: '0.001' },
  { key: 'peso_bruto', label: 'Peso bruto (kg)', step: '0.001' },
  { key: 'comprimento_mm', label: 'Comprimento (mm)', step: '0.1' },
  { key: 'largura_mm', label: 'Largura (mm)', step: '0.1' },
  { key: 'altura_mm', label: 'Altura (mm)', step: '0.1' },
]
const fiscalText: Array<{ key: keyof ProductForm; label: string; max?: number }> = [
  { key: 'ncm', label: 'NCM (8 dígitos)', max: 8 }, { key: 'cest', label: 'CEST (7 dígitos)', max: 7 },
  { key: 'cst_icms', label: 'CST ICMS', max: 3 }, { key: 'csosn', label: 'CSOSN', max: 3 },
  { key: 'cfop_entrada', label: 'CFOP entrada', max: 4 }, { key: 'cfop_saida', label: 'CFOP saída', max: 4 },
  { key: 'origem_fiscal', label: 'Complemento / origem fiscal', max: 80 },
]
const boolFields: Array<{ key: keyof ProductForm; label: string }> = [
  { key: 'fabricado', label: 'Fabricado' }, { key: 'comprado', label: 'Comprado' }, { key: 'revenda', label: 'Revenda' },
  { key: 'controla_lote', label: 'Controla lote' }, { key: 'controla_serie', label: 'Controla número de série' },
  { key: 'permite_estoque_negativo', label: 'Permite estoque negativo' },
  { key: 'inspecao_qualidade_obrigatoria', label: 'Inspeção de qualidade obrigatória' },
]
export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: (id?: string) => void }) {
  const [form, setForm] = useState<ProductForm>(initial)
  const [empresa, setEmpresa] = useState('')
  const [rules, setRules] = useState<CodeRule[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [locations, setLocations] = useState<StockLocation[]>([])
  const [ruleId, setRuleId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [tab, setTab] = useState<Tab>('gerais')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(''); setSuccess('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão não autenticada.')
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error) throw tenant.error
        if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
        const empresaId = String(tenant.data)
        const [configResult, supplierResult, locationResult] = await Promise.all([
          supabase.from('erp_codigos').select('id,prefixo,digitos_produto').eq('empresa_id', empresaId).order('prefixo'),
          supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia').eq('empresa_id', empresaId).order('razao_social').limit(1000),
          supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,tipo').eq('empresa_id', empresaId).order('codigo').limit(1000),
        ])
        if (configResult.error) throw configResult.error
        if (supplierResult.error) throw supplierResult.error
        if (locationResult.error) throw locationResult.error
        const loaded = initial()
        if (productId) {
          const result = await supabase.from('erp_produtos').select('*').eq('id', productId).eq('empresa_id', empresaId).maybeSingle()
          if (result.error) throw result.error
          if (!result.data) throw new Error('Produto não encontrado nesta empresa ou sem permissão de acesso.')
          const row = result.data as Record<string, unknown>
          const keys = Object.keys(initial()) as Array<keyof ProductForm>
          for (const key of keys) {
            const value = row[key as string]
            if (value !== undefined && value !== null) {
              if (typeof loaded[key] === 'boolean') (loaded as unknown as Record<string, unknown>)[key] = Boolean(value)
              else if (typeof loaded[key] === 'number') (loaded as unknown as Record<string, unknown>)[key] = Number(value) || 0
              else (loaded as unknown as Record<string, unknown>)[key] = String(value)
            }
          }
        }
        if (cancelled) return
        const configs = (configResult.data ?? []) as CodeRule[]
        setEmpresa(empresaId); setRules(configs); setRuleId(current => configs.some(x => x.id === current) ? current : (configs[0]?.id ?? ''))
        setSuppliers((supplierResult.data ?? []) as Supplier[])
        setLocations((locationResult.data ?? []) as StockLocation[])
        setForm(loaded)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar o cadastro mestre.')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [productId])

  const selectedRule = rules.find(x => x.id === ruleId)
  const skuPreview = (selectedRule?.prefixo || 'PL') + tipo + '0'.repeat(Math.max(3, Math.min(6, selectedRule?.digitos_produto || 3)))
  const update = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm(prev => ({ ...prev, [key]: value }))
  const save = async () => {
    if (busy || loading) return
    setError(''); setSuccess('')
    if (!empresa) { setError('Empresa da sessão não identificada.'); return }
    if (!form.nome.trim()) { setError('Informe o nome do produto.'); setTab('gerais'); return }
    if (!form.unidade.trim() || !form.unidade_compra.trim() || !form.unidade_venda.trim()) { setError('Preencha unidade de estoque, compra e venda.'); setTab('gerais'); return }
    if (form.ncm && !/^\d{8}$/.test(form.ncm)) { setError('NCM deve conter exatamente 8 dígitos.'); setTab('fiscal'); return }
    if (form.cest && !/^\d{7}$/.test(form.cest)) { setError('CEST deve conter exatamente 7 dígitos.'); setTab('fiscal'); return }
    setBusy(true)
    try {
      let codigo = form.codigo
      if (!productId) {
        if (!ruleId) throw new Error('Cadastre uma regra de numeração antes de gerar o SKU.')
        const generated = await supabase.rpc('erp_gerar_codigo_produto', { p_config_id: ruleId, p_tipo_sigla: tipo })
        if (generated.error) throw generated.error
        if (generated.data === null || String(generated.data).trim() === '') throw new Error('A rotina do banco não retornou um SKU válido.')
        codigo = String(generated.data)
      }
      const payload = {
        nome: form.nome.trim(), categoria: form.categoria.trim() || null,
        descricao_resumida: form.descricao_resumida.trim() || null, codigo_barras: form.codigo_barras.trim() || null,
        grupo: form.grupo.trim() || null, subgrupo: form.subgrupo.trim() || null, marca: form.marca.trim() || null,
        unidade: form.unidade.trim().toUpperCase(), unidade_compra: form.unidade_compra.trim().toUpperCase(),
        unidade_venda: form.unidade_venda.trim().toUpperCase(), cliente: form.cliente.trim() || null,
        fornecedor_padrao_id: form.fornecedor_padrao_id || null, referencia_interna: form.referencia_interna.trim() || null,
        referencia_cliente: form.referencia_cliente.trim() || null, origem: form.origem || '0 - Nacional',
        ncm: form.ncm.trim() || null, cest: form.cest.trim() || null, peso_liquido: form.peso_liquido, peso_bruto: form.peso_bruto,
        comprimento_mm: form.comprimento_mm, largura_mm: form.largura_mm, altura_mm: form.altura_mm,
        observacoes: form.observacoes.trim() || null, foto_url: form.foto_url.trim() || null,
        fabricado: form.fabricado, comprado: form.comprado, revenda: form.revenda,
        estoque_maximo: form.estoque_maximo, ponto_reposicao: form.ponto_reposicao,
        localizacao_padrao_id: form.localizacao_padrao_id || null, controla_lote: form.controla_lote,
        controla_serie: form.controla_serie, permite_estoque_negativo: form.permite_estoque_negativo,
        lote_validade_dias: form.lote_validade_dias, inspecao_qualidade_obrigatoria: form.inspecao_qualidade_obrigatoria,
        nivel_qualidade: form.nivel_qualidade.trim() || null, origem_fiscal: form.origem_fiscal.trim() || null,
        cst_icms: form.cst_icms.trim() || null, csosn: form.csosn.trim() || null,
        cfop_entrada: form.cfop_entrada.trim() || null, cfop_saida: form.cfop_saida.trim() || null,
        aliquota_icms: form.aliquota_icms, aliquota_ipi: form.aliquota_ipi, aliquota_pis: form.aliquota_pis,
        aliquota_cofins: form.aliquota_cofins, prazo_compra_dias: form.prazo_compra_dias,
        prazo_producao_dias: form.prazo_producao_dias, tolerancia_percentual: form.tolerancia_percentual,
        ativo: form.ativo, updated_at: new Date().toISOString()
      }
      let savedId = productId
      if (productId) {
        const result = await supabase.from('erp_produtos').update(payload).eq('id', productId).eq('empresa_id', empresa).select('id').maybeSingle()
        if (result.error) throw result.error
        if (!result.data?.id) throw new Error('Nenhuma alteração gravada. Verifique as permissões RLS da empresa.')
        savedId = result.data.id
      } else {
        const result = await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, ...payload }).select('id').single()
        if (result.error) throw result.error
        savedId = result.data.id
      }
      setForm(prev => ({ ...prev, codigo }))
      setSuccess('Cadastro gravado no banco de dados. SKU: ' + codigo)
      onSaved(savedId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar o cadastro.')
    } finally { setBusy(false) }
  }

  const field = (key: keyof ProductForm, title: string, maxLength?: number) => (
    <label className={label} key={String(key)}>{title}
      <input className={input} maxLength={maxLength} disabled={loading || busy} value={String(form[key] ?? '')} onChange={e => update(key, e.target.value as ProductForm[typeof key])} />
    </label>
  )
  const numberField = (key: keyof ProductForm, title: string, step = '1') => (
    <label className={label} key={String(key)}>{title}
      <input type="number" step={step} min="0" className={input} disabled={loading || busy} value={String(form[key] ?? 0)} onChange={e => update(key, (Number(e.target.value) || 0) as ProductForm[typeof key])} />
    </label>
  )
  const selectField = (key: keyof ProductForm, title: string, options: Array<[string,string]>) => (
    <label className={label} key={String(key)}>{title}
      <select className={input} disabled={loading || busy} value={String(form[key] ?? '')} onChange={e => update(key, e.target.value as ProductForm[typeof key])}>
        {options.map(([value,text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  )
  const checks = boolFields.map(item => (
    <label key={String(item.key)} className="flex min-h-8 items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2 text-[10px] font-semibold text-slate-700">
      <input type="checkbox" disabled={loading || busy} checked={Boolean(form[item.key])} onChange={e => update(item.key, e.target.checked as ProductForm[typeof item.key])} />
      {item.label}
    </label>
  ))

  return <section className="min-w-0 space-y-2 text-slate-800" aria-busy={loading || busy}>
    <header className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
      <div className="min-w-0"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700"><Tag size={12}/> Cadastro mestre</p><h2 className="truncate text-sm font-black uppercase">{productId ? 'Editar produto' : 'Novo produto'}</h2><p className="text-[9px] text-slate-500">Campos integrados à tabela erp_produtos</p></div>
      <ShieldCheck size={19} className="shrink-0 text-teal-700"/>
    </header>
    {error && <div role="alert" className="flex gap-2 rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[10px] font-semibold text-rose-800"><AlertTriangle size={13} className="shrink-0"/>{error}</div>}
    {success && <div role="status" className="flex gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800"><CheckCircle2 size={13} className="shrink-0"/>{success}</div>}
    <div className="grid grid-cols-4 gap-1">
      {(['gerais','fiscal','estoque','qualidade'] as Tab[]).map(item => <button key={item} type="button" onClick={() => setTab(item)} className={`h-8 rounded-[2px] border px-1 text-[9px] font-black uppercase ${tab===item?'border-[#123B50] bg-[#123B50] text-white':'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>{item}</button>)}
    </div>
    {tab==='gerais' && <>
      <div className={section}>
        <label className={label}>SKU / Código mestre
          <div className="flex h-8 items-center rounded-[2px] border border-slate-200 bg-slate-100 px-2 font-mono text-[11px] font-black text-[#123B50]">{form.codigo || skuPreview}</div>
        </label>
        {!productId && <label className={label}>Tipo de item
          <select className={input} value={tipo} disabled={loading || busy} onChange={e=>setTipo(e.target.value)}><option value="PA">PA · Produto acabado</option><option value="MP">MP · Matéria-prima</option><option value="SA">SA · Semi-acabado</option><option value="IN">IN · Item comprado</option></select>
        </label>}
        {!productId && <label className={label}>Regra de numeração
          <select className={input} value={ruleId} disabled={loading || busy} onChange={e=>setRuleId(e.target.value)}>{rules.map(r=><option key={r.id} value={r.id}>{r.prefixo} · {r.digitos_produto} dígitos</option>)}</select>
        </label>}
        {textFields.map(item => field(item.key, item.label, item.max))}
        {selectField('origem','Origem da mercadoria', [['0 - Nacional','0 - Nacional'],['1 - Estrangeira - Importação direta','1 - Importação direta'],['2 - Estrangeira - mercado interno','2 - Mercado interno']])}
        {field('unidade','Unidade de estoque',3)}{field('unidade_compra','Unidade de compra',3)}{field('unidade_venda','Unidade de venda',3)}
        {numberField('peso_liquido','Peso líquido (kg)','0.001')}{numberField('peso_bruto','Peso bruto (kg)','0.001')}{numberField('comprimento_mm','Comprimento (mm)','0.1')}{numberField('largura_mm','Largura (mm)','0.1')}{numberField('altura_mm','Altura (mm)','0.1')}
      </div>
    </>}
    {tab==='fiscal' && <div className={section}>
      {fiscalText.map(item=>field(item.key,item.label,item.max))}
      {(['aliquota_icms','aliquota_ipi','aliquota_pis','aliquota_cofins'] as Array<keyof ProductForm>).map(key=>numberField(key, key.replace('aliquota_','Alíquota ').toUpperCase()+' (%)','0.0001'))}
      <p className="col-span-full text-[9px] text-amber-800">Confirme os códigos fiscais em fonte oficial e conforme a operação; esta tela não calcula tributos.</p>
    </div>}
    {tab==='estoque' && <div className={section}>
      {numberField('ponto_reposicao','Ponto de reposição','0.001')}{numberField('estoque_maximo','Estoque máximo','0.001')}
      {numberField('lote_validade_dias','Validade do lote (dias)')}
      {checks.filter((_,i)=>i>=3&&i<=5)}
    </div>}
    {tab==='qualidade' && <div className={section}>
      {field('nivel_qualidade','Nível de qualidade',80)}
      {field('observacoes','Observações')}
      {field('foto_url','URL da foto',500)}
      {numberField('prazo_compra_dias','Prazo de compra (dias)')}{numberField('prazo_producao_dias','Prazo de produção (dias)')}
      {numberField('tolerancia_percentual','Tolerância (%)','0.0001')}
      {checks.filter((_,i)=>i<=2||i===6)}
      <label className="flex min-h-8 items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2 text-[10px] font-semibold"><input type="checkbox" checked={form.ativo} disabled={loading||busy} onChange={e=>update('ativo',e.target.checked)}/> Produto ativo</label>
    </div>}
    <button type="button" onClick={()=>setAdvanced(v=>!v)} className="flex h-8 w-full items-center justify-between rounded-[2px] border border-slate-300 bg-slate-50 px-2 text-[9px] font-black uppercase text-slate-700"><span>Campos complementares / dimensões</span>{advanced?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>
    {advanced && <div className={section}>{numericFields.map(item=>numberField(item.key,item.label,item.step))}{<label className={label}>Fornecedor padrão<select className={input} disabled={loading||busy} value={form.fornecedor_padrao_id} onChange={e=>update('fornecedor_padrao_id',e.target.value)}><option value="">Sem fornecedor padrão</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.nome_fantasia||s.razao_social}</option>)}</select></label>}
      {<label className={label}>Localização padrão<select className={input} disabled={loading||busy} value={form.localizacao_padrao_id} onChange={e=>update('localizacao_padrao_id',e.target.value)}><option value="">Sem localização padrão</option>{locations.map(l=><option key={l.id} value={l.id}>{l.codigo} · {l.nome}{l.tipo?' · '+l.tipo:''}</option>)}</select></label>}{checks}</div>}
    <footer className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
      <span className="text-[9px] text-slate-500">{loading?'Carregando…':productId?'Edição de cadastro existente':'Novo cadastro · SKU transacional'}</span>
      <button type="button" onClick={()=>void save()} disabled={loading||busy} className="inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-[#123B50] px-3 text-[10px] font-black uppercase text-white hover:bg-[#1d536e] disabled:opacity-50"><Save size={13}/>{busy?'Salvando…':'Salvar produto'}</button>
    </footer>
  </section>
}
