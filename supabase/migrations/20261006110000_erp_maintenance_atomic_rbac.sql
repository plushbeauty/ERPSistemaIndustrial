alter table public.erp_manutencao_ordens
  add column if not exists mttr_min numeric(14,2),
  add column if not exists relatorio_tecnico jsonb not null default '{}'::jsonb;

alter table public.erp_producao_paradas
  add column if not exists ordem_manutencao_id uuid
    references public.erp_manutencao_ordens(id) on delete restrict;

create index if not exists idx_erp_paradas_manutencao_ordem
  on public.erp_producao_paradas(empresa_id, ordem_manutencao_id)
  where ordem_manutencao_id is not null;

insert into public.erp_permissions (codigo, nome, modulo, ativo)
values
  ('manutencao.ver', 'Visualizar manutenção', 'manutencao', true),
  ('manutencao.criar', 'Criar ordens de manutenção', 'manutencao', true),
  ('manutencao.editar', 'Editar e concluir manutenção', 'manutencao', true),
  ('manutencao.excluir', 'Excluir ordens de manutenção', 'manutencao', true)
on conflict (codigo) do update
set nome = excluded.nome, modulo = excluded.modulo, ativo = excluded.ativo;

insert into public.erp_role_permissions (role_id, permission_id)
select r.id, p.id
from public.erp_roles r
cross join public.erp_permissions p
where r.codigo in ('ADMIN', 'MANAGER', 'MASTER')
  and p.codigo in ('manutencao.ver', 'manutencao.criar', 'manutencao.editar', 'manutencao.excluir')
on conflict do nothing;

drop policy if exists erp_manut_ordens_tenant on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_select on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_insert on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_update on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_delete on public.erp_manutencao_ordens;

create policy erp_manut_ordens_select on public.erp_manutencao_ordens
for select to authenticated
using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'ver'));

create policy erp_manut_ordens_insert on public.erp_manutencao_ordens
for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'criar'));

create policy erp_manut_ordens_update on public.erp_manutencao_ordens
for update to authenticated
using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'editar'))
with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'editar'));

create policy erp_manut_ordens_delete on public.erp_manutencao_ordens
for delete to authenticated
using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'excluir'));

