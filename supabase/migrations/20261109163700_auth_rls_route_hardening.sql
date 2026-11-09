-- SYSNQRA ERP INDUSTRIAL
-- AUTH / RLS hardening: tenant isolation, removal of temporary public reads,
-- safe RPC execution grants, and pinned search_path values.
-- No business rows are deleted or modified.

begin;

-- Tenant isolation for finance and customer records.
alter table public.erp_fluxo_caixa enable row level security;
drop policy if exists erp_fluxo_caixa_tenant_access on public.erp_fluxo_caixa;
create policy erp_fluxo_caixa_tenant_access
on public.erp_fluxo_caixa for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists "Permitir leitura pública temporária para testes" on public.erp_clientes;
drop policy if exists erp_tenant_isolation on public.erp_clientes;
drop policy if exists erp_clientes_tenant_access on public.erp_clientes;
create policy erp_clientes_tenant_access
on public.erp_clientes for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists "Permitir leitura para autenticados" on public.erp_usuarios;

-- Public status endpoint returns only server time and static service status.
alter function public.erp_data_servidor() security invoker;
alter function public.erp_data_servidor() set search_path = pg_catalog;
revoke all on function public.erp_data_servidor() from public;
grant execute on function public.erp_data_servidor() to anon, authenticated;

-- Legacy UUID overload must not reveal counts for another tenant.
create or replace function public.erp_access_control_overview(empresa_id uuid)
returns table(total_usuarios bigint, total_permissoes bigint)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_current_empresa_id() = $1) then
    raise exception 'Acesso negado à empresa solicitada.' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.erp_usuarios u where u.empresa_id = $1 and u.deleted_at is null),
    (select count(*) from public.erp_permissions p where p.ativo = true);
end;
$function$;
revoke all on function public.erp_access_control_overview(uuid) from public, anon;
grant execute on function public.erp_access_control_overview(uuid) to authenticated;

-- Trigger-only functions are not client RPC endpoints.
alter function public.erp_rpnc_sync_sgq_fields() set search_path = pg_catalog, public;
revoke all on function public.erp_rpnc_sync_sgq_fields() from public, anon, authenticated;
revoke all on function public.erp_initialize_trial() from public, anon, authenticated;

-- Keep legacy identity helpers available only to authenticated sessions.
alter function public.usuario_e_master() set search_path = pg_catalog, public;
alter function public.usuario_empresa_id() set search_path = pg_catalog, public;
revoke all on function public.usuario_e_master() from public, anon;
revoke all on function public.usuario_empresa_id() from public, anon;
grant execute on function public.usuario_e_master() to authenticated;
grant execute on function public.usuario_empresa_id() to authenticated;

-- Remove temporary public access to industrial machine and product data.
drop policy if exists "Leitura temporária maquinas" on public.erp_maquinas;
drop policy if exists "Leitura temporária produtos" on public.erp_produtos;
drop policy if exists erp_produtos_select on public.erp_produtos;
drop policy if exists erp_produtos_insert on public.erp_produtos;

create policy erp_produtos_tenant_select
on public.erp_produtos for select to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create policy erp_produtos_tenant_insert
on public.erp_produtos for insert to authenticated
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

commit;

notify pgrst, 'reload schema';
