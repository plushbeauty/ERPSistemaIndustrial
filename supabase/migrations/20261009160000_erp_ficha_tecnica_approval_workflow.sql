-- Approval gate for engineering revisions consumed by MRP/PCP.
-- The master criteria are maintained by Quality; only the guarded RPC may activate a revision.
create or replace function public.erp_guard_ficha_tecnica_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (new.status is distinct from old.status or new.ativa is distinct from old.ativa)
     and coalesce(current_setting('app.erp_ficha_approval', true), '') <> 'approval' then
    raise exception 'Status e ativação da ficha técnica só podem ser alterados pelo fluxo formal de aprovação.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_guard_ficha_tecnica_status on public.erp_fichas_tecnicas;
create trigger trg_erp_guard_ficha_tecnica_status
before update of status, ativa on public.erp_fichas_tecnicas
for each row execute function public.erp_guard_ficha_tecnica_status();

create or replace function public.erp_qualidade_aprovar_ficha_tecnica(p_ficha_id uuid)
returns public.erp_fichas_tecnicas
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ficha public.erp_fichas_tecnicas;
begin
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para aprovar/liberar ficha técnica.';
  end if;

  select f.* into v_ficha
  from public.erp_fichas_tecnicas f
  where f.id = p_ficha_id
    and (public.erp_is_master() or f.empresa_id = v_empresa)
  for update;

  if not found then raise exception 'Ficha técnica não encontrada na empresa autorizada.'; end if;
  if v_ficha.status not in ('rascunho', 'em_analise') then
    raise exception 'Somente uma ficha em rascunho ou análise pode ser aprovada.';
  end if;
  if not exists (
    select 1 from public.erp_ficha_itens i
    where i.empresa_id = v_ficha.empresa_id and i.ficha_id = v_ficha.id
  ) then raise exception 'A ficha precisa ter pelo menos um componente BOM antes da aprovação.'; end if;
  if not exists (
    select 1 from public.erp_ficha_operacoes o
    where o.empresa_id = v_ficha.empresa_id and o.ficha_id = v_ficha.id
  ) then raise exception 'A ficha precisa ter pelo menos uma operação de roteiro antes da aprovação.'; end if;

  perform set_config('app.erp_ficha_approval', 'approval', true);
  update public.erp_fichas_tecnicas
  set ativa = false, status = 'obsoleta', updated_at = now()
  where empresa_id = v_ficha.empresa_id
    and produto_id = v_ficha.produto_id
    and id <> v_ficha.id
    and ativa = true;

  update public.erp_fichas_tecnicas
  set ativa = true, status = 'aprovada', updated_at = now()
  where id = v_ficha.id and empresa_id = v_ficha.empresa_id
  returning * into v_ficha;

  return v_ficha;
end;
$$;

revoke all on function public.erp_qualidade_aprovar_ficha_tecnica(uuid) from public, anon;
grant execute on function public.erp_qualidade_aprovar_ficha_tecnica(uuid) to authenticated;
