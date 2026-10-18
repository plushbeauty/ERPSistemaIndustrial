import { useEffect, useMemo, useState } from 'react'
import { Paperclip, Plus, Trash2, Search, Percent, DollarSign, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Produto = { id: string; codigo: string; nome: string; preco_venda: number | null }
type Maquina = { id: string; codigo: string; nome: string; valor_hora_custo: number }
type Operacao = { id: string; sequencial_operacao: number; descricao_operacao: string; posto_trabalho_id: string; tempo_minutos: number; maquina?: Maquina }
type Custo = { custo_tecnico: number; operacoes: number }

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(value) ? value : 0,
  )

const fieldLabelClass = 'flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500'
const fieldClass =
  'h-8 w-full min-w-0 rounded border border-slate-300 bg-white px-2.5 text-xs outline-none transition-colors placeholder:text-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-100'

export default function VendasAnaliseCustos() {
  const [empresaId, setEmpresaId] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [itemBusca, setItemBusca] = useState('')
  const [produto, setProduto] = useState<Produto | null>(null)
  const [custo, setCusto] = useState<Custo>({ custo_tecnico: 0, operacoes: 0 })
  const [impostos, setImpostos] = useState('0')
  const [comissao, setComissao] = useState('0')
  const [margem, setMargem] = useState('20')
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [posto, setPosto] = useState('')
  const [tempo, setTempo] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const empresa = await supabase.rpc('erp_current_empresa_id')
    if (empresa.error || !empresa.data) {
      throw empresa.error ?? new Error('Empresa não identificada.')
    }

    const id = String(empresa.data)
    setEmpresaId(id)

    const [productsResult, machinesResult] = await Promise.all([
      supabase
        .from('erp_produtos')
        .select('id,codigo,nome,preco_venda')
        .eq('empresa_id', id)
        .eq('ativo', true)
        .order('codigo')
        .limit(5000),
      supabase
        .from('erp_maquinas')
        .select('id,codigo,nome,valor_hora_custo')
        .eq('empresa_id', id)
        .eq('ativo', true)
        .order('codigo')
        .limit(1000),
    ])

    if (productsResult.error) throw productsResult.error
    if (machinesResult.error) throw machinesResult.error

    setProdutos((productsResult.data ?? []) as Produto[])
    setMaquinas((machinesResult.data ?? []) as Maquina[])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar análise.')
    })
  }, [])

  const loadOps = async (productId: string) => {
    const result = await supabase.rpc('erp_listar_operacoes_orcamento', {
      p_produto_id: productId,
    })
    if (result.error) {
      setError(result.error.message)
      return
    }

    setOperacoes((result.data ?? []) as Operacao[])
    await recalc(productId)
  }

  const resolve = async () => {
    const raw = itemBusca.trim().toLowerCase()
    const selectedProduct = produtos.find(
      (item) => item.codigo.toLowerCase() === raw || item.nome.toLowerCase() === raw,
    )

    if (!selectedProduct) {
      setProduto(null)
      setOperacoes([])
      setError('Código de projeto/item não localizado no cadastro.')
      return
    }

    setProduto(selectedProduct)
    setError('')
    setMessage('')
    await loadOps(selectedProduct.id)
  }

  const recalc = async (productId = produto?.id) => {
    if (!productId) return

    const result = await supabase.rpc('erp_calcular_custo_tecnico', {
      p_produto_id: productId,
    })
    if (result.error) {
      setError(result.error.message)
      return
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data
    setCusto({
      custo_tecnico: Number(row?.custo_tecnico ?? 0),
      operacoes: Number(row?.operacoes ?? 0),
    })
  }

  const addOperation = async () => {
    if (!produto || !posto || Number(tempo) <= 0) {
      setError('Informe o item, posto de trabalho e tempo.')
      return
    }

    setError('')
    setMessage('')
    const result = await supabase.rpc('erp_adicionar_operacao_orcamento', {
      p_produto_id: produto.id,
      p_posto_trabalho_id: posto,
      p_tempo_minutos: Number(tempo),
    })

    if (result.error) {
      setError(result.error.message)
      return
    }

    setTempo('')
    await loadOps(produto.id)
    setMessage('Operação adicionada e custo recalculado.')
  }

  const removeOperation = async (operationId: string) => {
    setError('')
    setMessage('')
    const result = await supabase.rpc('erp_remover_operacao_orcamento', {
      p_operacao_id: operationId,
    })

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (produto) await loadOps(produto.id)
    setMessage('Operação removida e custo recalculado.')
  }

  const preco = useMemo(() => {
    const base = Number(custo.custo_tecnico) || 0
    const burden =
      Math.max(0, Number(impostos) || 0) +
      Math.max(0, Number(comissao) || 0) +
      Math.max(0, Number(margem) || 0)

    return burden >= 100 ? 0 : base / (1 - burden / 100)
  }, [custo, impostos, comissao, margem])

  const upload = (input: HTMLInputElement | null) => {
    const file = input?.files?.[0]
    if (!file || !produto) return
    if (!empresaId) {
      setError('Empresa não identificada.')
      return
    }

    void (async () => {
      setError('')
      setMessage('')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${empresaId}/${produto.id}/${crypto.randomUUID()}-${safeName}`
      const result = await supabase.storage
        .from('engenharia-projetos')
        .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' })

      if (result.error) {
        setError(result.error.message)
        return
      }

      setMessage('Desenho técnico armazenado no Storage.')
      input.value = ''
    })()
  }

  return (
    <VendasLayout
      title="Análise de Orçamentos"
      subtitle="Engenharia ↔ Comercial"
      onRefresh={() =>
        void load().catch((loadError: unknown) =>
          setError(loadError instanceof Error ? loadError.message : 'Falha ao atualizar análise.'),
        )
      }
    >
      <div className="space-y-3 p-1 text-[11px]">
        {(error || message) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`flex items-center justify-between gap-3 rounded-sm border p-2.5 font-medium shadow-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <span className="min-w-0 break-words">{error || message}</span>
            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => {
                setError('')
                setMessage('')
              }}
              className="shrink-0 px-1 text-base leading-none hover:opacity-70"
            >
              ×
            </button>
          </div>
        )}

        <section className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
              Busca de item e simulação rápida
            </span>
            {produto && (
              <span className="rounded-sm border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-800">
                {produto.codigo}
              </span>
            )}
          </header>

          <div className="space-y-3 p-3">
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
              <label className="grid min-w-0 gap-1 md:col-span-5">
                <span className={fieldLabelClass}>
                  <Search size={12} aria-hidden="true" /> Cód. projeto / item *
                </span>
                <input
                  value={itemBusca}
                  onChange={(event) => setItemBusca(event.target.value)}
                  onBlur={() => void resolve()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void resolve()
                  }}
                  placeholder="Digite o código ou nome do item e pressione Enter"
                  className={fieldClass}
                />
              </label>

              <label className="grid min-w-0 gap-1 md:col-span-2">
                <span className={fieldLabelClass}>
                  <Percent size={12} aria-hidden="true" /> Margem alvo (%)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={margem}
                  onChange={(event) => setMargem(event.target.value)}
                  className={fieldClass}
                />
              </label>

              <div className="grid min-w-0 gap-1 md:col-span-2">
                <span className={fieldLabelClass}>Custo técnico</span>
                <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-sm border border-slate-300 bg-slate-50 px-2.5 text-slate-700">
                  <span className="text-[9px] font-medium text-slate-400">BRL</span>
                  <strong className="truncate text-xs font-bold">{brl(custo.custo_tecnico)}</strong>
                </div>
              </div>

              <div className="grid min-w-0 gap-1 md:col-span-3">
                <span className={fieldLabelClass}>
                  <DollarSign size={12} aria-hidden="true" /> Preço sugerido final
                </span>
                <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-sm border border-sky-200 bg-sky-50 px-2.5 text-sky-950">
                  <span className="shrink-0 text-[9px] font-bold text-sky-700">BRL</span>
                  <strong className="truncate text-xs font-black">{brl(preco)}</strong>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-2 rounded-sm border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
              <FileText size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <span className="mr-1 font-medium text-slate-500">Item selecionado:</span>
                <strong className="break-words text-slate-800">
                  {produto
                    ? `${produto.codigo} • ${produto.nome}`
                    : 'Aguardando identificação do item.'}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="min-w-0 rounded-sm border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 bg-slate-50 px-3 py-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                Formação do preço comercial
              </h2>
            </header>
            <div className="space-y-3 p-3">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                <label className="grid min-w-0 gap-1 md:col-span-4">
                  <span className={fieldLabelClass}>Impostos (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={impostos}
                    onChange={(event) => setImpostos(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid min-w-0 gap-1 md:col-span-4">
                  <span className={fieldLabelClass}>Comissão (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={comissao}
                    onChange={(event) => setComissao(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid min-w-0 gap-1 md:col-span-4">
                  <span className={fieldLabelClass}>Margem de lucro (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={margem}
                    onChange={(event) => setMargem(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="grid min-w-0 gap-1">
                  <span className={fieldLabelClass}>Mão de obra / material</span>
                  <div className="flex h-8 min-w-0 items-center rounded-sm border border-slate-300 bg-slate-50 px-2.5 font-semibold text-slate-800">
                    <span className="truncate">{brl(custo.custo_tecnico)}</span>
                  </div>
                </div>
                <div className="grid min-w-0 gap-1">
                  <span className={fieldLabelClass}>Total de operações</span>
                  <div className="flex h-8 min-w-0 items-center rounded-sm border border-slate-300 bg-slate-50 px-2.5 font-semibold text-slate-800">
                    {custo.operacoes} un.
                  </div>
                </div>
                <div className="grid min-w-0 gap-1">
                  <span className={fieldLabelClass}>Preço alvo</span>
                  <div className="flex h-8 min-w-0 items-center rounded-sm border border-sky-200 bg-sky-50 px-2.5 font-bold text-sky-900">
                    <span className="truncate">{brl(preco)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                Ficha de processo e roteiro de engenharia
              </h2>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                <Paperclip size={13} aria-hidden="true" />
                Anexar desenho técnico
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  disabled={!produto}
                  onChange={(event) => upload(event.currentTarget)}
                />
              </label>
            </header>

            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[540px] border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#DEE2E6] text-left text-slate-700">
                    <th scope="col" className="p-2 font-bold">Seq.</th>
                    <th scope="col" className="p-2 font-bold">Posto de trabalho / máquina</th>
                    <th scope="col" className="p-2 text-right font-bold">Tempo (min)</th>
                    <th scope="col" className="p-2 text-right font-bold">Custo total</th>
                    <th scope="col" className="w-8 p-2"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {operacoes.map((operation, index) => (
                    <tr key={operation.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap p-2 tabular-nums">
                        {operation.sequencial_operacao || (index + 1) * 10}
                      </td>
                      <td className="max-w-[260px] p-2">
                        <span className="block break-words">
                          {operation.maquina?.codigo ?? ''} •{' '}
                          {operation.maquina?.nome ?? operation.descricao_operacao}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2 text-right tabular-nums">
                        {Number(operation.tempo_minutos).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap p-2 text-right tabular-nums">
                        {brl(
                          (Number(operation.tempo_minutos) / 60) *
                            Number(operation.maquina?.valor_hora_custo ?? 0),
                        )}
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          aria-label={`Remover operação ${operation.sequencial_operacao || (index + 1) * 10}`}
                          onClick={() => void removeOperation(operation.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr className="border-t border-slate-200 bg-slate-50 align-top">
                    <td className="p-2 font-bold text-slate-500">+</td>
                    <td className="p-2">
                      <label className="grid min-w-0 gap-1">
                        <span className={fieldLabelClass}>Posto de trabalho</span>
                        <select
                          value={posto}
                          onChange={(event) => setPosto(event.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Selecione o posto</option>
                          {maquinas.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.codigo} • {machine.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="p-2">
                      <label className="grid min-w-0 gap-1">
                        <span className={fieldLabelClass}>Tempo (min)</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={tempo}
                          onChange={(event) => setTempo(event.target.value)}
                          className={fieldClass}
                          aria-label="Tempo da operação em minutos"
                        />
                      </label>
                    </td>
                    <td className="p-2" />
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        aria-label="Adicionar operação"
                        onClick={() => void addOperation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-sky-700 bg-[#2D8DB8] text-white hover:bg-sky-800"
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </VendasLayout>
  )
}
