-- Impede que um produto de uma empresa aponte para máquina de outra empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_maquinas_empresa_id_id
  ON public.erp_maquinas(empresa_id,id);
ALTER TABLE public.erp_produtos
  DROP CONSTRAINT IF EXISTS erp_produtos_maquina_preferencial_id_fkey;
ALTER TABLE public.erp_produtos
  ADD CONSTRAINT erp_produtos_maquina_preferencial_tenant_fk
  FOREIGN KEY (empresa_id,maquina_preferencial_id)
  REFERENCES public.erp_maquinas(empresa_id,id)
  ON DELETE SET NULL (maquina_preferencial_id);