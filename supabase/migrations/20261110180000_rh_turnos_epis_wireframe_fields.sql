-- RH: complementos operacionais de turnos e entregas de EPI.
-- Aditiva e idempotente; mantém as tabelas, chaves e políticas RLS existentes.
alter table public.rh_turnos
  add column if not exists dias_semana text[] not null default '{}',
  add column if not exists tolerancia_minutos integer not null default 10,
  add column if not exists adicional_noturno boolean not null default false;

alter table public.rh_turnos
  drop constraint if exists rh_turnos_escala_check;
alter table public.rh_turnos
  add constraint rh_turnos_escala_check
  check (escala = any (array['5x2','6x1','6x2','12x36','ADMINISTRATIVO']));

alter table public.rh_turnos
  add constraint rh_turnos_tolerancia_minutos_check
  check (tolerancia_minutos between 0 and 180);

alter table public.rh_entregas_epis
  add column if not exists numero_ca text,
  add column if not exists ca_valido_ate date,
  add column if not exists motivo_entrega text,
  add column if not exists termo_recebimento text,
  add column if not exists observacoes text,
  add column if not exists devolvido_em date;

-- CA e validade são gravados como snapshot da entrega, para preservar o histórico
-- mesmo que o cadastro do EPI seja atualizado futuramente.
update public.rh_entregas_epis e
set numero_ca = p.numero_ca,
    ca_valido_ate = p.ca_valido_ate
from public.rh_epis p
where p.id = e.epi_id
  and (e.numero_ca is null or e.ca_valido_ate is null);

create index if not exists rh_entregas_epis_empresa_entregue_idx
  on public.rh_entregas_epis (empresa_id, entregue_em desc);
create index if not exists rh_epis_empresa_ativo_idx
  on public.rh_epis (empresa_id, ativo);
create index if not exists rh_turnos_empresa_codigo_idx
  on public.rh_turnos (empresa_id, codigo);

-- RLS já está habilitada e usa tenant_isolation por empresa_id nas três tabelas.
-- Esta migration não remove nem relaxa políticas existentes.

-- Integração com o cadastro atual de colaboradores (erp_funcionarios).
-- Mantém funcionario_id/FK legado para histórico e permite novos registros no cadastro atual.
alter table public.rh_entregas_epis
  add column if not exists erp_funcionario_id uuid;

alter table public.rh_entregas_epis
  alter column funcionario_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rh_entregas_epis_erp_funcionario_id_fkey'
      and conrelid = 'public.rh_entregas_epis'::regclass
  ) then
    alter table public.rh_entregas_epis
      add constraint rh_entregas_epis_erp_funcionario_id_fkey
      foreign key (erp_funcionario_id) references public.erp_funcionarios(id);
  end if;
end $$;

create index if not exists rh_entregas_epis_empresa_erp_funcionario_idx
  on public.rh_entregas_epis (empresa_id, erp_funcionario_id);
