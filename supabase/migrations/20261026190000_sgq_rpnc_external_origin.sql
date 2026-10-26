begin;

-- Adds an explicit external / supplier classification to the existing RPNC
-- type contract. All other categories reuse the established SGQ values.
alter table public.erp_rpnc
  drop constraint if exists erp_rpnc_sgq_tipo_registro_check;

alter table public.erp_rpnc
  add constraint erp_rpnc_sgq_tipo_registro_check
  check (
    sgq_tipo_registro is null
    or sgq_tipo_registro in (
      'INTERNO',
      'EXTERNO',
      'AUDITORIA_INTERNA',
      'AUDITORIA_EXTERNA',
      'RPNC_CLIENTE',
      'RPNC_PROCESSO'
    )
  );

comment on constraint erp_rpnc_sgq_tipo_registro_check on public.erp_rpnc is
  'Classificação de origem da RPNC: interno, externo, auditorias, reclamação de cliente ou processo.';

commit;
