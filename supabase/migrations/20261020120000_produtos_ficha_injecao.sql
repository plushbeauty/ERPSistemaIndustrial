-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Ficha técnica base de injeção associada ao cadastro de produtos.
-- Execute após confirmar backup e validar o ambiente-alvo.
ALTER TABLE public.erp_produtos
  ADD COLUMN IF NOT EXISTS molde_codigo varchar(50),
  ADD COLUMN IF NOT EXISTS cavidades integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS resina_tipo varchar(100),
  ADD COLUMN IF NOT EXISTS cor_resina varchar(50),
  ADD COLUMN IF NOT EXISTS temp_bico_padrao integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS tempo_ciclo_padrao numeric(5,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.erp_produtos
  ADD CONSTRAINT erp_produtos_cavidades_positive
  CHECK (cavidades >= 1) NOT VALID;

ALTER TABLE public.erp_produtos
  VALIDATE CONSTRAINT erp_produtos_cavidades_positive;
