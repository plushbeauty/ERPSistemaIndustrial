/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-052
 * Alterações: Registrar cabeçalho de revisão do componente de identidade empresarial.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-038
 * Alterações: Adicionar cabeçalho de rastreabilidade mantendo o tipo Profile/Company estrito existente.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { FormEvent, useEffect, useState } from 'react'
import { Building2, Image, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Profile={empresa_id:string|null;is_master:boolean;nome:string}
type Company={id:string;razao_social:string;nome_fantasia:string|null;cnpj:string;telefone:string|null;email:string|null;site:string|null;endereco:string|null;cidade:string|null;uf:string|null;cep:string|null;logo_url:string|null;logo_impressao_url:string|null;cor_primaria:string|null;cor_secundaria:string|null;cabecalho_relatorios:string|null;rodape_relatorios:string|null}

const fields: Array<[keyof Company,string]> = [
 ['razao_social','Razão social'],['nome_fantasia','Nome fantasia'],['cnpj','CNPJ'],['telefone','Telefone'],['email','E-mail'],['site','Site'],['endereco','Endereço'],['cidade','Cidade'],['uf','UF'],['cep','CEP'],['logo_url','Logo do sistema'],['logo_impressao_url','Logo para impressão'],['cor_primaria','Cor primária'],['cor_secundaria','Cor secundária'],['cabecalho_relatorios','Cabeçalho dos relatórios'],['rodape_relatorios','Rodapé dos relatórios']
]

export default function CompanySettings({profile}:{profile:Profile}){
 const [company,setCompany]=useState<Company|null>(null); const [busy,setBusy]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('')
 async function load(){setBusy(true);setError('');try{if(!profile.empresa_id){throw new Error('O Master precisa selecionar uma empresa antes de editar a identidade dela.')}const {data,error}=await supabase.from('erp_empresas').select('id,razao_social,nome_fantasia,cnpj,telefone,email,site,endereco,cidade,uf,cep,logo_url,logo_impressao_url,cor_primaria,cor_secundaria,cabecalho_relatorios,rodape_relatorios').eq('id',profile.empresa_id).maybeSingle();if(error)throw error;if(!data)throw new Error('Empresa não encontrada para o tenant atual.');setCompany(data as Company)}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a empresa.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[profile.empresa_id])
 function change(key:keyof Company,value:string){setCompany(current=>current?{...current,[key]:value}:current)}
 async function save(e:FormEvent){e.preventDefault();if(!company)return;setSaving(true);setError('');setMessage('');try{const payload={...company};delete (payload as Partial<Company>).id;const {error}=await supabase.from('erp_empresas').update(payload).eq('id',company.id);if(error)throw error;setMessage('Identidade da empresa salva. Novos relatórios usarão estas informações.')}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setSaving(false)}}
 if(busy)return <div className="mw3-card"><RefreshCw size={20}/> Carregando configuração da empresa…</div>
 if(!company)return <div className="mw3-card"><strong>Configuração de identidade indisponível</strong><p>{error}</p></div>
 return <section className="module-workspace-v3"><div className="mw3-head"><div><div className="mw3-breadcrumb"><Building2 size={18}/><span>Configurações → Empresa e identidade</span></div><h1>Identidade da empresa cliente</h1><p>Esta configuração pertence ao tenant e será usada nos relatórios, PDFs e impressões.</p></div><button className="mw3-btn" onClick={()=>void load()}><RefreshCw size={17}/> Atualizar</button></div>{(message||error)&&<div className="mw3-notice">{message||error}</div>}<form className="mw3-card mw3-form" onSubmit={save}><div className="mw3-form-grid">{fields.map(([key,label])=><label key={String(key)}>{label}{key.includes('logo')?<><div style={{display:'flex',gap:8,alignItems:'center'}}><Image size={18}/><input value={String(company[key]??'')} onChange={e=>change(key,e.target.value)} placeholder="URL do arquivo no Storage"/></div></>:<input value={String(company[key]??'')} onChange={e=>change(key,e.target.value)}/>}</label>)}</div><footer><button className="mw3-btn primary" type="submit" disabled={saving}><Save size={17}/>{saving?'Salvando…':'Salvar identidade'}</button></footer></form><div className="mw3-card" style={{marginTop:14}}><h2>Pré-visualização</h2><div style={{display:'flex',alignItems:'center',gap:16,padding:16,border:'1px solid #dbe3e8',borderRadius:12}}>{company.logo_impressao_url?<img src={company.logo_impressao_url} alt="Logo da empresa" style={{maxWidth:180,maxHeight:70,objectFit:'contain'}}/>:<Building2 size={44}/>}<div><strong>{company.nome_fantasia||company.razao_social}</strong><div>{company.cnpj} · {company.cidade||'—'} / {company.uf||'—'}</div></div></div></div></section>
}
