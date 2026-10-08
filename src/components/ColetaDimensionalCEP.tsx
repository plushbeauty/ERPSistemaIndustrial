import { useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const SAMPLE_COUNT = 18;

export interface ColetaDimensionalCEPProps {
  limiteSuperior: number;
  limiteInferior: number;
  lote?: string;
  codigoProduto?: string;
  descricaoProduto?: string;
  onAprovar?: (dados: {
    lote?: string;
    codigoProduto?: string;
    valores: number[];
    media: number;
    desvioPadrao: number;
    totalControlado: number;
    numeroDefeituosos: number;
  }) => void;
}

interface AmostraCEP {
  id: number;
  valorMedido: string;
  valorOriginal: string;
}

const criarAmostras = (): AmostraCEP[] =>
  Array.from({ length: SAMPLE_COUNT }, (_, index) => ({
    id: index + 1,
    valorMedido: '',
    valorOriginal: '',
  }));

const parseMedicao = (valor: string): number | null => {
  const normalizado = valor.trim().replace(',', '.');

  if (!normalizado) {
    return null;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
};

const formatarNumero = (valor: number, casas = 3): string =>
  Number.isFinite(valor) ? valor.toFixed(casas) : '—';

export default function ColetaDimensionalCEP({
  limiteSuperior,
  limiteInferior,
  lote,
  codigoProduto,
  descricaoProduto,
  onAprovar,
}: ColetaDimensionalCEPProps) {
  const [amostras, setAmostras] = useState<AmostraCEP[]>(criarAmostras);

  const estatistica = useMemo(() => {
    const valores = amostras
      .map((amostra) => parseMedicao(amostra.valorMedido))
      .filter((valor): valor is number => valor !== null);

    const totalControlado = valores.length;
    const numeroDefeituosos = valores.filter(
      (valor) => valor < limiteInferior || valor > limiteSuperior,
    ).length;

    const media =
      totalControlado > 0
        ? valores.reduce((total, valor) => total + valor, 0) / totalControlado
        : 0;

    const somaQuadrados = valores.reduce(
      (total, valor) => total + (valor - media) ** 2,
      0,
    );

    const desvioPadrao =
      totalControlado > 0 ? Math.sqrt(somaQuadrados / totalControlado) : 0;

    const incompletas = totalControlado < SAMPLE_COUNT;
    const mediaForaDosLimites =
      totalControlado > 0 &&
      (media < limiteInferior || media > limiteSuperior);

    return {
      valores,
      totalControlado,
      numeroDefeituosos,
      media,
      desvioPadrao,
      incompletas,
      mediaForaDosLimites,
    };
  }, [amostras, limiteInferior, limiteSuperior]);

  const loteReprovado =
    estatistica.numeroDefeituosos > 0 || estatistica.mediaForaDosLimites;

  const coletaCompleta = estatistica.totalControlado === SAMPLE_COUNT;

  const podeAprovar =
    coletaCompleta &&
    !loteReprovado &&
    limiteSuperior > limiteInferior;

  const atualizarMedicao = (id: number, valorMedido: string) => {
    setAmostras((atuais) =>
      atuais.map((amostra) => {
        if (amostra.id !== id) {
          return amostra;
        }

        return {
          ...amostra,
          valorMedido,
          valorOriginal:
            amostra.valorOriginal === '' && valorMedido.trim() !== ''
              ? valorMedido
              : amostra.valorOriginal,
        };
      }),
    );
  };

  const limparColeta = () => {
    setAmostras(criarAmostras());
  };

  const aprovarColeta = () => {
    if (!podeAprovar || !onAprovar) {
      return;
    }

    onAprovar({
      lote,
      codigoProduto,
      valores: estatistica.valores,
      media: estatistica.media,
      desvioPadrao: estatistica.desvioPadrao,
      totalControlado: estatistica.totalControlado,
      numeroDefeituosos: estatistica.numeroDefeituosos,
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#1e222b] p-2 text-[#e2e8f0] text-[11px]">
      <header className="mb-2 flex h-8 shrink-0 items-center justify-between border border-[#3a414d] bg-[#252a34] px-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold uppercase tracking-wide text-[#e2e8f0]">
            CONTROLE ESTATÍSTICO DE PROCESSO — CEP
          </span>

          {lote ? (
            <span className="border border-[#46505e] bg-[#1e222b] px-2 py-1 font-mono text-[10px] text-[#cbd5e1]">
              LOTE: {lote}
            </span>
          ) : null}

          {codigoProduto ? (
            <span className="border border-[#46505e] bg-[#1e222b] px-2 py-1 font-mono text-[10px] text-[#cbd5e1]">
              PRODUTO: {codigoProduto}
            </span>
          ) : null}

          {descricaoProduto ? (
            <span className="truncate text-[10px] text-[#94a3b8]">
              {descricaoProduto}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
          <span className="border border-[#46505e] bg-[#1e222b] px-2 py-1">
            LIE <strong>{limiteInferior.toFixed(2)}</strong>
          </span>
          <span className="border border-[#46505e] bg-[#1e222b] px-2 py-1">
            LSE <strong>{limiteSuperior.toFixed(2)}</strong>
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto border border-[#3a414d] bg-[#20252e]">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[#2b313c] text-[9px] uppercase tracking-wide text-[#cbd5e1]">
            <tr className="h-7">
              <th className="w-[54px] border border-[#3a414d] px-1 text-center font-semibold">
                Amostra
              </th>
              <th className="w-[135px] border border-[#3a414d] px-1 text-left font-semibold">
                Valor Original
              </th>
              <th className="w-[155px] border border-[#3a414d] px-1 text-left font-semibold">
                Valor Medido
              </th>
              <th className="w-[110px] border border-[#3a414d] px-1 text-center font-semibold">
                Avaliação
              </th>
              <th className="w-[145px] border border-[#3a414d] px-1 text-left font-semibold">
                Classe do Defeito
              </th>
              <th className="border border-[#3a414d] px-1 text-left font-semibold">
                Limites / Resultado
              </th>
            </tr>
          </thead>

          <tbody className="font-mono text-[10px]">
            {amostras.map((amostra) => {
              const valor = parseMedicao(amostra.valorMedido);
              const preenchido = valor !== null;
              const defeituoso =
                preenchido &&
                (valor < limiteInferior || valor > limiteSuperior);

              const classeLinha = defeituoso
                ? 'bg-[#3a2024]'
                : preenchido
                  ? 'bg-[#202b27]'
                  : 'bg-[#20252e]';

              return (
                <tr
                  key={amostra.id}
                  className={`h-8 border-b border-[#343b47] ${classeLinha}`}
                >
                  <td className="border-r border-[#343b47] px-1 text-center font-semibold text-[#cbd5e1]">
                    {String(amostra.id).padStart(2, '0')}
                  </td>

                  <td className="border-r border-[#343b47] px-1 text-[#94a3b8]">
                    {amostra.valorOriginal || '—'}
                  </td>

                  <td className="border-r border-[#343b47] p-0.5">
                    <input
                      aria-label={`Valor medido da amostra ${amostra.id}`}
                      value={amostra.valorMedido}
                      onChange={(event) =>
                        atualizarMedicao(amostra.id, event.target.value)
                      }
                      inputMode="decimal"
                      placeholder="0,000"
                      className={[
                        'h-7 w-full rounded-[2px] border px-2',
                        'border-[#505966] bg-[#171b22] text-right font-mono text-[11px]',
                        'text-[#f1f5f9] outline-none transition-none',
                        'focus:border-[#48b7c7] focus:ring-0',
                        defeituoso
                          ? 'border-[#d65b61] bg-[#351f23] text-[#fecaca]'
                          : '',
                      ].join(' ')}
                    />
                  </td>

                  <td className="border-r border-[#343b47] px-1">
                    {preenchido ? (
                      <div
                        className={[
                          'flex items-center justify-center gap-1 font-semibold uppercase',
                          defeituoso ? 'text-[#ef6a70]' : 'text-[#4fc38b]',
                        ].join(' ')}
                      >
                        {defeituoso ? (
                          <XCircle size={15} strokeWidth={2.2} />
                        ) : (
                          <CheckCircle size={15} strokeWidth={2.2} />
                        )}
                        <span>{defeituoso ? 'Fora' : 'OK'}</span>
                      </div>
                    ) : (
                      <span className="block text-center text-[#64748b]">—</span>
                    )}
                  </td>

                  <td className="border-r border-[#343b47] px-1">
                    <span
                      className={
                        defeituoso
                          ? 'font-semibold uppercase text-[#ef6a70]'
                          : preenchido
                            ? 'font-semibold uppercase text-[#4fc38b]'
                            : 'text-[#64748b]'
                      }
                    >
                      {defeituoso
                        ? 'Defeituoso'
                        : preenchido
                          ? 'Aprovado'
                          : 'Pendente'}
                    </span>
                  </td>

                  <td className="px-1 text-[9px] text-[#94a3b8]">
                    {preenchido
                      ? `${valor.toFixed(3)} | LIE ${limiteInferior.toFixed(2)} | LSE ${limiteSuperior.toFixed(2)}`
                      : `LIE ${limiteInferior.toFixed(2)} | LSE ${limiteSuperior.toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="mt-2 shrink-0 border border-[#3a414d] bg-[#252a34]">
        <div className="grid grid-cols-2 gap-px bg-[#3a414d] md:grid-cols-4">
          <div className="bg-[#20252e] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wide text-[#94a3b8]">
              Total Controlado
            </div>
            <div className="mt-0.5 font-mono text-[14px] font-semibold text-[#e2e8f0]">
              {estatistica.totalControlado}/{SAMPLE_COUNT}
            </div>
          </div>

          <div className="bg-[#20252e] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wide text-[#94a3b8]">
              Número de Defeituosos
            </div>
            <div
              className={[
                'mt-0.5 font-mono text-[14px] font-semibold',
                estatistica.numeroDefeituosos > 0
                  ? 'text-[#ef6a70]'
                  : 'text-[#4fc38b]',
              ].join(' ')}
            >
              {estatistica.numeroDefeituosos}
            </div>
          </div>

          <div className="bg-[#20252e] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wide text-[#94a3b8]">
              Média Dimensional (ValMéd/s)
            </div>
            <div className="mt-0.5 font-mono text-[14px] font-semibold text-[#e2e8f0]">
              {estatistica.totalControlado > 0
                ? formatarNumero(estatistica.media)
                : '—'}
            </div>
          </div>

          <div className="bg-[#20252e] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wide text-[#94a3b8]">
              Desvio Padrão
            </div>
            <div className="mt-0.5 font-mono text-[14px] font-semibold text-[#e2e8f0]">
              {estatistica.totalControlado > 0
                ? formatarNumero(estatistica.desvioPadrao)
                : '—'}
            </div>
          </div>
        </div>

        <div className="flex min-h-9 items-center justify-between gap-2 border-t border-[#3a414d] px-2 py-1.5">
          <div className="min-w-0">
            {loteReprovado ? (
              <div className="border border-[#8f3f46] bg-[#351f23] px-2 py-1 text-[10px] font-semibold uppercase text-[#ff8b91]">
                LOTE REJEITADO - SEGREGE E EMITA RPNC
              </div>
            ) : estatistica.mediaForaDosLimites ? (
              <div className="border border-[#8f3f46] bg-[#351f23] px-2 py-1 text-[10px] font-semibold uppercase text-[#ff8b91]">
                LOTE REJEITADO - SEGREGE E EMITA RPNC
              </div>
            ) : estatistica.incompletas ? (
              <span className="text-[9px] uppercase text-[#94a3b8]">
                Aguardando coleta das 18 amostras.
              </span>
            ) : (
              <span className="text-[9px] font-semibold uppercase text-[#4fc38b]">
                CEP dentro dos limites — coleta apta para aprovação.
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={limparColeta}
              className="h-7 rounded-[2px] border border-[#505966] bg-[#2b313c] px-3 text-[9px] font-semibold uppercase text-[#cbd5e1] hover:bg-[#343b47]"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={aprovarColeta}
              disabled={!podeAprovar}
              className="h-7 rounded-[2px] border border-[#347e61] bg-[#28694f] px-3 text-[9px] font-semibold uppercase text-white disabled:cursor-not-allowed disabled:border-[#454b55] disabled:bg-[#303640] disabled:text-[#64748b]"
            >
              Aprovar Coleta
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
