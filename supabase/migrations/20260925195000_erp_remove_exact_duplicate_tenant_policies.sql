-- Remove only exact duplicate tenant policies whose definitions are identical.
-- Functional access remains unchanged.
drop policy if exists erp_centros_custos_tenant on public.erp_centros_custos;
drop policy if exists erp_custos_fixos_tenant on public.erp_custos_fixos;
