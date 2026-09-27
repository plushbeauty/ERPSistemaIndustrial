-- ERP Industrial — Vendas: fluxo real de pedido, reserva e necessidade líquida de PCP
-- Esta migration registra no repositório o mesmo DDL aplicado ao projeto Supabase
-- como hotfix validado em 2026-09-27. Não reduz estoque físico: reserva apenas
-- compromete o disponível e gera OP somente pelo saldo faltante.

alter table public.erp_pedidos_venda
  add column if not exists data_entrada date not null default current_date,
  add column if not exists data_entrega_prometida date,
  add column if not exists created_by uuid,
  add column if not exists pedido_cliente text;

create table if not exists public.erp_estoque_reservas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_venda_id uuid not null references public.erp_pedidos_venda(id) on delete cascade,
  pedido_item_id uuid not null references public.erp_pedidos_venda_itens(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  quantidade numeric(18,6) not null check (quantidade > 0),
  status text not null default 'ATIVA' check (status in ('ATIVA','CONSUMIDA','CANCELADA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_estoque_reservas_produto_status
  on public.erp_estoque_reservas(empresa_id, produto_id, status);
create index if not exists idx_erp_estoque_reservas_pedido
  on public.erp_estoque_reservas(empresa_id, pedido_venda_id);
create unique index if not exists ux_erp_estoque_reserva_item_ativa
  on public.erp_estoque_reservas(pedido_item_id) where status='ATIVA';

alter table public.erp_estoque_reservas enable row level security;
drop policy if exists erp_estoque_reservas_tenant on public.erp_estoque_reservas;
create policy erp_estoque_reservas_tenant
  on public.erp_estoque_reservas for all to authenticated
  using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

create or replace function public.fn_empenhar_reserva_estoque(
  p_pedido_venda_id uuid,
  p_pedido_item_id uuid,
  p_produto_id uuid,
  p_quantidade numeric
)
returns numeric
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Quantidade de reserva inválida.'; end if;

  if not exists(
    select 1 from public.erp_pedidos_venda
    where id=p_pedido_venda_id and empresa_id=v_empresa
  ) then raise exception 'Pedido de venda inválido para a empresa atual.'; end if;

  if not exists(
    select 1 from public.erp_pedidos_venda_itens
    where id=p_pedido_item_id
      and pedido_id=p_pedido_venda_id
      and empresa_id=v_empresa
      and produto_id=p_produto_id
  ) then raise exception 'Item de pedido inválido.'; end if;

  select greatest(coalesce(p.estoque_atual,0),0)
    into v_estoque
  from public.erp_produtos p
  where p.id=p_produto_id
    and p.empresa_id=v_empresa
    and p.ativo=true
  for update;

  if not found then raise exception 'Produto inválido ou inativo.'; end if;

  select coalesce(sum(r.quantidade),0)
    into v_reservado
  from public.erp_estoque_reservas r
  where r.empresa_id=v_empresa
    and r.produto_id=p_produto_id
    and r.status='ATIVA';

  v_disponivel:=greatest(v_estoque-v_reservado,0);
  v_reserva:=least(p_quantidade,v_disponivel);

  if v_reserva>0 then
    insert into public.erp_estoque_reservas(
      empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status
    )
    values(v_empresa,p_pedido_venda_id,p_pedido_item_id,p_produto_id,v_reserva,'ATIVA');
  end if;

  return v_reserva;
end;
$$;

revoke all on function public.fn_empenhar_reserva_estoque(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.fn_empenhar_reserva_estoque(uuid,uuid,uuid,numeric) to authenticated;

create or replace function public.erp_finalizar_pedido_venda(
  p_cliente_id uuid,
  p_desconto numeric default 0,
  p_itens jsonb default '[]'::jsonb,
  p_data_entrega date default null,
  p_pedido_cliente text default null
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_usuario uuid;
  v_pedido uuid;
  v_numero bigint;
  v_op_numero bigint;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_item_id uuid;
  v_reserva numeric;
  v_falta numeric;
  v_subtotal numeric:=0;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid()
    and u.empresa_id=v_empresa
    and u.ativo=true
    and u.deleted_at is null
  limit 1;

  if v_usuario is null then raise exception 'Usuário ERP não localizado para a empresa atual.'; end if;

  if p_cliente_id is null or not exists(
    select 1 from public.erp_clientes c
    where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true
  ) then raise exception 'Cliente inválido para a empresa atual.'; end if;

  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then
    raise exception 'A venda precisa ter pelo menos um item.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select coalesce(max(numero),0)+1
    into v_numero
  from public.erp_pedidos_venda
  where empresa_id=v_empresa;

  insert into public.erp_pedidos_venda(
    empresa_id,cliente_id,numero,status,total,created_by,
    data_entrada,data_entrega_prometida,pedido_cliente
  )
  values(
    v_empresa,p_cliente_id,v_numero,'em_analise',0,v_usuario,
    current_date,p_data_entrega,nullif(trim(p_pedido_cliente),'')
  )
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=nullif(v_item->>'produto_id','')::uuid;
    v_qtd:=nullif(v_item->>'quantidade','')::numeric;

    if v_produto is null or v_qtd is null or v_qtd<=0 then
      raise exception 'Item de venda inválido.';
    end if;

    select greatest(coalesce(p.preco_venda,0),0)
      into v_preco
    from public.erp_produtos p
    where p.id=v_produto
      and p.empresa_id=v_empresa
      and p.ativo=true
    for update;

    if not found then raise exception 'Produto inválido ou inativo.'; end if;

    v_preco:=greatest(
      coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0
    );

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,quantidade,preco_unitario,total
    )
    values(
      v_empresa,v_pedido,v_produto,v_qtd,v_preco,round(v_qtd*v_preco,2)
    )
    returning id into v_item_id;

    v_subtotal:=v_subtotal+round(v_qtd*v_preco,2);

    v_reserva:=public.fn_empenhar_reserva_estoque(
      v_pedido,v_item_id,v_produto,v_qtd
    );

    v_falta:=greatest(v_qtd-v_reserva,0);

    if v_falta>0 then
      select coalesce(max(numero_op),0)+1
        into v_op_numero
      from public.erp_ordens_producao
      where empresa_id=v_empresa;

      insert into public.erp_ordens_producao(
        empresa_id,numero_op,produto_id,pedido_venda_id,
        quantidade,quantidade_planejada,quantidade_produzida,
        status,data_prevista
      )
      values(
        v_empresa,v_op_numero,v_produto,v_pedido,
        v_falta,v_falta,0,'pendente',p_data_entrega
      );
    end if;
  end loop;

  if greatest(coalesce(p_desconto,0),0)>v_subtotal then
    raise exception 'Desconto não pode ser maior que o subtotal.';
  end if;

  update public.erp_pedidos_venda
  set total=round(v_subtotal-greatest(coalesce(p_desconto,0),0),2),
      status=case
        when exists(
          select 1 from public.erp_estoque_reservas r
          where r.pedido_venda_id=v_pedido and r.status='ATIVA'
        )
        and exists(
          select 1 from public.erp_ordens_producao op
          where op.pedido_venda_id=v_pedido
        ) then 'parcial'
        when exists(
          select 1 from public.erp_estoque_reservas r
          where r.pedido_venda_id=v_pedido and r.status='ATIVA'
        ) then 'reservado'
        when exists(
          select 1 from public.erp_ordens_producao op
          where op.pedido_venda_id=v_pedido
        ) then 'pcp_pendente'
        else 'em_analise'
      end,
      updated_at=now()
  where id=v_pedido;

  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,text) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,text) to authenticated;
