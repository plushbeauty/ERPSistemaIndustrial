/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP / CAPACIDADE
 * Arquivo: src/pages/PCPCapacidade.tsx
 * Revisão: PCP-CAPACIDADE-004 | 30/10/2026
 * Layout padrão ERP industrial (shell único, sem shell de tablet aninhado) e
 * degradação graciosa quando o banco ainda não tem as colunas de capacidade.
 * Dados reais Supabase/RLS por empresa. Sem máquinas ou cargas simuladas.
 * =========================================================================
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Download, HelpCircle, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

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
const CAPACITY_MIGRATION = 'supabase/migrations/20261023120000_pcp_capacidade_schema_sync.sql'
const numberBR = (value: number, digits = 1) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const schemaMismatchPattern = /horas_capacidade_dia|dias_trabalho_semana|schema cache|column .* does not exist|could not find the/i

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message
  if (cause && typeof cause === 'object' && 'message' in cause) return String((cause as { message?: unknown }).message ?? '')
  return ''
}

function csvCell(value: string | number | null | undefined): string {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"'
}

async function queryMachinesFull(tenantId: string): Promise<Machine[]> {
  return fetchAllPages<Machine>((from, to) => supabase
    .from('erp_maquinas')
    .select('id,codigo,nome,status,horas_capacidade_dia,dias_trabalho_semana', { count: 'exact' })
    .eq('empresa_id', tenantId)
    .eq('ativo', true)
    .order('codigo')
    .range(from, to))
}

type MachineBaseline = Pick<Machine, 'id' | 'codigo' | 'nome' | 'status'>

async function queryMachinesWithoutCapacity(tenantId: string): Promise<Machine[]> {
  const rows = await fetchAllPages<MachineBaseline>((from, to) => supabase
    .from('erp_maquinas')
    .select('id,codigo,nome,status', { count: 'exact' })
    .eq('empresa_id', tenantId)
    .eq('ativo', true)
    .order('codigo')
    .range(from, to))
  return rows.map(row => ({ ...row, horas_capacidade_dia: null, dias_trabalho_semana: null }))
}

const cardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const inputClass = 'h-[38px] w-full min-w-[92px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#48B7C7]/30'
const buttonClass = 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function PCPCapacidade() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [capacityUnavailable, setCapacityUnavailable] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    setNotice('')
    setCapacityUnavailable(false)
    // Evita exibir capacidade da empresa/sessão anterior durante a revalidação.
    setEmpresaId('')
    setMachines([])
    setOps([])

    try {
      const { data: empresaData, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (typeof empresaData !== 'string' || !empresaData) {
        throw new Error('Empresa da sessão não identificada. Entre novamente ou selecione uma empresa no contexto Master.')
      }
      const tenantId = empresaData
      let machineRows: Machine[]
      try {
        machineRows = await queryMachinesFull(tenantId)
      } catch (capacityCause) {
        if (!schemaMismatchPattern.test(errorMessage(capacityCause))) throw capacityCause
        // Migração de capacidade ainda não aplicada: mantém máquinas e OPs reais
        // visíveis e sinaliza a pendência em vez de derrubar a tela inteira.
        machineRows = await queryMachinesWithoutCapacity(tenantId)
        setCapacityUnavailable(true)
      }
      const opRows = await fetchAllPages<Op>((from, to) => supabase
        .from('erp_ordens_producao')
        .select('maquina_id,status,tempo_estimado_horas', { count: 'exact' })
        .eq('empresa_id', tenantId)
        .range(from, to))
      setEmpresaId(tenantId)
      setMachines(machineRows)
      setOps(opRows)
    } catch (cause) {
      const detail = errorMessage(cause)
      setMachines([])
      setOps([])
      setError(schemaMismatchPattern.test(detail)
        ? `O banco não reconheceu os campos de capacidade das máquinas. Aplique a migração ${CAPACITY_MIGRATION} no projeto Supabase e atualize a tela. Detalhe: ${detail || 'erro de esquema'}`
        : detail || 'Não foi possível consultar a capacidade do PCP.')
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
    if (capacityUnavailable) {
      setError(`Cadastre as colunas de capacidade antes de gravar. Aplique a migração ${CAPACITY_MIGRATION}.`)
      return
    }
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
      setError(errorMessage(cause) || 'Não foi possível salvar a capacidade.')
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
  const comparableLoad = capacityRows.reduce((sum, row) => sum + row.cargaHoras, 0)
  const globalOccupancy = totalCapacity > 0 ? Math.round(comparableLoad / totalCapacity * 100) : null
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

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
      <div className="mx-auto w-full max-w-[1560px] space-y-4">
        <header className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div className="flex min-w-[280px] items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#123B50] text-white shadow-sm">
              <BarChart3 size={24} />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#2D8DB8]">ERP Industrial · PCP / Capacidade</p>
              <h1 className="text-2xl font-black leading-tight text-[#123B50]">Carga de Máquina e Capacidade</h1>
              <p className="mt-1 text-sm text-slate-600">Capacidade semanal cadastrada por equipamento e carga calculada a partir das horas estimadas das OPs abertas da empresa autenticada.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${buttonClass} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`} onClick={() => setShowHelp(value => !value)}>
              <HelpCircle size={18} /> AJUDA DA PÁGINA
            </button>
            <button type="button" className={`${buttonClass} border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#1f7ba1]`} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={18} /> {loading ? 'ATUALIZANDO' : 'ATUALIZAR DADOS'}
            </button>
            <button type="button" className={`${buttonClass} border-[#3A9D78] bg-[#3A9D78] text-white hover:bg-[#2f8565]`} onClick={exportAudit} disabled={filteredRows.length === 0}>
              <Download size={18} /> EXPORTAR AUDITORIA
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#D65B61] bg-[#FDEEEF] p-4 text-sm font-semibold text-[#8f2f35]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {capacityUnavailable && !error && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[#E6A34A] bg-[#FDF6E9] p-4 text-sm font-semibold text-[#8a5b12]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>O banco ainda não tem as colunas <code className="font-mono">horas_capacidade_dia</code> e <code className="font-mono">dias_trabalho_semana</code> de <code className="font-mono">erp_maquinas</code>. Aplique a migração <code className="font-mono">{CAPACITY_MIGRATION}</code> no editor SQL do Supabase e atualize a tela. A carga das OPs e as máquinas abaixo são reais; apenas a capacidade cadastrada fica indisponível.</span>
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-[#3A9D78] bg-[#EAF6F0] p-4 text-sm font-semibold text-[#1f6647]">{notice}</p>
        )}

        {showHelp && (
          <section className={`${cardClass} p-4`}>
            <h2 className="mb-3 text-base font-black text-[#123B50]">Central de ajuda — capacidade e carga</h2>
            <div className="grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
              <p><strong>Capacidade semanal:</strong> horas produtivas por dia × dias planejados por semana. Preencha os campos de cada máquina e salve depois de conferir o calendário e os turnos reais da fábrica.</p>
              <p><strong>Carga das OPs:</strong> soma de <code className="font-mono">tempo_estimado_horas</code> das ordens vinculadas à máquina, excluindo concluídas, finalizadas e canceladas. A consulta é limitada à empresa da sessão.</p>
              <p><strong>Barras:</strong> azul abaixo de 85%, âmbar de 85% a 100% e vermelho acima de 100%. A carga considera horas estimadas registradas nas OPs, não uma previsão por turno/calendário detalhado.</p>
              <p><strong>OEE:</strong> ocupação não é OEE. OEE exige registros reais de disponibilidade, desempenho e qualidade, portanto não é calculado nesta tela.</p>
              <p className="md:col-span-2"><strong>Dados incompletos:</strong> quando faltam horas/dias cadastrados ou horas estimadas nas OPs, o sistema não inventa capacidade nem carga.</p>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm" style={{ borderTopColor: '#2D8DB8' }}>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Carga alocada</p>
            <p className="mt-2 font-mono text-3xl font-black leading-none text-[#123B50]">{numberBR(totalLoad)} <span className="text-lg">h</span></p>
            <p className="mt-2 text-sm text-slate-500">Horas estimadas de OPs abertas</p>
          </article>
          <article className="rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm" style={{ borderTopColor: '#48B7C7' }}>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Capacidade cadastrada</p>
            <p className="mt-2 font-mono text-3xl font-black leading-none text-[#123B50]">{numberBR(totalCapacity)} <span className="text-lg">h</span></p>
            <p className="mt-2 text-sm text-slate-500">{pendingCapacity} máquina(s) sem capacidade completa</p>
          </article>
          <article className="rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm" style={{ borderTopColor: '#E6A34A' }}>
            <p className="text-xs font-black uppercase tracking-wider text-[#8a5b12]">Gargalos a partir de 85%</p>
            <p className="mt-2 font-mono text-3xl font-black leading-none text-[#B8791F]">{bottlenecks}</p>
            <p className="mt-2 text-sm text-slate-500">Máquinas próximas ou acima do limite</p>
          </article>
          <article className="rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm" style={{ borderTopColor: '#D65B61' }}>
            <p className="text-xs font-black uppercase tracking-wider text-[#8f2f35]">Ocupação global</p>
            <p className="mt-2 font-mono text-3xl font-black leading-none text-[#D65B61]">{globalOccupancy === null ? '—' : `${globalOccupancy}%`}</p>
            <p className="mt-2 text-sm text-slate-500">{overloads} máquina(s) acima de 100%</p>
          </article>
        </section>

        <section className={`${cardClass} p-4`}>
          <h2 className="text-base font-black text-[#123B50]">Carga e capacidade por máquina</h2>
          <div className="mt-3 mb-3 flex flex-wrap items-end justify-between gap-3">
            <label className="flex w-full min-w-[260px] max-w-[420px] flex-col gap-1 text-xs font-black uppercase tracking-wider text-slate-600">
              Buscar máquina
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Código, nome ou status" className={inputClass} />
            </label>
            <p className="text-sm font-semibold text-slate-600">{filteredRows.length} de {rows.length} máquinas ativas</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#DCECF2] text-left text-xs font-black uppercase tracking-wider text-[#123B50]">
                  <th className="border-b border-slate-200 px-3 py-3">Máquina</th>
                  <th className="border-b border-slate-200 px-3 py-3">Status</th>
                  <th className="border-b border-slate-200 px-3 py-3">Horas/dia</th>
                  <th className="border-b border-slate-200 px-3 py-3">Dias/semana</th>
                  <th className="border-b border-slate-200 px-3 py-3">Capacidade semanal</th>
                  <th className="border-b border-slate-200 px-3 py-3">Carga / livre</th>
                  <th className="border-b border-slate-200 px-3 py-3">Ocupação</th>
                  <th className="border-b border-slate-200 px-3 py-3">OPs abertas</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Gravar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center font-semibold text-slate-500" colSpan={9}>Consultando dados reais…</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center font-semibold text-slate-500" colSpan={9}>{error ? 'Dados indisponíveis até corrigir a consulta.' : 'Nenhuma máquina ativa cadastrada para esta empresa.'}</td></tr>
                ) : filteredRows.map(row => {
                  const over = (row.ocupacao ?? 0) > 100
                  const bottleneck = (row.ocupacao ?? 0) >= 85
                  const barColor = over ? '#D65B61' : bottleneck ? '#E6A34A' : '#2D8DB8'
                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-middle last:border-b-0 hover:bg-[#F4FBFD]">
                      <td className="px-3 py-3">
                        <div className="font-black text-[#123B50]">{row.codigo}</div>
                        <div className="text-xs text-slate-500">{row.nome}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex min-h-[26px] items-center rounded-lg bg-[#EAF2F6] px-2 text-xs font-black text-[#123B50]">{row.status ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        {capacityUnavailable
                          ? <span className="text-sm font-bold text-[#8a5b12]">—</span>
                          : <input aria-label={`Horas por dia ${row.codigo}`} type="number" min="0.01" max="24" step="0.25" value={row.horas_capacidade_dia ?? ''} onChange={event => changeMachine(row.id, 'horas_capacidade_dia', event.target.value)} className={inputClass} />}
                      </td>
                      <td className="px-3 py-3">
                        {capacityUnavailable
                          ? <span className="text-sm font-bold text-[#8a5b12]">—</span>
                          : <input aria-label={`Dias por semana ${row.codigo}`} type="number" min="1" max="7" step="1" value={row.dias_trabalho_semana ?? ''} onChange={event => changeMachine(row.id, 'dias_trabalho_semana', event.target.value)} className={inputClass} />}
                      </td>
                      <td className="px-3 py-3">
                        {row.capacidadeSemanal === null
                          ? <span className="text-sm font-bold text-[#B8791F]">{capacityUnavailable ? 'Migração pendente' : 'Preencher campos'}</span>
                          : <strong className="font-mono text-[#123B50]">{numberBR(row.capacidadeSemanal)} h</strong>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[#123B50]">{numberBR(row.cargaHoras)} h carga</div>
                        <div className={`text-xs ${row.livreHoras !== null && row.livreHoras < 0 ? 'font-black text-[#D65B61]' : 'text-slate-500'}`}>{row.livreHoras === null ? 'Livre: —' : `Livre: ${numberBR(row.livreHoras)} h`}</div>
                      </td>
                      <td className="min-w-[190px] px-3 py-3">
                        {row.ocupacao === null ? (
                          <span className="text-xs font-bold text-[#B8791F]">Sem capacidade</span>
                        ) : (
                          <>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <strong className={`font-mono ${over ? 'text-[#D65B61]' : bottleneck ? 'text-[#B8791F]' : 'text-slate-800'}`}>{row.ocupacao}%</strong>
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{over ? 'SOBRECARGA' : bottleneck ? 'GARGALO' : 'ESTÁVEL'}</span>
                            </div>
                            <div className="h-[10px] overflow-hidden rounded-lg bg-slate-100" role="progressbar" aria-label={`Ocupação ${row.codigo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, row.ocupacao)}>
                              <div className="h-full rounded-lg transition-all" style={{ width: `${Math.min(100, Math.max(0, row.ocupacao))}%`, backgroundColor: barColor }} />
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono font-black text-[#123B50]">{row.opsAtivas}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={savingId === row.id || capacityUnavailable}
                          title={capacityUnavailable ? `Aplique a migração ${CAPACITY_MIGRATION} para habilitar o cadastro de capacidade` : 'Salvar capacidade'}
                          onClick={() => void saveCapacity(row)}
                          className={`inline-flex h-[34px] w-[92px] items-center justify-center gap-1 rounded-lg border border-[#123B50] bg-[#123B50] text-xs font-black text-white hover:bg-[#1d526b] disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <Save size={14} /> {savingId === row.id ? 'Salvando' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && pendingCapacity > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#E6A34A] bg-[#FDF6E9] p-3 text-sm text-[#8a5b12]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {pendingCapacity} máquina(s) ainda precisam ter horas/dia e dias/semana conferidos e salvos. Nenhum percentual será presumido para esses equipamentos.
            </p>
          )}
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <BarChart3 size={14} /> Barras baseadas nas horas estimadas cadastradas nas OPs; não representam medição de OEE.
          </p>
        </section>

        <footer className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-slate-500`}>
          <span>SYSNQRA ERP &amp; SGQ INDUSTRIAL · PCP / Capacidade</span>
          <span>Dados reais • RLS por empresa • Sem dados fictícios</span>
        </footer>
      </div>
    </main>
  )
}
