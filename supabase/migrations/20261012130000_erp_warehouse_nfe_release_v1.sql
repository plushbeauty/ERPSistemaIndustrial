-- Almoxarifado -> liberação rastreável para NF-e.
-- Não efetua baixa física: reserva lotes no encaminhamento e consome somente
-- após confirmação operacional explícita, mantendo separado o rascunho fiscal.
create table if not exists public.erp_liberacoes_nf (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_venda_id uuid not null references public.erp_pedidos_venda(id) on delete restrict,
  documento_fiscal_id uuid references public.erp_documentos_fiscais(id) on delete set null,
  status text not null default 'RASCUNHO'
    check (status in ('RASCUNHO','ENCAMINHADA','DEVOLVIDA','VINCULADA_NFE','CONCLUIDA','CANCELADA')),
  observacao text,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  encaminhado_por uuid references public.erp_usuarios(id) on delete set null,
  encaminhado_em timestamptz,
  vinculado_em timestamptz,
  concluido_por uuid references public.erp_usuarios(id) on delete set null,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_liberacoes_nf_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  liberacao_id uuid not null references public.erp_liberacoes_nf(id) on delete cascade,
  pedido_item_id uuid not null references public.erp_pedidos_venda_itens(id) on delete restrict,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  lote_id uuid not null references public.erp_estoque_lotes(id) on delete restrict,
  quantidade numeric(18,6) not null check (quantidade > 0),
  caixas integer not null default 0 check (caixas >= 0),
  unidades_por_caixa numeric(18,6) not null default 0 check (unidades_por_caixa >= 0),
  peso_liquido numeric(18,6) not null default 0 check (peso_liquido >= 0),
  peso_bruto numeric(18,6) not null default 0 check (peso_bruto >= 0),
  localizacao text,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_liberacoes_nf_queue
  on public.erp_liberacoes_nf(empresa_id,status,updated_at desc);
create index if not exists idx_erp_liberacoes_nf_order
  on public.erp_liberacoes_nf(empresa_id,pedido_venda_id);
create index if not exists idx_erp_liberacoes_nf_items_release
  on public.erp_liberacoes_nf_itens(empresa_id,liberacao_id);
create index if not exists idx_erp_liberacoes_nf_items_order_item
  on public.erp_liberacoes_nf_itens(empresa_id,pedido_item_id);

alter table public.erp_liberacoes_nf enable row level security;
alter table public.erp_liberacoes_nf_itens enable row level security;
revoke all on public.erp_liberacoes_nf from anon, authenticated;
revoke all on public.erp_liberacoes_nf_itens from anon, authenticated;
grant select on public.erp_liberacoes_nf to authenticated;
grant select on public.erp_liberacoes_nf_itens to authenticated;

drop policy if exists erp_liberacoes_nf_select_tenant on public.erp_liberacoes_nf;
create policy erp_liberacoes_nf_select_tenant on public.erp_liberacoes_nf
for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (
    public.erp_is_master()
    or public.erp_has_permission('estoque','ver')
    or public.erp_has_permission('fiscal','ver')
    or public.erp_has_permission('fiscal','emitir')
  )
);

drop policy if exists erp_liberacoes_nf_items_select_tenant on public.erp_liberacoes_nf_itens;
create policy erp_liberacoes_nf_items_select_tenant on public.erp_liberacoes_nf_itens
for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and exists (
    select 1 from public.erp_liberacoes_nf h
    where h.id = erp_liberacoes_nf_itens.liberacao_id and h.empresa_id = erp_liberacoes_nf_itens.empresa_id
  )
  and (
    public.erp_is_master()
    or public.erp_has_permission('estoque','ver')
    or public.erp_has_permission('fiscal','ver')
    or public.erp_has_permission('fiscal','emitir')
  )
);

