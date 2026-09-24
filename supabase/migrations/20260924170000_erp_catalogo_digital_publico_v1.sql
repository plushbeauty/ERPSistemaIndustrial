create table if not exists public.erp_catalogo_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade,
  tabela_preco_id uuid not null references public.erp_tabelas_preco(id) on delete restrict,
  ativo boolean not null default true,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists ix_erp_catalogo_links_token on public.erp_catalogo_links(token) where ativo=true;
create index if not exists ix_erp_catalogo_links_empresa_cliente on public.erp_catalogo_links(empresa_id,cliente_id,created_at desc);

alter table public.erp_catalogo_links enable row level security;

drop policy if exists erp_catalogo_links_authenticated_select on public.erp_catalogo_links;
create policy erp_catalogo_links_authenticated_select
on public.erp_catalogo_links for select to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_catalogo_links_authenticated_insert on public.erp_catalogo_links;
create policy erp_catalogo_links_authenticated_insert
on public.erp_catalogo_links for insert to authenticated
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

create or replace function public.erp_catalogo_link_create(
  p_cliente_id uuid,
  p_tabela_preco_id uuid,
  p_expira_em timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_token uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo=true) then
    raise exception 'Cliente inválido ou inativo.';
  end if;
  if not exists(select 1 from public.erp_tabelas_preco where id=p_tabela_preco_id and empresa_id=v_empresa and ativo=true) then
    raise exception 'Tabela de preços inválida ou inativa.';
  end if;
  insert into public.erp_catalogo_links(empresa_id,cliente_id,tabela_preco_id,expira_em,created_by)
  values(v_empresa,p_cliente_id,p_tabela_preco_id,p_expira_em,auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;

revoke all on function public.erp_catalogo_link_create(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.erp_catalogo_link_create(uuid,uuid,timestamptz) to authenticated;

create or replace function public.erp_catalogo_publico(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_link record;
  v_cliente jsonb;
  v_produtos jsonb;
begin
  select l.*, c.nome as cliente_nome, c.email as cliente_email, t.nome as tabela_nome, t.codigo as tabela_codigo
    into v_link
  from public.erp_catalogo_links l
  join public.erp_clientes c on c.id=l.cliente_id and c.empresa_id=l.empresa_id
  join public.erp_tabelas_preco t on t.id=l.tabela_preco_id and t.empresa_id=l.empresa_id
  where l.token=p_token and l.ativo=true and (l.expira_em is null or l.expira_em>now());

  if not found then raise exception 'Catálogo não encontrado, expirado ou desativado.'; end if;

  v_cliente := jsonb_build_object(
    'nome',v_link.cliente_nome,
    'email',v_link.cliente_email,
    'tabela',v_link.tabela_nome,
    'codigo_tabela',v_link.tabela_codigo
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'codigo',p.codigo,
    'nome',p.nome,
    'grupo',p.grupo,
    'subgrupo',p.subgrupo,
    'unidade',p.unidade,
    'peso_liquido',p.peso_liquido,
    'peso_bruto',p.peso_bruto,
    'estoque_atual',p.estoque_atual,
    'foto_url',p.foto_url,
    'observacoes',p.observacoes,
    'preco',coalesce(tpi.preco,p.preco_venda,0)
  ) order by p.codigo),'[]'::jsonb)
  into v_produtos
  from public.erp_produtos p
  left join public.erp_tabelas_preco_itens tpi on tpi.produto_id=p.id and tpi.tabela_preco_id=v_link.tabela_preco_id
  where p.empresa_id=v_link.empresa_id and p.ativo=true;

  return jsonb_build_object('cliente',v_cliente,'produtos',v_produtos,'gerado_em',now());
end;
$$;

revoke all on function public.erp_catalogo_publico(uuid) from public;
grant execute on function public.erp_catalogo_publico(uuid) to anon,authenticated;