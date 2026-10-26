import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Printer, RefreshCw, Save, Search, Warehouse } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import VendasLayout from './VendasLayout'

type Product = { id: string; codigo: string; nome: string; estoque_atual: number; unidade: string | null }
type Lot = LookupRecord
type AdjustmentReceipt = { codigo: string; produto: string; lote: string; localizacao: string; quantidade: number; unidade: string; motivo: string; saldoAnterior: number; saldoEstimado: number; data: string }

const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600'
const buttonClass = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
const primaryButtonClass = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'

export default function EstoqueAjustes() {
  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [lot, setLot] = useState('')
  const [location, setLocation] = useState('')
  const [perda, setPerda] = useState('')
  const [motivo, setMotivo] = useState('Material avariado')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastAdjustment, setLastAdjustment] = useState<AdjustmentReceipt | null>(null)

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(company.data)
      const result = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,estoque_atual,unidade')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('codigo')
      if (result.error) throw result.error
      setCompanyId(empresaId)
      setProducts((result.data ?? []) as Product[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar produtos.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selected = products.find(product => product.id === productId)
  const filtered = useMemo(() => {
    const query = productSearch.toLowerCase().trim()
    return products.filter(product =>
      !query || product.codigo.toLowerCase().includes(query) || product.nome.toLowerCase().includes(query),
    ).slice(0, 250)
  }, [products, productSearch])
  const quantity = Math.max(0, Number(perda) || 0)
  const balance = Number(selected?.estoque_atual || 0)
  const newBalance = Math.max(0, balance - quantity)

  const printReceipt = () => {
    if (!lastAdjustment) return
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
    const receipt = lastAdjustment
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) { setError('Permita a abertura de janela para imprimir o comprovante do ajuste gravado.'); return }
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante ${escape(receipt.codigo)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#142b3c;margin:0}.sheet{max-width:760px;margin:0 auto}.head{border-bottom:3px solid #123b50;padding-bottom:14px;margin-bottom:18px}.eyebrow{font-size:10px;letter-spacing:.12em;font-weight:bold;color:#337f9f}.head h1{margin:5px 0;font-size:22px}.code{font-size:15px;font-weight:bold;color:#123b50}.notice{background:#eef7f2;border:1px solid #b9dfca;padding:10px;margin:16px 0;font-weight:bold;color:#067647}.grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #cbd5dc;border-left:1px solid #cbd5dc}.cell{padding:11px;border-right:1px solid #cbd5dc;border-bottom:1px solid #cbd5dc;min-height:58px}.label{display:block;font-size:9px;color:#64748b;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}.value{font-weight:600;overflow-wrap:anywhere}.footer{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:36px}.sign{border-top:1px solid #637887;padding-top:7px;text-align:center;font-size:11px}.actions{text-align:center;margin:22px}@media print{.actions{display:none}}</style></head><body><main class="sheet"><header class="head"><div class="eyebrow">ERP INDUSTRIAL · ESTOQUE · MOVIMENTO REGISTRADO</div><h1>Comprovante de ajuste por avaria</h1><div class="code">${escape(receipt.codigo)}</div></header><div class="notice">Ajuste efetivado no razão de estoque em ${escape(receipt.data)}.</div><section class="grid"><div class="cell"><span class="label">Produto</span><span class="value">${escape(receipt.produto)}</span></div><div class="cell"><span class="label">Lote / documento</span><span class="value">${escape(receipt.lote)}</span></div><div class="cell"><span class="label">Localização</span><span class="value">${escape(receipt.localizacao)}</span></div><div class="cell"><span class="label">Motivo</span><span class="value">${escape(receipt.motivo)}</span></div><div class="cell"><span class="label">Quantidade retirada</span><span class="value">${receipt.quantidade.toLocaleString('pt-BR')} ${escape(receipt.unidade)}</span></div><div class="cell"><span class="label">Saldo antes / saldo estimado após</span><span class="value">${receipt.saldoAnterior.toLocaleString('pt-BR')} / ${receipt.saldoEstimado.toLocaleString('pt-BR')} ${escape(receipt.unidade)}</span></div></section><footer class="footer"><div class="sign">Responsável pelo lançamento</div><div class="sign">Conferência / aprovação</div></footer><div class="actions"><button onclick="window.print()">Imprimir comprovante</button></div></main></body></html>`)
    popup.document.close()
    popup.focus()
  }

  const registerAdjustment = async () => {
    if (!companyId || !selected) throw new Error('Selecione um produto real da empresa.')
    if (!lot.trim()) throw new Error('Informe o lote ou documento de rastreabilidade.')
    if (quantity <= 0) throw new Error('Informe uma perda maior que zero.')
    if (quantity > balance) throw new Error('A perda não pode superar o saldo disponível.')

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: companyId,
        p_produto_id: selected.id,
        p_tipo: 'saida',
        p_quantidade: quantity,
        p_origem: 'Avaria',
        p_documento: lot.trim(),
        p_observacao: (motivo.trim() || 'Material avariado') + (location.trim() ? ' • ' + location.trim() : ''),
        p_localizacao_origem_id: null,
        p_localizacao_destino_id: null,
      })
      if (result.error) throw result.error
      setLastAdjustment({ codigo: `AJ-${Date.now()}`, produto: `${selected.codigo} — ${selected.nome}`, lote: lot.trim(), localizacao: location.trim() || 'Não informada', quantidade: quantity, unidade: selected.unidade || 'un', motivo: motivo.trim(), saldoAnterior: balance, saldoEstimado: newBalance, data: new Date().toLocaleString('pt-BR') })
      setMessage('Ajuste de avaria registrado no razão de estoque.')
      setPerda('')
      setLot('')
      setLocation('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível efetivar o ajuste.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Ajuste de avaria" subtitle="Estoque • perdas • rastreabilidade">
      <main className="mx-auto min-h-[70vh] max-w-[1500px] bg-slate-50 p-4 text-slate-900 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Estoque • ajuste real</span>
            <h1 className="mt-1 text-lg font-bold">Ajuste de avaria</h1>
            <p className="mt-1 text-xs text-slate-300">Registro rastreável com dados reais do produto e do saldo da empresa.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} disabled={busy} className={`${buttonClass} border-slate-600 bg-slate-800 text-white hover:bg-slate-700`}>
              <RefreshCw size={14} /> Atualizar
            </button>
            <button type="button" onClick={printReceipt} disabled={!lastAdjustment} title={lastAdjustment ? 'Imprimir o último ajuste efetivado' : 'Efetive um ajuste para habilitar o comprovante'} className={`${buttonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              <Printer size={14} /> Laudo / imprimir
            </button>
          </div>
        </header>

        {(message || error) && (
          <div role={error ? 'alert' : 'status'} className={error
            ? 'mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-900'
            : 'mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900'}>
            {error ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <span>{error || message}</span>
          </div>
        )}

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Warehouse size={15} /></span>
              <div>
                <h2 className="text-xs font-bold text-slate-900">Identificação do ajuste</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Preencha os campos para registrar a perda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <label className={labelClass}>Produto</label>
                <EntityCodeLookup
                  label="Produto"
                  value={productId}
                  records={filtered.map(product => ({ id: product.id, codigo: product.codigo, nome: product.nome, estoque_atual: product.estoque_atual })) as Lot[]}
                  onChange={setProductId}
                  onSelect={record => {
                    setProductId(record.id)
                    setProductSearch(record.id ? (record.codigo || '') + ' ' + (record.nome || '') : productSearch)
                  }}
                  placeholder="Código do produto"
                  entityType="product"
                  compact
                />
              </div>
              <label className="min-w-0 space-y-1">
                <span className={labelClass}>Pesquisar produto</span>
                <span className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={productSearch} onChange={event => setProductSearch(event.target.value)} className={`${fieldClass} pl-8`} placeholder="Código ou descrição" />
                </span>
              </label>
              <label className="min-w-0 space-y-1">
                <span className={labelClass}>Lote / documento</span>
                <input value={lot} onChange={event => setLot(event.target.value)} className={fieldClass} placeholder="Informe lote ou documento" required />
              </label>
              <label className="min-w-0 space-y-1">
                <span className={labelClass}>Silo / posição</span>
                <input value={location} onChange={event => setLocation(event.target.value)} className={fieldClass} placeholder="Localização (opcional)" />
              </label>
              <label className="min-w-0 space-y-1">
                <span className={labelClass}>Quantidade perdida</span>
                <input type="number" min="0.0001" step="0.0001" value={perda} onChange={event => setPerda(event.target.value)} className={fieldClass} placeholder="0,0000" required />
              </label>
              <label className="min-w-0 space-y-1">
                <span className={labelClass}>Motivo</span>
                <select value={motivo} onChange={event => setMotivo(event.target.value)} className={fieldClass}>
                  <option>Material avariado</option>
                  <option>Quebra</option>
                  <option>Contaminação</option>
                  <option>Perda de processo</option>
                </select>
              </label>
            </div>
          </article>

          <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conferência do saldo</span>
              <h2 className="mt-1 text-xs font-bold text-slate-900">Resumo do ajuste</h2>
            </div>
            <dl className="space-y-3">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-xs text-slate-500">Produto selecionado</dt>
                <dd className="max-w-[65%] text-right text-xs font-semibold text-slate-800">{selected ? `${selected.codigo} — ${selected.nome}` : 'Nenhum produto selecionado'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-slate-500">Saldo atual</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-900">{balance.toLocaleString('pt-BR')} {selected?.unidade || ''}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-slate-500">Perda informada</dt>
                <dd className="text-sm font-bold tabular-nums text-red-700">{quantity.toLocaleString('pt-BR')} {selected?.unidade || ''}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-semibold text-slate-600">Novo saldo estimado</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900">{newBalance.toLocaleString('pt-BR')} {selected?.unidade || ''}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">A estimativa é visual. A validação definitiva do saldo deve ocorrer na operação transacional do banco.</p>
            <button type="button" disabled={busy || !selected || quantity <= 0 || quantity > balance || !lot.trim()} onClick={() => void registerAdjustment()} className={`${primaryButtonClass} mt-4 w-full`}>
              <Save size={14} /> {busy ? 'Gravando…' : 'Efetivar ajuste real'}
            </button>
          </aside>
        </section>
      </main>
    </VendasLayout>
  )
}
