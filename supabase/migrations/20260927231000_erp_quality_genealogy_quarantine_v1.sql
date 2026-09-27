alter table public.erp_estoque_lotes_rastreabilidade drop constraint if exists erp_estoque_lotes_rastreabilidade_status_qualidade_check;
alter table public.erp_estoque_lotes_rastreabilidade add constraint erp_estoque_lotes_rastreabilidade_status_qualidade_check check (status_qualidade = any (array['APROVADO','REPROVADO','RETIDO']));

create table if not exists public.erp_genealogia_lote_componentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  lote_acabado_id uuid not null references public.erp_estoque_lotes(id) on delete cascade,
  lote_insumo_id uuid not null references public.erp_estoque_lotes_rastreabilidade(id) on delete restrict,
  quantidade_consumida numeric not null check (quantidade_consumida > 0),
  criado_por uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (empresa_id,lote_acabado_id,lote_insumo_id)
);
alter table public.erp_genealogia_lote_componentes enable row level security;
create policy erp_genealogia_tenant_select on public.erp_genealogia_lote_componentes for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_genealogia_tenant_insert on public.erp_genealogia_lote_componentes for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create table if not exists public.erp_quarentenas_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  lote_id uuid not null references public.erp_estoque_lotes(id) on delete restrict,
  lote_rastreabilidade_id uuid null references public.erp_estoque_lotes_rastreabilidade(id) on delete restrict,
  motivo text not null check (length(trim(motivo)) >= 5),
  status text not null default 'RETIDO' check (status in ('RETIDO','LIBERADO','SUCATA','RETRABALHO')),
  criado_por uuid null references auth.users(id),
  liberado_por uuid null references auth.users(id),
  liberado_em timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.erp_quarentenas_lotes enable row level security;
create policy erp_quarentena_tenant_select on public.erp_quarentenas_lotes for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_quarentena_tenant_insert on public.erp_quarentenas_lotes for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create index if not exists ix_erp_quarentenas_empresa_status on public.erp_quarentenas_lotes(empresa_id,status,created_at desc);

create or replace function public.erp_reter_lote(p_lote_id uuid,p_motivo text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_empresa uuid; v_rastreio uuid; v_quarentena uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
  select empresa_id into v_empresa from public.erp_estoque_lotes where id=p_lote_id for update;
  if v_empresa is null then raise exception 'Lote não encontrado'; end if;
  if not (v_empresa = public.erp_current_empresa_id() or public.erp_is_master()) then raise exception 'Lote fora da empresa do usuário'; end if;
  if length(trim(coalesce(p_motivo,''))) < 5 then raise exception 'Motivo da retenção é obrigatório'; end if;
  select id into v_rastreio from public.erp_estoque_lotes_rastreabilidade where empresa_id=v_empresa and lote_fornecedor=(select lote_fornecedor from public.erp_estoque_lotes where id=p_lote_id) limit 1 for update;
  update public.erp_estoque_lotes set status_inspecao='RETIDO' where id=p_lote_id;
  if v_rastreio is not null then update public.erp_estoque_lotes_rastreabilidade set status_qualidade='RETIDO' where id=v_rastreio; end if;
  insert into public.erp_quarentenas_lotes(empresa_id,lote_id,lote_rastreabilidade_id,motivo,criado_por) values(v_empresa,p_lote_id,v_rastreio,trim(p_motivo),auth.uid()) returning id into v_quarentena;
  return v_quarentena;
end; $$;
revoke all on function public.erp_reter_lote(uuid,text) from public,anon;
grant execute on function public.erp_reter_lote(uuid,text) to authenticated;

create or replace function public.erp_impedir_movimento_lote_retido() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.status_inspecao='RETIDO' and coalesce(new.quantidade_disponivel,old.quantidade_disponivel)<old.quantidade_disponivel then
    raise exception 'Movimentação bloqueada: lote % está RETIDO em quarentena.',old.lote_interno;
  end if;
  return new;
end; $$;
drop trigger if exists trg_erp_bloqueio_lote_retido on public.erp_estoque_lotes;
create trigger trg_erp_bloqueio_lote_retido before update on public.erp_estoque_lotes for each row execute function public.erp_impedir_movimento_lote_retido();
revoke all on function public.erp_impedir_movimento_lote_retido() from public,anon;

create or replace function public.erp_impedir_movimento_rastreio_retido() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.status_qualidade='RETIDO' and coalesce(new.quantidade_disponivel,old.quantidade_disponivel)<old.quantidade_disponivel then
    raise exception 'Movimentação bloqueada: lote de rastreabilidade está RETIDO em quarentena.';
  end if;
  return new;
end; $$;
drop trigger if exists trg_erp_bloqueio_rastreio_retido on public.erp_estoque_lotes_rastreabilidade;
create trigger trg_erp_bloqueio_rastreio_retido before update on public.erp_estoque_lotes_rastreabilidade for each row execute function public.erp_impedir_movimento_rastreio_retido();
revoke all on function public.erp_impedir_movimento_rastreio_retido() from public,anon;