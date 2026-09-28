import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '../lib/supabaseClient';
import { narrowERPProfile, type AuthProfile } from './AuthProfile';

type AuthContextValue={session:Session|null;user:User|null;profile:AuthProfile|null;loading:boolean;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthContextValue|undefined>(undefined);

async function loadProfile(authUserId:string):Promise<AuthProfile>{
 const {data:rawUser,error}=await supabase.from('erp_usuarios').select('id,auth_user_id,email,empresa_id,perfil,nivel_admin,is_master,ativo,deleted_at,setor_id').eq('auth_user_id',authUserId).eq('ativo',true).is('deleted_at',null).maybeSingle();
 if(error)throw error;
 if(!rawUser||rawUser.auth_user_id!==authUserId)throw new Error('ERP_PROFILE_NOT_AUTHORIZED');
 let empresa:null|{id:string;ativo:boolean}=null;
 if(rawUser.empresa_id){const result=await supabase.from('erp_empresas').select('id,ativo').eq('id',rawUser.empresa_id).maybeSingle();if(result.error)throw result.error;empresa=result.data}
 return narrowERPProfile(rawUser,empresa);
}
export async function carregarPerfilAutenticado(user:User):Promise<AuthProfile>{return loadProfile(user.id)}
export function AuthProvider({children}:{children:ReactNode}){
 const[session,setSession]=useState<Session|null>(null),[profile,setProfile]=useState<AuthProfile|null>(null),[loading,setLoading]=useState(true);
 const hydrate=useCallback(async(next:Session|null)=>{
  if(!next?.user){setSession(null);setProfile(null);setLoading(false);return}
  setLoading(true);
  try{if(!supabaseConfigurado)throw new Error('SUPABASE_ENV_NOT_CONFIGURED');const nextProfile=await loadProfile(next.user.id);setSession(next);setProfile(nextProfile)}
  catch(error){console.error('[ERP AuthProvider] acesso bloqueado:',error);setSession(null);setProfile(null);await supabase.auth.signOut().catch(()=>undefined)}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{let mounted=true;if(!supabaseConfigurado){setLoading(false);return()=>{mounted=false}};
  void supabase.auth.getSession().then(({data,error})=>{if(!mounted)return;if(error){console.error('[ERP AuthProvider] sessão inválida:',error);void hydrate(null);return}void hydrate(data.session)});
  const{data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{if(mounted)void hydrate(next)});
  return()=>{mounted=false;listener.subscription.unsubscribe()}
 },[hydrate]);
 async function signOut(){try{await supabase.auth.signOut()}finally{setSession(null);setProfile(null);setLoading(false)}}
 return <AuthContext.Provider value={{session,user:session?.user??null,profile,loading,signOut}}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth deve ser usado dentro de AuthProvider');return value}
