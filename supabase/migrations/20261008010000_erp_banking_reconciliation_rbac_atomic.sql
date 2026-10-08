-- Financeiro: conciliação bancária atômica, tenant explícito e RBAC.
-- Não cria dados fictícios; usa exclusivamente as tabelas bancárias existentes.

drop policy if exists erp_importacoes_log_tenant on public.erp_importacoes_log;
create policy erp_importacoes_log_select on public.erp_importacoes_log
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'ver'))
  );
create policy erp_importacoes_log_insert on public.erp_importacoes_log
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );
create policy erp_importacoes_log_update on public.erp_importacoes_log
  for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );
create policy erp_importacoes_log_delete on public.erp_importacoes_log
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );

drop policy if exists erp_contas_bancarias_tenant on public.erp_contas_bancarias;
create policy erp_contas_bancarias_select on public.erp_contas_bancarias
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'ver'))
  );
create policy erp_contas_bancarias_write on public.erp_contas_bancarias
  for all to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );

drop policy if exists erp_transacoes_bancarias_tenant on public.erp_transacoes_bancarias;
create policy erp_transacoes_bancarias_select on public.erp_transacoes_bancarias
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'ver'))
  );
create policy erp_transacoes_bancarias_write on public.erp_transacoes_bancarias
  for all to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );

drop policy if exists erp_conciliacoes_bancarias_tenant on public.erp_conciliacoes_bancarias;
create policy erp_conciliacoes_bancarias_select on public.erp_conciliacoes_bancarias
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'ver'))
  );
create policy erp_conciliacoes_bancarias_write on public.erp_conciliacoes_bancarias
  for all to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );

drop policy if exists banking_extratos_select on storage.objects;
create policy banking_extratos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'banking-extratos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'ver'))
  );
drop policy if exists banking_extratos_insert on storage.objects;
create policy banking_extratos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'banking-extratos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );
drop policy if exists banking_extratos_update on storage.objects;
create policy banking_extratos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'banking-extratos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  )
  with check (
    bucket_id = 'banking-extratos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );
drop policy if exists banking_extratos_delete on storage.objects;
create policy banking_extratos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'banking-extratos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar'))
  );

create or replace function public.erp_conciliar_transacao_bancaria(
  p_transacao_id uuid,
  p_referencia_interna text default null
)
returns public.erp_conciliacoes_bancarias
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_transacao public.erp_transacoes_bancarias%rowtype;
  v_conciliacao public.erp_conciliacoes_bancarias;
  v_reference text;
begin
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.' using errcode = '42501';
  end if;
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('financeiro', 'lancar')) then
    raise exception 'Sem permissão para conciliar transações bancárias.' using errcode = '42501';
  end if;

  select *
    into v_transacao
    from public.erp_transacoes_bancarias t
   where t.id = p_transacao_id
     and t.empresa_id = v_empresa
   for update;

  if not found then
    raise exception 'Transação bancária não encontrada na empresa da sessão.' using errcode = 'P0002';
  end if;
  if v_transacao.status <> 'PENDENTE' then
    raise exception 'Somente transações pendentes podem ser conciliadas.' using errcode = '22023';
  end if;

  v_reference := nullif(btrim(coalesce(p_referencia_interna, '')), '');
  if v_reference is null then
    v_reference := nullif(btrim(coalesce(v_transacao.referencia, v_transacao.descricao)), '');
  end if;
  if v_reference is null then
    raise exception 'Informe uma referência interna para a conciliação.' using errcode = '22023';
  end if;

  insert into public.erp_conciliacoes_bancarias (
    empresa_id, transacao_bancaria_id, documento_tipo, referencia_interna,
    valor_conciliado, conciliado_por
  )
  values (
    v_empresa, v_transacao.id, 'REFERENCIA', v_reference,
    v_transacao.valor, auth.uid()
  )
  returning * into v_conciliacao;

  update public.erp_transacoes_bancarias
     set status = 'CONCILIADO'
   where id = v_transacao.id
     and empresa_id = v_empresa
     and status = 'PENDENTE';

  if not found then
    raise exception 'A transação não pôde ser marcada como conciliada.' using errcode = '40001';
  end if;

  return v_conciliacao;
end;
$$;

revoke all on function public.erp_conciliar_transacao_bancaria(uuid,text) from public, anon;
grant execute on function public.erp_conciliar_transacao_bancaria(uuid,text) to authenticated;
