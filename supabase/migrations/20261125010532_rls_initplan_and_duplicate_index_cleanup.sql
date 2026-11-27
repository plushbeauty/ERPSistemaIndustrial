begin;
drop policy if exists erp_doc_qual_leituras_update_own on public.erp_documentos_qualidade_leituras;
create policy erp_doc_qual_leituras_update_own on public.erp_documentos_qualidade_leituras
for update to authenticated
using (
 empresa_id=(select public.erp_current_empresa_id())
 and usuario_id=(
  select u.id from public.erp_usuarios u
  where u.auth_user_id=(select auth.uid())
    and u.empresa_id=(select public.erp_current_empresa_id())
    and u.ativo=true and u.deleted_at is null
  limit 1
 )
)
with check (
 empresa_id=(select public.erp_current_empresa_id())
 and usuario_id=(
  select u.id from public.erp_usuarios u
  where u.auth_user_id=(select auth.uid())
    and u.empresa_id=(select public.erp_current_empresa_id())
    and u.ativo=true and u.deleted_at is null
  limit 1
 )
);

drop index if exists public.idx_erp_pedido_venda_itens_empresa_produto;
drop index if exists public.uq_erp_qualidade_liberacao_lotes_operacional;
commit;
notify pgrst,'reload schema';
