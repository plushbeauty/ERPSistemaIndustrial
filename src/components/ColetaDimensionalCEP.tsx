import { useMemo, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

const SAMPLE_COUNT = 18

export interface ColetaDimensionalCEPProps {
  limiteSuperior: number
  limiteInferior: number
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
  }) => void
}

interface AmostraCEP {
  id: number
  valorMedido: string
  valorOriginal: string
}

const criarAmostras = (): AmostraCEP[] =>
  Array.from({ length: SAMPLE_COUNT }, (_, index) => ({
    id: index + 1,
    valorMedido: '',
    valorOriginal: '',
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
  'h-7 w-full rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal text-slate-200 outline-none focus:border-[#48b7c7]'

const labelClass =
  'mb-0.5 block text-[11px] font-semibold text-gray-400 uppercase tracking-wider'

export default function ColetaDimensionalCEP({
  limiteSuperior,
  limiteInferior,
  lote,
  codigoProduto,
  descricaoProduto,
  onRegistrar,
}: ColetaDimensionalCEPProps) {
  const [amostras, setAmostras] = useState<AmostraCEP[]>(criarAmostras)

  const estatistica = useMemo(() => {
    const valores = amostras
      .map((amostra) => parseMedicao(amostra.valorMedido))
      .filter((valor): valor is number => valor !== null)

    const totalControlado = valores.length
    const numeroDefeituosos = valores.filter(
      (valor) => valor < limiteInferior || valor > limiteSuperior,
    ).length

    const media =
      totalControlado > 0
        ? valores.reduce((total, valor) => total + valor, 0) / totalControlado
        : 0

    const variancia =
      totalControlado > 0
        ? valores.reduce((total, valor) => total + (valor - media) ** 2, 0) /
          totalControlado
        : 0

    const mediaForaDosLimites =
      totalControlado > 0 &&
      (media < limiteInferior || media > limiteSuperior)

    return {
      valores,
      totalControlado,
      numeroDefeituosos,
      media,
      desvioPadrao: Math.sqrt(variancia),
      mediaForaDosLimites,
      incompletas: totalControlado < SAMPLE_COUNT,
    }
  }, [amostras, limiteInferior, limiteSuperior])

  const limitesValidos =
    Number.isFinite(limiteInferior) &&
    Number.isFinite(limiteSuperior) &&
    limiteSuperior > limiteInferior

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
      atuais.map((amostra) =>
        amostra.id === id
          ? {
              ...amostra,
              valorMedido,
              valorOriginal:
                amostra.valorOriginal === '' && valorMedido.trim() !== ''
                  ? valorMedido
                  : amostra.valorOriginal,
            }
          : amostra,
      ),
    )
  }

  const atualizarOriginal = (id: number, valorOriginal: string) => {
    setAmostras((atuais) =>
      atuais.map((amostra) =>
        amostra.id === id ? { ...amostra, valorOriginal } : amostra,
      ),
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
    })
  }

  return (
    <section className="min-h-0 w-full space-y-1.5 rounded-[2px] bg-[#1e222b] p-1.5 text-slate-200">
      <header className="grid grid-cols-2 gap-1.5 rounded-[2px] border border-[#3a404c] bg-[#252a34] p-1">
        <div className="min-w-0">
          <div className="text-xs font-bold text-gray-300 uppercase bg-[#252a34] p-1 border-b border-[#3a404c]">
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

      <section className="rounded-[2px] border border-[#3a404c] bg-[#252a34]">
        <div className="text-xs font-bold text-gray-300 uppercase bg-[#252a34] p-1 border-b border-[#3a404c]">
          18 Amostras — Anotação Dimensional
        </div>

        <div className="space-y-1 p-1.5">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_72px_100px] gap-1.5">
            <div className={labelClass}>Nº</div>
            <div className={labelClass}>Valor Original</div>
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
                  'grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_72px_100px] gap-1.5 rounded-[2px] border border-[#3a404c] p-0.5 ' +
                  (defeituoso ? 'bg-[#3a2024]' : 'bg-[#252a34]')
                }
              >
                <div className="flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] px-2 text-xs font-normal text-slate-200">
                  {String(amostra.id).padStart(2, '0')}
                </div>

                <input
                  className={inputClass}
                  value={amostra.valorOriginal}
                  onChange={(event) =>
                    atualizarOriginal(amostra.id, event.target.value)
                  }
                  inputMode="decimal"
                  aria-label={'Valor original da amostra ' + amostra.id}
                />

                <input
                  className={
                    inputClass +
                    (defeituoso ? ' border-[#d65b61] bg-[#3a2024]' : '')
                  }
                  value={amostra.valorMedido}
                  onChange={(event) =>
                    atualizarMedicao(amostra.id, event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0,000"
                  aria-label={'Valor medido da amostra ' + amostra.id}
                />

                <div className="flex h-7 items-center justify-center rounded-[2px] border border-[#3a404c] bg-[#1e222b]">
                  {preenchido ? (
                    defeituoso ? (
                      <XCircle
                        size={15}
                        strokeWidth={2}
                        className="text-[#d65b61]"
                        aria-label="Defeituoso"
                      />
                    ) : (
                      <CheckCircle
                        size={15}
                        strokeWidth={2}
                        className="text-[#3a9d78]"
                        aria-label="Aprovado"
                      />
                    )
                  ) : (
                    <span className="text-xs font-normal text-slate-200">—</span>
                  )}
                </div>

                <div className="flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] px-2 text-xs font-normal text-slate-200">
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

      <section className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        <div className="rounded-[2px] border border-[#3a404c] bg-[#252a34] p-1">
          <label className={labelClass}>Total Controlado</label>
          <div className="flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal text-slate-200">
            {estatistica.totalControlado}/{SAMPLE_COUNT}
          </div>
        </div>

        <div className="rounded-[2px] border border-[#3a404c] bg-[#252a34] p-1">
          <label className={labelClass}>Número de Defeituosos</label>
          <div
            className={
              'flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal ' +
              (estatistica.numeroDefeituosos > 0
                ? 'text-[#d65b61]'
                : 'text-[#3a9d78]')
            }
          >
            {estatistica.numeroDefeituosos}
          </div>
        </div>

        <div className="rounded-[2px] border border-[#3a404c] bg-[#252a34] p-1">
          <label className={labelClass}>Média Dimensional (ValMéd/s)</label>
          <div className="flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal text-slate-200">
            {estatistica.totalControlado > 0
              ? formatarNumero(estatistica.media)
              : '—'}
          </div>
        </div>

        <div className="rounded-[2px] border border-[#3a404c] bg-[#252a34] p-1">
          <label className={labelClass}>Desvio Padrão</label>
          <div className="flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal text-slate-200">
            {estatistica.totalControlado > 0
              ? formatarNumero(estatistica.desvioPadrao)
              : '—'}
          </div>
        </div>
      </section>

      <footer
        className={
          'grid grid-cols-2 gap-1.5 rounded-[2px] border p-1.5 ' +
          (loteReprovado
            ? 'border-[#d65b61] bg-[#252a34]'
            : 'border-[#3a404c] bg-[#252a34]')
        }
      >
        <div className="min-w-0">
          <label className={labelClass}>Status do Lote</label>
          <div
            className={
              'flex h-7 items-center rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal ' +
              (loteReprovado ? 'text-[#d65b61]' : 'text-[#3a9d78]')
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
            className="h-7 rounded-[2px] border border-[#3a404c] bg-[#1e222b] py-0.5 px-2 text-xs font-normal text-slate-200"
          >
            Limpar
          </button>
          <button
            type="button"
            disabled={!podeRegistrar}
            onClick={registrarColeta}
            className="h-7 rounded-[2px] border border-[#3a404c] bg-[#2d8db8] py-0.5 px-2 text-xs font-normal text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Registrar 18 amostras
          </button>
        </div>
      </footer>
    </section>
  )
}
