-- SYSNQRA ERP INDUSTRIAL
-- Custo real por OP: consumo confirmado + apontamentos de mão de obra/overhead.
-- A migration cria o ledger de consumo e o fechamento por OP. Não executar remotamente nesta entrega.

begin;

-- 1) Snapshot de custo e auditoria do consumo no registro de separação.
alter table public.erp_estoque_separacoes
  add column if not exists custo_unitario_snapshot numeric(18,6),
  add column if not exists custo_total_snapshot numeric(18,6),
  add column if not exists custo_fonte text,
  add column if not exists consumo_confirmado_em timestamptz,
  add column if not exists consumo_confirmado_por uuid;

alter table public.erp_custos_apontamentos
  add column if not exists criado_por uuid;

create index if not exists idx_erp_estoque_separacoes_consumo_op
  on public.erp_estoque_separacoes (empresa_id, ordem_producao_id, status, consumo_confirmado_em);

create index if not exists idx_erp_custos_apontamentos_op_tipo
  on public.erp_custos_apontamentos (empresa_id, ordem_producao_id, tipo, ocorrido_em);

-- 2) Fechamento consolidado do custo real por ordem de produção.
create table if not exists public.erp_financeiro_custo_op (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ordem_producao_id uuid not null,
  produto_id uuid not null,
  quantidade_produzida numeric(18,6) not null default 0,
  material_total numeric(18,6) not null default 0,
  mao_obra_total numeric(18,6) not null default 0,
  overhead_total numeric(18,6) not null default 0,
  custo_total numeric(18,6) not null default 0,
  preco_venda_total numeric(18,6) null,
  margem numeric(18,6) null,
  material_lancamentos integer not null default 0,
  mao_obra_lancamentos integer not null default 0,
  overhead_lancamentos integer not null default 0,
  status text not null default 'PENDENTE_DADOS'
    check (status in ('PENDENTE_DADOS', 'APURADO', 'FECHADO')),
  apurado_por uuid null,
  apurado_em timestamptz null,
  fechado_por uuid null,
  fechado_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_financeiro_custo_op_empresa_ordem_uq
    unique (empresa_id, ordem_producao_id),
  constraint erp_financeiro_custo_op_empresa_id_uq
    unique (empresa_id, id),
  constraint erp_financeiro_custo_op_ordem_fk
    foreign key (empresa_id, ordem_producao_id)
    references public.erp_ordens_producao (empresa_id, id)
    on delete restrict,
  constraint erp_financeiro_custo_op_produto_fk
    foreign key (empresa_id, produto_id)
    references public.erp_produtos (empresa_id, id)
    on delete restrict
);

create index if not exists idx_erp_financeiro_custo_op_empresa_status
  on public.erp_financeiro_custo_op (empresa_id, status, updated_at desc);

alter table public.erp_financeiro_custo_op enable row level security;
drop policy if exists erp_financeiro_custo_op_select_tenant on public.erp_financeiro_custo_op;
create policy erp_financeiro_custo_op_select_tenant
  on public.erp_financeiro_custo_op
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

grant select on public.erp_financeiro_custo_op to authenticated;
revoke insert, update, delete on public.erp_financeiro_custo_op from public, anon, authenticated;

-- 3) Apontamentos de custo: leitura por tenant; escrita somente por administrador da empresa.
drop policy if exists erp_custos_apontamentos_tenant on public.erp_custos_apontamentos;
drop policy if exists erp_custos_apontamentos_select_tenant on public.erp_custos_apontamentos;
drop policy if exists erp_custos_apontamentos_insert_admin on public.erp_custos_apontamentos;
drop policy if exists erp_custos_apontamentos_update_admin on public.erp_custos_apontamentos;
drop policy if exists erp_custos_apontamentos_delete_admin on public.erp_custos_apontamentos;

create policy erp_custos_apontamentos_select_tenant
  on public.erp_custos_apontamentos
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

create policy erp_custos_apontamentos_insert_admin
  on public.erp_custos_apontamentos
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and criado_por = public.erp_current_user_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

