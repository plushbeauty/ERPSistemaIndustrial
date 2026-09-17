/* REVISÃO DE ENGENHARIA | Projeto: SGQ ERP Industrial | Pasta: src/components/ | Arquivo: InitialSetupLink.tsx | Data: 2026-09-17 | Correções: botão temporário de configuração inicial visível somente enquanto Master e Demo não estiverem provisionados | Segurança: status consultado pela Edge Function; nenhum segredo ou senha no componente | Testes/Homologação: revisão estática; build/Vercel pendente | Status: REVISADO — NÃO HOMOLOGADO */

import { useEffect, useState } from 'react';
import { supabase, supabaseConfigurado } from '../lib/supabaseClient';

export default function InitialSetupLink(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{let alive=true;const run=async()=>{if(!supabaseConfigurado||window.location.pathname!=='/login')return;try{const {data}=await supabase.functions.invoke('erp-login',{body:{action:'setup_status'}});if(alive)setVisible(!data?.locked)}catch{if(alive)setVisible(false)}};void run();return()=>{alive=false}},[]);
 if(!visible)return null;
 return <a href="/configuracao-adm-master" style={{position:'fixed',right:18,bottom:18,zIndex:9999,display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:42,padding:'0 15px',borderRadius:10,background:'#111',border:'1px solid rgba(201,168,76,.55)',color:'#e0c56f',fontSize:11,fontWeight:900,textDecoration:'none',boxShadow:'0 12px 30px rgba(0,0,0,.3)'}}>Configuração inicial ADM Master</a>
}
