/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-SGQ-TEMPLATE-INSPECAO-20261108-01 — cadastro, revisão, itens e publicação de templates versionados
 * @STATUS_APROVACAO: NOVA TELA AUTORIZADA NA ORDEM DE EXECUÇÃO DE 2026-11-08; gravação por empresa e admin no banco
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, CopyPlus, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import VendasLayout from '../VendasLayout'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type TemplateStatus = 'RASCUNHO' | 'VIGENTE' | 'OBSOLETO'
type Template = {
  id: string
  codigo: string
  nome: string
  produto_id: string | null
  operacao: string
  revisao: number
  status: TemplateStatus
  vigencia_inicio: string | null
  vigencia_fim: string | null
  aprovado_em: string | null
}
type DraftItem = {
  codigo_item: string
  caracteristica: string
  metodo: string
  unidade: string
  valor_nominal: string
  limite_inferior: string
  limite_superior: string
  tipo_resposta: 'NUMERICO' | 'TEXTO' | 'SIM_NAO' | 'CONFORME_NAO_CONFORME'
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  obrigatorio: boolean
  instrucoes: string
}
type TemplateForm = { codigo: string; nome: string; produto_id: string; operacao: string }

const blankForm: TemplateForm = { codigo: '', nome: '', produto_id: '', operacao: 'PROCESSO_METROLOGIA' }
const blankItem = (): DraftItem => ({
  codigo_item: '', caracteristica: '', metodo: '', unidade: '',
  valor_nominal: '', limite_inferior: '', limite_superior: '',
  tipo_resposta: 'NUMERICO', criticidade: 'MEDIA', obrigatorio: true, instrucoes: '',
})
const fieldClass = 'h-8 w-full min-w-0 border border-slate-300 bg-[#EAF6FA] px-2 text-[10px] font-semibold text-[#123B50] outline-none focus:border-[#2D8DB8] disabled:cursor-not-allowed disabled:bg-slate-100'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500'

