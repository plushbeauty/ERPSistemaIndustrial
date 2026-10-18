import { useEffect, useMemo, useState } from 'react'
import { HelpCircle, Search, Send, ShieldCheck, Cpu, ShoppingCart, Wrench, Printer, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Message = { id: string; sender: 'user' | 'assistant'; text: string; created_at?: string }
type SupportRow = { id: string; usuario_id: string; pergunta: string; resposta_gerada: string; modulo_relacionado: string | null; created_at: string }
type SessionProfile = { id: string; empresa_id: string }

const topics = [
  { label: 'Vendas / Pedido', value: 'Como preencher um pedido de venda?', icon: ShoppingCart },
  { label: 'PCP / Processo', value: 'Como preencher uma ficha de processo?', icon: Cpu },
  { label: 'Qualidade', value: 'Como fazer uma liberação de lote?', icon: ShieldCheck },
  { label: 'Manutenção', value: 'Como fechar uma ordem de serviço?', icon: Wrench },
]

function answerFor(question: string) {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (q.includes('venda') || q.includes('pedido') || q.includes('cliente')) {
    return 'Vendas: selecione o cliente, informe a condição comercial e adicione os produtos pelo código/consulta. Confira quantidade, preço, desconto e total antes de gravar. Confirme a gravação no pedido real antes de informar sucesso.'
  }
  if (q.includes('processo') || q.includes('ficha') || q.includes('pcp')) {
    return 'PCP/Engenharia: selecione produto e versão, confira operações, posto de trabalho, tempos e parâmetros do processo. Grave a ficha somente depois de validar todos os campos obrigatórios.'
  }
  if (q.includes('qualidade') || q.includes('lote') || q.includes('rnc') || q.includes('liber')) {
    return 'Qualidade: abra o lote/registro real, confira o plano de inspeção, registre os resultados e finalize a decisão de liberação, retenção ou reprovação conforme o fluxo persistido.'
  }
  if (q.includes('manutencao') || q.includes('os') || q.includes('ordem de servico')) {
    return 'Manutenção: selecione a O.S. real, registre diagnóstico, causa, ação corretiva e laudo técnico. A conclusão só deve ser confirmada depois da persistência e da liberação operacional prevista pelo fluxo.'
  }
  if (q.includes('compras') || q.includes('rfq') || q.includes('cotacao') || q.includes('produto')) {
    return 'Compras/RFQ: pesquise o produto pelo código ou descrição, selecione a linha correta, informe quantidade e necessidade, selecione os fornecedores e grave a cotação. Se o produto não aparecer, verifique se está ativo e pertence à empresa atual.'
  }
  if (q.includes('estoque') || q.includes('lote')) {
    return 'Estoque: use a consulta de produto/lote para trabalhar com registros reais. Confira saldo disponível, unidade e localização antes de movimentar, separar ou ajustar.'
  }
  return 'Não encontrei um procedimento específico para essa pergunta na base de orientação local. Registrei a dúvida e a resposta de encaminhamento no histórico da empresa. Encaminhe o caso ao responsável operacional para cadastrar um POP validado.'
}

function moduleFor(question: string): string {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (q.includes('venda') || q.includes('pedido') || q.includes('cliente')) return 'Vendas'
  if (q.includes('pcp') || q.includes('processo') || q.includes('ficha')) return 'PCP'
  if (q.includes('qualidade') || q.includes('lote') || q.includes('rnc')) return 'Qualidade'
  if (q.includes('manutencao') || q.includes('ordem de servico') || q.includes('os')) return 'Manutenção'
  if (q.includes('compras') || q.includes('rfq') || q.includes('cotacao')) return 'Compras'
  if (q.includes('estoque')) return 'Estoque'
  return 'Geral'
}

export default function AssistenteAjudaERP() {
  const [params] = useSearchParams()
  const initial = params.get('busca') ?? ''
  const [input, setInput] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<SessionProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', sender: 'assistant', text: 'Olá. Esta é a Central de Ajuda e Suporte Técnico Operacional. Digite sua dúvida ou selecione um procedimento padrão acima.' },
  ])
  const suggestions = useMemo(() => topics, [])

  useEffect(() => { if (initial) setInput(initial) }, [initial])

  useEffect(() => {
    let active = true
    const load = async () => {
      setBusy(true)
      setError('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada não localizada.')
        const result = await supabase.from('erp_usuarios')
          .select('id,empresa_id')
          .eq('auth_user_id', auth.data.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (result.error) throw result.error
        if (!result.data?.id || !result.data.empresa_id) throw new Error('Perfil ativo e empresa da sessão não foram identificados.')
        const currentProfile = { id: result.data.id, empresa_id: result.data.empresa_id } as SessionProfile
        const history = await supabase.from('erp_ajuda_suporte')
          .select('id,usuario_id,pergunta,resposta_gerada,modulo_relacionado,created_at')
          .eq('empresa_id', currentProfile.empresa_id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (history.error) throw history.error
        if (!active) return
        setProfile(currentProfile)
        const stored = ((history.data ?? []) as SupportRow[]).reverse()
        if (stored.length) {
          setMessages(stored.flatMap(row => [
            { id: row.id + '-q', sender: 'user' as const, text: row.pergunta, created_at: row.created_at },
            { id: row.id + '-a', sender: 'assistant' as const, text: row.resposta_gerada, created_at: row.created_at },
          ]))
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de suporte.')
      } finally {
        if (active) setBusy(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const send = async () => {
    const question = input.trim()
    if (!question || busy) return
    if (!profile) { setError('Não há sessão e empresa válidas para registrar a dúvida.'); return }
    setBusy(true)
    setError('')
    const answer = answerFor(question)
    try {
      const saved = await supabase.from('erp_ajuda_suporte').insert({
        empresa_id: profile.empresa_id,
        usuario_id: profile.id,
        pergunta: question,
        resposta_gerada: answer,
        modulo_relacionado: moduleFor(question),
      }).select('id,created_at').single()
      if (saved.error) throw saved.error
      setMessages(current => [
        ...current,
        { id: saved.data.id + '-q', sender: 'user', text: question, created_at: saved.data.created_at },
        { id: saved.data.id + '-a', sender: 'assistant', text: answer, created_at: saved.data.created_at },
      ])
      setInput('')
    } catch (cause) {
      setError(cause instanceof Error ? `Não foi possível gravar a dúvida no histórico: ${cause.message}` : 'Não foi possível gravar a dúvida no histórico.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] font-sans antialiased print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-[1250px] flex-col overflow-hidden rounded-[3px] border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-sky-200 bg-sky-50 text-sky-700"><HelpCircle size={17} /></span>
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-sky-700">SYSNQRA • Suporte</div>
              <h1 className="text-[13px] font-bold tracking-tight text-slate-800">Central de Ajuda e Instruções Operacionais</h1>
            </div>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-[3px] border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 print:hidden"><Printer size={12} /> IMPRIMIR INSTRUÇÃO</button>
        </header>

        {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-800">{error}</div>}

        <section className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50/50 p-2.5 lg:grid-cols-4 print:hidden">
          {suggestions.map(({ label, value, icon: Icon }) => (
            <button key={label} type="button" onClick={() => setInput(value)} className="group flex min-h-10 min-w-0 items-center gap-2 rounded-[3px] border border-slate-200 bg-white px-2 py-1.5 text-left hover:border-sky-500 hover:bg-sky-50/20">
              <span className="rounded-[3px] border border-slate-100 bg-slate-50 p-1.5 text-slate-500 group-hover:text-sky-600"><Icon size={13} /></span>
              <span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-wide text-slate-400">Procedimento</span><span className="block truncate text-[10px] font-bold text-slate-700">{label}</span></span>
            </button>
          ))}
        </section>

        <section className="flex min-h-[420px] flex-col justify-between bg-white">
          <div className="max-h-[500px] flex-1 space-y-3 overflow-y-auto bg-slate-50/30 p-3 sm:p-4" aria-live="polite">
            {messages.map(message => {
              const isUser = message.sender === 'user'
              return <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-[3px] border px-3 py-2 text-[11px] leading-relaxed shadow-sm ${isUser ? 'border-sky-200 bg-sky-50 font-bold text-sky-950' : 'border-slate-200 bg-white font-normal text-slate-700'}`}>
                  <span className="mb-0.5 block text-[7px] font-black uppercase tracking-wider opacity-50">{isUser ? 'Operador / Minha Dúvida' : 'Assistente ERP / Orientação'}</span>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            })}
            {busy && <p className="text-[10px] text-slate-400">Carregando ou gravando histórico…</p>}
          </div>

          <div className="border-t border-slate-200 bg-white p-3 print:hidden">
            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
              <div className="grid min-w-0 gap-1 md:col-span-10">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400" htmlFor="erp-help-input">Descreva a dúvida ou o código do procedimento</label>
                <div className="flex h-8 min-w-0 items-center overflow-hidden rounded-[3px] border border-slate-300 bg-white px-2 shadow-inner focus-within:border-sky-600">
                  <Search size={13} className="shrink-0 text-slate-400" />
                  <input id="erp-help-input" type="text" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void send() } }} placeholder="Digite sua dúvida operacional…" autoComplete="off" className="h-full min-w-0 w-full border-0 bg-transparent px-2 text-[11px] font-semibold text-slate-800 outline-none placeholder:text-slate-400" />
                  {input && <button type="button" onClick={() => setInput('')} className="px-1 text-slate-400 hover:text-slate-600" aria-label="Limpar dúvida"><X size={13} /></button>}
                </div>
              </div>
              <div className="md:col-span-2">
                <button type="button" onClick={() => void send()} disabled={!input.trim() || busy || !profile} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[3px] bg-[#123B50] px-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#1a4f7c] disabled:cursor-not-allowed disabled:opacity-40"><Send size={11} /> {busy ? 'Processando…' : 'Consultar'}</button>
              </div>
            </div>
          </div>
        </section>
        <footer className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-400">SYSNQRA ERP INDUSTRIAL • Histórico de suporte por empresa</footer>
      </div>
    </main>
  )
}
