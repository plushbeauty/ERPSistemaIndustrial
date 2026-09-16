insert into public.erp_permissions (codigo,nome,modulo)
values
  ('compras.editar','Editar compras','compras'),('compras.excluir','Excluir compras','compras'),
  ('estoque.criar','Criar movimentações de estoque','estoque'),('estoque.editar','Editar movimentações de estoque','estoque'),('estoque.excluir','Excluir movimentações de estoque','estoque'),
  ('financeiro.editar','Editar financeiro','financeiro'),('financeiro.excluir','Excluir financeiro','financeiro'),
  ('qualidade.excluir','Excluir registros de qualidade','qualidade'),
  ('vendas.editar','Editar vendas','vendas'),('vendas.excluir','Excluir vendas','vendas')
on conflict (codigo) do update set nome=excluded.nome, modulo=excluded.modulo;

insert into public.erp_role_permissions (role_id,permission_id)
select r.id,p.id from public.erp_roles r cross join public.erp_permissions p
where r.codigo in ('ADMIN','MANAGER','MASTER')
  and p.codigo in ('compras.editar','compras.excluir','estoque.criar','estoque.editar','estoque.excluir','financeiro.editar','financeiro.excluir','qualidade.excluir','vendas.editar','vendas.excluir')
on conflict do nothing;

drop policy if exists erp_compras_tenant_authenticated on public.erp_compras;
drop policy if exists erp_compra_itens_tenant_authenticated on public.erp_compra_itens;
drop policy if exists erp_estoque_movimentos_tenant_insert on public.erp_estoque_movimentos;
drop policy if exists erp_estoque_movimentos_tenant_select on public.erp_estoque_movimentos;
drop policy if exists erp_financeiro_write_tenant on public.erp_financeiro;
drop policy if exists erp_financeiro_select_tenant on public.erp_financeiro;
drop policy if exists erp_financeiro_update_tenant on public.erp_financeiro;
drop policy if exists erp_registros_qualidade_empresa on public.erp_registros_qualidade;
drop policy if exists erp_inspecoes_tenant_authenticated on public.erp_inspecoes;
drop policy if exists erp_nao_conformidades_tenant_authenticated on public.erp_nao_conformidades;
drop policy if exists erp_fmea_tenant_authenticated on public.erp_fmea;
drop policy if exists erp_fmea_acoes_tenant_authenticated on public.erp_fmea_acoes;
drop policy if exists erp_acoes_corretivas_tenant_authenticated on public.erp_acoes_corretivas;
drop policy if exists erp_vendas_tenant_authenticated on public.erp_vendas;
drop policy if exists erp_venda_itens_tenant on public.erp_venda_itens;

create policy erp_compras_rbac_select on public.erp_compras for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','ver'));
create policy erp_compras_rbac_insert on public.erp_compras for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','criar'));
create policy erp_compras_rbac_update on public.erp_compras for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','editar'));
create policy erp_compras_rbac_delete on public.erp_compras for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','excluir'));

create policy erp_compra_itens_rbac_select on public.erp_compra_itens for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','ver'));
create policy erp_compra_itens_rbac_insert on public.erp_compra_itens for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','criar'));
create policy erp_compra_itens_rbac_update on public.erp_compra_itens for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','editar'));
create policy erp_compra_itens_rbac_delete on public.erp_compra_itens for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('compras','excluir'));

create policy erp_estoque_movimentos_rbac_select on public.erp_estoque_movimentos for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('estoque','ver'));
create policy erp_estoque_movimentos_rbac_insert on public.erp_estoque_movimentos for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('estoque','movimentar'));
create policy erp_estoque_movimentos_rbac_update on public.erp_estoque_movimentos for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('estoque','movimentar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('estoque','movimentar'));
create policy erp_estoque_movimentos_rbac_delete on public.erp_estoque_movimentos for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('estoque','movimentar'));

