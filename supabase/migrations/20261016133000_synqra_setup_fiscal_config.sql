begin;

alter table public.erp_config_fiscal
  add column if not exists aliquota_icms_padrao numeric(5,2) not null default 0,
  add column if not exists aliquota_simples numeric(5,2) not null default 0,
  add column if not exists indicador_ie_destinatario text not null default '1',
  add column if not exists serie_nfe_filial integer not null default 1,
  add column if not exists cfop_padrao_venda text,
  add column if not exists cfop_padrao_devolucao text;

alter table public.erp_config_fiscal
  drop constraint if exists erp_config_fiscal_aliquota_icms_padrao_check,
  add constraint erp_config_fiscal_aliquota_icms_padrao_check
    check (aliquota_icms_padrao between 0 and 100),
  drop constraint if exists erp_config_fiscal_aliquota_simples_check,
  add constraint erp_config_fiscal_aliquota_simples_check
    check (aliquota_simples between 0 and 100),
  drop constraint if exists erp_config_fiscal_indicador_ie_destinatario_check,
  add constraint erp_config_fiscal_indicador_ie_destinatario_check
    check (indicador_ie_destinatario in ('1','2','9')),
  drop constraint if exists erp_config_fiscal_serie_nfe_filial_check,
  add constraint erp_config_fiscal_serie_nfe_filial_check
    check (serie_nfe_filial between 0 and 999),
  drop constraint if exists erp_config_fiscal_cfop_padrao_venda_check,
  add constraint erp_config_fiscal_cfop_padrao_venda_check
    check (cfop_padrao_venda is null or cfop_padrao_venda ~ '^[0-9]{4}$'),
  drop constraint if exists erp_config_fiscal_cfop_padrao_devolucao_check,
  add constraint erp_config_fiscal_cfop_padrao_devolucao_check
    check (cfop_padrao_devolucao is null or cfop_padrao_devolucao ~ '^[0-9]{4}$');

commit;
