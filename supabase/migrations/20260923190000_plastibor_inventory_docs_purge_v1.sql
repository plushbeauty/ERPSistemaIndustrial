-- PLASTIBOR / SGQ ERP — inventário cíclico sem bloqueio fiscal, purge seguro e seed helpers.
create table if not exists public.erp_estoque_inventarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto','encerrado','cancelado')),
  iniciado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  criado_por uuid references public.erp_usuarios(id),
  observacao text
);

create table if not exists public.erp_estoque_inventario_itens (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.erp_estoque_inventarios(id) on delete cascade,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_sistema_congelada numeric(18,6) not null default 0,
  quantidade_venda_concorrente numeric(18,6) not null default 0,
  quantidade_contada numeric(18,6),
  divergencia numeric(18,6),
  ajustado boolean not null default false,
  unique(inventario_id,produto_id)
);

alter table public.erp_estoque_inventarios enable row level security;
alter table public.erp_estoque_inventario_itens enable row level security;

drop policy if exists erp_inventarios_tenant on public.erp_estoque_inventarios;
create policy erp_inventarios_tenant on public.erp_estoque_inventarios
for all to authenticated
using (empresa_id=public.erp_current_empresa_id())
with check (empresa_id=public.erp_current_empresa_id());

drop policy if exists erp_inventario_itens_tenant on public.erp_estoque_inventario_itens;
create policy erp_inventario_itens_tenant on public.erp_estoque_inventario_itens
for all to authenticated
using (empresa_id=public.erp_current_empresa_id())
with check (empresa_id=public.erp_current_empresa_id());

create index if not exists idx_erp_inventarios_empresa_status on public.erp_estoque_inventarios(empresa_id,status,iniciado_em desc);
create index if not exists idx_erp_inventario_itens_empresa on public.erp_estoque_inventario_itens(empresa_id,inventario_id);

create or replace function public.erp_estoque_inventario_iniciar(p_observacao text default null)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_inventario uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque','editar')) then
    raise exception 'Sem permissão para iniciar inventário.';
  end if;
  if exists(select 1 from public.erp_estoque_inventarios where empresa_id=v_empresa and status='aberto') then
    raise exception 'Já existe um inventário cíclico aberto para esta empresa.';
  end if;
  select id into v_usuario from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null limit 1;
  insert into public.erp_estoque_inventarios(empresa_id,criado_por,observacao)
  values(v_empresa,v_usuario,p_observacao)
  returning id into v_inventario;
  insert into public.erp_estoque_inventario_itens(empresa_id,inventario_id,produto_id,quantidade_sistema_congelada)
  select v_empresa,v_inventario,id,coalesce(estoque_atual,0)
  from public.erp_produtos
  where empresa_id=v_empresa and ativo=true;
  return v_inventario;
end;
$$;

create or replace function public.erp_estoque_inventario_calcular(p_inventario_id uuid)
returns table(produto_id uuid,quantidade_sistema_congelada numeric,quantidade_venda_concorrente numeric,quantidade_contada numeric,divergencia numeric,ajustado boolean)
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  select i.produto_id,i.quantidade_sistema_congelada,i.quantidade_venda_concorrente,i.quantidade_contada,
    case when i.quantidade_contada is null then null
         else i.quantidade_contada-(i.quantidade_sistema_congelada-i.quantidade_venda_concorrente) end as divergencia,
    i.ajustado
  from public.erp_estoque_inventario_itens i
  join public.erp_estoque_inventarios inv on inv.id=i.inventario_id
  where i.inventario_id=p_inventario_id
    and i.empresa_id=public.erp_current_empresa_id();
$$;

create or replace function public.erp_estoque_inventario_contar(p_inventario_id uuid,p_produto_id uuid,p_quantidade_contada numeric)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if p_quantidade_contada < 0 then raise exception 'Quantidade contada não pode ser negativa.'; end if;
  update public.erp_estoque_inventario_itens i
  set quantidade_contada=p_quantidade_contada,
      divergencia=p_quantidade_contada-(i.quantidade_sistema_congelada-i.quantidade_venda_concorrente)
  from public.erp_estoque_inventarios inv
  where i.inventario_id=inv.id and i.produto_id=p_produto_id and inv.id=p_inventario_id
    and inv.empresa_id=public.erp_current_empresa_id() and inv.status='aberto';
  if not found then raise exception 'Item não encontrado no inventário aberto.'; end if;
  return true;
end;
$$;

create or replace function public.erp_estoque_inventario_ajustar(p_inventario_id uuid,p_produto_id uuid)
returns numeric
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_diff numeric;
begin
  if not (public.erp_is_master() or public.erp_has_permission('estoque','editar')) then raise exception 'Sem permissão para ajustar estoque.'; end if;
  select quantidade_contada-(quantidade_sistema_congelada-quantidade_venda_concorrente)
    into v_diff
  from public.erp_estoque_inventario_itens
  where inventario_id=p_inventario_id and produto_id=p_produto_id and empresa_id=v_empresa and quantidade_contada is not null and ajustado=false;
  if v_diff is null then raise exception 'Informe a contagem antes de ajustar.'; end if;
  if v_diff<>0 then
    insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,observacao)
    values(v_empresa,p_produto_id,case when v_diff>0 then 'entrada' else 'saida' end,abs(v_diff),'Inventário','INV-'||p_inventario_id::text,'Ajuste de inventário cíclico — saldo congelado menos vendas concorrentes');
  end if;
  update public.erp_estoque_inventario_itens
  set divergencia=v_diff,ajustado=true
  where inventario_id=p_inventario_id and produto_id=p_produto_id and empresa_id=v_empresa;
  return v_diff;
