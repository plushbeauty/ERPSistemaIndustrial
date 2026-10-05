import { useEffect, useMemo, useState } from 'react'
import { HelpCircle, Search, Send, ShieldCheck, Cpu, ShoppingCart, Wrench, Printer, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

type Message = { sender: 'user' | 'assistant'; text: string }

const topics = [
  { label: 'Vendas / Pedido', value: 'Como preencher um pedido de venda?', icon: ShoppingCart },
  { label: 'PCP / Processo', value: 'Como preencher uma ficha de processo?', icon: Cpu },
  { label: 'Qualidade', value: 'Como fazer uma liberação de lote?', icon: ShieldCheck },
  { label: 'Manutenção', value: 'Como fechar uma ordem de serviço?', icon: Wrench },
]

function answerFor(question: string) {
  const q = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (q.includes('venda') || q.includes('pedido') || q.includes('cliente')) {
    return 'Vendas: selecione o cliente, informe a condição comercial e adicione os produtos pelo código/consulta. Confira quantidade, preço, desconto e total antes de gravar. O pedido deve ser persistido no Supabase; mensagens de sucesso só aparecem após a gravação real.'
  }
  if (q.includes('processo') || q.includes('ficha') || q.includes('pcp')) {
    return 'PCP/Engenharia: selecione produto e versão, confira operações, posto de trabalho, tempos e parâmetros do processo. Grave a ficha somente depois de validar todos os campos obrigatórios.'
  }
  if (q.includes('qualidade') || q.includes('lote') || q.includes('rnc') || q.includes('liber')) {
    return 'Qualidade: abra o lote/registro real, confira o plano de inspeção, registre os resultados e finalize a decisão de liberação, retenção ou reprovação conforme o fluxo persistido.'
  }
  if (q.includes('manutencao') || q.includes('manutenção') || q.includes('os') || q.includes('ordem de servico')) {
    return 'Manutenção: selecione a O.S. real, registre diagnóstico, causa, ação corretiva e laudo técnico. A conclusão só deve ser confirmada depois da persistência e da liberação operacional prevista pelo fluxo.'
  }
  if (q.includes('compras') || q.includes('rfq') || q.includes('cotacao') || q.includes('produto')) {
    return 'Compras/RFQ: pesquise o produto pelo código ou descrição, selecione a linha correta, informe quantidade e necessidade, selecione os fornecedores e grave a cotação. Se o produto não aparecer, verifique se ele está ativo e pertence à empresa atual.'
  }
  if (q.includes('estoque') || q.includes('lote')) {
    return 'Estoque: use a consulta de produto/lote para trabalhar com registros reais. Confira saldo disponível, unidade e localização antes de movimentar, separar ou ajustar.'
  }
  return 'Posso orientar o preenchimento de Vendas, Compras/RFQ, PCP/Engenharia, Qualidade, Estoque e Manutenção. Digite sua dúvida ou escolha um procedimento acima.'
}

export default function AssistenteAjudaERP() {
  const [params] = useSearchParams()
  const initial = params.get('busca') ?? ''
  const [input, setInput] = useState(initial)
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'assistant', text: 'Olá. Esta é a Central de Ajuda do SYSNQRA. Digite uma dúvida operacional ou escolha um procedimento.' },
  ])

  useEffect(() => {
    if (initial) setInput(initial)
  }, [initial])

  const suggestions = useMemo(() => topics, [])

  const send = () => {
    const question = input.trim()
    if (!question) return
    setMessages(current => [...current, { sender: 'user', text: question }, { sender: 'assistant', text: answerFor(question) }])
    setInput('')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] px-3 py-4 text-[#123B50] sm:px-6">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col border border-[#C8E1E8] bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBF0] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#B9DCE5] bg-[#EAF7FA] text-[#2D8DB8]"><HelpCircle size={19} /></span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#2D8DB8]">SYSNQRA • Suporte</div>
              <h1 className="truncate text-base font-medium text-[#123B50]">Central de Ajuda</h1>
            </div>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 border border-[#C8E1E8] bg-white px-3 text-[11px] font-medium text-[#17445A] hover:bg-[#F4FBFD] print:hidden" title="Imprimir"><Printer size={14} /> Imprimir</button>
        </header>

        <section className="grid grid-cols-1 gap-2 border-b border-[#DCEBF0] bg-[#F8FCFD] p-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          {suggestions.map(({ label, value, icon: Icon }) => (
            <button key={label} type="button" onClick={() => setInput(value)} className="flex min-h-10 items-center gap-2 border border-[#D5E8ED] bg-white px-3 text-left text-[11px] font-medium text-[#17445A] hover:border-[#2D8DB8]">
              <Icon size={15} className="shrink-0 text-[#2D8DB8]" /> {label}
            </button>
          ))}
        </section>

        <section className="flex min-h-[420px] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto bg-[#FBFDFE] p-4 sm:p-5" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={message.sender === 'user' ? 'ml-auto max-w-[85%] border border-[#B9DCE5] bg-[#EAF7FA] px-3 py-2 text-sm text-[#123B50]' : 'max-w-[90%] border border-[#DCEBF0] bg-white px-3 py-2 text-sm leading-6 text-slate-700'}>
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-[#DCEBF0] bg-white p-3 sm:p-4 print:hidden">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[.08em] text-slate-500" htmlFor="erp-help-input">Dúvida operacional</label>
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center border border-[#AFCFD8] bg-white px-3 focus-within:border-[#2D8DB8]">
                <Search size={15} className="mr-2 shrink-0 text-[#2D8DB8]" />
                <input id="erp-help-input" type="text" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); send() } }} placeholder="Digite sua dúvida..." autoComplete="off" className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none" />
                {input && <button type="button" onClick={() => setInput('')} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Limpar dúvida"><X size={15} /></button>}
              </div>
              <button type="button" onClick={send} disabled={!input.trim()} className="inline-flex h-10 items-center gap-2 border border-[#123B50] bg-[#123B50] px-4 text-xs font-medium text-white hover:bg-[#17445A] disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /> Enviar</button>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#DCEBF0] px-4 py-2 text-center text-[9px] font-medium text-slate-400">SYSNQRA ERP & SGQ INDUSTRIAL • Suporte operacional</footer>
      </div>
    </main>
  )
}
