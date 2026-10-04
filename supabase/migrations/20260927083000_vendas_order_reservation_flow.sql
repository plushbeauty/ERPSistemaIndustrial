create table if not exists public.erp_vendas_depara_produtos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id),
 cliente_id uuid not null references public.erp_clientes(id),
 codigo_interno varchar not null,
 codigo_cliente varchar not null,
 data_cadastro timestamptz not null default now()
);
create unique index if not exists ux_erp_vendas_depara_empresa_cliente_codigo on public.erp_vendas_depara_produtos(empresa_id,cliente_id,codigo_cliente);
create index if not exists ix_erp_vendas_depara_lookup on public.erp_vendas_depara_produtos(empresa_id,cliente_id,codigo_interno);
alter table public.erp_vendas_depara_produtos enable row level security;
drop policy if exists "vendas_depara_select_empresa" on public.erp_vendas_depara_produtos;
drop policy if exists "vendas_depara_insert_empresa" on public.erp_vendas_depara_produtos;
drop policy if exists "vendas_depara_update_empresa" on public.erp_vendas_depara_produtos;
drop policy if exists "vendas_depara_delete_empresa" on public.erp_vendas_depara_produtos;
create policy "vendas_depara_select_empresa" on public.erp_vendas_depara_produtos for select to authenticated using(empresa_id=public.erp_current_empresa_id());
create policy "vendas_depara_insert_empresa" on public.erp_vendas_depara_produtos for insert to authenticated with check(empresa_id=public.erp_current_empresa_id());
create policy "vendas_depara_update_empresa" on public.erp_vendas_depara_produtos for update to authenticated using(empresa_id=public.erp_current_empresa_id()) with check(empresa_id=public.erp_current_empresa_id());
create policy "vendas_depara_delete_empresa" on public.erp_vendas_depara_produtos for delete to authenticated using(empresa_id=public.erp_current_empresa_id());

create or replace function public.erp_finalizar_pedido_venda(p_cliente_id uuid,p_desconto numeric default 0,p_itens jsonb default '[]'::jsonb,p_data_entrega date default null,p_pedido_cliente text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();v_usuario uuid;v_pedido uuid;v_item jsonb;v_produto uuid;v_qtd numeric;v_preco numeric;v_nome text;v_estoque numeric;v_reservavel numeric;v_falta numeric;v_subtotal numeric:=0;v_desconto numeric:=greatest(coalesce(p_desconto,0),0);v_item_id uuid;v_numero bigint;v_fabricado boolean;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada.';end if;
 if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.';end if;
 select u.id into v_usuario from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null limit 1;
 if v_usuario is null then raise exception 'Usuário ERP não localizado para a empresa atual.';end if;
 if p_cliente_id is null or not exists(select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true) then raise exception 'Cliente inválido para a empresa atual.';end if;
 if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'A venda precisa ter pelo menos um item.';end if;
 select coalesce(max(numero),0)+1 into v_numero from public.erp_pedidos_venda where empresa_id=v_empresa;
 insert into public.erp_pedidos_venda(empresa_id,cliente_id,numero,status,total,created_by,data_entrega_prometida,pedido_cliente) values(v_empresa,p_cliente_id,v_numero,'em_analise',0,v_usuario,p_data_entrega,p_pedido_cliente) returning id into v_pedido;
 for v_item in select * from jsonb_array_elements(p_itens) loop
  v_produto:=nullif(v_item->>'produto_id','')::uuid;v_qtd:=nullif(v_item->>'quantidade','')::numeric;if v_produto is null or v_qtd is null or v_qtd<=0 then raise exception 'Item de venda inválido.';end if;
  select p.preco_venda,coalesce(nullif(p.nome,''),p.descricao),coalesce(p.estoque_atual,0),coalesce(p.fabricado,false) into v_preco,v_nome,v_estoque,v_fabricado from public.erp_produtos p where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true for update;if not found then raise exception 'Produto inválido ou inativo.';end if;
  v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);v_reservavel:=least(v_qtd,greatest(v_estoque,0));v_falta:=greatest(v_qtd-v_reservavel,0);
  insert into public.erp_pedidos_venda_itens(empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente) values(v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,0,round(v_qtd*v_preco,2),nullif(v_item->>'codigo_cliente','')) returning id into v_item_id;
  v_subtotal:=v_subtotal+round(v_qtd*v_preco,2);
  if v_reservavel>0 then
   insert into public.erp_estoque_reservas(empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status) values(v_empresa,v_pedido,v_item_id,v_produto,v_reservavel,'ATIVA');
   update public.erp_produtos set estoque_atual=greatest(coalesce(estoque_atual,0)-v_reservavel,0),updated_at=now() where id=v_produto and empresa_id=v_empresa;
   update public.erp_produto_estoque set quantidade_reservada=coalesce(quantidade_reservada,0)+v_reservavel,quantidade_disponivel=greatest(coalesce(quantidade_disponivel,0)-v_reservavel,0),updated_at=now() where empresa_id=v_empresa and produto_id=v_produto;
   insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,pedido_venda_id,observacao) values(v_empresa,v_produto,'reserva',v_reservavel,'venda',v_pedido,'Reserva de estoque para pedido de venda');
  end if;
  if v_falta>0 and v_fabricado then
   insert into public.erp_ordens_producao(empresa_id,numero_op,produto_id,quantidade,status,pedido_venda_id,data_prevista,cliente_id,prioridade,observacoes) values(v_empresa,'OP-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||right(replace(v_produto::text,'-',''),6),v_produto,v_falta,'pendente',v_pedido,p_data_entrega,p_cliente_id,'REGULAR','Gerada automaticamente pela necessidade líquida do pedido de venda');
  end if;
 end loop;
 if v_desconto>v_subtotal then raise exception 'Desconto não pode ser maior que o subtotal.';end if;
 update public.erp_pedidos_venda set total=round(v_subtotal-v_desconto,2),status=case when exists(select 1 from public.erp_estoque_reservas r where r.pedido_venda_id=v_pedido and r.status='ATIVA') and exists(select 1 from public.erp_ordens_producao op where op.pedido_venda_id=v_pedido) then 'parcial' when exists(select 1 from public.erp_estoque_reservas r where r.pedido_venda_id=v_pedido and r.status='ATIVA') then 'reservado' when exists(select 1 from public.erp_ordens_producao op where op.pedido_venda_id=v_pedido) then 'pcp_pendente' else 'em_analise' end,updated_at=now() where id=v_pedido;
 return v_pedido;
end;$$;
revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,text) from public;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,text) to authenticated;