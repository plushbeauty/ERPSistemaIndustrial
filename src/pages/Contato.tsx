import { FormEvent, useState } from 'react'
import { ArrowLeft, Mail, Send, ShieldCheck } from 'lucide-react'

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
          <a href="/" className="public-brand" aria-label="SGQ ERP"><img src="/logo-industrial.svg" alt="SGQ ERP" /></a>
          <a className="contact-back" href="/"><ArrowLeft size={17} /> Voltar ao site</a>
        </header>

        <section className="public-contact-grid">
          <div className="public-contact-copy">
            <span className="public-kicker">CONTATO</span>
            <h1>Fale diretamente com a equipe SGQ ERP.</h1>
            <p>Envie sua dúvida, solicitação, sugestão ou pedido de demonstração. A mensagem será encaminhada para nossa caixa de atendimento.</p>
            <div className="contact-trust"><ShieldCheck size={20} /><span>Atendimento direcionado para o e-mail da equipe.</span></div>
            <div className="contact-mail"><Mail size={19} /><span>fernandosch2012@hotmail.com</span></div>
          </div>

          <form className="public-contact-form" action="https://formsubmit.co/fernandosch2012@hotmail.com" method="POST" onSubmit={enviar}>
            <input type="hidden" name="_subject" value="Novo contato — SGQ ERP Industrial" />
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
