import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'

type OP = {
  id: string
  numero_op: string
  produto_id: string | null
  quantidade: number
  status: string
  pedido_venda_id: string | null
  data_prevista: string | null
}

type Product = {
  id: string
  codigo: string
  nome: string
}

type Program = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  produto_id: string | null
  inicio_planejado: string
  fim_planejado: string
  quantidade_planejada: number
  status: string
  molde_id?: string | null
  quantidade_produzida?: number
  quantidade_refugada?: number
}

type Machine = {
  id: string
  codigo: string
  nome: string
  status: string
}

type ProgramView = Program & {
  op?: OP
  product?: Product
}

type Props = {
  programs: ProgramView[]
  machines: Machine[]
  ops: OP[]
  onOpen: (opId?: string) => void
}

const addDays = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)

const overlaps = (program: ProgramView, day: Date) => {
  const start = new Date(program.inicio_planejado)
  const end = new Date(program.fim_planejado)
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const dayEnd = addDays(dayStart, 1)
  return start < dayEnd && end > dayStart
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')

export default function PCPMonthlyPlanner({ programs, machines, ops, onOpen }: Props) {
  const [cursor, setCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('todos')
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [machineFilter, setMachineFilter] = useState('todos')

  const days = useMemo(() => {
    if (view === 'day') return [cursor]

    if (view === 'week') {
      const weekday = cursor.getDay()
      const monday = addDays(cursor, weekday === 0 ? -6 : 1 - weekday)
      return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
    }

    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    return Array.from(
      { length: lastDay },
      (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1),
    )
  }, [cursor, view])

  const scheduledIds = useMemo(
    () => new Set(programs.map(program => program.ordem_producao_id).filter((id): id is string => Boolean(id))),
    [programs],
  )

  const active = useMemo(() => {
    const normalizedQuery = normalize(query)

    return programs.filter(program => {
      const searchable = normalize(
        [program.op?.numero_op ?? '', program.product?.codigo ?? '', program.product?.nome ?? ''].join(' '),
      )

      return (
        days.some(day => overlaps(program, day)) &&
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (status === 'todos' || program.status === status)
      )
    })
  }, [programs, days, query, status])

  const backlog = useMemo(() => {
    const normalizedQuery = normalize(query)

    return ops.filter(op => {
      const searchable = normalize(op.numero_op)
      return !scheduledIds.has(op.id) && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [ops, scheduledIds, query])

  const visibleMachines = useMemo(
    () => machines.filter(machine => machineFilter === 'todos' || machine.id === machineFilter),
    [machines, machineFilter],
  )

  const dayPrograms = (machineId: string, day: Date) =>
    active.filter(program => program.maquina_id === machineId && overlaps(program, day))

  const statusClass = (program: ProgramView) => {
    const normalizedStatus = normalize(program.status)

    if (normalizedStatus.includes('manut') || normalizedStatus.includes('parad')) {
      return 'ds-plan-segment--stop'
    }

    if (normalizedStatus.includes('setup')) {
      return 'ds-plan-segment--setup'
    }

    if (normalizedStatus.includes('atras')) {
      return 'ds-plan-segment--risk'
    }

    return 'ds-plan-segment--production'
  }

  const moveCursor = (direction: -1 | 1) => {
    const next =
      view === 'month'
        ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
        : addDays(cursor, view === 'week' ? direction * 7 : direction)

    setCursor(next)
  }

  const monthLabel =
    view === 'month'
      ? cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `Semana ${days[0]?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}–${days[6]?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
        : cursor.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })

  return (
    <section className="pcp-month-planner" aria-label="Planejamento de produção">
      <aside className="pcp-backlog-rail" aria-label="Backlog de ordens de produção">
        <div>
          <strong>BACKLOG</strong>
          <span>{backlog.length} OPs sem programação</span>
        </div>

        {backlog.slice(0, 12).map(op => (
          <button key={op.id} type="button" onClick={() => onOpen(op.id)}>
            <b>{op.numero_op}</b>
            <span>{op.status}</span>
            <small>
              {op.data_prevista
                ? `Prazo ${new Date(`${op.data_prevista}T00:00:00`).toLocaleDateString('pt-BR')}`
                : 'Sem prazo'}
            </small>
          </button>
        ))}

        {backlog.length === 0 && (
          <small className="pcp-backlog-empty">Nenhuma OP pendente de programação.</small>
        )}
      </aside>

      <div className="pcp-month-main">
        <div className="pcp-month-toolbar">
          <div>
            <span>PLANEJAMENTO CENTRAL</span>
            <strong>Planejamento mensal</strong>
            <small>Máquina × dia • programação, capacidade, setup, paradas e risco</small>
          </div>

          <div className="pcp-month-toolbar__actions">
            <button type="button" aria-label="Período anterior" onClick={() => moveCursor(-1)}>
              <ChevronLeft size={17} />
            </button>

            <div className="pcp-month-view-toggle" role="group" aria-label="Visualização">
              {(['month', 'week', 'day'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  className={view === option ? 'active' : ''}
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option === 'month' ? 'Mês' : option === 'week' ? 'Semana' : 'Dia'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pcp-month-today"
              onClick={() => {
                const today = new Date()
                setCursor(
                  view === 'month'
                    ? new Date(today.getFullYear(), today.getMonth(), 1)
                    : new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                )
              }}
            >
              Hoje
            </button>

            <button type="button" aria-label="Próximo período" onClick={() => moveCursor(1)}>
              <ChevronRight size={17} />
            </button>

            <strong>{monthLabel}</strong>
          </div>
        </div>

        <div className="pcp-month-filters">
          <span className="pcp-month-scope">
            {view === 'month' ? 'Visão mensal' : view === 'week' ? 'Visão semanal' : 'Visão diária'}
          </span>

          <label>
            <Search size={15} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="OP, produto ou peça"
              aria-label="Pesquisar OP, produto ou peça"
            />
          </label>

          <label>
            <span style={{ fontSize: 10, fontWeight: 800 }}>Máquina</span>
            <select value={machineFilter} onChange={event => setMachineFilter(event.target.value)}>
              <option value="todos">Todas</option>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.codigo}
                </option>
              ))}
            </select>
          </label>

          <label>
            <SlidersHorizontal size={14} />
            <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
              <option value="todos">Todos os status</option>
              <option value="Programada">Programada</option>
              <option value="Em produção">Em produção</option>
              <option value="Atrasada">Atrasada</option>
              <option value="Parada">Parada</option>
            </select>
          </label>

          <div className="pcp-month-legend" aria-label="Legenda">
            <span className="production">Produção</span>
            <span className="setup">Setup</span>
            <span className="idle">Livre</span>
            <span className="stop">Parada</span>
            <span className="risk">Risco</span>
          </div>
        </div>

        <div className="pcp-month-grid-wrap">
          <div
            className="pcp-month-grid"
            style={{ gridTemplateColumns: `190px repeat(${days.length}, minmax(58px, 1fr))` }}
          >
            <div className="pcp-month-corner">
              <span>RECURSO</span>
              <strong>Máquina / Injetora</strong>
            </div>

            {days.map(day => (
              <div
                className={`pcp-month-day ${day.getDay() === 0 || day.getDay() === 6 ? 'weekend' : ''}`}
                key={day.toISOString()}
              >
                <strong>{String(day.getDate()).padStart(2, '0')}</strong>
                <span>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
              </div>
            ))}

            {visibleMachines.map(machine => (
              <div key={machine.id} className="pcp-month-row" style={{ display: 'contents' }}>
                <div className="pcp-month-machine">
                  <strong>{machine.codigo}</strong>
                  <span>{machine.nome}</span>
                  <small>{machine.status}</small>
                </div>

                {days.map(day => {
                  const programsForDay = dayPrograms(machine.id, day)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={`pcp-month-cell ${programsForDay.length ? 'has-program' : ''}`}
                      onDoubleClick={() => onOpen(programsForDay[0]?.ordem_producao_id ?? undefined)}
                      onClick={() => {
                        const firstProgram = programsForDay[0]
                        if (firstProgram) onOpen(firstProgram.ordem_producao_id ?? undefined)
                      }}
                      aria-label={`${machine.codigo} ${day.toLocaleDateString('pt-BR')}: ${programsForDay.length} programação(ões)`}
                    >
                      {programsForDay.length === 0 && <span className="pcp-month-empty">—</span>}

                      {programsForDay.length === 1 && (
                        <span className={`pcp-month-segment ${statusClass(programsForDay[0])}`}>
                          <b>{programsForDay[0].op?.numero_op ?? 'OP'}</b>
                          <small>{programsForDay[0].product?.codigo ?? 'produto'}</small>
                          <em>{Number(programsForDay[0].quantidade_planejada || 0).toLocaleString('pt-BR')}</em>
                        </span>
                      )}

                      {programsForDay.length === 2 && (
                        <span className="pcp-month-dual">
                          {programsForDay.map(program => (
                            <span key={program.id} className={`pcp-month-segment ${statusClass(program)}`}>
                              <b>{program.op?.numero_op ?? 'OP'}</b>
                              <small>{program.product?.codigo ?? 'produto'}</small>
                            </span>
                          ))}
                        </span>
                      )}

                      {programsForDay.length > 2 && (
                        <>
                          <span className="pcp-month-triple">
                            {programsForDay.slice(0, 3).map(program => (
                              <span key={program.id} className={`pcp-month-segment ${statusClass(program)}`}>
                                <b>{program.op?.numero_op ?? 'OP'}</b>
                              </span>
                            ))}
                          </span>
                          <span className="pcp-month-more">+{programsForDay.length - 3}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="pcp-month-summary">
          <strong>{active.length} programações</strong>
          <span>{machines.filter(machine => active.some(program => program.maquina_id === machine.id)).length} máquinas com carga</span>
          <span>{active.reduce((sum, program) => sum + Number(program.quantidade_planejada || 0), 0).toLocaleString('pt-BR')} peças planejadas</span>
          <span>{active.filter(program => normalize(program.status).includes('atras')).length} em risco/atraso</span>
        </div>
      </div>
    </section>
  )
}
