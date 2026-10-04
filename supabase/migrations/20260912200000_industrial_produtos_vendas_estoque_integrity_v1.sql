create extension if not exists pgcrypto;

alter table public.erp_produtos add column if not exists estoque_atual numeric not null default 0;
alter table public.erp_produtos add column if not exists updated_at timestamptz not null default now();
create unique index if not exists ux_erp_produtos_empresa_codigo_lower on public.erp_produtos (empresa_id, lower(trim(codigo)));
create index if not exists ix_erp_produtos_empresa_nome on public.erp_produtos (empresa_id, lower(nome));
create index if not exists ix_erp_vendas_empresa_created on public.erp_vendas (empresa_id, created_at desc);
create index if not exists ix_erp_venda_itens_venda on public.erp_venda_itens (venda_id);
create index if not exists ix_erp_venda_itens_produto on public.erp_venda_itens (produto_id);

create or replace function public.erp_produto_calcular_margens()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 new.custo_medio:=greatest(coalesce(new.custo_medio,0),0); new.custo_ultimo:=greatest(coalesce(new.custo_ultimo,0),0); new.custo_fabricacao:=greatest(coalesce(new.custo_fabricacao,0),0); new.preco_venda:=greatest(coalesce(new.preco_venda,0),0); new.estoque_minimo:=greatest(coalesce(new.estoque_minimo,0),0); new.estoque_atual:=greatest(coalesce(new.estoque_atual,0),0); new.updated_at:=now();
 if new.custo_medio>0 then new.margem_valor:=new.preco_venda-new.custo_medio; new.margem_percentual:=round((new.margem_valor/new.custo_medio)*100,4); new.markup_percentual:=new.margem_percentual; else new.margem_valor:=new.preco_venda; new.margem_percentual:=case when new.preco_venda>0 then 100 else 0 end; new.markup_percentual:=0; end if; return new;
end; $$;
drop trigger if exists trg_erp_produto_calcular_margens on public.erp_produtos;
create trigger trg_erp_produto_calcular_margens before insert or update on public.erp_produtos for each row execute function public.erp_produto_calcular_margens();

create or replace function public.erp_estoque_aplicar_movimento()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_delta numeric;
begin
 if new.quantidade<=0 then raise exception 'Quantidade de estoque deve ser maior que zero.'; end if;
 v_delta:=case lower(new.tipo) when 'entrada' then new.quantidade when 'compra' then new.quantidade when 'saida' then -new.quantidade when 'venda' then -new.quantidade when 'consumo' then -new.quantidade when 'devolucao' then new.quantidade else 0 end;
 if v_delta<>0 then
  update public.erp_produtos set estoque_atual=estoque_atual+v_delta,custo_ultimo=case when v_delta>0 and new.custo_unitario>0 then new.custo_unitario else custo_ultimo end,custo_medio=case when v_delta>0 and new.custo_unitario>0 then ((greatest(estoque_atual,0)*custo_medio)+(new.quantidade*new.custo_unitario))/nullif(greatest(estoque_atual,0)+new.quantidade,0) else custo_medio end where id=new.produto_id and empresa_id=new.empresa_id;
  if not found then raise exception 'Produto não pertence à empresa do movimento.'; end if;
  if exists(select 1 from public.erp_produtos where id=new.produto_id and estoque_atual<0) then raise exception 'Estoque insuficiente para o movimento.'; end if;
 end if; return new;
end; $$;
drop trigger if exists trg_erp_estoque_aplicar_movimento on public.erp_estoque_movimentos;
create trigger trg_erp_estoque_aplicar_movimento after insert on public.erp_estoque_movimentos for each row execute function public.erp_estoque_aplicar_movimento();

create or replace function public.erp_finalizar_venda(p_cliente_id uuid,p_desconto numeric default 0,p_itens jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_venda uuid; v_subtotal numeric:=0; v_desconto numeric:=greatest(coalesce(p_desconto,0),0); v_item jsonb; v_produto uuid; v_qtd numeric; v_preco numeric; v_nome text;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if; if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'A venda precisa ter pelo menos um item.'; end if; if v_desconto<0 then raise exception 'Desconto inválido.'; end if;
 insert into public.erp_vendas(empresa_id,cliente_id,status,subtotal,desconto,total) values(v_empresa,p_cliente_id,'aberta',0,0,0) returning id into v_venda;
 for v_item in select * from jsonb_array_elements(p_itens) loop
  v_produto:=nullif(v_item->>'produto_id','')::uuid; v_qtd:=(v_item->>'quantidade')::numeric; if v_produto is null or v_qtd is null or v_qtd<=0 then raise exception 'Item de venda inválido.'; end if;
  select preco_venda,nome into v_preco,v_nome from public.erp_produtos where id=v_produto and empresa_id=v_empresa and ativo=true for update; if not found then raise exception 'Produto inválido ou inativo.'; end if;
  if v_qtd>(select estoque_atual from public.erp_produtos where id=v_produto) then raise exception 'Estoque insuficiente para o produto: %',v_nome; end if;
  v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);
  insert into public.erp_venda_itens(venda_id,produto_id,quantidade,valor_unitario,total) values(v_venda,v_produto,v_qtd,v_preco,round(v_qtd*v_preco,2)); v_subtotal:=v_subtotal+round(v_qtd*v_preco,2);
 end loop;
 if v_desconto>v_subtotal then raise exception 'Desconto não pode ser maior que o subtotal.'; end if;
 update public.erp_vendas set subtotal=v_subtotal,desconto=v_desconto,total=round(v_subtotal-v_desconto,2),status='finalizada' where id=v_venda;
 for v_item in select * from jsonb_array_elements(p_itens) loop
  v_produto:=(v_item->>'produto_id')::uuid; v_qtd:=(v_item->>'quantidade')::numeric;
  insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,custo_unitario,origem,referencia_id,observacao) select v_empresa,v_produto,'saida',v_qtd,custo_medio,'venda',v_venda,'Baixa automática da venda '||v_venda::text from public.erp_produtos where id=v_produto and empresa_id=v_empresa;
 end loop; return v_venda;
end; $$;
revoke all on function public.erp_finalizar_venda(uuid,numeric,jsonb) from public,anon;
grant execute on function public.erp_finalizar_venda(uuid,numeric,jsonb) to authenticated;

create or replace function public.erp_excluir_produto(p_produto_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id();
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
 if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa) then raise exception 'Produto não encontrado.'; end if;
 if exists(select 1 from public.erp_venda_itens i join public.erp_vendas v on v.id=i.venda_id where i.produto_id=p_produto_id and v.empresa_id=v_empresa) then raise exception 'Produto possui histórico de vendas. Inative o produto em vez de excluir.'; end if;
 if exists(select 1 from public.erp_estoque_movimentos m where m.produto_id=p_produto_id and m.empresa_id=v_empresa) then raise exception 'Produto possui movimentação de estoque. Inative o produto em vez de excluir.'; end if;
 delete from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa; return true;
end; $$;
revoke all on function public.erp_excluir_produto(uuid) from public,anon;
grant execute on function public.erp_excluir_produto(uuid) to authenticated;
