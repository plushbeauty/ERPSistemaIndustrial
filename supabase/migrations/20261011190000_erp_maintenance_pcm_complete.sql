alter table public.erp_maquinas
  add column if not exists setor text,
  add column if not exists criticidade text,
  add column if not exists horimetro_inicial numeric(14,2) not null default 0,
  add column if not exists km_inicial numeric(14,2) not null default 0,
  add column if not exists localizacao_fisica text,
  add column if not exists garantia_ate date,
  add column if not exists lubrificante_recomendado text,
  add column if not exists tensao_v numeric(14,3),
  add column if not exists corrente_a numeric(14,3),
  add column if not exists pressao_bar numeric(14,3),
  add column if not exists potencia_kw numeric(14,3);

alter table public.erp_manutencao_ordens
  add column if not exists rnc_id uuid,
  add column if not exists plano_manutencao_id uuid,
  add column if not exists causa_falha text,
  add column if not exists codigo_sintoma text,
  add column if not exists codigo_defeito text,
  add column if not exists solucao_adotada text,
  add column if not exists downtime_passivo_min numeric(14,2) not null default 0,
  add column if not exists gerou_rnc_produto boolean not null default false,
  add column if not exists custo_mao_obra numeric(14,2) not null default 0;

create unique index if not exists idx_erp_maquinas_id_empresa_unique on public.erp_maquinas(id, empresa_id);
create unique index if not exists idx_erp_manutencao_ordens_id_empresa_unique on public.erp_manutencao_ordens(id, empresa_id);
create unique index if not exists idx_erp_produtos_id_empresa_unique on public.erp_produtos(id, empresa_id);
create unique index if not exists idx_erp_estoque_movimentos_id_empresa_unique on public.erp_estoque_movimentos(id, empresa_id);
create unique index if not exists idx_erp_rpnc_id_empresa_unique on public.erp_rpnc(id, empresa_id);

alter table public.erp_manutencao_ordens
  add constraint erp_manutencao_ordens_rnc_empresa_fk
  foreign key (rnc_id, empresa_id) references public.erp_rpnc(id, empresa_id) on delete restrict;

create index if not exists idx_erp_manutencao_ordens_rnc
  on public.erp_manutencao_ordens(empresa_id, rnc_id)
  where rnc_id is not null;

create table if not exists public.erp_manutencao_planos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ativo_id uuid not null,
  descricao text not null,
  frequencia_dias integer,
  limite_horas numeric(14,2),
  limite_ciclos bigint,
  tolerancia_atraso_dias integer not null default 0,
  homem_hora_estimado numeric(14,2) not null default 1,
  proxima_revisao date,
  ultimo_gatilho_ciclos bigint,
  proximo_gatilho_ciclos bigint,
  ativo boolean not null default true,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_manutencao_planos_ativo_empresa_fk foreign key (ativo_id, empresa_id) references public.erp_maquinas(id, empresa_id) on delete restrict,
  constraint erp_manutencao_planos_frequencia_ck check (frequencia_dias is null or frequencia_dias > 0),
  constraint erp_manutencao_planos_horas_ck check (limite_horas is null or limite_horas >= 0),
  constraint erp_manutencao_planos_ciclos_ck check (limite_ciclos is null or limite_ciclos > 0),
  constraint erp_manutencao_planos_atraso_ck check (tolerancia_atraso_dias >= 0),
  constraint erp_manutencao_planos_hh_ck check (homem_hora_estimado >= 0)
);
create unique index if not exists idx_erp_manutencao_planos_id_empresa_unique on public.erp_manutencao_planos(id, empresa_id);
alter table public.erp_manutencao_ordens add constraint erp_manutencao_ordens_plano_empresa_fk foreign key (plano_manutencao_id, empresa_id) references public.erp_manutencao_planos(id, empresa_id) on delete restrict;

update public.erp_manutencao_planos set proximo_gatilho_ciclos = limite_ciclos where limite_ciclos is not null and proximo_gatilho_ciclos is null;

create index if not exists idx_erp_manutencao_planos_empresa_data
  on public.erp_manutencao_planos(empresa_id, proxima_revisao) where ativo = true;

create table if not exists public.erp_manutencao_insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ordem_id uuid not null,
  produto_id uuid not null,
  quantidade numeric(14,4) not null check (quantidade > 0),
  custo_unitario_historico numeric(14,4) not null check (custo_unitario_historico >= 0),
  movimento_estoque_id uuid,
  criado_por uuid,
  created_at timestamptz not null default now(),
  constraint erp_manutencao_insumos_ordem_empresa_fk foreign key (ordem_id, empresa_id) references public.erp_manutencao_ordens(id, empresa_id) on delete restrict,
  constraint erp_manutencao_insumos_produto_empresa_fk foreign key (produto_id, empresa_id) references public.erp_produtos(id, empresa_id) on delete restrict,
  constraint erp_manutencao_insumos_movimento_empresa_fk foreign key (movimento_estoque_id, empresa_id) references public.erp_estoque_movimentos(id, empresa_id) on delete restrict
);
create index if not exists idx_erp_manutencao_insumos_empresa_ordem
  on public.erp_manutencao_insumos(empresa_id, ordem_id, created_at desc);

