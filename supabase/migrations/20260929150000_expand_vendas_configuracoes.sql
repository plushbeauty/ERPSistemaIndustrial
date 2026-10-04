alter table public.erp_vendas_configuracoes
  add column if not exists tolerancia_variacao_quantidade_percentual numeric not null default 0,
  add column if not exists margem_contribuicao_minima_percentual numeric not null default 0,
  add column if not exists bloquear_preco_abaixo_tabela boolean not null default false,
  add column if not exists permitir_venda_sem_estoque_mto boolean not null default false,
  add column if not exists reservar_estoque_ao_aprovar boolean not null default false,
  add column if not exists gerar_op_automaticamente boolean not null default false,
  add column if not exists bloquear_cliente_titulo_vencido boolean not null default false,
  add column if not exists bloquear_excesso_limite_credito boolean not null default false;

grant select,insert,update,delete on public.erp_vendas_configuracoes to authenticated;
