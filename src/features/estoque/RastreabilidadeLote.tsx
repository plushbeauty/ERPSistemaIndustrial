/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-LOTE-FIFO-20261101-01 — rastreabilidade de lote e NF de entrada nos dois sentidos
 * @STATUS_APROVACAO: SOLICITADO PELO PROPRIETARIO EM 2026-11-01 ("dar rastreabilidade com todos os
 * produtos feitos por ele; digitar o numero do lote ou NF e aparecer todas as peças produzidas")
 *
 * A consulta é a RPC erp_lote_rastrear (migration 20261101200000), que resolve no servidor, dentro da
 * empresa da sessão: (1) os lotes que batem com o número digitado, (2) as baixas de matéria-prima que
 * saíram daqueles lotes e (3) as peças apontadas nas ordens de produção que as consumiram. Sem a
 * migration aplicada a RPC não existe e a tela declara a pendência em vez de montar lista vazia como
 * se fosse o resultado real.
 */
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Boxes, Factory, Printer, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import ModuleWorkspace from '../../components/layout/ModuleRail'
import { moduleNavs } from '../../config/moduleNav'
import '../../styles/sysnqra-module-premium-20261101.css'

type LoteEncontrado = {
  lote_id: string
  lote_numero: string
  nf_numero: string | null
  material_codigo: string | null
  material_nome: string | null
  unidade: string | null
  quantidade_inicial: number | null
  quantidade_disponivel: number | null
  status_qualidade: string | null
  data_validade: string | null
  data_entrada: string | null
}

type BaixaEncontrada = {
  movimento_id: string
  lote_numero: string | null
  material_codigo: string | null
  quantidade: number | null
  pedido_interno: string | null
  numero_op: string | null
  produto_codigo: string | null
  produto_nome: string | null
  emitido_em: string | null
}

type PecaProduzida = {
  op_id: string
  numero_op: string | null
  lote_apontado: string | null
  quantidade_boa: number | null
  quantidade_refugada: number | null
  produto_codigo: string | null
  produto_nome: string | null
  apontado_em: string | null
}

type Rastreio = {
  referencia: string
  lotes: LoteEncontrado[]
  baixas: BaixaEncontrada[]
  producao: PecaProduzida[]
}

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const qtd = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(v)
const dataCurta = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—')
const dataHora = (v: string | null) => (v
  ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—')

export default function RastreabilidadeLote() {
  const nav = useMemo(() => moduleNavs.find(m => m.key === 'estoque') ?? moduleNavs[0], [])
  const [referencia, setReferencia] = useState('')
  const [resultado, setResultado] = useState<Rastreio | null>(null)
  const [erro, setErro] = useState('')
  const [pendencia, setPendencia] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function consultar() {
    const termo = referencia.trim()
    if (!termo) { setErro('Digite o número do lote ou a NF de entrada.'); return }
    setOcupado(true); setErro(''); setPendencia(''); setResultado(null)
    const r = await supabase.rpc('erp_lote_rastrear', { p_referencia: termo })
    setOcupado(false)
    if (r.error) {
      if (/could not find the function|function .* does not exist|PGRST202/i.test(r.error.message))
        setPendencia('A RPC erp_lote_rastrear ainda não existe neste projeto. Aplique a migration 20261101200000_erp_lote_baixa_fifo_rastreabilidade_v1.sql para liberar a rastreabilidade.')
      else setErro(r.error.message)
      return
    }
    const dados = (r.data ?? {}) as unknown as Rastreio
    setResultado({
      referencia: dados.referencia ?? termo,
      lotes: Array.isArray(dados.lotes) ? dados.lotes : [],
      baixas: Array.isArray(dados.baixas) ? dados.baixas : [],
      producao: Array.isArray(dados.producao) ? dados.producao : [],
    })
  }

  const vazio = resultado !== null && resultado.lotes.length === 0

  return (
    <ModuleWorkspace nav={nav}>
      <section className="smp-topbar">
        <div>
          <strong style={{ display: 'block', fontSize: 15, fontWeight: 900, color: 'var(--smp-ink)' }}>Rastreabilidade de lote</strong>
          <span style={{ color: 'var(--smp-muted)', fontSize: 12, fontWeight: 700 }}>Do lote ou da NF de entrada até as peças produzidas, na empresa da sessão.</span>
        </div>
        <div className="smp-topbar-spacer" />
        <div className="smp-unit"><Boxes size={15} aria-hidden />Almoxarifado</div>
        <button type="button" className="smp-btn smp-btn--ghost" onClick={() => window.print()} disabled={!resultado || vazio}>
          <Printer size={12} /> Imprimir
        </button>
      </section>

      <div className="smp-panel" style={{ marginBottom: 12 }}>
        <div className="smp-panel-body">
          <div className="smp-field" style={{ marginBottom: 0 }}>
            <label htmlFor="edReferencia">Número do lote ou NF de entrada</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                id="edReferencia"
                className="smp-input"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void consultar() }}
                placeholder="Ex.: LT-2026-00438 ou a chave da NF"
                autoComplete="off"
              />
              <button type="button" className="smp-btn" onClick={() => void consultar()} disabled={ocupado}>
                <Search size={12} /> {ocupado ? 'Consultando…' : 'Rastrear'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendencia && (
        <p className="smp-note">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <span>{pendencia}</span>
        </p>
      )}
      {erro && (
        <p className="smp-note smp-note--error">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <span>{erro}</span>
        </p>
      )}

      {resultado && (
        <>
          <dl className="smp-dl">
            <div><dt>Referência consultada</dt><dd>{resultado.referencia}</dd></div>
            <div><dt>Lotes encontrados</dt><dd>{resultado.lotes.length}</dd></div>
            <div><dt>Baixas de matéria-prima</dt><dd>{resultado.baixas.length}</dd></div>
            <div><dt>Peças apontadas</dt><dd>{resultado.producao.length}</dd></div>
          </dl>

          {vazio && (
            <div className="smp-panel">
              <div className="smp-state">
                <Search size={26} aria-hidden />
                <strong>Nenhum lote com esta referência</strong>
                <p>A busca compara o texto digitado com o lote do fornecedor e com o número da NF gravados no recebimento desta empresa. Confira o número ou digite apenas parte dele.</p>
              </div>
            </div>
          )}

          {!vazio && (
            <>
              <div className="smp-panel" style={{ marginBottom: 12 }}>
                <div className="smp-panel-head">
                  <span className="smp-panel-title"><Boxes size={13} /> Entrada da matéria-prima</span>
                </div>
                <div className="smp-tablewrap">
                  <table className="smp-table">
                    <thead>
                      <tr>
                        <th>Lote</th><th>NF entrada</th><th>Matéria-prima</th><th>Entrada</th><th>Validade</th>
                        <th className="is-num">Recebido</th><th className="is-num">Saldo</th><th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.lotes.map(l => (
                        <tr key={l.lote_id}>
                          <td className="is-strong">{l.lote_numero}</td>
                          <td>{l.nf_numero ?? '—'}</td>
                          <td>{l.material_codigo ?? '—'} · {l.material_nome ?? '—'}</td>
                          <td>{dataCurta(l.data_entrada)}</td>
                          <td>{dataCurta(l.data_validade)}</td>
                          <td className="is-num">{qtd(numero(l.quantidade_inicial))} {l.unidade ?? ''}</td>
                          <td className="is-num">{qtd(numero(l.quantidade_disponivel))}</td>
                          <td><span className="smp-chip" data-tone={l.status_qualidade === 'APROVADO' ? 'success' : 'danger'}>{l.status_qualidade ?? '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="smp-panel" style={{ marginBottom: 12 }}>
                <div className="smp-panel-head">
                  <span className="smp-panel-title"><ArrowLeftRight size={13} /> Baixas por pedido interno</span>
                  <span className="smp-panel-sub">Cada linha é um movimento gravado pela baixa FIFO por lote.</span>
                </div>
                <div className="smp-tablewrap">
                  {resultado.baixas.length === 0 ? (
                    <div className="smp-state">
                      <ArrowLeftRight size={24} aria-hidden />
                      <strong>Este lote ainda não alimentou nenhuma produção</strong>
                      <p>Os lotes só aparecem aqui depois que a baixa por pedido interno (tela ao lado, rota “Baixa por Lote”) consumir saldo aprovado dele.</p>
                    </div>
                  ) : (
                    <table className="smp-table">
                      <thead>
                        <tr>
                          <th>Quando</th><th>Lote</th><th>Matéria-prima</th><th className="is-num">Quantidade</th>
                          <th>Pedido interno</th><th>OP</th><th>Produto da OP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.baixas.map(b => (
                          <tr key={b.movimento_id}>
                            <td>{dataHora(b.emitido_em)}</td>
                            <td className="is-strong">{b.lote_numero ?? '—'}</td>
                            <td>{b.material_codigo ?? '—'}</td>
                            <td className="is-num">{qtd(numero(b.quantidade))}</td>
                            <td>{b.pedido_interno ?? '—'}</td>
                            <td>{b.numero_op ?? '—'}</td>
                            <td>{b.produto_codigo ?? '—'} · {b.produto_nome ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="smp-panel">
                <div className="smp-panel-head">
                  <span className="smp-panel-title"><Factory size={13} /> Peças produzidas com este lote</span>
                  <span className="smp-panel-sub">Apontamentos de processo das ordens que consumiram o lote.</span>
                </div>
                <div className="smp-tablewrap">
                  {resultado.producao.length === 0 ? (
                    <div className="smp-state">
                      <Factory size={24} aria-hidden />
                      <strong>Nenhum apontamento vinculado às ordens deste lote</strong>
                      <p>Quando a baixa informa a ordem de produção, o apontamento daquela OP aparece aqui com a quantidade boa e o refugo registrados no chão de fábrica.</p>
                    </div>
                  ) : (
                    <table className="smp-table">
                      <thead>
                        <tr>
                          <th>Quando</th><th>OP</th><th>Lote apontado</th><th>Produto</th>
                          <th className="is-num">Boas</th><th className="is-num">Refugo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.producao.map(p => (
                          <tr key={`${p.op_id}-${p.lote_apontado ?? ''}-${p.apontado_em ?? ''}`}>
                            <td>{dataHora(p.apontado_em)}</td>
                            <td className="is-strong">{p.numero_op ?? '—'}</td>
                            <td>{p.lote_apontado ?? '—'}</td>
                            <td>{p.produto_codigo ?? '—'} · {p.produto_nome ?? '—'}</td>
                            <td className="is-num">{qtd(numero(p.quantidade_boa))}</td>
                            <td className="is-num">{qtd(numero(p.quantidade_refugada))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </ModuleWorkspace>
  )
}