create policy erp_custos_apontamentos_update_admin
  on public.erp_custos_apontamentos
  for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  )
  with check (empresa_id = public.erp_current_empresa_id());

create policy erp_custos_apontamentos_delete_admin
  on public.erp_custos_apontamentos
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

grant select, insert, update, delete on public.erp_custos_apontamentos to authenticated;

-- 4) Impedir alteração de apontamentos após fechamento definitivo da OP.
create or replace function public.erp_custo_op_proteger_apontamento_fechado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_ordem uuid;
begin
  if tg_op = 'DELETE' then
    v_empresa := old.empresa_id;
    v_ordem := old.ordem_producao_id;
    if v_ordem is not null and exists (
      select 1 from public.erp_financeiro_custo_op c
       where c.empresa_id = v_empresa and c.ordem_producao_id = v_ordem and c.status = 'FECHADO'
    ) then
      raise exception 'CUSTO_OP_FECHADO_NAO_PERMITE_ALTERAR_APONTAMENTOS';
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if exists (
      select 1 from public.erp_financeiro_custo_op c
       where c.empresa_id = old.empresa_id and c.ordem_producao_id = old.ordem_producao_id and c.status = 'FECHADO'
    ) or exists (
      select 1 from public.erp_financeiro_custo_op c
       where c.empresa_id = new.empresa_id and c.ordem_producao_id = new.ordem_producao_id and c.status = 'FECHADO'
    ) then
      raise exception 'CUSTO_OP_FECHADO_NAO_PERMITE_ALTERAR_APONTAMENTOS';
    end if;
  else
    v_empresa := new.empresa_id;
    v_ordem := new.ordem_producao_id;
    if v_ordem is not null and exists (
      select 1 from public.erp_financeiro_custo_op c
       where c.empresa_id = v_empresa and c.ordem_producao_id = v_ordem and c.status = 'FECHADO'
    ) then
      raise exception 'CUSTO_OP_FECHADO_NAO_PERMITE_ALTERAR_APONTAMENTOS';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_custo_op_proteger_apontamento_fechado
  on public.erp_custos_apontamentos;
create trigger trg_erp_custo_op_proteger_apontamento_fechado
before insert or update or delete on public.erp_custos_apontamentos
for each row execute function public.erp_custo_op_proteger_apontamento_fechado();

