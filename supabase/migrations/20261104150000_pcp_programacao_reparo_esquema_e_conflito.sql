-- Reparo de esquema: erp_pcp_programacoes
--
-- 20260923190000_pcp_programacao_finita_v2.sql faz ALTER TABLE IF EXISTS nesta tabela, mas nenhuma
-- migration do repositorio a cria. O v2 inteiro virou no-op silencioso em banco novo, e seis telas
-- (PCPIndustrial, PCPPlanejamentoIndustrial, PCPAreaFuncionario, PCPProgramacaoGantt, dashboard e
-- ConfiguracaoLotePCP) alem da baixa do MES consultam a tabela. Este arquivo cria a tabela com o
-- contrato exato que o frontend usa e acrescenta a trava de conflito que so existia no navegador.
--
-- Ordem do proprietario em 2026-11-04: "verificar todas as pendencias e arrumar".
-- Nao apaga nem reescreve dados de producao: apenas cria se falta, adiciona colunas que faltam e
-- aplica translate/lower no status (mesma palavra, grafia canonica).
begin;

create table if not exists public.erp_pcp_programacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ordem_producao_id uuid references public.erp_ordens_producao(id) on delete restrict,
  maquina_id uuid references public.erp_maquinas(id) on delete restrict,
  produto_id uuid references public.erp_produtos(id) on delete restrict,
  molde_id uuid references public.erp_moldes(id) on delete restrict,
  operador_frente_id uuid references public.erp_funcionarios(id) on delete restrict,
  operador_atras_id uuid references public.erp_funcionarios(id) on delete restrict,
  inicio_planejado timestamptz not null,
  fim_planejado timestamptz not null,
  quantidade_planejada numeric(18,6) not null default 0 check (quantidade_planejada >= 0),
  quantidade_produzida numeric(18,6) not null default 0 check (quantidade_produzida >= 0),
  quantidade_refugada numeric(18,6) not null default 0 check (quantidade_refugada >= 0),
  turnos smallint not null default 1 check (turnos > 0),
  horas_turno numeric(8,2) not null default 8 check (horas_turno > 0),
  eficiencia_percent numeric(5,2) not null default 85 check (eficiencia_percent > 0 and eficiencia_percent <= 100),
  ciclo_seg numeric(12,3) not null default 0 check (ciclo_seg >= 0),
  cavidades_ativas integer not null default 1 check (cavidades_ativas > 0),
  setup_min numeric(12,2) not null default 0 check (setup_min >= 0),
  status text not null default 'planejada' check (status <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_pcp_programacoes_intervalo_ck check (fim_planejado > inicio_planejado)
);

-- Converge um banco que ja tenha a tabela criada a mao, sem a v2.
alter table public.erp_pcp_programacoes add column if not exists molde_id uuid references public.erp_moldes(id) on delete restrict;
alter table public.erp_pcp_programacoes add column if not exists operador_frente_id uuid references public.erp_funcionarios(id) on delete restrict;
alter table public.erp_pcp_programacoes add column if not exists operador_atras_id uuid references public.erp_funcionarios(id) on delete restrict;
alter table public.erp_pcp_programacoes add column if not exists turnos smallint not null default 1 check (turnos > 0);
alter table public.erp_pcp_programacoes add column if not exists horas_turno numeric(8,2) not null default 8 check (horas_turno > 0);
alter table public.erp_pcp_programacoes add column if not exists eficiencia_percent numeric(5,2) not null default 85 check (eficiencia_percent > 0 and eficiencia_percent <= 100);
alter table public.erp_pcp_programacoes add column if not exists ciclo_seg numeric(12,3) not null default 0 check (ciclo_seg >= 0);
alter table public.erp_pcp_programacoes add column if not exists cavidades_ativas integer not null default 1 check (cavidades_ativas > 0);
alter table public.erp_pcp_programacoes add column if not exists setup_min numeric(12,2) not null default 0 check (setup_min >= 0);
alter table public.erp_pcp_programacoes add column if not exists quantidade_refugada numeric(18,6) not null default 0 check (quantidade_refugada >= 0);
alter table public.erp_pcp_programacoes add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_erp_pcp_prog_empresa_inicio
  on public.erp_pcp_programacoes (empresa_id, inicio_planejado, fim_planejado);
create index if not exists idx_erp_pcp_prog_maquina_inicio
  on public.erp_pcp_programacoes (maquina_id, inicio_planejado, fim_planejado);
create index if not exists idx_erp_pcp_prog_molde_inicio
  on public.erp_pcp_programacoes (molde_id, inicio_planejado, fim_planejado);
create index if not exists idx_erp_pcp_prog_operador_frente
  on public.erp_pcp_programacoes (operador_frente_id, inicio_planejado, fim_planejado);
create index if not exists idx_erp_pcp_prog_operador_atras
  on public.erp_pcp_programacoes (operador_atras_id, inicio_planejado, fim_planejado);
-- O filtro das telas e "status <> cancelada"; o indice parcial cobre exatamente esse caminho.
create index if not exists idx_erp_pcp_prog_ativa
  on public.erp_pcp_programacoes (empresa_id, maquina_id, inicio_planejado, fim_planejado)
  where lower(status) <> 'cancelada';

-- O PCP escrevia 'Cancelada' e as telas filtravam 'cancelada': em Postgres a comparacao e
-- sensivel a caixa, entao a programacao cancelada continuava contando como capacidade ocupada.
-- Canonicaliza o status na gravacao e uniformiza o que ja existe.
create or replace function public.erp_pcp_normalizar_status_programacao()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.status := lower(translate(btrim(new.status),
    'áàâäãéèêëíìîïóòôöõúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'));
  return new;
