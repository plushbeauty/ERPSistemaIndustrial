import { useState } from 'react'
import { Calendar, CheckCircle2, Lock, ShieldAlert } from 'lucide-react'

interface VerificacaoEficaciaProps {
  dataAberturaRpnc: string
  prazoSalvoDias?: 30 | 60
  dataVerificacaoSalva?: string | null
  parecerSalvo?: string | null
  aprovadaSalva?: boolean | null
  onSalvarEficacia: (prazoDias: 30 | 60, dataVerificacao: string, parecer: string, aprovado: boolean) => Promise<void> | void
}

function dateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function VerificacaoEficacia({ dataAberturaRpnc, prazoSalvoDias, dataVerificacaoSalva, parecerSalvo, aprovadaSalva, onSalvarEficacia }: VerificacaoEficaciaProps) {
  const [prazoSelecionado, setPrazoSelecionado] = useState<30 | 60>(prazoSalvoDias ?? 30)
  const [parecer, setParecer] = useState(parecerSalvo ?? '')
  const [aprovado, setAprovado] = useState<boolean | null>(aprovadaSalva ?? null)
  const [salvando, setSalvando] = useState(false)
  const abertura = new Date(dataAberturaRpnc)
  const dataBase = Number.isNaN(abertura.getTime()) ? new Date() : abertura
  const dataLiberacao = new Date(dataBase)
  dataLiberacao.setDate(dataLiberacao.getDate() + prazoSelecionado)
  const hoje = new Date()
  const bloqueadoPeloPrazo = hoje < dataLiberacao
  const diasRestantes = Math.max(0, Math.ceil((dataLiberacao.getTime() - hoje.getTime()) / 86400000))

  const confirmar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (bloqueadoPeloPrazo || aprovado === null || !parecer.trim() || salvando) return
    setSalvando(true)
    try {
      await onSalvarEficacia(prazoSelecionado, dataVerificacaoSalva ?? dateOnly(dataLiberacao), parecer.trim(), aprovado)
    } finally {
      setSalvando(false)
    }
  }

  return <form onSubmit={confirmar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Calendar size={16} className="text-emerald-600" /> Verificação de eficácia</h3><p className="mt-1 text-xs text-slate-500">A avaliação só pode ser confirmada após o período de observação.</p></div>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-bold"><button type="button" onClick={() => setPrazoSelecionado(30)} aria-pressed={prazoSelecionado === 30} className={`rounded px-3 py-1.5 ${prazoSelecionado === 30 ? 'bg-sky-700 text-white' : 'text-slate-600'}`}>30 dias</button><button type="button" onClick={() => setPrazoSelecionado(60)} aria-pressed={prazoSelecionado === 60} className={`rounded px-3 py-1.5 ${prazoSelecionado === 60 ? 'bg-sky-700 text-white' : 'text-slate-600'}`}>60 dias</button></div>
    </header>
    <div role="status" className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${bloqueadoPeloPrazo ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
      {bloqueadoPeloPrazo ? <Lock size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
      <div><strong className="block">{bloqueadoPeloPrazo ? 'Encerramento bloqueado pelo período de observação' : 'Período de observação concluído'}</strong>{bloqueadoPeloPrazo ? `Prazo até ${dataLiberacao.toLocaleDateString('pt-BR')} · ${diasRestantes} dia(s) restante(s).` : `Avaliação liberada desde ${dataLiberacao.toLocaleDateString('pt-BR')}.`}</div>
    </div>
    <label className="block text-xs font-semibold text-slate-700">Parecer técnico da auditoria<textarea required disabled={bloqueadoPeloPrazo} value={parecer} onChange={event => setParecer(event.target.value)} placeholder="Registre evidências que demonstrem se a falha voltou a ocorrer..." className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-500 disabled:bg-slate-100" /></label>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" disabled={bloqueadoPeloPrazo} onClick={() => setAprovado(true)} className={`h-10 rounded-lg border text-xs font-bold disabled:opacity-40 ${aprovado === true ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Ações eficazes · encerrar</button><button type="button" disabled={bloqueadoPeloPrazo} onClick={() => setAprovado(false)} className={`h-10 rounded-lg border text-xs font-bold disabled:opacity-40 ${aprovado === false ? 'border-red-700 bg-red-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}><ShieldAlert size={14} className="mr-1 inline" /> Ações ineficazes · reabrir</button></div>
    <button type="submit" disabled={bloqueadoPeloPrazo || aprovado === null || !parecer.trim() || salvando} className="h-10 w-full rounded-lg bg-sky-800 px-4 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">{salvando ? 'Salvando…' : 'Confirmar avaliação de eficácia'}</button>
  </form>
}
