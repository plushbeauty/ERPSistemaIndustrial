-- Atomic purchase workflows and stock-ledger integrity.
alter table public.erp_solicitacoes_compra
  add column if not exists fornecedor_id uuid
  references public.erp_fornecedores(id) on delete set null;

create sequence if not exists public.erp_solicitacoes_compra_numero_seq;

select setval(
  'public.erp_solicitacoes_compra_numero_seq',
  greatest(coalesce((select max(numero) from public.erp_solicitacoes_compra), 0) + 1, 1),
  false
);

alter table public.erp_solicitacoes_compra
  alter column numero drop identity if exists;

alter table public.erp_solicitacoes_compra
  alter column numero set default nextval('public.erp_solicitacoes_compra_numero_seq');

alter sequence public.erp_solicitacoes_compra_numero_seq
  owned by public.erp_solicitacoes_compra.numero;

create index if not exists idx_erp_solicitacoes_compra_fornecedor
  on public.erp_solicitacoes_compra(fornecedor_id);

drop policy if exists tenant_select_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_insert_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_update_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_delete_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists erp_solicitacoes_compra_select on public.erp_solicitacoes_compra;
drop policy if exists erp_solicitacoes_compra_insert on public.erp_solicitacoes_compra;
drop policy if exists erp_solicitacoes_compra_update on public.erp_solicitacoes_compra;

create policy erp_solicitacoes_compra_select on public.erp_solicitacoes_compra
  for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'ver')
  );

create policy erp_solicitacoes_compra_insert on public.erp_solicitacoes_compra
  for insert to authenticated
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'criar')
  );

create policy erp_solicitacoes_compra_update on public.erp_solicitacoes_compra
  for update to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'editar')
  )
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'editar')
  );

create policy erp_solicitacoes_compra_delete on public.erp_solicitacoes_compra
  for delete to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'excluir')
  );

drop policy if exists tenant_select_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_insert_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_update_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_delete_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;

create policy erp_solicitacoes_compra_itens_select on public.erp_solicitacoes_compra_itens
  for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'ver')
  );

create policy erp_solicitacoes_compra_itens_insert on public.erp_solicitacoes_compra_itens
  for insert to authenticated
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'criar')
  );

create policy erp_solicitacoes_compra_itens_update on public.erp_solicitacoes_compra_itens
  for update to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'editar')
  )
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'editar')
  );

create policy erp_solicitacoes_compra_itens_delete on public.erp_solicitacoes_compra_itens
  for delete to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('compras', 'excluir')
  );

