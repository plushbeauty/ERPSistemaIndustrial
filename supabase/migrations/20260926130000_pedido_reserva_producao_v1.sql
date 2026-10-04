/*
  ERP INDUSTRIAL — fluxo Pedido -> Reserva -> Produção
  Reserva não reduz estoque físico; reduz apenas o disponível para novos pedidos.
  A quantidade excedente do estoque disponível gera OP somente pelo saldo faltante.
*/

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
  on public.erp_estoque_reservas(pedido_item_id)
  where status = 'ATIVA';

alter table public.erp_estoque_reservas enable row level security;

drop policy if exists erp_estoque_reservas_tenant on public.erp_estoque_reservas;
create policy erp_estoque_reservas_tenant
  on public.erp_estoque_reservas
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create or replace function public.erp_finalizar_pedido_planejado(
  p_cliente_id uuid,
  p_data_entrada date default current_date,
  p_data_entrega date default null,
  p_itens jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_pedido uuid;
  v_usuario uuid;
  v_numero bigint;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_nome text;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
  v_falta numeric;
  v_item_id uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido precisa ter pelo menos um item.';
  end if;

  if p_cliente_id is not null and not exists (
    select 1 from public.erp_clientes c
    where c.id = p_cliente_id and c.empresa_id = v_empresa and c.ativo = true
  ) then
    raise exception 'Cliente inválido para a empresa atual.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select coalesce(max(numero),0) + 1 into v_numero
  from public.erp_pedidos_venda
  where empresa_id = v_empresa;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid()
    and u.empresa_id = v_empresa
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  insert into public.erp_pedidos_venda(
    empresa_id, numero, cliente_id, status, total,
    data_entrada, data_entrega_prometida, created_by
  )
  values(
    v_empresa, v_numero, p_cliente_id, 'PENDENTE', 0,
    coalesce(p_data_entrada,current_date), p_data_entrega, v_usuario
  )
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;

    if v_produto is null or v_qtd is null or v_qtd <= 0 then
      raise exception 'Item de pedido inválido.';
    end if;

    select p.preco_venda, p.nome, greatest(coalesce(p.estoque_atual,0),0)
      into v_preco, v_nome, v_estoque
    from public.erp_produtos p
    where p.id = v_produto
      and p.empresa_id = v_empresa
      and p.ativo = true
    for update;

    if not found then raise exception 'Produto inválido ou inativo.'; end if;

    select coalesce(sum(r.quantidade),0)
      into v_reservado
    from public.erp_estoque_reservas r
    where r.empresa_id = v_empresa
      and r.produto_id = v_produto
      and r.status = 'ATIVA';

    v_disponivel := greatest(v_estoque - v_reservado,0);
    v_reserva := least(v_qtd,v_disponivel);
    v_falta := greatest(v_qtd-v_reserva,0);
    v_preco := greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,
      valor_unitario,desconto,total
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,
      v_preco,0,round(v_qtd*v_preco,2)
    )
    returning id into v_item_id;

    if v_reserva > 0 then
      insert into public.erp_estoque_reservas(
        empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status
      )
      values(v_empresa,v_pedido,v_item_id,v_produto,v_reserva,'ATIVA');
    end if;

    if v_falta > 0 then
      insert into public.erp_ordens_producao(
        empresa_id,numero_op,produto_id,quantidade,status,
        pedido_venda_id,data_prevista,observacoes
      )
      values(
        v_empresa,
        'OP-'||v_numero||'-'||replace(coalesce(v_item->>'codigo','ITEM'),'/','-'),
        v_produto,
        v_falta,
        'Aguardando PCP',
        v_pedido,
        p_data_entrega,
        'Gerada automaticamente pelo Pedido de Venda. Necessidade líquida após reserva de estoque.'
      );
    end if;
  end loop;

  update public.erp_pedidos_venda
  set status='PENDENTE',
      updated_at=now()
  where id=v_pedido;

  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_planejado(uuid,date,date,jsonb) from public, anon;
grant execute on function public.erp_finalizar_pedido_planejado(uuid,date,date,jsonb) to authenticated;
