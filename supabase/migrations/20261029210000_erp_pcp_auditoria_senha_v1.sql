-- SYNQRA ERP INDUSTRIAL — PCP, auditoria contextual e política global de senha
-- Revisão: 2026-10-29 | Aditiva; não altera telas aprovadas nem tabelas operacionais existentes.
begin;

create table if not exists public.erp_synqra_discuss_message (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  res_model text not null check (res_model in ('erp_ordens_producao','erp_estoque_lotes_rastreabilidade','erp_recebimento_notas','erp_pcp_bom_itens')),
  res_id uuid not null,
  autor_auth_id uuid not null references auth.users(id) on delete restrict,
  corpo text not null check (length(btrim(corpo)) between 1 and 10000),
  tipo_mensagem text not null default 'Comentario' check (tipo_mensagem in ('Comentario','Notificacao_Sistema')),
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_synqra_discuss_documento
  on public.erp_synqra_discuss_message (empresa_id, res_model, res_id, created_at);

create table if not exists public.erp_synqra_rating (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  res_model text not null check (res_model in ('erp_ordens_producao','erp_estoque_lotes_rastreabilidade','erp_recebimento_notas','erp_pcp_bom_itens')),
  res_id uuid not null,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or length(comentario) <= 5000),
  operador_auth_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_synqra_rating_documento
  on public.erp_synqra_rating (empresa_id, res_model, res_id, created_at desc);

alter table public.erp_synqra_discuss_message enable row level security;
alter table public.erp_synqra_rating enable row level security;
revoke all on public.erp_synqra_discuss_message, public.erp_synqra_rating from anon, public;
grant select, insert on public.erp_synqra_discuss_message, public.erp_synqra_rating to authenticated;

drop policy if exists erp_synqra_discuss_select_tenant on public.erp_synqra_discuss_message;
create policy erp_synqra_discuss_select_tenant on public.erp_synqra_discuss_message
for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_synqra_discuss_insert_tenant on public.erp_synqra_discuss_message;
create policy erp_synqra_discuss_insert_tenant on public.erp_synqra_discuss_message
for insert to authenticated with check (
  empresa_id = public.erp_current_empresa_id() and autor_auth_id = auth.uid()
);
drop policy if exists erp_synqra_rating_select_tenant on public.erp_synqra_rating;
create policy erp_synqra_rating_select_tenant on public.erp_synqra_rating
for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_synqra_rating_insert_tenant on public.erp_synqra_rating;
create policy erp_synqra_rating_insert_tenant on public.erp_synqra_rating
for insert to authenticated with check (
  empresa_id = public.erp_current_empresa_id() and operador_auth_id = auth.uid()
);

-- Política global de cadastro de senha; somente identidade Master autenticada pode alterar.
create table if not exists public.erp_sistema_politica_senha (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  comprimento_minimo integer not null default 8 check (comprimento_minimo between 8 and 128),
  exigir_maiuscula boolean not null default true,
  exigir_numero boolean not null default true,
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
insert into public.erp_sistema_politica_senha (singleton, comprimento_minimo, exigir_maiuscula, exigir_numero)
values (true, 8, true, true)
on conflict (singleton) do nothing;

alter table public.erp_sistema_politica_senha enable row level security;
revoke all on public.erp_sistema_politica_senha from anon, public;
grant select, update on public.erp_sistema_politica_senha to authenticated;
drop policy if exists erp_sistema_politica_senha_master_select on public.erp_sistema_politica_senha;
create policy erp_sistema_politica_senha_master_select on public.erp_sistema_politica_senha
for select to authenticated using (public.erp_is_master());
drop policy if exists erp_sistema_politica_senha_master_update on public.erp_sistema_politica_senha;
create policy erp_sistema_politica_senha_master_update on public.erp_sistema_politica_senha
for update to authenticated using (public.erp_is_master())
with check (public.erp_is_master() and atualizado_por = auth.uid());


-- Reserva de lotes para OP: não reduz saldo físico; impede dupla reserva concorrente.
create table if not exists public.erp_pcp_op_lotes_reservados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id) on delete cascade,
  lote_material_id uuid not null references public.erp_lotes_materiais(id) on delete restrict,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade numeric(18,6) not null check (quantidade > 0),
  status text not null default 'RESERVADO' check (status in ('RESERVADO','CONSUMIDO','LIBERADO')),
  criado_por uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_pcp_op_lotes_tenant_lote
  on public.erp_pcp_op_lotes_reservados (empresa_id, lote_material_id, status);
create index if not exists idx_erp_pcp_op_lotes_ordem
  on public.erp_pcp_op_lotes_reservados (empresa_id, ordem_producao_id);

alter table public.erp_pcp_op_lotes_reservados enable row level security;
revoke all on public.erp_pcp_op_lotes_reservados from anon, public;
grant select on public.erp_pcp_op_lotes_reservados to authenticated;
drop policy if exists erp_pcp_op_lotes_select_tenant on public.erp_pcp_op_lotes_reservados;
create policy erp_pcp_op_lotes_select_tenant on public.erp_pcp_op_lotes_reservados
for select to authenticated using (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_pcp_emitir_op_com_lotes(
  p_produto_id uuid,
  p_quantidade numeric,
  p_maquina_id uuid,
  p_lotes jsonb,
  p_pedido_venda_id uuid default null,
  p_velocidade_nominal_hora numeric default null,
  p_operacao_dupla boolean default false
) returns table(id uuid, numero_op bigint, ficha_id uuid, maquina_id uuid, ciclo_seg numeric, cavidades integer, tempo_estimado_horas numeric)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $op$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid := auth.uid();
  v_op record;
  v_item jsonb;
  v_lote_id uuid;
  v_qtd numeric;
  v_produto_insumo uuid;
  v_disponivel numeric;
  v_reservado numeric;
  v_necessario numeric;
  v_soma numeric;
begin
  if v_user is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = v_user and u.empresa_id = v_empresa
      and u.ativo is true and u.deleted_at is null
  ) then
    raise exception 'Usuário ERP ativo não encontrado na empresa atual.' using errcode='42501';
  end if;
  if p_lotes is null or jsonb_typeof(p_lotes) <> 'array' or jsonb_array_length(p_lotes) = 0 then
    raise exception 'Selecione os lotes reais de matéria-prima antes de emitir a OP.' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.erp_pcp_bom_itens b
    where b.empresa_id = v_empresa and b.produto_pai_id = p_produto_id
  ) then
    raise exception 'O produto precisa possuir uma estrutura/BOM cadastrada antes de reservar lotes.' using errcode='22023';
  end if;

  select * into v_op
  from public.erp_criar_ordem_producao_v2(
    p_produto_id, p_quantidade, p_pedido_venda_id, p_maquina_id,
    p_velocidade_nominal_hora, p_operacao_dupla
  );

  for v_item in select value from jsonb_array_elements(p_lotes) loop
    v_lote_id := nullif(v_item->>'lote_material_id','')::uuid;
    v_qtd := nullif(v_item->>'quantidade','')::numeric;
    if v_lote_id is null or v_qtd is null or v_qtd <= 0 then
      raise exception 'Cada reserva precisa de lote e quantidade positiva.' using errcode='22023';
    end if;

    select lm.produto_id, lm.quantidade_disponivel
      into v_produto_insumo, v_disponivel
    from public.erp_lotes_materiais lm
    where lm.id = v_lote_id and lm.empresa_id = v_empresa
      and coalesce(lm.status,'ativo') = 'ativo'
    for update;
    if not found then
      raise exception 'Lote não encontrado, inativo ou de outra empresa.' using errcode='23503';
    end if;

    select coalesce(sum(r.quantidade),0) into v_reservado
    from public.erp_pcp_op_lotes_reservados r
    where r.empresa_id = v_empresa and r.lote_material_id = v_lote_id
      and r.status = 'RESERVADO';
    if v_qtd > coalesce(v_disponivel,0) - v_reservado then
      raise exception 'Quantidade disponível insuficiente no lote selecionado.' using errcode='22023';
    end if;

    select coalesce(sum(b.qtd),0) * p_quantidade into v_necessario
    from public.erp_pcp_bom_itens b
    where b.empresa_id = v_empresa and b.produto_pai_id = p_produto_id
      and b.produto_id = v_produto_insumo;
    if v_necessario <= 0 then
      raise exception 'O lote selecionado não corresponde a um componente da BOM desta OP.' using errcode='22023';
    end if;

    insert into public.erp_pcp_op_lotes_reservados
      (empresa_id, ordem_producao_id, lote_material_id, produto_id, quantidade, criado_por)
    values (v_empresa, v_op.id, v_lote_id, v_produto_insumo, v_qtd, v_user);
  end loop;

  -- Para cada componente da BOM, a soma das reservas desta OP deve cobrir a necessidade calculada.
  if exists (
    select 1
    from public.erp_pcp_bom_itens b
    where b.empresa_id = v_empresa and b.produto_pai_id = p_produto_id
    group by b.produto_id, b.qtd
    having abs(
      coalesce((select sum(r.quantidade)
        from public.erp_pcp_op_lotes_reservados r
        join public.erp_lotes_materiais lm on lm.id = r.lote_material_id
        where r.empresa_id = v_empresa and r.ordem_producao_id = v_op.id
          and r.status = 'RESERVADO' and lm.produto_id = b.produto_id),0)
      - sum(b.qtd) * p_quantidade
    ) > 0.00001
  ) then
    raise exception 'As reservas por componente precisam corresponder exatamente às quantidades exigidas pela BOM.' using errcode='22023';
  end if;

  id := v_op.id;
  numero_op := v_op.numero_op;
  ficha_id := v_op.ficha_id;
  maquina_id := v_op.maquina_id;
  ciclo_seg := v_op.ciclo_seg;
  cavidades := v_op.cavidades;
  tempo_estimado_horas := v_op.tempo_estimado_horas;
  return next;
end;
$op$;

revoke all on function public.erp_pcp_emitir_op_com_lotes(uuid,numeric,uuid,jsonb,uuid,numeric,boolean) from public, anon;
grant execute on function public.erp_pcp_emitir_op_com_lotes(uuid,numeric,uuid,jsonb,uuid,numeric,boolean) to authenticated;

comment on table public.erp_synqra_discuss_message is 'Histórico contextual por empresa; autor derivado da sessão autenticada.';
comment on table public.erp_synqra_rating is 'Avaliações de conformidade de 1 a 5 vinculadas à empresa e à sessão.';
comment on table public.erp_sistema_politica_senha is 'Política global de complexidade para cadastro; alterações restritas a Master.';

commit;
