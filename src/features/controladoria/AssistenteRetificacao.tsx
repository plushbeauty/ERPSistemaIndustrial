/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-11
 * @REVISAO: REV-ESTORNO-INVERSO-REAL-20261111-02 — estorno por lançamento inverso, trava server-side de período, anexo privado e auditoria.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO AUTORIZADA PELO PROPRIETÁRIO; execução bloqueada sem lançamento contábil original correspondente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, RotateCcw, ShieldAlert, FileText, RefreshCw, Paperclip, LockKeyhole, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type DocType='TITULO'|'BAIXA'|'NOTA_DEBITO'|'NFE'
type SourceTable='erp_financeiro_titulos'|'erp_notas_debito_financeiras'
type FoundDocument={
 id:string;type:DocType;typeLabel:string;number:string;entity:string;amount:number;date:string
 account:string;costCenter:string;status:string;sourceTable:SourceTable;ledgerCount:number
}
type AuditRow={
 id:string;documento_alvo:string;data_estorno:string;justificativa:string;documento_estornado_id:string|null
 criado_em:string;tipo_documento:string|null;acao_titulo:string|null;valor_estornado:number|string|null
 lancamentos_originais:string[]|null;lancamentos_inversos:string[]|null;comprovante_path:string|null
 usuario_id:string|null;status:string;responsavel?:string
}
type UserName={id:string;nome:string|null;email:string|null}

const control='h-10 w-full rounded-md border border-[#CBD9E0] bg-white px-3 text-[12px] text-[#183B4D] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-[#F3F6F8] disabled:text-[#617784]'
const label='mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#526C79]'
const card='rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm sm:p-5'
const brl=(value:number)=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateBR=(value:string)=>value?new Date(value+(value.length===10?'T12:00:00':'')).toLocaleDateString('pt-BR'):'—'

