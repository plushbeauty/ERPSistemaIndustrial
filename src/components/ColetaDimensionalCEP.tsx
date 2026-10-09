import { useMemo, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

const SAMPLE_COUNT = 18

export interface ColetaDimensionalCEPProps {
  limiteSuperior: number
  limiteInferior: number
  nominal: number
  lote?: string
  codigoProduto?: string
  descricaoProduto?: string
  onRegistrar?: (dados: {
    lote?: string
    codigoProduto?: string
    valores: number[]
    media: number
    desvioPadrao: number
    totalControlado: number
    numeroDefeituosos: number
    cp: number | null
    cpl: number | null
    cpu: number | null
    cpk: number | null
    amplitude: number
    amplitudeMovelMedia: number
    limiteControleSuperior: number | null
    limiteControleInferior: number | null
  }) => void
}

interface AmostraCEP {
  id: number
  valorMedido: string
}

const criarAmostras = (): AmostraCEP[] =>
  Array.from({ length: SAMPLE_COUNT }, (_, index) => ({
    id: index + 1,
    valorMedido: '',
  }))

const parseMedicao = (valor: string): number | null => {
  const normalizado = valor.trim().replace(',', '.')
  if (!normalizado) return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : null
}

const formatarNumero = (valor: number): string =>
  Number.isFinite(valor) ? valor.toFixed(3) : '—'

const inputClass =
  'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800 outline-none focus:border-[#2D8DB8]'

const labelClass =
  'mb-[2px] block text-[9px] font-semibold text-slate-500 uppercase tracking-wider'

export default function ColetaDimensionalCEP({
  limiteSuperior,
  limiteInferior,
  nominal,
  lote,
  codigoProduto,
  descricaoProduto,
  onRegistrar,
}: ColetaDimensionalCEPProps) {
  const [amostras, setAmostras] = useState<AmostraCEP[]>(criarAmostras)

  const estatistica = useMemo(() => {
    const leiturasOrdenadas = amostras.map((amostra) => parseMedicao(amostra.valorMedido))
    const valores = leiturasOrdenadas.filter((valor): valor is number => valor !== null)
    const amplitudesMoveis = leiturasOrdenadas.slice(1).flatMap((valorAtual, indice) => {
      const anterior = leiturasOrdenadas[indice]
      return valorAtual !== null && anterior !== null ? [Math.abs(valorAtual - anterior)] : []
    })
    const amplitudeMovelMedia = amplitudesMoveis.length > 0
      ? amplitudesMoveis.reduce((total, valor) => total + valor, 0) / amplitudesMoveis.length
      : 0

    const totalControlado = valores.length
    const numeroDefeituosos = valores.filter(
      (valor) => valor < limiteInferior || valor > limiteSuperior,
    ).length

    const media =
      totalControlado > 0
        ? valores.reduce((total, valor) => total + valor, 0) / totalControlado
        : 0

    const somaQuadrados = valores.reduce((total, valor) => total + (valor - media) ** 2, 0)
    const variancia = totalControlado > 1 ? somaQuadrados / (totalControlado - 1) : 0
    const desvioPadrao = Math.sqrt(variancia)
    // Individuals chart: within-process sigma estimated by moving-range average / d2 (n=2).
    const sigmaDentro = amplitudeMovelMedia / 1.128
    const capacidadeDefinida = totalControlado > 1 && sigmaDentro > 0 && limiteSuperior > limiteInferior
    const cp = capacidadeDefinida ? (limiteSuperior - limiteInferior) / (6 * sigmaDentro) : null
    const cpu = capacidadeDefinida ? (limiteSuperior - media) / (3 * sigmaDentro) : null
    const cpl = capacidadeDefinida ? (media - limiteInferior) / (3 * sigmaDentro) : null
    const cpk = cpu !== null && cpl !== null ? Math.min(cpu, cpl) : null
    const limiteControleSuperior = amplitudeMovelMedia > 0 ? media + 2.66 * amplitudeMovelMedia : null
    const limiteControleInferior = amplitudeMovelMedia > 0 ? media - 2.66 * amplitudeMovelMedia : null
    const mediaForaDosLimites = totalControlado > 0 && (media < limiteInferior || media > limiteSuperior)
    const amplitude = totalControlado > 0 ? Math.max(...valores) - Math.min(...valores) : 0

    return {
      valores,
      totalControlado,
      numeroDefeituosos,
      media,
      desvioPadrao,
      cp,
      cpu,
      cpl,
      cpk,
      amplitude,
      amplitudeMovelMedia,
      limiteControleSuperior,
      limiteControleInferior,
      mediaForaDosLimites,
      incompletas: totalControlado < SAMPLE_COUNT,
    }
  }, [amostras, limiteInferior, limiteSuperior])

  const limitesValidos =
    Number.isFinite(limiteInferior) &&
    Number.isFinite(limiteSuperior) &&
    Number.isFinite(nominal) &&
    limiteSuperior > limiteInferior &&
    nominal >= limiteInferior &&
    nominal <= limiteSuperior

  const loteReprovado =
    !limitesValidos ||
    estatistica.numeroDefeituosos > 0 ||
    estatistica.mediaForaDosLimites

  const podeRegistrar =
    Boolean(onRegistrar) &&
    limitesValidos &&
    estatistica.totalControlado === SAMPLE_COUNT

  const atualizarMedicao = (id: number, valorMedido: string) => {
    setAmostras((atuais) =>
      atuais.map((amostra) => amostra.id === id ? { ...amostra, valorMedido } : amostra),
    )
  }

  const limparColeta = () => {
    setAmostras(criarAmostras())
  }

  const registrarColeta = () => {
    if (!podeRegistrar || !onRegistrar) return

    onRegistrar({
      lote,
      codigoProduto,
      valores: estatistica.valores,
      media: estatistica.media,
      desvioPadrao: estatistica.desvioPadrao,
      totalControlado: estatistica.totalControlado,
      numeroDefeituosos: estatistica.numeroDefeituosos,
      cp: estatistica.cp,
      cpl: estatistica.cpl,
      cpu: estatistica.cpu,
      cpk: estatistica.cpk,
      amplitude: estatistica.amplitude,
      amplitudeMovelMedia: estatistica.amplitudeMovelMedia,
      limiteControleSuperior: estatistica.limiteControleSuperior,
      limiteControleInferior: estatistica.limiteControleInferior,
    })
  }

  return (
    <section className="min-h-0 w-full space-y-2 rounded-[2px] border border-slate-200 bg-white p-2 text-slate-800">
      <header className="grid grid-cols-2 gap-1.5 rounded-[2px] border border-slate-300 bg-slate-50 p-1">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-slate-700 uppercase bg-slate-50 p-1 border-b border-slate-300">
            Controle Estatístico de Processo — CEP
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1">
            <div>
              <label className={labelClass}>Lote</label>
              <input className={inputClass} value={lote ?? ''} readOnly />
            </div>
            <div>
              <label className={labelClass}>Código Produto</label>
              <input
                className={inputClass}
                value={codigoProduto ?? ''}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className={labelClass}>Descrição</label>
            <input
              className={inputClass}
              value={descricaoProduto ?? ''}
              readOnly
            />
          </div>
          <div>
            <label className={labelClass}>Limites</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                className={inputClass}
                value={limiteInferior.toFixed(2)}
                readOnly
                aria-label="Limite inferior"
              />
              <input
                className={inputClass}
                value={limiteSuperior.toFixed(2)}
                readOnly
                aria-label="Limite superior"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[2px] border border-slate-300 bg-slate-50">
        <div className="text-[10px] font-bold text-slate-700 uppercase bg-slate-50 p-1 border-b border-slate-300">
          18 Amostras — Anotação Dimensional
        </div>

        <div className="space-y-1 p-1.5">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_72px_100px] gap-1.5">
            <div className={labelClass}>Nº</div>
            <div className={labelClass}>Nominal</div>
            <div className={labelClass}>Valor Medido</div>
            <div className={labelClass}>Avaliação</div>
            <div className={labelClass}>Classe</div>
          </div>

          {amostras.map((amostra) => {
            const valor = parseMedicao(amostra.valorMedido)
            const preenchido = valor !== null
            const defeituoso =
              preenchido &&
              (valor < limiteInferior || valor > limiteSuperior)

            return (
              <div
                key={amostra.id}
                className={
                  'grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_72px_100px] gap-1.5 rounded-[2px] border border-slate-300 p-0.5 ' +
                  (defeituoso ? 'bg-rose-50' : 'bg-slate-50')
                }
              >
                <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800">
                  {String(amostra.id).padStart(2, '0')}
                </div>

                <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-slate-50 px-2 text-[10px] text-slate-700" aria-label={'Nominal da amostra ' + amostra.id}>
                  {formatarNumero(nominal)}
                </div>

                <input
                  className={
                    inputClass +
                    (defeituoso ? ' border-rose-300 bg-rose-50' : '')
                  }
                  value={amostra.valorMedido}
                  onChange={(event) =>
                    atualizarMedicao(amostra.id, event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0,000"
                  aria-label={'Valor medido da amostra ' + amostra.id}
                />

                <div className="flex h-[30px] items-center justify-center rounded-[2px] border border-slate-300 bg-white">
                  {preenchido ? (
                    defeituoso ? (
                      <XCircle
                        size={15}
                        strokeWidth={2}
                        className="text-rose-700"
                        aria-label="Defeituoso"
                      />
                    ) : (
                      <CheckCircle
                        size={15}
                        strokeWidth={2}
                        className="text-emerald-700"
                        aria-label="Aprovado"
                      />
                    )
                  ) : (
                    <span className="text-[10px] font-normal text-slate-800">—</span>
                  )}
                </div>

                <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800">
                  {defeituoso
                    ? 'Defeituoso'
                    : preenchido
                      ? 'Aprovado'
                      : 'Pendente'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Amostras válidas</label>
          <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white py-0.5 px-2 text-[10px] font-normal text-slate-800">
            {estatistica.totalControlado}/{SAMPLE_COUNT}
          </div>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Número de Defeituosos</label>
          <div
            className={
              'flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white py-0.5 px-2 text-[10px] font-normal ' +
              (estatistica.numeroDefeituosos > 0
                ? 'text-rose-700'
                : 'text-emerald-700')
            }
          >
            {estatistica.numeroDefeituosos}
          </div>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Média amostral</label>
          <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white py-0.5 px-2 text-[10px] font-normal text-slate-800">
            {estatistica.totalControlado > 0
              ? formatarNumero(estatistica.media)
              : '—'}
          </div>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Desvio padrão amostral</label>
          <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800">
            {estatistica.totalControlado > 1 ? formatarNumero(estatistica.desvioPadrao) : '—'}
          </div>
        </div>
        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Cp</label>
          <div className="flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-800">{estatistica.cp === null ? '—' : estatistica.cp.toFixed(3)}</div>
        </div>
        <div className="rounded-[2px] border border-slate-300 bg-slate-50 p-1">
          <label className={labelClass}>Cpk</label>
          <div className={'flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal ' + 'text-slate-800'}>{estatistica.cpk === null ? '—' : estatistica.cpk.toFixed(3)}</div>
        </div>
      </section>

      <footer
        className={
          'grid grid-cols-2 gap-1.5 rounded-[2px] border p-1.5 ' +
          (loteReprovado
            ? 'border-rose-300 bg-slate-50'
            : 'border-slate-300 bg-slate-50')
        }
      >
        <div className="min-w-0">
          <label className={labelClass}>Status do Lote</label>
          <div
            className={
              'flex h-[30px] items-center rounded-[2px] border border-slate-300 bg-white py-0.5 px-2 text-[10px] font-normal ' +
              (loteReprovado ? 'text-rose-700' : 'text-emerald-700')
            }
          >
            {!limitesValidos
              ? 'LIMITES INVÁLIDOS — REVISAR FICHA TÉCNICA'
              : loteReprovado
                ? 'LOTE REJEITADO — SEGREGAR E EMITIR RPNC'
                : estatistica.incompletas
                  ? 'COLETA EM ANDAMENTO'
                  : 'LOTE APROVADO'}
          </div>
        </div>

        <div className="flex items-end justify-end gap-1.5">
          <button
            type="button"
            onClick={limparColeta}
            className="h-[30px] rounded-[2px] border border-slate-300 bg-white py-0.5 px-2 text-[10px] font-normal text-slate-800"
          >
            Limpar
          </button>
          <button
            type="button"
            disabled={!podeRegistrar}
            onClick={registrarColeta}
            className="h-[30px] rounded-[2px] border border-slate-300 bg-[#2D8DB8] py-0.5 px-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Registrar 18 amostras
          </button>
        </div>
      </footer>
    </section>
  )
}