create policy erp_financeiro_rbac_select on public.erp_financeiro for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('financeiro','ver'));
create policy erp_financeiro_rbac_insert on public.erp_financeiro for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('financeiro','lancar'));
create policy erp_financeiro_rbac_update on public.erp_financeiro for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('financeiro','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('financeiro','editar'));
create policy erp_financeiro_rbac_delete on public.erp_financeiro for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('financeiro','excluir'));

create policy erp_registros_qualidade_rbac_select on public.erp_registros_qualidade for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_registros_qualidade_rbac_insert on public.erp_registros_qualidade for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_registros_qualidade_rbac_update on public.erp_registros_qualidade for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_registros_qualidade_rbac_delete on public.erp_registros_qualidade for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_inspecoes_rbac_select on public.erp_inspecoes for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_inspecoes_rbac_insert on public.erp_inspecoes for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_inspecoes_rbac_update on public.erp_inspecoes for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_inspecoes_rbac_delete on public.erp_inspecoes for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_nao_conformidades_rbac_select on public.erp_nao_conformidades for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_nao_conformidades_rbac_insert on public.erp_nao_conformidades for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_nao_conformidades_rbac_update on public.erp_nao_conformidades for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_nao_conformidades_rbac_delete on public.erp_nao_conformidades for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_fmea_rbac_select on public.erp_fmea for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_fmea_rbac_insert on public.erp_fmea for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_fmea_rbac_update on public.erp_fmea for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_fmea_rbac_delete on public.erp_fmea for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_fmea_acoes_rbac_select on public.erp_fmea_acoes for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_fmea_acoes_rbac_insert on public.erp_fmea_acoes for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_fmea_acoes_rbac_update on public.erp_fmea_acoes for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_fmea_acoes_rbac_delete on public.erp_fmea_acoes for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_acoes_corretivas_rbac_select on public.erp_acoes_corretivas for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','ver'));
create policy erp_acoes_corretivas_rbac_insert on public.erp_acoes_corretivas for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','criar'));
create policy erp_acoes_corretivas_rbac_update on public.erp_acoes_corretivas for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','editar'));
create policy erp_acoes_corretivas_rbac_delete on public.erp_acoes_corretivas for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('qualidade','excluir'));

create policy erp_vendas_rbac_select on public.erp_vendas for select to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('vendas','ver'));
create policy erp_vendas_rbac_insert on public.erp_vendas for insert to authenticated with check (empresa_id=erp_current_empresa_id() and erp_has_permission('vendas','criar'));
create policy erp_vendas_rbac_update on public.erp_vendas for update to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('vendas','editar')) with check (empresa_id=erp_current_empresa_id() and erp_has_permission('vendas','editar'));
create policy erp_vendas_rbac_delete on public.erp_vendas for delete to authenticated using (empresa_id=erp_current_empresa_id() and erp_has_permission('vendas','excluir'));

create policy erp_venda_itens_rbac_select on public.erp_venda_itens for select to authenticated using (exists(select 1 from public.erp_vendas v where v.id=erp_venda_itens.venda_id and v.empresa_id=erp_current_empresa_id()) and erp_has_permission('vendas','ver'));
create policy erp_venda_itens_rbac_insert on public.erp_venda_itens for insert to authenticated with check (exists(select 1 from public.erp_vendas v where v.id=erp_venda_itens.venda_id and v.empresa_id=erp_current_empresa_id()) and erp_has_permission('vendas','criar'));
create policy erp_venda_itens_rbac_update on public.erp_venda_itens for update to authenticated using (exists(select 1 from public.erp_vendas v where v.id=erp_venda_itens.venda_id and v.empresa_id=erp_current_empresa_id()) and erp_has_permission('vendas','editar')) with check (exists(select 1 from public.erp_vendas v where v.id=erp_venda_itens.venda_id and v.empresa_id=erp_current_empresa_id()) and erp_has_permission('vendas','editar'));
create policy erp_venda_itens_rbac_delete on public.erp_venda_itens for delete to authenticated using (exists(select 1 from public.erp_vendas v where v.id=erp_venda_itens.venda_id and v.empresa_id=erp_current_empresa_id()) and erp_has_permission('vendas','excluir'));
