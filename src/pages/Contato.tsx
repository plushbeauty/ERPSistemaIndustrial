import { FormEvent, useState } from 'react'
import { ArrowLeft, Mail, Send, ShieldCheck, Wrench } from 'lucide-react'

export default function Contato() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnviando(true)
    const form = e.currentTarget
    form.submit()
  }

  return (
    <main className="public-contact-page">
      <div className="public-contact-shell">
        <header className="public-contact-header">
          <a href="/" className="public-brand" aria-label="SYSNQRA ERP & SGQ INDUSTRIAL"><img src="/logo/sgq-erp.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" /></a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><a className="contact-back" href="/"><ArrowLeft size={17} /> Voltar ao site</a><a href="/manutencao/laboratorio-visual" aria-label="Abrir teste visual de manutenção" title="Teste temporário do módulo Manutenção" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", border: "1px solid #cbd5e1", borderRadius: 3, color: "#123b50", background: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}><Wrench size={13} /> Teste Manutenção</a></div>
        </header>

        <section className="public-contact-grid">
          <div className="public-contact-copy">
            <span className="public-kicker">CONTATO</span>
            <h1>Fale diretamente com a equipe SYSNQRA ERP & SGQ INDUSTRIAL.</h1>
            <p>Envie sua dúvida, solicitação, sugestão ou pedido de demonstração. A mensagem será encaminhada para nossa caixa de atendimento.</p>
            <div className="contact-trust"><ShieldCheck size={20} /><span>Atendimento direcionado para o e-mail da equipe.</span></div>
            <div className="contact-mail"><Mail size={19} /><span>fernandosch2012@hotmail.com</span></div>
          </div>

          <form className="public-contact-form" action="https://formsubmit.co/fernandosch2012@hotmail.com" method="POST" onSubmit={enviar}>
            <input type="hidden" name="_subject" value="Novo contato — SYSNQRA ERP & SGQ INDUSTRIAL" />
            <input type="hidden" name="_captcha" value="true" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_next" value="https://erp-sistema-industrial.vercel.app/contato?enviado=1" />
            <label>Nome<input name="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required /></label>
            <label>Seu e-mail<input type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" required /></label>
            <label>Assunto<input name="assunto" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Como podemos ajudar?" required /></label>
            <label>Mensagem<textarea name="mensagem" value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Digite sua mensagem..." rows={7} required /></label>
            <button className="public-contact-submit" type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar mensagem'} <Send size={17} /></button>
            <small>Ao enviar, a mensagem será encaminhada para o endereço de atendimento informado acima.</small>
          </form>
        </section>
      </div>
    </main>
  )
}
