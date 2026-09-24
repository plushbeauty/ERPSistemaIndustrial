import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Building2, UserPlus, Package, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import InfrastructureTrust from '../components/InfrastructureTrust'

// Interface estrita para eliminar o 'any' e passar no build da Vercel
interface SuccessData {
  empresa: string;
  acesso: string;
  email: string;
}

const formatDocumento = (v: string, tipo: 'CNPJ' | 'CPF') => {
  const digits = v.replace(/\D/g, '')
  if (tipo === 'CNPJ') {
    return digits.slice(0, 14)
      .replace(/(\d{2})(\d)/, '\$1.\$2')
      .replace(/(\d{3})(\d)/, '\$1.\$2')
      .replace(/(\d{3})(\d)/, '\$1/\(2')       .replace(/(\d{4})(\d{1,2})\)/, '\$1-\$2')
  }
  return digits.slice(0, 11)
    .replace(/(\d{3})(\d)/, '\$1.\$2')
    .replace(/(\d{3})(\d)/, '\$1.\(2')     .replace(/(\d{3})(\d{1,2})\)/, '\$1-\$2')
}

const firstName = (v: string) => v.trim().replace(/\s+/g, ' ').split(' ')[0] || ''
const plans: Record<string, string> = { essencial: 'Essencial', profissional: 'Profissional', diamante: 'Diamante' }
const prices: Record<string, string> = { essencial: 'R\$ 199/mês', profissional: 'R\$ 349/mês', diamante: 'R\$ 549/mês' }

export default function CadastroEmpresa() {
  const p = useMemo(() => new URLSearchParams(location.search), [])
  const plan = p.get('plano') || ''
  const module = p.get('modulo') || ''

  const [razao, setRazao] = useState('')
  const [fantasia, setFantasia] = useState('')
  const [documento, setDocumento] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState<SuccessData | null>(null) // Tipagem estrita

  const acesso = useMemo(() => firstName(fantasia || razao), [fantasia, razao])

  async function cadastrar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const doc = documento.replace(/\D/g, '')

    if ((tipoDocumento === 'CNPJ' && doc.length !== 14) || (tipoDocumento === 'CPF' && doc.length !== 11)) {
      return setError(`Informe um ${tipoDocumento} válido.`)
    }
    if (senha.length < 8) return setError('A senha deve possuir pelo menos 8 caracteres.')
    if (senha !== confirm) return setError('As senhas não conferem.')

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('erp-company-signup', {
        body: {
          razao_social: razao,
          nome_fantasia: fantasia,
          documento: doc,
          tipo_documento: tipoDocumento,
          email: email.trim().toLowerCase(),
          nome_admin: nome.trim(),
          nome_acesso: acesso,
          senha,
          plano: plan || null,
          modulo: module || null
        }
      })

      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível concluir o cadastro.')

      setOk({
        empresa: data.empresa?.nome_fantasia || fantasia,
        acesso: data.login_nome || acesso,
        email: data.email || email
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  if (ok) {
    return (
      <main className="company-signup-page">
        <section className="company-signup-card success">
          <div className="success-icon"><CheckCircle2 size={46} /></div>
          <span className="signup-kicker">CADASTRO CONCLUÍDO</span>
          <h1>Seu ambiente está pronto.</h1>
          <p>A empresa e o primeiro administrador foram criados e vinculados no banco.</p>
          <div className="access-box">
            <small>NOME DE ACESSO</small>
            <strong>{ok.acesso}</strong>
            <span>Empresa: {ok.empresa}</span>
            <span>E-mail: {ok.email}</span>
          </div>
          <a className="signup-primary" href="/login">Entrar no SGQ ERP</a>
          <a className="signup-secondary" href="/">Voltar ao site</a>
        </section>
      </main>
    )
  }

  return (
    <main className="company-signup-page">
      <section className="company-signup-shell">
        <InfrastructureTrust />
        <div className="company-signup-layout">
          <section className="signup-visual">
            <div className="signup-visual-inner">
              <img src="/images/sgq/sgq-erp-login.png" alt="SGQ ERP Industrial" />
              <div className="signup-visual-shade" />
              <div className="signup-visual-content">
                <img src="/logo-industrial.svg" alt="SGQ ERP" className="signup-logo" />
                <span>SGQ ERP INDUSTRIAL</span>
                <h1>Seu negócio.<br /><em>Seu controle.</em></h1>
                <p>Cadastre sua empresa, crie o primeiro administrador e tenha uma base preparada para produção, qualidade, estoque, financeiro e gestão.</p>
                <div className="signup-visual-points">
                  <b><ShieldCheck size={16} /> Ambiente seguro</b>
                  <b><Building2 size={16} /> Multiempresa</b>
                  <b><UserPlus size={16} /> Administrador próprio</b>
                </div>
              </div>
            </div>
          </section>

          <section className="company-signup-card">
            <a className="signup-back" href="/planos"><ArrowLeft size={18} /> Voltar</a>
            <div className="signup-brand">
              <img src="/logo-industrial.svg" alt="SGQ ERP" />
              <span>NOVO CLIENTE</span>
              <h2>Cadastre sua empresa</h2>
              <p>Crie seu ambiente e o primeiro acesso administrativo.</p>
            </div>
            {(plan || module) && (
              <div className="selected-plan-signup">
                <div>
                  <Package size={20} />
                  <div>
                    <small>SELEÇÃO</small>
                    <strong>{plan ? (plans[plan] || plan) + ' • ' + (prices[plan] || '') : 'Plano do SGQ ERP'}</strong>
                    {module && <span>Módulo: {module}</span>}
                  </div>
                </div>
              </div>
            )}
            {error && <div className="signup-error">{error}</div>}
            
            <form onSubmit={cadastrar}>
              <div className="signup-section-title"><Building2 /> Dados da empresa</div>
              <label>Razão Social<input value={razao} onChange={e => setRazao(e.target.value)} autoComplete="organization" required /></label>
              <label>Nome Fantasia<input value={fantasia} onChange={e => setFantasia(e.target.value)} autoComplete="organization" required /></label>
              
              <div className="signup-two">
                <label>Tipo de documento/tributação
                  <select value={tipoDocumento} onChange={e => { setTipoDocumento(e.target.value as 'CNPJ' | 'CPF'); setDocumento(''); }}>
                    <option value="CNPJ">CNPJ (Industrial)</option>
                    <option value="CPF">CPF (Profissional)</option>
                  </select>
                </label>
                <label>{tipoDocumento}
                  <input 
                    value={documento} 
                    onChange={e => setDocumento(formatDocumento(e.target.value, tipoDocumento))} 
                    autoComplete="off" 
                    inputMode="numeric" 
                    placeholder={tipoDocumento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'} 
                    required 
                  />
                </label>
              </div>
              
              <div className="access-preview">
                <small>ACESSO GERADO</small>
                <strong>{acesso || 'Será gerado pelo nome da empresa'}</strong>
              </div>
              
              <div className="signup-section-title"><UserPlus /> Primeiro administrador</div>
              <label>Seu nome<input value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" required /></label>
              <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
              
              <div className="signup-two">
                <label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
                <label>Confirmar senha<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
              </div>
              
              <button className="signup-primary" disabled={loading}>{loading ? 'Criando ambiente…' : 'Criar empresa e acesso'}</button>
            </form>
            <small className="signup-watermark">FernandoSch_System • 2026</small>
          </section>
        </div>
      </section>
    </main>
  )
}
