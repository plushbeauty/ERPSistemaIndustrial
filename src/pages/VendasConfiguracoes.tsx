import { useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Config = {
  id?: string
  dias_validade_orcamento: number
  desconto_maximo_percentual: number
  bloquear_pedido_sem_estoque: boolean
  exigir_pedido_cliente: boolean
}

const initial: Config = {
  dias_validade_orcamento: 15,
  desconto_maximo_percentual: 0,
  bloquear_pedido_sem_estoque: false,
  exigir_pedido_cliente: false,
}

export default function VendasConfiguracoes() {
  const [empresa, setEmpresa] = useState('')
  const [config, setConfig] = useState<Config>(initial)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa ERP não identificada.')
      }

      const empresaId = String(company.data)
      setEmpresa(empresaId)

      const result = await supabase
        .from('erp_vendas_configuracoes')
        .select('id,dias_validade_orcamento,desconto_maximo_percentual,bloquear_pedido_sem_estoque,exigir_pedido_cliente')
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (result.error) throw result.error

      setConfig(result.data ? {
        id: String(result.data.id),
        dias_validade_orcamento: Number(result.data.dias_validade_orcamento),
        desconto_maximo_percentual: Number(result.data.desconto_maximo_percentual),
        bloquear_pedido_sem_estoque: Boolean(result.data.bloquear_pedido_sem_estoque),
        exigir_pedido_cliente: Boolean(result.data.exigir_pedido_cliente),
      } : initial)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar configurações de Vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    if (!empresa) return
    if (config.dias_validade_orcamento < 1) {
      setError('A validade do orçamento deve ser de pelo menos 1 dia.')
      return
    }
    if (config.desconto_maximo_percentual < 0 || config.desconto_maximo_percentual > 100) {
      setError('O desconto máximo deve estar entre 0% e 100%.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase
        .from('erp_vendas_configuracoes')
        .upsert({
          empresa_id: empresa,
          dias_validade_orcamento: Math.trunc(config.dias_validade_orcamento),
          desconto_maximo_percentual: config.desconto_maximo_percentual,
          bloquear_pedido_sem_estoque: config.bloquear_pedido_sem_estoque,
          exigir_pedido_cliente: config.exigir_pedido_cliente,
        }, { onConflict: 'empresa_id' })
        .select('id,dias_validade_orcamento,desconto_maximo_percentual,bloquear_pedido_sem_estoque,exigir_pedido_cliente')
        .single()

      if (result.error) throw result.error

      setConfig({
        id: String(result.data.id),
        dias_validade_orcamento: Number(result.data.dias_validade_orcamento),
        desconto_maximo_percentual: Number(result.data.desconto_maximo_percentual),
        bloquear_pedido_sem_estoque: Boolean(result.data.bloquear_pedido_sem_estoque),
        exigir_pedido_cliente: Boolean(result.data.exigir_pedido_cliente),
      })
      setMessage('Configurações de Vendas salvas.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#17333F]">
      <header className="sticky top-0 z-20 border-b border-[#CFE1E7] bg-white">
        <div className="mx-auto flex min-h-[78px] max-w-[1400px] items-center justify-between gap-4 px-5 lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2D8DB8]">ERP INDUSTRIAL • VENDAS</p>
            <h1 className="mt-1 text-2xl font-black text-[#123B50]">Configurações Comerciais</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> ATUALIZAR
            </button>
            <button type="button" onClick={() => void save()} disabled={saving || loading} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#2D8DB8] px-5 text-sm font-black text-white disabled:opacity-50">
              <Save size={17} /> SALVAR
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] space-y-5 px-5 py-6 lg:px-8">
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{error}</div>}
        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">{message}</div>}

        <section className="rounded-lg border border-[#CFE1E7] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2D8DB8]">Políticas de Vendas</p>
          <h2 className="mt-1 text-xl font-black text-[#123B50]">Regras comerciais da empresa</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Estas configurações são persistidas em <code>erp_vendas_configuracoes</code>.</p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black">
              Validade do orçamento (dias)
              <input
                type="number"
                min={1}
                value={config.dias_validade_orcamento}
                onChange={event => setConfig(current => ({ ...current, dias_validade_orcamento: Number(event.target.value) }))}
                className="h-11 rounded-md border border-slate-300 px-3 font-semibold outline-none focus:border-[#2D8DB8]"
              />
            </label>

            <label className="grid gap-2 text-sm font-black">
              Desconto máximo permitido (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={config.desconto_maximo_percentual}
                onChange={event => setConfig(current => ({ ...current, desconto_maximo_percentual: Number(event.target.value) }))}
                className="h-11 rounded-md border border-slate-300 px-3 font-semibold outline-none focus:border-[#2D8DB8]"
              />
            </label>

            <label className="flex min-h-[64px] items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-black">
              <input
                type="checkbox"
                checked={config.bloquear_pedido_sem_estoque}
                onChange={event => setConfig(current => ({ ...current, bloquear_pedido_sem_estoque: event.target.checked }))}
                className="h-5 w-5"
              />
              Bloquear pedido sem estoque disponível
            </label>

            <label className="flex min-h-[64px] items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-black">
              <input
                type="checkbox"
                checked={config.exigir_pedido_cliente}
                onChange={event => setConfig(current => ({ ...current, exigir_pedido_cliente: event.target.checked }))}
                className="h-5 w-5"
              />
              Exigir referência do pedido do cliente
            </label>
          </div>
        </section>
      </section>
    </main>
  )
}
