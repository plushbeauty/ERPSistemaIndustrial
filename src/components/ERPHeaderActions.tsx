import { useEffect, useState } from 'react'
import { FileText, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ERPHeaderActions(){
 const [showMaster,setShowMaster]=useState(false)
 useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.auth.getUser();if(!data.user){return}const {data:p}=await supabase.from('erp_usuarios').select('nivel_admin').eq('auth_user_id',data.user.id).maybeSingle();if(alive)setShowMaster(p?.nivel_admin===1)})();return()=>{alive=false}},[])
 if(['/','/login','/fiscal','/master','/pcp'].includes(location.pathname)) return null
 return <div className="erp-header-actions"><a href="/fiscal" className="erp-header-action fiscal"><FileText size={17}/> Fiscal</a>{showMaster&&<a href="/master" className="erp-header-action master"><ShieldCheck size={17}/> Master</a>}</div>
}
