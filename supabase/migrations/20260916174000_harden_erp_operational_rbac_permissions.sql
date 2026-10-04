-- Hardens tenant CRUD authorization for core ERP operational tables.
-- MASTER remains allowed through erp_has_permission().

insert into public.erp_permissions (codigo,nome,modulo,ativo) values
  ('clientes.ver','Visualizar clientes','clientes',true),
  ('clientes.criar','Criar clientes','clientes',true),
  ('clientes.editar','Editar clientes','clientes',true),
  ('clientes.excluir','Excluir clientes','clientes',true),
  ('fornecedores.ver','Visualizar fornecedores','fornecedores',true),
  ('fornecedores.criar','Criar fornecedores','fornecedores',true),
  ('fornecedores.editar','Editar fornecedores','fornecedores',true),
  ('fornecedores.excluir','Excluir fornecedores','fornecedores',true),
  ('produtos.excluir','Excluir produtos','produtos',true),
  ('producao.excluir','Excluir ordens de produção','producao',true)
on conflict (codigo) do update set nome=excluded.nome,modulo=excluded.modulo,ativo=true;

insert into public.erp_role_permissions(role_id,permission_id)
select r.id,p.id
from public.erp_roles r
cross join public.erp_permissions p
where r.nome in ('Master','Administrativo','Gestor')
  and p.codigo in (
    'clientes.ver','clientes.criar','clientes.editar','clientes.excluir',
    'fornecedores.ver','fornecedores.criar','fornecedores.editar','fornecedores.excluir',
    'produtos.excluir','producao.excluir'
  )
on conflict do nothing;

drop policy if exists erp_clientes_tenant_authenticated on public.erp_clientes;
create policy erp_clientes_tenant_select on public.erp_clientes for select to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('clientes','ver'));
create policy erp_clientes_tenant_insert on public.erp_clientes for insert to authenticated
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('clientes','criar'));
create policy erp_clientes_tenant_update on public.erp_clientes for update to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('clientes','editar'))
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('clientes','editar'));
create policy erp_clientes_tenant_delete on public.erp_clientes for delete to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('clientes','excluir'));

drop policy if exists erp_fornecedores_tenant_authenticated on public.erp_fornecedores;
create policy erp_fornecedores_tenant_select on public.erp_fornecedores for select to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('fornecedores','ver'));
create policy erp_fornecedores_tenant_insert on public.erp_fornecedores for insert to authenticated
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('fornecedores','criar'));
create policy erp_fornecedores_tenant_update on public.erp_fornecedores for update to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('fornecedores','editar'))
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('fornecedores','editar'));
create policy erp_fornecedores_tenant_delete on public.erp_fornecedores for delete to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('fornecedores','excluir'));

drop policy if exists erp_produtos_tenant_authenticated on public.erp_produtos;
create policy erp_produtos_tenant_select on public.erp_produtos for select to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('produtos','ver'));
create policy erp_produtos_tenant_insert on public.erp_produtos for insert to authenticated
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('produtos','criar'));
create policy erp_produtos_tenant_update on public.erp_produtos for update to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('produtos','editar'))
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('produtos','editar'));
create policy erp_produtos_tenant_delete on public.erp_produtos for delete to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('produtos','excluir'));

drop policy if exists erp_ordens_producao_tenant_authenticated on public.erp_ordens_producao;
create policy erp_ordens_producao_tenant_select on public.erp_ordens_producao for select to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('producao','ver'));
create policy erp_ordens_producao_tenant_insert on public.erp_ordens_producao for insert to authenticated
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('producao','criar'));
create policy erp_ordens_producao_tenant_update on public.erp_ordens_producao for update to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('producao','editar'))
with check (empresa_id=erp_current_empresa_id() and erp_has_permission('producao','editar'));
create policy erp_ordens_producao_tenant_delete on public.erp_ordens_producao for delete to authenticated
using (empresa_id=erp_current_empresa_id() and erp_has_permission('producao','excluir'));
