/* VENDAS — reconstrução relacional do pedido industrial. */
alter table public.erp_clientes add column if not exists fator_markup_comercial numeric(12,4) not null default 1.0000;
alter table public.erp_maquinas add column if not exists valor_hora_custo numeric(18,6) not null default 0;

create table if not exists public.erp_fichas_processo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  codigo_ficha text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo_ficha),
  unique (empresa_id, id)
);

create table if not exists public.erp_ficha_processo_operacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ficha_processo_id uuid not null references public.erp_fichas_processo(id) on delete cascade,
  sequencial_operacao integer not null check (sequencial_operacao > 0),
  descricao_operacao text not null,
  posto_trabalho_id uuid not null references public.erp_maquinas(id) on delete restrict,
  tempo_minutos numeric(12,3) not null check (tempo_minutos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, ficha_processo_id, sequencial_operacao),
  unique (empresa_id, id),
  foreign key (empresa_id, ficha_processo_id) references public.erp_fichas_processo(empresa_id, id) on delete cascade
);

create index if not exists idx_erp_fichas_processo_empresa_produto on public.erp_fichas_processo(empresa_id, produto_id, ativo);
create index if not exists idx_erp_ficha_processo_operacoes_ficha on public.erp_ficha_processo_operacoes(empresa_id, ficha_processo_id, sequencial_operacao);

alter table public.erp_fichas_processo enable row level security;
alter table public.erp_ficha_processo_operacoes enable row level security;

drop policy if exists erp_fichas_processo_select on public.erp_fichas_processo;
drop policy if exists erp_fichas_processo_write on public.erp_fichas_processo;
create policy erp_fichas_processo_select on public.erp_fichas_processo for select to authenticated using (empresa_id = public.erp_current_empresa_id());
create policy erp_fichas_processo_write on public.erp_fichas_processo for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_ficha_processo_operacoes_select on public.erp_ficha_processo_operacoes;
drop policy if exists erp_ficha_processo_operacoes_write on public.erp_ficha_processo_operacoes;
create policy erp_ficha_processo_operacoes_select on public.erp_ficha_processo_operacoes for select to authenticated using (empresa_id = public.erp_current_empresa_id());
create policy erp_ficha_processo_operacoes_write on public.erp_ficha_processo_operacoes for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_calcular_preco_sugerido_venda(p_cliente_id uuid,p_produto_id uuid)
returns table(custo_processo numeric,fator_markup numeric,preco_sugerido numeric,operacoes integer)
language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare v_empresa uuid := public.erp_current_empresa_id(); v_ficha uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo=true) then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa and ativo=true) then raise exception 'Produto inválido para a empresa atual.'; end if;
  select f.id into v_ficha from public.erp_fichas_processo f where f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativo=true order by f.updated_at desc,f.created_at desc limit 1;
  return query
  select round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0),2),
    greatest(coalesce(c.fator_markup_comercial,1),0),
    round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0)*greatest(coalesce(c.fator_markup_comercial,1),0),2),
    count(o.id)::integer
  from public.erp_clientes c
  left join public.erp_ficha_processo_operacoes o on o.empresa_id=v_empresa and o.ficha_processo_id=v_ficha
  left join public.erp_maquinas m on m.id=o.posto_trabalho_id and m.empresa_id=v_empresa
  where c.id=p_cliente_id and c.empresa_id=v_empresa;
end;
$$;
revoke all on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) from public,anon;
grant execute on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) to authenticated;

