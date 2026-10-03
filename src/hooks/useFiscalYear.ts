import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
export type FiscalYear = { id:string; ano:number; inicio:string; fim:string; ativo:boolean }
export function useFiscalYear(){
 const [fiscalYear,setFiscalYear]=useState<FiscalYear|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null)
 const reload=useCallback(async()=>{setLoading(true);setError(null);const r=await supabase.from('erp_anos_fiscais').select('id,ano,inicio,fim,ativo').eq('ativo',true).order('ano',{ascending:false}).limit(1).maybeSingle();if(r.error){setError(r.error.message);setFiscalYear(null)}else setFiscalYear(r.data as FiscalYear|null);setLoading(false)},[])
 useEffect(()=>{void reload()},[reload]);return {fiscalYear,loading,error,reload}
}
