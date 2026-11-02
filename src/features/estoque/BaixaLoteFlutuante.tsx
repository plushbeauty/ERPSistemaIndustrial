/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-LOTE-FIFO-20261101-02 — janela flutuante de baixa de matéria-prima por lote, dentro do
 * padrão aprovado do módulo (ModuleWorkspace + fundação smp), e não como tela solta fora do ERP
 * @STATUS_APROVACAO: SOLICITADO PELO PROPRIETARIO EM 2026-11-01 ("pagina flutuante aonde vc digita o
 * codigo da materia prima ai puxa todos os lotes com a quantidade total")
 *
 * A alocação por lote é feita pelo servidor (erp_lote_baixar_por_fifo), nunca aqui: esta janela apenas
 * mostra a prévia e pede confirmação. Enquanto a migration 20261101200000 não estiver aplicada no
 * projeto, as três RPCs não existem e a tela declara a pendência em vez de simular a baixa.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Boxes, Minus, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import ModuleWorkspace from '../../components/layout/ModuleRail'
import { moduleNavs } from '../../config/moduleNav'
import '../../styles/sysnqra-module-premium-20261101.css'

type Lote = {
  lote_id: string
  lote_numero: string
  nf_numero: string | null
  quantidade_disponivel: number
  quantidade_inicial: number | null
  data_validade: string | null
  data_entrada: string | null
  status_qualidade: string
}

type Material = {
  encontrado: boolean
  produto_id: string
  codigo: string
  nome: string
  unidade: string | null
  estoque_atual: number | null
  total_em_lotes: number
  quantidade_lotes: number
  lotes: Lote[]
  mensagem?: string
}

type Fatia = {
  lote_id: string
  lote_numero: string
  nf_numero: string | null
  quantidade_baixar: number
  saldo_atual_lote: number
  saldo_restante_lote: number
  data_validade: string | null
  data_entrada: string | null
}

type Previa = {
  cobre_a_baixa: boolean
  faltante: number
  saldo_em_lotes: number
  lotes_atingidos: number
  lotes: Fatia[]
}

type Ordem = { id: string; numero_op: string; status: string | null; quantidade: number | null }

type Candidato = { id: string; codigo: string; nome: string; unidade: string | null; estoque_atual: number | null }

const FUNCIONALIDADES = 'erp_lote_saldos_por_material, erp_lote_planejar_baixa e erp_lote_baixar_por_fifo'
const semGancho = (erro: { message?: string } | null) => /could not find the function|function .* does not exist|PGRST202/i.test(erro?.message ?? '')
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const qtd = (v: number) => trim(v)
function trim(v: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(v)
}
const dataCurta = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—')

export default function BaixaLoteFlutuante() {
  const navegar = useNavigate()
  const nav = useMemo(() => moduleNavs.find(m => m.key === 'estoque') ?? moduleNavs[0], [])
  const [tenant, setTenant] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [material, setMaterial] = useState<Material | null>(null)
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [quantidade, setQuantidade] = useState('')
  const [pedidoInterno, setPedidoInterno] = useState('')
  const [opId, setOpId] = useState('')
  const [criterio, setCriterio] = useState<'entrada' | 'validade'>('entrada')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [movimento, setMovimento] = useState('')
  const [erro, setErro] = useState('')
  const [pendencia, setPendencia] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [recolhida, setRecolhida] = useState(false)
  const [posicao, setPosicao] = useState(() => ({ x: Math.max(24, window.innerWidth - 596), y: 96 }))
  const arraste = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    let vivo = true
    void (async () => {
      const r = await supabase.rpc('erp_current_empresa_id')
      if (!vivo) return
      if (r.error) setErro(`Não foi possível identificar a empresa de trabalho (${r.error.message}).`)
      else setTenant(String(r.data ?? ''))
    })()
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    if (!tenant) return
    let vivo = true
    void (async () => {
      const r = await supabase.from('erp_ordens_producao')
        .select('id,numero_op,status,quantidade')
        .eq('empresa_id', tenant)
        .order('numero_op', { ascending: false })
        .limit(200)
      if (!vivo) return
      if (r.error) setOrdens([])
      else setOrdens((r.data ?? []) as Ordem[])
    })()
    return () => { vivo = false }
  }, [tenant])

  useEffect(() => {
    const termo = busca.trim().replace(/[%_]/g, '')
    if (!tenant || termo.length < 2) { setCandidatos([]); return }
    let vivo = true
    const relogio = window.setTimeout(async () => {
      const r = await supabase.from('erp_produtos')
        .select('id,codigo,nome,unidade,estoque_atual')
        .eq('empresa_id', tenant)
        .eq('ativo', true)
        .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
        .order('codigo')
        .limit(12)
      if (!vivo) return
      setCandidatos(r.error ? [] : ((r.data ?? []) as Candidato[]))
    }, 260)
    return () => { vivo = false; window.clearTimeout(relogio) }
  }, [busca, tenant])

  async function carregarMaterial(codigo: string) {
    setOcupado(true); setErro(''); setPendencia(''); setPrevia(null); setMovimento('')
    setBusca(codigo); setCandidatos([])
    const saldo = await supabase.rpc('erp_lote_saldos_por_material', { p_material_codigo: codigo })
    setOcupado(false)
    if (saldo.error) {
      if (semGancho(saldo.error)) setPendencia(`Ainda não aplicadas: ${FUNCIONALIDADES}. Sem elas o sistema não sabe em qual lote baixar.`)
      else setErro(saldo.error.message)
      setMaterial(null)
      return
    }
    const dados = (saldo.data ?? {}) as unknown as Material
    if (!dados.encontrado) { setMaterial(null); setErro(dados.mensagem ?? 'Matéria-prima não encontrada.'); return }
    setMaterial(dados)
  }

  async function calcularPrevia() {
    if (!material) { setErro('Digite o código da matéria-prima primeiro.'); return }
    const pedida = Number(String(quantidade).replace(',', '.'))
    if (!Number.isFinite(pedida) || pedida <= 0) { setErro('Informe a quantidade que vai sair.'); return }
    setOcupado(true); setErro(''); setPendencia(''); setMovimento('')
    const r = await supabase.rpc('erp_lote_planejar_baixa', {
      p_produto_id: material.produto_id, p_quantidade: pedida, p_criterio: criterio,
    })
    setOcupado(false)
    if (r.error) {
      if (semGancho(r.error)) setPendencia(`Ainda não aplicada: erp_lote_planejar_baixa (migration 20261101200000).`)
      else setErro(r.error.message)
      setPrevia(null)
      return
    }
    setPrevia((r.data ?? null) as Previa | null)
  }

  async function confirmarBaixa() {
    if (!material || !previa) { setErro('Calcule a prévia antes de gravar.'); return }
    if (!previa.cobre_a_baixa) { setErro(`Faltam ${qtd(numero(previa.faltante))} em lotes aprovados. Nada será gravado.`); return }
    if (!pedidoInterno.trim()) { setErro('Informe o pedido interno que consome a matéria-prima.'); return }
    setOcupado(true); setErro('')
    const r = await supabase.rpc('erp_lote_baixar_por_fifo', {
      p_produto_id: material.produto_id,
      p_quantidade: Number(String(quantidade).replace(',', '.')),
      p_pedido_interno: pedidoInterno.trim(),
      p_ordem_producao_id: opId || null,
      p_criterio: criterio,
      p_observacao: null,
    })
    setOcupado(false)
    if (r.error) {
      if (semGancho(r.error)) setPendencia('A RPC erp_lote_baixar_por_fifo ainda não existe no projeto. Aplique a migration 20261101200000.')
      else setErro(r.error.message)
      return
    }
    const retorno = (r.data ?? {}) as { quantidade_baixada?: number; lotes_atingidos?: number }
    setMovimento(`Baixa gravada: ${qtd(numero(retorno.quantidade_baixada))} ${material.unidade ?? ''} em ${retorno.lotes_atingidos ?? 0} lote(s).`)
    setPrevia(null)
    const recarga = await supabase.rpc('erp_lote_saldos_por_material', { p_material_codigo: material.codigo })
    if (!recarga.error) setMaterial(recarga.data as unknown as Material)
  }

  const iniciarraste = (e: React.PointerEvent) => {
    arraste.current = { dx: e.clientX - posicao.x, dy: e.clientY - posicao.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const moverraste = (e: React.PointerEvent) => {
    if (!arraste.current) return
    setPosicao({
      x: Math.max(8, Math.min(window.innerWidth - 240, e.clientX - arraste.current.dx)),
      y: Math.max(8, Math.min(window.innerHeight - 60, e.clientY - arraste.current.dy)),
    })
  }
  const fimraste = (e: React.PointerEvent) => {
    arraste.current = null
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const saldos = useMemo(() => material?.lotes ?? [], [material])
  const totalSaldos = useMemo(() => saldos.reduce((s, l) => s + numero(l.quantidade_disponivel), 0), [saldos])

  return (
    <ModuleWorkspace nav={nav}>
      <section className="smp-topbar">
        <div>
          <strong style={{ display: 'block', fontSize: 15, fontWeight: 900, color: 'var(--smp-ink)' }}>Baixa de matéria-prima por lote</strong>
          <span style={{ color: 'var(--smp-muted)', fontSize: 12, fontWeight: 700 }}>Pedido interno consome primeiro o lote mais antigo; cada fatia gera um movimento próprio.</span>
        </div>
        <div className="smp-topbar-spacer" />
        <div className="smp-unit"><Boxes size={15} aria-hidden />Almoxarifado</div>
        <button type="button" className="smp-btn smp-btn--ghost" onClick={() => navegar('/pageprincipal/estoque/almoxarifado')}>
          <ArrowLeft size={12} /> Voltar ao almoxarifado
        </button>
      </section>

      <p className="smp-note smp-note--info">
        <Search size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
        <span>
          A janela é arrastável: puxe pelo cabeçalho para deixá-la sobre a sua tarefa. A ordem de baixa é sempre a do
          lote mais antigo que deu entrada, e a RPC do servidor decide a alocação — esta tela mostra a prévia e pede
          confirmação antes de gravar qualquer movimento.
        </span>
      </p>

      {pendencia && (
        <p className="smp-note">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <span>{pendencia}</span>
        </p>
      )}

      <section
        className="smp-panel"
        style={{ position: 'fixed', left: posicao.x, top: posicao.y, width: 'min(560px, calc(100vw - 32px))', zIndex: 60, boxShadow: '0 18px 44px rgba(15,32,48,.24)' }}
        role="dialog"
        aria-label="Janela de baixa de matéria-prima por lote"
      >
        <header className="smp-panel-head" style={{ cursor: 'grab' }} onPointerDown={iniciarraste} onPointerMove={moverraste} onPointerUp={fimraste} onPointerCancel={fimraste}>
          <span className="smp-panel-title"><Boxes size={13} /> {material ? `${material.codigo} — ${material.nome}` : 'Matéria-prima'}</span>
          <div className="smp-panel-actions" style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="smp-btn smp-btn--icon" onClick={() => setRecolhida(v => !v)} title={recolhida ? 'Abrir' : 'Recolher'} aria-label={recolhida ? 'Abrir janela' : 'Recolher janela'}>
              {recolhida ? <Plus size={12} /> : <Minus size={12} />}
            </button>
            <button type="button" className="smp-btn smp-btn--icon" onClick={() => navegar('/pageprincipal/estoque/almoxarifado')} title="Fechar" aria-label="Fechar janela">
              <X size={12} />
            </button>
          </div>
        </header>

        {!recolhida && (
          <div className="smp-panel-body" style={{ display: 'grid', gap: 10, maxHeight: '72vh', overflow: 'auto' }}>
            <div className="smp-field">
              <label htmlFor="edBuscaMP">Código ou nome da matéria-prima</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input id="edBuscaMP" className="smp-input" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: 100234 ou polipropileno" autoComplete="off" />
                <button type="button" className="smp-btn" onClick={() => { const termo = busca.trim(); if (termo) void carregarMaterial(termo) }}>
                  <Search size={12} /> Carregar
                </button>
              </div>
              {candidatos.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 2 }}>
                  {candidatos.map(c => (
                    <li key={c.id}>
                      <button type="button" className="smp-btn smp-btn--ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => void carregarMaterial(c.codigo)}>
                        <strong>{c.codigo}</strong> · {c.nome} · saldo {qtd(numero(c.estoque_atual ?? 0))} {c.unidade ?? ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {erro && (
              <p className="smp-note smp-note--error">
                <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
                <span>{erro}</span>
              </p>
            )}

            {material && (
              <>
                <dl className="smp-legend-list">
                  <div><dt>Estoque do produto</dt><dd>{qtd(numero(material.estoque_atual ?? 0))} {material.unidade ?? ''}</dd></div>
                  <div><dt>Total em lotes aprovados</dt><dd>{qtd(totalSaldos)} {material.unidade ?? ''}</dd></div>
                  <div><dt>Lotes com saldo</dt><dd>{saldos.length}</dd></div>
                </dl>
                {saldos.length === 0 && (
                  <p className="smp-note">Este material não tem lote APROVADO com saldo. A baixa por lote só é possível depois que o recebimento por NF-e gravar um lote aprovado.</p>
                )}
              </>
            )}

            {material && saldos.length > 0 && (
              <div className="smp-tablewrap" style={{ maxHeight: 168 }}>
                <table className="smp-table">
                  <thead><tr><th>Lote</th><th>NF entrada</th><th>Entrada</th><th>Validade</th><th className="is-num">Saldo</th></tr></thead>
                  <tbody>
                    {saldos.map(l => (
                      <tr key={l.lote_id}>
                        <td className="is-strong">{l.lote_numero}</td>
                        <td>{l.nf_numero ?? '—'}</td>
                        <td>{dataCurta(l.data_entrada)}</td>
                        <td>{dataCurta(l.data_validade)}</td>
                        <td className="is-num">{qtd(numero(l.quantidade_disponivel))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="smp-field" style={{ width: 120 }}>
                <label htmlFor="edQtdSaida">Quantidade que vai sair</label>
                <input id="edQtdSaida" className="smp-input" value={quantidade} onChange={e => { setQuantidade(e.target.value); setPrevia(null) }} inputMode="decimal" placeholder="0" />
              </div>
              <div className="smp-field" style={{ flex: '1 1 160px' }}>
                <label htmlFor="edPedidoInterno">Pedido interno</label>
                <input id="edPedidoInterno" className="smp-input" value={pedidoInterno} onChange={e => setPedidoInterno(e.target.value)} placeholder="Ex.: PI-2026-0148" />
              </div>
              <div className="smp-field" style={{ width: 132 }}>
                <label htmlFor="cbCriterio">Ordem dos lotes</label>
                <select id="cbCriterio" className="smp-select" value={criterio} onChange={e => setCriterio(e.target.value as 'entrada' | 'validade')}>
                  <option value="entrada">Lote mais antigo</option>
                  <option value="validade">Vence primeiro</option>
                </select>
              </div>
            </div>

            <div className="smp-field">
              <label htmlFor="cbOP">Vincular à ordem de produção (opcional)</label>
              <select id="cbOP" className="smp-select" value={opId} onChange={e => setOpId(e.target.value)}>
                <option value="">Sem OP vinculada</option>
                {ordens.map(o => <option key={o.id} value={o.id}>{o.numero_op}{o.status ? ` · ${o.status}` : ''}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="smp-btn" onClick={() => void calcularPrevia()} disabled={ocupado || !material}>
                <RefreshCw size={12} /> Prévia da baixa
              </button>
              <button type="button" className="smp-btn smp-btn--primary" onClick={() => void confirmarBaixa()} disabled={ocupado || !previa || !previa.cobre_a_baixa}>
                Gravar baixa por lote
              </button>
            </div>

            {previa && (
              <div className="smp-tablewrap">
                <table className="smp-table">
                  <thead><tr><th>Vai sair de</th><th>NF</th><th className="is-num">Baixar</th><th className="is-num">Saldo do lote</th><th className="is-num">Sobra</th></tr></thead>
                  <tbody>
                    {previa.lotes.map(f => (
                      <tr key={f.lote_id}>
                        <td className="is-strong">{f.lote_numero}</td>
                        <td>{f.nf_numero ?? '—'}</td>
                        <td className="is-num">{qtd(numero(f.quantidade_baixar))}</td>
                        <td className="is-num">{qtd(numero(f.saldo_atual_lote))}</td>
                        <td className="is-num">{qtd(numero(f.saldo_restante_lote))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={`smp-note${previa.cobre_a_baixa ? ' smp-note--info' : ' smp-note--error'}`} style={{ marginTop: 8 }}>
                  <span>
                    {previa.cobre_a_baixa
                      ? `A baixa atravessa ${previa.lotes_atingidos} lote(s) começando pelo mais antigo. Nada foi gravado ainda.`
                      : `Faltam ${qtd(numero(previa.faltante))}. O servidor recusa a gravação enquanto os lotes aprovados não cobrirem o total.`}
                  </span>
                </p>
              </div>
            )}

            {movimento && (
              <p className="smp-note smp-note--info">
                <span>{movimento}</span>
              </p>
            )}
          </div>
        )}
      </section>
    </ModuleWorkspace>
  )
}
