import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type EmpresaEtiqueta = {
  id: string
  razao_social: string | null
  cnpj: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  logo_url: string | null
  logo_impressao_url: string | null
}
export type ClienteEtiqueta = {
  id: string
  razao_social: string | null
  documento: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
}
export function useDadosReaisEtiqueta(clienteId?: string) {
  const [empresa,setEmpresa]=useState<EmpresaEtiqueta|null>(null)
  const [cliente,setCliente]=useState<ClienteEtiqueta|null>(null)
  const [empresaId,setEmpresaId]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const carregarCliente=useCallback(async(id:string)=>{
    if(!id){setCliente(null);return}
    const {data,error}=await supabase.from('erp_clientes')
      .select('id,razao_social,documento,endereco,cidade,estado').eq('id',id).maybeSingle()
    if(error) throw error
    setCliente(data as ClienteEtiqueta|null)
  },[])
  useEffect(()=>{
    let active=true
    void (async()=>{
      setLoading(true);setError(null)
      try{
        const {data:tenant,error:tenantError}=await supabase.rpc('erp_current_empresa_id')
        if(tenantError) throw tenantError
        if(!tenant) throw new Error('Empresa da sessão não identificada.')
        const id=String(tenant)
        const {data,error:companyError}=await supabase.from('erp_empresas')
          .select('id,razao_social,cnpj,endereco,cidade,uf,logo_url,logo_impressao_url').eq('id',id).maybeSingle()
        if(companyError) throw companyError
        if(!data) throw new Error('Cadastro da empresa emitente não encontrado.')
        if(!active)return
        setEmpresa(data as EmpresaEtiqueta);setEmpresaId(id)
        if(clienteId){
          const {data:customer,error:customerError}=await supabase.from('erp_clientes')
            .select('id,razao_social,documento,endereco,cidade,estado').eq('id',clienteId).maybeSingle()
          if(customerError) throw customerError
          if(active)setCliente(customer as ClienteEtiqueta|null)
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:'Falha ao carregar dados fiscais da etiqueta.')}
      finally{if(active)setLoading(false)}
    })()
    return ()=>{active=false}
  },[clienteId])
  return {empresa,cliente,empresaId,loading,error,carregarCliente}
}
