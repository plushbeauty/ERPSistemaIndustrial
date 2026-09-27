import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient'

type DowntimeRow = {
  maquina_id: string | null
  inicio: string | null
  fim: string | null
  erp_maquinas: { codigo: string | null } | Array<{ codigo: string | null }> | null
}

type ReliabilityRow = {
  maquina: string
  paradas: number
  mttr: number
  mtbf: number | null
}

type MachineReliability = {
  paradas: number
  minutosParados: number
  inicios: number[]
}

export default function ManutencaoIndicadores() {
  const [rows, setRows] = useState<DowntimeRow[]>([])

  useEffect(() => {
    let active = true

    async function load() {
      const result = await supabase
        .from('erp_producao_paradas')
        .select('maquina_id,inicio,fim,erp_maquinas(codigo)')
        .order('inicio', { ascending: false })
        .limit(5000)

      if (!active || result.error) return
      setRows((result.data ?? []) as DowntimeRow[])
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const data = useMemo<ReliabilityRow[]>(() => {
    const grouped = new Map<string, MachineReliability>()

    for (const row of rows) {
      const relation = Array.isArray(row.erp_maquinas) ? row.erp_maquinas[0] : row.erp_maquinas
      const machineCode = relation?.codigo?.trim() || row.maquina_id || 'Máquina não identificada'
      const current = grouped.get(machineCode) ?? { paradas: 0, minutosParados: 0, inicios: [] }

      current.paradas += 1

      if (row.inicio) {
        const start = new Date(row.inicio).getTime()
        if (Number.isFinite(start)) current.inicios.push(start)

        if (row.fim) {
          const end = new Date(row.fim).getTime()
          const durationMinutes = (end - start) / 60000
          if (Number.isFinite(durationMinutes) && durationMinutes >= 0) {
            current.minutosParados += durationMinutes
          }
        }
      }

      grouped.set(machineCode, current)
    }

    return Array.from(grouped, ([maquina, values]) => {
      const starts = [...values.inicios].sort((a, b) => a - b)
      let intervalTotal = 0

      for (let index = 1; index < starts.length; index += 1) {
        intervalTotal += (starts[index] - starts[index - 1]) / 60000
      }

      return {
        maquina,
        paradas: values.paradas,
        mttr: values.paradas > 0 ? values.minutosParados / values.paradas : 0,
        mtbf: starts.length > 1 ? intervalTotal / (starts.length - 1) : null,
      }
    })
  }, [rows])

  const mttr = data.length > 0
    ? data.reduce((sum, row) => sum + row.mttr, 0) / data.length
    : 0

  const mtbfValues = data.filter((row): row is ReliabilityRow & { mtbf: number } => row.mtbf !== null)
  const mtbf = mtbfValues.length > 0
    ? mtbfValues.reduce((sum, row) => sum + row.mtbf, 0) / mtbfValues.length
    : null

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex items-center border-b pb-4">
          <div>
            <p className="text-sm font-black text-sky-700">MANUTENÇÃO › INDICADORES DE CONFIABILIDADE</p>
            <h1 className="text-2xl font-black">Dashboard MTTR / MTBF</h1>
          </div>
          <div className="ml-auto print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-[54px] rounded-md bg-slate-800 px-4 font-black text-white"
            >
              IMPRIMIR GRÁFICOS BI
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-md border bg-white p-5">
            <span className="font-bold">MTTR MÉDIO</span>
            <strong className="mt-2 block text-3xl">{mttr.toFixed(1)} min</strong>
          </article>
          <article className="rounded-md border bg-white p-5">
            <span className="font-bold">MTBF MÉDIO</span>
            <strong className="mt-2 block text-3xl">
              {mtbf === null ? '—' : `${mtbf.toFixed(1)} min`}
            </strong>
          </article>
        </div>

        <section className="mt-5 rounded-md border bg-white p-5">
          <h2 className="mb-4 text-xl font-black">Paradas por máquina</h2>
          <div className="h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="maquina" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paradas" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  )
}
