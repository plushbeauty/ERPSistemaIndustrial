import { useEffect, useState } from 'react'
import { ClipboardCheck, FileText, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ERPHeaderActions(){
 const [showMaster,setShowMaster]=useState(false)
 useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.auth.getUser();if(!data.user)return;const {data:p}=await supabase.from('erp_usuarios').select('nivel_admin').eq('auth_user_id',data.user.id).maybeSingle();if(alive)setShowMaster(p?.nivel_admin===1)})();return()=>{alive=false}},[])
 if(['/','/login','/fiscal','/master','/pcp','/qualidade'].includes(location.pathname)) return null
 return <div className="erp-header-actions"><a href="/qualidade" className="erp-header-action quality"><ClipboardCheck size={17}/><span>Qualidade</span></a><a href="/fiscal" className="erp-header-action fiscal"><FileText size={17}/><span>Fiscal</span></a>{showMaster&&<a href="/master" className="erp-header-action master"><ShieldCheck size={17}/><span>Master</span></a>}</div>
}
