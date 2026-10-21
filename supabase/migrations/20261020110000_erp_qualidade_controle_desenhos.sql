-- SYSNQRA ERP & SGQ INDUSTRIAL
-- REVISAO: REV-DESENHOS-CAD-001 | DATA: 2026-10-20
-- Controle dedicado de revisoes de desenhos de moldes; GED geral permanece intacto.
begin;

create table if not exists public.erp_qualidade_desenhos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_desenho varchar(50) not null,
  produto_vinculado varchar(255) not null,
  molde_referencia varchar(120),
  numero_revisao integer not null check (numero_revisao > 0),
  responsavel_id uuid,
  responsavel_nome varchar(255) not null,
  status_revisao varchar(20) not null default 'EM_REVISAO'
    check (status_revisao in ('EM_REVISAO','HOMOLOGADO','OBSOLETO')),
  url_arquivo_cad text,
  motivo_alteracao text,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  data_homologacao timestamptz,
  unique (empresa_id, codigo_desenho, numero_revisao)
);

create index if not exists erp_qualidade_desenhos_tenant_codigo_rev_idx
  on public.erp_qualidade_desenhos (empresa_id, codigo_desenho, numero_revisao desc);
create index if not exists erp_qualidade_desenhos_tenant_status_idx
  on public.erp_qualidade_desenhos (empresa_id, status_revisao);

alter table public.erp_qualidade_desenhos enable row level security;
drop policy if exists erp_qualidade_desenhos_select_tenant on public.erp_qualidade_desenhos;
create policy erp_qualidade_desenhos_select_tenant
  on public.erp_qualidade_desenhos for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

revoke insert, update, delete on public.erp_qualidade_desenhos from anon, authenticated;
grant select on public.erp_qualidade_desenhos to authenticated;

create or replace function public.erp_qualidade_desenho_nova_revisao(
  p_codigo_desenho text,
  p_produto_vinculado text,
  p_molde_referencia text,
  p_responsavel_nome text,
  p_url_arquivo_cad text,
  p_motivo_alteracao text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_codigo text := upper(trim(coalesce(p_codigo_desenho,'')));
  v_produto text := trim(coalesce(p_produto_vinculado,''));
  v_revisao integer;
  v_id uuid;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada ou empresa não identificada' using errcode='42501';
  end if;
  if v_codigo = '' or v_produto = '' then
    raise exception 'Código do desenho e produto vinculado são obrigatórios' using errcode='22023';
  end if;
  if length(v_codigo) > 50 or length(v_produto) > 255 then
    raise exception 'Código ou produto excede o tamanho permitido' using errcode='22023';
  end if;
  if nullif(trim(coalesce(p_url_arquivo_cad,'')),'') is not null
     and p_url_arquivo_cad !~* '^https://[^[:space:]]+$' then
    raise exception 'O link do arquivo precisa usar HTTPS' using errcode='22023';
  end if;
  select * into v_usuario from public.erp_usuarios
   where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null
   limit 1;
  if v_usuario.id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa' using errcode='42501';
  end if;
  if coalesce(v_usuario.is_master,false) is not true and coalesce(v_usuario.nivel_admin,0)<1
     and upper(coalesce(v_usuario.perfil,'')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ENGENHARIA%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ADMIN%' then
    raise exception 'Apenas Engenharia, Qualidade ou administradores podem registrar revisões' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_codigo));
  select coalesce(max(numero_revisao),0)+1 into v_revisao
    from public.erp_qualidade_desenhos
   where empresa_id=v_empresa and codigo_desenho=v_codigo;

  insert into public.erp_qualidade_desenhos
    (empresa_id,codigo_desenho,produto_vinculado,molde_referencia,numero_revisao,
     responsavel_id,responsavel_nome,status_revisao,url_arquivo_cad,motivo_alteracao,criado_por)
  values
    (v_empresa,v_codigo,v_produto,nullif(trim(coalesce(p_molde_referencia,'')),''),
     v_revisao,v_usuario.id,coalesce(nullif(trim(p_responsavel_nome),''),v_usuario.nome,v_usuario.email),
     'EM_REVISAO',nullif(trim(coalesce(p_url_arquivo_cad,'')), ''),
     nullif(trim(coalesce(p_motivo_alteracao,'')),''),v_usuario.id)
  returning id into v_id;

  return jsonb_build_object('id',v_id,'codigo_desenho',v_codigo,'numero_revisao',v_revisao,'status_revisao','EM_REVISAO');
end;
$function$;

create or replace function public.erp_qualidade_desenho_homologar(p_desenho_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_desenho public.erp_qualidade_desenhos%rowtype;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada ou empresa não identificada' using errcode='42501';
  end if;
  select * into v_usuario from public.erp_usuarios
   where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null limit 1;
  if v_usuario.id is null then raise exception 'Usuário ERP ativo não encontrado' using errcode='42501'; end if;
  if coalesce(v_usuario.is_master,false) is not true and coalesce(v_usuario.nivel_admin,0)<1
     and upper(coalesce(v_usuario.perfil,'')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ENGENHARIA%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ADMIN%' then
    raise exception 'Apenas Engenharia, Qualidade ou administradores podem homologar desenhos' using errcode='42501';
  end if;
  select * into v_desenho from public.erp_qualidade_desenhos
   where id=p_desenho_id and empresa_id=v_empresa for update;
  if v_desenho.id is null then raise exception 'Desenho não encontrado nesta empresa' using errcode='P0002'; end if;
  if v_desenho.status_revisao='OBSOLETO' then raise exception 'Revisão obsoleta não pode ser homologada' using errcode='22023'; end if;
  if nullif(trim(coalesce(v_desenho.url_arquivo_cad,'')),'') is null
     or v_desenho.url_arquivo_cad !~* '^https://[^[:space:]]+$' then
    raise exception 'A homologação exige link HTTPS para o arquivo técnico aprovado' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_desenho.codigo_desenho));
  update public.erp_qualidade_desenhos
     set status_revisao='OBSOLETO'
   where empresa_id=v_empresa and codigo_desenho=v_desenho.codigo_desenho
     and id<>v_desenho.id and status_revisao='HOMOLOGADO';
  update public.erp_qualidade_desenhos
     set status_revisao='HOMOLOGADO',data_homologacao=now()
   where id=v_desenho.id and empresa_id=v_empresa;
  return jsonb_build_object('id',v_desenho.id,'codigo_desenho',v_desenho.codigo_desenho,
    'numero_revisao',v_desenho.numero_revisao,'status_revisao','HOMOLOGADO');
end;
$function$;

revoke all on function public.erp_qualidade_desenho_nova_revisao(text,text,text,text,text,text) from public, anon;
grant execute on function public.erp_qualidade_desenho_nova_revisao(text,text,text,text,text,text) to authenticated;
revoke all on function public.erp_qualidade_desenho_homologar(uuid) from public, anon;
grant execute on function public.erp_qualidade_desenho_homologar(uuid) to authenticated;

commit;
