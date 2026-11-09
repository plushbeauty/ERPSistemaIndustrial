/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-METROLOGIA-VENCIMENTO-20261108-02 — vazio explícito, falha de leitura visível e ordenação por criticidade
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
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const relogio = await relogioDoServidor()
        if (!relogio.agora) throw new Error('Relógio do servidor indisponível; não foi possível validar os vencimentos.')
        const hoje = diaEmUtc(relogio.agora.toISOString())
        if (hoje === null) throw new Error('Data do servidor inválida para a conferência metrológica.')
        const empresa = await supabase.rpc('erp_current_empresa_id')
        if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa da sessão não identificada.')
        const linhas = await fetchAllPages<Instrumento>((from, to) => supabase
          .from('erp_equipamentos_medicao')
          .select('id,codigo,status,proxima_calibracao', { count: 'exact' })
          .eq('empresa_id', empresa.data)
          .order('proxima_calibracao')
          .range(from, to))
        if (!ativo) return
        const ativos = linhas.filter(linha => String(linha.status ?? '').trim().toUpperCase() !== 'INATIVO')
        const atrasados: Instrumento[] = []
        const proximos: Instrumento[] = []
        const semAgenda: Instrumento[] = []
        for (const linha of ativos) {
          const dia = linha.proxima_calibracao ? diaEmUtc(linha.proxima_calibracao) : null
          if (dia === null) {
            semAgenda.push(linha)
            continue
          }
          const dias = Math.round((dia - hoje) / 86400000)
          if (dias < 0) atrasados.push(linha)
          else if (dias <= JANELA_AVISO_DIAS) proximos.push(linha)
        }
        atrasados.sort((a, b) => String(a.proxima_calibracao).localeCompare(String(b.proxima_calibracao)))
        proximos.sort((a, b) => String(a.proxima_calibracao).localeCompare(String(b.proxima_calibracao)))
        semAgenda.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
        setTotal(ativos.length)
        setVencidos(atrasados)
        setAVencer(proximos)
        setSemData(semAgenda)
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao consultar os instrumentos no Supabase.')
      } finally {
        if (ativo) setPronto(true)
      }
    }
    void carregar()
    return () => { ativo = false }
  }, [])

  if (!pronto) return null
  const critico = vencidos.length > 0
  const alerta = critico || aVencer.length > 0
  const semPendencias = !critico && !aVencer.length && !semData.length

  return (
    <div className="px-3 pt-3 print:hidden">
      {erro ? (
        <section role="alert" aria-live="assertive" className="flex items-start gap-2 rounded-[2px] border border-rose-300 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-900">
          <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div><strong>Metrologia: consulta não concluída</strong><p>{erro}</p></div>
        </section>
      ) : semPendencias ? (
        <section role="status" aria-live="polite" className="flex items-center gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-900">
          <CalendarClock size={13} aria-hidden="true" />
          {total === 0
            ? 'Nenhum instrumento ativo cadastrado para controle metrológico.'
            : `Nenhum vencimento pendente: ${total} instrumento(s) ativo(s) conferido(s) no Supabase.`}
        </section>
      ) : (
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
      )}
    </div>
  )
}