export default function AssistenteRetificacao(){
 const navigate=useNavigate()
 const [access,setAccess]=useState<boolean|null>(null)
 const [companyId,setCompanyId]=useState('')
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [docType,setDocType]=useState<DocType>('TITULO')
 const [docNumber,setDocNumber]=useState('')
 const [competencia,setCompetencia]=useState('')
 const [found,setFound]=useState<FoundDocument|null>(null)
 const [searching,setSearching]=useState(false)
 const [reason,setReason]=useState('')
 const [reversalDate,setReversalDate]=useState(new Date().toISOString().slice(0,10))
 const [linkedAction,setLinkedAction]=useState('MANTER')
 const [justification,setJustification]=useState('')
 const [proof,setProof]=useState<File|null>(null)
 const [periodOpen,setPeriodOpen]=useState(false)
 const [inverseAware,setInverseAware]=useState(false)
 const [saving,setSaving]=useState(false)
 const [audit,setAudit]=useState<AuditRow[]>([])
 const [refreshing,setRefreshing]=useState(false)

 const loadAudit=useCallback(async()=>{
  if(!companyId){setAudit([]);return}
  setRefreshing(true)
  try{
   const result=await supabase.from('erp_fiscal_estornos')
    .select('id,documento_alvo,data_estorno,justificativa,documento_estornado_id,criado_em,tipo_documento,acao_titulo,valor_estornado,lancamentos_originais,lancamentos_inversos,comprovante_path,usuario_id,status')
    .eq('empresa_id',companyId).order('criado_em',{ascending:false}).limit(200)
   if(result.error)throw result.error
   const rows=(result.data??[]) as AuditRow[]
   const userIds=[...new Set(rows.map(row=>row.usuario_id).filter((value):value is string=>Boolean(value)))]
   let names:UserName[]=[]
   if(userIds.length){
    const users=await supabase.from('erp_usuarios').select('id,nome,email').eq('empresa_id',companyId).in('id',userIds)
    if(users.error)throw users.error
    names=(users.data??[]) as UserName[]
   }
   const nameMap=new Map(names.map(user=>[user.id,user.nome||user.email||user.id.slice(0,8)]))
   setAudit(rows.map(row=>({...row,responsavel:row.usuario_id?nameMap.get(row.usuario_id)??row.usuario_id.slice(0,8):'—'})))
  }catch(cause){setError('Não foi possível carregar o histórico de auditoria: '+(cause instanceof Error?cause.message:'erro desconhecido'))}
  finally{setRefreshing(false)}
 },[companyId])

 useEffect(()=>{
  let active=true
  const checkAccess=async()=>{
   const auth=await supabase.auth.getUser()
   if(auth.error)throw auth.error
   if(!auth.data.user){navigate('/login',{replace:true});return}
   const [profile,company]=await Promise.all([
    supabase.from('erp_usuarios').select('id,perfil,is_master,nivel_admin,empresa_id,setor_id').eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle(),
    supabase.rpc('erp_current_empresa_id')
   ])
   if(profile.error)throw profile.error
   if(company.error)throw company.error
   if(!company.data)throw new Error('Selecione uma empresa ativa no contexto Master antes de acessar o estorno.')
   const role=String(profile.data?.perfil??'').trim().toUpperCase()
   const isMaster=profile.data?.is_master===true||Number(profile.data?.nivel_admin)>=100||['SUPER_ADMIN','MASTER'].includes(role)
   const allowed=isMaster||['ADMINISTRADOR','CONTROLADORIA','FINANCEIRO'].includes(role)
   if(active){setCompanyId(String(company.data));setAccess(allowed)}
  }
  void checkAccess().catch(cause=>{if(active){setAccess(false);setError(cause instanceof Error?cause.message:'Falha ao validar acesso.')}})
  return()=>{active=false}
 },[navigate])

 useEffect(()=>{if(access===true&&companyId)void loadAudit()},[access,companyId,loadAudit])

 const searchDocument=async()=>{
  setError('');setMessage('');setFound(null)
  if(!companyId){setError('Empresa ativa não identificada.');return}
  if(!docNumber.trim()){setError('Informe o número ou identificador exato do documento.');return}
  if(!['TITULO','NOTA_DEBITO'].includes(docType)){setError('Baixas e NF-e exigem rotinas específicas de reversão e permanecem bloqueadas.');return}
  setSearching(true)
  try{
   let row:Omit<FoundDocument,'ledgerCount'>|null=null
   if(docType==='TITULO'){
    let q=await supabase.from('erp_financeiro_titulos')
     .select('id,parceiro_tipo,parceiro_id,descricao,documento,centro_custo,data_emissao,valor_total,status,conta_bancaria_id')
     .eq('empresa_id',companyId).eq('documento',docNumber.trim()).order('criado_em',{ascending:false}).limit(1).maybeSingle()
    if(q.error)throw q.error
    if(!q.data&&/^[0-9a-f-]{36}$/i.test(docNumber.trim())){
     q=await supabase.from('erp_financeiro_titulos').select('id,parceiro_tipo,parceiro_id,descricao,documento,centro_custo,data_emissao,valor_total,status,conta_bancaria_id').eq('empresa_id',companyId).eq('id',docNumber.trim()).maybeSingle()
     if(q.error)throw q.error
    }
    if(q.data)row={id:q.data.id,type:'TITULO',typeLabel:'Título financeiro',number:q.data.documento||q.data.id,entity:[q.data.parceiro_tipo,q.data.parceiro_id].filter(Boolean).join(' · ')||'Não informado',amount:Number(q.data.valor_total||0),date:q.data.data_emissao||'',account:q.data.conta_bancaria_id||'Não vinculada',costCenter:q.data.centro_custo||'Não informado',status:q.data.status||'—',sourceTable:'erp_financeiro_titulos'}
   }else{
    let q=await supabase.from('erp_notas_debito_financeiras')
     .select('id,numero_nota,documento_ref,entidade_nome,data_emissao,valor_total,status,conta_bancaria_id,centro_custo_id')
     .eq('empresa_id',companyId).eq('numero_nota',docNumber.trim()).limit(1).maybeSingle()
    if(q.error)throw q.error
    if(!q.data){
     q=await supabase.from('erp_notas_debito_financeiras').select('id,numero_nota,documento_ref,entidade_nome,data_emissao,valor_total,status,conta_bancaria_id,centro_custo_id').eq('empresa_id',companyId).eq('documento_ref',docNumber.trim()).limit(1).maybeSingle()
     if(q.error)throw q.error
    }
    if(q.data)row={id:q.data.id,type:'NOTA_DEBITO',typeLabel:'Nota de débito',number:q.data.numero_nota||q.data.documento_ref||q.data.id,entity:q.data.entidade_nome||'Não informado',amount:Number(q.data.valor_total||0),date:q.data.data_emissao||'',account:q.data.conta_bancaria_id||'Não vinculada',costCenter:q.data.centro_custo_id||'Não informado',status:q.data.status||'—',sourceTable:'erp_notas_debito_financeiras'}
   }
   if(!row)throw new Error('Nenhum documento correspondente foi encontrado na empresa ativa.')
   if(competencia&&row.date&&row.date.slice(0,7)!==competencia)throw new Error('O documento foi localizado, mas não pertence à competência informada.')
   const ledger=await supabase.from('erp_fiscal_razao_lancamentos').select('id',{count:'exact',head:true}).eq('empresa_id',companyId).eq('documento',row.number)
   if(ledger.error)throw ledger.error
   const prior=await supabase.from('erp_fiscal_estornos').select('id',{count:'exact',head:true}).eq('empresa_id',companyId).eq('documento_alvo',row.number)
   if(prior.error)throw prior.error
   if((prior.count??0)>0)throw new Error('Este documento já possui estorno registrado.')
   const complete={...row,ledgerCount:ledger.count??0}
   setFound(complete)
   if(complete.ledgerCount===0)setError('Documento localizado, mas não existe lançamento contábil original correspondente. O botão de estorno permanecerá bloqueado; nenhum lançamento será inventado.')
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao localizar o documento.')}
  finally{setSearching(false)}
 }

 const clear=()=>{
  setDocNumber('');setCompetencia('');setFound(null);setReason('');setJustification('');setProof(null)
  setPeriodOpen(false);setInverseAware(false);setMessage('');setError('')
 }

 const canSubmit=access===true&&!!found&&found.ledgerCount>0&&!!reason&&!!reversalDate&&justification.trim().length>=25&&periodOpen&&inverseAware&&!saving

 const submit=async()=>{
  if(!canSubmit||!found||!companyId)return
  setError('');setMessage('');setSaving(true)
  let uploadedPath:string|null=null
  try{
   if(proof){
    const safeName=proof.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    uploadedPath=companyId+'/estornos/'+crypto.randomUUID()+'-'+safeName
    const upload=await supabase.storage.from('financeiro-retificacoes').upload(uploadedPath,proof,{upsert:false})
    if(upload.error)throw upload.error
   }
   const result=await supabase.rpc('erp_fiscal_estornar_documento',{
    p_documento:found.number,
    p_documento_id:found.id,
    p_source_table:found.sourceTable,
    p_tipo_documento:found.type,
    p_data:reversalDate,
    p_acao_titulo:linkedAction,
    p_justificativa:reason+': '+justification.trim(),
    p_comprovante_path:uploadedPath
   })
   if(result.error)throw result.error
   setMessage('Estorno inverso executado. Os lançamentos originais foram preservados, os lançamentos contrários foram gravados e a auditoria foi registrada.')
   setFound(null);setDocNumber('');setJustification('');setProof(null);setPeriodOpen(false);setInverseAware(false)
   await loadAudit()
  }catch(cause){
   if(uploadedPath)await supabase.storage.from('financeiro-retificacoes').remove([uploadedPath])
   setError(cause instanceof Error?cause.message:'Não foi possível executar o estorno documental.')
  }finally{setSaving(false)}
 }

 const openProof=async(path:string)=>{
  const signed=await supabase.storage.from('financeiro-retificacoes').createSignedUrl(path,300)
  if(signed.error){setError('Não foi possível abrir o comprovante: '+signed.error.message);return}
  window.open(signed.data.signedUrl,'_blank','noopener,noreferrer')
 }
 const helpText=useMemo(()=> 'O estorno só é executado quando existe lançamento contábil original correspondente, o período está aberto e o usuário possui permissão. A rotina cria lançamentos inversos vinculados ao original, registra auditoria e preserva os registros originais. Baixas e NF-e aguardam rotinas fiscais/financeiras específicas.',[])

 return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#183B4D] sm:p-4">
  <div className="mx-auto max-w-[1500px] space-y-3">
   <header className="space-y-2">
    <div className="flex items-center gap-3"><button type="button" onClick={()=>navigate(-1)} className="inline-flex h-[38px] w-[115px] items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] shadow-sm transition hover:bg-slate-50"><ArrowLeft size={15}/>Voltar</button><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#2D8DB8]">ERP INDUSTRIAL • CONTROLADORIA › ESTORNO DOCUMENTAL</p></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-lg font-bold text-[#123B50]">Assistente de Retificação e Compliance Financeiro</h1><p className="mt-1 text-xs text-[#607987]">Lançamento inverso de auditoria, trava de período fechado e preservação do documento original.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800"><LockKeyhole size={13}/>Acesso restrito à Administração, Controladoria ou Financeiro</span></div>
   </header>

   {access===null&&<div role="status" className={card}>Verificando permissões de acesso…</div>}
   {access===false&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Acesso restrito ou empresa ativa não selecionada. {error}</div>}
   {access===true&&<>
    <section className={card}>
     <div className="mb-4 flex items-center gap-2"><Search size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">1. Localizar documento para estorno</h2></div>
     <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[240px_minmax(240px,1fr)_160px_175px]">
      <label><span className={label}>Tipo de documento *</span><select className={control} value={docType} onChange={e=>{setDocType(e.target.value as DocType);setFound(null);setError('')}}><option value="TITULO">Título Financeiro</option><option value="NOTA_DEBITO">Nota de Débito</option><option value="BAIXA" disabled>Baixa Bancária — rotina específica pendente</option><option value="NFE" disabled>NF-e — rotina fiscal específica pendente</option></select></label>
      <label><span className={label}>Nº Documento / Título *</span><input className={control} value={docNumber} onChange={e=>setDocNumber(e.target.value)} placeholder="Digite o número exato..." maxLength={120}/></label>
      <label><span className={label}>Competência / Emissão</span><input className={control} type="month" value={competencia} onChange={e=>setCompetencia(e.target.value)}/></label>
      <button type="button" onClick={()=>void searchDocument()} disabled={searching} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176B91] px-3 text-xs font-bold text-white disabled:opacity-50"><Search size={14}/>{searching?'Buscando…':'Buscar documento'}</button>
     </div>
    </section>

    <section className={card}>
     <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">2. Conferência do documento localizado</h2><p className="mt-1 text-[11px] text-[#718792]">Dados do registro original — somente leitura</p></div><span className="rounded-full bg-[#EEF3F6] px-3 py-1 text-[10px] font-bold text-[#526C79]">Status: {found?.status||'Aguardando busca'}</span></div>
     <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label><span className={label}>Nº Documento / ID</span><input className={control} disabled value={found?.number||''} placeholder="—"/></label>
      <label><span className={label}>Entidade (Cliente / Fornecedor)</span><input className={control} disabled value={found?.entity||''} placeholder="—"/></label>
      <label><span className={label}>Valor original (R$)</span><input className={control} disabled value={found?brl(found.amount):''} placeholder="—"/></label>
      <label><span className={label}>Data de lançamento</span><input className={control} disabled value={found?dateBR(found.date):''} placeholder="—"/></label>
      <label><span className={label}>Conta / Diário contábil</span><input className={control} disabled value={found?.account||''} placeholder="—"/></label>
      <label><span className={label}>Centro de custo</span><input className={control} disabled value={found?.costCenter||''} placeholder="—"/></label>
     </div>
     {found&&<div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] text-sky-800"><span>Origem: {found.sourceTable} · ID: {found.id}</span><span>·</span><strong>{found.ledgerCount} lançamento(s) contábil(is) original(is) encontrado(s)</strong>{found.ledgerCount>0&&<Pill tone="green">Elegível para estorno</Pill>}</div>}
    </section>

    <section className={card}>
     <div className="mb-4 flex items-center gap-2"><ShieldAlert size={16} className="text-[#D18A28]"/><h2 className="text-sm font-bold">3. Parâmetros de compliance e justificativa</h2></div>
     <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1.2fr)_160px_minmax(260px,1fr)]">
      <label><span className={label}>Motivo padronizado (Compliance) *</span><select className={control} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Selecione o motivo…</option><option>Lançamento em duplicidade</option><option>Erro de valor / alíquota</option><option>Devolução total</option><option>Cancelamento operacional</option><option>Documento emitido incorretamente</option><option>Outros</option></select></label>
      <label><span className={label}>Data contábil do estorno *</span><input className={control} type="date" value={reversalDate} onChange={e=>setReversalDate(e.target.value)}/></label>
      <label><span className={label}>Ação nos títulos vinculados *</span><select className={control} value={linkedAction} onChange={e=>setLinkedAction(e.target.value)}><option value="MANTER">Manter título original</option><option value="REABRIR">Reabrir título sem baixas</option><option value="CANCELAR">Cancelar título sem baixas</option></select></label>
     </div>
     <div className="mt-4"><label><span className={label}>Justificativa da Controladoria * (mínimo 25 caracteres)</span><textarea className="min-h-[85px] w-full rounded-md border border-[#CBD9E0] bg-white px-3 py-2 text-xs text-[#183B4D] outline-none focus:border-[#2D8DB8]" value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Descreva detalhadamente o motivo do estorno documental para fins de auditoria..." maxLength={2000}/></label><p className="mt-1 text-right text-[10px] text-[#718792]">{justification.trim().length}/25 caracteres mínimos</p></div>
     <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(280px,480px)_1fr]"><label><span className={label}>Anexar documento comprobatório / protocolo</span><span className="flex h-10 items-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-3 text-xs text-[#526C79]"><Paperclip size={14}/><input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" className="min-w-0 flex-1 text-[11px]" onChange={e=>setProof(e.target.files?.[0]||null)}/></span>{proof&&<span className="mt-1 block truncate text-[10px]">{proof.name}</span>}</label></div>
     <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-900">Travas de segurança e confirmação</p><label className="flex items-start gap-2 text-xs text-amber-950"><input type="checkbox" checked={periodOpen} onChange={e=>setPeriodOpen(e.target.checked)} className="mt-0.5"/>Confirmo que o período contábil desta competência encontra-se ABERTO para estorno.</label><label className="mt-2 flex items-start gap-2 text-xs text-amber-950"><input type="checkbox" checked={inverseAware} onChange={e=>setInverseAware(e.target.checked)} className="mt-0.5"/>Estou ciente de que a operação criará lançamentos inversos vinculados e preservará integralmente o histórico original.</label></div>
     <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3EBEF] pt-4"><button type="button" onClick={clear} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-5 text-xs font-bold text-[#526C79]"><RotateCcw size={14}/>Limpar tela</button><button type="button" onClick={()=>void submit()} disabled={!canSubmit} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-[#DC2626] px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><ShieldAlert size={14}/>{saving?'Executando…':'Executar estorno inverso'}</button></div>
     <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900"><strong>Regra de integridade:</strong> sem lançamento contábil original correspondente, o sistema bloqueia a execução. Baixas e NF-e continuam bloqueadas até suas rotinas específicas de reversão. O período fechado também é validado diretamente no banco.</p>
    </section>

    <section className={card}>
     <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">4. Log de estornos e retificações executadas</h2></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#EEF3F6] px-3 py-1 text-[10px] font-bold text-[#526C79]">{audit.length} registro(s)</span><button type="button" onClick={()=>void loadAudit()} disabled={refreshing} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CBD9E0] px-3 text-[10px] font-semibold"><RefreshCw size={12} className={refreshing?'animate-spin':''}/>Atualizar</button></div></div>
     <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-[11px]"><thead><tr className="h-10 bg-[#EAF2F6] text-left text-[10px] uppercase tracking-wide text-[#526C79]"><th className="px-3">Data / Hora</th><th className="px-3">Documento original</th><th className="px-3">Tipo / ação</th><th className="px-3 text-right">Valor estornado</th><th className="px-3">Usuário</th><th className="px-3">Status</th><th className="px-3">Justificativa</th><th className="px-3">Comprovante</th></tr></thead><tbody>{audit.map(item=><tr key={item.id} className="h-12 border-b border-[#E6EDF1]"><td className="whitespace-nowrap px-3">{new Date(item.criado_em).toLocaleString('pt-BR')}</td><td className="px-3 font-semibold">{item.documento_alvo}</td><td className="px-3">{item.tipo_documento??'—'} / {item.acao_titulo??'—'}</td><td className="px-3 text-right tabular-nums">{brl(Number(item.valor_estornado??0))}</td><td className="px-3">{item.responsavel??'—'}</td><td className="px-3"><span className="rounded-full bg-[#EFF9F3] px-2 py-1 text-[9px] font-bold text-[#287B59]">{item.status}</span></td><td className="max-w-[300px] px-3">{item.justificativa}</td><td className="px-3">{item.comprovante_path?<button type="button" onClick={()=>void openProof(item.comprovante_path as string)} className="inline-flex items-center gap-1 text-[#176487] underline"><ExternalLink size={11}/>Abrir</button>:'—'}</td></tr>)}{!audit.length&&<tr><td colSpan={8} className="h-16 text-center text-[#718792]">Nenhum estorno documental registrado para a empresa atual.</td></tr>}</tbody></table></div>
    </section>
    <p className="text-[10px] text-[#718792]">{helpText}</p>
   </>}
   {error&&access===true&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
   {message&&access===true&&<div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div>}
  </div>
 </main>
}