create or replace function public.erp_compras_criar_solicitacao(
  p_descricao text,
  p_prioridade text,
  p_email_destino text,
  p_observacoes text,
  p_fornecedor_id uuid,
  p_itens jsonb
)
returns table(id uuid, numero bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_solicitante_id uuid;
  v_solicitacao_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_valor_estimado numeric;
  v_descricao text;
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if not public.erp_has_permission('compras', 'criar') then
    raise exception 'Sem permissão para criar solicitações de compra.';
  end if;
  if btrim(coalesce(p_descricao, '')) = '' then
    raise exception 'Informe a descrição da solicitação.';
  end if;
  if lower(coalesce(nullif(btrim(p_prioridade), ''), 'normal')) not in ('normal', 'alta', 'urgente') then
    raise exception 'Prioridade da solicitação inválida.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione pelo menos um item à solicitação.';
  end if;

  select u.id
    into v_solicitante_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;

  if v_solicitante_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar a solicitação.';
  end if;

  if p_fornecedor_id is not null and not exists (
    select 1
      from public.erp_fornecedores f
     where f.id = p_fornecedor_id
       and f.empresa_id = v_empresa_id
       and f.ativo = true
  ) then
    raise exception 'O fornecedor selecionado não pertence à empresa ativa.';
  end if;

  insert into public.erp_solicitacoes_compra as request (
    empresa_id,
    solicitante_id,
    descricao,
    prioridade,
    requer_autorizacao,
    status,
    email_destino,
    observacoes,
    fornecedor_id
  )
  values (
    v_empresa_id,
    v_solicitante_id,
    btrim(p_descricao),
    lower(coalesce(nullif(btrim(p_prioridade), ''), 'normal')),
    true,
    'aguardando_autorizacao',
    nullif(btrim(p_email_destino), ''),
    nullif(btrim(p_observacoes), ''),
    p_fornecedor_id
  )
  returning request.id into v_solicitacao_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_descricao := btrim(coalesce(v_item->>'descricao', ''));
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_valor_estimado := coalesce(nullif(v_item->>'valor_estimado', '')::numeric, 0);

    if v_produto_id is null
      or v_descricao = ''
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
      or v_valor_estimado < 0
      or v_valor_estimado::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Item de solicitação inválido.';
    end if;
    if not exists (
      select 1
        from public.erp_produtos p
       where p.id = v_produto_id
         and p.empresa_id = v_empresa_id
         and p.ativo = true
    ) then
      raise exception 'Um produto selecionado não pertence à empresa ativa.';
    end if;

    insert into public.erp_solicitacoes_compra_itens (
      empresa_id,
      solicitacao_id,
      produto_id,
      descricao,
      quantidade,
      unidade,
      valor_estimado
    )
    values (
      v_empresa_id,
      v_solicitacao_id,
      v_produto_id,
      v_descricao,
      v_quantidade,
      coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN'),
      v_valor_estimado
    );
  end loop;

  return query
    select s.id, s.numero
      from public.erp_solicitacoes_compra s
     where s.id = v_solicitacao_id
       and s.empresa_id = v_empresa_id;
end;
$$;

revoke all on function public.erp_compras_criar_solicitacao(text, text, text, text, uuid, jsonb) from public;
grant execute on function public.erp_compras_criar_solicitacao(text, text, text, text, uuid, jsonb) to authenticated;

drop policy if exists erp_pedidos_compra_select on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_insert on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_update on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_delete on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_empresa on public.erp_pedidos_compra;

create policy erp_pedidos_compra_select on public.erp_pedidos_compra
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'ver'));

create policy erp_pedidos_compra_insert on public.erp_pedidos_compra
  for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'criar'));

create policy erp_pedidos_compra_update on public.erp_pedidos_compra
  for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'editar'));

create policy erp_pedidos_compra_delete on public.erp_pedidos_compra
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and status in ('RASCUNHO', 'PENDENTE_APROVACAO')
    and public.erp_has_permission('compras', 'excluir')
  );

drop policy if exists erp_pedidos_compra_itens_select on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_insert on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_update on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_delete on public.erp_pedidos_compra_itens;

create policy erp_pedidos_compra_itens_select on public.erp_pedidos_compra_itens
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'ver'));

create policy erp_pedidos_compra_itens_insert on public.erp_pedidos_compra_itens
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('compras', 'criar')
      or public.erp_has_permission('compras', 'editar')
    )
  );

create policy erp_pedidos_compra_itens_update on public.erp_pedidos_compra_itens
  for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras', 'editar'));

create policy erp_pedidos_compra_itens_delete on public.erp_pedidos_compra_itens
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('compras', 'excluir')
      or public.erp_has_permission('compras', 'editar')
    )
  );