alter table public.erp_manutencao_planos enable row level security;
alter table public.erp_manutencao_insumos enable row level security;

drop policy if exists erp_maquinas_manutencao_select on public.erp_maquinas;
drop policy if exists erp_maquinas_manutencao_insert on public.erp_maquinas;
drop policy if exists erp_maquinas_manutencao_update on public.erp_maquinas;
create policy erp_maquinas_manutencao_select on public.erp_maquinas for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.ver')));
create policy erp_maquinas_manutencao_insert on public.erp_maquinas for insert to authenticated
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.criar')));
create policy erp_maquinas_manutencao_update on public.erp_maquinas for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.editar')))
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.editar')));

insert into public.erp_permissions (code, name, description)
values
  ('manutencao.ver', 'Visualizar manutenção', 'Acessar ativos, planos, ordens e insumos'),
  ('manutencao.criar', 'Criar manutenção', 'Criar ativos, planos e ordens de manutenção'),
  ('manutencao.editar', 'Editar manutenção', 'Editar e concluir ordens e planos'),
  ('manutencao.excluir', 'Excluir manutenção', 'Desativar ou excluir registros de manutenção')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.erp_role_permissions (role_id, permission_id)
select r.id, p.id from public.erp_roles r cross join public.erp_permissions p
where r.codigo in ('ADMIN', 'MANAGER')
  and p.code in ('manutencao.ver', 'manutencao.criar', 'manutencao.editar', 'manutencao.excluir')
on conflict do nothing;

drop policy if exists erp_manut_planos_select on public.erp_manutencao_planos;
drop policy if exists erp_manut_planos_insert on public.erp_manutencao_planos;
drop policy if exists erp_manut_planos_update on public.erp_manutencao_planos;
drop policy if exists erp_manut_insumos_select on public.erp_manutencao_insumos;

create policy erp_manut_planos_select on public.erp_manutencao_planos for select to authenticated
using (empresa_id = public.erp_current_empresa_id() and (public.erp_is_master() or public.erp_has_permission('manutencao.ver')));
create policy erp_manut_planos_insert on public.erp_manutencao_planos for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() and (public.erp_is_master() or public.erp_has_permission('manutencao.criar')));
create policy erp_manut_planos_update on public.erp_manutencao_planos for update to authenticated
using (empresa_id = public.erp_current_empresa_id() and (public.erp_is_master() or public.erp_has_permission('manutencao.editar')))
with check (empresa_id = public.erp_current_empresa_id() and (public.erp_is_master() or public.erp_has_permission('manutencao.editar')));
create policy erp_manut_insumos_select on public.erp_manutencao_insumos for select to authenticated
using (empresa_id = public.erp_current_empresa_id() and (public.erp_is_master() or public.erp_has_permission('manutencao.ver')));


create or replace function public.erp_manutencao_disparar_preventiva_ciclos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $trigger$
declare
  v_total bigint;
  v_plano record;
  v_os uuid;
  v_numero text;
begin
  if new.maquina_id is null or new.empresa_id is null or new.quantidade_injecoes is null
    or new.quantidade_injecoes <= 0 then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.maquina_id is not distinct from new.maquina_id
    and old.empresa_id is not distinct from new.empresa_id
    and old.quantidade_injecoes is not distinct from new.quantidade_injecoes then
    return new;
  end if;
  select coalesce(sum(c.quantidade_injecoes), 0)::bigint into v_total
  from public.erp_qualidade_controles_injetora c
  where c.empresa_id = new.empresa_id and c.maquina_id = new.maquina_id;
  for v_plano in
    select p.* from public.erp_manutencao_planos p
    where p.empresa_id = new.empresa_id and p.ativo_id = new.maquina_id
      and p.ativo = true and p.limite_ciclos is not null
      and v_total >= coalesce(p.proximo_gatilho_ciclos, p.limite_ciclos)
    order by p.id for update
  loop
    if not exists (
      select 1 from public.erp_manutencao_ordens o
      where o.empresa_id = new.empresa_id and o.plano_manutencao_id = v_plano.id
        and o.status in ('ABERTA', 'EM_EXECUCAO')
    ) then
      v_os := gen_random_uuid();
      v_numero := 'OS-PREV-' || upper(substr(replace(v_os::text, '-', ''), 1, 10));
      insert into public.erp_manutencao_ordens
        (id, empresa_id, ativo_id, plano_manutencao_id, tipo, descricao, prioridade, status, data_prevista, numero_os, created_at, updated_at)
      values
        (v_os, new.empresa_id, new.maquina_id, v_plano.id, 'PREVENTIVA',
         'Preventiva por ciclos: ' || v_plano.descricao, 'MEDIA', 'ABERTA', current_date, v_numero, now(), now());
      update public.erp_manutencao_planos
      set ultimo_gatilho_ciclos = v_total,
          proximo_gatilho_ciclos = v_total + v_plano.limite_ciclos,
          updated_at = now()
      where id = v_plano.id and empresa_id = new.empresa_id;
    end if;
  end loop;
  return new;
