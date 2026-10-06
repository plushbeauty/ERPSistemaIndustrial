begin;

-- Remove the legacy RLS dependency on editable auth.user_metadata.
drop policy if exists "Isolamento Estrito por Empresa" on public.erp_usuarios_ponto;

create policy "erp_usuarios_ponto_tenant"
on public.erp_usuarios_ponto
for all
to authenticated
using (
  empresa_id = (select public.erp_current_empresa_id())
)
with check (
  empresa_id = (select public.erp_current_empresa_id())
);

commit;
