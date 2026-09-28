-- ERP Industrial: Master universal uses nivel_admin 100 and anonymous access is removed from tenant ERP policies.
alter table public.erp_usuarios drop constraint if exists chk_erp_master_identity;

update public.erp_usuarios
set nivel_admin = 100
where is_master = true
  and upper(coalesce(perfil,'')) = 'MASTER'
  and empresa_id is null
  and nivel_admin = 9;

alter table public.erp_usuarios add constraint chk_erp_master_identity check (
  (
    is_master = true
    and empresa_id is null
    and setor_id is null
    and perfil = 'MASTER'
    and nivel_admin = 100
    and auth_user_id is not null
  )
  or
  (
    is_master = false
    and empresa_id is not null
    and auth_user_id is not null
    and ativo is not null
    and nivel_admin <> 100
  )
);

alter policy "erp_bk_ap_tenant" on public.erp_bloco_k_apontamentos to authenticated;
alter policy "erp_bk_bom_tenant" on public.erp_bloco_k_bom to authenticated;
alter policy "erp_bk_stock_tenant" on public.erp_bloco_k_estoque to authenticated;
alter policy "erp_cc_tenant" on public.erp_centros_custos to authenticated;
alter policy "erp_cf_tenant" on public.erp_custos_fixos to authenticated;
alter policy "erp_desenhos_delete" on public.erp_desenhos to authenticated;
alter policy "erp_desenhos_insert" on public.erp_desenhos to authenticated;
alter policy "erp_desenhos_select" on public.erp_desenhos to authenticated;
alter policy "erp_desenhos_update" on public.erp_desenhos to authenticated;
alter policy "erp_desenhos_codigos_delete" on public.erp_desenhos_codigos to authenticated;
alter policy "erp_desenhos_codigos_insert" on public.erp_desenhos_codigos to authenticated;
alter policy "erp_desenhos_codigos_select" on public.erp_desenhos_codigos to authenticated;
alter policy "erp_desenhos_codigos_update" on public.erp_desenhos_codigos to authenticated;
alter policy "permissions_select" on public.erp_permissions to authenticated;
alter policy "role_permissions_select" on public.erp_role_permissions to authenticated;
alter policy "roles_select" on public.erp_roles to authenticated;
alter policy "erp_acl_tenant" on public.erp_usuarios_acl_modulos to authenticated;
