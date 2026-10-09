import { useEffect, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Func = { id: string; nome: string; matricula: string | null }

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function VendasMetas() {
  const [empresa, setEmpresa] = useState('')
  const [func, setFunc] = useState<Func[]>([])
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [valor, setValor] = useState('0')
  const [pedidos, setPedidos] = useState('0')
  const [realizado, setRealizado] = useState(0)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setMsg(company.error?.message || 'Empresa não identificada.')
      return
    }

    const empresaId = String(company.data)
    setEmpresa(empresaId)
    const nextMonth = new Date(mes + '-01T00:00:00')
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const [employees, target, orders] = await Promise.all([
      supabase
        .from('erp_funcionarios')
        .select('id,nome,matricula')
        .eq('empresa_id', empresaId)
        .eq('status', 'ATIVO')
        .order('nome'),
      supabase
        .from('erp_vendas_metas')
        .select('id,competencia,meta_faturamento,meta_pedidos')
        .eq('empresa_id', empresaId)
        .eq('competencia', mes + '-01')
        .maybeSingle(),
      supabase
        .from('erp_pedidos_venda')
        .select('total,status')
        .eq('empresa_id', empresaId)
        .gte('data_entrega_prometida', mes + '-01')
        .lt('data_entrega_prometida', nextMonth.toISOString().slice(0, 10)),
    ])

    if (employees.error || target.error || orders.error) {
      setMsg(employees.error?.message || target.error?.message || orders.error?.message || 'Falha ao carregar metas.')
      return
    }

    setFunc((employees.data ?? []) as Func[])
    setValor(String(Number(target.data?.meta_faturamento ?? 0)))
    setPedidos(String(Number(target.data?.meta_pedidos ?? 0)))
    setRealizado(
      (orders.data ?? [])
        .filter(order => !String(order.status ?? '').toLowerCase().includes('cancel'))
        .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
    )
  }

  useEffect(() => {
    void load()
  }, [mes])

  const save = async () => {
    if (!empresa) {
      setMsg('Empresa não identificada. Atualize a tela e tente novamente.')
      return
    }
    const result = await supabase
      .from('erp_vendas_metas')
      .upsert(
        {
          empresa_id: empresa,
          competencia: mes + '-01',
          meta_faturamento: Number(valor) || 0,
          meta_pedidos: Number(pedidos) || 0,
        },
        { onConflict: 'empresa_id,competencia' },
      )
    setMsg(result.error ? result.error.message : 'Meta gravada com sucesso.')
    if (!result.error) void load()
  }

  const pct = Math.min((realizado / (Number(valor) || 1)) * 100, 999)

  return (
    <VendasLayout
      title="Metas comerciais"
      subtitle="Metas, atingimento e desempenho da equipe"
      onRefresh={() => void load()}
    >
      <main className="sales-workspace sales-detail">
        <section className="sales-orders-card">
          <div className="sales-list-toolbar">
            <div style={{ flex: 1 }}>
              <span className="sales-eyebrow">COMERCIAL / METAS</span>
              <h1 style={{ margin: '6px 0 3px', fontSize: 22, fontWeight: 650, color: '#17333f' }}>
                Controle de metas da equipe comercial
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: '#71838a' }}>
                Defina competência, faturamento e quantidade de pedidos.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#526a73' }}>
                Competência
                <input
                  type="month"
                  value={mes}
                  onChange={event => setMes(event.target.value)}
                  style={{ height: 30, border: '1px solid #d3e0e3', borderRadius: 2, padding: '0 7px', fontSize: 11 }}
                />
              </label>
              <button
                type="button"
                className="sales-button sales-button--secondary"
                onClick={() => {
                  setValor('0')
                  setPedidos('0')
                  setMsg('Nova meta pronta para preenchimento.')
                }}
              >
                <Plus size={13} /> Nova meta
              </button>
              <button type="button" className="sales-button sales-button--primary" onClick={() => void save()}>
                <Save size={13} /> Gravar
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8, padding: '0 14px 14px' }}>
            <label style={{ display: 'grid', gap: 2, fontSize: 9, fontWeight: 600, color: '#526a73' }}>
              Meta de faturamento
              <input type="number" min="0" step="0.01" value={valor} onChange={event => setValor(event.target.value)} style={{ height: 30, border: '1px solid #d3e0e3', borderRadius: 2, padding: '0 8px', fontSize: 11 }} />
            </label>
            <label style={{ display: 'grid', gap: 2, fontSize: 9, fontWeight: 600, color: '#526a73' }}>
              Meta de pedidos
              <input type="number" min="0" step="1" value={pedidos} onChange={event => setPedidos(event.target.value)} style={{ height: 30, border: '1px solid #d3e0e3', borderRadius: 2, padding: '0 8px', fontSize: 11 }} />
            </label>
            <div style={{ border: '1px solid #dfe8ea', background: '#f7f9fa', padding: '7px 10px' }}>
              <span style={{ fontSize: 10, color: '#71838a' }}>Realizado no período</span>
              <strong style={{ display: 'block', marginTop: 3, fontSize: 18, color: '#123b50' }}>{brl(realizado)}</strong>
            </div>
          </div>

          {msg && (
            <div role="status" style={{ margin: '0 14px 12px', padding: '8px 10px', border: '1px solid #cce1e6', background: '#f1f8fa', color: '#315c69', fontSize: 10 }}>
              {msg}
            </div>
          )}

          <div className="sales-table-scroll">
            <table className="sales-orders-table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Meta de faturamento</th>
                  <th>Realizado</th>
                  <th>Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {func.map(employee => (
                  <tr key={employee.id}>
                    <td className="sales-client-name">{employee.nome}</td>
                    <td>{brl(Number(valor) || 0)}</td>
                    <td>{brl(realizado)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, flex: 1, background: '#e5edef' }}>
                          <div style={{ height: '100%', width: String(Math.min(pct, 100)) + '%', background: '#2D8DB8' }} />
                        </div>
                        <strong style={{ fontSize: 10 }}>{pct.toFixed(0)}%</strong>
                      </div>
                    </td>
                  </tr>
                ))}
                {!func.length && (
                  <tr>
                    <td colSpan={4} className="sales-empty-state">Nenhum vendedor ativo cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </VendasLayout>
  )
}
