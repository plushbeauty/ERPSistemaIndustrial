/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-ALMOX-SAIMATERIAL-20261102-01 — ordem do proprietário: módulo Controle e Saída de Material dentro do menu Almoxarifado
 * @STATUS_APROVACAO: GRAVAÇÃO EXCLUSIVA PELA RPC erp_estoque_registrar_movimento (RBAC estoque.movimentar); saldo e bloqueio de negativo calculados no servidor
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Boxes, ClipboardList, LogOut, PackageMinus, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Produto = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null; estoque_atual: number | null; ponto_reposicao: number | null }
type Localizacao = { id: string; codigo: string | null; nome: string | null }
type Setor = { id: string; nome: string | null }
type Ordem = { id: string; numero_op: string | null; status: string | null }
type Saida = {
  id: string; created_at: string; produto_id: string; quantidade: number
  origem: string | null; documento: string | null; observacao: string | null
  localizacao_origem_id: string | null
}

const brHora = (v: string) => new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const qtd = (v: number | null | undefined) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export default function AlmoxarifadoSaidaMaterial() {
  const [empresaId, setEmpresaId] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const [busca, setBusca] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [localizacaoId, setLocalizacaoId] = useState('')
  const [setorId, setSetorId] = useState('')
  const [ordemId, setOrdemId] = useState('')
  const [documento, setDocumento] = useState('')
  const [finalidade, setFinalidade] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error) throw empresa.error
      if (typeof empresa.data !== 'string' || !empresa.data) throw new Error('Empresa da sessão não identificada. Entre novamente no ERP.')
      const id = empresa.data
      const [p, l, s, o, m] = await Promise.all([
        fetchAllPages<Produto>((de, ate) => supabase.from('erp_produtos').select('id,codigo,nome,unidade_medida,estoque_atual,ponto_reposicao', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(de, ate)),
        fetchAllPages<Localizacao>((de, ate) => supabase.from('erp_estoque_localizacoes').select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('codigo').range(de, ate)),
        fetchAllPages<Setor>((de, ate) => supabase.from('erp_setores').select('id,nome', { count: 'exact' }).eq('empresa_id', id).eq('ativo', true).order('nome').range(de, ate)),
        fetchAllPages<Ordem>((de, ate) => supabase.from('erp_ordens_producao').select('id,numero_op,status', { count: 'exact' }).eq('empresa_id', id).in('status', ['ABERTA', 'EM_ANDAMENTO', 'EM PRODUCAO', 'EM_PRODUCAO', 'PLANEJADA']).order('numero_op', { ascending: false }).range(de, ate)),
        fetchAllPages<Saida>((de, ate) => supabase.from('erp_estoque_movimentos').select('id,created_at,produto_id,quantidade,origem,documento,observacao,localizacao_origem_id', { count: 'exact' }).eq('empresa_id', id).eq('tipo', 'saida').order('created_at', { ascending: false }).range(de, ate)),
      ])
      setProdutos(p); setLocalizacoes(l); setSetores(s); setOrdens(o); setSaidas(m); setEmpresaId(id)
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao carregar o controle de saídas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const produto = useMemo(() => produtos.find((x) => x.id === produtoId), [produtos, produtoId])
  const saldo = Number(produto?.estoque_atual ?? 0)
  const quantidadeNumero = Number(quantidade)
  const excedente = produtoId !== '' && Number.isFinite(quantidadeNumero) && quantidadeNumero > saldo

  const listaProdutos = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return produtos.slice(0, 40)
    return produtos.filter((x) => `${x.codigo ?? ''} ${x.nome ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo)).slice(0, 40)
  }, [produtos, busca])

  const mapaProduto = useMemo(() => new Map(produtos.map((x) => [x.id, x])), [produtos])
  const mapaLocal = useMemo(() => new Map(localizacoes.map((x) => [x.id, x])), [localizacoes])

  const hoje = useMemo(() => {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const linhas = saidas.filter((s) => new Date(s.created_at) >= inicio)
    return { linhas, total: linhas.reduce((acc, s) => acc + Number(s.quantidade), 0) }
  }, [saidas])

  const ultimas30 = useMemo(() => {
    const inicio = new Date(); inicio.setDate(inicio.getDate() - 30)
    const linhas = saidas.filter((s) => new Date(s.created_at) >= inicio)
    const porProduto = new Map<string, number>()
    for (const s of linhas) porProduto.set(s.produto_id, (porProduto.get(s.produto_id) ?? 0) + Number(s.quantidade))
    return [...porProduto.entries()].map(([produto_id, total]) => ({ produto: mapaProduto.get(produto_id), total }))
      .sort((a, b) => b.total - a.total).slice(0, 10)
  }, [saidas, mapaProduto])

  async function registrar(event: FormEvent): Promise<void> {
    event.preventDefault()
    setErro(''); setAviso('')
    if (!produtoId) { setErro('Selecione o material que está saindo do almoxarifado.'); return }
    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) { setErro('Informe quantidade maior que zero.'); return }
    if (!localizacaoId) { setErro('Selecione o endereço de onde o material é retirado.'); return }
    if (!setorId) { setErro('Selecione o setor que retira o material.'); return }
    if (!finalidade.trim()) { setErro('Descreva a finalidade da retirada; a evidência fica na observação do movimento.'); return }
    setGravando(true)
    try {
      const setor = setores.find((x) => x.id === setorId)?.nome ?? 'setor não localizado'
      const op = ordens.find((x) => x.id === ordemId)?.numero_op ?? null
      const observacao = `Setor: ${setor} · Finalidade: ${finalidade.trim()}${op ? ` · OP: ${op}` : ''}`
      const r = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: empresaId, p_produto_id: produtoId, p_tipo: 'saida', p_quantidade: quantidadeNumero,
        p_origem: 'Almoxarifado', p_documento: documento.trim() || null, p_observacao: observacao,
        p_localizacao_origem_id: localizacaoId, p_localizacao_destino_id: null,
      })
      if (r.error) throw r.error
      setAviso(`Saída de ${qtd(quantidadeNumero)} ${produto?.unidade_medida ?? ''}`.trim() + ` de ${(produto?.codigo ?? '')} registrada para ${setor}. Saldo e bloqueio de negativo foram calculados pelo banco.`)
      setQuantidade(''); setDocumento(''); setFinalidade(''); setOrdemId(''); setBusca(''); setProdutoId('')
      await carregar()
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'A saída não foi registrada.')
    } finally {
      setGravando(false)
    }
  }

  function imprimirRequisicao(): void {
    if (!produto) { setErro('Selecione o material antes de imprimir a requisição.'); return }
    const setor = setores.find((x) => x.id === setorId)?.nome ?? '—'
    const local = localizacoes.find((x) => x.id === localizacaoId)?.nome ?? '—'
    const op = ordens.find((x) => x.id === ordemId)?.numero_op ?? '—'
    const janela = window.open('', '_blank', 'width=820,height=900')
    if (!janela) { setErro('O navegador bloqueou a janela de impressão. Libere pop-ups para imprimir.'); return }
    const linhas = [
      ['Material', `${produto.codigo ?? '—'} · ${produto.nome ?? '—'}`],
      ['Unidade', produto.unidade_medida ?? '—'],
      ['Quantidade solicitada', qtd(quantidadeNumero)],
      ['Endereço de origem', local],
      ['Setor que retira', setor],
      ['OP vinculada', op],
      ['Documento / requisição', documento.trim() || '—'],
      ['Finalidade', finalidade.trim() || '—'],
      ['Saldo atual do item', qtd(saldo)],
    ]
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Requisição de material</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:28px}h1{font-size:16px;margin:0 0 2px}p.sub{margin:0 0 18px;font-size:11px;color:#475569}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f1f5f9;width:32%}
.ass{margin-top:44px;display:flex;gap:36px;font-size:11px}.ass div{flex:1;border-top:1px solid #0f172a;padding-top:6px;text-align:center}
.note{margin-top:16px;font-size:10px;color:#475569}</style></head><body>
<h1>Requisição / Saída de Material · Almoxarifado</h1><p class="sub">SYSNQRA ERP &amp; SGQ INDUSTRIAL · empresa ${empresaId.slice(0, 8)}… · emitida em ${new Date().toLocaleString('pt-BR')}</p>
<table>${linhas.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>
<div class="ass"><div>Requisitante (${setor})</div><div>Almoxarife</div><div>Conferente</div></div>
<p class="note">Documento de controle interno. A baixa de saldo só é válida após o registro do movimento no ERP, que grava o razão de estoque e bloqueia saldo negativo no servidor.</p>
<script>window.onload=function(){window.print()}</script></body></html>`)
    janela.document.close()
  }

  const campo = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]'
  const rotulo = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-slate-500'
  const botao = 'inline-flex items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50'

  return (
    <main className="min-h-screen bg-slate-50 p-2 text-slate-800 md:p-3">
      <div className="mx-auto max-w-[1700px] space-y-2">
        {erro && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{erro}</div>}
        {aviso && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-[11px] font-semibold text-emerald-800"><ShieldCheck size={15} className="mt-0.5 shrink-0" />{aviso}</div>}

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
            <h2 className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-xs font-extrabold text-[#123B50]"><PackageMinus size={15} /> Registrar saída de material</h2>
            <form className="mt-2 space-y-2" onSubmit={(e) => void registrar(e)}>
              <div>
                <label className={rotulo} htmlFor="sm-busca">Material (código ou descrição)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="sm-busca" className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white pl-7 pr-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8]" value={busca}
                    onChange={(e) => { setBusca(e.target.value); setProdutoId('') }} placeholder="Digite para filtrar o cadastro de produtos" />
                </div>
                {busca.trim() && !produtoId && (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded-[2px] border border-slate-200">
                    {listaProdutos.map((p) => (
                      <li key={p.id}>
                        <button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] hover:bg-slate-50" onClick={() => { setProdutoId(p.id); setBusca(`${p.codigo ?? ''} ${p.nome ?? ''}`.trim()) }}>
                          <span className="font-extrabold text-slate-800">{p.codigo ?? '—'}</span>
                          <span className="min-w-0 flex-1 truncate">{p.nome ?? 'Produto sem nome'}</span>
                          <span className="tabular-nums text-slate-500">{qtd(p.estoque_atual)}</span>
                        </button>
                      </li>
                    ))}
                    {!listaProdutos.length && <li className="px-2 py-1.5 text-[11px] text-slate-500">Nenhum material ativo encontrado.</li>}
                  </ul>
                )}
              </div>

              {produto && (
                <div className="grid grid-cols-3 gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[10px]">
                  <div><span className="block font-bold uppercase tracking-wider text-slate-500">Código</span><strong className="text-slate-800">{produto.codigo ?? '—'}</strong></div>
                  <div><span className="block font-bold uppercase tracking-wider text-slate-500">Saldo atual</span><strong className={'tabular-nums ' + (saldo <= 0 ? 'text-rose-700' : 'text-slate-800')}>{qtd(produto.estoque_atual)} {produto.unidade_medida ?? ''}</strong></div>
                  <div><span className="block font-bold uppercase tracking-wider text-slate-500">Ponto de reposição</span><strong className="tabular-nums text-slate-800">{qtd(produto.ponto_reposicao)}</strong></div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <div><label className={rotulo} htmlFor="sm-qtd">Quantidade</label><input id="sm-qtd" type="number" min="0.001" step="0.001" className={campo} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0,000" /></div>
                <div><label className={rotulo} htmlFor="sm-local">Endereço de origem</label>
                  <select id="sm-local" className={campo} value={localizacaoId} onChange={(e) => setLocalizacaoId(e.target.value)}>
                    <option value="">Selecione o endereço</option>
                    {localizacoes.map((l) => <option key={l.id} value={l.id}>{l.codigo ?? ''} {l.nome ?? ''}</option>)}
                  </select>
                </div>
                <div><label className={rotulo} htmlFor="sm-setor">Setor que retira</label>
                  <select id="sm-setor" className={campo} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
                    <option value="">Selecione o setor</option>
                    {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>

              {excedente && (
                <p role="alert" className="rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[11px] font-semibold text-rose-800">
                  Quantidade acima do saldo exibido ({qtd(saldo)}). O servidor bloqueia a saída; ajuste antes de registrar.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <div><label className={rotulo} htmlFor="sm-op">OP vinculada (opcional)</label>
                  <select id="sm-op" className={campo} value={ordemId} onChange={(e) => setOrdemId(e.target.value)}>
                    <option value="">Sem OP</option>
                    {ordens.map((o) => <option key={o.id} value={o.id}>{o.numero_op ?? o.id.slice(0, 8)}</option>)}
                  </select>
                </div>
                <div><label className={rotulo} htmlFor="sm-doc">Nº da requisição / documento</label><input id="sm-doc" className={campo} value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Ex.: RM-2026-0148" /></div>
                <div><label className={rotulo} htmlFor="sm-fim">Finalidade</label><input id="sm-fim" className={campo} value={finalidade} onChange={(e) => setFinalidade(e.target.value)} placeholder="Ex.: linha de montagem, manutenção, amostra" /></div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                <button type="submit" className="inline-flex items-center gap-1 rounded-[2px] bg-[#123B50] px-3 text-[11px] font-extrabold text-white transition hover:bg-[#0d2c3d] disabled:opacity-50" disabled={gravando || excedente}>
                  <LogOut size={13} /> {gravando ? 'Registrando…' : 'Registrar saída'}
                </button>
                <button type="button" className={botao} onClick={imprimirRequisicao}><Printer size={13} /> Imprimir requisição</button>
                <button type="button" className={botao} onClick={() => void carregar()} disabled={carregando}><RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> Atualizar</button>
                <span className="ml-auto text-[10px] text-slate-500">Setor, finalidade e OP entram na observação auditável do movimento; o saldo é razão do banco.</span>
              </div>
            </form>
          </section>

          <div className="space-y-2">
            <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <h2 className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-xs font-extrabold text-[#123B50]"><ClipboardList size={15} /> Saídas registradas hoje</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="border-b border-slate-200 text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500">
                    <tr><th className="px-2 py-1.5 text-left">Horário</th><th className="px-2 py-1.5 text-left">Material</th><th className="px-2 py-1.5 text-right">Qtde</th><th className="px-2 py-1.5 text-left">Endereço</th><th className="px-2 py-1.5 text-left">Documento / observação</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carregando && <tr><td colSpan={5} className="p-3 text-center text-[11px] text-slate-500">Consultando movimentos reais…</td></tr>}
                    {!carregando && hoje.linhas.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-[11px] text-slate-500">Nenhuma saída registrada hoje nesta empresa.</td></tr>}
                    {!carregando && hoje.linhas.slice(0, 40).map((s) => {
                      const p = mapaProduto.get(s.produto_id)
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-600">{brHora(s.created_at)}</td>
                          <td className="px-2 py-1.5 text-[11px]"><strong className="text-slate-800">{p?.codigo ?? '—'}</strong> {p?.nome ?? 'Produto não localizado'}</td>
                          <td className="px-2 py-1.5 text-right text-[11px] tabular-nums">{qtd(s.quantidade)}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-600">{s.localizacao_origem_id ? (mapaLocal.get(s.localizacao_origem_id)?.nome ?? s.localizacao_origem_id.slice(0, 8)) : 'Não informado'}</td>
                          <td className="px-2 py-1.5 text-[11px] text-slate-600">{s.documento ? <strong className="text-slate-800">{s.documento} · </strong> : null}{s.observacao ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {!carregando && hoje.linhas.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50"><tr><td colSpan={2} className="px-2 py-1.5 text-[10px] font-extrabold uppercase text-slate-500">{hoje.linhas.length} movimento(s) hoje</td><td className="px-2 py-1.5 text-right text-[11px] font-extrabold tabular-nums text-[#123B50]">{qtd(hoje.total)}</td><td colSpan={2}></td></tr></tfoot>
                  )}
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <h2 className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-xs font-extrabold text-[#123B50]"><Boxes size={15} /> Consumo por material · últimos 30 dias</h2>
              <table className="mt-2 w-full border-collapse">
                <thead className="border-b border-slate-200 text-[9px] font-extrabold uppercase tracking-[.1em] text-slate-500"><tr><th className="px-2 py-1.5 text-left">Material</th><th className="px-2 py-1.5 text-right">Saído</th><th className="px-2 py-1.5 text-right">Saldo atual</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ultimas30.map((l) => (
                    <tr key={l.produto?.id ?? l.produto?.codigo ?? 'x'}>
                      <td className="px-2 py-1.5 text-[11px]"><strong className="text-slate-800">{l.produto?.codigo ?? '—'}</strong> {l.produto?.nome ?? 'Produto não localizado'}</td>
                      <td className="px-2 py-1.5 text-right text-[11px] tabular-nums">{qtd(l.total)}</td>
                      <td className={'px-2 py-1.5 text-right text-[11px] tabular-nums ' + (Number(l.produto?.estoque_atual ?? 0) <= Number(l.produto?.ponto_reposicao ?? 0) ? 'font-extrabold text-rose-700' : '')}>{qtd(l.produto?.estoque_atual)}</td>
                    </tr>
                  ))}
                  {!ultimas30.length && <tr><td colSpan={3} className="p-3 text-[11px] text-slate-500">Sem saídas nos últimos 30 dias.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
