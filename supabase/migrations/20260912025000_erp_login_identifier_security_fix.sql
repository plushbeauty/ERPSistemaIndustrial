create or replace function public.erp_resolver_login(p_empresa text, p_setor text, p_identificador text)
returns table(
  auth_user_id uuid,
  nome text,
  email text,
  empresa_id uuid,
  empresa_nome text,
  setor_id uuid,
  setor_codigo text,
  setor_nome text,
  nivel_admin integer,
  cargo_id uuid
)
language sql
stable
security definer
set search_path to pg_catalog, public
as $$
  select
    u.auth_user_id,
    u.nome,
    u.email,
    e.id,
    coalesce(e.nome_fantasia, e.razao_social),
    s.id,
    s.codigo,
    s.nome,
    u.nivel_admin,
    u.cargo_id
  from public.erp_usuarios u
  join public.erp_empresas e on e.id = u.empresa_id
  left join public.erp_setores s on s.id = u.setor_id
  where e.ativo = true
    and u.ativo = true
    and (
      lower(coalesce(e.codigo, '')) = lower(trim(p_empresa))
      or lower(coalesce(e.nome_fantasia, '')) = lower(trim(p_empresa))
      or lower(coalesce(e.razao_social, '')) = lower(trim(p_empresa))
    )
    and (
      lower(coalesce(s.codigo, '')) = lower(trim(p_setor))
      or lower(coalesce(s.nome, '')) = lower(trim(p_setor))
    )
    and (
      lower(coalesce(u.login_nome, '')) = lower(trim(p_identificador))
      or lower(coalesce(u.email, '')) = lower(trim(p_identificador))
      or lower(coalesce(u.nome, '')) = lower(trim(p_identificador))
    )
  limit 1;
$$;

revoke all on function public.erp_resolver_login(text,text,text) from public, anon, authenticated;
grant execute on function public.erp_resolver_login(text,text,text) to service_role;
