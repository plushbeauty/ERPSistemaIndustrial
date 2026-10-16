/**
 * ERPSis — Auditoria de UI
 * Data: 2026-10-16
 * Revisão: R1
 * Escopo: Componente visual compacto para formulário de Pedido de Compra.
 * Nota: Componente controlado por props; não cria dados fictícios nem acessa o banco diretamente.
 * Referência visual solicitada: grid industrial compacto inspirado no padrão informado pelo usuário.
 */
import type { FormEvent } from 'react'
import { Save } from 'lucide-react'
import { cardLayout, fieldClass, labelClass, sectionTitle } from '../industrial/forms/industrialFormStyles'

export type PedidoCompraFornecedorOption = {
  id: string
  label: string
}

export type PedidoCompraProdutoOption = {
  id: string
  label: string
}

export type PedidoCompraFormValues = {
  fornecedorId: string
  dataEmissao: string
  condicaoPagamento: string
  formaRecebimento: string
  transportadoraFrete: string
  produtoId: string
  quantidade: string
  precoUnitario: string
  descontoPercentual: string
  observacoesRecebimento: string
}

type PedidoCompraFormProps = {
  fornecedores: PedidoCompraFornecedorOption[]
  produtos: PedidoCompraProdutoOption[]
  numeroPedido: string
  values: PedidoCompraFormValues
  saving?: boolean
  disabled?: boolean
  onChange: (field: keyof PedidoCompraFormValues, value: string) => void
  onSubmit: () => void
}

export default function PedidoCompraForm({
  fornecedores,
  produtos,
  numeroPedido,
  values,
  saving = false,
  disabled = false,
  onChange,
  onSubmit,
}: PedidoCompraFormProps) {
  const quantidade = Math.max(0, Number(values.quantidade) || 0)
  const precoUnitario = Math.max(0, Number(values.precoUnitario) || 0)
  const descontoPercentual = Math.min(100, Math.max(0, Number(values.descontoPercentual) || 0))
  const valorBruto = quantidade * precoUnitario
  const valorTotal = valorBruto * (1 - descontoPercentual / 100)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!saving && !disabled) onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-[#f8fafc] p-4">
      <div className={cardLayout}>
        <section>
          <span className={sectionTitle}>Cabeçalho do Pedido (Módulo Compras)</span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className={labelClass}>
              Nº Pedido (Somente Leitura)
              <input className={`${fieldClass} bg-slate-50 font-mono`} readOnly value={numeroPedido} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Fornecedor Homologado
              <select className={fieldClass} value={values.fornecedorId} onChange={(event) => onChange('fornecedorId', event.target.value)} required disabled={disabled || saving}>
                <option value="">Selecione o fornecedor mestre...</option>
                {fornecedores.map((fornecedor) => <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.label}</option>)}
              </select>
            </label>
            <label className={labelClass}>
              Data de Emissão
              <input className={fieldClass} type="date" value={values.dataEmissao} onChange={(event) => onChange('dataEmissao', event.target.value)} required disabled={disabled || saving} />
            </label>
          </div>
        </section>

        <section>
          <span className={sectionTitle}>Diretrizes e Prazos Comerciais</span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className={labelClass}>
              Condição de Pagamento
              <input className={fieldClass} value={values.condicaoPagamento} onChange={(event) => onChange('condicaoPagamento', event.target.value)} placeholder="Condição negociada" disabled={disabled || saving} />
            </label>
            <label className={labelClass}>
              Forma de Recebimento
              <input className={fieldClass} value={values.formaRecebimento} onChange={(event) => onChange('formaRecebimento', event.target.value)} placeholder="Boleto, transferência..." disabled={disabled || saving} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Transportadora / Frete CIF-FOB
              <input className={fieldClass} value={values.transportadoraFrete} onChange={(event) => onChange('transportadoraFrete', event.target.value)} placeholder="TAG ou razão social da transportadora" disabled={disabled || saving} />
            </label>
          </div>
        </section>

        <section>
          <span className={sectionTitle}>Insumos / Itens da Ordem de Compra</span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className={`${labelClass} md:col-span-2`}>
              Insumo / Matéria-Prima SKU
              <select className={fieldClass} value={values.produtoId} onChange={(event) => onChange('produtoId', event.target.value)} required disabled={disabled || saving}>
                <option value="">Selecione um item cadastrado...</option>
                {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.label}</option>)}
              </select>
            </label>
            <label className={labelClass}>
              Quantidade Requisitada
              <input className={fieldClass} type="number" min="0.001" step="0.001" value={values.quantidade} onChange={(event) => onChange('quantidade', event.target.value)} required disabled={disabled || saving} />
            </label>
            <label className={labelClass}>
              Preço Unitário (R$)
              <input className={fieldClass} type="number" min="0" step="0.0001" value={values.precoUnitario} onChange={(event) => onChange('precoUnitario', event.target.value)} required disabled={disabled || saving} />
            </label>
            <label className={labelClass}>
              Alíquota Desconto (%)
              <input className={fieldClass} type="number" min="0" max="100" step="0.1" value={values.descontoPercentual} onChange={(event) => onChange('descontoPercentual', event.target.value)} disabled={disabled || saving} />
            </label>
          </div>
        </section>

        <section>
          <span className={sectionTitle}>Fechamento e Observações de Fábrica</span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className={labelClass}>
              Valor Total Líquido (R$)
              <input className={`${fieldClass} bg-slate-50 font-bold`} readOnly value={valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Observações / Instruções de Recebimento no Almoxarifado
              <input className={fieldClass} value={values.observacoesRecebimento} onChange={(event) => onChange('observacoesRecebimento', event.target.value)} placeholder="Ex.: conferir laudo de qualidade na descarga do material..." disabled={disabled || saving} />
            </label>
          </div>
          <p className="mt-2 text-right text-[11px] text-slate-500">
            Total bruto: {valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Desconto: {descontoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </p>
        </section>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <button type="submit" disabled={disabled || saving} className="inline-flex h-8 items-center gap-2 rounded-[2px] bg-[#2D8DB8] px-5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#23769b] disabled:cursor-not-allowed disabled:opacity-60">
            <Save size={14} aria-hidden="true" />
            {saving ? 'Salvando...' : 'Emitir Pedido de Compra'}
          </button>
        </div>
      </div>
    </form>
  )
}
