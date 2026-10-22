/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP / CAPACIDADE
 * Arquivo: src/pages/PCPCapacidade.tsx
 * Revisão: PCP-CAPACIDADE-002 | 22/10/2026
 * Dados reais Supabase/RLS por empresa. Sem máquinas ou cargas simuladas.
 * =========================================================================
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Download, HelpCircle, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import IndustrialPageShell, { SectionCard, Table } from '../components/industrial/IndustrialPageShell'

type Machine = {
  id: string
  codigo: string
  nome: string
  status: string | null
  horas_capacidade_dia: number | null
  dias_trabalho_semana: number | null
}
type Op = { maquina_id: string | null; status: string | null; tempo_estimado_horas: number | null }
type CapacityRow = Machine & { capacidadeSemanal: number | null; cargaHoras: number; ocupacao: number | null; livreHoras: number | null; opsAtivas: number }
const closedStatuses = new Set(['CONCLUIDA', 'CONCLUIDO', 'FINALIZADA', 'FINALIZADO', 'CANCELADA', 'CANCELADO'])
const numberBR = (value: number, digits = 1) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const inputClass = 'h-[30px] w-full min-w-[76px] rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]'

function csvCell(value: string | number | null | undefined): string {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"'
}

export default function PCPCapacidade() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data: empresaData, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (typeof empresaData !== 'string' || !empresaData) {
        throw new Error('Empresa da sessão não identificada. Entre novamente ou selecione uma empresa no contexto Master.')
      }
      const tenantId = empresaData
      const [machineRows, opRows] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase
          .from('erp_maquinas')
          .select('id,codigo,nome,status,horas_capacidade_dia,dias_trabalho_semana', { count: 'exact' })
          .eq('empresa_id', tenantId)
          .eq('ativo', true)
          .order('codigo')
          .range(from, to)),
        fetchAllPages<Op>((from, to) => supabase
          .from('erp_ordens_producao')
          .select('maquina_id,status,tempo_estimado_horas', { count: 'exact' })
          .eq('empresa_id', tenantId)
          .range(from, to)),
      ])
      setEmpresaId(tenantId)
      setMachines(machineRows)
      setOps(opRows)
    } catch (cause) {
      setMachines([])
      setOps([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a capacidade do PCP.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function changeMachine(id: string, field: 'horas_capacidade_dia' | 'dias_trabalho_semana', value: string) {
    setMachines(current => current.map(machine => machine.id !== id ? machine : {
      ...machine,
      [field]: value === '' ? null : Number(value),
    }))
  }

  async function saveCapacity(machine: Machine) {
    if (!empresaId) return
    const hours = machine.horas_capacidade_dia
    const days = machine.dias_trabalho_semana
    if (hours === null || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
      setError(`Informe horas por dia entre 0,01 e 24 para a máquina ${machine.codigo}.`)
      return
    }
    if (days === null || !Number.isInteger(days) || days < 1 || days > 7) {
      setError(`Informe dias por semana entre 1 e 7 para a máquina ${machine.codigo}.`)
      return
    }
    setSavingId(machine.id)
    setError('')
    setNotice('')
    try {
      const { data, error: updateError } = await supabase
        .from('erp_maquinas')
        .update({ horas_capacidade_dia: hours, dias_trabalho_semana: days })
        .eq('id', machine.id)
        .eq('empresa_id', empresaId)
        .select('id')
        .maybeSingle()
      if (updateError) throw updateError
      if (!data) throw new Error('Nenhuma máquina foi atualizada. Confira a empresa da sessão e as permissões RLS.')
      setNotice(`Capacidade de ${machine.codigo} salva no cadastro real.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a capacidade.')
    } finally {
      setSavingId('')
    }
  }

  const rows = useMemo<CapacityRow[]>(() => machines.map(machine => {
    const assigned = ops.filter(op => op.maquina_id === machine.id)
    const activeOps = assigned.filter(op => !closedStatuses.has(String(op.status ?? '').trim().toUpperCase().replaceAll(' ', '_')))
    const cargaHoras = activeOps.reduce((sum, op) => sum + Math.max(0, Number(op.tempo_estimado_horas || 0)), 0)
    const hours = Number(machine.horas_capacidade_dia || 0)
    const days = Number(machine.dias_trabalho_semana || 0)
    const valid = machine.horas_capacidade_dia !== null && hours > 0 && hours <= 24 &&
      machine.dias_trabalho_semana !== null && Number.isInteger(days) && days >= 1 && days <= 7
    const capacidadeSemanal = valid ? hours * days : null
    const ocupacao = capacidadeSemanal && capacidadeSemanal > 0 ? cargaHoras / capacidadeSemanal * 100 : null
    return {
      ...machine, capacidadeSemanal, cargaHoras,
      ocupacao: ocupacao === null ? null : Math.round(ocupacao),
      livreHoras: capacidadeSemanal === null ? null : capacidadeSemanal - cargaHoras,
      opsAtivas: activeOps.length,
    }
  }), [machines, ops])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(row => !term || `${row.codigo} ${row.nome} ${row.status ?? ''}`.toLowerCase().includes(term))
  }, [rows, search])
  const totalLoad = rows.reduce((sum, row) => sum + row.cargaHoras, 0)
  const capacityRows = rows.filter(row => row.capacidadeSemanal !== null)
  const totalCapacity = capacityRows.reduce((sum, row) => sum + (row.capacidadeSemanal ?? 0), 0)
  const bottlenecks = capacityRows.filter(row => (row.ocupacao ?? 0) >= 85).length
  const overloads = capacityRows.filter(row => (row.ocupacao ?? 0) > 100).length
  const globalOccupancy = totalCapacity > 0 ? Math.round(totalLoad / totalCapacity * 100) : null
  const pendingCapacity = rows.filter(row => row.capacidadeSemanal === null).length

  const exportAudit = () => {
    const lines = [
      ['Código', 'Máquina', 'Status', 'Horas/dia', 'Dias/semana', 'Capacidade semanal (h)', 'Carga OPs abertas (h)', 'Ocupação (%)', 'OPs abertas'].map(csvCell).join(';'),
      ...filteredRows.map(row => [row.codigo, row.nome, row.status, row.horas_capacidade_dia, row.dias_trabalho_semana, row.capacidadeSemanal, row.cargaHoras, row.ocupacao, row.opsAtivas].map(csvCell).join(';')),
    ]
    const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'pcp-capacidade-maquinas.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return <IndustrialPageShell
    module="PCP / Capacidade"
    title="Carga de Máquina e Capacidade"
    subtitle="Capacidade semanal cadastrada por equipamento e carga calculada a partir das horas estimadas das OPs abertas da empresa autenticada."
    actions={[
      { label: 'AJUDA DA PÁGINA', type: 'neutral', icon: <HelpCircle size={16} />, onClick: () => setShowHelp(value => !value) },
      { label: 'ATUALIZAR DADOS', type: 'primary', icon: <RefreshCw size={16} />, onClick: () => void load() },
      { label: 'EXPORTAR AUDITORIA', type: 'success', icon: <Download size={16} />, onClick: exportAudit },
    ]}
  >
    {error && <p role="alert" className="rounded-[3px] border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-[3px] border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{notice}</p>}

    {showHelp && <SectionCard title="Central de ajuda — capacidade e carga">
      <div className="space-y-2 text-xs leading-5 text-slate-700">
        <p><strong>Capacidade semanal:</strong> horas produtivas por dia × dias planejados por semana. Preencha os campos de cada máquina e salve depois de conferir o calendário e os turnos reais da fábrica.</p>
        <p><strong>Carga das OPs:</strong> soma de <code>tempo_estimado_horas</code> das ordens vinculadas à máquina, excluindo concluídas, finalizadas e canceladas. A consulta é limitada à empresa da sessão.</p>
        <p><strong>Barras:</strong> azul abaixo de 85%, âmbar de 85% a 100% e vermelho acima de 100%. A carga considera horas estimadas registradas nas OPs, não uma previsão por turno/calendário detalhado.</p>
        <p><strong>OEE:</strong> ocupação não é OEE. OEE exige registros reais de disponibilidade, desempenho e qualidade, portanto não é calculado nesta tela.</p>
        <p><strong>Dados incompletos:</strong> quando faltam horas/dias cadastrados ou horas estimadas nas OPs, o sistema não inventa capacidade nem carga.</p>
      </div>
    </SectionCard>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-[3px] border border-slate-200 border-t-[3px] border-t-[#2D8DB8] bg-white p-3 shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Carga alocada</div>
        <div className="mt-1 font-mono text-xl font-black text-[#123B50]">{numberBR(totalLoad)} h</div>
        <div className="mt-1 text-[10px] text-slate-500">Horas estimadas de OPs abertas</div>
      </article>
      <article className="rounded-[3px] border border-slate-200 border-t-[3px] border-t-[#48B7C7] bg-white p-3 shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Capacidade cadastrada</div>
        <div className="mt-1 font-mono text-xl font-black text-[#123B50]">{numberBR(totalCapacity)} h</div>
        <div className="mt-1 text-[10px] text-slate-500">{pendingCapacity} máquina(s) sem capacidade completa</div>
      </article>
      <article className="rounded-[3px] border border-slate-200 border-t-[3px] border-t-amber-500 bg-white p-3 shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">Gargalos a partir de 85%</div>
        <div className="mt-1 font-mono text-xl font-black text-amber-700">{bottlenecks}</div>
        <div className="mt-1 text-[10px] text-slate-500">Máquinas próximas ou acima do limite</div>
      </article>
      <article className="rounded-[3px] border border-slate-200 border-t-[3px] border-t-rose-500 bg-white p-3 shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-wider text-rose-700">Ocupação global</div>
        <div className="mt-1 font-mono text-xl font-black text-rose-700">{globalOccupancy === null ? '—' : `${globalOccupancy}%`}</div>
        <div className="mt-1 text-[10px] text-slate-500">{overloads} máquina(s) acima de 100%</div>
      </article>
    </section>

    <SectionCard title="Carga e capacidade por máquina">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Buscar máquina
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Código, nome ou status" className={inputClass} />
        </label>
        <div className="text-[10px] text-slate-500">{filteredRows.length} de {rows.length} máquinas ativas</div>
      </div>
      <Table>
        <thead><tr>
          <th>Máquina</th><th>Status</th><th>Horas/dia</th><th>Dias/semana</th><th>Capacidade semanal</th><th>Carga / livre</th><th>Ocupação</th><th>OPs abertas</th><th>Gravar</th>
        </tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={9}>Consultando dados reais...</td></tr> :
            filteredRows.length === 0 ? <tr><td colSpan={9}>{error ? 'Dados indisponíveis até corrigir a consulta.' : 'Nenhuma máquina ativa cadastrada para esta empresa.'}</td></tr> :
              filteredRows.map(row => {
                const over = (row.ocupacao ?? 0) > 100
                const bottleneck = (row.ocupacao ?? 0) >= 85
                const barColor = over ? 'bg-rose-500' : bottleneck ? 'bg-amber-500' : 'bg-[#2D8DB8]'
                return <tr key={row.id}>
                  <td><strong>{row.codigo}</strong><div className="text-[10px] text-slate-500">{row.nome}</div></td>
                  <td>{row.status ?? '—'}</td>
                  <td><input aria-label={`Horas por dia ${row.codigo}`} type="number" min="0.01" max="24" step="0.25" value={row.horas_capacidade_dia ?? ''} onChange={event => changeMachine(row.id, 'horas_capacidade_dia', event.target.value)} className={inputClass} /></td>
                  <td><input aria-label={`Dias por semana ${row.codigo}`} type="number" min="1" max="7" step="1" value={row.dias_trabalho_semana ?? ''} onChange={event => changeMachine(row.id, 'dias_trabalho_semana', event.target.value)} className={inputClass} /></td>
                  <td>{row.capacidadeSemanal === null ? <span className="font-bold text-amber-700">Preencher campos</span> : <strong>{numberBR(row.capacidadeSemanal)} h</strong>}</td>
                  <td><div className="font-semibold">{numberBR(row.cargaHoras)} h carga</div><div className={`text-[10px] ${row.livreHoras !== null && row.livreHoras < 0 ? 'font-bold text-rose-700' : 'text-slate-500'}`}>{row.livreHoras === null ? 'Livre: —' : `Livre: ${numberBR(row.livreHoras)} h`}</div></td>
                  <td className="min-w-[145px]">
                    {row.ocupacao === null ? <span className="text-[10px] font-semibold text-amber-700">Sem capacidade</span> : <>
                      <div className="mb-1 flex items-center justify-between gap-2"><strong className={over ? 'text-rose-700' : bottleneck ? 'text-amber-700' : 'text-slate-800'}>{row.ocupacao}%</strong><span className="text-[9px] text-slate-500">{over ? 'SOBRECARGA' : bottleneck ? 'GARGALO' : 'ESTÁVEL'}</span></div>
                      <div className="h-[9px] overflow-hidden rounded-[2px] bg-slate-100" role="progressbar" aria-label={`Ocupação ${row.codigo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, row.ocupacao)}>
                        <div className={`h-full rounded-[2px] transition-all ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, row.ocupacao))}%` }} />
                      </div>
                    </>}
                  </td>
                  <td>{row.opsAtivas}</td>
                  <td><button type="button" disabled={savingId === row.id} onClick={() => void saveCapacity(row)} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#123B50] bg-[#123B50] px-2 text-[10px] font-black text-white hover:bg-[#1d526b] disabled:opacity-50"><Save size={12} />{savingId === row.id ? 'Salvando' : 'Salvar'}</button></td>
                </tr>
              })}
        </tbody>
      </Table>
      {rows.length > 0 && pendingCapacity > 0 && <p className="mt-3 flex items-start gap-2 rounded-[3px] border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{pendingCapacity} máquina(s) ainda precisam ter horas/dia e dias/semana conferidos e salvos. Nenhum percentual será presumido para esses equipamentos.</p>}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><BarChart3 size={14} /> Barras baseadas nas horas estimadas cadastradas nas OPs; não representam medição de OEE.</div>
    </SectionCard>
  </IndustrialPageShell>
}
