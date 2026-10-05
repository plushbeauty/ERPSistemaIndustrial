drop policy if exists erp_producao_paradas_select on public.erp_producao_paradas;
drop policy if exists erp_producao_paradas_insert on public.erp_producao_paradas;
drop policy if exists erp_producao_paradas_update on public.erp_producao_paradas;
drop policy if exists erp_producao_paradas_delete on public.erp_producao_paradas;

create policy erp_producao_paradas_select
on public.erp_producao_paradas
for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('producao', 'ver'))
);

create policy erp_producao_paradas_insert
on public.erp_producao_paradas
for insert to authenticated
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('producao', 'apontar'))
);

create policy erp_producao_paradas_update
on public.erp_producao_paradas
for update to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('producao', 'apontar'))
)
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('producao', 'apontar'))
);

revoke insert, update, delete on public.erp_producao_paradas from authenticated;
grant select on public.erp_producao_paradas to authenticated;
grant insert (empresa_id, maquina_id, ordem_producao_id, motivo, inicio, observacao, status)
on public.erp_producao_paradas to authenticated;
grant update (fim, status, observacao) on public.erp_producao_paradas to authenticated;
