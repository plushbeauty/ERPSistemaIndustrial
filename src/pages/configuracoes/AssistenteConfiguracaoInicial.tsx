import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Building2, CheckCircle2, MapPin, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Company = {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  inscricao_estadual: string | null
  telefone: string | null
  email_compras: string | null
}
type Address = {
  cep: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
}
const emptyAddress: Address = { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' }
const inputClass = 'synqra-setup-input'

export default function AssistenteConfiguracaoInicial() {
  const [company, setCompany] = useState<Company | null>(null)
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lookingCep, setLookingCep] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Entre no sistema para configurar a empresa.')
        const { data: profile, error: profileError } = await supabase.from('erp_usuarios')
          .select('empresa_id,ativo,deleted_at')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile?.empresa_id) throw new Error('O usuário não possui uma empresa vinculada. Conclua primeiro o cadastro/ativação da empresa.')
        const { data: companyData, error: companyError } = await supabase.from('erp_empresas')
          .select('id,razao_social,nome_fantasia,cnpj,inscricao_estadual,telefone,email_compras')
          .eq('id', profile.empresa_id)
          .maybeSingle()
        if (companyError) throw companyError
        if (!companyData) throw new Error('Empresa não encontrada no escopo da sua sessão.')
        const { data: addressData, error: addressError } = await supabase.from('erp_enderecos')
          .select('cep,logradouro,numero,bairro,cidade,uf')
          .eq('empresa_id', profile.empresa_id)
          .eq('tipo', 'MATRIZ')
          .maybeSingle()
        if (addressError) throw addressError
        if (!alive) return
        setCompany(companyData as Company)
        setAddress({ ...emptyAddress, ...(addressData ?? {}) } as Address)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a configuração.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  function changeCompany(key: keyof Company, value: string) {
    setCompany(current => current ? { ...current, [key]: value } : current)
  }
  function changeAddress(key: keyof Address, value: string) {
    setAddress(current => ({ ...current, [key]: value }))
  }
  async function buscarCep() {
    const cep = address.cep.replace(/\D/g, '')
    if (cep.length !== 8) { setError('Informe um CEP com 8 dígitos.'); return }
    setLookingCep(true)
    setError('')
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!response.ok) throw new Error('Serviço de CEP indisponível. Tente novamente.')
      const data: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } = await response.json()
      if (data.erro) throw new Error('CEP não encontrado.')
      setAddress(current => ({ ...current, logradouro: data.logradouro ?? current.logradouro, bairro: data.bairro ?? current.bairro, cidade: data.localidade ?? current.cidade, uf: data.uf ?? current.uf }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o CEP.')
    } finally { setLookingCep(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!company) return
    if (company.razao_social.trim().length < 3) { setError('Informe a razão social.'); return }
    if (company.cnpj.replace(/\D/g, '').length !== 14) { setError('Informe o CNPJ com 14 dígitos.'); return }
    if (address.cep.replace(/\D/g, '').length !== 8) { setError('Informe um CEP válido com 8 dígitos.'); return }
    if (!address.logradouro.trim() || !address.numero.trim() || !address.bairro.trim() || !address.cidade.trim() || !/^[A-Za-z]{2}$/.test(address.uf)) {
      setError('Preencha logradouro, número, bairro, cidade e UF antes de avançar.')
      return
    }
    setSaving(true); setError(''); setMessage('')
    try {
      const { error: companyError } = await supabase.from('erp_empresas').update({
        razao_social: company.razao_social.trim(),
        nome_fantasia: company.nome_fantasia?.trim() || null,
        cnpj: company.cnpj.replace(/\D/g, ''),
        inscricao_estadual: company.inscricao_estadual?.trim() || null,
        telefone: company.telefone?.trim() || null,
        email_compras: company.email_compras?.trim().toLowerCase() || null,
      }).eq('id', company.id)
      if (companyError) throw companyError
      const { error: addressError } = await supabase.from('erp_enderecos').upsert({
        empresa_id: company.id, tipo: 'MATRIZ',
        cep: address.cep.replace(/\D/g, ''),
        logradouro: address.logradouro.trim(),
        numero: address.numero.trim(),
        bairro: address.bairro.trim(),
        cidade: address.cidade.trim(),
        uf: address.uf.trim().toUpperCase(),
      }, { onConflict: 'empresa_id,tipo' })
      if (addressError) throw addressError
      setMessage('Dados mestres da empresa e endereço da matriz salvos. O Passo 2 poderá ser concluído após esta gravação.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar os dados mestres.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="synqra-setup-loading">Carregando dados da empresa autenticada…</div>
  if (!company) return <section className="synqra-setup"><div className="synqra-setup-alert error">{error || 'Empresa indisponível.'}</div></section>

  return <section className="synqra-setup">
    <style>{`
      .synqra-setup{max-width:1000px;margin:0 auto;color:#1e293b;font:13px 'Segoe UI',system-ui,sans-serif}
      .synqra-setup *{box-sizing:border-box}
      .synqra-setup-top{background:#1a365d;color:#fff;padding:13px 18px;font-weight:800;font-size:15px;display:flex;align-items:center;gap:9px}
      .synqra-setup-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#e2e8f0;border:1px solid #cbd5e1}
      .synqra-setup-step{padding:11px 8px;text-align:center;font-size:11px;font-weight:800;color:#64748b;border-right:1px solid #cbd5e1}
      .synqra-setup-step:last-child{border-right:0}.synqra-setup-step.active{background:#fff;color:#1a365d;border-bottom:3px solid #2b6cb0}
      .synqra-setup-body{padding:16px;background:#f4f6f9;border:1px solid #cbd5e1;border-top:0}
      .synqra-setup-card{background:#fff;border:1px solid #cbd5e1;border-radius:4px;padding:16px;margin-bottom:14px}
      .synqra-setup-title{display:flex;align-items:center;gap:7px;color:#0056b3;font-size:12px;font-weight:800;margin-bottom:3px}
      .synqra-setup-subtitle{font-size:11px;color:#64748b;margin-bottom:12px}
      .synqra-setup-divider{border:0;border-top:1px solid #e2e8f0;margin-bottom:14px}
      .synqra-setup-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;min-width:0}
      .synqra-setup-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#475569;min-width:135px}
      .synqra-setup-field{display:flex;align-items:center;gap:0;flex:0 0 auto;min-width:0}
      .synqra-setup-input{display:inline-block!important;flex:0 0 auto!important;min-width:0;height:32px!important;padding:5px 8px!important;border:1px solid #94a3b8!important;border-radius:3px!important;background:#f8fafc!important;color:#0f172a!important;font:13px ui-monospace,SFMono-Regular,monospace!important;outline:none}
      .synqra-setup-input:focus{border-color:#2b6cb0!important;background:#fffdf0!important;box-shadow:0 0 0 2px #bfdbfe}
      .synqra-setup-input.long{width:min(500px,100%)!important}.synqra-setup-input.w20{width:26ch!important}.synqra-setup-input.w12{width:18ch!important}.synqra-setup-input.w6{width:12ch!important}.synqra-setup-input.w4{width:8ch!important}.synqra-setup-input.w2{width:6ch!important;text-transform:uppercase}
      .synqra-setup-input.w60{width:min(280px,100%)!important}
      .synqra-setup-lookup{height:32px;padding:0 12px;border:1px solid #1a365d;background:#2b6cb0;color:#fff;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
      .synqra-setup-footer{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:13px 16px;background:#e2e8f0;border:1px solid #cbd5e1}
      .synqra-setup-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:32px;padding:0 14px;border:1px solid transparent;border-radius:3px;font-size:11px;font-weight:800;cursor:pointer}
      .synqra-setup-cancel{background:#dc2626;color:#fff}.synqra-setup-next{background:#16a34a;color:#fff}.synqra-setup-next:disabled{opacity:.6;cursor:wait}
      .synqra-setup-alert{padding:10px 12px;margin-bottom:12px;border:1px solid;font-size:12px}.synqra-setup-alert.error{color:#991b1b;background:#fef2f2;border-color:#fecaca}.synqra-setup-alert.success{color:#166534;background:#f0fdf4;border-color:#bbf7d0}
      .synqra-setup-loading{padding:20px;border:1px solid #cbd5e1;background:#fff;color:#475569}
      @media(max-width:700px){.synqra-setup-body{padding:10px}.synqra-setup-card{padding:12px}.synqra-setup-row{align-items:flex-start;gap:6px}.synqra-setup-label{min-width:100%;}.synqra-setup-step{font-size:9px;padding:9px 3px}.synqra-setup-input.long{width:min(100%,500px)!important}}
    `}</style>
    <div className="synqra-setup-top"><Building2 size={19}/> SYNQRA ERP <span style={{opacity:.65}}>|</span> ASSISTENTE DE CONFIGURAÇÃO INICIAL (PASSO 1 DE 3)</div>
    <div className="synqra-setup-steps"><div className="synqra-setup-step active">PASSO 01: EMPRESA</div><div className="synqra-setup-step">PASSO 02: FISCAL &amp; LOCALIZAÇÃO</div><div className="synqra-setup-step">PASSO 03: PARAMETRIZAÇÃO PCP</div></div>
    <form onSubmit={save}>
      <div className="synqra-setup-body">
        {error && <div className="synqra-setup-alert error" role="alert">{error}</div>}
        {message && <div className="synqra-setup-alert success" role="status"><CheckCircle2 size={15} style={{verticalAlign:'middle',marginRight:6}}/>{message}</div>}
        <section className="synqra-setup-card">
          <div className="synqra-setup-title"><Building2 size={16}/> 01 / CADASTRO MATRIZ DA ORGANIZAÇÃO</div><div className="synqra-setup-subtitle">Preencha as informações jurídicas oficiais para emissão de notas fiscais e relatórios</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-razao">Razão Social:</label><input id="setup-razao" className={inputClass+' long'} maxLength={120} required value={company.razao_social} onChange={e=>changeCompany('razao_social',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-fantasia">Nome Fantasia:</label><input id="setup-fantasia" className={inputClass+' long'} maxLength={120} value={company.nome_fantasia??''} onChange={e=>changeCompany('nome_fantasia',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cnpj">CNPJ Matriz:</label><input id="setup-cnpj" className={inputClass+' w20'} maxLength={18} required value={company.cnpj} placeholder="00.000.000/0000-00" onChange={e=>changeCompany('cnpj',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-ie" style={{minWidth:'auto'}}>Inscrição Estadual:</label><input id="setup-ie" className={inputClass+' w12'} maxLength={20} value={company.inscricao_estadual??''} onChange={e=>changeCompany('inscricao_estadual',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-tel">Telefone Instit.:</label><input id="setup-tel" className={inputClass+' w12'} maxLength={20} value={company.telefone??''} onChange={e=>changeCompany('telefone',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-email" style={{minWidth:'auto'}}>E-mail Compras:</label><input id="setup-email" className={inputClass+' long'} style={{maxWidth:250}} type="email" maxLength={120} required value={company.email_compras??''} onChange={e=>changeCompany('email_compras',e.target.value)}/></div>
        </section>
        <section className="synqra-setup-card">
          <div className="synqra-setup-title"><MapPin size={16}/> 02 / ENDEREÇO SEDE E LOGÍSTICA</div><div className="synqra-setup-subtitle">O preenchimento correto auxilia a localização operacional e a parametrização fiscal</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cep">CEP Operacional:</label><div className="synqra-setup-field"><input id="setup-cep" className={inputClass+' w6'} maxLength={9} value={address.cep} placeholder="00000-000" onChange={e=>changeAddress('cep',e.target.value)}/><button className="synqra-setup-lookup" type="button" onClick={()=>void buscarCep()} disabled={lookingCep}><Search size={13} style={{verticalAlign:'middle',marginRight:4}}/>{lookingCep?'BUSCANDO…':'BUSCAR CEP'}</button></div></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-logradouro">Logradouro/Rua:</label><input id="setup-logradouro" className={inputClass+' long'} maxLength={120} required value={address.logradouro} onChange={e=>changeAddress('logradouro',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-numero">Número Predial:</label><input id="setup-numero" className={inputClass+' w4'} maxLength={10} required value={address.numero} onChange={e=>changeAddress('numero',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-bairro" style={{minWidth:'auto'}}>Bairro:</label><input id="setup-bairro" className={inputClass+' w60'} maxLength={80} required value={address.bairro} onChange={e=>changeAddress('bairro',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cidade">Município/Cidade:</label><input id="setup-cidade" className={inputClass+' w60'} maxLength={80} required value={address.cidade} onChange={e=>changeAddress('cidade',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-uf" style={{minWidth:'auto'}}>Unidade Federaç.:</label><input id="setup-uf" className={inputClass+' w2'} maxLength={2} required value={address.uf} onChange={e=>changeAddress('uf',e.target.value.toUpperCase())}/></div>
      </section>
      </div>
      <footer className="synqra-setup-footer"><button type="button" className="synqra-setup-btn synqra-setup-cancel" onClick={()=>window.location.assign('/configuracoes-adm') }><X size={14}/> CANCELAR CONFIGURAÇÃO</button><button type="submit" className="synqra-setup-btn synqra-setup-next" disabled={saving}><ArrowRight size={14}/>{saving?'SALVANDO…':'SALVAR E AVANÇAR PARA O PASSO 2'}</button></footer>
    </form>
  </section>
}