create or replace function public.erp_salvar_liberacao_nf(
  p_liberacao_id uuid,
  p_pedido_venda_id uuid,
  p_observacao text,
  p_itens jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_id uuid;
  v_item jsonb;
  v_status text;
  v_pedido_item uuid;
  v_produto uuid;
  v_lote uuid;
  v_qtd numeric;
  v_caixas integer;
  v_unidades numeric;
  v_peso_liquido numeric;
  v_peso_bruto numeric;
  v_localizacao text;
  v_observacao_item text;
  v_order_item public.erp_pedidos_venda_itens%rowtype;
  v_lot public.erp_estoque_lotes%rowtype;
  v_requested numeric;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode='42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque','criar') or public.erp_has_permission('estoque','editar')) then
    raise exception 'Sem permissão para registrar liberação de NF-e no Almoxarifado.' using errcode='42501';
  end if;
  if p_pedido_venda_id is null then raise exception 'Selecione o pedido de venda.' using errcode='22023'; end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens)=0 then
    raise exception 'Inclua ao menos um item separado.' using errcode='22023';
  end if;
  if not exists(select 1 from public.erp_pedidos_venda p where p.id=p_pedido_venda_id and p.empresa_id=v_empresa and lower(coalesce(p.status,'')) not like '%cancel%') then
    raise exception 'Pedido não localizado na empresa ativa ou cancelado.' using errcode='42501';
  end if;

  select u.id into v_user from public.erp_usuarios u
   where u.auth_user_id=auth.uid() and (u.empresa_id=v_empresa or public.erp_is_master()) and u.ativo=true and u.deleted_at is null limit 1;
  if v_user is null and not public.erp_is_master() then
    raise exception 'Perfil ERP ativo não localizado para auditoria.' using errcode='42501';
  end if;

  if p_liberacao_id is null then
    insert into public.erp_liberacoes_nf(empresa_id,pedido_venda_id,status,observacao,criado_por)
    values(v_empresa,p_pedido_venda_id,'RASCUNHO',nullif(btrim(p_observacao),''),v_user)
    returning id into v_id;
  else
    select id,status into v_id,v_status from public.erp_liberacoes_nf
      where id=p_liberacao_id and empresa_id=v_empresa and pedido_venda_id=p_pedido_venda_id for update;
    if v_id is null then raise exception 'Liberação não encontrada para a empresa ativa.' using errcode='42501'; end if;
    if v_status not in ('RASCUNHO','DEVOLVIDA') then
      raise exception 'Somente liberações em rascunho ou devolvidas podem ser editadas.' using errcode='55000';
    end if;
    update public.erp_liberacoes_nf set observacao=nullif(btrim(p_observacao),''),status='RASCUNHO',updated_at=now()
      where id=v_id and empresa_id=v_empresa;
    delete from public.erp_liberacoes_nf_itens where liberacao_id=v_id and empresa_id=v_empresa;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_pedido_item := nullif(v_item->>'pedido_item_id','')::uuid;
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_lote := nullif(v_item->>'lote_id','')::uuid;
    v_qtd := nullif(v_item->>'quantidade','')::numeric;
    v_caixas := coalesce(nullif(v_item->>'caixas','')::integer,0);
    v_unidades := coalesce(nullif(v_item->>'unidades_por_caixa','')::numeric,0);
    v_peso_liquido := coalesce(nullif(v_item->>'peso_liquido','')::numeric,0);
    v_peso_bruto := coalesce(nullif(v_item->>'peso_bruto','')::numeric,0);
    v_localizacao := nullif(btrim(v_item->>'localizacao'),'');
    v_observacao_item := nullif(btrim(v_item->>'observacao'),'');

    if v_pedido_item is null or v_produto is null or v_lote is null or v_qtd is null or v_qtd<=0
      or v_qtd::text in ('NaN','Infinity','-Infinity') or v_caixas<0 or v_unidades<0 or v_peso_liquido<0 or v_peso_bruto<0
      or (v_caixas>0 and v_unidades>0 and v_qtd > v_caixas*v_unidades) then
      raise exception 'Item, lote, quantidade, caixas ou pesos inválidos.' using errcode='22023';
    end if;
    select * into v_order_item from public.erp_pedidos_venda_itens i
      where i.id=v_pedido_item and i.pedido_id=p_pedido_venda_id and i.empresa_id=v_empresa and i.produto_id=v_produto;
    if not found then raise exception 'Item não pertence ao pedido selecionado.' using errcode='42501'; end if;

    select * into v_lot from public.erp_estoque_lotes l
      where l.id=v_lote and l.empresa_id=v_empresa and l.produto_id=v_produto for update;
    if not found then raise exception 'Lote não pertence ao produto/empresa selecionados.' using errcode='42501'; end if;
    if upper(coalesce(v_lot.status_inspecao,'')) not in ('APROVADO','LIBERADO') then
      raise exception 'Lote % bloqueado ou sem aprovação de Qualidade.', v_lot.lote_interno using errcode='55000';
    end if;
    select coalesce(sum((x->>'quantidade')::numeric),0) into v_requested
      from jsonb_array_elements(p_itens) x where nullif(x->>'lote_id','')::uuid=v_lote;
    if v_requested > greatest(coalesce(v_lot.quantidade_disponivel,0)-coalesce(v_lot.quantidade_reservada,0),0) then
      raise exception 'Saldo disponível insuficiente para o lote %.', v_lot.lote_interno using errcode='55000';
    end if;

    insert into public.erp_liberacoes_nf_itens(
      empresa_id,liberacao_id,pedido_item_id,produto_id,lote_id,quantidade,caixas,unidades_por_caixa,
      peso_liquido,peso_bruto,localizacao,observacao
    ) values (
      v_empresa,v_id,v_pedido_item,v_produto,v_lote,v_qtd,v_caixas,v_unidades,v_peso_liquido,v_peso_bruto,v_localizacao,v_observacao_item
    );
  end loop;

  update public.erp_liberacoes_nf set updated_at=now() where id=v_id and empresa_id=v_empresa;
  return v_id;
