/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-ESTOQUE-RASTREABILIDADE-20261102-01 — ordem do proprietário: módulo de rastreabilidade de lotes dentro do menu Estoque
 * @STATUS_APROVACAO: DADOS 100% REAIS (erp_estoque_lotes, _rastreabilidade, genealogia, separações, OP, pedido de venda, cliente); nenhuma ligação é inferida
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Fingerprint, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Produto = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null }
type Fornecedor = { id: string; razao_social: string | null; nome_fantasia: string | null }
type LoteRecebido = {
  id: string; produto_id: string; fornecedor_id: string | null; nf_numero: string | null
  lote_interno: string; lote_fornecedor: string | null; quantidade_recebida: number
  quantidade_disponivel: number; localizacao: string | null; status_inspecao: string
  data_entrada: string; created_at: string
}
type LoteRastreio = {
  id: string; produto_id: string; nf_numero: string | null; lote_fornecedor: string
  quantidade_inicial: number; quantidade_disponivel: number; status_qualidade: string
  data_validade: string | null; created_at: string
}
type VinculoComponente = { id: string; lote_acabado_id: string; lote_insumo_id: string; quantidade_consumida: number; created_at: string }
type Genealogia = {
  id: string; codigo_lote_pai: string; produto_pai_id: string; codigo_lote_filho: string
  produto_filho_id: string; quantidade_vinculada: number; ordem_producao_id: string | null; created_at: string
}
type Separacao = { id: string; ordem_producao_id: string; produto_id: string; lote_id: string | null; quantidade: number; status: string; created_at: string }
type Acabamento = { id: string; ordem_producao_id: string; lote_id: string | null; posto_trabalho: string; quantidade_recebida: number; quantidade_acabada: number; status: string; created_at: string }
type Ordem = { id: string; numero_op: string | null; produto_id: string | null; quantidade: number | null; status: string | null; pedido_venda_id: string | null }
type Pedido = { id: string; numero: number | string | null; cliente_id: string | null }
type Cliente = { id: string; nome: string | null }
type Retencao = { id: string; lote_id: string; status: string; motivo: string; created_at: string; liberado_em: string | null }

type Destino = {
  chave: string; origem: 'Separação' | 'Acabamento'; ordem_id: string; op: string
  status_ordem: string; posto: string; quantidade: number; situacao: string; data: string
  pedido: string; cliente: string
}

type Candidato = {
  chave: string; tipo: 'Lote interno (almoxarifado)' | 'Lote de rastreabilidade (recebimento)'
  lote: string; lote_fornecedor: string; produto_id: string; produto: string
  referencia: string; disponivel: number; data: string; status: string
}

