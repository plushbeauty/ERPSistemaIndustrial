/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_APROVACAO: INSTRUMENTOS-METROLOGIA-STEEL-BLUE-EM-REVISAO
 * @REVISAO: layout Steel Blue split-screen; campos alinhados ao schema real erp_equipamentos_medicao.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Plus, RefreshCw, Save, Search, ShieldCheck, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Instrument = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  fabricante: string | null
  equipamento: string | null
  modelo: string | null
  numero_serie: string | null
  faixa_medicao: string | null
  resolucao: string | null
  setor: string | null
  responsavel: string | null
  status: string
  proxima_calibracao: string | null
  ultima_calibracao: string | null
  numero_certificado_atual: string | null
  certificado_rbc: boolean
  certificado_validade: string | null
  tolerancia_nominal: number | null
  erro_maximo: number | null
  unidade_medida: string | null
  observacoes: string | null
  rastreabilidade_padrao: string | null
  intervalo_calibracao_dias: number | null
  criticidade: string | null
}
type Draft = {
  id: string
  codigo: string
  descricao: string
  fabricante: string
  equipamento: string
  modelo: string
  numero_serie: string
  faixa_medicao: string
  resolucao: string
  setor: string
  responsavel: string
  status: string
  ultima_calibracao: string
  proxima_calibracao: string
  numero_certificado_atual: string
  certificado_validade: string
  tolerancia_nominal: string
  erro_maximo: string
  unidade_medida: string
  observacoes: string
  rastreabilidade_padrao: string
  intervalo_calibracao_dias: string
  criticidade: string
}
const emptyDraft: Draft = {
  id: '', codigo: '', descricao: '', fabricante: '', equipamento: '', modelo: '',
  numero_serie: '', faixa_medicao: '', resolucao: '', setor: '', responsavel: '',
  status: 'BLOQUEADO', ultima_calibracao: '', proxima_calibracao: '',
  numero_certificado_atual: '', certificado_validade: '', tolerancia_nominal: '',
  erro_maximo: '', unidade_medida: '', observacoes: '', rastreabilidade_padrao: '',
  intervalo_calibracao_dias: '365', criticidade: 'NORMAL',
}
const fields = [
  { key: 'codigo', label: 'Código / TAG', required: true },
  { key: 'descricao', label: 'Descrição do instrumento', required: true },
  { key: 'equipamento', label: 'Tipo de instrumento' },
  { key: 'fabricante', label: 'Fabricante' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'numero_serie', label: 'Número de série' },
  { key: 'faixa_medicao', label: 'Faixa de medição' },
  { key: 'resolucao', label: 'Resolução' },
  { key: 'setor', label: 'Setor / localização' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'unidade_medida', label: 'Unidade de medida' },
  { key: 'rastreabilidade_padrao', label: 'Rastreabilidade do padrão' },
  { key: 'numero_certificado_atual', label: 'Certificado atual' },
  { key: 'tolerancia_nominal', label: 'Tolerância nominal', type: 'number' },
  { key: 'erro_maximo', label: 'Erro máximo admitido', type: 'number' },
  { key: 'intervalo_calibracao_dias', label: 'Intervalo de calibração (dias)', type: 'number' },
] as const
const inputClass = 'h-8 min-w-0 w-full rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2 text-[10px] font-mono font-semibold text-[#F4FBFD] outline-none placeholder:text-slate-500 focus:border-[#48B7C7] disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-wide text-[#AFC7D6]'
const selectFields = 'id,empresa_id,codigo,descricao,fabricante,equipamento,modelo,numero_serie,faixa_medicao,resolucao,setor,responsavel,status,proxima_calibracao,ultima_calibracao,numero_certificado_atual,certificado_rbc,certificado_validade,tolerancia_nominal,erro_maximo,unidade_medida,observacoes,rastreabilidade_padrao,intervalo_calibracao_dias,criticidade'
const dateLabel = (value: string | null) => value ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
const numberValue = (value: string) => value.trim() === '' ? null : Number(value)
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'Falha na operação de metrologia.'

