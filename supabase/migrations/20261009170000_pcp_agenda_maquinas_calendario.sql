begin;

create table if not exists public.erp_pcp_calendario_trabalho (
  empresa_id uuid primary key default public.erp_current_empresa_id(),
  dias_trabalho text[] not null default array['seg','ter','qua','qui','sex']::text[],
  horario_inicio_jornada time not null default '06:00',
  horario_fim_jornada time not null default '22:00',
  updated_at timestamptz not null default now(),
  constraint erp_pcp_calendario_dias_validos check (
    dias_trabalho <@ array['seg','ter','qua','qui','sex','sab','dom']::text[]
  ),
  constraint erp_pcp_calendario_horario_valido check (horario_fim_jornada > horario_inicio_jornada)
);
alter table public.erp_pcp_calendario_trabalho enable row level security;
drop policy if exists erp_pcp_calendario_tenant on public.erp_pcp_calendario_trabalho;
create policy erp_pcp_calendario_tenant on public.erp_pcp_calendario_trabalho
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

create table if not exists public.pcp_agenda_maquinas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id) on delete restrict,
  molde_id uuid references public.erp_moldes(id) on delete restrict,
  quantidade_programada numeric(18,6) not null check (quantidade_programada > 0),
  lote_producao text,
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz not null,
  status text not null default 'planejada' check (status in ('planejada','confirmada','em_execucao','concluida','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pcp_agenda_intervalo_valido check (data_hora_fim > data_hora_inicio)
);
create index if not exists idx_pcp_agenda_maquina_tempo
  on public.pcp_agenda_maquinas (empresa_id, maquina_id, data_hora_inicio, data_hora_fim)
  where status <> 'cancelada';
create index if not exists idx_pcp_agenda_ordem
  on public.pcp_agenda_maquinas (empresa_id, ordem_producao_id, status);
alter table public.pcp_agenda_maquinas enable row level security;
drop policy if exists pcp_agenda_maquinas_tenant on public.pcp_agenda_maquinas;
create policy pcp_agenda_maquinas_tenant on public.pcp_agenda_maquinas
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_pcp_validar_agenda_maquina()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'PCP_TENANT_MISMATCH';
  end if;
  if not exists (select 1 from public.erp_maquinas m where m.id=new.maquina_id and m.empresa_id=new.empresa_id and m.ativo=true) then
    raise exception 'PCP_MAQUINA_INATIVA_OU_FORA_DA_EMPRESA';
  end if;
  if not exists (select 1 from public.erp_ordens_producao o where o.id=new.ordem_producao_id and o.empresa_id=new.empresa_id) then
    raise exception 'PCP_OP_FORA_DA_EMPRESA';
  end if;
  if new.molde_id is not null and not exists (select 1 from public.erp_moldes mo where mo.id=new.molde_id and mo.empresa_id=new.empresa_id and mo.ativo=true) then
    raise exception 'PCP_MOLDE_INATIVO_OU_FORA_DA_EMPRESA';
  end if;
  if new.data_hora_fim <= new.data_hora_inicio then raise exception 'PCP_INTERVALO_INVALIDO'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.empresa_id::text || ':' || new.maquina_id::text, 0));
  if new.status <> 'cancelada' and exists (
    select 1 from public.pcp_agenda_maquinas a
     where a.empresa_id=new.empresa_id and a.maquina_id=new.maquina_id
       and a.status <> 'cancelada' and a.id <> coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
       and tstzrange(a.data_hora_inicio,a.data_hora_fim,'[)') && tstzrange(new.data_hora_inicio,new.data_hora_fim,'[)')
  ) then raise exception 'PCP_CONFLITO_CAPACIDADE: máquina já possui programação neste intervalo'; end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists trg_erp_pcp_validar_agenda_maquina on public.pcp_agenda_maquinas;
create trigger trg_erp_pcp_validar_agenda_maquina before insert or update on public.pcp_agenda_maquinas
for each row execute function public.erp_pcp_validar_agenda_maquina();
commit;