end;
$$;

create or replace function public.erp_encaminhar_liberacao_nf(p_liberacao_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_header public.erp_liberacoes_nf%rowtype;
  v_item record;
  v_lot public.erp_estoque_lotes%rowtype;
  v_requested numeric;
  v_prior numeric;
  v_order_qty numeric;
  v_released numeric;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada.' using errcode='42501'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque','movimentar') or public.erp_has_permission('estoque','editar')) then
    raise exception 'Sem permissão para encaminhar a liberação.' using errcode='42501';
  end if;
  select * into v_header from public.erp_liberacoes_nf
   where id=p_liberacao_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Liberação não encontrada.' using errcode='42501'; end if;
  if v_header.status not in ('RASCUNHO','DEVOLVIDA') then raise exception 'Esta liberação já foi encaminhada ou finalizada.' using errcode='55000'; end if;
  if not exists(select 1 from public.erp_liberacoes_nf_itens i where i.liberacao_id=v_header.id and i.empresa_id=v_empresa) then
    raise exception 'A liberação precisa conter itens.' using errcode='22023';
  end if;

  for v_item in
    select i.lote_id, sum(i.quantidade) as quantidade
      from public.erp_liberacoes_nf_itens i
     where i.liberacao_id=v_header.id and i.empresa_id=v_empresa
     group by i.lote_id
     order by i.lote_id
  loop
    select * into v_lot from public.erp_estoque_lotes l where l.id=v_item.lote_id and l.empresa_id=v_empresa for update;
    if not found or upper(coalesce(v_lot.status_inspecao,'')) not in ('APROVADO','LIBERADO') then
      raise exception 'Lote ausente ou bloqueado pela Qualidade.' using errcode='55000';
    end if;
    if v_item.quantidade > greatest(coalesce(v_lot.quantidade_disponivel,0)-coalesce(v_lot.quantidade_reservada,0),0) then
      raise exception 'Saldo insuficiente para encaminhar o lote %.', v_lot.lote_interno using errcode='55000';
    end if;
  end loop;

  for v_item in
    select i.pedido_item_id, sum(i.quantidade) as quantidade
      from public.erp_liberacoes_nf_itens i
     where i.liberacao_id=v_header.id and i.empresa_id=v_empresa
     group by i.pedido_item_id
  loop
    select i.quantidade into v_order_qty from public.erp_pedidos_venda_itens i
     where i.id=v_item.pedido_item_id and i.pedido_id=v_header.pedido_venda_id and i.empresa_id=v_empresa for update;
    if not found then raise exception 'Item de pedido não localizado.' using errcode='42501'; end if;
    select coalesce(sum(li.quantidade),0) into v_prior
      from public.erp_liberacoes_nf_itens li
      join public.erp_liberacoes_nf lh on lh.id=li.liberacao_id and lh.empresa_id=li.empresa_id
     where li.empresa_id=v_empresa and li.pedido_item_id=v_item.pedido_item_id
       and lh.id<>v_header.id and lh.status in ('ENCAMINHADA','VINCULADA_NFE','CONCLUIDA');
    v_released := coalesce(v_item.quantidade,0)+v_prior;
    if v_released > coalesce(v_order_qty,0) then raise exception 'Quantidade encaminhada ultrapassa o saldo do item do pedido.' using errcode='55000'; end if;
  end loop;

  for v_item in
    select i.lote_id, sum(i.quantidade) as quantidade
      from public.erp_liberacoes_nf_itens i
     where i.liberacao_id=v_header.id and i.empresa_id=v_empresa
     group by i.lote_id
  loop
    update public.erp_estoque_lotes
       set quantidade_reservada=coalesce(quantidade_reservada,0)+v_item.quantidade
     where id=v_item.lote_id and empresa_id=v_empresa;
  end loop;

  select u.id into v_user from public.erp_usuarios u
   where u.auth_user_id=auth.uid() and (u.empresa_id=v_empresa or public.erp_is_master()) and u.ativo=true and u.deleted_at is null limit 1;
  update public.erp_liberacoes_nf set status='ENCAMINHADA',encaminhado_por=v_user,encaminhado_em=now(),updated_at=now()
   where id=v_header.id and empresa_id=v_empresa;
  return true;
