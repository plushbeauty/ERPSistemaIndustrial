import { useCallback, useEffect, useState } from 'react'
import { Printer, Save, Search, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Tool = {
  id: string
  codigo: string
  nome: string
  numero_cavidades: number | null
  vida_ciclos: number | null
  ciclos_realizados: number
  parametros: Record<string, unknown> | null
}
type Machine = { id: string; codigo: string; nome: string }
type SetupStatus = 'APROVADO' | 'RETIDO'

const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#B9E1ED]'
const label = 'grid gap-[2px] text-[9px] font-semibold uppercase tracking-wide text-slate-600'

export default function PCPAprovacaoSetup() {
  const [tools, setTools] = useState<Tool[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [companyId, setCompanyId] = useState('')
  const [toolCode, setToolCode] = useState('')
  const [machineCode, setMachineCode] = useState('')
  const [checks, setChecks] = useState([false, false, false])
  const [status, setStatus] = useState<SetupStatus>('APROVADO')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [toolRows, machineRows] = await Promise.all([
        fetchAllPages<Tool>((from, to) => supabase.from('erp_ferramentas_industriais')
          .select('id,codigo,nome,numero_cavidades,vida_ciclos,ciclos_realizados,parametros', { count: 'exact' })
          .eq('empresa_id', empresaId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas')
          .select('id,codigo,nome', { count: 'exact' })
          .eq('empresa_id', empresaId).eq('ativo', true).order('codigo').range(from, to)),
      ])
      setCompanyId(empresaId)
      setTools(toolRows)
      setMachines(machineRows)
    } catch (cause) {
      setTools([])
      setMachines([])
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar máquinas e ferramentais da empresa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selectedTool = tools.find(item => item.codigo === toolCode)
  const selectedMachine = machines.find(item => item.codigo === machineCode)

  const save = async (requestedStatus: SetupStatus = status) => {
    if (!companyId || !selectedTool || !selectedMachine) {
      setError('Selecione um ferramental e uma máquina válidos da empresa atual.')
      return
    }
    if (checks.some(checked => !checked)) {
      setError('Confirme todos os itens do checklist antes de registrar o laudo.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada não encontrada.')
      const parameters = selectedTool.parametros ?? {}
      const updatedParameters = {
        ...parameters,
        setup_aprovacao: {
          status: requestedStatus,
          maquina_id: selectedMachine.id,
          maquina_codigo: selectedMachine.codigo,
          inspecionado_em: new Date().toISOString(),
          checklist: {
            alinhamento: checks[0],
            pressao_hidraulica: checks[1],
            temperatura: checks[2],
          },
        },
      }
      const result = await supabase.from('erp_ferramentas_industriais')
        .update({ parametros: updatedParameters, atualizado_por: auth.data.user.id })
        .eq('id', selectedTool.id)
        .eq('empresa_id', companyId)
        .select('id')
        .maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Nenhum registro foi alterado. Confira as permissões do PCP.')
      setStatus(requestedStatus)
      setMessage(requestedStatus === 'APROVADO'
        ? 'Laudo de setup registrado no ferramental da empresa.'
        : 'Reprovação de setup registrada. Confirme também o bloqueio operacional conforme o procedimento da fábrica.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o laudo de setup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <div className="mx-auto max-w-[1400px] space-y-3 p-3 sm:p-4">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#D8E8EE] bg-white p-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#2D8DB8]">PCP / ENGENHARIA</p>
            <h1 className="text-[15px] font-semibold">Aprovação e liberação de setup</h1>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-1 border border-slate-300 px-3 text-[10px] font-semibold"><Printer size={12}/> EMITIR LAUDO</button>
            <button type="button" onClick={() => void save('RETIDO')} disabled={saving || loading} className="inline-flex h-[30px] items-center gap-1 border border-rose-300 bg-rose-50 px-3 text-[10px] font-semibold text-rose-800 disabled:opacity-50"><XCircle size={12}/> REGISTRAR REPROVAÇÃO</button>
            <button type="button" onClick={() => void save('APROVADO')} disabled={saving || loading} className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12}/> {saving ? 'SALVANDO…' : 'GRAVAR LIBERAÇÃO'}</button>
          </div>
        </header>

        {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</p>}
        {message && <p role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{message}</p>}

        <section className="border border-[#D8E8EE] bg-white p-3">
          <h2 className="mb-2 text-[11px] font-bold">1. Rastreabilidade do utensílio e equipamento</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={label}>Número do molde / ferramenta
              <div className="flex gap-1">
                <input list="setup-tools" value={toolCode} onChange={event => setToolCode(event.target.value)} className={input} placeholder="Buscar código do ferramental"/>
                <button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[list="setup-tools"]')?.focus()} aria-label="Buscar ferramental" className="grid h-[30px] w-[30px] shrink-0 place-items-center border border-slate-300"><Search size={13}/></button>
              </div>
              <datalist id="setup-tools">{tools.map(tool => <option key={tool.id} value={tool.codigo}>{tool.nome}</option>)}</datalist>
              {selectedTool && <span className="text-[9px] font-normal normal-case text-slate-500">{selectedTool.nome} · {selectedTool.numero_cavidades ?? '—'} cavidades · {Number(selectedTool.ciclos_realizados ?? 0).toLocaleString('pt-BR')} ciclos</span>}
            </label>
            <label className={label}>Máquina / prensa
              <div className="flex gap-1">
                <input list="setup-machines" value={machineCode} onChange={event => setMachineCode(event.target.value)} className={input} placeholder="Buscar código da máquina"/>
                <button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[list="setup-machines"]')?.focus()} aria-label="Buscar máquina" className="grid h-[30px] w-[30px] shrink-0 place-items-center border border-slate-300"><Search size={13}/></button>
              </div>
              <datalist id="setup-machines">{machines.map(machine => <option key={machine.id} value={machine.codigo}>{machine.nome}</option>)}</datalist>
              {selectedMachine && <span className="text-[9px] font-normal normal-case text-slate-500">{selectedMachine.nome}</span>}
            </label>
          </div>
          {loading && <p className="mt-2 text-[9px] text-slate-500">Carregando registros da empresa…</p>}
        </section>

        <section className="border border-[#D8E8EE] bg-white p-3">
          <h2 className="mb-2 text-[11px] font-bold">2. Parâmetros obrigatórios conferidos</h2>
          {[
            'Centralização física e fixação dos grampos traseiros do molde.',
            'Pressão hidráulica ajustada para fechamento nominal.',
            'Temperatura das zonas de cura estabilizadas.',
          ].map((item, index) => <label key={item} className="flex min-h-[32px] items-center gap-2 border-b border-slate-100 py-1 text-[10px]">
            <input type="checkbox" className="h-3.5 w-3.5" checked={checks[index]} onChange={event => setChecks(current => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}/>
            {item}
          </label>)}
        </section>

        <section className="border border-[#D8E8EE] bg-white p-3">
          <h2 className="mb-2 text-[11px] font-bold">Laudo técnico final</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="border border-slate-200 bg-[#F8FBFC] p-2"><p className="text-[9px] uppercase text-slate-500">Resultado atual</p><strong className={'text-[11px] ' + (status === 'APROVADO' ? 'text-emerald-700' : 'text-rose-700')}>{status}</strong></div>
            <div className="border border-slate-200 bg-[#F8FBFC] p-2"><p className="text-[9px] uppercase text-slate-500">Ferramental</p><strong className="text-[11px]">{selectedTool?.codigo ?? '—'}</strong></div>
            <div className="border border-slate-200 bg-[#F8FBFC] p-2"><p className="text-[9px] uppercase text-slate-500">Máquina</p><strong className="text-[11px]">{selectedMachine?.codigo ?? '—'}</strong></div>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-slate-500">O laudo é salvo em parâmetros de setup sem apagar outros dados técnicos. A reprovação fica registrada; o bloqueio operacional do ferramental precisa respeitar o fluxo de retenção definido pela fábrica.</p>
        </section>
      </div>
    </main>
  )
}