-- 5) Confirmar consumo real de uma separação. A baixa e o snapshot de custo são atômicos.
create or replace function public.erp_confirmar_consumo_op(p_separacao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid := public.erp_current_user_id();
  v_sep public.erp_estoque_separacoes%rowtype;
  v_lote public.erp_estoque_lotes%rowtype;
  v_custo_medio numeric(18,6);
  v_custo_total numeric(18,6);
  v_estoque numeric(18,6);
begin
  if v_empresa is null or v_usuario is null then
    raise exception 'SESSAO_EMPRESA_NAO_IDENTIFICADA';
  end if;
  if not public.erp_has_permission('estoque.movimentar') then
    raise exception 'USUARIO_SEM_PERMISSAO_ESTOQUE_MOVIMENTAR';
  end if;

  select s.* into v_sep
    from public.erp_estoque_separacoes s
   where s.id = p_separacao_id
     and s.empresa_id = v_empresa
   for update;
  if not found then raise exception 'SEPARACAO_NAO_ENCONTRADA_NA_EMPRESA'; end if;

  if v_sep.status = 'CONSUMIDO' then
    return jsonb_build_object(
      'separacao', to_jsonb(v_sep),
      'custo_unitario', v_sep.custo_unitario_snapshot,
      'custo_total', v_sep.custo_total_snapshot,
      'ja_confirmado', true
    );
  end if;
  if v_sep.status <> 'SEPARADO' then
    raise exception 'SOMENTE_SEPARACAO_COM_STATUS_SEPARADO_PODE_SER_CONSUMIDA';
  end if;

  if exists (
    select 1 from public.erp_financeiro_custo_op c
     where c.empresa_id = v_empresa
       and c.ordem_producao_id = v_sep.ordem_producao_id
       and c.status = 'FECHADO'
  ) then
    raise exception 'CUSTO_OP_FECHADO_NAO_PERMITE_NOVO_CONSUMO';
  end if;

  select p.custo_medio, p.estoque_atual
    into v_custo_medio, v_estoque
    from public.erp_produtos p
   where p.id = v_sep.produto_id
     and p.empresa_id = v_empresa
   for update;
  if not found then raise exception 'PRODUTO_DA_SEPARACAO_NAO_PERTENCE_A_EMPRESA'; end if;
  if coalesce(v_custo_medio, 0) <= 0 then
    raise exception 'CUSTO_MEDIO_DO_PRODUTO_NAO_CADASTRADO; CONSUMO_NAO_BAIXADO';
  end if;
  if coalesce(v_estoque, 0) < v_sep.quantidade then
    raise exception 'SALDO_DO_PRODUTO_INSUFICIENTE_PARA_CONFIRMAR_CONSUMO';
  end if;

  if v_sep.lote_id is not null then
    select l.* into v_lote
      from public.erp_estoque_lotes l
     where l.id = v_sep.lote_id
       and l.empresa_id = v_empresa
     for update;
    if not found then raise exception 'LOTE_DA_SEPARACAO_NAO_PERTENCE_A_EMPRESA'; end if;
    if v_lote.produto_id <> v_sep.produto_id then
      raise exception 'LOTE_DA_SEPARACAO_PERTENCE_A_OUTRO_PRODUTO';
    end if;
    if coalesce(v_lote.status_inspecao, 'AGUARDANDO') <> 'APROVADO' then
      raise exception 'LOTE_SEM_LIBERACAO_DA_QUALIDADE';
    end if;
    if upper(trim(coalesce(v_lote.localizacao, ''))) = 'QUARENTENA' then
      raise exception 'LOTE_AINDA_EM_QUARENTENA_FISICA';
    end if;
    if coalesce(v_lote.quantidade_disponivel, 0) < v_sep.quantidade then
      raise exception 'SALDO_DO_LOTE_INSUFICIENTE_PARA_CONFIRMAR_CONSUMO';
    end if;

    update public.erp_estoque_lotes
       set quantidade_disponivel = quantidade_disponivel - v_sep.quantidade
     where id = v_sep.lote_id and empresa_id = v_empresa;
  end if;

  update public.erp_produtos
     set estoque_atual = estoque_atual - v_sep.quantidade,
         updated_at = now()
   where id = v_sep.produto_id
     and empresa_id = v_empresa
     and estoque_atual >= v_sep.quantidade;

  if not found then
    raise exception 'SALDO_AGREGADO_DO_PRODUTO_INSUFICIENTE; CONSUMO_NAO_CONFIRMADO';
  end if;

  v_custo_total := round(v_sep.quantidade * v_custo_medio, 6);

  update public.erp_estoque_separacoes
     set status = 'CONSUMIDO',
         custo_unitario_snapshot = v_custo_medio,
         custo_total_snapshot = v_custo_total,
         custo_fonte = 'CUSTO_MEDIO_PRODUTO',
         consumo_confirmado_em = now(),
         consumo_confirmado_por = v_usuario
   where id = p_separacao_id
     and empresa_id = v_empresa
   returning * into v_sep;

  return jsonb_build_object(
    'separacao', to_jsonb(v_sep),
    'custo_unitario', v_custo_medio,
    'custo_total', v_custo_total,
    'ja_confirmado', false
  );
end;
$$;

-- 6) Apurar custos reais por OP a partir de consumo confirmado e apontamentos de tempo/overhead.
create or replace function public.erp_apurar_custo_op(p_ordem_producao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_nivel_admin integer;
  v_op public.erp_ordens_producao%rowtype;
  v_custo public.erp_financeiro_custo_op%rowtype;
  v_material numeric(18,6) := 0;
  v_mao_obra numeric(18,6) := 0;
  v_overhead numeric(18,6) := 0;
  v_preco_venda numeric(18,6);
  v_margem numeric(18,6);
  v_qtd_produzida numeric(18,6) := 0;
  v_material_count integer := 0;
  v_mao_obra_count integer := 0;
  v_overhead_count integer := 0;
  v_status text;
  v_custo_total numeric(18,6);
begin
  if v_empresa is null then raise exception 'EMPRESA_NAO_IDENTIFICADA'; end if;

  select u.id, u.nivel_admin into v_usuario, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true and u.deleted_at is null
   limit 1;
  if not found or coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_APURAR_CUSTO_OP';
  end if;

  select o.* into v_op
    from public.erp_ordens_producao o
   where o.id = p_ordem_producao_id
     and o.empresa_id = v_empresa
   for update;
  if not found then raise exception 'OP_NAO_PERTENCE_A_EMPRESA_ATUAL'; end if;
  if upper(coalesce(v_op.status, '')) in ('CANCELADA', 'CANCELADO') then
    raise exception 'OP_CANCELADA_NAO_PODE_TER_CUSTO_FECHADO';
  end if;

  select c.* into v_custo
    from public.erp_financeiro_custo_op c
   where c.empresa_id = v_empresa
     and c.ordem_producao_id = p_ordem_producao_id
   for update;
  if found and v_custo.status = 'FECHADO' then
    raise exception 'CUSTO_OP_JA_FECHADO';
  end if;

  select coalesce(sum(s.custo_total_snapshot), 0), count(*)
    into v_material, v_material_count
    from public.erp_estoque_separacoes s
   where s.empresa_id = v_empresa
     and s.ordem_producao_id = p_ordem_producao_id
     and s.status = 'CONSUMIDO';

  if exists (
    select 1 from public.erp_estoque_separacoes s
     where s.empresa_id = v_empresa
       and s.ordem_producao_id = p_ordem_producao_id
       and s.status = 'CONSUMIDO'
       and (s.custo_total_snapshot is null or s.custo_unitario_snapshot is null)
  ) then
    raise exception 'CONSUMO_SEM_SNAPSHOT_DE_CUSTO; REVISAR_SEPARACOES';
  end if;

  select
    coalesce(sum(case when coalesce(a.valor, 0) > 0 then a.valor else a.horas * a.custo_hora end)
      filter (where a.tipo = 'MAO_OBRA'), 0),
    count(*) filter (where a.tipo = 'MAO_OBRA'),
    coalesce(sum(case when coalesce(a.valor, 0) > 0 then a.valor else a.horas * a.custo_hora end)
      filter (where a.tipo <> 'MAO_OBRA'), 0),
    count(*) filter (where a.tipo <> 'MAO_OBRA')
    into v_mao_obra, v_mao_obra_count, v_overhead, v_overhead_count
    from public.erp_custos_apontamentos a
   where a.empresa_id = v_empresa
     and a.ordem_producao_id = p_ordem_producao_id;

  v_qtd_produzida := coalesce(v_op.quantidade_produzida, 0);

  if v_op.pedido_item_id is not null then
    select round(i.valor_unitario * v_qtd_produzida, 6)
      into v_preco_venda
      from public.erp_pedidos_venda_itens i
     where i.id = v_op.pedido_item_id
       and i.empresa_id = v_empresa;
  else
    v_preco_venda := null;
  end if;

  v_custo_total := v_material + v_mao_obra + v_overhead;
  v_margem := case when v_preco_venda is null then null else v_preco_venda - v_custo_total end;
  v_status := case
    when v_material_count = 0 or v_mao_obra_count = 0 or v_overhead_count = 0 or v_qtd_produzida <= 0
      then 'PENDENTE_DADOS'
    else 'APURADO'
  end;

  insert into public.erp_financeiro_custo_op (
    empresa_id, ordem_producao_id, produto_id, quantidade_produzida,
    material_total, mao_obra_total, overhead_total, custo_total,
    preco_venda_total, margem, material_lancamentos, mao_obra_lancamentos,
    overhead_lancamentos, status, apurado_por, apurado_em, updated_at
  ) values (
    v_empresa, p_ordem_producao_id, v_op.produto_id, v_qtd_produzida,
    v_material, v_mao_obra, v_overhead, v_custo_total,
    v_preco_venda, v_margem, v_material_count, v_mao_obra_count,
    v_overhead_count, v_status, v_usuario, now(), now()
  )
  on conflict (empresa_id, ordem_producao_id) do update
    set produto_id = excluded.produto_id,
        quantidade_produzida = excluded.quantidade_produzida,
        material_total = excluded.material_total,
        mao_obra_total = excluded.mao_obra_total,
        overhead_total = excluded.overhead_total,
        custo_total = excluded.custo_total,
        preco_venda_total = excluded.preco_venda_total,
        margem = excluded.margem,
        material_lancamentos = excluded.material_lancamentos,
        mao_obra_lancamentos = excluded.mao_obra_lancamentos,
        overhead_lancamentos = excluded.overhead_lancamentos,
        status = excluded.status,
        apurado_por = excluded.apurado_por,
        apurado_em = excluded.apurado_em,
        updated_at = now()
  returning * into v_custo;

  return jsonb_build_object(
    'custo', to_jsonb(v_custo),
    'completo', v_status = 'APURADO',
    'pendencias', (
      select coalesce(jsonb_agg(pendencia), '[]'::jsonb)
        from (values
          (case when v_material_count = 0 then 'SEM_CONSUMO_CONFIRMADO' end),
          (case when v_mao_obra_count = 0 then 'SEM_APONTAMENTO_DE_MAO_DE_OBRA' end),
          (case when v_overhead_count = 0 then 'SEM_APONTAMENTO_DE_OVERHEAD' end),
          (case when v_qtd_produzida <= 0 then 'SEM_QUANTIDADE_PRODUZIDA' end),
          (case when v_preco_venda is null then 'SEM_PRECO_DE_VENDA_VINCULADO_AO_ITEM_DO_PEDIDO' end)
        ) as pendencias(pendencia)
       where pendencia is not null
    )
  );
end;
$$;

-- 7) Fechamento definitivo; depois dele novos consumos e apontamentos ficam bloqueados.
create or replace function public.erp_fechar_custo_op(p_ordem_producao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_nivel_admin integer;
  v_custo public.erp_financeiro_custo_op%rowtype;
begin
  select u.id, u.nivel_admin into v_usuario, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true and u.deleted_at is null
   limit 1;
  if v_empresa is null or v_usuario is null or coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_FECHAR_CUSTO_OP';
  end if;

  select c.* into v_custo
    from public.erp_financeiro_custo_op c
   where c.empresa_id = v_empresa
     and c.ordem_producao_id = p_ordem_producao_id
   for update;
  if not found then raise exception 'CUSTO_OP_AINDA_NAO_APURADO'; end if;
  if v_custo.status <> 'APURADO' then
    raise exception 'CUSTO_OP_INCOMPLETO_NAO_PODE_SER_FECHADO';
  end if;

  update public.erp_financeiro_custo_op
     set status = 'FECHADO',
         fechado_por = v_usuario,
         fechado_em = now(),
         updated_at = now()
   where id = v_custo.id
     and empresa_id = v_empresa
   returning * into v_custo;

  return jsonb_build_object('custo', to_jsonb(v_custo), 'fechado', true);
end;
$$;

revoke all on function public.erp_confirmar_consumo_op(uuid) from public, anon;
revoke all on function public.erp_apurar_custo_op(uuid) from public, anon;
revoke all on function public.erp_fechar_custo_op(uuid) from public, anon;
grant execute on function public.erp_confirmar_consumo_op(uuid) to authenticated;
grant execute on function public.erp_apurar_custo_op(uuid) to authenticated;
grant execute on function public.erp_fechar_custo_op(uuid) to authenticated;

commit;
