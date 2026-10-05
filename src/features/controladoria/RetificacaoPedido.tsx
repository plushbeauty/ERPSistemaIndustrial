import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Lock, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Pedido = {
  id: string
  numero: number
  empresa_id: string
  pedido_cliente: string | null
  via_entrada: string | null
  vendedor_nome: string | null
  condicao_pagamento: string | null
  status: string
  total: number
}

type Item = {
  id: string
  descricao: string
  quantidade: number
  valor_unitario: number
  desconto: number
  total: number
}

const inputStyle = 'h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const readOnlyStyle = 'h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-2 text-xs text-gray-500'
const labelStyle = 'mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500'

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)

export default function RetificacaoPedido() {
  const { pedidoId } = useParams<{ pedidoId: string }>()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [pedidoCliente, setPedidoCliente] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [condicao, setCondicao] = useState('')
  const [motivo, setMotivo] = useState('')
  const [roleAllowed, setRoleAllowed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!pedidoId) {
        setError('Pedido não informado.')
        setLoading(false)
        return
      }

      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        navigate('/login', { replace: true })
        return
      }

      const profile = await supabase
        .from('erp_usuarios')
        .select('perfil,is_master,ativo,deleted_at')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profile.error) throw profile.error
      const perfil = String(profile.data?.perfil ?? '').trim().toUpperCase()
      const allowed = Boolean(profile.data?.is_master) || perfil === 'ADMINISTRADOR' || perfil === 'CONTROLADORIA'
      if (!allowed) {
        if (active) {
          setRoleAllowed(false)
          setLoading(false)
        }
        return
      }
      if (active) setRoleAllowed(true)

      const result = await supabase
        .from('erp_pedidos_venda')
        .select('id,numero,empresa_id,pedido_cliente,via_entrada,vendedor_nome,condicao_pagamento,status,total')
        .eq('id', pedidoId)
        .maybeSingle()

      if (result.error) throw result.error
      if (!result.data) throw new Error('Pedido não encontrado.')

      const itemResult = await supabase
        .from('erp_pedidos_venda_itens')
        .select('id,descricao,quantidade,valor_unitario,desconto,total')
        .eq('pedido_id', pedidoId)
        .order('id')

      if (itemResult.error) throw itemResult.error

      if (active) {
        const row = result.data as Pedido
        setPedido(row)
        setPedidoCliente(row.pedido_cliente ?? '')
        setVendedor(row.vendedor_nome ?? '')
        setCondicao(row.condicao_pagamento ?? '')
        setItems((itemResult.data ?? []) as Item[])
      }
    }

    void load()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Falha ao carregar a retificação.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate, pedidoId])

  const totalItens = useMemo(() => items.reduce((sum, item) => sum + Number(item.total ?? 0), 0), [items])

  const save = async () => {
    if (!pedido) return
    setSaving(true)
    setError('')
    setMessage('')

    const result = await supabase.rpc('erp_retificar_pedido_faturado', {
      p_pedido_id: pedido.id,
      p_pedido_cliente: pedidoCliente || null,
      p_vendedor_nome: vendedor || null,
      p_condicao_pagamento: condicao || null,
      p_itens: items.map(item => ({ id: item.id, descricao: item.descricao })),
      p_motivo: motivo || null,
    })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage('Retificação gravada e auditada no PostgreSQL.')
    setSaving(false)
    window.setTimeout(() => navigate('/vendas/pendentes'), 450)
  }

  const pageHeading = (
    <header className="synqra-reference-heading">
      <div className="synqra-reference-title">
        <p>ERP INDUSTRIAL • CONTROLADORIA</p>
        <h1>Retificação de Pedido</h1>
        <span className="mt-1 block text-xs text-slate-500">Ajustes informativos e analíticos</span>
      </div>
      <button
        type="button"
        onClick={() => navigate('/vendas/pendentes')}
        className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft size={14} /> Voltar
      </button>
    </header>
  )

  if (loading) {
    return <div className="synqra-reference-page">{pageHeading}<p className="synqra-reference-body text-sm text-slate-600">Carregando retificação…</p></div>
  }

  if (roleAllowed === false) {
    return (
      <div className="synqra-reference-page">
        {pageHeading}
        <div role="alert" className="synqra-reference-body border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">Acesso restrito a Administrador ou Controladoria.</div>
      </div>
    )
  }

  if (!pedido) {
    return <div className="synqra-reference-page">{pageHeading}<div role="alert" className="synqra-reference-body text-sm text-red-700">{error || 'Pedido não encontrado.'}</div></div>
  }

  return (
    <div className="synqra-reference-page min-w-0 text-xs text-gray-800">
      {pageHeading}

      <main className="synqra-reference-body space-y-3">
        {(error || message) && (
          <div role={error ? 'alert' : 'status'} className={`border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
            {error || message}
          </div>
        )}

        <section className="rounded-md border border-gray-200 bg-white p-2">
          <div className="mb-3 text-sm font-bold text-gray-700">Retificação controlada</div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[95px_140px_140px_160px_160px_minmax(180px,1fr)]">
            <div className="min-w-0">
              <label className={labelStyle}>Pedido</label>
              <input value={String(pedido.numero).padStart(6, '0')} readOnly className={readOnlyStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelStyle}>Referência Cliente</label>
              <input value={pedidoCliente} onChange={event => setPedidoCliente(event.target.value)} className={inputStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelStyle}>Documento Origem</label>
              <input value={pedido.via_entrada ?? ''} readOnly className={readOnlyStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelStyle}>Vendedor</label>
              <input value={vendedor} onChange={event => setVendedor(event.target.value)} className={inputStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelStyle}>Condição Pagamento</label>
              <input value={condicao} onChange={event => setCondicao(event.target.value)} className={inputStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelStyle}>Motivo</label>
              <input value={motivo} onChange={event => setMotivo(event.target.value)} className={inputStyle} />
            </div>
          </div>
        </section>

        <section className="mt-2 overflow-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-700 text-white">
              <tr className="h-7">
                <th className="px-2 text-left font-normal">Item</th>
                <th className="px-2 text-left font-normal">Descrição Técnica</th>
                <th className="px-2 text-right font-normal">Quantidade</th>
                <th className="px-2 text-right font-normal">Preço Unit.</th>
                <th className="px-2 text-right font-normal">Impostos</th>
                <th className="px-2 text-right font-normal">Descontos</th>
                <th className="px-2 text-right font-normal">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="h-7 border-t border-gray-200 even:bg-slate-50">
                  <td className="px-2">{index + 1}</td>
                  <td className="px-2">
                    <input
                      value={item.descricao}
                      onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, descricao: event.target.value } : row))}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-2 text-right text-gray-500">{item.quantidade}</td>
                  <td className="px-2 text-right text-gray-500">{brl(Number(item.valor_unitario))}</td>
                  <td className="px-2 text-right text-gray-500"><span className="inline-flex items-center gap-1"><Lock size={10} /> bloqueado</span></td>
                  <td className="px-2 text-right text-gray-500">{Number(item.desconto).toFixed(2)}</td>
                  <td className="px-2 text-right font-semibold text-gray-500">{brl(Number(item.total))}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Pedido sem itens.</td></tr>}
            </tbody>
          </table>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="mr-3">Status: {pedido.status}</span>
            <span>Total: {brl(Number(pedido.total))}</span>
            <span className="ml-3">Itens: {brl(totalItens)}</span>
          </div>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">
            <Save size={14} /> {saving ? 'Gravando…' : 'Gravar'}
          </button>
        </footer>
      </main>
    </div>
  )
}