end;
$trigger$;
revoke all on function public.erp_manutencao_disparar_preventiva_ciclos() from public, anon, authenticated;
drop trigger if exists trg_erp_manutencao_preventiva_ciclos on public.erp_qualidade_controles_injetora;
create trigger trg_erp_manutencao_preventiva_ciclos
after insert or update on public.erp_qualidade_controles_injetora
for each row execute function public.erp_manutencao_disparar_preventiva_ciclos();

create or replace function public.erp_manutencao_registrar_insumo(
  p_ordem_id uuid, p_produto_id uuid, p_quantidade numeric, p_custo_unitario numeric
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ordem public.erp_manutencao_ordens%rowtype;
  v_saldo_produto numeric;
  v_saldo_fisico numeric;
  v_saldo_fisico_existe boolean := false;
  v_movimento uuid := gen_random_uuid();
  v_insumo uuid := gen_random_uuid();
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('manutencao.editar')) then
    raise exception 'Usuário sem permissão para registrar insumos.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque.movimentar')) then
    raise exception 'Usuário sem permissão para movimentar estoque.' using errcode = '42501';
  end if;
  if p_ordem_id is null or p_produto_id is null or p_quantidade is null or p_quantidade <= 0
    or p_custo_unitario is null or p_custo_unitario < 0
    or p_quantidade::text in ('NaN','Infinity','-Infinity')
    or p_custo_unitario::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Ordem, produto, quantidade e custo devem ser válidos.';
  end if;
  select * into v_ordem from public.erp_manutencao_ordens o
  where o.id = p_ordem_id and o.empresa_id = v_empresa for update;
  if not found then raise exception 'Ordem não encontrada nesta empresa.'; end if;
  if v_ordem.status not in ('ABERTA','EM_EXECUCAO') then
    raise exception 'Somente ordens abertas ou em execução aceitam insumos.';
  end if;
  select p.estoque_atual into v_saldo_produto from public.erp_produtos p
  where p.id = p_produto_id and p.empresa_id = v_empresa and p.ativo = true for update;
  if not found then raise exception 'Produto inexistente, inativo ou de outra empresa.'; end if;
  if v_saldo_produto < p_quantidade then raise exception 'Estoque insuficiente no cadastro do produto.'; end if;
  select s.saldo_fisico into v_saldo_fisico from public.erp_produto_estoque s
  where s.empresa_id = v_empresa and s.produto_id = p_produto_id for update;
  v_saldo_fisico_existe := found;
  if v_saldo_fisico_existe and abs(v_saldo_fisico - v_saldo_produto) > 0.0001 then
    raise exception 'Divergência entre saldo físico e saldo do produto; reconcilie o estoque antes da baixa.';
  end if;
  if v_saldo_fisico_existe and v_saldo_fisico < p_quantidade then raise exception 'Estoque físico insuficiente.'; end if;
  update public.erp_produtos set estoque_atual = estoque_atual - p_quantidade
  where id = p_produto_id and empresa_id = v_empresa and estoque_atual >= p_quantidade;
  if not found then raise exception 'Saldo alterado durante a operação; recarregue o estoque.'; end if;
  insert into public.erp_estoque_movimentos (id, empresa_id, produto_id, tipo, quantidade, origem, documento, observacao)
  values (v_movimento, v_empresa, p_produto_id, 'consumo', p_quantidade, 'manutencao',
    coalesce(v_ordem.numero_os, v_ordem.id::text), 'Consumo vinculado à O.S. ' || coalesce(v_ordem.numero_os, v_ordem.id::text));
  insert into public.erp_produto_estoque (id, empresa_id, produto_id, saldo_fisico, created_at, updated_at)
  values (gen_random_uuid(), v_empresa, p_produto_id, v_saldo_produto - p_quantidade, now(), now())
  on conflict (empresa_id, produto_id) do update set saldo_fisico = excluded.saldo_fisico, updated_at = now();
  insert into public.erp_manutencao_insumos
    (id, empresa_id, ordem_id, produto_id, quantidade, custo_unitario_historico, movimento_estoque_id, criado_por)
  values (v_insumo, v_empresa, p_ordem_id, p_produto_id, p_quantidade, p_custo_unitario, v_movimento, auth.uid());
  return jsonb_build_object('insumo_id',v_insumo,'movimento_id',v_movimento,'saldo_anterior',v_saldo_produto,'saldo_atual',v_saldo_produto-p_quantidade);
end;
$$;
revoke all on function public.erp_manutencao_registrar_insumo(uuid, uuid, numeric, numeric) from public, anon;
grant execute on function public.erp_manutencao_registrar_insumo(uuid, uuid, numeric, numeric) to authenticated;