create or replace function public.erp_atualizar_total_pedido_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.erp_pedidos_compra p
     set total = coalesce(
           (select sum(i.total)
              from public.erp_pedidos_compra_itens i
             where i.pedido_id = p.id
               and i.empresa_id = p.empresa_id),
           0
         ),
         updated_at = now()
   where p.id = coalesce(new.pedido_id, old.pedido_id)
     and p.empresa_id = coalesce(new.empresa_id, old.empresa_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.erp_atualizar_total_pedido_compra() from public;
grant execute on function public.erp_atualizar_total_pedido_compra() to authenticated;

create or replace function public.erp_compras_salvar_pedido(
  p_pedido_id uuid,
  p_fornecedor_id uuid,
  p_comprador_nome text,
  p_condicao_pagamento text,
  p_prazo_entrega date,
  p_observacoes text,
  p_status text,
  p_itens jsonb
)
returns table(id uuid, numero bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_comprador_id uuid;
  v_pedido_id uuid;
  v_numero bigint;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_preco numeric;
  v_unidade text;
  v_produto record;
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if p_status not in ('RASCUNHO', 'PENDENTE_APROVACAO') then
    raise exception 'Status de pedido inválido.';
  end if;
  if p_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
     where f.id = p_fornecedor_id
       and f.empresa_id = v_empresa_id
       and f.ativo = true
  ) then
    raise exception 'Selecione um fornecedor ativo da empresa.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um produto no pedido.';
  end if;

  select u.id
    into v_comprador_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_comprador_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar o comprador.';
  end if;

  if p_pedido_id is null then
    if not public.erp_has_permission('compras', 'criar') then
      raise exception 'Sem permissão para criar pedidos de compra.';
    end if;

    insert into public.erp_pedidos_compra (
      empresa_id,
      fornecedor_id,
      comprador_id,
      comprador_nome,
      condicao_pagamento,
      prazo_entrega,
      observacoes,
      status
    )
    values (
      v_empresa_id,
      p_fornecedor_id,
      v_comprador_id,
      nullif(btrim(p_comprador_nome), ''),
      nullif(btrim(p_condicao_pagamento), ''),
      p_prazo_entrega,
      nullif(btrim(p_observacoes), ''),
      p_status
    )
    returning erp_pedidos_compra.id, erp_pedidos_compra.numero
         into v_pedido_id, v_numero;
  else
    if not public.erp_has_permission('compras', 'editar') then
      raise exception 'Sem permissão para editar pedidos de compra.';
    end if;

    perform 1
      from public.erp_pedidos_compra p
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
       and p.status in ('RASCUNHO', 'PENDENTE_APROVACAO')
     for update;
    if not found then
      raise exception 'Pedido não encontrado ou não pode mais ser editado.';
    end if;

    update public.erp_pedidos_compra p
       set fornecedor_id = p_fornecedor_id,
           comprador_id = v_comprador_id,
           comprador_nome = nullif(btrim(p_comprador_nome), ''),
           condicao_pagamento = nullif(btrim(p_condicao_pagamento), ''),
           prazo_entrega = p_prazo_entrega,
           observacoes = nullif(btrim(p_observacoes), ''),
           status = p_status,
           updated_at = now()
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
     returning p.id, p.numero into v_pedido_id, v_numero;

    delete from public.erp_pedidos_compra_itens i
     where i.pedido_id = v_pedido_id
       and i.empresa_id = v_empresa_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_preco := coalesce(nullif(v_item->>'preco_unitario', '')::numeric, 0);
    v_unidade := coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN');

    if v_produto_id is null
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
      or v_preco < 0
      or v_preco::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Item ou quantidade/preço inválido no pedido.';
    end if;

    select p.id, p.codigo, p.nome
      into v_produto
      from public.erp_produtos p
     where p.id = v_produto_id
       and p.empresa_id = v_empresa_id
       and p.ativo = true;
    if not found then
      raise exception 'Um produto selecionado não pertence à empresa ativa.';
    end if;

    insert into public.erp_pedidos_compra_itens (
      empresa_id,
      pedido_id,
      produto_id,
      codigo_produto,
      descricao_produto,
      quantidade,
      unidade,
      preco_unitario
    )
    values (
      v_empresa_id,
      v_pedido_id,
      v_produto_id,
      v_produto.codigo,
      v_produto.nome,
      v_quantidade,
      v_unidade,
      v_preco
    );
  end loop;

  return query select v_pedido_id, v_numero;
end;
$$;

revoke all on function public.erp_compras_salvar_pedido(uuid, uuid, text, text, date, text, text, jsonb) from public;
grant execute on function public.erp_compras_salvar_pedido(uuid, uuid, text, text, date, text, text, jsonb) to authenticated;

create or replace function public.erp_registrar_conferencia_producao(
  p_ordem_producao_id uuid,
  p_quantidade_encontrada numeric,
  p_quantidade_defeituosa numeric,
  p_defeitos jsonb default '[]'::jsonb,
  p_localizacao_destino_id uuid default null::uuid,
  p_acabamento boolean default false,
  p_observacao text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_op record;
  v_conf uuid;
  v_boa numeric;
  v_defeito jsonb;
begin
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'editar')) then
    raise exception 'Sem permissão para registrar conferência de produção.';
  end if;
  if p_quantidade_encontrada is null
    or p_quantidade_defeituosa is null
    or p_quantidade_encontrada < 0
    or p_quantidade_defeituosa < 0
    or p_quantidade_defeituosa > p_quantidade_encontrada
    or p_quantidade_encontrada::text in ('NaN', 'Infinity', '-Infinity')
    or p_quantidade_defeituosa::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Quantidades de conferência inválidas';
  end if;
  if jsonb_typeof(coalesce(p_defeitos, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'Lista de defeitos inválida';
  end if;
  if p_localizacao_destino_id is not null and not exists (
    select 1
      from public.erp_estoque_localizacoes l
     where l.id = p_localizacao_destino_id
       and l.empresa_id = v_empresa
       and l.ativo = true
  ) then
    raise exception 'Endereço de destino não pertence à empresa ativa.';
  end if;

  select *
    into v_op
    from public.erp_ordens_producao
   where id = p_ordem_producao_id
     and empresa_id = v_empresa
   for update;
  if not found then
    raise exception 'Ordem de produção não encontrada para a empresa atual';
  end if;

  v_boa := p_quantidade_encontrada - p_quantidade_defeituosa;
  insert into public.erp_producao_conferencias (
    empresa_id,
    ordem_producao_id,
    produto_id,
    quantidade_planejada,
    quantidade_encontrada,
    quantidade_defeituosa,
    quantidade_lancada_estoque,
    quantidade_lancada_refugo,
    status,
    acabamento,
    observacao,
    conferido_por
  )
  values (
    v_empresa,
    v_op.id,
    v_op.produto_id,
    v_op.quantidade,
    p_quantidade_encontrada,
    p_quantidade_defeituosa,
    v_boa,
    p_quantidade_defeituosa,
    'conferida',
    p_acabamento,
    p_observacao,
    (select u.id from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa limit 1)
  )
  returning id into v_conf;

  for v_defeito in select value from jsonb_array_elements(coalesce(p_defeitos, '[]'::jsonb))
  loop
    if coalesce(btrim(v_defeito->>'defeito'), '') = '' then
      continue;
    end if;
    insert into public.erp_producao_defeitos (
      empresa_id,
      conferencia_id,
      ordem_producao_id,
      produto_id,
      defeito,
      quantidade,
      observacao,
      encaminhado_qualidade
    )
    values (
      v_empresa,
      v_conf,
      v_op.id,
      v_op.produto_id,
      btrim(v_defeito->>'defeito'),
      greatest(0, coalesce(nullif(v_defeito->>'quantidade', '')::numeric, 0)),
      nullif(btrim(v_defeito->>'observacao'), ''),
      true
    );
  end loop;

  if v_boa > 0 then
    insert into public.erp_estoque_movimentos (
      empresa_id,
      produto_id,
      tipo,
      quantidade,
      origem,
      documento,
      ordem_producao_id,
      localizacao_destino_id,
      observacao
    )
    values (
      v_empresa,
      v_op.produto_id,
      'entrada',
      v_boa,
      'producao',
      v_op.numero_op,
      v_op.id,
      p_localizacao_destino_id,
      'Conferência de produção: quantidade boa'
    );
  end if;
  if p_quantidade_defeituosa > 0 then
    insert into public.erp_estoque_movimentos (
      empresa_id,
      produto_id,
      tipo,
      quantidade,
      origem,
      documento,
      ordem_producao_id,
      observacao
    )
    values (
      v_empresa,
      v_op.produto_id,
      'refugo',
      p_quantidade_defeituosa,
      'producao',
      v_op.numero_op,
      v_op.id,
      'Conferência de produção: refugo encaminhado à qualidade'
    );
  end if;

  update public.erp_ordens_producao
     set status = case when p_quantidade_encontrada >= v_op.quantidade then 'concluida' else 'parcial' end
   where id = v_op.id
     and empresa_id = v_empresa;

  return jsonb_build_object(
    'conferencia_id', v_conf,
    'ordem_producao_id', v_op.id,
    'numero_op', v_op.numero_op,
    'quantidade_planejada', v_op.quantidade,
    'quantidade_encontrada', p_quantidade_encontrada,
    'quantidade_defeituosa', p_quantidade_defeituosa,
    'quantidade_boa', v_boa,
    'saldo_producao', greatest(v_op.quantidade - p_quantidade_encontrada, 0)
  );
end;
$function$;

revoke execute on function public.erp_registrar_conferencia_producao(uuid, numeric, numeric, jsonb, uuid, boolean, text) from public, anon;
grant execute on function public.erp_registrar_conferencia_producao(uuid, numeric, numeric, jsonb, uuid, boolean, text) to authenticated;

create or replace function public.erp_estoque_aplicar_movimento()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_delta numeric;
  v_location_id uuid;
begin
  if new.quantidade is null
    or new.quantidade <= 0
    or new.quantidade::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Quantidade de estoque deve ser maior que zero.';
  end if;
  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = new.produto_id
       and p.empresa_id = new.empresa_id
  ) then
    raise exception 'Produto não pertence à empresa do movimento.';
  end if;

  if lower(coalesce(new.tipo, '')) = 'transferencia' then
    if new.localizacao_origem_id is null
      or new.localizacao_destino_id is null
      or new.localizacao_origem_id = new.localizacao_destino_id
    then
      raise exception 'Transferência requer endereços de origem e destino distintos.';
    end if;
  end if;

  foreach v_location_id in array array[new.localizacao_origem_id, new.localizacao_destino_id]
  loop
    if v_location_id is not null and not exists (
      select 1
        from public.erp_estoque_localizacoes l
       where l.id = v_location_id
         and l.empresa_id = new.empresa_id
         and l.ativo = true
    ) then
      raise exception 'Endereço de estoque não pertence à empresa do movimento.';
    end if;
  end loop;

  v_delta := case lower(new.tipo)
    when 'entrada' then new.quantidade
    when 'compra' then new.quantidade
    when 'saida' then -new.quantidade
    when 'venda' then -new.quantidade
    when 'consumo' then -new.quantidade
    when 'devolucao' then new.quantidade
    else 0
  end;

  if v_delta <> 0 then
    update public.erp_produtos
       set estoque_atual = estoque_atual + v_delta,
           custo_ultimo = case
             when v_delta > 0 and new.custo_unitario > 0 then new.custo_unitario
             else custo_ultimo
           end,
           custo_medio = case
             when v_delta > 0 and new.custo_unitario > 0 then
               ((greatest(estoque_atual, 0) * custo_medio) + (new.quantidade * new.custo_unitario))
               / nullif(greatest(estoque_atual, 0) + new.quantidade, 0)
             else custo_medio
           end
     where id = new.produto_id
       and empresa_id = new.empresa_id;
    if not found then
      raise exception 'Produto não pertence à empresa do movimento.';
    end if;
    if exists (
      select 1
        from public.erp_produtos p
       where p.id = new.produto_id
         and p.empresa_id = new.empresa_id
         and p.estoque_atual < 0
    ) then
      raise exception 'Estoque insuficiente para o movimento.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.erp_confirmar_recebimento_nfe(p_header jsonb, p_items jsonb, p_lotes jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_recebimento uuid;
  v_fornecedor uuid;
  v_item jsonb;
  v_lote jsonb;
  v_produto uuid;
  v_item_id uuid;
  v_qtd numeric;
  v_soma numeric;
  v_unit numeric;
  v_nfe_item integer;
  v_lote_interno text;
  v_chave text := nullif(trim(p_header->>'chave_acesso'), '');
  v_numero text := nullif(trim(p_header->>'numero_nfe'), '');
  v_serie text := nullif(trim(p_header->>'serie'), '');
  v_cnpj text := nullif(regexp_replace(coalesce(p_header->>'cnpj_fornecedor', ''), '[^0-9]', '', 'g'), '');
begin
  if v_empresa is null then
    raise exception 'Empresa do usuário não identificada.' using errcode = '42501';
  end if;
  if not (
    public.erp_has_permission('estoque', 'criar')
    or exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.ativo = true
         and coalesce(u.nivel_admin, 0) >= 100
    )
  ) then
    raise exception 'Usuário sem permissão para receber materiais.' using errcode = '42501';
  end if;
  if v_chave is null or length(v_chave) <> 44 then
    raise exception 'Chave de acesso da NF-e inválida.' using errcode = '22023';
  end if;
  if v_numero is null then
    raise exception 'Número da NF-e é obrigatório.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A NF-e precisa conter itens.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_lotes) is distinct from 'array' or jsonb_array_length(p_lotes) = 0 then
    raise exception 'A NF-e precisa conter lotes.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.erp_recebimento_notas
     where empresa_id = v_empresa
       and chave_acesso = v_chave
  ) then
    raise exception 'Esta NF-e já foi recebida nesta empresa.' using errcode = '23505';
  end if;

  select f.id into v_fornecedor
    from public.erp_fornecedores f
   where f.empresa_id = v_empresa
     and regexp_replace(coalesce(f.documento, ''), '[^0-9]', '', 'g') = v_cnpj
     and coalesce(f.ativo, true) = true
   limit 1;
  if v_cnpj is not null and v_fornecedor is null then
    raise exception 'Fornecedor da NF-e não está cadastrado nesta empresa.' using errcode = '23503';
  end if;

  insert into public.erp_recebimento_notas (
    empresa_id, numero_nfe, serie, chave_acesso, data_emissao, data_recebimento,
    cnpj_fornecedor, fornecedor_id, xml_nome_arquivo, xml_hash, valor_total, status
  )
  values (
    v_empresa, v_numero, v_serie, v_chave,
    nullif(p_header->>'data_emissao', '')::date, now(), v_cnpj, v_fornecedor,
    nullif(p_header->>'xml_nome_arquivo', ''), nullif(p_header->>'xml_hash', ''),
    nullif(p_header->>'valor_total', '')::numeric, 'recebido'
  )
  returning id into v_recebimento;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_nfe_item := nullif(v_item->>'item_nfe', '')::integer;
    v_qtd := nullif(v_item->>'quantidade_total', '')::numeric;
    v_unit := coalesce(nullif(v_item->>'valor_unitario', '')::numeric, 0);
    if v_nfe_item is null or v_qtd is null or v_qtd <= 0 then
      raise exception 'Item da NF-e inválido.' using errcode = '22023';
    end if;

    select p.id into v_produto
      from public.erp_produtos p
     where p.empresa_id = v_empresa
       and p.codigo = trim(v_item->>'codigo_produto')
       and coalesce(p.ativo, true) = true
     limit 1;
    if v_produto is null then
      raise exception 'Produto não cadastrado para o código % (item %).', trim(v_item->>'codigo_produto'), v_nfe_item
        using errcode = '23503';
    end if;

    insert into public.erp_recebimento_itens (
      recebimento_id, empresa_id, item_nfe, produto_id, codigo_produto,
      descricao_produto, unidade, quantidade_total, valor_unitario, valor_total
    )
    values (
      v_recebimento, v_empresa, v_nfe_item, v_produto,
      trim(v_item->>'codigo_produto'), coalesce(v_item->>'descricao_produto', ''),
      coalesce(nullif(v_item->>'unidade', ''), 'UN'), v_qtd, v_unit,
      coalesce(nullif(v_item->>'valor_total', '')::numeric, v_qtd * v_unit)
    )
    returning id into v_item_id;

    select coalesce(sum(nullif(x.value->>'quantidade', '')::numeric), 0)
      into v_soma
      from jsonb_array_elements(p_lotes) x
     where nullif(x.value->>'item_nfe', '')::integer = v_nfe_item;
    if v_soma <= 0 or abs(v_soma - v_qtd) > 0.00001 then
      raise exception 'Quantidade dos lotes do item não confere com a NF-e.' using errcode = '22023';
    end if;

    for v_lote in
      select value
        from jsonb_array_elements(p_lotes)
       where nullif(value->>'item_nfe', '')::integer = v_nfe_item
    loop
      v_lote_interno := nullif(trim(v_lote->>'lote_interno'), '');
      if v_lote_interno is null then
        raise exception 'Lote interno é obrigatório.' using errcode = '22023';
      end if;
      if coalesce(nullif(v_lote->>'quantidade', '')::numeric, 0) <= 0 then
        raise exception 'Quantidade de lote inválida.' using errcode = '22023';
      end if;
      if exists (
        select 1 from public.erp_lotes_materiais lm
         where lm.empresa_id = v_empresa
           and lm.produto_id = v_produto
           and lm.lote = v_lote_interno
           and coalesce(lm.status, 'ativo') <> 'cancelado'
      ) then
        raise exception 'Lote interno já cadastrado para este produto.' using errcode = '23505';
      end if;

      insert into public.erp_recebimento_lotes (
        recebimento_item_id, recebimento_id, empresa_id, produto_id,
        lote_fabricante, lote_interno, data_validade, quantidade
      )
      values (
        v_item_id, v_recebimento, v_empresa, v_produto,
        nullif(trim(v_lote->>'lote_fabricante'), ''), v_lote_interno,
        nullif(v_lote->>'data_validade', '')::date,
        nullif(v_lote->>'quantidade', '')::numeric
      );

      insert into public.erp_lotes_materiais (
        empresa_id, produto_id, fornecedor_id, lote, validade,
        quantidade_recebida, quantidade_disponivel, status
      )
      values (
        v_empresa, v_produto, v_fornecedor, v_lote_interno,
        nullif(v_lote->>'data_validade', '')::date,
        nullif(v_lote->>'quantidade', '')::numeric,
        nullif(v_lote->>'quantidade', '')::numeric,
        'ativo'
      );

      insert into public.erp_rastreabilidade (
        empresa_id, lote_material_id, produto_id, quantidade, evento,
        data_evento, referencia_id, observacoes
      )
      select v_empresa, lm.id, v_produto,
             nullif(v_lote->>'quantidade', '')::numeric,
             'recebimento_nfe', now(), v_recebimento,
             'NF-e ' || v_numero || ' chave ' || v_chave
        from public.erp_lotes_materiais lm
       where lm.empresa_id = v_empresa
         and lm.produto_id = v_produto
         and lm.lote = v_lote_interno
       order by lm.created_at desc
       limit 1;
    end loop;

    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, custo_unitario,
      origem, referencia_id, observacao
    )
    values (
      v_empresa, v_produto, 'entrada', v_qtd, v_unit,
      'recebimento_nfe', v_recebimento,
      'Recebimento NF-e ' || v_numero || ' chave ' || v_chave
    );
  end loop;

  insert into public.erp_audit_logs (
    empresa_id, actor_user_id, action, entity_type, entity_id, new_data
  )
  values (
    v_empresa, auth.uid(), 'recebimento_nfe', 'erp_recebimento_notas',
    v_recebimento,
    p_header || jsonb_build_object('itens', jsonb_array_length(p_items), 'lotes', jsonb_array_length(p_lotes))
  );
  return v_recebimento;
end;
$fn$;

revoke all on function public.erp_confirmar_recebimento_nfe(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.erp_confirmar_recebimento_nfe(jsonb, jsonb, jsonb) to authenticated;
