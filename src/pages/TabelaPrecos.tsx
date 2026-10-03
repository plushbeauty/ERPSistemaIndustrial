import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useTableUrlState } from '../hooks/useTableUrlState'
import VendasLayout from './VendasLayout'

type ProdutoPreco = {
  id: string
  codigo: string
  nome: string
  grupo: string | null
  preco_venda: number | null
}

const control = 'h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

export default function TabelaPrecos() {
  const [ps, setPs] = useState<ProdutoPreco[]>([])
  const [grupo, setGrupo] = useState('')
  const [tipo, setTipo] = useState('')
  const [pct, setPct] = useState('5')
  const [tipoReajuste, setTipoReajuste] = useState<'vendas' | 'postos'>('vendas')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const { globalFilter, page, pageSize, setState, resetPage } = useTableUrlState({ defaultPageSize: 50 })

  const load = async () => {
    const empresa = await supabase.rpc('erp_current_empresa_id')
    if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa não identificada.')

    const result = await supabase
      .from('erp_produtos')
      .select('id,codigo,nome,grupo,preco_venda')
      .eq('empresa_id', String(empresa.data))
      .eq('ativo', true)
      .order('codigo')
      .limit(5000)

    if (result.error) throw result.error
    setPs((result.data ?? []) as ProdutoPreco[])
  }

  useEffect(() => {
    void load().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar.'))
  }, [])

  const filtered = useMemo(() => {
    const q = globalFilter.trim().toLowerCase()
    const filteredRows = q
      ? ps.filter(p => [p.codigo, p.nome, p.grupo ?? ''].some(value => value.toLowerCase().includes(q)))
      : ps
    return filteredRows
  }, [globalFilter, ps])

  const preview = useMemo(() => {
    const percentual = Number(pct)
    return new Map(
      filtered.map(p => {
        const base = Number(p.preco_venda)
        const simulated =
          Number.isFinite(base) && base > 0 && Number.isFinite(percentual)
            ? base * (1 + percentual / 100)
            : null
        return [p.id, simulated] as const
      }),
    )
  }, [filtered, pct])

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const execute = async () => {
    setError('')
    setMsg('')

    const percentual = Number(pct)
    if (!Number.isFinite(percentual) || percentual <= -100) {
      setError('Percentual inválido.')
      return
    }

    const result =
      tipoReajuste === 'vendas'
        ? await supabase.rpc('erp_reajuste_global_vendas', {
            p_percentual: percentual,
            p_grupo: grupo || null,
            p_tipo_cliente: tipo || null,
          })
        : await supabase.rpc('erp_reajuste_global_postos_trabalho', { p_percentual: percentual })

    if (result.error) {
      setError(result.error.message)
      return
    }

    setMsg(`Reajuste aplicado em ${Number(result.data ?? 0)} registro(s).`)
    await load()
    resetPage()
  }

  const changeFilter = (value: string) => setState({ globalFilter: value })
  const changeGrupo = (value: string) => {
    setGrupo(value)
    resetPage()
  }
  const changePercentual = (value: string) => {
    setPct(value)
    resetPage()
  }

  return (
    <VendasLayout
      title="Tabela de Preços / Reajuste"
      subtitle="Área administrativa"
      onRefresh={() => void load()}
    >
      <div className="erp-compact space-y-2 bg-slate-50 text-[11px]">
        <section className="rounded-md border border-gray-200 bg-white p-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} />
            <b>AJUSTE GLOBAL CONTROLADO POR PERMISSÃO</b>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="w-[160px] text-[10px] font-bold text-gray-500">
              Tipo
              <select className={`${control} mt-0.5 w-full`} value={tipoReajuste} onChange={e => setTipoReajuste(e.target.value as 'vendas' | 'postos')}>
                <option value="vendas">Preço de venda comercial</option>
                <option value="postos">Custo hora-máquina</option>
              </select>
            </label>

            <label className="w-[80px] text-[10px] font-bold text-gray-500">
              Percentual %
              <input className={`${control} mt-0.5 w-full`} type="number" step="0.01" value={pct} onChange={e => changePercentual(e.target.value)} />
            </label>

            <label className="w-[160px] text-[10px] font-bold text-gray-500">
              Grupo produto
              <input className={`${control} mt-0.5 w-full`} value={grupo} onChange={e => changeGrupo(e.target.value)} />
            </label>

            <label className="w-[160px] text-[10px] font-bold text-gray-500">
              Perfil cliente
              <input className={`${control} mt-0.5 w-full`} value={tipo} onChange={e => { setTipo(e.target.value); resetPage() }} />
            </label>

            <label className="min-w-[220px] flex-1 text-[10px] font-bold text-gray-500">
              Pesquisa
              <div className="flex gap-1">
                <input className={`${control} mt-0.5 w-full`} value={globalFilter} onChange={e => changeFilter(e.target.value)} placeholder="SKU, produto ou grupo" />
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50">
                  <Search size={12} />
                </span>
              </div>
            </label>

            <button type="button" onClick={() => void execute()} className="h-7 w-[130px] self-end whitespace-nowrap rounded-md bg-[#3A9D78] px-2 text-[11px] font-bold leading-none text-white">
              APLICAR
            </button>
          </div>

          {(error || msg) && (
            <div className={`mt-2 rounded-md border p-2 ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {error || msg}
            </div>
          )}
        </section>

        <section className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full border-collapse text-[10px] leading-none">
            <thead>
              <tr className="h-7 bg-[#DEE2E6] text-left text-[9px] uppercase">
                <th className="px-1.5">SKU</th>
                <th>Produto</th>
                <th>Grupo</th>
                <th>Preço Atual</th>
                <th>PREÇO VENDA • SIMULAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="h-7 border-t border-gray-100">
                  <td className="px-1.5">{p.codigo}</td>
                  <td>{p.nome}</td>
                  <td>{p.grupo ?? '—'}</td>
                  <td>{brl(Number(p.preco_venda ?? 0))}</td>
                  <td className="font-semibold text-[#17445A]">
                    {preview.get(p.id) != null ? brl(preview.get(p.id) as number) : '—'}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </VendasLayout>
  )
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
}
