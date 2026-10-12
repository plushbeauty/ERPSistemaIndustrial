begin;
alter table public.estoque_movimentacoes enable row level security;
alter table public.fiscal_nfe_entradas enable row level security;
alter table public.fiscal_parametros_tributarios enable row level security;
alter table public.fiscal_historico_custos enable row level security;

revoke all on table public.estoque_movimentacoes from anon;
revoke all on table public.fiscal_nfe_entradas from anon;
revoke all on table public.fiscal_parametros_tributarios from anon;
revoke all on table public.fiscal_historico_custos from anon;

drop policy if exists estoque_movimentacoes_select_guard on public.estoque_movimentacoes;
create policy estoque_movimentacoes_select_guard on public.estoque_movimentacoes as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('estoque', 'ver') or public.erp_has_permission('estoque', 'movimentar')));

drop policy if exists estoque_movimentacoes_insert_guard on public.estoque_movimentacoes;
create policy estoque_movimentacoes_insert_guard on public.estoque_movimentacoes as restrictive for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')));

drop policy if exists estoque_movimentacoes_update_guard on public.estoque_movimentacoes;
create policy estoque_movimentacoes_update_guard on public.estoque_movimentacoes as restrictive for update to authenticated
using (false) with check (false);

drop policy if exists estoque_movimentacoes_delete_guard on public.estoque_movimentacoes;
create policy estoque_movimentacoes_delete_guard on public.estoque_movimentacoes as restrictive for delete to authenticated
using (false);

drop policy if exists fiscal_nfe_entradas_select_guard on public.fiscal_nfe_entradas;
create policy fiscal_nfe_entradas_select_guard on public.fiscal_nfe_entradas as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'ver') or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists fiscal_nfe_entradas_insert_guard on public.fiscal_nfe_entradas;
create policy fiscal_nfe_entradas_insert_guard on public.fiscal_nfe_entradas as restrictive for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')) and status = 'rascunho' and escriturada_em is null);

drop policy if exists fiscal_nfe_entradas_update_guard on public.fiscal_nfe_entradas;
create policy fiscal_nfe_entradas_update_guard on public.fiscal_nfe_entradas as restrictive for update to authenticated
using (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')) and status = 'rascunho' and escriturada_em is null)
with check (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')) and status = 'rascunho' and escriturada_em is null);

drop policy if exists fiscal_nfe_entradas_delete_guard on public.fiscal_nfe_entradas;
create policy fiscal_nfe_entradas_delete_guard on public.fiscal_nfe_entradas as restrictive for delete to authenticated
using (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')) and status = 'rascunho' and escriturada_em is null);

drop policy if exists fiscal_parametros_select_guard on public.fiscal_parametros_tributarios;
create policy fiscal_parametros_select_guard on public.fiscal_parametros_tributarios as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'ver') or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists fiscal_parametros_insert_guard on public.fiscal_parametros_tributarios;
create policy fiscal_parametros_insert_guard on public.fiscal_parametros_tributarios as restrictive for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists fiscal_parametros_update_guard on public.fiscal_parametros_tributarios;
create policy fiscal_parametros_update_guard on public.fiscal_parametros_tributarios as restrictive for update to authenticated
using (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')))
with check (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists fiscal_parametros_delete_guard on public.fiscal_parametros_tributarios;
create policy fiscal_parametros_delete_guard on public.fiscal_parametros_tributarios as restrictive for delete to authenticated
using (empresa_id = public.erp_current_empresa_id() and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists fiscal_historico_custos_select_guard on public.fiscal_historico_custos;
create policy fiscal_historico_custos_select_guard on public.fiscal_historico_custos as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('fiscal', 'ver') or public.erp_has_permission('estoque', 'ver')));

drop policy if exists fiscal_historico_custos_insert_guard on public.fiscal_historico_custos;
create policy fiscal_historico_custos_insert_guard on public.fiscal_historico_custos as restrictive for insert to authenticated
with check (false);

drop policy if exists fiscal_historico_custos_update_guard on public.fiscal_historico_custos;
create policy fiscal_historico_custos_update_guard on public.fiscal_historico_custos as restrictive for update to authenticated
using (false) with check (false);

drop policy if exists fiscal_historico_custos_delete_guard on public.fiscal_historico_custos;
create policy fiscal_historico_custos_delete_guard on public.fiscal_historico_custos as restrictive for delete to authenticated
using (false);

commit;
