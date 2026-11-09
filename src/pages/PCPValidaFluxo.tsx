/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-PADRAO-COR-CLARO-20261104-01 — tela convertida do tema escuro para o padrao industrial claro (fundo #F4FBFD, paineis brancos, texto #123B50); nenhuma alteracao de logica ou de consulta
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: PADRAO UNICO DE COR APLICADO POR ORDEM DO PROPRIETARIO EM 2026-11-04
 */
/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */

/**
 * =========================================================================
 * SYSNQRA — PCP / ENGENHARIA DE PROCESSO
 * Módulo: Validador de Fluxo de Estoque e Roteamento para OP
 * Arquivo: src/pages/PCPValidaFluxo.tsx
 * @REVISAO_ANTERIOR: PCP-FLOW-SIM-001 | 2026-10-21
 * Escopo: SIMULAÇÃO local; não grava estoque, reservas ou ordens no banco.
 * =========================================================================
 */
import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, Database, Play, RotateCcw,
  ShieldCheck, X, ClipboardCheck, FlaskConical,
} from 'lucide-react'

const inputClass = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#CFE1E7] bg-[#F8FAFC] px-2.5 text-xs font-mono font-bold text-[#123B50] outline-none focus:border-[#2D8DB8]'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500'
const fmt = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

type LogEntry = { id: number; time: string; type: 'ok' | 'warning'; text: string }

