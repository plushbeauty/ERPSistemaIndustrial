import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, MapPin, Search, X, Scale, ReceiptText } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Company = {
  id: string; razao_social: string; nome_fantasia: string | null; cnpj: string
  inscricao_estadual: string | null; telefone: string | null; email_compras: string | null
}
type Address = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string }
type PCP = { deposito_wip_padrao: string; tipo_custo_item: string; consumo_componentes: string; lead_time_geral_dias: string; rastreabilidade_operacional: string; lote_padrao_fabrica: string }
type Fiscal = {
  regime_tributario: string; aliquota_icms_padrao: string; aliquota_simples: string
  indicador_ie_destinatario: string; serie_nfe: string; proximo_numero_nfe: string
  serie_nfe_filial: string; ambiente: string; cfop_padrao_venda: string; cfop_padrao_devolucao: string
}
const emptyAddress: Address = { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' }
const emptyPCP: PCP = { deposito_wip_padrao: '', tipo_custo_item: 'CUSTO_MEDIO_PONDERADO', consumo_componentes: 'AUTOMATICA', lead_time_geral_dias: '1', rastreabilidade_operacional: 'LOTE', lote_padrao_fabrica: '1' }
const emptyFiscal: Fiscal = {
  regime_tributario: 'SIMPLES_NACIONAL', aliquota_icms_padrao: '0.00', aliquota_simples: '0.00',
  indicador_ie_destinatario: '1', serie_nfe: '1', proximo_numero_nfe: '1',
  serie_nfe_filial: '1', ambiente: 'homologacao', cfop_padrao_venda: '', cfop_padrao_devolucao: '',
}
const digits = (v: string) => v.replace(/\D/g, '')
const inputClass = 'synqra-setup-input'

export default function AssistenteConfiguracaoInicial() {
  const [company, setCompany] = useState<Company | null>(null)
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [fiscal, setFiscal] = useState<Fiscal>(emptyFiscal)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pcp, setPcp] = useState<PCP>(emptyPCP)
  const [wipModal, setWipModal] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lookingCep, setLookingCep] = useState(false)
  const [cfopLoading, setCfopLoading] = useState(false)
  const [cfopRows, setCfopRows] = useState<string[]>([])
  const [cfopModal, setCfopModal] = useState<'venda' | 'devolucao' | null>(null)
  const [cfopSearch, setCfopSearch] = useState('')
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
          .select('empresa_id,ativo,deleted_at').eq('auth_user_id', auth.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profileError) throw profileError
        if (!profile?.empresa_id) throw new Error('O usuário não possui empresa vinculada à sessão.')
        const id = String(profile.empresa_id)
        const [companyResult, addressResult, fiscalResult, pcpResult] = await Promise.all([
          supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,cnpj,inscricao_estadual,telefone,email_compras').eq('id', id).maybeSingle(),
          supabase.from('erp_enderecos').select('cep,logradouro,numero,bairro,cidade,uf').eq('empresa_id', id).eq('tipo', 'MATRIZ').maybeSingle(),
          supabase.from('erp_config_fiscal').select('regime_tributario,aliquota_icms_padrao,aliquota_simples,indicador_ie_destinatario,serie_nfe,proximo_numero_nfe,serie_nfe_filial,ambiente,cfop_padrao_venda,cfop_padrao_devolucao').eq('empresa_id', id).maybeSingle(),
          supabase.from('erp_config_pcp').select('deposito_wip_padrao,tipo_custo_item,consumo_componentes,lead_time_geral_dias,rastreabilidade_operacional,lote_padrao_fabrica').eq('empresa_id', id).maybeSingle(),
        ])
        if (companyResult.error) throw companyResult.error
        if (addressResult.error) throw addressResult.error
        if (fiscalResult.error) throw fiscalResult.error
        if (!companyResult.data) throw new Error('Empresa não encontrada no escopo da sua sessão.')
        if (!alive) return
        setCompanyId(id)
        setCompany(companyResult.data as Company)
        setAddress({ ...emptyAddress, ...(addressResult.data ?? {}) } as Address)
        if (pcpResult.data) setPcp(current => ({ ...current, ...Object.fromEntries(Object.entries(pcpResult.data).map(([key, value]) => [key, value == null ? '' : String(value)])) }) as PCP)
        if (fiscalResult.data) setFiscal(current => ({
          ...current,
          ...Object.fromEntries(Object.entries(fiscalResult.data).map(([key, value]) => [key, value == null ? '' : String(value)])),
          regime_tributario: fiscalResult.data.regime_tributario ?? emptyFiscal.regime_tributario,
          ambiente: fiscalResult.data.ambiente ?? emptyFiscal.ambiente,
        }) as Fiscal)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a configuração.')
      } finally { if (alive) setLoading(false) }
    }
    void load()
    return () => { alive = false }
  }, [])

  function changeCompany(key: keyof Company, value: string) { setCompany(current => current ? { ...current, [key]: value } : current) }
  function changeAddress(key: keyof Address, value: string) { setAddress(current => ({ ...current, [key]: value })) }
  function changeFiscal(key: keyof Fiscal, value: string) { setFiscal(current => ({ ...current, [key]: value })) }

  async function buscarCep() {
    const cep = digits(address.cep)
    if (cep.length !== 8) { setError('Informe um CEP com 8 dígitos.'); return }
    setLookingCep(true); setError('')
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!response.ok) throw new Error('Serviço de CEP indisponível. Tente novamente.')
      const data: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } = await response.json()
      if (data.erro) throw new Error('CEP não encontrado.')
      setAddress(current => ({ ...current, cep, logradouro: data.logradouro ?? current.logradouro, bairro: data.bairro ?? current.bairro, cidade: data.localidade ?? current.cidade, uf: data.uf ?? current.uf }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o CEP.') }
    finally { setLookingCep(false) }
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault()
    if (!company || !companyId) return
    if (company.razao_social.trim().length < 3) { setError('Informe a razão social.'); return }
    if (digits(company.cnpj).length !== 14) { setError('Informe o CNPJ com 14 dígitos.'); return }
    if (!company.email_compras?.trim() || !/^\S+@\S+\.\S+$/.test(company.email_compras.trim())) { setError('Informe um e-mail de compras válido.'); return }
    if (digits(address.cep).length !== 8 || !address.logradouro.trim() || !address.numero.trim() || !address.bairro.trim() || !address.cidade.trim() || !/^[A-Za-z]{2}$/.test(address.uf)) {
      setError('Preencha CEP, logradouro, número, bairro, cidade e UF corretamente.'); return
    }
    setSaving(true); setError(''); setMessage('')
    try {
      const { error: companyError } = await supabase.from('erp_empresas').update({
        razao_social: company.razao_social.trim(), nome_fantasia: company.nome_fantasia?.trim() || null,
        cnpj: digits(company.cnpj), inscricao_estadual: company.inscricao_estadual?.trim() || null,
        telefone: company.telefone?.trim() || null, email_compras: company.email_compras.trim().toLowerCase(),
      }).eq('id', companyId)
      if (companyError) throw companyError
      const { data: existing, error: existingError } = await supabase.from('erp_enderecos').select('id').eq('empresa_id', companyId).eq('tipo', 'MATRIZ').maybeSingle()
      if (existingError) throw existingError
      const addressPayload = { empresa_id: companyId, tipo: 'MATRIZ', cep: digits(address.cep), logradouro: address.logradouro.trim(), numero: address.numero.trim(), bairro: address.bairro.trim(), cidade: address.cidade.trim(), uf: address.uf.trim().toUpperCase() }
      const addressWrite = existing
        ? await supabase.from('erp_enderecos').update(addressPayload).eq('id', existing.id)
        : await supabase.from('erp_enderecos').insert(addressPayload)
      if (addressWrite.error) throw addressWrite.error
      setMessage('Dados da empresa e endereço da matriz salvos.')
      setStep(2)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar os dados da empresa.') }
    finally { setSaving(false) }
  }

  async function loadCfops() {
    if (!companyId) return
    setCfopLoading(true); setError('')
    try {
      const { data, error: queryError } = await supabase.from('erp_regras_fiscais').select('cfop').eq('empresa_id', companyId).not('cfop', 'is', null).limit(1000)
      if (queryError) throw queryError
      setCfopRows([...new Set((data ?? []).map(row => String(row.cfop ?? '').trim()).filter(value => /^\d{4}$/.test(value)))].sort())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os CFOPs cadastrados.') }
    finally { setCfopLoading(false) }
  }
  async function openCfop(which: 'venda' | 'devolucao') {
    setCfopModal(which); setCfopSearch('')
    if (!cfopRows.length) await loadCfops()
  }

  async function saveFiscal(event: FormEvent) {
    event.preventDefault()
    if (!companyId) { setError('Empresa da sessão não localizada.'); return }
    const icms = Number(fiscal.aliquota_icms_padrao.replace(',', '.'))
    const simples = Number(fiscal.aliquota_simples.replace(',', '.'))
    if (!Number.isFinite(icms) || icms < 0 || icms > 100 || !Number.isFinite(simples) || simples < 0 || simples > 100) { setError('Alíquotas devem estar entre 0 e 100%.'); return }
    const serie = Number(fiscal.serie_nfe), proximo = Number(fiscal.proximo_numero_nfe), serieFilial = Number(fiscal.serie_nfe_filial)
    if (!Number.isInteger(serie) || serie < 0 || serie > 999 || !Number.isSafeInteger(proximo) || proximo < 1 || !Number.isInteger(serieFilial) || serieFilial < 0 || serieFilial > 999) { setError('Confira as séries (0–999) e o próximo número (maior que zero).'); return }
    if (fiscal.cfop_padrao_venda && !/^\d{4}$/.test(fiscal.cfop_padrao_venda)) { setError('CFOP de venda deve conter 4 dígitos.'); return }
    if (fiscal.cfop_padrao_devolucao && !/^\d{4}$/.test(fiscal.cfop_padrao_devolucao)) { setError('CFOP de devolução deve conter 4 dígitos.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const payload = {
        empresa_id: companyId, regime_tributario: fiscal.regime_tributario,
        aliquota_icms_padrao: icms, aliquota_simples: simples,
        indicador_ie_destinatario: fiscal.indicador_ie_destinatario,
        serie_nfe: serie, proximo_numero_nfe: proximo, serie_nfe_filial: serieFilial,
        ambiente: fiscal.ambiente, cfop_padrao_venda: fiscal.cfop_padrao_venda || null,
        cfop_padrao_devolucao: fiscal.cfop_padrao_devolucao || null,
      }
      const { data: existing, error: existingError } = await supabase.from('erp_config_fiscal').select('empresa_id').eq('empresa_id', companyId).maybeSingle()
      if (existingError) throw existingError
      const result = existing
        ? await supabase.from('erp_config_fiscal').update(payload).eq('empresa_id', companyId)
        : await supabase.from('erp_config_fiscal').insert(payload)
      if (result.error) throw result.error
      setMessage('Configuração fiscal salva. Revise agora os parâmetros industriais do PCP.')
      setStep(3)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar a configuração fiscal.') }
    finally { setSaving(false) }
  }


  function changePCP<K extends keyof PCP>(key: K, value: PCP[K]) {
    setPcp(current => ({ ...current, [key]: value }))
  }

  async function savePCP(event: FormEvent) {
    event.preventDefault()
    if (!companyId) { setError('Empresa da sessão não localizada.'); return }
    const lead = Number(pcp.lead_time_geral_dias)
    const lot = Number(pcp.lote_padrao_fabrica)
    if (!pcp.deposito_wip_padrao.trim()) { setError('Informe o depósito WIP padrão.'); return }
    if (!Number.isInteger(lead) || lead < 0 || lead > 9999) { setError('Lead time deve ser um número inteiro entre 0 e 9999 dias.'); return }
    if (!Number.isFinite(lot) || lot <= 0) { setError('O lote padrão da fábrica deve ser maior que zero.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const payload = {
        empresa_id: companyId,
        deposito_wip_padrao: pcp.deposito_wip_padrao.trim(),
        tipo_custo_item: pcp.tipo_custo_item,
        consumo_componentes: pcp.consumo_componentes,
        lead_time_geral_dias: lead,
        rastreabilidade_operacional: pcp.rastreabilidade_operacional,
        lote_padrao_fabrica: lot,
        updated_at: new Date().toISOString(),
      }
      const { data: existing, error: existingError } = await supabase.from('erp_config_pcp').select('empresa_id').eq('empresa_id', companyId).maybeSingle()
      if (existingError) throw existingError
      const result = existing
        ? await supabase.from('erp_config_pcp').update(payload).eq('empresa_id', companyId)
        : await supabase.from('erp_config_pcp').insert(payload)
      if (result.error) throw result.error
      setMessage('Assistente concluído: dados mestres, configuração fiscal e parâmetros industriais foram salvos.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar os parâmetros industriais do PCP.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="synqra-setup-loading">Carregando configuração da empresa autenticada…</div>
  if (!company) return <section className="synqra-setup"><div className="synqra-setup-alert error" role="alert">{error || 'Empresa indisponível.'}</div></section>

  return <section className="synqra-setup">
    <style>{`
      .synqra-setup{max-width:1000px;margin:0 auto;color:#1e293b;font:13px 'Segoe UI',system-ui,sans-serif}.synqra-setup *{box-sizing:border-box}
      .synqra-setup-top{background:#1a365d;color:#fff;padding:13px 18px;font-weight:800;font-size:15px;display:flex;align-items:center;gap:9px}
      .synqra-setup-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#e2e8f0;border:1px solid #cbd5e1}
      .synqra-setup-step{padding:11px 8px;text-align:center;font-size:11px;font-weight:800;color:#64748b;border-right:1px solid #cbd5e1}.synqra-setup-step:last-child{border-right:0}
      .synqra-setup-step.active{background:#fff;color:#1a365d;border-bottom:3px solid #2b6cb0}.synqra-setup-step.done{color:#15803d}
      .synqra-setup-body{padding:16px;background:#f4f6f9;border:1px solid #cbd5e1;border-top:0}
      .synqra-setup-card{background:#fff;border:1px solid #cbd5e1;border-radius:4px;padding:16px;margin-bottom:14px}
      .synqra-setup-title{display:flex;align-items:center;gap:7px;color:#0056b3;font-size:12px;font-weight:800;margin-bottom:3px}.synqra-setup-subtitle{font-size:11px;color:#64748b;margin-bottom:12px}
      .synqra-setup-divider{border:0;border-top:1px solid #e2e8f0;margin-bottom:14px}
      .synqra-setup-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;min-width:0}
      .synqra-setup-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#475569;min-width:135px}
      .synqra-setup-input,.synqra-setup-select{display:inline-block!important;flex:0 0 auto!important;min-width:0;height:32px!important;padding:5px 8px!important;border:1px solid #94a3b8!important;border-radius:3px!important;background:#f8fafc!important;color:#0f172a!important;font:13px ui-monospace,SFMono-Regular,monospace!important;outline:none}
      .synqra-setup-input:focus,.synqra-setup-select:focus{border-color:#2b6cb0!important;background:#fffdf0!important;box-shadow:0 0 0 2px #bfdbfe}
      .synqra-setup-input.long{width:min(500px,100%)!important}.synqra-setup-input.w20{width:26ch!important}.synqra-setup-input.w12{width:16ch!important;text-align:right}.synqra-setup-input.w6{width:11ch!important}.synqra-setup-input.w4{width:8ch!important;text-align:center}.synqra-setup-input.w2{width:6ch!important;text-transform:uppercase;text-align:center}.synqra-setup-input.w60{width:min(280px,100%)!important}
      .synqra-setup-select.long{width:min(320px,100%)!important}.synqra-setup-select.medium{width:min(300px,100%)!important}
      .synqra-setup-field{display:flex;align-items:center;gap:0;flex:0 0 auto;min-width:0}
      .synqra-setup-lookup{height:32px;padding:0 12px;border:1px solid #1a365d;background:#2b6cb0;color:#fff;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}.synqra-setup-lookup:disabled{opacity:.65}
      .synqra-setup-footer{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:13px 16px;background:#e2e8f0;border:1px solid #cbd5e1}
      .synqra-setup-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:32px;padding:0 14px;border:1px solid transparent;border-radius:3px;font-size:11px;font-weight:800;cursor:pointer}.synqra-setup-cancel{background:#dc2626;color:#fff}.synqra-setup-back{background:#475569;color:#fff}.synqra-setup-next{background:#16a34a;color:#fff}.synqra-setup-btn:disabled{opacity:.6;cursor:wait}
      .synqra-setup-alert{padding:10px 12px;margin-bottom:12px;border:1px solid;font-size:12px}.synqra-setup-alert.error{color:#991b1b;background:#fef2f2;border-color:#fecaca}.synqra-setup-alert.success{color:#166534;background:#f0fdf4;border-color:#bbf7d0}
      .synqra-setup-loading{padding:20px;border:1px solid #cbd5e1;background:#fff;color:#475569}
      .synqra-setup-modal{position:fixed;inset:0;z-index:10000;background:#0008;display:flex;align-items:center;justify-content:center;padding:16px}.synqra-setup-modal-box{background:#fff;width:min(560px,100%);max-height:80vh;overflow:auto;border:1px solid #1a365d;box-shadow:0 4px 15px #0003}
      .synqra-setup-modal-head{display:flex;justify-content:space-between;align-items:center;background:#1a365d;color:#fff;padding:12px;font-weight:800}.synqra-setup-modal-body{padding:15px}.synqra-setup-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}.synqra-setup-table th{background:#cbd5e1;text-align:left;padding:7px;border:1px solid #94a3b8}.synqra-setup-table td{padding:8px 7px;border:1px solid #cbd5e1}.synqra-setup-table tr[role=button]{cursor:pointer}.synqra-setup-table tr[role=button]:hover td{background:#fffdf0;color:#2b6cb0}
      @media(max-width:700px){.synqra-setup-body{padding:10px}.synqra-setup-card{padding:12px}.synqra-setup-row{align-items:flex-start;gap:6px}.synqra-setup-label{min-width:100%}.synqra-setup-step{font-size:9px;padding:9px 3px}.synqra-setup-input.long{width:min(100%,500px)!important}}
    `}</style>
    <div className="synqra-setup-top"><Building2 size={19}/> SYNQRA ERP <span style={{opacity:.65}}>|</span> ASSISTENTE DE CONFIGURAÇÃO INICIAL (PASSO {step} DE 3)</div>
    <div className="synqra-setup-steps">
      <div className={'synqra-setup-step '+(step===1?'active':'done')}>PASSO 01: EMPRESA</div>
      <div className={'synqra-setup-step '+(step===2?'active':'')}>PASSO 02: FISCAL &amp; LOCALIZAÇÃO</div>
      <div className={"synqra-setup-step "+(step===3?"active":"")}>PASSO 03: PARAMETRIZAÇÃO PCP</div>
    </div>
    {error && <div className="synqra-setup-alert error" role="alert">{error}</div>}
    {message && <div className="synqra-setup-alert success" role="status"><CheckCircle2 size={15} style={{verticalAlign:'middle',marginRight:6}}/>{message}</div>}
    {step===1 ? <form onSubmit={saveCompany}>
      <div className="synqra-setup-body">
        <section className="synqra-setup-card"><div className="synqra-setup-title"><Building2 size={16}/> 01 / CADASTRO MATRIZ DA ORGANIZAÇÃO</div><div className="synqra-setup-subtitle">Informações jurídicas oficiais para emissão de notas fiscais e relatórios</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-razao">Razão Social:</label><input id="setup-razao" className={inputClass+' long'} maxLength={120} required value={company.razao_social} onChange={e=>changeCompany('razao_social',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-fantasia">Nome Fantasia:</label><input id="setup-fantasia" className={inputClass+' long'} maxLength={120} value={company.nome_fantasia??''} onChange={e=>changeCompany('nome_fantasia',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cnpj">CNPJ Matriz:</label><input id="setup-cnpj" className={inputClass+' w20'} maxLength={18} required value={company.cnpj} placeholder="00.000.000/0000-00" onChange={e=>changeCompany('cnpj',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-ie" style={{minWidth:'auto'}}>Inscrição Estadual:</label><input id="setup-ie" className={inputClass+' w12'} maxLength={20} value={company.inscricao_estadual??''} onChange={e=>changeCompany('inscricao_estadual',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-tel">Telefone Instit.:</label><input id="setup-tel" className={inputClass+' w12'} maxLength={20} value={company.telefone??''} onChange={e=>changeCompany('telefone',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-email" style={{minWidth:'auto'}}>E-mail Compras:</label><input id="setup-email" className={inputClass+' long'} style={{maxWidth:250}} type="email" maxLength={120} required value={company.email_compras??''} onChange={e=>changeCompany('email_compras',e.target.value)}/></div>
        </section>
        <section className="synqra-setup-card"><div className="synqra-setup-title"><MapPin size={16}/> 02 / ENDEREÇO SEDE E LOGÍSTICA</div><div className="synqra-setup-subtitle">Endereço operacional da matriz para logística e parametrização fiscal</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cep">CEP Operacional:</label><div className="synqra-setup-field"><input id="setup-cep" className={inputClass+' w6'} maxLength={9} value={address.cep} placeholder="00000-000" onChange={e=>changeAddress('cep',e.target.value)}/><button className="synqra-setup-lookup" type="button" onClick={()=>void buscarCep()} disabled={lookingCep}><Search size={13} style={{verticalAlign:'middle',marginRight:4}}/>{lookingCep?'BUSCANDO…':'BUSCAR CEP'}</button></div></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-logradouro">Logradouro/Rua:</label><input id="setup-logradouro" className={inputClass+' long'} maxLength={120} required value={address.logradouro} onChange={e=>changeAddress('logradouro',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-numero">Número Predial:</label><input id="setup-numero" className={inputClass+' w4'} maxLength={10} required value={address.numero} onChange={e=>changeAddress('numero',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-bairro" style={{minWidth:'auto'}}>Bairro:</label><input id="setup-bairro" className={inputClass+' w60'} maxLength={80} required value={address.bairro} onChange={e=>changeAddress('bairro',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="setup-cidade">Município/Cidade:</label><input id="setup-cidade" className={inputClass+' w60'} maxLength={80} required value={address.cidade} onChange={e=>changeAddress('cidade',e.target.value)}/><label className="synqra-setup-label" htmlFor="setup-uf" style={{minWidth:'auto'}}>Unidade Federaç.:</label><input id="setup-uf" className={inputClass+' w2'} maxLength={2} required value={address.uf} onChange={e=>changeAddress('uf',e.target.value.toUpperCase())}/></div>
      </section>
      </div><footer className="synqra-setup-footer"><button type="button" className="synqra-setup-btn synqra-setup-cancel" onClick={()=>window.location.assign('/configuracoes-adm')}><X size={14}/> CANCELAR CONFIGURAÇÃO</button><button type="submit" className="synqra-setup-btn synqra-setup-next" disabled={saving}><ArrowRight size={14}/>{saving?'SALVANDO…':'SALVAR E AVANÇAR PARA O PASSO 2'}</button></footer>
    </form> : step===2 ? <form onSubmit={saveFiscal}>
      <div className="synqra-setup-body">
        <section className="synqra-setup-card"><div className="synqra-setup-title"><Scale size={16}/> 03 / ENQUADRAMENTO TRIBUTÁRIO (Legislação Nacional)</div><div className="synqra-setup-subtitle">Defina o regime fiscal utilizado nas regras tributárias e na emissão de documentos</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="fis-regime">Regime Tributário:</label><select id="fis-regime" className="synqra-setup-select long" value={fiscal.regime_tributario} onChange={e=>changeFiscal('regime_tributario',e.target.value)}><option value="SIMPLES_NACIONAL">Simples Nacional</option><option value="LUCRO_PRESUMIDO">Regime Normal — Lucro Presumido</option><option value="LUCRO_REAL">Regime Normal — Lucro Real</option></select></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="fis-icms">Alíquota ICMS Padrão:</label><input id="fis-icms" className={inputClass+' w12'} inputMode="decimal" maxLength={6} value={fiscal.aliquota_icms_padrao} onChange={e=>changeFiscal('aliquota_icms_padrao',e.target.value)}/><span>%</span><label className="synqra-setup-label" htmlFor="fis-simples" style={{minWidth:'auto'}}>Alíquota Simples Nac.:</label><input id="fis-simples" className={inputClass+' w12'} inputMode="decimal" maxLength={6} value={fiscal.aliquota_simples} onChange={e=>changeFiscal('aliquota_simples',e.target.value)}/><span>%</span></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="fis-ie">Indicador IE Dest.:</label><select id="fis-ie" className="synqra-setup-select long" value={fiscal.indicador_ie_destinatario} onChange={e=>changeFiscal('indicador_ie_destinatario',e.target.value)}><option value="1">Contribuinte ICMS (Inscrição Estadual)</option><option value="2">Contribuinte isento de inscrição</option><option value="9">Não contribuinte</option></select></div>
        </section>
        <section className="synqra-setup-card"><div className="synqra-setup-title"><ReceiptText size={16}/> 04 / SÉRIE E SEQUÊNCIA DE NOTAS FISCAIS (SEFAZ)</div><div className="synqra-setup-subtitle">A sequência inicial configurada aqui é informativa; a reserva efetiva de numeração é controlada pelo mecanismo fiscal do ERP</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="fis-serie">Série NF-e Matriz:</label><input id="fis-serie" className={inputClass+' w4'} inputMode="numeric" maxLength={3} value={fiscal.serie_nfe} onChange={e=>changeFiscal('serie_nfe',e.target.value)}/><label className="synqra-setup-label" htmlFor="fis-proximo" style={{minWidth:'auto'}}>Sequencial Próxima Nota:</label><input id="fis-proximo" className={inputClass+' w12'} inputMode="numeric" maxLength={12} value={fiscal.proximo_numero_nfe} onChange={e=>changeFiscal('proximo_numero_nfe',e.target.value)}/></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="fis-serie-filial">Série NF-e Filial:</label><input id="fis-serie-filial" className={inputClass+' w4'} inputMode="numeric" maxLength={3} value={fiscal.serie_nfe_filial} onChange={e=>changeFiscal('serie_nfe_filial',e.target.value)}/><label className="synqra-setup-label" htmlFor="fis-ambiente" style={{minWidth:'auto'}}>Ambiente de Emissão:</label><select id="fis-ambiente" className="synqra-setup-select medium" value={fiscal.ambiente} onChange={e=>changeFiscal('ambiente',e.target.value)}><option value="homologacao">Homologação (Testes)</option><option value="producao">Produção (Validade Fiscal)</option></select></div>
          <div className="synqra-setup-row" style={{borderTop:'1px dashed #cbd5e1',paddingTop:14,marginTop:8}}><label className="synqra-setup-label" htmlFor="fis-cfop-venda">CFOP Padrão Venda:</label><input id="fis-cfop-venda" className={inputClass+' w6'} maxLength={4} inputMode="numeric" value={fiscal.cfop_padrao_venda} onChange={e=>changeFiscal('cfop_padrao_venda',digits(e.target.value).slice(0,4))}/><button type="button" className="synqra-setup-lookup" onClick={()=>void openCfop('venda')}><Search size={13} style={{verticalAlign:'middle',marginRight:4}}/>LUPA</button><label className="synqra-setup-label" htmlFor="fis-cfop-dev" style={{minWidth:'auto'}}>CFOP Padrão Devolução:</label><input id="fis-cfop-dev" className={inputClass+' w6'} maxLength={4} inputMode="numeric" value={fiscal.cfop_padrao_devolucao} onChange={e=>changeFiscal('cfop_padrao_devolucao',digits(e.target.value).slice(0,4))}/><button type="button" className="synqra-setup-lookup" onClick={()=>void openCfop('devolucao')}><Search size={13} style={{verticalAlign:'middle',marginRight:4}}/>LUPA</button></div>
        </section>
      </div><footer className="synqra-setup-footer"><button type="button" className="synqra-setup-btn synqra-setup-back" onClick={()=>{setStep(1);setError('');setMessage('')}}><ArrowLeft size={14}/> VOLTAR PARA O PASSO 1</button><button type="submit" className="synqra-setup-btn synqra-setup-next" disabled={saving}><ArrowRight size={14}/>{saving?'SALVANDO…':'SALVAR E AVANÇAR PARA O PASSO 3'}</button></footer>
    </form> : <form onSubmit={savePCP}>
      <div className="synqra-setup-body">
        <section className="synqra-setup-card"><div className="synqra-setup-title"><Building2 size={16}/> 05 / CONFIGURAÇÃO DE ENGENHARIA DE MANUFATURA &amp; ESTOQUE</div><div className="synqra-setup-subtitle">Parâmetros para geração de Ordens de Produção, consumo de componentes e controle de WIP.</div><hr className="synqra-setup-divider"/>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="pcp-wip">Depósito WIP Padrão:</label><div className="synqra-setup-field"><input id="pcp-wip" className={inputClass+' w6'} maxLength={11} required value={pcp.deposito_wip_padrao} onChange={e=>changePCP('deposito_wip_padrao',e.target.value)} placeholder="WIP-01"/><button type="button" className="synqra-setup-lookup" onClick={()=>setWipModal(true)}><Search size={13} style={{verticalAlign:'middle',marginRight:4}}/>LUPA</button></div><label className="synqra-setup-label" htmlFor="pcp-custo" style={{minWidth:'auto'}}>Tipo de Custo do Item:</label><select id="pcp-custo" className="synqra-setup-select medium" value={pcp.tipo_custo_item} onChange={e=>changePCP('tipo_custo_item',e.target.value)}><option value="CUSTO_MEDIO_PONDERADO">Custo Médio Ponderado</option><option value="PEPS">PEPS</option><option value="ULTIMA_COMPRA">Última Compra</option></select></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="pcp-consumo">Consumo Componentes:</label><select id="pcp-consumo" className="synqra-setup-select medium" value={pcp.consumo_componentes} onChange={e=>changePCP('consumo_componentes',e.target.value)}><option value="AUTOMATICA">Baixa Automática / Backflush</option><option value="MANUAL">Baixa Manual por Operador</option></select><label className="synqra-setup-label" htmlFor="pcp-lead" style={{minWidth:'auto'}}>Lead Time Geral (Dias):</label><input id="pcp-lead" className={inputClass+' w4'} inputMode="numeric" maxLength={4} value={pcp.lead_time_geral_dias} onChange={e=>changePCP('lead_time_geral_dias',digits(e.target.value).slice(0,4))} required /></div>
          <div className="synqra-setup-row"><label className="synqra-setup-label" htmlFor="pcp-rastreio">Rastreabilidade Op.:</label><select id="pcp-rastreio" className="synqra-setup-select medium" value={pcp.rastreabilidade_operacional} onChange={e=>changePCP('rastreabilidade_operacional',e.target.value)}><option value="NENHUMA">Sem rastreabilidade</option><option value="LOTE">Por lote</option><option value="SERIAL">Por número de série</option><option value="LOTE_E_SERIAL">Lote e número de série</option></select><label className="synqra-setup-label" htmlFor="pcp-lote" style={{minWidth:'auto'}}>Lote Padrão Fábrica:</label><input id="pcp-lote" className={inputClass+' w12'} inputMode="decimal" maxLength={18} value={pcp.lote_padrao_fabrica} onChange={e=>changePCP('lote_padrao_fabrica',e.target.value.replace(/[^0-9.,]/g,'').replace(',','.'))} required /></div>
        </section>
      </div><footer className="synqra-setup-footer"><button type="button" className="synqra-setup-btn synqra-setup-back" onClick={()=>{setStep(2);setError('');setMessage('')}}><ArrowLeft size={14}/> VOLTAR PARA O PASSO 2</button><button type="submit" className="synqra-setup-btn synqra-setup-next" disabled={saving}><CheckCircle2 size={14}/>{saving?'SALVANDO…':'CONCLUIR CONFIGURAÇÃO MESTRE'}</button></footer>
    </form>}
    {wipModal && <div className="synqra-setup-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setWipModal(false)}}><div className="synqra-setup-modal-box" role="dialog" aria-modal="true" aria-labelledby="setup-wip-title"><div className="synqra-setup-modal-head"><span id="setup-wip-title">DEPÓSITO WIP PADRÃO</span><button type="button" className="synqra-setup-lookup" onClick={()=>setWipModal(false)}>FECHAR</button></div><div className="synqra-setup-modal-body"><p>Informe o código do depósito WIP já cadastrado na sua operação. O assistente não cria depósitos automaticamente.</p><label className="synqra-setup-label" htmlFor="pcp-wip-modal">Código do depósito</label><input id="pcp-wip-modal" className={inputClass+' w6'} maxLength={11} value={pcp.deposito_wip_padrao} onChange={e=>changePCP('deposito_wip_padrao',e.target.value)} /><button type="button" className="synqra-setup-btn synqra-setup-next" style={{marginLeft:8}} onClick={()=>setWipModal(false)}>CONFIRMAR CÓDIGO</button></div></div></div>}
    {cfopModal && <div className="synqra-setup-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCfopModal(null)}}><div className="synqra-setup-modal-box" role="dialog" aria-modal="true" aria-labelledby="setup-cfop-title"><div className="synqra-setup-modal-head"><span id="setup-cfop-title">TABELA MESTRE FISCAL — CFOP {cfopModal==='venda'?'DE VENDA/SAÍDA':'DE DEVOLUÇÃO'}</span><button type="button" className="synqra-setup-lookup" onClick={()=>setCfopModal(null)} aria-label="Fechar consulta">FECHAR</button></div><div className="synqra-setup-modal-body"><p>Selecione um CFOP que já esteja cadastrado nas regras fiscais desta empresa. A lista não usa códigos fictícios.</p><input className={inputClass+' long'} value={cfopSearch} onChange={e=>setCfopSearch(e.target.value)} placeholder="Filtrar por código CFOP…"/>{cfopLoading?<p>Consultando regras fiscais…</p>:<table className="synqra-setup-table"><thead><tr><th>CFOP</th><th>Origem</th></tr></thead><tbody>{cfopRows.filter(code=>code.includes(cfopSearch.trim())).map(code=><tr key={code} role="button" tabIndex={0} onClick={()=>{changeFiscal(cfopModal==='venda'?'cfop_padrao_venda':'cfop_padrao_devolucao',code);setCfopModal(null)}} onKeyDown={e=>{if(e.key==='Enter'){changeFiscal(cfopModal==='venda'?'cfop_padrao_venda':'cfop_padrao_devolucao',code);setCfopModal(null)}}}><td><strong>{code}</strong></td><td>CFOP presente em regras fiscais da empresa</td></tr>)}{!cfopRows.filter(code=>code.includes(cfopSearch.trim())).length&&<tr><td colSpan={2}>{cfopRows.length?'Nenhum CFOP corresponde ao filtro.':'Nenhum CFOP encontrado nas regras fiscais da empresa. Digite o código no campo manualmente.'}</td></tr>}</tbody></table>}</div></div></div>}
  </section>
}
