-- Fila persistente de demanda do Comercial para análise e programação do PCP.
begin;
create table if not exists public.erp_pcp_fila_demanda (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 pedido_venda_id uuid not null,
 pedido_item_id uuid not null,
 produto_id uuid not null,
 cliente_id uuid,
 pedido_numero text not null,
 cliente_nome text not null,
 produto_codigo text not null,
 produto_nome text not null,
 unidade text not null default 'UN',
 quantidade_pedida numeric not null check (quantidade_pedida>0),
 quantidade_pcp numeric not null check (quantidade_pcp>0),
 quantidade_reservada numeric not null default 0,
 quantidade_op_aberta numeric not null default 0,
 data_necessaria date,
 prioridade text not null default 'REGULAR',
 status text not null default 'AGUARDANDO_PCP'
  check(status in ('AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA','CONVERTIDA_OP','CANCELADA')),
 enviado_por uuid,
 enviado_em timestamptz not null default now(),
 analisado_por uuid,
 analisado_em timestamptz,
 ordem_producao_id uuid,
 observacoes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists uq_erp_pcp_fila_demanda_aberta
 on public.erp_pcp_fila_demanda(empresa_id,pedido_item_id)
 where status in ('AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA');
create index if not exists ix_erp_pcp_fila_demanda_tenant_status
 on public.erp_pcp_fila_demanda(empresa_id,status,data_necessaria);
alter table public.erp_pcp_fila_demanda enable row level security;
drop policy if exists erp_pcp_fila_demanda_select on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_insert on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_update on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_delete on public.erp_pcp_fila_demanda;
create policy erp_pcp_fila_demanda_select on public.erp_pcp_fila_demanda
 for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pcp_fila_demanda_insert on public.erp_pcp_fila_demanda
 for insert to authenticated with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pcp_fila_demanda_update on public.erp_pcp_fila_demanda
 for update to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
 with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pcp_fila_demanda_delete on public.erp_pcp_fila_demanda
 for delete to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update,delete on public.erp_pcp_fila_demanda to authenticated;

create or replace function public.erp_pcp_enviar_demanda(p_pedido_item_ids uuid[])
returns integer language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_item record;
 v_reservada numeric;
 v_op_aberta numeric;
 v_qtd_pcp numeric;
 v_inserted integer:=0;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if coalesce(array_length(p_pedido_item_ids,1),0)=0 then raise exception 'PCP_EMPTY_SELECTION'; end if;
 for v_item in
  select i.id pedido_item_id,i.pedido_id,i.produto_id,i.quantidade,pv.numero,pv.cliente_id,pv.data_entrega_prometida,
         c.nome cliente_nome,p.codigo produto_codigo,p.nome produto_nome,coalesce(p.unidade,'UN') unidade
  from public.erp_pedidos_venda_itens i
  join public.erp_pedidos_venda pv on pv.id=i.pedido_id and pv.empresa_id=v_empresa
  join public.erp_produtos p on p.id=i.produto_id and p.empresa_id=v_empresa and p.ativo=true
  left join public.erp_clientes c on c.id=pv.cliente_id and c.empresa_id=v_empresa
  where i.empresa_id=v_empresa and i.id=any(p_pedido_item_ids)
   and lower(coalesce(pv.status,'')) not in ('cancelado','cancelada','rejeitado','rejeitada')
  order by pv.data_entrega_prometida nulls last,pv.numero,i.id
 loop
  select coalesce(sum(r.quantidade),0) into v_reservada
  from public.erp_estoque_reservas r
  where r.empresa_id=v_empresa and r.pedido_item_id=v_item.pedido_item_id and upper(coalesce(r.status,''))='ATIVA';
  select coalesce(sum(greatest(coalesce(o.quantidade_planejada,o.quantidade,0)-coalesce(o.quantidade_produzida,0),0)),0)
   into v_op_aberta
  from public.erp_ordens_producao o
  where o.empresa_id=v_empresa and o.pedido_item_id=v_item.pedido_item_id
   and lower(coalesce(o.status,'')) not in ('cancelada','cancelado');
  v_qtd_pcp:=greatest(coalesce(v_item.quantidade,0)-v_reservada-v_op_aberta,0);
  if v_qtd_pcp<=0 then continue; end if;
  insert into public.erp_pcp_fila_demanda(
   empresa_id,pedido_venda_id,pedido_item_id,produto_id,cliente_id,pedido_numero,cliente_nome,produto_codigo,produto_nome,unidade,
   quantidade_pedida,quantidade_pcp,quantidade_reservada,quantidade_op_aberta,data_necessaria,prioridade,status,enviado_por
  ) values(
   v_empresa,v_item.pedido_id,v_item.pedido_item_id,v_item.produto_id,v_item.cliente_id,v_item.numero::text,
   coalesce(v_item.cliente_nome,'Cliente não identificado'),v_item.produto_codigo,v_item.produto_nome,v_item.unidade,
   v_item.quantidade,v_qtd_pcp,v_reservada,v_op_aberta,v_item.data_entrega_prometida,'REGULAR','AGUARDANDO_PCP',auth.uid()
  )
  on conflict(empresa_id,pedido_item_id) where status in ('AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA') do nothing;
  if found then v_inserted:=v_inserted+1; end if;
 end loop;
 return v_inserted;
end; $$;
revoke all on function public.erp_pcp_enviar_demanda(uuid[]) from public,anon;
grant execute on function public.erp_pcp_enviar_demanda(uuid[]) to authenticated;
commit;