export default function PCPValidaFluxo() {
  const [pedidoNum, setPedidoNum] = useState('3589')
  const [cliente, setCliente] = useState('ENERSYS')
  const [codigoInterno, setCodigoInterno] = useState('30267')
  const [descricao, setDescricao] = useState('CP03698-Conector Flexivel Inj.OPZ 50x1000')
  const [qtdPedido, setQtdPedido] = useState('100')
  const [qtdEstoque, setQtdEstoque] = useState('1')
  const [qtdJaReservada, setQtdJaReservada] = useState('0')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showOpModal, setShowOpModal] = useState(false)
  const [notice, setNotice] = useState('')
  const [nextLogId, setNextLogId] = useState(1)

  const parsed = useMemo(() => {
    const pedido = Number(qtdPedido)
    const estoque = Number(qtdEstoque)
    const reservada = Number(qtdJaReservada)
    const valid = [pedido, estoque, reservada].every(Number.isFinite) &&
      pedido > 0 && estoque >= 0 && reservada >= 0 &&
      Number.isInteger(pedido) && Number.isInteger(estoque) && Number.isInteger(reservada) &&
      reservada <= estoque
    const disponivel = valid ? Math.max(0, estoque - reservada) : 0
    const reservar = valid ? Math.min(pedido, disponivel) : 0
    const falta = valid ? Math.max(0, pedido - reservar) : 0
    return { valid, pedido, estoque, reservada, disponivel, reservar, falta, completo: valid && falta === 0 }
  }, [qtdPedido, qtdEstoque, qtdJaReservada])

  const resultado = useMemo(() => {
    if (!parsed.valid) return {
      status: 'Parâmetros inválidos', green: false,
      message: 'Informe quantidades inteiras não negativas; o pedido deve ser maior que zero e a reserva existente não pode superar o estoque.',
      action: 'CORRIGIR PARÂMETROS',
    }
    return parsed.completo ? {
      status: 'Disponível', green: true,
      message: 'O saldo livre cobre integralmente a demanda. Na produção real, a reserva deve ser confirmada pela função transacional do banco.',
      action: 'SIMULAÇÃO: LIBERAÇÃO APÓS RESERVA',
    } : {
      status: 'Falta', green: false,
      message: 'O saldo livre não cobre a demanda completa. O faturamento deve permanecer bloqueado e a quantidade faltante deve seguir para análise de OP.',
      action: 'SIMULAÇÃO: ENCAMINHAR PARA OP',
    }
  }, [parsed])

  function rodarTesteFluxo() {
    const time = new Date().toLocaleTimeString('pt-BR')
    if (!parsed.valid) {
      setNotice('Corrija os parâmetros antes de executar a simulação.')
      setShowOpModal(false)
      return
    }
    const entry: LogEntry = {
      id: nextLogId,
      time,
      type: parsed.completo ? 'ok' : 'warning',
      text: parsed.completo
        ? `SIMULAÇÃO PV-${pedidoNum}: demanda ${fmt(parsed.pedido)}, saldo livre ${fmt(parsed.disponivel)}. Reserva simulada de ${fmt(parsed.reservar)}; nenhuma gravação no banco foi executada.`
        : `SIMULAÇÃO PV-${pedidoNum}: demanda ${fmt(parsed.pedido)}, saldo livre ${fmt(parsed.disponivel)}, falta ${fmt(parsed.falta)}. Faturamento bloqueado; nenhum registro de OP foi criado.`,
    }
    setLogs(prev => [entry, ...prev].slice(0, 50))
    setNextLogId(id => id + 1)
    setNotice(parsed.completo
      ? 'Cenário aprovado na simulação. Nenhuma reserva real foi criada.'
      : 'Cenário com déficit identificado. A tela de OP é apenas uma prévia; nenhuma OP real foi criada.')
    setShowOpModal(!parsed.completo)
  }

  function resetar() {
    setPedidoNum('3589')
    setCliente('ENERSYS')
    setCodigoInterno('30267')
    setDescricao('CP03698-Conector Flexivel Inj.OPZ 50x1000')
    setQtdPedido('100')
    setQtdEstoque('1')
    setQtdJaReservada('0')
    setShowOpModal(false)
    setNotice('')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased md:p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-wrap items-center gap-3 rounded-[3px] border border-[#CFE1E7] border-l-4 border-l-[#E6A34A] bg-white p-4 shadow-xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-[#E6A34A]/30 bg-[#123B50] text-[#E6A34A]"><ShieldCheck size={22}/></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[2px] bg-[#E6A34A]/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">SYSNQRA ENGENHARIA</span>
              <span className="text-[10px] font-bold text-slate-500">• VALIDAÇÃO DE REGRAS DE ESTOQUE</span>
            </div>
            <h1 className="mt-1 text-lg font-black leading-6 md:text-xl">Simulador de Consistência e Roteamento</h1>
            <p className="mt-1 text-[10px] text-amber-800">AMBIENTE DE TESTE — não grava reservas, movimentações ou ordens reais.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-[2px] border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800"><FlaskConical size={12}/> SIMULAÇÃO</span>
        </header>

        {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-[2px] border border-[#CFE1E7] bg-[#EAF6FA] px-3 py-2 text-[11px] text-[#123B50]"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={14}/></button></div>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="space-y-3 rounded-[3px] border border-[#CFE1E7] bg-white p-4 shadow-xl lg:col-span-5">
            <h2 className="mb-3 border-b border-[#CFE1E7] pb-2 text-xs font-black uppercase tracking-wider text-[#176487]">1. Parâmetros do cenário</h2>
            <div className="grid grid-cols-12 items-end gap-2.5">
              <div className="col-span-4"><label className={labelClass}>Pedido PV</label><input value={pedidoNum} onChange={e=>setPedidoNum(e.target.value)} className={inputClass} maxLength={40}/></div>
              <div className="col-span-8"><label className={labelClass}>Cliente de exemplo</label><input value={cliente} onChange={e=>setCliente(e.target.value)} className={inputClass} maxLength={100}/></div>
              <div className="col-span-4"><label className={labelClass}>Código interno</label><input value={codigoInterno} onChange={e=>setCodigoInterno(e.target.value)} className={inputClass} maxLength={50}/></div>
              <div className="col-span-8"><label className={labelClass}>Descrição de exemplo</label><input value={descricao} onChange={e=>setDescricao(e.target.value)} className={inputClass} maxLength={160}/></div>
              <div className="col-span-12 rounded-[2px] border border-[#CFE1E7] bg-[#F8FAFC] p-2 sm:col-span-4"><label className={labelClass}>Quantidade pedida</label><input type="number" min="1" step="1" value={qtdPedido} onChange={e=>setQtdPedido(e.target.value)} className={inputClass}/></div>
              <div className="col-span-12 rounded-[2px] border border-[#CFE1E7] bg-[#F8FAFC] p-2 sm:col-span-4"><label className={labelClass}>Estoque físico</label><input type="number" min="0" step="1" value={qtdEstoque} onChange={e=>setQtdEstoque(e.target.value)} className={inputClass}/></div>
              <div className="col-span-12 rounded-[2px] border border-[#CFE1E7] bg-[#F8FAFC] p-2 sm:col-span-4"><label className={labelClass}>Já reservado</label><input type="number" min="0" step="1" value={qtdJaReservada} onChange={e=>setQtdJaReservada(e.target.value)} className={inputClass}/></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={rodarTesteFluxo} className="inline-flex h-[34px] flex-1 items-center justify-center gap-2 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase text-white hover:bg-[#236F91]"><Play size={14}/> Simular fluxo</button>
              <button type="button" onClick={resetar} className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[2px] border border-[#CFE1E7] px-3 text-[10px] font-black uppercase text-[#123B50] hover:bg-[#EAF6FA]"><RotateCcw size={13}/> Restaurar</button>
            </div>
          </section>

          <section className="space-y-3 lg:col-span-7">
            <article className={'rounded-[3px] border border-l-4 p-4 shadow-xl transition-colors '+(resultado.green?'border-emerald-200 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white':'border-rose-200 border-l-rose-500 bg-gradient-to-br from-rose-50 to-white')}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#123B50]">Resultado da avaliação</span>
                <span className={'rounded-[2px] border px-2.5 py-1 text-[10px] font-black uppercase '+(resultado.green?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-700')}>{resultado.status}</span>
              </div>
              <p className="text-xs font-bold leading-5 text-[#123B50]">{resultado.message}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-[2px] border border-[#CFE1E7] bg-[#F1F5F9] p-3"><div className={labelClass}>Saldo livre calculado</div><div className="text-xl font-black tabular-nums">{fmt(parsed.disponivel)} <span className="text-[10px] text-slate-500">un</span></div></div>
                <div className="rounded-[2px] border border-[#CFE1E7] bg-[#F1F5F9] p-3"><div className={labelClass}>Reserva simulada</div><div className="text-xl font-black tabular-nums text-emerald-700">{fmt(parsed.reservar)} <span className="text-[10px] text-slate-500">un</span></div></div>
                <div className="rounded-[2px] border border-[#CFE1E7] bg-[#F1F5F9] p-3"><div className={labelClass}>Falta para OP</div><div className={'text-xl font-black tabular-nums '+(parsed.falta>0?'text-rose-700':'text-emerald-700')}>{fmt(parsed.falta)} <span className="text-[10px] text-slate-500">un</span></div></div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-[#CFE1E7] pt-3 text-[10px] font-black uppercase text-[#123B50]">{resultado.green?<CheckCircle2 size={15} className="text-emerald-700"/>:<AlertTriangle size={15} className="text-rose-700"/>}{resultado.action}</div>
              {!parsed.valid && <p className="mt-2 text-[10px] font-bold text-rose-700">Validação bloqueada: revise os campos de quantidade.</p>}
            </article>

            <article className="rounded-[3px] border border-[#CFE1E7] bg-white p-4">
              <div className="mb-3 flex items-center gap-2"><Database size={15} className="text-[#176487]"/><h2 className="text-[10px] font-black uppercase tracking-wider">2. Regras que o teste verifica</h2></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[2px] border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-2 text-[10px] font-black text-emerald-700"><CheckCircle2 size={13}/> SALDO SUFICIENTE</div><p className="mt-1 text-[10px] leading-4 text-[#123B50]">Saldo livre = estoque físico − reserva já existente. Reserva simulada nunca supera a demanda nem o saldo livre.</p></div>
                <div className="rounded-[2px] border border-rose-200 bg-rose-50 p-3"><div className="flex items-center gap-2 text-[10px] font-black text-rose-700"><AlertTriangle size={13}/> SALDO INSUFICIENTE</div><p className="mt-1 text-[10px] leading-4 text-[#123B50]">A falta calculada permanece bloqueada para faturamento e segue para análise de OP; não cria ordem automaticamente neste simulador.</p></div>
              </div>
              <p className="mt-3 text-[9px] leading-4 text-amber-800">Importante: os valores são dados de teste editáveis. Para produção, o cálculo e a reserva devem ser validados no PostgreSQL por operação transacional e autorização da empresa autenticada.</p>
            </article>
          </section>
        </div>

        <section className="rounded-[3px] border border-[#CFE1E7] bg-white p-4 shadow-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><ClipboardCheck size={15} className="text-[#176487]"/><h2 className="text-[10px] font-black uppercase tracking-wider">Log local de simulação</h2><span className="rounded-[2px] bg-slate-200 px-1.5 py-0.5 text-[9px]">{logs.length}</span></div>
            <button type="button" onClick={()=>setLogs([])} disabled={logs.length===0} className="h-[28px] rounded-[2px] border border-[#CFE1E7] px-2 text-[9px] font-black uppercase text-[#123B50] disabled:opacity-40">Limpar logs</button>
          </div>
          {logs.length===0 ? <p className="rounded-[2px] border border-dashed border-[#CFE1E7] p-4 text-center text-[10px] text-slate-500">Nenhum teste executado nesta sessão. Os logs ficam apenas na memória desta tela.</p> : <div className="space-y-2">{logs.map(log=><div key={log.id} className={'rounded-[2px] border p-3 text-[10px] leading-5 '+(log.type==='ok'?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-amber-200 bg-amber-50 text-amber-800')}><span className="mr-2 font-black">[{log.time}]</span>{log.text}</div>)}</div>}
        </section>
      </div>

      {showOpModal && <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/70 p-3" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowOpModal(false)}}>
        <section role="dialog" aria-modal="true" aria-labelledby="pcp-flow-modal-title" className="w-full max-w-[560px] rounded-[3px] border border-[#CFE1E7] bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-[#CFE1E7] pb-3"><div className="flex items-center gap-2"><AlertTriangle size={19} className="text-amber-800"/><h2 id="pcp-flow-modal-title" className="text-sm font-black text-[#123B50]">Desvio de fluxo: analisar geração de OP</h2></div><button type="button" onClick={()=>setShowOpModal(false)} aria-label="Fechar modal" className="text-slate-500 hover:text-[#123B50]"><X size={17}/></button></div>
          <p className="mt-3 text-[11px] leading-5 text-[#123B50]">A simulação identificou déficit para o pedido <strong className="text-[#123B50]">PV-{pedidoNum}</strong>, cliente <strong className="text-[#123B50]">{cliente || '—'}</strong>.</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-[2px] bg-[#F8FAFC] p-2"><dt className="text-slate-500">Item</dt><dd className="mt-1 font-bold text-[#123B50]">{codigoInterno} · {descricao || '—'}</dd></div><div className="rounded-[2px] bg-[#F8FAFC] p-2"><dt className="text-slate-500">Quantidade necessária</dt><dd className="mt-1 font-bold text-[#123B50]">{fmt(parsed.falta)} un</dd></div><div className="rounded-[2px] bg-[#F8FAFC] p-2"><dt className="text-slate-500">Estoque físico</dt><dd className="mt-1 font-bold text-[#123B50]">{fmt(parsed.estoque)} un</dd></div><div className="rounded-[2px] bg-[#F8FAFC] p-2"><dt className="text-slate-500">Saldo livre</dt><dd className="mt-1 font-bold text-[#123B50]">{fmt(parsed.disponivel)} un</dd></div></dl>
          <div className="mt-3 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">Prévia somente: nenhuma ordem será criada neste simulador. A criação real deve ocorrer pela tela PCPOrdens, após confirmar o pedido e o item na empresa autenticada.</div>
          <div className="mt-4 flex justify-end"><button type="button" onClick={()=>setShowOpModal(false)} className="h-[30px] rounded-[2px] border border-[#CFE1E7] px-3 text-[10px] font-black uppercase text-[#123B50]">Fechar prévia</button></div>
        </section>
      </div>}
    </main>
  )
}
