import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

type PontoState={perfilRole:string|null;loading:boolean}
const PontoContext=createContext<PontoState>({perfilRole:null,loading:true})
export function PontoProvider({children}:{children:ReactNode}){
 const [perfilRole,setPerfilRole]=useState<string|null>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{let alive=true;void (async()=>{try{const {data}=await supabase.auth.getUser();if(!data.user){if(alive)setPerfilRole(null);return}const r=await supabase.from('erp_usuarios').select('perfil').eq('auth_user_id',data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();if(alive)setPerfilRole(r.error?null:String(r.data?.perfil??'').trim().toUpperCase())}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[])
 return <PontoContext.Provider value={{perfilRole,loading}}>{children}</PontoContext.Provider>
}
export function usePonto(){return useContext(PontoContext)}
