import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const supabaseUrl=Deno.env.get('SUPABASE_URL')!
const anon=Deno.env.get('SUPABASE_ANON_KEY')!
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin=createClient(supabaseUrl,service,{auth:{autoRefreshToken:false,persistSession:false}})

function slug(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function randomPassword(){const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';let s='';for(let i=0;i<12;i++)s+=a[Math.floor(Math.random()*a.length)];return s}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 try{
  const auth=req.headers.get('Authorization');if(!auth)return json({error:'Não autenticado.'},401)
  const userClient=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:authError}=await userClient.auth.getUser();if(authError||!user)return json({error:'Sessão inválida.'},401)
  const {data:actor}=await admin.from('usuarios').select('id,empresa_id,perfil,ativo').eq('auth_user_id',user.id).maybeSingle();if(!actor?.ativo)return json({error:'Usuário interno inativo.'},403)
  const body=await req.json();
  if(body.action==='change_my_password'){
   const current=String(body.currentPassword||'');const next=String(body.newPassword||'');if(next.length<8)return json({error:'A nova senha deve ter pelo menos 8 caracteres.'},400)
   const verify=createClient(supabaseUrl,anon);const check=await verify.auth.signInWithPassword({email:user.email!,password:current});if(check.error)return json({error:'Senha atual inválida.'},400)
   const changed=await admin.auth.admin.updateUserById(user.id,{password:next,user_metadata:{must_change_password:false}});if(changed.error)return json({error:changed.error.message},400)
   return json({ok:true,message:'Senha alterada com sucesso.'})
  }
  if(body.action==='create_users'){
   if(!['master','administrador'].includes(actor.perfil))return json({error:'Sem permissão para criar usuários.'},403)
   const ids=Array.isArray(body.sector_ids)?body.sector_ids:[];if(!ids.length)return json({error:'Nenhum setor selecionado.'},400)
   const {data:company}=await admin.from('empresas').select('nome_fantasia,razao_social').eq('id',actor.empresa_id).maybeSingle();if(!company)return json({error:'Empresa não encontrada.'},400)
   const prefix=(slug(company.nome_fantasia||company.razao_social||'EMPRESA').slice(0,8)||'EMPRESA')
   const {data:sectors}=await admin.from('setores').select('id,codigo,nome').eq('empresa_id',actor.empresa_id).in('id',ids).eq('ativo',true);if(!sectors?.length)return json({error:'Setores inválidos para esta empresa.'},400)
   const credentials=[]
   for(const sector of sectors){const login=`${prefix}${slug(sector.codigo)}`;const email=`${login.toLowerCase()}@acesso.erp.local`;const password=randomPassword();let {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{login,setor_id:sector.id,empresa_id:actor.empresa_id,must_change_password:true}})
    if(createError&&createError.message.toLowerCase().includes('already')){credentials.push({setor:sector.nome,login,password:'Usuário já existe',ok:false,error:'Usuário já cadastrado'});continue}
    if(createError||!created.user){credentials.push({setor:sector.nome,login,password:'',ok:false,error:createError?.message||'Falha ao criar'});continue}
    const perfil=sector.codigo==='PCP'?'planejamento':sector.codigo==='PROD'?'producao':sector.codigo==='ALM'?'estoque':sector.codigo==='QUA'?'qualidade':sector.codigo==='MAN'?'manutencao':sector.codigo==='COM'?'compras':sector.codigo==='VDA'?'vendas':sector.codigo==='FIN'?'financeiro':sector.codigo==='ENG'?'gestor':'operador'
    const inserted=await admin.from('usuarios').insert({auth_user_id:created.user.id,empresa_id:actor.empresa_id,nome:`Usuário ${sector.nome}`,email,perfil,ativo:true}).select('id').single()
    if(inserted.error){await admin.auth.admin.deleteUser(created.user.id);credentials.push({setor:sector.nome,login,password:'',ok:false,error:inserted.error.message});continue}
    credentials.push({setor:sector.nome,login,password,ok:true})
   }
   return json({ok:credentials.some(x=>x.ok),credentials,message:'Processamento concluído. Imprima as credenciais e entregue cada uma ao responsável pelo setor.'})
  }
  return json({error:'Ação não suportada.'},400)
 }catch(e){return json({error:e instanceof Error?e.message:'Erro interno.'},500)}
})
