import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Save, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Tool = {
  id: string
  codigo: string
  nome: string
  ciclos_realizados: number | null
  status: string | null
  parametros: Record<string, unknown> | null
}

type Rule = 'CICLOS' | 'TEMPO'

const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#B9E1ED]'
const label = 'grid gap-[2px] text-[9px] font-semibold uppercase tracking-wide text-slate-600'

export default function ManutencaoPreventivas() {
  const [tools, setTools] = useState<Tool[]>([])
  const [companyId, setCompanyId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [rule, setRule] = useState<Rule>('CICLOS')
  const [target, setTarget] = useState('50000')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (clearMessage = true) => {
    setLoading(true)
    setError('')
    if (clearMessage) setMessage('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const rows = await fetchAllPages<Tool>((from, to) => supabase
        .from('erp_ferramentas_industriais')
        .select('id,codigo,nome,ciclos_realizados,status,parametros', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('codigo')
        .range(from, to))
      setCompanyId(empresaId)
      setTools(rows)
      setSelectedId(current => rows.some(row => row.id === current) ? current : (rows[0]?.id ?? ''))
    } catch (cause) {
      setTools([])
      setSelectedId('')
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar planos preventivos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selected = tools.find(tool => tool.id === selectedId)
  const numericTarget = Number(target)
  const remaining = useMemo(() => selected && Number.isFinite(numericTarget) && numericTarget > 0
    ? Math.max(0, numericTarget - Number(selected.ciclos_realizados ?? 0))
    : 0, [selected, numericTarget])

  const save = async () => {
    if (!selected || !companyId) {
      setError('Selecione um ferramental da empresa atual.')
      return
    }
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      setError('Informe uma meta válida maior que zero.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const parameters = selected.parametros ?? {}
      const nextParameters = { ...parameters, regra_disparo: rule, meta_ciclos: numericTarget }
      const result = await supabase.from('erp_ferramentas_industriais')
        .update({ parametros: nextParameters })
        .eq('id', selected.id)
        .eq('empresa_id', companyId)
        .select('id')
        .maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Nenhum registro foi alterado. Confira a empresa e a permissão de manutenção.')
      setMessage('Plano preventivo salvo sem apagar os demais parâmetros do ferramental.')
      await load(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o plano preventivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <div className="mx-auto max-w-[1500px] space-y-3 p-3 sm:p-4">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#D8E8EE] bg-white p-3">
          <span className="grid h-8 w-8 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]"><Wrench size={16}/></span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#2D8DB8]">MANUTENÇÃO / PREVENTIVAS</p>
            <h1 className="text-[15px] font-semibold">Planos preventivos de ferramental</h1>
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex h-[30px] items-center gap-1 border border-slate-300 bg-white px-3 text-[10px] font-semibold disabled:opacity-50"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> ATUALIZAR</button>
            <button type="button" onClick={() => void save()} disabled={!selected || loading || saving} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12}/> {saving ? 'SALVANDO…' : 'SALVAR PLANO'}</button>
          </div>
        </header>

        {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</p>}
        {message && <p role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{message}</p>}

        <section className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border border-[#D8E8EE] bg-white">
            <div className="border-b border-slate-200 px-3 py-2 text-[9px] font-bold uppercase">Ferramentais ativos da empresa</div>
            <div className="max-h-[560px] overflow-auto">
              {tools.map(tool => <button type="button" key={tool.id} onClick={() => { setSelectedId(tool.id); setMessage(''); setError('') }} className={'flex min-h-[34px] w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-[10px] ' + (selectedId === tool.id ? 'bg-[#EAF6FA] text-[#123B50] font-semibold' : 'hover:bg-[#F4FBFD]')}>
                <span>{tool.codigo} — {tool.nome}</span><span className="text-[9px] text-slate-500">{tool.status ?? '—'}</span>
              </button>)}
              {!tools.length && <p className="p-3 text-[10px] text-slate-500">{loading ? 'Carregando…' : 'Nenhum ferramental ativo encontrado para esta empresa.'}</p>}
            </div>
          </div>

          <div className="space-y-3 border border-[#D8E8EE] bg-white p-3">
            <h2 className="text-[11px] font-bold uppercase">Regras de disparo preventivo</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={label}>Ativo / molde
                <input value={selected ? selected.codigo + ' — ' + selected.nome : ''} readOnly className={input + ' bg-slate-50'}/>
              </label>
              <label className={label}>Regra
                <select value={rule} onChange={event => setRule(event.target.value as Rule)} className={input}>
                  <option value="CICLOS">Por ciclos</option>
                  <option value="TEMPO">Por tempo</option>
                </select>
              </label>
              <label className={label}>{rule === 'CICLOS' ? 'Meta de ciclos' : 'Intervalo em dias'}
                <input type="number" min="1" step="1" value={target} onChange={event => setTarget(event.target.value)} className={input}/>
              </label>
            </div>
            <p className="text-[9px] leading-4 text-slate-500">O plano é salvo no campo de parâmetros existente, preservando configurações técnicas já cadastradas. O apontamento de execução deve ser registrado no fluxo de manutenção preventiva.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <article className="border border-slate-200 bg-[#F8FBFC] p-3"><p className="text-[9px] font-semibold uppercase text-slate-500">Ciclos realizados</p><strong className="mt-1 block text-[18px] font-semibold tabular-nums">{selected?.ciclos_realizados ?? 0}</strong></article>
              <article className="border border-slate-200 bg-[#F8FBFC] p-3"><p className="text-[9px] font-semibold uppercase text-slate-500">Saldo até a meta</p><strong className="mt-1 block text-[18px] font-semibold tabular-nums">{rule === 'CICLOS' ? remaining.toLocaleString('pt-BR') : '—'}</strong></article>
              <article className="border border-slate-200 bg-[#F8FBFC] p-3"><p className="text-[9px] font-semibold uppercase text-slate-500">Status do ferramental</p><strong className="mt-1 block text-[12px] font-semibold">{selected?.status ?? '—'}</strong></article>
            </div>
            {rule === 'TEMPO' && <p className="border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">A regra por tempo é armazenada como configuração; a data de vencimento deve ser controlada pela programação preventiva até existir um cálculo de vencimento confiável para este ferramental.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
