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

  const grafico = useMemo(() => {
    if (!limitesValidos) return null
    const leituras = amostras.map(amostra => parseMedicao(amostra.valorMedido))
    const validas = leituras.filter((valor): valor is number => valor !== null)
    const candidatos = [
      limiteInferior,
      limiteSuperior,
      ...validas,
      ...(estatistica.limiteControleSuperior === null ? [] : [estatistica.limiteControleSuperior]),
      ...(estatistica.limiteControleInferior === null ? [] : [estatistica.limiteControleInferior]),
    ]
    const minimo = Math.min(...candidatos)
    const maximo = Math.max(...candidatos)
    const amplitude = maximo - minimo || limiteSuperior - limiteInferior
    const minimoGrafico = minimo - amplitude * 0.12
    const maximoGrafico = maximo + amplitude * 0.12
    const width = 720
    const height = 190
    const x = (index: number) => 34 + index * (width - 68) / (SAMPLE_COUNT - 1)
    const y = (value: number) => height - 22 - ((value - minimoGrafico) / (maximoGrafico - minimoGrafico)) * (height - 44)
    const segmentos = leituras.slice(1).flatMap((atual, index) => {
      const anterior = leituras[index]
      return atual !== null && anterior !== null
        ? [{ x1: x(index), y1: y(anterior), x2: x(index + 1), y2: y(atual) }]
        : []
    })
    const pontos = leituras.map((value, index) => value === null ? null : ({
      x: x(index),
      y: y(value),
      value,
      foraEspecificacao: value < limiteInferior || value > limiteSuperior,
    }))
    return {
      width, height, pontos, segmentos,
      yLimiteSuperior: y(limiteSuperior),
      yLimiteInferior: y(limiteInferior),
      yMedia: estatistica.totalControlado > 0 ? y(estatistica.media) : null,
      yUcl: estatistica.limiteControleSuperior === null ? null : y(estatistica.limiteControleSuperior),
      yLcl: estatistica.limiteControleInferior === null ? null : y(estatistica.limiteControleInferior),
      x, y,
    }
  }, [amostras, limitesValidos, limiteInferior, limiteSuperior, estatistica.media, estatistica.totalControlado, estatistica.limiteControleSuperior, estatistica.limiteControleInferior])

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

      <section className="rounded-[2px] border border-slate-300 bg-white p-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-800">Gráfico CEP — indivíduos (I)</h3>
            <p className="text-[9px] text-slate-500">Amostras sequenciais com limites de especificação e limites de controle estimados pela amplitude móvel.</p>
          </div>
          <span className="text-[9px] tabular-nums text-slate-500">{estatistica.totalControlado}/{SAMPLE_COUNT} leituras</span>
        </div>
        {grafico ? <svg viewBox={`0 0 ${grafico.width} ${grafico.height}`} width="100%" role="img" aria-label="Gráfico de controle de indivíduos com medições, limites de especificação e limites de controle">
          {[0, 1, 2, 3].map(index => <line key={index} x1="30" y1={22 + (index + 1) * 29.2} x2="694" y2={22 + (index + 1) * 29.2} stroke="#e2e8f0" strokeWidth="1" />)}
          <line x1="30" y1={grafico.yLimiteSuperior} x2="694" y2={grafico.yLimiteSuperior} stroke="#d65b61" strokeWidth="1.5" strokeDasharray="5 4" />
          <line x1="30" y1={grafico.yLimiteInferior} x2="694" y2={grafico.yLimiteInferior} stroke="#d65b61" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="3" y={grafico.yLimiteSuperior - 3} fontSize="9" fill="#b91c1c">LSE</text>
          <text x="3" y={grafico.yLimiteInferior - 3} fontSize="9" fill="#b91c1c">LIE</text>
          {grafico.yUcl !== null && <><line x1="30" y1={grafico.yUcl} x2="694" y2={grafico.yUcl} stroke="#2D8DB8" strokeWidth="1.25" strokeDasharray="3 3" /><text x="3" y={grafico.yUcl - 3} fontSize="9" fill="#0369a1">LSC</text></>}
          {grafico.yLcl !== null && <><line x1="30" y1={grafico.yLcl} x2="694" y2={grafico.yLcl} stroke="#2D8DB8" strokeWidth="1.25" strokeDasharray="3 3" /><text x="3" y={grafico.yLcl - 3} fontSize="9" fill="#0369a1">LIC</text></>}
          {grafico.yMedia !== null && <><line x1="30" y1={grafico.yMedia} x2="694" y2={grafico.yMedia} stroke="#0f766e" strokeWidth="1.25" /><text x="3" y={grafico.yMedia - 3} fontSize="9" fill="#0f766e">X̄</text></>}
          {grafico.segmentos.map((segmento, index) => <line key={`segment-${index}`} x1={segmento.x1} y1={segmento.y1} x2={segmento.x2} y2={segmento.y2} stroke="#334155" strokeWidth="1.5" />)}
          {grafico.pontos.map((ponto, index) => ponto && <circle key={`point-${index}`} cx={ponto.x} cy={ponto.y} r="3.5" fill={ponto.foraEspecificacao ? '#d65b61' : '#2D8DB8'} stroke="#ffffff" strokeWidth="1" />)}
          {[0, 3, 6, 9, 12, 15, 17].map(index => <text key={`tick-${index}`} x={grafico.x(index)} y={grafico.height - 4} textAnchor="middle" fontSize="9" fill="#64748b">{index + 1}</text>)}
        </svg> : <p className="py-4 text-center text-[10px] text-slate-500">Limites de especificação inválidos. Confira o plano mestre aprovado.</p>}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-600">
          <span><span className="mr-1 inline-block h-2 w-3 bg-rose-600"/>LSE/LIE — especificação</span>
          <span><span className="mr-1 inline-block h-2 w-3 bg-sky-600"/>LSC/LIC — controle I-MR</span>
          <span><span className="mr-1 inline-block h-2 w-3 bg-teal-700"/>X̄ — média</span>
        </div>
        <p className="mt-2 border-t border-slate-200 pt-2 text-[9px] leading-4 text-slate-500">Cp/Cpk estimados pela amplitude móvel média (σ dentro = MR̄/1,128). Os índices não substituem a verificação de estabilidade do processo nem os critérios específicos do cliente.</p>
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
