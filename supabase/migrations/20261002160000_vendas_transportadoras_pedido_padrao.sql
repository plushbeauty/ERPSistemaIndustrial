/* VENDAS — transportadoras e campos fiscais/comerciais do pedido.
   Sem dados fake: somente estrutura, vínculos e referências reais do banco.
*/
create table if not exists public.erp_transportadoras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  codigo varchar(30) not null,
  razao_social varchar(200) not null,
  cnpj varchar(18),
  ie varchar(30),
  telefone varchar(30),
  cidade varchar(120),
  uf char(2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

create table if not exists public.erp_cliente_transportadoras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade,
  transportadora_id uuid not null references public.erp_transportadoras(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(empresa_id,cliente_id,transportadora_id)
);

alter table public.erp_pedidos_venda
  add column if not exists id_transportadora uuid references public.erp_transportadoras(id) on delete set null,
  add column if not exists via_entrada varchar(30),
  add column if not exists cfop varchar(10),
  add column if not exists forma_pagamento varchar(80);

create index if not exists idx_erp_transportadoras_empresa_ativo
  on public.erp_transportadoras(empresa_id,ativo,razao_social);
create index if not exists idx_erp_cliente_transportadoras_cliente
  on public.erp_cliente_transportadoras(empresa_id,cliente_id);
create index if not exists idx_erp_cliente_transportadoras_transportadora
  on public.erp_cliente_transportadoras(empresa_id,transportadora_id);

alter table public.erp_transportadoras enable row level security;
alter table public.erp_cliente_transportadoras enable row level security;

drop policy if exists erp_transportadoras_select on public.erp_transportadoras;
drop policy if exists erp_transportadoras_insert on public.erp_transportadoras;
drop policy if exists erp_transportadoras_update on public.erp_transportadoras;
drop policy if exists erp_transportadoras_delete on public.erp_transportadoras;
create policy erp_transportadoras_select on public.erp_transportadoras for select to authenticated
  using (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','ver'));
create policy erp_transportadoras_insert on public.erp_transportadoras for insert to authenticated
  with check (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','criar'));
create policy erp_transportadoras_update on public.erp_transportadoras for update to authenticated
  using (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','editar'))
  with check (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','editar'));
create policy erp_transportadoras_delete on public.erp_transportadoras for delete to authenticated
  using (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','excluir'));

drop policy if exists erp_cliente_transportadoras_select on public.erp_cliente_transportadoras;
drop policy if exists erp_cliente_transportadoras_insert on public.erp_cliente_transportadoras;
drop policy if exists erp_cliente_transportadoras_delete on public.erp_cliente_transportadoras;
create policy erp_cliente_transportadoras_select on public.erp_cliente_transportadoras for select to authenticated
  using (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('vendas','ver'));
create policy erp_cliente_transportadoras_insert on public.erp_cliente_transportadoras for insert to authenticated
  with check (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('clientes','editar'));
create policy erp_cliente_transportadoras_delete on public.erp_cliente_transportadoras for delete to authenticated
  using (empresa_id=public.erp_current_empresa_id() and public.erp_has_permission('clientes','editar'));

drop function if exists public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,text,numeric,numeric);
create or replace function public.erp_finalizar_pedido_venda(
  p_cliente_id uuid,
  p_desconto numeric default 0,
  p_itens jsonb default '[]'::jsonb,
  p_data_entrada date default current_date,
  p_data_entrega date default null,
  p_pedido_cliente text default null,
  p_observacoes text default null,
  p_condicao_pagamento text default null,
  p_vendedor_nome text default null,
  p_modalidade_frete text default null,
  p_transportadora_id uuid default null,
  p_valor_frete numeric default 0,
  p_valor_outras_despesas numeric default 0,
  p_via_entrada text default null,
  p_cfop text default null,
  p_forma_pagamento text default null
) returns uuid
language plpgsql security definer set search_path=pg_catalog,public
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
  v_desconto_item numeric;
  v_nome text;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
  v_falta numeric;
  v_item_id uuid;
  v_subtotal numeric := 0;
  v_desconto numeric := greatest(coalesce(p_desconto,0),0);
  v_frete numeric := greatest(coalesce(p_valor_frete,0),0);
  v_outras numeric := greatest(coalesce(p_valor_outras_despesas,0),0);
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'O pedido precisa ter pelo menos um item.'; end if;
  if p_cliente_id is null or not exists(select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true) then
    raise exception 'Cliente inválido para a empresa atual.';
  end if;
  if p_transportadora_id is not null and not exists(select 1 from public.erp_transportadoras t where t.id=p_transportadora_id and t.empresa_id=v_empresa and t.ativo=true) then
    raise exception 'Transportadora inválida para a empresa atual.';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_empresa::text));
  select coalesce(max(numero),0)+1 into v_numero from public.erp_pedidos_venda where empresa_id=v_empresa;
  select u.id into v_usuario from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null limit 1;
  insert into public.erp_pedidos_venda(
    empresa_id,numero,cliente_id,status,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,
    data_entrada,data_entrega_prometida,pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,
    modalidade_frete,id_transportadora,via_entrada,cfop,forma_pagamento,created_by
  ) values(
    v_empresa,v_numero,p_cliente_id,'PENDENTE',0,0,0,v_frete,v_outras,coalesce(p_data_entrada,current_date),
    p_data_entrega,nullif(trim(p_pedido_cliente),''),nullif(trim(p_observacoes),''),
    nullif(trim(p_condicao_pagamento),''),nullif(trim(p_vendedor_nome),''),nullif(trim(p_modalidade_frete),''),
    p_transportadora_id,nullif(trim(p_via_entrada),''),nullif(trim(p_cfop),''),nullif(trim(p_forma_pagamento),''),v_usuario
  ) returning id into v_pedido;
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;
    v_desconto_item := greatest(coalesce(nullif(v_item->>'desconto','')::numeric,0),0);
    if v_produto is null or v_qtd is null or v_qtd<=0 then raise exception 'Item de pedido inválido.'; end if;
    select p.preco_venda,p.nome,greatest(coalesce(p.estoque_atual,0),0) into v_preco,v_nome,v_estoque
      from public.erp_produtos p where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true for update;
    if not found then raise exception 'Produto inválido ou inativo.'; end if;
    select coalesce(sum(r.quantidade),0) into v_reservado from public.erp_estoque_reservas r
      where r.empresa_id=v_empresa and r.produto_id=v_produto and r.status='ATIVA';
    v_disponivel := greatest(v_estoque-v_reservado,0);
    v_reserva := least(v_qtd,v_disponivel);
    v_falta := greatest(v_qtd-v_reserva,0);
    v_preco := greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);
    insert into public.erp_pedidos_venda_itens(empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente)
    values(v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,v_desconto_item,round(greatest(v_qtd*v_preco-v_desconto_item,0),2),nullif(trim(v_item->>'codigo_cliente'),''))
    returning id into v_item_id;
    if v_reserva>0 then
      insert into public.erp_estoque_reservas(empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status)
      values(v_empresa,v_pedido,v_item_id,v_produto,v_reserva,'ATIVA');
    end if;
    if v_falta>0 then
      insert into public.erp_ordens_producao(empresa_id,numero_op,produto_id,quantidade,status,pedido_venda_id,data_prevista,observacoes,cliente_id,quantidade_planejada)
      values(v_empresa,'OP-'||v_numero||'-'||replace(coalesce(v_item->>'codigo','ITEM'),'/','-'),v_produto,v_falta,'Aguardando PCP',v_pedido,p_data_entrega,
        'Gerada automaticamente pelo Pedido de Venda. Necessidade líquida após reserva de estoque.',p_cliente_id,v_falta);
    end if;
    v_subtotal := v_subtotal + greatest(round(v_qtd*v_preco-v_desconto_item,2),0);
  end loop;
  if v_desconto>v_subtotal then raise exception 'Desconto do pedido não pode ser maior que o subtotal.'; end if;
  update public.erp_pedidos_venda set subtotal=round(v_subtotal,2),desconto_valor=round(v_desconto,2),
    total=round(v_subtotal-v_desconto+v_frete+v_outras,2),updated_at=now()
    where id=v_pedido and empresa_id=v_empresa;
  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) to authenticated;
