import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Building2, UserPlus, Package, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  return digits.slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const firstName = (v: string) => v.trim().replace(/\s+/g, ' ').split(' ')[0] || ''
const plans: Record<string, string> = { essencial: 'Essencial', profissional: 'Profissional', diamante: 'Diamante' }
const prices: Record<string, string> = { essencial: 'R$ 199/mês', profissional: 'R$ 349/mês', diamante: 'R$ 549/mês' }

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
        <style>{`.company-signup-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#0b1422;font-family:Inter,"Segoe UI",Arial,sans-serif}.company-signup-card.success{box-sizing:border-box;width:min(560px,100%);margin:auto;padding:38px;background:#fff;color:#25364a;border-radius:8px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.success-icon{color:#159447}.signup-kicker{display:block;margin-top:12px;color:#1683aa;font-size:10px;font-weight:900;letter-spacing:.13em}.company-signup-card.success h1{font-size:27px;color:#172b3b}.company-signup-card.success p{font-size:13px;color:#657889;line-height:1.6}.access-box{display:flex;flex-direction:column;gap:6px;margin:18px 0;padding:15px;background:#f3fafc;border:1px solid #cce2eb}.access-box small{font-size:9px;color:#1683aa;font-weight:900}.access-box strong{font-size:18px;color:#18394b}.access-box span{font-size:11px;color:#536a7a}@media(max-width:520px){.company-signup-page{padding:12px}.company-signup-card.success{padding:24px}}`}</style>
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
          <a className="signup-primary" href="/login">Entrar no SYSNQRA ERP & SGQ INDUSTRIAL</a>
          <a className="signup-secondary" href="/">Voltar ao site</a>
        </section>
      </main>
    )
  }

  return (
    <main className="company-signup-page">
      <section className="company-signup-shell">
        <style>{`
          .company-signup-page{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1422;color:#eaf2f8;box-sizing:border-box;font-family:Inter,"Segoe UI",Arial,sans-serif}
          .company-signup-shell{width:min(1120px,100%);min-height:min(720px,calc(100vh - 48px));margin:auto;overflow:hidden;border:1px solid #25384b;border-radius:8px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35)}
          .company-signup-layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);min-height:680px;height:100%}
          .company-signup-card{grid-column:1;grid-row:1;min-width:0;padding:30px clamp(22px,3.2vw,42px);display:flex;flex-direction:column;justify-content:center;background:#fff;color:#25364a;box-sizing:border-box}
          .signup-visual{grid-column:2;grid-row:1;position:relative;isolation:isolate;min-width:0;min-height:680px;overflow:hidden;background:#102638;color:#fff;border-left:1px solid #263d50}
          .signup-visual-inner{position:absolute;inset:0;display:flex;align-items:flex-end;padding:clamp(28px,4vw,48px);box-sizing:border-box}
          .signup-visual-inner>img:first-child{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-2}
          .signup-visual-inner:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,18,30,.52),rgba(5,18,30,.88));z-index:-1;pointer-events:none}
          .signup-visual-shade{display:none}
          .signup-visual-content{position:relative;z-index:1;max-width:420px}
          .signup-visual-content .signup-logo{display:block;width:auto;max-width:190px;height:38px;object-fit:contain;object-position:left center;margin-bottom:24px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.25));background:transparent}
          .signup-visual-content>span{display:block;color:#65d1e3;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
          .signup-visual-content h1{font-size:clamp(30px,3vw,42px);line-height:1.08;letter-spacing:-.035em;font-weight:800;margin:0 0 16px;color:#fff}
          .signup-visual-content h1 em{font-style:normal;color:#67d1e0}
          .signup-visual-content>p{max-width:42ch;color:#d0dce5;font-size:13px;line-height:1.7;margin:0 0 22px}
          .signup-visual-points{display:flex;flex-wrap:wrap;gap:8px}
          .signup-visual-points b{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.24);border-radius:3px;background:rgba(7,26,40,.42);padding:7px 9px;font-size:10px;color:#f3f8fb}
          .signup-back{display:inline-flex;align-items:center;gap:7px;width:max-content;color:#53697a;text-decoration:none;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:18px}
          .signup-back:hover{color:#087ca7}
          .signup-brand{margin-bottom:18px}
          .signup-brand img{display:block;width:auto;max-width:180px;height:42px;object-fit:contain;object-position:left center;margin-bottom:18px}
          .signup-brand>span{display:block;color:#1683aa;font-size:9px;font-weight:900;letter-spacing:.14em;margin-bottom:7px}
          .signup-brand h2{margin:0;color:#172b3b;font-size:24px;line-height:1.15;font-weight:800}
          .signup-brand p{margin:7px 0 0;color:#657889;font-size:12px;line-height:1.5}
          .selected-plan-signup{margin:0 0 14px;padding:10px;border:1px solid #cce2eb;background:#f3fafc;border-radius:3px}
          .selected-plan-signup>div{display:flex;align-items:center;gap:10px}.selected-plan-signup small,.selected-plan-signup strong,.selected-plan-signup span{display:block}.selected-plan-signup small{font-size:9px;color:#1683aa;font-weight:900}.selected-plan-signup strong{font-size:11px;color:#1d394b;margin-top:3px}.selected-plan-signup span{font-size:10px;color:#5d7484;margin-top:3px}
          .signup-error{margin:0 0 12px;padding:9px 10px;background:#fff1f1;border:1px solid #efb8b8;color:#a12626;font-size:11px;border-radius:3px}
          .signup-section-title{display:flex;align-items:center;gap:7px;padding:0 0 7px;margin:15px 0 10px;border-bottom:1px solid #dbe5eb;color:#1683aa;font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
          .signup-section-title svg{width:15px;height:15px;flex:none}
          .company-signup-card form{display:flex;flex-direction:column;gap:10px;min-width:0}
          .company-signup-card form>label,.signup-two>label{display:flex;flex-direction:column;gap:4px;min-width:0;color:#455a69;font-size:9px;font-weight:800;letter-spacing:.045em;text-transform:uppercase}
          .company-signup-card input,.company-signup-card select{display:block;box-sizing:border-box;width:100%;min-width:0;height:34px;border:1px solid #c8d5df;border-radius:3px;background:#f8fafc;color:#162b3b;padding:6px 9px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;outline:none}
          .company-signup-card input:focus,.company-signup-card select:focus{border-color:#1683aa;background:#fffdf0;box-shadow:0 0 0 2px rgba(22,131,170,.12)}
          .company-signup-card input::placeholder{color:#93a2ad}
          .signup-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;min-width:0}
          .signup-two>*{min-width:0}
          .access-preview{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid #dbe6eb;background:#f8fbfc;border-radius:3px}
          .access-preview small{font-size:8px;font-weight:900;letter-spacing:.08em;color:#718391}.access-preview strong{max-width:28ch;overflow-wrap:anywhere;text-align:right;color:#29495c;font-size:11px}
          .signup-primary{display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:100%;min-height:38px;margin-top:6px;padding:9px 12px;border:1px solid #148044;border-radius:3px;background:#159447;color:#fff;text-align:center;text-decoration:none;font-size:11px;font-weight:900;line-height:1.3;cursor:pointer;overflow-wrap:anywhere}
          .signup-primary:hover{background:#117a3a}.signup-primary:disabled{opacity:.65;cursor:wait}
          .signup-secondary{display:block;margin-top:12px;text-align:center;color:#64798a;font-size:11px;text-decoration:none}
          .signup-watermark{margin-top:14px;color:#93a0aa;text-align:right;font-size:9px}
          .company-signup-card.success{width:min(560px,100%);min-height:auto;margin:auto;border-radius:8px;padding:38px}
          .success-icon{color:#159447}.signup-kicker{display:block;margin-top:12px;color:#1683aa;font-size:10px;font-weight:900;letter-spacing:.13em}.company-signup-card.success h1{font-size:27px;color:#172b3b}.company-signup-card.success p{font-size:13px;color:#657889;line-height:1.6}.access-box{display:flex;flex-direction:column;gap:6px;margin:18px 0;padding:15px;background:#f3fafc;border:1px solid #cce2eb}.access-box small{font-size:9px;color:#1683aa;font-weight:900}.access-box strong{font-size:18px;color:#18394b}.access-box span{font-size:11px;color:#536a7a}
          @media(max-width:760px){.company-signup-page{padding:0;align-items:stretch}.company-signup-shell{min-height:100vh;border-radius:0;border:0}.company-signup-layout{grid-template-columns:minmax(0,1fr);min-height:100vh}.company-signup-card{grid-column:1;grid-row:1;padding:25px 20px}.signup-visual{grid-column:1;grid-row:2;min-height:360px;border-left:0;border-top:1px solid #263d50}.signup-visual-inner{padding:28px 22px}.signup-visual-content h1{font-size:32px}.signup-brand h2{font-size:22px}}
          @media(max-width:420px){.signup-two{grid-template-columns:minmax(0,1fr)}.company-signup-card{padding:22px 16px}.signup-brand img{max-width:155px}.signup-visual{min-height:330px}.signup-visual-content .signup-logo{height:32px;max-width:160px}}
        `}</style>
        <div className="company-signup-layout">
          <section className="signup-visual" aria-label="Apresentação do SYNQRA ERP">
            <div className="signup-visual-inner">
              <img src="/images/sgq/sgq-erp-login.png" alt="" aria-hidden="true" onError={e => { e.currentTarget.style.display = 'none' }} />
              <div className="signup-visual-content">
                <img src="/logo/logo.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" className="signup-logo" onError={e => { e.currentTarget.style.display = 'none' }} />
                <span>SYSNQRA ERP & SGQ INDUSTRIAL</span>
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
              <img src="/logo/logo.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" onError={e => { e.currentTarget.style.display = 'none' }} />
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
                    <strong>{plan ? (plans[plan] || plan) + ' • ' + (prices[plan] || '') : 'Plano do SYSNQRA ERP & SGQ INDUSTRIAL'}</strong>
                    {module && <span>Módulo: {module}</span>}
                  </div>
                </div>
              </div>
            )}
            {error && <div className="signup-error">{error}</div>}
            
            <form onSubmit={cadastrar}>
              <div className="signup-section-title"><Building2 /> Dados da empresa</div>
              <label>Razão Social<input value={razao} onChange={e => setRazao(e.target.value)} autoComplete="organization" maxLength={120} className="edit-longo" required /></label>
              <label>Nome Fantasia<input value={fantasia} onChange={e => setFantasia(e.target.value)} autoComplete="organization" maxLength={120} className="edit-longo" required /></label>
              
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
                    maxLength={tipoDocumento === 'CNPJ' ? 18 : 14}
                    required 
                  />
                </label>
              </div>
              
              <div className="access-preview">
                <small>ACESSO GERADO</small>
                <strong>{acesso || 'Será gerado pelo nome da empresa'}</strong>
              </div>
              
              <div className="signup-section-title"><UserPlus /> Primeiro administrador</div>
              <label>Seu nome<input value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" maxLength={120} required /></label>
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
