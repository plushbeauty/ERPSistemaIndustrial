begin;

insert into public.erp_permissions (codigo, nome, modulo, ativo) values
  ('expedicao.ver', 'Visualizar expedição', 'expedicao', true),
  ('expedicao.criar', 'Criar romaneios', 'expedicao', true),
  ('expedicao.editar', 'Liberar romaneios', 'expedicao', true),
  ('expedicao.excluir', 'Excluir registros de expedição', 'expedicao', true)
on conflict (codigo) do update
set nome = excluded.nome, modulo = excluded.modulo, ativo = true;

insert into public.erp_role_permissions (role_id, permission_id)
select r.id, p.id
from public.erp_roles r
cross join public.erp_permissions p
where r.empresa_id is null
  and r.codigo in ('ADMIN', 'MANAGER')
  and p.codigo in ('expedicao.ver', 'expedicao.criar', 'expedicao.editar', 'expedicao.excluir')
on conflict (role_id, permission_id) do nothing;

drop policy if exists erp_veiculos_select on public.erp_veiculos;
drop policy if exists erp_veiculos_insert on public.erp_veiculos;
drop policy if exists erp_veiculos_update on public.erp_veiculos;
drop policy if exists erp_veiculos_delete on public.erp_veiculos;
create policy erp_veiculos_select
  on public.erp_veiculos for select to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'ver'))
  );
create policy erp_veiculos_insert
  on public.erp_veiculos for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_current_empresa_id() is not null
    and public.erp_has_permission('expedicao', 'criar')
  );
create policy erp_veiculos_update
  on public.erp_veiculos for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'editar'));
create policy erp_veiculos_delete
  on public.erp_veiculos for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'excluir'));

drop policy if exists erp_motoristas_select on public.erp_motoristas;
drop policy if exists erp_motoristas_insert on public.erp_motoristas;
drop policy if exists erp_motoristas_update on public.erp_motoristas;
drop policy if exists erp_motoristas_delete on public.erp_motoristas;
create policy erp_motoristas_select
  on public.erp_motoristas for select to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'ver'))
  );
create policy erp_motoristas_insert
  on public.erp_motoristas for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_current_empresa_id() is not null
    and public.erp_has_permission('expedicao', 'criar')
  );
create policy erp_motoristas_update
  on public.erp_motoristas for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'editar'));
create policy erp_motoristas_delete
  on public.erp_motoristas for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'excluir'));

drop policy if exists erp_expedicoes_select on public.erp_expedicoes;
drop policy if exists erp_expedicoes_insert on public.erp_expedicoes;
drop policy if exists erp_expedicoes_update on public.erp_expedicoes;
drop policy if exists erp_expedicoes_delete on public.erp_expedicoes;
create policy erp_expedicoes_select
  on public.erp_expedicoes for select to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'ver'))
  );
create policy erp_expedicoes_insert
  on public.erp_expedicoes for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_current_empresa_id() is not null
    and public.erp_has_permission('expedicao', 'criar')
    and (veiculo_id is null or exists (
      select 1 from public.erp_veiculos v
      where v.id = erp_expedicoes.veiculo_id
        and v.empresa_id = erp_expedicoes.empresa_id
        and v.ativo = true
    ))
    and (motorista_id is null or exists (
      select 1 from public.erp_motoristas m
      where m.id = erp_expedicoes.motorista_id
        and m.empresa_id = erp_expedicoes.empresa_id
        and m.ativo = true
    ))
  );
create policy erp_expedicoes_update
  on public.erp_expedicoes for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'editar'))
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('expedicao', 'editar')
    and (veiculo_id is null or exists (
      select 1 from public.erp_veiculos v
      where v.id = erp_expedicoes.veiculo_id
        and v.empresa_id = erp_expedicoes.empresa_id
        and v.ativo = true
    ))
    and (motorista_id is null or exists (
      select 1 from public.erp_motoristas m
      where m.id = erp_expedicoes.motorista_id
        and m.empresa_id = erp_expedicoes.empresa_id
        and m.ativo = true
    ))
  );
create policy erp_expedicoes_delete
  on public.erp_expedicoes for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'excluir'));

drop policy if exists erp_expedicao_notas_select on public.erp_expedicao_notas;
drop policy if exists erp_expedicao_notas_insert on public.erp_expedicao_notas;
drop policy if exists erp_expedicao_notas_delete on public.erp_expedicao_notas;
create policy erp_expedicao_notas_select
  on public.erp_expedicao_notas for select to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'ver'))
  );
create policy erp_expedicao_notas_insert
  on public.erp_expedicao_notas for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('expedicao', 'criar')
    and exists (
      select 1 from public.erp_expedicoes e
      where e.id = erp_expedicao_notas.expedicao_id
        and e.empresa_id = erp_expedicao_notas.empresa_id
    )
    and exists (
      select 1 from public.erp_documentos_fiscais d
      where d.id = erp_expedicao_notas.nota_fiscal_id
        and d.empresa_id = erp_expedicao_notas.empresa_id
        and d.modelo = '55'
        and d.status = 'Autorizada'
    )
  );
create policy erp_expedicao_notas_delete
  on public.erp_expedicao_notas for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('expedicao', 'excluir'));

