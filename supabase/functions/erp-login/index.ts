import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRODUCTION_ORIGIN='https://erp-sistema-industrial.vercel.app'
const allowed=(origin:string)=>{if(!origin)return false;if(origin===PRODUCTION_ORIGIN)return true;try{const h=new URL(origin).hostname.toLowerCase();return h==='localhost'||h==='127.0.0.1'||(h.startsWith('erp-sistema-industrial-')&&h.endsWith('.vercel.app'))}catch{return false}}
const headers=(req:Request)=>{const o=req.headers.get('Origin')??'';return {'Access-Control-Allow-Origin':allowed(o)?o:PRODUCTION_ORIGIN,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'86400',Vary:'Origin, Access-Control-Request-Headers'}}
const out=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers(req),'Content-Type':'application/json'}})

type B={action?:unknown;email?:unknown;password?:unknown;empresa_id?:unknown;identificador?:unknown;usuario?:unknown;username?:unknown;senha?:unknown;nome?:unknown}
type U={id:string;nome:string|null;login_nome:string|null;email:string|null;empresa_id:string|null;setor_id:string|null;ativo:boolean;nivel_admin:number|null;auth_user_id:string|null;is_master:boolean|null;role:string|null;deleted_at:string|null}
type GlobalMaster={id:string;nome:string|null;email:string|null;auth_user_id:string;ativo:boolean;nivel_admin:number|null;perfil:string|null}