const brData = (valor: string | null) => (valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—')
const brHora = (valor: string | null) => (valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const qtd = (valor: number | null | undefined) => Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export default function EstoqueRastreabilidadeLotes() {
  const [empresaId, setEmpresaId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [pendencias, setPendencias] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState('')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [lotes, setLotes] = useState<LoteRecebido[]>([])
  const [rastreios, setRastreios] = useState<LoteRastreio[]>([])
  const [componentes, setComponentes] = useState<VinculoComponente[]>([])
  const [genealogias, setGenealogias] = useState<Genealogia[]>([])
  const [separacoes, setSeparacoes] = useState<Separacao[]>([])
  const [acabamentos, setAcabamentos] = useState<Acabamento[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [retencoes, setRetencoes] = useState<Retencao[]>([])

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error) throw empresa.error
      if (typeof empresa.data !== 'string' || !empresa.data) throw new Error('Empresa da sessão não identificada. Entre novamente no ERP.')
      const id = empresa.data
      const falhas: string[] = []
      const pegar = async <T,>(nome: string, executando: Promise<T[]>): Promise<T[]> => {
        try {
          return await executando
        } catch (cause) {
          falhas.push(`${nome}: ${cause instanceof Error ? cause.message : 'falha na consulta'}`)
          return []
        }
      }
      const [
        p, f, l, ra, co, ge, se, ac, op, pv, cl, re,
      ] = await Promise.all([
        pegar<Produto>('erp_produtos', fetchAllPages<Produto>((de, ate) => supabase.from('erp_produtos').select('id,codigo,nome,unidade_medida', { count: 'exact' }).eq('empresa_id', id).order('codigo').range(de, ate))),
        pegar<Fornecedor>('erp_fornecedores', fetchAllPages<Fornecedor>((de, ate) => supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia', { count: 'exact' }).eq('empresa_id', id).order('razao_social').range(de, ate))),
        pegar<LoteRecebido>('erp_estoque_lotes', fetchAllPages<LoteRecebido>((de, ate) => supabase.from('erp_estoque_lotes').select('id,produto_id,fornecedor_id,nf_numero,lote_interno,lote_fornecedor,quantidade_recebida,quantidade_disponivel,localizacao,status_inspecao,data_entrada,created_at', { count: 'exact' }).eq('empresa_id', id).order('data_entrada', { ascending: false }).range(de, ate))),
        pegar<LoteRastreio>('erp_estoque_lotes_rastreabilidade', fetchAllPages<LoteRastreio>((de, ate) => supabase.from('erp_estoque_lotes_rastreabilidade').select('id,produto_id,nf_numero,lote_fornecedor,quantidade_inicial,quantidade_disponivel,status_qualidade,data_validade,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
        pegar<VinculoComponente>('erp_genealogia_lote_componentes', fetchAllPages<VinculoComponente>((de, ate) => supabase.from('erp_genealogia_lote_componentes').select('id,lote_acabado_id,lote_insumo_id,quantidade_consumida,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
        pegar<Genealogia>('erp_qualidade_genealogia_lotes', fetchAllPages<Genealogia>((de, ate) => supabase.from('erp_qualidade_genealogia_lotes').select('id,codigo_lote_pai,produto_pai_id,codigo_lote_filho,produto_filho_id,quantidade_vinculada,ordem_producao_id,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
        pegar<Separacao>('erp_estoque_separacoes', fetchAllPages<Separacao>((de, ate) => supabase.from('erp_estoque_separacoes').select('id,ordem_producao_id,produto_id,lote_id,quantidade,status,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
        pegar<Acabamento>('erp_acabamentos', fetchAllPages<Acabamento>((de, ate) => supabase.from('erp_acabamentos').select('id,ordem_producao_id,lote_id,posto_trabalho,quantidade_recebida,quantidade_acabada,status,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
        pegar<Ordem>('erp_ordens_producao', fetchAllPages<Ordem>((de, ate) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status,pedido_venda_id', { count: 'exact' }).eq('empresa_id', id).order('numero_op', { ascending: false }).range(de, ate))),
        pegar<Pedido>('erp_pedidos_venda', fetchAllPages<Pedido>((de, ate) => supabase.from('erp_pedidos_venda').select('id,numero,cliente_id', { count: 'exact' }).eq('empresa_id', id).order('id').range(de, ate))),
        pegar<Cliente>('erp_clientes', fetchAllPages<Cliente>((de, ate) => supabase.from('erp_clientes').select('id,nome', { count: 'exact' }).eq('empresa_id', id).order('nome').range(de, ate))),
        pegar<Retencao>('erp_quarentenas_lotes', fetchAllPages<Retencao>((de, ate) => supabase.from('erp_quarentenas_lotes').select('id,lote_id,status,motivo,created_at,liberado_em', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: false }).range(de, ate))),
      ])
      setProdutos(p); setFornecedores(f); setLotes(l); setRastreios(ra); setComponentes(co)
      setGenealogias(ge); setSeparacoes(se); setAcabamentos(ac); setOrdens(op); setPedidos(pv); setClientes(cl); setRetencoes(re)
      setEmpresaId(id)
      setPendencias(falhas)
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao consultar a rastreabilidade.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const mapaProduto = useMemo(() => new Map(produtos.map((x) => [x.id, x])), [produtos])
  const mapaFornecedor = useMemo(() => new Map(fornecedores.map((x) => [x.id, x])), [fornecedores])
  const mapaOrdem = useMemo(() => new Map(ordens.map((x) => [x.id, x])), [ordens])
  const mapaPedido = useMemo(() => new Map(pedidos.map((x) => [x.id, x])), [pedidos])
  const mapaCliente = useMemo(() => new Map(clientes.map((x) => [x.id, x])), [clientes])

  const rotuloProduto = useCallback((produtoId: string | null) => {
    const p = produtoId ? mapaProduto.get(produtoId) : undefined
    return p ? `${p.codigo ?? '—'} · ${p.nome ?? 'Produto'}` : 'Produto não localizado'
  }, [mapaProduto])

  const candidatos = useMemo<Candidato[]>(() => {
    const lista: Candidato[] = []
    for (const l of lotes) {
      lista.push({
        chave: `R|${l.id}`, tipo: 'Lote interno (almoxarifado)', lote: l.lote_interno, lote_fornecedor: l.lote_fornecedor ?? '—',
        produto_id: l.produto_id, produto: rotuloProduto(l.produto_id), referencia: l.nf_numero ?? '—',
        disponivel: Number(l.quantidade_disponivel), data: l.data_entrada, status: l.status_inspecao,
      })
    }
    for (const r of rastreios) {
      lista.push({
        chave: `T|${r.id}`, tipo: 'Lote de rastreabilidade (recebimento)', lote: r.lote_fornecedor, lote_fornecedor: r.lote_fornecedor,
        produto_id: r.produto_id, produto: rotuloProduto(r.produto_id), referencia: r.nf_numero ?? '—',
        disponivel: Number(r.quantidade_disponivel), data: r.created_at.slice(0, 10), status: r.status_qualidade,
      })
    }
    return lista.sort((a, b) => b.data.localeCompare(a.data))
  }, [lotes, rastreios, rotuloProduto])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return candidatos.slice(0, 60)
    return candidatos.filter((c) => [c.lote, c.lote_fornecedor, c.produto, c.referencia, c.status]
      .some((v) => String(v).toLocaleLowerCase('pt-BR').includes(termo))).slice(0, 60)
  }, [candidatos, busca])

  const detalhe = useMemo(() => {
    const c = candidatos.find((x) => x.chave === selecionado)
    if (!c) return null
    const ehLoteInterno = c.chave.startsWith('R|')
    const loteId = c.chave.slice(2)
    const lote = ehLoteInterno ? lotes.find((x) => x.id === loteId) : undefined
    const rastreio = ehLoteInterno ? undefined : rastreios.find((x) => x.id === loteId)

    const insumosIds = ehLoteInterno ? componentes.filter((x) => x.lote_acabado_id === loteId) : []
    const destinosDiretos = componentes.filter((x) => x.lote_insumo_id === loteId).map((x) => x.lote_acabado_id)
    const idsDeLoteAlvo = new Set<string>([loteId, ...destinosDiretos])

    const destinos: Destino[] = []
    for (const s of separacoes) {
      if (!s.lote_id || !idsDeLoteAlvo.has(s.lote_id)) continue
      const o = mapaOrdem.get(s.ordem_producao_id)
      const pv = o?.pedido_venda_id ? mapaPedido.get(o.pedido_venda_id) : undefined
      destinos.push({
        chave: `sep-${s.id}`, origem: 'Separação', ordem_id: s.ordem_producao_id, op: o?.numero_op ?? 'OP não localizada',
        status_ordem: o?.status ?? '—', posto: 'Almoxarifado', quantidade: Number(s.quantidade), situacao: s.status, data: s.created_at,
        pedido: pv ? String(pv.numero ?? pv.id.slice(0, 8)) : '—', cliente: pv?.cliente_id ? (mapaCliente.get(pv.cliente_id)?.nome ?? 'Cliente não localizado') : '—',
      })
    }
    for (const a of acabamentos) {
      if (!a.lote_id || !idsDeLoteAlvo.has(a.lote_id)) continue
      const o = mapaOrdem.get(a.ordem_producao_id)
      const pv = o?.pedido_venda_id ? mapaPedido.get(o.pedido_venda_id) : undefined
      destinos.push({
        chave: `aca-${a.id}`, origem: 'Acabamento', ordem_id: a.ordem_producao_id, op: o?.numero_op ?? 'OP não localizada',
        status_ordem: o?.status ?? '—', posto: a.posto_trabalho, quantidade: Number(a.quantidade_recebida), situacao: a.status, data: a.created_at,
        pedido: pv ? String(pv.numero ?? pv.id.slice(0, 8)) : '—', cliente: pv?.cliente_id ? (mapaCliente.get(pv.cliente_id)?.nome ?? 'Cliente não localizado') : '—',
      })
    }

    const genealogiaPai = genealogias.filter((g) => g.codigo_lote_pai.toLocaleUpperCase('pt-BR') === String(c.lote).toLocaleUpperCase('pt-BR'))
    const genealogiaFilho = genealogias.filter((g) => g.codigo_lote_filho.toLocaleUpperCase('pt-BR') === String(c.lote).toLocaleUpperCase('pt-BR'))

    return {
      candidato: c, lote, rastreio,
      fornecedor: lote?.fornecedor_id ? mapaFornecedor.get(lote.fornecedor_id) : undefined,
      produto: mapaProduto.get(c.produto_id),
      retencoes: retencoes.filter((r) => r.lote_id === loteId),
      componentes: insumosIds.map((x) => ({ vinculo: x, rastreio: rastreios.find((r) => r.id === x.lote_insumo_id) })),
      derivados: destinosDiretos.map((idAlvo) => lotes.find((x) => x.id === idAlvo)),
      genealogiaPai, genealogiaFilho,
      destinos: destinos.sort((a, b) => b.data.localeCompare(a.data)),
    }
  }, [selecionado, candidatos, lotes, rastreios, componentes, separacoes, acabamentos, mapaOrdem, mapaPedido, mapaCliente, mapaProduto, mapaFornecedor, genealogias, retencoes])

  const resumo = useMemo(() => ({
    lotes: lotes.length,
    rastreios: rastreios.length,
    retidos: retencoes.filter((r) => r.status === 'RETIDO').length,
    vinculados: componentes.length + separacoes.filter((s) => s.lote_id).length,
  }), [lotes, rastreios, retencoes, componentes, separacoes])

  const botao = 'inline-flex items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50'
  const celula = 'px-2 py-1.5 align-top text-[11px] text-slate-700'
  const cabecalho = 'whitespace-nowrap px-2 py-1.5 text-left text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500'

  return (
    <main className="min-h-screen bg-slate-50 p-2 text-slate-800 md:p-3">
      <div className="mx-auto max-w-[1700px] space-y-2">
        <section className="grid gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-md border border-slate-200 p-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Lotes internos</p><p className="text-lg font-extrabold text-[#123B50]">{resumo.lotes}</p></article>
          <article className="rounded-md border border-slate-200 p-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Lotes de rastreabilidade</p><p className="text-lg font-extrabold text-[#123B50]">{resumo.rastreios}</p></article>
          <article className="rounded-md border border-slate-200 p-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Retenções ativas</p><p className={'text-lg font-extrabold ' + (resumo.retidos ? 'text-rose-700' : 'text-[#067647]')}>{resumo.retidos}</p></article>
          <article className="rounded-md border border-slate-200 p-2.5"><p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Vínculos lote → OP</p><p className="text-lg font-extrabold text-[#123B50]">{resumo.vinculados}</p></article>
        </section>

        {erro && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{erro}</div>}
        {pendencias.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900">
            <strong className="block font-extrabold">Consultas indisponíveis neste tenant — a tela mostra apenas o que o banco devolveu:</strong>
            <ul className="mt-1 list-inside list-disc space-y-0.5">{pendencias.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-72 flex-1">
              <label htmlFor="rast-busca" className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Buscar lote, produto ou NF-e de entrada</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="rast-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: LT-000123, 1234AB, 45.118 ou código do item"
                  className="w-full rounded-[2px] border border-slate-300 bg-white pl-8 pr-2 text-[11px] text-slate-800 focus:border-sky-600 focus:outline-none" />
              </div>
            </div>
            <button type="button" className={botao} onClick={() => void carregar()} disabled={carregando}><RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> Atualizar</button>
            <button type="button" className={botao} onClick={() => window.print()} disabled={!detalhe}><Printer size={13} /> Imprimir rastreamento</button>
          </div>

          <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50"><tr>
                <th className={cabecalho}>Origem do registro</th><th className={cabecalho}>Lote</th><th className={cabecalho}>Lote fornecedor</th>
                <th className={cabecalho}>Produto</th><th className={cabecalho}>NF-e</th><th className={cabecalho + ' text-right'}>Disponível</th>
                <th className={cabecalho}>Entrada</th><th className={cabecalho}>Situação</th><th className={cabecalho}></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {carregando && <tr><td colSpan={9} className="p-4 text-center text-[11px] text-slate-500">Consultando lotes reais do banco…</td></tr>}
                {!carregando && filtrados.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-[11px] text-slate-500">Nenhum lote encontrado na empresa autenticada.</td></tr>}
                {!carregando && filtrados.map((c) => (
                  <tr key={c.chave} className={selecionado === c.chave ? 'bg-[#E8F4F9]' : 'hover:bg-slate-50'}>
                    <td className={celula}>{c.tipo}</td>
                    <td className={celula + ' font-extrabold text-slate-900'}>{c.lote}</td>
                    <td className={celula}>{c.lote_fornecedor}</td>
                    <td className={celula}>{c.produto}</td>
                    <td className={celula}>{c.referencia}</td>
                    <td className={celula + ' text-right tabular-nums'}>{qtd(c.disponivel)}</td>
                    <td className={celula}>{brData(c.data)}</td>
                    <td className={celula}><span className="rounded-[2px] border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">{c.status}</span></td>
                    <td className={celula + ' whitespace-nowrap'}>
                      <button type="button" className={botao} onClick={() => setSelecionado(c.chave)}><Fingerprint size={12} /> Rastrear</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detalhe && (
          <section className="space-y-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
                <Boxes size={16} className="text-[#123B50]" />
                <h2 className="text-xs font-extrabold text-[#123B50]">Cadeia do lote {detalhe.candidato.lote}</h2>
                <span className="ml-auto text-[10px] text-slate-500">{detalhe.candidato.produto} · consulta limitada à empresa {empresaId.slice(0, 8)}…</span>
              </div>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-slate-200 p-2"><dt className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Fornecedor</dt><dd className="text-[11px]">{detalhe.fornecedor ? (detalhe.fornecedor.nome_fantasia ?? detalhe.fornecedor.razao_social ?? '—') : (detalhe.rastreio ? 'Recebimento NF-e ' + (detalhe.rastreio.nf_numero ?? 'sem número') : '—')}</dd></div>
                <div className="rounded-md border border-slate-200 p-2"><dt className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">NF-e de entrada</dt><dd className="text-[11px]">{detalhe.lote?.nf_numero ?? detalhe.rastreio?.nf_numero ?? '—'}</dd></div>
                <div className="rounded-md border border-slate-200 p-2"><dt className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Recebido em</dt><dd className="text-[11px]">{brData(detalhe.lote?.data_entrada ?? detalhe.rastreio?.created_at ?? null)}</dd></div>
                <div className="rounded-md border border-slate-200 p-2"><dt className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">{detalhe.rastreio ? 'Validade' : 'Endereço'}</dt><dd className="text-[11px]">{detalhe.rastreio ? brData(detalhe.rastreio.data_validade) : (detalhe.lote?.localizacao ?? 'Não informada')}</dd></div>
              </dl>
            </div>

            <div className="grid gap-2 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#123B50]"><ArrowUpRight size={14} /> Para trás: insumos e retenções</h3>
                <table className="mt-2 w-full border-collapse">
                  <thead className="border-b border-slate-200"><tr><th className={cabecalho}>Item</th><th className={cabecalho}>Lote insumo</th><th className={cabecalho + ' text-right'}>Consumido</th><th className={cabecalho}>Qualidade</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalhe.componentes.map(({ vinculo, rastreio: insumo }) => (
                      <tr key={vinculo.id}>
                        <td className={celula}>{insumo ? rotuloProduto(insumo.produto_id) : 'Vínculo sem rastreio de insumo'}</td>
                        <td className={celula + ' font-bold'}>{insumo?.lote_fornecedor ?? vinculo.lote_insumo_id.slice(0, 8)}</td>
                        <td className={celula + ' text-right tabular-nums'}>{qtd(Number(vinculo.quantidade_consumida))}</td>
                        <td className={celula}>{insumo?.status_qualidade ?? '—'}</td>
                      </tr>
                    ))}
                    {detalhe.derivados.length > 0 && detalhe.componentes.length === 0 && <tr><td colSpan={4} className="p-3 text-[11px] text-slate-500">Lote de produção sem componente registrado: vincule a matéria-prima na inspeção/recebimento para fechar a genealogia.</td></tr>}
                    {detalhe.componentes.length === 0 && detalhe.derivados.length === 0 && <tr><td colSpan={4} className="p-3 text-[11px] text-slate-500">Nenhum componente registrado para este lote.</td></tr>}
                  </tbody>
                </table>
                {detalhe.genealogiaPai.length > 0 && (
                  <p className="mt-2 text-[10px] text-slate-500">Genealogia SGQ: {detalhe.genealogiaPai.length} lote(s) filho(s) declarados a partir deste lote pai.</p>
                )}
                <div className="mt-2 space-y-1">
                  {detalhe.retencoes.map((r) => (
                    <p key={r.id} role="alert" className="rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                      <strong className="font-extrabold">{r.status}:</strong> {r.motivo} · registrada em {brHora(r.created_at)}{r.liberado_em ? ` · liberada em ${brHora(r.liberado_em)}` : ''}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#123B50]"><ArrowDownLeft size={14} /> Para frente: OP → pedido → cliente</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="border-b border-slate-200"><tr>
                      <th className={cabecalho}>Aplicação</th><th className={cabecalho}>OP</th><th className={cabecalho}>Posto</th>
                      <th className={cabecalho + ' text-right'}>Qtde</th><th className={cabecalho}>Pedido</th><th className={cabecalho}>Cliente</th><th className={cabecalho}>Data</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalhe.destinos.map((d) => (
                        <tr key={d.chave}>
                          <td className={celula}>{d.origem} · <span className="text-slate-500">{d.situacao}</span></td>
                          <td className={celula + ' font-extrabold text-slate-900'}>{d.op}<span className="block text-[9px] font-normal text-slate-500">{d.status_ordem}</span></td>
                          <td className={celula}>{d.posto}</td>
                          <td className={celula + ' text-right tabular-nums'}>{qtd(d.quantidade)}</td>
                          <td className={celula}>{d.pedido}</td>
                          <td className={celula}>{d.cliente}</td>
                          <td className={celula}>{brHora(d.data)}</td>
                        </tr>
                      ))}
                      {detalhe.destinos.length === 0 && <tr><td colSpan={7} className="p-3 text-[11px] text-slate-500">Nenhuma separação ou acabamento vinculado a este lote — o consumo é registrado pelas telas Separação e Acabamento.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {detalhe.genealogiaFilho.length > 0 && (
                  <p className="mt-2 text-[10px] text-slate-500">Genealogia SGQ: lote aparece como insumo de {detalhe.genealogiaFilho.length} lote(s) filho(s): {detalhe.genealogiaFilho.map((g) => g.codigo_lote_filho).join(', ')}.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-[10px] text-slate-500 shadow-sm">
              <span className="inline-flex items-center gap-1 font-semibold text-[#067647]"><ShieldCheck size={12} /> Cadeia montada somente com registros existentes no banco desta empresa.</span>
              {' '}O ERP não infere elo ausente: quando a separação ou a genealogia não foi lançada, o elo aparece como pendência na própria linha.
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