end;
$$;

drop trigger if exists trg_erp_pcp_normalizar_status_programacao on public.erp_pcp_programacoes;
create trigger trg_erp_pcp_normalizar_status_programacao
  before insert or update on public.erp_pcp_programacoes
  for each row execute function public.erp_pcp_normalizar_status_programacao();

-- O histórico pode ter sido gravado antes desta migration, com a grafia que o navegador usava.
update public.erp_pcp_programacoes
   set status = lower(translate(btrim(status),
     'áàâäãéèêëíìîïóòôöõúùûüç',
     'aaaaaeeeeiiiiooooouuuuc'))
 where status is not null
   and status <> lower(translate(btrim(status),
     'áàâäãéèêëíìîïóòôöõúùûüç',
     'aaaaaeeeeiiiiooooouuuuc'));

-- Trava de conflito no servidor: o navegador ja conferia, mas duas telas abertas gravavam
-- sobreposicao. O advisory lock fecha a janela entre a leitura e a escrita.
-- As duas triggers BEFORE deste arquivo têm a mesma hora de disparo, entao o Postgres as ordena
-- pelo nome ('normalizar' antes de 'validar'). Nao dependa dessa ordem: o validador normaliza o
-- status por conta propria, assim renomear qualquer um dos dois nao reabre o bug do maiusculo.
create or replace function public.erp_pcp_validar_programacao_finita()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'PCP_TENANT_MISMATCH';
  end if;
  if new.fim_planejado <= new.inicio_planejado then
    raise exception 'PCP_INTERVALO_INVALIDO';
  end if;
  if new.ordem_producao_id is not null and not exists (
    select 1 from public.erp_ordens_producao o
     where o.id = new.ordem_producao_id and o.empresa_id = new.empresa_id
  ) then
    raise exception 'PCP_OP_FORA_DA_EMPRESA';
  end if;
  if new.produto_id is not null and not exists (
    select 1 from public.erp_produtos p
     where p.id = new.produto_id and p.empresa_id = new.empresa_id
  ) then
    raise exception 'PCP_PRODUTO_FORA_DA_EMPRESA';
  end if;

  if new.maquina_id is not null then
    if not exists (
      select 1 from public.erp_maquinas m
       where m.id = new.maquina_id and m.empresa_id = new.empresa_id
    ) then
      raise exception 'PCP_MAQUINA_FORA_DA_EMPRESA';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('pcp_prog_maquina:' || new.maquina_id::text, 0));
    if lower(btrim(new.status)) <> 'cancelada' and exists (
      select 1 from public.erp_pcp_programacoes a
       where a.empresa_id = new.empresa_id
         and a.maquina_id = new.maquina_id
         and lower(a.status) <> 'cancelada'
         and a.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
         and tstzrange(a.inicio_planejado, a.fim_planejado, '[)') &&
             tstzrange(new.inicio_planejado, new.fim_planejado, '[)')
    ) then
      raise exception 'PCP_CONFLITO_CAPACIDADE: a máquina já possui programação neste intervalo';
    end if;
  end if;

  if new.molde_id is not null then
    if not exists (
      select 1 from public.erp_moldes mo
       where mo.id = new.molde_id and mo.empresa_id = new.empresa_id
    ) then
      raise exception 'PCP_MOLDE_FORA_DA_EMPRESA';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('pcp_prog_molde:' || new.molde_id::text, 0));
    if lower(btrim(new.status)) <> 'cancelada' and exists (
      select 1 from public.erp_pcp_programacoes b
       where b.empresa_id = new.empresa_id
         and b.molde_id = new.molde_id
         and lower(b.status) <> 'cancelada'
         and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
         and tstzrange(b.inicio_planejado, b.fim_planejado, '[)') &&
             tstzrange(new.inicio_planejado, new.fim_planejado, '[)')
    ) then
      raise exception 'PCP_CONFLITO_MOLDE: o mesmo molde já está programado neste intervalo';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_erp_pcp_validar_programacao_finita on public.erp_pcp_programacoes;
create trigger trg_erp_pcp_validar_programacao_finita
  before insert or update on public.erp_pcp_programacoes
  for each row execute function public.erp_pcp_validar_programacao_finita();

alter table public.erp_pcp_programacoes enable row level security;

drop policy if exists erp_pcp_programacoes_select on public.erp_pcp_programacoes;
create policy erp_pcp_programacoes_select on public.erp_pcp_programacoes
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_programacoes_insert on public.erp_pcp_programacoes;
create policy erp_pcp_programacoes_insert on public.erp_pcp_programacoes
  for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_programacoes_update on public.erp_pcp_programacoes;
create policy erp_pcp_programacoes_update on public.erp_pcp_programacoes
  for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_programacoes_delete on public.erp_pcp_programacoes;
create policy erp_pcp_programacoes_delete on public.erp_pcp_programacoes
  for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.erp_pcp_programacoes to authenticated;

comment on table public.erp_pcp_programacoes is
  'Programação finita do PCP por máquina, molde, ciclo e equipe; RLS por empresa da sessão.';
comment on function public.erp_pcp_validar_programacao_finita() is
  'Valida tenant, intervalo, vínculo de OP/produto/máquina/molde e impede sobreposição de agenda.';
comment on function public.erp_pcp_normalizar_status_programacao() is
  'Grava o status em minúsculas sem acento para os filtros das telas casarem.';

commit;
