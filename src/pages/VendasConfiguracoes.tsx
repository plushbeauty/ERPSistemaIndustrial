/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO_APROVACAO: CONFIGURACOES-COMERCIAIS-UI-ALINHADA
 * @ESCOPO: parâmetros comerciais, validações e persistência por empresa.
 * @REGRA: manter Supabase real, isolamento por empresa e contrato da tabela existente.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Save, Settings2, ShieldAlert, Sliders } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

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
    setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa ERP não identificada.')
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
        dias_validade_orcamento: Number(result.data.dias_validade_orcamento ?? initial.dias_validade_orcamento),
        desconto_maximo_percentual: Number(result.data.desconto_maximo_percentual ?? initial.desconto_maximo_percentual),
        bloquear_pedido_sem_estoque: Boolean(result.data.bloquear_pedido_sem_estoque),
        exigir_pedido_cliente: Boolean(result.data.exigir_pedido_cliente),
      } : initial)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar configurações de Vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!empresa || saving || loading) return
    if (!Number.isFinite(config.dias_validade_orcamento) || config.dias_validade_orcamento < 1) {
      setError('A validade do orçamento deve ser de pelo menos 1 dia.')
      return
    }
    if (!Number.isFinite(config.desconto_maximo_percentual) || config.desconto_maximo_percentual < 0 || config.desconto_maximo_percentual > 100) {
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
      setMessage('Diretrizes e configurações comerciais salvas com sucesso.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100'
  const policyClass = 'flex cursor-pointer items-start gap-2.5 rounded-[2px] border border-slate-200 bg-white p-3 transition-colors hover:border-[#2D8DB8] hover:bg-sky-50/40'

  return (
    <VendasLayout title="Configurações Comerciais" subtitle="Gerenciamento de alçadas, prazos e regras de validação" onRefresh={() => void load()}>
      <main className="sales-workspace sales-detail space-y-3 p-1 text-[11px]">
        {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />{message}</div>}

        <section className="flex flex-col gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Settings2 size={15} className="shrink-0 text-[#2D8DB8]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Parâmetros comerciais persistidos</p>
              <code className="text-[9px] text-[#2D8DB8]">erp_vendas_configuracoes</code>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[9px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={12} /> Atualizar</button>
            <button type="button" onClick={() => void save()} disabled={loading || saving || !empresa} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[9px] font-bold uppercase text-white hover:bg-[#1f6281] disabled:opacity-50"><Save size={12} /> {saving ? 'Salvando…' : 'Salvar regras'}</button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white">
            <header className="flex h-9 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
              <Sliders size={14} className="text-[#2D8DB8]" />
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-[#123B50]">Alçadas comerciais e prazos</h2>
            </header>
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <label className="block min-w-0 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1">Validade do orçamento (dias)<HelpCircle size={10} title="Prazo padrão de validade dos orçamentos." /></span>
                <input type="number" min={1} step={1} value={config.dias_validade_orcamento} disabled={loading || saving} onChange={(event) => setConfig((current) => ({ ...current, dias_validade_orcamento: Number(event.target.value) }))} className={fieldClass} />
              </label>
              <label className="block min-w-0 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1">Desconto máximo (%)<HelpCircle size={10} title="Limite percentual de desconto configurado para a empresa." /></span>
                <input type="number" min={0} max={100} step="0.01" value={config.desconto_maximo_percentual} disabled={loading || saving} onChange={(event) => setConfig((current) => ({ ...current, desconto_maximo_percentual: Number(event.target.value) }))} className={fieldClass} />
              </label>
            </div>
            <p className="mx-3 mb-3 border border-slate-100 bg-slate-50 p-2 text-[9px] leading-relaxed text-slate-500">Estes valores são gravados na configuração comercial da empresa. As rotas de pedido devem aplicar as regras correspondentes para que tenham efeito operacional.</p>
          </section>

          <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white">
            <header className="flex h-9 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
              <ShieldAlert size={14} className="text-[#2D8DB8]" />
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-[#123B50]">Políticas de segurança e validação</h2>
            </header>
            <div className="space-y-2 p-3">
              <label className={policyClass}>
                <input type="checkbox" checked={config.bloquear_pedido_sem_estoque} disabled={loading || saving} onChange={(event) => setConfig((current) => ({ ...current, bloquear_pedido_sem_estoque: event.target.checked }))} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#2D8DB8]" />
                <span><strong className="block text-[10px] text-[#123B50]">Bloquear pedido sem estoque</strong><span className="mt-1 block text-[9px] leading-relaxed text-slate-500">Define a política comercial para pedidos sem saldo disponível.</span></span>
              </label>
              <label className={policyClass}>
                <input type="checkbox" checked={config.exigir_pedido_cliente} disabled={loading || saving} onChange={(event) => setConfig((current) => ({ ...current, exigir_pedido_cliente: event.target.checked }))} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#2D8DB8]" />
                <span><strong className="block text-[10px] text-[#123B50]">Exigir pedido do cliente</strong><span className="mt-1 block text-[9px] leading-relaxed text-slate-500">Define se o número do pedido do cliente é obrigatório no processo comercial.</span></span>
              </label>
            </div>
          </section>
        </div>
        {loading && <p className="px-1 text-[9px] text-slate-500">Carregando configurações da empresa autenticada…</p>}
      </main>
    </VendasLayout>
  )
}
