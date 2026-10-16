begin;

alter table public.erp_produtos
  add column if not exists roteiro_padrao_codigo varchar(10),
  add column if not exists estrutura_bom_codigo varchar(15),
  add column if not exists permite_subcontrato boolean not null default false,
  add column if not exists requer_rastreabilidade boolean not null default false,
  add column if not exists tipo_abastecimento varchar(12) not null default 'PULL',
  add column if not exists almoxarifado_wip_codigo varchar(6),
  add column if not exists centro_trabalho_codigo varchar(8),
  add column if not exists tempo_setup_min numeric(10,2) not null default 0,
  add column if not exists capacidade_ciclo numeric(10,2) not null default 1,
  add column if not exists alerta_maquina boolean not null default false;

alter table public.erp_produtos
  drop constraint if exists erp_produtos_tipo_abastecimento_check;
alter table public.erp_produtos
  add constraint erp_produtos_tipo_abastecimento_check
  check (tipo_abastecimento in ('PULL','PUSH'));

alter table public.erp_produtos
  drop constraint if exists erp_produtos_producao_parametros_check;
alter table public.erp_produtos
  add constraint erp_produtos_producao_parametros_check
  check (tempo_setup_min >= 0 and capacidade_ciclo > 0);

comment on column public.erp_produtos.roteiro_padrao_codigo is 'Código de roteiro padrão selecionado no cadastro mestre de PCP.';
comment on column public.erp_produtos.estrutura_bom_codigo is 'Código de estrutura BOM associado ao produto.';
comment on column public.erp_produtos.permite_subcontrato is 'Indica se o produto permite operação industrial terceirizada.';
comment on column public.erp_produtos.requer_rastreabilidade is 'Indica exigência de rastreabilidade na produção.';
comment on column public.erp_produtos.tipo_abastecimento is 'Política de abastecimento de produção: PULL ou PUSH.';
comment on column public.erp_produtos.almoxarifado_wip_codigo is 'Código do almoxarifado de material em processo selecionado no WMS.';
comment on column public.erp_produtos.centro_trabalho_codigo is 'Código do centro de trabalho padrão.';
comment on column public.erp_produtos.tempo_setup_min is 'Tempo de setup padrão em minutos.';
comment on column public.erp_produtos.capacidade_ciclo is 'Quantidade de unidades processadas por ciclo.';
comment on column public.erp_produtos.alerta_maquina is 'Indica se o produto exige alertas operacionais de máquina.';

commit;
