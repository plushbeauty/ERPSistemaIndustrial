import { Link } from 'react-router-dom'

export default function RecuperarSenha() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#071012', color: '#fff' }}>
      <section style={{ width: 'min(460px, 100%)', padding: 28, border: '1px solid #344348', borderRadius: 8, background: '#0d171a' }}>
        <Link to="/login" style={{ color: '#a9dce5', textDecoration: 'none' }}>← Voltar ao login</Link>
        <h1 style={{ margin: '22px 0 8px' }}>Recuperar acesso</h1>
        <p style={{ color: 'rgba(255,255,255,.72)', lineHeight: 1.6 }}>
          Este ambiente usa e-mails internos que não recebem mensagens. Peça ao administrador da sua empresa para gerar uma senha provisória. No próximo acesso, o ERP exigirá a troca por uma senha pessoal.
        </p>
      </section>
    </main>
  )
}
