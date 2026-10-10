begin;

alter table public.erp_fichas_processo
  add column if not exists categoria_processo text not null default 'INJETADOS',
  add column if not exists versao_ficha integer not null default 1,
  add column if not exists data_homologacao date,
  add column if not exists assinatura_tecnica text,
  add column if not exists parametros_tecnicos jsonb not null default '{}'::jsonb;

alter table public.erp_fichas_processo
  drop constraint if exists erp_fichas_processo_categoria_check;
alter table public.erp_fichas_processo
  add constraint erp_fichas_processo_categoria_check
  check (categoria_processo in ('INJETADOS','PRENSADOS','ESTAMPARIA','MECANICA','TRATAMENTO_SUPERFICIAL','PINTURA_QUIMICA','CORTE_VINCO'));

alter table public.erp_fichas_processo
  drop constraint if exists erp_fichas_processo_versao_check;
alter table public.erp_fichas_processo
  add constraint erp_fichas_processo_versao_check check (versao_ficha > 0);

create index if not exists idx_erp_fichas_processo_categoria
  on public.erp_fichas_processo (empresa_id, categoria_processo, status);

comment on column public.erp_fichas_processo.parametros_tecnicos is
  'Parâmetros técnicos tipados por categoria de processo, critérios de setup, controle e segurança; versionados pela ficha.';
comment on column public.erp_fichas_processo.assinatura_tecnica is
  'Identificação declarada do responsável técnico pela homologação; a autenticação e trilha de auditoria permanecem sob controle das políticas existentes.';

commit;