export default function QualidadeInstrumentosCadastro() {
  const [empresaId, setEmpresaId] = useState('')
  const [rows, setRows] = useState<Instrument[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada. Entre novamente ou solicite acesso ao administrador.')
      const companyId = String(tenant.data)
      setEmpresaId(companyId)
      const result = await supabase.from('erp_equipamentos_medicao')
        .select(selectFields).eq('empresa_id', companyId).order('codigo').limit(2000)
      if (result.error) throw result.error
      setRows((result.data ?? []) as Instrument[])
    } catch (cause) {
      setError(errorText(cause))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(row => [row.codigo, row.descricao, row.fabricante, row.equipamento, row.modelo, row.numero_serie, row.setor, row.status, row.numero_certificado_atual]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [rows, query])

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: rows.length,
      vencidos: rows.filter(row => row.proxima_calibracao && row.proxima_calibracao < today).length,
      pendentes: rows.filter(row => !row.proxima_calibracao || row.status.toUpperCase() !== 'APROVADO').length,
      liberados: rows.filter(row => row.status.toUpperCase() === 'APROVADO' && Boolean(row.proxima_calibracao && row.proxima_calibracao >= today)).length,
    }
  }, [rows])

  const nextDatePreview = useMemo(() => {
    if (!draft.ultima_calibracao || !draft.intervalo_calibracao_dias || !Number.isFinite(Number(draft.intervalo_calibracao_dias)) || Number(draft.intervalo_calibracao_dias) <= 0) return draft.proxima_calibracao || '—'
    const date = new Date(draft.ultima_calibracao + 'T00:00:00')
    date.setDate(date.getDate() + Number(draft.intervalo_calibracao_dias))
    return date.toISOString().slice(0, 10)
  }, [draft.ultima_calibracao, draft.intervalo_calibracao_dias, draft.proxima_calibracao])

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  function edit(row: Instrument) {
    setSelectedId(row.id)
    setDraft({
      id: row.id, codigo: row.codigo, descricao: row.descricao, fabricante: row.fabricante ?? '',
      equipamento: row.equipamento ?? '', modelo: row.modelo ?? '', numero_serie: row.numero_serie ?? '',
      faixa_medicao: row.faixa_medicao ?? '', resolucao: row.resolucao ?? '', setor: row.setor ?? '',
      responsavel: row.responsavel ?? '', status: row.status, ultima_calibracao: row.ultima_calibracao ?? '',
      proxima_calibracao: row.proxima_calibracao ?? '', numero_certificado_atual: row.numero_certificado_atual ?? '',
      certificado_validade: row.certificado_validade ?? '', tolerancia_nominal: row.tolerancia_nominal === null ? '' : String(row.tolerancia_nominal),
      erro_maximo: row.erro_maximo === null ? '' : String(row.erro_maximo), unidade_medida: row.unidade_medida ?? '',
      observacoes: row.observacoes ?? '', rastreabilidade_padrao: row.rastreabilidade_padrao ?? '',
      intervalo_calibracao_dias: row.intervalo_calibracao_dias === null ? '' : String(row.intervalo_calibracao_dias),
      criticidade: row.criticidade ?? 'NORMAL',
    })
    setError('')
    setNotice('')
    setShowPanel(true)
  }

  function newInstrument() {
    setSelectedId(null)
    setDraft({ ...emptyDraft })
    setError('')
    setNotice('')
    setShowPanel(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const companyId = String(tenant.data)
      if (!draft.codigo.trim() || !draft.descricao.trim()) throw new Error('Código/TAG e descrição do instrumento são obrigatórios.')
      const numericFields = [draft.tolerancia_nominal, draft.erro_maximo, draft.intervalo_calibracao_dias]
      if (numericFields.some(value => value.trim() !== '' && !Number.isFinite(Number(value)))) throw new Error('Revise tolerância, erro máximo e intervalo de calibração.')
      if (draft.intervalo_calibracao_dias.trim() && (!Number.isInteger(Number(draft.intervalo_calibracao_dias)) || Number(draft.intervalo_calibracao_dias) <= 0)) throw new Error('O intervalo de calibração deve ser um número inteiro de dias maior que zero.')
      if (draft.tolerancia_nominal.trim() && Number(draft.tolerancia_nominal) < 0) throw new Error('A tolerância nominal não pode ser negativa.')
      if (draft.erro_maximo.trim() && Number(draft.erro_maximo) < 0) throw new Error('O erro máximo admitido não pode ser negativo.')
      if (draft.ultima_calibracao && draft.proxima_calibracao && draft.proxima_calibracao < draft.ultima_calibracao) throw new Error('A próxima calibração não pode anteceder a última calibração.')
      const payload = {
        empresa_id: companyId, codigo: draft.codigo.trim().toUpperCase(), descricao: draft.descricao.trim(),
        fabricante: draft.fabricante.trim() || null, equipamento: draft.equipamento.trim() || null,
        modelo: draft.modelo.trim() || null, numero_serie: draft.numero_serie.trim() || null,
        faixa_medicao: draft.faixa_medicao.trim() || null, resolucao: draft.resolucao.trim() || null,
        setor: draft.setor.trim() || null, responsavel: draft.responsavel.trim() || null,
        status: draft.status, ultima_calibracao: draft.ultima_calibracao || null,
        proxima_calibracao: draft.proxima_calibracao || (nextDatePreview !== '—' ? nextDatePreview : null),
        numero_certificado_atual: draft.numero_certificado_atual.trim() || null,
        certificado_validade: draft.certificado_validade || null,
        tolerancia_nominal: numberValue(draft.tolerancia_nominal), erro_maximo: numberValue(draft.erro_maximo),
        unidade_medida: draft.unidade_medida.trim() || null, observacoes: draft.observacoes.trim() || null,
        rastreabilidade_padrao: draft.rastreabilidade_padrao.trim() || null,
        intervalo_calibracao_dias: numberValue(draft.intervalo_calibracao_dias), criticidade: draft.criticidade,
      }
      const result = selectedId
        ? await supabase.from('erp_equipamentos_medicao').update(payload).eq('id', selectedId).eq('empresa_id', companyId).select('id').single()
        : await supabase.from('erp_equipamentos_medicao').insert(payload).select('id').single()
      if (result.error) throw result.error
      setNotice(selectedId ? 'Instrumento atualizado com sucesso.' : 'Instrumento cadastrado com sucesso.')
      setSelectedId(null)
      setDraft({ ...emptyDraft })
      setShowPanel(false)
      await load()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  async function blockSelected() {
    if (!selectedId || !empresaId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_equipamentos_medicao').update({ status: 'BLOQUEADO' })
        .eq('id', selectedId).eq('empresa_id', empresaId).select('id').single()
      if (result.error) throw result.error
      setNotice('Instrumento bloqueado. O registro foi preservado para rastreabilidade.')
      setSelectedId(null); setDraft({ ...emptyDraft }); setShowPanel(false)
      await load()
    } catch (cause) {
      setError(errorText(cause))
    } finally { setBusy(false) }
  }

  const statusLabel = (row: Instrument) => {
    if (row.proxima_calibracao && row.proxima_calibracao < new Date().toISOString().slice(0, 10)) return 'VENCIDO'
    if (row.status.toUpperCase() === 'APROVADO' && row.proxima_calibracao) return 'LIBERADO'
    return row.status.toUpperCase()
  }
  const statusClass = (row: Instrument) => {
    const status = statusLabel(row)
    return status === 'LIBERADO' ? 'border-emerald-800 bg-emerald-950/70 text-emerald-300' : status === 'VENCIDO' ? 'border-red-800 bg-red-950/70 text-red-300' : 'border-amber-800 bg-amber-950/70 text-amber-300'
  }

  return (
    <VendasLayout title="Controle de Instrumentos e Metrologia" subtitle="Cadastro mestre • rastreabilidade • vencimentos de calibração" onRefresh={() => void load()}>
      <main className="min-h-screen bg-[#0E1E2F] p-3 font-mono text-[#F4FBFD] antialiased">
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'mb-3 flex items-start gap-2 border border-red-900 bg-[#2D161B] p-2.5 text-[11px] font-bold text-red-300' : 'mb-3 flex items-start gap-2 border border-emerald-900 bg-[#0B2A22] p-2.5 text-[11px] font-bold text-emerald-300'}>{error ? <AlertTriangle size={14} className="shrink-0"/> : <CheckCircle2 size={14} className="shrink-0"/>}{error || notice}</div>}
        <section className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            { label: 'Ativos cadastrados', value: counts.total, icon: Wrench },
            { label: 'Calibrações vencidas', value: counts.vencidos, icon: AlertTriangle },
            { label: 'Pendentes / bloqueados', value: counts.pendentes, icon: Clock3 },
            { label: 'Liberados para uso', value: counts.liberados, icon: ShieldCheck },
          ].map(item => { const Icon = item.icon; return <article key={item.label} className="border border-[#2E4A62] bg-[#0D2638] p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-wider text-[#AFC7D6]">{item.label}</span><Icon size={15} className="text-[#48B7C7]"/></div><strong className="mt-1 block text-xl font-black tabular-nums text-[#F4FBFD]">{item.value}</strong></article> })}
        </section>
        <div className={`grid grid-cols-1 items-start gap-3.5 ${showPanel ? 'xl:grid-cols-12' : 'grid-cols-1'}`}>
          <section className={`${showPanel ? 'xl:col-span-6' : ''} min-w-0 overflow-hidden border border-[#2E4A62] bg-[#0D2638] shadow-xl`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#0B1726] p-2">
              <label className="flex h-7 min-w-[210px] flex-1 items-center gap-2 border border-[#2E4A62] bg-[#071522] px-2 text-slate-400"><Search size={12}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar TAG, instrumento, série..." className="h-full min-w-0 flex-1 bg-transparent text-[10px] text-[#F4FBFD] outline-none placeholder:text-slate-500"/></label>
              <div className="flex gap-1.5"><button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-7 items-center gap-1 border border-[#2E4A62] px-2 text-[9px] font-black text-slate-300 disabled:opacity-50"><RefreshCw size={11}/> ATUALIZAR</button><button type="button" onClick={newInstrument} className="inline-flex h-7 items-center gap-1 bg-teal-700 px-2.5 text-[9px] font-black text-white hover:bg-teal-600"><Plus size={11}/> NOVO ATIVO</button></div>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[610px] border-collapse text-left text-[10px]">
                <thead><tr className="h-8 border-b border-[#2E4A62] bg-[#0B1726] text-[8px] font-black uppercase tracking-wide text-[#48B7C7]"><th className="p-2 text-center">Código TAG</th><th className="p-2">Instrumento / equipamento</th><th className="p-2">Próxima calibração</th><th className="p-2 text-center">Status SGQ</th></tr></thead>
                <tbody className="divide-y divide-[#2E4A62]/50 text-slate-300">
                  {filtered.map(row => <tr key={row.id} onClick={() => edit(row)} className={`h-10 cursor-pointer transition-colors ${selectedId === row.id ? 'bg-[#123B50]' : 'hover:bg-[#071522]/80'}`}>
                    <td className="p-2 text-center font-black text-[#48B7C7]">{row.codigo}</td><td className="p-2"><div className="max-w-[260px] truncate font-bold text-[#F4FBFD]">{row.descricao}</div><div className="text-[8px] text-slate-400">{[row.fabricante, row.numero_serie].filter(Boolean).join(' • ') || row.equipamento || 'Série não informada'}</div></td>
                    <td className="p-2 font-mono text-slate-300">{dateLabel(row.proxima_calibracao)}</td><td className="p-2 text-center"><span className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black uppercase ${statusClass(row)}`}>{statusLabel(row)}</span></td>
                  </tr>)}
                  {!filtered.length && <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400">{loading ? 'Consultando equipamentos reais...' : 'Nenhum instrumento encontrado para este filtro.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="border-t border-[#2E4A62] px-2 py-1.5 text-[9px] text-slate-400">{filtered.length} registro(s) encontrado(s) • dados da empresa autenticada</footer>
          </section>

          {showPanel && <section className="min-w-0 overflow-hidden border border-[#2E4A62] bg-[#0D2638] shadow-xl xl:col-span-6">
            <header className="flex items-start justify-between gap-2 border-b border-[#2E4A62] bg-[#0B1726] p-2.5"><div><span className="text-[8px] font-black uppercase tracking-[.16em] text-[#48B7C7]">FICHA DE RASTREABILIDADE METROLÓGICA</span><h2 className="mt-1 text-[12px] font-black uppercase text-[#F4FBFD]">{selectedId ? 'Manutenção do ativo de medição' : 'Entrada e homologação de padrão'}</h2></div><button type="button" aria-label="Fechar ficha" onClick={() => setShowPanel(false)} className="flex h-6 w-6 items-center justify-center border border-[#2E4A62] text-slate-300 hover:bg-slate-800"><X size={13}/></button></header>
            <form onSubmit={event => void save(event)} className="space-y-3 p-2.5">
              <section><h3 className="mb-2 border-b border-[#2E4A62] pb-1 text-[9px] font-black uppercase tracking-wider text-[#48B7C7]">Identificação e parâmetros dimensionais</h3><div className="grid grid-cols-1 gap-x-2.5 gap-y-2 sm:grid-cols-2">
                {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{'required' in field && field.required ? ' *' : ''}<input required={'required' in field ? Boolean(field.required) : false} type={'type' in field ? field.type : 'text'} min={'type' in field && field.type === 'number' ? '0' : undefined} step={'type' in field && field.type === 'number' ? 'any' : undefined} disabled={field.key === 'codigo' && Boolean(selectedId)} value={draft[field.key]} onChange={event => setField(field.key, event.target.value)} className={inputClass}/></label>)}
                <label className={labelClass}>Última calibração<input type="date" value={draft.ultima_calibracao} onChange={event => setField('ultima_calibracao', event.target.value)} className={inputClass}/></label>
                <label className={labelClass}>Próxima calibração<input type="date" value={draft.proxima_calibracao} onChange={event => setField('proxima_calibracao', event.target.value)} className={inputClass}/></label>
                <label className={labelClass}>Validade do certificado<input type="date" value={draft.certificado_validade} onChange={event => setField('certificado_validade', event.target.value)} className={inputClass}/></label>
                <label className={labelClass}>Situação do instrumento<select value={draft.status} onChange={event => setField('status', event.target.value)} className={inputClass}><option value="BLOQUEADO">BLOQUEADO</option><option value="ATIVO">ATIVO</option><option value="APROVADO">APROVADO</option><option value="INATIVO">INATIVO</option></select></label>
                <label className={labelClass}>Criticidade<select value={draft.criticidade} onChange={event => setField('criticidade', event.target.value)} className={inputClass}><option value="NORMAL">NORMAL</option><option value="ALTA">ALTA</option><option value="CRÍTICA">CRÍTICA</option></select></label>
                <label className={labelClass + ' sm:col-span-2'}>Observações<textarea rows={2} value={draft.observacoes} onChange={event => setField('observacoes', event.target.value)} className="min-h-[52px] w-full rounded-none border border-[#2E4A62] bg-[#0E1E2F] p-2 text-[10px] text-[#F4FBFD] outline-none focus:border-[#48B7C7]"/></label>
              </div></section>
              <section className="border border-[#2E4A62] bg-[#0B1726] p-2"><div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-wider text-slate-400"><Clock3 size={12} className="text-[#48B7C7]"/> Prévia calculada do plano de calibração</div><div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div><span className="text-[8px] text-slate-400">PRÓXIMA DATA CALCULADA</span><strong className="block text-sm font-black text-[#48B7C7]">{nextDatePreview === '—' ? '—' : dateLabel(nextDatePreview)}</strong></div><span className="max-w-[240px] text-[8px] text-slate-400">O cálculo usa a última calibração + intervalo em dias. A data manual informada tem prioridade na gravação.</span></div></section>
              <div className="flex flex-wrap justify-end gap-1.5 border-t border-[#2E4A62] pt-2"><button type="button" onClick={() => { setShowPanel(false); setSelectedId(null) }} className="h-7 border border-[#2E4A62] px-3 text-[9px] font-black text-slate-300">CANCELAR</button>{selectedId && <button type="button" onClick={() => void blockSelected()} disabled={busy} className="h-7 border border-red-900 px-3 text-[9px] font-black text-red-300 disabled:opacity-50">BLOQUEAR</button>}<button type="submit" disabled={busy} className="inline-flex h-7 items-center gap-1 bg-teal-700 px-3 text-[9px] font-black text-white disabled:opacity-50"><Save size={11}/>{busy ? 'GRAVANDO…' : 'GRAVAR ATIVO'}</button></div>
            </form>
          </section>}
        </div>
      </main>
    </VendasLayout>
  )
}