const masterRole=(u:Pick<U,'is_master'|'nivel_admin'|'role'>)=>Boolean(u.is_master)||Number(u.nivel_admin??0)>=9||['MASTER','MASTER_ADMIN','SUPER_ADMIN'].includes(String(u.role??'').trim().toUpperCase())

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
  if(req.method!=='POST')return out(req,{error:'METODO_NAO_PERMITIDO'},405)
  try{
    const b=await req.json() as B
    const action=String(b.action??'login')
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if(!url||!anon||!service)return out(req,{error:'AUTH_CONFIGURATION_ERROR'},500)
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})

    const {data:globalMasterRow,error:globalMasterError}=await admin
      .from('usuarios')
      .select('id,nome,email,auth_user_id,ativo,nivel_admin,perfil')
      .or('nivel_admin.gte.80,perfil.ilike.SUPER_ADMIN,perfil.ilike.MASTER,perfil.ilike.MASTER_ADMIN')
      .eq('ativo',true)
      .limit(1)
      .maybeSingle()
    if(globalMasterError)return out(req,{error:'GLOBAL_MASTER_LOOKUP_ERROR'},500)
    const globalMaster=globalMasterRow?.auth_user_id?globalMasterRow as GlobalMaster:null

    if(action==='setup_status'){
      const {data,error}=await admin.from('erp_usuarios').select('id').eq('is_master',true).eq('ativo',true).is('deleted_at',null).limit(1)
      if(error)return out(req,{error:'MASTER_STATUS_ERROR'},500)
      return out(req,{available:!(data?.length)&&!globalMaster})
    }

    if(action==='bootstrap_master'){
      const nome=String(b.nome??'').trim(),email=String(b.email??'').trim().toLowerCase(),pw=String(b.password??'')
      if(nome.length<3)return out(req,{error:'NOME_INVALIDO'},400)
      if(!/^\S+@\S+\.\S+$/.test(email))return out(req,{error:'EMAIL_INVALIDO'},400)
      if(pw.length<6)return out(req,{error:'SENHA_FRACA'},400)
      const {data:existing}=await admin.from('erp_usuarios').select('id').eq('is_master',true).eq('ativo',true).is('deleted_at',null).limit(1)
      if(existing?.length||globalMaster)return out(req,{error:'MASTER_JA_CADASTRADO',locked:true},409)
      const {data:byEmail}=await admin.auth.admin.getUserByEmail(email)
      if(byEmail?.user)return out(req,{error:'EMAIL_AUTH_JA_EXISTE'},409)
      let empresaId:string|undefined,userId:string|undefined
      try{
        const slug=email.split('@')[0].replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()+'-'+Date.now().toString(36)
        const ce=await admin.from('erp_empresas').insert({razao_social:nome,nome_fantasia:nome,email,ativo:true,codigo:slug.toUpperCase(),slug,plano:'Diamante',plano_status:'TESTE',trial_ends_at:new Date(Date.now()+15*86400000).toISOString()}).select('id').single()
        if(ce.error||!ce.data)throw ce.error||new Error('EMPRESA_MASTER_CREATE_FAILED')
        empresaId=ce.data.id
        const au=await admin.auth.admin.createUser({email,password:pw,email_confirm:true,user_metadata:{nome,empresa_id:empresaId,is_master:true}})
        if(au.error||!au.data.user)throw au.error||new Error('MASTER_AUTH_CREATE_FAILED')
        userId=au.data.user.id
        const u=await admin.from('erp_usuarios').insert({empresa_id:empresaId,auth_user_id:userId,nome,email,nivel_admin:100,ativo:true,login_nome:nome,is_master:true,role:'MASTER'})
        if(u.error)throw u.error
        return out(req,{ok:true,empresa_id:empresaId,email,nome})
      }catch(e){
        if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>undefined)
        if(empresaId)await admin.from('erp_empresas').delete().eq('id',empresaId).catch(()=>undefined)
        throw e
      }
    }

    const id=String(b.email??b.identificador??b.usuario??b.username??'').trim()
    const pw=String(b.password??b.senha??'')
    const requestedEmpresa=String(b.empresa_id??'').trim()||null
    if(!id||!pw)return out(req,{error:'Informe usuário/e-mail e senha.'},400)

    const n=id.toLowerCase()
    const {data:rows,error:re}=await admin.from('erp_usuarios').select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,role,deleted_at').eq('ativo',true).is('deleted_at',null).limit(1000)
    if(re)return out(req,{error:'AUTH_PROFILE_LOOKUP_ERROR'},500)
    const matches=((rows??[]) as U[]).filter(u=>String(u.email??'').trim().toLowerCase()===n||String(u.login_nome??'').trim().toLowerCase()===n||String(u.nome??'').trim().toLowerCase()===n)

    let candidate:U|null=matches.length===1?matches[0]:null
    let isGlobalMaster=false
    if(!candidate&&globalMaster){
      const globalEmail=String(globalMaster.email??'').trim().toLowerCase()
      const globalName=String(globalMaster.nome??'').trim().toLowerCase()
      if(globalEmail===n||globalName===n){
        isGlobalMaster=true
        candidate={
          id:globalMaster.id,
          nome:globalMaster.nome,
          login_nome:globalMaster.nome,
          email:globalMaster.email,
          empresa_id:null,
          setor_id:null,
          ativo:true,
          nivel_admin:globalMaster.nivel_admin??100,
          auth_user_id:globalMaster.auth_user_id,
          is_master:true,
          role:'MASTER',
          deleted_at:null,
        }
      }
    }

    if(!candidate||!candidate.auth_user_id)return out(req,{error:'USUARIO_OU_SENHA_INVALIDOS'},401)
    const candidateMaster=isGlobalMaster||masterRole(candidate)

    if(requestedEmpresa&&!candidateMaster&&candidate.empresa_id!==requestedEmpresa)return out(req,{error:'USUARIO_NAO_PERTENCE_A_EMPRESA'},401)
    if(!candidateMaster&&!candidate.empresa_id)return out(req,{error:'USUARIO_SEM_EMPRESA'},401)

    if(candidate.empresa_id){
      const {data:company,error:companyError}=await admin.from('erp_empresas').select('id,ativo').eq('id',candidate.empresa_id).maybeSingle()
      if(companyError)return out(req,{error:'AUTH_COMPANY_LOOKUP_ERROR'},500)
      if(!company||company.ativo===false)return out(req,{error:'EMPRESA_INATIVA_OU_INEXISTENTE'},401)
    }

    const {data:au,error:ae}=await admin.auth.admin.getUserById(candidate.auth_user_id)
    if(ae||!au.user?.email)return out(req,{error:'USUARIO_AUTH_NAO_VINCULADO'},401)

    const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:si,error:se}=await client.auth.signInWithPassword({email:au.user.email.trim().toLowerCase(),password:pw})
    if(se||!si.session||!si.user)return out(req,{error:'USUARIO_OU_SENHA_INVALIDOS'},401)

    let p:U|null=null
    if(isGlobalMaster){
      p=candidate
    }else{
      const {data:profile,error:pe}=await admin.from('erp_usuarios').select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,role,deleted_at').eq('auth_user_id',si.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
      if(pe||!profile)return out(req,{error:'PERFIL_ERP_NAO_AUTORIZADO'},401)
      p=profile as U
    }

    const master=masterRole(p)
    if(!master&&!p.empresa_id)return out(req,{error:'PERFIL_ERP_NAO_AUTORIZADO'},401)

    if(p.empresa_id){
      const {data:company,error:companyError}=await admin.from('erp_empresas').select('id,ativo').eq('id',p.empresa_id).maybeSingle()
      if(companyError)return out(req,{error:'AUTH_COMPANY_LOOKUP_ERROR'},500)
      if(!company||company.ativo===false)return out(req,{error:'EMPRESA_INATIVA_OU_INEXISTENTE'},401)
    }

    const role=String(p.role??(master?'MASTER':'USER')).trim().toUpperCase()||(master?'MASTER':'USER')
    const md={...(si.user.app_metadata??{}),empresa_id:p.empresa_id,role,is_master:master,universal_master:master}
    const {error:me}=await admin.auth.admin.updateUserById(si.user.id,{app_metadata:md})
    if(me)return out(req,{error:'AUTH_CLAIMS_UPDATE_ERROR'},500)

    const {data:rf,error:fe}=await client.auth.refreshSession({refresh_token:si.session.refresh_token})
    if(fe||!rf.session||!rf.user)return out(req,{error:'AUTH_SESSION_REFRESH_ERROR'},500)

    let setorCodigo=null,setorNome=null
    if(p.setor_id&&p.empresa_id){
      const {data:s,error:sx}=await admin.from('erp_setores').select('codigo,nome').eq('id',p.setor_id).eq('empresa_id',p.empresa_id).maybeSingle()
      if(sx)return out(req,{error:'AUTH_SECTOR_LOOKUP_ERROR'},500)
      setorCodigo=s?.codigo??null
      setorNome=s?.nome??null
    }

    return out(req,{session:{access_token:rf.session.access_token,refresh_token:rf.session.refresh_token},empresa_id:p.empresa_id,profile:{id:rf.user.id,erp_usuario_id:p.id,empresa_id:p.empresa_id,setor_id:p.setor_id,setor_codigo:setorCodigo,setor_nome:setorNome,username:p.login_nome,nome:p.nome,email:rf.user.email??au.user.email,nivel_admin:p.nivel_admin??100,role,is_master:master,universal_master:master}})
  }catch(e){
    console.error('[erp-login]',e)
    return out(req,{error:'AUTH_INTERNAL_ERROR'},500)
  }
})