drop function if exists public.erp_gravar_rascunho_pedido_venda(uuid,uuid,jsonb,date,date,text,text,text,text,text,uuid,text,text,text,numeric,numeric,numeric);
create or replace function public.erp_gravar_rascunho_pedido_venda(
  p_pedido_id uuid default null,p_cliente_id uuid default null,p_itens jsonb default '[]'::jsonb,p_data_entrada date default current_date,p_data_entrega date default null,p_pedido_cliente text default null,p_observacoes text default null,p_condicao_pagamento text default null,p_vendedor_nome text default null,p_modalidade_frete text default null,p_transportadora_id uuid default null,p_via_entrada text default null,p_cfop text default null,p_forma_pagamento text default null,p_desconto numeric default 0,p_valor_frete numeric default 0,p_valor_outras_despesas numeric default 0
) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_pedido uuid:=p_pedido_id; v_numero bigint; v_item jsonb; v_produto uuid; v_qtd numeric; v_preco numeric; v_desc numeric; v_nome text; v_subtotal numeric:=0;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_cliente_id is null or not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo=true) then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'O rascunho precisa ter pelo menos um item.'; end if;
  if p_transportadora_id is not null and not exists(select 1 from public.erp_transportadoras where id=p_transportadora_id and empresa_id=v_empresa and ativo=true) then raise exception 'Transportadora inválida para a empresa atual.'; end if;
  perform pg_advisory_xact_lock(hashtext(v_empresa::text));
  if v_pedido is null then
    select coalesce(max(numero),0)+1 into v_numero from public.erp_pedidos_venda where empresa_id=v_empresa;
    insert into public.erp_pedidos_venda(empresa_id,numero,cliente_id,status,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,data_entrada,data_entrega_prometida,pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,modalidade_frete,id_transportadora,via_entrada,cfop,forma_pagamento,created_by)
    values(v_empresa,v_numero,p_cliente_id,'RASCUNHO',0,0,greatest(coalesce(p_desconto,0),0),greatest(coalesce(p_valor_frete,0),0),greatest(coalesce(p_valor_outras_despesas,0),0),coalesce(p_data_entrada,current_date),p_data_entrega,nullif(trim(p_pedido_cliente),''),nullif(trim(p_observacoes),''),nullif(trim(p_condicao_pagamento),''),nullif(trim(p_vendedor_nome),''),nullif(trim(p_modalidade_frete),''),p_transportadora_id,nullif(trim(p_via_entrada),''),nullif(trim(p_cfop),''),nullif(trim(p_forma_pagamento),''),auth.uid()) returning id into v_pedido;
  else
    update public.erp_pedidos_venda set cliente_id=p_cliente_id,status='RASCUNHO',data_entrada=coalesce(p_data_entrada,current_date),data_entrega_prometida=p_data_entrega,pedido_cliente=nullif(trim(p_pedido_cliente),''),observacoes=nullif(trim(p_observacoes),''),condicao_pagamento=nullif(trim(p_condicao_pagamento),''),vendedor_nome=nullif(trim(p_vendedor_nome),''),modalidade_frete=nullif(trim(p_modalidade_frete),''),id_transportadora=p_transportadora_id,via_entrada=nullif(trim(p_via_entrada),''),cfop=nullif(trim(p_cfop),''),forma_pagamento=nullif(trim(p_forma_pagamento),''),desconto_valor=greatest(coalesce(p_desconto,0),0),valor_frete=greatest(coalesce(p_valor_frete,0),0),valor_outras_despesas=greatest(coalesce(p_valor_outras_despesas,0),0),updated_at=now() where id=v_pedido and empresa_id=v_empresa;
    if not found then raise exception 'Rascunho não pertence à empresa atual.'; end if;
    delete from public.erp_pedidos_venda_itens where pedido_id=v_pedido and empresa_id=v_empresa;
  end if;
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=nullif(v_item->>'produto_id','')::uuid; v_qtd:=(v_item->>'quantidade')::numeric; v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,0),0); v_desc:=greatest(coalesce(nullif(v_item->>'desconto','')::numeric,0),0);
    select nome into v_nome from public.erp_produtos where id=v_produto and empresa_id=v_empresa and ativo=true;
    if not found or v_qtd is null or v_qtd<=0 then raise exception 'Item de rascunho inválido.'; end if;
    insert into public.erp_pedidos_venda_itens(empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente) values(v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,v_desc,round(greatest(v_qtd*v_preco-v_desc,0),2),nullif(trim(v_item->>'codigo_cliente'),''));
    v_subtotal:=v_subtotal+greatest(round(v_qtd*v_preco-v_desc,2),0);
  end loop;
  if greatest(coalesce(p_desconto,0),0)>v_subtotal then raise exception 'Desconto do pedido não pode ser maior que o subtotal.'; end if;
  update public.erp_pedidos_venda set subtotal=round(v_subtotal,2),desconto_valor=round(greatest(coalesce(p_desconto,0),0),2),total=round(v_subtotal-greatest(coalesce(p_desconto,0),0)+greatest(coalesce(p_valor_frete,0),0)+greatest(coalesce(p_valor_outras_despesas,0),0),2),updated_at=now() where id=v_pedido and empresa_id=v_empresa;
  return v_pedido;
end;
$$;
revoke all on function public.erp_gravar_rascunho_pedido_venda(uuid,uuid,jsonb,date,date,text,text,text,text,text,uuid,text,text,text,numeric,numeric,numeric) from public,anon;
grant execute on function public.erp_gravar_rascunho_pedido_venda(uuid,uuid,jsonb,date,date,text,text,text,text,text,uuid,text,text,text,numeric,numeric,numeric) to authenticated;
