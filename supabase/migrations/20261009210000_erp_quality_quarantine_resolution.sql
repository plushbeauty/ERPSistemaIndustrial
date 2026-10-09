-- Formal disposition workflow for held lots. Retained stock stays blocked until explicit Quality release.
alter table public.erp_quarentenas_lotes
  add column if not exists decisao_motivo text null,
  add column if not exists decisao_por uuid null references auth.users(id) on delete set null,
  add column if not exists decisao_em timestamptz null;

create or replace function public.erp_qualidade_decidir_quarentena(
  p_quarentena_id uuid,
  p_decisao text,
  p_motivo text
)
returns public.erp_quarentenas_lotes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_quarentena public.erp_quarentenas_lotes;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.';
  end if;
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para decidir quarentena; solicite aprovação formal da Qualidade.';
  end if;
  if p_decisao not in ('LIBERADO','SUCATA','RETRABALHO') then
    raise exception 'Decisão de quarentena inválida.';
  end if;
  if length(trim(coalesce(p_motivo,''))) < 5 then
    raise exception 'Informe a justificativa da decisão com pelo menos 5 caracteres.';
  end if;

  select q.* into v_quarentena
  from public.erp_quarentenas_lotes q
  where q.id = p_quarentena_id
    and (public.erp_is_master() or q.empresa_id = v_empresa)
  for update;
  if not found then raise exception 'Quarentena não encontrada na empresa autorizada.'; end if;
  if v_quarentena.status in ('LIBERADO','SUCATA') then
    raise exception 'Esta quarentena já possui uma decisão final.';
  end if;
  if v_quarentena.status not in ('RETIDO','RETRABALHO') then
    raise exception 'Somente lotes retidos ou em retrabalho podem receber decisão.';
  end if;
  if v_quarentena.status = 'RETRABALHO' and p_decisao = 'RETRABALHO' then
    raise exception 'O lote já está em retrabalho; escolha liberação após verificação ou sucata.';
  end if;

  update public.erp_quarentenas_lotes
  set status = p_decisao,
      decisao_motivo = trim(p_motivo),
      decisao_por = auth.uid(),
      decisao_em = now(),
      liberado_por = case when p_decisao = 'LIBERADO' then auth.uid() else liberado_por end,
      liberado_em = case when p_decisao = 'LIBERADO' then now() else liberado_em end
  where id = v_quarentena.id and empresa_id = v_quarentena.empresa_id
  returning * into v_quarentena;

  if p_decisao = 'LIBERADO' then
    update public.erp_estoque_lotes
    set status_inspecao = 'APROVADO'
    where id = v_quarentena.lote_id and empresa_id = v_quarentena.empresa_id;
    if v_quarentena.lote_rastreabilidade_id is not null then
      update public.erp_estoque_lotes_rastreabilidade
      set status_qualidade = 'APROVADO'
      where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_quarentena.empresa_id;
    end if;
  else
    update public.erp_estoque_lotes
    set status_inspecao = 'RETIDO'
    where id = v_quarentena.lote_id and empresa_id = v_quarentena.empresa_id;
    if v_quarentena.lote_rastreabilidade_id is not null then
      update public.erp_estoque_lotes_rastreabilidade
      set status_qualidade = 'RETIDO'
      where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_quarentena.empresa_id;
    end if;
  end if;

  return v_quarentena;
end;
$$;

revoke all on function public.erp_qualidade_decidir_quarentena(uuid,text,text) from public, anon;
grant execute on function public.erp_qualidade_decidir_quarentena(uuid,text,text) to authenticated;
