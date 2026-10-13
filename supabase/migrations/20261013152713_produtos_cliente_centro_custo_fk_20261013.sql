-- Relacionamentos reais e isolados por empresa para cliente principal e centro de custo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_clientes_empresa_id_id ON public.erp_clientes(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_centros_custos_empresa_id_id ON public.erp_centros_custos(empresa_id,id);
ALTER TABLE public.erp_produtos
  ADD COLUMN IF NOT EXISTS cliente_principal_id uuid,
  ADD COLUMN IF NOT EXISTS centro_custo_produto_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_produtos_cliente_principal_tenant_fk') THEN
    ALTER TABLE public.erp_produtos
      ADD CONSTRAINT erp_produtos_cliente_principal_tenant_fk
      FOREIGN KEY (empresa_id,cliente_principal_id)
      REFERENCES public.erp_clientes(empresa_id,id)
      ON DELETE SET NULL (cliente_principal_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_produtos_centro_custo_tenant_fk') THEN
    ALTER TABLE public.erp_produtos
      ADD CONSTRAINT erp_produtos_centro_custo_tenant_fk
      FOREIGN KEY (empresa_id,centro_custo_produto_id)
      REFERENCES public.erp_centros_custos(empresa_id,id)
      ON DELETE SET NULL (centro_custo_produto_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_erp_produtos_cliente_principal ON public.erp_produtos(empresa_id,cliente_principal_id) WHERE cliente_principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_produtos_centro_custo ON public.erp_produtos(empresa_id,centro_custo_produto_id) WHERE centro_custo_produto_id IS NOT NULL;