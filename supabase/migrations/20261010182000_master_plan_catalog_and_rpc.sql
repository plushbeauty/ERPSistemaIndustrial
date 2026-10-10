begin;

create table if not exists public.erp_planos_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  preco_mensal numeric(12,2) not null default 0 check (preco_mensal >= 0),
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_plano_modulos (
  id uuid primary key default gen_random_uuid(),
  plano_codigo text not null references public.erp_planos_catalogo(codigo) on update cascade on delete cascade,
  modulo_codigo text not null,
  modulo_nome text not null,
  acesso boolean not null default false,
  limite_usuarios integer check (limite_usuarios is null or limite_usuarios >= 0),
  limite_empresas integer check (limite_empresas is null or limite_empresas >= 0),
  recursos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_plano_modulos_plano_modulo_uq unique (plano_codigo, modulo_codigo)
);

alter table public.erp_planos_catalogo enable row level security;
alter table public.erp_plano_modulos enable row level security;

drop policy if exists erp_planos_catalogo_public_read on public.erp_planos_catalogo;
create policy erp_planos_catalogo_public_read on public.erp_planos_catalogo
  for select to anon, authenticated using (ativo = true);

drop policy if exists erp_planos_catalogo_master_all on public.erp_planos_catalogo;
create policy erp_planos_catalogo_master_all on public.erp_planos_catalogo
  for all to authenticated using (public.erp_is_master()) with check (public.erp_is_master());

drop policy if exists erp_plano_modulos_public_read on public.erp_plano_modulos;
create policy erp_plano_modulos_public_read on public.erp_plano_modulos
  for select to anon, authenticated using (
    acesso = true and exists (
      select 1 from public.erp_planos_catalogo p
      where p.codigo = plano_codigo and p.ativo = true
    )
  );

drop policy if exists erp_plano_modulos_master_all on public.erp_plano_modulos;
create policy erp_plano_modulos_master_all on public.erp_plano_modulos
  for all to authenticated using (public.erp_is_master()) with check (public.erp_is_master());

grant select on public.erp_planos_catalogo, public.erp_plano_modulos to anon, authenticated;
revoke insert, update, delete on public.erp_planos_catalogo, public.erp_plano_modulos from anon, authenticated;

create or replace function public.erp_master_save_plan(
  p_codigo text,
  p_nome text,
  p_preco_mensal numeric,
  p_descricao text,
  p_ativo boolean,
  p_modulos jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_codigo text := lower(trim(coalesce(p_codigo, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_count integer := 0;
begin
  if auth.uid() is null or not public.erp_is_master() then
    raise exception 'Apenas o Master autenticado pode administrar o catálogo de planos.' using errcode = '42501';
  end if;
  if v_codigo = '' or v_nome = '' or p_preco_mensal is null or p_preco_mensal < 0 then
    raise exception 'Código, nome e preço não negativo são obrigatórios.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_modulos, '[]'::jsonb)) <> 'array' then
    raise exception 'A lista de módulos precisa ser um array JSON.' using errcode = '22023';
  end if;

  insert into public.erp_planos_catalogo (codigo, nome, preco_mensal, descricao, ativo, updated_at)
  values (v_codigo, v_nome, p_preco_mensal, nullif(trim(coalesce(p_descricao, '')), ''), coalesce(p_ativo, false), now())
  on conflict (codigo) do update set
    nome = excluded.nome,
    preco_mensal = excluded.preco_mensal,
    descricao = excluded.descricao,
    ativo = excluded.ativo,
    updated_at = now();

  insert into public.erp_plano_modulos (
    plano_codigo, modulo_codigo, modulo_nome, acesso, limite_usuarios, limite_empresas, recursos, updated_at
  )
  select
    v_codigo,
    lower(trim(item.codigo)),
    trim(item.nome),
    coalesce(item.acesso, false),
    item.limite_usuarios,
    item.limite_empresas,
    coalesce(item.recursos, '{}'::jsonb),
    now()
  from jsonb_to_recordset(coalesce(p_modulos, '[]'::jsonb)) as item(
    codigo text, nome text, acesso boolean, limite_usuarios integer, limite_empresas integer, recursos jsonb
  )
  where nullif(trim(coalesce(item.codigo, '')), '') is not null
    and nullif(trim(coalesce(item.nome, '')), '') is not null
  on conflict (plano_codigo, modulo_codigo) do update set
    modulo_nome = excluded.modulo_nome,
    acesso = excluded.acesso,
    limite_usuarios = excluded.limite_usuarios,
    limite_empresas = excluded.limite_empresas,
    recursos = excluded.recursos,
    updated_at = now();

  get diagnostics v_count = row_count;
  return jsonb_build_object('codigo', v_codigo, 'modulos_atualizados', v_count, 'ativo', coalesce(p_ativo, false));
end;
$function$;

revoke all on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) from public, anon;
grant execute on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;