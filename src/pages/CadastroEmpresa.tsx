import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Building2, UserPlus } from 'lucide-react'

const FUNCTION_URL = 'https://zsklkydlawgvwgnvxwwx.supabase.co/functions/v1/erp-company-signup'
const formatCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
const primeiroNome = (valor: string) => valor.trim().replace(/\s+/g, ' ').split(' ')[0] || ''

export default function CadastroEmpresa(){
  const [razao,setRazao]=useState('')
  const [fantasia,setFantasia]=useState('')
  const [cnpj,setCnpj]=useState('')
  const [email,setEmail]=useState('')
  const [nomeAdmin,setNomeAdmin]=useState('')
  const [senha,setSenha]=useState('')
  const [senha2,setSenha2]=useState('')
  const [loading,setLoading]=useState(false)
  const [erro,setErro]=useState('')
  const [ok,setOk]=useState<{empresa:string;acesso:string;email:string}|null>(null)
  const acesso=useMemo(()=>primeiroNome(fantasia || razao),[fantasia,razao])

  async function cadastrar(e:FormEvent){
    e.preventDefault(); setErro(''); setOk(null)
    if(cnpj.replace(/\D/g,'').length!==14){setErro('Informe um CNPJ válido com 14 dígitos.');return}
    if(senha!==senha2){setErro('As senhas não conferem.');return}
    if(senha.length<8){setErro('A senha deve possuir pelo menos 8 caracteres.');return}
    setLoading(true)
    try{
      const r=await fetch(FUNCTION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({razao_social:razao,nome_fantasia:fantasia,cnpj,email,nome_admin:nomeAdmin,senha,nome_acesso:acesso})})
      const data=await r.json()
      if(!r.ok) throw new Error(data.error || 'Não foi possível concluir o cadastro.')
      setOk({empresa:data.empresa?.nome_fantasia || fantasia,acesso:data.login_nome || acesso,email:data.email || email})
      setSenha('');setSenha2('')
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível concluir o cadastro.')}finally{setLoading(false)}
  }

  if(ok) return <main className="company-signup-page"><section className="company-signup-card success"><div className="success-icon"><CheckCircle2 size={46}/></div><span className="signup-kicker">EMPRESA CADASTRADA</span><h1>Seu ambiente está pronto.</h1><p>A empresa foi criada com os setores básicos e o usuário administrador já está vinculado ao ambiente correto.</p><div className="access-box"><small>NOME DE ACESSO AO SISTEMA</small><strong>{ok.acesso}</strong><span>Empresa: {ok.empresa}</span><span>E-mail: {ok.email}</span></div><a className="signup-primary" href="/login">Entrar no SGQ ERP</a><a className="signup-secondary" href="/">Voltar para o site</a><small className="signup-watermark">FernandoSch_System • 2026</small></section></main>

  return <main className="company-signup-page"><section className="company-signup-card"><a className="signup-back" href="/"><ArrowLeft size={18}/> Voltar para o site</a><div className="signup-brand"><img src="/logo-industrial.svg" alt="SGQ ERP"/><span>CADASTRO DE NOVA EMPRESA</span><h1>Crie seu ambiente industrial</h1><p>Depois do cadastro, sua empresa terá seus próprios setores, usuários e dados separados das demais empresas.</p></div>{erro&&<div className="signup-error">{erro}</div>}<form onSubmit={cadastrar}><div className="signup-section-title"><Building2 size={20}/> Dados da empresa</div><label>Razão Social<input value={razao} onChange={e=>setRazao(e.target.value)} placeholder="Nome jurídico da empresa" required disabled={loading}/></label><label>Nome Fantasia<input value={fantasia} onChange={e=>setFantasia(e.target.value)} placeholder="Nome pelo qual sua empresa é conhecida" required disabled={loading}/></label><label>CNPJ<input value={cnpj} onChange={e=>setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" autoComplete="organization" required disabled={loading}/></label><div className="access-preview"><small>NOME DE ACESSO AO SISTEMA</small><strong>{acesso || 'Será gerado pelo primeiro nome da empresa'}</strong><span>Gerado automaticamente para facilitar o login.</span></div><div className="signup-section-title"><UserPlus size={20}/> Administrador do ambiente</div><label>Nome do responsável<input value={nomeAdmin} onChange={e=>setNomeAdmin(e.target.value)} placeholder="Nome completo" required disabled={loading}/></label><label>E-mail de acesso<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@empresa.com.br" autoComplete="email" required disabled={loading}/></label><div className="signup-two"><label>Senha<input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required disabled={loading}/></label><label>Confirmar senha<input type="password" value={senha2} onChange={e=>setSenha2(e.target.value)} placeholder="Repita a senha" minLength={8} required disabled={loading}/></label></div><button className="signup-primary" disabled={loading}>{loading?'Criando ambiente…':'Criar empresa e acessar sistema'}</button></form><small className="signup-watermark">FernandoSch_System • 2026</small></section></main>
}
