/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-RETIFICACAO-PEDIDO-ENTRADA-E-AJUDA-20261102-01 — tela ganha lista de pedidos e ajuda de uso
 * @STATUS_APROVACAO: DETERMINADO PELO PROPRIETARIO EM 2026-11-02 ("Retificacao de Pedido para que serve
 *   essa tela, nao tem nada dentro dela nem ajuda para saber o que ela faz e como usar")
 *
 * Defeito: a rota do menu (financeiro/retificacao) chega sem :pedidoId e a tela só tinha o caminho de
 * pedido já escolhido (controladoria/retificacao-pedido/:pedidoId). Aberta pelo menu, parava em
 * "Pedido não informado." — sem dizer o que a rotina faz e sem dar como escolher o pedido.
 *
 * A ajuda não é texto decorativo: cada regra escrita aqui foi lida em
 * supabase/migrations/20261031150000_hardening_comissoes_controladoria.sql (erp_retificar_pedido_faturado):
 * perfis ADMINISTRADOR/CONTROLADORIA ou MASTER estrito, bloqueio de rascunho/aberto/cotação, bloqueio da
 * condição de pagamento quando já existe contas a receber, e gravação restrita a pedido_cliente,
 * vendedor_nome, condicao_pagamento e descricao dos itens, com old/new no erp_audit_logs.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Info, Lock, Save, Search } from 'lucide-react'
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

type Candidato = Pick<Pedido, 'id' | 'numero' | 'pedido_cliente' | 'via_entrada' | 'vendedor_nome' | 'status' | 'total'>

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

/** Mesma lista de status abertos que a RPC recusa: o pedido ainda não foi faturado. */
const statusAberto = ['rascunho', 'aberto', 'cotação', 'cotacao']
const isFaturavel = (status: string) => !statusAberto.includes(String(status ?? '').trim().toLowerCase())

