import { useState } from 'react';
import { Activity, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';

export interface FichaMouraAGMDados {
  modelo: 'Moura VRLA AGM';
  tensao_medida: number;
  inspecao_visual: 'APROVADO' | 'REPROVADO';
  lote: string;
}

interface FichaMouraAGMProps {
  onValidacaoConcluida: (dadosFicha: FichaMouraAGMDados, exigeQuarentena: boolean) => void;
}

export default function FichaMouraAGM({ onValidacaoConcluida }: FichaMouraAGMProps) {
  const [tensao, setTensao] = useState('12.6');
  const [inspecaoVisual, setInspecaoVisual] = useState<FichaMouraAGMDados['inspecao_visual']>('APROVADO');
  const [lote, setLote] = useState('');

  const tensaoNumerica = Number(tensao);
  const tensaoValida = tensao.trim() !== '' && Number.isFinite(tensaoNumerica) && tensaoNumerica >= 0;
  const precisaDeQuarentena = !tensaoValida || tensaoNumerica < 12.2 || inspecaoVisual === 'REPROVADO';

  const validar = () => {
    if (!lote.trim() || !tensaoValida) return;
    onValidacaoConcluida({
      modelo: 'Moura VRLA AGM',
      tensao_medida: tensaoNumerica,
      inspecao_visual: inspecaoVisual,
      lote: lote.trim(),
    }, precisaDeQuarentena);
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <header className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Activity className="h-5 w-5 text-sky-700" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ficha técnica — Moura VRLA AGM</h3>
          <p className="text-xs text-slate-500">Inspeção visual e medição de tensão para avaliação de conformidade.</p>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">Código do lote
          <input required value={lote} onChange={event => setLote(event.target.value)} placeholder="Código real do lote" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-600" />
        </label>
        <label className="text-xs font-semibold text-slate-700">Tensão medida (V)
          <input required type="number" min="0" step="0.1" value={tensao} onChange={event => setTensao(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-600" />
        </label>
        <label className="text-xs font-semibold text-slate-700">Inspeção visual
          <select value={inspecaoVisual} onChange={event => setInspecaoVisual(event.target.value as FichaMouraAGMDados['inspecao_visual'])} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-600">
            <option value="APROVADO">Aprovado — sem trincas/vazamentos</option>
            <option value="REPROVADO">Reprovado — dano/vazamento</option>
          </select>
        </label>
      </div>
      {lote.trim() && (
        <div role="status" className={precisaDeQuarentena ? 'flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800' : 'flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800'}>
          {precisaDeQuarentena ? <Lock size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
          <div><strong className="block">{precisaDeQuarentena ? 'Desvio detectado — requer avaliação e segregação' : 'Parâmetros preliminarmente conformes'}</strong>
            {precisaDeQuarentena
              ? 'A ficha sinaliza necessidade de quarentena. A gravação e o bloqueio efetivo do lote precisam ser confirmados pela transação segura do servidor.'
              : 'Nenhum desvio foi identificado pelos limites configurados nesta ficha.'}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={validar} disabled={!lote.trim() || !tensaoValida} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-800 px-4 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">
          <ShieldAlert size={15} /> Validar parâmetros
        </button>
      </div>
    </section>
  );
}
