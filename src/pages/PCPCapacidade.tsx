import { useEffect, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import IndustrialPageShell, { SectionCard, Table } from '../components/industrial/IndustrialPageShell'

type Machine = { id: string; codigo: string; nome: string; status: string | null }
type Op = { maquina_id: string | null; status: string | null }

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function PCPCapacidade() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data: empresaData, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (typeof empresaData !== 'string' || !empresaData) {
        throw new Error('Empresa da sessão não identificada. Entre novamente ou selecione uma empresa no contexto Master.')
      }
      const empresaId = empresaData
      const [machineRows, opRows] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase
          .from('erp_maquinas')
          .select('id,codigo,nome,status', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('codigo')
          .range(from, to)),
        fetchAllPages<Op>((from, to) => supabase
          .from('erp_ordens_producao')
          .select('maquina_id,status', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .range(from, to)),
      ])
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

  const rows = machines.map(machine => {
    const assigned = ops.filter(op => op.maquina_id === machine.id)
    const active = assigned.filter(op => !['CONCLUIDA', 'CONCLUIDO', 'CANCELADA', 'CANCELADO'].includes(String(op.status ?? '').toUpperCase())).length
    return { ...machine, assigned: assigned.length, active }
  })

  const exportAudit = () => {
    const lines = [
      ['Código', 'Máquina', 'Status', 'OPs vinculadas', 'OPs ativas'].map(csvCell).join(';'),
      ...rows.map(row => [row.codigo, row.nome, row.status, row.assigned, row.active].map(csvCell).join(';')),
    ]
    const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'pcp-carga-maquinas.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return <IndustrialPageShell
    module="PCP / Capacidade"
    title="Carga de Máquina e Capacidade"
    subtitle="Indicadores calculados a partir das OPs e do cadastro real de máquinas, limitados à empresa da sessão."
    actions={[
      { label: 'ATUALIZAR DADOS', type: 'primary', icon: <RefreshCw size={18} />, onClick: () => void load() },
      { label: 'EXPORTAR AUDITORIA', type: 'success', icon: <Download size={18} />, onClick: exportAudit },
    ]}
  >
    {error && <SectionCard title="Falha ao consultar dados"><p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p></SectionCard>}
    <SectionCard title="1. Capacidade cadastrada">
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        O cadastro real de máquinas não possui um campo de horas de capacidade diária/semanal. Por isso, esta tela não inventa percentuais de ocupação; a carga abaixo representa apenas as OPs vinculadas.
      </div>
    </SectionCard>
    <SectionCard title="2. Carga real por máquina">
      <Table>
        <thead><tr><th>Máquina</th><th>Status</th><th>OPs vinculadas</th><th>OPs ativas</th><th>Indicador</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5}>Consultando dados reais...</td></tr> :
            rows.length === 0 ? <tr><td colSpan={5}>{error ? 'Dados indisponíveis até corrigir a consulta.' : 'Nenhuma máquina ativa cadastrada.'}</td></tr> :
              rows.map(row => <tr key={row.id}>
                <td><strong>{row.codigo}</strong> — {row.nome}</td>
                <td>{row.status ?? '—'}</td>
                <td>{row.assigned}</td>
                <td>{row.active}</td>
                <td>{row.active === 0 ? 'Sem OP ativa' : row.active === 1 ? '1 OP ativa' : `${row.active} OPs ativas`}</td>
              </tr>)}
        </tbody>
      </Table>
    </SectionCard>
  </IndustrialPageShell>
}