create or replace function public.erp_registrar_parada_manutencao(
  p_maquina_id uuid,
  p_ordem_producao_id uuid,
  p_motivo text,
  p_tipo text,
  p_prioridade text,
  p_data_prevista date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_os uuid := gen_random_uuid();
  v_maquina uuid;
  v_num text;
  v_inicio timestamptz := clock_timestamp();
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('manutencao', 'criar')) then
    raise exception 'Usuário sem permissão para criar ordens de manutenção.' using errcode = '42501';
  end if;
  if p_maquina_id is null or nullif(btrim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Máquina e motivo são obrigatórios.';
  end if;
  if p_tipo is null or p_tipo not in ('PREVENTIVA', 'CORRETIVA', 'PREDITIVA')
    or p_prioridade is null or p_prioridade not in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')
    or p_data_prevista is null then
    raise exception 'Tipo, prioridade ou data prevista inválidos.';
  end if;
  select m.id into v_maquina
  from public.erp_maquinas m
  where m.id = p_maquina_id and m.empresa_id = v_empresa and m.ativo = true
  for update;
  if not found then
    raise exception 'Máquina inválida, inativa ou fora da empresa.';
  end if;
  if p_ordem_producao_id is not null and not exists (
    select 1 from public.erp_ordens_producao op
    where op.id = p_ordem_producao_id and op.empresa_id = v_empresa
  ) then
    raise exception 'Ordem de produção não pertence à empresa.';
  end if;

  v_num := 'OS-' || to_char(v_inicio, 'YYYYMMDDHH24MISSMS') || '-' || right(replace(v_os::text, '-', ''), 6);
  insert into public.erp_manutencao_ordens (
    id, empresa_id, ativo_id, tipo, descricao, prioridade, status,
    data_prevista, inicio_atendimento, numero_os
  )
  values (
    v_os, v_empresa, p_maquina_id, p_tipo, btrim(p_motivo), p_prioridade,
    'ABERTA', p_data_prevista, v_inicio, v_num
  );

  insert into public.erp_producao_paradas (
    empresa_id, maquina_id, ordem_producao_id, ordem_manutencao_id,
    motivo, inicio, status
  )
  values (
    v_empresa, p_maquina_id, p_ordem_producao_id, v_os,
    btrim(p_motivo), v_inicio, 'ABERTA'
  );

  return jsonb_build_object('ordem_servico_id', v_os, 'numero_os', v_num);
end;
$$;

create or replace function public.erp_registrar_parada_manutencao(
  p_maquina_id uuid,
  p_ordem_producao_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return public.erp_registrar_parada_manutencao(
    p_maquina_id, p_ordem_producao_id, p_motivo,
    'CORRETIVA', 'ALTA', current_date
  );
end;
$$;

revoke all on function public.erp_registrar_parada_manutencao(uuid, uuid, text) from public, anon;
revoke all on function public.erp_registrar_parada_manutencao(uuid, uuid, text, text, text, date) from public, anon;
grant execute on function public.erp_registrar_parada_manutencao(uuid, uuid, text) to authenticated;
grant execute on function public.erp_registrar_parada_manutencao(uuid, uuid, text, text, text, date) to authenticated;

create or replace function public.erp_concluir_manutencao(
  p_ordem_id uuid,
  p_laudo text,
  p_causa_raiz text,
  p_solucao text,
  p_componente_id uuid,
  p_quantidade numeric
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ordem public.erp_manutencao_ordens%rowtype;
  v_agora timestamptz := clock_timestamp();
  v_mttr numeric(14,2);
  v_saldo numeric;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('manutencao', 'editar')) then
    raise exception 'Usuário sem permissão para concluir ordens de manutenção.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_laudo, '')), '') is null
    or nullif(btrim(coalesce(p_causa_raiz, '')), '') is null
    or nullif(btrim(coalesce(p_solucao, '')), '') is null then
    raise exception 'Laudo, causa raiz e solução são obrigatórios.';
  end if;
  if p_quantidade is null or p_quantidade < 0
    or p_quantidade::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Quantidade de componente inválida.';
  end if;
  if (p_componente_id is null and p_quantidade <> 0)
    or (p_componente_id is not null and p_quantidade <= 0) then
    raise exception 'Informe componente e quantidade positiva, ou deixe ambos vazios.';
  end if;
  if p_componente_id is not null
    and not (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')) then
    raise exception 'Usuário sem permissão para movimentar estoque.' using errcode = '42501';
  end if;

  select * into v_ordem
  from public.erp_manutencao_ordens o
  where o.id = p_ordem_id and o.empresa_id = v_empresa
  for update;
  if not found then
    raise exception 'Ordem de manutenção não encontrada nesta empresa.';
  end if;
  if v_ordem.status not in ('ABERTA', 'EM_EXECUCAO') then
    raise exception 'Somente ordens abertas ou em execução podem ser concluídas.';
  end if;

  if p_componente_id is not null then
    select p.estoque_atual into v_saldo
    from public.erp_produtos p
    where p.id = p_componente_id and p.empresa_id = v_empresa and p.ativo = true
    for update;
    if not found then
      raise exception 'Componente inválido, inativo ou fora da empresa.';
    end if;
    if v_saldo < p_quantidade then
      raise exception 'Estoque insuficiente para o componente.';
    end if;
    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, origem, documento, observacao
    )
    values (
      v_empresa, p_componente_id, 'consumo', p_quantidade, 'manutencao',
      v_ordem.numero_os, 'Componente aplicado na O.S. ' || coalesce(v_ordem.numero_os, v_ordem.id::text)
    );
  end if;

  v_mttr := greatest(extract(epoch from (v_agora - coalesce(v_ordem.inicio_atendimento, v_ordem.created_at))) / 60, 0);
  update public.erp_manutencao_ordens
  set status = 'CONCLUIDA',
      laudo_tecnico = btrim(p_laudo),
      relatorio_tecnico = jsonb_build_object('causa_raiz', btrim(p_causa_raiz), 'solucao', btrim(p_solucao)),
      data_fechamento = v_agora,
      mttr_min = v_mttr
  where id = v_ordem.id and empresa_id = v_empresa;

  update public.erp_producao_paradas
  set fim = v_agora, status = 'FECHADA'
  where ordem_manutencao_id = v_ordem.id
    and empresa_id = v_empresa and fim is null;

  return jsonb_build_object('ordem_servico_id', v_ordem.id, 'mttr_min', v_mttr);
end;
$$;

revoke all on function public.erp_concluir_manutencao(uuid, text, text, text, uuid, numeric) from public, anon;
grant execute on function public.erp_concluir_manutencao(uuid, text, text, text, uuid, numeric) to authenticated;
