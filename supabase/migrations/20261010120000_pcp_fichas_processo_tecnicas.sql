begin;

alter table public.erp_fichas_processo
  add column if not exists codigo_cliente text,
  add column if not exists ferramenta_id uuid references public.erp_ferramentas_industriais(id) on delete set null,
  add column if not exists maquina_id uuid references public.erp_maquinas(id) on delete set null,
  add column if not exists cavidades_ativas integer not null default 1,
  add column if not exists revisao integer not null default 1,
  add column if not exists status text not null default 'RASCUNHO',
  add column if not exists forca_fechamento numeric(14,4),
  add column if not exists pressao_trabalho numeric(14,4),
  add column if not exists temperatura_trabalho numeric(10,3),
  add column if not exists pressao_injecao numeric(14,4),
  add column if not exists ciclo_seg numeric(12,4),
  add column if not exists peso_peca numeric(14,6),
  add column if not exists peso_canal numeric(14,6),
  add column if not exists zonas_temperatura jsonb not null default '{}'::jsonb,
  add column if not exists imagem_url text,
  add column if not exists observacoes_setup text,
  add column if not exists observacoes text,
  add column if not exists criado_por uuid,
  add column if not exists atualizado_por uuid,
  add column if not exists atualizado_em timestamptz not null default now(),
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

alter table public.erp_fichas_processo
  drop constraint if exists erp_fichas_processo_revisao_check;
alter table public.erp_fichas_processo
  add constraint erp_fichas_processo_revisao_check check (revisao > 0 and cavidades_ativas > 0);

alter table public.erp_fichas_processo
  drop constraint if exists erp_fichas_processo_status_check;
alter table public.erp_fichas_processo
  add constraint erp_fichas_processo_status_check
  check (status in ('RASCUNHO','EM_ANALISE','APROVADA','LIBERADA','OBSOLETA'));

create index if not exists idx_erp_fichas_processo_categoria
  on public.erp_fichas_processo (empresa_id, categoria_processo, status);
create index if not exists idx_erp_fichas_processo_maquina
  on public.erp_fichas_processo (empresa_id, maquina_id) where maquina_id is not null;
create index if not exists idx_erp_fichas_processo_ferramenta
  on public.erp_fichas_processo (empresa_id, ferramenta_id) where ferramenta_id is not null;

comment on column public.erp_fichas_processo.parametros_tecnicos is
  'Parâmetros técnicos tipados por categoria de processo, critérios de setup, controle e segurança; versionados pela ficha.';
comment on column public.erp_fichas_processo.assinatura_tecnica is
  'Identificação declarada do responsável técnico pela homologação; a autenticação e trilha de auditoria permanecem sob controle das políticas existentes.';

commit;