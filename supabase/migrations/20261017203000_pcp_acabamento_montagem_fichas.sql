begin;

-- Keep the existing ficha table and tenant/RLS model, extending only the
-- process categories represented by the PCP process-sheet screen.
alter table public.erp_fichas_processo
  drop constraint if exists erp_fichas_processo_categoria_check;

alter table public.erp_fichas_processo
  add constraint erp_fichas_processo_categoria_check
  check (categoria_processo in (
    'INJETADOS',
    'PRENSADOS',
    'ESTAMPARIA',
    'MECANICA',
    'TRATAMENTO_SUPERFICIAL',
    'PINTURA_QUIMICA',
    'CORTE_VINCO',
    'ACABAMENTO',
    'MONTAGEM_EMBALAGEM'
  ));

comment on constraint erp_fichas_processo_categoria_check on public.erp_fichas_processo is
  'Categorias válidas para fichas de processo PCP, incluindo acabamento e montagem/embalagem.';

commit;
