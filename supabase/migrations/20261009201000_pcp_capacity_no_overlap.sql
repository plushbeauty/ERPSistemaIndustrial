begin;
create or replace function public.erp_pcp_validar_tenant_programacao()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'PCP_TENANT_MISMATCH';
  end if;
  if not exists (
    select 1 from public.pcp_ordens_producao op
     where op.id = new.ordem_producao_id and op.empresa_id = new.empresa_id
  ) then
    raise exception 'PCP_OP_FORA_DA_EMPRESA';
  end if;
  if new.fim_planejado <= new.inicio_planejado then
    raise exception 'PCP_INTERVALO_INVALIDO';
  end if;
  if new.status <> 'cancelada' and exists (
    select 1 from public.pcp_programacao_capacidade p
     where p.empresa_id = new.empresa_id
       and p.centro_trabalho = new.centro_trabalho
       and p.status <> 'cancelada'
       and p.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
       and tstzrange(p.inicio_planejado, p.fim_planejado, '[)') &&
           tstzrange(new.inicio_planejado, new.fim_planejado, '[)')
  ) then
    raise exception 'PCP_CONFLITO_CAPACIDADE: o centro de trabalho já possui programação neste intervalo';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
commit;
