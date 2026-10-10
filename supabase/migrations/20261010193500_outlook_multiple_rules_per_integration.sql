-- Records the schema refinement applied after initial Outlook setup.
-- Multiple capture rules may belong to a single integration.
alter table public.outlook_regras_pedidos
  drop constraint if exists outlook_regras_empresa_integracao_unique;
