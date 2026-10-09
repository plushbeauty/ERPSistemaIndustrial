-- Campos mestres de especificação conforme Projeto Executivo ERP Industrial (PDF).
-- Mantém os critérios existentes e acrescenta metadados para recebimento, processo e inspeção final.
alter table public.erp_planos_inspecao
  add column if not exists grupo_material text,
  add column if not exists tipo_inspecao text not null default 'RECEBIMENTO',
  add column if not exists metodo_inspecao text not null default 'DIMENSIONAL',
  add column if not exists condicao_armazenamento text,
  add column if not exists instrumento_id uuid null references public.erp_equipamentos_medicao(id) on delete set null,
  add column if not exists revisao integer not null default 1,
  add column if not exists vigencia_inicio date,
  add column if not exists responsavel_id uuid null references auth.users(id) on delete set null,
  add column if not exists aprovador_id uuid null references auth.users(id) on delete set null;

alter table public.erp_planos_inspecao
  drop constraint if exists erp_planos_inspecao_tipo_inspecao_check,
  add constraint erp_planos_inspecao_tipo_inspecao_check
    check (tipo_inspecao in ('RECEBIMENTO','PROCESSO','FINAL','EXPEDICAO')),
  drop constraint if exists erp_planos_inspecao_metodo_inspecao_check,
  add constraint erp_planos_inspecao_metodo_inspecao_check
    check (metodo_inspecao in ('VISUAL','DIMENSIONAL','FUNCIONAL','DOCUMENTAL')),
  drop constraint if exists erp_planos_inspecao_revisao_check,
  add constraint erp_planos_inspecao_revisao_check check (revisao > 0);

create index if not exists idx_erp_planos_inspecao_tipo_status
  on public.erp_planos_inspecao(empresa_id, tipo_inspecao, status, codigo);

-- Impede vínculos cruzados entre empresas mesmo em chamadas diretas à Data API.
create or replace function public.erp_validar_plano_inspecao_referencias()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.instrumento_id is not null and not exists (
    select 1 from public.erp_equipamentos_medicao i
    where i.id = new.instrumento_id and i.empresa_id = new.empresa_id
  ) then
    raise exception 'Instrumento de medição deve pertencer à mesma empresa da especificação.';
  end if;

  if new.responsavel_id is not null and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = new.responsavel_id and u.empresa_id = new.empresa_id and u.ativo = true
  ) then
    raise exception 'Responsável deve ser usuário ativo da mesma empresa.';
  end if;

  if new.aprovador_id is not null and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = new.aprovador_id and u.empresa_id = new.empresa_id and u.ativo = true
  ) then
    raise exception 'Aprovador deve ser usuário ativo da mesma empresa.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_erp_validar_plano_inspecao_referencias on public.erp_planos_inspecao;
create trigger trg_erp_validar_plano_inspecao_referencias
before insert or update of empresa_id, instrumento_id, responsavel_id, aprovador_id
on public.erp_planos_inspecao
for each row execute function public.erp_validar_plano_inspecao_referencias();

revoke all on function public.erp_validar_plano_inspecao_referencias() from public, anon, authenticated;
