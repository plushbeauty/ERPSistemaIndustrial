-- Complementa o domínio de categorias da ficha de processo restaurada do arquivo aprovado.
-- Seguro para reexecução; não altera dados existentes nem remove categorias.
begin;
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
commit;
