import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import QualitySidebar from '../components/quality/QualitySidebar'

type Product = LookupRecord
type Instrument = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type QualityUser = { auth_user_id: string | null; nome: string }
type Specification = {
  id: string
  produto_id: string
  codigo: string
  caracteristica: string
  unidade: string | null
  nominal: number | null
  limite_inferior: number | null
  limite_superior: number | null
  frequencia: string | null
  grupo_material: string | null
  tipo_inspecao: string
  metodo_inspecao: string
  condicao_armazenamento: string | null
  instrumento_id: string | null
  revisao: number
  vigencia_inicio: string | null
  vigencia_fim: string | null
  responsavel_id: string | null
  aprovador_id: string | null
  status: string | null
}
type HistoryRevision = { id: string; plano_inspecao_id: string; revisao: number; dados: Record<string, unknown>; alterado_por: string | null; alterado_em: string }
type FormState = {
  id: string
  produto_id: string
  codigo: string
  caracteristica: string
  unidade: string
  nominal: string
  limite_inferior: string
  limite_superior: string
  frequencia: string
  grupo_material: string
  tipo_inspecao: 'RECEBIMENTO' | 'PROCESSO' | 'FINAL' | 'EXPEDICAO'
  metodo_inspecao: 'VISUAL' | 'DIMENSIONAL' | 'FUNCIONAL' | 'DOCUMENTAL'
  condicao_armazenamento: string
  instrumento_id: string
  revisao: string
  vigencia_inicio: string
  vigencia_fim: string
  responsavel_id: string
  aprovador_id: string
  status: 'rascunho' | 'ativo' | 'inativo'
}
const emptyForm: FormState = {
  id: '', produto_id: '', codigo: '', caracteristica: '', unidade: '', nominal: '',
  limite_inferior: '', limite_superior: '', frequencia: '100%', grupo_material: '',
  tipo_inspecao: 'RECEBIMENTO', metodo_inspecao: 'DIMENSIONAL', condicao_armazenamento: '',
  instrumento_id: '', revisao: '1', vigencia_inicio: '', vigencia_fim: '', responsavel_id: '', aprovador_id: '', status: 'rascunho',
}
const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'