export default function QualidadeTemplatesInspecao() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<TemplateForm>(blankForm)
  const [items, setItems] = useState<DraftItem[]>([blankItem()])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      setEmpresaId(id)
      const [productResult, templateResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_qualidade_inspecao_templates')
          .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim,aprovado_em')
          .eq('empresa_id', id).order('codigo').order('revisao', { ascending: false }).limit(2000),
      ])
      if (productResult.error) throw productResult.error
      if (templateResult.error) {
        throw new Error(`A migration de templates versionados ainda precisa ser aplicada: ${templateResult.error.message}`)
      }
      setProducts((productResult.data ?? []) as Product[])
      setTemplates((templateResult.data ?? []) as Template[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar templates de inspeção.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selected = templates.find(template => template.id === selectedId) ?? null
  const editable = !selected || selected.status === 'RASCUNHO'
  const filteredTemplates = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return templates
    return templates.filter(template => [
      template.codigo, template.nome, template.operacao, template.status,
      products.find(product => product.id === template.produto_id)?.codigo,
    ].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [templates, products, query])

  const selectTemplate = async (template: Template) => {
    setSelectedId(template.id)
    setForm({
      codigo: template.codigo,
      nome: template.nome,
      produto_id: template.produto_id ?? '',
      operacao: template.operacao,
    })
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const result = await supabase.from('erp_qualidade_inspecao_template_itens')
        .select('codigo_item,caracteristica,metodo,unidade,valor_nominal,limite_inferior,limite_superior,tipo_resposta,criticidade,obrigatorio,instrucoes')
        .eq('empresa_id', empresaId).eq('template_id', template.id).order('sequencia')
      if (result.error) throw result.error
      setItems((result.data ?? []).map(item => ({
        codigo_item: String(item.codigo_item ?? ''),
        caracteristica: String(item.caracteristica ?? ''),
        metodo: String(item.metodo ?? ''),
        unidade: String(item.unidade ?? ''),
        valor_nominal: item.valor_nominal == null ? '' : String(item.valor_nominal),
        limite_inferior: item.limite_inferior == null ? '' : String(item.limite_inferior),
        limite_superior: item.limite_superior == null ? '' : String(item.limite_superior),
        tipo_resposta: item.tipo_resposta as DraftItem['tipo_resposta'],
        criticidade: item.criticidade as DraftItem['criticidade'],
        obrigatorio: Boolean(item.obrigatorio),
        instrucoes: String(item.instrucoes ?? ''),
      })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar itens do template.')
    } finally {
      setBusy(false)
    }
  }

  const newTemplate = () => {
    setSelectedId('')
    setForm(blankForm)
    setItems([blankItem()])
    setError('')
    setNotice('Novo template em rascunho. Preencha os critérios e salve.')
  }

  const updateItem = <K extends keyof DraftItem>(index: number, field: K, value: DraftItem[K]) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!empresaId) throw new Error('Empresa da sessão não identificada.')
      if (!form.codigo.trim() || !form.nome.trim() || !form.operacao.trim()) throw new Error('Código, nome e operação são obrigatórios.')
      if (!items.length || items.some(item => !item.codigo_item.trim() || !item.caracteristica.trim())) {
        throw new Error('Cada item precisa de código e característica; não é permitido template vazio.')
      }
      if (items.some(item => item.tipo_resposta === 'NUMERICO' && item.limite_inferior && item.limite_superior && Number(item.limite_inferior) > Number(item.limite_superior))) {
        throw new Error('Limite inferior não pode ser maior que o limite superior.')
      }

      let templateId = selectedId
      if (templateId) {
        if (!editable) throw new Error('Template publicado é imutável. Crie uma nova revisão.')
        const update = await supabase.from('erp_qualidade_inspecao_templates')
          .update({ codigo: form.codigo.trim(), nome: form.nome.trim(), produto_id: form.produto_id || null, operacao: form.operacao.trim(), updated_at: new Date().toISOString() })
          .eq('id', templateId).eq('empresa_id', empresaId).eq('status', 'RASCUNHO')
        if (update.error) throw update.error
      } else {
        const user = await supabase.auth.getUser()
        const insert = await supabase.from('erp_qualidade_inspecao_templates')
          .insert({
            empresa_id: empresaId,
            codigo: form.codigo.trim(),
            nome: form.nome.trim(),
            produto_id: form.produto_id || null,
            operacao: form.operacao.trim(),
            revisao: 1,
            status: 'RASCUNHO',
            criado_por: user.data.user?.id ?? null,
          })
          .select('id').single()
        if (insert.error) throw insert.error
        templateId = String(insert.data.id)
      }

      const itemPayload = items.map(item => ({
        codigo_item: item.codigo_item.trim(),
        caracteristica: item.caracteristica.trim(),
        metodo: item.metodo.trim() || null,
        unidade: item.unidade.trim() || null,
        valor_nominal: item.valor_nominal === '' ? null : Number(item.valor_nominal),
        limite_inferior: item.limite_inferior === '' ? null : Number(item.limite_inferior),
        limite_superior: item.limite_superior === '' ? null : Number(item.limite_superior),
        tipo_resposta: item.tipo_resposta,
        criticidade: item.criticidade,
        obrigatorio: item.obrigatorio,
        instrucoes: item.instrucoes.trim() || null,
      }))
      const saveItems = await supabase.rpc('erp_qualidade_inspecao_template_salvar_itens', {
        p_template_id: templateId,
        p_itens: itemPayload,
      })
      if (saveItems.error) throw saveItems.error
      await load()
      const saved = (await supabase.from('erp_qualidade_inspecao_templates')
        .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim,aprovado_em')
        .eq('id', templateId).eq('empresa_id', empresaId).single())
      if (saved.data) await selectTemplate(saved.data as Template)
      setNotice(`Rascunho ${form.codigo.trim()} salvo com ${items.length} item(ns). Ainda não está vigente.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar o template de inspeção.')
    } finally {
      setBusy(false)
    }
  }

  const newRevision = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_qualidade_inspecao_template_nova_revisao', { p_template_id: selected.id })
      if (result.error) throw result.error
      const newId = String(result.data ?? '')
      if (!newId) throw new Error('RPC não retornou o identificador da nova revisão.')
      await load()
      const created = await supabase.from('erp_qualidade_inspecao_templates')
        .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim,aprovado_em')
        .eq('id', newId).eq('empresa_id', empresaId).single()
      if (created.error || !created.data) throw created.error ?? new Error('Nova revisão não encontrada após gravação.')
      await selectTemplate(created.data as Template)
      setNotice(`Nova revisão R${created.data.revisao} criada como rascunho.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar nova revisão.')
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    if (!selected || !editable) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_qualidade_inspecao_template_publicar', { p_template_id: selected.id })
      if (result.error) throw result.error
      await load()
      const refreshed = await supabase.from('erp_qualidade_inspecao_templates')
        .select('id,codigo,nome,produto_id,operacao,revisao,status,vigencia_inicio,vigencia_fim,aprovado_em')
        .eq('id', selected.id).eq('empresa_id', empresaId).single()
      if (refreshed.data) await selectTemplate(refreshed.data as Template)
      setNotice(`Template ${selected.codigo} R${selected.revisao} publicado e vigente a partir de hoje.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao publicar o template.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout
      title="Templates versionados de inspeção"
      subtitle="Critérios controlados por produto e operação. A inspeção em processo não aceita configuração manual fora de um template vigente."
      onRefresh={() => void load()}
      showStatusCards={false}
      topContent={<div className="mb-3 flex min-h-[30px] items-center gap-2 border border-[#C8E3EE] bg-[#EAF6FA] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#123B50]"><ShieldCheck size={14} /> Edição/publicação exige perfil com nivel_admin ≥ 8; revisões vigentes são imutáveis.</div>}
    >
      {error && <p role="alert" className="mb-2 border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800">{error}</p>}
      {notice && <p role="status" className="mb-2 border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800">{notice}</p>}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(280px,.7fr)_minmax(0,1.3fr)]">
        <section className="min-w-0 border border-[#D8E8EE] bg-white">
          <header className="flex items-center justify-between gap-2 border-b border-[#D8E8EE] bg-[#F8FAFC] p-2">
            <div><h2 className="text-[10px] font-black uppercase tracking-wider text-[#123B50]">Templates cadastrados</h2><p className="text-[9px] text-slate-500">{templates.length} revisão(ões)</p></div>
            <button type="button" onClick={newTemplate} className="inline-flex h-8 items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[9px] font-black text-white"><Plus size={13} /> Novo</button>
          </header>
          <div className="border-b border-[#D8E8EE] p-2"><input className={fieldClass} value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar código, nome ou operação…" aria-label="Buscar templates" /></div>
          <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
            {filteredTemplates.map(template => {
              const product = products.find(item => item.id === template.produto_id)
              const active = selectedId === template.id
              return <button key={template.id} type="button" onClick={() => void selectTemplate(template)} className={`block w-full px-3 py-2 text-left hover:bg-[#F4FBFD] ${active ? 'border-l-2 border-l-[#2D8DB8] bg-[#EAF6FA]' : ''}`}>
                <div className="flex items-center justify-between gap-2"><strong className="text-[10px] text-[#123B50]">{template.codigo} · R{template.revisao}</strong><span className={`border px-1.5 py-0.5 text-[8px] font-black ${template.status === 'VIGENTE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : template.status === 'OBSOLETO' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{template.status}</span></div>
                <p className="mt-1 text-[10px] font-semibold text-slate-700">{template.nome}</p>
                <p className="mt-0.5 text-[9px] text-slate-500">{product ? product.codigo : 'Todos os produtos'} · {template.operacao}</p>
                {template.vigencia_inicio && <p className="mt-0.5 text-[8px] text-slate-400">Vigência: {template.vigencia_inicio}{template.vigencia_fim ? ` até ${template.vigencia_fim}` : ' em aberto'}</p>}
              </button>
            })}
            {!loading && filteredTemplates.length === 0 && <p className="p-5 text-center text-[10px] text-slate-500">Nenhum template cadastrado. Crie o primeiro rascunho.</p>}
            {loading && <p className="p-5 text-center text-[10px] text-slate-500">Carregando templates…</p>}
          </div>
        </section>

        <section className="min-w-0 border border-[#D8E8EE] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E8EE] bg-[#F8FAFC] p-2">
            <div><h2 className="text-[10px] font-black uppercase tracking-wider text-[#123B50]">{selected ? `${selected.codigo} · revisão R${selected.revisao}` : 'Novo template de inspeção'}</h2><p className="text-[9px] text-slate-500">{selected ? `Status: ${selected.status}` : 'Rascunho ainda não publicado'}</p></div>
            <div className="flex flex-wrap gap-1">
              {selected && selected.status !== 'RASCUNHO' && <button type="button" onClick={() => void newRevision()} disabled={busy} className="inline-flex h-8 items-center gap-1 border border-[#2D8DB8] px-2 text-[9px] font-bold text-[#176487] disabled:opacity-50"><CopyPlus size={13} /> Nova revisão</button>}
              {editable && <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex h-8 items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[9px] font-black text-white disabled:opacity-50"><Save size={13} /> {busy ? 'Salvando…' : 'Salvar rascunho'}</button>}
              {selected && selected.status === 'RASCUNHO' && <button type="button" onClick={() => void publish()} disabled={busy} className="inline-flex h-8 items-center gap-1 border border-emerald-600 bg-emerald-600 px-2 text-[9px] font-black text-white disabled:opacity-50"><ShieldCheck size={13} /> Publicar revisão</button>}
            </div>
          </header>
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label><span className={labelClass}>Código *</span><input disabled={!editable} className={fieldClass} value={form.codigo} onChange={event => setForm(current => ({ ...current, codigo: event.target.value }))} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Nome do template *</span><input disabled={!editable} className={fieldClass} value={form.nome} onChange={event => setForm(current => ({ ...current, nome: event.target.value }))} /></label>
              <label><span className={labelClass}>Operação *</span><select disabled={!editable} className={fieldClass} value={form.operacao} onChange={event => setForm(current => ({ ...current, operacao: event.target.value }))}><option value="PROCESSO_METROLOGIA">Inspeção em processo</option><option value="INSPECAO_FINAL">Inspeção final</option><option value="RECEBIMENTO">Recebimento</option><option value="ACABAMENTO">Acabamento</option><option value="MONTAGEM">Montagem</option><option value="INJECAO">Injeção</option><option value="PRENSADO">Prensado</option></select></label>
              <label className="md:col-span-2"><span className={labelClass}>Produto (vazio = todos os produtos)</span><select disabled={!editable} className={fieldClass} value={form.produto_id} onChange={event => setForm(current => ({ ...current, produto_id: event.target.value }))}><option value="">Todos os produtos da operação</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} · {product.nome}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[#D8E8EE] py-2">
              <div><h3 className="text-[10px] font-black uppercase tracking-wider text-[#123B50]">Itens de inspeção</h3><p className="text-[9px] text-slate-500">Cada característica, método, unidade e limite pertence a esta revisão.</p></div>
              {editable && <button type="button" onClick={() => setItems(current => [...current, blankItem()])} className="inline-flex h-8 items-center gap-1 border border-[#CFE1E7] px-2 text-[9px] font-bold text-[#123B50]"><Plus size={13} /> Adicionar item</button>}
            </div>
            <div className="space-y-2">
              {items.map((item, index) => <article key={index} className="border border-[#D8E8EE] bg-[#FBFDFE] p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-[9px] uppercase tracking-wider text-[#176487]">Item {index + 1}</strong>{editable && items.length > 1 && <button type="button" onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="inline-flex h-7 items-center gap-1 border border-rose-200 px-2 text-[9px] font-bold text-rose-700"><Trash2 size={12} /> Remover</button>}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className={labelClass}>Código do item *</span><input disabled={!editable} className={fieldClass} value={item.codigo_item} onChange={event => updateItem(index, 'codigo_item', event.target.value)} /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Característica *</span><input disabled={!editable} className={fieldClass} value={item.caracteristica} onChange={event => updateItem(index, 'caracteristica', event.target.value)} /></label>
                  <label><span className={labelClass}>Tipo de resposta</span><select disabled={!editable} className={fieldClass} value={item.tipo_resposta} onChange={event => updateItem(index, 'tipo_resposta', event.target.value as DraftItem['tipo_resposta'])}><option value="NUMERICO">Numérico</option><option value="TEXTO">Texto</option><option value="SIM_NAO">Sim / Não</option><option value="CONFORME_NAO_CONFORME">Conforme / Não conforme</option></select></label>
                  <label><span className={labelClass}>Método</span><input disabled={!editable} className={fieldClass} value={item.metodo} onChange={event => updateItem(index, 'metodo', event.target.value)} /></label>
                  <label><span className={labelClass}>Unidade</span><input disabled={!editable} className={fieldClass} value={item.unidade} onChange={event => updateItem(index, 'unidade', event.target.value)} /></label>
                  <label><span className={labelClass}>Valor nominal</span><input disabled={!editable || item.tipo_resposta !== 'NUMERICO'} type="number" step="any" className={fieldClass} value={item.valor_nominal} onChange={event => updateItem(index, 'valor_nominal', event.target.value)} /></label>
                  <label><span className={labelClass}>Limite inferior</span><input disabled={!editable || item.tipo_resposta !== 'NUMERICO'} type="number" step="any" className={fieldClass} value={item.limite_inferior} onChange={event => updateItem(index, 'limite_inferior', event.target.value)} /></label>
                  <label><span className={labelClass}>Limite superior</span><input disabled={!editable || item.tipo_resposta !== 'NUMERICO'} type="number" step="any" className={fieldClass} value={item.limite_superior} onChange={event => updateItem(index, 'limite_superior', event.target.value)} /></label>
                  <label><span className={labelClass}>Criticidade</span><select disabled={!editable} className={fieldClass} value={item.criticidade} onChange={event => updateItem(index, 'criticidade', event.target.value as DraftItem['criticidade'])}><option>BAIXA</option><option>MEDIA</option><option>ALTA</option><option>CRITICA</option></select></label>
                  <label className="sm:col-span-2"><span className={labelClass}>Instruções ao inspetor</span><input disabled={!editable} className={fieldClass} value={item.instrucoes} onChange={event => updateItem(index, 'instrucoes', event.target.value)} /></label>
                  <label className="flex h-8 items-center gap-2 pt-4 text-[9px] font-bold text-[#123B50]"><input disabled={!editable} type="checkbox" checked={item.obrigatorio} onChange={event => updateItem(index, 'obrigatorio', event.target.checked)} /> Resposta obrigatória</label>
                </div>
              </article>)}
            </div>
            {!editable && <p className="border border-amber-200 bg-amber-50 p-2 text-[9px] text-amber-900">Esta revisão está publicada/obsoleta e é somente leitura. Use <strong>Nova revisão</strong> para alterar critérios sem modificar inspeções históricas.</p>}
            <div className="flex items-center justify-between gap-2 border-t border-[#D8E8EE] pt-2 text-[9px] text-slate-500"><span>Empresa: {empresaId || '—'} · itens: {items.length}</span><button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-7 items-center gap-1 border border-[#CFE1E7] px-2 font-bold text-[#123B50]"><RefreshCw size={12} /> Atualizar</button></div>
          </div>
        </section>
      </div>
    </VendasLayout>
  )
}
