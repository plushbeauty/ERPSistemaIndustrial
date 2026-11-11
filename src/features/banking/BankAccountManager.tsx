/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-CADASTRO-BANCOS-CONTAS-20261110-01
 * Cadastro compartilhado de instituições e contas bancárias, sempre vinculado ao tenant autenticado.
 */
import { useEffect, useMemo, useState } from 'react'
import { Landmark, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Institution = { id:string; codigo_compe:string|null; nome:string; empresa_id:string|null }
type Props = { onCreated?: () => void }

const field='h-10 w-full rounded-md border border-[#D3E3EA] bg-white px-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label='mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]'

export default function BankAccountManager({onCreated}:Props) {
  const [open,setOpen]=useState(false)
  const [company,setCompany]=useState('')
  const [institutions,setInstitutions]=useState<Institution[]>([])
  const [institutionId,setInstitutionId]=useState('')
  const [search,setSearch]=useState('')
  const [addInstitution,setAddInstitution]=useState(false)
  const [bankName,setBankName]=useState('')
  const [bankCode,setBankCode]=useState('')
  const [accountCode,setAccountCode]=useState('')
  const [accountName,setAccountName]=useState('')
  const [agency,setAgency]=useState('')
  const [account,setAccount]=useState('')
  const [opening,setOpening]=useState('0')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const load=async()=>{
    const current=await supabase.rpc('erp_current_empresa_id')
    if(current.error)throw current.error
    if(typeof current.data!=='string'||!current.data)throw new Error('Empresa ativa não identificada.')
    setCompany(current.data)
    const rows=await supabase.from('erp_instituicoes_financeiras').select('id,codigo_compe,nome,empresa_id').eq('ativo',true).or('empresa_id.is.null,empresa_id.eq.'+current.data).order('nome')
    if(rows.error)throw rows.error
    setInstitutions((rows.data||[]) as Institution[])
  }
  useEffect(()=>{if(open)void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar bancos.'))},[open])
  const selected=institutions.find(i=>i.id===institutionId)
  const options=useMemo(()=>institutions.filter(i=>(i.nome+' '+(i.codigo_compe||'')).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),[institutions,search])

  const save=async()=>{
    setError('');setMessage('')
    if(!accountCode.trim()||!accountName.trim()) {setError('Informe o código interno e o nome da conta.');return}
    if(!selected&&!addInstitution) {setError('Selecione uma instituição bancária ou cadastre uma nova.');return}
    if(addInstitution&&!bankName.trim()) {setError('Informe o nome da nova instituição.');return}
    const openingValue=Number(opening||0)
    if(!Number.isFinite(openingValue)) {setError('Saldo inicial inválido.');return}
    setBusy(true)
    try{
      let institution=selected
      if(addInstitution){
        const created=await supabase.from('erp_instituicoes_financeiras').insert({
          empresa_id:company,codigo_compe:bankCode.trim()||null,nome:bankName.trim(),ativo:true
        }).select('id,codigo_compe,nome,empresa_id').single()
        if(created.error)throw created.error
        institution=created.data as Institution
      }
      if(!institution)throw new Error('Instituição bancária não selecionada.')
      const inserted=await supabase.from('erp_contas_bancarias').insert({
        empresa_id:company,codigo:accountCode.trim(),nome:accountName.trim(),banco:institution.nome,
        instituicao_id:institution.id,agencia:agency.trim()||null,conta:account.trim()||null,
        saldo_inicial:Number(openingValue.toFixed(2)),moeda:'BRL',ativo:true
      }).select('id').single()
      if(inserted.error)throw inserted.error
      setMessage('Conta bancária cadastrada e vinculada à instituição.')
      setAccountCode('');setAccountName('');setAgency('');setAccount('');setOpening('0')
      setBankName('');setBankCode('');setAddInstitution(false);setInstitutionId('')
      await load()
      onCreated?.()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar a conta.')}
    finally{setBusy(false)}
  }

  return <>
    <button type="button" onClick={()=>{setOpen(true);setError('');setMessage('')}} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#2D8DB8] bg-white px-3 text-[11px] font-bold text-[#17658B] hover:bg-sky-50"><Plus size={14}/> Gerenciar bancos e contas</button>
    {open&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-3" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="bank-account-title" className="w-full max-w-[760px] rounded-xl border border-[#D3E3EA] bg-white p-5 text-[#123B50] shadow-2xl">
        <header className="mb-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]"><Landmark size={14}/> Cadastro bancário</div><h2 id="bank-account-title" className="mt-1 text-base font-extrabold">Instituições e contas da empresa</h2><p className="mt-1 text-[11px] text-slate-500">Instituições oficiais compartilhadas e bancos adicionais privados da empresa.</p></div><button type="button" onClick={()=>setOpen(false)} className="rounded-md p-2 hover:bg-slate-100"><X size={16}/></button></header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label}>Pesquisar instituição por nome ou código COMPE</label><input list="erp-bank-institutions" className={field} value={search} onChange={e=>{setSearch(e.target.value);const match=institutions.find(i=>(i.nome+' · '+(i.codigo_compe||'')).toLowerCase()===e.target.value.toLowerCase()||i.nome.toLowerCase()===e.target.value.toLowerCase());setInstitutionId(match?.id||'')}} placeholder="Ex.: 341 · Itaú Unibanco"/><datalist id="erp-bank-institutions">{options.map(i=><option key={i.id} value={i.nome+' · '+(i.codigo_compe||'sem código')}/>)}</datalist>
            <select className={field+' mt-1'} value={institutionId} onChange={e=>{setInstitutionId(e.target.value);const i=institutions.find(x=>x.id===e.target.value);setSearch(i?i.nome+' · '+(i.codigo_compe||'sem código'):'')}}><option value="">Selecione instituição encontrada…</option>{options.map(i=><option key={i.id} value={i.id}>{i.codigo_compe||'—'} · {i.nome}{i.empresa_id?' (cadastro da empresa)':''}</option>)}</select>
            <button type="button" onClick={()=>{setAddInstitution(v=>!v);setInstitutionId('')}} className="mt-2 text-[11px] font-bold text-[#17658B] underline">{addInstitution?'Escolher banco existente':' + Adicionar instituição não encontrada'}</button>
          </div>
          {addInstitution&&<><div><label className={label}>Nome da instituição *</label><input className={field} value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Nome oficial do banco"/></div><div><label className={label}>Código COMPE (se houver)</label><input className={field} value={bankCode} onChange={e=>setBankCode(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="Ex.: 999"/></div></>}
          <div><label className={label}>Código interno da conta *</label><input className={field} value={accountCode} onChange={e=>setAccountCode(e.target.value)} placeholder="Ex.: BB-001-CC"/></div>
          <div><label className={label}>Nome / identificação da conta *</label><input className={field} value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Ex.: Conta corrente principal"/></div>
          <div><label className={label}>Agência</label><input className={field} value={agency} onChange={e=>setAgency(e.target.value)} placeholder="Número da agência"/></div>
          <div><label className={label}>Conta bancária</label><input className={field} value={account} onChange={e=>setAccount(e.target.value)} placeholder="Número e dígito"/></div>
          <div><label className={label}>Saldo inicial (R$)</label><input type="number" step="0.01" className={field} value={opening} onChange={e=>setOpening(e.target.value)}/></div>
        </div>
        {error&&<div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>}
        {message&&<div role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{message}</div>}
        <footer className="mt-4 flex justify-end gap-2 border-t border-[#D3E3EA] pt-3"><button type="button" onClick={()=>setOpen(false)} className="h-9 rounded-md border border-[#D3E3EA] px-4 text-xs font-bold">Fechar</button><button type="button" disabled={busy} onClick={()=>void save()} className="h-9 rounded-md bg-[#2D8DB8] px-4 text-xs font-bold text-white disabled:opacity-50">{busy?'Salvando…':'Salvar conta bancária'}</button></footer>
      </section>
    </div>}
  </>
}