export default function RetificacaoPedido() {
  const { pedidoId } = useParams<{ pedidoId: string }>()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [candidates, setCandidates] = useState<Candidato[]>([])
  const [query, setQuery] = useState('')
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
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        navigate('/login', { replace: true })
        return
      }

      const profile = await supabase
        .from('erp_usuarios')
        .select('perfil,is_master,nivel_admin,empresa_id,setor_id,ativo,deleted_at')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profile.error) throw profile.error
      const perfil = String(profile.data?.perfil ?? '').trim().toUpperCase()
      const strictMaster = profile.data?.is_master === true && Number(profile.data?.nivel_admin) >= 100 && perfil === 'MASTER' && profile.data?.empresa_id === null && profile.data?.setor_id === null
      const allowed = strictMaster || perfil === 'ADMINISTRADOR' || perfil === 'CONTROLADORIA'
      if (!allowed) {
        if (active) setRoleAllowed(false)
        return
      }
      if (active) setRoleAllowed(true)

      if (!pedidoId) {
        const list = await supabase
          .from('erp_pedidos_venda')
          .select('id,numero,pedido_cliente,via_entrada,vendedor_nome,status,total')
          .order('numero', { ascending: false })
          .limit(300)
        if (list.error) throw list.error
        if (active) setCandidates((list.data ?? []) as Candidato[])
        return
      }

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
  const filteredCandidates = useMemo(() => {
    const term = query.trim().toLowerCase()
    const rows = candidates.filter(item => isFaturavel(item.status))
    if (!term) return rows.slice(0, 60)
    return rows.filter(item =>
      String(item.numero).includes(term)
      || String(item.pedido_cliente ?? '').toLowerCase().includes(term)
      || String(item.vendedor_nome ?? '').toLowerCase().includes(term)
      || String(item.via_entrada ?? '').toLowerCase().includes(term)
    ).slice(0, 60)
  }, [candidates, query])

  const save = async () => {
    if (!pedido) return
    if (!motivo.trim()) {
      setError('Descreva o motivo da retificação — ele vai para o histórico de auditoria.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')

    const result = await supabase.rpc('erp_retificar_pedido_faturado', {
      p_pedido_id: pedido.id,
      p_pedido_cliente: pedidoCliente || null,
      p_vendedor_nome: vendedor || null,
      p_condicao_pagamento: condicao || null,
      p_itens: items.map(item => ({ id: item.id, descricao: item.descricao })),
      p_motivo: motivo.trim(),
    })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage('Retificação gravada e auditada no PostgreSQL.')
    setSaving(false)
    window.setTimeout(() => navigate('/pageprincipal/controladoria/retificacao-assistente'), 450)
  }

  const pageHeading = (
    <header className="synqra-reference-heading">
      <div className="synqra-reference-title">
        <p>ERP INDUSTRIAL • CONTROLADORIA</p>
        <h1>Retificação de Pedido</h1>
        <span className="mt-1 block text-xs text-slate-500">{pedido ? `Pedido ${String(pedido.numero).padStart(6, '0')}` : 'Ajustes informativos e analíticos de pedidos já faturados'}</span>
      </div>
      <button
        type="button"
        onClick={() => navigate(pedidoId ? '/pageprincipal/controladoria/retificacao-pedido' : '/pageprincipal/controladoria/retificacao-assistente')}
        className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft size={14} /> {pedidoId ? 'Voltar aos pedidos' : 'Estorno Documental'}
      </button>
    </header>
  )

  const helpCard = (
    <section className="rounded-md border border-gray-200 bg-white p-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700"><Info size={15} className="text-blue-600" /> Para que serve esta tela</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        Corrigir dados informativos de um pedido de venda <strong>já faturado</strong>: referência do cliente,
        vendedor, condição de pagamento e a descrição técnica dos itens. Quantidade, preço, impostos e totais
        continuam bloqueados — alterar valor de um documento faturado é estorno documental, outra rotina.
        Toda gravação entra no histórico do PostgreSQL com o valor antigo, o novo e o motivo informado.
      </p>
      <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">Como usar</h3>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs leading-relaxed text-gray-600">
        <li>Localize o pedido na lista por número, referência do cliente, documento de origem ou vendedor.</li>
        <li>Toque em <strong>Retificar</strong> para abrir os dados do pedido.</li>
        <li>Altere apenas os campos liberados; os campos cinza são somente leitura.</li>
        <li>Descreva o motivo e toque em <strong>Gravar</strong>. O sistema envia a gravação pela RPC <code>erp_retificar_pedido_faturado</code>.</li>
      </ol>
      <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">O que a tela não deixa fazer</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-relaxed text-gray-600">
        <li>Pedido em rascunho, aberto ou cotação — ainda não foi faturado e não aparece na lista.</li>
        <li>Mudar a condição de pagamento de um pedido que já tem lançamento em contas a receber; use o Estorno Documental.</li>
        <li>Acesso restrito a Administrador ou Controladoria.</li>
      </ul>
    </section>
  )

  if (loading) {
    return <div className="synqra-reference-page">{pageHeading}<p className="synqra-reference-body text-sm text-slate-600">Carregando retificação…</p></div>
  }

  if (roleAllowed === false) {
    return (
      <div className="synqra-reference-page">
        {pageHeading}
        {helpCard}
        <div role="alert" className="synqra-reference-body border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">Acesso restrito a Administrador ou Controladoria.</div>
      </div>
    )
  }

  if (!pedidoId) {
    return (
      <div className="synqra-reference-page min-w-0 text-xs text-gray-800">
        {pageHeading}
        <main className="synqra-reference-body space-y-3">
          {helpCard}
          {error && <div role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">Não foi possível listar os pedidos: {error}</div>}
          <section className="rounded-md border border-gray-200 bg-white p-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-700">Pedidos já faturados</span>
              <label className="relative">
                <Search size={13} className="absolute left-2 top-2.5 text-gray-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nº do pedido, referência, vendedor…" className="h-9 w-72 max-w-full rounded-md border border-gray-200 pl-7 pr-2 text-xs outline-none focus:border-blue-500" aria-label="Buscar pedido" />
              </label>
            </div>
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="w-full border-collapse text-[10px]">
                <thead className="sticky top-0 bg-slate-700 text-white">
                  <tr className="h-7">
                    <th className="px-2 text-left font-normal">Pedido</th>
                    <th className="px-2 text-left font-normal">Referência Cliente</th>
                    <th className="px-2 text-left font-normal">Documento Origem</th>
                    <th className="px-2 text-left font-normal">Vendedor</th>
                    <th className="px-2 text-left font-normal">Status</th>
                    <th className="px-2 text-right font-normal">Total</th>
                    <th className="px-2 text-right font-normal">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map(row => (
                    <tr key={row.id} className="h-7 border-t border-gray-200 even:bg-slate-50">
                      <td className="px-2 font-semibold">{String(row.numero).padStart(6, '0')}</td>
                      <td className="px-2">{row.pedido_cliente ?? '—'}</td>
                      <td className="px-2">{row.via_entrada ?? '—'}</td>
                      <td className="px-2">{row.vendedor_nome ?? '—'}</td>
                      <td className="px-2">{row.status}</td>
                      <td className="px-2 text-right">{brl(Number(row.total))}</td>
                      <td className="px-2 text-right">
                        <button type="button" onClick={() => navigate(`/controladoria/retificacao-pedido/${row.id}`)} className="erp-edit-button border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Retificar</button>
                      </td>
                    </tr>
                  ))}
                  {!filteredCandidates.length && (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">{error ? 'Nada listado porque a consulta falhou — nenhum dado foi inventado.' : candidates.length ? 'Nenhum pedido faturado com esse texto. Limpe a busca.' : 'Nenhum pedido faturado registrado para a empresa desta sessão.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">{candidates.length} pedido(s) lido(s) do banco, limitados aos {filteredCandidates.length} exibidos. Pedidos em rascunho, aberto ou cotação não podem ser retificados.</p>
          </section>
        </main>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="synqra-reference-page">
        {pageHeading}
        {helpCard}
        <div role="alert" className="synqra-reference-body text-sm text-red-700">{error || 'Pedido não encontrado.'}</div>
      </div>
    )
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

        {helpCard}

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
              <label className={labelStyle}>Motivo * </label>
              <input value={motivo} onChange={event => setMotivo(event.target.value)} placeholder="Ex.: referência de pedido trocada no cadastro do cliente" className={inputStyle} />
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
            {!isFaturavel(pedido.status) && <span className="font-bold text-red-700">Este pedido ainda não foi faturado — a gravação será recusada pelo banco.</span>}
          </div>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">
            <Save size={14} /> {saving ? 'Gravando…' : 'Gravar'}
          </button>
        </footer>
      </main>
    </div>
  )
}
