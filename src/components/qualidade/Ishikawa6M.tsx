import { useState } from 'react'
import { AlertCircle, HelpCircle, Plus, X } from 'lucide-react'

export interface IshikawaData {
  Metodo: string[]
  Maquina: string[]
  Medida: string[]
  MeioAmbiente: string[]
  MaoDeObra: string[]
  Material: string[]
}

interface Ishikawa6MProps {
  dados: IshikawaData
  onDadosAlterados: (novosDados: IshikawaData) => void
}

const categorias: { key: keyof IshikawaData; label: string; dica: string }[] = [
  { key: 'Metodo', label: 'Método', dica: 'Procedimentos, instruções de trabalho ou fluxos incorretos.' },
  { key: 'Maquina', label: 'Máquina', dica: 'Falhas em equipamentos, manutenção ou quebras.' },
  { key: 'Medida', label: 'Medida', dica: 'Instrumentos descalibrados, inspeção ou métricas incorretas.' },
  { key: 'MeioAmbiente', label: 'Meio ambiente', dica: 'Temperatura, umidade, poeira ou iluminação.' },
  { key: 'MaoDeObra', label: 'Mão de obra', dica: 'Treinamento, carga de trabalho ou erro operacional.' },
  { key: 'Material', label: 'Material', dica: 'Matéria-prima fora da especificação ou insumos defeituosos.' },
]

const EMPTY: IshikawaData = { Metodo: [], Maquina: [], Medida: [], MeioAmbiente: [], MaoDeObra: [], Material: [] }

export default function Ishikawa6M({ dados, onDadosAlterados }: Ishikawa6MProps) {
  const [mSelecionado, setMSelecionado] = useState<keyof IshikawaData | null>(null)
  const [novaCausa, setNovaCausa] = useState('')
  const normalizados: IshikawaData = {
    Metodo: Array.isArray(dados?.Metodo) ? dados.Metodo : EMPTY.Metodo,
    Maquina: Array.isArray(dados?.Maquina) ? dados.Maquina : EMPTY.Maquina,
    Medida: Array.isArray(dados?.Medida) ? dados.Medida : EMPTY.Medida,
    MeioAmbiente: Array.isArray(dados?.MeioAmbiente) ? dados.MeioAmbiente : EMPTY.MeioAmbiente,
    MaoDeObra: Array.isArray(dados?.MaoDeObra) ? dados.MaoDeObra : EMPTY.MaoDeObra,
    Material: Array.isArray(dados?.Material) ? dados.Material : EMPTY.Material,
  }

  const adicionarCausa = () => {
    if (!mSelecionado || !novaCausa.trim()) return
    onDadosAlterados({ ...normalizados, [mSelecionado]: [...normalizados[mSelecionado], novaCausa.trim()] })
    setNovaCausa('')
    setMSelecionado(null)
  }

  const removerCausa = (categoria: keyof IshikawaData, index: number) => {
    onDadosAlterados({ ...normalizados, [categoria]: normalizados[categoria].filter((_, i) => i !== index) })
  }

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
    <header><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><AlertCircle size={16} className="text-amber-600" /> Análise de causa raiz · Ishikawa 6M</h3><p className="mt-1 text-xs text-slate-500">Selecione cada categoria para registrar causas potenciais.</p></header>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {categorias.map(cat => <article key={cat.key} className="flex min-h-32 flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div><h4 className="border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">{cat.label}</h4><ul className="mt-2 space-y-1">
          {normalizados[cat.key].map((causa, index) => <li key={`${causa}-${index}`} className="flex items-start gap-2 rounded bg-white px-2 py-1 text-xs text-slate-700"><span className="min-w-0 flex-1 break-words">{causa}</span><button type="button" aria-label={`Remover causa de ${cat.label}`} onClick={() => removerCausa(cat.key, index)} className="shrink-0 text-slate-400 hover:text-red-600"><X size={13} /></button></li>)}
        </ul></div>
        <button type="button" onClick={() => setMSelecionado(cat.key)} className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-sky-700 hover:text-sky-900"><Plus size={13} /> Adicionar causa</button>
      </article>)}
    </div>
    {mSelecionado && <div role="dialog" aria-modal="true" aria-labelledby="ishikawa-modal-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form onSubmit={event => { event.preventDefault(); adicionarCausa() }} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h4 id="ishikawa-modal-title" className="text-sm font-bold text-slate-900">Causa · {categorias.find(cat => cat.key === mSelecionado)?.label}</h4><p className="mt-1 flex gap-1 text-xs text-slate-500"><HelpCircle size={14} className="shrink-0 text-sky-600" />{categorias.find(cat => cat.key === mSelecionado)?.dica}</p></div><button type="button" onClick={() => setMSelecionado(null)} aria-label="Fechar" className="text-slate-500 hover:text-slate-900"><X size={16} /></button></div>
        <input autoFocus value={novaCausa} onChange={event => setNovaCausa(event.target.value)} placeholder="Descreva o fator gerador" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-sky-500" />
        <div className="flex justify-end gap-2"><button type="button" onClick={() => { setMSelecionado(null); setNovaCausa('') }} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">Cancelar</button><button type="submit" disabled={!novaCausa.trim()} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white disabled:opacity-40">Vincular causa</button></div>
      </form>
    </div>}
  </section>
}