export default function QualidadeEspecificacoes() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [users, setUsers] = useState<QualityUser[]>([])
  const [rows, setRows] = useState<Specification[]>([])
  const [historyRows, setHistoryRows] = useState<HistoryRevision[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [canApprove, setCanApprove] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [productResult, specResult, instrumentResult, userResult, historyResult] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(2000),
        supabase.from('erp_planos_inspecao').select('id,produto_id,codigo,caracteristica,unidade,nominal,limite_inferior,limite_superior,frequencia,grupo_material,tipo_inspecao,metodo_inspecao,condicao_armazenamento,instrumento_id,revisao,vigencia_inicio,vigencia_fim,responsavel_id,aprovador_id,status').eq('empresa_id', id).order('codigo').limit(2000),
        supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao').eq('empresa_id', id).order('codigo').limit(1000),
        supabase.from('erp_usuarios').select('auth_user_id,nome').eq('empresa_id', id).eq('ativo', true).order('nome').limit(500),
        supabase.from('erp_planos_inspecao_revisoes').select('id,plano_inspecao_id,revisao,dados,alterado_por,alterado_em').eq('empresa_id', id).order('alterado_em',{ascending:false}).limit(1000),
      ])
      if (productResult.error) throw productResult.error
      if (specResult.error) throw specResult.error
      if (instrumentResult.error) throw instrumentResult.error
      if (userResult.error) throw userResult.error
      if (historyResult.error) throw historyResult.error
      setEmpresaId(id)
      setProducts((productResult.data ?? []) as Product[])
      setRows((specResult.data ?? []) as Specification[])
      setInstruments((instrumentResult.data ?? []) as Instrument[])
      setUsers((userResult.data ?? []) as QualityUser[])
      setHistoryRows((historyResult.data ?? []) as HistoryRevision[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar especificações técnicas.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { let mounted = true; void (async () => { try { const [master, permission] = await Promise.all([supabase.rpc('erp_is_master'), supabase.rpc('erp_has_permission', { p_modulo: 'qualidade', p_acao: 'aprovar' })]); if (mounted) setCanApprove((!master.error && master.data === true) || (!permission.error && permission.data === true)) } catch { if (mounted) setCanApprove(false) } })(); return () => { mounted = false } }, [])

  const today = new Date().toISOString().slice(0, 10)
  const validInstruments = useMemo(() => instruments.filter(item => item.status.toUpperCase() === 'APROVADO' && Boolean(item.proxima_calibracao && item.proxima_calibracao >= today)), [instruments, today])

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(row => {
      if (!showInactive && (row.status ?? '').toLowerCase() !== 'ativo') return false
      const product = products.find(item => item.id === row.produto_id)
      return !term || [row.codigo, row.caracteristica, row.unidade, row.nominal, row.vigencia_inicio, row.vigencia_fim, row.frequencia, row.grupo_material, row.tipo_inspecao, product?.codigo, product?.nome]
        .some(value => String(value ?? '').toLowerCase().includes(term))
    })
  }, [rows, products, query, showInactive])

  function edit(row: Specification) {
    const isDraft = (row.status ?? '').toLowerCase() === 'rascunho'
    const nextRevision = Math.max(0, ...rows.filter(item => item.produto_id === row.produto_id && item.codigo === row.codigo && item.tipo_inspecao === row.tipo_inspecao).map(item => item.revisao)) + 1
    setForm({
      id: isDraft ? row.id : '', produto_id: row.produto_id, codigo: row.codigo,
      caracteristica: row.caracteristica, unidade: row.unidade ?? '',
      nominal: row.nominal == null ? '' : String(row.nominal),
      limite_inferior: row.limite_inferior == null ? '' : String(row.limite_inferior),
      limite_superior: row.limite_superior == null ? '' : String(row.limite_superior),
      frequencia: row.frequencia ?? '100%',
      grupo_material: row.grupo_material ?? '', tipo_inspecao: (row.tipo_inspecao ?? 'RECEBIMENTO') as FormState['tipo_inspecao'],
      metodo_inspecao: (row.metodo_inspecao ?? 'DIMENSIONAL') as FormState['metodo_inspecao'],
      condicao_armazenamento: row.condicao_armazenamento ?? '', instrumento_id: row.instrumento_id ?? '',
      revisao: String(isDraft ? row.revisao ?? 1 : nextRevision), vigencia_inicio: row.vigencia_inicio ?? '', vigencia_fim: row.vigencia_fim ?? '',
      responsavel_id: row.responsavel_id ?? '', aprovador_id: '',
      status: 'rascunho',
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
    const nominal = form.nominal.trim() === '' ? null : Number(form.nominal)
    if (nominal !== null && !Number.isFinite(nominal)) { setError('O nominal precisa ser um número válido.'); return }
    if (nominal !== null && ((lower !== null && nominal < lower) || (upper !== null && nominal > upper))) { setError('O nominal deve ficar entre os limites técnicos cadastrados.'); return }
    if (!['VISUAL','DOCUMENTAL'].includes(form.metodo_inspecao) && (nominal === null || (lower === null && upper === null))) {
      setError('Especificações dimensionais ou funcionais ativas precisam de nominal e ao menos um limite técnico.')
      return
    }
    if (!Number.isInteger(Number(form.revisao)) || Number(form.revisao) < 1) { setError('A revisão deve ser um inteiro maior que zero.'); return }
    const existing = form.id ? rows.find(row => row.id === form.id) : null
    const technicalChanged = Boolean(existing && (
      existing.produto_id !== form.produto_id || existing.codigo !== form.codigo.trim() || existing.caracteristica !== form.caracteristica.trim() ||
      (existing.unidade ?? null) !== (form.unidade.trim() || null) || existing.nominal !== nominal || existing.limite_inferior !== lower || existing.limite_superior !== upper ||
      (existing.frequencia ?? '100%') !== (form.frequencia.trim() || '100%') || (existing.grupo_material ?? null) !== (form.grupo_material.trim() || null) ||
      existing.tipo_inspecao !== form.tipo_inspecao || existing.metodo_inspecao !== form.metodo_inspecao ||
      (existing.condicao_armazenamento ?? null) !== (form.condicao_armazenamento.trim() || null) || (existing.instrumento_id ?? null) !== (form.instrumento_id || null) ||
      (existing.vigencia_inicio ?? null) !== (form.vigencia_inicio || null) || (existing.vigencia_fim ?? null) !== (form.vigencia_fim || null) ||
      (existing.responsavel_id ?? null) !== (form.responsavel_id || null) || (existing.aprovador_id ?? null) !== (form.aprovador_id || null)
    ))
    if (technicalChanged && existing && Number(form.revisao) <= existing.revisao) { setError('Critérios técnicos alterados: incremente a revisão acima de ' + existing.revisao + ' para preservar o histórico.'); return }
    if (form.vigencia_inicio && form.vigencia_fim && form.vigencia_fim < form.vigencia_inicio) { setError('A vigência final não pode anteceder a vigência inicial.'); return }
    if (form.vigencia_fim && form.vigencia_fim < today) { setError('Uma especificação vencida não pode permanecer ativa.'); return }
    
    if (form.instrumento_id && !instruments.some(item => item.id === form.instrumento_id)) { setError('Selecione um instrumento cadastrado na empresa atual.'); return }
    if (!['VISUAL','DOCUMENTAL'].includes(form.metodo_inspecao) && !validInstruments.some(item => item.id === form.instrumento_id)) { setError('Especificação dimensional/funcional ativa exige instrumento aprovado e com calibração vigente.'); return }
    if (form.responsavel_id && !users.some(user => user.auth_user_id === form.responsavel_id)) { setError('Responsável inválido para a empresa atual.'); return }
    if (form.aprovador_id && !users.some(user => user.auth_user_id === form.aprovador_id)) { setError('Aprovador inválido para a empresa atual.'); return }
    if (!form.responsavel_id) { setError('Defina o responsável técnico pela especificação antes de gravar o rascunho.'); return }
    if (['DIMENSIONAL','FUNCIONAL'].includes(form.metodo_inspecao)) {
      const instrument = instruments.find(item => item.id === form.instrumento_id)
      const today = new Date().toISOString().slice(0, 10)
      if (!instrument || instrument.status.toUpperCase() !== 'APROVADO' || !instrument.proxima_calibracao || instrument.proxima_calibracao < today) { setError('Especificação dimensional/funcional ativa exige instrumento aprovado e com calibração vigente.'); return }
    }
    

    setBusy(true)
    try {
      const payload = {
        empresa_id: empresaId,
        produto_id: form.produto_id,
        codigo: form.codigo.trim(),
        caracteristica: form.caracteristica.trim(),
        unidade: form.unidade.trim() || null,
        nominal,
        limite_inferior: lower,
        limite_superior: upper,
        frequencia: form.frequencia.trim() || '100%',
        grupo_material: form.grupo_material.trim() || null, tipo_inspecao: form.tipo_inspecao,
        metodo_inspecao: form.metodo_inspecao, condicao_armazenamento: form.condicao_armazenamento.trim() || null,
        instrumento_id: form.instrumento_id || null, revisao: Number(form.revisao), vigencia_inicio: form.vigencia_inicio || null, vigencia_fim: form.vigencia_fim || null,
        responsavel_id: form.responsavel_id || null, aprovador_id: null,
        status: 'rascunho',
      }
      const result = form.id
        ? await supabase.from('erp_planos_inspecao').update(payload).eq('id', form.id).eq('empresa_id', empresaId)
        : await supabase.from('erp_planos_inspecao').insert(payload)
      if (result.error) throw result.error
      setNotice('Especificação gravada como rascunho. A revisão só será consumida após aprovação formal da Qualidade.')
      setForm(emptyForm)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar especificação técnica.')
    } finally {
      setBusy(false)
    }
  }

  async function approveSpec(row: Specification) {
    setError('')
    setNotice('')
    if (!canApprove) { setError('Aprovação restrita ao Master ou ao perfil com permissão Qualidade/Aprovar.'); return }
    setBusy(true)
    try {
      const result = await supabase.rpc('erp_qualidade_aprovar_especificacao', { p_especificacao_id: row.id })
      if (result.error) throw result.error
      setNotice('Especificação aprovada formalmente; o aprovador real foi registrado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao aprovar especificação técnica.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(row: Specification) {
    setError('')
    setNotice('')
    if (!empresaId) return setError('Empresa da sessão não identificada.')
    if ((row.status ?? '').toLowerCase() !== 'ativo') {
      setError('Use Aprovar para ativar uma revisão. A ativação exige permissão formal da Qualidade.')
      return
    }
    setBusy(true)
    try {
      const result = await supabase.from('erp_planos_inspecao').update({ status: 'inativo' }).eq('id', row.id).eq('empresa_id', empresaId)
      if (result.error) throw result.error
      setNotice('Especificação inativada sem apagar o histórico.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao inativar a especificação.')
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
            <label className={label}>Grupo de material<input className={input} value={form.grupo_material} onChange={event => setForm(current => ({ ...current, grupo_material: event.target.value }))} placeholder="Parafusos, molas, ferragens..."/></label>
            <div className="grid grid-cols-2 gap-2">
              <label className={label}>Etapa de inspeção<select className={input} value={form.tipo_inspecao} onChange={event => setForm(current => ({ ...current, tipo_inspecao: event.target.value as FormState['tipo_inspecao'] }))}><option value="RECEBIMENTO">Recebimento</option><option value="PROCESSO">Processo</option><option value="FINAL">Final</option><option value="EXPEDICAO">Expedição</option></select></label>
              <label className={label}>Método de controle<select className={input} value={form.metodo_inspecao} onChange={event => setForm(current => ({ ...current, metodo_inspecao: event.target.value as FormState['metodo_inspecao'] }))}><option value="VISUAL">Visual</option><option value="DIMENSIONAL">Dimensional</option><option value="FUNCIONAL">Funcional</option><option value="DOCUMENTAL">Documental</option></select></label>
            </div>
            <label className={label}>Condição de armazenamento<textarea className="min-h-16 w-full rounded-[2px] border border-slate-300 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#2D8DB8]" value={form.condicao_armazenamento} onChange={event => setForm(current => ({ ...current, condicao_armazenamento: event.target.value }))} placeholder="Local fresco, embalagem hermética, proteção..."/></label>
            <label className={label}>Instrumento de medição<select className={input} value={form.instrumento_id} onChange={event => setForm(current => ({ ...current, instrumento_id: event.target.value }))}><option value="">Sem instrumento vinculado</option>{instruments.map(instrument => <option key={instrument.id} value={instrument.id}>{instrument.codigo} — {instrument.descricao}{instrument.proxima_calibracao ? ` • calib. ${instrument.proxima_calibracao}` : ''}</option>)}</select></label>
            <div className="grid grid-cols-3 gap-2"><label className={label}>Revisão<input className={input} type="number" min="1" step="1" value={form.revisao} onChange={event => setForm(current => ({ ...current, revisao: event.target.value }))}/></label><label className={label}>Vigência inicial<input className={input} type="date" value={form.vigencia_inicio} onChange={event => setForm(current => ({ ...current, vigencia_inicio: event.target.value }))}/></label><label className={label}>Vigência final<input className={input} type="date" value={form.vigencia_fim} onChange={event => setForm(current => ({ ...current, vigencia_fim: event.target.value }))}/></label></div>
            <div className="grid grid-cols-2 gap-2"><label className={label}>Responsável<select className={input} value={form.responsavel_id} onChange={event => setForm(current => ({ ...current, responsavel_id: event.target.value }))}><option value="">Não definido</option>{users.filter(user => user.auth_user_id).map(user => <option key={user.auth_user_id} value={user.auth_user_id as string}>{user.nome}</option>)}</select></label><label className={label}>Aprovador<input className={input} value="Definido automaticamente na aprovação" readOnly/></label></div>
            <label className={label}>Nominal<input className={input} type="number" step="any" value={form.nominal} onChange={event => setForm(current => ({ ...current, nominal: event.target.value }))} placeholder="Valor nominal"/></label>
            <div className="grid grid-cols-2 gap-2"><label className={label}>Limite mínimo<input className={input} type="number" step="any" value={form.limite_inferior} onChange={event => setForm(current => ({ ...current, limite_inferior: event.target.value }))}/></label><label className={label}>Limite máximo<input className={input} type="number" step="any" value={form.limite_superior} onChange={event => setForm(current => ({ ...current, limite_superior: event.target.value }))}/></label></div>
            <label className={label}>Frequência de inspeção<input className={input} value={form.frequencia} onChange={event => setForm(current => ({ ...current, frequencia: event.target.value }))} placeholder="100%, por hora, por lote..."/></label>
            <label className={label}>Status controlado<input className={input} value="Rascunho — requer aprovação" readOnly/></label>
            <button type="button" disabled={busy} className="bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50" onClick={() => void save()}><Save size={13} className="mr-1 inline"/>{busy ? 'Gravando…' : 'Gravar especificação'}</button>
          </div>
        </section>
        <section className="min-w-0 border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-[12px] font-semibold">Especificações cadastradas</h2><p className="text-[10px] text-slate-500">{visibleRows.length} registros visíveis • dados reais por empresa</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1"><Search size={13}/><input className="h-[30px] w-[220px] rounded-[2px] border border-slate-300 px-2 text-[11px]" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código, produto ou característica"/></div><label className="flex items-center gap-1 text-[10px] normal-case"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)}/> Incluir inativas</label></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-slate-100"><tr><th>Código</th><th>Produto</th><th>Característica</th><th>Tipo / método</th><th>Nominal</th><th>Limites</th><th>Rev.</th><th>Vigência</th><th>Frequência</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {visibleRows.map(row => { const product = products.find(item => item.id === row.produto_id); return <tr key={row.id} className="border-t border-slate-100"><td className="font-semibold">{row.codigo}</td><td>{product ? `${product.codigo} — ${product.nome}` : 'Produto não localizado'}</td><td>{row.caracteristica}{row.unidade ? ` (${row.unidade})` : ''}</td><td>{row.tipo_inspecao} / {row.metodo_inspecao}</td><td>{row.nominal ?? '—'}</td><td>{row.limite_inferior ?? '—'} a {row.limite_superior ?? '—'}</td><td>{row.revisao}</td><td>{row.vigencia_inicio || '—'} → {row.vigencia_fim || '—'}</td><td>{row.frequencia || '—'}</td><td>{row.status || '—'}</td><td><div className="flex gap-1"><button type="button" className="border border-slate-300 px-2" onClick={() => edit(row)}><Check size={12} className="mr-1 inline"/> Nova revisão</button>{(row.status ?? '').toLowerCase() === 'ativo' && row.aprovador_id ? <button type="button" className="border border-slate-300 px-2" disabled={busy} onClick={() => void toggleStatus(row)}>Inativar</button> : canApprove ? <button type="button" className="border border-slate-300 px-2" disabled={busy} onClick={() => void approveSpec(row)}>Aprovar</button> : <span className="text-[10px] text-slate-500">Aguardando aprovação</span></div></td></tr> }) }
            {!visibleRows.length && <tr><td colSpan={11} className="p-6 text-center text-[11px] text-slate-500">{busy ? 'Carregando dados...' : 'Nenhuma especificação para os filtros atuais.'}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
      {form.id && <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 p-3"><h2 className="text-[12px] font-semibold">Histórico imutável da especificação</h2><p className="text-[10px] text-slate-500">Alterações técnicas gravam um snapshot da revisão anterior; a revisão atual permanece no cadastro mestre.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-slate-100"><tr><th>Rev.</th><th>Código</th><th>Característica</th><th>Nominal</th><th>Limites</th><th>Alterado em</th><th>Responsável</th></tr></thead><tbody>{historyRows.filter(item=>item.plano_inspecao_id===form.id).map(item=>{const snapshot=item.dados;return <tr key={item.id} className="border-t border-slate-100"><td>{item.revisao}</td><td>{String(snapshot.codigo??'—')}</td><td>{String(snapshot.caracteristica??'—')}</td><td>{String(snapshot.nominal??'—')}</td><td>{String(snapshot.limite_inferior??'—')} a {String(snapshot.limite_superior??'—')}</td><td>{new Date(item.alterado_em).toLocaleString('pt-BR')}</td><td>{users.find(user=>user.auth_user_id===item.alterado_por)?.nome||item.alterado_por?.slice(0,8)||'—'}</td></tr>})}{!historyRows.some(item=>item.plano_inspecao_id===form.id)&&<tr><td colSpan={7} className="p-3 text-center text-[10px] text-slate-500">Nenhuma revisão anterior registrada.</td></tr>}</tbody></table></div></section>}
      <div className="flex items-center gap-2 text-[10px] text-slate-500"><ShieldCheck size={13}/> O cadastro mestre controla etapa, método, limites, frequência, armazenamento, instrumento, revisão, vigência e responsáveis; alterações técnicas preservam snapshot e as consultas são limitadas à empresa autenticada.</div>
    </div>
  </main>
}
