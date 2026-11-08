/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-METROLOGIA-VENCIMENTO-20261108-01
 * @STATUS_APROVACAO: INCREMENTO ADITIVO AUTORIZADO PELA ORDEM DE 2026-11-08 ("melhorar tudo ... ver o que falta
 * fazer e ajustar"). Não edita as telas travadas por hash: a faixa é montada ao lado delas, na rota.
 *
 * Faixa de vencimento metrológico. A referência de prazo é o relógio do Postgres (erp_data_servidor); se o
 * banco não responder, a faixa não aparece — melhor silêncio do que data errada na bancada.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import { relogioDoServidor } from '../../lib/serverClock'

type Instrumento = {
  id: string
  codigo: string
  status: string | null
  proxima_calibracao: string | null
}

const JANELA_AVISO_DIAS = 30
const LIMITE_LISTA = 6

function diaEmUtc(valor: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  if (!partes) return null
  return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
}

function listar(itens: Instrumento[], comData = true): string {
  const visiveis = itens.slice(0, LIMITE_LISTA).map(item =>
    comData && item.proxima_calibracao ? `${item.codigo} (${item.proxima_calibracao})` : item.codigo,
  )
  const restantes = itens.length - visiveis.length
  return visiveis.join(' · ') + (restantes > 0 ? ` · +${restantes}` : '')
}

export default function MetrologiaVencimentoAlerta() {
  const [vencidos, setVencidos] = useState<Instrumento[]>([])
  const [aVencer, setAVencer] = useState<Instrumento[]>([])
  const [semData, setSemData] = useState<Instrumento[]>([])
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const relogio = await relogioDoServidor()
      if (!relogio.agora) return
      const hoje = diaEmUtc(relogio.agora.toISOString())
      if (hoje === null) return
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) return
      const linhas = await fetchAllPages<Instrumento>((from, to) => supabase
        .from('erp_equipamentos_medicao')
        .select('id,codigo,status,proxima_calibracao', { count: 'exact' })
        .eq('empresa_id', empresa.data)
        .order('proxima_calibracao')
        .range(from, to))
      if (!ativo) return
      const atrasados: Instrumento[] = []
      const proximos: Instrumento[] = []
      const semAgenda: Instrumento[] = []
      for (const linha of linhas) {
        if (String(linha.status ?? '').trim().toUpperCase() === 'INATIVO') continue
        const dia = linha.proxima_calibracao ? diaEmUtc(linha.proxima_calibracao) : null
        if (dia === null) {
          semAgenda.push(linha)
          continue
        }
        const dias = Math.round((dia - hoje) / 86400000)
        if (dias < 0) atrasados.push(linha)
        else if (dias <= JANELA_AVISO_DIAS) proximos.push(linha)
      }
      setVencidos(atrasados)
      setAVencer(proximos)
      setSemData(semAgenda)
      setPronto(true)
    }
    void carregar().catch(() => undefined)
    return () => { ativo = false }
  }, [])

  if (!pronto || (!vencidos.length && !aVencer.length && !semData.length)) return null
  const critico = vencidos.length > 0
  const alerta = critico || aVencer.length > 0

  return (
    <div className="px-3 pt-3 print:hidden">
      <section
        role={critico ? 'alert' : 'status'}
        aria-live={critico ? 'assertive' : 'polite'}
        className={`flex flex-wrap items-start gap-2 rounded-[2px] border px-2 py-1.5 text-[11px] leading-[1.45] ${
          critico
            ? 'border-rose-300 bg-rose-50 text-rose-900'
            : alerta
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}
      >
        <span className="inline-flex items-center gap-1 pt-[1px] text-[9px] font-bold uppercase tracking-[.05em]">
          {critico ? <AlertTriangle size={13} aria-hidden="true" /> : <CalendarClock size={13} aria-hidden="true" />}
          Metrologia
        </span>
        <div className="min-w-0 flex-1">
          {critico && (
            <p>
              <strong>{vencidos.length} instrumento(s) com calibração vencida</strong>
              <span className="block font-mono text-[10px]">{listar(vencidos)}</span>
            </p>
          )}
          {aVencer.length > 0 && (
            <p className={critico ? 'mt-1' : undefined}>
              <strong>{aVencer.length} instrumento(s) vencem em até {JANELA_AVISO_DIAS} dias</strong>
              <span className="block font-mono text-[10px]">{listar(aVencer)}</span>
            </p>
          )}
          {semData.length > 0 && (
            <p className={critico || aVencer.length > 0 ? 'mt-1' : undefined}>
              <strong>{semData.length} instrumento(s) sem próxima calibração agendada</strong>
              <span className="block font-mono text-[10px]">{listar(semData, false)}</span>
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