end;
$$;

create or replace function public.erp_estoque_inventario_encerrar(p_inventario_id uuid)
returns boolean
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if not (public.erp_is_master() or public.erp_has_permission('estoque','editar')) then raise exception 'Sem permissão para encerrar inventário.'; end if;
  if exists(select 1 from public.erp_estoque_inventario_itens where inventario_id=p_inventario_id and quantidade_contada is null and empresa_id=public.erp_current_empresa_id()) then
    raise exception 'Existem itens sem contagem.';
  end if;
  if exists(select 1 from public.erp_estoque_inventario_itens where inventario_id=p_inventario_id and divergencia<>0 and not ajustado and empresa_id=public.erp_current_empresa_id()) then
    raise exception 'Existem divergências sem ajuste.';
  end if;
  update public.erp_estoque_inventarios set status='encerrado',encerrado_em=now()
  where id=p_inventario_id and empresa_id=public.erp_current_empresa_id() and status='aberto';
  return found;
end;
$$;

create or replace function public.erp_estoque_registrar_venda_concorrente()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  if lower(coalesce(new.origem,''))='venda' or lower(new.tipo)='venda' then
    update public.erp_estoque_inventario_itens i
    set quantidade_venda_concorrente=quantidade_venda_concorrente+new.quantidade,
        divergencia=case when quantidade_contada is null then null else quantidade_contada-(quantidade_sistema_congelada-(quantidade_venda_concorrente+new.quantidade)) end
    from public.erp_estoque_inventarios inv
    where i.inventario_id=inv.id and i.produto_id=new.produto_id and i.empresa_id=new.empresa_id
      and inv.status='aberto';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_estoque_venda_concorrente on public.erp_estoque_movimentos;
create trigger trg_erp_estoque_venda_concorrente
after insert on public.erp_estoque_movimentos
for each row execute function public.erp_estoque_registrar_venda_concorrente();

create or replace function public.erp_master_purge_plastibor_test_data()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid;
  v_pedidos integer:=0;
  v_itens integer:=0;
  v_inventarios integer:=0;
begin
  if not public.erp_is_master() then raise exception 'Somente Master pode executar o purge Plastibor.'; end if;
  select id into v_empresa from public.erp_empresas where lower(coalesce(nome_fantasia,'')) like '%plastibor%' or lower(razao_social) like '%plastibor%' order by criado_em limit 1;
  if v_empresa is null then raise exception 'Empresa Plastibor não encontrada.'; end if;
  delete from public.erp_pedidos_venda_itens where empresa_id=v_empresa and pedido_id in (
    select id from public.erp_pedidos_venda where empresa_id=v_empresa and (numero between 1001 and 1050 or pedido_cliente like 'PI-PLASTIBOR-%')
  );
  get diagnostics v_itens=ROW_COUNT;
  delete from public.erp_pedidos_venda where empresa_id=v_empresa and (numero between 1001 and 1050 or pedido_cliente like 'PI-PLASTIBOR-%');
  get diagnostics v_pedidos=ROW_COUNT;
  delete from public.erp_estoque_inventario_itens where empresa_id=v_empresa and inventario_id in (select id from public.erp_estoque_inventarios where empresa_id=v_empresa and observacao like 'PLASTIBOR%TEST%');
  delete from public.erp_estoque_inventarios where empresa_id=v_empresa and observacao like 'PLASTIBOR%TEST%';
  get diagnostics v_inventarios=ROW_COUNT;
  return jsonb_build_object('empresa_id',v_empresa,'pedidos',v_pedidos,'itens',v_itens,'inventarios',v_inventarios);
end;
$$;

revoke all on function public.erp_master_purge_plastibor_test_data() from public,anon;
grant execute on function public.erp_master_purge_plastibor_test_data() to authenticated;

revoke all on function public.erp_estoque_inventario_iniciar(text) from public,anon;
revoke all on function public.erp_estoque_inventario_calcular(uuid) from public,anon;
revoke all on function public.erp_estoque_inventario_contar(uuid,uuid,numeric) from public,anon;
revoke all on function public.erp_estoque_inventario_ajustar(uuid,uuid) from public,anon;
revoke all on function public.erp_estoque_inventario_encerrar(uuid) from public,anon;
grant execute on function public.erp_estoque_inventario_iniciar(text) to authenticated;
grant execute on function public.erp_estoque_inventario_calcular(uuid) to authenticated;
grant execute on function public.erp_estoque_inventario_contar(uuid,uuid,numeric) to authenticated;
grant execute on function public.erp_estoque_inventario_ajustar(uuid,uuid) to authenticated;
grant execute on function public.erp_estoque_inventario_encerrar(uuid) to authenticated;
