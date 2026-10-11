create table if not exists public.erp_qualidade_controles_injetora (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ordem_producao_id uuid null references public.erp_ordens_producao(id) on delete set null,
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  operador_id uuid not null references public.erp_usuarios(id) on delete restrict,
  produto_id uuid null references public.erp_produtos(id) on delete set null,
  lote_id uuid null references public.erp_estoque_lotes(id) on delete set null,
  data_producao date not null default current_date,
  turno text null,
  hora_inicio time null,
  hora_fim time null,
  quantidade_injecoes integer not null default 0 check (quantidade_injecoes >= 0),
  numero_cavidades integer not null default 1 check (numero_cavidades > 0),
  quantidade_total_pecas numeric not null default 0 check (quantidade_total_pecas >= 0),
  material_anterior text null, material_atual text null, cor_anterior text null, cor_atual text null,
  limpeza_cilindro_confirmada boolean not null default false,
  limpeza_funil_confirmada boolean not null default false,
  purga_sem_residuo_confirmada boolean not null default false,
  borra_descartada boolean not null default false,
  pom_procedimento_confirmado boolean not null default false,
  pom_guilhotina_fechada boolean not null default false,
  pom_residuo_consumido boolean not null default false,
  pecas_iniciais_segregadas boolean not null default false,
  ficha_processo_disponivel boolean not null default false,
  checklist_maquina_ok boolean not null default false,
  molde_verificado boolean not null default false,
  comparacao_amostra_padrao boolean not null default false,
  liberacao_qualidade boolean not null default false,
  liberacao_provisoria boolean not null default false,
  responsavel_liberacao_id uuid null references public.erp_usuarios(id) on delete set null,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','AGUARDANDO_QUALIDADE','LIBERADO','LIBERACAO_PROVISORIA','EM_PRODUCAO','ENCERRADO','BLOQUEADO')),
  observacoes text null, criado_por uuid null references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists ix_erp_qualidade_injetora_empresa_data on public.erp_qualidade_controles_injetora(empresa_id,data_producao desc,criado_em desc);
create index if not exists ix_erp_qualidade_injetora_maquina on public.erp_qualidade_controles_injetora(empresa_id,maquina_id,data_producao desc);
alter table public.erp_qualidade_controles_injetora enable row level security;
drop policy if exists erp_qci_select_tenant on public.erp_qualidade_controles_injetora;
drop policy if exists erp_qci_insert_tenant on public.erp_qualidade_controles_injetora;
drop policy if exists erp_qci_update_tenant on public.erp_qualidade_controles_injetora;
drop policy if exists erp_qci_delete_tenant on public.erp_qualidade_controles_injetora;
create policy erp_qci_select_tenant on public.erp_qualidade_controles_injetora for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qci_insert_tenant on public.erp_qualidade_controles_injetora for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qci_update_tenant on public.erp_qualidade_controles_injetora for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qci_delete_tenant on public.erp_qualidade_controles_injetora for delete to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create table if not exists public.erp_qualidade_injetora_paradas (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  controle_id uuid not null references public.erp_qualidade_controles_injetora(id) on delete cascade,
  hora_parada time not null, hora_retorno time null,
  motivo text not null check (length(trim(motivo)) >= 3),
  criado_por uuid null references auth.users(id) on delete set null, criado_em timestamptz not null default now(),
  check (hora_retorno is null or hora_retorno >= hora_parada)
);
create index if not exists ix_erp_qci_paradas_controle on public.erp_qualidade_injetora_paradas(empresa_id,controle_id,hora_parada);
alter table public.erp_qualidade_injetora_paradas enable row level security;
drop policy if exists erp_qcip_select_tenant on public.erp_qualidade_injetora_paradas;
drop policy if exists erp_qcip_insert_tenant on public.erp_qualidade_injetora_paradas;
drop policy if exists erp_qcip_update_tenant on public.erp_qualidade_injetora_paradas;
drop policy if exists erp_qcip_delete_tenant on public.erp_qualidade_injetora_paradas;
create policy erp_qcip_select_tenant on public.erp_qualidade_injetora_paradas for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcip_insert_tenant on public.erp_qualidade_injetora_paradas for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcip_update_tenant on public.erp_qualidade_injetora_paradas for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcip_delete_tenant on public.erp_qualidade_injetora_paradas for delete to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create table if not exists public.erp_qualidade_injetora_amostras (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  controle_id uuid not null references public.erp_qualidade_controles_injetora(id) on delete cascade,
  numero_injecao integer not null check (numero_injecao > 0),
  quantidade_inspecionada integer not null default 2 check (quantidade_inspecionada > 0),
  resultado text not null check (resultado in ('APROVADO','REPROVADO')),
  defeitos_observados text null, material_segregado boolean not null default false,
  criado_por uuid null references auth.users(id) on delete set null, criado_em timestamptz not null default now(),
  unique (controle_id,numero_injecao),
  check (resultado <> 'REPROVADO' or (length(trim(coalesce(defeitos_observados,''))) > 0 and material_segregado))
);
create index if not exists ix_erp_qci_amostras_controle on public.erp_qualidade_injetora_amostras(empresa_id,controle_id,numero_injecao);
alter table public.erp_qualidade_injetora_amostras enable row level security;
drop policy if exists erp_qcia_select_tenant on public.erp_qualidade_injetora_amostras;
drop policy if exists erp_qcia_insert_tenant on public.erp_qualidade_injetora_amostras;
drop policy if exists erp_qcia_update_tenant on public.erp_qualidade_injetora_amostras;
drop policy if exists erp_qcia_delete_tenant on public.erp_qualidade_injetora_amostras;
create policy erp_qcia_select_tenant on public.erp_qualidade_injetora_amostras for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcia_insert_tenant on public.erp_qualidade_injetora_amostras for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcia_update_tenant on public.erp_qualidade_injetora_amostras for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_qcia_delete_tenant on public.erp_qualidade_injetora_amostras for delete to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