end;
$$;

create or replace function public.erp_vincular_liberacao_nfe(p_liberacao_id uuid,p_documento_fiscal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_header public.erp_liberacoes_nf%rowtype;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada.' using errcode='42501'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','emitir')) then
    raise exception 'Sem permissão fiscal para vincular a liberação.' using errcode='42501';
  end if;
  select * into v_header from public.erp_liberacoes_nf where id=p_liberacao_id and empresa_id=v_empresa for update;
  if not found or v_header.status not in ('ENCAMINHADA','VINCULADA_NFE') then raise exception 'Liberação não está pronta para vinculação fiscal.' using errcode='55000'; end if;
  if not exists(select 1 from public.erp_documentos_fiscais d where d.id=p_documento_fiscal_id and d.empresa_id=v_empresa and d.modelo='55') then
    raise exception 'Rascunho NF-e não encontrado na empresa ativa.' using errcode='42501';
  end if;
  update public.erp_liberacoes_nf set documento_fiscal_id=p_documento_fiscal_id,status='VINCULADA_NFE',vinculado_em=now(),updated_at=now()
   where id=v_header.id and empresa_id=v_empresa;
  return true;
end;
$$;

create or replace function public.erp_concluir_liberacao_nf(p_liberacao_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_header public.erp_liberacoes_nf%rowtype;
  v_item record;
  v_lot public.erp_estoque_lotes%rowtype;
  v_user uuid;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada.' using errcode='42501'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','emitir') or public.erp_has_permission('estoque','movimentar')) then
    raise exception 'Sem permissão para concluir a liberação fiscal.' using errcode='42501';
  end if;
  select * into v_header from public.erp_liberacoes_nf where id=p_liberacao_id and empresa_id=v_empresa for update;
  if not found or v_header.status<>'VINCULADA_NFE' or v_header.documento_fiscal_id is null then
    raise exception 'Somente uma liberação vinculada à NF-e pode ser concluída.' using errcode='55000';
  end if;
  if not exists(select 1 from public.erp_documentos_fiscais d where d.id=v_header.documento_fiscal_id and d.empresa_id=v_empresa and lower(coalesce(d.status,'')) in ('autorizada','autorizado')) then
    raise exception 'A baixa física exige NF-e com status autorizado persistido.' using errcode='55000';
  end if;
  for v_item in
    select i.produto_id,i.lote_id,sum(i.quantidade) as quantidade
      from public.erp_liberacoes_nf_itens i
     where i.liberacao_id=v_header.id and i.empresa_id=v_empresa
     group by i.produto_id,i.lote_id
     order by i.lote_id
  loop
    select * into v_lot from public.erp_estoque_lotes l where l.id=v_item.lote_id and l.empresa_id=v_empresa for update;
    if not found or coalesce(v_lot.quantidade_reservada,0)<v_item.quantidade or coalesce(v_lot.quantidade_disponivel,0)<v_item.quantidade then
      raise exception 'Saldo reservado/físico do lote não cobre a quantidade a faturar.' using errcode='55000';
    end if;
    update public.erp_estoque_lotes set
      quantidade_disponivel=quantidade_disponivel-v_item.quantidade,
      quantidade_reservada=quantidade_reservada-v_item.quantidade
    where id=v_item.lote_id and empresa_id=v_empresa;
    update public.erp_produtos set estoque_atual=greatest(coalesce(estoque_atual,0)-v_item.quantidade,0),updated_at=now()
     where id=v_item.produto_id and empresa_id=v_empresa and ativo=true;
    if not found then raise exception 'Produto não localizado para efetivar a baixa física.'; end if;
    update public.erp_produto_estoque set saldo_fisico=greatest(coalesce(saldo_fisico,0)-v_item.quantidade,0),updated_at=now()
     where produto_id=v_item.produto_id and empresa_id=v_empresa;
    insert into public.erp_estoque_movimentos(
      empresa_id,produto_id,tipo,quantidade,origem,documento,observacao
    ) values (
      v_empresa,v_item.produto_id,'saida',v_item.quantidade,'LIBERACAO_NF',
      v_header.documento_fiscal_id::text,
      'Baixa após NF-e autorizada; liberação '||v_header.id::text||'; lote '||v_item.lote_id::text
    );
  end loop;
  select u.id into v_user from public.erp_usuarios u where u.auth_user_id=auth.uid() and (u.empresa_id=v_empresa or public.erp_is_master()) and u.ativo=true and u.deleted_at is null limit 1;
  update public.erp_liberacoes_nf set status='CONCLUIDA',concluido_por=v_user,concluido_em=now(),updated_at=now()
   where id=v_header.id and empresa_id=v_empresa;
  insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados)
  values(v_empresa,v_user,'Almoxarifado','LIBERACAO_NF_CONCLUIDA','erp_liberacoes_nf',v_header.id,
    jsonb_build_object('documento_fiscal_id',v_header.documento_fiscal_id,'baixa_estoque',true));
  return true;
end;
$$;

revoke all on function public.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) from public, anon;
revoke all on function public.erp_encaminhar_liberacao_nf(uuid) from public, anon;
revoke all on function public.erp_vincular_liberacao_nfe(uuid,uuid) from public, anon;
revoke all on function public.erp_concluir_liberacao_nf(uuid) from public, anon;
grant execute on function public.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.erp_encaminhar_liberacao_nf(uuid) to authenticated;
grant execute on function public.erp_vincular_liberacao_nfe(uuid,uuid) to authenticated;
grant execute on function public.erp_concluir_liberacao_nf(uuid) to authenticated;