create or replace function public.erp_expedicao_criar_romaneio(
  p_numero bigint,
  p_veiculo_id uuid,
  p_motorista_id uuid,
  p_transportadora text,
  p_capacidade_kg numeric,
  p_data_expedicao date,
  p_documento_fiscal_ids uuid[]
)
returns table (id uuid, peso_total_kg numeric)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_vehicle_capacity numeric;
  v_capacity numeric;
  v_weight numeric;
  v_invoice_count bigint;
  v_expedicao_id uuid;
  v_invoice_id uuid;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ERP autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;
  if not public.erp_has_permission('expedicao', 'ver')
    or not public.erp_has_permission('expedicao', 'criar') then
    raise exception 'Sem permissão para consultar e criar romaneios.' using errcode = '42501';
  end if;
  if p_numero is null or p_numero <= 0
    or p_veiculo_id is null
    or p_motorista_id is null then
    raise exception 'Número, veículo e motorista são obrigatórios.' using errcode = '22023';
  end if;
  if p_documento_fiscal_ids is null
    or cardinality(p_documento_fiscal_ids) = 0
    or cardinality(p_documento_fiscal_ids) > 500 then
    raise exception 'Selecione entre 1 e 500 notas fiscais.' using errcode = '22023';
  end if;
  if p_capacidade_kg < 0 or coalesce(p_capacidade_kg, 0)::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Capacidade informada inválida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text || ':expedicao-romaneio', 0));
  for v_invoice_id in
    select distinct requested.invoice_id
    from unnest(p_documento_fiscal_ids) as requested(invoice_id)
    order by requested.invoice_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_empresa::text || ':expedicao-nfe:' || v_invoice_id::text, 0));
  end loop;

  if cardinality(p_documento_fiscal_ids) <> (
    select count(distinct requested.invoice_id)
    from unnest(p_documento_fiscal_ids) as requested(invoice_id)
  ) then
    raise exception 'A seleção contém notas fiscais duplicadas.' using errcode = '22023';
  end if;

  select v.capacidade_kg
    into v_vehicle_capacity
    from public.erp_veiculos v
   where v.id = p_veiculo_id
     and v.empresa_id = v_empresa
     and v.ativo = true;
  if not found then
    raise exception 'Veículo ativo não localizado na empresa atual.' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.erp_motoristas m
    where m.id = p_motorista_id
      and m.empresa_id = v_empresa
      and m.ativo = true
  ) then
    raise exception 'Motorista ativo não localizado na empresa atual.' using errcode = '23503';
  end if;
  if v_vehicle_capacity > 0 and coalesce(p_capacidade_kg, 0) > v_vehicle_capacity then
    raise exception 'A capacidade manual não pode exceder a capacidade cadastrada do veículo.' using errcode = '22023';
  end if;
  v_capacity := coalesce(nullif(p_capacidade_kg, 0), nullif(v_vehicle_capacity, 0));

  select count(*), coalesce(sum(coalesce(d.peso_bruto, d.peso_liquido, 0)), 0)
    into v_invoice_count, v_weight
    from public.erp_documentos_fiscais d
   where d.id = any(p_documento_fiscal_ids)
     and d.empresa_id = v_empresa
     and d.modelo = '55'
     and d.status = 'Autorizada';
  if v_invoice_count <> cardinality(p_documento_fiscal_ids) then
    raise exception 'Uma ou mais notas estão fora da empresa, não autorizadas ou não são NF-e modelo 55.' using errcode = '23503';
  end if;
  if exists (
    select 1
    from public.erp_documentos_fiscais d
    where d.id = any(p_documento_fiscal_ids)
      and d.empresa_id = v_empresa
      and coalesce(d.peso_bruto, d.peso_liquido, 0) < 0
  ) then
    raise exception 'Uma ou mais notas possuem peso negativo.' using errcode = '23514';
  end if;
  if v_capacity is not null and v_capacity > 0 and v_weight > v_capacity then
    raise exception 'A carga excede a capacidade real do veículo.' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.erp_expedicao_notas n
    join public.erp_expedicoes e
      on e.id = n.expedicao_id
     and e.empresa_id = n.empresa_id
   where n.empresa_id = v_empresa
     and n.nota_fiscal_id = any(p_documento_fiscal_ids)
     and upper(e.status) not in ('CANCELADO', 'CANCELADA', 'ANULADO', 'ANULADA')
  ) then
    raise exception 'Uma ou mais notas já estão vinculadas a um romaneio ativo.' using errcode = '23514';
  end if;

  insert into public.erp_expedicoes (
    empresa_id, numero, status, veiculo_id, motorista_id, transportadora,
    capacidade_kg, peso_total_kg, data_expedicao
  )
  values (
    v_empresa, p_numero, 'PREPARACAO', p_veiculo_id, p_motorista_id,
    nullif(btrim(coalesce(p_transportadora, '')), ''),
    v_capacity, v_weight, p_data_expedicao
  )
  returning erp_expedicoes.id into v_expedicao_id;

  insert into public.erp_expedicao_notas (
    empresa_id, expedicao_id, nota_fiscal_id, peso_kg, cidade
  )
  select
    v_empresa,
    v_expedicao_id,
    d.id,
    coalesce(d.peso_bruto, d.peso_liquido, 0),
    nullif(concat_ws(' / ', nullif(btrim(d.destinatario_cidade), ''), nullif(btrim(d.destinatario_uf), '')), '')
  from public.erp_documentos_fiscais d
  where d.id = any(p_documento_fiscal_ids)
    and d.empresa_id = v_empresa
    and d.modelo = '55'
    and d.status = 'Autorizada';

  return query select v_expedicao_id, v_weight;
end;
$$;

revoke all on function public.erp_expedicao_criar_romaneio(bigint, uuid, uuid, text, numeric, date, uuid[]) from public, anon;
grant execute on function public.erp_expedicao_criar_romaneio(bigint, uuid, uuid, text, numeric, date, uuid[]) to authenticated;

commit;
