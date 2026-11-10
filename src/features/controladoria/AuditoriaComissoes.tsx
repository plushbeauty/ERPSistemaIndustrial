/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-AUDITORIA-COMISSOES-METAS-20261110-01
 * @STATUS_APROVACAO: INCREMENTO ADITIVO AUTORIZADO PELO PROPRIETARIO; tela operacional e RPC existentes preservadas.
 */
import { ArrowLeft, Calculator, FileSpreadsheet, HelpCircle, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { makeXlsx } from '../../utils/makeXlsx'

type Seller = { id: string; nome: string; email?: string | null }
type Line = {
  id: string
  pedido_id: string
  item_id: string
  produto_id: string
  usuario_id: string | null
  quantidade: number
  valor_total: number
  percentual: number
  comissao_liquida: number
  pedido?: { numero: number | string; cliente_id: string | null } | null
  produto?: { codigo: string | null; nome: string | null } | null
}
type CalcResult = {
  calculo_id: string
  total_vendas: number
  total_comissao: number
  meta_atingida: boolean
  linhas: number
}
const input = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
const button = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition'
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (value: number) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
function exportXlsx(rows: string[][], name: string) {
  const blob = makeXlsx(rows, 'Auditoria')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
export default function AuditoriaComissoes() {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [seller, setSeller] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [target, setTarget] = useState('0')
  const [lines, setLines] = useState<Line[]>([])
  const [clients, setClients] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<CalcResult | null>(null)
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Selecione a empresa de trabalho para consultar as comissões.')
      const tenant = String(company.data)
      const result = await supabase.from('erp_usuarios')
        .select('id,nome,email')
        .eq('empresa_id', tenant)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome')
      if (result.error) throw result.error
      if (!active) return
      setCompanyId(tenant)
      setSellers((result.data ?? []) as Seller[])
    })().catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Falha ao carregar vendedores.')
    })
    return () => { active = false }
  }, [])

  const totalSales = summary ? Number(summary.total_vendas || 0) : 0
  const totalCommission = summary ? Number(summary.total_comissao || 0) : 0
  const goal = Number(target) || 0
  const goalStatus = !summary || goal <= 0 ? 'META NÃO INFORMADA' : totalSales >= goal ? 'META ATINGIDA' : 'NÃO ATINGIDA'
  const canExport = Boolean(summary && lines.length)

  const calculate = async () => {
    setError('')
    if (!companyId) { setError('Empresa de trabalho não identificada.'); return }
    if (!month) { setError('Informe a competência.'); return }
    if (goal < 0) { setError('A meta não pode ser negativa.'); return }
    setLoading(true)
    setLines([])
    setSummary(null)
    try {
      const result = await supabase.rpc('erp_comissao_calcular', {
        p_competencia: month + '-01',
        p_usuario_id: seller || null,
        p_meta_faturamento: goal,
      })
      if (result.error) throw result.error
      const calculated = result.data as CalcResult
      if (!calculated?.calculo_id) throw new Error('O banco não retornou o identificador do cálculo.')
      const detail = await supabase.from('erp_comissao_linhas')
        .select('id,pedido_id,item_id,produto_id,usuario_id,quantidade,valor_total,percentual,comissao_liquida,pedido:erp_pedidos_venda(numero,cliente_id),produto:erp_produtos(codigo,nome)')
        .eq('empresa_id', companyId)
        .eq('calculo_id', calculated.calculo_id)
        .order('created_at')
      if (detail.error) throw detail.error
      const rows = (detail.data ?? []) as unknown as Line[]
      const clientIds = [...new Set(rows.map(row => row.pedido?.cliente_id).filter((id): id is string => Boolean(id)))]
      let clientNames: Record<string, string> = {}
      if (clientIds.length) {
        const clientResult = await supabase.from('erp_clientes')
          .select('id,nome')
          .eq('empresa_id', companyId)
          .in('id', clientIds)
        if (clientResult.error) throw clientResult.error
        clientNames = Object.fromEntries((clientResult.data ?? []).map(client => [client.id, client.nome]))
      }
      setClients(clientNames)
      setLines(rows)
      setSummary(calculated)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível calcular a auditoria.')
    } finally {
      setLoading(false)
    }
  }

  const exportAudit = () => {
    if (!summary) return
    exportXlsx([
      ['Pedido', 'Cliente', 'SKU', 'Qtd', 'Valor Total Nota', '%', 'Comissão Líquida'],
      ...lines.map(row => [
        String(row.pedido?.numero ?? ''),
        clients[row.pedido?.cliente_id ?? ''] ?? '',
        row.produto?.codigo ?? row.produto?.nome ?? '',
        String(row.quantidade),
        Number(row.valor_total).toFixed(2),
        Number(row.percentual).toFixed(2),
        Number(row.comissao_liquida).toFixed(2),
      ]),
      [],
      ['Faturamento auditado', totalSales.toFixed(2), 'Meta R$', goal.toFixed(2), 'Comissão líquida', totalCommission.toFixed(2), 'Status', goalStatus],
    ], `auditoria-comissoes-${month}.xlsx`)
  }

  const sellerName = useMemo(() => seller ? sellers.find(item => item.id === seller)?.nome ?? 'Vendedor selecionado' : 'Todos os vendedores', [seller, sellers])

  return (
    <main className="min-h-full bg-[#F4FBFD] p-3 text-slate-800">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className={button + ' w-[115px] border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Controladoria <span className="px-1 text-slate-300">›</span> Auditoria de Comissões</div>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold tracking-tight text-[#123B50]">AUDITORIA DE COMISSÕES E METAS</h1>
            <p className="mt-1 max-w-3xl text-[12px] text-slate-600">Conferência gerencial de vendas faturadas, percentuais aplicados por SKU e atingimento de metas comerciais.</p>
          </div>
          <button type="button" onClick={exportAudit} disabled={!canExport} className={button + ' border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'}>
            <FileSpreadsheet size={15} /> Exportar Auditoria
          </button>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[12px] font-bold text-[#123B50]">Filtros de auditoria e meta</h2>
            <button type="button" onClick={() => setHelpOpen(value => !value)} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-semibold text-sky-700 hover:bg-sky-50">
              <HelpCircle size={14} /> Como funciona
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[220px] flex-1">
              <label className={label}>Vendedor *</label>
              <select className={input + ' w-full'} value={seller} onChange={event => setSeller(event.target.value)}>
                <option value="">Todos</option>
                {sellers.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </div>
            <div className="w-[190px]">
              <label className={label}>Competência *</label>
              <input aria-label="Competência" type="month" className={input + ' w-full'} value={month} onChange={event => setMonth(event.target.value)} />
            </div>
            <div className="w-[160px]">
              <label className={label}>Meta R$ *</label>
              <input aria-label="Meta em reais" type="number" min="0" step="0.01" className={input + ' w-full text-right tabular-nums'} value={target} onChange={event => setTarget(event.target.value)} />
            </div>
            <button type="button" onClick={() => void calculate()} disabled={loading || !companyId} className={button + ' w-[140px] bg-[#123B50] text-white shadow-sm hover:bg-[#1b536d] disabled:opacity-50'}>
              <Calculator size={15} /> {loading ? 'Calculando…' : 'Calcular'}
            </button>
          </div>
          {error && <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</div>}
          {helpOpen && (
            <div className="mt-4 grid gap-3 rounded-lg border border-sky-100 bg-sky-50/70 p-4 text-[11px] leading-relaxed text-slate-700 md:grid-cols-2">
              <div>
                <h3 className="mb-1 font-bold text-[#123B50]">Para que serve</h3>
                <p>A Controladoria confere os itens e percentuais calculados antes de encaminhar a comissão ao fluxo de Contas a Pagar. Calcular gera uma memória de cálculo; não cria baixa bancária nem libera pagamento.</p>
                <h3 className="mb-1 mt-3 font-bold text-[#123B50]">Como usar</h3>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Escolha um vendedor ou mantenha Todos para consolidar os vínculos ativos.</li>
                  <li>Informe mês e ano da competência.</li>
                  <li>Confira ou informe a meta em reais para a comparação gerencial.</li>
                  <li>Clique em Calcular e confira pedido, cliente, SKU, quantidade, valor, percentual e comissão.</li>
                  <li>Exporte a auditoria quando houver resultado carregado.</li>
                </ol>
              </div>
              <div>
                <h3 className="mb-1 font-bold text-[#123B50]">Fontes e regras</h3>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Pedidos e itens de venda: pedido, SKU, quantidade e valor.</li>
                  <li>Vínculo ativo do vendedor ao perfil comercial.</li>
                  <li>Regras ativas por perfil e produto (SKU): percentual aplicado.</li>
                  <li>Comissão do item: valor calculado multiplicado pelo percentual, dividido por 100.</li>
                </ul>
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
                  <b>Observação técnica:</b> a RPC atualmente usa a data_entrada do pedido e exclui status de cancelado, rascunho e aberto. O cruzamento atual exige regra ativa correspondente; portanto, itens sem regra ainda não aparecem como linha de 0%. A confirmação por NF-e emitida/liquidada e a inclusão de SKUs sem regra exigem ajuste específico da rotina no banco antes de serem declaradas como cobertas.
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-[13px] font-bold text-[#123B50]">Itens auditados na competência</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">{summary ? `${sellerName} · ${month}` : 'Aguardando cálculo da competência selecionada'}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">{summary?.linhas ?? 0} registro(s)</span>
          </div>
          <div className="max-h-[430px] overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-[#123B50] text-white">
                <tr className="h-12">
                  <th scope="col" className="px-3 text-left font-semibold">Pedido</th>
                  <th scope="col" className="px-3 text-left font-semibold">Cliente</th>
                  <th scope="col" className="px-3 text-left font-semibold">SKU</th>
                  <th scope="col" className="px-3 text-right font-semibold">Qtd</th>
                  <th scope="col" className="px-3 text-right font-semibold">Valor Total Nota</th>
                  <th scope="col" className="px-3 text-right font-semibold">%</th>
                  <th scope="col" className="px-3 text-right font-semibold">Comissão Líquida</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(row => (
                  <tr key={row.id} className="h-12 border-b border-slate-100 even:bg-slate-50/70">
                    <td className="px-3 font-semibold text-slate-700">{row.pedido?.numero ?? '—'}</td>
                    <td className="px-3">{clients[row.pedido?.cliente_id ?? ''] ?? '—'}</td>
                    <td className="px-3">{row.produto?.codigo ?? row.produto?.nome ?? '—'}</td>
                    <td className="px-3 text-right tabular-nums">{fmt(row.quantidade)}</td>
                    <td className="px-3 text-right tabular-nums">{money(row.valor_total)}</td>
                    <td className="px-3 text-right tabular-nums">{Number(row.percentual).toFixed(2)}%</td>
                    <td className="px-3 text-right font-semibold tabular-nums">{money(row.comissao_liquida)}</td>
                  </tr>
                ))}
                {!lines.length && (
                  <tr>
                    <td colSpan={7} className="h-32 px-6 text-center text-[11px] text-slate-400">
                      {summary ? 'Nenhum item comissionável retornado para os filtros selecionados.' : 'Selecione os filtros e clique em Calcular para auditar as comissões da competência.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div><p className={label}>Faturamento auditado</p><p className="text-[17px] font-bold tabular-nums text-[#123B50]">{money(totalSales)}</p></div>
            <div><p className={label}>Meta R$</p><p className="text-[17px] font-bold tabular-nums text-[#123B50]">{money(goal)}</p></div>
            <div><p className={label}>Status da meta</p><span className={'inline-flex rounded-full px-3 py-1 text-[10px] font-bold ' + (goalStatus === 'META ATINGIDA' ? 'bg-emerald-100 text-emerald-800' : goalStatus === 'NÃO ATINGIDA' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}>{goalStatus}</span></div>
            <div><p className={label}>Total comissão líquida</p><p className="text-[17px] font-bold tabular-nums text-[#123B50]">{money(totalCommission)}</p></div>
          </div>
          <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-sky-600" />
            <p>Este painel é de conferência gerencial. O cálculo não altera saldos bancários, não gera pagamento e não libera automaticamente títulos no Contas a Pagar.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
